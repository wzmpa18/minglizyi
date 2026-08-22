#!/bin/bash
echo "=== yandao.vip.conf 443块完整配置 ==="
sed -n '/listen 443/,/^}/p' /www/server/panel/vhost/nginx/yandao.vip.conf | grep -vE '^\s*#|^\s*$' | head -30
echo ""
echo "=== 本机文件当前状态 ==="
grep -oE 'href="[^"]*\.apk"' /www/yandao-company/index.html | sort -u
echo ""
echo "=== curl 绕过缓存带时间戳 ==="
curl -s -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' "https://www.yandao.vip/?_t=$(date +%s)" | grep -oE 'href="[^"]*\.apk"' | sort -u
echo ""
echo "=== 响应头检查 ==="
curl -sI "https://www.yandao.vip/?_t=$(date +%s)" | head -12
echo ""
echo "=== 全盘搜索其他站点副本 ==="
find / -maxdepth 4 -name 'index.html' -path '*yandao*' 2>/dev/null | grep -v backup | head -5
find / -maxdepth 4 -name 'guoxue-chuancheng*' -not -path '*/backup/*' 2>/dev/null | head -5
