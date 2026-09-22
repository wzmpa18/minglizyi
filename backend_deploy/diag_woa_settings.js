// 查看存储设置 + 9/15批次选题分数分布（校准新集群保底分）
const { getDb, getSetting } = require('/www/yandaoguoxue-backend/wechatOaDb');
const db = getDb();
console.log('SETTINGS:', JSON.stringify(getSetting('wechat_content_settings', {}), null, 1));
const rows = db.prepare("SELECT topic_id, keyword, cluster, final_score, internal_score, content_gap_score, status FROM wechat_topic_candidates WHERE run_date = '2026-09-15' ORDER BY final_score DESC").all();
console.log('===== 2026-09-15 TOPICS =====');
for (const r of rows) console.log([r.topic_id, r.keyword, r.cluster, 'final=' + r.final_score, 'internal=' + r.internal_score, 'gap=' + r.content_gap_score, r.status].join(' | '));
console.log('===== CRON =====');
