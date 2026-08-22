#!/bin/bash
# v25.0.47_6 发布：P8分佣系统第一阶段 + 统一运营后台（FINAL-SEAL-03）
#   1) 统一后台前端四页：/admin/unified(总览·审计·密钥·角色) /admin/commission(分佣配置·明细·提现审核)
#      /admin/moderation(用户·动态·举报·群) /admin/orders(订单·补单)
#   2) 用户端「我的→我的收益」页：三余额概览+佣金明细+提现申请
#   3) P8后端：commissionEngine(一级分佣/7天冻结/幂等/退款冲正) + commissionRoutes + adminUnifiedRoutes + wechatTransfer
#   4) 支付钩子：订单PAID→grantCommission / REFUNDED→reverseCommission
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.47"
RELEASE_DIR="/root/yandaoguoxue/releases/v25.0.47_6"
BACKEND_DIR="/www/yandaoguoxue-backend"

cd "$SRC_DIR"

echo "--- [0] 源码同步校验 ---"
git checkout -- package-lock.json 2>/dev/null || true
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"; git log --oneline -1
grep -q "\"version\": \"${VERSION}\"" package.json || { echo "FATAL: package.json 版本非${VERSION}"; exit 1; }

echo "--- [1] 内容门禁（v25.0.47_6 八项） ---"
# 1) 统一后台前端四页
test -f src/app/admin/unified/page.tsx || { echo "FATAL: 缺统一控制中心页"; exit 1; }
test -f src/app/admin/commission/page.tsx || { echo "FATAL: 缺分佣提现管理页"; exit 1; }
test -f src/app/admin/moderation/page.tsx || { echo "FATAL: 缺内容审核页"; exit 1; }
test -f src/app/admin/orders/page.tsx || { echo "FATAL: 缺订单管理页"; exit 1; }
grep -q '分佣与提现' src/app/admin/layout.tsx || { echo "FATAL: 侧边栏缺分佣入口"; exit 1; }
grep -q '内容审核' src/app/admin/layout.tsx || { echo "FATAL: 侧边栏缺审核入口"; exit 1; }
# 2) 用户端我的收益页
test -f src/app/profile/income/page.tsx || { echo "FATAL: 缺我的收益页"; exit 1; }
grep -q '我的收益' src/app/profile/page.tsx || { echo "FATAL: 我的页缺收益入口"; exit 1; }
# 3) P8后端引擎
test -f backend_deploy/commissionEngine.js || { echo "FATAL: 缺分佣引擎"; exit 1; }
test -f backend_deploy/commissionRoutes.js || { echo "FATAL: 缺佣金用户端路由"; exit 1; }
test -f backend_deploy/adminUnifiedRoutes.js || { echo "FATAL: 缺统一后台路由"; exit 1; }
test -f backend_deploy/wechatTransfer.js || { echo "FATAL: 缺商家转账模块"; exit 1; }
# 4) 支付钩子接入分佣
grep -q 'grantCommission' backend_deploy/paymentRoutes.js || { echo "FATAL: 支付钩子未接分佣"; exit 1; }
grep -q 'reverseCommission' backend_deploy/paymentRoutes.js || { echo "FATAL: 退款钩子未接冲正"; exit 1; }
grep -q 'adminUnifiedRoutes' "$BACKEND_DIR/server.js" || { echo "FATAL: 后端server.js未注册统一后台"; exit 1; }
grep -q 'commissionRoutes' "$BACKEND_DIR/server.js" || { echo "FATAL: 后端server.js未注册佣金路由"; exit 1; }
echo "内容门禁 OK"

echo "--- [2] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -6

echo "--- [3] 页面导出校验 ---"
for p in admin admin/unified admin/commission admin/moderation admin/orders profile profile/income share/result groups groups/chat zhongyi yixue/liuyao invite/poster friends index; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p}"
done

echo "--- [3.5] 烧录ID一致性（防更新提示死循环） ---"
BUILD_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('out/version.json','utf8')).buildId)")
echo "buildId: ${BUILD_ID}"
grep -rq "${BUILD_ID}" out/_next/static/chunks/ && echo "烧录ID一致 OK" || { echo "FATAL: 包内烧录ID缺失"; exit 1; }

