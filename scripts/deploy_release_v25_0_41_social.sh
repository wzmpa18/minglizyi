#!/bin/bash
# v25.0.41 第二阶段发布：社交最终封板前端（20260819用户指令）
#   底部"好友"改"聊天"(消息/通讯录双Tab) + 唯一用户资料页 /user + 群聊第一版UI + 发现页修复
#   发布目录：releases/v25.0.41_2（保留v25.0.41旧包可回滚）
#   禁改易学工具：本轮除已授权的ziwei/page.tsx(童限)外，yixue目录必须零改动
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.41"
REL_TAG="v25.0.41_2"
BASE="6c7d149"
RELEASE_DIR="/root/yandaoguoxue/releases/${REL_TAG}"

cd "$SRC_DIR"

echo "--- [0] 源码同步校验 ---"
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"; git log --oneline -3
grep -q "\"version\": \"${VERSION}\"" package.json || { echo "FATAL: package.json 版本非 ${VERSION}"; exit 1; }

echo "--- [0.5] 易学工具零非授权修改核查（自v25.0.40基线，唯一授权=ziwei/page.tsx童限） ---"
DIFF_FILES=$(git diff --name-only ${BASE}..HEAD | sort)
echo "$DIFF_FILES"
# yixue 目录下只允许 ziwei/page.tsx
YIXUE_CHANGED=$(echo "$DIFF_FILES" | grep "^src/app/yixue/" | grep -v "^src/app/yixue/ziwei/page.tsx$" || true)
[ -z "$YIXUE_CHANGED" ] || { echo "FATAL: 易学工具存在非授权修改: $YIXUE_CHANGED"; exit 1; }
# 算法核心目录零改动
CORE_CHANGED=$(echo "$DIFF_FILES" | grep -E "algorithm-core|src/lib/yixue|src/lib/(bazi|qimen|liuyao|liuren|ziwei)" | grep -v "src/app/yixue/ziwei/page.tsx" || true)
[ -z "$CORE_CHANGED" ] || { echo "FATAL: 算法/易学核心存在非授权修改: $CORE_CHANGED"; exit 1; }
echo "易学工具零非授权修改 OK"

echo "--- [1] 社交封板内容门禁 ---"
grep -q '通讯录' src/app/friends/page.tsx || { echo "FATAL: 聊天页缺通讯录Tab"; exit 1; }
grep -q '"聊天"' src/components/BottomNav.tsx && echo "BN: 聊天Tab OK" || { echo "FATAL: BottomNav缺聊天入口"; exit 1; }
test -f src/app/user/page.tsx || { echo "FATAL: 唯一用户资料页缺失"; exit 1; }
grep -q '举报' src/app/user/page.tsx || { echo "FATAL: 资料页缺举报"; exit 1; }
grep -q '群公告' src/app/groups/info/\[id\]/ClientPage.tsx || { echo "FATAL: 群详情缺群公告"; exit 1; }
grep -q 'blacklist' src/lib/socialApi.ts || { echo "FATAL: socialApi缺黑名单"; exit 1; }
grep -q 'REBATE_PRODUCT_PRICES' src/lib/backend/register_routes.js || { echo "FATAL: 返佣安全补丁缺失"; exit 1; }
grep -q 'reconcileInviteFriendships' src/lib/backend/register_routes.js || { echo "FATAL: 邀请一致性补偿缺失"; exit 1; }
echo "内容门禁 OK"

echo "--- [2] 构建（build.sh 静态导出） ---"
# pipefail 仅限构建子shell：全局pipefail会让[3.6]的grep无匹配(退出码1)被set -e静默终止
( set -o pipefail; bash build.sh 2>&1 | tail -6 )

echo "--- [3] 页面导出校验 ---"
# 首页为单文件导出 out/index.html（非目录式）
test -f "out/index.html" || { echo "FATAL: out/index.html missing"; exit 1; }
echo "OK: index(单文件导出)"
for p in friends user groups messages discover; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p}"
done

echo "--- [3.5] 功能标记入包校验 ---"
grep -rq "通讯录" out/_next/static/chunks/ && echo "CHAT-TAB(消息/通讯录) OK" || { echo "FATAL: 聊天双Tab未入包"; exit 1; }
grep -rq "童限宫" out/_next/static/chunks/ && echo "TX-ROW(童限保留) OK" || { echo "FATAL: 童限功能丢失"; exit 1; }
grep -rq "加入黑名单" out/_next/static/chunks/ && echo "PROFILE(用户资料页) OK" || { echo "FATAL: 用户资料页未入包"; exit 1; }
grep -rq "群公告" out/_next/static/chunks/ && echo "GROUP(群详情) OK" || { echo "FATAL: 群详情未入包"; exit 1; }

echo "--- [3.6] 错误IP残留与version门禁 ---"
BAD=$(grep -rl '101.32.191.210' out/ 2>/dev/null | wc -l)
[ "$BAD" -gt 0 ] && { echo "FATAL: $BAD 个文件含错误IP"; exit 1; }
echo "错误IP扫描 OK"
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

echo "--- [7] 公网验证（五入口+聊天/资料/群/发现+童限+健康+版本） ---"
DOMAIN="https://yandaoguoxue.yandao.vip"
for path in index discover friends user groups messages profile academy yixue/ziwei yixue; do
  CODE=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/${path})
  echo "公网 /${path}: ${CODE}"
  [ "$CODE" != "200" ] && { echo "FATAL: /${path} 公网非200"; exit 1; }
done
VJSON=$(curl -sL ${DOMAIN}/version.json)
echo "$VJSON"
echo "$VJSON" | grep -q "\"${VERSION}\"" || { echo "WARN: 公网version未生效（缓存）"; }
HC=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/api/health)
echo "公网 /api/health: ${HC}"
[ "$HC" != "200" ] && { echo "FATAL: 后端健康非200"; exit 1; }
# 公网JS含社交封板标记
PAGE_HTML=$(curl -sL ${DOMAIN}/friends)
CHUNK=$(echo "$PAGE_HTML" | grep -o '/_next/static/chunks/[a-zA-Z0-9_%./-]*\.js' | head -8)
SOC_OK=0
for c in $CHUNK; do
  if curl -sL "${DOMAIN}${c}" | grep -q "通讯录"; then SOC_OK=1; echo "公网JS含聊天双Tab标记: ${c}"; break; fi
done
[ "$SOC_OK" = "1" ] || echo "WARN: 首屏chunk未含标记（懒加载chunk，以发布目录核查为准）"
echo "===== DEPLOY ${REL_TAG} COMPLETE ====="
