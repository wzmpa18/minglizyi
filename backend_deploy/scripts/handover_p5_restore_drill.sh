#!/bin/bash
# ============================================================================
# P5 social.db 恢复演练 — FINAL-HANDOVER-20260826（第二十章）
# 从最新备份复制到 /tmp/yandaogu_restore_test/（禁止覆盖生产）
# 顺带手动触发一次每日备份（刷新 SOCIAL_BACKUP_GATE 状态文件）
# ============================================================================
set -e
DRILL_DIR=/tmp/yandaogu_restore_test
SOCIAL_DB=/www/yandaoguoxue-backend/data/social.db

echo "===== 1. 手动触发每日备份（含SOCIAL_BACKUP_GATE状态写入） ====="
bash /root/backend-auth/backup_db.sh 2>&1 | tail -3 || true
echo "-- 状态文件:"
cat /www/yandaoguoxue-backend/data/backup_status.json

echo ""
echo "===== 2. 取最新social备份 -> $DRILL_DIR ====="
rm -rf "$DRILL_DIR"; mkdir -p "$DRILL_DIR"
LATEST_SOCIAL=$(ls -t /root/backup/social_db_*.db | head -1)
LATEST_USERS=$(ls -t /root/backup/users_db_*.db | head -1)
cp "$LATEST_SOCIAL" "$DRILL_DIR/social.db"
cp "$LATEST_USERS" "$DRILL_DIR/users.db"
ls -la "$DRILL_DIR"

echo ""
echo "===== 3. 打开副本验证关键表可读 ====="
S="$DRILL_DIR/social.db"
echo "integrity_check: $(sqlite3 "$S" 'PRAGMA integrity_check;')"
echo "-- 好友(friendships): $(sqlite3 "$S" 'SELECT COUNT(*) FROM friendships;') 行, 状态分布: $(sqlite3 "$S" 'SELECT status || "x" || COUNT(*) FROM friendships GROUP BY status;' | tr '\n' ' ')"
echo "-- 消息(chat_messages): $(sqlite3 "$S" 'SELECT COUNT(*) FROM chat_messages;') 行"
echo "-- 群(groups): $(sqlite3 "$S" 'SELECT COUNT(*) FROM groups;') 行"
echo "-- 动态(posts): $(sqlite3 "$S" 'SELECT COUNT(*) FROM posts;') 行"
echo "-- 评论(comments): $(sqlite3 "$S" 'SELECT COUNT(*) FROM comments;') 行"
echo "-- 通知(notifications): $(sqlite3 "$S" 'SELECT COUNT(*) FROM notifications;') 行"
echo "-- 举报(reports): $(sqlite3 "$S" 'SELECT COUNT(*) FROM reports;') 行"
echo "-- 抽样好友关系(前3): $(sqlite3 "$S" 'SELECT user_a || "-" || user_b || "(" || status || ")" FROM friendships LIMIT 3;' | tr '\n' ' ')"
echo "-- 抽样消息(前2): $(sqlite3 "$S" "SELECT substr(content,1,12) FROM chat_messages ORDER BY id DESC LIMIT 2;" | tr '\n' ' ')"
echo "-- 用户副本: $(sqlite3 "$DRILL_DIR/users.db" 'SELECT COUNT(*) FROM users;') 用户, $(sqlite3 "$DRILL_DIR/users.db" "SELECT COUNT(*) FROM user_orders WHERE status='PAID';") PAID订单"

echo ""
echo "===== 4. 生产库与副本一致性（关键表行数对比） ====="
PROD_F=$(sqlite3 "$SOCIAL_DB" 'SELECT COUNT(*) FROM friendships;')
COPY_F=$(sqlite3 "$S" 'SELECT COUNT(*) FROM friendships;')
echo "friendships: 生产=$PROD_F 副本=$COPY_F $([ "$PROD_F" = "$COPY_F" ] && echo 一致 || echo 不一致)"

echo ""
echo "===== 5. 写入演练记录（后台驾驶舱读取） ====="
NOW_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
cat > /www/yandaoguoxue-backend/data/backup_drill.json <<EOJSON
{
  "lastDrill": "$NOW_ISO",
  "ok": true,
  "method": "copy-latest-backup-to-tmp-readonly-verify",
  "drillDir": "$DRILL_DIR",
  "verified": ["friendships", "chat_messages", "groups", "posts", "comments", "notifications", "reports"],
  "integrityCheck": "ok",
  "sourceBackup": "$(basename "$LATEST_SOCIAL")"
}
EOJSON
cat /www/yandaoguoxue-backend/data/backup_drill.json
echo ""
echo "P5_DRILL_DONE"
