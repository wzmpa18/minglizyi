#!/bin/bash
set +e

echo "===== [G] www.yandao.vip.log 中Googlebot请求的Host归属 ====="
# nginx默认日志格式无Host字段，用guoxue_log格式可能含host；先看日志格式定义
NGX=$(grep -rE "guoxue_log" /www/server/nginx/conf/nginx.conf /www/server/panel/vhost/nginx/*.conf 2>/dev/null | grep log_format | head -2)
echo "日志格式定义: $NGX"

echo "--- Googlebot抓取的URL样例(www.yandao.vip.log) ---"
grep -h "Googlebot" /www/wwwlogs/www.yandao.vip.log 2>/dev/null | awk '{print $7}' | sort | uniq -c | sort -rn | head -15

echo ""
echo "===== [H] _persists大日志爬虫统计 ====="
P=/www/wwwlogs/yandaoguoxue.yandao.vip.log-20260907_persists
if [ -f "$P" ]; then
  FIRST=$(head -1 "$P" | awk '{print $4}')
  LAST=$(tail -1 "$P" | awk '{print $4}')
  echo "时间范围: $FIRST ~ $LAST"
  for spider in "Baiduspider" "Googlebot" "bingbot" "Sogou" "HaosouSpider" "Bytespider"; do
    N=$(grep -c "$spider" "$P" 2>/dev/null)
    echo "$spider: $N"
  done
  echo "--- Googlebot抓取URL TOP ---"
  grep -h "Googlebot" "$P" | awk '{print $7}' | sort | uniq -c | sort -rn | head -15
  echo "--- Baiduspider抓取URL ---"
  grep -h "Baiduspider" "$P" | awk '{print $7}' | sort | uniq -c | sort -rn | head -10
fi

echo ""
echo "===== [I] 38个SEO新页抓取核查（全部日志） ====="
PERS=/www/wwwlogs/yandaoguoxue.yandao.vip.log-20260907_persists
CUR=/www/wwwlogs/yandaoguoxue.yandao.vip.log
WWWW=/www/wwwlogs/www.yandao.vip.log
FOUND=0; TOTAL=0
while IFS= read -r u; do
  [ -z "$u" ] && continue
  TOTAL=$((TOTAL+1))
  p=$(echo "$u" | sed 's|https\?://[^/]*||')
  H1=$(grep -hE "Googlebot|bingbot|Baiduspider|Bytespider" "$PERS" 2>/dev/null | grep -cF "$p")
  H2=$(grep -hE "Googlebot|bingbot|Baiduspider|Bytespider" "$CUR" "$WWWW" 2>/dev/null | grep -cF "$p")
  H=$((H1+H2))
  if [ "$H" -gt 0 ]; then echo "CRAWLED($H) $p"; FOUND=$((FOUND+1)); fi
done < /root/seo_new_urls.txt
echo "被爬虫抓取的新页: $FOUND / $TOTAL"

echo ""
echo "===== [J] 百度推送能力检查 ====="
echo "--- 推送脚本 ---"
ls -la /root/seo_push* /root/*push* 2>/dev/null | head -5
echo "--- 百度token配置 ---"
grep -rE "baidu|token" /root/seo_push_38.sh 2>/dev/null | head -5
cat /root/seo_new_urls.txt 2>/dev/null | head -5
echo "--- 检查是否有历史百度推送日志 ---"
ls -la /root/*.log /tmp/*push* /tmp/*baidu* 2>/dev/null | head -5

echo ""
echo "===== [K] 主域名yandao.vip的百度验证文件 ====="
ls -la /www/yandao-verify/ 2>/dev/null | head -10
echo "--- 验证文件内容 ---"
cat /www/yandao-verify/baidu_verify_codeva-JdVUh0FlbC.html 2>/dev/null | head -3
cat /root/yandaoguoxue/verify/baidu_verify_codeva-mdfUGkzbxU.html 2>/dev/null | head -3
echo "===== 完成 ====="
