#!/bin/bash
# 规则4 E2E 验收：解析 #55 → 断言指纹命中复用 + AI 零消耗 → 清理测试资料
set -u
DB=/www/yandaoguoxue-backend/data/academy.db
API=http://127.0.0.1:3001/api/academy
KEY=$(grep -E '^ADMIN_API_KEY=' /www/yandaoguoxue-backend/.env | head -1 | cut -d= -f2 | tr -d '\r"'"'"' ')

echo "=== 步骤2: 触发解析 #55（内容与 #51 完全一致）==="
RESP=$(curl -s --max-time 30 -X POST "$API/materials/55/parse" -H "x-admin-key: $KEY")
echo "API响应: $RESP"

echo ""
echo "=== 步骤3: 验证复用结果 ==="
sqlite3 -header -column "$DB" "SELECT id, title, status, dedup_of, substr(parse_note,1,90) note FROM materials WHERE id=55;"
echo ""
echo "=== ai_call_logs 指纹复用记录（tokens 应为 0）==="
sqlite3 -header -column "$DB" "SELECT id, scene, material_id, tokens_in, tokens_out, created_at FROM ai_call_logs WHERE scene='hash_dedup_reuse' ORDER BY id DESC LIMIT 3;"

echo ""
echo "=== 步骤4: 清理测试资料 ==="
sqlite3 "$DB" "DELETE FROM materials WHERE id=55;"
echo "已删除测试资料 #55"
sqlite3 -header -column "$DB" "SELECT count(*) AS zhenggu_materials FROM materials WHERE category='中华非遗正骨';"
