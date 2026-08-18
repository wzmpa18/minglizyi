#!/bin/bash
# v25.0.36 发布：P7-上架前阻断整改-02 用户反馈三大阻断修复
#   1) 紫微星曜恢复v29逐字竖排口径：副星与主星同字号（仅杂曜略小）；庙旺为星名正下方首行；宫干支+大限干支右下角竖排；长生右上；动态星E区竖排不变
#   2) 静态导出动态路由404根治：8条[id]路由真实ID跳转被nginx兜底到首页（好友点击→主页无法聊天根因）
#      新增7张 ?id= 查询参数静态页：friends/chat friends/profile groups/chat groups/info discover/detail featured/detail yangsheng/detail
#   3) 注册页受邀自动绑定：扫码ref/ts/sig进入隐藏邀请码输入框，显示"邀请人已自动绑定"；下载页文案去除邀请码填写引导
#   4) 修复 profile 二维码弹窗 qrApiUrl 未定义运行时崩溃（v25.0.31遗留）
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.36"
BUILD_ID="${VERSION}_D20260819"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
CONTENT_COMMIT="5c63fde"

cd "$SRC_DIR"

echo "--- [0] 源码同步校验（祖先提交校验，规避脚本入库自引用哈希） ---"
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"; git log --oneline -2
git merge-base --is-ancestor "${CONTENT_COMMIT}" HEAD || { echo "FATAL: 内容提交 ${CONTENT_COMMIT} 不在当前历史，先 git pull"; exit 1; }
grep -q "\"version\": \"${VERSION}\"" package.json || { echo "FATAL: package.json 版本未升级到 ${VERSION}"; exit 1; }

echo "--- [0.5] 内容门禁（本轮7张查询参数页 + 注册自动绑定 + 紫微竖排） ---"
for p in friends/chat friends/profile groups/chat groups/info discover/detail featured/detail yangsheng/detail; do
  test -f "src/app/${p}/page.tsx" || { echo "FATAL: src/app/${p}/page.tsx 缺失"; exit 1; }
done
grep -q "邀请人已自动绑定" src/app/register/page.tsx || { echo "FATAL: 注册自动绑定提示缺失"; exit 1; }
grep -q "routeId" "src/app/friends/chat/[id]/ClientPage.tsx" || { echo "FATAL: 好友聊天ClientPage未支持routeId"; exit 1; }
grep -q 'star.name.split("")' "src/app/yixue/ziwei/page.tsx" || { echo "FATAL: 紫微星曜逐字竖排缺失"; exit 1; }
echo "内容门禁 OK"

echo "--- [1] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -6

echo "--- [2] 页面导出校验（本轮7张新页 + 核心页抽检） ---"
for p in friends/chat friends/profile groups/chat groups/info discover/detail featured/detail yangsheng/detail friends profile register login invite yixue/ziwei; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p}"
done

echo "--- [3] 功能标记入包校验 ---"
# 注册自动绑定（受邀隐藏邀请码）
grep -rq "邀请人已自动绑定" out/_next/static/chunks/ && echo "REG-AUTOBIND(注册自动绑定) OK" || { echo "FATAL: 注册自动绑定标记缺失"; exit 1; }
# 查询参数页无参兜底文案（证明静态页生效而非404兜底）
grep -rq "缺少好友参数" out/_next/static/chunks/ && echo "CHAT-QUERY-PAGE(聊天查询参数页) OK" || { echo "FATAL: 聊天查询参数页标记缺失"; exit 1; }
# 好友列表发消息入口
grep -rq "发消息" out/_next/static/chunks/ && echo "FRIEND-MSG-ENTRY(发消息入口) OK" || { echo "FATAL: 发消息入口缺失"; exit 1; }
# 紫微既有功能保留（红线：无回归）
grep -rq "运限四化" out/_next/static/chunks/ && echo "ZW-TIME(时间轴四化) OK" || { echo "FATAL: 时间轴四化缺失"; exit 1; }
grep -rq "大限命宫" out/_next/static/chunks/ && echo "ZW-OVERLAY(叠宫) OK" || { echo "FATAL: 叠宫标记缺失"; exit 1; }
# 弹窗治理既有成果保留（红线：无回归）
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

echo "--- [7] 公网验证（本轮涉及页 + 首页 + version） ---"
DOMAIN="https://yandaoguoxue.yandao.vip"
for path in friends/chat friends/profile friends register invite yixue/ziwei; do
  CODE=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/${path})
  echo "公网 /${path}: ${CODE}"
  [ "$CODE" != "200" ] && { echo "FATAL: /${path} 公网非200"; exit 1; }
done
VJSON=$(curl -sL ${DOMAIN}/version.json)
echo "$VJSON"
echo "$VJSON" | grep -q "\"v25.0.36\"" || { echo "WARN: 公网version未生效（可能缓存，稍后复验）"; }
HOME=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/)
echo "公网首页: ${HOME}"
echo "===== DEPLOY ${VERSION} COMPLETE ====="
