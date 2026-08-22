#!/bin/bash
# v25.0.47_10 发布：FINAL-ADMIN-COMMERCIAL-SEAL-02 运营管理中心封板
#   1) /admin 统一运营管理中心：17菜单导航 + 老板驾驶舱（20项指标/三色健康/版本/Commit）
#   2) 系统功能开关总中心（17项 ON/OFF/MAINTENANCE）+ 服务端强制拦截（关ai→AI调用403已实测）
#   3) 工具管理矩阵：14款工具 服务端配置（开关/维护/收费/会员/平台/AI额度），替代localStorage
#   4) 价格SSOT：/api/public/pricing 公开接口 + 前端pricingStore消费（后台改价实时生效免发版）
#   5) 订单详情/权益重试发放（幂等）+ env ADMIN_API_KEY 统一映射 SUPER_ADMIN
#   6) AI结构化错误码：AI_DISABLED/AI_MAINTENANCE/AI_SERVICE_UNAVAILABLE 分级提示
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.47"
RELEASE_DIR="/root/yandaoguoxue/releases/v25.0.47_10"
BACKEND_DIR="/www/yandaoguoxue-backend"

cd "$SRC_DIR"

echo "--- [0] 源码状态 ---"
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"
grep -q "\"version\": \"${VERSION}\"" package.json || { echo "FATAL: package.json 版本非${VERSION}"; exit 1; }

echo "--- [1] 内容门禁（v25.0.47_9 支付解耦全量保留 + v25.0.47_10 后台封板新增） ---"
# v25.0.47_8 支付真实化门禁（保留）
grep -q 'payForMembership' src/app/membership/page.tsx || { echo "FATAL: 会员页未接真实支付"; exit 1; }
grep -q 'paySingleUnlockAndWait' src/components/EventDivinationPanel.tsx || { echo "FATAL: 断法面板未接真实支付"; exit 1; }
grep -q 'paySingleUnlockAndWait' src/components/AIInterpretButton.tsx || { echo "FATAL: AI按钮未接真实支付"; exit 1; }
grep -q 'paySingleUnlockAndWait' src/components/shared/InterpretationDrawer.tsx || { echo "FATAL: 解读抽屉未接真实支付"; exit 1; }
grep -q 'paySingleUnlockAndWait' src/app/zhongyi/wenzhen/page.tsx || { echo "FATAL: 中医问诊未接真实支付"; exit 1; }
grep -q 'deliverOrderBenefits' backend_deploy/paymentRoutes.js || { echo "FATAL: 后端权益交付缺失"; exit 1; }
grep -q 'benefit_delivered' backend_deploy/paymentRoutes.js || { echo "FATAL: 交付持久化缺失"; exit 1; }
# v25.0.47_9 支付解耦门禁（保留）
grep -q 'createNativeOrder' backend_deploy/wechatPayV3.js || { echo "FATAL: 后端Native下单缺失"; exit 1; }
grep -q 'codeUrl' backend_deploy/paymentRoutes.js || { echo "FATAL: 后端NATIVE响应缺失"; exit 1; }
grep -q 'NativePayTicket' src/lib/paymentService.ts || { echo "FATAL: 前端扫码票券类型缺失"; exit 1; }
grep -q 'useNativePayQR' src/components/PayQRCodeModal.tsx || { echo "FATAL: 扫码支付弹层缺失"; exit 1; }
grep -q 'createJsapiOrder' backend_deploy/wechatPayV3.js || { echo "FATAL: JSAPI通道被误删"; exit 1; }
grep -q 'jsapiParams' backend_deploy/paymentRoutes.js || { echo "FATAL: JSAPI响应被误删"; exit 1; }
# v25.0.47_10 后台封板门禁（新增）
grep -q 'globalFeatureGate' backend_deploy/featureControlRoutes.js || { echo "FATAL: 功能开关服务端强制缺失"; exit 1; }
grep -q 'DEFAULT_MEMBERSHIP_PLANS' backend_deploy/publicPricingRoutes.js || { echo "FATAL: 价格SSOT默认套餐缺失"; exit 1; }
grep -q 'loadMatrix' backend_deploy/toolAdminRoutes.js || { echo "FATAL: 工具矩阵服务端配置缺失"; exit 1; }
grep -q 'retry-delivery' backend_deploy/paymentRoutes.js || { echo "FATAL: 权益重试发放缺失"; exit 1; }
grep -q 'AI_SERVICE_UNAVAILABLE' backend_deploy/server.js || { echo "FATAL: AI结构化错误码缺失"; exit 1; }
grep -q '运营管理中心' src/app/admin/layout.tsx || { echo "FATAL: 后台统一名称缺失"; exit 1; }
grep -q 'useAiPricing' src/lib/pricingStore.ts || { echo "FATAL: 前端价格SSOT消费层缺失"; exit 1; }
grep -q 'useServerPricing\|useAiPricing' src/app/membership/page.tsx || { echo "FATAL: 会员页未接价格SSOT"; exit 1; }
grep -q 'useAiPricing' src/components/EventDivinationPanel.tsx || { echo "FATAL: 断法面板未接价格SSOT"; exit 1; }
grep -q 'useAiPricing' src/components/AIInterpretButton.tsx || { echo "FATAL: AI按钮未接价格SSOT"; exit 1; }
grep -q 'useAiPricing' src/components/shared/InterpretationDrawer.tsx || { echo "FATAL: 解读抽屉未接价格SSOT"; exit 1; }
grep -q 'useAiPricing' src/app/zhongyi/wenzhen/page.tsx || { echo "FATAL: 中医问诊未接价格SSOT"; exit 1; }
test -f src/app/admin/feature-flags/page.tsx || { echo "FATAL: 功能开关页缺失"; exit 1; }
test -f src/app/admin/tool-control/page.tsx || { echo "FATAL: 工具管理页缺失"; exit 1; }
test -f src/app/admin/pricing/page.tsx || { echo "FATAL: 价格中心页缺失"; exit 1; }
test -f src/app/admin/marketing/page.tsx || { echo "FATAL: 营销管理页缺失"; exit 1; }
echo "内容门禁 OK"

