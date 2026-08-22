/**
 * 言道国学 · 统一运营管理中心后端（FINAL-PRODUCTION-SEAL-03 第九~二十七章 + P8第五章）
 * 挂载: /api/admin/unified
 *
 * 角色体系（第十章）：
 *   SUPER_ADMIN(100) > ADMIN(80) > CONTENT_ADMIN(60) / FINANCE_ADMIN(60) > SUPPORT_ADMIN(40)
 *   密钥存 data/admin_roles.json；ADMIN_API_KEY 环境变量自动映射为 SUPER_ADMIN（向后兼容）
 *
 * 审计（第十章）：所有变更写 data/admin_audit.json —— operator/role/time/action/target/oldValue/newValue/reason/ip/ua
 *
 * 模块：
 *   /whoami                  当前管理员身份
 *   /overview                总览全量指标（第十一章）
 *   /audit                   审计日志（SUPER_ADMIN/ADMIN）
 *   /keys                    后台密钥管理（SUPER_ADMIN）
 *   /moderation/*            社交/内容审核（第十七章）：用户封禁禁言/动态下架/举报处理/违规群关闭
 *   /orders                  订单后台（第二十章）：列表 + 人工补单（SUPER_ADMIN+二次确认+原因）
 *   /payment-status          支付通道状态（第二十七章，不显示密钥）
 *   /commission/*            P8分佣后台：配置/佣金明细/提现审核/解冻
 */
'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const AUDIT_FILE = path.join(DATA_DIR, 'admin_audit.json');
const KEYS_FILE = path.join(DATA_DIR, 'admin_roles.json');
const USERS_DB_PATH = process.env.DB_PATH || '/root/backend-auth/data/yandao_users.db';
const SOCIAL_DB_PATH = path.join(DATA_DIR, 'social.db');

const ROLES = { SUPER_ADMIN: 100, ADMIN: 80, CONTENT_ADMIN: 60, FINANCE_ADMIN: 60, SUPPORT_ADMIN: 40 };
const router = express.Router();

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ==================== 密钥与角色 ====================

function loadKeys() {
  try {
    if (fs.existsSync(KEYS_FILE)) {
      const j = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf-8'));
      if (j && j.keys) return j.keys;
    }
  } catch (e) { console.error('[AdminUnified] keys读取失败:', e.message); }
  return {};
}

function resolveAdminKey(key) {
  if (!key) return null;
  const keys = loadKeys();
  if (keys[key]) {
    return { key, role: keys[key].role || 'ADMIN', name: keys[key].name || '管理员' };
  }
  // 向后兼容：环境变量主密钥 = SUPER_ADMIN
  const envKey = process.env.ADMIN_API_KEY;
  if (envKey && key === envKey) {
    return { key, role: 'SUPER_ADMIN', name: '主密钥管理员' };
  }
  return null;
}

function adminAuthUnified(minRole) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const admin = resolveAdminKey(token);
    if (!admin) return res.status(401).json({ success: false, error: '密钥无效' });
    if (minRole && (ROLES[admin.role] || 0) < ROLES[minRole]) {
      return res.status(403).json({ success: false, error: `权限不足（需要${minRole}）` });
    }
    req.admin = admin;
    next();
  };
}

// ==================== 审计日志 ====================

function audit(admin, action, target, oldValue, newValue, reason, req) {
  try {
    const entry = {
      id: Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
      operator: admin.name || 'unknown',
      operatorRole: admin.role,
      time: new Date().toISOString(),
      action,
      target: String(target || ''),
      oldValue: oldValue === undefined ? null : oldValue,
      newValue: newValue === undefined ? null : newValue,
      reason: String(reason || ''),
      ip: (req && req.headers['x-forwarded-for'] || req && req.socket && req.socket.remoteAddress || '').split(',')[0].trim(),
      ua: String((req && req.headers['user-agent']) || '').slice(0, 200),
    };
    let logs = [];
    try { logs = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8')); } catch { /* 新文件 */ }
    logs.push(entry);
    if (logs.length > 1000) logs = logs.slice(-1000); // 保留最近1000条
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 1));
  } catch (e) {
    console.error('[AdminUnified] 审计写入失败:', e.message);
  }
}

// ==================== 数据库 ====================

