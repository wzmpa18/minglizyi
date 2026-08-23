#!/bin/bash
set -e
cd /www/yandaoguoxue-backend
node -e "require('./middleware/auth.js'); console.log('auth.js syntax OK')"
grep -A7 "MEMBER_LEVELS = {" middleware/auth.js | head -8
pm2 restart yandaoguoxue-backend --update-env
sleep 4
pm2 list | grep yandao
curl -sk -o /dev/null -w "backend health: %{http_code}\n" https://yandaoguoxue.yandao.vip/api/public/pricing
