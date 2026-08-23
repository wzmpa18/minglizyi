#!/bin/bash
# ============================================================================
# v25.0.47_12 发布：支付修复+定价对齐+深度报告提质+两级分佣+中医门控
# 构建产物 → releases/v25.0.47_12 → current 软链 → nginx 缓存清理 → 公网验证
# ============================================================================
set -euo pipefail
VERSION="v25.0.47_12"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
TAR="/root/yandaoguoxue/out_v25_0_47_12.tar.gz"
BASE="https://yandaoguoxue.yandao.vip"

test -f "$TAR" || { echo "FATAL: tar missing"; exit 1; }
echo "[1] tar OK ($(du -sh "$TAR" | cut -f1))"

rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
tar -xzf "$TAR" -C "$RELEASE_DIR"

test -f "$RELEASE_DIR/index.html" || { echo "FATAL: index.html missing"; exit 1; }
test -f "$RELEASE_DIR/membership/index.html" || { echo "FATAL: membership page missing"; exit 1; }
test -f "$RELEASE_DIR/zhongyi/index.html" || { echo "FATAL: zhongyi page missing"; exit 1; }
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
for p in membership profile yixue/bazi zhongyi zhongyi/classic zhongyi/herb zhongyi/exam admin; do
  curl -sk -o /dev/null -w "${p}:%{http_code}\n" ${BASE}/${p}
done
echo "version.json: $(curl -sk ${BASE}/version.json | tr -d '\n')"

echo "[6] v25.0.47_12 feature presence:"
grep -rq "v25.0.47_12_D20260823" "$RELEASE_DIR/_next/static/chunks/" 2>/dev/null && echo "buildId v12 burned: YES" || echo "buildId v12 burned: MISSING"
grep -rq "去开通会员" "$RELEASE_DIR/_next/static/chunks/" 2>/dev/null && echo "SectionGate upgrade-guide: YES" || echo "SectionGate upgrade-guide: MISSING"
grep -rq "该板块正在升级维护中" "$RELEASE_DIR/_next/static/chunks/" 2>/dev/null && echo "SectionGate maintenance: YES" || echo "SectionGate maintenance: MISSING"
grep -rq "统一结算" "$RELEASE_DIR/_next/static/chunks/" 2>/dev/null && echo "monthly settle copy: YES" || echo "monthly settle copy: MISSING"
grep -rq "康熙字典" "$RELEASE_DIR/_next/static/chunks/" 2>/dev/null && echo "deep report classics quote: YES" || echo "deep report classics quote: MISSING"

# 同步到源码仓 out/ 供后续构建基线
rm -rf /root/yandaoguoxue-source/out
mkdir -p /root/yandaoguoxue-source/out
cp -r "$RELEASE_DIR"/. /root/yandaoguoxue-source/out/

rm -f "$TAR"
echo "RELEASE-DONE"
