#!/bin/bash
# 言道APP P0启动脚本
cd /var/www/yandao/web
# 备份现有版本（如果存在）
if [ -d ".next" ]; then
    tar -czf ../backup_p0_before_.tar.gz .
fi
# 启动Node服务（端口3000）
NODE_ENV=production nohup node server.js > app.log 2>&1 &
echo "Server started on port 3000"
echo "PID: $!"
