#!/bin/bash
echo "=== index.html APK链接上下文 ==="
grep -n -B1 -A1 'guoxue-chuancheng' /www/yandao-company/index.html | head -20
echo ""
echo "=== app.html APK链接上下文 ==="
grep -n 'guoxue-chuancheng\|yandao-xuewaiyu' /www/yandao-company/app.html | head -10
echo ""
echo "=== app-pages/guoxue.html APK上下文 ==="
grep -n -B1 -A1 'guoxue.apk' /www/yandao-company/app-pages/guoxue.html | head -10
echo ""
echo "=== app-pages/ 目录 ==="
ls /www/yandao-company/app-pages/
