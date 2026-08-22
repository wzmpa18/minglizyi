/**
 * P8-DISTRIBUTION-COMMISSION-AUTO 分佣引擎（第一阶段：自动分佣记账）
 * FINAL-PRODUCTION-SEAL-03 配套 · v25.0.47_5
 *
 * 铁律：
 *   1. 严格一级分销：仅直接推荐人（user_invite_relation level=1 / users.invited_by）分佣，无任何二级
 *   2. 幂等：commission_records(order_no, record_type) 唯一索引，同订单只发一次佣金
 *   3. 金额全部用整数「分」存储，杜绝浮点误差
 *   4. 复用现有邀请体系与订单钩子，不重建绑定关系
 *   5. 退款 → 退佣冲正（全额/按比例），全程流水可追溯
 *
 * 账户三字段（指令第二章3）：
 *   total_earnings_cents 累计总收益 / withdrawable_cents 可提现 / frozen_cents 待解冻
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'commission_config.json');
const USERS_DB_PATH = process.env.DB_PATH || '/root/backend-auth/data/yandao_users.db';

// ==================== 配置（后台可视化，不写死） ====================

const DEFAULT_CONFIG = {
  enabled: true,                 // 分佣总开关
  withdrawEnabled: false,        // v25.0.47_10 提现总开关（商家转账权限未开通，开通后置 true）
  unfreezeEnabled: true,         // 解冻期开关
  unfreezeDays: 7,               // 解冻天数（旧机制，v12 起由月度结算覆盖：settleDay）
  settleDay: 30,                 // v25.0.47_12 月度结算日：每月30号统一结算（FROZEN→可提现）
  withdrawOpenDay: 15,           // v25.0.47_12 提现窗口：每月15号以后（16号起）可发起提现
  monthlySettleEnabled: true,    // v25.0.47_12 月度结算模式开关（关闭则回退 unfreezeDays 机制）
  minWithdrawYuan: 10,           // 最低提现额（元）
  dailyWithdrawLimit: 1,         // 每日提现次数
  transferNote: '言道国学推荐收益', // 商家转账备注
  taxNotice: '收益需依法缴纳个人所得税，平台将按规定代扣代缴或由用户自行申报',
  // v25.0.47_12 两级分佣：一级15%、二级5%（按用户实付金额计算，全局统一）
  ratios: {
    level1: 15,                  // 一级推荐人佣金比例（百分比）
    level2: 5,                   // 二级推荐人佣金比例（百分比）
  },
  riskControl: {
    dailyEarningsAlertYuan: 1000,  // 单日收益超阈值冻结提现待人工审核
    enabled: true,
  },
};

/** v25.0.47_12: 解析一级/二级比例（兼容旧版按订单类型的 ratios 结构） */
function resolveRatios(cfg, orderType) {
  const r = cfg.ratios || {};
  let level1 = parseInt(r.level1, 10);
  let level2 = parseInt(r.level2, 10);
  if (isNaN(level1)) {
    // 旧结构按类型取值，无 level1 字段：退化为一档比例（二级为0）
    const legacy = parseInt(r[orderType] != null ? r[orderType] : 0, 10);
    level1 = isNaN(legacy) ? 0 : legacy;
  }
  if (isNaN(level2)) level2 = 0;
  return { level1, level2 };
}

function getConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return { ...DEFAULT_CONFIG, ...saved, ratios: { ...DEFAULT_CONFIG.ratios, ...(saved.ratios || {}) }, riskControl: { ...DEFAULT_CONFIG.riskControl, ...(saved.riskControl || {}) } };
    }
  } catch (e) { console.error('[Commission] 配置读取失败，用默认值:', e.message); }
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function saveConfig(cfg) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  cfg.updatedAt = new Date().toISOString();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
  return cfg;
}

// ==================== 数据库（增量建表，零破坏） ====================

