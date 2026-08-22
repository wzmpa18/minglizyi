#!/bin/bash
echo "=== /var/www/yandao.vip 结构 ==="
ls -la /var/www/yandao.vip/ | head -10
echo "=== find html 全深度 ==="
find /var/www/yandao.vip -name '*.html' 2>/dev/null | head -5
echo "=== nginx 配置文件位置 ==="
nginx -t 2>&1 | head -2
find /etc/nginx /www/server -name '*.conf' -path '*vhost*' 2>/dev/null | head -5
echo "=== nginx.conf include ==="
grep -E 'include|root' /etc/nginx/nginx.conf 2>/dev/null | head -8
echo "=== yandao相关server配置 ==="
grep -rl 'yandao' /etc/nginx/ 2>/dev/null | head -5
