#!/bin/bash
# v25.0.25 治理层验证：迁移回填 + 健康/覆盖度/证据链 API
KEY=$(grep -E '^ADMIN_API_KEY=' /www/yandaoguoxue-backend/.env | head -1 | cut -d= -f2 | tr -d '\r"')
API=http://127.0.0.1:3001/api/academy
DB=/www/yandaoguoxue-backend/data/academy.db

echo "=== 1. 治理状态回填 ==="
sqlite3 "$DB" "SELECT govern_state, count(*) FROM knowledge_points GROUP BY govern_state;"
echo "--- questions ---"
sqlite3 "$DB" "SELECT govern_state, count(*) FROM questions GROUP BY govern_state;"

echo ""
echo "=== 2. 健康度看板 API ==="
curl -s --max-time 15 -H "x-admin-key: $KEY" "$API/loc/health" | head -c 800
echo ""

echo "=== 3. 覆盖度引擎 API (zhongyi) ==="
curl -s --max-time 15 -H "x-admin-key: $KEY" "$API/governance/coverage?track=zhongyi" | head -c 500
echo ""

echo "=== 4. 来源证据链反查（随机已审核知识点） ==="
KPID=$(sqlite3 "$DB" "SELECT id FROM knowledge_points WHERE status='approved' ORDER BY id DESC LIMIT 1;")
echo "trace kp#$KPID"
curl -s --max-time 15 -H "x-admin-key: $KEY" "$API/knowledge/$KPID/trace" | head -c 700
echo ""

echo "=== 5. 异常扫描 ==="
curl -s --max-time 20 -X POST -H "x-admin-key: $KEY" "$API/loc/alerts/scan" | head -c 600
echo ""

echo "=== 6. 治理配置 ==="
curl -s --max-time 15 -H "x-admin-key: $KEY" "$API/loc/governance" | head -c 400
echo ""
echo "=== DONE ==="
