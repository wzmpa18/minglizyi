#!/bin/bash
# v25.0.21: 探测 TokenHub 可用模型名（用户 Key 实测）
set -uo pipefail
KEY=$(grep '^HUNYUAN_API_KEY=' /www/yandaoguoxue-backend/.env | cut -d= -f2)
URL="https://tokenhub.tencentmaas.com/v1/chat/completions"

probe() {
  local m="$1"
  local r
  r=$(curl -s --max-time 25 -X POST "$URL" \
    -H "Authorization: Bearer ${KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"$m\",\"messages\":[{\"role\":\"user\",\"content\":\"回复:OK\"}],\"max_tokens\":20}")
  local verdict
  if echo "$r" | grep -q '"content"'; then
    verdict="OK: $(echo "$r" | grep -o '"content":"[^"]*"' | head -1 | cut -c12-60)"
  else
    verdict="FAIL: $(echo "$r" | grep -o '"code":"[0-9]*"\|error[^,]*' | head -1 | cut -c1-80)"
  fi
  printf '%-28s => %s\n' "$m" "$verdict"
}

for m in hy3 hunyuan-turbos-latest hunyuan-t1-latest hunyuan-large hunyuan-standard hunyuan-lite hunyuan-a13b-latest hunyuan-turbos hunyuan-3 hunyuan3; do
  probe "$m"
done
