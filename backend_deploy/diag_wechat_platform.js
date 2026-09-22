// v25.0.88 后续：微信公众平台草稿箱/已发布真实状态诊断（只读，零积分）
const { getAccessToken } = require('/www/yandaoguoxue-backend/wechatTokenManager');
const { getDraftCount, getDraftList } = require('/www/yandaoguoxue-backend/wechatDraftService');
const WX_BASE = 'https://api.weixin.qq.com/cgi-bin';

async function main() {
  const token = await getAccessToken();
  console.log('TOKEN_OK len=', token.length);

  // 草稿箱总量
  const cnt = await getDraftCount();
  console.log('DRAFT_COUNT:', JSON.stringify(cnt));

  // 翻页拉全部草稿
  let total = cnt.total_count || 0;
  console.log('\n===== 草稿箱全部 (' + total + ' 篇) =====');
  for (let off = 0; off < total; off += 5) {
    const list = await getDraftList(off, 5);
    for (const it of list.item || []) {
      for (const a of it.content.news_item || []) {
        console.log(`[draft ${it.media_id.slice(0, 12)}…] ${it.update_time ? new Date(it.update_time * 1000).toISOString().slice(0, 16) : ''} | ${a.title}`);
      }
    }
  }

  // 已发布列表
  console.log('\n===== 已发布列表 =====');
  let off = 0;
  let publishedTotal = -1;
  while (true) {
    const res = await fetch(`${WX_BASE}/freepublish/batchget?access_token=${token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offset: off, count: 5, no_content: 1 }),
    });
    const data = await res.json();
    if (data.errcode && data.errcode !== 0) { console.log('ERR:', JSON.stringify(data)); break; }
    publishedTotal = data.total_count;
    for (const it of data.publish_page || []) {
      // publish_page 结构: [{publish_id, article_detail:{count, item:[{article_url, title...}]} }]
      const items = (it.article_detail && it.article_detail.item) || [];
      for (const a of items) {
        console.log(`[pub ${String(it.publish_id).slice(0, 12)}…] ${a.title}`);
      }
      if (!items.length) console.log('[pub]', JSON.stringify(it).slice(0, 150));
    }
    off += 5;
    if (off >= (data.total_count || 0)) break;
  }
  console.log('PUBLISHED_TOTAL:', publishedTotal);
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
