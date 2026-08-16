#!/bin/bash
echo "=== MATERIALS SCHEMA ==="
sqlite3 /www/yandaoguoxue-backend/data/academy.db ".schema materials" | head -30
echo ""
echo "=== AI_CALL_LOGS SCHEMA ==="
sqlite3 /www/yandaoguoxue-backend/data/academy.db ".schema ai_call_logs" | head -20
echo ""
echo "=== MATERIALS LIST ==="
sqlite3 -header -column /www/yandaoguoxue-backend/data/academy.db \
  "SELECT id, track, category, title, status FROM materials ORDER BY id;"
