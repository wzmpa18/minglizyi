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
  withdrawEnabled: false,        // v25.0.47_10 提现总开关（受 .env WITHDRAW_TRANSFER_ENABLED 主开关约束，双开关均开才可提现）
  unfreezeEnabled: true,         // 解冻期开关
  unfreezeDays: 7,               // 解冻天数（旧机制，v12 起由月度结算覆盖：settleDay）
  settleDay: 0,                  // v25.0.47_13 月度结算日：0=每月最后1天统一结算（FROZEN→可提现），正数=每月该号结算
  withdrawOpenDay: 16,           // v25.0.47_13 提现窗口：每月16日-月末开放提现，其余时间强制拦截
  monthlySettleEnabled: true,    // v25.0.47_12 月度结算模式开关（关闭则回退 unfreezeDays 机制）
  minWithdrawYuan: 10,           // 最低提现门槛（元，可由 .env WITHDRAW_MIN_AMOUNT 初始化）
  freePassAmountYuan: 200,       // v25.0.47_13 免审额度（元）：低于该额度自动发起转账免人工审核（.env WITHDRAW_FREE_PASS_AMOUNT 初始化）
  dailyWithdrawAmountLimitYuan: 20000, // v25.0.47_13 单日单用户提现限额（元），超限自动拦截
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
    newAccountDays: 7,             // v25.0.47_13 注册不足N天的账号提现强制人工审核
    forceReviewDailyCount: 2,      // v25.0.47_13 当天已发起N笔提现后再申请强制人工审核
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
  let cfg;
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      cfg = { ...DEFAULT_CONFIG, ...saved, ratios: { ...DEFAULT_CONFIG.ratios, ...(saved.ratios || {}) }, riskControl: { ...DEFAULT_CONFIG.riskControl, ...(saved.riskControl || {}) } };
    } else {
      cfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }
  } catch (e) {
    console.error('[Commission] 配置读取失败，用默认值:', e.message);
    cfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
  // v25.0.47_13: .env 初始化（仅当文件配置未显式保存过对应字段时生效）
  if (process.env.WITHDRAW_MIN_AMOUNT) {
    const v = parseFloat(process.env.WITHDRAW_MIN_AMOUNT);
    if (!isNaN(v) && v > 0 && cfg.minWithdrawYuan === DEFAULT_CONFIG.minWithdrawYuan) cfg.minWithdrawYuan = v;
  }
  if (process.env.WITHDRAW_FREE_PASS_AMOUNT) {
    const v = parseFloat(process.env.WITHDRAW_FREE_PASS_AMOUNT);
    if (!isNaN(v) && v >= 0 && cfg.freePassAmountYuan === DEFAULT_CONFIG.freePassAmountYuan) cfg.freePassAmountYuan = v;
  }
  return cfg;
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

/** v25.0.47_13: 月度结算模式下，佣金入账后的下一次结算时间（settleDay=0 表示每月最后1天） */
function nextSettleTime(cfg) {
  const raw = parseInt(cfg.settleDay, 10);
  const now = new Date();
  // settleDay <= 0 → 每月最后一天
  if (!raw || raw <= 0) {
    let last = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    if (last.getTime() <= now.getTime()) {
      last = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
    }
    return last.toISOString();
  }
  const day = Math.min(28, Math.max(1, raw));
  let settle = new Date(now.getFullYear(), now.getMonth(), day, 23, 59, 59, 999);
  if (settle.getTime() <= now.getTime()) {
    settle = new Date(now.getFullYear(), now.getMonth() + 1, day, 23, 59, 59, 999);
  }
  return settle.toISOString();
}

/** 结算日展示文案（settleDay=0 → 每月最后1天） */
function settleDayText(cfg) {
  const raw = parseInt(cfg.settleDay, 10);
  return (!raw || raw <= 0) ? '最后1天' : `${raw}号`;
}

/** v25.0.47_13: 当前是否处于月度提现窗口（每月 withdrawOpenDay 日00:00 - 月末） */
function inWithdrawWindow(cfg) {
  const openDay = parseInt(cfg.withdrawOpenDay, 10) || 16;
  const d = new Date().getDate();
  return d >= openDay;
}

/** v25.0.47_13: .env 主开关 WITHDRAW_TRANSFER_ENABLED（默认 false；双开关：env 主开关 && 后台 withdrawEnabled） */
function transferMasterEnabled() {
  const env = process.env.WITHDRAW_TRANSFER_ENABLED;
  if (env != null && env !== '') return env === 'true' || env === '1';
  const legacy = process.env.WECHAT_TRANSFER_ENABLED;
  return legacy === 'true' || legacy === '1';
}

/** 提现功能是否真正可用（env 主开关 && 后台开关） */
function withdrawAvailable(cfg) {
  return transferMasterEnabled() && cfg.withdrawEnabled !== false;
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
  // v25.0.47_13: 累计提现 = 已成功到账（PAID）金额合计
  const withdrawn = db.prepare("SELECT COALESCE(SUM(amount_cents),0) s FROM withdrawals WHERE user_id = ? AND status = 'PAID'").get(uid).s;
  return {
    userId: String(uid),
    totalEarningsYuan: (a.total_earnings_cents / 100).toFixed(2),
    withdrawableYuan: (a.withdrawable_cents / 100).toFixed(2),
    frozenYuan: (a.frozen_cents / 100).toFixed(2),
    negativeYuan: (a.negative_cents / 100).toFixed(2),
    withdrawnTotalYuan: (withdrawn / 100).toFixed(2),
    withdrawFrozen: !!a.withdraw_frozen,
    commissionEnabled: !!a.commission_enabled,
    // v25.0.47_13: 月度结算/提现窗口信息（前端展示规则用，settleDay=0 表示每月最后1天）
    settleRule: {
      monthlySettleEnabled: cfg.monthlySettleEnabled !== false,
      settleDay: cfg.monthlySettleEnabled !== false ? cfg.settleDay : null,
      settleDayText: cfg.monthlySettleEnabled !== false ? settleDayText(cfg) : null,
      withdrawOpenDay: cfg.monthlySettleEnabled !== false ? cfg.withdrawOpenDay : null,
      inWithdrawWindow: cfg.monthlySettleEnabled !== false ? inWithdrawWindow(cfg) : true,
      withdrawEnabled: withdrawAvailable(cfg),
      minWithdrawYuan: cfg.minWithdrawYuan,
      freePassAmountYuan: cfg.freePassAmountYuan,
      dailyWithdrawAmountLimitYuan: cfg.dailyWithdrawAmountLimitYuan,
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

/**
 * v25.0.47_13 提现申请（FIX-WITHDRAW-V13-FINAL）
 * 校验链：.env主开关/后台开关 → 提现窗口 → 最低门槛 → 余额 → 单日限额(次数+金额) → 风控标记
 * 路由分支：
 *   · 免审额度内 + 转账通道配置齐备 → 自动发起微信商家转账（TRANSFERING，回调终态）
 *   · 超免审额度 / 风控标记 / 转账未配置 → PENDING_REVIEW 人工审核队列
 * 注意：本函数为 async（自动转账分支需 await executeTransfer），调用方必须 await。
 */
async function applyWithdrawal(userId, amountYuan, openid) {
  const cfg = getConfig();
  const db = getDb();
  const uid = parseInt(userId, 10);
  if (!uid || isNaN(uid)) return { ok: false, error: '用户无效' };

  // v25.0.47_13: .env 主开关 WITHDRAW_TRANSFER_ENABLED（默认 false，双开关全开才可提现）
  if (!transferMasterEnabled()) {
    return { ok: false, error: '提现暂未开放：商家转账通道启用后将自动开启，收益会正常累计' };
  }
  if (cfg.withdrawEnabled === false) {
    return { ok: false, error: '提现功能已由后台关闭，收益会正常累计' };
  }
  // v25.0.47_13: 月度提现窗口——每月最后1天结算，16日-月末开放提现
  if (cfg.monthlySettleEnabled !== false && !inWithdrawWindow(cfg)) {
    return { ok: false, error: `佣金每月${settleDayText(cfg)}统一结算，每月${cfg.withdrawOpenDay}日-月末开放提现；当前不在提现窗口内，收益正常累计` };
  }
  const amountCents = yuanToCents(amountYuan);
  const minCents = Math.round((parseFloat(cfg.minWithdrawYuan) || 10) * 100);
  if (amountCents < minCents) return { ok: false, error: `最低提现门槛为${cfg.minWithdrawYuan}元` };

  ensureAccount(db, uid);
  const acct = db.prepare('SELECT * FROM commission_accounts WHERE user_id = ?').get(uid);
  if (acct.withdraw_frozen) return { ok: false, error: '账户提现已冻结，请联系客服' };
  if (acct.withdrawable_cents < amountCents) return { ok: false, error: '可提现余额不足' };

  const today = new Date().toISOString().slice(0, 10);
  // 每日提现次数
  const todayCount = db.prepare("SELECT COUNT(*) c FROM withdrawals WHERE user_id = ? AND created_at LIKE ?").get(uid, today + '%').c;
  if (todayCount >= (parseInt(cfg.dailyWithdrawLimit, 10) || 1)) {
    return { ok: false, error: `每日最多申请${cfg.dailyWithdrawLimit}次提现` };
  }
  // v25.0.47_13: 单日单用户提现金额限额（默认2万元，当日已申请金额+本次不可超限）
  const dailyLimitCents = Math.round((parseFloat(cfg.dailyWithdrawAmountLimitYuan) || 20000) * 100);
  const todayAmount = db.prepare("SELECT COALESCE(SUM(amount_cents),0) s FROM withdrawals WHERE user_id = ? AND created_at LIKE ? AND status != 'REJECTED'").get(uid, today + '%').s;
  if (todayAmount + amountCents > dailyLimitCents) {
    return { ok: false, error: `单日提现限额${(dailyLimitCents / 100).toFixed(0)}元（今日已申请${(todayAmount / 100).toFixed(2)}元），超出部分请明日再提` };
  }

  if (!openid || typeof openid !== 'string' || openid.length < 6) {
    return { ok: false, error: '缺少微信收款信息（openid），请先完成微信授权' };
  }

  // v25.0.47_13 风控：新注册账号 / 短时间多笔提现 → 强制人工审核
  let forceReview = false;
  const reviewReasons = [];
  try {
    const rc = cfg.riskControl || {};
    if (rc.enabled !== false) {
      const u = db.prepare('SELECT created_at FROM users WHERE user_id = ?').get(uid);
      const newDays = parseInt(rc.newAccountDays, 10) || 7;
      if (u && u.created_at) {
        const ageMs = Date.now() - new Date(u.created_at.replace(' ', 'T') + 'Z').getTime();
        if (ageMs < newDays * 86400000) { forceReview = true; reviewReasons.push(`新注册账号(${newDays}天内)`); }
      }
      const fdc = parseInt(rc.forceReviewDailyCount, 10) || 2;
      if (todayCount + 1 >= fdc) { forceReview = true; reviewReasons.push('当日多笔提现'); }
      if (acct.withdrawable_cents < amountCents * 2 && amountCents >= Math.round((parseFloat(rc.dailyEarningsAlertYuan) || 1000) * 100)) {
        forceReview = true; reviewReasons.push('大额提现');
      }
    }
  } catch (e) { /* users 表结构差异不阻断主流程 */ }

  // 免审额度（默认200元）：额度内且转账通道配置齐备 → 自动转账；否则人工审核
  const freePassCents = Math.round((parseFloat(cfg.freePassAmountYuan) || 200) * 100);
  let autoTransfer = false;
  if (!forceReview && amountCents <= freePassCents) {
    try {
      const wechatTransfer = require('./wechatTransfer');
      if (wechatTransfer.isConfigured()) autoTransfer = true;
    } catch (e) { /* 模块缺失 → 人工审核 */ }
  }

  const withdrawNo = 'WD' + Date.now() + crypto.randomBytes(3).toString('hex').toUpperCase();
  const initStatus = autoTransfer ? 'TRANSFERING' : 'PENDING_REVIEW';
  const note = reviewReasons.length ? '风控标记：' + reviewReasons.join('、') : null;
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO withdrawals (withdraw_no, user_id, amount_cents, status, openid, created_at, fail_reason)
                VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(withdrawNo, uid, amountCents, initStatus, String(openid).slice(0, 64), nowIso(), note);
    db.prepare('UPDATE commission_accounts SET withdrawable_cents = withdrawable_cents - ?, updated_at = ? WHERE user_id = ?')
      .run(amountCents, nowIso(), uid);
  });
  tx();
  console.log(`[Commission] 提现申请 user=${uid} amount=${amountCents}分 no=${withdrawNo} 状态=${initStatus}${note ? ' ' + note : ''}`);

  // 自动发起商家转账（受理失败即时退回余额并标记失败）
  if (autoTransfer) {
    const tr = await executeTransfer(withdrawNo, { name: '免审自动转账', role: 'AUTO' });
    return { ok: true, withdrawNo, amountCents, auto: true, transfer: tr };
  }
  return { ok: true, withdrawNo, amountCents, auto: false };
}

/**
 * v25.0.47_13 执行商家转账（幂等：同一提现单仅发起一次）
 * @param {string} withdrawNo 提现单号
 * @param {{name:string, role:string}} operator 审核人（免审自动 = AUTO）
 */
async function executeTransfer(withdrawNo, operator) {
  const db = getDb();
  const w = db.prepare('SELECT * FROM withdrawals WHERE withdraw_no = ?').get(String(withdrawNo));
  if (!w) return { ok: false, error: '提现单不存在' };
  // 幂等：终态单不可重复处理
  if (w.status === 'PAID' || w.status === 'FAILED' || w.status === 'REJECTED') {
    return { ok: true, skipped: true, status: w.status, reason: '该提现单已处理完成（幂等拦截）' };
  }
  // 免审自动转账路径：applyWithdrawal 已预置 TRANSFERING 且未标记审核人 → 允许继续发起
  // 人工审核路径：仅 PENDING_REVIEW 可发起；已被人接手的 TRANSFERING（reviewed_by 非空）不可重复发起
  const autoPending = w.status === 'TRANSFERING' && !w.reviewed_by;
  if (w.status !== 'PENDING_REVIEW' && !autoPending) {
    return { ok: false, error: `当前状态${w.status}不可发起转账` };
  }
  let wechatTransfer;
  try { wechatTransfer = require('./wechatTransfer'); } catch (e) {
    return { ok: false, error: '转账模块不可用' };
  }
  if (!wechatTransfer.isConfigured()) {
    return { ok: false, notConfigured: true, error: '商家转账未配置（需开通产品权限并配置WITHDRAW_*变量），请人工线下打款' };
  }
  const cfg = getConfig();
  // 标记处理中（防并发重复发起；autoPending 时补记审核人）
  db.prepare("UPDATE withdrawals SET status = 'TRANSFERING', reviewed_by = ?, reviewed_at = ? WHERE withdraw_no = ? AND status IN ('PENDING_REVIEW', 'TRANSFERING')")
    .run(`${operator.name}(${operator.role})`, nowIso(), String(withdrawNo));
  const r = await wechatTransfer.transfer({
    withdrawNo: w.withdraw_no,
    openid: w.openid,
    amountCents: w.amount_cents,
    note: cfg.transferNote,
  });
  if (r.success) {
    // 受理成功：等待微信回调终态（WAIT_USER_CONFIRM/TRANSFERING → PAID/FAILED）
    db.prepare('UPDATE withdrawals SET wechat_transfer_no = ?, paid_at = ? WHERE withdraw_no = ?')
      .run(r.transferNo || null, null, String(withdrawNo));
    console.log(`[Commission] 转账已受理 no=${withdrawNo} state=${r.state} transferNo=${r.transferNo}`);
    return { ok: true, state: r.state, transferNo: r.transferNo };
  }
  // 受理失败：退回余额 + FAILED
  const tx = db.transaction(() => {
    db.prepare("UPDATE withdrawals SET status = 'FAILED', fail_reason = ?, paid_at = NULL WHERE withdraw_no = ?")
      .run(String(r.error || '转账失败').slice(0, 200), String(withdrawNo));
    db.prepare('UPDATE commission_accounts SET withdrawable_cents = withdrawable_cents + ?, updated_at = ? WHERE user_id = ?')
      .run(w.amount_cents, nowIso(), w.user_id);
  });
  tx();
  console.error(`[Commission] 转账失败 no=${withdrawNo} err=${r.error}`);
  return { ok: false, error: r.error };
}

/**
 * v25.0.47_13 转账回调终态落账（幂等）
 * @param {string} withdrawNo 商户转账单号（=提现单号）
 * @param {string} state 微信终态 SUCCESS / FAIL / CANCELLED
 */
function markTransferResult(withdrawNo, state, failReason, transferNo) {
  const db = getDb();
  const w = db.prepare('SELECT * FROM withdrawals WHERE withdraw_no = ?').get(String(withdrawNo));
  if (!w) return { ok: false, error: '提现单不存在' };
  if (w.status === 'PAID' || w.status === 'FAILED') {
    return { ok: true, skipped: true, status: w.status }; // 幂等：终态不重复处理
  }
  const success = state === 'SUCCESS';
  const tx = db.transaction(() => {
    db.prepare('UPDATE withdrawals SET status = ?, fail_reason = ?, paid_at = ?, wechat_transfer_no = COALESCE(?, wechat_transfer_no) WHERE withdraw_no = ?')
      .run(success ? 'PAID' : 'FAILED', success ? null : String(failReason || '转账失败').slice(0, 200), success ? nowIso() : null, transferNo || null, String(withdrawNo));
    if (!success) {
      db.prepare('UPDATE commission_accounts SET withdrawable_cents = withdrawable_cents + ?, updated_at = ? WHERE user_id = ?')
        .run(w.amount_cents, nowIso(), w.user_id);
    }
  });
  tx();
  console.log(`[Commission] 转账回调 no=${withdrawNo} state=${state} → ${success ? 'PAID' : 'FAILED(余额已退回)'}`);
  return { ok: true, status: success ? 'PAID' : 'FAILED' };
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
  executeTransfer,
  markTransferResult,
  withdrawAvailable,
  transferMasterEnabled,
  settleDayText,
  inWithdrawWindow,
  yuanToCents,
  getDirectInviter,
};
