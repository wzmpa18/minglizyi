#!/bin/bash
# ============================================================================
# v25.0.47_15 发布：FIX-V15-APK-DEADLINK 收尾修复（下载APP链路404）
#   根因：FINAL-SEAL-03 品牌统一删除旧APK文件 guoxue-chuancheng-v1.0-release.apk，
#         但 friend 落地页与 shareService 代码引用未同步更新 → 新用户扫码注册后
#         「立即下载APP」404。
#   修复：
#     ① 服务器侧已补挂别名文件（在线热修，无需重打包APK，存量分享链接继续有效）
#     ② 代码侧统一正式包名 yandao-guoxue-v25.0.47-release.apk（与 /download 页一致）
#     ③ 删除 shareService.ts 未使用的失效常量 APK_DOWNLOAD_URL
# ============================================================================
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.47"
REL_TAG="${VERSION}_15"
RELEASE_DIR="/root/yandaoguoxue/releases/${REL_TAG}"
BACKEND_DIR="/www/yandaoguoxue-backend"

cd "$SRC_DIR"

echo "--- [0] 源码状态 ---"
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"
grep -q "\"version\": \"${REL_TAG}\"" package.json || { echo "FATAL: package.json 版本非${REL_TAG}"; exit 1; }
git status --short | head -3

echo "--- [1] 内容门禁（v25.0.47_14 全量保留 + v15 新增） ---"
# ===== 存量门禁（v13 全量保留） =====
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
grep -q 'sidebarOpen' src/app/admin/layout.tsx || { echo "FATAL: 抽屉式导航缺失"; exit 1; }
test -f src/app/admin/keys/page.tsx || { echo "FATAL: 密钥管理页缺失"; exit 1; }
grep -q '700-1000' src/lib/deepReportPrompt.ts || { echo "FATAL: 深度报告字数要求未更新"; exit 1; }
# ===== v25.0.47_14 门禁（P0支付死键修复：四层门控全开） =====
grep -q 'IOS_PAYMENT_ENABLED = true' src/lib/platformGate.ts || { echo "FATAL: platformGate.ts iOS支付未放开"; exit 1; }
grep -q 'IOS_PAYMENT_ENABLED = true' src/lib/platformGates.ts || { echo "FATAL: platformGates.ts iOS支付未放开"; exit 1; }
grep -q 'payment: { web: true, android: true, ios: true, wechat: true' backend_deploy/platformFeatureGate.js || { echo "FATAL: 后端平台矩阵支付未放开"; exit 1; }
grep -q 'iosPaymentEnabled: true' backend_deploy/adminUnifiedRoutes.js || { echo "FATAL: 后台支付状态iOS未放开"; exit 1; }
# ===== v25.0.47_14 门禁（下载APP按钮：注册/登录页全浏览器可见） =====
grep -q '下载言道国学APP' src/app/register/page.tsx || { echo "FATAL: 注册页下载按钮缺失"; exit 1; }
grep -q '下载言道国学APP' src/app/login/page.tsx || { echo "FATAL: 登录页下载按钮缺失"; exit 1; }
grep -q 'href="https://yandaoguoxue.yandao.vip/friend"' src/app/register/page.tsx || { echo "FATAL: 注册页下载链接缺失"; exit 1; }
grep -q 'href="https://yandaoguoxue.yandao.vip/friend"' src/app/login/page.tsx || { echo "FATAL: 登录页下载链接缺失"; exit 1; }
# ===== v25.0.47_14 门禁（海报完整导出+裂变模板体系） =====
test -f src/lib/marketing/viralTemplates.ts || { echo "FATAL: 裂变模板模块缺失"; exit 1; }
grep -q '藏在手机里的国学宝藏工具' src/lib/marketing/viralTemplates.ts || { echo "FATAL: 模板一种草版缺失"; exit 1; }
grep -q '免费！专业级国学工具App' src/lib/marketing/viralTemplates.ts || { echo "FATAL: 模板二引流版缺失"; exit 1; }
grep -q '你的随身国学学习助手' src/lib/marketing/viralTemplates.ts || { echo "FATAL: 模板三学习版缺失"; exit 1; }
grep -q '最近挖到一个很良心的传统文化App' src/lib/marketing/viralTemplates.ts || { echo "FATAL: 朋友圈文案缺失"; exit 1; }
grep -q '注册了我们都有奖励' src/lib/marketing/viralTemplates.ts || { echo "FATAL: 私发好友文案缺失"; exit 1; }
grep -q 'renderViralPoster' src/app/invite/page.tsx || { echo "FATAL: 邀请页完整海报渲染缺失"; exit 1; }
grep -q 'handleSavePoster' src/app/invite/page.tsx || { echo "FATAL: 邀请页完整海报保存缺失"; exit 1; }
grep -q 'VIRAL_TEMPLATES' src/app/invite/page.tsx || { echo "FATAL: 邀请页模板切换缺失"; exit 1; }
grep -q 'slice(0, 4)' src/lib/marketing/posterEngine.ts || { echo "FATAL: 海报引擎4条卖点支持缺失"; exit 1; }
# ===== v25.0.47_15 新增门禁（APK死链修复） =====
grep -q 'yandao-guoxue-v25.0.47-release.apk' src/app/friend/page.tsx || { echo "FATAL: friend落地页APK直链未指向正式包"; exit 1; }
grep -q 'yandao-guoxue-v25.0.47-release.apk' src/app/download/page.tsx || { echo "FATAL: download页APK直链缺失"; exit 1; }
OLD_REFS=$(grep -rn 'guoxue-chuancheng-v1.0-release' src/ 2>/dev/null | grep -v '已从服务器删除' | wc -l)
[ "$OLD_REFS" -gt 0 ] && { echo "FATAL: src/ 仍存在旧APK引用 ${OLD_REFS} 处"; exit 1; }
grep -q 'APK_DOWNLOAD_URL' src/lib/shareService.ts && { echo "FATAL: shareService失效常量未删除"; exit 1; } || echo "shareService失效常量已删除 OK"
echo "内容门禁 OK"

