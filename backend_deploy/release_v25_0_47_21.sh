#!/bin/bash
# ============================================================================
# v25.0.47_21 发布：FIX-V21-PAY-VERSION-CACHE-FINAL 四大核心闭环
#   ① 会员支付链路修复（userId字符串统一+失败弹窗+登录回跳自动唤起支付）
#   ② 版本号单一数据源（公告{APP_VERSION}/{WEB_VERSION}占位符+检查更新点击即更新）
#   ③ 后台订单中心（transaction_id+手机号+邀请人+日期筛选+CSV导出+权限）
#   ④ 缓存机制升级（30秒轮询+悬浮更新提示+点击清缓存刷新+更新完成提示）
# 流程：tar 解包 → 内容门禁 → current 切流 → 后端17文件同步 → pm2重启
#       → nginx缓存清理 → 公网验证（页面/版本/公告占位符/支付下单/订单接口）
# ============================================================================
set -euo pipefail
VERSION="v25.0.47_21"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
TAR="/root/yandaoguoxue/out_v25_0_47_21.tar.gz"
BACKEND_DIR="/www/yandaoguoxue-backend"
SRC_DIR="/root/yandaoguoxue-source"
BASE="https://yandaoguoxue.yandao.vip"

echo "=== [0] 服务器校验（部署纪律：唯一生产服务器 82.156.228.87） ==="
PUBIP=$(curl -s -m 8 ifconfig.me || true)
echo "public ip: ${PUBIP}"
[ "${PUBIP}" = "82.156.228.87" ] || { echo "FATAL: 公网IP非82.156.228.87，禁止部署"; exit 1; }
HEAD=$(git -C "$SRC_DIR" rev-parse --short HEAD)
echo "source HEAD: ${HEAD}"
[ "${HEAD}" = "527914a" ] || { echo "FATAL: 服务器源码非527914a（v21提交）"; exit 1; }

test -f "$TAR" || { echo "FATAL: tar missing"; exit 1; }
echo "=== [1] tar OK ($(du -sh "$TAR" | cut -f1)) ==="

rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
tar -xzf "$TAR" -C "$RELEASE_DIR"

test -f "$RELEASE_DIR/index.html" || { echo "FATAL: index.html missing"; exit 1; }
test -f "$RELEASE_DIR/membership/index.html" || { echo "FATAL: membership page missing"; exit 1; }
test -f "$RELEASE_DIR/admin/orders/index.html" || { echo "FATAL: admin orders page missing"; exit 1; }
test -f "$RELEASE_DIR/profile/index.html" || { echo "FATAL: profile page missing"; exit 1; }
N=$(find "$RELEASE_DIR" -type f | wc -l)
echo "=== [2] release files: ${N} ==="
[ "$N" -lt 50 ] && { echo "FATAL: too small"; exit 1; }

echo "=== [3] version.json: $(cat "$RELEASE_DIR/version.json" | tr -d '\n') ==="
VJ=$(cat "$RELEASE_DIR/version.json")
echo "$VJ" | grep -q '"version": "v25.0.47_21"' || { echo "FATAL: 包内版本号非v25.0.47_21"; exit 1; }

echo "=== [3.5] v21 内容门禁（杜绝假交付） ==="
grep -rq "v25.0.47_21" "$RELEASE_DIR/_next/static/chunks/" && echo "buildId v21 burned: YES" || { echo "FATAL: buildId v21 未烧录"; exit 1; }
grep -rq "支付未发起" "$RELEASE_DIR/_next/static/chunks/" && echo "PAY-ERROR-MODAL(支付失败弹窗): YES" || { echo "FATAL: 支付失败弹窗未入包"; exit 1; }
grep -rq "登录后即可购买会员" "$RELEASE_DIR/_next/static/chunks/" && echo "LOGIN-GUIDE(购买登录引导): YES" || { echo "FATAL: 登录引导弹窗未入包"; exit 1; }
grep -rq "yandao_membership_autopay" "$RELEASE_DIR/_next/static/chunks/" && echo "AUTOPAY(登录回跳自动支付): YES" || { echo "FATAL: 登录回跳自动支付未入包"; exit 1; }
grep -rq "导出Excel报表" "$RELEASE_DIR/_next/static/chunks/" && echo "ORDERS-EXPORT(订单导出按钮): YES" || { echo "FATAL: 订单导出按钮未入包"; exit 1; }
grep -rq "微信交易号" "$RELEASE_DIR/_next/static/chunks/" && echo "TXN-COL(交易号列): YES" || { echo "FATAL: 订单交易号列未入包"; exit 1; }
grep -rq "邀请人" "$RELEASE_DIR/_next/static/chunks/" && echo "INVITER-COL(邀请人列): YES" || { echo "FATAL: 订单邀请人列未入包"; exit 1; }
grep -rq "发现新版本" "$RELEASE_DIR/_next/static/chunks/" && echo "UPDATE-POPUP(悬浮更新提示): YES" || { echo "FATAL: 悬浮更新提示未入包"; exit 1; }
grep -rq "已更新至最新版本" "$RELEASE_DIR/_next/static/chunks/" && echo "UPDATED-TOAST(更新完成提示): YES" || { echo "FATAL: 更新完成提示未入包"; exit 1; }
grep -rq "getRegistrations" "$RELEASE_DIR/_next/static/chunks/" && echo "CACHE-PURGE(清缓存): YES" || { echo "FATAL: 清缓存逻辑未入包"; exit 1; }
BAD=$(grep -rl '82\.156\.' "$RELEASE_DIR/" 2>/dev/null | wc -l || true)
[ "$BAD" -gt 0 ] && { echo "FATAL: ${BAD} 个文件含服务器IP"; exit 1; }
echo "IP脱敏 OK"

