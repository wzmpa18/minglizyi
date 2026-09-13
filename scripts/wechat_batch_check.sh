#!/bin/bash
DB=/www/yandaoguoxue-backend/data/academy.db
echo '--- 本月按日生成文章数 ---'
sqlite3 "$DB" "SELECT date(created_at) d, COUNT(*) n FROM wechat_articles WHERE created_at >= '2026-09-01' GROUP BY d ORDER BY d;"
echo '--- 文章状态分布 ---'
sqlite3 "$DB" "SELECT status, COUNT(*) n FROM wechat_articles GROUP BY status;"
echo '--- 本月总数 ---'
sqlite3 "$DB" "SELECT COUNT(*) FROM wechat_articles WHERE created_at >= '2026-09-01';"
echo '--- 待审草稿(WECHAT_DRAFT) ---'
sqlite3 "$DB" "SELECT COUNT(*) FROM wechat_articles WHERE status = 'WECHAT_DRAFT';"
echo '--- 近期任务运行记录 ---'
sqlite3 "$DB" "SELECT run_date, stage, status FROM wechat_content_jobs ORDER BY job_id DESC LIMIT 12;"
