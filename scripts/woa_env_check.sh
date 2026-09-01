#!/bin/bash
# 检查 .env 中 WECHAT_OA 配置项（只显示长度，不泄露值）
awk -F= '/^WECHAT_OA/ {
  key=$1
  val=substr($0, length($1)+2)
  if (length(val)>0) printf "%-28s SET(len=%d)\n", key, length(val)
  else printf "%-28s MISSING\n", key
}' /www/yandaoguoxue-backend/.env
echo '---幂等修复---'
grep -c 'INSERT OR IGNORE' /www/yandaoguoxue-backend/wechatOfficialAccountRoutes.js
echo '---scheduler日志---'
tail -5 /root/backup/wechat_oa_scheduler.log 2>/dev/null || echo '(调度器尚未运行过)'
