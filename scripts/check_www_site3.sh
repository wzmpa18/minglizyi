#!/bin/bash
echo "=== yandao相关nginx配置 ==="
grep -rl 'yandao' /www/server/panel/vhost/nginx/ 2>/dev/null
echo "=== 各配置server_name+root ==="
for f in $(grep -rl 'yandao' /www/server/panel/vhost/nginx/ 2>/dev/null); do
  echo "--- $f"
  grep -E 'server_name|root |location.*app-download|proxy_pass|alias' "$f" | head -8
done
echo "=== /www/yandao-company 内容 ==="
ls /www/yandao-company/ | head -8
grep -oE 'href="[^"]*"|src="[^"]*"' /www/yandao-company/index.html 2>/dev/null | head -10
grep -oE '[a-zA-Z0-9._-]+\.apk' /www/yandao-company/index.html 2>/dev/null | head -3