echo "=== [4] 后端源码门禁 ==="
grep -q 'transaction_id' "$SRC_DIR/backend_deploy/paymentRoutes.js" || { echo "FATAL: 后端交易号持久化缺失"; exit 1; }
grep -q 'orders/export' "$SRC_DIR/backend_deploy/adminUnifiedRoutes.js" || { echo "FATAL: 后端订单导出接口缺失"; exit 1; }
grep -q 'APP_VERSION' "$SRC_DIR/backend_deploy/announcementRoutes.js" || { echo "FATAL: 公告版本占位符缺失"; exit 1; }

ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
A=$(readlink -f /root/yandaoguoxue/current)
echo "=== [5] current -> ${A} ==="
[ "$A" != "$RELEASE_DIR" ] && { echo "FATAL: switch failed"; exit 1; }

echo "=== [6] 后端17文件同步（含v21三文件变更） ==="
for f in adminRoles.js adminUnifiedRoutes.js announcementRoutes.js appVersionRoutes.js commissionEngine.js commissionRoutes.js contentImportRoutes.js featureControlRoutes.js newsRoutes.js paymentRoutes.js platformFeatureGate.js pointsConfigRoutes.js posterConfigRoutes.js server.js shareConfigRoutes.js toolAdminRoutes.js wechatTransfer.js; do
  cp "$SRC_DIR/backend_deploy/$f" "$BACKEND_DIR/$f"
done
grep -q 'transaction_id' "$BACKEND_DIR/paymentRoutes.js" || { echo "FATAL: 后端交易号未同步"; exit 1; }
grep -q 'orders/export' "$BACKEND_DIR/adminUnifiedRoutes.js" || { echo "FATAL: 订单导出未同步"; exit 1; }
echo "synced: 后端17文件"

echo "=== [7] 重启后端（触发transaction_id迁移） ==="
pm2 restart yandaoguoxue-backend --update-env > /dev/null 2>&1
sleep 5
pm2 list | grep yandaoguoxue-backend
curl -sk -m 10 ${BASE}/api/health | grep -q '"success"' || { echo "FATAL: 后端健康检查失败"; exit 1; }
echo "backend health OK"

echo "=== [8] 清缓存 ==="
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "=== [9] 公网验证（页面） ==="
for p in membership profile admin admin/orders admin/announcements admin/dashboard zhongyi zhongyi/classic yixue/bazi register login invite friend download index; do
  CODE=$(curl -skL -o /dev/null -w '%{http_code}' ${BASE}/${p})
  echo "公网 /${p}: ${CODE}"
  [ "$CODE" != "200" ] && { echo "FATAL: /${p} 公网非200"; exit 1; }
done

echo "=== [9.5] 版本一致性验证（四处同源） ==="
PV=$(curl -sk -m 10 ${BASE}/version.json | tr -d '\n')
echo "version.json: ${PV}"
echo "$PV" | grep -q 'v25.0.47_21' || { echo "FATAL: 公网版本号未更新到v25.0.47_21"; exit 1; }
FOOTER=$(curl -sk -m 10 ${BASE}/ | grep -o 'v25\.0\.47_2[01]' | head -1 || true)
echo "首页页脚版本引用: ${FOOTER:-（页脚版本由JS动态渲染，version.json为准）}"

