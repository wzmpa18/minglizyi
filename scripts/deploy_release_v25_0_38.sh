#!/bin/bash
# v25.0.38 发布：P0-社交修复-02（昵称实时同步 + 私聊双向投递闭环 + APK输入修复配置）
#   1) P0-1 昵称不一致：聊天页挂载强制调 /api/social/users/:id/profile 拉取最新昵称
#      （标题+消息旁昵称实时渲染，同步刷新本地缓存；好友列表合并后 saveFriends 持久化）
#   2) P0-2 双向投递：前端 api() 增加 HTTP 状态码检查（401 登录过期显式提示条，不再静默）；
#      消息拉取不过滤发送方（含自己历史，跨设备可见），乐观消息服务端确认后 id 统一 srv_ 前缀去重；
#      发送状态三态（发送中时钟/失败红叹号点击重发）；发送按钮防抖；后端通知 link 改 query 格式
#   3) P0-3 APK 输入修复配置：capacitor.config.ts 移除已废弃的 captureInput；
#      AndroidManifest activity 增加 windowSoftInputMode="adjustResize"（键盘弹出输入栏上移）
#      —— 此两项需重新打包 APK 生效，H5 侧修复随本版即时生效
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.38"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
BACKEND_DIR="/www/yandaoguoxue-backend"
CONTENT_COMMIT="PENDING_CONTENT_COMMIT"

cd "$SRC_DIR"

echo "--- [0] 源码同步校验 ---"
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"; git log --oneline -2
grep -q "\"version\": \"${VERSION}\"" package.json || { echo "FATAL: package.json 版本未升级到 ${VERSION}"; exit 1; }

echo "--- [0.5] 内容门禁（本轮：昵称实时/双向投递/APK配置） ---"
grep -q 'v25.0.38 P0-1：对方最新昵称' 'src/app/friends/chat/[id]/ClientPage.tsx' || { echo "FATAL: 聊天页实时昵称拉取缺失"; exit 1; }
grep -q 'fetchUserProfile(friendId)' 'src/app/friends/chat/[id]/ClientPage.tsx' || { echo "FATAL: 聊天页未调用后端用户接口"; exit 1; }
grep -q 'v25.0.38 P0-2：服务端确认后用 srv_ 版本替换本地乐观消息' 'src/app/friends/chat/[id]/ClientPage.tsx' || { echo "FATAL: 服务端确认替换逻辑缺失"; exit 1; }
grep -q '不过滤发送方' 'src/app/friends/chat/[id]/ClientPage.tsx' || { echo "FATAL: 消息拉取仍过滤自己消息"; exit 1; }
grep -q '登录已过期，消息无法收发' 'src/app/friends/chat/[id]/ClientPage.tsx' || { echo "FATAL: 401 提示条缺失"; exit 1; }
grep -q 'if (sending) return' 'src/app/friends/chat/[id]/ClientPage.tsx' || { echo "FATAL: 发送防抖缺失"; exit 1; }
grep -q 'res.status === 401' src/lib/socialApi.ts || { echo "FATAL: socialApi 401 处理缺失"; exit 1; }
grep -q 'v25.0.38 P0-1：同步结果持久化到本地' src/app/friends/page.tsx || { echo "FATAL: 好友列表持久化缺失"; exit 1; }
grep -q 'v25.0.38 P0-2：通知跳转改 query 格式' backend_deploy/socialApiRoutes.js || { echo "FATAL: 后端通知 link 修正缺失"; exit 1; }
! grep -q 'captureInput: true' capacitor.config.ts || { echo "FATAL: captureInput 仍存在"; exit 1; }
grep -q 'adjustResize' android/app/src/main/AndroidManifest.xml || { echo "FATAL: AndroidManifest adjustResize 缺失"; exit 1; }
echo "内容门禁 OK"

echo "--- [1] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -6

echo "--- [2] 页面导出校验 ---"
for p in friends/chat friends friends/profile register login invite yixue/ziwei; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p}"
done

echo "--- [3] 功能标记入包校验 ---"
grep -rq "登录已过期，消息无法收发" out/_next/static/chunks/ && echo "CHAT-AUTH-ALERT(401提示条) OK" || { echo "FATAL: 401提示条未入包"; exit 1; }
grep -rq "重发消息" out/_next/static/chunks/ && echo "CHAT-RESEND(失败重发) OK" || { echo "FATAL: 失败重发未入包"; exit 1; }
grep -rq "发送中" out/_next/static/chunks/ && echo "CHAT-SENDING(发送状态) OK" || { echo "FATAL: 发送状态未入包"; exit 1; }
grep -rq "网络连接失败，请检查网络后重试" out/_next/static/chunks/ && echo "CHAT-NET-ERR(网络异常提示) OK" || { echo "FATAL: 网络异常提示未入包"; exit 1; }
grep -rq "缺少好友参数" out/_next/static/chunks/ && echo "CHAT-QUERY-PAGE(聊天查询参数页) OK" || { echo "FATAL: 聊天查询参数页标记缺失"; exit 1; }

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

echo "--- [7] 后端热更新（socialApiRoutes.js：通知 link 改 query 格式） ---"
STAMP=$(date +%Y%m%d_%H%M%S)
cp "${BACKEND_DIR}/socialApiRoutes.js" "${BACKEND_DIR}/socialApiRoutes.js.bak_v25_0_38_${STAMP}"
cp backend_deploy/socialApiRoutes.js "${BACKEND_DIR}/socialApiRoutes.js"
node --check "${BACKEND_DIR}/socialApiRoutes.js" && echo "socialApiRoutes 语法校验 OK"
grep -q 'v25.0.38 P0-2：通知跳转改 query 格式' "${BACKEND_DIR}/socialApiRoutes.js" && echo "通知 link query 格式 OK"
pm2 restart yandaoguoxue-backend
sleep 3
pm2 list | grep yandaoguoxue-backend

echo "--- [8] 公网验证（本轮涉及页 + 首页 + version + 后端健康 + 私聊接口） ---"
DOMAIN="https://yandaoguoxue.yandao.vip"
for path in friends/chat friends messages register invite yixue/ziwei; do
  CODE=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/${path})
  echo "公网 /${path}: ${CODE}"
  [ "$CODE" != "200" ] && { echo "FATAL: /${path} 公网非200"; exit 1; }
done
VJSON=$(curl -sL ${DOMAIN}/version.json)
echo "$VJSON"
echo "$VJSON" | grep -q "\"v25.0.38\"" || { echo "WARN: 公网version未生效（可能缓存，稍后复验）"; }
HC=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/api/health)
echo "公网 /api/health: ${HC}"
# 私聊接口鉴权验证：未带 token 应返回 401 结构化错误（而非 500/404，证明路由在线）
CHAT_AUTH=$(curl -sL ${DOMAIN}/api/social/messages/private/100000)
echo "私聊接口未登录响应: ${CHAT_AUTH}"
echo "$CHAT_AUTH" | grep -q "请先登录" && echo "私聊接口鉴权在线 OK" || { echo "WARN: 私聊接口响应异常"; }
echo "===== DEPLOY ${VERSION} COMPLETE ====="
