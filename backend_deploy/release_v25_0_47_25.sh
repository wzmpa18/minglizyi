#!/bin/bash
# ============================================================================
# v25.0.47_25 发布：后台用户列表分页（浏览全部用户）
#   ① 用户管理表格下方新增分页控件：上一页/页码/下一页 + 每页条数选择
#     （20/50/100/全部显示），共 N 条 · 第 X/Y 页 概览
#   ② 后端 /moderation/users 每页上限 50→500（支持「全部显示」一页拉取）
# 本版含后端变更：adminUnifiedRoutes.js 同步 + PM2 重启
# 流程：tar 解包 → 内容门禁 → 后端同步+重启 → current 切流 → nginx缓存清理 → 公网验证
# ============================================================================
set -euo pipefail
VERSION="v25.0.47_25"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
TAR="/root/yandaoguoxue/out_v25_0_47_25.tar.gz"
BASE="https://yandaoguoxue.yandao.vip"
BACKEND_DIR="/www/yandaoguoxue-backend"

echo "=== [0] 服务器校验（部署纪律：唯一生产服务器 82.156.228.87） ==="
PUBIP=$(curl -s -m 8 ifconfig.me || true)
echo "public ip: ${PUBIP}"
[ "${PUBIP}" = "82.156.228.87" ] || { echo "FATAL: 公网IP非82.156.228.87，禁止部署"; exit 1; }

test -f "$TAR" || { echo "FATAL: tar missing"; exit 1; }
echo "=== [1] tar OK ($(du -sh "$TAR" | cut -f1)) ==="

echo "=== [2] 解包到 ${RELEASE_DIR} ==="
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
tar -xzf "$TAR" -C "$RELEASE_DIR"
echo "files: $(find "$RELEASE_DIR" -type f | wc -l)"

echo "=== [3] 内容门禁（v25 修复关键代码入包校验） ==="
CHK_DIR="$RELEASE_DIR/_next/static/chunks"
fail=0
V=$(grep -o '"version": *"[^"]*"' "$RELEASE_DIR/version.json" || true)
echo "version.json: $V"
echo "$V" | grep -q "v25.0.47_25" || { echo "FAIL: buildId 未烧录 v25"; fail=1; }
grep -rlq '全部显示' "$CHK_DIR" || { echo "FAIL: 分页全部显示选项未入包"; fail=1; }
grep -rlq '条/页' "$CHK_DIR" || { echo "FAIL: 每页条数选择未入包"; fail=1; }
grep -rlq '上一页' "$CHK_DIR" || { echo "FAIL: 上一页按钮未入包"; fail=1; }
# v24 回归项：用户表格手机号/邮箱列仍在
grep -rlq '搜索昵称 / 用户ID / 手机号 / 邮箱' "$CHK_DIR" || { echo "FAIL: v24搜索placeholder回归丢失"; fail=1; }
IPLEAK=$(grep -rlE '82\.156\.228\.87|8\.155\.23\.111' "$CHK_DIR" | wc -l || true)
[ "$IPLEAK" = "0" ] || { echo "FAIL: IP泄漏 $IPLEAK 个文件"; fail=1; }
[ "$fail" = "0" ] || { echo "FATAL: 内容门禁未通过"; exit 1; }
echo "内容门禁 6 项全过"

echo "=== [4] 后端同步（v25 变更：moderation/users size 上限 500） ==="
if [ -f /root/yandaoguoxue-source/backend_deploy/adminUnifiedRoutes.js ]; then
  cp /root/yandaoguoxue-source/backend_deploy/adminUnifiedRoutes.js "$BACKEND_DIR/adminUnifiedRoutes.js"
  echo "adminUnifiedRoutes.js synced"
  grep -q 'Math.min(500' "$BACKEND_DIR/adminUnifiedRoutes.js" || { echo "FAIL: size上限500未同步"; exit 1; }
  pm2 restart yandaoguoxue-backend --update-env >/dev/null 2>&1
  sleep 3
  curl -sk -m 10 ${BASE}/api/health | grep -q '"success"' && echo "backend restart + health OK" || { echo "FAIL: 后端重启后不健康"; exit 1; }
else
  echo "FATAL: 服务器源码仓无 adminUnifiedRoutes.js（先 git pull）"; exit 1
fi

echo "=== [5] current 切流 ==="
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
readlink /root/yandaoguoxue/current

echo "=== [6] nginx 缓存清理 ==="
rm -rf /var/cache/nginx/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true

echo "=== [7] 公网验证 ==="
V2=$(curl -sk -m 10 "$BASE/version.json")
echo "version.json: $V2"
echo "$V2" | grep -q 'v25.0.47_25' || { echo "FAIL: 公网版本号未更新"; exit 1; }
for p in / /membership/ /login/ /profile/ /profile/settings/ /admin/ /admin/moderation/; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' -m 15 "$BASE$p")
  echo "  $p -> $code"
  [ "$code" = "200" ] || { echo "FAIL: $p 非200"; exit 1; }
done
code=$(curl -sk -o /dev/null -w '%{http_code}' -m 10 "$BASE/api/admin/unified/moderation/users")
echo "moderation/users 无密钥 -> $code (预期401)"
[ "$code" = "401" ] || { echo "WARN: 鉴权非401，请人工复核"; }

echo "===== RELEASE v25.0.47_25 COMPLETE ====="
