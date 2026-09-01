#!/bin/bash
# 公众号内容调度 cron 安装（指令书第七十三章 06:30-07:50 链路；与 SEO 01:00-03:30 错开）
set -e
MARK_BEGIN="# WECHAT-OA-CONTENT v25.0.75 (BEGIN)"
MARK_END="# WECHAT-OA-CONTENT v25.0.75 (END)"
# 幂等：先移除旧块
sed -i "/$MARK_BEGIN/,/$MARK_END/d" /var/spool/cron/crontabs/root 2>/dev/null || true
crontab -l 2>/dev/null | grep -v "wechatContentScheduler" > /tmp/cron_new || true
cat >> /tmp/cron_new <<EOF
$MARK_BEGIN
# 公众号内容自动化（每日；第七十三章；scheduler 自带幂等/重试/成本保护）
40 6 * * * /usr/bin/node /www/yandaoguoxue-backend/wechatContentScheduler.js --stage=topics >> /root/backup/wechat_oa_scheduler.log 2>&1
0 7 * * * /usr/bin/node /www/yandaoguoxue-backend/wechatContentScheduler.js --stage=generate >> /root/backup/wechat_oa_scheduler.log 2>&1
30 7 * * * /usr/bin/node /www/yandaoguoxue-backend/wechatContentScheduler.js --stage=safety >> /root/backup/wechat_oa_scheduler.log 2>&1
50 7 * * * /usr/bin/node /www/yandaoguoxue-backend/wechatContentScheduler.js --stage=notify >> /root/backup/wechat_oa_scheduler.log 2>&1
$MARK_END
EOF
crontab /tmp/cron_new
rm -f /tmp/cron_new
touch /root/backup/wechat_oa_scheduler.log
echo "===CRON INSTALLED==="
crontab -l | grep -A6 "WECHAT-OA-CONTENT"
