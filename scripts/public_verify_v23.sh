#!/bin/bash
echo "=== SERVER GIT SYNC (ff59e44) ==="
cd /root/yandaoguoxue-source
for i in 1 2 3; do git pull origin main -q && break || sleep 3; done
git log --oneline -1
echo ""
echo "=== PUBLIC VERIFY (yandaoguoxue.yandao.vip) ==="
curl -s -o /dev/null -w '首页=%{http_code}\n' https://yandaoguoxue.yandao.vip/
curl -s -o /dev/null -w '学堂=%{http_code}\n' https://yandaoguoxue.yandao.vip/academy
curl -s -o /dev/null -w '健康=%{http_code}\n' https://yandaoguoxue.yandao.vip/api/health
curl -s https://yandaoguoxue.yandao.vip/version.json | head -1
echo ""
echo "=== PUBLIC QUESTIONS COUNT (via public API, admin view) ==="
KEY=$(grep -E '^ADMIN_API_KEY=' /www/yandaoguoxue-backend/.env | head -1 | cut -d= -f2 | tr -d '\r"'"'"' ')
sqlite3 /www/yandaoguoxue-backend/data/academy.db \
  "SELECT category, count(*) AS pending_q FROM questions WHERE status='pending' GROUP BY category ORDER BY pending_q DESC;
   SELECT 'TOTAL_KP', count(*) FROM knowledge_points WHERE status='approved';
   SELECT 'TOTAL_Q', count(*) FROM questions;"
echo ""
echo "=== PM2 STATUS ==="
pm2 list | grep yandao | head -2
