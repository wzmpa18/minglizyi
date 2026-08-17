#!/bin/bash
# v25.0.26 发布：P6-TOOL-04 工具矩阵(万年历/择日/占星/记事提醒/咨询) + 叠宫纵排 + 超级账户 + 兑换码 + 来源注册库
# 链路：服务器源码同步 → 构建门禁 → releases/v25.0.26 → current 软链 → nginx 缓存清理
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.26"
BUILD_ID="${VERSION}_D20260817"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"

cd "$SRC_DIR"

echo "--- [0] 清理工作树（防 updateInstead 跳过） ---"
git restore . 2>/dev/null || true
git status --short | head -5
echo "HEAD: $(git rev-parse --short HEAD)"

echo "--- [1] 盖章 version.json ---"
node -e "const fs=require('fs');const p='public/version.json';const v={version:'${VERSION}',buildId:'${BUILD_ID}',builtAt:new Date().toISOString()};fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');console.log(fs.readFileSync(p,'utf8'))"

echo "--- [1.5] 安装依赖（astronomy-engine 为 v25.0.26 新增） ---"
npm install --no-audit --no-fund 2>&1 | tail -5

echo "--- [2] 构建 ---"
npm run build 2>&1 | tail -30

echo "--- [3] 新增页面导出校验 ---"
for p in admin/tools admin/sources admin/alerts admin/consult yixue/astro yixue/wannianli yixue/wannianli/events yixue/zeri membership messages/system profile/consult privacy yixue/ziwei; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p}"
done

echo "--- [4] 功能标记入包校验 ---"
grep -q "全权限账户\|兑换码" out/admin/tools/index.html && echo "TOOLS(账户/兑换码) OK"
grep -q "来源注册库" out/admin/sources/index.html && echo "SOURCES(来源注册库) OK"
grep -q "叠宫" out/yixue/ziwei/index.html && echo "ZIWEI(叠宫) OK"
grep -q "兑换" out/membership/index.html && echo "MEMBERSHIP(兑换) OK"
grep -q "AI生成" out/yixue/astro/index.html && echo "ASTRO(AI标注) OK"

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

echo "===== DEPLOY ${VERSION} COMPLETE ====="
