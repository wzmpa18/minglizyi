// 抽查#28正文（扩写合并质量）
const { getDb } = require('/www/yandaoguoxue-backend/wechatOaDb');
const db = getDb();
const r = db.prepare('SELECT content_html, digest FROM wechat_articles WHERE article_id = 28').get();
console.log('digest:', r.digest);
const text = r.content_html.replace(/<[^>]+>/g, '\n').replace(/\n{2,}/g, '\n').trim();
console.log('===== 正文纯文本（段落间以---分隔）=====');
console.log(text.split('\n').filter(Boolean).join('\n---\n').slice(0, 3200));
