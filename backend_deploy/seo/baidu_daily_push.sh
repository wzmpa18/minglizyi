#!/bin/bash
# ============================================================================
# 百度普通收录 API 每日自动推送（队列推进制）
#   背景：普通收录 API 每站每日配额 10 条（不可累计），24 URL 分 3 天推完
#   机制：指针文件记录已推进数，每日推 ≤10 条；失败/超额不推进次日自动重试；
#         队列推完后静默退出（cron 常驻无害）
#   部署位（服务器）：/root/backend-auth/scripts/baidu_daily_push.sh
#   token 配置（服务器，勿入仓库）：/root/backend-auth/data/baidu_push.env
#     内容：BAIDU_PUSH_TOKEN=xxxxxxxxxxxxxxxx（从百度搜索资源平台-普通收录-API推送页复制）
#   队列：/root/backend-auth/data/baidu_push_queue.txt（每行一个 URL，新增页面后追加+重置指针）
#   cron：10 9 * * * /bin/bash /root/backend-auth/scripts/baidu_daily_push.sh >> /root/backup/baidu_push.log 2>&1
#   注意：sitemap 提交走平台网页端（sitemap 配额与 API 独立；data.zz.baidu.com/sitemap 旧接口已废弃）
# ============================================================================
ENV="/root/backend-auth/data/baidu_push.env"
QUEUE="/root/backend-auth/data/baidu_push_queue.txt"
POINTER="/root/backend-auth/data/baidu_push_pointer.txt"
SITE="https://yandaoguoxue.yandao.vip"

[ -f "$ENV" ] || { echo "$(date '+%F %T') ENV 不存在，退出"; exit 0; }
source "$ENV"
[ -n "$BAIDU_PUSH_TOKEN" ] || { echo "$(date '+%F %T') token 未配置，退出"; exit 0; }
[ -f "$QUEUE" ] || exit 0

TOTAL=$(grep -c . "$QUEUE")
POS=$(cat "$POINTER" 2>/dev/null || echo 0)
[ "$POS" -ge "$TOTAL" ] && exit 0

BATCH=$(( TOTAL - POS ))
[ "$BATCH" -gt 10 ] && BATCH=10

TMP=$(mktemp)
sed -n "$((POS+1)),$((POS+BATCH))p" "$QUEUE" > "$TMP"
N=$(grep -c . "$TMP")

RESP=$(curl -s -m 30 -H 'Content-Type: text/plain' --data-binary @"$TMP" \
  "http://data.zz.baidu.com/urls?site=${SITE}&token=${BAIDU_PUSH_TOKEN}")
echo "$(date '+%F %T') 第$((POS+1))-$((POS+N))条 共${TOTAL} 推送${N}条 -> ${RESP}"

SUCCESS=$(echo "$RESP" | grep -o '"success":[0-9]*' | grep -o '[0-9]*$')
if [ -n "$SUCCESS" ] && [ "$SUCCESS" -gt 0 ]; then
  echo $(( POS + SUCCESS )) > "$POINTER"
  echo "$(date '+%F %T') 指针推进至 $(( POS + SUCCESS ))/${TOTAL}"
else
  echo "$(date '+%F %T') 本次未成功（超额/失败），指针不动，次日重试"
fi
rm -f "$TMP"
