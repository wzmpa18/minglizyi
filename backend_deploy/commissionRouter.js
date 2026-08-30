// ============================================================================
// commissionRouter.js — COMMISSION_ROUTER（分佣唯一结算引擎）
// ============================================================================
// 指令：AI-PRODUCTION-SEAL-AND-COMMISSION-ROUTER-04 第三十八~八十二部分
//
// 定位：分佣的【唯一入口】。支付/退款只进 Router 一次，禁止 commissionEngine
//       与 partnerEngine 在 paymentRoutes 中被各自独立调用导致重复计提。
//
// 铁律（不可协商）：
//   1. 普通推荐佣金 L1=15%、L2=5%（禁止改比例，沿用 commissionEngine 配置）
//   2. Partner 渠道佣金 = 渠道净收入(DISTRIBUTABLE_REVENUE) × 50%（禁止改）
//   3. 直属培养奖励 = 下级渠道净收入 × 5%（平台承担，禁止加二级/三级/无限层级）
//   4. 金额全程整数「分」，禁止 JS float 直接算钱
//   5. 幂等：同一 orderNo 只入账一次（commission_router_snapshots.order_no UNIQUE）
//   6. 每笔账守恒：gross = paymentFee + referral(L1+L2) + aiCost + refund
//                    + partnerRevenue + nurtureRevenue + platformRevenue
//   7. 双身份（Partner 同时是该用户 L1 直接推荐人）默认 REVIEW_REQUIRED，
//      不得擅自启用 STACK/PRIORITY/NET_OF_REFERRAL 影响真实资金，等项目方决策。
// ============================================================================
'use strict';

const fs = require('fs');
const path = require('path');

const commissionEngine = require('./commissionEngine');
const partnerEngine = require('./partnerEngine');

const DATA_DIR = process.env.COMMISSION_ROUTER_DIR || path.join(__dirname, 'data');
const CONFIG_FILE = process.env.COMMISSION_ROUTER_FILE || path.join(DATA_DIR, 'commission_router_config.json');

// 双身份策略（第五十部分）
const DOUBLE_IDENTITY_POLICIES = {
  // 默认：双身份订单不自动发放 Partner 侧，标 REVIEW_REQUIRED 待项目方决策。
  // 普通两级佣金(15%/5%)维持现状照发（该权益独立于 Partner，且 Partner 当前=0）。
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  // 明确允许双拿（现状副作用）
  STACK_ALLOWED: 'STACK_ALLOWED',
  // 仅普通推荐佣金，Partner 不发
  REFERRAL_PRIORITY: 'REFERRAL_PRIORITY',
  // 仅 Partner 渠道佣金，普通推荐不发
  PARTNER_PRIORITY: 'PARTNER_PRIORITY',
  // Partner 净额（partnerEngine 已扣普通佣金后 ×50%）
  PARTNER_NET_OF_REFERRAL: 'PARTNER_NET_OF_REFERRAL',
};

const DEFAULT_CONFIG = {
  enabled: true,
  formulaVersion: '1.0.0',               // ROUTER_FORMULA_VERSION
  effectiveFrom: '2026-08-30',           // ROUTER_EFFECTIVE_FROM（新订单据此切 Router）
  doubleIdentityPolicy: DOUBLE_IDENTITY_POLICIES.REVIEW_REQUIRED,
  moneyUnit: 'cents',
  enforceConservation: true,             // 金额守恒校验
  enforceIdempotency: true,              // 幂等拦截
};

