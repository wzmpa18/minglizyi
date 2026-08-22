#!/bin/bash
# v25.0.47_9 发布：FIX-PAY-UNBIND-WECHAT-APPID 支付通道解耦公众号专项修复
#   1) 后端 wechatPayV3：新增 createNativeOrder（Native扫码下单，code_url）
#      isConfigured 改为商户4项核心参数（商户号+APIv3密钥+私钥+证书序列号），与公众号AppID/Secret解耦
#   2) 后端 paymentRoutes：支付总开关去 APPID 依赖；下单 JSAPI优先→自动降级Native；
#      缺openid/公众号参数时不再报错阻断，全场景返回付款二维码
#   3) 前端 paymentService：CallPaymentResult 支持 payMode=NATIVE+codeUrl；
#      paySingleUnlockAndWait 解除微信内强校验，返回扫码票券(NativePayTicket)
#   4) 前端新增 PayQRCodeModal（二维码+轮询+「长按识别」提示）；
#      会员页/AI断法面板/AI按钮/解读抽屉/中医问诊 5 个付费入口全部接入扫码支付
#   5) JSAPI 完整保留：公众号参数补充后自动启用免扫码支付，无需二次开发
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.47"
RELEASE_DIR="/root/yandaoguoxue/releases/v25.0.47_9"
BACKEND_DIR="/www/yandaoguoxue-backend"

cd "$SRC_DIR"

echo "--- [0] 源码状态 ---"
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"
grep -q "\"version\": \"${VERSION}\"" package.json || { echo "FATAL: package.json 版本非${VERSION}"; exit 1; }

echo "--- [1] 内容门禁（v25.0.47_9 支付解耦 + v25.0.47_8 支付真实化全量保留） ---"
# v25.0.47_8 既有门禁（支付真实化，全部保留）
grep -q 'payForMembership' src/app/membership/page.tsx || { echo "FATAL: 会员页未接真实支付"; exit 1; }
grep -q 'paySingleUnlockAndWait' src/components/EventDivinationPanel.tsx || { echo "FATAL: 断法面板未接真实支付"; exit 1; }
grep -q 'paySingleUnlockAndWait' src/components/AIInterpretButton.tsx || { echo "FATAL: AI按钮未接真实支付"; exit 1; }
grep -q 'paySingleUnlockAndWait' src/components/shared/InterpretationDrawer.tsx || { echo "FATAL: 解读抽屉未接真实支付"; exit 1; }
grep -q 'paySingleUnlockAndWait' src/app/zhongyi/wenzhen/page.tsx || { echo "FATAL: 中医问诊未接真实支付"; exit 1; }
grep -q 'paySingleUnlockAndWait' src/lib/paymentService.ts || { echo "FATAL: 支付辅助函数缺失"; exit 1; }
grep -q 'deliverOrderBenefits' backend_deploy/paymentRoutes.js || { echo "FATAL: 后端权益交付缺失"; exit 1; }
grep -q 'benefit_delivered' backend_deploy/paymentRoutes.js || { echo "FATAL: 交付持久化缺失"; exit 1; }
# v25.0.47_9 新增门禁（支付解耦专项）
grep -q 'createNativeOrder' backend_deploy/wechatPayV3.js || { echo "FATAL: 后端Native下单缺失"; exit 1; }
grep -q 'codeUrl' backend_deploy/paymentRoutes.js || { echo "FATAL: 后端NATIVE响应缺失"; exit 1; }
grep -q 'process.env.WECHAT_APPID &&' backend_deploy/paymentRoutes.js && { echo "FATAL: 支付开关仍依赖APPID"; exit 1; } || echo "支付开关已解耦APPID OK"
grep -q 'NativePayTicket' src/lib/paymentService.ts || { echo "FATAL: 前端扫码票券类型缺失"; exit 1; }
grep -q 'useNativePayQR' src/components/PayQRCodeModal.tsx || { echo "FATAL: 扫码支付弹层缺失"; exit 1; }
grep -q 'useNativePayQR' src/app/membership/page.tsx || { echo "FATAL: 会员页未接扫码支付"; exit 1; }
grep -q 'useNativePayQR' src/components/EventDivinationPanel.tsx || { echo "FATAL: 断法面板未接扫码支付"; exit 1; }
grep -q 'useNativePayQR' src/components/AIInterpretButton.tsx || { echo "FATAL: AI按钮未接扫码支付"; exit 1; }
grep -q 'useNativePayQR' src/components/shared/InterpretationDrawer.tsx || { echo "FATAL: 解读抽屉未接扫码支付"; exit 1; }
grep -q 'useNativePayQR' src/app/zhongyi/wenzhen/page.tsx || { echo "FATAL: 中医问诊未接扫码支付"; exit 1; }
grep -q 'isInWechatBrowser' src/app/membership/page.tsx && { echo "FATAL: 会员页仍有微信内强校验"; exit 1; } || echo "会员页微信环境阻断已解除 OK"
grep -q 'createJsapiOrder' backend_deploy/wechatPayV3.js || { echo "FATAL: JSAPI通道被误删"; exit 1; }
grep -q 'jsapiParams' backend_deploy/paymentRoutes.js || { echo "FATAL: JSAPI响应被误删"; exit 1; }
echo "内容门禁 OK"

