#!/bin/bash
echo "=== MATERIALS STATUS ==="
sqlite3 -header -column /www/yandaoguoxue-backend/data/academy.db \
  "SELECT id, track, COALESCE(category,'') AS cat, title, visibility, status, uploader
   FROM materials ORDER BY id DESC LIMIT 40;"
echo ""
echo "=== KP COUNT BY CATEGORY ==="
sqlite3 -header -column /www/yandaoguoxue-backend/data/academy.db \
  "SELECT track, COALESCE(category,'(none)') AS cat, status, count(*) AS kp
   FROM knowledge_points GROUP BY track, category, status ORDER BY track, cat;"
echo ""
echo "=== AI CALL LOG (last 24h summary) ==="
sqlite3 -header -column /www/yandaoguoxue-backend/data/academy.db \
  "SELECT purpose, count(*) AS calls, sum(tokens_used) AS tokens
   FROM ai_call_logs GROUP BY purpose ORDER BY purpose;"
