#!/bin/bash
REL=/root/yandaoguoxue/releases/v25.0.60
echo '--- 新构建JS chunk中的AI健康特征文案 ---'
FOUND=0
for kw in '当前模型' '连续失败' '空内容次数' '超60s'; do
  hit=$(grep -rl "$kw" $REL/_next/static/chunks/ 2>/dev/null | head -1)
  if [ -n "$hit" ]; then echo "PASS: '$kw' 在 $(basename $hit)"; FOUND=1; else echo "FAIL: '$kw' 未找到"; fi
done
echo ''
echo '--- 旧构建(部署前)对照 ---'
OLD=$(ls -d /root/yandaoguoxue/releases/v25.0.60_pre_adminhealth_* | head -1)
for kw in '连续失败' '空内容次数'; do
  hit=$(grep -rl "$kw" $OLD/_next/static/chunks/ 2>/dev/null | head -1)
  [ -n "$hit" ] && echo "旧包含: '$kw'" || echo "旧包不含: '$kw' (符合预期——新功能)"
done
echo ''
echo '--- 公网admin页引用的chunk与最新构建一致 ---'
curl -sk https://yandaoguoxue.yandao.vip/admin/ | grep -oE '/_next/static/chunks/[a-z0-9_-]+\.js' | sort -u | head -4
