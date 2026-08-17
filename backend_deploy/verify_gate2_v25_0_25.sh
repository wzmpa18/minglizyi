#!/bin/bash
# v25.0.25 治理层验证第二批：批量过审留痕 + JWT 证据链/覆盖度 API + 状态回填复查
KEY=$(grep -E '^ADMIN_API_KEY=' /www/yandaoguoxue-backend/.env | head -1 | cut -d= -f2 | tr -d '\r"')
JWT_SECRET=$(grep -E '^JWT_SECRET=' /www/yandaoguoxue-backend/.env | head -1 | cut -d= -f2 | tr -d '\r"')
API=http://127.0.0.1:3001/api/academy
DB=/www/yandaoguoxue-backend/data/academy.db

echo "=== 1. 治理状态回填复查（迁移已完成） ==="
sqlite3 "$DB" "SELECT govern_state, count(*) FROM knowledge_points GROUP BY govern_state;"
echo "--- questions ---"
sqlite3 "$DB" "SELECT govern_state, count(*) FROM questions GROUP BY govern_state;"

echo ""
echo "=== 2. 批量过审留痕检查 ==="
sqlite3 "$DB" "SELECT id, admin_id, action, detail, created_at FROM loc_op_logs WHERE action LIKE '%approve%' ORDER BY id DESC LIMIT 5;"
echo "--- 当前题目状态分布 ---"
sqlite3 "$DB" "SELECT status, count(*) FROM questions GROUP BY status;"
sqlite3 "$DB" "SELECT status, count(*) FROM knowledge_points GROUP BY status;"

echo ""
echo "=== 3. 铸造测试 JWT 并验证覆盖度/证据链 API ==="
TOKEN=$(node -e "const j=require('/www/yandaoguoxue-backend/node_modules/jsonwebtoken');console.log(j.sign({userId:'verify_gate',uid:'verify_gate'},'$JWT_SECRET',{expiresIn:'10m'}))")
echo "--- coverage (zhongyi) ---"
curl -s --max-time 15 -H "Authorization: Bearer $TOKEN" "$API/governance/coverage?track=zhongyi" | head -c 400
echo ""
echo "--- trace kp#1 ---"
curl -s --max-time 15 -H "Authorization: Bearer $TOKEN" "$API/knowledge/1/trace" | head -c 800
echo ""
echo "=== DONE2 ==="
