#!/bin/bash
# v25.0.24 交付统计：题目状态分布 + 各类目知识点/题目 + 指纹覆盖率
DB=/www/yandaoguoxue-backend/data/academy.db
echo "=== 题目状态全分布 ==="
sqlite3 -header -column "$DB" "SELECT status, count(*) n FROM questions GROUP BY status;"
echo ""
echo "=== 各类目知识点与题目 ==="
sqlite3 -header -column "$DB" "SELECT category, count(DISTINCT k.id) kp, (SELECT count(*) FROM questions q WHERE q.category=k.category) q FROM knowledge_points k WHERE k.status='approved' GROUP BY category ORDER BY kp DESC;"
echo ""
echo "=== 指纹覆盖情况 ==="
sqlite3 -header -column "$DB" "SELECT (SELECT count(*) FROM knowledge_points) kp_total, (SELECT count(*) FROM knowledge_points WHERE content_hash!='') kp_hashed, (SELECT count(*) FROM materials) mat_total, (SELECT count(*) FROM materials WHERE content_hash!='') mat_hashed;"
echo ""
echo "=== AI 调用日志（今日摘要）==="
sqlite3 -header -column "$DB" "SELECT scene, count(*) n, sum(tokens_in) tin, sum(tokens_out) tout FROM ai_call_logs WHERE created_at>=datetime('now','localtime','-1 day') GROUP BY scene;"
