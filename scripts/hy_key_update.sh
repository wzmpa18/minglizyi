#!/bin/bash
# v25.0.21: 更新混元密钥为用户确认的新 Key + 重启后端 + 全链路验证
set -uo pipefail
KEY="sk-l4iL8H7Lf2jVoksQQrrNwk8ne7AyzVp559jRSlOHZ8O8FcxG"
ENV_FILE="/www/yandaoguoxue-backend/.env"
BACKUP="${ENV_FILE}.bak_v25_0_21_$(date +%Y%m%d_%H%M%S)"

echo "=== [1] 备份 .env ==="
cp "$ENV_FILE" "$BACKUP" && echo "OK: $BACKUP"

echo "=== [2] 更新 HUNYUAN_API_KEY ==="
if grep -q "^HUNYUAN_API_KEY=" "$ENV_FILE"; then
  sed -i "s|^HUNYUAN_API_KEY=.*|HUNYUAN_API_KEY=${KEY}|" "$ENV_FILE"
else
  echo "HUNYUAN_API_KEY=${KEY}" >> "$ENV_FILE"
fi
grep -c "^HUNYUAN_API_KEY=sk-l4iL8H" "$ENV_FILE" && echo "KEY_UPDATED"

echo "=== [3] 重启后端 pm2 ==="
cd /www/yandaoguoxue-backend && pm2 restart yandaoguoxue-backend --update-env >/dev/null 2>&1
sleep 3
pm2 list | grep -E "yandaoguoxue|name" | head -3

echo "=== [4] 后端健康 ==="
curl -s -o /dev/null -w "api/version: %{http_code}\n" http://127.0.0.1:3001/api/version

echo "=== [5] /api/ai/chat 实测（未登录场景应返回鉴权/额度类业务错误而非 403005） ==="
curl -s --max-time 60 -X POST http://127.0.0.1:3001/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"你好，回复：测试"}]}' | head -c 500
echo ""

echo "=== [6] 学堂 AI 流水线验证（ai_pipeline_verify.sh） ==="
if [ -f /www/yandaoguoxue-backend/scripts/ai_pipeline_verify.sh ]; then
  bash /www/yandaoguoxue-backend/scripts/ai_pipeline_verify.sh 13 2>&1 | tail -30
else
  echo "ai_pipeline_verify.sh 不存在，跳过"
fi
echo "=== DONE ==="
