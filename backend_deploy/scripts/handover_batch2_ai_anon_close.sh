#!/bin/bash
# ============================================================================
# FINAL-HANDOVER-20260826 批次2：AI匿名兼容通道提前关闭（第二十一~二十三章）
# 依据：匿名通道上线以来真实匿名调用=1次(49.251.47.154, 旧WebView UA)；
#       通道仅5次/IP/日且UA可伪造(第二十三章)，提前关闭消除成本与滥用面。
# 变更：/www/yandaoguoxue-backend/.env 增加 AI_ANON_DAILY_LIMIT=0
# 效果：无Token请求一律 401 AI_AUTH_REQUIRED（服务端代码已支持，仅改配置）
# ============================================================================
set -e
set -o pipefail
BE=/www/yandaoguoxue-backend
TS=$(date +%H%M%S)

echo "===== 1. 变更前状态与备份 ====="
grep -c 'AI_ANON_DAILY_LIMIT' $BE/.env || echo "当前无AI_ANON_DAILY_LIMIT(默认5/日)"
cp $BE/.env $BE/.env.bak_anonclose_$TS
echo ".env已备份: .env.bak_anonclose_$TS"

echo ""
echo "===== 2. 写入 AI_ANON_DAILY_LIMIT=0 ====="
if grep -q 'AI_ANON_DAILY_LIMIT' $BE/.env; then
  sed -i 's/^AI_ANON_DAILY_LIMIT=.*/AI_ANON_DAILY_LIMIT=0/' $BE/.env
else
  echo '' >> $BE/.env
  echo '# FINAL-HANDOVER-20260826: 匿名AI通道提前关闭(真实用量=1次/日, UA可伪造不可作安全机制)' >> $BE/.env
  echo 'AI_ANON_DAILY_LIMIT=0' >> $BE/.env
fi
grep 'AI_ANON_DAILY_LIMIT' $BE/.env

echo ""
echo "===== 3. PM2 reload ====="
pm2 reload yandaoguoxue-backend --update-env 2>&1 | tail -1
sleep 2

echo ""
echo "===== 4. 公网验证 ====="
echo "-- 4a. 旧APK WebView UA 无Token（应401 AI_AUTH_REQUIRED）:"
curl -sk -m 15 -X POST https://yandaoguoxue.yandao.vip/api/ai/chat \
  -H 'Content-Type: application/json' \
  -H 'User-Agent: Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.6045.163 Mobile Safari/537.36 wv)' \
  -d '{"messages":[{"role":"user","content":"hi"}]}' \
  -w ' [HTTP=%{http_code}]' | head -c 300; echo ""
echo "-- 4b. 普通浏览器UA 无Token（应401）:"
curl -sk -m 15 -X POST https://yandaoguoxue.yandao.vip/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"hi"}]}' \
  -w ' [HTTP=%{http_code}]' | head -c 300; echo ""
echo "-- 4c. 带Token AI冒烟（测试账号910077, 验证reload后认证路径无回归）:"
TOKEN=$(cd $BE && node -e "require('dotenv').config({path:'.env'}); console.log(require('jsonwebtoken').sign({userId:910077,phone:'19800000099'}, process.env.JWT_SECRET, {expiresIn:'10m'}))")
curl -sk -m 120 -X POST https://yandaoguoxue.yandao.vip/api/ai/chat \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"messages":[{"role":"user","content":"回复OK两个字母即可"}],"stream":false}' \
  | python3 -c "
import json,sys
try:
    d=json.load(sys.stdin)
    c=d.get('content') or (d.get('choices') or [{}])[0].get('message',{}).get('content','')
    print('  认证AI调用: success=' + str(d.get('success', True)) + ' content前30字=' + str(c)[:30] + ('' if c else ' [空内容!]') + ' error=' + str(d.get('error','')))
except Exception as e:
    print('  解析失败:', e)
"
echo "-- 4d. 驾驶舱后端健康:"
KEY=$(grep -oP 'ADMIN_API_KEY=\K.*' $BE/.env | head -1)
curl -sk -m 10 -H "Authorization: Bearer $KEY" https://yandaoguoxue.yandao.vip/api/admin/unified/overview | python3 -c "import json,sys; d=json.load(sys.stdin)['data']; print('  version:', d.get('version'), '| health.ai:', d.get('health',{}).get('ai'), '| health.backup:', d.get('health',{}).get('backup'))"
echo ""
echo "BATCH2_ANON_CLOSE_DONE"
