#!/bin/bash
# ============================================================================
# v25.0.47_2 前端发布：发现页行业资讯恢复 + 内容源管理页 + 六爻伏神UI
# 产物 → releases/v25.0.47_2 → current 软链 → 同步源码仓 out/ → nginx 缓存清理 → 公网验证
# ============================================================================
set -euo pipefail
VERSION="v25.0.47"
REL_TAG="v25.0.47_2"
RELEASE_DIR="/root/yandaoguoxue/releases/${REL_TAG}"
TAR="/root/yandaoguoxue/out_v25_0_47_2.tar.gz"
BASE="https://yandaoguoxue.yandao.vip"

test -f "$TAR" || { echo "FATAL: tar missing"; exit 1; }
echo "[1] tar OK ($(du -sh "$TAR" | cut -f1))"

rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
tar -xzf "$TAR" -C "$RELEASE_DIR"

test -f "$RELEASE_DIR/index.html" || { echo "FATAL: index.html missing"; exit 1; }
test -f "$RELEASE_DIR/discover/index.html" || { echo "FATAL: discover page missing"; exit 1; }
test -f "$RELEASE_DIR/admin/sources/index.html" || { echo "FATAL: admin/sources page missing"; exit 1; }
N=$(find "$RELEASE_DIR" -type f | wc -l)
echo "[2] release files: $N"
[ "$N" -lt 50 ] && { echo "FATAL: too small"; exit 1; }

echo "[3] version.json: $(cat "$RELEASE_DIR/version.json" | tr -d '\n')"

echo "[4] v25.0.47_2 内容门禁（构建产物功能标记）"
grep -q '"version": "v25.0.47"' "$RELEASE_DIR/version.json" || { echo "FATAL: 版本号非 v25.0.47"; exit 1; }
grep -q "行业资讯" "$RELEASE_DIR/discover/index.html" && echo "NEWS-TAB(行业资讯Tab) OK" || { echo "FATAL: 发现页缺行业资讯Tab"; exit 1; }
grep -rq "api/news/public" "$RELEASE_DIR/_next/static/chunks/" && echo "NEWS-API(动态加载) OK" || { echo "FATAL: 资讯API调用未入包"; exit 1; }
grep -rq "内容源管理" "$RELEASE_DIR/_next/static/chunks/" && echo "ADMIN-SOURCES(管理页) OK" || { echo "FATAL: 内容源管理页未入包"; exit 1; }
grep -rq "hiddenBranch" "$RELEASE_DIR/_next/static/chunks/" && echo "FUSHEN(伏神数据层) OK" || { echo "FATAL: 伏神数据层未入包"; exit 1; }
grep -rq "B45309" "$RELEASE_DIR/_next/static/chunks/" && echo "FUSHEN-UI(伏神渲染样式) OK" || { echo "FATAL: 伏神渲染样式未入包"; exit 1; }
BAD=$(grep -rl '101.32.191.210' "$RELEASE_DIR" 2>/dev/null | wc -l || true)
[ "$BAD" -gt 0 ] && { echo "FATAL: $BAD 个文件含错误IP"; exit 1; }
echo "错误IP扫描 OK（${BAD} 个匹配）"

echo "[5] 切换 current 软链 → $REL_TAG"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
ACTUAL=$(readlink -f /root/yandaoguoxue/current)
[ "$ACTUAL" != "$RELEASE_DIR" ] && { echo "FATAL: switch failed"; exit 1; }
echo "current -> $ACTUAL"

# 同步到源码仓 out/ 供后续构建基线
rm -rf /root/yandaoguoxue-source/out
mkdir -p /root/yandaoguoxue-source/out
cp -r "$RELEASE_DIR"/. /root/yandaoguoxue-source/out/

rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "[6] 公网验证"
for p in "" discover admin/sources yixue/liuyao groups; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' "${BASE}/${p}")
  echo "${p:-home}: ${code}"
done
echo "version.json: $(curl -sk ${BASE}/version.json | tr -d '\n')"

echo "[7] 资讯API公网联动验证"
curl -sk "${BASE}/api/news/public?page=1&pageSize=2" | python3 -c "import sys,json; d=json.load(sys.stdin); print('news-api:', d['success'], '| items:', len(d['news']), '| first-id:', d['news'][0]['id'])"

rm -f "$TAR"
echo "RELEASE-DONE"
