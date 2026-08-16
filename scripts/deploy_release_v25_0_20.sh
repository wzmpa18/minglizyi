#!/bin/bash
# v25.0.20 发布脚本：构建产物 → releases/v25.0.20 → current 软链 → nginx 缓存清理 → 公网验证
set -euo pipefail
VERSION="v25.0.20"
SRC_DIR="/root/yandaoguoxue-source"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
BASE="https://yandaoguoxue.yandao.vip"

cd "$SRC_DIR"

echo "--- [1] Verify build output ---"
test -f out/index.html || { echo "FATAL: out/index.html missing"; exit 1; }
echo "out/index.html OK ($(du -sh out | cut -f1))"

echo "--- [2] Verify v25.0.20 feature pages exported ---"
for p in academy academy/learn academy/question-bank academy/exam academy/certificates academy/wrong-book academy/factory academy/factory/review yixue/ziwei yixue/qimen; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p}"
done

echo "--- [3] Release to ${RELEASE_DIR} ---"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
cp -r out/* "$RELEASE_DIR/"
cp -r .next "$RELEASE_DIR/" 2>/dev/null || true
cp package.json "$RELEASE_DIR/" 2>/dev/null || true

echo "--- [4] Verify release content ---"
RELEASE_FILES=$(find "$RELEASE_DIR" -type f | wc -l)
echo "Release file count: ${RELEASE_FILES}"
[ "$RELEASE_FILES" -lt 50 ] && { echo "FATAL: release suspiciously small"; exit 1; }

echo "--- [5] version.json ---"
cat "$RELEASE_DIR/version.json"

echo "--- [6] Switch current symlink ---"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
ACTUAL=$(readlink -f /root/yandaoguoxue/current)
echo "current -> ${ACTUAL}"
[ "$ACTUAL" != "$RELEASE_DIR" ] && { echo "FATAL: symlink switch failed"; exit 1; }

echo "--- [7] Clean Nginx cache + reload ---"
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "--- [8] Public verification ---"
curl -sk -o /dev/null -w "HOME:%{http_code} %{time_total}s\n" ${BASE}/
for p in academy academy/learn academy/question-bank academy/exam academy/factory academy/factory/review yixue/ziwei yixue/qimen profile login; do
  curl -sk -o /dev/null -w "${p}:%{http_code}\n" ${BASE}/${p}.html
done
echo "VERSION_JSON: $(curl -sk ${BASE}/version.json)"

echo "--- [9] BottomNav + 三板块 markers in exported HTML ---"
curl -sk ${BASE}/academy.html | grep -o "言道学堂\|知识工厂" | sort | uniq -c | head -3
curl -sk ${BASE}/_next/static/chunks/ -o /dev/null 2>/dev/null || true
JS_HITS=$(grep -rl "zhongyi" /root/yandaoguoxue/current/_next/static/chunks/ 2>/dev/null | head -3 | tr '\n' ' ')
echo "chunks-with-zhongyi: ${JS_HITS}"

echo "===== DEPLOY ${VERSION} COMPLETE ====="
