#!/bin/bash
# ============================================================================
# v25.0.47_19 发布：FIX-V19 公告栏+APK下载链接统一
#   ① 官方公告栏（永久功能）：首页顶部公告条+列表弹窗，未登录可见；
#      后端 announcementRoutes.js 增删改查+置顶/定时/过期；后台公告管理页
#   ② APK 下载链接统一：全站直链固定指向 /app-download/latest.apk（永久名），
#      friend/download 落地页兜底+后端默认配置全部改指 latest.apk
#   ③ download 页版本号/发布日期动态化（从版本接口读取）
#   ④（含 v18 全部修复：抽屉后台/搜索高对比/购买登录引导/网页自动刷新）
# 执行顺序 = ① bash build.sh ② bash scripts/build_android_v25_0_51.sh ③ 本脚本
# ============================================================================
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.47"
REL_TAG="${VERSION}_19"
RELEASE_DIR="/root/yandaoguoxue/releases/${REL_TAG}"
BACKEND_DIR="/www/yandaoguoxue-backend"

cd "$SRC_DIR"

echo "--- [0] 源码状态 ---"
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"
grep -q "\"version\": \"${REL_TAG}\"" package.json || { echo "FATAL: package.json 版本非${REL_TAG}"; exit 1; }

echo "--- [1] 内容门禁（v13~v16 全量保留 + v18 新增） ---"
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
# ===== v14 门禁 =====
grep -q 'IOS_PAYMENT_ENABLED = true' src/lib/platformGate.ts || { echo "FATAL: platformGate.ts iOS支付未放开"; exit 1; }
grep -q 'IOS_PAYMENT_ENABLED = true' src/lib/platformGates.ts || { echo "FATAL: platformGates.ts iOS支付未放开"; exit 1; }
grep -q 'payment: { web: true, android: true, ios: true, wechat: true' backend_deploy/platformFeatureGate.js || { echo "FATAL: 后端平台矩阵支付未放开"; exit 1; }
grep -q '下载言道国学APP' src/app/register/page.tsx || { echo "FATAL: 注册页下载按钮缺失"; exit 1; }
grep -q '下载言道国学APP' src/app/login/page.tsx || { echo "FATAL: 登录页下载按钮缺失"; exit 1; }
test -f src/lib/marketing/viralTemplates.ts || { echo "FATAL: 裂变模板模块缺失"; exit 1; }
grep -q '藏在手机里的国学宝藏工具' src/lib/marketing/viralTemplates.ts || { echo "FATAL: 模板一种草版缺失"; exit 1; }
grep -q 'renderViralPoster' src/app/invite/page.tsx || { echo "FATAL: 邀请页完整海报渲染缺失"; exit 1; }
grep -q 'handleSavePoster' src/app/invite/page.tsx || { echo "FATAL: 邀请页完整海报保存缺失"; exit 1; }
# ===== v15 门禁 =====
grep -q 'app-version' src/app/friend/page.tsx || { echo "FATAL: friend落地页未接入动态版本接口"; exit 1; }
grep -q 'APK_URL_FALLBACK' src/app/friend/page.tsx || { echo "FATAL: friend落地页缺兜底地址"; exit 1; }
grep -q 'app-version' src/app/download/page.tsx || { echo "FATAL: download页未接入动态版本接口"; exit 1; }
# ===== v16 门禁（升级提示体系） =====
test -f src/components/AppUpgradeChecker.tsx || { echo "FATAL: APP升级检测组件缺失"; exit 1; }
grep -q '发现新版本' src/components/AppUpgradeChecker.tsx || { echo "FATAL: 升级弹窗文案缺失"; exit 1; }
grep -q 'app-native.json' src/components/AppUpgradeChecker.tsx || { echo "FATAL: 本地版本探测缺失"; exit 1; }
grep -q 'AppUpgradeChecker' src/app/layout.tsx || { echo "FATAL: 升级检测未挂载根布局"; exit 1; }
test -f backend_deploy/appVersionRoutes.js || { echo "FATAL: 后端版本接口缺失"; exit 1; }
grep -q 'latestVersionCode' backend_deploy/appVersionRoutes.js || { echo "FATAL: 版本接口字段缺失"; exit 1; }
grep -q '/api/public/app-version' backend_deploy/server.js || { echo "FATAL: 版本接口未挂载"; exit 1; }
grep -q 'versionCode 2051' android/app/build.gradle || { echo "FATAL: APK versionCode未升级到2051"; exit 1; }
# ===== v18 新增门禁（全端抽屉+会员入口+动态版本+典籍导入） =====
grep -q 'isDesktop' src/app/admin/layout.tsx && { echo "FATAL: 后台仍含桌面常驻侧栏逻辑（应为全端统一抽屉）"; exit 1; }
BAD_ML=$(grep -E 'marginLeft' src/app/admin/layout.tsx | grep -vE 'marginLeft: "auto"' | wc -l)
[ "$BAD_ML" -gt 0 ] && { echo "FATAL: 后台内容区仍有避让位移 marginLeft（${BAD_ML}处非auto用法）"; exit 1; }
grep -q 'translateX(-100%)' src/app/admin/layout.tsx || { echo "FATAL: 后台抽屉滑出动画缺失"; exit 1; }
grep -q '检查更新' src/app/profile/page.tsx || { echo "FATAL: 系统中心检查更新按钮缺失"; exit 1; }
grep -q 'handleCheckUpdate' src/app/profile/page.tsx || { echo "FATAL: 手动检查更新逻辑缺失"; exit 1; }
grep -q 'href="/membership/"' src/app/profile/page.tsx || { echo "FATAL: 会员中心原生锚点跳转缺失"; exit 1; }
grep -q 'yandao_zone_biz" defaultOpen' src/app/profile/page.tsx || { echo "FATAL: 商业中心默认展开缺失"; exit 1; }
grep -q 'version.json' src/components/IcpFooter.tsx || { echo "FATAL: 页脚版本号未动态化"; exit 1; }
grep -q '言道 v25.0 ·' src/components/IcpFooter.tsx && { echo "FATAL: 页脚仍含硬编码版本号"; exit 1; }
test -s src/algorithm-core/modules/tcm/classicsExtra.ts || { echo "FATAL: 典籍外挂数据模块缺失或为空"; exit 1; }
grep -q 'CHAPTER_APPENDS' src/algorithm-core/modules/tcm/classics.ts || { echo "FATAL: classics.ts章节补全合并缺失"; exit 1; }
grep -q 'EXTRA_BOOKS' src/algorithm-core/modules/tcm/classics.ts || { echo "FATAL: classics.ts新增典籍合并缺失"; exit 1; }
grep -q '濒湖脉学' src/algorithm-core/modules/tcm/classicsExtra.ts || { echo "FATAL: 新增典籍（濒湖脉学）缺失"; exit 1; }
grep -q '医宗金鉴' src/algorithm-core/modules/tcm/classicsExtra.ts || { echo "FATAL: 新增典籍（医宗金鉴）缺失"; exit 1; }
# ===== v18 门禁（搜索高对比+购买登录引导+网页版自动刷新） =====
grep -q '#FFC107' src/app/zhongyi/classic/page.tsx || { echo "FATAL: 典籍搜索按钮高对比配色(金色#FFC107)缺失"; exit 1; }
grep -q '输入关键词，如：脉诊、桂枝' src/app/zhongyi/classic/page.tsx || { echo "FATAL: 搜索框引导性placeholder缺失"; exit 1; }
grep -q '命中文字以黄色标出' src/app/zhongyi/classic/page.tsx || { echo "FATAL: 搜索结果统计提示缺失"; exit 1; }
grep -q 'showLoginModal' src/app/membership/page.tsx || { echo "FATAL: 会员购买登录引导弹窗缺失"; exit 1; }
grep -q '登录后即可购买会员' src/app/membership/page.tsx || { echo "FATAL: 登录引导弹窗文案缺失"; exit 1; }
grep -q 'yandao_web_version_baseline' src/components/AppUpgradeChecker.tsx || { echo "FATAL: 网页版版本自动刷新缺失"; exit 1; }
grep -q 'checkWebVersion' src/components/AppUpgradeChecker.tsx || { echo "FATAL: 网页版版本轮询逻辑缺失"; exit 1; }
# ===== v19 新增门禁（公告栏永久功能+APK下载链接统一） =====
test -f src/components/AnnouncementBar.tsx || { echo "FATAL: 首页公告栏组件缺失（永久功能，不可移除）"; exit 1; }
grep -q 'AnnouncementBar' src/app/page.tsx || { echo "FATAL: 首页未挂载公告栏（永久功能，不可移除）"; exit 1; }
grep -q 'announcements/public' src/components/AnnouncementBar.tsx || { echo "FATAL: 公告栏未接公开接口"; exit 1; }
test -f backend_deploy/announcementRoutes.js || { echo "FATAL: 后端公告路由缺失"; exit 1; }
grep -q 'announcementRoutes' backend_deploy/server.js || { echo "FATAL: 公告路由未挂载 server.js"; exit 1; }
grep -q "'/api/announcements'" backend_deploy/server.js || { echo "FATAL: 公告路由路径缺失"; exit 1; }
test -f src/app/admin/announcements/page.tsx || { echo "FATAL: 后台公告管理页缺失"; exit 1; }
grep -q '公告管理' src/app/admin/layout.tsx || { echo "FATAL: 后台导航缺公告管理入口"; exit 1; }
grep -q 'app-download/latest.apk' src/app/friend/page.tsx || { echo "FATAL: friend落地页兜底未指向统一地址latest.apk"; exit 1; }
grep -q 'app-download/latest.apk' src/app/download/page.tsx || { echo "FATAL: download页兜底未指向统一地址latest.apk"; exit 1; }
grep -q 'app-download/latest.apk' backend_deploy/appVersionRoutes.js || { echo "FATAL: 后端默认下载地址未指向latest.apk"; exit 1; }
BAD_VAPK=$(grep -rl 'app-download/yandao-guoxue-v25' src/ backend_deploy/ 2>/dev/null | wc -l || true)
[ "$BAD_VAPK" -gt 0 ] && { echo "FATAL: ${BAD_VAPK} 个文件仍含版本化APK直链（应统一为latest.apk）"; exit 1; }
grep -q 'latestVersion' src/app/download/page.tsx || { echo "FATAL: download页版本号未动态化"; exit 1; }
echo "内容门禁 OK"

