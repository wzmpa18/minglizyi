#!/bin/bash
# v25.0.47_8 发布：全站付费点真实微信支付接入（RC-06 支付真实化热修）
#   1) 会员页 /membership：真实支付（payForMembership + pollPaymentStatus），替代模拟支付
#   2) EventDivinationPanel：AI套餐购买+单次解锁 真实支付
#   3) AIInterpretButton / InterpretationDrawer / zhongyi/wenzhen：单次解锁真实支付
#   4) 后端 paymentRoutes：订单权益交付（MEMBERSHIP开通会员/POINTS_RECHARGE积分入账）
#      + benefit_delivered 持久化 + query补交付兜底
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.47"
RELEASE_DIR="/root/yandaoguoxue/releases/v25.0.47_8"
BACKEND_DIR="/www/yandaoguoxue-backend"

cd "$SRC_DIR"

echo "--- [0] 源码状态 ---"
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"
grep -q "\"version\": \"${VERSION}\"" package.json || { echo "FATAL: package.json 版本非${VERSION}"; exit 1; }

echo "--- [1] 内容门禁（v25.0.47_8 支付真实化） ---"
grep -q 'payForMembership' src/app/membership/page.tsx || { echo "FATAL: 会员页未接真实支付"; exit 1; }
grep -q 'paySingleUnlockAndWait' src/components/EventDivinationPanel.tsx || { echo "FATAL: 断法面板未接真实支付"; exit 1; }
grep -q 'paySingleUnlockAndWait' src/components/AIInterpretButton.tsx || { echo "FATAL: AI按钮未接真实支付"; exit 1; }
grep -q 'paySingleUnlockAndWait' src/components/shared/InterpretationDrawer.tsx || { echo "FATAL: 解读抽屉未接真实支付"; exit 1; }
grep -q 'paySingleUnlockAndWait' src/app/zhongyi/wenzhen/page.tsx || { echo "FATAL: 中医问诊未接真实支付"; exit 1; }
grep -q 'paySingleUnlockAndWait' src/lib/paymentService.ts || { echo "FATAL: 支付辅助函数缺失"; exit 1; }
grep -q 'simulate payment' src/app/membership/page.tsx && { echo "FATAL: 会员页仍有模拟支付"; exit 1; } || echo "会员页模拟支付已移除 OK"
grep -q 'deliverOrderBenefits' backend_deploy/paymentRoutes.js || { echo "FATAL: 后端权益交付缺失"; exit 1; }
grep -q 'benefit_delivered' backend_deploy/paymentRoutes.js || { echo "FATAL: 交付持久化缺失"; exit 1; }
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

echo "--- [3.6] 支付真实化内容入包校验 ---"
grep -rq "payForMembership" out/_next/static/chunks/ && echo "PAY-MEMBERSHIP OK" || { echo "FATAL: 会员支付未入包"; exit 1; }
grep -rq "paySingleUnlockAndWait\|payForUnlock" out/_next/static/chunks/ && echo "PAY-UNLOCK OK" || { echo "FATAL: 解锁支付未入包"; exit 1; }
grep -rq "微信支付需在微信内完成" out/_next/static/chunks/ && echo "ENV-TIP OK" || { echo "FATAL: 微信环境提示未入包"; exit 1; }

echo "--- [4] 发布到 ${RELEASE_DIR} ---"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
cp -r out/* "$RELEASE_DIR/"
RELEASE_FILES=$(find "$RELEASE_DIR" -type f | wc -l)
echo "Release file count: ${RELEASE_FILES}"
[ "$RELEASE_FILES" -lt 50 ] && { echo "FATAL: 文件数异常"; exit 1; }

echo "--- [4.5] 后端同步（paymentRoutes 权益交付版） ---"
cp "backend_deploy/paymentRoutes.js" "$BACKEND_DIR/paymentRoutes.js"
echo "synced: paymentRoutes.js"
grep -q 'deliverOrderBenefits' "$BACKEND_DIR/paymentRoutes.js" || { echo "FATAL: 后端权益交付未同步"; exit 1; }

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
echo "===== DEPLOY v25.0.47_8 COMPLETE ====="
