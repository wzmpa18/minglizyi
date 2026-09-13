#!/bin/bash
# 搜索平台验证状态核查（服务器侧证据）
echo "=== [1] 站点根目录验证文件 ==="
ls /root/yandaoguoxue/releases/v25.0.85/ | grep -iE 'sogou|360|toutiao|verify|baidu|google|bing|\.txt$|\.html$' | grep -vE '^(b$|docs$|agreement$)' | head -20
echo ""
echo "=== [2] 公网验证文件可达性 ==="
for f in baidu_verify_codeva-mdfUGkzbxU.html google5ebbc484799c2806.html U447glXVJ3l8Obskdb3h.html 6adb2132052f4657a159f7302971f5c2.txt; do
  CODE=$(curl -sk -m 8 -o /dev/null -w '%{http_code}' "https://yandaoguoxue.yandao.vip/$f")
  echo "$f -> HTTP $CODE"
done
echo ""
echo "=== [3] robots.txt ==="
curl -sk -m 8 "https://yandaoguoxue.yandao.vip/robots.txt" | head -10
echo ""
echo "=== [4] 已知平台备注文件搜索 ==="
grep -rliE 'sogou|zhanzhang\.so\.com' /root/backend-auth/ 2>/dev/null | head -5
ls /root/docs/ 2>/dev/null | head -10
