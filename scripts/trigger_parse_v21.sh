#!/bin/bash
# v25.0.21: 触发 #31-#38 全部新资料的 AI 全文分段解析
set -uo pipefail
cd /www/yandaoguoxue-backend
KEY=$(grep '^ADMIN_API_KEY=' .env | cut -d= -f2)

for id in 31 32 33 34 35 36 37 38; do
  r=$(curl -s --max-time 30 -X POST "http://127.0.0.1:3001/api/academy/materials/${id}/parse" -H "x-admin-key: ${KEY}")
  echo "material#${id} => ${r}"
done

echo "--- 等待 30s 后查看状态 ---"
sleep 30
sqlite3 data/academy.db "SELECT id, status, substr(parse_note,1,50) FROM materials WHERE id BETWEEN 31 AND 38" 2>/dev/null || node -e "
const D=require('better-sqlite3');const db=new D('data/academy.db');
db.prepare('SELECT id,status,parse_note FROM materials WHERE id BETWEEN 31 AND 38').all()
  .forEach(m=>console.log('#'+m.id, m.status, '|', (m.parse_note||'').slice(0,60)));
"
