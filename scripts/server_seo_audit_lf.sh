#!/bin/bash
# 服务器端SEO核查：nginx日志路径探测 + 爬虫抓取证据 + 各平台验证文件
set +e

echo "===== [0] nginx日志文件定位 ====="
for d in /www/wwwlogs /var/log/nginx /usr/local/nginx/logs; do
  if [ -d "$d" ]; then ls -la "$d" 2>/dev/null | grep -i "yandao" | head -5; fi
done

# 自动探测日志
CAND=""
for f in /www/wwwlogs/yandaoguoxue.yandao.vip.log /www/wwwlogs/yandaoguoxue.yandao.vip.access.log /var/log/nginx/yandaoguoxue.yandao.vip.access.log /usr/local/nginx/logs/yandaoguoxue.yandao.vip.log; do
  if [ -f "$f" ]; then CAND="$f"; break; fi
done
if [ -z "$CAND" ]; then
  # 全盘找（限制深度避免太慢）
  CAND=$(find /www /var/log /usr/local -maxdepth 4 -name "*yandao*.log" 2>/dev/null | head -1)
fi
echo "选定日志: ${CAND:-未找到}"

if [ -n "$CAND" ]; then
  # 合并轮转日志（当前+最近1个）
  ROT=$(ls -t "${CAND}".* 2>/dev/null | head -1)
  USE="$CAND"
  [ -n "$ROT" ] && USE="$CAND $ROT"
  echo "分析对象: $USE"
  FIRST=$(head -1 $CAND | awk '{print $4}')
  LAST=$(tail -1 $CAND | awk '{print $4}')
  echo "日志时间范围: $FIRST ~ $LAST"

  TODAY1=$(date '+%d/%b/%Y')
  echo ""
  echo "===== [1] 各引擎爬虫抓取量（总计 + 今日$TODAY1） ====="
  for spider in "Baiduspider" "Googlebot" "bingbot" "Sogou web spider" "HaosouSpider" "Bytespider"; do
    N=$(grep -h "$spider" $USE 2>/dev/null | wc -l)
    T=$(grep -h "$spider" $USE 2>/dev/null | grep -c "$TODAY1")
    echo "$spider: 窗口总计=$N 今日=$T"
  done

  echo ""
  echo "===== [2] 今日Baiduspider/bingbot抓取URL TOP ====="
  for spider in "Baiduspider" "bingbot"; do
    echo "--- $spider 今日 ---"
    grep -h "$spider" $USE 2>/dev/null | grep "$TODAY1" | awk '{print $7}' | sort | uniq -c | sort -rn | head -12
  done

  echo ""
  echo "===== [3] SEO新页抓取情况 ====="
  if [ -f /root/seo_new_urls.txt ]; then
    FOUND=0; TOTAL=0
    while IFS= read -r u; do
      [ -z "$u" ] && continue
      TOTAL=$((TOTAL+1))
      p=$(echo "$u" | sed 's|https\?://[^/]*||')
      HITS=$(grep -hE "Baiduspider|bingbot|Googlebot|Bytespider|Sogou|Haosou" $USE 2>/dev/null | grep -cF "$p")
      if [ "$HITS" -gt 0 ]; then echo "CRAWLED(${HITS}) $p"; FOUND=$((FOUND+1)); fi
    done < /root/seo_new_urls.txt
    echo "已抓取新页: $FOUND / $TOTAL"
  else
    echo "/root/seo_new_urls.txt 不存在"
  fi

  echo ""
  echo "===== [4] 重点页面抓取频次 ====="
  for p in "/yixue/qizheng/" "/tools/luopan.html" "/tools/liji-ruler.html" "/tools/luban-ruler.html" "/qizheng-study/" "/zixue/" "/yikao/"; do
    B=$(grep -h "Baiduspider" $USE 2>/dev/null | grep -cF "$p")
    G=$(grep -h "Googlebot" $USE 2>/dev/null | grep -cF "$p")
    BI=$(grep -h "bingbot" $USE 2>/dev/null | grep -cF "$p")
    BY=$(grep -h "Bytespider" $USE 2>/dev/null | grep -cF "$p")
    echo "$p 百度=$B Google=$G 必应=$BI 头条=$BY"
  done
fi

echo ""
echo "===== [5] 各搜索平台验证文件（web根目录） ====="
WEBROOTS="/www/wwwroot/yandaoguoxue.yandao.vip /www/wwwroot/yandaoguoxue.yandao.vip/public /var/www/yandaoguoxue.yandao.vip"
for wr in $WEBROOTS; do
  if [ -d "$wr" ]; then
    echo "--- webroot: $wr ---"
    ls -la "$wr" 2>/dev/null | grep -iE "baidu|google|sogou|so\.|360|verify|verification|shenma|sm_" | head -20
    # 常见验证文件名检查
    for f in baidu_verify_codex.gif google site verification sogou_verification so_verify shenma_verify; do
      find "$wr" -maxdepth 2 -iname "*${f}*" 2>/dev/null | head -3
    done
  fi
done

echo ""
echo "===== [6] sitemap文件与robots ====="
for wr in $WEBROOTS; do
  if [ -d "$wr" ]; then
    SM=$(find "$wr" -maxdepth 3 -name "sitemap*.xml" 2>/dev/null | head -5)
    for s in $SM; do echo "$s ($(wc -l < $s)行, $(grep -c '<loc>' $s)个URL)"; done
    [ -f "$wr/robots.txt" ] && echo "robots.txt: $(head -5 $wr/robots.txt | tr '\n' ' ')"
  fi
done

echo ""
echo "===== [7] nginx配置中的验证相关规则 ====="
NGCONF=$(find /www/server/panel/vhost/nginx /etc/nginx /usr/local/nginx/conf -name "*yandao*" 2>/dev/null | head -3)
for c in $NGCONF; do
  echo "--- $c ---"
  grep -iE "verify|baidu|google|sitemap|robots|location.*\.(txt|gif|html|xml)" "$c" 2>/dev/null | head -10
done
echo "===== 完成 ====="
