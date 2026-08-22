#!/bin/bash
echo "=== 443块 root/location / 完整内容 ==="
sed -n '/listen 443/,/^}/p' /www/server/panel/vhost/nginx/yandao.vip.conf | grep -nE 'root|location|try_files|index' | head -20
echo ""
echo "=== 各候选index.html的mtime与ETag匹配 ==="
for f in /www/yandao-company/index.html /root/yandaoguoxue-source/www/index.html; do
  echo "--- $f"
  stat -c 'mtime=%y size=%s' "$f" 2>/dev/null
  grep -oE 'href="[^"]*\.apk"' "$f" 2>/dev/null | sort -u | head -4
done
echo ""
echo "=== 目标: mtime=Jul 20 06:52:05 的文件 ==="
find /www /root -maxdepth 4 -name 'index.html' -newermt '2026-07-20 06:51' ! -newermt '2026-07-20 06:53' 2>/dev/null | head -5
