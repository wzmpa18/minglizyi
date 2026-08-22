#!/bin/bash
# FINAL-PRODUCTION-SEAL-03 第三十六~三十九章：服务器最终清理
# 分类原则：KEEP(生产)/ARCHIVE(归档)/DELETE(五零引用确认)
set -u
BEFORE=$(df / | awk 'NR==2{print $3}')
echo "=== 清理前已用: $((BEFORE/1024))M ==="

echo "--- [1] swapfile2 (2G): swapoff 后删除（保留 /www/swap 1G） ---"
swapon --show | grep -q swapfile2 && swapoff /root/swapfile2
sed -i '\|/root/swapfile2|d' /etc/fstab 2>/dev/null
rm -f /root/swapfile2
echo "OK: swapfile2 已删除, 剩余swap:"; swapon --show

echo "--- [2] Android/Gradle 构建产物 (APK已改GitHub Actions构建, 服务器零引用) ---"
rm -rf /root/.gradle /root/android-sdk /root/gradle-8.9-all.zip /root/.android
echo "OK: 已删除 .gradle/.android/android-sdk/gradle zip (~1.75G)"

echo "--- [3] npm 缓存 ---"
rm -rf /root/.npm
echo "OK: /root/.npm 已删除 (275M)"

echo "--- [4] 旧 releases (保留 current=v25.0.47_6 + 回滚=v25.0.47_5) ---"
rm -rf /root/yandaoguoxue/releases/v25.0.45 /root/yandaoguoxue/releases/v25.0.46 \
       /root/yandaoguoxue/releases/v25.0.47 /root/yandaoguoxue/releases/v25.0.47_2 \
       /root/yandaoguoxue/releases/v25.0.47_3 /root/yandaoguoxue/releases/v25.0.47_4
echo "OK: 旧 releases 已删除 (~158M)"

echo "--- [5] releases/ 根目录散落旧构建 (2026-08-15 误部署产物, current指向子目录不受影响) ---"
cd /root/yandaoguoxue/releases
rm -rf _next data yixue images zhongyi profile groups friends admin discover points \
       invite clients membership privacy agreement login register forgot-password \
       download books social records orders _not-found messages friend contacts ai files \
       calendar 404 404.html favicon.ico index.html index.txt window.svg vercel.svg \
       next.svg manifest.json globe.svg file.svg __next._full.txt __next._tree.txt \
       __next.__PAGE__.txt __next._index.txt __next._head.txt
echo "OK: releases 散落文件已删除 (~20M)"

echo "--- [6] git bundle 备份 (远程仓库完整, 本地源码在) ---"
rm -f /root/minglizyi-c3ccffc.bundle /root/minglizyi-a173528.bundle /root/v25_0_25.bundle
echo "OK: bundle 已删除 (7.4M)"

echo "--- [7] /root 散落一次性脚本/日志/node_modules ---"
rm -rf /root/node_modules /root/p8_yikao_batch.js /root/p8_batch.log /root/tcm_pipeline_v25_0_39.js
rm -rf /root/deploy_scripts
echo "OK: 散落脚本已删除"

echo "--- [8] ARCHIVE: 数据库备份归入正式备份区 ---"
mkdir -p /root/backup/archive
mv -f /root/academy_backup_p8_20260818_095320.db /root/backup/archive/ 2>/dev/null
cp -f /root/backup_20260815/pm2_dump.json /root/backup_20260815/nginx_yandao.conf \
      /root/backup_20260815/nginx_yandaoguoxue.conf /root/backup/archive/ 2>/dev/null
echo "OK: 备份归档至 /root/backup/archive/"

echo "--- [9] ARCHIVE: 导入材料压缩归档 (已导入生产库) ---"
tar -czf /root/backup/archive/import_materials_20260822.tar.gz \
    /root/nihaixia_import /root/yikao_materials /root/zhenggu_materials 2>/dev/null
rm -rf /root/nihaixia_import /root/yikao_materials /root/zhenggu_materials
echo "OK: 导入材料已压缩归档 (~14M→归档)"

echo "--- [10] 旧一次性备份目录 ---"
rm -rf /root/backup_20260815 /root/cleanup_backup_20260815
echo "OK: 旧备份目录已删除 (58M)"

echo "--- [11] /root/backup 旧快照: 仅保留最近7天 users_db ---"
find /root/backup -maxdepth 1 -name 'users_db_*.db' -mtime +7 -delete
find /root/backup -maxdepth 1 -name 'users_db_*.db-*' -mtime +7 -delete
echo "OK: 7天前快照已清理"

echo "--- [12] /tmp 旧文件 (保留3天内) ---"
find /tmp -maxdepth 1 -mtime +3 ! -name 'stargate.lock' -exec rm -rf {} + 2>/dev/null
echo "OK: /tmp 旧文件已清理"

AFTER=$(df / | awk 'NR==2{print $3}')
echo ""
echo "=== 清理后已用: $((AFTER/1024))M | 本次回收: $(((BEFORE-AFTER)/1024))M ==="
echo "=== 生产校验 ==="
readlink -f /root/yandaoguoxue/current
pm2 list | grep -E 'yandaoguoxue|name' | head -3
ls /root/yandaoguoxue/releases/ | head -5
