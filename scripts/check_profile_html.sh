#!/bin/bash
F=/root/yandaoguoxue/releases/v25.0.19/profile/index.html
echo "--- file size ---"
ls -la "$F"
echo "--- zone markers ---"
grep -o '学习中心\|内容中心\|社区中心\|商业中心\|推广中心\|系统中心\|资产中心\|言道学堂' "$F" | sort | uniq -c
echo "--- sample visible text ---"
sed 's/<script[^>]*>[^<]*<\/script>//g' "$F" | grep -o '>[^<>]\{2,24\}<' | head -20
echo "--- login guard check ---"
grep -o 'PageLoginGuard\|login' "$F" | sort | uniq -c | head -5
