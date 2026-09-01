#!/bin/bash
cd /www/yandaoguoxue-backend
for k in TENCENT_SES_SECRET_ID TENCENT_SES_SECRET_KEY TENCENT_SES_FROM_EMAIL TENCENT_SES_TEMPLATE_ID; do
  v=$(grep -E "^$k=" .env | cut -d= -f2-)
  [ -n "$v" ] && echo "$k=PRESENT" || echo "$k=MISSING"
done
ls node_modules/tencentcloud-sdk-nodejs-ses >/dev/null 2>&1 && echo SES_SDK=PRESENT || echo SES_SDK=MISSING
echo "===notify 阶段==="
node wechatContentScheduler.js --stage=notify
