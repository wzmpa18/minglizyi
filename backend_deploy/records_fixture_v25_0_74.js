// ============================================================================
// v25.0.74 排盘记录保存链路 fixture 验收（服务器 /www/yandaoguoxue-backend 下运行）
// 用法：node records_fixture_v25_0_74.js
// 验证用户反馈「排盘工具排盘记录不能保存」修复后的后端链路：
//   前端 clientStore.saveRecord → syncRecordToBackend → POST /api/auth/records/save
//   /records 页 ← GET /api/auth/records/list
// 测试账号 910077（与 zhenggu fixture 同款）
// ============================================================================
process.env.DB_PATH = '/root/backend-auth/data/yandao_users.db';
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '/www/yandaoguoxue-backend/.env' });

const API = 'http://127.0.0.1:3001';
const USER_ID = 910077;
const MARK = 'fixture_v25_0_74_' + Date.now();
const userToken = jwt.sign({ userId: USER_ID, phone: String(USER_ID) }, process.env.JWT_SECRET, { expiresIn: '2h' });
const AUTH = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + userToken };

let PASS = 0, FAIL = 0;
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + (detail || '')}`); ok ? PASS++ : FAIL++; };
const db = new Database(process.env.DB_PATH);

async function api(method, path, body, headers) {
  const r = await fetch(API + path, { method, headers: headers || AUTH, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, json: j };
}

function cleanupFixtureRecords() {
  db.prepare("DELETE FROM user_records WHERE user_id=? AND note LIKE 'fixture%'").run(USER_ID);
}

async function main() {
  console.log('===== v25.0.74 排盘记录链路 fixture =====');
  cleanupFixtureRecords();

  // ---- T1 保存（模拟 clientStore.makeBackendPayload 产出的 bazi payload） ----
  const baziPayload = {
    inputParams: { year: 1990, month: 1, day: 1, hour: 8, minute: 0, gender: 'male' },
    pillars: [{ gan: '庚', zhi: '午' }], _mark: MARK,
  };
  const save = await api('POST', '/api/auth/records/save', {
    record_type: 'bazi', record_data: baziPayload, note: 'fixture-' + MARK,
  });
  check('T1.1 保存接口 success', save.status === 200 && save.json && save.json.success === true, JSON.stringify(save.json).slice(0, 120));
  const recId = save.json && save.json.data && save.json.data.record_id;
  check('T1.2 返回 record_id', !!recId, 'recId=' + recId);

  // ---- T2 按类型查询（/records 页筛选标签走此参数） ----
  const listBazi = await api('GET', '/api/auth/records/list?type=bazi');
  const baziRecs = listBazi.json && listBazi.json.data && listBazi.json.data.records || [];
  const mine = baziRecs.find(r => r.note === 'fixture-' + MARK);
  check('T2.1 type=bazi 筛选可查到新记录', !!mine, 'count=' + baziRecs.length);
  check('T2.2 record_data 解析回对象（inputParams 完整）', !!(mine && mine.record_data && mine.record_data.inputParams && mine.record_data.inputParams.year === 1990), JSON.stringify(mine && mine.record_data).slice(0, 100));

  // ---- T3 全量列表（/records 页默认视图） ----
  const listAll = await api('GET', '/api/auth/records/list');
  const allRecs = listAll.json && listAll.json.data && listAll.json.data.records || [];
  check('T3.1 全量列表含新记录', allRecs.some(r => r.id === recId), 'total=' + allRecs.length);

  // ---- T4 鉴权拦截（未带 token） ----
  const noAuth = await fetch(API + '/api/auth/records/save', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ record_type: 'bazi', record_data: { x: 1 } }),
  });
  check('T4.1 无 token 保存被拒（401/403）', noAuth.status === 401 || noAuth.status === 403, 'status=' + noAuth.status);

  // ---- T5 参数校验 ----
  const badType = await api('POST', '/api/auth/records/save', { record_data: { x: 1 }, note: 'fixture-' + MARK });
  check('T5.1 空 record_type 拒绝（400）', badType.status === 400, 'status=' + badType.status);

  // ---- T6 超大 payload 防护（前端 makeBackendPayload 降级依赖后端 500KB 上限） ----
  const big = await api('POST', '/api/auth/records/save', {
    record_type: 'bazi', record_data: { blob: 'x'.repeat(500001) }, note: 'fixture-big-' + MARK,
  });
  check('T6.1 超 500KB 拒绝（400）', big.status === 400, 'status=' + big.status + ' body=' + JSON.stringify(big.json).slice(0, 80));

  // ---- T7 删除（/records 页删除按钮链路） ----
  const del = await api('DELETE', '/api/auth/records/' + recId);
  check('T7.1 删除 success', del.status === 200 && del.json && del.json.success === true, JSON.stringify(del.json).slice(0, 100));
  const listAfter = await api('GET', '/api/auth/records/list?type=bazi');
  const gone = !(listAfter.json && listAfter.json.data && listAfter.json.data.records || []).some(r => r.id === recId);
  check('T7.2 删除后列表不再包含', gone);

  // ---- T8 DB 物理事实 ----
  const row = db.prepare('SELECT COUNT(*) AS n FROM user_records WHERE user_id=? AND note LIKE ?').get(USER_ID, 'fixture%');
  check('T8.1 fixture 记录已清零（不残留）', row.n === 0, 'n=' + row.n);

  cleanupFixtureRecords();
  console.log(`\n结果: PASS=${PASS} FAIL=${FAIL}`);
  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
