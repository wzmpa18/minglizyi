// 批次状态诊断（只读，零积分）：最近文章 + 草稿箱
const { getDb } = require('/www/yandaoguoxue-backend/wechatOaDb');
const { getDraftCount, getDraftList } = require('/www/yandaoguoxue-backend/wechatDraftService');

async function main() {
  const db = getDb();
  const rows = db.prepare("SELECT article_id, title, status, topic_id, created_at FROM wechat_articles WHERE status != 'DELETED' ORDER BY article_id DESC LIMIT 14").all();
  console.log('===== DB 最近文章（非DELETED）=====');
  for (const r of rows) {
    console.log(`#${r.article_id} [${r.status}] ${r.created_at || ''} ${r.title}`);
  }

  const cnt = await getDraftCount();
  console.log('\n===== 微信草稿箱 ===== total =', cnt.total_count);
  for (let off = 0; off < cnt.total_count; off += 5) {
    const list = await getDraftList(off, 5);
    for (const it of list.item || []) {
      for (const a of it.content.news_item || []) {
        console.log(`[draft ${it.media_id.slice(0, 10)}…] ${new Date((it.update_time || 0) * 1000).toISOString().slice(0, 16)} | ${a.title}`);
      }
    }
  }
  process.exit(0);
}
main().catch(e => { console.error('ERR', e.message); process.exit(1); });
