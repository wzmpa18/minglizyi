#!/bin/bash
# v25.0.47_21 公网功能验证（部署后复核）
BASE="https://yandaoguoxue.yandao.vip"

echo "=== [A] 发布脚本完成度证据 ==="
if [ -f /root/yandaoguoxue/out_v25_0_47_21.tar.gz ]; then echo "tar 仍存在（脚本步骤12未执行完?）"; else echo "tar 已清理（脚本跑完）"; fi
echo "source out: $(head -c 80 /root/yandaoguoxue-source/out/version.json 2>/dev/null || echo MISSING)"

echo "=== [B] 公告占位符实时注入 ==="
ANN=$(curl -sk -m 10 ${BASE}/api/announcements/public)
echo "$ANN" | grep -q '"success"' && echo "公告接口: OK" || echo "公告接口: FAIL"
if echo "$ANN" | grep -q '{APP_VERSION}'; then echo "APP占位符未替换: FAIL"; else echo "APP占位符已替换: OK"; fi
if echo "$ANN" | grep -q '{WEB_VERSION}'; then echo "WEB占位符未替换: FAIL"; else echo "WEB占位符已替换: OK"; fi
echo "公告原文片段: $(echo "$ANN" | tr -d '\n' | head -c 500)"

echo "=== [C] 订单接口 + 导出 ==="
K=$(grep -E '^ADMIN_API_KEY=' /www/yandaoguoxue-backend/.env | cut -d= -f2-)
NOKEY=$(curl -sk -o /dev/null -w '%{http_code}' -m 10 ${BASE}/api/admin/unified/orders)
echo "无密钥访问订单: ${NOKEY} (预期401)"
ORDERS=$(curl -sk -m 10 -H "Authorization: Bearer ${K}" "${BASE}/api/admin/unified/orders?status=PAID&size=2")
echo "$ORDERS" | grep -q '"success":true' && echo "订单列表: OK" || { echo "订单列表: FAIL ${ORDERS:0:200}"; }
echo "订单数据片段: $(echo "$ORDERS" | tr -d '\n' | head -c 600)"
EXPORT=$(curl -sk -o /tmp/ord_v21.csv -w '%{http_code}' -m 15 -H "Authorization: Bearer ${K}" "${BASE}/api/admin/unified/orders/export?status=PAID")
echo "导出HTTP: ${EXPORT} (预期200)"
echo "CSV表头: $(head -1 /tmp/ord_v21.csv)"
rm -f /tmp/ord_v21.csv

echo "=== [D] 支付下单链路（真实通道） ==="
PAY_BODY='{"userId":"910080","type":"MEMBERSHIP","amount":0.01,"title":"传统文化学习平台会员服务","extra":{"membershipLevel":"monthly","membershipDays":30}}'
R1=$(curl -sk -X POST ${BASE}/api/payment/create -H 'Content-Type: application/json' -d "$PAY_BODY")
echo "$R1" | grep -q 'codeUrl' && echo "web平台会员下单: OK" || echo "web平台会员下单: FAIL ${R1:0:200}"
R2=$(curl -sk -X POST ${BASE}/api/payment/create -H 'Content-Type: application/json' -H 'X-Client-Platform: wechat' -d "$PAY_BODY")
echo "$R2" | grep -q 'codeUrl' && echo "wechat平台下单: OK" || echo "wechat平台下单: FAIL ${R2:0:200}"
NUMUID=$(echo '{"userId":910080,"type":"MEMBERSHIP","amount":0.01,"extra":{"membershipLevel":"monthly"}}' | curl -sk -X POST ${BASE}/api/payment/create -H 'Content-Type: application/json' -d @-)
echo "数字userId响应: $(echo "$NUMUID" | head -c 120)"

echo "=== [E] 版本一致性（四处同源） ==="
echo "version.json: $(curl -sk -m 10 ${BASE}/version.json | tr -d '\n')"
echo "done"
