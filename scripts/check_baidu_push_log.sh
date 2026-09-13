#!/bin/bash
set +e
echo "===== 百度推送日志（今日） ====="
grep "2026-09-13" /root/backup/baidu_push.log 2>/dev/null | tail -20
echo ""
echo "===== 指针状态 ====="
for f in /root/backend-auth/data/baidu_push_ptr_*; do
  [ -f "$f" ] && echo "$f = $(cat $f)"
done
echo ""
echo "===== 今日成功推送统计 ====="
grep "2026-09-13" /root/backup/baidu_push.log 2>/dev/null | grep -oE "success([0-9]+)" | head -5
grep "2026-09-13" /root/backup/baidu_push.log 2>/dev/null | grep -E "推送10条 ->" | grep -v "error" | head -10
echo ""
echo "===== IndexNow key文件验证 ====="
curl -sk -m 10 "https://yandaoguoxue.yandao.vip/6adb2132052f4657a159f7302971f5c2.txt" | head -2
echo ""
echo "===== 微信cron最终状态复查 ====="
crontab -l 2>/dev/null | grep -iE "wechat|weixin|content" | head -6
