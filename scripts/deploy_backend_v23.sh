#!/bin/bash
set -e
cd /www/yandaoguoxue-backend
cp academyRoutes.js academyRoutes.js.bak_v25_0_22_pre
cp /root/yandaoguoxue-source/backend_deploy/academyRoutes.js academyRoutes.js
echo "=== VERIFY CHANGE ==="
grep -n "PARSE_MAX_CHUNKS" academyRoutes.js | head -3
echo ""
echo "=== PM2 RESTART ==="
pm2 restart yandaoguoxue-backend --update-env
sleep 4
pm2 logs yandaoguoxue-backend --lines 6 --nostream
echo ""
echo "=== HEALTH ==="
curl -s -o /dev/null -w 'health=%{http_code}\n' http://127.0.0.1:3001/api/health
curl -s -o /dev/null -w 'version=%{http_code}\n' http://127.0.0.1:3001/api/version
echo ""
echo "=== COMMIT CONSISTENCY ==="
cd /root/yandaoguoxue-source && git log --oneline -1
