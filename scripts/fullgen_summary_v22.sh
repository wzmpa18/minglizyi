#!/bin/bash
DB=/www/yandaoguoxue-backend/data/academy.db
echo '=== 题目状态分布 ==='
sqlite3 "$DB" "SELECT status, COUNT(*) FROM questions GROUP BY status;"
echo '=== 类目覆盖（approved 知识点 → 已有题知识点）==='
sqlite3 "$DB" "SELECT COALESCE(NULLIF(category,''),'(无)') cat, COUNT(*) kp, SUM(CASE WHEN id IN (SELECT DISTINCT knowledge_id FROM questions WHERE knowledge_id IS NOT NULL AND status!='rejected') THEN 1 ELSE 0 END) covered FROM knowledge_points WHERE status='approved' GROUP BY cat ORDER BY cat;"
echo '=== gen_tasks 汇总 ==='
sqlite3 "$DB" "SELECT id, category, status, total_kp, covered_kp, created_q, skipped_cached FROM gen_tasks ORDER BY id;"
echo '=== AI 调用统计 ==='
sqlite3 "$DB" "SELECT scene, COUNT(*), SUM(tokens_in+tokens_out) FROM ai_call_logs GROUP BY scene;"
echo '=== 全库总览 ==='
sqlite3 "$DB" "SELECT 'materials', COUNT(*) FROM materials UNION ALL SELECT 'knowledge_points', COUNT(*) FROM knowledge_points UNION ALL SELECT 'questions', COUNT(*) FROM questions;"
