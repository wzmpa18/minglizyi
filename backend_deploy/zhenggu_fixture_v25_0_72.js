// ============================================================================
// v25.0.72 正骨专区付费链路 fixture 验收（服务器 /www/yandaoguoxue-backend 下运行）
// 用法：node zhenggu_fixture_v25_0_72.js A|B|CLEAN
//   A     —— T1价格SSOT / T2未解锁门控 / T3权益放行 / T5三态开关（无需重启）
//            末尾将测试订单置 PAID+未交付、清理权益、矩阵恢复默认，写状态文件
//   B     —— T4补交付E2E（前置：A 已跑完 + 后端已重启）
//   CLEAN —— 清理测试数据（权益/订单/矩阵恢复默认ON）
// 测试账号 910077（与 finalseal_membership_test 同款 fixture 账号）
// ============================================================================
process.env.DB_PATH = '/root/backend-auth/data/yandao_users.db';
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config({ path: '/www/yandaoguoxue-backend/.env' });

const API = 'http://127.0.0.1:3001';
const USER_ID = 910077;
const TOOL_ID = 'zhongyi_zhenggu';
const CATEGORY = encodeURIComponent('中华非遗正骨');
const MATRIX_FILE = '/www/yandaoguoxue-backend/data/tool-matrix.json';
const STATE_FILE = '/tmp/zhenggu_fixture_state.json';
const userToken = jwt.sign({ userId: USER_ID, phone: String(USER_ID) }, process.env.JWT_SECRET, { expiresIn: '2h' });
const AUTH = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + userToken };

