#!/bin/bash
echo "=== www.yandao.vip 目录 ==="
find /var/www/yandao.vip -maxdepth 2 -name '*.html' | head -5
echo "=== index.html 标题与链接 ==="
grep -oE '<title>[^<]*</title>' /var/www/yandao.vip/index.html 2>/dev/null | head -2
grep -oE 'href="[^"]*"' /var/www/yandao.vip/index.html 2>/dev/null | head -12
echo "=== nginx vhost列表 ==="
ls /www/server/nginx/conf/vhost/ 2>/dev/null
echo "=== www vhost 的 root ==="
grep -l 'yandao.vip' /www/server/nginx/conf/vhost/*.conf 2>/dev/null
grep -E 'server_name|root' /www/server/nginx/conf/vhost/*.conf 2>/dev/null | head -10