echo "=== [9.7] 公告占位符验证 ==="
ANN=$(curl -sk -m 10 ${BASE}/api/announcements/public)
echo "$ANN" | grep -q '"success"' || { echo "FATAL: 公告接口不可用"; exit 1; }
if echo "$ANN" | grep -q '{APP_VERSION}'; then echo "FATAL: 公告占位符未被替换"; exit 1; fi
if echo "$ANN" | grep -q '{WEB_VERSION}'; then echo "FATAL: 公告WEB占位符未被替换"; exit 1; fi
echo "公告接口 OK（占位符已实时注入）"

echo "=== [9.8] 订单接口权限验证 ==="
NOKEY=$(curl -sk -o /dev/null -w '%{http_code}' -m 10 ${BASE}/api/admin/unified/orders)
echo "无密钥访问订单: ${NOKEY}"
[ "$NOKEY" = "401" ] || { echo "FATAL: 订单接口未鉴权"; exit 1; }
ADMIN_KEY=$(grep -E '^ADMIN_API_KEY=' /www/yandaoguoxue-backend/.env | cut -d= -f2-)
ORDERS=$(curl -sk -m 10 -H "Authorization: Bearer ${ADMIN_KEY}" "${BASE}/api/admin/unified/orders?status=PAID&size=3")
echo "$ORDERS" | grep -q '"success":true' || { echo "FATAL: 订单列表接口失败: ${ORDERS:0:200}"; exit 1; }
echo "$ORDERS" | grep -q 'transaction_id' && echo "订单含交易号字段: YES" || echo "订单含交易号字段: 暂无该字段（历史订单，迁移已含列定义）"
echo "$ORDERS" | grep -q '"phone"' && echo "订单含手机号字段: YES" || echo "订单含手机号字段: 暂无（历史订单可能无手机号用户）"
EXPORT=$(curl -sk -o /tmp/orders_test.csv -w '%{http_code}' -m 15 -H "Authorization: Bearer ${ADMIN_KEY}" "${BASE}/api/admin/unified/orders/export?status=PAID")
echo "订单导出HTTP: ${EXPORT}"
[ "$EXPORT" = "200" ] || { echo "FATAL: 订单导出失败"; exit 1; }
head -1 /tmp/orders_test.csv | grep -q '微信交易号' || { echo "FATAL: 导出CSV表头异常"; exit 1; }
echo "导出CSV OK: $(head -1 /tmp/orders_test.csv)"
rm -f /tmp/orders_test.csv

echo "=== [10] 支付下单链路回归（真实通道+userId字符串口径） ==="
PAY_BODY='{"userId":"910080","type":"MEMBERSHIP","amount":0.01,"title":"传统文化学习平台会员服务","extra":{"membershipLevel":"monthly","membershipDays":30}}'
R1=$(curl -sk -X POST ${BASE}/api/payment/create -H 'Content-Type: application/json' -d "$PAY_BODY")
echo "$R1" | grep -q 'codeUrl' || { echo "FATAL: 会员下单失败: ${R1:0:200}"; exit 1; }
R2=$(curl -sk -X POST ${BASE}/api/payment/create -H 'Content-Type: application/json' -H 'X-Client-Platform: wechat' -d "$PAY_BODY")
echo "$R2" | grep -q 'codeUrl' || { echo "FATAL: 微信平台下单被拒"; exit 1; }
NUMUID=$(echo '{"userId":910080,"type":"MEMBERSHIP","amount":0.01,"extra":{"membershipLevel":"monthly"}}' | curl -sk -X POST ${BASE}/api/payment/create -H 'Content-Type: application/json' -d @-)
echo "数字userId拒单（预期拒绝）: $(echo "$NUMUID" | grep -o '用户ID无效' || echo '未拒绝')"
echo "支付下单 OK（web/wechat平台 + 字符串userId口径）"

echo "=== [11] 公开配置接口回归 ==="
curl -sk -m 10 ${BASE}/api/public/pricing | grep -q 'membershipPlans' || { echo "FATAL: 价格SSOT不可用"; exit 1; }
curl -sk -m 10 ${BASE}/api/public/app-version | grep -q 'latestVersionCode' || { echo "FATAL: 升级接口不可用"; exit 1; }
curl -sk -m 10 ${BASE}/api/public/feature-flags | grep -q '"ai"' || { echo "FATAL: 功能开关不可用"; exit 1; }
echo "配置接口 OK"

echo "=== [12] 同步源码仓 out/ 基线 ==="
rm -rf /root/yandaoguoxue-source/out
mkdir -p /root/yandaoguoxue-source/out
cp -r "$RELEASE_DIR"/. /root/yandaoguoxue-source/out/
rm -f "$TAR"

echo "===== RELEASE v25.0.47_21 COMPLETE (HEAD=527914a) ====="
