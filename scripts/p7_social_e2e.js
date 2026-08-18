#!/usr/bin/env node
/**
 * P7-整改-01 第二阶段：社交基础功能服务端自动化验收
 * 覆盖：好友申请→通过→列表同步 / 私聊文字 / 敏感词拦截留痕 / 图片消息 /
 *      单聊100条滚动覆盖 / 功能总开关热加载（关闭私聊→403→恢复） / 群聊动态评论保持关闭
 * 运行：node /root/p7_social_e2e.js（服务器本机）
 */
'use strict';
require('dotenv').config({ path: '/www/yandaoguoxue-backend/.env' });
const RR = require('/www/yandaoguoxue-backend/register_routes.js');
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');
const fs = require('fs');

const BASE = 'http://127.0.0.1:3001';
const SDB_PATH = '/www/yandaoguoxue-backend/data/social.db';
const CFG_PATH = '/www/yandaoguoxue-backend/data/social_feature_config.json';
const PW = 'P7e2eTest123';
const PA = '19800000041';
const PB = '19800000042';

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
sdb.exec('PRAGMA foreign_keys = OFF'); // 清理需绕过业务外键（已全量备份）
const udb = RR.initDatabase();
udb.exec('PRAGMA busy_timeout = 8000');
udb.exec('PRAGMA foreign_keys = OFF'); // 测试用户清理需绕过业务外键（已全量备份）

