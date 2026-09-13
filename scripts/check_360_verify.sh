#!/bin/bash
set +e
echo "--- 360验证文件公网可达性 ---"
curl -sk -m 10 -o /dev/null -w "HTTP %{http_code}\n" "https://yandaoguoxue.yandao.vip/2b182eaee5332741a935744ac88e76bf.txt"
echo "--- 内容 ---"
curl -sk -m 10 "https://yandaoguoxue.yandao.vip/2b182eaee5332741a935744ac88e76bf.txt" | head -2
echo ""
echo "--- nginx完整location规则 ---"
grep -E "location" /www/server/panel/vhost/nginx/yandaoguoxue.vip.conf | head -25
echo ""
echo "--- web root是否有该文件 ---"
ls -la /root/yandaoguoxue/current/2b182eaee5332741a935744ac88e76bf.txt 2>/dev/null || echo "(web root无此文件)"
ls /root/yandaoguoxue/current/*.txt 2>/dev/null | head -5
