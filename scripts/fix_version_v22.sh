#!/bin/bash
set -e
cd /root/yandaoguoxue-source
node scripts/gen-version.js
cp public/version.json /root/yandaoguoxue/releases/v25.0.22/version.json
cp public/version.json out/version.json
rm -rf /www/server/nginx/cache/* 2>/dev/null || true
nginx -s reload 2>/dev/null || true
sleep 2
echo '=== PUBLIC VERIFY ==='
BASE="https://yandaoguoxue.yandao.vip"
echo "VERSION: $(curl -sk $BASE/version.json)"
for p in "" academy academy/orgs academy/factory admin/loc profile; do
  code=$(curl -sk -o /dev/null -w "%{http_code}" "$BASE/${p}")
  echo "PAGE ${p:-home}: ${code}"
done
echo "ICP_COUNT: $(curl -sk $BASE/ | grep -c '粤ICP备2026071165号-4A')"
echo "current -> $(readlink -f /root/yandaoguoxue/current)"
echo "server_commit: $(git rev-parse --short HEAD)"
