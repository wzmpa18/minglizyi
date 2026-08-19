#!/bin/bash
# v25.0.39 注册倪海厦来源（L4 用户明确授权上传）并绑定 30 部专区材料
set -u
API=http://127.0.0.1:3001/api/academy
KEY=$(grep -E '^ADMIN_API_KEY=' /www/yandaoguoxue-backend/.env | head -1 | cut -d= -f2 | tr -d '\r"'"'"' ')

echo "--- [1] 注册来源 ---"
RESP=$(curl -s --max-time 15 -X POST "$API/sources" -H "x-admin-key: $KEY" -H "Content-Type: application/json" \
  -d '{"name":"倪海厦·人纪系列","sourceType":"series","author":"倪海厦","authLevel":4,"licenseNote":"自学中医板块·倪海厦专区专用；仅作学习资料来源标签；国家医考轨道严禁使用"}')
echo "$RESP"
SRC_ID=$(echo "$RESP" | grep -oE '"sourceId":"?[0-9]+' | grep -oE '[0-9]+')
if [ -z "$SRC_ID" ]; then
  echo "尝试查已存在来源"
  SRC_ID=$(curl -s --max-time 15 "$API/sources" -H "x-admin-key: $KEY" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const f=(j.sources||[]).find(x=>x.name==='倪海厦·人纪系列');console.log(f?f.id:'')}catch{console.log('')}})")
fi
echo "来源ID: $SRC_ID"
[ -z "$SRC_ID" ] && { echo "FATAL: 来源注册失败"; exit 1; }

echo "--- [2] 绑定材料 ---"
BOUND=0
for MID in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 31; do
  R=$(curl -s --max-time 15 -X POST "$API/materials/$MID/bind-source" -H "x-admin-key: $KEY" -H "Content-Type: application/json" -d "{\"sourceId\":\"$SRC_ID\"}")
  OK=$(echo "$R" | grep -o '"success":true' | head -1)
  if [ -n "$OK" ]; then BOUND=$((BOUND+1)); else echo "  绑定失败 #$MID: $R"; fi
done
echo "绑定成功: $BOUND / 30"

echo "--- [3] 校验 ---"
sqlite3 /www/yandaoguoxue-backend/data/academy.db \
  "SELECT source_id, COUNT(*) FROM materials WHERE track='zhongyi' AND id IN (1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,31) GROUP BY source_id;"
sqlite3 /www/yandaoguoxue-backend/data/academy.db "SELECT id, name, author, auth_level FROM source_registry;"
