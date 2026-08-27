#!/bin/bash
# ============================================================================
# 言道国学 FINAL-COMMERCIAL-ADMIN-AI-CLEANUP-03 部署脚本
# 将所有修改后的文件部署到服务器并重启
# ============================================================================
set -e

BACKEND_DIR="/www/yandaoguoxue-backend"
FRONTEND_SRC="/root/yandaoguoxue-source"
BACKUP_DIR="/root/backups/cleanup_03_$(date +%Y%m%d_%H%M%S)"

echo "=== 言道国学 COMMERCIAL-CLEANUP-03 部署开始 ==="

# 1. 备份
echo "[1/5] 备份现有文件..."
mkdir -p "$BACKUP_DIR"
cp "$BACKEND_DIR/adminUnifiedRoutes.js" "$BACKUP_DIR/" 2>/dev/null || true
cp "$BACKEND_DIR/server.js" "$BACKUP_DIR/" 2>/dev/null || true
cp "$BACKEND_DIR/paymentRoutes.js" "$BACKUP_DIR/" 2>/dev/null || true

# 2. 部署后端文件
echo "[2/5] 部署后端文件..."
# 从当前目录（backend_deploy）复制到服务器后端目录
DEPLOY_SRC="$(dirname "$0")"
cp "$DEPLOY_SRC/adminUnifiedRoutes.js" "$BACKEND_DIR/adminUnifiedRoutes.js"
cp "$DEPLOY_SRC/server.js" "$BACKEND_DIR/server.js"
cp "$DEPLOY_SRC/paymentRoutes.js" "$BACKEND_DIR/paymentRoutes.js"

# 3. 构建前端
echo "[3/5] 构建前端..."
cd "$FRONTEND_SRC"
npm run build

# 4. 重启服务
echo "[4/5] 重启PM2..."
pm2 reload yandaoguoxue-backend --update-env

# 5. 验证
echo "[5/5] 验证部署..."
sleep 3
curl -s -o /dev/null -w "HTTP状态: %{http_code}\n" https://yandaoguoxue.yandao.vip/
curl -s -o /dev/null -w "后台API: %{http_code}\n" https://yandaoguoxue.yandao.vip/api/admin/unified/overview

echo "=== 部署完成 ==="
echo "备份目录: $BACKUP_DIR"
echo "如需回滚: cp $BACKUP_DIR/* $BACKEND_DIR/ && pm2 reload yandaoguoxue-backend"