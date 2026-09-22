// 一次性诊断：历史文章 + 草稿箱状态 + 智谱配置（只读）
const { getDb } = require('/www/yandaoguoxue-backend/wechatOaDb');
const db = getDb();

const rows = db.prepare('SELECT article_id, status, safety_status, created_at, title, wechat_media_id FROM wechat_articles ORDER BY article_id').all();
console.log('TOTAL_ARTICLES:', rows.length);
const byStatus = {};
for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
console.log('BY_STATUS:', JSON.stringify(byStatus));
console.log('===== ALL ARTICLES =====');
for (const r of rows) {
  console.log([r.article_id, r.status, r.safety_status, r.created_at.slice(0, 10), r.wechat_media_id ? 'SYNCED' : '-', r.title].join(' | '));
}

const topics = db.prepare("SELECT topic_id, keyword, cluster, status, run_date FROM wechat_topic_candidates ORDER BY topic_id DESC LIMIT 30").all();
console.log('===== RECENT TOPICS =====');
for (const t of topics) console.log([t.topic_id, t.keyword, t.cluster, t.status, t.run_date].join(' | '));

console.log('===== ENV =====');
console.log('ZHIPU_KEY_SET:', !!process.env.ZHIPU_API_KEY);
console.log('ZHIPU_MODEL:', process.env.ZHIPU_MODEL || '(unset)');
console.log('ZHIPU_URL:', process.env.ZHIPU_API_URL || '(unset)');
console.log('HUNYUAN_KEY_SET:', !!process.env.HUNYUAN_API_KEY);
console.log('HUNYUAN_MODEL:', process.env.HUNYUAN_MODEL || '(unset)');
console.log('WECHAT_CONTENT_MODEL:', process.env.WECHAT_CONTENT_MODEL || '(unset)');
console.log('DEEPSEEK_KEY_SET:', !!process.env.DEEPSEEK_API_KEY);

// 近7天AI成本
try {
  const cost = db.prepare("SELECT COUNT(*) n, COALESCE(SUM(estimated_cost),0) c FROM ai_call_logs WHERE scene='wechat_content' AND created_at > datetime('now','localtime','-7 day')").get();
  console.log('AI_7D:', JSON.stringify(cost));
} catch (e) { console.log('AI_7D_ERR:', e.message); }
