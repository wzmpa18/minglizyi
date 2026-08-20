#!/bin/bash
# v25.0.44 账号注销 E2E 验证：注册测试用户 → 注销 → 验证数据库匿名化
set -uo pipefail

BASE=http://127.0.0.1:3001
PHONE="13900000444"
TS=$(date +%s)

echo "--- [1] 注册/登录测试用户 $PHONE ---"
LOGIN=$(curl -s -X POST $BASE/api/auth/login-code -H "Content-Type: application/json" -d "{\"phone\":\"$PHONE\",\"code\":\"888888\"}")
echo "$LOGIN" | head -c 400; echo

TOKEN=$(echo "$LOGIN" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "FATAL: 未获取到token，尝试密码登录"
  exit 1
fi
echo "TOKEN前20字符: ${TOKEN:0:20}..."

USERID=$(echo "$LOGIN" | grep -o '"userId":[0-9]*' | head -1 | cut -d: -f2)
echo "userId: $USERID"

echo "--- [2] 注销前数据库状态 ---"
sqlite3 /root/backend-auth/data/yandao_users.db "SELECT user_id, nickname, phone, email, member_level, deleted_at FROM users WHERE user_id=$USERID;"

echo "--- [3] 调用注销接口（confirmText错误 → 应400）---"
curl -s -X POST $BASE/api/account/delete -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"confirmText":"随便"}' | head -c 300; echo

echo "--- [4] 调用注销接口（confirmText=注销 → 应成功）---"
curl -s -X POST $BASE/api/account/delete -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"confirmText":"注销"}' | head -c 300; echo

echo "--- [5] 注销后数据库状态（应匿名化）---"
sqlite3 /root/backend-auth/data/yandao_users.db "SELECT user_id, nickname, phone, email, member_level, deleted_at IS NOT NULL as deleted FROM users WHERE user_id=$USERID;"

echo "--- [6] 重复注销（应409）---"
curl -s -X POST $BASE/api/account/delete -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"confirmText":"注销"}' | head -c 300; echo

echo "--- [7] 审计日志 ---"
tail -3 /root/backend-auth/data/account_deletions.log 2>/dev/null || echo "(无审计日志)"

echo "--- [8] 其他用户不受影响（抽查最新正常用户）---"
sqlite3 /root/backend-auth/data/yandao_users.db "SELECT COUNT(*) as total, SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) as deleted FROM users;"

echo "E2E_DONE"
