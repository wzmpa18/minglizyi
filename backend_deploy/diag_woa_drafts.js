// 检查微信草稿箱实际状态 + 秋分文章尾部结构（医疗声明/话题钩子）
const { getDb } = require('/www/yandaoguoxue-backend/wechatOaDb');
const { getAccessToken } = require('/www/yandaoguoxue-backend/wechatTokenManager');

(async () => {
  const db = getDb();
  const token = await getAccessToken();
  const res = await fetch(`https://api.weixin.qq.com/cgi-bin/draft/batchget?access_token=${token}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ offset: 0, count: 10, no_content: 1 }),
  });
  const data = await res.json();
  console.log('DRAFT_TOTAL:', JSON.stringify(data.total_count));
  for (const it of data.news_item || []) {
    console.log('DRAFT:', it.title);
  }
  const row = db.prepare("SELECT content_html FROM wechat_articles WHERE article_id = 14").get();
  const html = String(row.content_html);
  console.log('===== QIUFEN_TAIL (last 800 chars) =====');
  console.log(html.slice(-800));
  console.log('===== QIUFEN_LEN:', html.length);
})();
