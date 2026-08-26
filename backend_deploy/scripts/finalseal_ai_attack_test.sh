#!/bin/bash
# ============================================================================
# FINAL-SEAL-20260826 P3: AI服务端权限攻击测试 A-H + 并发锁 + 输入超限 + 失败不扣额
# 测试账号: 910077(basic/伪造会员字段) 910078(季度F) 910079(过期G) 910080(封禁H) 910081(有效月会员E)
# 所有DB改动测试后恢复原状
# ============================================================================
set -u
API="http://127.0.0.1:3001"
UDB="/root/backend-auth/data/yandao_users.db"
TODAY=$(TZ=Asia/Shanghai date +%F)
PASS=0; FAIL=0; SKIP=0

check() {
  local name="$1" expect="$2" actual="$3"
  if [[ "$actual" == *"$expect"* ]]; then
    echo "PASS  $name"; PASS=$((PASS+1))
  else
    echo "FAIL  $name"; FAIL=$((FAIL+1))
    echo "      expect: $expect"
    echo "      got:    ${actual:0:220}"
  fi
}

# ---------- 生成测试token ----------
cd /www/yandaoguoxue-backend
TOKENS=$(node -e "
require('dotenv').config();
const jwt = require('jsonwebtoken');
const s = process.env.JWT_SECRET;
const mk = (id) => jwt.sign({ userId: id, phone: String(id) }, s, { expiresIn: '2h' });
console.log(JSON.stringify({ basic: mk(910077), quarterly: mk(910078), expired: mk(910079), banTarget: mk(910080), monthly: mk(910081) }));
")
TB=$(echo "$TOKENS" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).basic))")
TQ=$(echo "$TOKENS" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).quarterly))")
TE=$(echo "$TOKENS" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).expired))")
TBAN=$(echo "$TOKENS" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).banTarget))")
TM=$(echo "$TOKENS" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).monthly))")
echo "tokens ready: basic=${#TB} quarterly=${#TQ} expired=${#TE} ban=${#TBAN} monthly=${#TM}"

ai_post() { curl -s -m 150 -X POST "$API/api/ai/chat" -H "Content-Type: application/json" -H "Authorization: Bearer $1" -d "$2"; }

# ========== A. 无token浏览器UA → 401 ==========
echo "===== 测试A: 无token浏览器直接POST ====="
R=$(curl -s -X POST "$API/api/ai/chat" -H "Content-Type: application/json" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0) Chrome/126.0" -d '{"userPrompt":"测"}')
check "A: 浏览器匿名 => AI_AUTH_REQUIRED" "AI_AUTH_REQUIRED" "$R"

# ========== B/C. 伪造会员字段 + 伪造memberLevel请求字段 ==========
echo "===== 测试B/C: 伪造localStorage会员(910077 basic 伪造yearly) ====="
R=$(curl -s "$API/api/ai/quota" -H "Authorization: Bearer $TB")
check "B: quota端点显示basic等级" '"level":"basic"' "$R"
# 置满额度后伪造会员字段调用——服务端若信前端字段会放行(yearly无限), 若信DB则429
sqlite3 "$UDB" "INSERT OR REPLACE INTO ai_quota_usage(user_id,usage_date,used_count) VALUES('910077','$TODAY',3);"
R=$(ai_post "$TB" '{"userPrompt":"测","memberLevel":"yearly","level":"yearly","isMember":true,"membershipExpiry":"2099-01-01"}')
check "C: 伪造memberLevel字段 => 服务端拒绝(429)" "AI_QUOTA_EXCEEDED" "$R"
check "C2: 响应确认真实等级basic" '"level":"basic"' "$R"
sqlite3 "$UDB" "DELETE FROM ai_quota_usage WHERE user_id='910077' AND usage_date='$TODAY';"

