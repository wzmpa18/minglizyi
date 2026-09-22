const { getDb } = require('/www/yandaoguoxue-backend/wechatOaDb');
const db = getDb();
const row = db.prepare('SELECT content_html, title, digest FROM wechat_articles WHERE article_id = 14').get();
console.log('TITLE:', row.title);
console.log('DIGEST:', row.digest);
console.log('=== 正文 ===');
const text = row.content_html.replace(/<[^>]+>/g, '\n');
for (const line of text.split('\n')) {
  const t = line.trim();
  if (t) console.log(t);
}
