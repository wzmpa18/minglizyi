#!/bin/bash
# ============================================================================
# v25.0.47_20 发布：首页死键清理+四柱高对比+更新自动清缓存
# 修复内容：
#   1. 首页顶部"刷新/齿轮"死键移除
#   2. 日期四柱白底红字高对比（年月日时一眼看清）
#   3. 版本更新自动清缓存（CacheStorage+SW注销后再刷新，三处reload统一）
# 构建产物 → releases/v25.0.47_20 → current 软链 → nginx 缓存清理 → 公网验证
# ============================================================================
set -euo pipefail
VERSION="v25.0.47_20"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
TAR="/root/yandaoguoxue/out_v25_0_47_20.tar.gz"
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
for p in membership profile yixue/bazi zhongyi zhongyi/classic zhongyi/herb zhongyi/exam admin friend; do
  curl -sk -o /dev/null -w "${p}:%{http_code}\n" ${BASE}/${p}
done
echo "version.json: $(curl -sk ${BASE}/version.json | tr -d '\n')"

echo "[6] v25.0.47_20 feature presence:"
grep -rq "v25.0.47_20_D20260823" "$RELEASE_DIR/_next/static/chunks/" 2>/dev/null && echo "buildId v20 burned: YES" || echo "buildId v20 burned: MISSING"
grep -rq "C62828" "$RELEASE_DIR/index.html" 2>/dev/null && echo "pillar white-red contrast: YES" || echo "pillar white-red contrast: MISSING"
grep -rq "getRegistrations" "$RELEASE_DIR/_next/static/chunks/" 2>/dev/null && echo "cache purge on update: YES" || echo "cache purge on update: MISSING"

# 同步到源码仓 out/ 供后续构建基线
rm -rf /root/yandaoguoxue-source/out
mkdir -p /root/yandaoguoxue-source/out
cp -r "$RELEASE_DIR"/. /root/yandaoguoxue-source/out/

rm -f "$TAR"
echo "RELEASE-DONE"
