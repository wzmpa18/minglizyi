#!/bin/bash
# ============================================================================
# IndexNow 主动推送（必应/Yandex/Seznam/Naver 系免登录协议）
# 密钥文件已部署：
#   yandaoguoxue.yandao.vip → https://yandaoguoxue.yandao.vip/6adb2132052f4657a159f7302971f5c2.txt
#   www.yandao.vip          → https://www.yandao.vip/7f9989ce602348f4bb3bb968879a640f.txt
# 用法（服务器或本地任一可访问公网的机器）：
#   bash indexnow_push.sh yandaoguoxue.yandao.vip 6adb2132052f4657a159f7302971f5c2 baidu_urls_guoxue.txt
#   bash indexnow_push.sh www.yandao.vip 7f9989ce602348f4bb3bb968879a640f baidu_urls_main.txt
# 返回 200=已接受 202=已受理(密钥文件待抓取) 4xx=失败
# ============================================================================
set -e
HOST="$1"; KEY="$2"; URLS="$3"
[ -z "$HOST" ] || [ -z "$KEY" ] && { echo "用法: bash indexnow_push.sh <host> <key> <urls文件>"; exit 1; }
[ -f "$URLS" ] || { echo "FATAL: urls 文件不存在: $URLS"; exit 1; }

JSON=$(node -e "
const fs=require('fs');
const urls=fs.readFileSync('$URLS','utf8').split('\n').map(s=>s.trim()).filter(Boolean);
console.log(JSON.stringify({host:'$HOST',key:'$KEY',keyLocation:'https://$HOST/$KEY.txt',urlList:urls}));
")
echo "--- 推送 $(grep -c . "$URLS") 个 URL ($HOST) ---"
CODE=$(curl -s -o /tmp/indexnow_resp.txt -w '%{http_code}' -m 30 -H 'Content-Type: application/json; charset=utf-8' --data-binary "$JSON" 'https://api.indexnow.org/IndexNow')
echo "IndexNow HTTP: $CODE"
cat /tmp/indexnow_resp.txt 2>/dev/null; echo
case "$CODE" in
  200|202) echo "PUSH OK" ;;
  *) echo "PUSH FAIL"; exit 1 ;;
esac
