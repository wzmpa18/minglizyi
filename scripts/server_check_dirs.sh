#!/bin/bash
echo "=== deploy_scripts ==="
ls /root/deploy_scripts/ 2>/dev/null | head -8
echo "=== cleanup_backup_20260815 ==="
ls /root/cleanup_backup_20260815/ 2>/dev/null | head -8
du -sh /root/cleanup_backup_20260815 2>/dev/null
echo "=== yixue_import ==="
ls /root/yixue_import/ 2>/dev/null | head -5
echo "=== .gradle/.android 大小 ==="
du -sh /root/.gradle /root/.android /root/android-sdk /root/node_modules 2>/dev/null
echo "=== backup dirs ==="
du -sh /root/backup /root/backup_20260815 2>/dev/null
ls /root/backup_20260815/ 2>/dev/null | head -5
echo "=== trae_migration_key 内容类型 ==="
file /root/trae_migration_key 2>/dev/null
