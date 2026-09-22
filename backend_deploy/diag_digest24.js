const { getDb } = require('/www/yandaoguoxue-backend/wechatOaDb');
const db = getDb();
const r2 = db.prepare('SELECT article_id, length(digest) AS n FROM wechat_articles WHERE article_id IN (17,18,24,25,26)').all();
for (const x of r2) console.log(`#${x.article_id} digest_len=${x.n}`);
