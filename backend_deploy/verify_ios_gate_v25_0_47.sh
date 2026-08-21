#!/bin/bash
# fc12: iOS 支付门禁公网实测（UA 标记识别）
set -uo pipefail

echo "=== iOS 支付门禁实测（UA 含 YandaoGuoxueIOS）==="
IOS_CODE=$(curl -s -X POST -H 'Content-Type: application/json' \
  -H 'User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 YandaoGuoxueIOS' \
  -d '{"planId":"test","amount":1}' --max-time 15 -o /tmp/ios_gate_resp.json \
  -w '%{http_code}' https://yandaoguoxue.yandao.vip/api/payment/create)
echo "iOS-UA 支付创建: HTTP $IOS_CODE"
echo "响应: $(head -c 200 /tmp/ios_gate_resp.json 2>/dev/null)"
echo

echo "=== 对照：Android UA（应放行到业务层）==="
ANDROID_RESP=$(curl -s -X POST -H 'Content-Type: application/json' \
  -H 'User-Agent: Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 YandaoGuoxueAndroid' \
  -d '{"planId":"test","amount":1}' --max-time 15 \
  -w '\nHTTP_CODE:%{http_code}' https://yandaoguoxue.yandao.vip/api/payment/create)
ANDROID_CODE=$(echo "$ANDROID_RESP" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
echo "Android-UA 支付创建: HTTP ${ANDROID_CODE:-N/A}"
echo "响应摘要: $(echo "$ANDROID_RESP" | head -1 | head -c 150)"
echo

echo "=== 判定 ==="
if [ "$IOS_CODE" = "403" ]; then
  echo "PASS: iOS 支付创建被服务端拦截（403），门禁生效"
else
  echo "WARN: iOS-UA 返回 $IOS_CODE（若非403需人工核对该端点是否受门禁管控）"
fi
rm -f /tmp/ios_gate_resp.json
echo "FC12-IOS-GATE-DONE"
