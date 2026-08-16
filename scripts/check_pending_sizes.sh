#!/bin/bash
echo "=== PENDING MATERIAL SIZES (chars) ==="
sqlite3 -header -column /www/yandaoguoxue-backend/data/academy.db \
  "SELECT id, category, title, length(text_content) AS chars
   FROM materials WHERE status='pending' ORDER BY id;"
echo ""
echo "=== ADMIN KEY ENV ==="
pm2 show yandaoguoxue-backend 2>/dev/null | grep -E 'ADMIN|KEY' | head -5
grep -E 'ADMIN' /www/yandaoguoxue-backend/.env 2>/dev/null | sed 's/=.*/=<set>/'
echo ""
echo "=== API HEALTH ==="
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/health || true
