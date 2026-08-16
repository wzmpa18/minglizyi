#!/bin/bash
tail -10 /root/zhengjiu_pipeline_v23.log
echo '---KP COUNT BY MATERIAL---'
sqlite3 -header -column /www/yandaoguoxue-backend/data/academy.db \
  "SELECT material_id, count(*) AS kp FROM knowledge_points WHERE material_id IN (9,10,11,12) GROUP BY material_id;"
echo '---MATERIAL STATUS---'
sqlite3 -header -column /www/yandaoguoxue-backend/data/academy.db \
  "SELECT id, status, substr(parse_note,1,70) AS note FROM materials WHERE id IN (9,10,11,12);"
echo '---AI CALLS LAST 15MIN---'
sqlite3 -header -column /www/yandaoguoxue-backend/data/academy.db \
  "SELECT scene, count(*) AS calls, max(created_at) AS last FROM ai_call_logs WHERE created_at > datetime('now','localtime','-15 minutes') GROUP BY scene;"
echo '---GEN TASKS---'
sqlite3 -header -column /www/yandaoguoxue-backend/data/academy.db \
  "SELECT id, category, status, done_groups, total_groups, created_q FROM gen_tasks WHERE id > 10;"
