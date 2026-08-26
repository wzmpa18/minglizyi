#!/bin/bash
# 言道国学数据库每日备份脚本（FINAL-HANDOVER-20260826 D21 升级版 + D22 academy.db 纳入备份）
# 变更：增加 SOCIAL_BACKUP_GATE——备份完成后写状态文件 backup_status.json（供后台红灯展示）
# D22：academy.db（学习平台：study_progress用户进度81行+13万内容条目）纳入每日备份
# cron: 0 2 * * * /bin/bash /root/backend-auth/backup_db.sh >> /root/backup/backup.log 2>&1

DB="/root/backend-auth/data/yandao_users.db"
SOCIAL_DB="/www/yandaoguoxue-backend/data/social.db"
ACADEMY_DB="/www/yandaoguoxue-backend/data/academy.db"
STATUS_FILE="/www/yandaoguoxue-backend/data/backup_status.json"
BACKUP_DIR="/root/backup"
LOG="/root/backup/backup.log"
RETAIN_DAYS=30
TS=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
echo "[$(date '+%F %T')] ========== 备份开始 ==========" >> "$LOG"

# D21 状态收集
NOW_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
USERS_OK=0; SOCIAL_OK=0; ACADEMY_OK=0
USERS_FILE=""; SOCIAL_FILE=""; ACADEMY_FILE=""

backup_one() {
  local src="$1" prefix="$2"
  if [ ! -f "$src" ]; then
    echo "[$(date '+%F %T')] [ERROR] 数据库不存在: $src" >> "$LOG"
    return 1
  fi
  sqlite3 "$src" "PRAGMA wal_checkpoint(TRUNCATE);" >> "$LOG" 2>&1
  sqlite3 "$src" ".backup '$BACKUP_DIR/${prefix}_$TS.db'" >> "$LOG" 2>&1
  local f="$BACKUP_DIR/${prefix}_$TS.db"
  if [ -s "$f" ]; then
    echo "[$(date '+%F %T')] 备份完成: $f ($(du -h "$f" | cut -f1))" >> "$LOG"
    local chk
    chk=$(sqlite3 "$f" "PRAGMA integrity_check;" 2>&1 | head -1)
    echo "[$(date '+%F %T')] 备份文件校验: $chk" >> "$LOG"
    if [ "$chk" = "ok" ]; then
      echo "$f" > "/tmp/bak_${prefix}_ok"
      return 0
    else
      echo "[$(date '+%F %T')] [ERROR] 备份校验失败($chk)，保留文件待人工检查" >> "$LOG"
      return 1
    fi
  else
    echo "[$(date '+%F %T')] [ERROR] 备份失败：文件未生成或为空 ($src)" >> "$LOG"
    return 1
  fi
}

# 用户库（主库：用户/订单/权益/佣金）
backup_one "$DB" "users_db" && USERS_OK=1 && USERS_FILE=$(cat /tmp/bak_users_db_ok 2>/dev/null)

# 社交库（好友/私聊/群/动态/评论/举报）—— D21 SOCIAL_BACKUP_GATE 核心对象
if [ -f "$SOCIAL_DB" ]; then
  backup_one "$SOCIAL_DB" "social_db" && SOCIAL_OK=1 && SOCIAL_FILE=$(cat /tmp/bak_social_db_ok 2>/dev/null)
else
  echo "[$(date '+%F %T')] [ERROR] social.db不存在！SOCIAL_BACKUP_GATE 红灯" >> "$LOG"
fi

# 学习平台库（study_progress用户进度+13万内容条目）—— D22 备份盲区封口
if [ -f "$ACADEMY_DB" ]; then
  backup_one "$ACADEMY_DB" "academy_db" && ACADEMY_OK=1 && ACADEMY_FILE=$(cat /tmp/bak_academy_db_ok 2>/dev/null)
else
  echo "[$(date '+%F %T')] [ERROR] academy.db不存在！D22 ACADEMY_BACKUP_GATE 红灯" >> "$LOG"
fi
rm -f /tmp/bak_users_db_ok /tmp/bak_social_db_ok /tmp/bak_academy_db_ok

# 保留策略
find "$BACKUP_DIR" -name "users_db_*.db" -mtime +$RETAIN_DAYS -delete
find "$BACKUP_DIR" -name "social_db_*.db" -mtime +$RETAIN_DAYS -delete
find "$BACKUP_DIR" -name "academy_db_*.db" -mtime +$RETAIN_DAYS -delete

# 异地备份（如配置 coscmd）
if command -v coscmd >/dev/null 2>&1; then
  echo "[$(date '+%F %T')] 检测到 coscmd，开始异地备份..." >> "$LOG"
  for f in "$BACKUP_DIR/users_db_$TS.db" "$BACKUP_DIR/social_db_$TS.db" "$BACKUP_DIR/academy_db_$TS.db"; do
    [ -f "$f" ] && coscmd upload "$f" / >> "$LOG" 2>&1 \
      && echo "[$(date '+%F %T')] 异地备份成功: $(basename $f)" >> "$LOG" \
      || echo "[$(date '+%F %T')] [WARN] 异地备份失败: $(basename $f)" >> "$LOG"
  done
fi

# ===== D21 SOCIAL_BACKUP_GATE：写机器可读状态文件（后台红灯数据源） =====
USERS_SIZE=$([ -n "$USERS_FILE" ] && [ -f "$USERS_FILE" ] && stat -c%s "$USERS_FILE" || echo 0)
SOCIAL_SIZE=$([ -n "$SOCIAL_FILE" ] && [ -f "$SOCIAL_FILE" ] && stat -c%s "$SOCIAL_FILE" || echo 0)
ACADEMY_SIZE=$([ -n "$ACADEMY_FILE" ] && [ -f "$ACADEMY_FILE" ] && stat -c%s "$ACADEMY_FILE" || echo 0)
GATE_OK=$([ "$USERS_OK" = "1" ] && [ "$SOCIAL_OK" = "1" ] && [ "$SOCIAL_SIZE" -gt 0 ] && [ "$ACADEMY_OK" = "1" ] && echo true || echo false)
cat > "$STATUS_FILE" <<EOJSON
{
  "lastRun": "$NOW_ISO",
  "gateOk": $GATE_OK,
  "usersDb": { "ok": $USERS_OK, "file": "$(basename "$USERS_FILE" 2>/dev/null)", "size": $USERS_SIZE, "lastSuccess": "$NOW_ISO" },
  "socialDb": { "ok": $SOCIAL_OK, "file": "$(basename "$SOCIAL_FILE" 2>/dev/null)", "size": $SOCIAL_SIZE, "lastSuccess": "$NOW_ISO" },
  "academyDb": { "ok": $ACADEMY_OK, "file": "$(basename "$ACADEMY_FILE" 2>/dev/null)", "size": $ACADEMY_SIZE, "lastSuccess": "$NOW_ISO" },
  "retainDays": $RETAIN_DAYS,
  "offsite": "$([ -f /root/.cos.conf ] && echo configured || echo not_configured)"
}
EOJSON
if [ "$GATE_OK" = "false" ]; then
  echo "[$(date '+%F %T')] [SOCIAL_BACKUP_GATE][RED] 备份门禁失败，状态已写入 $STATUS_FILE" >> "$LOG"
else
  echo "[$(date '+%F %T')] [SOCIAL_BACKUP_GATE][GREEN] 三库备份+校验通过（users+social+academy）" >> "$LOG"
fi
chmod 644 "$STATUS_FILE" 2>/dev/null

echo "[$(date '+%F %T')] ========== 备份完成 ==========" >> "$LOG"
