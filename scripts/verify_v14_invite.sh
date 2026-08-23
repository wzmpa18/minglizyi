#!/bin/bash
# v25.0.47_14 邀请API全链路公网验证（JWT token方式）
set -e
DOMAIN="https://yandaoguoxue.yandao.vip"
BACKEND_DIR="/www/yandaoguoxue-backend"

echo "=== [A] 生成测试用户 910080 的访问令牌 ==="
cat > /tmp/gen_token_v14.js <<'JSEOF'
const fs = require('fs');
const path = '/www/yandaoguoxue-backend/.env';
const env = fs.readFileSync(path, 'utf8');
const secret = (env.match(/^JWT_SECRET=(.+)$/m) || [])[1];
if (!secret) { console.error('JWT_SECRET not found'); process.exit(1); }
const jwt = require('/www/yandaoguoxue-backend/node_modules/jsonwebtoken');
console.log(jwt.sign({ userId: 910080 }, secret.trim(), { expiresIn: '1h' }));
JSEOF
TOKEN=$(node /tmp/gen_token_v14.js 2>/dev/null | tail -1)
if [ -z "$TOKEN" ]; then
  echo "FATAL: token生成失败"
  node /tmp/gen_token_v14.js 2>&1 | head -5
  exit 1
fi
echo "token生成成功（长度 ${#TOKEN}）"

echo "=== [B] 邀请链接API（二维码数据源） ==="
LINK_RESP=$(curl -s -m 10 -H "Authorization: Bearer ${TOKEN}" "${DOMAIN}/api/auth/invite/link")
echo "$LINK_RESP" | head -c 400; echo
echo "$LINK_RESP" | grep -q 'inviteCode' && echo "INVITE-LINK(邀请链接API) OK" || { echo "FATAL: 邀请链接API失败: $(echo "$LINK_RESP" | head -c 200)"; exit 1; }
echo "$LINK_RESP" | grep -q 'inviteLink' && echo "INVITE-LINK-URL(签名链接) OK" || { echo "FATAL: 缺少签名链接"; exit 1; }
echo "$LINK_RESP" | grep -q 'inviteSig' && echo "INVITE-SIG(防伪签名) OK" || { echo "FATAL: 缺少防伪签名"; exit 1; }

echo "=== [C] 邀请概览API ==="
OV_RESP=$(curl -s -m 10 -H "Authorization: Bearer ${TOKEN}" "${DOMAIN}/api/auth/invite/overview")
echo "$OV_RESP" | head -c 300; echo
echo "$OV_RESP" | grep -q 'totalInvites' && echo "INVITE-OVERVIEW(邀请概览API) OK" || { echo "FATAL: 邀请概览API失败"; exit 1; }

echo "=== [D] 无token访问邀请API（预期401） ==="
NO_AUTH=$(curl -s -o /dev/null -w '%{http_code}' "${DOMAIN}/api/auth/invite/link")
echo "无token: ${NO_AUTH}（预期401）"
[ "$NO_AUTH" = "401" ] && echo "INVITE-AUTH-GATE(鉴权拦截) OK" || { echo "FATAL: 邀请API未鉴权"; exit 1; }

echo "=== [E] 邀请页静态资源完整性（页面+海报引擎chunk） ==="
INV_HTML=$(curl -sL -m 10 "${DOMAIN}/invite/")
echo "$INV_HTML" | grep -q '_next' && echo "INVITE-PAGE-CHUNKS(页面chunk引用) OK" || { echo "FATAL: 邀请页无chunk引用"; exit 1; }
POSTER_HTML=$(curl -sL -m 10 "${DOMAIN}/invite/poster/")
echo "$POSTER_HTML" | grep -q '_next' && echo "POSTER-PAGE-CHUNKS(海报页chunk引用) OK" || { echo "FATAL: 海报页无chunk引用"; exit 1; }

echo "===== 邀请API全链路验证完成 ====="
