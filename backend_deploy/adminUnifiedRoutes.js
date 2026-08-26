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
const USERS_DB_PATH = process.env.DB_PATH || '/root/backend-auth/data/yandao_users.db';
const SOCIAL_DB_PATH = path.join(DATA_DIR, 'social.db');

// v25.0.47_13: 统一角色权限模块（ROLES/ROLE_SCOPES/鉴权/审计/子密钥管理，全后台唯一事实源）
const adminRoles = require('./adminRoles');
const { ROLES, ROLE_LABELS, adminAuth, audit } = adminRoles;
// 兼容旧名（本文件内部全部路由使用）
const adminAuthUnified = adminAuth;

const router = express.Router();

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// v25.0.47_10: PM2 存活探测（驾驶舱后端状态）
function pm2Alive() {
  try {
    const out = require('child_process').execSync('pm2 pid yandaoguoxue-backend 2>/dev/null').toString().trim();
    return /^\d+$/.test(out) && out !== '0';
  } catch (e) { return true; } // 探测失败默认存活（请求能到这里说明进程活着）
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

router.get('/whoami', adminAuthUnified(), (req, res) => {
  res.json({
    success: true,
    data: {
      name: req.admin.name,
      role: req.admin.role,
      roleLevel: ROLES[req.admin.role],
      roleLabel: ROLE_LABELS[req.admin.role] || req.admin.role,
      scopes: adminRoles.ROLE_SCOPES[req.admin.role] || [],
    },
  });
});

// ==================== 密钥管理（SUPER_ADMIN，v25.0.47_13 哈希存储） ====================

router.get('/keys', adminAuthUnified('SUPER_ADMIN'), (_req, res) => {
  res.json({ success: true, data: { keys: adminRoles.listSubKeys(), envKeyMapped: !!process.env.ADMIN_API_KEY } });
});

router.post('/keys', adminAuthUnified('SUPER_ADMIN'), (req, res) => {
  const { role, name } = req.body || {};
  const r = adminRoles.createSubKey(role, name);
  if (!r.ok) return res.status(400).json({ success: false, error: r.error });
  audit(req.admin, 'ADMIN_KEY_CREATE', name || role, null, { role }, '创建后台子密钥（哈希落盘）', req);
  // 明文仅本次返回，刷新后不可再查
  res.json({ success: true, data: { key: r.key, role: r.role, name: r.name } });
});

router.delete('/keys/:masked', adminAuthUnified('SUPER_ADMIN'), (req, res) => {
  const r = adminRoles.disableSubKey(req.params.masked);
  if (!r.ok) return res.status(404).json({ success: false, error: r.error });
  audit(req.admin, 'ADMIN_KEY_DISABLE', r.old.name, r.old, { status: 'disabled' }, (req.body && req.body.reason) || '禁用后台子密钥', req);
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
      // v25.0.47_21: 版本口径统一——展示用简短 version（与公告/检查更新一致），buildId 作次选
      data.version = ver.version || ver.buildId || '';
    } catch {
      try {
        const ver = JSON.parse(fs.readFileSync('/root/yandaoguoxue/current/version.json', 'utf-8'));
        data.version = ver.version || ver.buildId || '';
      } catch { data.version = 'unknown'; }
    }
    // v25.0.47_21: 附带 APP 版本（与公告 {APP_VERSION} 同一数据源）
    try {
      const rel = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'app-release-config.json'), 'utf-8'));
      data.appVersion = rel.latestVersion || '';
    } catch { data.appVersion = ''; }
    const mem = process.memoryUsage();
    data.server = {
      uptimeHours: (process.uptime() / 3600).toFixed(1),
      memoryMB: (mem.rss / 1024 / 1024).toFixed(0),
      nodeVersion: process.version,
      pid: process.pid,
    };

    // ===== v25.0.47_10: 老板驾驶舱 20 项指标扩展（FINAL-ADMIN-COMMERCIAL-SEAL-02 第二章）=====
    // Git Commit
    try {
      data.gitCommit = require('child_process').execSync('git -C /root/yandaoguoxue-source rev-parse --short HEAD').toString().trim();
    } catch (e) { data.gitCommit = 'unknown'; }
    // 今日订单/今日实付/待处理（今日）
    try {
      const o = udb.prepare("SELECT COUNT(*) c, COALESCE(SUM(amount),0) s FROM user_orders WHERE status='PAID' AND paid_at >= date('now')").get();
      data.orders.today = o.c; data.orders.todayRevenueYuan = (Number(o.s) || 0).toFixed(2);
      data.orders.pendingToday = udb.prepare("SELECT COUNT(*) c FROM user_orders WHERE status='PENDING' AND created_at >= date('now')").get().c;
      const lastPay = udb.prepare("SELECT paid_at FROM user_orders WHERE status='PAID' ORDER BY paid_at DESC LIMIT 1").get();
      data.orders.lastPaidAt = lastPay ? lastPay.paid_at : null;
    } catch (e) { console.error('[overview] orders today:', e.message); }
    // 今日动态
    try { data.social.postsToday = sdb.prepare("SELECT COUNT(*) c FROM posts WHERE created_at >= date('now')").get().c; } catch (e) {}
    // AI 今日调用与健康（埋点文件）
    try {
      const hp = path.join(DATA_DIR, 'ai-health.json');
      const h = JSON.parse(fs.readFileSync(hp, 'utf-8'));
      data.ai.callsToday = h.calls || 0;
      data.ai.successToday = h.success || 0;
      data.ai.failToday = h.fail || 0;
      data.ai.successRate = h.calls ? Math.round((h.success / h.calls) * 100) : 100;
      data.ai.lastSuccessAt = h.lastSuccessAt || null;
      data.ai.lastFailAt = h.lastFailAt || null;
      data.ai.lastError = h.lastError || '';
      data.ai.provider = process.env.HUNYUAN_API_KEY ? 'Hunyuan(混元)' : (process.env.DEEPSEEK_API_KEY ? 'DeepSeek' : '未配置');
    } catch (e) {
      data.ai = { ...data.ai, callsToday: 0, successToday: 0, failToday: 0, successRate: 100, provider: '未知' };
    }
    // 佣金今日/待解冻
    try {
      const commissionEngine = require('./commissionEngine');
      const cdb = commissionEngine.getDb();
      const ct = cdb.prepare("SELECT COALESCE(SUM(commission_cents),0) s FROM commission_records WHERE record_type='COMMISSION' AND status != 'REVERSED' AND created_at >= date('now')").get();
      data.commission.todayYuan = (ct.s / 100).toFixed(2);
      const cf = cdb.prepare("SELECT COALESCE(SUM(commission_cents),0) s FROM commission_records WHERE record_type='COMMISSION' AND status='FROZEN'").get();
      data.commission.frozenYuan = (cf.s / 100).toFixed(2);
      data.commission.withdrawTransfer = 'DISABLED'; // 商家转账权限未开通，收款不受影响
    } catch (e) {
      data.commission = { ...(data.commission || {}), todayYuan: '0.00', frozenYuan: '0.00', withdrawTransfer: 'DISABLED' };
    }
    // 微信支付状态（不回显任何密钥）
    try {
      const wechatPayV3 = require('./wechatPayV3');
      const gs = wechatPayV3.getConfigStatus ? wechatPayV3.getConfigStatus() : null;
      data.payment = {
        nativeReady: !!(gs && (gs.nativeReady !== undefined ? gs.nativeReady : gs.overall === 'READY')),
        jsapiReady: !!(gs && gs.jsapiReady),
        mode: (gs && gs.jsapiReady) ? 'JSAPI+NATIVE' : 'NATIVE',
        mchId: process.env.WECHAT_MCH_ID ? String(process.env.WECHAT_MCH_ID) : '',
        appIdConfigured: !!process.env.WECHAT_APPID,
        appSecretConfigured: !!process.env.WECHAT_APP_SECRET,
        lastPaidAt: data.orders.lastPaidAt || null,
      };
    } catch (e) {
      data.payment = { nativeReady: false, jsapiReady: false, mode: 'UNKNOWN', mchId: '', appIdConfigured: false, appSecretConfigured: false };
    }
    // 三色健康状态 ok/warn/down（绿/黄/红）
    try {
      data.health = {};
      data.health.server = 'ok';
      data.health.backend = pm2Alive() ? 'ok' : 'down';
      // 数据库：双库可读
      let dbOk = true;
      try { udb.prepare('SELECT 1').get(); sdb.prepare('SELECT 1').get(); } catch (e) { dbOk = false; }
      data.health.db = dbOk ? 'ok' : 'down';
      // AI：开关关=红(down)；开且今日有失败=黄(warn)；开且无失败或无调用=绿
      const aiFlag = require('./featureControlRoutes').getFlagStatus('ai');
      const aiH = data.ai || {};
      if (aiFlag !== 'ON') data.health.ai = 'down';
      else if ((aiH.failToday || 0) > 0) data.health.ai = 'warn';
      else data.health.ai = 'ok';
      // 支付：NATIVE ready=ok；仅商户参数缺=warn；配置缺=down
      const p = data.payment || {};
      if (p.nativeReady) data.health.payment = 'ok';
      else if (process.env.WECHAT_MCH_ID) data.health.payment = 'warn';
      else data.health.payment = 'down';
    } catch (e) { data.health = { server: 'ok', backend: 'ok', db: 'ok', ai: 'ok', payment: 'warn' }; }

    res.json({ success: true, data });
  } catch (e) {
    console.error('[overview] error:', e.message);
    res.status(500).json({ success: false, error: '总览查询失败' });
  }
});

