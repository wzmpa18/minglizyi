#!/bin/bash
nginx -s reload
sleep 1
echo "=== reload后公网验证 ==="
curl -s -H 'Cache-Control: no-cache' "https://www.yandao.vip/?_t=$(date +%s)" | grep -oE 'href="[^"]*\.apk"' | sort -u
curl -sI 'https://www.yandao.vip/' | grep -iE 'last-modified|content-length'
echo "=== APK直链下载验证 ==="
curl -s -o /dev/null -w '%{http_code} %{size_download}bytes\n' -L --range 0-1023 "https://www.yandao.vip/app-download/yandao-guoxue-v25.0.47-release.apk"
echo "=== APP站下载页 ==="
curl -s -o /dev/null -w '%{http_code}\n' -L https://yandaoguoxue.yandao.vip/download
echo "=== 旧APK直链应404 ==="
curl -s -o /dev/null -w '%{http_code}\n' -L "https://www.yandao.vip/app-download/guoxue-chuancheng-v1.0-release.apk"
