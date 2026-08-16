#!/bin/bash
# v25.0.22 上传格式拦截验证（铸造测试JWT）：PDF/docx/jpg 应拒，txt 应过
BASE="http://127.0.0.1:3001"
cd /www/yandaoguoxue-backend
TOKEN=$(node -e "
require('dotenv').config && require('dotenv').config();
const jwt=require('jsonwebtoken');
const secret=process.env.JWT_SECRET||process.env.AUTH_JWT_SECRET;
console.log(jwt.sign({userId:'100000',nickname:'genesis'},secret,{expiresIn:'10m'}));")
echo "TOKEN_LEN: ${#TOKEN}"
if [ -z "$TOKEN" ]; then echo "TOKEN MINT FAILED"; exit 1; fi

echo '--- [1] PDF should be rejected ---'
curl -s -X POST "$BASE/api/academy/materials" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"格式测试PDF","track":"zhongyi","format":"file","fileName":"test.pdf","fileBase64":"data:application/pdf;base64,JVBERi0xLjQ="}'
echo
echo '--- [2] docx should be rejected ---'
curl -s -X POST "$BASE/api/academy/materials" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"格式测试docx","track":"zhongyi","format":"file","fileName":"notes.docx","fileBase64":"data:application/msword;base64,UEsDBA=="}'
echo
echo '--- [3] jpg should be rejected ---'
curl -s -X POST "$BASE/api/academy/materials" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"格式测试jpg","track":"zhongyi","format":"file","fileName":"pic.jpg","fileBase64":"data:image/jpeg;base64,/9j/4AAQ"}'
echo
echo '--- [4] txt PRIVATE should be accepted ---'
R4=$(curl -s -X POST "$BASE/api/academy/materials" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"格式验证txt-私有","track":"zhongyi","format":"file","fileName":"verify.txt","textContent":"验证用临时资料：阴阳五行测试文本。","visibility":"PRIVATE"}')
echo "$R4"
echo
echo '--- [5] PRIVATE visibility check (should be visible to owner) ---'
curl -s "$BASE/api/academy/materials?mine=1" -H "Authorization: Bearer $TOKEN" | head -c 300
echo
echo '--- [6] cleanup ---'
MID=$(echo "$R4" | grep -oP '"materialId":"\K[0-9]+')
if [ -n "$MID" ]; then
  sqlite3 /www/yandaoguoxue-backend/data/academy.db "DELETE FROM materials WHERE id=$MID;"
  echo "deleted test material #$MID"
fi
