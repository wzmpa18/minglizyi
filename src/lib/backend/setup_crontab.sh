#!/bin/bash

# ============================================================================
# 言道国学 - Crontab 定时任务安装脚本
#
# 功能：
#   1. 每日凌晨 2:00 自动备份数据库
#   2. 每日凌晨 3:00 执行数据库一致性校验
#   3. 每周日凌晨 4:00 清理并重建索引（优化性能）
#
# 用法：
#   bash /root/backend-auth/setup_crontab.sh
# ============================================================================

set -e

echo "=========================================="
echo "  言道国学 - 定时任务安装"
echo "=========================================="
echo ""

# 检查 crontab 是否可用
if ! command -v crontab &> /dev/null; then
    echo "[ERROR] crontab 命令不可用，请先安装 cron 服务"
    echo "  Ubuntu/Debian: apt-get install -y cron"
    echo "  CentOS/RHEL:   yum install -y cronie"
    exit 1
fi

# 确保目录存在
mkdir -p /root/backup
mkdir -p /root/backend-auth/data

# 确保脚本有执行权限
chmod +x /root/backend-auth/backup_db.sh 2>/dev/null || true
chmod +x /root/backend-auth/check_db_consistency.js 2>/dev/null || true

# 定义新的 crontab 内容
# 格式：分钟 小时 日 月 周 命令
NEW_CRON="# 言道国学 - 自动化定时任务（由 setup_crontab.sh 生成）
# 每日凌晨 2:00 备份数据库
0 2 * * * /bin/bash /root/backend-auth/backup_db.sh >> /root/backup/backup.log 2>&1
# 每日凌晨 3:00 执行数据库一致性校验
0 3 * * * /usr/bin/node /root/backend-auth/check_db_consistency.js >> /root/backup/consistency.log 2>&1
# 每周日凌晨 4:00 清理并重建索引（优化数据库性能）
0 4 * * 0 /usr/bin/sqlite3 /root/backend-auth/data/yandao_users.db \"VACUUM; REINDEX;\" >> /root/backup/maintenance.log 2>&1
# 言道国学定时任务结束"

# 读取现有 crontab（排除旧的言道任务）
EXISTING_CRON=$(crontab -l 2>/dev/null | grep -v "言道国学" | grep -v "backup_db.sh" | grep -v "check_db_consistency.js" | grep -v "yandao_users.db" || true)

# 合并新旧 crontab
FULL_CRON="${EXISTING_CRON}
${NEW_CRON}"

# 写入 crontab
echo "${FULL_CRON}" | crontab -

echo ""
echo "[OK] 定时任务安装完成"
echo ""
echo "已安装的定时任务："
echo "  1. 每日凌晨 2:00 — 数据库自动备份"
echo "     命令: /bin/bash /root/backend-auth/backup_db.sh"
echo "     日志: /root/backup/backup.log"
echo "     备份目录: /root/backup/"
echo "     保留天数: 30 天"
echo ""
echo "  2. 每日凌晨 3:00 — 数据库一致性校验"
echo "     命令: /usr/bin/node /root/backend-auth/check_db_consistency.js"
echo "     日志: /root/backup/consistency.log"
echo ""
echo "  3. 每周日凌晨 4:00 — 数据库维护（VACUUM + REINDEX）"
echo "     日志: /root/backup/maintenance.log"
echo ""
echo "当前 crontab 列表："
crontab -l
echo ""
echo "=========================================="
echo "  定时任务安装完成"
echo "=========================================="
