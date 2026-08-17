#!/bin/bash
set -euo pipefail
echo "SRC version.json: $(cat /root/yandaoguoxue-source/public/version.json | tr -d '\n')"
cp /root/yandaoguoxue-source/public/version.json /root/yandaoguoxue/releases/v25.0.25/version.json
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 2
echo "---PUBLIC---"
echo "version.json: $(curl -sk https://yandaoguoxue.yandao.vip/version.json | tr -d '\n')"
for p in "" "yixue/ziwei" "yixue/bazi" "zhongyi" "academy" "discover" "social" "profile" "login"; do
  code=$(curl -skL -o /dev/null -w '%{http_code}' "https://yandaoguoxue.yandao.vip/${p}")
  echo "/${p} -> ${code}"
done
echo "FIX-DONE"
