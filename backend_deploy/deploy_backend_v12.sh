#!/bin/bash
# ============================================================================
# v25.0.47_12 后端部署：源码 checkout → 复制 6 个修改文件 → 语法检查 → PM2 重启
# ============================================================================
set -euo pipefail
COMMIT="d333edf"
SRC=/root/yandaoguoxue-source
BACKEND=/www/yandaoguoxue-backend

cd "$SRC"
git checkout -- . 2>/dev/null || true
git reset --hard "$COMMIT"
echo "[1] source at: $(git log --oneline -1)"

FILES="adminUnifiedRoutes.js commissionEngine.js commissionRoutes.js paymentRoutes.js server.js toolAdminRoutes.js"

echo "[2] backup + copy backend files"
TS=$(date +%Y%m%d_%H%M%S)
for f in $FILES; do
  cp "$BACKEND/$f" "$BACKEND/$f.bak_v12_$TS"
  cp "$SRC/backend_deploy/$f" "$BACKEND/$f"
done

echo "[3] syntax check"
for f in $FILES; do
  node --check "$BACKEND/$f" || { echo "SYNTAX FAIL: $f"; exit 1; }
done
echo "    all syntax OK"

echo "[4] pm2 restart"
pm2 restart yandaoguoxue-backend --update-env
sleep 4
pm2 status yandaoguoxue-backend | grep -E "yandaoguoxue-backend|status" || true

echo "[5] health check"
sleep 2
curl -s -o /dev/null -w "health: %{http_code}\n" http://127.0.0.1:3001/api/health || true
curl -s -o /dev/null -w "tool-matrix: %{http_code}\n" http://127.0.0.1:3001/api/public/tool-matrix || true

echo "[6] error log tail"
pm2 logs yandaoguoxue-backend --lines 5 --nostream 2>/dev/null | tail -8 || true

echo "BACKEND-DEPLOY-DONE"
