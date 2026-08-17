#!/bin/bash
# 正骨流水线进度检查
DB=/www/yandaoguoxue-backend/data/academy.db
echo "=== 流水线日志（最近10行）==="
tail -10 /root/zhenggu_pipeline_v25_0_24.log
echo ""
echo "=== 正骨知识点产出 ==="
sqlite3 -header -column "$DB" "SELECT material_id, count(*) AS kp, group_concat(DISTINCT status) AS st FROM knowledge_points WHERE material_id>=40 GROUP BY material_id;"
echo ""
echo "=== 资料状态汇总 ==="
sqlite3 -header -column "$DB" "SELECT status, count(*) n FROM materials WHERE category='中华非遗正骨' GROUP BY status;"