// 1x1 红色 PNG
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

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

  const A = RR.createUser({ phone: PA, password: PW, deviceId: 'p7-e2e-dev-A', clientIp: '203.0.113.41' });
  const B = RR.createUser({ phone: PB, password: PW, deviceId: 'p7-e2e-dev-B', clientIp: '203.0.113.42' });
  check('S0.1 测试用户A/B创建', A.userId > 0 && B.userId > 0, `A=${A.userId} B=${B.userId}`);
  const ta = await login(PA);
  const tb = await login(PB);
  check('S0.2 A/B 登录获取token', !!ta && !!tb);

  console.log('\n===== S1 好友链路 =====');
  const req = await api('POST', '/api/social/friends/request', ta, { toId: String(B.userId), message: 'e2e好友申请' });
  check('S1.1 A向B发送好友申请', req.data && req.data.success === true, JSON.stringify(req.data).slice(0, 120));
  const list = await api('GET', '/api/social/friends/requests', tb);
  const pend = (list.data && list.data.requests || []).find(r => String(r.fromId) === String(A.userId));
  check('S1.2 B申请列表可见A的申请', !!pend);
  const acc = await api('POST', `/api/social/friends/requests/${pend.id}/accept`, tb);
  check('S1.3 B通过申请', acc.data && acc.data.success === true, JSON.stringify(acc.data).slice(0, 120));
  const fa = await api('GET', '/api/social/friends/list', ta);
  const fb = await api('GET', '/api/social/friends/list', tb);
  check('S1.4 A好友列表含B（通过后自动同步）', (fa.data.friends || []).some(f => String(f.userId) === String(B.userId)));
  check('S1.5 B好友列表含A', (fb.data.friends || []).some(f => String(f.userId) === String(A.userId)));

  console.log('\n===== S2 私聊文字 + 敏感词拦截 =====');
  const m1 = await api('POST', `/api/social/messages/private/${B.userId}`, ta, { content: '你好，一起学中医基础理论' });
  check('S2.1 A→B 文字消息成功', m1.data && m1.data.success === true && m1.data.message.type === 'text');
  const m2 = await api('POST', `/api/social/messages/private/${B.userId}`, ta, { content: '一起组织赌博吧' });
  check('S2.2 敏感词消息被拦截(400)', m2.status === 400 && m2.data && m2.data.success === false, `status=${m2.status}`);
  const slog = sdb.prepare(`SELECT * FROM sensitive_logs WHERE user_id = ? ORDER BY id DESC LIMIT 1`).get(String(A.userId));
  check('S2.3 敏感词拦截留痕(sensitive_logs)', !!slog && slog.scene === 'private_message' && slog.words.includes('赌博'), slog ? `words=${slog.words}` : 'no row');
  const m3 = await api('POST', `/api/social/messages/private/${A.userId}`, tb, { content: '收到，方剂学今天复习解表剂' });
  check('S2.4 B→A 文字消息成功', m3.data && m3.data.success === true);
  const get1 = await api('GET', `/api/social/messages/private/${B.userId}`, ta);
  check('S2.5 A拉取会话含双方消息', (get1.data.messages || []).length >= 2);

  console.log('\n===== S3 图片消息 =====');
  const img = await api('POST', `/api/social/messages/private/${B.userId}`, ta, { content: TINY_PNG, type: 'image' });
  check('S3.1 A→B 图片消息成功(type=image)', img.data && img.data.success === true && img.data.message.type === 'image');
  const badImg = await api('POST', `/api/social/messages/private/${B.userId}`, ta, { content: 'data:text/html;base64,PGI+', type: 'image' });
  check('S3.2 非图片格式被拒(400)', badImg.status === 400);
  const getImg = await api('GET', `/api/social/messages/private/${A.userId}`, tb);
  check('S3.3 B拉取到图片消息', (getImg.data.messages || []).some(m => m.type === 'image'));

  console.log('\n===== S4 单聊100条滚动覆盖 =====');
  for (let i = 1; i <= 105; i++) {
    const r = await api('POST', `/api/social/messages/private/${B.userId}`, ta, { content: `滚动覆盖测试第${i}条` });
    if (!r.data || r.data.success !== true) { check(`S4.x 第${i}条发送失败`, false, JSON.stringify(r.data).slice(0, 100)); break; }
  }
  const cnt = sdb.prepare(`SELECT COUNT(*) AS c FROM chat_messages WHERE conversation_id = ?`).get(`private:${[String(A.userId), String(B.userId)].sort().join(':')}`);
  check('S4.1 发送105+后库里恰好保留100条', cnt.c === 100, `count=${cnt.c}`);
  const get2 = await api('GET', `/api/social/messages/private/${B.userId}`, ta);
  const msgs = get2.data.messages || [];
  check('S4.2 拉取接口返回100条', msgs.length === 100, `len=${msgs.length}`);
  // S4前已有3条（文字/文字/图片），共108条 → 淘汰最旧8条（前3条+第1~5条），保留第6条起
  check('S4.3 保留的是最新100条(第6条起)', msgs.some(m => m.content === '滚动覆盖测试第6条') && !msgs.some(m => m.content === '滚动覆盖测试第5条'));
  check('S4.4 最新一条在列', msgs.some(m => m.content === '滚动覆盖测试第105条'));

  console.log('\n===== S5 功能总开关热加载 =====');
  const cfg = JSON.parse(fs.readFileSync(CFG_PATH, 'utf-8'));
  cfg.private_chat_enabled = false;
  fs.writeFileSync(CFG_PATH, JSON.stringify(cfg, null, 2));
  const off1 = await api('POST', `/api/social/messages/private/${B.userId}`, ta, { content: '开关关闭测试' });
  check('S5.1 关闭私聊开关→发送403', off1.status === 403, `status=${off1.status}`);
  const off2 = await api('GET', `/api/social/messages/private/${B.userId}`, ta);
  check('S5.2 关闭私聊开关→拉取403', off2.status === 403, `status=${off2.status}`);
  const off3 = await api('POST', '/api/social/friends/request', ta, { toId: String(B.userId) });
  check('S5.3 好友申请不受私聊开关影响', off3.status !== 403, `status=${off3.status}`);
  cfg.private_chat_enabled = true;
  fs.writeFileSync(CFG_PATH, JSON.stringify(cfg, null, 2));
  const on1 = await api('POST', `/api/social/messages/private/${B.userId}`, ta, { content: '开关恢复测试' });
  check('S5.4 恢复开关→发送成功(无需重启)', on1.data && on1.data.success === true);

  console.log('\n===== S6 群聊/动态/评论保持关闭 =====');
  const g1 = await api('POST', '/api/social/groups', ta, { name: 'e2e测试群' });
  check('S6.1 创建群聊被拒(403)', g1.status === 403, `status=${g1.status}`);
  const p1 = await api('POST', '/api/social/posts', ta, { content: 'e2e动态', circle: 'TCM' });
  check('S6.2 发布动态被拒(403)', p1.status === 403, `status=${p1.status}`);
  const c1 = await api('POST', '/api/social/posts/p1/comments', ta, { content: 'e2e评论' });
  check('S6.3 公开评论被拒(403)', c1.status === 403, `status=${c1.status}`);

  console.log('\n===== S7 资料修改真实写库 =====');
  const up = await api('POST', '/api/auth/profile/update', ta, { nickname: 'e2e新昵称甲', bio: 'e2e简介修改' });
  check('S7.1 profile/update 成功', up.data && up.data.success === true);
  const urow = udb.prepare('SELECT nickname, bio FROM users WHERE user_id = ?').get(A.userId);
  check('S7.2 昵称真实落库', urow && urow.nickname === 'e2e新昵称甲', `nickname=${urow && urow.nickname}`);
  check('S7.3 简介真实落库', urow && urow.bio === 'e2e简介修改');

  // ---- 清理（备份后删除） ----
  console.log('\n===== 清理测试数据（已备份） =====');
  const backup = {
    generatedAt: new Date().toISOString(),
    users: udb.prepare(`SELECT * FROM users WHERE user_id IN (?,?)`).all(A.userId, B.userId),
    friend_requests: sdb.prepare(`SELECT * FROM friend_requests WHERE from_id IN (?,?) OR to_id IN (?,?)`).all(A.userId, B.userId, A.userId, B.userId),
    sensitive_logs: sdb.prepare(`SELECT * FROM sensitive_logs WHERE user_id IN (?,?)`).all(A.userId, B.userId),
  };
  fs.writeFileSync('/www/yandaoguoxue-backend/data/p7_social_e2e_backup.json', JSON.stringify(backup, null, 2));
  udb.exec('PRAGMA foreign_keys = OFF');
  sdb.prepare(`DELETE FROM friend_requests WHERE from_id IN (?,?) OR to_id IN (?,?)`).run(A.userId, B.userId, A.userId, B.userId);
  sdb.prepare(`DELETE FROM friendships WHERE user_a IN (?,?) OR user_b IN (?,?)`).run(A.userId, B.userId, A.userId, B.userId);
  for (const c of [`private:${[String(A.userId), String(B.userId)].sort().join(':')}`]) sdb.prepare('DELETE FROM chat_messages WHERE conversation_id = ?').run(c);
  sdb.prepare(`DELETE FROM notifications WHERE user_id IN (?,?) OR actor_id IN (?,?)`).run(A.userId, B.userId, A.userId, B.userId);
  sdb.prepare(`DELETE FROM sensitive_logs WHERE user_id IN (?,?)`).run(A.userId, B.userId);
  udb.prepare(`DELETE FROM users WHERE user_id IN (?,?)`).run(A.userId, B.userId);
  const left = sdb.prepare(`SELECT COUNT(*) AS c FROM chat_messages WHERE conversation_id = ?`).get(`private:${[String(A.userId), String(B.userId)].sort().join(':')}`);
  check('S8.1 测试数据清理完成', left.c === 0, `chat_left=${left.c}`);

  console.log(`\n===== 结果：${failed === 0 ? 'ALL PASS' : failed + ' FAILED'} =====`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error('EXCEPTION:', e); process.exit(1); });
