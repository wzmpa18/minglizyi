#!/bin/bash
# v25.0.28 发布：P6-补04（医考题库专区：唯一题库引擎track=yikao分类标签/医考主页面/我的评论/后台配置/错题本AI解析/21预置类目）
# 链路：服务器源码同步 → 构建门禁 → releases/v25.0.28 → current 软链 → nginx 缓存清理 → 后端 academyRoutes 热更新
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.28"
BUILD_ID="${VERSION}_D20260817"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"

cd "$SRC_DIR"

echo "--- [0] 清理工作树（防 updateInstead 跳过） ---"
git restore . 2>/dev/null || true
git status --short | head -5
echo "HEAD: $(git rev-parse --short HEAD)"

echo "--- [1] 安装依赖（无新增依赖，幂等快过） ---"
npm install --no-audit --no-fund 2>&1 | tail -3

echo "--- [2] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -6

echo "--- [3] 页面导出校验（v25.0.28 全量清单：v25.0.27清单 + 医考2页） ---"
for p in academy/yikao academy/my-comments yixue/tarot academy/favorites academy/notes academy/leaderboard academy/learn academy/question-bank academy/wrong-book academy/exam yixue/ziwei yixue/astro yixue/wannianli yixue/qimen discover/create membership messages/system profile/consult/provider-apply privacy admin/tools admin/sources; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p}"
done

echo "--- [4] 功能标记入包校验 ---"
grep -q "中医执业医师" out/academy/yikao/index.html && echo "YIKAO-EXAM(考试类型) HTML OK" || grep -rq "中医执业医师" out/_next/static/chunks/ && echo "YIKAO-EXAM(考试类型) CHUNK OK"
grep -q "冲刺密卷" out/academy/yikao/index.html && echo "YIKAO-CARD(精选卡片) HTML OK" || grep -rq "冲刺密卷" out/_next/static/chunks/ && echo "YIKAO-CARD(精选卡片) CHUNK OK"
grep -q "实践技能" out/academy/yikao/index.html && echo "YIKAO-SKILL(实践技能三站) HTML OK" || grep -rq "实践技能" out/_next/static/chunks/ && echo "YIKAO-SKILL(实践技能三站) CHUNK OK"
grep -q "章节乱序" out/academy/yikao/index.html && echo "YIKAO-MODE(练习模式) HTML OK" || grep -rq "章节乱序" out/_next/static/chunks/ && echo "YIKAO-MODE(练习模式) CHUNK OK"
grep -q "覆盖全部核心考点" out/academy/question-bank/index.html && echo "QUESTIONBANK(题量隐藏文案) OK"
grep -q "叠宫" out/yixue/ziwei/index.html && echo "ZIWEI(叠宫) OK"
grep -q "兑换" out/membership/index.html && echo "MEMBERSHIP(兑换) OK"
grep -rq "我的评论" out/academy/my-comments/index.html out/_next/static/chunks/ >/dev/null 2>&1 && echo "MYCOMMENTS(我的评论) OK"

echo "--- [4.5] 错误IP残留与version门禁 ---"
BAD=$(grep -rl '101.32.191.210' out/ 2>/dev/null | wc -l)
[ "$BAD" -gt 0 ] && { echo "FATAL: $BAD 个文件含错误IP"; exit 1; }
echo "错误IP扫描 OK（0个文件）"
grep -q "\"version\": \"${VERSION}\"" out/version.json || { echo "FATAL: version.json 未升级"; cat out/version.json; exit 1; }
cat out/version.json

echo "--- [5] 发布到 ${RELEASE_DIR} ---"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
cp -r out/* "$RELEASE_DIR/"
cp -r .next "$RELEASE_DIR/" 2>/dev/null || true
cp package.json "$RELEASE_DIR/" 2>/dev/null || true

RELEASE_FILES=$(find "$RELEASE_DIR" -type f | wc -l)
echo "Release file count: ${RELEASE_FILES}"
[ "$RELEASE_FILES" -lt 50 ] && { echo "FATAL: release suspiciously small"; exit 1; }

echo "--- [7] 切换 current 软链 ---"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
ACTUAL=$(readlink -f /root/yandaoguoxue/current)
echo "current -> ${ACTUAL}"
[ "$ACTUAL" != "$RELEASE_DIR" ] && { echo "FATAL: symlink switch failed"; exit 1; }

echo "--- [8] 清理 nginx 缓存 ---"
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "--- [9] 后端热更新（academyRoutes：yikao track透传+21预置类目） ---"
if [ -f backend_deploy/academyRoutes.js ]; then
  BACKEND_TARGET="/www/yandaoguoxue-backend/academyRoutes.js"
  if [ -f "$BACKEND_TARGET" ]; then
    cp "$BACKEND_TARGET" "${BACKEND_TARGET}.bak_v25_0_28_pre" 2>/dev/null || true
    cp backend_deploy/academyRoutes.js "$BACKEND_TARGET"
    echo "academyRoutes 已热更新: ${BACKEND_TARGET}"
    grep -c "yikao" "$BACKEND_TARGET" | xargs -I{} echo "yikao 出现次数: {}"
    grep -q "第一站病案分析" "$BACKEND_TARGET" && echo "21预置类目(含实践技能三站) OK"
    pm2 restart yandaoguoxue-backend 2>/dev/null || pm2 restart all
    echo "pm2 已重启"
  else
    echo "FATAL: 未找到 ${BACKEND_TARGET}"
    exit 1
  fi
fi

echo "--- [10] 后端健康检查 ---"
sleep 3
HEALTH=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/health 2>/dev/null || echo "000")
echo "backend /health: ${HEALTH}"
YIKAO_CAT=$(curl -s "http://127.0.0.1:3001/api/academy/categories?track=yikao" 2>/dev/null | head -c 400)
echo "yikao categories 探针: ${YIKAO_CAT}"

echo "===== DEPLOY ${VERSION} COMPLETE ====="
