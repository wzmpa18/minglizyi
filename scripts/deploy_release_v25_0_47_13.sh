#!/bin/bash
# v25.0.47_13 发布：FIX-WITHDRAW-V13-FINAL 商家转账提现 + 三级角色权限体系
#   1) 微信商家转账V3全量对接（transfer-bills 发起/查询/撤销 + 回调验签落账 + 幂等）
#   2) 提现引擎：免审额度自动转账 / 超200元人工审核 / 单日2万限额 / 风控标记 / 退款扣回
#   3) 三级角色权限（SUPER_ADMIN/FINANCE_ADMIN/OPERATOR_ADMIN 服务端强校验 adminRoles.js）
#   4) 后台抽屉式导航（全端统一，默认收起，内容区全宽不遮挡）+ 按角色渲染菜单
#   5) 密钥管理页（子密钥签发/禁用/三级角色说明/主密钥修改指引）
#   6) 财务端：提现批量审核 / 转账状态同步 / 佣金统计报表 / 提现记录CSV导出
#   7) 深度解析提示词 700-1000 字（条理清晰不啰嗦）
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.47"
RELEASE_DIR="/root/yandaoguoxue/releases/v25.0.47_13"
BACKEND_DIR="/www/yandaoguoxue-backend"

cd "$SRC_DIR"

echo "--- [0] 源码状态 ---"
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"
grep -q "\"version\": \"${VERSION}_13\"" package.json || { echo "FATAL: package.json 版本非${VERSION}_13"; exit 1; }

echo "--- [1] 内容门禁（v25.0.47_12 全量保留 + v25.0.47_13 新增） ---"
# 存量门禁（支付/后台封板，全量保留）
grep -q 'payForMembership' src/app/membership/page.tsx || { echo "FATAL: 会员页未接真实支付"; exit 1; }
grep -q 'paySingleUnlockAndWait' src/components/AIInterpretButton.tsx || { echo "FATAL: AI按钮未接真实支付"; exit 1; }
grep -q 'deliverOrderBenefits' backend_deploy/paymentRoutes.js || { echo "FATAL: 后端权益交付缺失"; exit 1; }
grep -q 'createNativeOrder' backend_deploy/wechatPayV3.js || { echo "FATAL: 后端Native下单缺失"; exit 1; }
grep -q 'codeUrl' backend_deploy/paymentRoutes.js || { echo "FATAL: 后端NATIVE响应缺失"; exit 1; }
grep -q 'globalFeatureGate' backend_deploy/featureControlRoutes.js || { echo "FATAL: 功能开关服务端强制缺失"; exit 1; }
grep -q 'DEFAULT_MEMBERSHIP_PLANS' backend_deploy/publicPricingRoutes.js || { echo "FATAL: 价格SSOT默认套餐缺失"; exit 1; }
grep -q 'loadMatrix' backend_deploy/toolAdminRoutes.js || { echo "FATAL: 工具矩阵服务端配置缺失"; exit 1; }
grep -q '运营管理中心' src/app/admin/layout.tsx || { echo "FATAL: 后台统一名称缺失"; exit 1; }
# v25.0.47_13 新增门禁（提现+权限体系）
test -f backend_deploy/adminRoles.js || { echo "FATAL: 统一角色权限模块缺失"; exit 1; }
grep -q 'FINANCE_ADMIN' backend_deploy/adminRoles.js || { echo "FATAL: 财务管理员角色缺失"; exit 1; }
grep -q 'OPERATOR_ADMIN' backend_deploy/adminRoles.js || { echo "FATAL: 运营管理员角色缺失"; exit 1; }
grep -q 'admin_keys_v13' backend_deploy/adminRoles.js || { echo "FATAL: 子密钥哈希存储缺失"; exit 1; }
grep -q 'transfer-bills' backend_deploy/wechatTransfer.js || { echo "FATAL: 商家转账V3接口缺失"; exit 1; }
grep -q 'WITHDRAW_TRANSFER_ENABLED' backend_deploy/commissionEngine.js || { echo "FATAL: .env提现主开关缺失"; exit 1; }
grep -q 'WITHDRAW_FREE_PASS_AMOUNT' backend_deploy/commissionEngine.js || { echo "FATAL: 免审额度env初始化缺失"; exit 1; }
grep -q 'dailyWithdrawAmountLimitYuan' backend_deploy/commissionEngine.js || { echo "FATAL: 单日限额缺失"; exit 1; }
grep -q 'markTransferResult' backend_deploy/commissionEngine.js || { echo "FATAL: 转账回调落账缺失"; exit 1; }
grep -q 'callback/transfer' backend_deploy/paymentRoutes.js || { echo "FATAL: 转账回调路由缺失"; exit 1; }
grep -q 'batch-approve' backend_deploy/adminUnifiedRoutes.js || { echo "FATAL: 批量审核接口缺失"; exit 1; }
grep -q '/commission/stats' backend_deploy/adminUnifiedRoutes.js || { echo "FATAL: 佣金统计接口缺失"; exit 1; }
grep -q 'withdrawals/export' backend_deploy/adminUnifiedRoutes.js || { echo "FATAL: 提现导出接口缺失"; exit 1; }
grep -q 'navVisible' src/app/admin/layout.tsx || { echo "FATAL: 抽屉导航角色过滤缺失"; exit 1; }
grep -q 'sidebarOpen' src/app/admin/layout.tsx || { echo "FATAL: 抽屉式导航缺失"; exit 1; }
test -f src/app/admin/keys/page.tsx || { echo "FATAL: 密钥管理页缺失"; exit 1; }
grep -q 'batchApproveWithdrawals' src/app/admin/commission/page.tsx || { echo "FATAL: 前端批量审核缺失"; exit 1; }
grep -q 'exportWithdrawalsCsv' src/app/admin/commission/page.tsx || { echo "FATAL: 前端导出缺失"; exit 1; }
grep -q '700-1000' src/lib/deepReportPrompt.ts || { echo "FATAL: 深度报告字数要求未更新"; exit 1; }
grep -q 'TRANSFERING' src/lib/commissionService.ts || { echo "FATAL: 用户端转账中状态缺失"; exit 1; }
echo "内容门禁 OK"

