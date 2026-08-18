#!/usr/bin/env node
/**
 * P7-验收推进-01 第一阶段：推广全链路服务端自动化验收
 * 覆盖：正常链路（注册→绑定→注册奖励→首付费奖励→幂等→HTTP三接口一致性）
 *      + 五类防作弊实测 + 伪造签名拦截 + 审计留痕核查 + 测试数据备份清理
 * 运行：node /root/p9_e2e_test.js（服务器本机，直调后端模块 + 本机 HTTP 复核）
 */
'use strict';
require('dotenv').config({ path: '/www/yandaoguoxue-backend/.env' });
const path = '/www/yandaoguoxue-backend/register_routes.js';
const RR = require(path);
const crypto = require('crypto');
const { execSync } = require('child_process');
const fs = require('fs');

const db = RR.initDatabase();
db.exec('PRAGMA busy_timeout = 8000');

const SECRET = process.env.INVITE_SIGN_SECRET;
if (!SECRET) { console.error('FATAL: INVITE_SIGN_SECRET 未配置'); process.exit(1); }
const REG_PTS = Number(process.env.INVITE_REWARD_REGISTER) || 50;
const PAY_PTS = Number(process.env.INVITE_REWARD_FIRST_PAY) || 200;

const signRef = (uid, ts) => crypto.createHmac('sha256', SECRET).update(`${uid}.${ts}`).digest('hex').slice(0, 32);

// ---- 测试资源（全部带 p9-e2e 前缀可辨识，结束后清理） ----
const P = { A: '19900000011', B: '19900000012', C: '19900000013', D: '19900000014', E: '19900000015', F: '19900000016', G: '19900000017', H: '19900000018' };
const DEV = { A: 'p9-e2e-dev-A', B: 'p9-e2e-dev-B', C: 'p9-e2e-dev-A', D: 'p9-e2e-dev-A', E: 'p9-e2e-dev-E', F: 'p9-e2e-dev-F', G: 'p9-e2e-dev-G', H: 'p9-e2e-dev-H' };
const IP = { A: '203.0.113.11', B: '203.0.113.12', C: '203.0.113.13', D: '203.0.113.14', E: '203.0.113.15', F: '198.51.100.99', G: '203.0.113.17', H: '203.0.113.18' };
const PW = 'P9e2eTest123';

