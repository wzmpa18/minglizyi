#!/bin/bash
# ============================================================================
# v25.0.47_16 发布：FIX-V16-UPGRADE-NOTICE + 后台桌面导航 + APK 重建配套
#   ① 新增 APP 原生升级检测（AppUpgradeChecker + /api/public/app-version）
#     —— 解决旧版 APK 内置资源无法自更新的运营死结
#   ② 后台导航桌面端增强：≥1280 常驻侧栏可折叠+内容区 marginLeft 避让；
#     窄屏保持抽屉覆盖模式（v13 已上线）
#   ③ APK versionCode 2047→2048（versionName 25.0.48），配合服务器 APK 重建
# ============================================================================
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.47"
REL_TAG="${VERSION}_16"
RELEASE_DIR="/root/yandaoguoxue/releases/${REL_TAG}"
BACKEND_DIR="/www/yandaoguoxue-backend"

cd "$SRC_DIR"

echo "--- [0] 源码状态 ---"
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"
grep -q "\"version\": \"${REL_TAG}\"" package.json || { echo "FATAL: package.json 版本非${REL_TAG}"; exit 1; }

echo "--- [1] 内容门禁（v13+v14+v15 全量保留 + v16 新增） ---"
# ===== 存量门禁（v13 全量） =====
grep -q 'payForMembership' src/app/membership/page.tsx || { echo "FATAL: 会员页未接真实支付"; exit 1; }
grep -q 'paySingleUnlockAndWait' src/components/AIInterpretButton.tsx || { echo "FATAL: AI按钮未接真实支付"; exit 1; }
grep -q 'deliverOrderBenefits' backend_deploy/paymentRoutes.js || { echo "FATAL: 后端权益交付缺失"; exit 1; }
grep -q 'createNativeOrder' backend_deploy/wechatPayV3.js || { echo "FATAL: 后端Native下单缺失"; exit 1; }
grep -q 'codeUrl' backend_deploy/paymentRoutes.js || { echo "FATAL: 后端NATIVE响应缺失"; exit 1; }
grep -q 'globalFeatureGate' backend_deploy/featureControlRoutes.js || { echo "FATAL: 功能开关服务端强制缺失"; exit 1; }
grep -q 'DEFAULT_MEMBERSHIP_PLANS' backend_deploy/publicPricingRoutes.js || { echo "FATAL: 价格SSOT默认套餐缺失"; exit 1; }
grep -q 'loadMatrix' backend_deploy/toolAdminRoutes.js || { echo "FATAL: 工具矩阵服务端配置缺失"; exit 1; }
grep -q '运营管理中心' src/app/admin/layout.tsx || { echo "FATAL: 后台统一名称缺失"; exit 1; }
test -f backend_deploy/adminRoles.js || { echo "FATAL: 统一角色权限模块缺失"; exit 1; }
grep -q 'FINANCE_ADMIN' backend_deploy/adminRoles.js || { echo "FATAL: 财务管理员角色缺失"; exit 1; }
grep -q 'transfer-bills' backend_deploy/wechatTransfer.js || { echo "FATAL: 商家转账V3接口缺失"; exit 1; }
grep -q 'WITHDRAW_TRANSFER_ENABLED' backend_deploy/commissionEngine.js || { echo "FATAL: .env提现主开关缺失"; exit 1; }
grep -q 'batch-approve' backend_deploy/adminUnifiedRoutes.js || { echo "FATAL: 批量审核接口缺失"; exit 1; }
grep -q 'navVisible' src/app/admin/layout.tsx || { echo "FATAL: 抽屉导航角色过滤缺失"; exit 1; }
grep -q 'sidebarOpen' src/app/admin/layout.tsx || { echo "FATAL: 抽屉导航缺失"; exit 1; }
test -f src/app/admin/keys/page.tsx || { echo "FATAL: 密钥管理页缺失"; exit 1; }
grep -q '700-1000' src/lib/deepReportPrompt.ts || { echo "FATAL: 深度报告字数要求未更新"; exit 1; }
# ===== v14 门禁（支付死键修复+下载按钮+海报体系） =====
grep -q 'IOS_PAYMENT_ENABLED = true' src/lib/platformGate.ts || { echo "FATAL: platformGate.ts iOS支付未放开"; exit 1; }
grep -q 'IOS_PAYMENT_ENABLED = true' src/lib/platformGates.ts || { echo "FATAL: platformGates.ts iOS支付未放开"; exit 1; }
grep -q 'payment: { web: true, android: true, ios: true, wechat: true' backend_deploy/platformFeatureGate.js || { echo "FATAL: 后端平台矩阵支付未放开"; exit 1; }
grep -q '下载言道国学APP' src/app/register/page.tsx || { echo "FATAL: 注册页下载按钮缺失"; exit 1; }
grep -q '下载言道国学APP' src/app/login/page.tsx || { echo "FATAL: 登录页下载按钮缺失"; exit 1; }
test -f src/lib/marketing/viralTemplates.ts || { echo "FATAL: 裂变模板模块缺失"; exit 1; }
grep -q '藏在手机里的国学宝藏工具' src/lib/marketing/viralTemplates.ts || { echo "FATAL: 模板一种草版缺失"; exit 1; }
grep -q 'renderViralPoster' src/app/invite/page.tsx || { echo "FATAL: 邀请页完整海报渲染缺失"; exit 1; }
grep -q 'handleSavePoster' src/app/invite/page.tsx || { echo "FATAL: 邀请页完整海报保存缺失"; exit 1; }
# ===== v15 门禁（APK死链修复，v16 起改为动态 SSOT） =====
grep -q 'app-version' src/app/friend/page.tsx || { echo "FATAL: friend落地页未接入动态版本接口"; exit 1; }
grep -q 'APK_URL_FALLBACK' src/app/friend/page.tsx || { echo "FATAL: friend落地页缺兜底地址"; exit 1; }
grep -q 'app-version' src/app/download/page.tsx || { echo "FATAL: download页未接入动态版本接口"; exit 1; }
grep -q 'yandao-guoxue-v25.0.48-release.apk' src/app/download/page.tsx || { echo "FATAL: download页兜底地址未升级"; exit 1; }
# ===== v16 新增门禁（升级提示+桌面导航） =====
test -f src/components/AppUpgradeChecker.tsx || { echo "FATAL: APP升级检测组件缺失"; exit 1; }
grep -q '发现新版本' src/components/AppUpgradeChecker.tsx || { echo "FATAL: 升级弹窗文案缺失"; exit 1; }
grep -q 'app-native.json' src/components/AppUpgradeChecker.tsx || { echo "FATAL: 本地版本探测缺失"; exit 1; }
grep -q 'AppUpgradeChecker' src/app/layout.tsx || { echo "FATAL: 升级检测未挂载根布局"; exit 1; }
test -f backend_deploy/appVersionRoutes.js || { echo "FATAL: 后端版本接口缺失"; exit 1; }
grep -q 'latestVersionCode' backend_deploy/appVersionRoutes.js || { echo "FATAL: 版本接口字段缺失"; exit 1; }
grep -q '/api/public/app-version' backend_deploy/server.js || { echo "FATAL: 版本接口未挂载"; exit 1; }
grep -q 'isDesktop' src/app/admin/layout.tsx || { echo "FATAL: 后台桌面模式缺失"; exit 1; }
grep -q 'marginLeft: isDesktop && sidebarOpen ? 240 : 0' src/app/admin/layout.tsx || { echo "FATAL: 桌面端内容避让缺失"; exit 1; }
grep -q 'versionCode 2048' android/app/build.gradle || { echo "FATAL: APK versionCode未升级"; exit 1; }
echo "内容门禁 OK"

