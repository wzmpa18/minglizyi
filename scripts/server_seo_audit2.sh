#!/bin/bash
set +e

echo "===== [A] 全部yandao相关日志（含轮转） ====="
ls -la /www/wwwlogs/ 2>/dev/null | grep -iE "yandao" | head -30

echo ""
echo "===== [B] 当前生效的vhost配置 ====="
for c in /www/server/panel/vhost/nginx/yandaoguoxue*.conf /www/server/panel/vhost/nginx/yandao*.conf; do
  [ -f "$c" ] || continue
  # 排除bak文件
  case "$c" in *.bak*) continue;; esac
  echo "--- $c ---"
  grep -E "server_name|access_log|root |proxy_pass|listen" "$c" | head -15
done

echo ""
echo "===== [C] 站点根目录定位 ====="
CONF=$(ls /www/server/panel/vhost/nginx/*.conf 2>/dev/null | grep -i yandao | grep -v bak | head -1)
if [ -n "$CONF" ]; then
  ROOTDIR=$(grep -E "^\s*root\s" "$CONF" | head -1 | awk '{print $2}' | tr -d ';')
  echo "配置: $CONF -> root: $ROOTDIR"
  if [ -n "$ROOTDIR" ] && [ -d "$ROOTDIR" ]; then
    echo "--- 根目录验证文件 ---"
    ls -la "$ROOTDIR" | grep -iE "baidu|google|sogou|verify|shenma|so\.|\.txt$|sitemap" | head -20
    echo "--- robots.txt内容 ---"
    cat "$ROOTDIR/robots.txt" 2>/dev/null | head -15
    echo "--- sitemap检查 ---"
    ls -la "$ROOTDIR"/sitemap*.xml 2>/dev/null
    SM="$ROOTDIR/sitemap.xml"
    if [ -f "$SM" ]; then echo "sitemap URL数: $(grep -c '<loc>' $SM)"; echo "含新集群: $(grep -cE 'zixue|yikao|qizheng-study' $SM)"; fi
  fi
fi

echo ""
echo "===== [D] 日志轮转与大日志文件 ====="
# 找所有大日志（可能主站在别的文件）
ls -laS /www/wwwlogs/*.log 2>/dev/null | head -10

echo ""
echo "===== [E] 用nginx实际access_log重新统计爬虫 ====="
LOGDIR=/www/wwwlogs
# 对每个 yandao 相关日志统计爬虫量
for f in $(ls $LOGDIR/yandao*.log $LOGDIR/www.yandao*.log 2>/dev/null | grep -v admin | grep -v error); do
  B=$(grep -h "Baiduspider" "$f" 2>/dev/null | wc -l)
  G=$(grep -h "Googlebot" "$f" 2>/dev/null | wc -l)
  BI=$(grep -h "bingbot" "$f" 2>/dev/null | wc -l)
  SO=$(grep -h "Sogou" "$f" 2>/dev/null | wc -l)
  H=$(grep -h "HaosouSpider" "$f" 2>/dev/null | wc -l)
  BY=$(grep -h "Bytespider" "$f" 2>/dev/null | wc -l)
  FIRST=$(head -1 "$f" 2>/dev/null | awk '{print $4}')
  LAST=$(tail -1 "$f" 2>/dev/null | awk '{print $4}')
  echo "$f ($FIRST ~ $LAST): 百度=$B Google=$G 必应=$BI 搜狗=$SO 360=$H 头条=$BY"
done

echo ""
echo "===== [F] gz轮转日志中爬虫量 ====="
for f in $(ls -t $LOGDIR/yandao*.gz $LOGDIR/www.yandao*.gz 2>/dev/null | head -4); do
  B=$(zgrep -h "Baiduspider" "$f" 2>/dev/null | wc -l)
  BI=$(zgrep -h "bingbot" "$f" 2>/dev/null | wc -l)
  G=$(zgrep -h "Googlebot" "$f" 2>/dev/null | wc -l)
  echo "$f: 百度=$B Google=$G 必应=$BI"
done
echo "===== 完成 ====="
