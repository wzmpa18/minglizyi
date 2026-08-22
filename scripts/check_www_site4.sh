#!/bin/bash
echo "=== yandao.vip.conf 完整配置 ==="
cat /www/server/panel/vhost/nginx/yandao.vip.conf | grep -vE '^\s*#|^\s*$' | head -40
echo ""
echo "=== /www/yandao-company/app-download 内容 ==="
ls -la /www/yandao-company/app-download/ 2>/dev/null
echo "=== app.html 的APK引用 ==="
grep -oE '[a-zA-Z0-9._-]+\.apk' /www/yandao-company/app.html 2>/dev/null | sort -u
echo "=== 其他html的APK引用 ==="
grep -roE '[a-zA-Z0-9._-]+\.apk' /www/yandao-company/ 2>/dev/null | sort -u | head -6
