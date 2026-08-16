#!/bin/bash
# v25.0.20 三板块 API 验证（mint 测试 JWT 调 /api/academy/tracks 与 /categories）
set -uo pipefail
cd /www/yandaoguoxue-backend
SECRET=$(grep '^JWT_SECRET=' .env | cut -d= -f2- | tr -d '\r')
TOKEN=$(node -e "const j=require('jsonwebtoken');console.log(j.sign({userId:'verify_test',nickname:'发布验证'},process.argv[1],{expiresIn:'10m'}))" "$SECRET")
echo '--- /api/academy/tracks ---'
curl -s -H "Authorization: Bearer ${TOKEN}" http://127.0.0.1:3001/api/academy/tracks | head -c 600; echo
echo '--- /api/academy/categories?track=zhongyi ---'
curl -s -H "Authorization: Bearer ${TOKEN}" 'http://127.0.0.1:3001/api/academy/categories?track=zhongyi' | head -c 500; echo
echo '--- /api/academy/materials?mine=1 (imported visibility) ---'
curl -s -H "Authorization: Bearer ${TOKEN}" 'http://127.0.0.1:3001/api/academy/materials?mine=1' | head -c 200; echo
