#!/bin/bash
# v25.0.27 发布：P6-补03（紫微可见性/文风统一/学习中心手风琴/塔罗78张公版/占星古典尊贵/社交后端化/邀请兑换码闭环/万年历登记）
# 链路：服务器源码同步 → 构建门禁 → releases/v25.0.27 → current 软链 → nginx 缓存清理
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.27"
BUILD_ID="${VERSION}_D20260817"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"

cd "$SRC_DIR"

echo "--- [0] 清理工作树（防 updateInstead 跳过） ---"
git restore . 2>/dev/null || true
git status --short | head -5
echo "HEAD: $(git rev-parse --short HEAD)"

echo "--- [1] 盖章 version.json ---"
node -e "const fs=require('fs');const p='public/version.json';const v={version:'${VERSION}',buildId:'${BUILD_ID}',builtAt:new Date().toISOString()};fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');console.log(fs.readFileSync(p,'utf8'))"

echo "--- [1.5] 安装依赖 ---"
npm install --no-audit --no-fund 2>&1 | tail -5

echo "--- [2] 构建 ---"
npm run build 2>&1 | tail -30

echo "--- [3] 页面导出校验（v25.0.27 全量清单） ---"
for p in yixue/tarot academy/favorites academy/notes academy/leaderboard academy/learn academy/question-bank yixue/ziwei yixue/astro yixue/wannianli yixue/qimen discover/create membership messages/system profile/consult privacy admin/tools admin/sources; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p}"
done

echo "--- [4] 功能标记入包校验 ---"
grep -q "塔罗" out/yixue/tarot/index.html && echo "TAROT(塔罗工具) OK"
grep -q "韦特" out/yixue/tarot/index.html || grep -rq "韦特" out/yixue/tarot/ && echo "TAROT(公版韦特数据) OK"
grep -q "覆盖全部核心知识点" out/academy/question-bank/index.html && echo "QUESTIONBANK(题量隐藏文案) OK"
grep -q "叠宫" out/yixue/ziwei/index.html && echo "ZIWEI(叠宫) OK"
grep -q "入庙" out/yixue/astro/index.html || grep -rq "入庙" out/yixue/astro/ && echo "ASTRO(古典尊贵) OK"
grep -q "登记" out/yixue/wannianli/index.html && echo "WANNIANLI(事项登记) OK"
grep -q "兑换" out/membership/index.html && echo "MEMBERSHIP(兑换) OK"
grep -q "全权限账户" out/admin/tools/index.html && echo "TOOLS(账户) OK"

echo "--- [5] 发布到 ${RELEASE_DIR} ---"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
cp -r out/* "$RELEASE_DIR/"
cp -r .next "$RELEASE_DIR/" 2>/dev/null || true
cp package.json "$RELEASE_DIR/" 2>/dev/null || true

RELEASE_FILES=$(find "$RELEASE_DIR" -type f | wc -l)
echo "Release file count: ${RELEASE_FILES}"
[ "$RELEASE_FILES" -lt 50 ] && { echo "FATAL: release suspiciously small"; exit 1; }

echo "--- [6] version.json ---"
cat "$RELEASE_DIR/version.json"

echo "--- [7] 切换 current 软链 ---"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
ACTUAL=$(readlink -f /root/yandaoguoxue/current)
echo "current -> ${ACTUAL}"
[ "$ACTUAL" != "$RELEASE_DIR" ] && { echo "FATAL: symlink switch failed"; exit 1; }

echo "--- [8] 清理 nginx 缓存 ---"
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "--- [9] 后端热更新（socialApiRoutes 群管理/举报接口） ---"
if [ -f backend_deploy/socialApiRoutes.js ]; then
  BACKEND_TARGET=$(find /root -maxdepth 4 -name "socialApiRoutes.js" -not -path "*/yandaoguoxue-source/*" 2>/dev/null | head -1)
  if [ -n "$BACKEND_TARGET" ]; then
    cp "$BACKEND_TARGET" "${BACKEND_TARGET}.bak_v25_0_27_pre" 2>/dev/null || true
    cp backend_deploy/socialApiRoutes.js "$BACKEND_TARGET"
    echo "socialApiRoutes 已热更新: ${BACKEND_TARGET}"
    if command -v pm2 >/dev/null 2>&1; then
      pm2 restart all 2>/dev/null || true
      echo "pm2 已重启"
    fi
  else
    echo "WARN: 未找到运行中的 socialApiRoutes.js，跳过热更新"
  fi
fi

echo "===== DEPLOY ${VERSION} COMPLETE ====="