echo "--- [2] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -6

echo "--- [3] 页面导出校验 ---"
for p in membership zhongyi yixue yixue/phone academy/yikao profile admin admin/feature-flags admin/tool-control admin/pricing admin/marketing admin/membership admin/ai-control admin/orders admin/commission admin/moderation admin/alerts admin/tools admin/keys register login invite invite/poster friend download; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
done
test -f "out/index.html" || { echo "FATAL: out/index.html missing"; exit 1; }
echo "OK: 全部页面导出（含 register/login/invite/friend/download）"

echo "--- [3.5] 烧录ID一致性 ---"
BUILD_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('out/version.json','utf8')).buildId)")
echo "buildId: ${BUILD_ID}"
[ "$BUILD_ID" = "${REL_TAG}_D$(date +%Y%m%d)" ] || { echo "FATAL: buildId 非 ${REL_TAG}_D$(date +%Y%m%d)"; exit 1; }
grep -rq "${BUILD_ID}" out/_next/static/chunks/ && echo "烧录ID一致 OK" || { echo "FATAL: 包内烧录ID缺失"; exit 1; }

echo "--- [3.6] v15 内容入包校验 ---"
grep -rq "下载言道国学APP" out/register/index.html out/login/index.html && echo "DOWNLOAD-BUTTON(注册/登录页下载按钮) OK" || { echo "FATAL: 下载按钮未入包"; exit 1; }
grep -q 'yandaoguoxue.yandao.vip/friend' out/register/index.html && echo "DOWNLOAD-LINK(下载链接) OK" || { echo "FATAL: 下载链接未入注册页"; exit 1; }
grep -rq 'yandao-guoxue-v25.0.47-release.apk' out/_next/static/chunks/ && echo "APK-URL(正式包直链) OK" || { echo "FATAL: 正式包APK直链未入包"; exit 1; }
OLD_IN_PKG=$(grep -rl 'guoxue-chuancheng-v1.0-release' out/ 2>/dev/null | wc -l || true)
echo "旧APK引用入包扫描: ${OLD_IN_PKG} 个文件"
[ "$OLD_IN_PKG" -gt 0 ] && { echo "FATAL: 构建产物仍含旧APK死链引用"; exit 1; }
grep -rq "藏在手机里的国学宝藏工具" out/_next/static/chunks/ && echo "VIRAL-TPL1(种草版) OK" || { echo "FATAL: 模板一种草版未入包"; exit 1; }
grep -rq "免费！专业级国学工具App" out/_next/static/chunks/ && echo "VIRAL-TPL2(引流版) OK" || { echo "FATAL: 模板二引流版未入包"; exit 1; }
grep -rq "你的随身国学学习助手" out/_next/static/chunks/ && echo "VIRAL-TPL3(学习版) OK" || { echo "FATAL: 模板三学习版未入包"; exit 1; }
grep -rq "最近挖到一个很良心的传统文化App" out/_next/static/chunks/ && echo "VIRAL-COPY1(朋友圈文案) OK" || { echo "FATAL: 朋友圈文案未入包"; exit 1; }
grep -rq "保存海报图片" out/_next/static/chunks/ && echo "POSTER-SAVE(完整海报保存按钮) OK" || { echo "FATAL: 海报保存按钮未入包"; exit 1; }
BAD=$(grep -rl '82\.156\.' out/ 2>/dev/null | wc -l || true)
echo "内网IP扫描: ${BAD} 个匹配（脱敏基线为0）"
[ "$BAD" -gt 0 ] && { echo "FATAL: ${BAD} 个文件含服务器IP"; exit 1; }