echo "--- [2] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -6

echo "--- [3] 页面导出校验 ---"
for p in membership zhongyi yixue yixue/phone academy/yikao profile admin; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p}"
done
test -f "out/index.html" || { echo "FATAL: out/index.html missing"; exit 1; }

echo "--- [3.5] 烧录ID一致性 ---"
BUILD_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('out/version.json','utf8')).buildId)")
echo "buildId: ${BUILD_ID}"
grep -rq "${BUILD_ID}" out/_next/static/chunks/ && echo "烧录ID一致 OK" || { echo "FATAL: 包内烧录ID缺失"; exit 1; }

echo "--- [3.6] 支付内容入包校验 ---"
grep -rq "payForMembership" out/_next/static/chunks/ && echo "PAY-MEMBERSHIP OK" || { echo "FATAL: 会员支付未入包"; exit 1; }
grep -rq "paySingleUnlockAndWait\|payForUnlock" out/_next/static/chunks/ && echo "PAY-UNLOCK OK" || { echo "FATAL: 解锁支付未入包"; exit 1; }
grep -rq "长按识别二维码完成支付" out/_next/static/chunks/ && echo "PAY-QR-TIP OK" || { echo "FATAL: 扫码提示未入包"; exit 1; }
grep -rq "useNativePayQR\|NativePayTicket" out/_next/static/chunks/ && echo "PAY-NATIVE OK" || { echo "FATAL: 扫码支付逻辑未入包"; exit 1; }

echo "--- [4] 发布到 ${RELEASE_DIR} ---"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
cp -r out/* "$RELEASE_DIR/"
RELEASE_FILES=$(find "$RELEASE_DIR" -type f | wc -l)
echo "Release file count: ${RELEASE_FILES}"
[ "$RELEASE_FILES" -lt 50 ] && { echo "FATAL: 文件数异常"; exit 1; }

echo "--- [4.5] 后端同步（paymentRoutes + wechatPayV3 解耦版） ---"
cp "backend_deploy/paymentRoutes.js" "$BACKEND_DIR/paymentRoutes.js"
cp "backend_deploy/wechatPayV3.js" "$BACKEND_DIR/wechatPayV3.js"
grep -q 'deliverOrderBenefits' "$BACKEND_DIR/paymentRoutes.js" || { echo "FATAL: 后端权益交付未同步"; exit 1; }
grep -q 'createNativeOrder' "$BACKEND_DIR/wechatPayV3.js" || { echo "FATAL: 后端Native下单未同步"; exit 1; }
echo "synced: paymentRoutes.js + wechatPayV3.js"

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
for path in membership zhongyi yixue yixue/phone academy/yikao profile index admin api/health; do
  CODE=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/${path})
  echo "公网 /${path}: ${CODE}"
  [ "$CODE" != "200" ] && { echo "FATAL: /${path} 公网非200"; exit 1; }
done

echo "--- [9] 支付下单链路验证（Native扫码） ---"
PAY_RESP=$(curl -s -X POST ${DOMAIN}/api/payment/create -H 'Content-Type: application/json' \
  -d '{"userId":"910080","type":"MEMBERSHIP","amount":0.01,"title":"传统文化学习平台会员服务","extra":{"membershipLevel":"monthly","membershipDays":30}}')
echo "$PAY_RESP" | head -c 300; echo
echo "$PAY_RESP" | grep -q '"payMode":"NATIVE"' && echo "NATIVE下单 OK" || { echo "FATAL: Native下单未生效"; exit 1; }
echo "$PAY_RESP" | grep -q 'codeUrl' && echo "codeUrl OK" || { echo "FATAL: 缺少codeUrl"; exit 1; }

echo "===== DEPLOY v25.0.47_9 COMPLETE ====="
