#!/bin/bash
# 搜索引擎爬虫抓取证据（nginx访问日志分析）——CRAWLED维度的直接证据
LOGS="/www/wwwlogs/yandaoguoxue.yandao.vip.log"
ALL=$(ls -la /www/wwwlogs/yandaoguoxue.yandao.vip.log* 2>/dev/null | awk '{print $5, $9}')
echo "可用日志: $ALL"
# 取最近两个日志文件合并分析（当前+轮转）
USE=$(ls -t /www/wwwlogs/yandaoguoxue.yandao.vip.log* 2>/dev/null | head -2 | tr '\n' ' ')
echo "分析对象: $USE"

TODAY1=$(date '+%d/%b/%Y')
echo ""
echo "=== [1] 各引擎爬虫抓取量（日志窗口内总计 + 今日） ==="
for spider in "Baiduspider" "Googlebot" "bingbot" "Sogou web spider" "HaosouSpider" "Bytespider" "YandexBot"; do
  N=$(grep -h "$spider" $USE 2>/dev/null | wc -l)
  T=$(grep -h "$spider" $USE 2>/dev/null | grep -c "$TODAY1")
  echo "$spider: 总计=$N 今日=$T"
done

LOGRANGE=$(head -1 $(ls $USE | head -1) 2>/dev/null | awk '{print $4}')
echo "(日志起始: $LOGRANGE)"

echo ""
echo "=== [2] 今日各爬虫抓取的URL分布 ==="
for spider in "Baiduspider" "bingbot" "Bytespider"; do
  echo "--- $spider 今日 ---"
  grep -h "$spider" $USE 2>/dev/null | grep "$TODAY1" | awk '{print $7}' | sort | uniq -c | sort -rn | head -10
done

echo ""
echo "=== [3] SEO新页是否已被抓取 ==="
FOUND=0
while IFS= read -r u; do
  p=$(echo "$u" | sed 's|https\?://[^/]*||')
  HITS=$(grep -hE "Baiduspider|bingbot|Googlebot|Bytespider|Sogou|Haosou" $USE 2>/dev/null | grep -cF "$p")
  if [ "$HITS" -gt 0 ]; then echo "CRAWLED(${HITS}) $p"; FOUND=$((FOUND+1)); fi
done < /root/seo_new_urls.txt
echo "已抓取新页: $FOUND / 38"

echo ""
echo "=== [4] 重点老页抓取频次（日志窗口） ==="
for p in "/yixue/qizheng/" "/tools/luopan.html" "/tools/liji-ruler.html" "/tools/luban-ruler.html" "/learn/mianfei-zhongyi-tiku.html"; do
  B=$(grep -h "Baiduspider" $USE 2>/dev/null | grep -cF "$p")
  G=$(grep -h "Googlebot" $USE 2>/dev/null | grep -cF "$p")
  BI=$(grep -h "bingbot" $USE 2>/dev/null | grep -cF "$p")
  S=$(grep -h "Sogou\|Haosou" $USE 2>/dev/null | grep -cF "$p")
  BY=$(grep -h "Bytespider" $USE 2>/dev/null | grep -cF "$p")
  echo "$p 百度=$B Google=$G 必应=$BI 搜狗/360=$S 头条=$BY"
done
