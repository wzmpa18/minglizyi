#!/bin/bash
echo "=== 磁盘总量 ==="
df -h / | tail -1
echo "=== /root 大目录 ==="
du -sh /root/* 2>/dev/null | sort -rh | head -15
echo "=== releases 明细 ==="
du -sh /root/yandaoguoxue/releases/* 2>/dev/null | sort -rh | head -20
echo "=== pm2 logs ==="
du -sh /root/.pm2/logs/ 2>/dev/null
ls -la /root/.pm2/logs/ 2>/dev/null | head -8
echo "=== /www ==="
du -sh /www/* 2>/dev/null | sort -rh | head -8
echo "=== app-download ==="
du -sh /var/www/yandao.vip/app-download/ 2>/dev/null
ls -la /var/www/yandao.vip/app-download/ 2>/dev/null | head -10
echo "=== /root 散落脚本 ==="
ls -la /root/*.sh /root/*.js /root/*.sql 2>/dev/null | head -20
echo "=== /tmp ==="
du -sh /tmp 2>/dev/null
