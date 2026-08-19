#!/bin/bash
# v25.0.40 发布：社交×营销绑定闭环（消费返佣服务端统一账本 + 邀请注册自动互加好友 + 聊天内邀请分享入口）
#   1) 后端 register_routes.js（已于本轮预热更上线，本版做源码=线上一致性门禁）：
#      - consumption_rebates 统一返佣账本：订单号 UNIQUE 幂等，一级15%/二级8%积分实时入账
#      - POST /api/auth/invite/consumption-rebate 消费返佣上报路由（JWT鉴权）
#      - 邀请注册绑定成功后自动互加好友 autoFriendOnInviteBind（跨库写 social.db friendships）
#      - 推广中心总览/积分流水明细合并返佣记录（前后端数据单轨）
#   2) 前端5文件：
#      - inviteApi.ts：新增 reportConsumptionRebate 服务端上报（弃 localStorage 本地模拟）
#      - membership/page.tsx：会员支付成功改调服务端返佣（order.id 作幂等订单号）
#      - BatchNumberMatching.tsx：数字能量报告支付成功改调服务端返佣（bnm_ 前缀订单键）
#      - inviteStore.ts：删除本地消费返佣死代码（-168行：接口/常量/6个函数/getRewardDetails）
#      - friends/chat/[id]/ClientPage.tsx：发送逻辑重构 sendTextMessage + 输入栏新增
#        "分享邀请链接"按钮（一键把我的专属邀请链接发给好友，含防抖）
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.40"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
BACKEND_DIR="/www/yandaoguoxue-backend"

cd "$SRC_DIR"

echo "--- [0] 源码同步校验 ---"
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"; git log --oneline -2
grep -q "\"version\": \"${VERSION}\"" package.json || { echo "FATAL: package.json 版本未升级到 ${VERSION}"; exit 1; }

echo "--- [0.5] 内容门禁（本轮：社交×营销绑定 前端5文件+后端3特性） ---"
grep -q 'reportConsumptionRebate' src/lib/inviteApi.ts || { echo "FATAL: inviteApi 缺少返佣上报函数"; exit 1; }
grep -q 'invite/consumption-rebate' src/lib/inviteApi.ts || { echo "FATAL: inviteApi 缺少返佣API路径"; exit 1; }
grep -q 'reportConsumptionRebate({ orderNo: order.id' src/app/membership/page.tsx || { echo "FATAL: 会员页未改服务端返佣"; exit 1; }
grep -q 'orderNo: `bnm_' src/components/BatchNumberMatching.tsx || { echo "FATAL: 数字能量页未改服务端返佣"; exit 1; }
if grep -q 'processConsumptionRebate' src/lib/inviteStore.ts; then echo "FATAL: inviteStore 本地返佣死代码未清理"; exit 1; fi
grep -q 'handleShareInvite' 'src/app/friends/chat/[id]/ClientPage.tsx' || { echo "FATAL: 聊天页邀请分享入口缺失"; exit 1; }
grep -q 'aria-label="分享邀请链接"' 'src/app/friends/chat/[id]/ClientPage.tsx' || { echo "FATAL: 分享按钮标记缺失"; exit 1; }
grep -q 'consumption_rebates' src/lib/backend/register_routes.js || { echo "FATAL: 后端返佣账本缺失"; exit 1; }
grep -q 'autoFriendOnInviteBind' src/lib/backend/register_routes.js || { echo "FATAL: 自动加好友缺失"; exit 1; }
grep -q "invite/consumption-rebate" src/lib/backend/register_routes.js || { echo "FATAL: 后端返佣路由缺失"; exit 1; }
echo "内容门禁 OK"

echo "--- [1] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -6

echo "--- [2] 页面导出校验 ---"
for p in friends/chat friends membership invite register login yixue/ziwei; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p}"
done

echo "--- [3] 功能标记入包校验 ---"
grep -rq "invite/consumption-rebate" out/_next/static/chunks/ && echo "REBATE-API(返佣上报接口) OK" || { echo "FATAL: 返佣接口未入包"; exit 1; }
grep -rq "bnm_" out/_next/static/chunks/ && echo "BNM-REBATE(数字能量返佣) OK" || { echo "FATAL: 数字能量返佣标记未入包"; exit 1; }
grep -rq "分享邀请链接" out/_next/static/chunks/ && echo "CHAT-SHARE-INVITE(聊天邀请分享) OK" || { echo "FATAL: 邀请分享未入包"; exit 1; }
grep -rq "我邀请你一起学国学" out/_next/static/chunks/ && echo "INVITE-MSG(邀请文案) OK" || { echo "FATAL: 邀请文案未入包"; exit 1; }

