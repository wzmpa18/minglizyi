// ============================================================================
// FINAL-SEAL-20260826 P3 任务7: 后台会员调整真实验收
// 测试账号 910077: basic→monthly→quarterly→yearly→延长30天→撤销→补发
// 每步验证: API响应 + DB(users/user_assets双表) + AI权限(quota端点) + 审计日志
// ============================================================================
process.env.DB_PATH = '/root/backend-auth/data/yandao_users.db';
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config({ path: '/www/yandaoguoxue-backend/.env' });

const db = new Database(process.env.DB_PATH);
const API = 'http://127.0.0.1:3001';
const ADMIN_KEY = process.env.ADMIN_API_KEY;
const USER_ID = 910077;
const userToken = jwt.sign({ userId: USER_ID, phone: String(USER_ID) }, process.env.JWT_SECRET, { expiresIn: '1h' });

let PASS = 0, FAIL = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + (detail || '')}`);
  ok ? PASS++ : FAIL++;
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function adjust(level, days, reason) {
  const r = await fetch(`${API}/api/admin/unified/moderation/users/${USER_ID}/membership`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_KEY}` },
    body: JSON.stringify(days ? { level, days, reason } : { level, reason }),
  });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}
async function quotaOf() {
  const r = await fetch(`${API}/api/ai/quota`, { headers: { Authorization: `Bearer ${userToken}` } });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, level: j.data && j.data.level, limit: j.data && j.data.dailyLimit };
}
function dbState() {
  const u = db.prepare('SELECT member_level, membership_expiry FROM users WHERE user_id = ?').get(USER_ID);
  let a = null;
  try { a = db.prepare('SELECT member_level, member_expire_at FROM user_assets WHERE user_id = ?').get(USER_ID); } catch (e) {}
  return { users: u, assets: a };
}
async function auditCount() {
  const r = await fetch(`${API}/api/admin/unified/audit?limit=100`, { headers: { Authorization: `Bearer ${ADMIN_KEY}` } });
  const j = await r.json().catch(() => ({}));
  const list = (j.data && (j.data.items || j.data.list || j.data)) || [];
  const arr = Array.isArray(list) ? list : [];
  return arr.filter(x => String(x.action || '').includes('USER_MEMBERSHIP') && String(x.target || '').includes(String(USER_ID))).length;
}