let PASS = 0, FAIL = 0;
const check = (name, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + (detail || '')}`); ok ? PASS++ : FAIL++; };
const db = new Database(process.env.DB_PATH);

async function api(method, path, body) {
  const r = await fetch(API + path, { method, headers: AUTH, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, json: j };
}

function setMatrixOverride(patchOrNull) {
  const m = JSON.parse(fs.readFileSync(MATRIX_FILE, 'utf-8'));
  if (!m.tools) m.tools = {};
  if (patchOrNull) m.tools[TOOL_ID] = Object.assign({}, m.tools[TOOL_ID] || {}, patchOrNull);
  else delete m.tools[TOOL_ID];
  m.updatedAt = new Date().toISOString();
  m.updatedBy = 'fixture-v25.0.72';
  fs.writeFileSync(MATRIX_FILE, JSON.stringify(m, null, 2), 'utf-8');
}

function entitlementRow() {
  return db.prepare('SELECT * FROM user_entitlements WHERE user_id=? AND entitlement_key=?').get(USER_ID, TOOL_ID);
}
function clearEntitlement() {
  db.prepare('DELETE FROM user_entitlements WHERE user_id=? AND entitlement_key=?').run(USER_ID, TOOL_ID);
}
function deleteTestOrders() {
  db.prepare("DELETE FROM user_orders WHERE user_id=? AND extra LIKE ?").run(String(USER_ID), '%' + TOOL_ID + '%');
}

async function phaseA() {
  console.log('===== PHASE A（无需重启） =====');
  // 前置清理
  clearEntitlement();
  deleteTestOrders();
  setMatrixOverride(null);
  console.log('[pre] 权益/测试订单已清理，矩阵恢复默认（ON/ONE_TIME/89）');

  // ---- T1 价格SSOT：前端伪造 amount=1，服务端必须裁决为 89 ----
  const create = await api('POST', '/api/payment/create', {
    userId: String(USER_ID), type: 'SINGLE_UNLOCK', amount: 1, title: 'fixture正骨专区', channel: 'wechat',
    extra: { unlockTargetId: TOOL_ID },
  });
  const orderId = create.json && create.json.data && create.json.data.orderId;
  check('T1.1 下单接口响应合法', !!(orderId || (create.json && create.json.success === false)), JSON.stringify(create.json).slice(0, 120));
  if (!orderId) { console.log('FATAL: 未拿到 orderId，中止'); process.exit(1); }
  const q = await api('POST', '/api/payment/query', { orderId });
  const amt = q.json && q.json.data && Number(q.json.data.amount);
  check('T1.2 订单金额=服务端裁决89元（前端传1元被覆盖）', amt === 89, 'amount=' + amt);
  check('T1.3 query 返回订单状态', !!(q.json && q.json.data && q.json.data.status), JSON.stringify(q.json && q.json.data).slice(0, 120));
  const dbRow = db.prepare('SELECT amount, status FROM user_orders WHERE order_no=?').get(orderId);
  check('T1.4 DB订单金额=89', dbRow && Number(dbRow.amount) === 89, JSON.stringify(dbRow));

  // ---- T2 未解锁门控 ----
  const acc0 = await api('GET', '/api/academy/zhenggu/access');
  const a0 = acc0.json && acc0.json.access;
  check('T2.1 access 返回 ON/ONE_TIME/89/未解锁', acc0.status === 200 && a0 && a0.status === 'ON' && a0.payMode === 'ONE_TIME' && Number(a0.price) === 89 && a0.unlocked === false, JSON.stringify(a0));
  const kn0 = await api('GET', '/api/academy/knowledge?track=zhongyi&category=' + CATEGORY + '&limit=5');
  check('T2.2 未解锁拉取知识点 → 402 Paywall', kn0.status === 402 && /单独付费/.test(String(kn0.json && kn0.json.error)), 'status=' + kn0.status + ' err=' + String(kn0.json && kn0.json.error).slice(0, 60));
  const qn0 = await api('GET', '/api/academy/questions?track=zhongyi&category=' + CATEGORY + '&limit=5');
  check('T2.3 未解锁拉取题目 → 402 Paywall', qn0.status === 402, 'status=' + qn0.status);
  const cat0 = await api('GET', '/api/academy/categories?track=zhongyi');
  const catNames = (cat0.json && cat0.json.categories || []).map(c => c.name || c);
  check('T2.4 未解锁时类目列表不含正骨', !catNames.includes('中华非遗正骨'), JSON.stringify(catNames).slice(0, 200));

  // ---- T3 权益放行（读路径） ----
  db.prepare('INSERT INTO user_entitlements (user_id, entitlement_key, expire_at, source_order_no) VALUES (?,?,NULL,?)')
    .run(USER_ID, TOOL_ID, 'fixture-direct');
  const acc1 = await api('GET', '/api/academy/zhenggu/access');
  check('T3.1 写入永久权益后 access unlocked=true', acc1.json && acc1.json.access && acc1.json.access.unlocked === true, JSON.stringify(acc1.json && acc1.json.access));
  const kn1 = await api('GET', '/api/academy/knowledge?track=zhongyi&category=' + CATEGORY + '&limit=3');
  check('T3.2 解锁后知识点 200 返回数据', kn1.status === 200 && Array.isArray(kn1.json && kn1.json.points) && kn1.json.points.length > 0, 'status=' + kn1.status + ' n=' + (kn1.json && kn1.json.points || []).length);
  const qn1 = await api('GET', '/api/academy/questions?track=zhongyi&category=' + CATEGORY + '&limit=3');
  const q1 = (qn1.json && qn1.json.questions) || [];
  check('T3.3 解锁后题目 200 且答案可见', qn1.status === 200 && q1.length > 0 && q1.every(x => x.answer || x.correctAnswer || x.analysis), 'status=' + qn1.status + ' n=' + q1.length + ' sample=' + JSON.stringify(q1[0] || {}).slice(0, 150));

  // ---- T5 三态开关 ----
  setMatrixOverride({ status: 'MAINTENANCE' });
  const accM = await api('GET', '/api/academy/zhenggu/access');
  const knM = await api('GET', '/api/academy/knowledge?track=zhongyi&category=' + CATEGORY + '&limit=3');
  check('T5.1 MAINTENANCE：access.status=MAINTENANCE', accM.json && accM.json.access && accM.json.access.status === 'MAINTENANCE', JSON.stringify(accM.json && accM.json.access));
  check('T5.2 MAINTENANCE：知识点 → 403 维护提示', knM.status === 403 && /维护/.test(String(knM.json && knM.json.error)), 'status=' + knM.status + ' err=' + String(knM.json && knM.json.error).slice(0, 60));
  setMatrixOverride({ status: 'OFF' });
  const knO = await api('GET', '/api/academy/knowledge?track=zhongyi&category=' + CATEGORY + '&limit=3');
  check('T5.3 OFF：知识点 → 403 下线提示', knO.status === 403 && /下线/.test(String(knO.json && knO.json.error)), 'status=' + knO.status + ' err=' + String(knO.json && knO.json.error).slice(0, 60));
  const crO = await api('POST', '/api/payment/create', {
    userId: String(USER_ID), type: 'SINGLE_UNLOCK', amount: 89, title: 'fixture正骨OFF态', channel: 'wechat',
    extra: { unlockTargetId: TOOL_ID },
  });
  check('T5.4 OFF：下单被拒（工具已关闭）', crO.status === 400 && /不可购买|已关闭/.test(String(crO.json && crO.json.message)), 'status=' + crO.status + ' msg=' + String(crO.json && crO.json.message).slice(0, 80));
  setMatrixOverride(null);
  const accR = await api('GET', '/api/academy/zhenggu/access');
  check('T5.5 恢复默认ON后 access 正常', accR.json && accR.json.access && accR.json.access.status === 'ON', JSON.stringify(accR.json && accR.json.access));

  // ---- 为 T4 准备：订单置 PAID+未交付，权益清除，写状态文件 ----
  clearEntitlement();
  db.prepare("UPDATE user_orders SET status='PAID', paid_at=datetime('now','localtime'), benefit_delivered=0 WHERE order_no=?").run(orderId);
  fs.writeFileSync(STATE_FILE, JSON.stringify({ orderId, userId: USER_ID, toolId: TOOL_ID }, null, 2));
  console.log('[prep] 测试订单已置 PAID+未交付（' + orderId + '），权益已清除，状态写入 ' + STATE_FILE);
  console.log('[prep] 下一步：pm2 restart yandaoguoxue-backend 后运行 phase B');

  console.log('PHASE_A_RESULT: PASS=' + PASS + ' FAIL=' + FAIL);
  process.exit(FAIL > 0 ? 1 : 0);
}

async function phaseB() {
  console.log('===== PHASE B（T4 补交付E2E，前置：已重启） =====');
  const st = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  // 重启后权益应为空（A 阶段已清除）
  check('T4.1 前置：重启后权益为空', !entitlementRow(), JSON.stringify(entitlementRow()));
  const q = await api('POST', '/api/payment/query', { orderId: st.orderId });
  check('T4.2 query 返回 PAID', q.json && q.json.data && q.json.data.status === 'PAID', JSON.stringify(q.json && q.json.data).slice(0, 120));
  const row = entitlementRow();
  check('T4.3 补交付写入 user_entitlements（zhongyi_zhenggu）', !!row, JSON.stringify(row));
  check('T4.4 权益为永久（expire_at IS NULL）', row && row.expire_at === null, 'expire_at=' + (row && row.expire_at));
  check('T4.5 权益关联回源订单', row && row.source_order_no === st.orderId, 'src=' + (row && row.source_order_no));
  const acc = await api('GET', '/api/academy/zhenggu/access');
  check('T4.6 补交付后 access unlocked=true', acc.json && acc.json.access && acc.json.access.unlocked === true, JSON.stringify(acc.json && acc.json.access));
  const dbOrd = db.prepare('SELECT benefit_delivered FROM user_orders WHERE order_no=?').get(st.orderId);
  check('T4.7 订单已标记 benefit_delivered=1（幂等）', dbOrd && dbOrd.benefit_delivered === 1, JSON.stringify(dbOrd));
  const q2 = await api('POST', '/api/payment/query', { orderId: st.orderId });
  const rows = db.prepare('SELECT COUNT(*) c FROM user_entitlements WHERE user_id=? AND entitlement_key=?').get(USER_ID, TOOL_ID).c;
  check('T4.8 重复 query 不重复交付（幂等）', rows === 1, 'rows=' + rows);
  console.log('PHASE_B_RESULT: PASS=' + PASS + ' FAIL=' + FAIL);
  process.exit(FAIL > 0 ? 1 : 0);
}

async function phaseClean() {
  console.log('===== CLEAN（清理测试数据） =====');
  clearEntitlement();
  deleteTestOrders();
  setMatrixOverride(null);
  try { fs.unlinkSync(STATE_FILE); } catch (e) {}
  const acc = await api('GET', '/api/academy/zhenggu/access');
  const a = acc.json && acc.json.access;
  check('CLEAN.1 最终态：矩阵默认ON、未解锁Paywall', a && a.status === 'ON' && a.payMode === 'ONE_TIME' && Number(a.price) === 89 && a.unlocked === false, JSON.stringify(a));
  check('CLEAN.2 权益已清除', !entitlementRow(), '');
  console.log('CLEAN_RESULT: PASS=' + PASS + ' FAIL=' + FAIL);
  process.exit(FAIL > 0 ? 1 : 0);
}

const phase = process.argv[2];
if (phase === 'A') phaseA().catch(e => { console.error('PHASE_A_ERROR:', e); process.exit(1); });
else if (phase === 'B') phaseB().catch(e => { console.error('PHASE_B_ERROR:', e); process.exit(1); });
else if (phase === 'CLEAN') phaseClean().catch(e => { console.error('CLEAN_ERROR:', e); process.exit(1); });
else { console.log('用法: node zhenggu_fixture_v25_0_72.js A|B|CLEAN'); process.exit(1); }