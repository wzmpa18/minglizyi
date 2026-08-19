#!/usr/bin/env node
/**
 * v25.0.38 P0 修复专项验收（服务端 API 级）
 * P0-1 昵称实时同步：A 改昵称 → B 侧 /api/social/users/:id/profile 立即拿到新昵称
 * P0-2 双向投递：A→B 与 B→A 双向可拉取；全量+增量不重复不丢失；401 结构化；
 *        好友列表昵称实时；通知 link 为 query 格式
 * 运行：node /root/p0_v38_e2e.js（服务器本机）
 */
'use strict';
// 脚本位于 /root/ 而 dotenv 装在后端 node_modules，必须绝对路径引用（相对 require 解析不到）
require('/www/yandaoguoxue-backend/node_modules/dotenv').config({ path: '/www/yandaoguoxue-backend/.env' });
const RR = require('/www/yandaoguoxue-backend/register_routes.js');
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');

const BASE = 'http://127.0.0.1:3001';
const SDB_PATH = '/www/yandaoguoxue-backend/data/social.db';
const PW = 'P0v38Test123';
const PA = '19800000061';
const PB = '19800000062';

let failed = 0;
function check(name, cond, detail) {
  const ok = !!cond;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail !== undefined ? ' | ' + String(detail) : ''}`);
}

async function api(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-json */ }
  return { status: res.status, data };
}

async function login(phone) {
  const r = await api('POST', '/api/auth/login', null, { phone, password: PW });
  if (!r.data || !r.data.success || !r.data.data || !r.data.data.accessToken) throw new Error('login failed: ' + JSON.stringify(r.data).slice(0, 200));
  return r.data.data.accessToken;
}

const sdb = new Database(SDB_PATH);
sdb.exec('PRAGMA busy_timeout = 8000');
const udb = RR.initDatabase();
udb.exec('PRAGMA busy_timeout = 8000');
udb.exec('PRAGMA foreign_keys = OFF');

async function main() {
  // ---- 清理历史残留测试数据 ----
  const ids = udb.prepare(`SELECT user_id FROM users WHERE phone IN (?,?)`).all(PA, PB).map(r => String(r.user_id));
  if (ids.length) {
    const ph = ids.map(() => '?').join(',');
    sdb.prepare(`DELETE FROM friend_requests WHERE from_id IN (${ph}) OR to_id IN (${ph})`).run(...ids, ...ids);
    sdb.prepare(`DELETE FROM friendships WHERE user_a IN (${ph}) OR user_b IN (${ph})`).run(...ids, ...ids);
    const convs = sdb.prepare(`SELECT DISTINCT conversation_id FROM chat_messages`).all().map(r => r.conversation_id).filter(c => ids.some(i => c.includes(':' + i + ':')));
    for (const c of convs) sdb.prepare('DELETE FROM chat_messages WHERE conversation_id = ?').run(c);
    sdb.prepare(`DELETE FROM notifications WHERE user_id IN (${ph}) OR actor_id IN (${ph})`).run(...ids, ...ids);
    sdb.prepare(`DELETE FROM sensitive_logs WHERE user_id IN (${ph})`).run(...ids);
    udb.prepare(`DELETE FROM users WHERE user_id IN (${ph})`).run(...ids);
  }

  const A = RR.createUser({ phone: PA, password: PW, deviceId: 'p0v38-dev-A', clientIp: '203.0.113.61' });
  const B = RR.createUser({ phone: PB, password: PW, deviceId: 'p0v38-dev-B', clientIp: '203.0.113.62' });
  check('S0.1 测试用户A/B创建', A.userId > 0 && B.userId > 0, `A=${A.userId} B=${B.userId}`);
  const ta = await login(PA);
  const tb = await login(PB);
  check('S0.2 A/B 登录获取token', !!ta && !!tb);

  // ---- 建立好友关系 ----
  await api('POST', '/api/social/friends/request', ta, { toId: String(B.userId), message: 'v38验收' });
  const list = await api('GET', '/api/social/friends/requests', tb);
  const pend = (list.data && list.data.requests || []).find(r => String(r.fromId) === String(A.userId));
  await api('POST', `/api/social/friends/requests/${pend.id}/accept`, tb);
  check('S0.3 好友关系建立', !!pend);

  console.log('\n===== P0-1 昵称实时同步 =====');
  const up = await api('POST', '/api/auth/profile/update', ta, { nickname: 'v38改名后的昵称' });
  check('P0-1.1 A 修改昵称成功', up.data && up.data.success === true, JSON.stringify(up.data).slice(0, 120));
  // B 侧聊天页同款接口：/api/social/users/:id/profile（前端 fetchUserProfile）
  const prof = await api('GET', `/api/social/users/${A.userId}/profile`, tb);
  check('P0-1.2 B 调 profile 接口拿到新昵称（聊天页标题数据源）', prof.data && prof.data.success && prof.data.user && prof.data.user.nickname === 'v38改名后的昵称', `nickname=${prof.data && prof.data.user && prof.data.user.nickname}`);
  // B 好友列表昵称同步
  const fb = await api('GET', '/api/social/friends/list', tb);
  const friendA = (fb.data.friends || []).find(f => String(f.userId) === String(A.userId));
  check('P0-1.3 B 好友列表昵称同步为新昵称', friendA && friendA.nickname === 'v38改名后的昵称', `nickname=${friendA && friendA.nickname}`);

  console.log('\n===== P0-2 双向投递 =====');
  const sendA = await api('POST', `/api/social/messages/private/${B.userId}`, ta, { content: 'v38-A发给B-001' });
  check('P0-2.1 A→B 发送成功', sendA.data && sendA.data.success === true, JSON.stringify(sendA.data).slice(0, 120));
  // 关键：A 发送的消息 sender_name 必须是改名后的实时昵称（消息旁昵称数据源）
  check('P0-2.2 消息 senderName 为实时昵称（改名后发送）', sendA.data && sendA.data.message && sendA.data.message.senderName === 'v38改名后的昵称', `senderName=${sendA.data && sendA.data.message && sendA.data.message.senderName}`);
  // B 端拉取（进聊天页 afterId=0 全量）——含 A 发的消息（不过滤发送方）
  const getB = await api('GET', `/api/social/messages/private/${A.userId}?afterId=0`, tb);
  const bMsgs = (getB.data && getB.data.messages) || [];
  check('P0-2.3 B 全量拉取收到 A 的消息', bMsgs.some(m => m.content === 'v38-A发给B-001' && String(m.senderId) === String(A.userId)), `len=${bMsgs.length}`);
  // B→A 反向
  const sendB = await api('POST', `/api/social/messages/private/${A.userId}`, tb, { content: 'v38-B发给A-001' });
  check('P0-2.4 B→A 发送成功', sendB.data && sendB.data.success === true);
  const getA = await api('GET', `/api/social/messages/private/${B.userId}?afterId=0`, ta);
  const aMsgs = (getA.data && getA.data.messages) || [];
  check('P0-2.5 A 全量拉取收到 B 的消息', aMsgs.some(m => m.content === 'v38-B发给A-001' && String(m.senderId) === String(B.userId)), `len=${aMsgs.length}`);
  // 会话对称必须用同一时刻的双侧快照：B 发完消息后重新拉取再对比
  const getB2 = await api('GET', `/api/social/messages/private/${A.userId}?afterId=0`, tb);
  const bMsgs2 = (getB2.data && getB2.data.messages) || [];
  check('P0-2.6 会话对称：A 与 B 拉到同一条会话（含双方消息）', aMsgs.length === bMsgs2.length && aMsgs.length >= 2, `A=${aMsgs.length} B=${bMsgs2.length}`);

  console.log('\n===== P0-2 增量拉取不重复不丢失 =====');
  const lastId = Math.max(...aMsgs.map(m => parseInt(m.id, 10)));
  const inc = await api('GET', `/api/social/messages/private/${B.userId}?afterId=${lastId}`, ta);
  check('P0-2.7 增量拉取(afterId=lastId)无重复', (inc.data.messages || []).length === 0, `len=${(inc.data.messages || []).length}`);
  const sendB2 = await api('POST', `/api/social/messages/private/${A.userId}`, tb, { content: 'v38-B增量消息-002' });
  check('P0-2.8a B 增量消息发送成功', sendB2.data && sendB2.data.success === true, JSON.stringify(sendB2.data).slice(0, 120));
  const inc2 = await api('GET', `/api/social/messages/private/${B.userId}?afterId=${lastId}`, ta);
  const inc2msgs = inc2.data.messages || [];
  check('P0-2.8 增量拉取只取到新消息', inc2msgs.length === 1 && inc2msgs[0].content === 'v38-B增量消息-002', `len=${inc2msgs.length}`);

  console.log('\n===== P0-2 401 结构化响应 + 通知 link =====');
  const noAuth = await api('GET', `/api/social/messages/private/${B.userId}`, null);
  check('P0-2.9 无 token 返回 401 + 结构化错误（前端提示条数据源）', noAuth.status === 401 && noAuth.data && noAuth.data.success === false && noAuth.data.error === '请先登录', `status=${noAuth.status} body=${JSON.stringify(noAuth.data)}`);
  const notif = sdb.prepare(`SELECT link FROM notifications WHERE user_id = ? AND type = 'chat' ORDER BY id DESC LIMIT 1`).get(String(B.userId));
  check('P0-2.10 通知 link 为 query 格式（静态导出可跳转）', notif && notif.link.includes('/friends/chat?id='), `link=${notif && notif.link}`);

  console.log('\n===== 清理测试数据 =====');
  const ids2 = [String(A.userId), String(B.userId)];
  const ph2 = ids2.map(() => '?').join(',');
  sdb.prepare(`DELETE FROM friend_requests WHERE from_id IN (${ph2}) OR to_id IN (${ph2})`).run(...ids2, ...ids2);
  sdb.prepare(`DELETE FROM friendships WHERE user_a IN (${ph2}) OR user_b IN (${ph2})`).run(...ids2, ...ids2);
  const convs2 = sdb.prepare(`SELECT DISTINCT conversation_id FROM chat_messages`).all().map(r => r.conversation_id).filter(c => ids2.some(i => c.includes(':' + i + ':')));
  for (const c of convs2) sdb.prepare('DELETE FROM chat_messages WHERE conversation_id = ?').run(c);
  sdb.prepare(`DELETE FROM notifications WHERE user_id IN (${ph2}) OR actor_id IN (${ph2})`).run(...ids2, ...ids2);
  sdb.prepare(`DELETE FROM sensitive_logs WHERE user_id IN (${ph2})`).run(...ids2);
  udb.prepare(`DELETE FROM users WHERE user_id IN (${ph2})`).run(...ids2);
  console.log('清理完成');

  console.log(`\n===== 结果: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'} =====`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(e => { console.error('E2E FATAL:', e.message); process.exit(1); });
