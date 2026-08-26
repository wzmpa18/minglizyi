#!/bin/bash
# ============================================================================
# FINAL-HANDOVER-20260826 自动回归（第四十二章）+ 社交冒烟（第八~十六章复核）
# 全部只读/测试账号操作，不触碰真实用户数据
# ============================================================================
BE=/www/yandaoguoxue-backend
BASE=https://yandaoguoxue.yandao.vip
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); echo "PASS  $1"; }
bad(){ FAIL=$((FAIL+1)); echo "FAIL  $1 ($2)"; }
page(){ local code=$(curl -sk -o /dev/null -m 20 -w '%{http_code}' "$BASE$1"); [ "$code" = "200" ] || [ "$code" = "301" ] || [ "$code" = "308" ] && ok "页面$1($code)" || bad "页面$1" "HTTP=$code"; }
api(){ local code=$(curl -sk -o /dev/null -m 20 -w '%{http_code}' "$BASE$1"); [ "$code" = "200" ] && ok "接口$1" || bad "接口$1" "HTTP=$code"; }

echo "===== A. 核心页面（首页/命理工具/中医/社交/学习/发现/分享/下载/后台） ====="
page "/"
page "/bazi/"
page "/ziwei/"
page "/qimen/"
page "/liuyao/"
page "/meihua/"
page "/zhongyi/"
page "/friends/"
page "/messages/"
page "/groups/"
page "/discover/"
page "/share/result/"
page "/download/"
page "/admin/"
page "/login/"

echo ""
echo "===== B. 关键API（鉴权接口401/403也算正常响应） ====="
api "/api/health"
echo "-- 无token AI额度(应401, 鉴权生效):"
code=$(curl -sk -o /dev/null -m 15 -w '%{http_code}' "$BASE/api/ai/quota")
[ "$code" = "401" ] && ok "AI额度无token被拒401" || bad "AI额度无token" "HTTP=$code(应401)"
api "/version.json"
echo "-- 匿名AI(应401):"
code=$(curl -sk -o /dev/null -m 15 -w '%{http_code}' -X POST "$BASE/api/ai/chat" -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"hi"}]}')
[ "$code" = "401" ] && ok "匿名AI被拒401" || bad "匿名AI" "HTTP=$code(应401)"
echo "-- APK唯一下载源(应200):"
code=$(curl -sk -o /dev/null -m 30 -w '%{http_code}' -r 0-1023 "$BASE/app-download/latest.apk")
[ "$code" = "206" ] || [ "$code" = "200" ] && ok "APK直链($code)" || bad "APK直链" "HTTP=$code"
echo "-- 根路径/latest.apk(应301到唯一源):"
code=$(curl -sk -o /dev/null -m 15 -w '%{http_code}' "$BASE/latest.apk")
[ "$code" = "301" ] && ok "根路径301跳转" || bad "根路径301" "HTTP=$code"

echo ""
echo "===== C. 社交冒烟（测试账号JWT，只读接口） ====="
TOKEN=$(cd $BE && node -e "require('dotenv').config({path:'.env'}); console.log(require('jsonwebtoken').sign({userId:910077,phone:'19800000099'}, process.env.JWT_SECRET, {expiresIn:'10m'}))")
soc(){ local code=$(curl -sk -o /dev/null -m 15 -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "$BASE/api/social$1"); [ "$code" = "200" ] && ok "社交$1" || bad "社交$1" "HTTP=$code"; }
soc "/friends/list"
soc "/groups"
soc "/posts"
soc "/notifications"
soc "/conversations"

echo ""
echo "===== D. 支付配置状态（不涉及真实支付） ====="
KEY=$(grep -oP 'ADMIN_API_KEY=\K.*' $BE/.env | head -1)
curl -sk -m 10 -H "Authorization: Bearer $KEY" "$BASE/api/admin/unified/overview" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
p=d.get('payment',{}); h=d.get('health',{})
print('  payment.mode:', p.get('mode'), '| nativeReady:', p.get('nativeReady'))
print('  health:', {k:v for k,v in sorted(h.items())})
print('  待处理举报:', d.get('moderation',{}).get('reportsPending'), '| 用户总数:', d.get('users',{}).get('total'), '| 会员数:', d.get('membership',{}).get('paid'))
print('  orders:', d.get('orders',{}).get('total'), '总/ PAID:', d.get('orders',{}).get('paid'), '| 累计收入¥:', d.get('orders',{}).get('revenueYuan'))
print('  gitCommit:', d.get('gitCommit'), '| version:', d.get('version'))
"

echo ""
echo "===== E. PM2与错误日志复查 ====="
pm2 list 2>/dev/null | grep yandaoguoxue-backend
echo "-- 今日PM2 error新增:"
tail -100 /root/.pm2/logs/yandaoguoxue-backend-error.log 2>/dev/null | grep -c "$(date +%Y-%m-%d)" || echo 0

echo ""
echo "回归结果: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" = "0" ] && echo "REGRESSION_ALL_PASS" || echo "REGRESSION_HAS_FAILURES"
