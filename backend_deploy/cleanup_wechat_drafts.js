// v25.0.88 后续：清理服务号草稿箱 4 篇积压旧稿（9/2 批次，用户判定重复）
// 保留：秋分之后身体掉电（用户认可的"秋风"篇）
const { getAccessToken } = require('/www/yandaoguoxue-backend/wechatTokenManager');
const { getDb } = require('/www/yandaoguoxue-backend/wechatOaDb');
const WX_BASE = 'https://api.weixin.qq.com/cgi-bin';

// 待删 4 篇（标题 = 数据库 WECHAT_DRAFT 中除秋分外的全部）
const TO_DELETE_TITLES = [
  '内经研习②“女七男八”：两千年前的一张生命周期表',
  '八字排盘入门：从零开始认识你的出生密码',
  '罗盘二十四山：从方位符号到文化解码',
  '二十八宿入门指南：从零开始看懂星宿布局',
];

async function main() {
  const token = await getAccessToken();
  const db = getDb();

  // 从数据库拿 wechat_media_id（与草稿箱 media_id 一致）
  for (const title of TO_DELETE_TITLES) {
    const row = db.prepare("SELECT article_id, title, wechat_media_id, status FROM wechat_articles WHERE title = ?").get(title);
    if (!row) { console.log('DB_SKIP(不存在):', title); continue; }
    console.log('处理:', row.article_id, '|', title, '| media_id=', (row.wechat_media_id || '').slice(0, 20));

    // ① 微信草稿删除
    if (row.wechat_media_id) {
      const res = await fetch(`${WX_BASE}/draft/delete?access_token=${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_id: row.wechat_media_id }),
      });
      const data = await res.json();
      console.log('   微信draft/delete:', JSON.stringify(data));
    }
    // ② 数据库归档（保留记录可追溯，不再参与任何同步）
    db.prepare("UPDATE wechat_articles SET status = 'ARCHIVED', wechat_draft_id = '', wechat_media_id = '', updated_at = datetime('now','localtime') WHERE article_id = ?").run(row.article_id);
    console.log('   数据库 → ARCHIVED OK');
  }

  // 验证：草稿箱剩余
  const res = await fetch(`${WX_BASE}/draft/count?access_token=${token}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  console.log('\n草稿箱剩余:', JSON.stringify(await res.json()));

  // 验证：数据库状态分布
  const st = {};
  for (const r of db.prepare("SELECT status, COUNT(*) n FROM wechat_articles GROUP BY status").all()) st[r.status] = r.n;
  console.log('数据库状态分布:', JSON.stringify(st));
  console.log('仍为 WECHAT_DRAFT 的:');
  for (const r of db.prepare("SELECT article_id, title FROM wechat_articles WHERE status = 'WECHAT_DRAFT'").all()) {
    console.log('  -', r.article_id, r.title);
  }
}
main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
