#!/bin/bash
# 清今日选题+任务记录，按新章节信号重跑
cd /www/yandaoguoxue-backend
node <<'EOF'
const { getDb } = require('./wechatOaDb');
const db = getDb();
db.prepare("DELETE FROM wechat_topic_candidates WHERE run_date = date('now','localtime')").run();
db.prepare("DELETE FROM wechat_content_jobs WHERE run_date = date('now','localtime') AND stage = 'topics'").run();
console.log('CLEANED');
EOF
node wechatContentScheduler.js --stage=topics
node <<'EOF'
const { getDb } = require('./wechatOaDb');
const rows = getDb().prepare("SELECT keyword, internal_score, final_score FROM wechat_topic_candidates WHERE run_date = date('now','localtime') ORDER BY final_score DESC").all();
console.log(JSON.stringify(rows, null, 0));
EOF
