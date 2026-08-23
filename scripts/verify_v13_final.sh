#!/bin/bash
# v25.0.47_13 收尾综合公网验证：页面健康/版本/定价/三级角色/审计/提现拦截/深度报告字数
# 服务器执行: bash /tmp/verify_v13_final.sh
set -u
ENV_FILE="/www/yandaoguoxue-backend/.env"
ADMIN_KEY=$(grep '^ADMIN_API_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2 | tr -d '\r')
DOMAIN="https://yandaoguoxue.yandao.vip"
PASS=0; FAIL=0
ok() { echo "PASS: $1"; PASS=$((PASS+1)); }
bad() { echo "FAIL: $1"; FAIL=$((FAIL+1)); }

echo "===== [1] 页面健康检查 ====="
for p in "/" "/membership" "/profile/income" "/admin/" "/admin/keys" "/admin/commission" "/admin/moderation" "/ai"; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "${DOMAIN}${p}")
  [ "$CODE" = "200" ] && ok "GET $p -> 200" || bad "GET $p -> $CODE"
done

echo "===== [2] 版本号（预期 v25.0.47_13） ====="
VER=$(curl -s ${DOMAIN}/version.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);console.log(j.version||j.buildId||'')}catch(e){console.log('PARSE_ERR')}})")
echo "version.json -> ${VER}"
echo "$VER" | grep -q "v25.0.47_13" && ok "生产版本 v25.0.47_13" || bad "版本不符: ${VER}"

echo "===== [3] 定价 SSOT（预期 monthly 37 / quarterly 99 / yearly 374 / lifetime 3600） ====="
curl -s ${DOMAIN}/api/public/pricing | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const t=j.data&&j.data.tiers?j.data.tiers:j.tiers||{};const rows=Array.isArray(t)?t:Object.entries(t).map(([k,v])=>({tier:k,...(typeof v==='object'?v:{priceYuan:v})}));rows.forEach(r=>console.log(r.tier, r.priceYuan??r.price))}catch(e){console.log('PARSE_ERR',s.slice(0,200))}})"

echo "===== [4] 主密钥 whoami（预期 SUPER_ADMIN） ====="
WM=$(curl -s -H "Authorization: Bearer ${ADMIN_KEY}" ${DOMAIN}/api/admin/unified/whoami)
echo "$WM" | grep -q "SUPER_ADMIN" && ok "主密钥=SUPER_ADMIN" || bad "whoami异常: $WM"

echo "===== [5] 签发临时财务密钥并验证 ====="
KEY_RESP=$(curl -s -X POST -H "Authorization: Bearer ${ADMIN_KEY}" -H 'Content-Type: application/json' \
  -d '{"role":"FINANCE_ADMIN","name":"收尾验证-财务-临时","reason":"v13收尾验证"}' \
  ${DOMAIN}/api/admin/unified/keys)
FIN_KEY=$(echo "$KEY_RESP" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).data.key)}catch(e){console.log('')}})")
[ -n "$FIN_KEY" ] && ok "财务子密钥签发" || { bad "财务子密钥签发失败"; echo "$KEY_RESP"; }

if [ -n "$FIN_KEY" ]; then
  WM2=$(curl -s -H "Authorization: Bearer ${FIN_KEY}" ${DOMAIN}/api/admin/unified/whoami)
  echo "$WM2" | grep -q "FINANCE_ADMIN" && ok "财务密钥whoami=FINANCE_ADMIN" || bad "财务whoami异常: $WM2"

  C=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer ${FIN_KEY}" "${DOMAIN}/api/admin/unified/commission/withdrawals")
  [ "$C" = "200" ] && ok "财务域提现审核列表 200" || bad "财务域访问 $C"

  C=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer ${FIN_KEY}" "${DOMAIN}/api/admin/unified/commission/stats")
  [ "$C" = "200" ] && ok "财务域佣金统计报表 200" || bad "财务统计 $C"

  C=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer ${FIN_KEY}" "${DOMAIN}/api/admin/unified/keys")
  [ "$C" = "403" ] && ok "财务越权密钥管理被拦截 403" || bad "财务越权keys=$C"

  C=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer ${FIN_KEY}" "${DOMAIN}/api/admin/unified/moderation/users")
  [ "$C" = "403" ] && ok "财务越权运营接口被拦截 403" || bad "财务越权运营=$C"

  C=$(curl -s -o /dev/null -w '%{http_code}' -X PUT -H "Authorization: Bearer ${FIN_KEY}" -H 'Content-Type: application/json' -d '{}' "${DOMAIN}/api/admin/unified/commission/config")
  [ "$C" = "403" ] && ok "财务越权改分佣配置被拦截 403" || bad "财务改配置=$C"

  C=$(curl -s -o /dev/null -w '%{http_code}' -X PUT -H "Authorization: Bearer ${FIN_KEY}" -H 'Content-Type: application/json' -d '{}' "${DOMAIN}/api/admin/pricing/config")
  [ "$C" = "403" ] && ok "财务越权改价格被拦截 403" || bad "财务改价=$C"