// Settlement 状态机（第五十九部分，最小可用子集）
const SETTLEMENT_STATUS = {
  ESTIMATED: 'ESTIMATED',          // 已入账，成本为估算（AI 未 CALIBRATED）
  REVIEW_REQUIRED: 'REVIEW_REQUIRED', // 双身份未决策，暂停 Partner 自动结算
  SETTLED: 'SETTLED',              // 已按策略入账
  PARTIAL_REFUND: 'PARTIAL_REFUND',
  REVERSED: 'REVERSED',            // 全额退款冲正
  RESOLVED_STACK: 'RESOLVED_STACK',   // 项目方决策后补发（允许双拿）
  RESOLVED_DISMISS: 'RESOLVED_DISMISS', // 项目方决策后维持仅普通
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getConfig() {
  try {
    ensureDataDir();
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return { ...DEFAULT_CONFIG, ...saved };
    }
  } catch (e) {
    console.error('[Router] 配置读取失败，用默认值:', e.message);
  }
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function saveConfig(cfg) {
  ensureDataDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  return cfg;
}

function nowIso() { return new Date().toISOString(); }

// ==================== 数据库 & 快照表 ====================
// 复用 commissionEngine 的 users DB 连接（commission_records / commission_accounts
// 与 partnerEngine.grantPartnerCommission 使用同一份账本，record_type 区分类型）。

let _db = null;
function getDb() {
  if (_db) return _db;
  _db = commissionEngine.getDb();
  ensureSchema();
  return _db;
}

function ensureSchema() {
  const db = _db || commissionEngine.getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS commission_router_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      payer_user_id INTEGER,
      formula_version TEXT NOT NULL DEFAULT '1.0.0',
      -- 身份解析（第六十六部分：订单生成时保存归属快照）
      direct_referrer_id INTEGER,
      level2_referrer_id INTEGER,
      partner_attribution_id INTEGER,
      double_identity INTEGER NOT NULL DEFAULT 0,
      double_identity_policy TEXT,
      -- 金额（分，第五十五~五十六部分）
      gross_cents INTEGER NOT NULL DEFAULT 0,
      payment_fee_cents INTEGER NOT NULL DEFAULT 0,
      referral_l1_cents INTEGER NOT NULL DEFAULT 0,
      referral_l2_cents INTEGER NOT NULL DEFAULT 0,
      ai_cost_cents INTEGER NOT NULL DEFAULT 0,
      ai_cost_source TEXT,
      partner_revenue_cents INTEGER NOT NULL DEFAULT 0,
      nurture_revenue_cents INTEGER NOT NULL DEFAULT 0,
      refund_cents INTEGER NOT NULL DEFAULT 0,
      platform_revenue_cents INTEGER NOT NULL DEFAULT 0,
      conservation_ok INTEGER NOT NULL DEFAULT 0,
      -- 状态机（第五十九部分）
      status TEXT NOT NULL DEFAULT 'ESTIMATED',
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_router_review ON commission_router_snapshots(status);
  `);
}

// ==================== 身份解析 ====================

/**
 * 统一解析商业关系（第四十四部分）：
 *   directReferrer/level2Referrer —— 普通两级推荐（复用 commissionEngine.getDirectInviter）
 *   partnerAttribution —— 渠道归属（复用 partnerEngine.findChannelPartner）
 */
function resolveIdentities(order) {
  const db = getDb();
  const directReferrerId = commissionEngine.getDirectInviter(db, order.userId) || null;
  const level2ReferrerId = directReferrerId ? (commissionEngine.getDirectInviter(db, directReferrerId) || null) : null;
  const partnerAttributionId = partnerEngine.findChannelPartner(order.userId) || null;
  // 双身份（第四十八部分核心问）：Partner A 同时也是用户 L1 直接普通推荐人
  const doubleIdentity = !!(partnerAttributionId && directReferrerId &&
    String(partnerAttributionId) === String(directReferrerId));
  return { directReferrerId, level2ReferrerId, partnerAttributionId, doubleIdentity };
}

// ==================== 快照构建 & 金额守恒 ====================

/**
 * 从实际账本读取该订单各分佣明细，组装不可变快照（保证快照 = 实际账本，杜绝估算）
 */
function buildSnapshot(db, order, ids, results) {
  const orderNo = String(order.orderId);
  const grossCents = commissionEngine.yuanToCents(order.amount);

  let referralL1Cents = 0, referralL2Cents = 0, partnerRevenueCents = 0, nurtureRevenueCents = 0;
  let paymentFeeCents = 0, aiCostCents = 0;
  try {
    const rows = db.prepare("SELECT record_type, commission_cents FROM commission_records WHERE order_no = ? AND status != 'REVERSED'").all(orderNo);
    for (const r of rows) {
      if (r.record_type === 'COMMISSION') referralL1Cents += r.commission_cents;
      else if (r.record_type === 'COMMISSION_L2') referralL2Cents += r.commission_cents;
      else if (r.record_type === 'PARTNER_COMMISSION') partnerRevenueCents += r.commission_cents;
      else if (r.record_type === 'PARTNER_NURTURE') nurtureRevenueCents += r.commission_cents;
    }
  } catch (e) { console.error('[Router] 读取 commission_records 失败:', e.message); }

  try {
    const pol = db.prepare("SELECT fee_cost_cents, ai_cost_cents FROM partner_order_log WHERE order_no = ? AND status = 'ACTIVE'").get(orderNo);
    if (pol) {
      paymentFeeCents = pol.fee_cost_cents;
      aiCostCents = pol.ai_cost_cents;
    }
  } catch (e) { console.error('[Router] 读取 partner_order_log 失败:', e.message); }

  const refundCents = 0;
  const platformRevenueCents = grossCents - paymentFeeCents - referralL1Cents - referralL2Cents
    - aiCostCents - partnerRevenueCents - nurtureRevenueCents - refundCents;

  return {
    order_no: orderNo,
    payer_user_id: parseInt(order.userId, 10) || 0,
    formula_version: getConfig().formulaVersion,
    direct_referrer_id: ids.directReferrerId,
    level2_referrer_id: ids.level2ReferrerId,
    partner_attribution_id: ids.partnerAttributionId,
    double_identity: ids.doubleIdentity ? 1 : 0,
    double_identity_policy: ids.doubleIdentity ? getConfig().doubleIdentityPolicy : null,
    gross_cents: grossCents,
    payment_fee_cents: paymentFeeCents,
    referral_l1_cents: referralL1Cents,
    referral_l2_cents: referralL2Cents,
    ai_cost_cents: aiCostCents,
    ai_cost_source: 'ESTIMATED', // 当前 AI 价格为 ESTIMATED（第五十二~五十三部分）
    partner_revenue_cents: partnerRevenueCents,
    nurture_revenue_cents: nurtureRevenueCents,
    refund_cents: refundCents,
    platform_revenue_cents: platformRevenueCents,
    conservation_ok: platformRevenueCents >= 0 ? 1 : 0,
  };
}

function insertSnapshot(db, snap, status, note) {
  db.prepare(`INSERT INTO commission_router_snapshots (
      order_no, payer_user_id, formula_version, direct_referrer_id, level2_referrer_id,
      partner_attribution_id, double_identity, double_identity_policy,
      gross_cents, payment_fee_cents, referral_l1_cents, referral_l2_cents,
      ai_cost_cents, ai_cost_source, partner_revenue_cents, nurture_revenue_cents,
      refund_cents, platform_revenue_cents, conservation_ok, status, note, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )`).run(
    snap.order_no, snap.payer_user_id, snap.formula_version, snap.direct_referrer_id, snap.level2_referrer_id,
    snap.partner_attribution_id, snap.double_identity, snap.double_identity_policy,
    snap.gross_cents, snap.payment_fee_cents, snap.referral_l1_cents, snap.referral_l2_cents,
    snap.ai_cost_cents, snap.ai_cost_source, snap.partner_revenue_cents, snap.nurture_revenue_cents,
    snap.refund_cents, snap.platform_revenue_cents, snap.conservation_ok, status, note, nowIso(), nowIso()
  );
  return db.prepare('SELECT last_insert_rowid() AS id').get().id;
}

// ==================== 唯一结算入口 ====================

/**
 * 订单支付成功 → 唯一分佣入口（第四十一部分）。
 * 替代 paymentRoutes 中对 commissionEngine.grantCommission / partnerEngine.grantPartnerCommission
 * 的独立调用。内部按双身份策略编排，写不可变快照 + 守恒校验。
 *
 * @param {object} order { orderId, userId, type, amount(元), title }
 * @returns {object} { ok, doubleIdentity, policy, reviewRequired, snapshotId, referral, partner, conservation }
 */
function processPaidOrder(order) {
  const cfg = getConfig();
  if (!cfg.enabled) return { ok: false, reason: 'ROUTER_DISABLED' };
  if (!order || !order.orderId || !order.userId) return { ok: false, reason: 'INVALID_ORDER' };

  const db = getDb();
  const orderNo = String(order.orderId);

  // 幂等（第六十二部分：重复微信回调只入账一次）
  if (cfg.enforceIdempotency) {
    const existed = db.prepare('SELECT id, status FROM commission_router_snapshots WHERE order_no = ?').get(orderNo);
    if (existed) return { ok: false, reason: 'DUPLICATE', snapshotId: existed.id, existingStatus: existed.status };
  }

  const ids = resolveIdentities(order);
  const policy = ids.doubleIdentity ? cfg.doubleIdentityPolicy : null;

  let referral = { granted: false };
  let partner = { granted: false };

  // 策略编排（第五十部分）
  const callReferral = () => { try { referral = commissionEngine.grantCommission(order); } catch (e) { referral = { granted: false, reason: 'ERROR:' + e.message }; } };
  const callPartner = () => { try { partner = partnerEngine.grantPartnerCommission(order); } catch (e) { partner = { granted: false, reason: 'ERROR:' + e.message }; } };

  if (!ids.doubleIdentity) {
    // 非双身份：维持现有双引擎行为（普通 15%/5% + Partner 50% + 培养 5%）
    callReferral();
    callPartner();
  } else if (policy === DOUBLE_IDENTITY_POLICIES.STACK_ALLOWED ||
             policy === DOUBLE_IDENTITY_POLICIES.PARTNER_NET_OF_REFERRAL) {
    // 项目方明确允许双拿 / 净额（partnerEngine 已扣普通佣金成本）
    callReferral();
    callPartner();
  } else if (policy === DOUBLE_IDENTITY_POLICIES.REFERRAL_PRIORITY) {
    callReferral();
  } else if (policy === DOUBLE_IDENTITY_POLICIES.PARTNER_PRIORITY) {
    callPartner();
  } else {
    // 默认 REVIEW_REQUIRED：普通两级佣金照发（现状权益），Partner 侧暂停自动结算
    callReferral();
  }

  const snap = buildSnapshot(db, order, ids, { referral, partner });

  let status, note;
  if (ids.doubleIdentity && policy === DOUBLE_IDENTITY_POLICIES.REVIEW_REQUIRED) {
    status = SETTLEMENT_STATUS.REVIEW_REQUIRED;
    note = `双身份订单：Partner(${ids.partnerAttributionId}) 同时为 L1 推荐人，Partner 侧待项目方决策（BUSINESS_DECISION_REQUIRED）`;
  } else if (ids.doubleIdentity) {
    status = SETTLEMENT_STATUS.SETTLED;
    note = `双身份订单按策略 ${policy} 结算`;
  } else {
    status = SETTLEMENT_STATUS.SETTLED;
    note = null;
  }

  let snapshotId = null;
  try {
    snapshotId = insertSnapshot(db, snap, status, note);
  } catch (e) {
    if (/UNIQUE/.test(e.message)) return { ok: false, reason: 'DUPLICATE' };
    console.error('[Router] 快照写入失败:', e.message);
    return { ok: false, reason: 'SNAPSHOT_ERROR:' + e.message };
  }

  // 守恒校验结果（第五十七部分；失败不阻断入账，但标记 conservation_ok=0 并在返回值暴露告警）
  const conservation = {
    ok: snap.platform_revenue_cents >= 0,
    platformRevenueCents: snap.platform_revenue_cents,
    grossCents: snap.gross_cents,
    breakdown: {
      paymentFee: snap.payment_fee_cents,
      referralL1: snap.referral_l1_cents,
      referralL2: snap.referral_l2_cents,
      aiCost: snap.ai_cost_cents,
      partner: snap.partner_revenue_cents,
      nurture: snap.nurture_revenue_cents,
      refund: snap.refund_cents,
    },
  };

  if (!conservation.ok) {
    console.error(`[Router] 金额守恒告警 order=${orderNo} platform=${snap.platform_revenue_cents} 分（负值）`);
  }

  console.log(`[Router] 分佣入账 order=${orderNo} 双身份=${ids.doubleIdentity ? 'YES(' + policy + ')' : 'NO'} 普通L1=${snap.referral_l1_cents}分 L2=${snap.referral_l2_cents}分 partner=${snap.partner_revenue_cents}分 nurture=${snap.nurture_revenue_cents}分 status=${status}`);

  return {
    ok: true,
    doubleIdentity: ids.doubleIdentity,
    policy,
    reviewRequired: status === SETTLEMENT_STATUS.REVIEW_REQUIRED,
    snapshotId,
    referral,
    partner,
    conservation,
    status,
  };
}

/**
 * 订单退款 → 唯一冲正入口（第四十二、六十一部分）。
 * 支持全额退款（refundAmount 省略）与部分退款（refundAmount 传元）。
 * 幂等：引擎内部 record_type 状态判定 + 快照状态更新。
 */
function processRefund(orderId, refundAmount) {
  const db = getDb();
  const orderNo = String(orderId);

  const referral = commissionEngine.reverseCommission(orderNo, refundAmount);
  const partner = partnerEngine.reversePartnerCommission(orderNo, refundAmount);

  const snap = db.prepare('SELECT * FROM commission_router_snapshots WHERE order_no = ?').get(orderNo);
  if (snap) {
    const refundCents = refundAmount != null ? commissionEngine.yuanToCents(refundAmount) : snap.gross_cents;
    const nextStatus = refundCents >= snap.gross_cents ? SETTLEMENT_STATUS.REVERSED : SETTLEMENT_STATUS.PARTIAL_REFUND;
    db.prepare('UPDATE commission_router_snapshots SET refund_cents = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(refundCents, nextStatus, nowIso(), snap.id);
    console.log(`[Router] 退佣冲正 order=${orderNo} refund=${refundCents}分 status=${nextStatus}`);
  } else {
    // 历史订单（Router 上线前）无快照：仍走引擎冲正，保持兼容
    console.log(`[Router] 历史订单冲正（无快照） order=${orderNo}`);
  }

  return { ok: true, orderNo, referral, partner };
}

// ==================== 对账（第六十三~六十四部分） ====================

/**
 * read-only 对账：比对 Router 快照与实际 commission_records / partner_order_log 状态。
 * 不一致仅报告（不自动改历史真实佣金）。
 */
function reconcileOrder(orderNo) {
  const db = getDb();
  const snap = db.prepare('SELECT * FROM commission_router_snapshots WHERE order_no = ?').get(String(orderNo));
  if (!snap) return { ok: false, reason: 'NO_SNAPSHOT', note: 'Router 上线前订单无快照' };

  const actual = {
    referralL1: 0, referralL2: 0, partner: 0, nurture: 0,
    activeSerialRecords: [],
  };
  const rows = db.prepare("SELECT id, record_type, inviter_user_id, commission_cents, status FROM commission_records WHERE order_no = ?").all(String(orderNo));
  for (const r of rows) {
    if (r.record_type === 'COMMISSION') actual.referralL1 += r.commission_cents;
    else if (r.record_type === 'COMMISSION_L2') actual.referralL2 += r.commission_cents;
    else if (r.record_type === 'PARTNER_COMMISSION') actual.partner += r.commission_cents;
    else if (r.record_type === 'PARTNER_NURTURE') actual.nurture += r.commission_cents;
    if (r.status !== 'REVERSED' && r.status !== 'INVALID') {
      if (r.record_type.startsWith('PARTNER')) actual.activeSerialRecords.push(r);
    }
  }

  const discrepancies = [];
  if (actual.referralL1 !== snap.referral_l1_cents) discrepancies.push(`L1快照=${snap.referral_l1_cents} 实际=${actual.referralL1}`);
  if (actual.referralL2 !== snap.referral_l2_cents) discrepancies.push(`L2快照=${snap.referral_l2_cents} 实际=${actual.referralL2}`);
  if (actual.partner !== snap.partner_revenue_cents) discrepancies.push(`partner快照=${snap.partner_revenue_cents} 实际=${actual.partner}`);
  if (actual.nurture !== snap.nurture_revenue_cents) discrepancies.push(`nurture快照=${snap.nurture_revenue_cents} 实际=${actual.nurture}`);

  const isDoubleDraft = snap.status === SETTLEMENT_STATUS.REVIEW_REQUIRED && snap.double_identity === 1;

  return {
    ok: discrepancies.length === 0,
    orderNo,
    snapshotStatus: snap.status,
    doubleIdentity: snap.double_identity === 1,
    discrepancies,
    // 双身份待决策时，partner 期望入账为 0，若实际出现 PARTNER 记录即为异常（第六十四部分：告警不急改）
    doubleIdentityReviewPending: isDoubleDraft,
    doubleIdentityReviewAlert: isDoubleDraft && actual.activeSerialRecords.length > 0,
    actual,
  };
}

// ==================== 双身份待决策管理 ====================

function listReviewRequired(limit = 100) {
  const db = getDb();
  return db.prepare("SELECT * FROM commission_router_snapshots WHERE status = 'REVIEW_REQUIRED' ORDER BY id DESC LIMIT ?").all(limit);
}

/**
 * 项目方就某笔双身份订单做出决策后处理（第八十二部分：启用自动结算前 STOP 列出决策项）。
 * @param {string} orderNo
 * @param {string} decision 'STACK'(补发 Partner=双拿) | 'DISMISS'(维持仅普通)
 * @param {string} operator 决策人
 */
function resolveReviewOrder(orderNo, decision, operator) {
  const db = getDb();
  const snap = db.prepare("SELECT * FROM commission_router_snapshots WHERE order_no = ? AND status = 'REVIEW_REQUIRED'").get(String(orderNo));
  if (!snap) return { ok: false, error: '该订单不在待决策状态' };

  if (decision === 'STACK') {
    // 补发 Partner 侧：需要完整 order 对象；从订单表恢复（尽力）
    const order = restoreOrderForReplay(orderNo);
    if (!order) return { ok: false, error: '无法恢复订单信息，需人工在后台补发' };
    const pr = partnerEngine.grantPartnerCommission(order);
    db.prepare("UPDATE commission_router_snapshots SET status = 'RESOLVED_STACK', note = COALESCE(note,'') || ?, updated_at = ? WHERE id = ?")
      .run(` | 决策 STACK by ${operator || 'admin'}：补发 Partner`, nowIso(), snap.id);
    console.log(`[Router] 双身份决策 STACK order=${orderNo} partner=${pr && pr.granted ? pr.commissionCents + '分' : (pr && pr.reason)}`);
    return { ok: true, decision: 'STACK', partner: pr };
  }
  if (decision === 'DISMISS') {
    db.prepare("UPDATE commission_router_snapshots SET status = 'RESOLVED_DISMISS', note = COALESCE(note,'') || ?, updated_at = ? WHERE id = ?")
      .run(` | 决策 DISMISS by ${operator || 'admin'}：维持仅普通佣金`, nowIso(), snap.id);
    return { ok: true, decision: 'DISMISS' };
  }
  return { ok: false, error: `未知决策 ${decision}，仅支持 STACK / DISMISS` };
}

/** 从 commission_records 反推订单最少字段（amount 由 base_amount_cents 还原），用于 STACK 补发 */
function restoreOrderForReplay(orderNo) {
  try {
    const db = getDb();
    const rec = db.prepare("SELECT payer_user_id, base_amount_cents FROM commission_records WHERE order_no = ? AND record_type = 'COMMISSION' LIMIT 1").get(String(orderNo));
    if (rec) {
      return { orderId: String(orderNo), userId: String(rec.payer_user_id), type: 'MEMBERSHIP', amount: (rec.base_amount_cents / 100), title: '' };
    }
  } catch (e) { /* ignore */ }
  return null;
}

// ==================== 导出 ====================

module.exports = {
  DOUBLE_IDENTITY_POLICIES,
  SETTLEMENT_STATUS,
  DEFAULT_CONFIG,
  getConfig,
  saveConfig,
  getDb,
  ensureSchema,
  resolveIdentities,
  processPaidOrder,
  processRefund,
  reconcileOrder,
  resolveReviewOrder,
  listReviewRequired,
  restoreOrderForReplay,
};