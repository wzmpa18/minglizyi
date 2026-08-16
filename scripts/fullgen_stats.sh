#!/bin/bash
# v25.0.22 全覆盖出题：统计各类目知识点/题目覆盖情况
KEY=$(grep -oP 'ADMIN_API_KEY=\K.*' /www/yandaoguoxue-backend/.env)
DB=/www/yandaoguoxue-backend/data/academy.db
echo '=== 类目知识点覆盖统计 ==='
sqlite3 "$DB" "
SELECT COALESCE(NULLIF(k.category,''),'(无类目)') AS cat,
       k.track,
       COUNT(*) AS kp_total,
       SUM(CASE WHEN k.status='approved' THEN 1 ELSE 0 END) AS kp_approved,
       SUM(CASE WHEN k.status='approved' AND k.id NOT IN (SELECT DISTINCT knowledge_id FROM questions WHERE knowledge_id IS NOT NULL AND status!='rejected') THEN 1 ELSE 0 END) AS kp_pending_q
FROM knowledge_points k
GROUP BY cat, k.track
ORDER BY kp_pending_q DESC;"
echo
echo '=== 题目总量 ==='
sqlite3 "$DB" "SELECT status, COUNT(*) FROM questions GROUP BY status;"
echo '=== AI 调用日志 ==='
sqlite3 "$DB" "SELECT scene, COUNT(*) FROM ai_call_logs GROUP BY scene;"
