#!/bin/bash
# ============================================================================
# v25.0.47（FINAL-CLEAN-RC-01）: 行业资讯后台管理路由部署
# 1. 检查 newsRoutes.js（由本地 scp 上传到 /www/yandaoguoxue-backend/）
# 2. 幂等 patch server.js：注册 newsRoutes 到路由表（公开 /api/news + 管理 /api/admin/news）
# 3. pm2 重启 + 公网验证（公开读取 / 合规拦截 / 管理员鉴权）
# ============================================================================
set -euo pipefail
BACKEND="/www/yandaoguoxue-backend"
PM2_NAME="yandaoguoxue-backend"

cd "$BACKEND"

echo "[1] 检查 newsRoutes.js"
test -f newsRoutes.js || { echo "FATAL: newsRoutes.js 未上传"; exit 1; }
node -e "require('./newsRoutes.js'); console.log('module syntax OK')"

echo "[2] 幂等 patch server.js"
if grep -q "newsRoutes" server.js; then
  echo "server.js 已注册 newsRoutes，跳过 patch"
else
  cp server.js "server.js.bak.$(date +%Y%m%d%H%M%S)"
  node <<'EOF'
const fs = require("fs");
let s = fs.readFileSync("server.js", "utf8");
if (s.includes("newsRoutes")) {
  console.log("ALREADY_PATCHED");
  process.exit(0);
}
// 路由注册表锚点：任一已知条目命中即可（server.js 各版本演进，取最后命中行之后插入）
const anchors = [
  "  { file: 'socialStorageRoutes', path: '/api/social', name: '社交存储' },",
  "  { file: 'socialApiRoutes', path: '/api/social', name: '社交API' },",
  "  { file: 'academyRoutes', path: '/api/academy', name: '言道学堂' },",
  "  { file: 'posterConfigRoutes', path: '/api/admin', name: '海报配置' },",
  "  { file: 'shareConfigRoutes', path: '/api/admin', name: '分享配置' },",
  "  { file: 'pointsConfigRoutes', path: '/api/admin', name: '积分配置' },",
];
let insertAt = -1;
let anchorLine = null;
for (const a of anchors) {
  const idx = s.indexOf(a);
  if (idx !== -1) {
    insertAt = idx + a.length;
    anchorLine = a;
  }
}
if (insertAt === -1) {
  // 兜底：正则匹配任意 xxxRoutes 注册行
  const m = s.match(/^\s*\{ file: '\w+Routes', path: '\/api\/[^']+', name: '[^']+' \},\s*$/m);
  if (m) {
    insertAt = s.indexOf(m[0]) + m[0].length;
    anchorLine = m[0];
  }
}
if (insertAt === -1) {
  console.error("FATAL: 路由注册表锚点未找到，请人工检查 server.js 路由表结构");
  process.exit(1);
}
console.log("锚点命中: " + anchorLine.trim());
const entries =
  "\n  { file: 'newsRoutes', path: '/api/news', name: '行业资讯' }," +
  "\n  { file: 'newsRoutes', path: '/api/admin/news', name: '资讯管理' },";
s = s.slice(0, insertAt) + entries + s.slice(insertAt);
fs.writeFileSync("server.js", s, "utf8");
console.log("PATCHED");
EOF
  node --check server.js
  echo "server.js 语法检查通过"
fi

echo "[3] pm2 重启"
pm2 restart "$PM2_NAME" --update-env
sleep 3
pm2 status "$PM2_NAME" | head -10

echo "[4] 接口验证"
BASE="http://127.0.0.1:3001"
echo "--- 公开读取（应返回 success:true + 资讯数组） ---"
curl -s "$BASE/api/news/public?page=1&pageSize=3" | head -c 400
echo ""
echo "--- 管理接口未带密钥（应返回 未授权） ---"
curl -s "$BASE/api/admin/news" | head -c 200
echo ""
echo "--- 管理接口带密钥（应返回 success:true） ---"
ADMIN_KEY="${ADMIN_API_KEY:-WUzhimin123}"
curl -s "$BASE/api/admin/news" -H "Authorization: Bearer $ADMIN_KEY" | head -c 300
echo ""
echo "--- 合规拦截测试（新增含'全网第一'的资讯应被拒） ---"
curl -s -X POST "$BASE/api/admin/news" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_KEY" \
  -d '{"title":"全网第一的养生课程","summary":"测试合规拦截的摘要内容超过十个字","source":"测试源","sourceUrl":"https://example.com","publishedAt":"2026-08-21T00:00:00Z","category":"zhongyi"}' | head -c 300
echo ""
echo "--- 数据文件落盘 ---"
test -f data/news_items.json && echo "data/news_items.json OK ($(wc -c < data/news_items.json) bytes)" || echo "FATAL: data/news_items.json 未生成"
echo "NEWS-ROUTES-DEPLOY-DONE"
