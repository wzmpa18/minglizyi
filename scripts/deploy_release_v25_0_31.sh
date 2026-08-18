#!/bin/bash
# v25.0.31 发布：P9（推广中心全链路：签名邀请二维码/全注册归因/单层奖励/五类防作弊/首付费钩子 + 首发功能裁剪 + 免责声明补齐）
# 链路：服务器源码同步校验 → 依赖安装(qrcode新增) → 构建门禁 → releases/v25.0.31 → current 软链 → nginx 缓存清理 → 后端双文件热更新(register_routes+paymentRoutes) → env 注入 → pm2 重启
set -e
SRC_DIR="/root/yandaoguoxue-source"
VERSION="v25.0.31"
EXPECT_HEAD="a362ec3"
BUILD_ID="${VERSION}_D20260818"
RELEASE_DIR="/root/yandaoguoxue/releases/${VERSION}"
BACKEND_DIR="/www/yandaoguoxue-backend"

cd "$SRC_DIR"

echo "--- [0] 源码同步校验 ---"
HEAD=$(git rev-parse --short HEAD)
echo "HEAD: ${HEAD}"
[ "$HEAD" != "$EXPECT_HEAD" ] && { echo "FATAL: HEAD ${HEAD} != ${EXPECT_HEAD}"; exit 1; }

echo "--- [1] 安装依赖（新增 qrcode + @types/qrcode，必须完整安装） ---"
npm install --no-audit --no-fund 2>&1 | tail -3
node -e "require('qrcode');console.log('qrcode module OK')" || { echo "FATAL: qrcode 依赖缺失"; exit 1; }

echo "--- [2] 构建（build.sh 静态导出） ---"
bash build.sh 2>&1 | tail -6

echo "--- [3] 页面导出校验（v25.0.31 全量清单：v25.0.28清单 + invite/register/login/promote/download） ---"
for p in invite invite/poster register login profile/promote download academy/yikao academy/my-comments yixue/tarot academy/favorites academy/notes academy/leaderboard academy/learn academy/question-bank academy/wrong-book academy/exam yixue/ziwei yixue/astro yixue/wannianli yixue/qimen membership messages/system profile/consult/provider-apply privacy admin/tools; do
  test -f "out/${p}/index.html" || { echo "FATAL: out/${p}/index.html missing"; exit 1; }
  echo "OK: ${p}"
done

echo "--- [4] 功能标记入包校验 ---"
( grep -q "保存相册" out/invite/index.html || grep -rq "保存相册" out/_next/static/chunks/ ) && echo "INVITE-QR-SAVE(保存相册) OK" || { echo "FATAL: 邀请二维码保存能力缺失"; exit 1; }
( grep -q "系统分享" out/invite/index.html || grep -rq "系统分享" out/_next/static/chunks/ ) && echo "INVITE-QR-SHARE(系统分享) OK" || { echo "FATAL: 邀请系统分享缺失"; exit 1; }
( grep -q "复制链接" out/invite/index.html || grep -rq "复制链接" out/_next/static/chunks/ ) && echo "INVITE-QR-COPY(复制链接) OK" || { echo "FATAL: 邀请复制链接缺失"; exit 1; }
grep -q "内容仅供文化娱乐参考" out/yixue/meihua/index.html && echo "DISCLAIMER-MEIHUA OK" || { echo "FATAL: 梅花页免责声明缺失"; exit 1; }
grep -q "内容仅供文化娱乐参考" out/yixue/bazi/index.html && echo "DISCLAIMER-BAZI OK" || { echo "FATAL: 八字页免责声明缺失"; exit 1; }
grep -q "暂未开放" out/download/index.html && echo "DOWNLOAD-PLACEHOLDER(占位文案规范化) OK"

echo "--- [4.5] 错误IP残留与version门禁 ---"
BAD=$(grep -rl '101.32.191.210' out/ 2>/dev/null | wc -l)
[ "$BAD" -gt 0 ] && { echo "FATAL: $BAD 个文件含错误IP"; exit 1; }
echo "错误IP扫描 OK（0个文件）"
grep -q "\"version\": \"${VERSION}\"" out/version.json || { echo "FATAL: version.json 未升级"; cat out/version.json; exit 1; }
cat out/version.json

