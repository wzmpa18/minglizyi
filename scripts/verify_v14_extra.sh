#!/bin/bash
# v25.0.47_14 补充回归：SINGLE_UNLOCK支付 + AI接口
set -e
DOMAIN="https://yandaoguoxue.yandao.vip"

echo "=== [A] B类工具单次解锁支付（正确类型 SINGLE_UNLOCK） ==="
TOOL_PAY=$(curl -s -X POST "${DOMAIN}/api/payment/create" -H 'Content-Type: application/json' -d '{"userId":"910080","type":"SINGLE_UNLOCK","amount":9.9,"title":"传统文化学习资料深度解读（单次）","extra":{"toolId":"bazi","unlockType":"single"}}')
echo "$TOOL_PAY" | grep -q 'codeUrl' && echo "SINGLE-UNLOCK-PAY(B类工具单次解锁) OK" || { echo "FATAL: $(echo "$TOOL_PAY" | head -c 250)"; exit 1; }

echo "=== [B] 积分充值订单类型校验 ==="
PT=$(curl -s -X POST "${DOMAIN}/api/payment/create" -H 'Content-Type: application/json' -d '{"userId":"910080","type":"POINTS_RECHARGE","amount":10,"title":"传统文化学习平台积分充值","extra":{"points":1000}}')
echo "$PT" | grep -q 'codeUrl' && echo "POINTS-RECHARGE OK" || echo "WARN: $(echo "$PT" | head -c 200)"

echo "=== [C] AI接口鉴权拦截（无token预期401） ==="
AI_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${DOMAIN}/api/ai/chat" -H 'Content-Type: application/json' -d '{"message":"测试"}')
echo "AI无token: ${AI_CODE}"

echo "=== [D] 功能开关公开接口（服务端强制） ==="
FF=$(curl -s -m 10 "${DOMAIN}/api/public/feature-flags")
echo "$FF" | head -c 300; echo

echo "===== 补充回归完成 ====="
