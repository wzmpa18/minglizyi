#!/bin/bash
# v25.0.46 发布：群聊建群ID分离修复 + 中医全资料域搜索 + 六爻表格对齐
#   1) 群聊：建群等待服务端返回并统一使用服务端群ID（修复发消息/群详情/
#      踢人/拉人全部404的根因）；创建成功直接进入群聊页
#   2) 群列表：服务端群填充真实成员数 + 统一会话接口最后消息/未读角标
#   3) 中医搜索：全资料域（中药/方剂/穴位/经络/典籍全文/养生功法/伤寒证型）
#   4) 六爻：卦盘HTML表格结构，六神/爻位/本卦/变卦横向严格对齐
#   后端：无改动（socialApiRoutes.js 群聊接口自v25.0.42已完备，仅校验在线状态）
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.46"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
BACKEND_DIR="/www/yandaoguoxue-backend"

cd "$SRC_DIR"

echo "--- [0] 源码同步校验 ---"
# 服务器构建会重新生成 version.json/package-lock.json 产生脏改动，pull 前先还原
git checkout -- public/version.json package-lock.json 2>/dev/null || true
git pull origin main
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"; git log --oneline -1
git log --oneline -1 | grep -q "v25.0.46" || { echo "FATAL: HEAD提交非v25.0.46"; exit 1; }
grep -q "\"version\": \"${VERSION}\"" package.json || { echo "FATAL: package.json 版本未升级"; exit 1; }

echo "--- [1] 内容门禁（本次三大修复） ---"
grep -q "r.group.groupId" src/app/groups/create/page.tsx || { echo "FATAL: 建群未使用服务端群ID"; exit 1; }
grep -q "apiCreateGroup(name)" src/app/groups/create/page.tsx || { echo "FATAL: 建群未调用服务端"; exit 1; }
grep -q "fetchConversations" src/app/groups/page.tsx || { echo "FATAL: 群列表未接入统一会话"; exit 1; }
grep -q "searchAcupoints" src/app/zhongyi/page.tsx || { echo "FATAL: 中医搜索缺穴位域"; exit 1; }
grep -q "searchClassics" src/app/zhongyi/page.tsx || { echo "FATAL: 中医搜索缺典籍域"; exit 1; }
grep -q "searchGongfa" src/app/zhongyi/page.tsx || { echo "FATAL: 中医搜索缺养生域"; exit 1; }
grep -q "SHANGHAN_SYNDROMES" src/app/zhongyi/page.tsx || { echo "FATAL: 中医搜索缺伤寒域"; exit 1; }
grep -q "六神/爻位/本卦/变卦横竖对齐" src/app/yixue/liuyao/page.tsx || { echo "FATAL: 六爻表格对齐缺失"; exit 1; }
echo "内容门禁 OK"

echo "--- [2] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -6

echo "--- [3] 页面导出校验 ---"
for p in groups/chat groups/create groups zhongyi zhongyi/herb zhongyi/formula zhongyi/meridian zhongyi/classic zhongyi/yangsheng/detail yixue/liuyao; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p}"
done
test -f "out/index.html" || { echo "FATAL: out/index.html missing"; exit 1; }
echo "OK: index(首页)"
grep -q "\"version\": \"${VERSION}\"" out/version.json || { echo "FATAL: version.json 未升级"; cat out/version.json; exit 1; }
cat out/version.json

echo "--- [3.5] 烧录ID一致性（防更新提示死循环） ---"
BUILD_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('out/version.json','utf8')).buildId)")
echo "buildId: ${BUILD_ID}"
grep -rq "${BUILD_ID}" out/_next/static/chunks/ && echo "烧录ID一致 OK" || { echo "FATAL: 包内烧录ID缺失"; exit 1; }

echo "--- [3.6] 本次修复入包校验 ---"
grep -rq "创建中…" out/_next/static/chunks/ && echo "GROUP-CREATE(建群等待态) OK" || { echo "FATAL: 建群页未入包"; exit 1; }
grep -rq "正在搜索中药、方剂、穴位、经络、典籍、养生" out/_next/static/chunks/ && echo "TCM-SEARCH(全资料域搜索) OK" || { echo "FATAL: 中医搜索未入包"; exit 1; }
grep -rq "未找到与" out/_next/static/chunks/ && echo "TCM-EMPTY(空结果提示) OK" || { echo "FATAL: 空结果提示未入包"; exit 1; }

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
[ "$RELEASE_FILES" -lt 50 ] && { echo "FATAL: release suspiciously small"; exit 1; }

echo "--- [5] 切换 current 软链 ---"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
ACTUAL=$(readlink -f /root/yandaoguoxue/current)
echo "current -> ${ACTUAL}"
[ "$ACTUAL" != "$RELEASE_DIR" ] && { echo "FATAL: symlink switch failed"; exit 1; }

echo "--- [6] 后端校验（本次无改动，验证群聊接口在线） ---"
grep -q "groups_enabled: true" "$BACKEND_DIR/socialApiRoutes.js" && echo "groups_enabled=true OK" || echo "WARN: 后端groups_enabled非true，请检查"
pm2 restart yandaoguoxue-backend --update-env
sleep 4
pm2 logs yandaoguoxue-backend --lines 4 --nostream

echo "--- [7] 清理 nginx 缓存 ---"
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "--- [8] 公网验证 ---"
DOMAIN="https://yandaoguoxue.yandao.vip"
for path in groups groups/create groups/chat zhongyi zhongyi/herb zhongyi/meridian zhongyi/classic yixue/liuyao index; do
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
echo "===== DEPLOY ${VERSION} COMPLETE ====="
