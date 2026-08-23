#!/bin/bash
# v25.0.47_14 支付回归验证（四平台下单 + 四档位 + 后台拦截 + 会员页）
set -e
DOMAIN="https://yandaoguoxue.yandao.vip"
WXUA="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49"

echo "=== [10] 支付下单链路回归（P0核心：四种平台环境全部放行） ==="
PAY_BODY='{"userId":"910080","type":"MEMBERSHIP","amount":0.01,"title":"传统文化学习平台会员服务","extra":{"membershipLevel":"monthly","membershipDays":30}}'
R1=$(curl -s -X POST "${DOMAIN}/api/payment/create" -H 'Content-Type: application/json' -d "$PAY_BODY")
echo "$R1" | grep -q 'codeUrl' && echo "PAY-WEB(web默认) OK" || { echo "FATAL: web下单失败: $(echo "$R1" | head -c 200)"; exit 1; }
R2=$(curl -s -X POST "${DOMAIN}/api/payment/create" -H 'Content-Type: application/json' -H 'X-Client-Platform: wechat' -d "$PAY_BODY")
echo "$R2" | grep -q 'codeUrl' && echo "PAY-WECHAT(微信内浏览器头) OK" || { echo "FATAL: 微信平台下单被拒: $(echo "$R2" | head -c 200)"; exit 1; }
R3=$(curl -s -X POST "${DOMAIN}/api/payment/create" -H 'Content-Type: application/json' -H 'X-Client-Platform: ios' -d "$PAY_BODY")
echo "$R3" | grep -q 'codeUrl' && echo "PAY-IOS(iOS头) OK" || { echo "FATAL: iOS平台下单被拒: $(echo "$R3" | head -c 200)"; exit 1; }
R4=$(curl -s -X POST "${DOMAIN}/api/payment/create" -H 'Content-Type: application/json' -A "$WXUA" -d "$PAY_BODY")
echo "$R4" | grep -q 'codeUrl' && echo "PAY-WECHAT-UA(UA兜底识别) OK" || { echo "FATAL: 微信UA下单被拒: $(echo "$R4" | head -c 200)"; exit 1; }
echo "$R1" | grep -q '"payMode":"NATIVE"' && echo "PAY-MODE(NATIVE扫码) OK" || echo "NOTE: $(echo "$R1" | head -c 120)"

echo "=== [12] 四档位会员下单回归（月/季/年/终身） ==="
for TIER in 'monthly:30' 'quarterly:90' 'yearly:365' 'lifetime:99999'; do
  LEVEL="${TIER%%:*}"
  DAYS="${TIER##*:}"
  RR=$(curl -s -X POST "${DOMAIN}/api/payment/create" -H 'Content-Type: application/json' -d "{\"userId\":\"910080\",\"type\":\"MEMBERSHIP\",\"amount\":0.01,\"title\":\"传统文化学习平台会员服务\",\"extra\":{\"membershipLevel\":\"${LEVEL}\",\"membershipDays\":${DAYS}}}")
  echo "$RR" | grep -q 'codeUrl' && echo "TIER-${LEVEL} OK" || { echo "FATAL: ${LEVEL}档下单失败: $(echo "$RR" | head -c 200)"; exit 1; }
done

echo "=== [13] B类工具单次解锁支付回归（AI解读入口） ==="
TOOL_PAY=$(curl -s -X POST "${DOMAIN}/api/payment/create" -H 'Content-Type: application/json' -d '{"userId":"910080","type":"TOOL_UNLOCK","amount":9.9,"title":"AI深度解读服务","extra":{"toolId":"bazi","unlockType":"single"}}')
echo "$TOOL_PAY" | grep -q 'codeUrl' && echo "TOOL-PAY(B类工具支付) OK" || { echo "WARN: 工具支付响应: $(echo "$TOOL_PAY" | head -c 200)"; }

echo "=== [14] 后台权限拦截回归 ==="
UNIFIED_CODE=$(curl -s -o /dev/null -w '%{http_code}' "${DOMAIN}/api/admin/unified/keys")
echo "无密钥访问 /keys: ${UNIFIED_CODE}（预期401）"
[ "$UNIFIED_CODE" = "401" ] && echo "权限拦截 OK" || { echo "FATAL: 无密钥未拦截"; exit 1; }

echo "=== [15] 存量功能回归（AI/健康/文档） ==="
curl -s -m 10 -o /dev/null -w 'api/health: %{http_code}\n' "${DOMAIN}/api/health"
AI_TEST=$(curl -s -m 15 -X POST "${DOMAIN}/api/ai/chat" -H 'Content-Type: application/json' -d '{"userId":"910080","message":"你好"}')
echo "$AI_TEST" | head -c 150; echo

echo "=== [16] version.json 公网终验 ==="
curl -s -m 10 "${DOMAIN}/version.json" | tr -d '\n'; echo

echo "===== v25.0.47_14 支付回归验证全部完成 ====="