let _usersDb = null;
function getUsersDb() {
  if (_usersDb) return _usersDb;
  const Database = require('better-sqlite3');
  const db = new Database(USERS_DB_PATH);
  db.pragma('journal_mode = WAL');
  // 增量列（零破坏）：封禁状态/禁言到期
  const cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  if (!cols.includes('status')) db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
  if (!cols.includes('muted_until')) db.exec('ALTER TABLE users ADD COLUMN muted_until TEXT');
  _usersDb = db;
  return db;
}

let _socialDb = null;
function getSocialDb() {
  if (_socialDb) return _socialDb;
  const Database = require('better-sqlite3');
  const db = new Database(SOCIAL_DB_PATH);
  db.pragma('journal_mode = WAL');
  const cols = db.prepare('PRAGMA table_info(groups)').all().map(c => c.name);
  if (!cols.includes('status')) db.exec("ALTER TABLE groups ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
  _socialDb = db;
  return db;
}

// ==================== 身份 ====================

router.get('/whoami', adminAuthUnified('SUPPORT_ADMIN'), (req, res) => {
  res.json({ success: true, data: { name: req.admin.name, role: req.admin.role, roleLevel: ROLES[req.admin.role] } });
});

// ==================== 密钥管理（SUPER_ADMIN） ====================

router.get('/keys', adminAuthUnified('SUPER_ADMIN'), (_req, res) => {
  const keys = loadKeys();
  const list = Object.entries(keys).map(([k, v]) => ({
    keyMasked: k.slice(0, 4) + '****' + k.slice(-4),
    role: v.role,
    name: v.name,
    createdAt: v.createdAt,
  }));
  res.json({ success: true, data: { keys: list, envKeyMapped: !!process.env.ADMIN_API_KEY } });
});

router.post('/keys', adminAuthUnified('SUPER_ADMIN'), (req, res) => {
  const { role, name } = req.body || {};
  if (!role || !ROLES[role]) return res.status(400).json({ success: false, error: '角色无效' });
  if (role === 'SUPER_ADMIN') {
    return res.status(400).json({ success: false, error: 'SUPER_ADMIN 仅允许环境变量主密钥，不可签发' });
  }
  const newKey = 'YDADM_' + crypto.randomBytes(16).toString('hex');
  const keys = loadKeys();
  keys[newKey] = { role, name: String(name || role).slice(0, 24), createdAt: new Date().toISOString() };
  fs.writeFileSync(KEYS_FILE, JSON.stringify({ keys }, null, 2));
  audit(req.admin, 'ADMIN_KEY_CREATE', name || role, null, { role }, '创建后台密钥', req);
  res.json({ success: true, data: { key: newKey, role, name: name || role } });
});

router.delete('/keys/:masked', adminAuthUnified('SUPER_ADMIN'), (req, res) => {
  // 按掩码匹配删除，避免密钥明文再传输
  const masked = req.params.masked;
  const keys = loadKeys();
  const hit = Object.keys(keys).find(k => (k.slice(0, 4) + '****' + k.slice(-4)) === masked);
  if (!hit) return res.status(404).json({ success: false, error: '密钥不存在' });
  const old = { role: keys[hit].role, name: keys[hit].name };
  delete keys[hit];
  fs.writeFileSync(KEYS_FILE, JSON.stringify({ keys }, null, 2));
  audit(req.admin, 'ADMIN_KEY_DELETE', old.name, old, null, '删除后台密钥', req);
  res.json({ success: true });
});

// ==================== 总览（第十一章） ====================

router.get('/overview', adminAuthUnified('SUPPORT_ADMIN'), (_req, res) => {
  try {
    const udb = getUsersDb();
    const sdb = getSocialDb();
    const data = {
      users: {}, membership: {}, orders: {}, ai: {}, social: {}, moderation: {},
      server: {}, version: '', generatedAt: new Date().toISOString(),
    };
    try {
      data.users.total = udb.prepare('SELECT COUNT(*) c FROM users').get().c;
      data.users.newToday = udb.prepare("SELECT COUNT(*) c FROM users WHERE created_at >= date('now')").get().c;
      data.users.active7d = udb.prepare("SELECT COUNT(*) c FROM users WHERE last_login_at >= datetime('now', '-7 days')").get().c;
      data.membership.paid = udb.prepare("SELECT COUNT(*) c FROM users WHERE member_level != 'basic'").get().c;
    } catch (e) { console.error('[overview] users:', e.message); }
    try {
      data.orders.total = udb.prepare('SELECT COUNT(*) c FROM user_orders').get().c;
      data.orders.paid = udb.prepare("SELECT COUNT(*) c FROM user_orders WHERE status = 'PAID'").get().c;
      data.orders.pending = udb.prepare("SELECT COUNT(*) c FROM user_orders WHERE status = 'PENDING'").get().c;
      const rev = udb.prepare("SELECT COALESCE(SUM(amount),0) s FROM user_orders WHERE status = 'PAID'").get();
      data.orders.revenueYuan = (Number(rev.s) || 0).toFixed(2);
    } catch (e) { console.error('[overview] orders:', e.message); }
    try {
      data.social.groups = sdb.prepare('SELECT COUNT(*) c FROM groups').get().c;
      data.social.posts = sdb.prepare('SELECT COUNT(*) c FROM posts').get().c;
      data.social.comments = sdb.prepare('SELECT COUNT(*) c FROM comments').get().c;
      data.moderation.reportsPending = sdb.prepare("SELECT COUNT(*) c FROM reports WHERE status = 'pending'").get().c;
      data.moderation.reportsTotal = sdb.prepare('SELECT COUNT(*) c FROM reports').get().c;
      data.moderation.postsHidden = sdb.prepare("SELECT COUNT(*) c FROM posts WHERE status != 'active'").get().c;
      data.moderation.groupsClosed = sdb.prepare("SELECT COUNT(*) c FROM groups WHERE status = 'closed'").get().c;
      data.moderation.usersBanned = udb.prepare("SELECT COUNT(*) c FROM users WHERE status = 'banned'").get().c;
    } catch (e) { console.error('[overview] social:', e.message); }
    try {
      const aiCfg = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'ai_admin_config.json'), 'utf-8'));
      data.ai.totalCalls = aiCfg.usage ? (aiCfg.usage.totalCalls || 0) : 0;
      data.ai.enabled = aiCfg.globalEnabled !== false;
    } catch { data.ai = { totalCalls: 0, enabled: true }; }
    try {
      const commissionEngine = require('./commissionEngine');
      const cdb = commissionEngine.getDb();
      const c = cdb.prepare("SELECT COUNT(*) c, COALESCE(SUM(commission_cents),0) s FROM commission_records WHERE record_type='COMMISSION' AND status != 'REVERSED'").get();
      data.commission = {
        records: c.c,
        totalYuan: (c.s / 100).toFixed(2),
        withdrawalsPending: cdb.prepare("SELECT COUNT(*) c FROM withdrawals WHERE status = 'PENDING_REVIEW'").get().c,
      };
    } catch (e) { data.commission = { records: 0, totalYuan: '0.00', withdrawalsPending: 0 }; }
    try {
      const ver = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'current', 'version.json'), 'utf-8'));
      data.version = ver.buildId || ver.version || '';
    } catch {
      try {
        const ver = JSON.parse(fs.readFileSync('/root/yandaoguoxue/current/version.json', 'utf-8'));
        data.version = ver.buildId || ver.version || '';
      } catch { data.version = 'unknown'; }
    }
    const mem = process.memoryUsage();
    data.server = {
      uptimeHours: (process.uptime() / 3600).toFixed(1),
      memoryMB: (mem.rss / 1024 / 1024).toFixed(0),
      nodeVersion: process.version,
      pid: process.pid,
    };
    res.json({ success: true, data });
  } catch (e) {
    console.error('[overview] error:', e.message);
    res.status(500).json({ success: false, error: '总览查询失败' });
  }
});

