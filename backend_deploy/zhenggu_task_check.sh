#!/bin/bash
# 全覆盖出题任务进度 + 正骨题目产出检查
DB=/www/yandaoguoxue-backend/data/academy.db
echo "=== 出题任务 #12 ==="
sqlite3 -header -column "$DB" "SELECT id, track, category, status, done_groups||'/'||total_groups AS groups_prog, created_q, covered_kp||'/'||total_kp AS kp_prog, skipped_cached, updated_at FROM gen_tasks WHERE id=12;"
echo ""
echo "=== 正骨题目按状态 ==="
sqlite3 -header -column "$DB" "SELECT status, count(*) n FROM questions WHERE category='中华非遗正骨' GROUP BY status;"
echo ""
echo "=== 平台累计统计 ==="
sqlite3 -header -column "$DB" "SELECT (SELECT count(*) FROM knowledge_points WHERE status='approved') AS kp_approved, (SELECT count(*) FROM questions) AS q_total, (SELECT count(*) FROM questions WHERE status='live') AS q_live, (SELECT count(*) FROM questions WHERE status='pending') AS q_pending;"
