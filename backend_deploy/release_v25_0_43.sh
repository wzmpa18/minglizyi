#!/bin/bash
# ============================================================================
# v25.0.43 发布：FINAL-RC-02 平台功能开关（iOS支付关闭）
# 构建产物 → releases/v25.0.43 → current 软链 → nginx 缓存清理 → 公网验证
# ============================================================================
set -euo pipefail
VERSION="v25.0.43"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
TAR="/root/yandaoguoxue/out_v25_0_43.tar.gz"
BASE="https://yandaoguoxue.yandao.vip"

test -f "$TAR" || { echo "FATAL: tar missing"; exit 1; }
echo "[1] tar OK ($(du -sh "$TAR" | cut -f1))"

rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
tar -xzf "$TAR" -C "$RELEASE_DIR"

test -f "$RELEASE_DIR/index.html" || { echo "FATAL: index.html missing"; exit 1; }
test -f "$RELEASE_DIR/membership/index.html" || { echo "FATAL: membership page missing"; exit 1; }
N=$(find "$RELEASE_DIR" -type f | wc -l)
echo "[2] release files: $N"
[ "$N" -lt 50 ] && { echo "FATAL: too small"; exit 1; }

echo "[3] version.json: $(cat "$RELEASE_DIR/version.json" | tr -d '\n')"

ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
A=$(readlink -f /root/yandaoguoxue/current)
echo "[4] current -> $A"
[ "$A" != "$RELEASE_DIR" ] && { echo "FATAL: switch failed"; exit 1; }

# 同步到源码仓 out/ 供后续构建基线
rm -rf /root/yandaoguoxue-source/out
mkdir -p /root/yandaoguoxue-source/out
cp -r "$RELEASE_DIR"/. /root/yandaoguoxue-source/out/

rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "[5] public verify:"
curl -sk -o /dev/null -w "HOME:%{http_code}\n" ${BASE}/
for p in membership profile yixue/bazi zhongyi academy discover social login; do
  curl -sk -o /dev/null -w "${p}:%{http_code}\n" ${BASE}/${p}
done
echo "version.json: $(curl -sk ${BASE}/version.json | tr -d '\n')"

echo "[6] v25.0.43 feature presence:"
grep -rq "YandaoGuoxueIOS" "$RELEASE_DIR/_next/static/chunks/" 2>/dev/null && echo "platformGate UA marker: YES" || echo "platformGate UA marker: MISSING"
grep -rq "X-Client-Platform" "$RELEASE_DIR/_next/static/chunks/" 2>/dev/null && echo "platform header inject: YES" || echo "platform header inject: MISSING"
grep -rq "iOS 版暂未开放付费功能" "$RELEASE_DIR/_next/static/chunks/" 2>/dev/null && echo "iOS payment-disabled tip: YES" || echo "iOS payment-disabled tip: MISSING"
grep -rq "v25.0.43_D20260820" "$RELEASE_DIR/_next/static/chunks/" 2>/dev/null && echo "buildId v25.0.43 burned: YES" || echo "buildId burned: MISSING"

echo "[7] 服务端平台开关复验:"
curl -s -o /dev/null -w "payment/create(ios): %{http_code}\n" -X POST "https://yandaoguoxue.yandao.vip/api/payment/create" -H "Content-Type: application/json" -H "X-Client-Platform: ios" -d '{"userId":"probe","type":"MEMBERSHIP","amount":0.01}'
curl -s -o /dev/null -w "payment/create(web): %{http_code}\n" -X POST "https://yandaoguoxue.yandao.vip/api/payment/create" -H "Content-Type: application/json" -d '{"userId":"probe","type":"MEMBERSHIP","amount":0.01}'

rm -f "$TAR"
echo "RELEASE-DONE"
