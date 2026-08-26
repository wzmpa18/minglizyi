// ============================================================================
// FINAL-SEAL-20260826 P3 任务8复核: 5项失败断言修正复测 + 无主群不变量直接验证
// 背景: 主测试83 PASS / 5 FAIL，已定性5项均为断言口径错误，本脚本用正确口径取证
// ============================================================================
process.env.DB_PATH = '/root/backend-auth/data/yandao_users.db';
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '/www/yandaoguoxue-backend/.env' });

const API = 'http://127.0.0.1:3001';
const A = '910077', B = '910078', C = '910079';
const tk = (id) => jwt.sign({ userId: Number(id), phone: String(id) }, process.env.JWT_SECRET, { expiresIn: '2h' });
const TA = tk(A), TB = tk(B), TC = tk(C);
const sdb = new Database('/www/yandaoguoxue-backend/data/social.db');

let PASS = 0, FAIL = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + (detail || '')}`);
  ok ? PASS++ : FAIL++;
};
async function req(method, path, token, body) {
  const r = await fetch(`${API}/api/social${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}

(async () => {
  // ===== 预清理 =====
  const pair = (x, y) => [x, y].sort().join('_');
  sdb.prepare(`DELETE FROM friendships WHERE user_a || '_' || user_b IN (?,?,?)`).run(pair(A,B), pair(A,C), pair(B,C));
  sdb.prepare(`DELETE FROM friend_requests WHERE from_id IN (?,?,?) AND to_id IN (?,?,?) AND created_at > datetime('now','-2 days')`).run(A,B,C,A,B,C);
  sdb.prepare(`DELETE FROM groups WHERE name LIKE 'FINAL-SEAL复核群%'`).run();
  sdb.prepare(`DELETE FROM posts WHERE user_id = ? AND created_at > datetime('now','-1 hour')`).run(A);
  console.log('预清理完成\n');

  // ===== R1: S1-8修正复测（正则口径: "已经是好友"） =====
  console.log('===== R1 已是好友再次申请（修正断言） =====');
  let r = await req('POST', '/friends/request', TA, { toId: B, message: '复核' });
  const reqId = r.json.requestId;
  await req('POST', `/friends/requests/${reqId}/accept`, TB);
  r = await req('POST', '/friends/request', TA, { toId: B });
  check('R1-1 已是好友再次申请被拒(明确错误提示)', r.json.success === false && /已经是好友/.test(r.json.error || ''), `status=${r.status} ${JSON.stringify(r.json).slice(0, 80)}`);

  // ===== R2: S4-17修正复测（字段口径: user + 合并rel） =====
  console.log('\n===== R2 用户主页（修正断言） =====');
  r = await req('GET', `/users/${A}/profile`, TB);
  const u = r.json.user || {};
  check('R2-1 主页返回资料(昵称/头像/动态数)', r.json.success === true && !!u.nickname && typeof u.postCount === 'number', JSON.stringify(r.json).slice(0, 120));
  check('R2-2 主页返回关系字段(isFriend=true)', u.isFriend === true, `isFriend=${u.isFriend}`);
  check('R2-3 主页返回关系字段(拉黑状态/备注)', typeof u.blockedByMe === 'boolean' && 'friendRemark' in u, `blockedByMe=${u.blockedByMe}`);

  // ===== R3: S4-13/14修正复测（字段口径: posts） =====
  console.log('\n===== R3 我的收藏（修正断言） =====');
  r = await req('POST', '/posts', TA, { content: '复核动态：收藏链路验证', circle: 'Bazi' });
  const pid = r.json.post && r.json.post.postId;
  check('R3-1 前置: A发动态', !!pid, JSON.stringify(r.json).slice(0, 80));
  await req('POST', `/posts/${pid}/favorite`, TB);
  r = await req('GET', '/favorites/mine', TB);
  check('R3-2 收藏后我的收藏可见(posts字段)', (r.json.posts || []).some(p => p.postId === pid), `收藏列表${(r.json.posts || []).length}条`);
  await req('POST', `/posts/${pid}/favorite`, TB);
  r = await req('GET', '/favorites/mine', TB);
  check('R3-3 取消收藏后消失(posts字段)', !((r.json.posts || []).some(p => p.postId === pid)));

  // ===== R4: 无主群不变量直接验证（自动转让链） =====
  console.log('\n===== R4 群主退群自动转让（无主群不变量） =====');
  r = await req('POST', '/groups', TA, { name: 'FINAL-SEAL复核群-转让链' });
  const gid = r.json.group && (r.json.group.id || r.json.group.groupId);
  check('R4-1 A创建群', r.json.success === true && !!gid, JSON.stringify(r.json).slice(0, 100));
  await req('POST', `/groups/${gid}/invite`, TA, { userIds: [B, C] });
  // A(群主)退群 → 群主应自动转让给B(最早入群)
  r = await req('POST', `/groups/${gid}/leave`, TA);
  check('R4-2 群主A退群成功(自动转让而非拒绝)', r.json.success === true, JSON.stringify(r.json).slice(0, 80));
  r = await req('GET', `/groups/${gid}/detail`, TB);
  const g1 = r.json.group || {};
  check('R4-3 群主已转让给B(无主群不变量#1)', String(g1.ownerId || g1.owner_id) === B, `owner=${g1.ownerId || g1.owner_id}`);
  r = await req('GET', '/notifications', TB);
  const hasTransferNotif = (r.json.notifications || r.json.items || []).some(n => String(n.type || '') === 'group_transfer' || /新群主/.test(n.content || n.title || ''));
  check('R4-4 B收到转让通知', hasTransferNotif, JSON.stringify((r.json.notifications || r.json.items || []).slice(0, 3)).slice(0, 200));
  // B(现群主)退群 → 转让给C
  await req('POST', `/groups/${gid}/leave`, TB);
  r = await req('GET', `/groups/${gid}/detail`, TC);
  const g2 = r.json.group || {};
  check('R4-5 群主二级转让给C(无主群不变量#2)', String(g2.ownerId || g2.owner_id) === C, `owner=${g2.ownerId || g2.owner_id}`);
  // C(最后成员)退群 → 群自动删除
  r = await req('POST', `/groups/${gid}/leave`, TC);
  check('R4-6 最后成员退群自动解散', r.json.success === true && r.json.dissolved === true, JSON.stringify(r.json).slice(0, 80));
  r = await req('GET', `/groups/${gid}/messages`, TC);
  check('R4-7 解散后访问 => 404', r.status === 404, `status=${r.status}`);

  // ===== R5: 群主显式解散（在群存在时验证dissolve端点本身） =====
  console.log('\n===== R5 群主显式解散（端点直测） =====');
  r = await req('POST', '/groups', TA, { name: 'FINAL-SEAL复核群-解散' });
  const gid2 = r.json.group && (r.json.group.id || r.json.group.groupId);
  await req('POST', `/groups/${gid2}/invite`, TA, { userIds: [B] });
  // 非群主解散被拒
  r = await req('POST', `/groups/${gid2}/dissolve`, TB);
  check('R5-1 非群主解散 => 403', r.status === 403, `status=${r.status} ${JSON.stringify(r.json).slice(0, 60)}`);
  r = await req('POST', `/groups/${gid2}/dissolve`, TA);
  check('R5-2 群主解散成功', r.json.success === true && r.json.dissolved === true, JSON.stringify(r.json).slice(0, 80));
  r = await req('POST', `/groups/${gid2}/messages`, TB, { content: '解散后' });
  check('R5-3 解散后成员发言 => 404', r.status === 404, `status=${r.status}`);

  // ===== 清理 =====
  console.log('\n===== 清理 =====');
  const clean = {};
  clean.friendship = sdb.prepare(`DELETE FROM friendships WHERE user_a || '_' || user_b = ?`).run(pair(A,B)).changes;
  clean.posts = sdb.prepare(`DELETE FROM posts WHERE user_id = ? AND created_at > datetime('now','-1 hour')`).run(A).changes;
  clean.fav = sdb.prepare(`DELETE FROM favorites WHERE user_id = ?`).run(B).changes;
  clean.requests = sdb.prepare(`DELETE FROM friend_requests WHERE from_id IN (?,?) AND to_id IN (?,?) AND created_at > datetime('now','-2 hours')`).run(A,B,A,B).changes;
  clean.notifs = sdb.prepare(`DELETE FROM notifications WHERE user_id IN (?,?,?) AND created_at > datetime('now','-1 hour')`).run(A,B,C).changes;
  clean.groups = sdb.prepare(`DELETE FROM groups WHERE name LIKE 'FINAL-SEAL复核群%'`).run().changes;
  console.log('清理统计:', JSON.stringify(clean));

  console.log(`\n===== 复核结果: PASS=${PASS} FAIL=${FAIL} =====`);
  sdb.close();
})().catch(e => { console.error('脚本异常:', e); process.exit(1); });