echo "--- [2] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -6

echo "--- [3] 页面导出校验 ---"
for p in membership zhongyi yixue yixue/phone academy/yikao profile admin admin/feature-flags admin/tool-control admin/pricing admin/marketing admin/membership admin/ai-control admin/orders admin/commission admin/moderation admin/alerts admin/tools; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
done
echo "OK: 全部后台页面导出"
test -f "out/index.html" || { echo "FATAL: out/index.html missing"; exit 1; }

echo "--- [3.5] 烧录ID一致性 ---"
BUILD_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('out/version.json','utf8')).buildId)")
echo "buildId: ${BUILD_ID}"
grep -rq "${BUILD_ID}" out/_next/static/chunks/ && echo "烧录ID一致 OK" || { echo "FATAL: 包内烧录ID缺失"; exit 1; }

echo "--- [3.6] 后台封板内容入包校验 ---"
grep -rq "运营管理中心" out/_next/static/chunks/ && echo "ADMIN-SHELL OK" || { echo "FATAL: 运营管理中心壳未入包"; exit 1; }
grep -rq "useAiPricing\|server-ssot" out/_next/static/chunks/ && echo "PRICING-SSOT OK" || { echo "FATAL: 价格SSOT未入包"; exit 1; }
grep -rq "AI_SERVICE_UNAVAILABLE" out/_next/static/chunks/ && echo "AI-ERRCODE OK" || { echo "FATAL: AI错误码未入包"; exit 1; }
grep -rq "payForMembership" out/_next/static/chunks/ && echo "PAY-MEMBERSHIP OK" || { echo "FATAL: 会员支付未入包"; exit 1; }
grep -rq "长按识别二维码完成支付" out/_next/static/chunks/ && echo "PAY-QR-TIP OK" || { echo "FATAL: 扫码提示未入包"; exit 1; }