echo "--- [2] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -4

echo "--- [3] 页面导出校验 ---"
for p in membership zhongyi zhongyi/classic yixue yixue/phone academy/yikao profile admin admin/announcements admin/feature-flags admin/tool-control admin/pricing admin/marketing admin/membership admin/ai-control admin/orders admin/commission admin/moderation admin/alerts admin/tools admin/keys register login invite invite/poster friend download; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
done
test -f "out/index.html" || { echo "FATAL: out/index.html missing"; exit 1; }
echo "OK: 全部页面导出"

echo "--- [3.5] 烧录ID一致性 ---"
BUILD_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('out/version.json','utf8')).buildId)")
echo "buildId: ${BUILD_ID}"
[ "$BUILD_ID" = "${REL_TAG}_D$(date +%Y%m%d)" ] || { echo "FATAL: buildId 非 ${REL_TAG}_D$(date +%Y%m%d)"; exit 1; }
grep -rq "${BUILD_ID}" out/_next/static/chunks/ && echo "烧录ID一致 OK" || { echo "FATAL: 包内烧录ID缺失"; exit 1; }

echo "--- [3.6] v18+v19 内容入包校验 ---"
grep -rq "检查更新" out/_next/static/chunks/ && echo "CHECK-UPDATE(检查更新按钮) OK" || { echo "FATAL: 检查更新按钮未入包"; exit 1; }
grep -rq "濒湖脉学" out/_next/static/chunks/ && echo "CLASSIC-NEW(新增典籍) OK" || { echo "FATAL: 新增典籍未入包"; exit 1; }
grep -rq "汤头歌诀" out/_next/static/chunks/ && echo "CLASSIC-NEW2 OK" || { echo "FATAL: 汤头歌诀未入包"; exit 1; }
grep -rq "大医精诚" out/_next/static/chunks/ && echo "CLASSIC-QJ(千金要方) OK" || { echo "FATAL: 千金要方未入包"; exit 1; }
grep -rq "发现新版本" out/_next/static/chunks/ && echo "UPGRADE-POPUP OK" || { echo "FATAL: 升级弹窗未入包"; exit 1; }
grep -rq "打开导航菜单" out/_next/static/chunks/ && echo "ADMIN-DRAWER(后台抽屉汉堡) OK" || { echo "FATAL: 后台抽屉未入包"; exit 1; }
grep -rq "输入关键词，如：脉诊、桂枝" out/_next/static/chunks/ && echo "SEARCH-HICONTRAST(搜索高对比) OK" || { echo "FATAL: 搜索高对比改版未入包"; exit 1; }
grep -rq "登录后即可购买会员" out/_next/static/chunks/ && echo "MEMBER-LOGIN-GUIDE(购买登录引导) OK" || { echo "FATAL: 购买登录引导未入包"; exit 1; }
grep -rq "yandao_web_version_baseline" out/_next/static/chunks/ && echo "WEB-AUTORELOAD(网页版自动刷新) OK" || { echo "FATAL: 网页版自动刷新未入包"; exit 1; }
grep -rq "官方公告" out/_next/static/chunks/ && echo "ANNOUNCE-BAR(首页公告栏) OK" || { echo "FATAL: 首页公告栏未入包"; exit 1; }
grep -rq "announcements/public" out/_next/static/chunks/ && echo "ANNOUNCE-API(公告接口调用) OK" || { echo "FATAL: 公告接口调用未入包"; exit 1; }
grep -rq "发布公告" out/_next/static/chunks/ && echo "ANNOUNCE-ADMIN(后台公告管理) OK" || { echo "FATAL: 后台公告管理未入包"; exit 1; }
grep -rq "app-download/latest.apk" out/_next/static/chunks/ && echo "UNIFIED-APK(统一下载地址) OK" || { echo "FATAL: 统一下载地址未入包"; exit 1; }
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