echo "--- [2] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -4

echo "--- [3] 页面导出校验 ---"
for p in membership zhongyi yixue yixue/phone academy/yikao profile admin admin/feature-flags admin/tool-control admin/pricing admin/marketing admin/membership admin/ai-control admin/orders admin/commission admin/moderation admin/alerts admin/tools admin/keys register login invite invite/poster friend download; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
done
test -f "out/index.html" || { echo "FATAL: out/index.html missing"; exit 1; }
echo "OK: 全部页面导出"

echo "--- [3.5] 烧录ID一致性 ---"
BUILD_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('out/version.json','utf8')).buildId)")
echo "buildId: ${BUILD_ID}"
[ "$BUILD_ID" = "${REL_TAG}_D$(date +%Y%m%d)" ] || { echo "FATAL: buildId 非 ${REL_TAG}_D$(date +%Y%m%d)"; exit 1; }
grep -rq "${BUILD_ID}" out/_next/static/chunks/ && echo "烧录ID一致 OK" || { echo "FATAL: 包内烧录ID缺失"; exit 1; }

echo "--- [3.6] v16 内容入包校验 ---"
grep -rq "下载言道国学APP" out/register/index.html out/login/index.html && echo "DOWNLOAD-BUTTON OK" || { echo "FATAL: 下载按钮未入包"; exit 1; }
grep -rq "yandao-guoxue-v25.0.48-release.apk" out/_next/static/chunks/ && echo "APK-URL(新包兜底直链) OK" || { echo "FATAL: 新包APK兜底直链未入包"; exit 1; }
grep -rq "发现新版本" out/_next/static/chunks/ && echo "UPGRADE-POPUP(升级弹窗) OK" || { echo "FATAL: 升级弹窗未入包"; exit 1; }
grep -rq "立即升级" out/_next/static/chunks/ && echo "UPGRADE-BTN(升级按钮) OK" || { echo "FATAL: 升级按钮未入包"; exit 1; }
grep -rq "app-native.json" out/_next/static/chunks/ && echo "NATIVE-PROBE(本地版本探测) OK" || { echo "FATAL: 本地版本探测未入包"; exit 1; }
grep -rq "藏在手机里的国学宝藏工具" out/_next/static/chunks/ && echo "VIRAL-TPL1 OK" || { echo "FATAL: 模板一未入包"; exit 1; }
grep -rq "保存海报图片" out/_next/static/chunks/ && echo "POSTER-SAVE OK" || { echo "FATAL: 海报保存按钮未入包"; exit 1; }
grep -rq "isDesktop" out/_next/static/chunks/ && echo "ADMIN-DESKTOP(后台桌面模式) OK" || { echo "FATAL: 后台桌面模式未入包"; exit 1; }
BAD=$(grep -rl '82\.156\.' out/ 2>/dev/null | wc -l || true)
[ "$BAD" -gt 0 ] && { echo "FATAL: ${BAD} 个文件含服务器IP"; exit 1; }
echo "IP脱敏 OK"

