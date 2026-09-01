#!/bin/bash
# v25.0.75 全站回归（含v25.0.74核心功能 + 本轮微信入口）
B="https://yandaoguoxue.yandao.vip"
p() { printf "%-42s %s\n" "$1" "$2"; }
for path in "/" "/tools/" "/yixue/qizheng/" "/yixue/compass/" "/yixue/bazi/" "/yixue/liji/" "/yixue/xuankong-feixing/" "/yixue/luban/" "/yixue/phone/" "/yixue/carplate/" "/zhongyi/" "/academy/learn/" "/academy/question-bank/" "/records/" "/membership/" "/download" "/books" "/admin/" "/admin/wechat-oa/"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -L "$B$path")
  p "$path" "$code"
done
echo "=== API ==="
for api in "/api/health" "/api/public/pricing" "/api/public/feature-flags" "/api/public/app-version" "/api/wechat/official/me"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$B$api")
  p "$api" "$code"
done
p "POST /api/auth/records/save(未登录)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$B/api/auth/records/save" -H 'Content-Type: application/json' -d '{}')"
p "GET  /api/wechat/official/callback(坏签名)" "$(curl -s -o /dev/null -w '%{http_code}' "$B/api/wechat/official/callback?signature=x&timestamp=1&nonce=2&echostr=3")"
echo "=== APK ==="
p "latest.apk(前100字节)" "$(curl -s -o /dev/null -w '%{http_code}' -r 0-99 "$B/app-download/latest.apk")"
p "MP_verify文件" "$(curl -s -o /dev/null -w '%{http_code}' "$B/MP_verify_F00k4bgLQnkGgFdx.txt")"
echo "=== PM2/磁盘 ==="
pm2 list | grep yandaoguoxue-backend
df -h / | tail -1 | awk '{print "磁盘使用率: "$5}'
