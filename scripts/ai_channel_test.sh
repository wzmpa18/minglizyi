#!/bin/bash
# v25.0.20 AI 通道直连诊断（在 /www/yandaoguoxue-backend 运行）
set -uo pipefail
cd /www/yandaoguoxue-backend
KEY=$(grep '^HUNYUAN_API_KEY=' .env | cut -d= -f2- | tr -d '\r')
URL=$(grep '^HUNYUAN_API_URL=' .env | cut -d= -f2- | tr -d '\r')
MODEL=$(grep '^HUNYUAN_MODEL=' .env | cut -d= -f2- | tr -d '\r')
echo "model=${MODEL} url=${URL} keylen=${#KEY}"
echo '--- direct POST ---'
curl -s -o /tmp/ai_test.json -w 'HTTP:%{http_code}\n' -X POST "${URL}" \
  -H 'Content-Type: application/json' -H "Authorization: Bearer ${KEY}" \
  -d "{\"model\":\"${MODEL}\",\"messages\":[{\"role\":\"user\",\"content\":\"回复OK两个字\"}],\"max_tokens\":16}"
head -c 400 /tmp/ai_test.json; echo
echo '--- via /api/ai/chat ---'
curl -s -X POST http://127.0.0.1:3001/api/ai/chat -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"回复OK两个字"}]}' | head -c 300; echo
