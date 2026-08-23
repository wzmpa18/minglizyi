#!/bin/bash
# ============================================================================
# v25.0.47_23 发布：会员购买引导 fixed 悬浮底栏
#   ① 「立即开通」按钮由文档流底部改为 fixed 悬浮底栏
#      （bottom: 底部导航高度+safe-area，zIndex 1001，任何滚动位置可见）
#   ② 文档流 132px 占位防 fixed 栏遮挡页面尾部内容
#   ③ 点击会员卡片 → 无需滚动即见「立即开通 · ¥XX」购买引导
#   ④ 中医区「升级会员」入口改滚动到套餐区（plan-section 锚点）
# 根因：v22 前按钮位于页面文档流最底部（页面总高 3533px，视口 900px），
#       用户点击会员卡片后需滚动 2633px（约3屏）才能看到按钮 → 感知为死键
# 说明：v23 纯前端变更（membership/page.tsx+package.json），后端不重启仅健康检查
# 流程：tar 解包 → 内容门禁 → current 切流 → nginx缓存清理 → 公网验证
# ============================================================================
set -euo pipefail
VERSION="v25.0.47_23"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
TAR="/root/yandaoguoxue/out_v25_0_47_23.tar.gz"
BASE="https://yandaoguoxue.yandao.vip"

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

echo "=== [3] 内容门禁（v23 修复关键代码入包校验） ==="
CHK_DIR="$RELEASE_DIR/_next/static/chunks"
fail=0
# 3.1 buildId 烧录
V=$(grep -o '"version": *"[^"]*"' "$RELEASE_DIR/version.json" || true)
echo "version.json: $V"
echo "$V" | grep -q "v25.0.47_23" || { echo "FAIL: buildId 未烧录 v23"; fail=1; }
# 3.2 fixed 悬浮底栏 CSS（bottom-nav-height + safe-area 计算）
grep -rlq 'bottom-nav-height, 56px) + env(safe-area-inset-bottom' "$CHK_DIR" || { echo "FAIL: fixed底栏CSS未入包"; fail=1; }
# 3.3 132px 文档流占位
grep -rlq 'height:"132px"' "$CHK_DIR" || { echo "FAIL: 132px占位未入包"; fail=1; }
# 3.4 plan-section 锚点
grep -rlq 'plan-section' "$CHK_DIR" || { echo "FAIL: plan-section锚点未入包"; fail=1; }
# 3.5 zIndex 1001（悬浮栏层级）
grep -rlq 'zIndex:1001' "$CHK_DIR" || { echo "FAIL: zIndex 1001未入包"; fail=1; }
# 3.6 服务器 IP 脱敏（grep 无匹配返回1，pipefail+set -e 会静默退出，须 || true）
IPLEAK=$(grep -rlE '82\.156\.228\.87|8\.155\.23\.111' "$CHK_DIR" | wc -l || true)
[ "$IPLEAK" = "0" ] || { echo "FAIL: IP泄漏 $IPLEAK 个文件"; fail=1; }
[ "$fail" = "0" ] || { echo "FATAL: 内容门禁未通过"; exit 1; }
echo "内容门禁 6 项全过"

echo "=== [4] current 切流 ==="
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
readlink /root/yandaoguoxue/current

echo "=== [5] nginx 缓存清理 ==="
rm -rf /var/cache/nginx/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true

echo "=== [6] 后端健康检查（v23 无后端变更，仅确认在线） ==="
curl -sk -m 10 ${BASE}/api/health | grep -q '"success"' && echo "backend health OK"

echo "=== [7] 公网验证 ==="
V2=$(curl -sk -m 10 "$BASE/version.json")
echo "version.json: $V2"
echo "$V2" | grep -q 'v25.0.47_23' || { echo "FAIL: 公网版本号未更新"; exit 1; }
for p in / /membership/ /login/ /profile/ /invite/ /orders/; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' -m 15 "$BASE$p")
  echo "  $p -> $code"
  [ "$code" = "200" ] || { echo "FAIL: $p 非200"; exit 1; }
done
# membership 页 chunk 引用可达
curl -sk -o /dev/null -w 'membership page: %{http_code}\n' -m 15 "$BASE/membership/"

echo "===== RELEASE v25.0.47_23 COMPLETE ====="
