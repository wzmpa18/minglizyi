#!/bin/bash
set -e
cd /root/yandaoguoxue-source
echo "=== PULL ==="
for i in 1 2 3; do git pull origin main && break || sleep 3; done
git log --oneline -1
echo ""
echo "=== BACKEND LAYOUT ==="
ls /www/yandaoguoxue-backend/ | head -20
echo ""
echo "=== FIND ACADEMY ROUTES IN BACKEND ==="
find /www/yandaoguoxue-backend -name "academyRoutes.js" -not -path "*/node_modules/*" 2>/dev/null
