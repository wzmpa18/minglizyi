#!/bin/bash
# v25.0.21 发布脚本：构建产物 → releases/v25.0.21 → current 软链 → nginx 缓存清理 → 公网验证
set -euo pipefail
VERSION="v25.0.21"
SRC_DIR="/root/yandaoguoxue-source"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
BASE="https://yandaoguoxue.yandao.vip"

cd "$SRC_DIR"

echo "--- [1] Verify build output ---"
test -f out/index.html || { echo "FATAL: out/index.html missing"; exit 1; }
echo "out/index.html OK ($(du -sh out | cut -f1))"

echo "--- [2] Verify feature pages exported ---"
for p in "" academy academy/learn yixue/ziwei yixue/qimen profile profile/settings; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p:-home}"
done

echo "--- [3] ICP footer marker in exported HTML ---"
grep -o "粤ICP备2026071165号-4A" out/index.html | head -1 || { echo "FATAL: ICP missing on homepage"; exit 1; }
grep -o "粤ICP备2026071165号-4A" out/profile/index.html | head -1 || { echo "FATAL: ICP missing on profile"; exit 1; }
echo "ICP OK (home+profile)"

echo "--- [4] v25.0.21 JS markers ---"
ZOOM=$(grep -rl "yandao_zoom_disabled" out/_next/static/chunks/ 2>/dev/null | head -1)
ZONE=$(grep -rl "yandao_zone_study" out/_next/static/chunks/ 2>/dev/null | head -1)
SIHUA=$(grep -rl "限四化" out/_next/static/chunks/ 2>/dev/null | head -1)
echo "zoom-toggle: ${ZOOM:-MISSING}"
echo "profile-drawer: ${ZONE:-MISSING}"
echo "ziwei-xian-sihua: ${SIHUA:-MISSING}"
[ -z "$ZOOM" ] && echo "WARN: zoom toggle marker missing"
[ -z "$SIHUA" ] && echo "WARN: 限四化 marker missing"

echo "--- [5] Release to ${RELEASE_DIR} ---"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
cp -r out/* "$RELEASE_DIR/"
cp -r .next "$RELEASE_DIR/" 2>/dev/null || true
cp package.json "$RELEASE_DIR/" 2>/dev/null || true

echo "--- [6] Verify release content ---"
RELEASE_FILES=$(find "$RELEASE_DIR" -type f | wc -l)
echo "Release file count: ${RELEASE_FILES}"
[ "$RELEASE_FILES" -lt 50 ] && { echo "FATAL: release suspiciously small"; exit 1; }

echo "--- [7] version.json ---"
cat "$RELEASE_DIR/version.json"

echo "--- [8] Switch current symlink ---"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
ACTUAL=$(readlink -f /root/yandaoguoxue/current)
echo "current -> ${ACTUAL}"
[ "$ACTUAL" != "$RELEASE_DIR" ] && { echo "FATAL: symlink switch failed"; exit 1; }

echo "--- [9] Clean Nginx cache + reload ---"
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "--- [10] Public verification ---"
curl -sk -o /dev/null -w "HOME:%{http_code} %{time_total}s\n" ${BASE}/
for p in academy academy/learn yixue/ziwei profile profile/settings; do
  curl -sk -o /dev/null -w "${p}:%{http_code}\n" ${BASE}/${p}.html
done
echo "VERSION_JSON: $(curl -sk ${BASE}/version.json)"
echo "ICP_PUBLIC: $(curl -sk ${BASE}/ | grep -c '粤ICP备2026071165号-4A')"

echo "--- [11] Backend academy categories (v25.0.21 新类目) ---"
curl -s http://127.0.0.1:3001/api/academy/tracks 2>/dev/null | head -c 200; echo

echo "===== DEPLOY ${VERSION} COMPLETE ====="
