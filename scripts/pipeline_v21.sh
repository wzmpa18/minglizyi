#!/bin/bash
# v25.0.21 AI 流水线验收：审核知识点 → 分类 AI 出题 → 审核题目 → 统计
set -uo pipefail
cd /www/yandaoguoxue-backend
KEY=$(grep '^ADMIN_API_KEY=' .env | cut -d= -f2)
API="http://127.0.0.1:3001/api/academy"

MODE="${1:-}"

if [ "$MODE" = "approve-kp" ]; then
  # 批量审核 #31-#38 资料的知识点（先抽检 5 条样例）
  echo "=== 抽检知识点样例 ==="
  node -e "
const D=require('better-sqlite3');const db=new D('data/academy.db');
db.prepare(\"SELECT id,chapter,title,substr(content,1,60) c FROM knowledge_points WHERE material_id BETWEEN 31 AND 38 AND status='pending' ORDER BY RANDOM() LIMIT 5\").all()
  .forEach(k=>console.log('#'+k.id,'['+k.chapter+']',k.title,'::',k.c));
const n=db.prepare(\"SELECT COUNT(*) c FROM knowledge_points WHERE material_id BETWEEN 31 AND 38 AND status='pending'\").get().c;
console.log('pending kp (#31-38):', n);
"
  echo "=== 批量 approve ==="
  node -e "
const D=require('better-sqlite3');const db=new D('data/academy.db');
const r=db.prepare(\"UPDATE knowledge_points SET status='approved' WHERE material_id BETWEEN 31 AND 38 AND status='pending'\").run();
console.log('approved:', r.changes);
"

elif [ "$MODE" = "genq" ]; then
  # 分类出题：神农本草经 + 易学各类目
  declare -a JOBS=(
    "zhongyi|倪海厦·神农本草经|1|20"
    "yixue|八字命理|1|20"
    "yixue|奇门遁甲|1|20"
    "yixue|小六壬|1|20"
    "yixue|七政四余|1|15"
    "yixue|易经推命|1|15"
    "yixue|堪舆地脉|1|15"
    "yixue|倪海厦·天纪人间道|1|20"
  )
  for job in "${JOBS[@]}"; do
    IFS='|' read -r track cat level count <<< "$job"
    r=$(curl -s --max-time 120 -X POST "$API/questions/generate" \
      -H "x-admin-key: $KEY" -H "Content-Type: application/json" \
      -d "{\"track\":\"$track\",\"category\":\"$cat\",\"level\":$level,\"count\":$count}")
    echo "[$track/$cat] => $r"
    sleep 2
  done

elif [ "$MODE" = "approve-q" ]; then
  echo "=== 抽检题目样例 ==="
  node -e "
const D=require('better-sqlite3');const db=new D('data/academy.db');
db.prepare(\"SELECT id,category,type,substr(stem,1,50) s FROM questions WHERE status='pending' ORDER BY RANDOM() LIMIT 5\").all()
  .forEach(q=>console.log('#'+q.id,'['+q.category+'/'+q.type+']',q.s));
const n=db.prepare(\"SELECT COUNT(*) c FROM questions WHERE status='pending'\").get().c;
console.log('pending questions:', n);
"
  echo "=== 批量 approve ==="
  node -e "
const D=require('better-sqlite3');const db=new D('data/academy.db');
const r=db.prepare(\"UPDATE questions SET status='approved' WHERE status='pending'\").run();
console.log('approved:', r.changes);
"

elif [ "$MODE" = "stats" ]; then
  node -e "
const D=require('better-sqlite3');const db=new D('data/academy.db');
console.log('--- materials #31-38 ---');
db.prepare('SELECT id,status,parse_note FROM materials WHERE id BETWEEN 31 AND 38').all()
  .forEach(m=>console.log('#'+m.id,m.status,'|',(m.parse_note||'').slice(0,50)));
console.log('--- knowledge by category ---');
db.prepare(\"SELECT track,category,COUNT(*) c FROM knowledge_points WHERE status='approved' GROUP BY track,category ORDER BY track,category\").all()
  .forEach(k=>console.log('['+k.track+']',k.category+':',k.c));
console.log('--- questions by category ---');
db.prepare(\"SELECT track,category,type,COUNT(*) c FROM questions WHERE status='approved' GROUP BY track,category ORDER BY track,category\").all()
  .forEach(q=>console.log('['+q.track+']',q.category+':',q.c));
"
else
  echo "用法: pipeline_v21.sh [approve-kp|genq|approve-q|stats]"
fi
