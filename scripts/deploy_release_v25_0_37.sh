#!/bin/bash
# v25.0.37 发布：P7-社交修复-01（聊天输入框遮盖 + 邮箱注册归因 + 紫微八项布局整改）
#   1) 聊天输入框被底部Tab栏(zIndex1000)遮盖 → 私聊页隐藏Tab栏 + 输入栏zIndex1001+safe-area
#   2) 邮箱注册完全丢失邀请归因（用户100038实例）→ registerWithEmail补齐ref/ts/sig+deviceId+referrer_id；
#      后端/register解构referrer_id纯ref审计留痕；执行人工对账补绑脚本(reconcile_invite_100038.js)
#   3) 紫微八项：星曜单行横排(副星杂曜实测缩小)/每星含杂曜庙旺/右下角干支去重沉底/十二长生纵排其上/
#      动态星E区长生上方自下而上/来因宫右缘中部竖排/底部童限小限/宫内流年小限岁数常显
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.37"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
BACKEND_DIR="/www/yandaoguoxue-backend"
CONTENT_COMMIT="6cba27a"

cd "$SRC_DIR"

echo "--- [0] 源码同步校验（祖先提交校验，规避脚本入库自引用哈希） ---"
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"; git log --oneline -2
git merge-base --is-ancestor "${CONTENT_COMMIT}" HEAD || { echo "FATAL: 内容提交 ${CONTENT_COMMIT} 不在当前历史，先 git pull"; exit 1; }
grep -q "\"version\": \"${VERSION}\"" package.json || { echo "FATAL: package.json 版本未升级到 ${VERSION}"; exit 1; }

echo "--- [0.5] 内容门禁（本轮：聊天输入框/邮箱归因/紫微八项） ---"
grep -q 'pathname.startsWith("/friends/chat")' src/components/BottomNav.tsx || { echo "FATAL: BottomNav私聊页隐藏缺失"; exit 1; }
grep -q 'zIndex: 1001' 'src/app/friends/chat/[id]/ClientPage.tsx' || { echo "FATAL: 聊天输入栏zIndex缺失"; exit 1; }
grep -q '邮箱注册与手机注册同口径' src/lib/loginService.ts || { echo "FATAL: 邮箱注册归因补齐缺失"; exit 1; }
grep -q 'UNSIGNED_REF_MANUAL_RECONCILE' src/lib/backend/register_routes.js || { echo "FATAL: 后端referrer_id审计缺失"; exit 1; }
grep -q 'flexWrap: "nowrap"' src/app/yixue/ziwei/page.tsx || { echo "FATAL: 紫微星曜单行横排缺失"; exit 1; }
grep -q '每颗星（含杂曜）都要庙旺' src/app/yixue/ziwei/page.tsx || { echo "FATAL: 杂曜庙旺缺失"; exit 1; }
grep -q '底部必须有童限标记' src/app/yixue/ziwei/page.tsx || { echo "FATAL: 童限标记缺失"; exit 1; }
grep -q '来因宫改右侧靠边中间纵向竖排显示' src/app/yixue/ziwei/page.tsx || { echo "FATAL: 来因宫右缘竖排缺失"; exit 1; }
grep -q 'user_invite_relation' scripts/reconcile_invite_100038.js || { echo "FATAL: 补绑脚本缺失"; exit 1; }
echo "内容门禁 OK"

echo "--- [1] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -6

echo "--- [2] 页面导出校验（本轮涉及页 + 核心页抽检） ---"
for p in friends/chat friends/profile friends register login invite yixue/ziwei; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p}"
done

echo "--- [3] 功能标记入包校验 ---"
grep -rq "童限" out/_next/static/chunks/ && echo "ZW-TONGXIAN(童限标记) OK" || { echo "FATAL: 童限标记缺失"; exit 1; }
grep -rq "来因" out/_next/static/chunks/ && echo "ZW-LAIYIN(来因宫) OK" || { echo "FATAL: 来因宫标记缺失"; exit 1; }
grep -rq "邀请人已自动绑定" out/_next/static/chunks/ && echo "REG-AUTOBIND(注册自动绑定) OK" || { echo "FATAL: 注册自动绑定标记缺失"; exit 1; }
grep -rq "缺少好友参数" out/_next/static/chunks/ && echo "CHAT-QUERY-PAGE(聊天查询参数页) OK" || { echo "FATAL: 聊天查询参数页标记缺失"; exit 1; }
grep -rq "运限四化" out/_next/static/chunks/ && echo "ZW-TIME(时间轴四化) OK" || { echo "FATAL: 时间轴四化缺失"; exit 1; }
grep -rq "大限命宫" out/_next/static/chunks/ && echo "ZW-OVERLAY(叠宫) OK" || { echo "FATAL: 叠宫标记缺失"; exit 1; }
grep -rq "不再显示推广浮窗" out/_next/static/chunks/ && echo "PROMO-FLOAT-GOV(浮窗治理) OK" || { echo "FATAL: 浮窗治理标记缺失"; exit 1; }

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

echo "--- [7] 后端热更新（register_routes.js：referrer_id解构+纯ref审计留痕） ---"
STAMP=$(date +%Y%m%d_%H%M%S)
cp "${BACKEND_DIR}/register_routes.js" "${BACKEND_DIR}/register_routes.js.bak_v25_0_37_${STAMP}"
cp src/lib/backend/register_routes.js "${BACKEND_DIR}/register_routes.js"
node --check "${BACKEND_DIR}/register_routes.js" && echo "register_routes 语法校验 OK"
grep -q 'UNSIGNED_REF_MANUAL_RECONCILE' "${BACKEND_DIR}/register_routes.js" && echo "纯ref审计留痕 OK"
pm2 restart yandaoguoxue-backend
sleep 3
pm2 list | grep yandaoguoxue-backend

echo "--- [8] 人工对账补绑（用户100038 → 邀请人100000，幂等可重复） ---"
cd "${BACKEND_DIR}" && node "${SRC_DIR}/scripts/reconcile_invite_100038.js"
cd "$SRC_DIR"

echo "--- [9] 公网验证（本轮涉及页 + 首页 + version + 后端健康） ---"
DOMAIN="https://yandaoguoxue.yandao.vip"
for path in friends/chat friends/register register invite yixue/ziwei; do
  CODE=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/${path})
  echo "公网 /${path}: ${CODE}"
  [ "$CODE" != "200" ] && { echo "FATAL: /${path} 公网非200"; exit 1; }
done
VJSON=$(curl -sL ${DOMAIN}/version.json)
echo "$VJSON"
echo "$VJSON" | grep -q "\"v25.0.37\"" || { echo "WARN: 公网version未生效（可能缓存，稍后复验）"; }
HC=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/api/health)
echo "公网 /api/health: ${HC}"
echo "===== DEPLOY ${VERSION} COMPLETE ====="
