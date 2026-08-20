#!/bin/bash
# v25.0.44 后端注销路由部署：上传模块 + patch注册 + 重启 + 验证
set -euo pipefail

cd /www/yandaoguoxue-backend

echo "--- [1] Backup server.js ---"
cp server.js server.js.bak_v25_0_44_account_delete
echo "backup OK"

echo "--- [2] Patch extraRoutes (idempotent) ---"
if grep -q "accountDeleteRoutes" server.js; then
  echo "already patched, skip"
else
  # 在 paymentRoutes 行后插入注销路由注册
  if grep -q "{ file: 'paymentRoutes', path: '/api/payment', name: '支付' }," server.js; then
    sed -i "s|{ file: 'paymentRoutes', path: '/api/payment', name: '支付' },|{ file: 'paymentRoutes', path: '/api/payment', name: '支付' },\n  { file: 'accountDeleteRoutes', path: '/api/account', name: '账号注销' },|" server.js
    echo "patched after paymentRoutes"
  else
    # 兜底：在 extraRoutes 数组结束前插入
    sed -i "s|^];$|  { file: 'accountDeleteRoutes', path: '/api/account', name: '账号注销' },\n];|" server.js
    echo "patched before array end"
  fi
fi

grep -n "accountDeleteRoutes" server.js || { echo "FATAL: patch failed"; exit 1; }

echo "--- [3] Syntax check ---"
node -c "require('./server.js')" 2>/dev/null || node --check server.js || { echo "FATAL: syntax error"; exit 1; }

echo "--- [4] Restart backend ---"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart yandaoguoxue-backend 2>/dev/null || pm2 restart all
  sleep 3
else
  systemctl restart yandaoguoxue-backend 2>/dev/null || systemctl restart yandao-backend 2>/dev/null || { echo "WARN: 未找到进程管理器，尝试默认"; }
  sleep 3
fi

echo "--- [5] Verify route mounted ---"
sleep 2
curl -s -o /dev/null -w "POST /api/account/delete (no auth): %{http_code}\n" -X POST http://127.0.0.1:3001/api/account/delete -H "Content-Type: application/json" -d '{}'
echo "expect 401 = route mounted & JWT enforced"

echo "DEPLOY_DONE"
