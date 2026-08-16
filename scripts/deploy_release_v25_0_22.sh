#!/bin/bash
# v25.0.22 前端构建+发布：构建 → releases/v25.0.22 → current 软链 → nginx 缓存清理
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.22"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"

cd "$SRC_DIR"

echo "--- [1] Stamp version.json ---"
node -e "const fs=require('fs');const p='public/version.json';const v=JSON.parse(fs.readFileSync(p,'utf8'));v.version='${VERSION}';v.buildId='${VERSION}_D20260816';v.buildTime=new Date().toISOString();fs.writeFileSync(p,JSON.stringify(v,null,2));console.log(fs.readFileSync(p,'utf8'))"

echo "--- [2] Build (next export) ---"
npm run build 2>&1 | tail -25

echo "--- [3] Verify new pages exported ---"
for p in admin/loc academy/orgs academy/factory academy; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p}"
done

echo "--- [4] Feature markers in exported HTML ---"
grep -rl "学习运营中心" out/admin/loc/index.html >/dev/null && echo "LOC page OK"
grep -rl "机构专区" out/academy/orgs/index.html >/dev/null && echo "ORGs page OK"
grep -o "仅支持记事本类文件\|点击选择记事本文件" out/academy/factory/index.html | head -1

echo "--- [5] Release to ${RELEASE_DIR} ---"
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

echo "--- [7] Switch current symlink ---"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
ACTUAL=$(readlink -f /root/yandaoguoxue/current)
echo "current -> ${ACTUAL}"
[ "$ACTUAL" != "$RELEASE_DIR" ] && { echo "FATAL: symlink switch failed"; exit 1; }

echo "--- [8] Clean Nginx cache + reload ---"
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "===== DEPLOY ${VERSION} COMPLETE ====="
