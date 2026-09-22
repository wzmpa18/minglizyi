// v25.0.88 后续：服务号文章重复问题诊断（只读，零积分）
const { getDb } = require('/www/yandaoguoxue-backend/wechatOaDb');
const db = getDb();

const cols = db.prepare("PRAGMA table_info(wechat_articles)").all().map(c => c.name);
console.log('COLS:', cols.join(','));

const rows = db.prepare("SELECT * FROM wechat_articles ORDER BY created_at DESC").all();
console.log('TOTAL:', rows.length);

// 按状态统计
const byStatus = {};
for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
console.log('BY_STATUS:', JSON.stringify(byStatus));

// 全量清单（标题去空格比对）
console.log('\n===== 全部文章 =====');
for (const r of rows) {
  console.log([r.id, r.status, r.created_at, r.title].join(' | '));
}

// 标题完全重复检测
console.log('\n===== 标题重复(原文比对) =====');
const tmap = {};
for (const r of rows) {
  const k = String(r.title || '').trim();
  (tmap[k] = tmap[k] || []).push(r.id + '/' + r.status);
}
for (const [k, v] of Object.entries(tmap)) if (v.length > 1) console.log(`x${v.length} [${v.join(', ')}] ${k}`);

// 标题相似检测（去标点/数字后比对 + 关键词近似）
console.log('\n===== 标题近似(规范化后比对) =====');
const norm = s => String(s || '').replace(/[\s，。！？、：；""''·—\-《》()（）\d]/g, '');
const nmap = {};
for (const r of rows) {
  const k = norm(r.title);
  if (!k) continue;
  (nmap[k] = nmap[k] || []).push({ id: r.id, st: r.status, t: r.title });
}
for (const [k, v] of Object.entries(nmap)) if (v.length > 1) {
  console.log(`--- 规范化"${k}" 出现${v.length}次:`);
  for (const it of v) console.log(`    ${it.id}/${it.st}: ${it.t}`);
}
