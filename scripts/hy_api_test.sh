#!/bin/bash
# v25.0.21 前置验证：混元 TokenHub API 连通性（从服务器出口 IP 测试）
KEY="sk-l4iL8H7Lf2jVoksQQrrNwk8ne7AyzVp559jRSlOHZ8O8FcxG"
echo "=== [1] 出口公网 IP ==="
curl -s --max-time 8 https://ifconfig.me || curl -s --max-time 8 https://api.ipify.org
echo ""
echo "=== [2] TokenHub chat/completions 实测 ==="
HTTP_CODE=$(curl -s -o /tmp/hy_test.json -w "%{http_code}" --max-time 60 \
  -X POST "https://tokenhub.tencentmaas.com/v1/chat/completions" \
  -H "Authorization: Bearer ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{"model":"hy3","messages":[{"role":"system","content":"You are a helpful assistant."},{"role":"user","content":"你好，请回复：连通测试成功"}],"stream":false}')
echo "HTTP_CODE=${HTTP_CODE}"
echo "--- 响应体 ---"
head -c 1500 /tmp/hy_test.json
echo ""
echo "=== [3] 当前后端 .env 混元配置（脱敏） ==="
grep -E "HUNYUAN|DEEPSEEK|AI_" /www/yandaoguoxue-backend/.env 2>/dev/null | sed 's/\(sk-[a-zA-Z0-9]\{6\}\)[a-zA-Z0-9]*/\1***/g'
echo "=== DONE ==="
