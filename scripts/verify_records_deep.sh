#!/bin/bash
# 深挖：v25.0.74 部署后 records/save 是否有真实调用 + 错误日志 + 完整链路测试
echo "=== 1) 后端日志中 records/save 调用记录 ==="
grep -a "records/save" /root/.pm2/logs/yandaoguoxue-backend-out.log 2>/dev/null | tail -8
echo "---"
echo "=== 2) 错误日志中相关报错 ==="
grep -a -i "record" /root/.pm2/logs/yandaoguoxue-backend-error.log 2>/dev/null | tail -8
echo "(空=无报错)"
echo "=== 3) user_records 表结构 ==="
sqlite3 /root/backend-auth/data/yandao_users.db ".schema user_records" 2>/dev/null | head -20
echo "=== 4) 排盘相关类型分布（qizheng/bazi/compass等）==="
sqlite3 /root/backend-auth/data/yandao_users.db "SELECT DISTINCT record_type FROM user_records" 2>/dev/null
