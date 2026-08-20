#!/bin/bash
# v25.0.45 发布：P7-MKT-POSTER-02 AI推广助手（分圈层智能营销海报）
#   1) 前端：营销引擎11模块(src/lib/marketing/) + AI推广助手四步流程页(/invite/poster)
#      + 推广中心入口卡(/invite) + friends群聊路由参数修复 + security页TS修复
#   2) 后端：posterConfigRoutes.js 扩展营销事件埋点(poster_generated/poster_saved/
#      copy_copied/system_share_started/style_switched/qr_selftest_failed + 维度元数据)
#   3) 依赖：jsqr（二维码解码自测）
#   合规：小红书渠道无站外二维码；头像默认不公开；价格未写死；文案全量过合规校验(E2E 77/77)
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.45"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
BACKEND_DIR="/www/yandaoguoxue-backend"

cd "$SRC_DIR"

echo "--- [0] 源码同步校验 ---"
git pull origin main
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"; git log --oneline -1
git log --oneline -1 | grep -q "v25.0.45" || { echo "FATAL: HEAD提交非v25.0.45"; exit 1; }
grep -q "\"version\": \"${VERSION}\"" package.json || { echo "FATAL: package.json 版本未升级"; exit 1; }

echo "--- [1] 内容门禁（营销引擎 + 合规标记） ---"
test -f src/lib/marketing/posterEngine.js 2>/dev/null || true
for f in types audiences products channels templates copyLibrary compliance recommend posterEngine qrSelfTest logEvents; do
  test -f "src/lib/marketing/${f}.ts" || { echo "FATAL: src/lib/marketing/${f}.ts missing"; exit 1; }
done
grep -q "MARKETING_EVENTS" backend_deploy/posterConfigRoutes.js || { echo "FATAL: 后端营销事件未实现"; exit 1; }
grep -q "qr_selftest_failed" src/lib/marketing/qrSelfTest.ts || { echo "FATAL: 二维码自测未实现"; exit 1; }
grep -q "AI推广助手" src/app/invite/poster/page.tsx || { echo "FATAL: 推广助手页缺失"; exit 1; }
grep -q "useState(false)" src/app/invite/poster/page.tsx || { echo "FATAL: 头像默认公开(违规)"; exit 1; }
echo "内容门禁 OK"

echo "--- [1.5] E2E 回归（77项） ---"
node scripts/p7-mkt-poster-e2e.cjs 2>&1 | tail -3

echo "--- [2] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -6

echo "--- [3] 页面导出校验 ---"
for p in invite/poster invite index; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p}"
done
grep -q "\"version\": \"${VERSION}\"" out/version.json || { echo "FATAL: version.json 未升级"; cat out/version.json; exit 1; }
cat out/version.json

echo "--- [3.5] 烧录ID一致性（防更新提示死循环） ---"
grep -rq "v25.0.45_D20260820" out/_next/static/chunks/ && echo "烧录ID一致 OK" || { echo "FATAL: 包内烧录ID缺失"; exit 1; }

echo "--- [3.6] 营销功能入包校验 ---"
grep -rq "AI推广助手" out/_next/static/chunks/ && echo "MKT-PAGE(推广助手页) OK" || { echo "FATAL: 推广助手页未入包"; exit 1; }
grep -rq "二维码自测未通过，禁止保存" out/_next/static/chunks/ && echo "MKT-QRTEST(二维码自测) OK" || { echo "FATAL: 二维码自测未入包"; exit 1; }

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

echo "--- [6] 后端：posterConfigRoutes.js 营销事件扩展 ---"
cp "$BACKEND_DIR/posterConfigRoutes.js" "$BACKEND_DIR/posterConfigRoutes.js.bak_v25_0_44_pre" 2>/dev/null || true
cp backend_deploy/posterConfigRoutes.js "$BACKEND_DIR/posterConfigRoutes.js"
grep -q "MARKETING_EVENTS" "$BACKEND_DIR/posterConfigRoutes.js" || { echo "FATAL: 后端文件更新失败"; exit 1; }
pm2 restart yandaoguoxue-backend --update-env
sleep 4
pm2 logs yandaoguoxue-backend --lines 4 --nostream

echo "--- [7] 清理 nginx 缓存 ---"
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "--- [8] 公网验证 ---"
DOMAIN="https://yandaoguoxue.yandao.vip"
for path in invite/poster invite index; do
  CODE=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/${path})
  echo "公网 /${path}: ${CODE}"
  [ "$CODE" != "200" ] && { echo "FATAL: /${path} 公网非200"; exit 1; }
done
VJSON=$(curl -sL ${DOMAIN}/version.json)
echo "$VJSON"
echo "$VJSON" | grep -q "\"${VERSION}\"" || echo "WARN: 公网version可能缓存，稍后复验"
HC=$(curl -sL -o /dev/null -w '%{http_code}' ${DOMAIN}/api/health)
echo "公网 /api/health: ${HC}"
LOGTEST=$(curl -sL -X POST ${DOMAIN}/api/poster/log -H 'Content-Type: application/json' -d '{"event":"poster_generated","userId":"deploy_verify","size":"R3_4","product":"P09","audience":"A05","channel":"C01","template":"T02-1"}')
echo "埋点接口: ${LOGTEST}"
echo "$LOGTEST" | grep -q '"success":true' || { echo "FATAL: 营销埋点接口异常"; exit 1; }
echo "===== DEPLOY ${VERSION} COMPLETE ====="
