#!/bin/bash
# v25.0.22 全覆盖出题编排：逐类目启动 fullgen 任务，串行等待完成，全程记录
KEY=$(grep -oP 'ADMIN_API_KEY=\K.*' /www/yandaoguoxue-backend/.env)
API="http://127.0.0.1:3001/api/academy"
LOG=/root/fullgen_v22.log
DB=/www/yandaoguoxue-backend/data/academy.db

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }

declare -a JOBS=(
  "zhongyi|倪海厦·伤寒论"
  "yixue|七政四余"
  "yixue|小六壬"
  "yixue|易经推命"
  "yixue|倪海厦·天纪人间道"
  "yixue|奇门遁甲"
  "yixue|八字命理"
  "yixue|堪舆地脉"
  "zhongyi|倪海厦·神农本草经"
)

log "START 全覆盖出题 v25.0.22（9 类目串行）"
for job in "${JOBS[@]}"; do
  IFS='|' read -r track cat <<< "$job"
  pending=$(sqlite3 "$DB" "SELECT COUNT(*) FROM knowledge_points WHERE status='approved' AND category='$cat' AND id NOT IN (SELECT DISTINCT knowledge_id FROM questions WHERE knowledge_id IS NOT NULL AND status!='rejected');")
  if [ "$pending" -le 0 ]; then
    log "SKIP $track/$cat（全部知识点已有题目，缓存命中）"
    continue
  fi
  resp=$(curl -s --max-time 30 -X POST "$API/questions/generate-full" \
    -H "x-admin-key: $KEY" -H "Content-Type: application/json" \
    -d "{\"track\":\"$track\",\"category\":\"$cat\",\"level\":1}")
  taskid=$(echo "$resp" | grep -oP '"taskId":"\K[0-9]+')
  if [ -z "$taskid" ]; then
    log "FAIL 启动失败 $track/$cat: $resp"
    continue
  fi
  log "TASK#$taskid START $track/$cat 待覆盖知识点=$pending"
  # 轮询等待完成（每10秒查一次，单任务最长2小时）
  for i in $(seq 1 720); do
    sleep 10
    st=$(curl -s -H "x-admin-key: $KEY" "$API/gen-tasks" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const t=JSON.parse(s).tasks.find(x=>x.id==='$taskid');console.log(t?t.status+'|'+t.doneGroups+'/'+t.totalGroups+'|q'+t.createdQ+'|cache'+t.skippedCached:'missing')}catch(e){console.log('parse_err')}})")
    if [ $((i % 6)) -eq 0 ]; then log "TASK#$taskid PROGRESS $st"; fi
    case "$st" in
      done*) log "TASK#$taskid DONE $track/$cat $st"; break ;;
      failed*) log "TASK#$taskid FAILED $track/$cat $st"; break ;;
      missing*) log "TASK#$taskid MISSING"; break ;;
    esac
  done
done

log "=== SUMMARY ==="
sqlite3 "$DB" "SELECT COALESCE(NULLIF(category,''),'(无)') cat, COUNT(*) kp, SUM(CASE WHEN id IN (SELECT DISTINCT knowledge_id FROM questions WHERE knowledge_id IS NOT NULL AND status!='rejected') THEN 1 ELSE 0 END) covered FROM knowledge_points WHERE status='approved' GROUP BY cat ORDER BY cat;"
log "questions by status: $(sqlite3 "$DB" 'SELECT group_concat(status||\":\"||c, \" \") FROM (SELECT status, COUNT(*) c FROM questions GROUP BY status);')"
log "ai_call_logs: $(sqlite3 "$DB" 'SELECT COUNT(*) FROM ai_call_logs;') calls"
log "ALL_DONE"
