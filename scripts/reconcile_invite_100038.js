// ============================================================================
// P7-社交修复-01 人工对账补绑（一次性脚本，服务器 /root/backend-auth 下运行）
// 背景：用户100038（邮箱 wuzhimin666@163.com 注册，2026-08-18 14:02:32）经邀请人100000
// 分享链接注册，但 v25.0.37 前邮箱注册链路完全丢失邀请上下文（不上送 ref/sig/deviceId），
// 导致服务端归因为空。经项目方确认，按服务端 bindInviteAndReward 同款逻辑补绑+补发注册奖励。
// 幂等：已绑定/已发奖则跳过，可安全重复执行。
// 用法：cd /root/backend-auth && node /tmp/reconcile_invite_100038.js
// ============================================================================
const Database = require('better-sqlite3');
const DB_PATH = process.env.DB_PATH || '/root/backend-auth/data/yandao_users.db';

const INVITER_ID = 100000;
const INVITEE_ID = 100038;
const REGISTER_POINTS = Number(process.env.INVITE_REWARD_REGISTER) || 50;

const db = new Database(DB_PATH);
console.log('[reconcile] DB:', DB_PATH);

const invitee = db.prepare('SELECT user_id, email, invited_by, created_at FROM users WHERE user_id = ?').get(INVITEE_ID);
const inviter = db.prepare('SELECT user_id, nickname, invited_by FROM users WHERE user_id = ?').get(INVITER_ID);
if (!invitee) { console.error('[reconcile] FATAL: invitee not found'); process.exit(1); }
if (!inviter) { console.error('[reconcile] FATAL: inviter not found'); process.exit(1); }
if (invitee.invited_by === INVITER_ID) {
  console.log('[reconcile] SKIP: already bound to', INVITER_ID);
  process.exit(0);
}
if (invitee.invited_by) {
  console.error('[reconcile] FATAL: already bound to other inviter', invitee.invited_by, '（首绑优先不可覆盖）');
  process.exit(1);
}

const apply = db.transaction(() => {
  db.prepare('UPDATE users SET invited_by = ? WHERE user_id = ?').run(INVITER_ID, INVITEE_ID);
  db.prepare('INSERT INTO user_invite_relation (inviter_id, invitee_id, level) VALUES (?, ?, 1)').run(INVITER_ID, INVITEE_ID);
  try {
    db.prepare('INSERT INTO invite_rewards (invitee_id, inviter_id, reward_type, points, status) VALUES (?, ?, ?, ?, ?)')
      .run(INVITEE_ID, INVITER_ID, 'register', REGISTER_POINTS, 'granted');
    db.prepare(`INSERT OR IGNORE INTO user_assets (user_id, points_balance, star_rating, star_rating_count, member_level) VALUES (?, 0, 0, 0, 'basic')`).run(INVITER_ID);
    db.prepare('UPDATE user_assets SET points_balance = points_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(REGISTER_POINTS, INVITER_ID);
    const bal = db.prepare('SELECT points_balance FROM user_assets WHERE user_id = ?').get(INVITER_ID);
    db.prepare('INSERT INTO points_transactions (user_id, tx_type, amount, balance_after, ref_id, note) VALUES (?, ?, ?, ?, ?, ?)')
      .run(INVITER_ID, 'invite_register', REGISTER_POINTS, bal ? bal.points_balance : 0, INVITEE_ID, '邀请新用户注册奖励(单层)·邮箱链路丢失人工对账补发');
  } catch (e) {
    console.warn('[reconcile] reward idempotent skip:', e.message);
  }
  db.prepare('INSERT INTO invite_audit (invitee_id, inviter_id, source, result, reason, ip, device_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(INVITEE_ID, INVITER_ID, 'manual_reconcile', 'bound', 'OWNER_CONFIRMED_EMAIL_REG_ATTR_FIX', '', '');
});
apply();

const check = db.prepare('SELECT invited_by FROM users WHERE user_id = ?').get(INVITEE_ID);
const bal2 = db.prepare('SELECT points_balance FROM user_assets WHERE user_id = ?').get(INVITER_ID);
const rel = db.prepare('SELECT * FROM user_invite_relation WHERE inviter_id = ? AND invitee_id = ?').get(INVITER_ID, INVITEE_ID);
const rw = db.prepare('SELECT * FROM invite_rewards WHERE invitee_id = ? AND reward_type = ?').get(INVITEE_ID, 'register');
console.log('[reconcile] DONE', JSON.stringify({ invited_by: check.invited_by, relation: !!rel, reward: rw ? { points: rw.points, status: rw.status } : null, inviterBalance: bal2 ? bal2.points_balance : null }, null, 2));