echo "--- [5] 发布到 ${RELEASE_DIR} ---"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
cp -r out/* "$RELEASE_DIR/"
cp -r .next "$RELEASE_DIR/" 2>/dev/null || true
cp package.json "$RELEASE_DIR/" 2>/dev/null || true

RELEASE_FILES=$(find "$RELEASE_DIR" -type f | wc -l)
echo "Release file count: ${RELEASE_FILES}"
[ "$RELEASE_FILES" -lt 50 ] && { echo "FATAL: release suspiciously small"; exit 1; }

echo "--- [6] 切换 current 软链 ---"
ln -sfn "$RELEASE_DIR" /root/yandaoguoxue/current
ACTUAL=$(readlink -f /root/yandaoguoxue/current)
echo "current -> ${ACTUAL}"
[ "$ACTUAL" != "$RELEASE_DIR" ] && { echo "FATAL: symlink switch failed"; exit 1; }

echo "--- [7] 清理 nginx 缓存 ---"
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 3

echo "--- [8] 后端热更新（register_routes.js + paymentRoutes.js：邀请归因/防作弊/单层奖励/首付费钩子） ---"
STAMP=$(date +%Y%m%d_%H%M%S)
cp "${BACKEND_DIR}/register_routes.js" "${BACKEND_DIR}/register_routes.js.bak_v25_0_31_${STAMP}"
cp "${BACKEND_DIR}/paymentRoutes.js" "${BACKEND_DIR}/paymentRoutes.js.bak_v25_0_31_${STAMP}"
cp src/lib/backend/register_routes.js "${BACKEND_DIR}/register_routes.js"
cp src/lib/backend/paymentRoutes.js "${BACKEND_DIR}/paymentRoutes.js"
node -e "require('${BACKEND_DIR}/register_routes.js')" 2>/dev/null && echo "register_routes 语法校验 OK" || node --check "${BACKEND_DIR}/register_routes.js" && echo "register_routes 语法校验 OK"
node --check "${BACKEND_DIR}/paymentRoutes.js" && echo "paymentRoutes 语法校验 OK"
grep -q "resolveInviteAttribution" "${BACKEND_DIR}/register_routes.js" && echo "归因函数 OK"
grep -q "SELF_OR_LINKED_DEVICE" "${BACKEND_DIR}/register_routes.js" && echo "防作弊(自邀/关联设备) OK"
grep -q "grantFirstPayReward" "${BACKEND_DIR}/paymentRoutes.js" && echo "首付费奖励钩子 OK"

echo "--- [9] env 注入（INVITE_SIGN_SECRET 签名密钥 + 奖励额度，幂等） ---"
ENV_FILE="${BACKEND_DIR}/.env"
cp "$ENV_FILE" "${ENV_FILE}.bak_v25_0_31_${STAMP}"
grep -q '^INVITE_SIGN_SECRET=' "$ENV_FILE" || echo "INVITE_SIGN_SECRET=$(openssl rand -hex 24)" >> "$ENV_FILE"
grep -q '^INVITE_REWARD_REGISTER=' "$ENV_FILE" || echo "INVITE_REWARD_REGISTER=50" >> "$ENV_FILE"
grep -q '^INVITE_REWARD_FIRST_PAY=' "$ENV_FILE" || echo "INVITE_REWARD_FIRST_PAY=200" >> "$ENV_FILE"
grep -c '^INVITE_' "$ENV_FILE" | xargs -I{} echo "INVITE_* 配置项数量: {}"

echo "--- [10] pm2 重启 + 后端健康检查 ---"
pm2 restart yandaoguoxue-backend 2>/dev/null || pm2 restart all
sleep 3
HEALTH=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/health 2>/dev/null || echo "000")
echo "backend /health: ${HEALTH}"
INVITE_LINK=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/auth/invite/link 2>/dev/null || echo "000")
echo "invite/link 未带token探针(预期401=路由存在+鉴权生效): ${INVITE_LINK}"
POINTS=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/auth/points/transactions 2>/dev/null || echo "000")
echo "points/transactions 未带token探针(预期401): ${POINTS}"

echo "===== DEPLOY ${VERSION} COMPLETE ====="
