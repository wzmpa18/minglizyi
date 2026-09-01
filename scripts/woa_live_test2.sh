#!/bin/bash
# 修复后复测：验签幂等（同参数两次调用）+ 选题重跑
cd /www/yandaoguoxue-backend
export $(grep -E '^WECHAT_OA_(TOKEN|APP_ID)=' .env | xargs)
TS=1750000000
NONCE=retrytest$(date +%s)
SIG=$(node -e "const c=require('crypto');const t=process.env.WECHAT_OA_TOKEN;console.log(c.createHash('sha1').update([t,'$TS','$NONCE'].sort().join('')).digest('hex'))")
echo "===1. 验签第一次（应回显echostr）==="
curl -s -w " [HTTP %{http_code}]\n" "https://yandaoguoxue.yandao.vip/api/wechat/official/callback?signature=$SIG&timestamp=$TS&nonce=$NONCE&echostr=ECHO_OK_67890"
echo "===2. 验签重试同参数（应再次回显，幂等）==="
curl -s -w " [HTTP %{http_code}]\n" "https://yandaoguoxue.yandao.vip/api/wechat/official/callback?signature=$SIG&timestamp=$TS&nonce=$NONCE&echostr=ECHO_OK_67890"
echo "===3. 验签第三次同参数（幂等）==="
curl -s -w " [HTTP %{http_code}]\n" "https://yandaoguoxue.yandao.vip/api/wechat/official/callback?signature=$SIG&timestamp=$TS&nonce=$NONCE&echostr=ECHO_OK_67890"
echo "===4. 选题重跑（含章节信号）==="
node wechatContentScheduler.js --stage=topics
node -e "const{getDb}=require('./wechatOaDb');const rows=getDb().prepare('SELECT keyword,internal_score,final_score FROM wechat_topic_candidates WHERE run_date=date('now','localtime') ORDER BY final_score DESC').all();console.log(JSON.stringify(rows))"
