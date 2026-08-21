#!/bin/bash
# fc9: 服务器备份恢复验证 + logrotate 配置
set -euo pipefail

echo "=== [1] 安装 logrotate 配置 ==="
cat > /etc/logrotate.d/yandao-guoxue <<'CONF'
/www/wwwlogs/yandaoguoxue.yandao.vip.log
/www/wwwlogs/yandaoguoxue.yandao.vip.error.log
{
    daily
    rotate 14
    missingok
    notifempty
    compress
    delaycompress
    dateext
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 "$(cat /var/run/nginx.pid)" 2>/dev/null || true
    endscript
}

/root/.pm2/logs/yandaoguoxue-backend-out.log
/root/.pm2/logs/yandaoguoxue-backend-error.log
{
    daily
    rotate 14
    maxsize 50M
    missingok
    notifempty
    compress
    delaycompress
    dateext
    copytruncate
}
CONF
echo "OK /etc/logrotate.d/yandao-guoxue"

echo "=== [2] logrotate 语法验证 ==="
logrotate -d /etc/logrotate.d/yandao-guoxue 2>&1 | grep -E 'error|considering|log needs' | head -6 || true
logrotate -f /etc/logrotate.d/yandao-guoxue 2>&1 || true
echo "强制轮转执行完成"

echo "=== [3] 备份文件清单与完整性 ==="
LATEST_DB=$(ls -t /root/backup/users_db_*.db | head -1)
echo "最新DB备份: $LATEST_DB ($(du -h "$LATEST_DB" | cut -f1))"
echo "备份完整性检查:"
sqlite3 "$LATEST_DB" "PRAGMA integrity_check;" 2>/dev/null || echo "(sqlite3 CLI 不可用，跳过)"
echo "关键表记录数:"
for t in users clients; do
  N=$(sqlite3 "$LATEST_DB" "SELECT COUNT(*) FROM $t;" 2>/dev/null || echo "N/A")
  echo "  $t: $N"
done

echo "=== [4] 备份恢复演练（到临时库，不动生产） ==="
RESTORE_TEST=/tmp/restore_test_$$.db
cp "$LATEST_DB" "$RESTORE_TEST"
CHECK=$(sqlite3 "$RESTORE_TEST" "PRAGMA integrity_check;" 2>/dev/null || echo "unknown")
USERS=$(sqlite3 "$RESTORE_TEST" "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "N/A")
echo "恢复演练: integrity=$CHECK users=$USERS"
rm -f "$RESTORE_TEST"
echo "（恢复演练仅验证备份可打开可查询，未触碰生产库）"

echo "=== [5] 备份 cron 任务确认 ==="
crontab -l | grep -E 'backup_db|check_db' | head -3

echo "=== [6] PostgreSQL 数据库备份检查 ==="
if command -v pg_dump >/dev/null 2>&1; then
  PGTEST=/tmp/pg_backup_test_$$.dump
  if PGPASSWORD=yandao pg_dump -h 127.0.0.1 -U yandao -d yandaoguoxue -f "$PGTEST" 2>/dev/null; then
    echo "pg_dump 演练成功: $(du -h "$PGTEST" | cut -f1)"
    rm -f "$PGTEST"
  else
    echo "pg_dump 失败（密码认证），检查 pgsql_bak 目录"
    ls -lt /www/backup/pgsql_bak/ 2>/dev/null | head -4
  fi
else
  echo "pg_dump 不可用"
fi

echo "FC9-DONE"
