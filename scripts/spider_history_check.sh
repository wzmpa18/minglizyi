#!/bin/bash
# 历史gz日志爬虫核查 + 日志轮转修复
echo "=== [A] 修复nginx日志轮转（fd指向已改名文件） ==="
CUR_SIZE=$(stat -c%s /www/wwwlogs/yandaoguoxue.yandao.vip.log)
OLD_SIZE=$(stat -c%s /www/wwwlogs/yandaoguoxue.yandao.vip.log-20260907)
echo "当前log=${CUR_SIZE}B  悬挂log-20260907=${OLD_SIZE}B"
if [ "$OLD_SIZE" -gt 1000000 ] && [ "$CUR_SIZE" = "0" ]; then
  # 悬挂文件改名保留，让nginx重开新日志
  mv /www/wwwlogs/yandaoguoxue.yandao.vip.log-20260907 /www/wwwlogs/yandaoguoxue.yandao.vip.log-20260907_persists
  nginx -s reopen
  sleep 1
  echo "reopen后当前log: $(stat -c%s /www/wwwlogs/yandaoguoxue.yandao.vip.log)B"
  curl -sk -m 5 -o /dev/null https://yandaoguoxue.yandao.vip/robots.txt
  sleep 1
  echo "访问后当前log: $(stat -c%s /www/wwwlogs/yandaoguoxue.yandao.vip.log)B"
fi

echo ""
echo "=== [B] 历史日志（8月下旬-9月初）重点页爬虫抓取 ==="
for gz in /www/wwwlogs/yandaoguoxue.yandao.vip.log-2026090*.gz; do
  echo "--- $(basename $gz) ---"
  zcat "$gz" 2>/dev/null > /tmp/hist.log
  echo "Baiduspider: $(grep -c Baiduspider /tmp/hist.log)  Googlebot: $(grep -c Googlebot /tmp/hist.log)  bingbot: $(grep -c bingbot /tmp/hist.log)  Bytespider: $(grep -c Bytespider /tmp/hist.log)"
  for p in "/yixue/qizheng/" "/tools/luopan.html" "/tools/liji-ruler.html" "/learn/mianfei-zhongyi-tiku.html"; do
    B=$(grep "Baiduspider" /tmp/hist.log | grep -cF "$p")
    BI=$(grep "bingbot" /tmp/hist.log | grep -cF "$p")
    [ "$B" -gt 0 ] || [ "$BI" -gt 0 ] && echo "  $p 百度=$B 必应=$BI"
  done
done

echo ""
echo "=== [C] 悬挂日志(9/7至今)百度抓取的URL明细 ==="
grep "Baiduspider" /www/wwwlogs/yandaoguoxue.yandao.vip.log-20260907_persists 2>/dev/null | awk '{print $7}' | sort | uniq -c | sort -rn | head -15
