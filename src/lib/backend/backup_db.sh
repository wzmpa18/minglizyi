#!/bin/bash

# ============================================================================
# 言道国学 - SQLite 数据库每日自动备份脚本
# 
# 功能：
#   1. 全量备份 yandao_users.db 到 /root/backup/ 目录
#   2. 按日期命名，保留最近 30 天备份
#   3. 自动清理超过 30 天的旧备份
#   4. 记录备份操作日志
#   5. 备份后校验数据库完整性
#
# crontab 配置（每日凌晨 2 点执行）：
#   0 2 * * * /root/backend-auth/backup_db.sh >> /root/backup/backup.log 2>&1
#
# 手动执行：
#   bash /root/backend-auth/backup_db.sh
# ============================================================================

set -e

# ==================== 配置 ====================
DB_PATH="/root/backend-auth/data/yandao_users.db"
BACKUP_DIR="/root/backup"
RETENTION_DAYS=30
LOG_FILE="${BACKUP_DIR}/backup.log"
DATE_STR=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/users_db_${DATE_STR}.db"

# ==================== 初始化 ====================
mkdir -p "${BACKUP_DIR}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# ==================== 执行备份 ====================

log "========== 开始数据库备份 =========="

# 检查数据库文件是否存在
if [ ! -f "${DB_PATH}" ]; then
    log "[ERROR] 数据库文件不存在: ${DB_PATH}"
    exit 1
fi

# 检查数据库文件大小
DB_SIZE=$(stat -c %s "${DB_PATH}" 2>/dev/null || stat -f %z "${DB_PATH}" 2>/dev/null || echo "0")
log "数据库文件大小: $(( DB_SIZE / 1024 )) KB"

# 使用 SQLite 的 .backup 命令进行安全备份（在线备份，不阻塞写入）
# 先尝试使用 sqlite3 命令行工具（确保一致性）
if command -v sqlite3 &> /dev/null; then
    log "使用 sqlite3 .backup 命令进行一致性备份..."
    sqlite3 "${DB_PATH}" ".backup '${BACKUP_FILE}'" 2>> "${LOG_FILE}"
    BACKUP_EXIT=$?
    
    if [ ${BACKUP_EXIT} -ne 0 ]; then
        log "[WARN] sqlite3 .backup 失败，回退到文件复制..."
        cp "${DB_PATH}" "${BACKUP_FILE}"
    fi
else
    log "sqlite3 命令不可用，使用文件复制..."
    cp "${DB_PATH}" "${BACKUP_FILE}"
fi

# 验证备份文件
if [ ! -f "${BACKUP_FILE}" ]; then
    log "[ERROR] 备份文件创建失败: ${BACKUP_FILE}"
    exit 1
fi

BACKUP_SIZE=$(stat -c %s "${BACKUP_FILE}" 2>/dev/null || stat -f %z "${BACKUP_FILE}" 2>/dev/null || echo "0")
log "备份文件大小: $(( BACKUP_SIZE / 1024 )) KB"
log "备份文件路径: ${BACKUP_FILE}"

# 校验备份文件完整性（使用 PRAGMA integrity_check）
if command -v sqlite3 &> /dev/null; then
    INTEGRITY_RESULT=$(sqlite3 "${BACKUP_FILE}" "PRAGMA integrity_check;" 2>&1)
    if [ "${INTEGRITY_RESULT}" = "ok" ]; then
        log "[OK] 备份文件完整性校验通过"
    else
        log "[WARN] 备份文件完整性校验异常: ${INTEGRITY_RESULT}"
    fi
else
    log "[INFO] sqlite3 不可用，跳过完整性校验"
fi

# ==================== 清理旧备份 ====================
log "清理超过 ${RETENTION_DAYS} 天的旧备份..."
DELETED_COUNT=0

# 删除超过保留期的备份文件
find "${BACKUP_DIR}" -name "users_db_*.db" -type f -mtime +${RETENTION_DAYS} -delete -print | while read -r file; do
    log "已删除旧备份: ${file}"
done

# 统计当前备份数量
BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "users_db_*.db" -type f | wc -l)
log "当前备份文件数量: ${BACKUP_COUNT}"

# ==================== 同步到异地存储（可选） ====================
# 如果配置了腾讯云 COSCMD 工具，可启用异地备份
if command -v coscmd &> /dev/null; then
    log "检测到 coscmd，开始异地备份..."
    coscmd upload "${BACKUP_FILE}" "/backup/users_db_$(date +%Y%m%d).db" 2>> "${LOG_FILE}" && \
        log "[OK] 异地备份完成" || \
        log "[WARN] 异地备份失败（不影响本地备份）"
else
    log "[INFO] coscmd 未安装，跳过异地备份（建议配置腾讯云 COS 实现异地容灾）"
fi

# ==================== 记录备份摘要 ====================
log "========== 备份完成 =========="
log "备份摘要:"
log "  - 数据库: ${DB_PATH}"
log "  - 备份到: ${BACKUP_FILE}"
log "  - 原始大小: $(( DB_SIZE / 1024 )) KB"
log "  - 备份大小: $(( BACKUP_SIZE / 1024 )) KB"
log "  - 备份总数: ${BACKUP_COUNT}"
log "  - 保留天数: ${RETENTION_DAYS} 天"
log "==================================="

exit 0
