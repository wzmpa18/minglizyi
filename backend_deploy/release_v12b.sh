#!/bin/bash
# ============================================================================
# v25.0.47_12b 发布：深度报告提示词强化(750-900字目标820)+quartly档位后端修复
# 同版本号迭代：替换 releases/v25.0.47_12 内容 → current 指向不变 → 验证新特征
# ============================================================================
set -euo pipefail
RELEASE_DIR="/root/yandaoguoxue/releases/v25.0.47_12"
TAR="/root/yandaoguoxue/out_v12b.tar.gz"
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

# current 已指向该目录，软链不变；确保无断裂
A=$(readlink -f /root/yandaoguoxue/current)
[ "$A" != "$RELEASE_DIR" ] && ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
echo "[4] current -> $(readlink -f /root/yandaoguoxue/current)"

rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "[5] 新特征验证（本次迭代核心）:"
grep -rq "目标 820 字" "$RELEASE_DIR/_next/static/chunks/" 2>/dev/null && echo "  deep prompt 820字: YES" || echo "  deep prompt 820字: MISSING"
grep -rq "扩写第二" "$RELEASE_DIR/_next/static/chunks/" 2>/dev/null && echo "  deep prompt 自查扩写: YES" || echo "  deep prompt 自查扩写: MISSING"
grep -rq "该板块正在升级维护中" "$RELEASE_DIR/_next/static/chunks/" 2>/dev/null && echo "  SectionGate maintenance: YES" || echo "  SectionGate maintenance: MISSING"
grep -rq "去开通会员" "$RELEASE_DIR/_next/static/chunks/" 2>/dev/null && echo "  SectionGate upgrade-guide: YES" || echo "  SectionGate upgrade-guide: MISSING"

echo "[6] 公网页面验证:"
for p in "" membership profile yixue/bazi zhongyi zhongyi/classic zhongyi/herb admin; do
  code=$(curl -skL -o /dev/null -w "%{http_code}" ${BASE}/${p})
  echo "  /${p}: ${code}"
done

echo "[7] 同步到源码仓 out/ 基线"
rm -rf /root/yandaoguoxue-source/out
mkdir -p /root/yandaoguoxue-source/out
cp -r "$RELEASE_DIR"/. /root/yandaoguoxue-source/out/

rm -f "$TAR"
echo "RELEASE-DONE"