fi

echo "===== [6] 签发临时运营密钥并验证 ====="
OPS_RESP=$(curl -s -X POST -H "Authorization: Bearer ${ADMIN_KEY}" -H 'Content-Type: application/json' \
  -d '{"role":"OPERATOR_ADMIN","name":"收尾验证-运营-临时","reason":"v13收尾验证"}' \
  ${DOMAIN}/api/admin/unified/keys)
OPS_KEY=$(echo "$OPS_RESP" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).data.key)}catch(e){console.log('')}})")
[ -n "$OPS_KEY" ] && ok "运营子密钥签发" || { bad "运营子密钥签发失败"; echo "$OPS_RESP"; }

if [ -n "$OPS_KEY" ]; then
  C=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer ${OPS_KEY}" "${DOMAIN}/api/admin/unified/moderation/users")
  [ "$C" = "200" ] && ok "运营域用户管理 200" || bad "运营域访问 $C"

  C=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer ${OPS_KEY}" "${DOMAIN}/api/admin/unified/commission/withdrawals")
  [ "$C" = "403" ] && ok "运营越权财务被拦截 403" || bad "运营越权财务=$C"

  C=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer ${OPS_KEY}" "${DOMAIN}/api/admin/unified/keys")
  [ "$C" = "403" ] && ok "运营越权密钥管理被拦截 403" || bad "运营越权keys=$C"
fi

echo "===== [7] 审计日志（预期含 ADMIN_KEY_CREATE + AUDIT_BLOCK_*） ====="
curl -s -H "Authorization: Bearer ${ADMIN_KEY}" "${DOMAIN}/api/admin/unified/audit?limit=10" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const logs=j.data.logs||j.data||[];console.log('审计条数:',logs.length);logs.slice(0,8).forEach(l=>console.log(' ',l.time,'|',l.action,'|',l.operatorRole))}catch(e){console.log('PARSE_ERR',s.slice(0,150))}})"

echo "===== [8] 清理临时密钥 ====="
curl -s -H "Authorization: Bearer ${ADMIN_KEY}" "${DOMAIN}/api/admin/unified/keys" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const ks=JSON.parse(s).data.keys.filter(k=>k.name.includes('收尾验证'));ks.forEach(k=>console.log(k.masked))}catch(e){}})" > /tmp/v13_clean.txt
N=0
while read -r masked; do
  [ -z "$masked" ] && continue
  curl -s -X DELETE -H "Authorization: Bearer ${ADMIN_KEY}" -H 'Content-Type: application/json' \
    -d '{"reason":"收尾验证完成，禁用"}' "${DOMAIN}/api/admin/unified/keys/${masked}" > /dev/null
  N=$((N+1)); echo "  已禁用 ${masked}"
done < /tmp/v13_clean.txt
rm -f /tmp/v13_clean.txt
[ "$N" = "2" ] && ok "临时密钥全部禁用(${N})" || bad "临时密钥禁用数=${N}(预期2)"

echo "===== [9] 提现拦截（未登录 401 / 总开关关闭） ====="
C=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"amountYuan":10}' "${DOMAIN}/api/commission/my/withdraw")
[ "$C" = "401" ] && ok "未登录提现申请被拦截 401" || bad "未登录提现=$C"

curl -s ${DOMAIN}/api/commission/config | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const d=JSON.parse(s).data;console.log('  withdrawEnabled:',d.withdrawEnabled,'| minWithdrawYuan:',d.minWithdrawYuan,'| settleDay:',d.settleDay,'(0=每月最后1天) | withdrawOpenDay:',d.withdrawOpenDay)}catch(e){console.log('PARSE_ERR')}})"

echo "===== [10] 深度报告字数实测（真实线上提示词，700-1000字） ====="
node /tmp/deep_report_check.js

echo ""
echo "===== 汇总: PASS=${PASS} FAIL=${FAIL} ====="
[ "$FAIL" = "0" ] && echo "ALL-CHECKS-PASSED" || echo "HAS-FAILURES"
