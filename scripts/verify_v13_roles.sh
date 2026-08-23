#!/bin/bash
# v25.0.47_13 三级角色权限 + 提现拦截 深度验证脚本（服务器执行，密钥不回显）
set -e
ENV_FILE="/www/yandaoguoxue-backend/.env"
ADMIN_KEY=$(grep '^ADMIN_API_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2)
DOMAIN="https://yandaoguoxue.yandao.vip"

echo "=== [1] 主密钥 whoami（预期 SUPER_ADMIN） ==="
curl -s -H "Authorization: Bearer ${ADMIN_KEY}" ${DOMAIN}/api/admin/unified/whoami
echo; echo

echo "=== [2] 签发测试财务密钥 ==="
KEY_RESP=$(curl -s -X POST -H "Authorization: Bearer ${ADMIN_KEY}" -H 'Content-Type: application/json' \
  -d '{"role":"FINANCE_ADMIN","name":"财务验证-临时","reason":"三级角色验收测试"}' \
  ${DOMAIN}/api/admin/unified/keys)
FIN_KEY=$(echo "$KEY_RESP" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).data.key)}catch(e){console.log('')}})")
if [ -z "$FIN_KEY" ]; then echo "FATAL: 财务密钥签发失败: $KEY_RESP"; exit 1; fi
echo "财务密钥签发成功（前缀: ${FIN_KEY%%-*}，明文不回显）"

echo "=== [3] 财务密钥 whoami（预期 FINANCE_ADMIN） ==="
curl -s -H "Authorization: Bearer ${FIN_KEY}" ${DOMAIN}/api/admin/unified/whoami
echo; echo

echo "=== [4] 财务密钥访问财务接口 /commission/withdrawals（预期 200） ==="
CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer ${FIN_KEY}" "${DOMAIN}/api/admin/unified/commission/withdrawals")
echo "HTTP ${CODE}"
[ "$CODE" = "200" ] && echo "PASS: 财务域访问" || { echo "FAIL"; }

echo "=== [5] 财务密钥越权访问 /keys（预期 403） ==="
CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer ${FIN_KEY}" "${DOMAIN}/api/admin/unified/keys")
echo "HTTP ${CODE}"
[ "$CODE" = "403" ] && echo "PASS: 越权被拦截" || { echo "FAIL"; }

echo "=== [6] 财务密钥越权访问运营接口 /moderation/users（预期 403） ==="
CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer ${FIN_KEY}" "${DOMAIN}/api/admin/unified/moderation/users")
echo "HTTP ${CODE}"
[ "$CODE" = "403" ] && echo "PASS: 跨域越权被拦截" || { echo "FAIL"; }

echo "=== [7] 财务密钥越权改价 /pricing（预期 403/404，非200） ==="
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X PUT -H "Authorization: Bearer ${FIN_KEY}" -H 'Content-Type: application/json' -d '{}' "${DOMAIN}/api/admin/unified/commission/config")
echo "PUT /commission/config HTTP ${CODE}"
[ "$CODE" = "403" ] && echo "PASS: 改配置被拦截" || { echo "FAIL"; }

echo "=== [8] 签发测试运营密钥 ==="
OPS_RESP=$(curl -s -X POST -H "Authorization: Bearer ${ADMIN_KEY}" -H 'Content-Type: application/json' \
  -d '{"role":"OPERATOR_ADMIN","name":"运营验证-临时","reason":"三级角色验收测试"}' \
  ${DOMAIN}/api/admin/unified/keys)
OPS_KEY=$(echo "$OPS_RESP" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).data.key)}catch(e){console.log('')}})")
if [ -z "$OPS_KEY" ]; then echo "FATAL: 运营密钥签发失败: $OPS_RESP"; exit 1; fi
echo "运营密钥签发成功（前缀: ${OPS_KEY%%-*}）"

echo "=== [9] 运营密钥访问运营接口 /moderation/users（预期 200） ==="
CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer ${OPS_KEY}" "${DOMAIN}/api/admin/unified/moderation/users")
echo "HTTP ${CODE}"
[ "$CODE" = "200" ] && echo "PASS: 运营域访问" || { echo "FAIL"; }

echo "=== [10] 运营密钥越权访问财务接口（预期 403） ==="
CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer ${OPS_KEY}" "${DOMAIN}/api/admin/unified/commission/withdrawals")
echo "HTTP ${CODE}"
[ "$CODE" = "403" ] && echo "PASS: 运营越权财务被拦截" || { echo "FAIL"; }

echo "=== [11] 运营密钥越权访问密钥管理（预期 403） ==="
CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer ${OPS_KEY}" "${DOMAIN}/api/admin/unified/keys")
echo "HTTP ${CODE}"
[ "$CODE" = "403" ] && echo "PASS: 运营越权密钥管理被拦截" || { echo "FAIL"; }

echo "=== [12] 审计日志验证（签发+越权记录） ==="
curl -s -H "Authorization: Bearer ${ADMIN_KEY}" "${DOMAIN}/api/admin/unified/audit?limit=8" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);const logs=j.data.logs||[];logs.slice(0,8).forEach(l=>console.log(l.time,'|',l.action,'|',l.operator,'|',l.operatorRole));console.log('共',logs.length,'条')})"

echo "=== [13] 清理：禁用两把测试密钥 ==="
MASKED_LIST=$(curl -s -H "Authorization: Bearer ${ADMIN_KEY}" "${DOMAIN}/api/admin/unified/keys")
echo "$MASKED_LIST" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const ks=JSON.parse(s).data.keys.filter(k=>k.name.includes('验证-临时'));ks.forEach(k=>console.log(k.masked+'|'+k.name))})" > /tmp/test_keys.txt
while IFS='|' read -r masked name; do
  [ -z "$masked" ] && continue
  curl -s -X DELETE -H "Authorization: Bearer ${ADMIN_KEY}" -H 'Content-Type: application/json' \
    -d '{"reason":"验收测试完成，立即禁用"}' \
    "${DOMAIN}/api/admin/unified/keys/${masked}" > /dev/null
  echo "已禁用: ${name} (${masked})"
done < /tmp/test_keys.txt
rm -f /tmp/test_keys.txt

echo "=== [14] 提现拦截验证（主开关关闭，预期 withdrawEnabled=false） ==="
curl -s ${DOMAIN}/api/commission/config | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const d=JSON.parse(s).data;console.log('withdrawEnabled:',d.withdrawEnabled,'(预期 false: WITHDRAW_TRANSFER_ENABLED=false)');console.log('minWithdrawYuan:',d.minWithdrawYuan,'(预期 10)');console.log('settleDay:',d.settleDay,'(预期 0=每月最后1天)');console.log('withdrawOpenDay:',d.withdrawOpenDay,'(预期 16)')})"

echo "=== [15] 用户端提现接口拦截（未登录 401） ==="
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"amountYuan":10}' "${DOMAIN}/api/commission/my/withdrawals")
echo "POST /my/withdrawals(未登录): HTTP ${CODE}（预期401）"

echo "===== 三级角色权限 + 提现拦截深度验证 COMPLETE ====="