echo "--- [4.5] 后端同步（17文件=v16的16文件+announcementRoutes.js） ---"
for f in adminRoles.js adminUnifiedRoutes.js announcementRoutes.js appVersionRoutes.js commissionEngine.js commissionRoutes.js contentImportRoutes.js featureControlRoutes.js newsRoutes.js paymentRoutes.js platformFeatureGate.js pointsConfigRoutes.js posterConfigRoutes.js server.js shareConfigRoutes.js toolAdminRoutes.js wechatTransfer.js; do
  cp "backend_deploy/$f" "$BACKEND_DIR/$f"
done
grep -q '/api/public/app-version' "$BACKEND_DIR/server.js" || { echo "FATAL: 版本接口未同步"; exit 1; }
grep -q 'announcementRoutes' "$BACKEND_DIR/server.js" || { echo "FATAL: 公告路由未同步"; exit 1; }
echo "synced: 后端17文件（app-release-config 由 APK 构建脚本负责更新至 2051）"

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
for path in membership zhongyi zhongyi/classic yixue yixue/phone academy/yikao profile index admin admin/announcements admin/feature-flags admin/tool-control admin/pricing admin/commission admin/keys register login invite invite/poster friend download api/health; do
  CODE=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/${path})
  echo "公网 /${path}: ${CODE}"
  [ "$CODE" != "200" ] && { echo "FATAL: /${path} 公网非200"; exit 1; }