// ==================== 审计日志 ====================

router.get('/audit', adminAuthUnified('ADMIN'), (req, res) => {
  try {
    // v25.0.47_13: 修复——改用 adminRoles.listAudit（原直接读 AUDIT_FILE 为未定义变量，恒返回空）
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
    const action = req.query.action;
    res.json({ success: true, data: adminRoles.listAudit(limit, action) });
  } catch (e) {
    res.status(500).json({ success: false, error: '审计查询失败' });
  }
});

// ==================== 社交/内容审核（第十七章） ====================

router.get('/moderation/users', adminAuthUnified('SUPPORT_ADMIN', 'ops'), (req, res) => {
  try {
    const udb = getUsersDb();
    const q = String(req.query.query || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    // v25.0.47_25: 上限 50→500，支持「全部」一页拉取（用户管理分页浏览全部用户）
    const size = Math.min(500, parseInt(req.query.size, 10) || 20);
    let where = '1=1'; const params = [];
    if (q) {
      if (/^\d+$/.test(q)) { where = 'user_id = ? OR phone LIKE ? OR nickname LIKE ?'; params.push(parseInt(q, 10), '%' + q + '%', '%' + q + '%'); }
      else { where = 'nickname LIKE ? OR phone LIKE ? OR email LIKE ?'; params.push('%' + q + '%', '%' + q + '%', '%' + q + '%'); }
    }
    const total = udb.prepare(`SELECT COUNT(*) c FROM users WHERE ${where}`).get(...params).c;
    // v25.0.47_24: 用户管理需展示完整注册信息（手机号/邮箱）——后台已鉴权 SUPPORT_ADMIN/ops，去脱敏直出
    const rows = udb.prepare(`SELECT user_id, nickname, phone, email, member_level, status, muted_until, created_at, last_login_at
                              FROM users WHERE ${where} ORDER BY user_id DESC LIMIT ? OFFSET ?`)
      .all(...params, size, (page - 1) * size);
    res.json({ success: true, data: { total, page, size, users: rows } });
  } catch (e) {
    console.error('[moderation/users]', e.message);
    res.status(500).json({ success: false, error: '用户查询失败' });
  }
});

// v25.0.60 AUDIT-20260826 P1-9: 后台会员调整/补发接口（此前改单只能 SQL 直改库）
// POST /moderation/users/:userId/membership  body: { level, days?, reason }
// - level: basic|monthly|quarterly|yearly|lifetime（basic = 撤销会员）
// - days: 可选自定义天数（不传按档位标准：月30/季90/年365/终身永久）
// - 续费逻辑与支付交付一致：现有有效期未过则顺延
// - 变更写 users + user_assets，并记录审计日志
router.post('/moderation/users/:userId/membership', adminAuthUnified('ADMIN', 'ops'), (req, res) => {
  try {
    const udb = getUsersDb();
    const userId = parseInt(req.params.userId, 10);
    const { level, days, reason } = req.body || {};
    const VALID = ['basic', 'monthly', 'quarterly', 'yearly', 'lifetime'];
    const LEVEL_DAYS = { monthly: 30, quarterly: 90, yearly: 365, lifetime: -1 };
    if (!userId || !VALID.includes(level)) {
      return res.status(400).json({ success: false, error: '参数无效（level 需为 basic/monthly/quarterly/yearly/lifetime）' });
    }
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ success: false, error: '必须填写调整原因（审计留痕）' });
    }
    const user = udb.prepare('SELECT user_id, nickname, member_level, membership_expiry FROM users WHERE user_id = ?').get(userId);
    if (!user) return res.status(404).json({ success: false, error: '用户不存在' });
    const oldValue = { member_level: user.member_level, membership_expiry: user.membership_expiry };

    let expireTime = null;
    if (level !== 'basic') {
      const std = LEVEL_DAYS[level];
      const d = Number.isFinite(parseInt(days, 10)) && parseInt(days, 10) > 0 ? parseInt(days, 10) : std;
      if (d > 0) {
        let base = Date.now();
        if (user.membership_expiry) {
          const cur = new Date(user.membership_expiry).getTime();
          if (cur > base) base = cur;
        }
        // 北京时间当日 23:59:59 到期（与支付交付口径一致）
        const bd = new Date(base + d * 86400000 + 8 * 3600 * 1000);
        bd.setUTCHours(23, 59, 59, 999);
        expireTime = bd.toISOString();
      }
    }
    udb.prepare('UPDATE users SET member_level = ?, membership_expiry = ?, updated_at = ? WHERE user_id = ?')
      .run(level, expireTime, new Date().toISOString(), userId);
    try {
      udb.prepare('UPDATE user_assets SET member_level = ?, member_expire_at = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
        .run(level, expireTime, userId);
    } catch (e) {}
    const after = udb.prepare('SELECT member_level, membership_expiry FROM users WHERE user_id = ?').get(userId);
    audit(req.admin, 'USER_MEMBERSHIP', `user:${userId}(${user.nickname || ''})`, oldValue, after, reason, req);
    console.log(`[admin] 会员调整 userId=${userId} ${oldValue.member_level}→${level} expire=${expireTime || (level === 'basic' ? '已撤销' : '永久')} by=${req.admin.name}`);
    res.json({ success: true, data: after });
  } catch (e) {
    console.error('[moderation/user/membership]', e.message);
    res.status(500).json({ success: false, error: '会员调整失败' });
  }
});

