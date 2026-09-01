#!/bin/bash
# 批准七政四余选题 → 生成1篇文章（真实AI链路验证）
cd /www/yandaoguoxue-backend
node <<'EOF'
const { getDb } = require('./wechatOaDb');
const db = getDb();
db.prepare("UPDATE wechat_topic_candidates SET status = 'APPROVED' WHERE keyword = '七政四余' AND run_date = date('now','localtime')").run();
console.log('APPROVED qizheng topic');
EOF
node wechatContentScheduler.js --stage=generate
echo "===文章结果==="
node <<'EOF'
const { getDb } = require('./wechatOaDb');
const rows = getDb().prepare("SELECT article_id, topic_id, title, digest, safety_status, status, ai_model, word_count, created_at FROM wechat_articles ORDER BY article_id DESC LIMIT 3").all();
for (const r of rows) {
  console.log(`#${r.article_id} [${r.status}/${r.safety_status}] ${r.title} (${r.word_count}字 模型:${r.ai_model})`);
  console.log(`  摘要: ${r.digest}`);
}
const body = getDb().prepare("SELECT content_html FROM wechat_articles ORDER BY article_id DESC LIMIT 1").get();
console.log('正文HTML长度:', body ? body.content_html.length : 0);
EOF
echo "===Safety+草稿同步阶段（无AppSecret应优雅跳过）==="
node wechatContentScheduler.js --stage=safety
