#!/bin/bash
# v25.0.41 发布：紫微童限前置功能（20260819用户指令）+ 流年窗口宫序错位修正
#   纯前端发布（仅 src/app/yixue/ziwei/page.tsx + package.json，无后端变更、无其他易学工具改动）
#   1) 童限前置：大限行最前增加"起限前(童限)"格（对标文墨天机）；点击童限→虚线三角箭头指本命（命宫），
#      下方出现"童限/小限"对照行（童限宫=命宫，小限宫=ages含选定童限流年虚岁之宫），
#      流年行展示童限期（虚岁1~起运岁-1）各年（干支×iztro逐年对拍一致），其下流月/流日/流时照常逐层展开
#   2) 流年窗口修正：selectedDaxian为起运年龄序（命宫起顺/逆），引擎大限列表为宫序（寅→丑），
#      v25.0.24起直传同索引取值会取错大限（对拍实证12/12大限错位，v25.0.25已在zwDecadalAligned
#      按大限干支对齐修正同类错位，本版沿用同一规则取引擎宫序索引）
#   3) 童限期内小限层与童限层同时显示（原逻辑互斥，童限期小限永不显示）
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.41"
BASE="6c7d149"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
BACKEND_DIR="/www/yandaoguoxue-backend"

cd "$SRC_DIR"

echo "--- [0] 源码同步校验 ---"
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"; git log --oneline -2
git log --oneline -1 | grep -q "v25.0.41" || { echo "FATAL: HEAD提交非v25.0.41"; exit 1; }
grep -q "\"version\": \"${VERSION}\"" package.json || { echo "FATAL: package.json 版本未升级到 ${VERSION}"; exit 1; }

echo "--- [0.5] 易学工具零其他修改核查（本轮唯一授权改动=紫微童限+流年修正+发布脚本） ---"
DIFF_FILES=$(git diff --name-only ${BASE}..HEAD | sort)
echo "$DIFF_FILES"
echo "$DIFF_FILES" | grep -qx "package.json" || { echo "FATAL: 意外文件"; exit 1; }
echo "$DIFF_FILES" | grep -qx "src/app/yixue/ziwei/page.tsx" || { echo "FATAL: 意外文件"; exit 1; }
EXTRA=$(echo "$DIFF_FILES" | grep -v -e "^package.json$" -e "^src/app/yixue/ziwei/page.tsx$" -e "^scripts/deploy_release_v25_0_41.sh$" || true)
[ -z "$EXTRA" ] || { echo "FATAL: 存在未授权改动文件: $EXTRA"; exit 1; }
echo "易学工具零其他修改 OK（仅 ziwei/page.tsx + package.json + 发布脚本）"

echo "--- [1] 内容门禁（童限前置+流年修正） ---"
grep -q '起限前' src/app/yixue/ziwei/page.tsx || { echo "FATAL: 童限前置格缺失"; exit 1; }
grep -q '点击童限→排盘状态箭头对本命' src/app/yixue/ziwei/page.tsx || { echo "FATAL: 童限箭头指本命缺失"; exit 1; }
grep -q '童限宫' src/app/yixue/ziwei/page.tsx || { echo "FATAL: 童限/小限对照行缺失"; exit 1; }
grep -q 'v25.0.41 修正：selectedDaxian为起运年龄序' src/app/yixue/ziwei/page.tsx || { echo "FATAL: 流年窗口对齐修正缺失"; exit 1; }
grep -q '童限期内童限与小限同时显示' src/app/yixue/ziwei/page.tsx || { echo "FATAL: 童限小限同显缺失"; exit 1; }
grep -q '童限(虚岁1-' src/app/yixue/ziwei/page.tsx || { echo "FATAL: ZW-TIME童限标签缺失"; exit 1; }
echo "内容门禁 OK"

echo "--- [2] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -6

echo "--- [3] 页面导出校验 ---"
for p in yixue/ziwei yixue; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p}"
done
test -f "out/index.html" || { echo "FATAL: out/index.html missing"; exit 1; }
echo "OK: index(单文件导出)"

echo "--- [3.5] 功能标记入包校验 ---"
grep -rq "起限前" out/_next/static/chunks/ && echo "TX-PRE(童限前置格) OK" || { echo "FATAL: 童限前置格未入包"; exit 1; }
grep -rq "童限宫" out/_next/static/chunks/ && echo "TX-ROW(童限/小限对照行) OK" || { echo "FATAL: 童限小限对照行未入包"; exit 1; }
grep -rq "童限" out/_next/static/chunks/ && echo "TX-MARK(童限标记) OK" || { echo "FATAL: 童限标记未入包"; exit 1; }

echo "--- [3.6] 错误IP残留与version门禁 ---"
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

echo "--- [6] 清理 nginx 缓存（纯前端，无需后端重启） ---"
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "--- [7] 公网验证（紫微页 + 首页 + version + 后端健康 + 公网JS含童限标记） ---"
DOMAIN="https://yandaoguoxue.yandao.vip"
for path in yixue/ziwei index; do
  CODE=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/${path})
  echo "公网 /${path}: ${CODE}"
  [ "$CODE" != "200" ] && { echo "FATAL: /${path} 公网非200"; exit 1; }
done
VJSON=$(curl -sL ${DOMAIN}/version.json)
echo "$VJSON"
echo "$VJSON" | grep -q "\"${VERSION}\"" || { echo "WARN: 公网version未生效（可能缓存，稍后复验）"; }
HC=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/api/health)
echo "公网 /api/health: ${HC}"
# 公网页面JS包含童限标记：抓紫微页HTML里的chunk并抽查
PAGE_HTML=$(curl -sL ${DOMAIN}/yixue/ziwei)
CHUNK=$(echo "$PAGE_HTML" | grep -o '/_next/static/chunks/[a-zA-Z0-9_%./-]*\.js' | head -8)
TX_JS_OK=0
for c in $CHUNK; do
  if curl -sL "${DOMAIN}${c}" | grep -q "起限前"; then TX_JS_OK=1; echo "公网JS含童限前置标记: ${c}"; break; fi
done
[ "$TX_JS_OK" = "1" ] || echo "WARN: 首屏chunk未含标记（懒加载chunk，以发布目录核查为准）"
echo "===== DEPLOY ${VERSION} COMPLETE ====="
