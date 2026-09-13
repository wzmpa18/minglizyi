#!/bin/bash
# 微信4批/月调度最终时点复核（FINAL报告用实时数据）
echo "=== [1] crontab（微信内容相关） ==="
crontab -l | grep -iE 'wechat|content|topic|draft' || echo "(无微信cron)"

echo ""
echo "=== [2] 引擎配置（4批/月/每批5篇/不自动发布） ==="
grep -n "maxBatchesPerMonth\|maxDraftsPerBatch\|batchDays\|pendingReviewPause\|autoPublish\|AUTO_PUBLISH" /root/backend-auth/wechatContentEngine.js 2>/dev/null | head -12
ls /root/backend-auth/*.js 2>/dev/null | grep -i wechat | head -6

echo ""
echo "=== [3] 本月批次与草稿统计（academy.db） ==="
DB=$(find /root -maxdepth 4 -name "academy.db" 2>/dev/null | head -1)
echo "DB: $DB"
sqlite3 "$DB" "SELECT date(created_at), COUNT(*) FROM wechat_topics WHERE created_at >= '2026-09-01' GROUP BY date(created_at) ORDER BY 1;" 2>/dev/null || sqlite3 "$DB" ".tables" 2>/dev/null | head -3

echo ""
echo "=== [4] 待审草稿数 ==="
sqlite3 "$DB" "SELECT status, COUNT(*) FROM wechat_articles WHERE updated_at >= '2026-09-01' GROUP BY status;" 2>/dev/null
sqlite3 "$DB" "SELECT COUNT(*) AS pending FROM wechat_articles WHERE status IN ('pending_review','待审核','draft');" 2>/dev/null

echo ""
echo "=== [5] 调度器运行日志尾部 ==="
LOG=$(ls -t /root/backup/wechat*.log /root/backend-auth/logs/nodejs/wechat*.log 2>/dev/null | head -1)
echo "日志: $LOG"
tail -12 "$LOG" 2>/dev/null
