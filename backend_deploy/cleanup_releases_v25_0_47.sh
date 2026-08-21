#!/bin/bash
# 服务器垃圾清理：旧 release 版本目录（保留最近5版+当前）
set -euo pipefail
cd /root/yandaoguoxue/releases
BEFORE=$(du -sh . | cut -f1)

KEEP="v25.0.45 v25.0.46 v25.0.47 v25.0.47_2 v25.0.47_3"
REMOVED=0
for d in v25.0.*; do
  KEEPIT=0
  for k in $KEEP; do
    [ "$d" = "$k" ] && KEEPIT=1
  done
  if [ $KEEPIT -eq 0 ]; then
    rm -rf "$d"
    REMOVED=$((REMOVED+1))
  fi
done

# 过期热修复备份目录（对应版本已被 v25.0.47_3 取代并公网验证）
rm -rf .v25.0.44_backup_103254 .v25.0.47_pre_kickfix_bak v25.0.47_kickfix

AFTER=$(du -sh . | cut -f1)
echo "清理前: $BEFORE → 清理后: $AFTER（删除 $REMOVED 个旧版本目录 + 2 个备份目录 + 1 个 kickfix）"
echo "--- 保留版本 ---"
ls -d v25.0.*
echo "--- current指向 ---"
readlink -f /root/yandaoguoxue/current
echo "--- 公网验证 ---"
printf 'home=%s ' "$(curl -sk -o /dev/null -w '%{http_code}' https://yandaoguoxue.yandao.vip/)"
printf 'meihua=%s ' "$(curl -sk -o /dev/null -w '%{http_code}' https://yandaoguoxue.yandao.vip/yixue/meihua)"
printf 'discover=%s ' "$(curl -sk -o /dev/null -w '%{http_code}' https://yandaoguoxue.yandao.vip/discover)"
printf 'api=%s\n' "$(curl -sk -o /dev/null -w '%{http_code}' 'https://yandaoguoxue.yandao.vip/api/news/public?page=1')"
echo "--- 磁盘 ---"
df -h / | tail -1
echo "CLEANUP-DONE"