echo "--- [4] 发布到 ${RELEASE_DIR} ---"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
cp -r out/* "$RELEASE_DIR/"
RELEASE_FILES=$(find "$RELEASE_DIR" -type f | wc -l)
echo "Release file count: ${RELEASE_FILES}"
[ "$RELEASE_FILES" -lt 50 ] && { echo "FATAL: 文件数异常"; exit 1; }

echo "--- [4.5] 后端同步（16文件 = v15的15 + appVersionRoutes.js） ---"
for f in adminRoles.js adminUnifiedRoutes.js appVersionRoutes.js commissionEngine.js commissionRoutes.js contentImportRoutes.js featureControlRoutes.js newsRoutes.js paymentRoutes.js platformFeatureGate.js pointsConfigRoutes.js posterConfigRoutes.js server.js shareConfigRoutes.js toolAdminRoutes.js wechatTransfer.js; do
  cp "backend_deploy/$f" "$BACKEND_DIR/$f"
done
grep -q '/api/public/app-version' "$BACKEND_DIR/server.js" || { echo "FATAL: 版本接口未同步"; exit 1; }
# 版本发布配置（升级提示数据源）
mkdir -p "$BACKEND_DIR/data"
cat > "$BACKEND_DIR/data/app-release-config.json" <<'EOCFG'
{
  "latestVersion": "25.0.48",
  "latestVersionCode": 2048,
  "downloadUrl": "https://yandaoguoxue.yandao.vip/app-download/yandao-guoxue-v25.0.48-release.apk",
  "downloadPage": "https://yandaoguoxue.yandao.vip/friend",
  "releaseNotes": [
    "修复邀请海报保存：导出完整高清海报（含背景/标题/卖点/二维码），不再只有二维码",
    "后台导航升级：桌面端侧栏可折叠，窄屏抽屉式，内容不再被遮挡",
    "新增版本升级提示：新版本发布后自动提醒更新"
  ],
  "forceUpdate": false,
  "publishedAt": "2026-08-23T15:30:00+08:00"
}
EOCFG
echo "synced: 后端16文件 + app-release-config.json"

echo "--- [5] 切换 current 软链 ---"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
ACTUAL=$(readlink -f /root/yandaoguoxue/current)
[ "$ACTUAL" != "$RELEASE_DIR" ] && { echo "FATAL: symlink switch failed"; exit 1; }
echo "current -> ${ACTUAL}"

echo "--- [6] 重启后端 ---"
pm2 restart yandaoguoxue-backend --update-env > /dev/null 2>&1
sleep 4
pm2 list | grep yandaoguoxue-backend

echo "--- [7] 清缓存 ---"
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "--- [8] 公网验证（页面） ---"
DOMAIN="https://yandaoguoxue.yandao.vip"
for path in membership zhongyi yixue yixue/phone academy/yikao profile index admin admin/feature-flags admin/tool-control admin/pricing admin/commission admin/keys register login invite invite/poster friend download api/health; do
  CODE=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/${path})
  echo "公网 /${path}: ${CODE}"
  [ "$CODE" != "200" ] && { echo "FATAL: /${path} 公网非200"; exit 1; }
done

echo "--- [8.5] 公网版本号+升级接口验证（v16核心） ---"
echo "version.json: $(curl -s -m 10 ${DOMAIN}/version.json | tr -d '\n')"
APPVER=$(curl -s -m 10 ${DOMAIN}/api/public/app-version)
echo "app-version: ${APPVER}" | head -c 300; echo ""
echo "$APPVER" | grep -q '"latestVersionCode":2048' || { echo "FATAL: 升级接口未返回2048"; exit 1; }
echo "$APPVER" | grep -q 'yandao-guoxue-v25.0.48-release.apk' || { echo "FATAL: 升级接口下载地址错误"; exit 1; }

echo "--- [8.7] 注册页下载按钮三环境复验 ---"
WX_REG=$(curl -sL -m 10 -A "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49" ${DOMAIN}/register)
echo "$WX_REG" | grep -q '下载言道国学APP' || { echo "FATAL: 微信UA注册页无下载按钮"; exit 1; }
IOS_REG=$(curl -sL -m 10 -A "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1" ${DOMAIN}/register)
echo "$IOS_REG" | grep -q '下载言道国学APP' || { echo "FATAL: iOS Safari UA注册页无下载按钮"; exit 1; }
echo "下载按钮三环境 OK"

echo "--- [9] 公开配置接口 ---"
curl -s -m 10 ${DOMAIN}/api/public/pricing | grep -q 'membershipPlans' || { echo "FATAL: 价格SSOT不可用"; exit 1; }
curl -s -m 10 ${DOMAIN}/api/public/feature-flags | grep -q '"ai"' || { echo "FATAL: 功能开关不可用"; exit 1; }
echo "配置接口 OK"

echo "--- [10] 支付下单链路回归（四环境） ---"
PAY_BODY='{"userId":"910080","type":"MEMBERSHIP","amount":0.01,"title":"传统文化学习平台会员服务","extra":{"membershipLevel":"monthly","membershipDays":30}}'
R1=$(curl -s -X POST ${DOMAIN}/api/payment/create -H 'Content-Type: application/json' -d "$PAY_BODY")
echo "$R1" | grep -q 'codeUrl' || { echo "FATAL: web平台下单失败"; exit 1; }
R2=$(curl -s -X POST ${DOMAIN}/api/payment/create -H 'Content-Type: application/json' -H 'X-Client-Platform: wechat' -d "$PAY_BODY")
echo "$R2" | grep -q 'codeUrl' || { echo "FATAL: 微信平台下单被拒"; exit 1; }
R3=$(curl -s -X POST ${DOMAIN}/api/payment/create -H 'Content-Type: application/json' -H 'X-Client-Platform: ios' -d "$PAY_BODY")
echo "$R3" | grep -q 'codeUrl' || { echo "FATAL: iOS平台下单被拒"; exit 1; }
echo "支付四环境 OK（web/wechat/ios）"

echo "--- [11] 邀请页（SSR标题为'推广中心'） ---"
curl -sL -m 10 ${DOMAIN}/invite | grep -q '推广中心' || { echo "FATAL: 邀请页不可用"; exit 1; }
curl -sL -m 10 -o /dev/null -w 'invite/poster: %{http_code}\n' ${DOMAIN}/invite/poster

echo "===== DEPLOY ${REL_TAG} COMPLETE (HEAD=${HEAD}, BUILD_ID=${BUILD_ID}) ====="
echo "NOTE: 执行顺序 = ① bash build.sh ② bash scripts/build_android_v25_0_48.sh ③ 本脚本（网页版最后切流，确保动态下载地址零空窗）"
