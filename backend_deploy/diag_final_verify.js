const { getDb } = require('/www/yandaoguoxue-backend/wechatOaDb');
const fs = require('fs');
const db = getDb();
for (const id of [17, 28]) {
  const a = db.prepare('SELECT digest, content_html FROM wechat_articles WHERE article_id = ?').get(id);
  console.log('#' + id + ' digest: ' + (a.digest || '').slice(0, 130));
  fs.writeFileSync('/tmp/art_export/art_' + id + '_full.html', a.content_html);
}
