#!/bin/bash
# ============================================================================
# v25.0.47_22 发布：MARKETING-POSTER-V2-AI 邀请裂变海报营销化升级
#   ① 三套模板全量重构（朋友圈种草/社群引流/学习进阶，结果型卖点+两栏分组）
#   ② 渲染引擎升级（主标题≤宽1/8自适应/二维码≥宽1/4/行动召唤条/合规#AAAAAA）
#   ③ AI智能文案生成（3风格并行生成+敏感词过滤+一键应用+再来一组）
#   ④ 分享文案库三场景（朋友圈/社群/私聊+一键复制）
# 说明：v22 为纯前端变更（9文件，无 backend_deploy 变更），后端不重启仅健康检查
# 流程：tar 解包 → 内容门禁 → current 切流 → nginx缓存清理 → 公网验证
#       （页面/版本/AI代理路由/支付回归/订单回归）
# ============================================================================
set -euo pipefail
VERSION="v25.0.47_22"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
TAR="/root/yandaoguoxue/out_v25_0_47_22.tar.gz"
SRC_DIR="/root/yandaoguoxue-source"
BASE="https://yandaoguoxue.yandao.vip"

echo "=== [0] 服务器校验（部署纪律：唯一生产服务器 82.156.228.87） ==="
PUBIP=$(curl -s -m 8 ifconfig.me || true)
echo "public ip: ${PUBIP}"
[ "${PUBIP}" = "82.156.228.87" ] || { echo "FATAL: 公网IP非82.156.228.87，禁止部署"; exit 1; }
HEAD=$(git -C "$SRC_DIR" rev-parse --short HEAD)
echo "source HEAD: ${HEAD}"
[ "${HEAD}" = "d1eaf27" ] || { echo "FATAL: 服务器源码非d1eaf27（v22修复提交）"; exit 1; }

test -f "$TAR" || { echo "FATAL: tar missing"; exit 1; }
echo "=== [1] tar OK ($(du -sh "$TAR" | cut -f1)) ==="

rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
tar -xzf "$TAR" -C "$RELEASE_DIR"

test -f "$RELEASE_DIR/index.html" || { echo "FATAL: index.html missing"; exit 1; }
test -f "$RELEASE_DIR/invite/index.html" || { echo "FATAL: invite page missing"; exit 1; }
test -f "$RELEASE_DIR/invite/poster/index.html" || { echo "FATAL: invite/poster page missing"; exit 1; }
test -f "$RELEASE_DIR/membership/index.html" || { echo "FATAL: membership page missing"; exit 1; }
test -f "$RELEASE_DIR/admin/orders/index.html" || { echo "FATAL: admin orders page missing"; exit 1; }
N=$(find "$RELEASE_DIR" -type f | wc -l)
echo "=== [2] release files: ${N} ==="
[ "$N" -lt 50 ] && { echo "FATAL: too small"; exit 1; }

echo "=== [3] version.json: $(cat "$RELEASE_DIR/version.json" | tr -d '\n') ==="
VJ=$(cat "$RELEASE_DIR/version.json")
echo "$VJ" | grep -q '"version": "v25.0.47_22"' || { echo "FATAL: 包内版本号非v25.0.47_22"; exit 1; }

echo "=== [3.5] v22 内容门禁（杜绝假交付） ==="
grep -rq "v25.0.47_22" "$RELEASE_DIR/_next/static/chunks/" && echo "buildId v22 burned: YES" || { echo "FATAL: buildId v22 未烧录"; exit 1; }
grep -rq "AI换文案" "$RELEASE_DIR/_next/static/chunks/" && echo "AI-BUTTON(AI换文案按钮): YES" || { echo "FATAL: AI换文案按钮未入包"; exit 1; }
grep -rq "私藏很久的国学宝藏工具" "$RELEASE_DIR/_next/static/chunks/" && echo "TPL1(朋友圈种草版): YES" || { echo "FATAL: 模板一未入包"; exit 1; }
grep -rq "免费！专业级国学工具平台" "$RELEASE_DIR/_next/static/chunks/" && echo "TPL2(社群引流版): YES" || { echo "FATAL: 模板二未入包"; exit 1; }
grep -rq "你的随身国学学习助手" "$RELEASE_DIR/_next/static/chunks/" && echo "TPL3(学习进阶版): YES" || { echo "FATAL: 模板三未入包"; exit 1; }
grep -rq "再来一组" "$RELEASE_DIR/_next/static/chunks/" && echo "REGEN(再来一组): YES" || { echo "FATAL: 再来一组未入包"; exit 1; }
grep -rq "永久免费基础功能" "$RELEASE_DIR/_next/static/chunks/" && echo "QRNOTE(二维码标注): YES" || { echo "FATAL: 二维码标注未入包"; exit 1; }
grep -rq "扫码注册即得免费AI解析次数" "$RELEASE_DIR/_next/static/chunks/" && echo "BENEFIT(福利召唤条): YES" || { echo "FATAL: 福利行动召唤条未入包"; exit 1; }
BAD=$(grep -rl '82\.156\.' "$RELEASE_DIR/" 2>/dev/null | wc -l || true)
[ "$BAD" -gt 0 ] && { echo "FATAL: ${BAD} 个文件含服务器IP"; exit 1; }
echo "IP脱敏 OK"

