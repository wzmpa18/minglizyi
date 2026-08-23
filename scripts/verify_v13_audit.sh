#!/bin/bash
# v25.0.47_13 审计修复复验 + 提现拦截验证（服务器执行）
set -e
ENV_FILE="/www/yandaoguoxue-backend/.env"
ADMIN_KEY=$(grep '^ADMIN_API_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2)
DOMAIN="https://yandaoguoxue.yandao.vip"

echo "=== [1] 提现申请未登录拦截（POST /my/withdraw，预期 401） ==="
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"amountYuan":10}' "${DOMAIN}/api/commission/my/withdraw")
echo "HTTP ${CODE}"
[ "$CODE" = "401" ] && echo "PASS: 未登录提现被拦截" || echo "FAIL"

echo "=== [2] 签发临时财务密钥并触发越权（验证审计写入） ==="
KEY_RESP=$(curl -s -X POST -H "Authorization: Bearer ${ADMIN_KEY}" -H 'Content-Type: application/json' \
  -d '{"role":"FINANCE_ADMIN","name":"审计复验-临时","reason":"审计修复复验"}' \
  ${DOMAIN}/api/admin/unified/keys)
FIN_KEY=$(echo "$KEY_RESP" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).data.key)}catch(e){console.log('')}})")
[ -z "$FIN_KEY" ] && { echo "FATAL: 签发失败"; exit 1; }
echo "签发成功"

echo "--- 财务越权访问 /keys（预期 403 + 写审计） ---"
curl -s -o /dev/null -w 'HTTP %{http_code}\n' -H "Authorization: Bearer ${FIN_KEY}" "${DOMAIN}/api/admin/unified/keys"

echo "=== [3] 审计日志查询（预期含 ADMIN_KEY_CREATE + AUDIT_BLOCK_*） ==="
curl -s -H "Authorization: Bearer ${ADMIN_KEY}" "${DOMAIN}/api/admin/unified/audit?limit=10" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);const logs=j.data||[];console.log('审计条数:',logs.length);logs.slice(0,6).forEach(l=>console.log(l.time,'|',l.action,'|',l.operator,'|',l.operatorRole,'|',(l.reason||'').slice(0,30)))})"

echo "=== [4] 清理临时密钥 ==="
curl -s -H "Authorization: Bearer ${ADMIN_KEY}" "${DOMAIN}/api/admin/unified/keys" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const ks=JSON.parse(s).data.keys.filter(k=>k.name.includes('审计复验'));ks.forEach(k=>console.log(k.masked))})" > /tmp/tk.txt
while read -r masked; do
  [ -z "$masked" ] && continue
  curl -s -X DELETE -H "Authorization: Bearer ${ADMIN_KEY}" -H 'Content-Type: application/json' -d '{"reason":"复验完成"}' "${DOMAIN}/api/admin/unified/keys/${masked}" > /dev/null
  echo "已禁用 ${masked}"
done < /tmp/tk.txt
rm -f /tmp/tk.txt

echo "=== [5] 最终确认：遗留密钥清点 ==="
curl -s -H "Authorization: Bearer ${ADMIN_KEY}" "${DOMAIN}/api/admin/unified/keys" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const ks=JSON.parse(s).data.keys;const active=ks.filter(k=>k.status!=='disabled');const dis=ks.filter(k=>k.status==='disabled');console.log('生效中:',active.length,'已禁用:',dis.length);active.forEach(k=>console.log(' -',k.name,k.role,k.masked))})"

echo "=== [6] 深度报告提示词公网验证（版本号 v25.0.47_13） ==="
curl -s ${DOMAIN}/version.json

echo; echo "===== 审计修复复验 COMPLETE ====="
