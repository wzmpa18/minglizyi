#!/bin/bash
# ===========================================================================
# 支付-权益每日自动对账（FIX-V30-PAY-CARE 防再发机制）
# 逻辑：查 PAID 但 benefit_delivered=0 且支付已超10分钟的"沉默漏发"订单
#   - MEMBERSHIP：按金额映射档位自动补交付（37=monthly/99=quarterly/374=yearly/3600=lifetime）
#     续费顺延口径与后端 deliverOrderBenefits 完全一致
#   - SINGLE_UNLOCK：权益由前端解锁标记管理，直接补标 benefit_delivered=1
#   - 其他类型：仅告警人工处理
# 每次执行写日志 /root/backup/payment_reconcile.log；漏发写 payment_audit_alerts.log
# 部署位置：服务器 /root/backend-auth/scripts/payment_reconcile.sh
# cron: 30 3 * * * /root/backend-auth/scripts/payment_reconcile.sh
# ===========================================================================
DB=/root/backend-auth/data/yandao_users.db
LOG=/root/backup/payment_reconcile.log
ALERT=/root/backup/payment_audit_alerts.log
TS=$(date '+%Y-%m-%d %H:%M:%S')
LOCK=/tmp/payment_reconcile.lock

[ -f "$LOCK" ] && exit 0
trap "rm -f $LOCK" EXIT
touch "$LOCK"

mkdir -p /root/backup
echo "[$TS] 对账开始" >> "$LOG"

# 沉默漏发：PAID + 未发放 + 支付超10分钟
ROWS=$(sqlite3 "$DB" "SELECT id||'|'||user_id||'|'||order_no||'|'||amount||'|'||order_type FROM user_orders WHERE status='PAID' AND benefit_delivered=0 AND paid_at IS NOT NULL AND paid_at < datetime('now','-10 minutes')")

if [ -z "$ROWS" ]; then
  echo "[$TS] 对账完成：无漏发订单" >> "$LOG"
  exit 0
fi

NOW_ISO=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
echo "[$TS] 发现疑似漏发订单，开始自动补交付：" >> "$ALERT"
echo "$ROWS" >> "$ALERT"

while IFS='|' read -r OID UID ONO AMT OTYPE; do
  [ -z "$ONO" ] && continue
  echo "[$TS] 处理: id=$OID user=$UID order=$ONO amount=$AMT type=$OTYPE" >> "$ALERT"
  if [ "$OTYPE" = "MEMBERSHIP" ]; then
    LEVEL=""
    DAYS=0
    case "$AMT" in
      37)  LEVEL="monthly";   DAYS=30 ;;
      99)  LEVEL="quarterly"; DAYS=90 ;;
      374) LEVEL="yearly";    DAYS=365 ;;
      3600) LEVEL="lifetime"; DAYS=-1 ;;
    esac
    if [ -z "$LEVEL" ]; then
      echo "[$TS] 金额$AMT无法映射档位，跳过待人工: $ONO" >> "$ALERT"
      continue
    fi
    EXPIRE=""
    if [ "$DAYS" -gt 0 ]; then
      BASE=$(date +%s)
      CUR=$(sqlite3 "$DB" "SELECT membership_expiry FROM users WHERE user_id=$UID")
      if [ -n "$CUR" ]; then
        CUR_TS=$(date -d "$CUR" +%s 2>/dev/null || echo 0)
        [ "$CUR_TS" -gt "$BASE" ] && BASE=$CUR_TS
      fi
      EXPIRE=$(date -u -d "@$((BASE + DAYS*86400))" +%Y-%m-%dT%H:%M:%S.000Z)
    fi
    sqlite3 "$DB" <<SQL
BEGIN;
UPDATE users SET member_level='$LEVEL', membership_expiry=${EXPIRE:+CASE WHEN '$LEVEL'!='lifetime' THEN '$EXPIRE' ELSE membership_expiry END}, updated_at=CURRENT_TIMESTAMP WHERE user_id=$UID;
UPDATE user_assets SET member_level='$LEVEL', updated_at=CURRENT_TIMESTAMP WHERE user_id=$UID;
UPDATE user_orders SET benefit_delivered=1 WHERE id=$OID;
INSERT INTO operation_logs (user_id, action, detail, ip, created_at) VALUES ($UID, 'reconcile_auto_deliver', '对账自动补交付会员$LEVEL($AMT元,订单$ONO)', '127.0.0.1', '$NOW_ISO');
COMMIT;
SQL
    echo "[$TS] 已补交付: $ONO -> $LEVEL 至 ${EXPIRE:-永久}" >> "$ALERT"
  elif [ "$OTYPE" = "SINGLE_UNLOCK" ]; then
    sqlite3 "$DB" <<SQL
BEGIN;
UPDATE user_orders SET benefit_delivered=1 WHERE id=$OID;
INSERT INTO operation_logs (user_id, action, detail, ip, created_at) VALUES ($UID, 'reconcile_auto_deliver', '对账补标记单次解锁交付($ONO)', '127.0.0.1', '$NOW_ISO');
COMMIT;
SQL
    echo "[$TS] 已补标记单次解锁: $ONO" >> "$ALERT"
  else
    echo "[$TS] 未知类型$OTYPE待人工: $ONO" >> "$ALERT"
  fi
done <<< "$ROWS"

echo "[$TS] 对账完成" >> "$LOG"
