#!/bin/bash
# 登录态端到端验证 v2：本地签发测试JWT（与后端同密钥），带 Bearer 调公网 API
# 仅只读验证数据通路，不产生任何写入

node -e '
const jwt = require("/www/yandaoguoxue-backend/node_modules/jsonwebtoken");
const fs = require("fs");
const raw = fs.readFileSync("/www/yandaoguoxue-backend/.env", "utf8");
const m = raw.match(/^JWT_SECRET=(.*)$/m);
const SECRET = m ? m[1].trim() : "";
const token = jwt.sign({ userId: 0, phone: null, email: null }, SECRET, { expiresIn: "10m" });
fs.writeFileSync("/tmp/qz_test_token.txt", token);
console.log("token signed:", token.slice(0, 30) + "...");
'

TOKEN=$(cat /tmp/qz_test_token.txt)
B=https://yandaoguoxue.yandao.vip

echo "== 带token调公网 knowledge API =="
curl -sk -m 15 -H "Authorization: Bearer $TOKEN" \
  "$B/api/academy/knowledge?track=yixue&category=%E4%B8%83%E6%94%BF%E5%9B%9B%E4%BD%99&limit=1000" -o /tmp/qz_kp_auth.json
node -e '
const d = require("/tmp/qz_kp_auth.json");
console.log("success:", d.success, "| points:", d.points ? d.points.length : 0);
if (d.points && d.points.length) {
  const chapters = new Set(d.points.map(p => p.chapter));
  console.log("chapters:", chapters.size, "| sample title:", d.points[0].title, "| sample id:", d.points[0].id);
}
'

echo "== 带token调公网 questions API =="
curl -sk -m 15 -H "Authorization: Bearer $TOKEN" \
  "$B/api/academy/questions?track=yixue&category=%E4%B8%83%E6%94%BF%E5%9B%9B%E4%BD%99&limit=1000" -o /tmp/qz_q_auth.json
node -e '
const d = require("/tmp/qz_q_auth.json");
console.log("success:", d.success, "| questions:", d.questions ? d.questions.length : 0);
if (d.questions && d.questions.length) {
  const bound = d.questions.filter(q => q.knowledgeId).length;
  console.log("bound to knowledgeId:", bound + "/" + d.questions.length);
}
'

echo "== progress API（打卡链路） =="
curl -sk -m 15 -H "Authorization: Bearer $TOKEN" \
  "$B/api/academy/progress?track=yixue" | head -c 200
echo ""