let _db = null;
function getDb() {
  if (_db) return _db;
  const Database = require('better-sqlite3');
  if (!fs.existsSync(USERS_DB_PATH)) throw new Error('用户数据库不存在: ' + USERS_DB_PATH);
  const db = new Database(USERS_DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS commission_accounts (
      user_id INTEGER PRIMARY KEY,
      total_earnings_cents INTEGER NOT NULL DEFAULT 0,
      withdrawable_cents INTEGER NOT NULL DEFAULT 0,
      frozen_cents INTEGER NOT NULL DEFAULT 0,
      negative_cents INTEGER NOT NULL DEFAULT 0,
      commission_enabled INTEGER NOT NULL DEFAULT 1,
      withdraw_frozen INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS commission_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL,
      record_type TEXT NOT NULL DEFAULT 'COMMISSION',
      payer_user_id INTEGER,
      inviter_user_id INTEGER,
      ratio_percent INTEGER NOT NULL DEFAULT 0,
      base_amount_cents INTEGER NOT NULL DEFAULT 0,
      commission_cents INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'FROZEN',
      created_at TEXT,
      unfreeze_at TEXT,
      unfrozen_at TEXT,
      note TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_order_type ON commission_records(order_no, record_type);
    CREATE INDEX IF NOT EXISTS idx_commission_inviter ON commission_records(inviter_user_id);
    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      withdraw_no TEXT UNIQUE,
      user_id INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
      openid TEXT,
      wechat_transfer_no TEXT,
      fail_reason TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT,
      paid_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
  `);
  _db = db;
  return db;
}

// ==================== 工具 ====================

function nowIso() { return new Date().toISOString(); }

/** 金额（元，数字）→ 分（整数）。Decimal 纪律：全程整数分运算 */
function yuanToCents(yuan) {
  const n = Number(yuan);
  if (!isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

/** 查直接推荐人（严格一级）：优先 user_invite_relation(level=1)，回退 users.invited_by */
function getDirectInviter(db, userId) {
  const uid = parseInt(userId, 10);
  if (!uid || isNaN(uid)) return null;
  try {
    const rel = db.prepare('SELECT inviter_id FROM user_invite_relation WHERE invitee_id = ? AND level = 1 ORDER BY id LIMIT 1').get(uid);
    if (rel && rel.inviter_id) return parseInt(rel.inviter_id, 10);
  } catch (e) { /* 表不存在等 */ }
  try {
    const u = db.prepare('SELECT invited_by FROM users WHERE user_id = ?').get(uid);
    if (u && u.invited_by) return parseInt(u.invited_by, 10);
  } catch (e) { /* ignore */ }
  return null;
}

/** 推荐人状态校验：账号存在、未封禁、分佣权限开启 */
function inviterEligible(db, inviterId, payerId) {
  if (!inviterId) return { ok: false, reason: 'NO_INVITER' };
  if (String(inviterId) === String(payerId)) return { ok: false, reason: 'SELF_PURCHASE' }; // 禁止自购自返
  try {
    const u = db.prepare('SELECT user_id, deleted_at FROM users WHERE user_id = ?').get(inviterId);
    if (!u) return { ok: false, reason: 'INVITER_NOT_FOUND' };
    if (u.deleted_at) return { ok: false, reason: 'INVITER_DELETED' };
  } catch (e) { /* ignore */ }
  ensureAccount(db, inviterId);
  const acct = db.prepare('SELECT commission_enabled FROM commission_accounts WHERE user_id = ?').get(inviterId);
  if (acct && !acct.commission_enabled) return { ok: false, reason: 'COMMISSION_DISABLED' };
  return { ok: true };
}

function ensureAccount(db, userId) {
  db.prepare('INSERT OR IGNORE INTO commission_accounts (user_id, updated_at) VALUES (?, ?)').run(parseInt(userId, 10), nowIso());
}

/** v25.0.47_12: 月度结算模式下，佣金入账后的下一次结算时间（每月 settleDay 号统一结算） */
function nextSettleTime(cfg) {
  const day = Math.min(28, Math.max(1, parseInt(cfg.settleDay, 10) || 30));
  const now = new Date();
  let settle = new Date(now.getFullYear(), now.getMonth(), day, 23, 59, 59, 999);
  if (settle.getTime() <= now.getTime()) {
    settle = new Date(now.getFullYear(), now.getMonth() + 1, day, 23, 59, 59, 999);
  }
  return settle.toISOString();
}

/** v25.0.47_12: 当前是否处于月度提现窗口（每月 withdrawOpenDay 号以后） */
function inWithdrawWindow(cfg) {
  const openDay = parseInt(cfg.withdrawOpenDay, 10) || 15;
  const d = new Date().getDate();
  return d > openDay;
}

// ==================== 核心：支付成功 → 自动分佣（两级，幂等） ====================

/**
 * 订单支付成功后调用（paymentRoutes.updateOrderRecord PAID 钩子）
 * v25.0.47_12: 两级分佣——一级推荐人 15%、二级推荐人 5%（按实付金额，服务端配置）
 * @param {object} order { orderId, userId, type, amount(元), title }
 * @returns {{granted: boolean, reason?: string, commissionCents?: number, level2CommissionCents?: number, inviterId?: number, level2InviterId?: number}}
 */
function grantCommission(order) {
  const cfg = getConfig();
  if (!cfg.enabled) return { granted: false, reason: 'COMMISSION_SYSTEM_DISABLED' };
  if (!order || !order.orderId || !order.userId) return { granted: false, reason: 'INVALID_ORDER' };

  const db = getDb();
  const orderNo = String(order.orderId);

  // 幂等校验：同订单一级/二级各只处理一次（record_type 区分）
  const existedL1 = db.prepare("SELECT id FROM commission_records WHERE order_no = ? AND record_type = 'COMMISSION'").get(orderNo);
  if (existedL1) return { granted: false, reason: 'DUPLICATE' };

  // 一级推荐人
  const inviterId = getDirectInviter(db, order.userId);
  const eligible = inviterEligible(db, inviterId, order.userId);
  if (!eligible.ok) {
    // 记为待审核（后台人工处理），仍是唯一一条，保持幂等
    try {
      db.prepare(`INSERT INTO commission_records (order_no, record_type, payer_user_id, inviter_user_id, ratio_percent, base_amount_cents, commission_cents, status, created_at, note)
                  VALUES (?, 'COMMISSION', ?, ?, 0, ?, 0, 'PENDING_REVIEW', ?, ?)`)
        .run(orderNo, parseInt(order.userId, 10) || 0, inviterId || 0, yuanToCents(order.amount), nowIso(), 'PENDING_REVIEW:' + eligible.reason);
    } catch (e) {
      if (!/UNIQUE/.test(e.message)) console.error('[Commission] 待审核记录写入失败:', e.message);
    }
    return { granted: false, reason: eligible.reason };
  }

  // 二级推荐人（一级推荐人的推荐人；不得与下单人/一级相同）
  const level2InviterId = getDirectInviter(db, inviterId);
  const l2Valid = level2InviterId && String(level2InviterId) !== String(order.userId) && String(level2InviterId) !== String(inviterId);
  const l2Eligible = l2Valid ? inviterEligible(db, level2InviterId, order.userId) : { ok: false };

  // 分佣计算（整数分）
  const baseCents = yuanToCents(order.amount);
  if (baseCents <= 0) return { granted: false, reason: 'ZERO_AMOUNT' };
  const { level1: ratioL1, level2: ratioL2 } = resolveRatios(cfg, order.type);
  if (!ratioL1) return { granted: false, reason: 'NO_RATIO_FOR_TYPE:' + order.type };
  const commissionCents = Math.floor(baseCents * ratioL1 / 100);
  const level2CommissionCents = (l2Eligible.ok && ratioL2 > 0) ? Math.floor(baseCents * ratioL2 / 100) : 0;

  // 结算时间：v12 月度结算（每月30号统一结算）；关闭月度模式则回退 unfreezeDays
  const monthlyMode = cfg.monthlySettleEnabled !== false;
  const unfreezeEnabled = cfg.unfreezeEnabled !== false;
  let unfreezeAt;
  if (monthlyMode) {
    unfreezeAt = nextSettleTime(cfg);
  } else {
    const unfreezeDays = Math.max(0, parseInt(cfg.unfreezeDays, 10) || 0);
    unfreezeAt = unfreezeEnabled ? new Date(Date.now() + unfreezeDays * 86400000).toISOString() : nowIso();
  }

  const creditFrozen = (cents, uid) => {
    ensureAccount(db, uid);
    if (monthlyMode || (unfreezeEnabled && cfg.unfreezeDays > 0)) {
      db.prepare('UPDATE commission_accounts SET frozen_cents = frozen_cents + ?, total_earnings_cents = total_earnings_cents + ?, updated_at = ? WHERE user_id = ?')
        .run(cents, cents, nowIso(), uid);
    } else {
      db.prepare('UPDATE commission_accounts SET withdrawable_cents = withdrawable_cents + ?, total_earnings_cents = total_earnings_cents + ?, updated_at = ? WHERE user_id = ?')
        .run(cents, cents, nowIso(), uid);
    }
  };

  const tx = db.transaction(() => {
    try {
      db.prepare(`INSERT INTO commission_records (order_no, record_type, payer_user_id, inviter_user_id, ratio_percent, base_amount_cents, commission_cents, status, created_at, unfreeze_at, note)
                  VALUES (?, 'COMMISSION', ?, ?, ?, ?, ?, 'FROZEN', ?, ?, ?)`)
        .run(orderNo, parseInt(order.userId, 10) || 0, inviterId, ratioL1, baseCents, commissionCents, nowIso(), unfreezeAt, order.title || '');
    } catch (e) {
      if (/UNIQUE/.test(e.message)) throw new Error('DUPLICATE');
      throw e;
    }
    creditFrozen(commissionCents, inviterId);
    // 二级佣金（独立 record_type 保证同订单幂等）
    if (level2CommissionCents > 0 && l2Eligible.ok) {
      try {
        db.prepare(`INSERT INTO commission_records (order_no, record_type, payer_user_id, inviter_user_id, ratio_percent, base_amount_cents, commission_cents, status, created_at, unfreeze_at, note)
                    VALUES (?, 'COMMISSION_L2', ?, ?, ?, ?, ?, 'FROZEN', ?, ?, ?)`)
          .run(orderNo, parseInt(order.userId, 10) || 0, level2InviterId, ratioL2, baseCents, level2CommissionCents, nowIso(), unfreezeAt, (order.title || '') + ' [二级]');
      } catch (e) {
        if (!/UNIQUE/.test(e.message)) throw e;
      }
      creditFrozen(level2CommissionCents, level2InviterId);
    }
  });
  try {
    tx();
    console.log(`[Commission] 两级分佣入账 order=${orderNo} L1=${inviterId}/${ratioL1}%=${commissionCents}分 L2=${l2Eligible.ok ? level2InviterId + '/' + ratioL2 + '%=' + level2CommissionCents + '分' : '无'} 结算=${unfreezeAt}`);
    return { granted: true, commissionCents, level2CommissionCents, inviterId, level2InviterId: l2Eligible.ok ? level2InviterId : null, ratioL1, ratioL2, unfreezeAt };
  } catch (e) {
    if (e.message === 'DUPLICATE') return { granted: false, reason: 'DUPLICATE' };
    console.error('[Commission] 分佣失败:', e.message);
    return { granted: false, reason: 'ERROR:' + e.message };
  }
}

// ==================== 退款 → 退佣冲正（全额/按比例） ====================

/**
 * 订单退款后调用（updateOrderRecord REFUNDED 钩子）
 * @param {string} orderNo
 * @param {number} refundYuan 退款金额（元）；不传默认全额
 */
function reverseCommission(orderNo, refundYuan) {
  const db = getDb();
  const rec = db.prepare("SELECT * FROM commission_records WHERE order_no = ? AND record_type = 'COMMISSION'").get(String(orderNo));
  if (!rec) return { reversed: false, reason: 'NO_RECORD' };
  if (rec.status === 'REVERSED') return { reversed: false, reason: 'ALREADY_REVERSED' };

  const refundCents = refundYuan != null ? yuanToCents(refundYuan) : rec.base_amount_cents;
  const proportion = Math.min(1, refundCents / rec.base_amount_cents);
  const reverseCents = Math.round(rec.commission_cents * proportion);
  if (reverseCents <= 0) return { reversed: false, reason: 'ZERO_REVERSE' };

  const tx = db.transaction(() => {
    db.prepare("UPDATE commission_records SET status = 'REVERSED', note = COALESCE(note,'') || ? WHERE id = ?")
      .run(` | 已冲正${reverseCents}分(${Math.round(proportion * 100)}%)`, rec.id);
    ensureAccount(db, rec.inviter_user_id);
    const acct = db.prepare('SELECT frozen_cents, withdrawable_cents, negative_cents FROM commission_accounts WHERE user_id = ?').get(rec.inviter_user_id);
    let fromFrozen = 0, fromWithdrawable = 0, toNegative = 0;
    if (rec.status === 'FROZEN') {
      fromFrozen = Math.min(acct.frozen_cents, reverseCents);
    } else if (rec.status === 'UNFROZEN') {
      fromWithdrawable = Math.min(acct.withdrawable_cents, reverseCents);
    }
    const remaining = reverseCents - fromFrozen - fromWithdrawable;
    if (remaining > 0) toNegative = remaining;
    db.prepare('UPDATE commission_accounts SET frozen_cents = frozen_cents - ?, withdrawable_cents = withdrawable_cents - ?, negative_cents = negative_cents + ?, updated_at = ? WHERE user_id = ?')
      .run(fromFrozen, fromWithdrawable, toNegative, nowIso(), rec.inviter_user_id);
  });
  tx();
  console.log(`[Commission] 退佣冲正 order=${orderNo} reverse=${reverseCents}分 (${Math.round(proportion * 100)}%)`);
  return { reversed: true, reverseCents, proportion };
}

// ==================== 解冻（定时扫描） ====================

/** 扫描到期 FROZEN 记录 → 转可提现。返回解冻条数 */
function runUnfreeze() {
  const db = getDb();
  const cfg = getConfig();
  if (cfg.unfreezeEnabled === false) return 0;
  const due = db.prepare("SELECT id, inviter_user_id, commission_cents FROM commission_records WHERE status = 'FROZEN' AND unfreeze_at IS NOT NULL AND unfreeze_at <= ?").all(nowIso());
  if (!due.length) return 0;
  const tx = db.transaction(() => {
    for (const r of due) {
      db.prepare("UPDATE commission_records SET status = 'UNFROZEN', unfrozen_at = ? WHERE id = ?").run(nowIso(), r.id);
      ensureAccount(db, r.inviter_user_id);
      db.prepare('UPDATE commission_accounts SET frozen_cents = frozen_cents - ?, withdrawable_cents = withdrawable_cents + ?, updated_at = ? WHERE user_id = ?')
        .run(r.commission_cents, r.commission_cents, nowIso(), r.inviter_user_id);
    }
  });
  tx();
  console.log(`[Commission] 解冻完成：${due.length} 条记录转可提现`);
  return due.length;
}

// ==================== 账户查询 / 提现申请 ====================

function accountSummary(userId) {
  const db = getDb();
  const uid = parseInt(userId, 10);
  ensureAccount(db, uid);
  const a = db.prepare('SELECT * FROM commission_accounts WHERE user_id = ?').get(uid);
  const cfg = getConfig();
  return {
    userId: String(uid),
    totalEarningsYuan: (a.total_earnings_cents / 100).toFixed(2),
    withdrawableYuan: (a.withdrawable_cents / 100).toFixed(2),
    frozenYuan: (a.frozen_cents / 100).toFixed(2),
    negativeYuan: (a.negative_cents / 100).toFixed(2),
    withdrawFrozen: !!a.withdraw_frozen,
    commissionEnabled: !!a.commission_enabled,
    // v25.0.47_12: 月度结算/提现窗口信息（前端展示规则用）
    settleRule: {
      monthlySettleEnabled: cfg.monthlySettleEnabled !== false,
      settleDay: cfg.monthlySettleEnabled !== false ? cfg.settleDay : null,
      withdrawOpenDay: cfg.monthlySettleEnabled !== false ? cfg.withdrawOpenDay : null,
      inWithdrawWindow: cfg.monthlySettleEnabled !== false ? inWithdrawWindow(cfg) : true,
      withdrawEnabled: cfg.withdrawEnabled !== false,
    },
  };
}

function listRecords(userId, limit = 50) {
  const db = getDb();
  const uid = parseInt(userId, 10);
  return db.prepare(`SELECT order_no, payer_user_id, ratio_percent, base_amount_cents, commission_cents, status, created_at, unfreeze_at, unfrozen_at, note
                     FROM commission_records WHERE inviter_user_id = ? ORDER BY id DESC LIMIT ?`).all(uid, limit);
}

function listWithdrawals(userId, limit = 50) {
  const db = getDb();
  const uid = parseInt(userId, 10);
  return db.prepare(`SELECT withdraw_no, amount_cents, status, fail_reason, created_at, reviewed_at, paid_at
                     FROM withdrawals WHERE user_id = ? ORDER BY id DESC LIMIT ?`).all(uid, limit);
}

/** 提现申请：校验（最低额/每日次数/余额/风控冻结）→ 扣减可提现 → PENDING_REVIEW */
function applyWithdrawal(userId, amountYuan, openid) {
  const cfg = getConfig();
  const db = getDb();
  const uid = parseInt(userId, 10);
  if (!uid || isNaN(uid)) return { ok: false, error: '用户无效' };

  // v25.0.47_10: 提现通道总开关（WITHDRAW_TRANSFER=DISABLED 时一律拒绝，不假装能提现）
  if (cfg.withdrawEnabled === false) {
    return { ok: false, error: '提现暂未开放：微信商家转账通道开通后将自动启用，收益会正常累计' };
  }
  // v25.0.47_12: 月度提现窗口——佣金每月 settleDay 号统一结算，withdrawOpenDay 号之后才可发起提现
  if (cfg.monthlySettleEnabled !== false && !inWithdrawWindow(cfg)) {
    return { ok: false, error: `佣金每月${cfg.settleDay}号统一结算，每月${cfg.withdrawOpenDay}号后开放提现；当前不在提现窗口内，收益正常累计` };
  }
  const amountCents = yuanToCents(amountYuan);
  const minCents = Math.round((parseFloat(cfg.minWithdrawYuan) || 10) * 100);
  if (amountCents < minCents) return { ok: false, error: `最低提现额为${cfg.minWithdrawYuan}元` };

  ensureAccount(db, uid);
  const acct = db.prepare('SELECT * FROM commission_accounts WHERE user_id = ?').get(uid);
  if (acct.withdraw_frozen) return { ok: false, error: '账户提现已冻结，请联系客服' };
  if (acct.withdrawable_cents < amountCents) return { ok: false, error: '可提现余额不足' };

  // 每日提现次数
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = db.prepare("SELECT COUNT(*) c FROM withdrawals WHERE user_id = ? AND created_at LIKE ?").get(uid, today + '%').c;
  if (todayCount >= (parseInt(cfg.dailyWithdrawLimit, 10) || 1)) {
    return { ok: false, error: `每日最多申请${cfg.dailyWithdrawLimit}次提现` };
  }

  if (!openid || typeof openid !== 'string' || openid.length < 6) {
    return { ok: false, error: '缺少微信收款信息（openid），请先完成微信授权' };
  }

  const withdrawNo = 'WD' + Date.now() + crypto.randomBytes(3).toString('hex').toUpperCase();
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO withdrawals (withdraw_no, user_id, amount_cents, status, openid, created_at)
                VALUES (?, ?, ?, 'PENDING_REVIEW', ?, ?)`)
      .run(withdrawNo, uid, amountCents, String(openid).slice(0, 64), nowIso());
    db.prepare('UPDATE commission_accounts SET withdrawable_cents = withdrawable_cents - ?, updated_at = ? WHERE user_id = ?')
      .run(amountCents, nowIso(), uid);
  });
  tx();
  console.log(`[Commission] 提现申请 user=${uid} amount=${amountCents}分 no=${withdrawNo}`);
  return { ok: true, withdrawNo, amountCents };
}

// ==================== 导出 ====================

module.exports = {
  getConfig,
  saveConfig,
  getDb,
  grantCommission,
  reverseCommission,
  runUnfreeze,
  accountSummary,
  listRecords,
  listWithdrawals,
  applyWithdrawal,
  yuanToCents,
  getDirectInviter,
};
