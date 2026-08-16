#!/bin/bash
# v25.0.20 AI 流水线验证：解析→审核→出题→审核（在 /www/yandaoguoxue-backend 运行）
# 用法: bash scripts/ai_pipeline_verify.sh <materialId>
set -uo pipefail
cd /www/yandaoguoxue-backend
MID=${1:-1}
KEY=$(grep '^ADMIN_API_KEY=' .env | cut -d= -f2- | tr -d '\r')

echo "=== [1] Trigger AI parse material #${MID} ==="
curl -s -X POST -H "x-admin-key: ${KEY}" -H 'Content-Type: application/json' "http://127.0.0.1:3001/api/academy/materials/${MID}/parse"
echo

echo "=== [2] Waiting for parse (max 120s) ==="
for i in $(seq 1 24); do
  sleep 5
  ST=$(node -e "const D=require('better-sqlite3');const db=new D('data/academy.db');console.log(db.prepare('SELECT status FROM materials WHERE id=?').get(${MID}).status);db.close()")
  KP=$(node -e "const D=require('better-sqlite3');const db=new D('data/academy.db');console.log(db.prepare('SELECT COUNT(*) c FROM knowledge_points WHERE material_id=?').get(${MID}).c);db.close()")
  echo "  t=$((i*5))s status=${ST} kp=${KP}"
  if [ "${ST}" = "parsed" ] || [ "${ST}" = "parse_failed" ]; then break; fi
done

echo "=== [3] Knowledge points sample ==="
node -e "const D=require('better-sqlite3');const db=new D('data/academy.db');const kps=db.prepare('SELECT id,chapter,title,substr(content,1,60) c FROM knowledge_points WHERE material_id=? ORDER BY id LIMIT 5').all(${MID});kps.forEach(k=>console.log('#'+k.id,'['+k.chapter+']',k.title,'::',k.c));db.close()"

echo "=== [4] Approve up to 20 knowledge points (human-review channel) ==="
IDS=$(node -e "const D=require('better-sqlite3');const db=new D('data/academy.db');console.log(db.prepare(\"SELECT id FROM knowledge_points WHERE material_id=? AND status='pending' ORDER BY id LIMIT 20\").all(${MID}).map(r=>r.id).join(' '));db.close()")
N=0
for id in ${IDS}; do
  R=$(curl -s -X POST -H "x-admin-key: ${KEY}" -H 'Content-Type: application/json' -d '{"action":"approve"}' "http://127.0.0.1:3001/api/academy/knowledge/${id}/review")
  if echo "${R}" | grep -q '"success":true'; then N=$((N+1)); fi
done
echo "  approved kp: ${N}"

echo "=== [5] Generate questions (zhongyi level1 x8) ==="
curl -s -X POST -H "x-admin-key: ${KEY}" -H 'Content-Type: application/json' \
  -d '{"track":"zhongyi","category":"倪海厦·伤寒论","level":1,"count":8}' \
  http://127.0.0.1:3001/api/academy/questions/generate
echo
sleep 3

echo "=== [6] Questions sample ==="
node -e "const D=require('better-sqlite3');const db=new D('data/academy.db');const qs=db.prepare(\"SELECT id,type,category,substr(stem,1,50) s FROM questions WHERE category='倪海厦·伤寒论' ORDER BY id DESC LIMIT 8\").all();qs.forEach(q=>console.log('#'+q.id,q.type,q.category,'::',q.s));console.log('total_q='+db.prepare('SELECT COUNT(*) c FROM questions').get().c);db.close()"

echo "=== [7] Approve up to 6 questions ==="
QIDS=$(node -e "const D=require('better-sqlite3');const db=new D('data/academy.db');console.log(db.prepare(\"SELECT id FROM questions WHERE category='倪海厦·伤寒论' AND status='pending' ORDER BY id DESC LIMIT 6\").all().map(r=>r.id).join(' '));db.close()")
M=0
for qid in ${QIDS}; do
  R=$(curl -s -X POST -H "x-admin-key: ${KEY}" -H 'Content-Type: application/json' -d '{"action":"approve"}' "http://127.0.0.1:3001/api/academy/questions/${qid}/review")
  if echo "${R}" | grep -q '"success":true'; then M=$((M+1)); fi
done
echo "  approved q: ${M}"
echo "=== DONE ==="