echo "=== [4] 后端回归守护（v22无后端变更，仅确认v21能力仍在） ==="
grep -q 'transaction_id' "$SRC_DIR/backend_deploy/paymentRoutes.js" || { echo "FATAL: 后端交易号持久化缺失"; exit 1; }
grep -q 'orders/export' "$SRC_DIR/backend_deploy/adminUnifiedRoutes.js" || { echo "FATAL: 后端订单导出接口缺失"; exit 1; }
curl -sk -m 10 ${BASE}/api/health | grep -q '"success"' || { echo "FATAL: 后端健康检查失败"; exit 1; }
echo "backend health OK（v22纯前端，不重启后端）"

ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
A=$(readlink -f /root/yandaoguoxue/current)
echo "=== [5] current -> ${A} ==="
[ "$A" != "$RELEASE_DIR" ] && { echo "FATAL: switch failed"; exit 1; }

echo "=== [6] 清缓存 ==="
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "=== [7] 公网验证（页面，含海报两页） ==="
for p in membership profile admin admin/orders admin/announcements admin/dashboard zhongyi zhongyi/classic yixue/bazi register login invite invite/poster friend download index; do
  CODE=$(curl -skL -o /dev/null -w '%{http_code}' ${BASE}/${p})
  echo "公网 /${p}: ${CODE}"
  [ "$CODE" != "200" ] && { echo "FATAL: /${p} 公网非200"; exit 1; }
done

echo "=== [7.5] 版本一致性验证 ==="
PV=$(curl -sk -m 10 ${BASE}/version.json | tr -d '\n')
echo "version.json: ${PV}"
echo "$PV" | grep -q 'v25.0.47_22' || { echo "FATAL: 公网版本号未更新到v25.0.47_22"; exit 1; }

echo "=== [7.7] AI代理路由验证（海报AI换文案通道，不消耗AI额度） ==="
AICODE=$(curl -sk -o /tmp/ai_probe.json -w '%{http_code}' -m 10 -X POST ${BASE}/api/ai/chat -H 'Content-Type: application/json' -d '{"userPrompt":""}')
echo "/api/ai/chat 空参探测HTTP: ${AICODE}（非404即路由存在，空参不触发AI调用）"
[ "$AICODE" = "404" ] && { echo "FATAL: AI代理路由不存在"; exit 1; }
rm -f /tmp/ai_probe.json

echo "=== [8] 支付下单链路回归（v21核心能力守护） ==="
PAY_BODY='{"userId":"910080","type":"MEMBERSHIP","amount":0.01,"title":"传统文化学习平台会员服务","extra":{"membershipLevel":"monthly","membershipDays":30}}'
R1=$(curl -sk -X POST ${BASE}/api/payment/create -H 'Content-Type: application/json' -d "$PAY_BODY")
echo "$R1" | grep -q 'codeUrl' || { echo "FATAL: 会员下单失败: ${R1:0:200}"; exit 1; }
echo "支付下单 OK"

echo "=== [9] 订单接口回归（v21核心能力守护） ==="
ADMIN_KEY=$(grep -E '^ADMIN_API_KEY=' /www/yandaoguoxue-backend/.env | cut -d= -f2-)
ORDERS=$(curl -sk -m 10 -H "Authorization: Bearer ${ADMIN_KEY}" "${BASE}/api/admin/unified/orders?status=PAID&size=3")
echo "$ORDERS" | grep -q '"success":true' || { echo "FATAL: 订单列表接口失败: ${ORDERS:0:200}"; exit 1; }
echo "订单接口 OK"

echo "=== [10] 公开配置接口回归 ==="
curl -sk -m 10 ${BASE}/api/public/pricing | grep -q 'membershipPlans' || { echo "FATAL: 价格SSOT不可用"; exit 1; }
curl -sk -m 10 ${BASE}/api/public/app-version | grep -q 'latestVersionCode' || { echo "FATAL: 升级接口不可用"; exit 1; }
curl -sk -m 10 ${BASE}/api/public/feature-flags | grep -q '"ai"' || { echo "FATAL: 功能开关不可用"; exit 1; }
echo "配置接口 OK"

echo "=== [11] 同步源码仓 out/ 基线 ==="
rm -rf /root/yandaoguoxue-source/out
mkdir -p /root/yandaoguoxue-source/out
cp -r "$RELEASE_DIR"/. /root/yandaoguoxue-source/out/
rm -f "$TAR"

echo "===== RELEASE v25.0.47_22 COMPLETE (HEAD=c2e3741) ====="