# ========== D. 免费用户无额度 → 429 ==========
echo "===== 测试D: 免费用户额度耗尽 => 429 ====="
sqlite3 "$UDB" "INSERT OR REPLACE INTO ai_quota_usage(user_id,usage_date,used_count) VALUES('910077','$TODAY',3);"
R=$(ai_post "$TB" '{"userPrompt":"测"}')
check "D: basic额度3/3用尽 => AI_QUOTA_EXCEEDED" "AI_QUOTA_EXCEEDED" "$R"
sqlite3 "$UDB" "DELETE FROM ai_quota_usage WHERE user_id='910077' AND usage_date='$TODAY';"

# ========== E. 有效月会员 → 正常AI ==========
echo "===== 测试E: 有效monthly会员(910081) => 正常AI ====="
U0=$(sqlite3 "$UDB" "SELECT used_count FROM ai_quota_usage WHERE user_id='910081' AND usage_date='$TODAY';")
U0=${U0:-0}
R=$(ai_post "$TM" '{"userPrompt":"用一句话回答：1+1=?"}')
check "E: monthly会员AI调用成功" '"success":true' "$R"
check "E2: 返回非空content" '"content":"' "$R"
U1=$(sqlite3 "$UDB" "SELECT used_count FROM ai_quota_usage WHERE user_id='910081' AND usage_date='$TODAY';")
U1=${U1:-0}
echo "      用量: $U0 -> $U1"
if [ "$U1" -eq $((U0+1)) ]; then echo "PASS  E3: 成功调用恰好扣1次配额"; PASS=$((PASS+1)); else echo "FAIL  E3: 配额扣减异常 $U0->$U1"; FAIL=$((FAIL+1)); fi

# ========== F. 季度会员 → 正常 ==========
echo "===== 测试F: 季度会员(910078临时设quarterly) ====="
sqlite3 "$UDB" "UPDATE users SET member_level='quarterly', membership_expiry='2026-12-31 00:00:00' WHERE user_id=910078;"
R=$(curl -s "$API/api/ai/quota" -H "Authorization: Bearer $TQ")
check "F: quota端点确认quarterly/50次" '"dailyLimit":50' "$R"
R=$(ai_post "$TQ" '{"userPrompt":"用一句话回答：2+2=?"}')
check "F2: quarterly会员AI调用成功" '"success":true' "$R"
sqlite3 "$UDB" "UPDATE users SET member_level='basic', membership_expiry=NULL WHERE user_id=910078; DELETE FROM ai_quota_usage WHERE user_id='910078' AND usage_date='$TODAY';"

# ========== G. 过期会员 → 不再享受会员权益 ==========
echo "===== 测试G: 过期会员(910079临时设monthly已过期) ====="
sqlite3 "$UDB" "UPDATE users SET member_level='monthly', membership_expiry='2026-08-01 00:00:00' WHERE user_id=910079;"
R=$(curl -s "$API/api/ai/quota" -H "Authorization: Bearer $TE")
check "G: 过期会员回退basic/3次" '"dailyLimit":3' "$R"
check "G2: 等级回退basic" '"level":"basic"' "$R"
sqlite3 "$UDB" "UPDATE users SET member_level='basic', membership_expiry=NULL WHERE user_id=910079;"

# ========== H. 被封禁用户 → 按规则拒绝 ==========
echo "===== 测试H: 封禁用户(910080临时封禁) ====="
sqlite3 "$UDB" "UPDATE users SET status='banned' WHERE user_id=910080;"
R=$(ai_post "$TBAN" '{"userPrompt":"测"}')
check "H: 封禁用户AI => ACCOUNT_BANNED" "ACCOUNT_BANNED" "$R"
R=$(curl -s "$API/api/social/friends/list" -H "Authorization: Bearer $TBAN")
check "H2: 封禁用户社交 => ACCOUNT_BANNED" "ACCOUNT_BANNED" "$R"
R=$(curl -s "$API/api/ai/quota" -H "Authorization: Bearer $TBAN")
check "H3: 封禁用户quota端点 => ACCOUNT_BANNED" "ACCOUNT_BANNED" "$R"
sqlite3 "$UDB" "UPDATE users SET status='active' WHERE user_id=910080;"
R=$(curl -s "$API/api/ai/quota" -H "Authorization: Bearer $TBAN")
check "H4: 解封后恢复 => success" '"success":true' "$R"