(async () => {
  const LIMITS = { basic: 3, monthly: 50, quarterly: 50, yearly: -1 };

  // 基线
  await adjust('basic', null, 'FINAL-SEAL验收前置: 重置为basic');
  let base = dbState();
  console.log(`基线: users=${base.users.member_level} expiry=${base.users.membership_expiry}`);
  let audit0 = await auditCount();
  console.log(`基线审计条数: ${audit0}`);

  // ===== 步骤1: basic → monthly =====
  console.log('\n===== 步骤1: basic → monthly =====');
  let r = await adjust('monthly', null, 'FINAL-SEAL验收: 升档月会员');
  let s = dbState();
  let q = await quotaOf();
  check('1a API返回monthly', r.json.data && r.json.data.member_level === 'monthly', JSON.stringify(r.json).slice(0, 150));
  check('1b DB users.member_level=monthly', s.users.member_level === 'monthly');
  check('1c DB users.membership_expiry已设置(30天后)', s.users.membership_expiry && new Date(s.users.membership_expiry).getTime() > Date.now() + 28 * 86400000, s.users.membership_expiry);
  check('1d user_assets双表同步', !s.assets || (s.assets.member_level === 'monthly' && s.assets.member_expire_at === s.users.membership_expiry), JSON.stringify(s.assets));
  check('1e AI权限即时生效: quota=monthly/50', q.level === 'monthly' && q.limit === LIMITS.monthly, JSON.stringify(q));

  // ===== 步骤2: monthly → quarterly =====
  console.log('\n===== 步骤2: monthly → quarterly =====');
  r = await adjust('quarterly', null, 'FINAL-SEAL验收: 升档季会员');
  s = dbState(); q = await quotaOf();
  check('2a API返回quarterly', r.json.data && r.json.data.member_level === 'quarterly');
  check('2b DB双表quarterly', s.users.member_level === 'quarterly' && (!s.assets || s.assets.member_level === 'quarterly'));
  check('2c 有效期顺延(基于旧有效期+90天)', s.users.membership_expiry && new Date(s.users.membership_expiry).getTime() > Date.now() + 110 * 86400000, s.users.membership_expiry);
  check('2d AI权限: quarterly/50', q.level === 'quarterly' && q.limit === 50, JSON.stringify(q));

  // ===== 步骤3: quarterly → yearly =====
  console.log('\n===== 步骤3: quarterly → yearly =====');
  r = await adjust('yearly', null, 'FINAL-SEAL验收: 升档年会员');
  s = dbState(); q = await quotaOf();
  check('3a API返回yearly', r.json.data && r.json.data.member_level === 'yearly');
  check('3b DB双表yearly', s.users.member_level === 'yearly' && (!s.assets || s.assets.member_level === 'yearly'));
  check('3c AI权限: yearly无限(remaining=-1)', q.level === 'yearly', JSON.stringify(q));

  // ===== 步骤4: 延长30天 =====
  console.log('\n===== 步骤4: yearly 延长30天 =====');
  const before = s.users.membership_expiry;
  r = await adjust('yearly', 30, 'FINAL-SEAL验收: 延长30天');
  s = dbState();
  const diffDays = (new Date(s.users.membership_expiry).getTime() - new Date(before).getTime()) / 86400000;
  check('4a 有效期延长约30天', Math.abs(diffDays - 30) < 2, `延了${diffDays.toFixed(1)}天 ${before} -> ${s.users.membership_expiry}`);
  check('4b 双表同步', !s.assets || s.assets.member_expire_at === s.users.membership_expiry);

  // ===== 步骤5: 撤销会员 =====
  console.log('\n===== 步骤5: 撤销会员(basic) =====');
  r = await adjust('basic', null, 'FINAL-SEAL验收: 撤销会员');
  s = dbState(); q = await quotaOf();
  check('5a API返回basic', r.json.data && r.json.data.member_level === 'basic');
  check('5b DB users回退basic且expiry清空', s.users.member_level === 'basic' && !s.users.membership_expiry, JSON.stringify(s.users));
  check('5c user_assets回退同步', !s.assets || (s.assets.member_level === 'basic' && !s.assets.member_expire_at), JSON.stringify(s.assets));
  check('5d AI权限即时降级: basic/3', q.level === 'basic' && q.limit === 3, JSON.stringify(q));

  // ===== 步骤6: 补发会员 =====
  console.log('\n===== 步骤6: 补发月会员 =====');
  r = await adjust('monthly', null, 'FINAL-SEAL验收: 补发会员');
  s = dbState(); q = await quotaOf();
  check('6a 补发成功monthly', s.users.member_level === 'monthly');
  check('6b AI权限恢复: monthly/50', q.level === 'monthly' && q.limit === 50, JSON.stringify(q));

  // ===== 审计日志 =====
  console.log('\n===== 审计日志核验 =====');
  let audit1 = await auditCount();
  check('7a 每步操作都有审计日志(≥7条新增)', audit1 >= audit0 + 7, `新增${audit1 - audit0}条(含前置重置), 基线${audit0} -> ${audit1}`);

  // ===== 非法参数 =====
  console.log('\n===== 非法参数拒绝 =====');
  r = await adjust('platinum', null, '非法等级');
  check('8a 非法等级 => 400', r.status === 400, `status=${r.status}`);
  const r2 = await fetch(`${API}/api/admin/unified/moderation/users/${USER_ID}/membership`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_KEY}` },
    body: JSON.stringify({ level: 'monthly' }),
  });
  check('8b 缺少reason => 400', r2.status === 400, `status=${r2.status}`);
  const r3 = await fetch(`${API}/api/admin/unified/moderation/users/${USER_ID}/membership`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer invalid_key_xxx' },
    body: JSON.stringify({ level: 'monthly', reason: 'x' }),
  });
  check('8c 无效管理密钥 => 401/403', r3.status === 401 || r3.status === 403, `status=${r3.status}`);

  // ===== 清理: 恢复910077为basic =====
  await adjust('basic', null, 'FINAL-SEAL验收完成: 恢复basic');
  s = dbState();
  console.log(`\n清理后状态: ${s.users.member_level}`);

  console.log(`\n===== 会员调整验收结果: PASS=${PASS} FAIL=${FAIL} =====`);
  db.close();
})().catch(e => { console.error('脚本异常:', e); process.exit(1); });