router.post('/moderation/users/:userId/action', adminAuthUnified('SUPPORT_ADMIN', 'ops'), (req, res) => {
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

router.get('/moderation/posts', adminAuthUnified('SUPPORT_ADMIN', 'ops'), (req, res) => {
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

router.post('/moderation/posts/:postId/action', adminAuthUnified('CONTENT_ADMIN', 'ops'), (req, res) => {
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

router.get('/moderation/reports', adminAuthUnified('SUPPORT_ADMIN', 'ops'), (req, res) => {
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

router.post('/moderation/reports/:id/action', adminAuthUnified('SUPPORT_ADMIN', 'ops'), (req, res) => {
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

router.get('/moderation/groups', adminAuthUnified('SUPPORT_ADMIN', 'ops'), (req, res) => {
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

router.post('/moderation/groups/:id/action', adminAuthUnified('CONTENT_ADMIN', 'ops'), (req, res) => {
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

router.get('/moderation/blacklists', adminAuthUnified('SUPPORT_ADMIN', 'ops'), (_req, res) => {
  try {
    const sdb = getSocialDb();
    const rows = sdb.prepare('SELECT user_id, blocked_id, created_at FROM blacklists ORDER BY rowid DESC LIMIT 200').all();
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: '黑名单查询失败' });
  }
});

// ==================== 订单后台（第二十章） ====================

// v25.0.47_21 订单查询（订单中心：谁付的费一目了然）
//   · 字段：订单号/用户ID/手机号/昵称/产品/金额/状态/时间/微信交易号/邀请人/返佣状态
//   · 筛选：支付状态 + 下单日期区间（dateFrom/dateTo，YYYY-MM-DD）
//   · 权限：仅 SUPER_ADMIN 与 FINANCE_ADMIN（运营角色无 finance scope，403 拦截，仅可见总览统计数字）
function buildOrderFilters(req) {
  let where = '1=1'; const params = [];
  const status = req.query.status;
  if (status) { where += ' AND o.status = ?'; params.push(status); }
  const dateFrom = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.dateFrom || '')) ? req.query.dateFrom : '';
  const dateTo = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.dateTo || '')) ? req.query.dateTo : '';
  if (dateFrom) { where += " AND date(o.created_at) >= date(?)"; params.push(dateFrom); }
  if (dateTo) { where += " AND date(o.created_at) <= date(?)"; params.push(dateTo); }
  return { where, params };
}

const ORDER_SELECT = `SELECT o.order_no, o.user_id, u.phone, u.nickname, o.amount, o.order_type, o.status,
                             o.payment_method, o.created_at, o.paid_at, o.transaction_id,
                             ir.inviter_id, iu.nickname AS inviter_nickname, iu.phone AS inviter_phone
                      FROM user_orders o
                      LEFT JOIN users u ON u.user_id = o.user_id
                      LEFT JOIN (SELECT invitee_id, inviter_id FROM user_invite_relation GROUP BY invitee_id) ir ON ir.invitee_id = o.user_id
                      LEFT JOIN users iu ON iu.user_id = ir.inviter_id`;

router.get('/orders', adminAuthUnified('FINANCE_ADMIN', 'finance'), (req, res) => {
  try {
    const udb = getUsersDb();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.min(100, parseInt(req.query.size, 10) || 20);
    const { where, params } = buildOrderFilters(req);
    const total = udb.prepare(`SELECT COUNT(*) c FROM user_orders o WHERE ${where}`).get(...params).c;
    const rows = udb.prepare(`${ORDER_SELECT}
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

// v25.0.47_21 订单导出 CSV（UTF-8 BOM，Excel 直接打开；与列表同筛选条件；限最近10000条）
router.get('/orders/export', adminAuthUnified('FINANCE_ADMIN', 'finance'), (req, res) => {
  try {
    const udb = getUsersDb();
    const { where, params } = buildOrderFilters(req);
    const rows = udb.prepare(`${ORDER_SELECT}
                              WHERE ${where} ORDER BY o.id DESC LIMIT 10000`).all(...params);
    const rebates = udb.prepare('SELECT order_no, status FROM consumption_rebates').all();
    const rebateMap = {}; for (const r of rebates) rebateMap[r.order_no] = r.status;
    const STATUS_LABELS = { PENDING: '待支付', PAID: '已支付', REFUNDED: '已退款', CLOSED: '已关闭' };
    const TYPE_LABELS = { MEMBERSHIP: '会员', SINGLE_UNLOCK: '单项解锁(B类工具)', POINTS_RECHARGE: '积分充值', AI_PACKAGE: 'AI增量包', BATCH_INTERPRET: '批量解读' };
    const esc = (v) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const header = ['订单号', '用户ID', '手机号', '昵称', '购买产品', '实付金额(元)', '支付状态', '下单时间', '支付时间', '微信交易号', '支付方式', '邀请人昵称', '邀请人手机号', '返佣状态'];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push([
        r.order_no, r.user_id, r.phone || '', r.nickname || '',
        TYPE_LABELS[r.order_type] || r.order_type || '', r.amount,
        STATUS_LABELS[r.status] || r.status, r.created_at, r.paid_at || '',
        r.transaction_id || '', r.payment_method || '',
        r.inviter_nickname || '', r.inviter_phone || '',
        rebateMap[r.order_no] || '',
      ].map(esc).join(','));
    }
    audit(req.admin, 'ORDER_EXPORT', `orders(filter:${where})`, null, `${rows.length}条`, '订单导出CSV', req);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="orders_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('\uFEFF' + lines.join('\r\n'));
  } catch (e) {
    console.error('[orders/export]', e.message);
    res.status(500).json({ success: false, error: '订单导出失败' });
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

router.get('/payment-status', adminAuthUnified('FINANCE_ADMIN', 'finance'), (_req, res) => {
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
  // v25.0.47_14: iOS/微信内浏览器支付全放开（Native扫码收款），与 platformFeatureGate.js 矩阵同步
  res.json({ success: true, data: { wechat, iosPaymentEnabled: true } });
});

// ==================== P8 分佣后台（第五章） ====================

router.get('/commission/config', adminAuthUnified('FINANCE_ADMIN', 'finance'), (_req, res) => {
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

router.get('/commission/records', adminAuthUnified('FINANCE_ADMIN', 'finance'), (req, res) => {
  try {
    const commissionEngine = require('./commissionEngine');
    const db = commissionEngine.getDb();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.min(100, parseInt(req.query.size, 10) || 20);
    const inviter = req.query.inviter;
    const status = req.query.status;
    let where = "record_type IN ('COMMISSION','COMMISSION_L2')"; const params = [];
    if (inviter) { where += ' AND inviter_user_id = ?'; params.push(parseInt(inviter, 10)); }
    if (status) { where += ' AND status = ?'; params.push(status); }
    const total = db.prepare(`SELECT COUNT(*) c FROM commission_records WHERE ${where}`).get(...params).c;
    const rows = db.prepare(`SELECT r.order_no, r.record_type, r.payer_user_id, r.inviter_user_id, r.ratio_percent, r.base_amount_cents, r.commission_cents, r.status, r.created_at, r.unfreeze_at, r.note,
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

router.get('/commission/withdrawals', adminAuthUnified('FINANCE_ADMIN', 'finance'), (req, res) => {
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
 * v25.0.47_13 提现审核通过（FIX-WITHDRAW-V13-FINAL 财务审核流）
 * 幂等：同一提现单仅发起一次转账（executeTransfer 内部防重）
 *   · 商家转账配置齐备 → 发起转账，状态 TRANSFERING，微信回调终态（PAID/FAILED）
 *   · 未配置 → PROCESSING（线下人工打款兜底，财务线下完成后标记）
 *   · 免审自动转账中断单（TRANSFERING 且无审核人）→ 审核人接手补发
 * 超级管理员(100)与财务管理员(60)均可操作；运营角色被 scope=finance 拦截
 */
router.post('/commission/withdrawals/:id/approve', adminAuthUnified('FINANCE_ADMIN', 'finance'), async (req, res) => {
  try {
    const { reason } = req.body || {};
    const commissionEngine = require('./commissionEngine');
    const db = commissionEngine.getDb();
    const w = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(parseInt(req.params.id, 10));
    if (!w) return res.status(404).json({ success: false, error: '提现申请不存在' });
    if (['PAID', 'FAILED', 'REJECTED'].includes(w.status)) {
      return res.status(400).json({ success: false, error: `该提现单已是终态（${w.status}），不可重复审核` });
    }
    if (w.status !== 'PENDING_REVIEW' && !(w.status === 'TRANSFERING' && !w.reviewed_by)) {
      return res.status(400).json({ success: false, error: `当前状态${w.status}不可审核（处理中请用「同步微信状态」）` });
    }
    const r = await commissionEngine.executeTransfer(w.withdraw_no, { name: req.admin.name, role: req.admin.role });
    if (r.ok) {
      audit(req.admin, 'WITHDRAW_APPROVE', `withdraw:${w.withdraw_no}(user:${w.user_id}金额${(w.amount_cents / 100).toFixed(2)}元)`, w.status, r.status || 'TRANSFERING', reason || '审核通过并发起商家转账', req);
      return res.json({ success: true, data: { withdrawNo: w.withdraw_no, status: r.status || 'TRANSFERING', transfer: r, mode: 'auto' } });
    }
    if (r.notConfigured) {
      // 商家转账未配置 → 线下人工打款通道
      db.prepare("UPDATE withdrawals SET status = 'PROCESSING', reviewed_by = ?, reviewed_at = ? WHERE id = ?")
        .run(`${req.admin.name}(${req.admin.role})`, new Date().toISOString(), w.id);
      audit(req.admin, 'WITHDRAW_APPROVE_MANUAL', `withdraw:${w.withdraw_no}(user:${w.user_id})`, w.status, 'PROCESSING', reason || '审核通过，线下人工打款', req);
      return res.json({ success: true, data: { withdrawNo: w.withdraw_no, status: 'PROCESSING', mode: 'manual', message: '商家转账通道未配置，已转人工线下打款' } });
    }
    audit(req.admin, 'WITHDRAW_APPROVE_FAIL', `withdraw:${w.withdraw_no}(user:${w.user_id})`, w.status, 'FAILED', r.error || '转账受理失败', req);
    res.status(400).json({ success: false, error: r.error || '转账受理失败，余额已退回' });
  } catch (e) {
    console.error('[withdraw/approve]', e.message);
    res.status(500).json({ success: false, error: '审核失败' });
  }
});

/** v25.0.47_13 批量审核通过（财务批量操作，逐单幂等） */
router.post('/commission/withdrawals/batch-approve', adminAuthUnified('FINANCE_ADMIN', 'finance'), async (req, res) => {
  try {
    const { ids, reason } = req.body || {};
    if (!Array.isArray(ids) || !ids.length || ids.length > 100) {
      return res.status(400).json({ success: false, error: 'ids须为1-100条的数组' });
    }
    const commissionEngine = require('./commissionEngine');
    const db = commissionEngine.getDb();
    const results = [];
    for (const id of ids) {
      const w = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(parseInt(id, 10));
      if (!w) { results.push({ id, ok: false, error: '不存在' }); continue; }
      if (w.status !== 'PENDING_REVIEW' && !(w.status === 'TRANSFERING' && !w.reviewed_by)) {
        results.push({ id, ok: false, error: `状态${w.status}不可审核` }); continue;
      }
      const r = await commissionEngine.executeTransfer(w.withdraw_no, { name: req.admin.name, role: req.admin.role });
      if (r.ok) {
        audit(req.admin, 'WITHDRAW_APPROVE', `withdraw:${w.withdraw_no}(user:${w.user_id}金额${(w.amount_cents / 100).toFixed(2)}元)`, w.status, r.status || 'TRANSFERING', (reason || '') + ' [批量]', req);
        results.push({ id, ok: true, withdrawNo: w.withdraw_no, status: r.status || 'TRANSFERING' });
      } else if (r.notConfigured) {
        db.prepare("UPDATE withdrawals SET status = 'PROCESSING', reviewed_by = ?, reviewed_at = ? WHERE id = ?")
          .run(`${req.admin.name}(${req.admin.role})`, new Date().toISOString(), w.id);
        results.push({ id, ok: true, withdrawNo: w.withdraw_no, status: 'PROCESSING', mode: 'manual' });
      } else {
        results.push({ id, ok: false, withdrawNo: w.withdraw_no, error: r.error });
      }
    }
    res.json({ success: true, data: { results, total: results.length, ok: results.filter(x => x.ok).length } });
  } catch (e) {
    console.error('[withdraw/batch-approve]', e.message);
    res.status(500).json({ success: false, error: '批量审核失败' });
  }
});

/** v25.0.47_13 同步微信转账终态（TRANSFERING 卡单对账：查微信侧真实状态并落账） */
router.post('/commission/withdrawals/:id/sync', adminAuthUnified('FINANCE_ADMIN', 'finance'), async (req, res) => {
  try {
    const commissionEngine = require('./commissionEngine');
    const db = commissionEngine.getDb();
    const w = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(parseInt(req.params.id, 10));
    if (!w) return res.status(404).json({ success: false, error: '提现申请不存在' });
    if (w.status !== 'TRANSFERING') return res.status(400).json({ success: false, error: '仅处理中状态可同步' });
    let wechatTransfer;
    try { wechatTransfer = require('./wechatTransfer'); } catch (e) {
      return res.status(400).json({ success: false, error: '转账模块不可用' });
    }
    if (!wechatTransfer.isConfigured()) return res.status(400).json({ success: false, error: '商家转账未配置' });
    const q = await wechatTransfer.queryTransfer(w.withdraw_no);
    if (!q.success) return res.status(400).json({ success: false, error: q.error || '查询失败' });
    let result = { state: q.state, changed: false };
    if (q.state === 'SUCCESS' || q.state === 'FAIL' || q.state === 'CANCELLED') {
      const r = commissionEngine.markTransferResult(w.withdraw_no, q.state, q.failReason, q.transferNo);
      result.changed = !!(r && r.ok && !r.skipped);
      result.status = r.status;
    }
    audit(req.admin, 'WITHDRAW_SYNC', `withdraw:${w.withdraw_no}`, w.status, q.state, '同步微信转账状态', req);
    res.json({ success: true, data: result });
  } catch (e) {
    console.error('[withdraw/sync]', e.message);
    res.status(500).json({ success: false, error: '同步失败' });
  }
});

router.post('/commission/withdrawals/:id/reject', adminAuthUnified('FINANCE_ADMIN', 'finance'), (req, res) => {
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
router.post('/commission/run-unfreeze', adminAuthUnified('ADMIN', 'finance'), (req, res) => {
  const commissionEngine = require('./commissionEngine');
  const n = commissionEngine.runUnfreeze();
  audit(req.admin, 'COMMISSION_UNFREEZE_RUN', 'commission_records', null, { unfrozen: n }, '手动触发解冻', req);
  res.json({ success: true, data: { unfrozen: n } });
});

/**
 * v25.0.47_13 佣金统计报表（FIX-WITHDRAW-V13-FINAL 财务端）
 * 日/月/年三维报表 + 分佣层级统计 + 退款扣回明细 + 提现汇总
 */
router.get('/commission/stats', adminAuthUnified('FINANCE_ADMIN', 'finance'), (req, res) => {
  try {
    const commissionEngine = require('./commissionEngine');
    const db = commissionEngine.getDb();
    const days = Math.min(180, Math.max(7, parseInt(req.query.days, 10) || 30));

    const daily = db.prepare(`
      SELECT substr(created_at, 1, 10) AS date,
             SUM(CASE WHEN record_type = 'COMMISSION' THEN commission_cents ELSE 0 END) AS l1_cents,
             SUM(CASE WHEN record_type = 'COMMISSION_L2' THEN commission_cents ELSE 0 END) AS l2_cents,
             SUM(commission_cents) AS total_cents,
             COUNT(*) AS count
      FROM commission_records
      WHERE record_type IN ('COMMISSION','COMMISSION_L2') AND status != 'REVERSED'
        AND created_at >= date('now', ?)
      GROUP BY date ORDER BY date DESC`).all(`-${days} days`);

    const monthly = db.prepare(`
      SELECT substr(created_at, 1, 7) AS month,
             SUM(CASE WHEN record_type = 'COMMISSION' THEN commission_cents ELSE 0 END) AS l1_cents,
             SUM(CASE WHEN record_type = 'COMMISSION_L2' THEN commission_cents ELSE 0 END) AS l2_cents,
             SUM(commission_cents) AS total_cents,
             COUNT(*) AS count
      FROM commission_records
      WHERE record_type IN ('COMMISSION','COMMISSION_L2') AND status != 'REVERSED'
        AND created_at >= date('now', '-12 months')
      GROUP BY month ORDER BY month DESC`).all();

    const yearly = db.prepare(`
      SELECT substr(created_at, 1, 4) AS year,
             SUM(CASE WHEN record_type = 'COMMISSION' THEN commission_cents ELSE 0 END) AS l1_cents,
             SUM(CASE WHEN record_type = 'COMMISSION_L2' THEN commission_cents ELSE 0 END) AS l2_cents,
             SUM(commission_cents) AS total_cents,
             COUNT(*) AS count
      FROM commission_records
      WHERE record_type IN ('COMMISSION','COMMISSION_L2') AND status != 'REVERSED'
      GROUP BY year ORDER BY year DESC`).all();

    const reversals = db.prepare(`
      SELECT order_no, inviter_user_id, ratio_percent, commission_cents, note, created_at
      FROM commission_records WHERE status = 'REVERSED' ORDER BY id DESC LIMIT 50`).all();

    const levels = db.prepare(`
      SELECT
        SUM(CASE WHEN record_type = 'COMMISSION' THEN commission_cents ELSE 0 END) AS l1_cents,
        SUM(CASE WHEN record_type = 'COMMISSION_L2' THEN commission_cents ELSE 0 END) AS l2_cents,
        SUM(CASE WHEN status = 'REVERSED' THEN commission_cents ELSE 0 END) AS reversed_cents,
        SUM(CASE WHEN status = 'FROZEN' THEN commission_cents ELSE 0 END) AS frozen_cents
      FROM commission_records WHERE record_type IN ('COMMISSION','COMMISSION_L2')`).get();

    const withdrawSummary = db.prepare(`
      SELECT status, COUNT(*) AS count, SUM(amount_cents) AS amount_cents
      FROM withdrawals GROUP BY status`).all();

    res.json({
      success: true,
      data: {
        daily, monthly, yearly,
        levels: levels || { l1_cents: 0, l2_cents: 0, reversed_cents: 0, frozen_cents: 0 },
        reversals,
        withdrawSummary,
      },
    });
  } catch (e) {
    console.error('[commission/stats]', e.message);
    res.status(500).json({ success: false, error: '统计查询失败' });
  }
});

/**
 * v25.0.47_13 提现记录导出（CSV/Excel兼容，按日期+状态筛选）
 * 财务对账专用：转账记录、金额、状态、审核人、到账时间、失败原因
 */
router.get('/commission/withdrawals/export', adminAuthUnified('FINANCE_ADMIN', 'finance'), (req, res) => {
  try {
    const commissionEngine = require('./commissionEngine');
    const db = commissionEngine.getDb();
    const { from, to, status } = req.query;
    let where = '1=1'; const params = [];
    if (from) { where += ' AND w.created_at >= ?'; params.push(String(from) + 'T00:00:00'); }
    if (to) { where += ' AND w.created_at <= ?'; params.push(String(to) + 'T23:59:59'); }
    if (status) { where += ' AND w.status = ?'; params.push(String(status)); }
    const rows = db.prepare(`
      SELECT w.withdraw_no, w.user_id, u.nickname, w.amount_cents, w.status, w.wechat_transfer_no,
             w.fail_reason, w.reviewed_by, w.created_at, w.reviewed_at, w.paid_at
      FROM withdrawals w LEFT JOIN users u ON u.user_id = w.user_id
      WHERE ${where} ORDER BY w.id DESC LIMIT 10000`).all(...params);

    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const header = ['提现单号', '用户ID', '昵称', '金额(元)', '状态', '微信转账单号', '失败原因', '审核人', '申请时间', '审核时间', '到账时间'];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push([
        esc(r.withdraw_no), r.user_id, esc(r.nickname || ''), (r.amount_cents / 100).toFixed(2),
        r.status, esc(r.wechat_transfer_no || ''), esc(r.fail_reason || ''), esc(r.reviewed_by || ''),
        esc(r.created_at || ''), esc(r.reviewed_at || ''), esc(r.paid_at || ''),
      ].join(','));
    }
    const csv = '\uFEFF' + lines.join('\r\n');
    audit(req.admin, 'WITHDRAW_EXPORT', `withdrawals(${rows.length}条)`, null, { from: from || '', to: to || '', status: status || '' }, '导出提现记录', req);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="withdrawals_${from || 'all'}_${to || 'all'}.csv"`);
    res.send(csv);
  } catch (e) {
    console.error('[commission/withdrawals/export]', e.message);
    res.status(500).json({ success: false, error: '导出失败' });
  }
});

// ==================== 导出 ====================

function createRouter() { return router; }
module.exports = createRouter;
module.exports.createRouter = createRouter;