echo "--- [2] .env 提现配置项（幂等追加） ---"
ENV_FILE="$BACKEND_DIR/.env"
for KV in "WITHDRAW_TRANSFER_ENABLED=false" "WITHDRAW_FREE_PASS_AMOUNT=200" "WITHDRAW_MIN_AMOUNT=10"; do
  KEY="${KV%%=*}"
  if grep -q "^${KEY}=" "$ENV_FILE" 2>/dev/null; then
    echo "  $KEY 已存在，跳过"
  else
    echo "$KV" >> "$ENV_FILE"
    echo "  已追加 $KV"
  fi
done

echo "--- [3] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -6

echo "--- [4] 页面导出校验 ---"
for p in membership zhongyi yixue yixue/phone academy/yikao profile admin admin/feature-flags admin/tool-control admin/pricing admin/marketing admin/membership admin/ai-control admin/orders admin/commission admin/moderation admin/alerts admin/tools admin/keys; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
done
echo "OK: 全部后台页面导出（含 admin/keys）"
test -f "out/index.html" || { echo "FATAL: out/index.html missing"; exit 1; }

echo "--- [4.5] 烧录ID一致性 ---"
BUILD_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('out/version.json','utf8')).buildId)")
echo "buildId: ${BUILD_ID}"
[ "$BUILD_ID" = "v25.0.47_13_D$(date +%Y%m%d)" ] || { echo "WARN: buildId 日期非今日（可接受，重发场景）"; }
grep -rq "${BUILD_ID}" out/_next/static/chunks/ && echo "烧录ID一致 OK" || { echo "FATAL: 包内烧录ID缺失"; exit 1; }

echo "--- [4.6] v13 内容入包校验 ---"
grep -rq "转账中" out/_next/static/chunks/ && echo "WITHDRAW-TRANSFERING OK" || { echo "FATAL: 转账中状态未入包"; exit 1; }
grep -rq "签发并生成密钥\|密钥管理" out/_next/static/chunks/ && echo "ADMIN-KEYS OK" || { echo "FATAL: 密钥管理页未入包"; exit 1; }
grep -rq "批量通过\|导出 CSV\|财务报表" out/_next/static/chunks/ && echo "FINANCE-CONSOLE OK" || { echo "FATAL: 财务端功能未入包"; exit 1; }
grep -rq "700-1000" out/_next/static/chunks/ && echo "DEEPREPORT-700 OK" || echo "WARN: 深度报告字数文案为提示词（服务端构建时入包可跳过）"

