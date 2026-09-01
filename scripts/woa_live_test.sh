#!/bin/bash
# 微信服务号公网端点验证（不打印任何 Secret）
cd /www/yandaoguoxue-backend
export $(grep -E '^WECHAT_OA_(TOKEN|APP_ID)=' .env | xargs)
TS=1750000000
NONCE=livetest$(date +%s)
SIG=$(python3 -c "import hashlib,os;print(hashlib.sha1(''.join(sorted([os.environ['WECHAT_OA_TOKEN'],'$TS','$NONCE']))).encode()).hexdigest())" 2>/dev/null || \
node -e "const c=require('crypto');const t=process.env.WECHAT_OA_TOKEN;console.log(c.createHash('sha1').update([t,'$TS','$NONCE'].sort().join('')).digest('hex'))")

echo "===1. 回调GET验签（正确签名，公网）==="
curl -s -o /dev/null -w "HTTP %{http_code} body=" "https://yandaoguoxue.yandao.vip/api/wechat/official/callback?signature=$SIG&timestamp=$TS&nonce=$NONCE&echostr=ECHO_OK_12345"
curl -s "https://yandaoguoxue.yandao.vip/api/wechat/official/callback?signature=$SIG&timestamp=$TS&nonce=$NONCE&echostr=ECHO_OK_12345"
echo ""
echo "===2. 回调GET验签（错误签名→应403）==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" "https://yandaoguoxue.yandao.vip/api/wechat/official/callback?signature=bad&timestamp=$TS&nonce=$NONCE&echostr=x"
echo "===3. /me 未识别（应 wechat:null）==="
curl -s "https://yandaoguoxue.yandao.vip/api/wechat/official/me"
echo ""
echo "===4. OAuth 非白名单 redirect（应400）==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" "https://yandaoguoxue.yandao.vip/api/wechat/official/oauth/authorize?redirect=https://evil.com/x"
echo "===5. OAuth 白名单 redirect（应302到微信，AppSecret缺失时也先302）==="
curl -s -o /dev/null -w "HTTP %{http_code} -> %{redirect_url}\n" "https://yandaoguoxue.yandao.vip/api/wechat/official/oauth/authorize?redirect=https://yandaoguoxue.yandao.vip/"
echo "===6. 管理接口未授权（应401/403）==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" "https://yandaoguoxue.yandao.vip/api/wechat/official/admin/status"
echo "===7. 选题阶段实跑（幂等）==="
node wechatContentScheduler.js --stage=topics
echo "===8. 选题结果==="
node -e "const{getDb}=require('./wechatOaDb');const rows=getDb().prepare('SELECT topic_id,keyword,cluster,internal_score,content_gap_score,final_score,status FROM wechat_topic_candidates ORDER BY topic_id DESC LIMIT 8').all();console.log(JSON.stringify(rows,null,1))"
echo "===9. AI环境检查（不打印值）==="
for k in HUNYUAN_API_KEY DEEPSEEK_API_KEY OPENAI_API_KEY; do v=$(grep -E "^$k=" .env | cut -d= -f2-); [ -n "$v" ] && echo "$k=PRESENT" || echo "$k=MISSING"; done