echo "--- [4] 发布到 ${RELEASE_DIR} ---"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
cp -r out/* "$RELEASE_DIR/"
RELEASE_FILES=$(find "$RELEASE_DIR" -type f | wc -l)
echo "Release file count: ${RELEASE_FILES}"
[ "$RELEASE_FILES" -lt 50 ] && { echo "FATAL: 文件数异常"; exit 1; }

echo "--- [4.5] 后端同步（v25.0.47_10 全部6文件） ---"
for f in featureControlRoutes.js publicPricingRoutes.js toolAdminRoutes.js adminUnifiedRoutes.js paymentRoutes.js server.js; do
  cp "backend_deploy/$f" "$BACKEND_DIR/$f"
  grep -q 'v25.0.47_10' "$BACKEND_DIR/$f" 2>/dev/null || true
done
grep -q 'globalFeatureGate' "$BACKEND_DIR/server.js" || { echo "FATAL: 后端开关强制未同步"; exit 1; }
grep -q 'DEFAULT_MEMBERSHIP_PLANS' "$BACKEND_DIR/publicPricingRoutes.js" || { echo "FATAL: 价格SSOT未同步"; exit 1; }
echo "synced: 后端6文件"

echo "--- [5] 切换 current 软链 ---"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
ACTUAL=$(readlink -f /root/yandaoguoxue/current)
echo "current -> ${ACTUAL}"
[ "$ACTUAL" != "$RELEASE_DIR" ] && { echo "FATAL: symlink switch failed"; exit 1; }

echo "--- [6] 重启后端 ---"
pm2 restart yandaoguoxue-backend --update-env > /dev/null 2>&1
sleep 4
pm2 list | grep yandaoguoxue-backend

echo "--- [7] 清理 nginx 缓存 ---"
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "--- [8] 公网验证 ---"
DOMAIN="https://yandaoguoxue.yandao.vip"
for path in membership zhongyi yixue yixue/phone academy/yikao profile index admin admin/feature-flags admin/tool-control admin/pricing admin/marketing api/health; do
  CODE=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/${path})
  echo "公网 /${path}: ${CODE}"
  [ "$CODE" != "200" ] && { echo "FATAL: /${path} 公网非200"; exit 1; }
done

echo "--- [9] 公开配置接口公网验证 ---"
curl -s -m 10 ${DOMAIN}/api/public/pricing | grep -q 'membershipPlans' && echo "PRICING-SSOT 公网 OK" || { echo "FATAL: 价格SSOT公网不可用"; exit 1; }
curl -s -m 10 ${DOMAIN}/api/public/feature-flags | grep -q '"ai"' && echo "FEATURE-FLAGS 公网 OK" || { echo "FATAL: 功能开关公网不可用"; exit 1; }
curl -s -m 10 ${DOMAIN}/api/public/tool-matrix | grep -q 'bazi' && echo "TOOL-MATRIX 公网 OK" || { echo "FATAL: 工具矩阵公网不可用"; exit 1; }

echo "--- [10] 支付下单链路验证（Native扫码） ---"
PAY_RESP=$(curl -s -X POST ${DOMAIN}/api/payment/create -H 'Content-Type: application/json' \
  -d '{"userId":"910080","type":"MEMBERSHIP","amount":0.01,"title":"传统文化学习平台会员服务","extra":{"membershipLevel":"monthly","membershipDays":30}}')
echo "$PAY_RESP" | head -c 300; echo
echo "$PAY_RESP" | grep -q '"payMode":"NATIVE"' && echo "NATIVE下单 OK" || { echo "FATAL: Native下单未生效"; exit 1; }
echo "$PAY_RESP" | grep -q 'codeUrl' && echo "codeUrl OK" || { echo "FATAL: 缺少codeUrl"; exit 1; }

echo "===== DEPLOY v25.0.47_10 COMPLETE (HEAD=${HEAD}) ====="