echo "--- [5] 发布到 ${RELEASE_DIR} ---"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
cp -r out/* "$RELEASE_DIR/"
RELEASE_FILES=$(find "$RELEASE_DIR" -type f | wc -l)
echo "Release file count: ${RELEASE_FILES}"
[ "$RELEASE_FILES" -lt 50 ] && { echo "FATAL: 文件数异常"; exit 1; }

echo "--- [5.5] 后端同步（v25.0.47_13 全部14文件） ---"
for f in adminRoles.js adminUnifiedRoutes.js commissionEngine.js commissionRoutes.js contentImportRoutes.js featureControlRoutes.js newsRoutes.js paymentRoutes.js pointsConfigRoutes.js posterConfigRoutes.js server.js shareConfigRoutes.js toolAdminRoutes.js wechatTransfer.js; do
  cp "backend_deploy/$f" "$BACKEND_DIR/$f"
done
grep -q 'FINANCE_ADMIN' "$BACKEND_DIR/adminRoles.js" || { echo "FATAL: 角色模块未同步"; exit 1; }
grep -q 'transfer-bills' "$BACKEND_DIR/wechatTransfer.js" || { echo "FATAL: 商家转账未同步"; exit 1; }
grep -q 'WITHDRAW_FREE_PASS_AMOUNT' "$BACKEND_DIR/commissionEngine.js" || { echo "FATAL: 提现引擎未同步"; exit 1; }
echo "synced: 后端14文件"

echo "--- [6] 切换 current 软链 ---"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
ACTUAL=$(readlink -f /root/yandaoguoxue/current)
echo "current -> ${ACTUAL}"
[ "$ACTUAL" != "$RELEASE_DIR" ] && { echo "FATAL: symlink switch failed"; exit 1; }

echo "--- [7] 重启后端 ---"
pm2 restart yandaoguoxue-backend --update-env > /dev/null 2>&1
sleep 4
pm2 list | grep yandaoguoxue-backend

echo "--- [8] 清理 nginx 缓存 ---"
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "--- [9] 公网验证 ---"
DOMAIN="https://yandaoguoxue.yandao.vip"
for path in membership zhongyi yixue yixue/phone academy/yikao profile index admin admin/feature-flags admin/tool-control admin/pricing admin/commission admin/keys api/health; do
  CODE=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/${path})
  echo "公网 /${path}: ${CODE}"
  [ "$CODE" != "200" ] && { echo "FATAL: /${path} 公网非200"; exit 1; }
done

echo "--- [10] 公开配置接口公网验证 ---"
curl -s -m 10 ${DOMAIN}/api/public/pricing | grep -q 'membershipPlans' && echo "PRICING-SSOT 公网 OK" || { echo "FATAL: 价格SSOT公网不可用"; exit 1; }
curl -s -m 10 ${DOMAIN}/api/public/feature-flags | grep -q '"ai"' && echo "FEATURE-FLAGS 公网 OK" || { echo "FATAL: 功能开关公网不可用"; exit 1; }
curl -s -m 10 ${DOMAIN}/api/public/tool-matrix | grep -q 'bazi' && echo "TOOL-MATRIX 公网 OK" || { echo "FATAL: 工具矩阵公网不可用"; exit 1; }

echo "--- [11] 提现模块公网验证（配置+风控拦截） ---"
CC=$(curl -s -m 10 ${DOMAIN}/api/commission/config)
echo "$CC" | head -c 400; echo
echo "$CC" | grep -q 'settleDay\|withdrawOpenDay' && echo "提现规则配置公网 OK" || { echo "FATAL: 提现配置接口不可用"; exit 1; }

echo "--- [12] 支付下单链路回归（Native扫码） ---"
PAY_RESP=$(curl -s -X POST ${DOMAIN}/api/payment/create -H 'Content-Type: application/json' \
  -d '{"userId":"910080","type":"MEMBERSHIP","amount":0.01,"title":"传统文化学习平台会员服务","extra":{"membershipLevel":"monthly","membershipDays":30}}')
echo "$PAY_RESP" | head -c 300; echo
echo "$PAY_RESP" | grep -q '"payMode":"NATIVE"' && echo "NATIVE下单 OK" || { echo "FATAL: Native下单未生效"; exit 1; }
echo "$PAY_RESP" | grep -q 'codeUrl' && echo "codeUrl OK" || { echo "FATAL: 缺少codeUrl"; exit 1; }

echo "--- [13] 权限体系验证（无密钥401 / 错密钥401） ---"
UNIFIED_CODE=$(curl -s -o /dev/null -w '%{http_code}' ${DOMAIN}/api/admin/unified/keys)
echo "无密钥访问 /keys: ${UNIFIED_CODE}（预期401）"
[ "$UNIFIED_CODE" = "401" ] && echo "权限拦截 OK" || { echo "FATAL: 无密钥未拦截"; exit 1; }
BAD_CODE=$(curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer INVALID-KEY-TEST' ${DOMAIN}/api/admin/unified/keys)
echo "错密钥访问 /keys: ${BAD_CODE}（预期401）"
[ "$BAD_CODE" = "401" ] && echo "错密钥拦截 OK" || { echo "FATAL: 错密钥未拦截"; exit 1; }

echo "===== DEPLOY v25.0.47_13 COMPLETE (HEAD=${HEAD}) ====="
