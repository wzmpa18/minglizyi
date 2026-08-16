#!/bin/bash
echo "=== RUNNING PROCESSES ==="
ps aux | grep -E 'fullgen|node server' | grep -v grep | head -5
echo ""
echo "=== GEN_TASKS PROGRESS ==="
sqlite3 -header -column /www/yandaoguoxue-backend/data/academy.db \
  "SELECT id, track, COALESCE(category,'(all)') AS category, level, status,
          total_kp, covered_kp, created_q, skipped_cached,
          done_groups || '/' || total_groups AS grp, substr(COALESCE(error,''),1,60) AS err
   FROM gen_tasks ORDER BY id DESC LIMIT 20;"
echo ""
echo "=== QUESTION COUNTS ==="
sqlite3 /www/yandaoguoxue-backend/data/academy.db "SELECT status, count(*) FROM questions GROUP BY status;"
echo ""
echo "=== COVERAGE CHECK ==="
sqlite3 /www/yandaoguoxue-backend/data/academy.db \
  "SELECT count(*) AS approved_kp FROM knowledge_points WHERE status='approved';
   SELECT count(DISTINCT knowledge_id) AS kp_with_q FROM questions WHERE knowledge_id IS NOT NULL AND status != 'rejected';"
