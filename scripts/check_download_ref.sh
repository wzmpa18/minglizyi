#!/bin/bash
echo "=== 下载页HTML关键内容 ==="
curl -s https://yandaoguoxue.yandao.vip/download/ | grep -oE '(app-download|\.apk|下载)[^<>"]{0,80}' | head -10
echo "=== 前端源码download页APK引用 ==="
grep -rn 'app-download\|release\.apk' /root/yandaoguoxue-source/src/app/download/ 2>/dev/null | head -5
echo "=== 前端源码全局APK引用 ==="
grep -rln 'yandao-guoxue-v25' /root/yandaoguoxue-source/src/ 2>/dev/null | head -5
echo "=== nginx app-download配置 ==="
grep -B2 -A3 'app-download' /www/server/nginx/conf/vhost/*.conf 2>/dev/null | head -10
