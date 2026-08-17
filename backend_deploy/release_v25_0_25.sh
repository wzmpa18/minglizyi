#!/bin/bash
# v25.0.25 发布：构建产物 → releases/v25.0.25 → current 软链 → nginx 缓存清理 → 公网验证
set -euo pipefail
VERSION="v25.0.25"
SRC_DIR="/root/yandaoguoxue-source"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
BASE="https://yandaoguoxue.yandao.vip"

cd "$SRC_DIR"
test -f out/index.html || { echo "FATAL: out missing"; exit 1; }
test -f out/yixue/ziwei/index.html || { echo "FATAL: ziwei page missing"; exit 1; }
echo "[1] out OK ($(du -sh out | cut -f1)); ziwei page OK"

rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
cp -r out/* "$RELEASE_DIR/"
cp -r .next "$RELEASE_DIR/" 2>/dev/null || true
cp package.json "$RELEASE_DIR/" 2>/dev/null || true

N=$(find "$RELEASE_DIR" -type f | wc -l)
echo "[2] release files: $N"
[ "$N" -lt 50 ] && { echo "FATAL: too small"; exit 1; }

echo "[3] version.json: $(cat "$RELEASE_DIR/version.json" | tr -d '\n')"

ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
A=$(readlink -f /root/yandaoguoxue/current)
echo "[4] current -> $A"
[ "$A" != "$RELEASE_DIR" ] && { echo "FATAL: switch failed"; exit 1; }

rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "[5] public verify:"
curl -sk -o /dev/null -w "HOME:%{http_code}\n" ${BASE}/
for p in yixue/ziwei yixue/bazi zhongyi academy discover social profile; do
  curl -sk -o /dev/null -w "${p}:%{http_code}\n" ${BASE}/${p}
done
curl -sk ${BASE}/version.json
echo ""

echo "[6] v25.0.25 feature presence:"
grep -q "zwPalaceAbbr\|ZW_PERIOD_PALACE_ABBR" "$RELEASE_DIR/_next/static/chunks/"*.js 2>/dev/null && echo "overlay-abbr code in bundle: YES" || echo "overlay-abbr code in bundle: grep-miss(check manually)"
grep -q "天纪" "$RELEASE_DIR/_next/static/chunks/"*.js 2>/dev/null && echo "tianji notes in bundle: YES" || echo "tianji notes: grep-miss(check manually)"
echo "RELEASE-DONE"