echo "--- [3.5] 错误IP残留与version门禁 ---"
BAD=$(grep -rl '101.32.191.210' out/ 2>/dev/null | wc -l)
[ "$BAD" -gt 0 ] && { echo "FATAL: $BAD 个文件含错误IP"; exit 1; }
echo "错误IP扫描 OK（0个文件）"
grep -q "\"version\": \"${VERSION}\"" out/version.json || { echo "FATAL: version.json 未升级"; cat out/version.json; exit 1; }
cat out/version.json

echo "--- [4] 发布到 ${RELEASE_DIR} ---"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
cp -r out/* "$RELEASE_DIR/"
cp -r .next "$RELEASE_DIR/" 2>/dev/null || true
cp package.json "$RELEASE_DIR/" 2>/dev/null || true

RELEASE_FILES=$(find "$RELEASE_DIR" -type f | wc -l)
echo "Release file count: ${RELEASE_FILES}"
[ "$RELEASE_FILES" -lt 50 ] && { echo "FATAL: release suspiciously small"; exit 1; }

echo "--- [5] 切换 current 软链 ---"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
ACTUAL=$(readlink -f /root/yandaoguoxue/current)
echo "current -> ${ACTUAL}"
[ "$ACTUAL" != "$RELEASE_DIR" ] && { echo "FATAL: symlink switch failed"; exit 1; }

echo "--- [6] 清理 nginx 缓存 ---"
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "--- [7] 后端一致性门禁（register_routes.js 已于本轮预热更上线） ---"
SRC_MD5=$(md5sum src/lib/backend/register_routes.js | awk '{print $1}')
LIVE_MD5=$(md5sum "${BACKEND_DIR}/register_routes.js" | awk '{print $1}')
if [ "$SRC_MD5" = "$LIVE_MD5" ]; then
  echo "register_routes.js 源码=线上（${SRC_MD5}）一致，无需热更"
else
  echo "WARN: 源码与线上不一致，执行热更（src=${SRC_MD5} live=${LIVE_MD5}）"
  STAMP=$(date +%Y%m%d_%H%M%S)
  cp "${BACKEND_DIR}/register_routes.js" "${BACKEND_DIR}/register_routes.js.bak_v25_0_40_${STAMP}"
  cp src/lib/backend/register_routes.js "${BACKEND_DIR}/register_routes.js"
  node --check "${BACKEND_DIR}/register_routes.js" && echo "register_routes 语法校验 OK"
  pm2 restart yandaoguoxue-backend
  sleep 3
  pm2 list | grep yandaoguoxue-backend
fi

echo "--- [8] 公网验证（本轮涉及页 + 首页 + version + 后端健康 + 返佣接口鉴权） ---"
DOMAIN="https://yandaoguoxue.yandao.vip"
for path in friends/chat friends membership invite register login yixue/ziwei; do
  CODE=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/${path})
  echo "公网 /${path}: ${CODE}"
  [ "$CODE" != "200" ] && { echo "FATAL: /${path} 公网非200"; exit 1; }
done
VJSON=$(curl -sL ${DOMAIN}/version.json)
echo "$VJSON"
echo "$VJSON" | grep -q "\"v25.0.40\"" || { echo "WARN: 公网version未生效（可能缓存，稍后复验）"; }
HC=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/api/health)
echo "公网 /api/health: ${HC}"
# 返佣接口鉴权验证：未带 token 应返回 401 结构化错误（而非404/500，证明路由在线且受保护）
REBATE_AUTH=$(curl -sL -X POST ${DOMAIN}/api/auth/invite/consumption-rebate -H 'Content-Type: application/json' -d '{"orderNo":"probe_noauth","amount":1}')
echo "返佣接口未登录响应: ${REBATE_AUTH}"
echo "$REBATE_AUTH" | grep -q "请先登录" && echo "返佣接口鉴权在线 OK" || { echo "WARN: 返佣接口响应异常"; }
echo "===== DEPLOY ${VERSION} COMPLETE ====="
