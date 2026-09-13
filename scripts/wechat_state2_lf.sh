#!/bin/bash
set +e
echo "=== [A] 引擎配置（正确路径） ==="
grep -n "maxBatchesPerMonth\|maxDraftsPerBatch\|batchDays\|pendingReviewPause\|autoPublish\|dailyArticleLimit" /www/yandaoguoxue-backend/wechatContentEngine.js 2>/dev/null | head -10

echo ""
echo "=== [B] DB表结构 ==="
DB=/root/backend-auth/data/academy.db
sqlite3 "$DB" ".tables" 2>/dev/null | tr -s ' ' '\n' | grep -iE "wechat|article|topic" | head -10

echo ""
echo "=== [C] 本月微信内容批次（按天） ==="
sqlite3 "$DB" "SELECT date(created_at) d, COUNT(*) n FROM wechat_topics WHERE created_at >= '2026-09-01' GROUP BY d ORDER BY d;" 2>/dev/null

echo ""
echo "=== [D] 文章状态统计（全量+本月） ==="
sqlite3 "$DB" "SELECT status, COUNT(*) FROM wechat_articles GROUP BY status;" 2>/dev/null
echo "--- 本月 ---"
sqlite3 "$DB" "SELECT status, COUNT(*) FROM wechat_articles WHERE created_at >= '2026-09-01' GROUP BY status;" 2>/dev/null

echo ""
echo "=== [E] 待审草稿明细（标题+时间） ==="
sqlite3 "$DB" "SELECT substr(created_at,1,10), substr(title,1,30), status FROM wechat_articles WHERE status LIKE '%pending%' OR status LIKE '%review%' OR status='draft' ORDER BY created_at DESC LIMIT 12;" 2>/dev/null

echo ""
echo "=== [F] 最近一次各stage运行时间 ==="
grep -E "^\[|SUCCESS" /root/backup/wechat_oa_scheduler.log 2>/dev/null | tail -8
stat -c "日志最后修改: %y" /root/backup/wechat_oa_scheduler.log 2>/dev/null