echo "--- [3.6] v25.0.47_6 内容入包校验 ---"
grep -rq "api/admin/unified" out/_next/static/chunks/ && echo "ADMIN-UNIFIED-API OK" || { echo "FATAL: 统一后台API未入包"; exit 1; }
grep -rq "api/commission" out/_next/static/chunks/ && echo "COMMISSION-API OK" || { echo "FATAL: 佣金API未入包"; exit 1; }
grep -rq "可提现余额" out/_next/static/chunks/ && echo "INCOME-PAGE OK" || { echo "FATAL: 收益页文案未入包"; exit 1; }
grep -rq "待解冻金额" out/_next/static/chunks/ && echo "INCOME-FROZEN OK" || { echo "FATAL: 待解冻金额文案未入包"; exit 1; }

echo "--- [3.7] 错误IP残留扫描 ---"
BAD=$(grep -rl '101.32.191.210' out/ 2>/dev/null | wc -l)
[ "$BAD" -gt 0 ] && { echo "FATAL: $BAD 个文件含错误IP"; exit 1; }
echo "错误IP扫描 OK（0个文件）"

echo "--- [4] 发布到 ${RELEASE_DIR} ---"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
cp -r out/* "$RELEASE_DIR/"
RELEASE_FILES=$(find "$RELEASE_DIR" -type f | wc -l)
echo "Release file count: ${RELEASE_FILES}"
[ "$RELEASE_FILES" -lt 50 ] && { echo "FATAL: 文件数异常"; exit 1; }

echo "--- [4.5] 后端同步（P8+统一后台模块） ---"
for f in commissionEngine.js commissionRoutes.js adminUnifiedRoutes.js wechatTransfer.js paymentRoutes.js shareResultRoutes.js; do
  cp "backend_deploy/${f}" "$BACKEND_DIR/${f}"
  echo "synced: ${f}"
done
grep -q "adminUnifiedRoutes" "$BACKEND_DIR/server.js" || { echo "FATAL: 后端server.js未注册统一后台路由"; exit 1; }
grep -q "commissionRoutes" "$BACKEND_DIR/server.js" || { echo "FATAL: 后端server.js未注册佣金路由"; exit 1; }

echo "--- [5] 切换 current 软链 ---"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
ACTUAL=$(readlink -f /root/yandaoguoxue/current)
echo "current -> ${ACTUAL}"
[ "$ACTUAL" != "$RELEASE_DIR" ] && { echo "FATAL: symlink switch failed"; exit 1; }

echo "--- [6] 重启后端 ---"
pm2 restart yandaoguoxue-backend --update-env
sleep 4
pm2 logs yandaoguoxue-backend --lines 4 --nostream

echo "--- [7] 清理 nginx 缓存 ---"
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "--- [8] 公网验证 ---"
DOMAIN="https://yandaoguoxue.yandao.vip"
for path in admin admin/unified admin/commission admin/moderation admin/orders profile/income share/result index groups groups/chat zhongyi yixue/liuyao invite/poster friends; do
  CODE=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/${path})
  echo "公网 /${path}: ${CODE}"
  [ "$CODE" != "200" ] && { echo "FATAL: /${path} 公网非200"; exit 1; }
done
VJSON=$(curl -sL ${DOMAIN}/version.json)
echo "$VJSON"
echo "$VJSON" | grep -q "\"${VERSION}\"" || echo "WARN: 公网version可能缓存，稍后复验"
HC=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/api/health)
echo "公网 /api/health: ${HC}"
[ "$HC" != "200" ] && { echo "FATAL: 后端健康检查失败"; exit 1; }
UC=$(curl -s -o /dev/null -w '%{http_code}' ${DOMAIN}/api/admin/unified/overview)
echo "统一后台无密钥: ${UC}（应401）"
[ "$UC" != "401" ] && { echo "FATAL: 统一后台未鉴权"; exit 1; }
CC=$(curl -s -o /dev/null -w '%{http_code}' ${DOMAIN}/api/commission/my/summary)
echo "佣金接口未登录: ${CC}（应401）"
[ "$CC" != "401" ] && { echo "FATAL: 佣金接口未鉴权"; exit 1; }
echo "===== DEPLOY v25.0.47_6 COMPLETE ====="
