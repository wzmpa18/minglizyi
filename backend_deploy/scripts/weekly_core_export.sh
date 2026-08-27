#!/bin/bash
# ============================================================================
# 言道国学 - 每周核心表手动导出脚本
# 用途：每周导出核心用户表、订单表、佣金表到本地，防极端情况
# 建议：每周一 08:00 执行，保留 4 周
# cron: 0 8 * * 1 /bin/bash /root/backend-auth/scripts/weekly_core_export.sh
# ============================================================================
set -euo pipefail

EXPORT_DIR="/root/backup/weekly_exports"
TIMESTAMP=$(date +%Y%m%d_%H%M)
WEEK_DIR="$EXPORT_DIR/export_$TIMESTAMP"
USERS_DB="/root/backend-auth/data/yandao_users.db"
SOCIAL_DB="/www/yandaoguoxue-backend/data/social.db"
ACADEMY_DB="/www/yandaoguoxue-backend/data/academy.db"
LOG_FILE="$EXPORT_DIR/export.log"

mkdir -p "$WEEK_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

log "========== 每周核心表导出开始 =========="

# ---- 用户库核心表 ----
log "导出用户库核心表..."

# users 表（核心用户信息，脱敏：不含密码哈希）
sqlite3 -header -csv "$USERS_DB" \
  "SELECT user_id, phone, nickname, member_level, membership_expiry, invited_by, created_at, status
   FROM users;" > "$WEEK_DIR/users.csv" 2>>"$LOG_FILE"
log "  users.csv: $(wc -l < "$WEEK_DIR/users.csv") 行"

# user_orders 表（订单记录）
sqlite3 -header -csv "$USERS_DB" \
  "SELECT id, user_id, order_no, order_type, amount, status, extra, created_at, paid_at
   FROM user_orders;" > "$WEEK_DIR/user_orders.csv" 2>>"$LOG_FILE"
log "  user_orders.csv: $(wc -l < "$WEEK_DIR/user_orders.csv") 行"

# user_entitlements 表（权益记录）
sqlite3 -header -csv "$USERS_DB" \
  "SELECT id, user_id, entitlement_key, source_order_no, created_at, expire_at
   FROM user_entitlements;" > "$WEEK_DIR/user_entitlements.csv" 2>>"$LOG_FILE"
log "  user_entitlements.csv: $(wc -l < "$WEEK_DIR/user_entitlements.csv") 行"

# commission_records 表（佣金明细）
sqlite3 -header -csv "$USERS_DB" \
  "SELECT * FROM commission_records;" > "$WEEK_DIR/commission_records.csv" 2>>"$LOG_FILE"
log "  commission_records.csv: $(wc -l < "$WEEK_DIR/commission_records.csv") 行"

# commission_accounts 表（佣金账户）
sqlite3 -header -csv "$USERS_DB" \
  "SELECT * FROM commission_accounts;" > "$WEEK_DIR/commission_accounts.csv" 2>>"$LOG_FILE"
log "  commission_accounts.csv: $(wc -l < "$WEEK_DIR/commission_accounts.csv") 行"

# withdrawals 表（提现记录）
sqlite3 -header -csv "$USERS_DB" \
  "SELECT * FROM withdrawals;" > "$WEEK_DIR/withdrawals.csv" 2>>"$LOG_FILE"
log "  withdrawals.csv: $(wc -l < "$WEEK_DIR/withdrawals.csv") 行"

# partners 表（合伙人）
sqlite3 -header -csv "$USERS_DB" \
  "SELECT * FROM partners;" > "$WEEK_DIR/partners.csv" 2>>"$LOG_FILE"
log "  partners.csv: $(wc -l < "$WEEK_DIR/partners.csv") 行"

# partner_order_log 表（合伙人订单）
sqlite3 -header -csv "$USERS_DB" \
  "SELECT * FROM partner_order_log;" > "$WEEK_DIR/partner_order_log.csv" 2>>"$LOG_FILE"
log "  partner_order_log.csv: $(wc -l < "$WEEK_DIR/partner_order_log.csv") 行"

# points_transactions 表（积分流水）
sqlite3 -header -csv "$USERS_DB" \
  "SELECT * FROM points_transactions;" > "$WEEK_DIR/points_transactions.csv" 2>>"$LOG_FILE"
log "  points_transactions.csv: $(wc -l < "$WEEK_DIR/points_transactions.csv") 行"

# ---- 社交库核心表 ----
log "导出社交库核心表..."

sqlite3 -header -csv "$SOCIAL_DB" \
  "SELECT user_a, user_b, created_at FROM friendships;" > "$WEEK_DIR/friendships.csv" 2>>"$LOG_FILE"
log "  friendships.csv: $(wc -l < "$WEEK_DIR/friendships.csv") 行"

sqlite3 -header -csv "$SOCIAL_DB" \
  "SELECT id, name, owner_id, owner_name, created_at, status FROM groups;" > "$WEEK_DIR/groups.csv" 2>>"$LOG_FILE"
log "  groups.csv: $(wc -l < "$WEEK_DIR/groups.csv") 行"

# ---- 学习库核心表 ----
log "导出学习库核心表..."

sqlite3 -header -csv "$ACADEMY_DB" \
  "SELECT * FROM study_progress;" > "$WEEK_DIR/study_progress.csv" 2>>"$LOG_FILE"
log "  study_progress.csv: $(wc -l < "$WEEK_DIR/study_progress.csv") 行"

# ---- 打包 ----
log "打包导出文件..."
cd "$EXPORT_DIR"
tar -czf "export_$TIMESTAMP.tar.gz" "export_$TIMESTAMP/"
rm -rf "$WEEK_DIR"
log "  打包完成: export_$TIMESTAMP.tar.gz ($(du -h "export_$TIMESTAMP.tar.gz" | cut -f1))"

# ---- 清理超过4周的旧导出 ----
log "清理4周前的旧导出..."
find "$EXPORT_DIR" -name "export_*.tar.gz" -mtime +28 -delete 2>>"$LOG_FILE"
DELETED=$(find "$EXPORT_DIR" -name "export_*.tar.gz" -mtime +28 2>/dev/null | wc -l)
log "  已清理 $DELETED 个过期导出"

# ---- 完整性校验 ----
log "校验导出文件完整性..."
tar -tzf "$EXPORT_DIR/export_$TIMESTAMP.tar.gz" | head -5

log "========== 每周核心表导出完成 =========="
log "导出文件: $EXPORT_DIR/export_$TIMESTAMP.tar.gz"
log "建议：下载到本地保存一份（scp root@82.156.228.87:$EXPORT_DIR/export_$TIMESTAMP.tar.gz .）"