#!/bin/bash
# ============================================================================
# v25.0.78 P6b: 行业资讯 AI 定时维护部署
#   ① newsAiScheduler.js 由本地 scp 上传到 /www/yandaoguoxue-backend/
#   ② 语法检查 + 首次手动运行（AI 主路径 / 模板池降级均验证）
#   ③ crontab 安装（幂等）：每日 07:10 补充资讯条目
#   ④ 公网验证 /api/news/public 首页出现当日新条目
# 流程执行完毕后，行业资讯实现 AI 每日自动维护（保鲜不再依赖人工后台录入）
# ============================================================================
set -euo pipefail
BACKEND="/www/yandaoguoxue-backend"
PM2_NAME="yandaoguoxue-backend"
SITE="https://yandaoguoxue.yandao.vip"

cd "$BACKEND"

echo "=== [0] 服务器校验（部署纪律：唯一生产服务器 82.156.228.87） ==="
PUBIP=$(curl -s -m 8 ifconfig.me || true)
echo "public ip: ${PUBIP}"
[ "${PUBIP}" = "82.156.228.87" ] || { echo "FATAL: 公网IP非82.156.228.87，禁止部署"; exit 1; }

echo "=== [1] 检查 newsAiScheduler.js"
test -f newsAiScheduler.js || { echo "FATAL: newsAiScheduler.js 未上传（先执行: scp backend_deploy/newsAiScheduler.js root@82.156.228.87:/www/yandaoguoxue-backend/）"; exit 1; }
node --check newsAiScheduler.js
echo "语法检查通过"

echo "=== [2] crontab 安装（幂等：已有则跳过） ==="
CRON_LINE="10 7 * * * cd /www/yandaoguoxue-backend && node newsAiScheduler.js >> /www/yandaoguoxue-backend/logs/news_ai.log 2>&1 # yandao-news-ai"
if crontab -l 2>/dev/null | grep -qF "yandao-news-ai"; then
  echo "crontab 已存在 yandao-news-ai，跳过"
else
  (crontab -l 2>/dev/null || true; echo "$CRON_LINE") | crontab -
  echo "crontab 已安装: 每日 07:10"
fi
crontab -l | grep -F "yandao-news-ai"

echo "=== [3] 首次手动运行（生成当日资讯） ==="
mkdir -p logs
node newsAiScheduler.js || { echo "FATAL: 首次运行失败，检查上方日志"; exit 1; }

echo "=== [4] 数据落盘检查 ==="
test -f data/news_items.json || { echo "FATAL: data/news_items.json 未生成"; exit 1; }
echo "news_items.json OK ($(wc -c < data/news_items.json) bytes)"
node -e "const d=require('./data/news_items.json'); console.log('总条数:', d.items.length, '| 最新条目:', d.items[0].title, '| 日期:', d.items[0].publishedAt.slice(0,10))"

echo "=== [5] 公网验证（/api/news/public 首条应为今日新增） ==="
sleep 1
curl -s "$SITE/api/news/public?page=1&pageSize=3" | head -c 500
echo ""

echo "=== [6] AI 凭据探测（主路径是否可用） ==="
if [ -f .env ] && grep -q "^HUNYUAN_API_KEY=..*" .env; then
  echo "HUNYUAN_API_KEY 已配置 → 明日起走 AI 生成主路径"
else
  echo "HUNYUAN_API_KEY 未配置 → 走模板池降级（每日仍保鲜），建议配置后自动切换 AI 主路径"
fi

echo "NEWS-AI-DEPLOY-DONE"