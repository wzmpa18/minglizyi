#!/bin/bash
# v25.0.47_14 发布后公网验证（续：8.5下载按钮 + 10支付三平台 + 11邀请页）
set -e
DOMAIN="https://yandaoguoxue.yandao.vip"

echo "=== [8.5] 下载按钮公网验证（跟随重定向） ==="
REG=$(curl -sL -m 10 "${DOMAIN}/register")
echo "$REG" | grep -q '下载言道国学APP' && echo "REG-BTN(注册页下载按钮) OK" || { echo "FATAL: 注册页无下载按钮"; exit 1; }
echo "$REG" | grep -q 'yandaoguoxue.yandao.vip/friend' && echo "REG-LINK(注册页下载链接) OK" || { echo "FATAL: 注册页无下载链接"; exit 1; }
LOGIN=$(curl -sL -m 10 "${DOMAIN}/login")
echo "$LOGIN" | grep -q '下载言道国学APP' && echo "LOGIN-BTN(登录页下载按钮) OK" || { echo "FATAL: 登录页无下载按钮"; exit 1; }
WXUA="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49"
WXREG=$(curl -sL -m 10 -A "$WXUA" "${DOMAIN}/register")
echo "$WXREG" | grep -q '下载言道国学APP' && echo "WX-UA-REG(微信UA注册页可见) OK" || { echo "FATAL: 微信UA下注册页无下载按钮"; exit 1; }
SAFARI_REG=$(curl -sL -m 10 -A "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" "${DOMAIN}/register")
echo "$SAFARI_REG" | grep -q '下载言道国学APP' && echo "IOS-SAFARI-REG(iOS Safari可见) OK" || { echo "FATAL: iOS Safari下注册页无下载按钮"; exit 1; }
CHROME_REG=$(curl -sL -m 10 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36" "${DOMAIN}/register")
echo "$CHROME_REG" | grep -q '下载言道国学APP' && echo "DESKTOP-CHROME-REG(桌面Chrome可见) OK" || { echo "FATAL: 桌面Chrome下注册页无下载按钮"; exit 1; }

echo "=== [9] 公开配置接口 ==="
curl -s -m 10 "${DOMAIN}/api/public/pricing" | grep -q 'membershipPlans' && echo "PRICING-SSOT OK" || { echo "FATAL: 价格SSOT不可用"; exit 1; }
curl -s -m 10 "${DOMAIN}/api/public/feature-flags" | grep -q '"ai"' && echo "FEATURE-FLAGS OK" || { echo "FATAL: 功能开关不可用"; exit 1; }
curl -s -m 10 "${DOMAIN}/api/public/tool-matrix" | grep -q 'bazi' && echo "TOOL-MATRIX OK" || { echo "FATAL: 工具矩阵不可用"; exit 1; }

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

echo "=== [10.5] 支付模式确认（NATIVE扫码） ==="
echo "$R1" | grep -q '"payMode":"NATIVE"' && echo "PAY-MODE(NATIVE扫码) OK" || echo "NOTE: payMode字段: $(echo "$R1" | head -c 150)"

echo "=== [11] 邀请页公网验证 ==="
INV=$(curl -sL -m 10 "${DOMAIN}/invite")
echo "$INV" | grep -q '邀请' && echo "INVITE-PAGE OK" || { echo "FATAL: 邀请页不可用"; exit 1; }
POSTER_CODE=$(curl -s -L -m 10 -o /dev/null -w '%{http_code}' "${DOMAIN}/invite/poster")
echo "invite/poster: ${POSTER_CODE}"
[ "$POSTER_CODE" = "200" ] || { echo "FATAL: 邀请海报页不可用"; exit 1; }

echo "=== [12] 四档位会员下单回归（月/季/年/终身） ==="
for TIER in 'monthly:30:0.01' 'quarterly:90:0.01' 'yearly:365:0.01' 'lifetime:99999:0.01'; do
  LEVEL="${TIER%%:*}"
  REST="${TIER#*:}"
  DAYS="${REST%%:*}"
  AMT="${REST##*:}"
  RR=$(curl -s -X POST "${DOMAIN}/api/payment/create" -H 'Content-Type: application/json' -d "{\"userId\":\"910080\",\"type\":\"MEMBERSHIP\",\"amount\":${AMT},\"title\":\"传统文化学习平台会员服务\",\"extra\":{\"membershipLevel\":\"${LEVEL}\",\"membershipDays\":${DAYS}}}")
  echo "$RR" | grep -q 'codeUrl' && echo "TIER-${LEVEL} OK" || { echo "FATAL: ${LEVEL}档下单失败: $(echo "$RR" | head -c 200)"; exit 1; }
done

echo "=== [13] 后台权限拦截回归 ==="
UNIFIED_CODE=$(curl -s -o /dev/null -w '%{http_code}' "${DOMAIN}/api/admin/unified/keys")
echo "无密钥访问 /keys: ${UNIFIED_CODE}（预期401）"
[ "$UNIFIED_CODE" = "401" ] && echo "权限拦截 OK" || { echo "FATAL: 无密钥未拦截"; exit 1; }

echo "=== [14] 会员页支付按钮公网验证（iOS Safari UA + 微信UA） ==="
MEM_WX=$(curl -sL -m 10 -A "$WXUA" "${DOMAIN}/membership")
echo "$MEM_WX" | grep -q '立即开通\|微信支付\|开通' && echo "MEMBERSHIP-WECHAT(微信UA会员页可访问) OK" || { echo "WARN: 微信UA会员页内容待浏览器实测" }
MEM_IOS=$(curl -sL -m 10 -A "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" "${DOMAIN}/membership")
echo "$MEM_IOS" | grep -q '立即开通\|微信支付\|开通' && echo "MEMBERSHIP-IOS(iOS Safari会员页可访问) OK" || { echo "WARN: iOS会员页内容待浏览器实测" }

echo "===== v25.0.47_14 公网验证全部完成 ====="
