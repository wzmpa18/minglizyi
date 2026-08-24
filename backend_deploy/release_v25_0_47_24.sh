#!/bin/bash
# ============================================================================
# v25.0.47_24 发布：后台用户完整注册信息 + 屏幕放大默认关闭
#   ① 后台「用户管理」(/admin/moderation 用户tab) 展示完整手机号+注册邮箱
#      （去脱敏直出，后台已鉴权 SUPPORT_ADMIN/ops；搜索支持邮箱）
#   ② 个人中心-通用设置「屏幕放大」默认关闭
#      （yandao_zoom_disabled 未设置时=禁用缩放；仅显式开启才生效）
# 本版含后端变更：adminUnifiedRoutes.js 需同步 /www/yandaoguoxue-backend + PM2 重启
# 流程：tar 解包 → 内容门禁 → 后端同步+重启 → current 切流 → nginx缓存清理 → 公网验证
# ============================================================================
set -euo pipefail
VERSION="v25.0.47_24"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
TAR="/root/yandaoguoxue/out_v25_0_47_24.tar.gz"
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

echo "=== [3] 内容门禁（v24 修复关键代码入包校验） ==="
CHK_DIR="$RELEASE_DIR/_next/static/chunks"
fail=0
# 3.1 buildId 烧录
V=$(grep -o '"version": *"[^"]*"' "$RELEASE_DIR/version.json" || true)
echo "version.json: $V"
echo "$V" | grep -q "v25.0.47_24" || { echo "FAIL: buildId 未烧录 v24"; fail=1; }
# 3.2 用户表格手机号/邮箱列（admin moderation 页）
grep -rlq '搜索昵称 / 用户ID / 手机号 / 邮箱' "$RELEASE_DIR/_next/static/chunks" || { echo "FAIL: 搜索placeholder未入包"; fail=1; }
# 3.3 放大默认关闭（显式开启才启用：'"0"' 比较逻辑）
grep -rlq 'yandao_zoom_disabled' "$CHK_DIR" || { echo "FAIL: zoom开关键未入包"; fail=1; }
# 3.4 设置页开关文案仍在
grep -rlq '屏幕放大' "$CHK_DIR" || { echo "FAIL: 屏幕放大文案未入包"; fail=1; }
# 3.5 服务器 IP 脱敏（grep 无匹配返回1，pipefail+set -e 会静默退出，须 || true）
IPLEAK=$(grep -rlE '82\.156\.228\.87|8\.155\.23\.111' "$CHK_DIR" | wc -l || true)
[ "$IPLEAK" = "0" ] || { echo "FAIL: IP泄漏 $IPLEAK 个文件"; fail=1; }
[ "$fail" = "0" ] || { echo "FATAL: 内容门禁未通过"; exit 1; }
echo "内容门禁 5 项全过"

echo "=== [4] 后端同步（v24 变更：adminUnifiedRoutes.js 去脱敏+邮箱列） ==="
if [ -f /root/yandaoguoxue-source/backend_deploy/adminUnifiedRoutes.js ]; then
  cp /root/yandaoguoxue-source/backend_deploy/adminUnifiedRoutes.js "$BACKEND_DIR/adminUnifiedRoutes.js"
  echo "adminUnifiedRoutes.js synced"
  grep -q 'email LIKE ?' "$BACKEND_DIR/adminUnifiedRoutes.js" || { echo "FAIL: 后端邮箱搜索未同步"; exit 1; }
  grep -q "slice(0, 3) + '****'" "$BACKEND_DIR/adminUnifiedRoutes.js" && { echo "FAIL: 脱敏逻辑仍在"; exit 1; } || echo "脱敏已移除 OK"
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
echo "$V2" | grep -q 'v25.0.47_24' || { echo "FAIL: 公网版本号未更新"; exit 1; }
for p in / /membership/ /login/ /profile/ /profile/settings/ /invite/ /admin/ /admin/moderation/; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' -m 15 "$BASE$p")
  echo "  $p -> $code"
  [ "$code" = "200" ] || { echo "FAIL: $p 非200"; exit 1; }
done
# 后端接口无密钥应 401（鉴权仍在）
code=$(curl -sk -o /dev/null -w '%{http_code}' -m 10 "$BASE/api/admin/unified/moderation/users")
echo "moderation/users 无密钥 -> $code (预期401)"
[ "$code" = "401" ] || { echo "WARN: 鉴权非401，请人工复核"; }

echo "===== RELEASE v25.0.47_24 COMPLETE ====="
