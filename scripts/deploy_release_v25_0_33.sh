#!/bin/bash
# v25.0.33 发布：P7-整改-01（紫微布局回退校准：主星恒字号/神煞右侧贴底/顶部图例清理/E区合流竖排修拉伸
#   + 社交基础上线：好友私聊入口恢复/资料真实写库/扫码加好友后端链路/文字图片消息/敏感词拦截/100条滚动覆盖/功能总开关）
# 前端发布：源码同步校验 → 构建 → releases/v25.0.33 → current 软链 → nginx 缓存清理
# 后端热更（socialApiRoutes.js + social_feature_config.json）由 p7_backend_hotupdate_v33.sh 单独执行
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.33"
EXPECT_HEAD="f6dd6f2"
BUILD_ID="${VERSION}_D20260818"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"

cd "$SRC_DIR"

echo "--- [0] 源码同步校验 ---"
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"
[ "$HEAD" != "$EXPECT_HEAD" ] && { echo "FATAL: HEAD ${HEAD} != ${EXPECT_HEAD}"; exit 1; }

echo "--- [1] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -6

echo "--- [2] 页面导出校验（紫微/好友/聊天/资料编辑 + 抽检核心页） ---"
for p in yixue/ziwei friends "friends/chat/placeholder" "friends/requests" profile/edit friend "" academy invite register login profile privacy; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p:-index}"
done

echo "--- [3] P7-整改-01 功能标记入包校验 ---"
# 紫微：顶部图例已移除（负向校验）
if grep -rq "动态星（前缀+简称" out/_next/static/chunks/ 2>/dev/null; then
  echo "FATAL: 顶部动态星图例未清除"; exit 1
fi
echo "ZIWEI-LEGEND-REMOVED(顶部图例已清) OK"
# 紫微：时间轴/叠宫/运限四化既有功能保留
grep -rq "运限四化" out/_next/static/chunks/ && echo "ZW-TIME(时间轴四化) OK" || { echo "FATAL: 时间轴四化缺失"; exit 1; }
grep -rq "大限命宫" out/_next/static/chunks/ && echo "ZW-OVERLAY(叠宫) OK" || { echo "FATAL: 叠宫标记缺失"; exit 1; }
grep -q "紫微斗数" out/yixue/ziwei/index.html && echo "ZIWEI-PAGE OK"
# 社交：图片消息 + 扫码加好友新文案
grep -rq "图片消息" out/_next/static/chunks/ && echo "CHAT-IMAGE(私聊图片) OK" || { echo "FATAL: 私聊图片标记缺失"; exit 1; }
grep -rq "已发送好友申请" out/_next/static/chunks/ && echo "FRIEND-QR(扫码加好友) OK" || { echo "FATAL: 扫码加好友标记缺失"; exit 1; }

echo "--- [3.5] 错误IP残留与version门禁 ---"
BAD=$(grep -rl '101.32.191.210' out/ 2>/dev/null | wc -l)
[ "$BAD" -gt 0 ] && { echo "FATAL: $BAD 个文件含错误IP"; exit 1; }
echo "错误IP扫描 OK（0个文件）"
grep -q "\"version\": \"${VERSION}\"" out/version.json || { echo "FATAL: version.json 未升级"; cat out/version.json; exit 1; }
cat out/version.json

echo "--- [4] 发布到 ${RELEASE_DIR} ---"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
cp -r out/* "$RELEASE_DIR/"
cp -r .next "$RELEASE_DIR/" 2>/dev/null || true
cp package.json "$RELEASE_DIR/" 2>/dev/null || true

RELEASE_FILES=$(find "$RELEASE_DIR" -type f | wc -l)
echo "Release file count: ${RELEASE_FILES}"
[ "$RELEASE_FILES" -lt 50 ] && { echo "FATAL: release suspiciously small"; exit 1; }

echo "--- [5] 切换 current 软链 ---"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
ACTUAL=$(readlink -f /root/yandaoguoxue/current)
echo "current -> ${ACTUAL}"
[ "$ACTUAL" != "$RELEASE_DIR" ] && { echo "FATAL: symlink switch failed"; exit 1; }

echo "--- [6] 清理 nginx 缓存 ---"
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "--- [7] 公网验证（紫微/好友页200 + version + 首页） ---"
DOMAIN="https://yandaoguoxue.yandao.vip"
for path in yixue/ziwei friends profile/edit; do
  CODE=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/${path})
  echo "公网 /${path}: ${CODE}"
  [ "$CODE" != "200" ] && { echo "FATAL: /${path} 公网非200"; exit 1; }
done
VJSON=$(curl -sL ${DOMAIN}/version.json)
echo "$VJSON"
echo "$VJSON" | grep -q "\"v25.0.33\"" || { echo "WARN: 公网version未生效（可能缓存，稍后复验）"; }
HOME=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/)
echo "公网首页: ${HOME}"

echo "===== DEPLOY ${VERSION} COMPLETE ====="
