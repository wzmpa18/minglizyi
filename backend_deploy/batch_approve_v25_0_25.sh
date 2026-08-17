#!/bin/bash
# P6-TCM-02 用户指令：批量过审全部待审知识点与题目（项目方人工授权的批量审核操作）
# 留痕：本次操作按 loc_op_logs 约定记录操作日志
DB=/www/yandaoguoxue-backend/data/academy.db

echo "=== 操作前状态 ==="
sqlite3 -header -column "$DB" "SELECT status, count(*) n FROM knowledge_points GROUP BY status;"
sqlite3 -header -column "$DB" "SELECT status, count(*) n FROM questions GROUP BY status;"

echo ""
echo "=== 执行批量过审（用户书面授权：全部上线）==="
BEFORE_Q=$(sqlite3 "$DB" "SELECT count(*) FROM questions WHERE status='pending';")
BEFORE_KP=$(sqlite3 "$DB" "SELECT count(*) FROM knowledge_points WHERE status='pending';")

sqlite3 "$DB" "UPDATE questions SET status='approved' WHERE status='pending';"
sqlite3 "$DB" "UPDATE knowledge_points SET status='approved' WHERE status='pending';"

sqlite3 "$DB" "INSERT INTO loc_op_logs (admin_id, action, target, detail) VALUES ('project_owner_authorized', 'batch_approve', 'questions+knowledge_points', '用户授权批量过审上线：题目 ${BEFORE_Q} 道 / 知识点 ${BEFORE_KP} 个');"

echo "已过审: 题目 ${BEFORE_Q} 道, 知识点 ${BEFORE_KP} 个"

echo ""
echo "=== 操作后状态 ==="
sqlite3 -header -column "$DB" "SELECT status, count(*) n FROM knowledge_points GROUP BY status;"
sqlite3 -header -column "$DB" "SELECT status, count(*) n FROM questions GROUP BY status;"

echo ""
echo "=== 各类目已上线题目 ==="
sqlite3 -header -column "$DB" "SELECT category, count(*) approved_q FROM questions WHERE status='approved' GROUP BY category ORDER BY approved_q DESC;"

echo ""
echo "=== 平台总量 ==="
sqlite3 -header -column "$DB" "SELECT (SELECT count(*) FROM knowledge_points WHERE status='approved') kp_published, (SELECT count(*) FROM questions WHERE status='approved') q_published;"
