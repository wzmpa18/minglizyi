// 诊断：草稿箱原始结构（media_id 与 news_item 的对应关系）
const { getAccessToken } = require('/www/yandaoguoxue-backend/wechatTokenManager');
const WX_BASE = 'https://api.weixin.qq.com/cgi-bin';

async function main() {
  const token = await getAccessToken();
  const res = await fetch(`${WX_BASE}/draft/batchget?access_token=${token}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ offset: 0, count: 10, no_content: 1 }),
  });
  const data = await res.json();
  console.log('total:', data.total_count, 'item_count:', data.item_count);
  for (const it of data.item || []) {
    const items = (it.content && it.content.news_item) || [];
    console.log(`MEDIA[${it.media_id}] update=${new Date(it.update_time * 1000).toISOString().slice(0, 16)} 篇数=${items.length}`);
    items.forEach((a, i) => console.log(`   [${i}] ${a.title}`));
  }
}
main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