done

echo "--- [8.5] 公网版本号+典籍内容验证（v19核心） ---"
echo "version.json: $(curl -s -m 10 ${DOMAIN}/version.json | tr -d '\n')"
VJ=$(curl -s -m 10 ${DOMAIN}/version.json)
echo "$VJ" | grep -q 'v25.0.47_19' || { echo "FATAL: 公网版本号未更新到v25.0.47_19"; exit 1; }
# 典籍数据入包抽查：新增典籍经 chunks 加载（数据在 JS chunk 中）
CLASSIC_CHUNK=$(grep -rl "濒湖脉学" /root/yandaoguoxue/current/_next/static/chunks/ | head -1)
[ -z "$CLASSIC_CHUNK" ] && { echo "FATAL: 生产目录chunks缺少新增典籍数据"; exit 1; }
echo "典籍数据入包 OK: ${CLASSIC_CHUNK##*/}"
# 公告栏入包抽查
ANN_CHUNK=$(grep -rl "announcements/public" /root/yandaoguoxue/current/_next/static/chunks/ | head -1)
[ -z "$ANN_CHUNK" ] && { echo "FATAL: 生产目录chunks缺少公告栏代码"; exit 1; }
echo "公告栏入包 OK: ${ANN_CHUNK##*/}"

echo "--- [8.7] 注册页下载按钮三环境复验 ---"
WX_REG=$(curl -sL -m 10 -A "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49" ${DOMAIN}/register)
echo "$WX_REG" | grep -q '下载言道国学APP' || { echo "FATAL: 微信UA注册页无下载按钮"; exit 1; }
IOS_REG=$(curl -sL -m 10 -A "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1" ${DOMAIN}/register)
echo "$IOS_REG" | grep -q '下载言道国学APP' || { echo "FATAL: iOS Safari UA注册页无下载按钮"; exit 1; }
echo "下载按钮三环境 OK"

