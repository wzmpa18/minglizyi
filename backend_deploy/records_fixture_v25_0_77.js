// ============================================================================
// v25.0.77 会员专属云端同步 fixture（服务器 /www/yandaoguoxue-backend 下运行）
// 用法：node records_fixture_v25_0_77.js
// 产品规则：非会员本地保存，会员云端同步。验证前后端双层门禁：
//   前端 recordSync.canCloudSyncRecords + 后端 /api/auth/records/save 会员校验
// 测试账号 910077（member档）/ 910078（basic档）
// ============================================================================
process.env.DB_PATH = '/root/backend-auth/data/yandao_users.db';
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '/www/yandaoguoxue-backend/.env' });

const API = 'http://127.0.0.1:3001';
const MEMBER_ID = 910077;
const FREE_ID = 910078;
const MARK = 'fixture_v25_0_77_' + Date.now();
const db = new Database(process.env.DB_PATH);

let PASS = 0, FAIL = 0;
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + (detail || '')}`); ok ? PASS++ : FAIL++; };

function tokenFor(userId) {
  return jwt.sign({ userId, phone: String(userId) }, process.env.JWT_SECRET, { expiresIn: '2h' });
}
async function api(method, path, body, userId) {
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokenFor(userId) };
  const r = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, json: j };
}
function cleanupFixtureRecords() {
  db.prepare("DELETE FROM user_records WHERE note LIKE 'fixture%'").run();
}
function ensureUsers() {
  db.prepare(`INSERT OR IGNORE INTO users (user_id, phone, password_hash, nickname, member_level, membership_expiry)
    VALUES (?, ?, 'fixture', 'fixture-member', 'lifetime', NULL)`).run(MEMBER_ID, String(MEMBER_ID));
  db.prepare(`INSERT OR IGNORE INTO users (user_id, phone, password_hash, nickname, member_level, membership_expiry)
    VALUES (?, ?, 'fixture', 'fixture-free', 'basic', NULL)`).run(FREE_ID, String(FREE_ID));
}

async function main() {
  console.log('===== v25.0.77 会员专属云端同步 fixture =====');
  ensureUsers();
  cleanupFixtureRecords();

  // ---- T1 会员保存成功 ----
  const memberSave = await api('POST', '/api/auth/records/save', {
    record_type: 'bazi',
    record_data: { inputParams: { year: 1990, month: 1, day: 1 }, _mark: MARK },
    note: 'fixture-member-' + MARK,
  }, MEMBER_ID);
  check('T1.1 会员保存 success（200）', memberSave.status === 200 && memberSave.json && memberSave.json.success === true,
    JSON.stringify(memberSave.json).slice(0, 120));
  const recId = memberSave.json && memberSave.json.data && memberSave.json.data.record_id;
  check('T1.2 返回 record_id', !!recId, 'recId=' + recId);

  // ---- T2 非会员保存被服务端拦截（403） ----
  const freeSave = await api('POST', '/api/auth/records/save', {
    record_type: 'bazi',
    record_data: { inputParams: { year: 1995, month: 6, day: 15 }, _mark: MARK },
    note: 'fixture-free-' + MARK,
  }, FREE_ID);
  check('T2.1 非会员云端保存被拒（403）', freeSave.status === 403, 'status=' + freeSave.status);
  check('T2.2 返回会员权益提示', !!(freeSave.json && /会员/.test(freeSave.json.message || '')), JSON.stringify(freeSave.json).slice(0, 100));

  // ---- T3 非会员零入库（物理事实） ----
  const freeRows = db.prepare('SELECT COUNT(*) AS n FROM user_records WHERE user_id=?').get(FREE_ID);
  check('T3.1 非会员记录零入库', freeRows.n === 0, 'n=' + freeRows.n);

  // ---- T4 过期会员拦截（member_level=yearly 但已过期） ----
  db.prepare('UPDATE users SET member_level=?, membership_expiry=? WHERE user_id=?')
    .run('yearly', new Date(Date.now() - 86400000).toISOString(), FREE_ID);
  const expiredSave = await api('POST', '/api/auth/records/save', {
    record_type: 'bazi', record_data: { x: 1 }, note: 'fixture-expired-' + MARK,
  }, FREE_ID);
  check('T4.1 过期会员云端保存被拒（403）', expiredSave.status === 403, 'status=' + expiredSave.status);
  db.prepare('UPDATE users SET member_level=?, membership_expiry=? WHERE user_id=?').run('basic', null, FREE_ID);

  // ---- T5 会员记录可查（list 链路不受门禁影响） ----
  const listMember = await api('GET', '/api/auth/records/list?type=bazi', null, MEMBER_ID);
  const memberRecs = listMember.json && listMember.json.data && listMember.json.data.records || [];
  check('T5.1 会员记录可查到新保存', memberRecs.some(r => r.note === 'fixture-member-' + MARK), 'count=' + memberRecs.length);

  // ---- T6 删除链路（会员删自己的记录） ----
  const del = await api('DELETE', '/api/auth/records/' + recId, null, MEMBER_ID);
  check('T6.1 会员删除 success', del.status === 200 && del.json && del.json.success === true, JSON.stringify(del.json).slice(0, 100));

  // ---- T7 物理清零 ----
  const row = db.prepare('SELECT COUNT(*) AS n FROM user_records WHERE note LIKE ?').get('fixture%');
  check('T7.1 fixture 记录已清零（不残留）', row.n === 0, 'n=' + row.n);

  cleanupFixtureRecords();
  console.log(`\n结果: PASS=${PASS} FAIL=${FAIL}`);
  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