const results = [];
let failed = 0;
function check(name, cond, detail) {
  const ok = !!cond;
  if (!ok) failed++;
  results.push({ name, ok, detail: detail === undefined ? '' : String(detail) });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail !== undefined ? ' | ' + detail : ''}`);
}
const q = (sql, ...a) => db.prepare(sql).all(...a);
const q1 = (sql, ...a) => db.prepare(sql).get(...a);

try {
  // ================= T1 正常全链路 =================
  console.log('\n===== T1 正常全链路 =====');
  const A = RR.createUser({ phone: P.A, password: PW, deviceId: DEV.A, clientIp: IP.A });
  check('T1.1 邀请人A注册成功', A.userId > 0, `userId=${A.userId}`);
  check('T1.2 A无上级绑定', A.inviteBound === false);

  const ts = Date.now();
  const sig = signRef(A.userId, ts);
  const B = RR.createUser({ phone: P.B, password: PW, inviteRef: String(A.userId), inviteTs: String(ts), inviteSig: sig, deviceId: DEV.B, clientIp: IP.B });
  check('T1.3 B经签名链接注册绑定成功', B.inviteBound === true, `reason=${B.inviteBoundReason}`);
  const bRow = q1('SELECT invited_by FROM users WHERE user_id = ?', B.userId);
  check('T1.4 users.invited_by = A', bRow && bRow.invited_by === A.userId, `invited_by=${bRow && bRow.invited_by}`);
  const rel = q1('SELECT level FROM user_invite_relation WHERE inviter_id = ? AND invitee_id = ?', A.userId, B.userId);
  check('T1.5 关系表level=1(单层)', rel && rel.level === 1);
  const aBal1 = q1('SELECT points_balance FROM user_assets WHERE user_id = ?', A.userId);
  check('T1.6 A注册奖励到账', aBal1 && aBal1.points_balance === REG_PTS, `balance=${aBal1 && aBal1.points_balance} 期望${REG_PTS}`);
  const rr1 = q1('SELECT points, status FROM invite_rewards WHERE inviter_id = ? AND reward_type = ?', A.userId, 'register');
  check('T1.7 invite_rewards注册奖励记录', rr1 && rr1.points === REG_PTS && rr1.status === 'granted');
  const tx1 = q1("SELECT amount FROM points_transactions WHERE user_id = ? AND tx_type = 'invite_register'", A.userId);
  check('T1.8 积分流水invite_register', tx1 && tx1.amount === REG_PTS);

  const fp1 = RR.grantFirstPayReward(B.userId, 'P9E2E-ORDER-001');
  check('T1.9 首付费奖励发放成功', fp1.granted === true && fp1.points === PAY_PTS, JSON.stringify(fp1));
  const aBal2 = q1('SELECT points_balance FROM user_assets WHERE user_id = ?', A.userId);
  check('T1.10 A累计积分=注册+首付费', aBal2 && aBal2.points_balance === REG_PTS + PAY_PTS, `balance=${aBal2 && aBal2.points_balance} 期望${REG_PTS + PAY_PTS}`);
  const fp2 = RR.grantFirstPayReward(B.userId, 'P9E2E-ORDER-DUP');
  check('T1.11 首付费奖励幂等(重复调用不重复发放)', fp2.granted === false && fp2.reason === 'ALREADY_GRANTED', JSON.stringify(fp2));
  const aBal3 = q1('SELECT points_balance FROM user_assets WHERE user_id = ?', A.userId);
  check('T1.12 幂等后余额不变', aBal3 && aBal3.points_balance === REG_PTS + PAY_PTS);
  const payCnt = q1("SELECT COUNT(*) c FROM points_transactions WHERE user_id = ? AND tx_type = 'invite_first_pay'", A.userId);
  check('T1.13 首付费流水仅1条', payCnt && payCnt.c === 1);

  // ================= T2 五类防作弊 =================
  console.log('\n===== T2 五类防作弊场景 =====');
  // 场景1：自邀/关联设备（C与A同设备，携A邀请）
  const C = RR.createUser({ phone: P.C, password: PW, inviteRef: String(A.userId), inviteTs: String(ts), inviteSig: sig, deviceId: DEV.C, clientIp: IP.C });
  check('T2.1 自邀/关联设备拦截', C.inviteBound === false && C.inviteBoundReason === 'SELF_OR_LINKED_DEVICE', `reason=${C.inviteBoundReason}`);
  const cRow = q1('SELECT invited_by FROM users WHERE user_id = ?', C.userId);
  check('T2.2 C未产生绑定', cRow && cRow.invited_by === null);

  // 场景2：同设备批量注册（D补足dev-A账号数；E用已有3账号的dev-E设备携A邀请）
  const D = RR.createUser({ phone: P.D, password: PW, deviceId: DEV.D, clientIp: IP.D });
  check('T2.3 D无邀请注册正常', D.userId > 0 && D.inviteBound === false);
  // 预置 dev-E 设备已有 B/C/D 三个账号（非邀请人A，绕开SELF检查）
  db.prepare('INSERT INTO device_registry (device_id, user_id, ip) VALUES (?, ?, ?)').run(DEV.E, B.userId, '203.0.113.15');
  db.prepare('INSERT INTO device_registry (device_id, user_id, ip) VALUES (?, ?, ?)').run(DEV.E, C.userId, '203.0.113.15');
  db.prepare('INSERT INTO device_registry (device_id, user_id, ip) VALUES (?, ?, ?)').run(DEV.E, D.userId, '203.0.113.15');
  const E = RR.createUser({ phone: P.E, password: PW, inviteRef: String(A.userId), inviteTs: String(ts), inviteSig: sig, deviceId: DEV.E, clientIp: IP.E });
  check('T2.4 同设备批量注册拦截(≥3账号)', E.inviteBound === false && E.inviteBoundReason === 'DEVICE_BATCH_REGISTER', `reason=${E.inviteBoundReason}`);

  // 场景3：同IP 24小时高频（预置5条同IP记录）
  const ipRows = db.prepare('SELECT user_id FROM users LIMIT 5').all();
  for (const r of ipRows) db.prepare('INSERT INTO device_registry (device_id, user_id, ip) VALUES (?, ?, ?)').run('p9-e2e-dev-iphog-' + r.user_id, r.user_id, IP.F);
  const F = RR.createUser({ phone: P.F, password: PW, inviteRef: String(A.userId), inviteTs: String(ts), inviteSig: sig, deviceId: DEV.F, clientIp: IP.F });
  check('T2.5 同IP高频注册拦截(24h≥5)', F.inviteBound === false && F.inviteBoundReason === 'IP_BATCH_REGISTER', `reason=${F.inviteBoundReason}`);

  // 场景4：多来源冲突（signed_link(A) + code(B) → 取A，记冲突审计）
  const G = RR.createUser({ phone: P.G, password: PW, inviteRef: String(A.userId), inviteTs: String(ts), inviteSig: sig, inviteCode: B.inviteCode, deviceId: DEV.G, clientIp: IP.G });
  check('T2.6 多来源冲突取签名链接源(A)', G.inviteBound === true, `reason=${G.inviteBoundReason}`);
  const gRow = q1('SELECT invited_by FROM users WHERE user_id = ?', G.userId);
  check('T2.7 G绑定到A(首绑且高可信源)', gRow && gRow.invited_by === A.userId);

  // 场景5：伪造签名（sig错误不采信）
  const H = RR.createUser({ phone: P.H, password: PW, inviteRef: String(A.userId), inviteTs: String(ts), inviteSig: 'deadbeefdeadbeefdeadbeefdeadbeef', deviceId: DEV.H, clientIp: IP.H });
  check('T2.8 伪造签名拦截', H.inviteBound === false, `reason=${H.inviteBoundReason}`);

  // 场景6：已绑定不覆盖（数据复核：B绑定关系在全部场景后保持A不变）
  const bFinal = q1('SELECT invited_by FROM users WHERE user_id = ?', B.userId);
  check('T2.9 已绑定账号不被覆盖(复核)', bFinal && bFinal.invited_by === A.userId, `invited_by=${bFinal && bFinal.invited_by}`);

  // 审计留痕核查
  const testIds = [A.userId, B.userId, C.userId, D.userId, E.userId, F.userId, G.userId, H.userId];
  const inPh = testIds.map(() => '?').join(',');
  const audits = q(`SELECT invitee_id, inviter_id, source, result, reason FROM invite_audit WHERE invitee_id IN (${inPh}) OR inviter_id IN (${inPh}) ORDER BY id`, ...testIds, ...testIds);
  const rej = r => audits.filter(a => a.result === 'rejected' && a.reason === r).length;
  check('T3.1 审计:自邀/关联设备留痕', rej('SELF_OR_LINKED_DEVICE') >= 1);
  check('T3.2 审计:同设备批量留痕', rej('DEVICE_BATCH_REGISTER') >= 1);
  check('T3.3 审计:同IP批量留痕', rej('IP_BATCH_REGISTER') >= 1);
  check('T3.4 审计:伪造签名留痕', rej('SIG_INVALID') >= 1);
  check('T3.5 审计:多来源冲突留痕', audits.filter(a => a.result === 'conflict_logged').length >= 1);
  check('T3.6 审计:成功绑定留痕', audits.filter(a => a.result === 'bound').length >= 2);
  check('T3.7 审计:首付费留痕', audits.filter(a => a.result === 'first_pay_rewarded').length >= 1);

  // ================= T4 HTTP层前后台一致性 =================
  console.log('\n===== T4 HTTP层一致性(本机127.0.0.1:3001) =====');
  const login = JSON.parse(execSync(`curl -s -X POST http://127.0.0.1:3001/api/auth/login -H 'Content-Type: application/json' -d '{"phone":"${P.A}","password":"${PW}"}'`).toString());
  check('T4.1 A密码登录成功', login.success === true && !!login.data && !!login.data.accessToken);
  const token = login.data && login.data.accessToken;
  if (token) {
    const link = JSON.parse(execSync(`curl -s http://127.0.0.1:3001/api/auth/invite/link -H 'Authorization: Bearer ${token}'`).toString());
    check('T4.2 /invite/link返回签名链接', link.success === true && /ref=\d+&ts=\d+&sig=[0-9a-f]{32}/.test(link.data.inviteLink), (link.data && link.data.inviteLink || '').slice(-60));
    const ov = JSON.parse(execSync(`curl -s http://127.0.0.1:3001/api/auth/invite/overview -H 'Authorization: Bearer ${token}'`).toString());
    check('T4.3 overview邀请数=库(B+G)', ov.success === true && ov.data.stats.totalInvites === 2, `api=${ov.data && ov.data.stats.totalInvites}`);
    check('T4.4 overview累计奖励=B注册+G注册+B首付费', ov.success === true && ov.data.stats.totalRewardPoints === REG_PTS * 2 + PAY_PTS, `api=${ov.data && ov.data.stats.totalRewardPoints} 期望${REG_PTS * 2 + PAY_PTS}`);
    const pt = JSON.parse(execSync(`curl -s http://127.0.0.1:3001/api/auth/points/transactions -H 'Authorization: Bearer ${token}'`).toString());
    const txs = pt.data ? pt.data.transactions : [];
    check('T4.5 明细含邀请注册奖励', txs.some(t => t.type === 'invite_register' && t.amount === REG_PTS));
    check('T4.6 明细含邀请付费奖励', txs.some(t => t.type === 'invite_first_pay' && t.amount === PAY_PTS));
    check('T4.7 明细余额与库一致', pt.data && pt.data.balance === REG_PTS * 2 + PAY_PTS, `api=${pt.data && pt.data.balance} 期望${REG_PTS * 2 + PAY_PTS}`);
  }
} catch (e) {
  console.error('EXCEPTION:', e.message);
  failed++;
} finally {
  // ================= 备份 + 清理 =================
  console.log('\n===== 清理测试数据(先备份) =====');
  const ids = q(`SELECT user_id FROM users WHERE phone IN (${Object.values(P).map(() => '?').join(',')})`, ...Object.values(P)).map(r => r.user_id);
  if (ids.length) {
    const ph = ids.map(() => '?').join(',');
    const backup = {
      generatedAt: new Date().toISOString(),
      users: q(`SELECT * FROM users WHERE user_id IN (${ph})`, ...ids),
      user_assets: q(`SELECT * FROM user_assets WHERE user_id IN (${ph})`, ...ids),
      device_registry: q(`SELECT * FROM device_registry WHERE user_id IN (${ph}) OR device_id LIKE 'p9-e2e-%'`, ...ids),
      user_invite_relation: q(`SELECT * FROM user_invite_relation WHERE inviter_id IN (${ph}) OR invitee_id IN (${ph})`, ...ids, ...ids),
      invite_rewards: q(`SELECT * FROM invite_rewards WHERE inviter_id IN (${ph}) OR invitee_id IN (${ph})`, ...ids, ...ids),
      points_transactions: q(`SELECT * FROM points_transactions WHERE user_id IN (${ph})`, ...ids),
      operation_logs: q(`SELECT * FROM operation_logs WHERE user_id IN (${ph})`, ...ids),
      invite_audit: q(`SELECT * FROM invite_audit WHERE invitee_id IN (${ph}) OR inviter_id IN (${ph})`, ...ids, ...ids),
    };
    const bakPath = `/root/p9_e2e_backup_${Date.now()}.json`;
    fs.writeFileSync(bakPath, JSON.stringify(backup, null, 2));
    console.log('备份已写入:', bakPath);
    db.prepare(`DELETE FROM invite_audit WHERE invitee_id IN (${ph}) OR inviter_id IN (${ph})`).run(...ids, ...ids);
    db.prepare(`DELETE FROM points_transactions WHERE user_id IN (${ph})`).run(...ids);
    db.prepare(`DELETE FROM invite_rewards WHERE inviter_id IN (${ph}) OR invitee_id IN (${ph})`).run(...ids, ...ids);
    db.prepare(`DELETE FROM user_invite_relation WHERE inviter_id IN (${ph}) OR invitee_id IN (${ph})`).run(...ids, ...ids);
    db.prepare(`DELETE FROM operation_logs WHERE user_id IN (${ph})`).run(...ids);
    db.prepare(`DELETE FROM device_registry WHERE user_id IN (${ph}) OR device_id LIKE 'p9-e2e-%'`).run(...ids);
    db.prepare(`DELETE FROM user_assets WHERE user_id IN (${ph})`).run(...ids);
    db.prepare(`DELETE FROM users WHERE user_id IN (${ph})`).run(...ids);
    const remain = q(`SELECT COUNT(*) c FROM users WHERE phone IN (${Object.values(P).map(() => '?').join(',')})`, ...Object.values(P)).pop();
    console.log('清理后残留测试用户:', remain.c, '(期望0)');
    // 生产用户预置的同IP测试记录单独清（device_id LIKE p9-e2e-iphog-，user_id为真实用户，仅清device行）
    db.prepare(`DELETE FROM device_registry WHERE device_id LIKE 'p9-e2e-dev-iphog-%'`).run();
  } else {
    console.log('无测试用户需要清理');
  }
}

const pass = results.filter(r => r.ok).length;
console.log(`\n===== 汇总: ${pass}/${results.length} PASS, ${failed} FAIL =====`);
fs.writeFileSync('/root/p9_e2e_result.json', JSON.stringify({ pass, fail: failed, results, finishedAt: new Date().toISOString() }, null, 2));
process.exit(failed ? 2 : 0);
