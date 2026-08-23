#!/bin/bash
KEY=$(grep ADMIN_API_KEY /www/yandaoguoxue-backend/.env | cut -d= -f2)
printf "payment-status: "
curl -s -m 6 -w " [HTTP %{http_code}]" -H "Authorization: Bearer $KEY" "http://127.0.0.1:3001/api/admin/unified/payment-status" | head -c 200
echo
echo "=== poster-config路由挂载 ==="
grep -n "poster-config\|share-config" /www/yandaoguoxue-backend/server.js | head -6
echo "=== posterConfigRoutes.js 前60行 ==="
head -60 /www/yandaoguoxue-backend/posterConfigRoutes.js
