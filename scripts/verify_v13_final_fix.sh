#!/bin/bash
# v25.0.47_13 补充验证：301跟随确认 + 财务密钥改价拦截(membership-config) + 定价结构
set -u
ENV_FILE="/www/yandaoguoxue-backend/.env"
ADMIN_KEY=$(grep '^ADMIN_API_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2 | tr -d '\r')
DOMAIN="https://yandaoguoxue.yandao.vip"
PASS=0; FAIL=0
ok() { echo "PASS: $1"; PASS=$((PASS+1)); }
bad() { echo "FAIL: $1"; FAIL=$((FAIL+1)); }

echo "===== [1] 页面健康（跟随重定向） ====="
for p in "/membership" "/profile/income" "/admin/keys" "/admin/commission" "/admin/moderation" "/ai" "/books" "/calendar"; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -L "${DOMAIN}${p}")
  [ "$CODE" = "200" ] && ok "GET $p (follow) -> 200" || bad "GET $p -> $CODE"
done

echo "===== [2] 定价 SSOT（membershipPlans 结构） ====="
curl -s ${DOMAIN}/api/public/pricing | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const plans=j.data.membershipPlans||[];plans.forEach(p=>console.log(' ',p.level,p.name,p.price+'元'));const m=plans.find(p=>p.level==='monthly'),q=plans.find(p=>p.level==='quarterly'),y=plans.find(p=>p.level==='yearly'),l=plans.find(p=>p.level==='lifetime');if(m&&m.price===37&&q&&q.price===99&&y&&y.price===374&&l&&l.price===3600){console.log('  PASS: 定价37/99/374/3600全部一致')}else{console.log('  FAIL: 定价不一致')}}catch(e){console.log('PARSE_ERR',s.slice(0,200))}})"

echo "===== [3] 财务密钥改价拦截（PATCH /api/admin/membership-config 预期 403） ====="
KEY_RESP=$(curl -s -X POST -H "Authorization: Bearer ${ADMIN_KEY}" -H 'Content-Type: application/json' \
  -d '{"role":"FINANCE_ADMIN","name":"补验-财务-临时","reason":"改价拦截验证"}' \
  ${DOMAIN}/api/admin/unified/keys)
FIN_KEY=$(echo "$KEY_RESP" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).data.key)}catch(e){console.log('')}})")
if [ -n "$FIN_KEY" ]; then
  C=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH -H "Authorization: Bearer ${FIN_KEY}" -H 'Content-Type: application/json' -d '{}' "${DOMAIN}/api/admin/membership-config")
  [ "$C" = "403" ] && ok "财务密钥改价(PATCH)被拦截 403" || bad "财务改价=$C"

  C=$(curl -s -o /dev/null -w '%{http_code}' -X PUT -H "Authorization: Bearer ${FIN_KEY}" -H 'Content-Type: application/json' -d '{}' "${DOMAIN}/api/admin/membership-config")
  [ "$C" = "403" ] && ok "财务密钥改价(PUT)被拦截 403" || bad "财务改价PUT=$C"

  C=$(curl -s -o /dev/null -w '%{http_code}' -X PUT -H "Authorization: Bearer ${FIN_KEY}" -H 'Content-Type: application/json' -d '{}' "${DOMAIN}/api/admin/ai-config")
  [ "$C" = "403" ] && ok "财务密钥改AI配置被拦截 403" || bad "财务改AI配置=$C"

  echo "--- 清理 ---"
  curl -s -H "Authorization: Bearer ${ADMIN_KEY}" "${DOMAIN}/api/admin/unified/keys" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const ks=JSON.parse(s).data.keys.filter(k=>k.name.includes('补验'));ks.forEach(k=>console.log(k.masked))}catch(e){}})" > /tmp/v13b.txt
  while read -r masked; do
    [ -z "$masked" ] && continue
    curl -s -X DELETE -H "Authorization: Bearer ${ADMIN_KEY}" -H 'Content-Type: application/json' -d '{"reason":"补验完成"}' "${DOMAIN}/api/admin/unified/keys/${masked}" > /dev/null
    echo "  已禁用 ${masked}"
  done < /tmp/v13b.txt
  rm -f /tmp/v13b.txt
else
  bad "财务密钥签发失败"
fi

echo ""
echo "===== 汇总: PASS=${PASS} FAIL=${FAIL} ====="
[ "$FAIL" = "0" ] && echo "ALL-CHECKS-PASSED" || echo "HAS-FAILURES"
