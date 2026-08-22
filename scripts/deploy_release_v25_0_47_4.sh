#!/bin/bash
# v25.0.47_4 发布：群聊全屏化(导航隐藏)+右上角按钮层级修复+原生打包前置
#   1) 群聊页隐藏底部Tab栏（与私聊一致的全屏聊天体验）——彻底解决
#      "底部导航栏被遮挡/输入栏与导航挤在一起"的用户实测反馈
#   2) 群聊输入栏直接贴底(bottom: env(safe-area-inset-bottom))，
#      根容器paddingBottom同步调整为 80px+安全区（不再叠加导航高度）
#   3) 群聊右上角"群详情"按钮 z-[10001]（盖过BrandHeader z-[10000]遮挡）
#   4) 好友页右上角"+"按钮 z-[10001]（同类遮挡修复）
#   5) 原生打包前置：native-api-patch.js（原生壳API改写）内联入HTML，
#      capacitor移除server.url切内置资源模式，Android/iOS流水线含前端构建
#   后端：无改动
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.47"
RELEASE_DIR="/root/yandaoguoxue/releases/v25.0.47_4"
BACKEND_DIR="/www/yandaoguoxue-backend"

cd "$SRC_DIR"

echo "--- [0] 源码同步校验 ---"
git checkout -- package-lock.json 2>/dev/null || true
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"; git log --oneline -1
grep -q "\"version\": \"${VERSION}\"" package.json || { echo "FATAL: package.json 版本非${VERSION}"; exit 1; }
grep -q "D20260822" public/version.json || { echo "FATAL: version.json 非D20260822批次"; exit 1; }

echo "--- [1] 内容门禁（v25.0.47_4 五项修复） ---"
# 1) 群聊页隐藏底部导航
grep -q 'pathname === "/groups/chat"' src/components/BottomNav.tsx || { echo "FATAL: BottomNav未隐藏群聊页"; exit 1; }
grep -q 'pathname === "/friends/chat"' src/components/BottomNav.tsx || { echo "FATAL: BottomNav私聊隐藏回归"; exit 1; }
# 2) 输入栏直接贴底
grep -q 'bottom: "env(safe-area-inset-bottom, 0px)"' "src/app/groups/chat/[id]/ClientPage.tsx" || { echo "FATAL: 群聊输入栏未贴底"; exit 1; }
grep -q 'paddingBottom: "calc(80px + env(safe-area-inset-bottom' "src/app/groups/chat/[id]/ClientPage.tsx" || { echo "FATAL: 群聊根容器避让公式未更新"; exit 1; }
# 3) 右上角按钮层级
grep -q 'z-\[10001\]' "src/app/groups/chat/[id]/ClientPage.tsx" || { echo "FATAL: 群聊右上角按钮缺z-[10001]"; exit 1; }
# 4) 好友页+按钮层级
grep -q 'z-\[10001\]' src/app/friends/page.tsx || { echo "FATAL: 好友页+按钮缺z-[10001]"; exit 1; }
# 5) 原生API补丁存在且被layout内联
test -f public/native-api-patch.js || { echo "FATAL: 缺native-api-patch.js"; exit 1; }
grep -q 'nativeApiPatchCode' src/app/layout.tsx || { echo "FATAL: layout未内联API补丁"; exit 1; }
echo "内容门禁 OK"

echo "--- [2] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -6

echo "--- [3] 页面导出校验 ---"
for p in groups groups/chat groups/create groups/info zhongyi zhongyi/herb zhongyi/formula zhongyi/meridian zhongyi/classic zhongyi/yangsheng/detail yixue/liuyao invite/poster friends friends/chat; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p}"
done
test -f "out/index.html" || { echo "FATAL: out/index.html missing"; exit 1; }
echo "OK: index(首页)"

echo "--- [3.5] 烧录ID一致性（防更新提示死循环） ---"
BUILD_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('out/version.json','utf8')).buildId)")
echo "buildId: ${BUILD_ID}"
grep -rq "${BUILD_ID}" out/_next/static/chunks/ && echo "烧录ID一致 OK" || { echo "FATAL: 包内烧录ID缺失"; exit 1; }

echo "--- [3.6] v25.0.47_4 修复入包校验 ---"
grep -rq "__nativeApiPatchInstalled" out/index.html && echo "NATIVE-PATCH-INLINE(API补丁内联首页) OK" || { echo "FATAL: API补丁未内联index.html"; exit 1; }
grep -rq "groups/chat" out/_next/static/chunks/ && echo "NAV-HIDE-SOURCE(群聊隐藏导航逻辑) OK" || { echo "FATAL: 导航隐藏逻辑未入包"; exit 1; }
grep -rq "该旧群记录已失效" out/_next/static/chunks/ && echo "P1A-INVALID-PAGE(失效提示页) OK" || { echo "FATAL: 失效提示页未入包"; exit 1; }
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
for path in groups groups/chat groups/create groups/info zhongyi zhongyi/herb zhongyi/meridian zhongyi/classic yixue/liuyao invite/poster friends friends/chat index; do
  CODE=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/${path})
  echo "公网 /${path}: ${CODE}"
  [ "$CODE" != "200" ] && { echo "FATAL: /${path} 公网非200"; exit 1; }
done
VJSON=$(curl -sL ${DOMAIN}/version.json)
echo "$VJSON"
echo "$VJSON" | grep -q "\"${VERSION}\"" || echo "WARN: 公网version可能缓存，稍后复验"
echo "$VJSON" | grep -q "D20260822" || echo "WARN: 公网buildId可能缓存，稍后复验"
HC=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/api/health)
echo "公网 /api/health: ${HC}"
[ "$HC" != "200" ] && { echo "FATAL: 后端健康检查失败"; exit 1; }
echo "===== DEPLOY v25.0.47_4 COMPLETE ====="
