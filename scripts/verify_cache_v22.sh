#!/bin/bash
# 原则2 验收：重复触发已完成类目的全覆盖出题 → 必须全部缓存命中，0 次 AI 调用
KEY=$(grep -oP 'ADMIN_API_KEY=\K.*' /www/yandaoguoxue-backend/.env)
API="http://127.0.0.1:3001/api/academy"
DB=/www/yandaoguoxue-backend/data/academy.db

before=$(sqlite3 "$DB" "SELECT COUNT(*) FROM ai_call_logs;")
echo "ai_call_logs BEFORE: $before"

echo '--- 重复触发 小六壬（已完成类目）---'
R=$(curl -s -X POST "$API/questions/generate-full" -H "x-admin-key: $KEY" -H "Content-Type: application/json" \
  -d '{"track":"yixue","category":"小六壬","level":1}')
echo "$R"
TASKID=$(echo "$R" | grep -oP '"taskId":"\K[0-9]+')
sleep 4

after=$(sqlite3 "$DB" "SELECT COUNT(*) FROM ai_call_logs;")
echo "ai_call_logs AFTER: $after"
echo "AI_CALLS_DELTA: $((after - before))"

echo '--- 任务终态 ---'
sqlite3 "$DB" "SELECT id,status,total_groups,done_groups,total_kp,covered_kp,created_q,skipped_cached,error FROM gen_tasks WHERE id=$TASKID;"
echo '--- 前后题目数对比（应无新增）---'
sqlite3 "$DB" "SELECT COUNT(*) FROM questions;"
