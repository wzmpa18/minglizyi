#!/bin/bash
# 针灸全链路流水线 v25.0.23：解析(#9-12) → 知识点审核 → 全覆盖出题 → 覆盖率验收
# 用法: nohup bash /root/zhengjiu_pipeline_v23.sh > /root/zhengjiu_pipeline_v23.log 2>&1 &
set -u
DB=/www/yandaoguoxue-backend/data/academy.db
API=http://127.0.0.1:3001/api/academy
KEY=$(grep -E '^ADMIN_API_KEY=' /www/yandaoguoxue-backend/.env | head -1 | cut -d= -f2 | tr -d '\r"'"'"' ')
CAT='倪海厦·针灸'
log() { echo "[$(date '+%m-%d %H:%M:%S')] $*"; }

log "==== 针灸流水线启动 ===="

# 阶段1：逐部解析 #9-12（串行，每部等待解析完成）
for MID in 9 10 11 12; do
  ST=$(sqlite3 "$DB" "SELECT status FROM materials WHERE id=$MID;")
  TITLE=$(sqlite3 "$DB" "SELECT title FROM materials WHERE id=$MID;")
  if [ "$ST" = "parsed" ] || [ "$ST" = "approved" ]; then
    log "资料#$MID $TITLE 已是 $ST，跳过解析"
    continue
  fi
  log "资料#$MID $TITLE 触发解析 (状态=$ST)"
  RESP=$(curl -s --max-time 30 -X POST "$API/materials/$MID/parse" -H "x-admin-key: $KEY")
  log "  触发响应: $RESP"
  # 轮询等待（最长 45 分钟）
  WAITED=0
  while [ $WAITED -lt 2700 ]; do
    sleep 20; WAITED=$((WAITED+20))
    ST=$(sqlite3 "$DB" "SELECT status FROM materials WHERE id=$MID;")
    KP=$(sqlite3 "$DB" "SELECT count(*) FROM knowledge_points WHERE material_id=$MID;")
    if [ "$ST" != "parsing" ]; then
      NOTE=$(sqlite3 "$DB" "SELECT parse_note FROM materials WHERE id=$MID;")
      log "  资料#$MID 解析结束: $ST / 知识点 $KP 个 / $NOTE"
      break
    fi
    if [ $((WAITED % 300)) -eq 0 ]; then log "  ...解析中 已等${WAITED}s 知识点$KP个"; fi
  done
  if [ "$ST" = "parsing" ]; then log "  警告: 资料#$MID 等待超时，继续下一部"; fi
done

# 阶段2：知识点批量审核（管理员操作，题目仍留 pending 供人工审核台上架）
PENDING_KP=$(sqlite3 "$DB" "SELECT count(*) FROM knowledge_points WHERE category='$CAT' AND status='pending';")
log "阶段2: $CAT 待审核知识点 $PENDING_KP 个，执行批量审核(approve)"
sqlite3 "$DB" "UPDATE knowledge_points SET status='approved' WHERE category='$CAT' AND status='pending';"
APPROVED_KP=$(sqlite3 "$DB" "SELECT count(*) FROM knowledge_points WHERE category='$CAT' AND status='approved';")
log "  审核后 $CAT 已入库知识点: $APPROVED_KP 个"

if [ "$APPROVED_KP" -eq 0 ]; then log "错误: 无已审核知识点，终止"; exit 1; fi

# 阶段3：全覆盖出题
log "阶段3: 触发全覆盖出题 track=zhongyi category=$CAT level=1"
RESP=$(curl -s --max-time 60 -X POST "$API/questions/generate-full" \
  -H "x-admin-key: $KEY" -H "Content-Type: application/json" \
  -d "{\"track\":\"zhongyi\",\"category\":\"$CAT\",\"level\":1}")
log "  响应: $RESP"
TASK_ID=$(echo "$RESP" | grep -oE '"taskId"[: ]+[0-9]+' | grep -oE '[0-9]+')
if [ -z "$TASK_ID" ]; then TASK_ID=$(sqlite3 "$DB" "SELECT max(id) FROM gen_tasks;"); fi
log "  任务ID: $TASK_ID"

# 阶段4：轮询任务进度（最长 6 小时）
WAITED=0
while [ $WAITED -lt 21600 ]; do
  sleep 120; WAITED=$((WAITED+120))
  ROW=$(sqlite3 "$DB" "SELECT status||'|'||done_groups||'/'||total_groups||'|'||created_q||'|'||covered_kp||'/'||total_kp FROM gen_tasks WHERE id=$TASK_ID;")
  ST=$(echo "$ROW" | cut -d'|' -f1)
  if [ $((WAITED % 600)) -eq 0 ]; then log "  任务#$TASK_ID [$ROW] 已等$((WAITED/60))分钟"; fi
  if [ "$ST" = "done" ] || [ "$ST" = "failed" ]; then log "  任务#$TASK_ID 结束: $ROW"; break; fi
done

# 阶段5：覆盖率验收
log "==== 验收统计 ===="
sqlite3 -header -column "$DB" \
  "SELECT category, count(*) AS kp_total FROM knowledge_points WHERE category='$CAT' GROUP BY category;
   SELECT count(*) AS kp_with_q FROM knowledge_points k WHERE k.category='$CAT' AND k.status='approved'
     AND EXISTS(SELECT 1 FROM questions q WHERE q.knowledge_id=k.id AND q.status!='rejected');
   SELECT status, count(*) FROM questions WHERE category='$CAT' GROUP BY status;"
log "==== 针灸流水线完成 ===="
