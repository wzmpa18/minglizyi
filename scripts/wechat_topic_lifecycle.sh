#!/bin/bash
DB=/www/yandaoguoxue-backend/data/academy.db
echo '--- 09-13选题分数 ---'
sqlite3 "$DB" "SELECT topic_id, keyword, internal_score, content_gap_score, final_score FROM wechat_topic_candidates WHERE run_date='2026-09-13' ORDER BY final_score DESC;"
echo '--- 已用选题(USED) ---'
sqlite3 "$DB" "SELECT topic_id, run_date, keyword, final_score FROM wechat_topic_candidates WHERE status='USED';"
echo '--- 已有文章标题 ---'
sqlite3 "$DB" "SELECT article_id, date(created_at), title FROM wechat_articles ORDER BY article_id;"