// ==================== 审计日志 ====================

router.get('/audit', adminAuthUnified('ADMIN'), (req, res) => {
  try {
    let logs = [];
    try { logs = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8')); } catch { /* 空 */ }
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
    const action = req.query.action;
    let list = logs.slice().reverse();
    if (action) list = list.filter(l => (l.action || '').includes(action));
    res.json({ success: true, data: list.slice(0, limit) });
  } catch (e) {
    res.status(500).json({ success: false, error: '审计查询失败' });
  }
});

// ==================== 社交/内容审核（第十七章） ====================

router.get('/moderation/users', adminAuthUnified('SUPPORT_ADMIN'), (req, res) => {
  try {
    const udb = getUsersDb();
    const q = String(req.query.query || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.min(50, parseInt(req.query.size, 10) || 20);
    let where = '1=1'; const params = [];
    if (q) {
      if (/^\d+$/.test(q)) { where = 'user_id = ? OR phone LIKE ? OR nickname LIKE ?'; params.push(parseInt(q, 10), '%' + q + '%', '%' + q + '%'); }
      else { where = 'nickname LIKE ? OR phone LIKE ?'; params.push('%' + q + '%', '%' + q + '%'); }
    }
    const total = udb.prepare(`SELECT COUNT(*) c FROM users WHERE ${where}`).get(...params).c;
    const rows = udb.prepare(`SELECT user_id, nickname, phone, member_level, status, muted_until, created_at, last_login_at
                              FROM users WHERE ${where} ORDER BY user_id DESC LIMIT ? OFFSET ?`)
      .all(...params, size, (page - 1) * size);
    res.json({ success: true, data: { total, page, size, users: rows.map(r => ({ ...r, phone: r.phone ? r.phone.slice(0, 3) + '****' + r.phone.slice(-4) : '' })) } });
  } catch (e) {
    console.error('[moderation/users]', e.message);
    res.status(500).json({ success: false, error: '用户查询失败' });
  }
});

router.post('/moderation/users/:userId/action', adminAuthUnified('SUPPORT_ADMIN'), (req, res) => {
  try {
    const udb = getUsersDb();
    const userId = parseInt(req.params.userId, 10);
    const { action, hours, reason } = req.body || {};
    if (!userId || !action) return res.status(400).json({ success: false, error: '参数无效' });
    const user = udb.prepare('SELECT user_id, nickname, status, muted_until FROM users WHERE user_id = ?').get(userId);
    if (!user) return res.status(404).json({ success: false, error: '用户不存在' });
    const oldValue = { status: user.status, muted_until: user.muted_until };

    if (action === 'ban') {
      if (req.admin.role === 'SUPPORT_ADMIN') return res.status(403).json({ success: false, error: '封禁需要 ADMIN 及以上权限' });
      udb.prepare("UPDATE users SET status = 'banned', updated_at = ? WHERE user_id = ?").run(new Date().toISOString(), userId);
    } else if (action === 'unban') {
      if (req.admin.role === 'SUPPORT_ADMIN') return res.status(403).json({ success: false, error: '解封需要 ADMIN 及以上权限' });
      udb.prepare("UPDATE users SET status = 'active', updated_at = ? WHERE user_id = ?").run(new Date().toISOString(), userId);
    } else if (action === 'mute') {
      const h = Math.max(1, Math.min(720, parseInt(hours, 10) || 24));
      udb.prepare('UPDATE users SET muted_until = ?, updated_at = ? WHERE user_id = ?')
        .run(new Date(Date.now() + h * 3600000).toISOString(), new Date().toISOString(), userId);
    } else if (action === 'unmute') {
      udb.prepare('UPDATE users SET muted_until = NULL, updated_at = ? WHERE user_id = ?').run(new Date().toISOString(), userId);
    } else {
      return res.status(400).json({ success: false, error: 'action 必须是 ban/unban/mute/unmute' });
    }
    const after = udb.prepare('SELECT status, muted_until FROM users WHERE user_id = ?').get(userId);
    audit(req.admin, 'USER_' + action.toUpperCase(), `user:${userId}(${user.nickname || ''})`, oldValue, after, reason, req);
    res.json({ success: true, data: after });
  } catch (e) {
    console.error('[moderation/user/action]', e.message);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

router.get('/moderation/posts', adminAuthUnified('SUPPORT_ADMIN'), (req, res) => {
  try {
    const sdb = getSocialDb();
    const status = req.query.status;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.min(50, parseInt(req.query.size, 10) || 20);
    let where = '1=1'; const params = [];
    if (status) { where = 'status = ?'; params.push(status); }
    const total = sdb.prepare(`SELECT COUNT(*) c FROM posts WHERE ${where}`).get(...params).c;
    const rows = sdb.prepare(`SELECT post_id, user_id, nickname, content, status, like_count, comment_count, created_at
                              FROM posts WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, size, (page - 1) * size);
    res.json({ success: true, data: { total, page, size, posts: rows } });
  } catch (e) {
    res.status(500).json({ success: false, error: '动态查询失败' });
  }
});

router.post('/moderation/posts/:postId/action', adminAuthUnified('CONTENT_ADMIN'), (req, res) => {
  try {
    const sdb = getSocialDb();
    const { action, reason } = req.body || {};
    const post = sdb.prepare('SELECT post_id, user_id, nickname, status FROM posts WHERE post_id = ?').get(req.params.postId);
    if (!post) return res.status(404).json({ success: false, error: '动态不存在' });
    let newStatus;
    if (action === 'takedown') newStatus = 'removed';
    else if (action === 'restore') newStatus = 'active';
    else return res.status(400).json({ success: false, error: 'action 必须是 takedown/restore' });
    sdb.prepare('UPDATE posts SET status = ? WHERE post_id = ?').run(newStatus, req.params.postId);
    audit(req.admin, 'POST_' + action.toUpperCase(), `post:${req.params.postId}(user:${post.user_id})`, post.status, newStatus, reason, req);
    res.json({ success: true, data: { status: newStatus } });
  } catch (e) {
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

router.get('/moderation/reports', adminAuthUnified('SUPPORT_ADMIN'), (req, res) => {
  try {
    const sdb = getSocialDb();
    const status = req.query.status;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.min(50, parseInt(req.query.size, 10) || 20);
    let where = '1=1'; const params = [];
    if (status) { where = 'status = ?'; params.push(status); }
    const total = sdb.prepare(`SELECT COUNT(*) c FROM reports WHERE ${where}`).get(...params).c;
    const rows = sdb.prepare(`SELECT id, target_type, target_id, reporter_id, reporter_name, reason, status, created_at
                              FROM reports WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, size, (page - 1) * size);
    res.json({ success: true, data: { total, page, size, reports: rows } });
  } catch (e) {
    res.status(500).json({ success: false, error: '举报查询失败' });
  }
});

router.post('/moderation/reports/:id/action', adminAuthUnified('SUPPORT_ADMIN'), (req, res) => {
  try {
    const sdb = getSocialDb();
    const { action, reason } = req.body || {};
    const rep = sdb.prepare('SELECT id, target_type, target_id, status FROM reports WHERE id = ?').get(parseInt(req.params.id, 10));
    if (!rep) return res.status(404).json({ success: false, error: '举报不存在' });
    let newStatus;
    if (action === 'resolve') newStatus = 'resolved';
    else if (action === 'reject') newStatus = 'rejected';
    else return res.status(400).json({ success: false, error: 'action 必须是 resolve/reject' });
    sdb.prepare('UPDATE reports SET status = ? WHERE id = ?').run(newStatus, rep.id);
    audit(req.admin, 'REPORT_' + action.toUpperCase(), `report:${rep.id}(${rep.target_type}:${rep.target_id})`, rep.status, newStatus, reason, req);
    res.json({ success: true, data: { status: newStatus } });
  } catch (e) {
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

router.get('/moderation/groups', adminAuthUnified('SUPPORT_ADMIN'), (req, res) => {
  try {
    const sdb = getSocialDb();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.min(50, parseInt(req.query.size, 10) || 20);
    const total = sdb.prepare('SELECT COUNT(*) c FROM groups').get().c;
    const rows = sdb.prepare(`SELECT id, name, owner_id, owner_name, status, created_at,
                                     length(member_ids) - length(replace(member_ids, ',', '')) + 1 AS member_count
                              FROM groups ORDER BY id DESC LIMIT ? OFFSET ?`).all(size, (page - 1) * size);
    res.json({ success: true, data: { total, page, size, groups: rows } });
  } catch (e) {
    res.status(500).json({ success: false, error: '群查询失败' });
  }
});

router.post('/moderation/groups/:id/action', adminAuthUnified('CONTENT_ADMIN'), (req, res) => {
  try {
    const sdb = getSocialDb();
    const { action, reason } = req.body || {};
    const g = sdb.prepare('SELECT id, name, status FROM groups WHERE id = ?').get(req.params.id);
    if (!g) return res.status(404).json({ success: false, error: '群不存在' });
    let newStatus;
    if (action === 'close') newStatus = 'closed';
    else if (action === 'reopen') newStatus = 'active';
    else return res.status(400).json({ success: false, error: 'action 必须是 close/reopen' });
    sdb.prepare('UPDATE groups SET status = ? WHERE id = ?').run(newStatus, g.id);
    audit(req.admin, 'GROUP_' + action.toUpperCase(), `group:${g.id}(${g.name})`, g.status, newStatus, reason, req);
    res.json({ success: true, data: { status: newStatus } });
  } catch (e) {
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

router.get('/moderation/blacklists', adminAuthUnified('SUPPORT_ADMIN'), (_req, res) => {
  try {
    const sdb = getSocialDb();
    const rows = sdb.prepare('SELECT user_id, blocked_id, created_at FROM blacklists ORDER BY rowid DESC LIMIT 200').all();
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: '黑名单查询失败' });
  }
});

// ==================== 订单后台（第二十章） ====================

router.get('/orders', adminAuthUnified('FINANCE_ADMIN'), (req, res) => {
  try {
    const udb = getUsersDb();
    const status = req.query.status;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.min(100, parseInt(req.query.size, 10) || 20);
    let where = '1=1'; const params = [];
    if (status) { where = 'o.status = ?'; params.push(status); }
    const total = udb.prepare(`SELECT COUNT(*) c FROM user_orders o WHERE ${where}`).get(...params).c;
    const rows = udb.prepare(`SELECT o.order_no, o.user_id, u.nickname, o.amount, o.order_type, o.status, o.payment_method, o.created_at, o.paid_at
                              FROM user_orders o LEFT JOIN users u ON u.user_id = o.user_id
                              WHERE ${where} ORDER BY o.id DESC LIMIT ? OFFSET ?`).all(...params, size, (page - 1) * size);
    // 关联返佣状态
    const rebates = udb.prepare('SELECT order_no, status FROM consumption_rebates').all();
    const rebateMap = {}; for (const r of rebates) rebateMap[r.order_no] = r.status;
    res.json({ success: true, data: { total, page, size, orders: rows.map(r => ({ ...r, rebateStatus: rebateMap[r.order_no] || null })) } });
  } catch (e) {
    console.error('[orders]', e.message);
    res.status(500).json({ success: false, error: '订单查询失败' });
  }
});

/**
 * 人工补单（第二十章）：SUPER_ADMIN + 二次确认(confirm:true) + 原因(≥4字)
 * 复用 paymentRoutes.updateOrderRecord —— 与真实回调同一状态机（含分佣/返佣/首付费奖励/持久化）
 */
router.post('/orders/:orderId/confirm', adminAuthUnified('SUPER_ADMIN'), (req, res) => {
  try {
    const { confirm, reason, channel } = req.body || {};
    if (confirm !== true) return res.status(400).json({ success: false, error: '需二次确认（confirm: true）' });
    if (!reason || String(reason).trim().length < 4) {
      return res.status(400).json({ success: false, error: '必须填写补单原因（至少4个字）' });
    }
    const paymentRoutes = require('./paymentRoutes');
    const order = paymentRoutes.getOrderRecord(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, error: '订单不存在或已过期' });
    if (order.status === 'PAID') return res.status(400).json({ success: false, error: '订单已是 PAID 状态' });
    const updated = paymentRoutes.updateOrderRecord(order.orderId, 'PAID', channel || 'manual_confirm');
    audit(req.admin, 'ORDER_MANUAL_CONFIRM', `order:${order.orderId}(user:${order.userId})`, order.status, 'PAID', reason, req);
    res.json({ success: true, data: { orderId: updated.orderId, status: updated.status, paidAt: updated.paidAt } });
  } catch (e) {
    console.error('[order/confirm]', e.message);
    res.status(500).json({ success: false, error: '补单失败' });
  }
});

// ==================== 支付通道状态（第二十七章，不显示密钥） ====================

router.get('/payment-status', adminAuthUnified('FINANCE_ADMIN'), (_req, res) => {
  const wechat = {
    configured: false,
    missing: [],
    oauthConfigured: false,
    status: 'NOT_CONFIGURED',
  };
  const env = process.env;
  const required = [
    ['WECHAT_MCH_ID', '商户号'],
    ['WECHAT_APPID', 'AppID'],
    ['WECHAT_API_V3_KEY', 'APIv3密钥'],
    ['WECHAT_CERT_SERIAL_NO', '证书序列号'],
  ];
  for (const [k, label] of required) {
    if (env[k]) wechat.configured = true; else wechat.missing.push(k);
  }
  const keyPath = env.WECHAT_API_CERT_PATH || (env.WECHAT_PRIVATE_KEY_PATH);
  if (keyPath && fs.existsSync(keyPath)) wechat.configured = wechat.configured && true; else wechat.missing.push('WECHAT_API_CERT_PATH(私钥文件)');
  if (env.WECHAT_APP_SECRET) wechat.oauthConfigured = true; else wechat.missing.push('WECHAT_APP_SECRET');
  let enabled = false;
  try { enabled = require('./paymentRoutes').isPaymentEnabled(); } catch { /* ignore */ }
  if (!wechat.configured || wechat.missing.length) wechat.status = 'PARTIAL_CONFIGURED';
  else if (enabled) wechat.status = 'ENABLED';
  else wechat.status = 'CONFIGURED';
  res.json({ success: true, data: { wechat, iosPaymentEnabled: false } });
});

// ==================== P8 分佣后台（第五章） ====================

router.get('/commission/config', adminAuthUnified('FINANCE_ADMIN'), (_req, res) => {
  const commissionEngine = require('./commissionEngine');
  res.json({ success: true, data: commissionEngine.getConfig() });
});

router.put('/commission/config', adminAuthUnified('SUPER_ADMIN'), (req, res) => {
  const commissionEngine = require('./commissionEngine');
  const oldCfg = commissionEngine.getConfig();
  const patch = req.body || {};
  const cfg = {
    ...oldCfg,
    ...patch,
    ratios: { ...oldCfg.ratios, ...(patch.ratios || {}) },
    riskControl: { ...oldCfg.riskControl, ...(patch.riskControl || {}) },
  };
  commissionEngine.saveConfig(cfg);
  audit(req.admin, 'COMMISSION_CONFIG_UPDATE', 'commission_config', oldCfg, cfg, patch.__reason || '更新分佣配置', req);
  res.json({ success: true, data: cfg });
});

router.get('/commission/records', adminAuthUnified('FINANCE_ADMIN'), (req, res) => {
  try {
    const commissionEngine = require('./commissionEngine');
    const db = commissionEngine.getDb();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.min(100, parseInt(req.query.size, 10) || 20);
    const inviter = req.query.inviter;
    const status = req.query.status;
    let where = "record_type = 'COMMISSION'"; const params = [];
    if (inviter) { where += ' AND inviter_user_id = ?'; params.push(parseInt(inviter, 10)); }
    if (status) { where += ' AND status = ?'; params.push(status); }
    const total = db.prepare(`SELECT COUNT(*) c FROM commission_records WHERE ${where}`).get(...params).c;
    const rows = db.prepare(`SELECT r.order_no, r.payer_user_id, r.inviter_user_id, r.ratio_percent, r.base_amount_cents, r.commission_cents, r.status, r.created_at, r.unfreeze_at, r.note,
                                    ui.nickname AS inviter_name, up.nickname AS payer_name
                             FROM commission_records r
                             LEFT JOIN users ui ON ui.user_id = r.inviter_user_id
                             LEFT JOIN users up ON up.user_id = r.payer_user_id
                             WHERE ${where} ORDER BY r.id DESC LIMIT ? OFFSET ?`).all(...params, size, (page - 1) * size);
    res.json({ success: true, data: { total, page, size, records: rows } });
  } catch (e) {
    console.error('[commission/records]', e.message);
    res.status(500).json({ success: false, error: '佣金明细查询失败' });
  }
});

router.get('/commission/withdrawals', adminAuthUnified('FINANCE_ADMIN'), (req, res) => {
  try {
    const commissionEngine = require('./commissionEngine');
    const db = commissionEngine.getDb();
    const status = req.query.status;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.min(100, parseInt(req.query.size, 10) || 20);
    let where = '1=1'; const params = [];
    if (status) { where = 'w.status = ?'; params.push(status); }
    const total = db.prepare(`SELECT COUNT(*) c FROM withdrawals w WHERE ${where}`).get(...params).c;
    const rows = db.prepare(`SELECT w.id, w.withdraw_no, w.user_id, u.nickname, w.amount_cents, w.status, w.fail_reason, w.reviewed_by, w.reviewed_at, w.created_at, w.paid_at
                             FROM withdrawals w LEFT JOIN users u ON u.user_id = w.user_id
                             WHERE ${where} ORDER BY w.id DESC LIMIT ? OFFSET ?`).all(...params, size, (page - 1) * size);
    res.json({ success: true, data: { total, page, size, withdrawals: rows } });
  } catch (e) {
    console.error('[commission/withdrawals]', e.message);
    res.status(500).json({ success: false, error: '提现查询失败' });
  }
});

/**
 * 提现审核通过（P8第四章·自动打款流程）
 * 阶段一：状态 → PROCESSING（待人工打款/阶段二自动商家转账）
 * 阶段二（商家转账配置后）：自动调用微信转账，成功→PAID，失败→FAILED退回余额
 */
router.post('/commission/withdrawals/:id/approve', adminAuthUnified('SUPER_ADMIN'), (req, res) => {
  try {
    const { reason } = req.body || {};
    const commissionEngine = require('./commissionEngine');
    const db = commissionEngine.getDb();
    const w = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(parseInt(req.params.id, 10));
    if (!w) return res.status(404).json({ success: false, error: '提现申请不存在' });
    if (w.status !== 'PENDING_REVIEW') return res.status(400).json({ success: false, error: '仅待审核状态可审核' });

    // 阶段二自动打款（商家转账配置齐备时）
    let transferResult = null;
    let newStatus = 'PROCESSING';
    let paidAt = null;
    let transferNo = null;
    try {
      const wechatTransfer = require('./wechatTransfer');
      const r = wechatTransfer.transfer({
        withdrawNo: w.withdraw_no,
        openid: w.openid,
        amountCents: w.amount_cents,
        note: commissionEngine.getConfig().transferNote,
      });
      transferResult = r;
      if (r && r.success) { newStatus = 'PAID'; paidAt = new Date().toISOString(); transferNo = r.transferNo || null; }
      else if (r && r.notConfigured) { /* 未配置 → 保持 PROCESSING 人工打款 */ }
      else { newStatus = 'FAILED'; }
    } catch (e) {
      // wechatTransfer 模块不存在（阶段一）→ PROCESSING 人工打款
      if (!/Cannot find module/.test(e.message)) console.error('[withdraw/approve] transfer:', e.message);
    }

    db.prepare('UPDATE withdrawals SET status = ?, reviewed_by = ?, reviewed_at = ?, paid_at = ?, wechat_transfer_no = ?, fail_reason = ? WHERE id = ?')
      .run(newStatus, `${req.admin.name}(${req.admin.role})`, new Date().toISOString(), paidAt, transferNo,
           newStatus === 'FAILED' ? ((transferResult && transferResult.error) || '转账失败') : null, w.id);
    if (newStatus === 'FAILED') {
      // 失败退回可提现余额
      db.prepare('UPDATE commission_accounts SET withdrawable_cents = withdrawable_cents + ?, updated_at = ? WHERE user_id = ?')
        .run(w.amount_cents, new Date().toISOString(), w.user_id);
    }
    audit(req.admin, 'WITHDRAW_APPROVE', `withdraw:${w.withdraw_no}(user:${w.user_id}金额${(w.amount_cents / 100).toFixed(2)}元)`, w.status, newStatus, reason || '', req);
    res.json({ success: true, data: { withdrawNo: w.withdraw_no, status: newStatus, transfer: transferResult } });
  } catch (e) {
    console.error('[withdraw/approve]', e.message);
    res.status(500).json({ success: false, error: '审核失败' });
  }
});

router.post('/commission/withdrawals/:id/reject', adminAuthUnified('SUPER_ADMIN'), (req, res) => {
  try {
    const { reason } = req.body || {};
    if (!reason || String(reason).trim().length < 2) return res.status(400).json({ success: false, error: '必须填写驳回原因' });
    const commissionEngine = require('./commissionEngine');
    const db = commissionEngine.getDb();
    const w = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(parseInt(req.params.id, 10));
    if (!w) return res.status(404).json({ success: false, error: '提现申请不存在' });
    if (w.status !== 'PENDING_REVIEW') return res.status(400).json({ success: false, error: '仅待审核状态可驳回' });
    const tx = db.transaction(() => {
      db.prepare("UPDATE withdrawals SET status = 'REJECTED', reviewed_by = ?, reviewed_at = ?, fail_reason = ? WHERE id = ?")
        .run(`${req.admin.name}(${req.admin.role})`, new Date().toISOString(), String(reason).slice(0, 200), w.id);
      db.prepare('UPDATE commission_accounts SET withdrawable_cents = withdrawable_cents + ?, updated_at = ? WHERE user_id = ?')
        .run(w.amount_cents, new Date().toISOString(), w.user_id);
    });
    tx();
    audit(req.admin, 'WITHDRAW_REJECT', `withdraw:${w.withdraw_no}(user:${w.user_id})`, w.status, 'REJECTED', reason, req);
    res.json({ success: true });
  } catch (e) {
    console.error('[withdraw/reject]', e.message);
    res.status(500).json({ success: false, error: '驳回失败' });
  }
});

/** 手动触发解冻扫描（定时任务兜底） */
router.post('/commission/run-unfreeze', adminAuthUnified('ADMIN'), (req, res) => {
  const commissionEngine = require('./commissionEngine');
  const n = commissionEngine.runUnfreeze();
  audit(req.admin, 'COMMISSION_UNFREEZE_RUN', 'commission_records', null, { unfrozen: n }, '手动触发解冻', req);
  res.json({ success: true, data: { unfrozen: n } });
});

// ==================== 导出 ====================

function createRouter() { return router; }
module.exports = createRouter;
module.exports.createRouter = createRouter;