echo "--- [4] 发布到 ${RELEASE_DIR} ---"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
cp -r out/* "$RELEASE_DIR/"
RELEASE_FILES=$(find "$RELEASE_DIR" -type f | wc -l)
echo "Release file count: ${RELEASE_FILES}"
[ "$RELEASE_FILES" -lt 50 ] && { echo "FATAL: 文件数异常"; exit 1; }

echo "--- [4.5] 后端同步（15文件，与v14一致无后端变更） ---"
for f in adminRoles.js adminUnifiedRoutes.js commissionEngine.js commissionRoutes.js contentImportRoutes.js featureControlRoutes.js newsRoutes.js paymentRoutes.js platformFeatureGate.js pointsConfigRoutes.js posterConfigRoutes.js server.js shareConfigRoutes.js toolAdminRoutes.js wechatTransfer.js; do
  cp "backend_deploy/$f" "$BACKEND_DIR/$f"
done
grep -q 'payment: { web: true, android: true, ios: true, wechat: true' "$BACKEND_DIR/platformFeatureGate.js" || { echo "FATAL: 平台矩阵未同步"; exit 1; }
echo "synced: 后端15文件"

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

echo "--- [8] 公网验证（页面） ---"
DOMAIN="https://yandaoguoxue.yandao.vip"
for path in membership zhongyi yixue yixue/phone academy/yikao profile index admin admin/feature-flags admin/tool-control admin/pricing admin/commission admin/keys register login invite invite/poster friend download api/health; do
  CODE=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/${path})
  echo "公网 /${path}: ${CODE}"
  [ "$CODE" != "200" ] && { echo "FATAL: /${path} 公网非200"; exit 1; }
done

echo "--- [8.5] 公网版本号与下载按钮验证 ---"
echo "version.json: $(curl -s -m 10 ${DOMAIN}/version.json | tr -d '\n')"
REG_HTML=$(curl -sL -m 10 ${DOMAIN}/register)
echo "$REG_HTML" | grep -q '下载言道国学APP' && echo "注册页公网含下载按钮 OK" || { echo "FATAL: 注册页公网无下载按钮"; exit 1; }
echo "$REG_HTML" | grep -q 'yandaoguoxue.yandao.vip/friend' && echo "注册页公网含下载链接 OK" || { echo "FATAL: 注册页公网无下载链接"; exit 1; }
LOGIN_HTML=$(curl -sL -m 10 ${DOMAIN}/login)
echo "$LOGIN_HTML" | grep -q '下载言道国学APP' && echo "登录页公网含下载按钮 OK" || { echo "FATAL: 登录页公网无下载按钮"; exit 1; }
WX_REG=$(curl -sL -m 10 -A "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49" ${DOMAIN}/register)
echo "$WX_REG" | grep -q '下载言道国学APP' && echo "微信UA注册页下载按钮可见 OK" || { echo "FATAL: 微信UA下注册页无下载按钮"; exit 1; }
IOS_REG=$(curl -sL -m 10 -A "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1" ${DOMAIN}/register)
echo "$IOS_REG" | grep -q '下载言道国学APP' && echo "iOS Safari UA注册页下载按钮可见 OK" || { echo "FATAL: iOS Safari UA下注册页无下载按钮"; exit 1; }

echo "--- [8.7] APK 直链公网验证（v15核心修复项） ---"
APK_MAIN=$(curl -s -o /dev/null -w '%{http_code}' -I ${DOMAIN}/app-download/yandao-guoxue-v25.0.47-release.apk)
echo "正式包直链: ${APK_MAIN}"
[ "$APK_MAIN" != "200" ] && { echo "FATAL: 正式包APK直链非200"; exit 1; }
APK_ALIAS=$(curl -s -o /dev/null -w '%{http_code}' -I ${DOMAIN}/app-download/guoxue-chuancheng-v1.0-release.apk)
echo "别名兼容直链(存量分享): ${APK_ALIAS}"
[ "$APK_ALIAS" != "200" ] && { echo "FATAL: 别名APK直链非200（存量分享链路断裂）"; exit 1; }
APK_CT=$(curl -s -I ${DOMAIN}/app-download/yandao-guoxue-v25.0.47-release.apk | grep -i 'content-type' | tr -d '\r')
echo "MIME: ${APK_CT}"
echo "${APK_CT}" | grep -q 'application/vnd.android.package-archive' || { echo "FATAL: APK MIME错误"; exit 1; }

echo "--- [9] 公开配置接口公网验证 ---"
curl -s -m 10 ${DOMAIN}/api/public/pricing | grep -q 'membershipPlans' && echo "PRICING-SSOT 公网 OK" || { echo "FATAL: 价格SSOT公网不可用"; exit 1; }
curl -s -m 10 ${DOMAIN}/api/public/feature-flags | grep -q '"ai"' && echo "FEATURE-FLAGS 公网 OK" || { echo "FATAL: 功能开关公网不可用"; exit 1; }
curl -s -m 10 ${DOMAIN}/api/public/tool-matrix | grep -q 'bazi' && echo "TOOL-MATRIX 公网 OK" || { echo "FATAL: 工具矩阵公网不可用"; exit 1; }

echo "--- [10] 支付下单链路回归（P0核心：三种平台头全部放行） ---"
PAY_BODY='{"userId":"910080","type":"MEMBERSHIP","amount":0.01,"title":"传统文化学习平台会员服务","extra":{"membershipLevel":"monthly","membershipDays":30}}'
R1=$(curl -s -X POST ${DOMAIN}/api/payment/create -H 'Content-Type: application/json' -d "$PAY_BODY")
echo "$R1" | grep -q 'codeUrl' && echo "PAY-WEB(web默认) OK" || { echo "FATAL: web平台下单失败"; exit 1; }
R2=$(curl -s -X POST ${DOMAIN}/api/payment/create -H 'Content-Type: application/json' -H 'X-Client-Platform: wechat' -d "$PAY_BODY")
echo "$R2" | grep -q 'codeUrl' && echo "PAY-WECHAT(微信内浏览器) OK" || { echo "FATAL: 微信平台下单被拒"; exit 1; }
R3=$(curl -s -X POST ${DOMAIN}/api/payment/create -H 'Content-Type: application/json' -H 'X-Client-Platform: ios' -d "$PAY_BODY")
echo "$R3" | grep -q 'codeUrl' && echo "PAY-IOS(iOS全环境) OK" || { echo "FATAL: iOS平台下单被拒"; exit 1; }
R4=$(curl -s -X POST ${DOMAIN}/api/payment/create -H 'Content-Type: application/json' -A "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49" -d "$PAY_BODY")
echo "$R4" | grep -q 'codeUrl' && echo "PAY-WECHAT-UA(UA兜底识别) OK" || { echo "FATAL: 微信UA下单被拒"; exit 1; }

echo "--- [11] 邀请页公网内容验证 ---"
curl -sL -m 10 ${DOMAIN}/invite | grep -q '邀请' && echo "邀请页公网可访问 OK" || { echo "FATAL: 邀请页不可用"; exit 1; }
curl -sL -m 10 -o /dev/null -w 'invite/poster: %{http_code}\n' ${DOMAIN}/invite/poster

echo "===== DEPLOY ${REL_TAG} COMPLETE (HEAD=${HEAD}, BUILD_ID=${BUILD_ID}) ====="
