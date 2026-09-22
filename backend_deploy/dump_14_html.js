const { getDb } = require('/www/yandaoguoxue-backend/wechatOaDb');
const db = getDb();
const row = db.prepare('SELECT content_html FROM wechat_articles WHERE article_id = 14').get();
const html = row.content_html;
for (const kw of ['后天早上', '每年入冬三五斤', '古人没有仪器', '掉到20%']) {
  const i = html.indexOf(kw);
  if (i < 0) { console.log(`\n### ${kw} NOT FOUND`); continue; }
  console.log(`\n### ${kw} @${i}`);
  console.log(html.slice(Math.max(0, i - 350), i + kw.length + 350));
}