echo "--- [9] 公开配置接口 ---"
curl -s -m 10 ${DOMAIN}/api/public/pricing | grep -q 'membershipPlans' || { echo "FATAL: 价格SSOT不可用"; exit 1; }
curl -s -m 10 ${DOMAIN}/api/public/feature-flags | grep -q '"ai"' || { echo "FATAL: 功能开关不可用"; exit 1; }
APPVER=$(curl -s -m 10 ${DOMAIN}/api/public/app-version)
echo "$APPVER" | grep -q 'latestVersionCode' || { echo "FATAL: 升级接口不可用"; exit 1; }
ANN=$(curl -s -m 10 ${DOMAIN}/api/announcements/public)
echo "$ANN" | grep -q '"success"' || { echo "FATAL: 公告公开接口不可用"; exit 1; }
echo "公告接口: ${ANN}"
echo "配置接口 OK"

echo "--- [10] 支付下单链路回归（三环境） ---"
PAY_BODY='{"userId":"910080","type":"MEMBERSHIP","amount":0.01,"title":"传统文化学习平台会员服务","extra":{"membershipLevel":"monthly","membershipDays":30}}'
R1=$(curl -s -X POST ${DOMAIN}/api/payment/create -H 'Content-Type: application/json' -d "$PAY_BODY")
echo "$R1" | grep -q 'codeUrl' || { echo "FATAL: web平台下单失败"; exit 1; }
R2=$(curl -s -X POST ${DOMAIN}/api/payment/create -H 'Content-Type: application/json' -H 'X-Client-Platform: wechat' -d "$PAY_BODY")
echo "$R2" | grep -q 'codeUrl' || { echo "FATAL: 微信平台下单被拒"; exit 1; }
R3=$(curl -s -X POST ${DOMAIN}/api/payment/create -H 'Content-Type: application/json' -H 'X-Client-Platform: ios' -d "$PAY_BODY")
echo "$R3" | grep -q 'codeUrl' || { echo "FATAL: iOS平台下单被拒"; exit 1; }
echo "支付三环境 OK（web/wechat/ios）"

echo "--- [11] 邀请页（SSR标题为'推广中心'） ---"
curl -sL -m 10 ${DOMAIN}/invite | grep -q '推广中心' || { echo "FATAL: 邀请页不可用"; exit 1; }
curl -sL -m 10 -o /dev/null -w 'invite/poster: %{http_code}\n' ${DOMAIN}/invite/poster

echo "===== DEPLOY ${REL_TAG} COMPLETE (HEAD=${HEAD}, BUILD_ID=${BUILD_ID}) ====="
echo "NOTE: 执行顺序 = ① bash build.sh ② bash scripts/build_android_v25_0_51.sh（更新app-release-config至2051+latest.apk） ③ 本脚本（网页版切流）"
