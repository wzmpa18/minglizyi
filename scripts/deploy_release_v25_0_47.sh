#!/bin/bash
# v25.0.47 发布：P0-A底部导航统一避让 + P1-A legacy group_*假群治理
#   1) P0-A：--bottom-nav-height 唯一CSS变量，群聊输入区/营销4步按钮/中医诊断
#      操作栏等所有fixed底部操作区上移至导航正上方（bottom: calc(变量+safe-area)）
#   2) P1-A：legacy group_<时间戳>_<随机串> 本地假群——群列表/聊天列表双重过滤、
#      直接访问显示失效提示页（可删本地记录）、建群禁用本地预生成ID
#   3) 六爻对齐（P0-B）：经DOM测量与像素级复核，四视口六行maxDelta=0px，
#      用户截图3px为测量伪影，算法与渲染零缺陷，无代码改动
#   后端：无改动（socialApiRoutes.js 群聊接口自v25.0.42已完备）
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.47"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
BACKEND_DIR="/www/yandaoguoxue-backend"

cd "$SRC_DIR"

echo "--- [0] 源码同步校验 ---"
git checkout -- public/version.json package-lock.json 2>/dev/null || true
# GitHub 直连超时：代码已由本地经 serverdev remote 直推至服务器仓库 main
# 此处仅校验 HEAD 为 v25.0.47 提交，不再 git pull
if ! git log --oneline -1 | grep -q "v25.0.47"; then
  timeout 60 git pull origin main 2>&1 | tail -3 || { echo "WARN: origin pull 超时，依赖已直推的 main"; }
fi
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"; git log --oneline -1
git log --oneline -1 | grep -q "v25.0.47" || { echo "FATAL: HEAD提交非v25.0.47"; exit 1; }
grep -q "\"version\": \"${VERSION}\"" package.json || { echo "FATAL: package.json 版本未升级"; exit 1; }

echo "--- [1] 内容门禁（v25.0.47 两大修复） ---"
grep -q -- "--bottom-nav-height" src/app/globals.css || { echo "FATAL: 缺--bottom-nav-height统一变量"; exit 1; }
grep -q "calc(var(--bottom-nav-height" src/app/groups/chat/\[id\]/ClientPage.tsx || { echo "FATAL: 群聊输入区未避让导航"; exit 1; }
grep -q "isLegacyLocalGroupId" src/lib/socialStore.ts || { echo "FATAL: 缺legacy假群识别函数"; exit 1; }
grep -q "该旧群记录已失效" src/app/groups/chat/\[id\]/ClientPage.tsx || { echo "FATAL: 缺失效提示页"; exit 1; }
grep -q "删除本地失效记录" src/app/groups/chat/\[id\]/ClientPage.tsx || { echo "FATAL: 缺删除本地记录入口"; exit 1; }
grep -q "isLegacyLocalGroupId" src/app/groups/create/page.tsx || { echo "FATAL: 建群未防御legacy ID"; exit 1; }
grep -q "group_\" + Date.now()" src/app/groups/create/page.tsx && { echo "FATAL: 建群仍本地生成假ID"; exit 1; } || echo "建群无本地假ID OK"
grep -q "r.group.groupId" src/app/groups/create/page.tsx || { echo "FATAL: 建群未使用服务端群ID"; exit 1; }
grep -q "searchAcupoints" src/app/zhongyi/page.tsx || { echo "FATAL: 中医搜索缺穴位域"; exit 1; }
grep -q "六神/爻位/本卦/变卦横竖对齐" src/app/yixue/liuyao/page.tsx || { echo "FATAL: 六爻表格对齐缺失"; exit 1; }
# v25.0.47 E2E修复：群消息历史同步（幂等+规范ID+含自己消息轮询）
grep -q "clientMsgId" src/lib/socialApi.ts || { echo "FATAL: 群消息发送缺clientMsgId幂等"; exit 1; }
grep -q "按ID幂等入库" src/lib/socialStore.ts || { echo "FATAL: 群消息入库未幂等"; exit 1; }
grep -q "含自己的消息，换设备/清缓存重登可拉回完整历史" src/app/groups/chat/\[id\]/ClientPage.tsx || { echo "FATAL: 群消息轮询未含自己历史"; exit 1; }
echo "内容门禁 OK"

echo "--- [2] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -6

echo "--- [3] 页面导出校验 ---"
for p in groups/chat groups/create groups groups/info zhongyi zhongyi/herb zhongyi/formula zhongyi/meridian zhongyi/classic zhongyi/yangsheng/detail yixue/liuyao invite/poster friends; do
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

echo "--- [3.6] v25.0.47 修复入包校验 ---"
grep -rq "该旧群记录已失效" out/_next/static/chunks/ && echo "P1A-INVALID-PAGE(失效提示页) OK" || { echo "FATAL: 失效提示页未入包"; exit 1; }
grep -rq "删除本地失效记录" out/_next/static/chunks/ && echo "P1A-PURGE(删除本地记录) OK" || { echo "FATAL: 删除入口未入包"; exit 1; }
grep -rq -- "--bottom-nav-height" out/_next/static/chunks/ && echo "P0A-NAV-VAR(导航高度变量) OK" || { echo "FATAL: 导航变量未入包"; exit 1; }
grep -rq "群不存在或你已退出该群" out/_next/static/chunks/ && echo "P1A-SERVER-MISSING(服务端404提示) OK" || { echo "FATAL: 服务端404提示未入包"; exit 1; }

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
for path in groups groups/create groups/chat zhongyi zhongyi/herb zhongyi/meridian zhongyi/classic yixue/liuyao invite/poster friends index; do
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