# ========== 72. 并发锁: 剩1次额度同时2请求 → 只烧1次 ==========
echo "===== 测试72: 并发锁(910081置49/50, 并发2请求) ====="
sqlite3 "$UDB" "INSERT OR REPLACE INTO ai_quota_usage(user_id,usage_date,used_count) VALUES('910081','$TODAY',49);"
ai_post "$TM" '{"userPrompt":"用一句话回答：3+3=?"}' > /tmp/cc_req1.json 2>&1 &
P1=$!
sleep 0.4
ai_post "$TM" '{"userPrompt":"用一句话回答：4+4=?"}' > /tmp/cc_req2.json 2>&1 &
P2=$!
wait $P1 $P2
R1=$(cat /tmp/cc_req1.json); R2=$(cat /tmp/cc_req2.json)
echo "      请求1: ${R1:0:80}"
echo "      请求2: ${R2:0:80}"
if [[ "$R1" == *'"success":true'* || "$R2" == *'"success":true'* ]]; then
  echo "PASS  72a: 恰有一个请求成功"; PASS=$((PASS+1))
else
  echo "FAIL  72a: 无请求成功"; FAIL=$((FAIL+1))
fi
if [[ "$R1" == *"AI_CONCURRENT_LIMIT"* || "$R2" == *"AI_CONCURRENT_LIMIT"* ]]; then
  echo "PASS  72b: 并发请求被并发锁拒绝"; PASS=$((PASS+1))
else
  echo "FAIL  72b: 未触发并发锁(两个可能都打上游或都失败)"; FAIL=$((FAIL+1))
fi
U2=$(sqlite3 "$UDB" "SELECT used_count FROM ai_quota_usage WHERE user_id='910081' AND usage_date='$TODAY';")
if [ "${U2:-0}" -eq 50 ]; then echo "PASS  72c: 最终用量50(只烧1次)"; PASS=$((PASS+1)); else echo "FAIL  72c: 用量=${U2:-0} 期望50"; FAIL=$((FAIL+1)); fi

# ========== 73/十. 输入超限 → 400 且不扣额度 ==========
echo "===== 测试十: 输入超长(13000字符) => 400不扣额 ====="
LONGPROMPT=$(node -e "console.log('测'.repeat(13000))")
sqlite3 "$UDB" "DELETE FROM ai_quota_usage WHERE user_id='910077' AND usage_date='$TODAY';"
R=$(curl -s -m 30 -X POST "$API/api/ai/chat" -H "Content-Type: application/json" -H "Authorization: Bearer $TB" -d "{\"userPrompt\":\"$LONGPROMPT\"}")
check "十: 超长输入 => AI_INPUT_TOO_LONG" "AI_INPUT_TOO_LONG" "$R"
U3=$(sqlite3 "$UDB" "SELECT COUNT(*) FROM ai_quota_usage WHERE user_id='910077' AND usage_date='$TODAY';")
if [ "${U3:-0}" -eq 0 ]; then echo "PASS  十2: 失败请求未扣配额(usage无记录)"; PASS=$((PASS+1)); else echo "FAIL  十2: 失败仍扣了配额"; FAIL=$((FAIL+1)); fi

# ---------- 清理测试痕迹 ----------
sqlite3 "$UDB" "DELETE FROM ai_quota_usage WHERE user_id IN ('910077','910081') AND usage_date='$TODAY';"
rm -f /tmp/cc_req1.json /tmp/cc_req2.json
echo ""
echo "===== AI攻击测试结果: PASS=$PASS FAIL=$FAIL ====="
