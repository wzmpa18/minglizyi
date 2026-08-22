#!/bin/bash
echo "=== www.yandao.vip 状态 ==="
curl -s -o /dev/null -w '%{http_code} -> %{url_effective}\n' -L https://www.yandao.vip/
echo "=== APP下载页状态 ==="
curl -s -o /dev/null -w '%{http_code}\n' -L https://yandaoguoxue.yandao.vip/download
echo "=== 下载页APK引用 ==="
curl -s https://yandaoguoxue.yandao.vip/download/ | grep -oE 'href="[^"]*\.apk"' | head -3
curl -s https://yandaoguoxue.yandao.vip/download/ | grep -oE '[a-zA-Z0-9._-]+\.apk' | sort -u | head -5
echo "=== APK文件与MD5 ==="
ls -la /var/www/yandao.vip/app-download/*.apk 2>/dev/null
md5sum /var/www/yandao.vip/app-download/*.apk 2>/dev/null
echo "=== www站点HTML中的APK引用 ==="
grep -roE '[a-zA-Z0-9._-]+\.apk' /var/www/yandao.vip/ --include='*.html' 2>/dev/null | sort -u | head -5
