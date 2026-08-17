#!/bin/bash
# v25.0.24: AI 可用性与失败资料状态检查（部署正骨流水线前置检查）
DB=/www/yandaoguoxue-backend/data/academy.db

echo "=== 失败资料 #12/#13 状态 ==="
sqlite3 "$DB" "SELECT id, title, status, substr(parse_note,1,120) FROM materials WHERE id IN (12,13);"

echo ""
echo "=== 403 白名单错误出现次数 ==="
grep -c 403005 /root/.pm2/logs/yandaoguoxue-backend-error.log 2>/dev/null || echo 0

echo ""
echo "=== 错误日志最后修改时间 ==="
stat -c '%y' /root/.pm2/logs/yandaoguoxue-backend-error.log 2>/dev/null

echo ""
echo "=== 最近 ai_call_logs（AI 调用是否成功）==="
sqlite3 -header -column "$DB" "SELECT scene, status, count(*) n, max(created_at) last FROM ai_call_logs GROUP BY scene, status ORDER BY last DESC LIMIT 10;"

echo ""
echo "=== 环境变量 AI 配置键名（不显示值）==="
grep -E '^(AI|HUNYUN|DEEPSEEK|MOONSHOT|ZHIPU|DOUBAO|ARK)' /www/yandaoguoxue-backend/.env | cut -d= -f1
