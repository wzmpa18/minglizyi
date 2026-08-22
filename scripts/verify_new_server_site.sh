#!/bin/bash
echo "=== 本机(82.156.228.87)以www.yandao.vip身份自测 ==="
curl -s --resolve www.yandao.vip:443:127.0.0.1 -o /dev/null -w '官网首页: %{http_code}\n' https://www.yandao.vip/
curl -s --resolve www.yandao.vip:443:127.0.0.1 https://www.yandao.vip/ | grep -oE 'href="[^"]*\.apk"' | sort -u
echo "=== APK直链(本机身份) ==="
curl -s --resolve www.yandao.vip:443:127.0.0.1 -o /dev/null -w '%{http_code}\n' -L --range 0-1023 https://www.yandao.vip/app-download/yandao-guoxue-v25.0.47-release.apk
echo "=== SSL证书 ==="
echo | openssl s_client -connect 127.0.0.1:443 -servername www.yandao.vip 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null
echo "=== DNS现状记录(供用户切换参考) ==="
echo "www.yandao.vip  -> 111.230.155.30 (旧服务器, 无访问权限)"
echo "yandao.vip      -> 111.230.155.30 (旧服务器)"
echo "yandaoguoxue.yandao.vip -> 82.156.228.87 (当前生产)"
