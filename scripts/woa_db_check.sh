#!/bin/bash
DB=/www/yandaoguoxue-backend/data/academy.db
sqlite3 "$DB" "SELECT article_id, substr(title,1,60), status, substr(created_at,1,19) FROM wechat_articles"
echo '===正文前900字符==='
sqlite3 "$DB" "SELECT substr(content_html,1,900) FROM wechat_articles WHERE article_id=1"
echo ''
echo '===选题清单==='
sqlite3 "$DB" "SELECT id, substr(title,1,50), cluster, score FROM wechat_topic_candidates LIMIT 10" 2>/dev/null || sqlite3 "$DB" ".schema wechat_topic_candidates" | head -20
