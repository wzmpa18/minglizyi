#!/bin/bash
# FINAL-PRODUCTION-SEAL-03 / P8 公网验证：统一后台 adminUnifiedRoutes + commissionRoutes
KEY=$(grep -oP 'ADMIN_API_KEY=\K.*' /www/yandaoguoxue-backend/.env 2>/dev/null | head -1 | tr -d '\r')
BASE="https://yandaoguoxue.yandao.vip/api/admin/unified"

echo "=== [1] whoami（角色体系） ==="
curl -s -H "Authorization: Bearer $KEY" "$BASE/whoami"
echo

echo "=== [2] overview（总览指标） ==="
curl -s -H "Authorization: Bearer $KEY" "$BASE/overview" | head -c 800
echo

echo "=== [3] commission config（分佣配置） ==="
curl -s -H "Authorization: Bearer $KEY" "$BASE/commission/config"
echo

echo "=== [4] commission records（佣金明细） ==="
curl -s -H "Authorization: Bearer $KEY" "$BASE/commission/records?limit=3" | head -c 400
echo

echo "=== [5] withdrawals（提现列表） ==="
curl -s -H "Authorization: Bearer $KEY" "$BASE/commission/withdrawals?limit=3" | head -c 400
echo

echo "=== [6] payment-status（支付通道状态，不显示密钥） ==="
curl -s -H "Authorization: Bearer $KEY" "$BASE/payment-status"
echo

echo "=== [7] orders（订单列表） ==="
curl -s -H "Authorization: Bearer $KEY" "$BASE/orders?limit=3" | head -c 400
echo

echo "=== [8] audit（审计日志） ==="
curl -s -H "Authorization: Bearer $KEY" "$BASE/audit?limit=3" | head -c 400
echo

echo "=== [9] 无密钥访问应401 ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/overview")
echo "HTTP $CODE"
echo

echo "=== [10] 用户端佣金接口（未登录应401） ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://yandaoguoxue.yandao.vip/api/commission/my/summary")
echo "HTTP $CODE"
echo "VERIFY_ADMIN_UNIFIED_DONE"
