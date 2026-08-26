// FINAL-SEAL-20260826: 修正口径后重测 C/D/E3/72c（DB操作用 better-sqlite3 数字绑定，与服务端一致）
process.env.DB_PATH = '/root/backend-auth/data/yandao_users.db';
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '/www/yandaoguoxue-backend/.env' });

const db = new Database(process.env.DB_PATH);
const API = 'http://127.0.0.1:3001';
const secret = process.env.JWT_SECRET;
const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

const mkToken = (id) => jwt.sign({ userId: id, phone: String(id) }, secret, { expiresIn: '1h' });
const setUsage = (id, n) => db.prepare(
  `INSERT INTO ai_quota_usage (user_id, usage_date, used_count) VALUES (?, ?, ?)
   ON CONFLICT(user_id, usage_date) DO UPDATE SET used_count = excluded.used_count`
).run(id, today, n);
const getUsage = (id) => {
  const r = db.prepare('SELECT used_count FROM ai_quota_usage WHERE user_id = ? AND usage_date = ?').get(id, today);
  return r ? r.used_count : 0;
};
const clearUsage = (id) => db.prepare('DELETE FROM ai_quota_usage WHERE user_id = ? AND usage_date = ?').run(id, today);
// 清理上一轮测试脚本留下的字符串口径垃圾行
const junk = db.prepare(`DELETE FROM ai_quota_usage WHERE usage_date = ? AND user_id GLOB '[0-9]*' AND user_id NOT GLOB '*.*' AND user_id NOT GLOB 'anon:*'`).run(today);
console.log(`清理垃圾行(无.0后缀): ${junk.changes} 条`);

async function aiPost(token, body) {
  const r = await fetch(`${API}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}

let PASS = 0, FAIL = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + (detail || '')}`);
  ok ? PASS++ : FAIL++;
};

(async () => {
  const TB = mkToken(910077), TM = mkToken(910081);

  // ===== C/D: basic额度3/3 + 伪造会员字段 => 429 =====
  console.log('===== C/D 重测: 910077 置3/3, 伪造yearly字段 =====');
  setUsage(910077, 3);
  let r = await aiPost(TB, { userPrompt: '测', memberLevel: 'yearly', isMember: true, membershipExpiry: '2099-01-01' });
  check('C: 伪造memberLevel => 服务端429拒绝', r.status === 429 && r.json.code === 'AI_QUOTA_EXCEEDED', JSON.stringify(r.json).slice(0, 150));
  check('C2: 响应level=basic(不信前端字段)', r.json.level === 'basic', JSON.stringify(r.json).slice(0, 150));
  check('D: 额度耗尽 => 429 AI_QUOTA_EXCEEDED', r.json.code === 'AI_QUOTA_EXCEEDED');
  clearUsage(910077);

  // ===== E3: 成功调用恰好扣1次 =====
  console.log('===== E3 重测: 910081 monthly 成功调用扣1次 =====');
  const u0 = getUsage(910081);
  setUsage(910081, u0); // 确保行存在
  r = await aiPost(TM, { userPrompt: '用一句话回答：5+5=?' });
  const u1 = getUsage(910081);
  check('E3: 成功调用恰好扣1次', r.json.success === true && u1 === u0 + 1, `success=${r.json.success} 用量 ${u0}->${u1}`);

  // ===== 72c: 并发只烧1次 =====
  console.log('===== 72c 重测: 910081 置49/50, 并发2请求 =====');
  setUsage(910081, 49);
  const [r1, r2] = await Promise.all([
    aiPost(TM, { userPrompt: '用一句话回答：6+6=?' }),
    new Promise(resolve => setTimeout(() => resolve(aiPost(TM, { userPrompt: '用一句话回答：7+7=?' })), 400)),
  ]);
  const u2 = getUsage(910081);
  const okOne = (r1.json.success === true) !== (r2.json.success === true);
  check('72a: 恰好一个成功', okOne, `r1=${r1.json.success || r1.json.code} r2=${r2.json.success || r2.json.code}`);
  check('72b: 另一个被并发锁拒(AI_CONCURRENT_LIMIT)', r1.json.code === 'AI_CONCURRENT_LIMIT' || r2.json.code === 'AI_CONCURRENT_LIMIT');
  check('72c: 最终用量=50(只烧1次)', u2 === 50, `用量=${u2}`);

  // ===== 清理测试痕迹(保留真实用户100011的数据) =====
  clearUsage(910077); clearUsage(910081); clearUsage(910078);
  db.prepare("DELETE FROM ai_quota_usage WHERE user_id LIKE '9100%' OR user_id LIKE 'anon:%'").run();
  console.log('清理完成, 剩余今日行:', JSON.stringify(
    db.prepare('SELECT user_id, used_count FROM ai_quota_usage WHERE usage_date = ?').all(today)));

  console.log(`\n===== 重测结果: PASS=${PASS} FAIL=${FAIL} =====`);
  db.close();
})().catch(e => { console.error('脚本异常:', e); process.exit(1); });
