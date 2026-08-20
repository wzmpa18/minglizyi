#!/bin/bash
# ============================================================================
# FINAL-RC-02: 服务端平台功能开关部署
# 1. 安装 platformFeatureGate.js（由本地 scp 上传到 /www/yandaoguoxue-backend/）
# 2. 幂等 patch server.js：在所有业务路由之前注册中间件
# 3. pm2 重启 + 公网验证（iOS 支付拦截 403 / web 不受影响）
# ============================================================================
set -euo pipefail
BACKEND="/www/yandaoguoxue-backend"
PM2_NAME="yandaoguoxue-backend"

cd "$BACKEND"

echo "[1] 检查 platformFeatureGate.js"
test -f platformFeatureGate.js || { echo "FATAL: platformFeatureGate.js 未上传"; exit 1; }
node -e "require('./platformFeatureGate.js'); console.log('module syntax OK')"

echo "[2] 幂等 patch server.js"
if grep -q "platformFeatureGate" server.js; then
  echo "server.js 已注册 platformFeatureGate，跳过 patch"
else
  cp server.js "server.js.bak.$(date +%Y%m%d%H%M%S)"
  node <<'EOF'
const fs = require("fs");
let s = fs.readFileSync("server.js", "utf8");
if (s.includes("platformFeatureGate")) {
  console.log("ALREADY_PATCHED");
  process.exit(0);
}
const reqAnchor = 'const { authMiddleware';
if (!s.includes(reqAnchor)) { console.error("FATAL: require 锚点未找到"); process.exit(1); }
s = s.replace(
  reqAnchor,
  'const { createPlatformFeatureGate } = require("./platformFeatureGate");\n\n' + reqAnchor
);
const routeAnchor = '// ==================== 认证路由 ====================';
if (!s.includes(routeAnchor)) { console.error("FATAL: 路由锚点未找到"); process.exit(1); }
s = s.replace(
  routeAnchor,
  '// FINAL-RC-02: 平台功能开关（服务端强制执行 PLATFORM_FEATURE_MATRIX，必须先于所有业务路由）\n' +
  'app.use(createPlatformFeatureGate());\n\n' + routeAnchor
);
fs.writeFileSync("server.js", s, "utf8");
console.log("PATCHED");
EOF
  node -c server.js 2>/dev/null || node --check server.js
  echo "server.js 语法检查通过"
fi

echo "[3] pm2 重启"
pm2 restart "$PM2_NAME" --update-env
sleep 3
pm2 status "$PM2_NAME" | head -10

echo "[4] 公网验证"
BASE="http://127.0.0.1:3001"
echo "--- iOS 平台头 → 支付创建应 403 ---"
curl -s -o /dev/null -w "payment/create(ios): %{http_code}\n" \
  -X POST "$BASE/api/payment/create" \
  -H "Content-Type: application/json" -H "X-Client-Platform: ios" \
  -d '{"userId":"probe","type":"MEMBERSHIP","amount":0.01}'
echo "--- iOS UA 标记 → 支付创建应 403 ---"
curl -s -o /dev/null -w "payment/create(ios-ua): %{http_code}\n" \
  -X POST "$BASE/api/payment/create" \
  -H "Content-Type: application/json" \
  -A "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 YandaoGuoxueIOS" \
  -d '{"userId":"probe","type":"MEMBERSHIP","amount":0.01}'
echo "--- web（无平台头）→ 不应 403 ---"
curl -s -o /dev/null -w "payment/create(web): %{http_code}\n" \
  -X POST "$BASE/api/payment/create" \
  -H "Content-Type: application/json" \
  -d '{"userId":"probe","type":"MEMBERSHIP","amount":0.01}'
echo "--- android → 不应 403 ---"
curl -s -o /dev/null -w "payment/create(android): %{http_code}\n" \
  -X POST "$BASE/api/payment/create" \
  -H "Content-Type: application/json" -H "X-Client-Platform: android" \
  -d '{"userId":"probe","type":"MEMBERSHIP","amount":0.01}'
echo "--- 健康检查 ---"
curl -s "$BASE/api/health" | head -c 200
echo ""
echo "--- 403 响应体抽查 ---"
curl -s -X POST "$BASE/api/payment/create" \
  -H "Content-Type: application/json" -H "X-Client-Platform: ios" \
  -d '{"userId":"probe","type":"MEMBERSHIP","amount":0.01}' | head -c 300
echo ""
echo "PLATFORM-GATE-DEPLOY-DONE"
