/**
 * 合伙人渠道分销体系 V2 引擎（DEV-V22-PARTNER-V2）
 *
 * 结算规则唯一标准（禁止多口径）：
 *   渠道净收入 = 用户实付总金额 - 支付渠道手续费/商店抽成 - AI调用成本(估算率) - 该订单实际产生的普通两级分销佣金(一级15%+二级5%)
 *   合伙人自身渠道佣金 = 渠道净收入 × 50%
 *   直属培养奖励 = 直属一级下级合伙人的每笔渠道净收入 × 5%（平台留存承担，不扣下级分成）
 *   平台保底：存在直属下级合伙人的渠道，平台最低留存渠道净收入的 45%
 *
 * 归属规则：
 *   - 用户通过合伙人邀请码注册后永久归属该渠道（复用 user_invite_relation / users.invited_by，不新建绑定体系）
 *   - 渠道业绩 = 该合伙人邀请树全量（任意深度；遇到下级合伙人节点即截止下钻，归下级渠道）
 *   - 合伙人推荐关系仅直属一级有效，隔代不绑定
 *   - 订单渠道归属 = 沿 invited_by 向上找到最近的已开通合伙人（非本人）
 *
 * 结算周期（与普通佣金完全同节点）：
 *   - 合伙人佣金入账即 FROZEN（unfreeze_at=NULL，不参与 runUnfreeze 自动解冻）
 *   - 每月1号自动生成上月结算单（基础佣金 + 培养奖励 + 成本扣除明细）
 *   - 结算单审核通过 → 该合伙人当期 FROZEN 记录转可提现
 *   - 提现走既有 withdrawals / 微信商家转账体系（每月16日-月末开放）
 *
 * 数据脱敏红线：合伙人端仅汇总/脱敏数据，禁止导出用户名单与完整联系方式
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'partner_config.json');
const USERS_DB_PATH = process.env.DB_PATH || '/root/backend-auth/data/yandao_users.db';

const DEFAULT_CONFIG = {
  enabled: true,                // 合伙人体系总开关
  commissionPercent: 50,        // 合伙人自身渠道佣金比例（渠道净收入 × 50%）
  nurturePercent: 5,            // 直属培养奖励比例（下级渠道净收入 × 5%，平台承担）
  feePercent: 0.6,              // 支付渠道手续费率（百分比，微信支付）
  storePercent: 0,              // 应用商店抽成率（百分比；APK 内微信支付不经商店=0）
  aiCostPercent: 10,            // AI 调用成本估算率（百分比，按订单实付估算，后台可调）
  platformFloorPercent: 45,     // 平台保底留存（存在直属下级合伙人的渠道）
  settleGenDay: 1,              // 结算单自动生成日（每月1号生成上月）
  levels: ['NORMAL', 'CORE'],   // NORMAL=渠道合伙人 CORE=核心合伙人（白牌贴牌/定制APK深度合作）
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getConfig() {
  try {
    ensureDataDir();
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return { ...DEFAULT_CONFIG, ...saved };
    }
  } catch (e) {
    console.error('[Partner] 配置读取失败:', e.message);
  }
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function saveConfig(cfg) {
  ensureDataDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  return cfg;
}

// ==================== 数据库 ====================

let _db = null;
function getDb() {
  if (_db) return _db;
  const Database = require('better-sqlite3');
  if (!fs.existsSync(USERS_DB_PATH)) throw new Error('用户数据库不存在: ' + USERS_DB_PATH);
  const db = new Database(USERS_DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS partners (
      user_id INTEGER PRIMARY KEY,
      real_name TEXT NOT NULL,
      contact TEXT NOT NULL,
      resources_desc TEXT DEFAULT '',
      expected_scale TEXT DEFAULT '',
      referrer_partner_id INTEGER,
      status TEXT NOT NULL DEFAULT 'PENDING',
      level TEXT NOT NULL DEFAULT 'NORMAL',
      applied_at TEXT,
      reviewed_at TEXT,
      reviewed_by TEXT,
      reject_reason TEXT,
      note TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
    CREATE INDEX IF NOT EXISTS idx_partners_referrer ON partners(referrer_partner_id);

    CREATE TABLE IF NOT EXISTS partner_order_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      partner_id INTEGER NOT NULL,
      payer_user_id INTEGER NOT NULL,
      gross_cents INTEGER NOT NULL DEFAULT 0,
      fee_cost_cents INTEGER NOT NULL DEFAULT 0,
      ai_cost_cents INTEGER NOT NULL DEFAULT 0,
      normal_commission_cents INTEGER NOT NULL DEFAULT 0,
      net_cents INTEGER NOT NULL DEFAULT 0,
      base_commission_cents INTEGER NOT NULL DEFAULT 0,
      nurture_partner_id INTEGER,
      nurture_cents INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_pol_partner ON partner_order_log(partner_id);
    CREATE INDEX IF NOT EXISTS idx_pol_nurture ON partner_order_log(nurture_partner_id);
    CREATE INDEX IF NOT EXISTS idx_pol_period ON partner_order_log(partner_id, created_at);

    CREATE TABLE IF NOT EXISTS partner_settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL,
      period TEXT NOT NULL,
      gross_cents INTEGER NOT NULL DEFAULT 0,
      fee_cost_cents INTEGER NOT NULL DEFAULT 0,
      ai_cost_cents INTEGER NOT NULL DEFAULT 0,
      normal_commission_cents INTEGER NOT NULL DEFAULT 0,
      net_cents INTEGER NOT NULL DEFAULT 0,
      base_commission_cents INTEGER NOT NULL DEFAULT 0,
      nurture_received_cents INTEGER NOT NULL DEFAULT 0,
      nurture_paid_out_cents INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
      created_at TEXT,
      reviewed_at TEXT,
      reviewed_by TEXT,
      adjust_cents INTEGER NOT NULL DEFAULT 0,
      reject_reason TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_settlement_partner_period ON partner_settlements(partner_id, period);
    CREATE INDEX IF NOT EXISTS idx_settlement_status ON partner_settlements(status);
  `);
  _db = db;
  return db;
}

function nowIso() { return new Date().toISOString(); }

function yuanToCents(yuan) {
  const n = Number(yuan);
  if (!isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

// ==================== 合伙人档案 ====================

function getPartner(userId) {
  const uid = parseInt(userId, 10);
  if (!uid || isNaN(uid)) return null;
  return getDb().prepare('SELECT * FROM partners WHERE user_id = ?').get(uid) || null;
}

function isApprovedPartner(userId) {
  const p = getPartner(userId);
  return !!(p && p.status === 'APPROVED');
}

/**
 * 提交合伙人申请
 * @param {object} params { userId, realName, contact, resources, expectedScale, refCode }
 *   refCode：招募海报链接携带的推荐人标识（合伙人 user_id 或邀请码），自主申请无推荐人则空
 */
function applyPartner(params) {
  const cfg = getConfig();
  if (!cfg.enabled) return { ok: false, error: '合伙人体系暂未开放' };
  const db = getDb();
  const uid = parseInt(params.userId, 10);
  if (!uid || isNaN(uid)) return { ok: false, error: '请先登录' };
  if (!params.realName || !String(params.realName).trim()) return { ok: false, error: '请填写姓名' };
  if (!params.contact || !String(params.contact).trim()) return { ok: false, error: '请填写联系方式' };

  const existing = getPartner(uid);
  if (existing && existing.status === 'APPROVED') return { ok: false, error: '您已是渠道合伙人' };
  if (existing && existing.status === 'PENDING') return { ok: false, error: '申请审核中，请勿重复提交' };
  if (existing && existing.status === 'DISABLED') return { ok: false, error: '账号已被禁用，请联系平台' };

  // 推荐绑定：仅直属一级有效；禁止自推自、互推套利
  let referrerId = null;
  const ref = String(params.refCode || '').trim();
  if (ref) {
    let rp = null;
    if (/^\d+$/.test(ref)) rp = getPartner(Number(ref));
    if (!rp) {
      const u = db.prepare('SELECT user_id FROM users WHERE invite_code = ?').get(ref.toUpperCase());
      if (u) rp = getPartner(u.user_id);
    }
    if (!rp || rp.status !== 'APPROVED') return { ok: false, error: '推荐人不存在或未开通合伙人资格' };
    if (rp.user_id === uid) return { ok: false, error: '不能推荐自己' };
    const rpsOwnRef = getPartner(rp.referrer_partner_id);
    if (rpsOwnRef && rpsOwnRef.user_id === uid) return { ok: false, error: '检测到互推行为，禁止绑定' };
    referrerId = rp.user_id;
  }

  db.prepare(`INSERT INTO partners (user_id, real_name, contact, resources_desc, expected_scale, referrer_partner_id, status, level, applied_at)
    VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 'NORMAL', ?)
    ON CONFLICT(user_id) DO UPDATE SET real_name=excluded.real_name, contact=excluded.contact,
      resources_desc=excluded.resources_desc, expected_scale=excluded.expected_scale,
      referrer_partner_id=excluded.referrer_partner_id, status='PENDING', applied_at=excluded.applied_at`)
    .run(uid, String(params.realName).trim().slice(0, 50), String(params.contact).trim().slice(0, 100),
      String(params.resources || '').trim().slice(0, 500), String(params.expectedScale || '').trim().slice(0, 200),
      referrerId, nowIso());
  console.log(`[Partner] 新申请 userId=${uid} referrer=${referrerId || '无'}`);
  return { ok: true };
}

// ==================== 渠道归属 ====================

/**
 * 订单渠道归属：沿 users.invited_by 向上找最近的已开通合伙人（跳过下单人本人）
 * @returns {number|null} 合伙人 user_id
 */
function findChannelPartner(userId) {
  const db = getDb();
  let cur = parseInt(userId, 10);
  if (!cur || isNaN(cur)) return null;
  for (let i = 0; i < 64; i++) {
    let row;
    try {
      row = db.prepare('SELECT invited_by FROM users WHERE user_id = ?').get(cur);
    } catch (e) { return null; }
    if (!row || !row.invited_by) return null;
    const up = parseInt(row.invited_by, 10);
    if (!up || isNaN(up) || up === cur) return null;
    if (isApprovedPartner(up)) return up;
    cur = up;
  }
  return null;
}

/**
 * 渠道用户全集（任意深度；下级合伙人节点本身计入本渠道，但其下钻 subtree 归下级渠道）
 * 返回 Set<number>
 */
function channelUserIds(partnerId) {
  const db = getDb();
  const pid = parseInt(partnerId, 10);
  const rows = db.prepare(`
    WITH RECURSIVE chan(uid, blocked) AS (
      SELECT u.user_id,
        CASE WHEN EXISTS(SELECT 1 FROM partners pt WHERE pt.user_id = u.user_id AND pt.status='APPROVED') THEN 1 ELSE 0 END
      FROM users u WHERE u.invited_by = :pid
      UNION ALL
      SELECT u2.user_id,
        CASE WHEN EXISTS(SELECT 1 FROM partners pt WHERE pt.user_id = c.uid AND pt.status='APPROVED') THEN 1 ELSE 0 END
      FROM users u2 JOIN chan c ON u2.invited_by = c.uid
      WHERE c.blocked = 0
    )
    SELECT uid FROM chan
  `).all({ pid });
  const set = new Set(rows.map(r => r.uid));
  return set;
}

// ==================== 佣金入账 / 冲正 ====================

function ensureAccount(db, uid) {
  db.prepare('INSERT OR IGNORE INTO commission_accounts (user_id, total_earnings_cents, withdrawable_cents, frozen_cents, negative_cents, commission_enabled, withdraw_frozen, updated_at) VALUES (?, 0, 0, 0, 0, 1, 0, ?)')
    .run(uid, nowIso());
}

/** 合伙人收益入账：FROZEN 且 unfreeze_at=NULL（仅经结算单审核转可提现） */
function creditPartnerFrozen(db, uid, cents) {
  ensureAccount(db, uid);
  db.prepare('UPDATE commission_accounts SET frozen_cents = frozen_cents + ?, total_earnings_cents = total_earnings_cents + ?, updated_at = ? WHERE user_id = ?')
    .run(cents, cents, nowIso(), uid);
}

/**
 * 订单支付成功 → 合伙人渠道分佣 + 上级培养奖励（幂等）
 * 在 commissionEngine.grantCommission 之后调用（需读取普通两级佣金实发金额作成本）
 */
function grantPartnerCommission(order) {
  const cfg = getConfig();
  if (!cfg.enabled) return { granted: false, reason: 'PARTNER_SYSTEM_DISABLED' };
  if (!order || !order.orderId || !order.userId) return { granted: false, reason: 'INVALID_ORDER' };
  const db = getDb();
  const orderNo = String(order.orderId);

  const existed = db.prepare("SELECT id FROM commission_records WHERE order_no = ? AND record_type IN ('PARTNER_COMMISSION','PARTNER_NURTURE')").get(orderNo);
  if (existed) return { granted: false, reason: 'DUPLICATE' };

  const partnerId = findChannelPartner(order.userId);
  if (!partnerId) return { granted: false, reason: 'NO_CHANNEL_PARTNER' };
  if (String(partnerId) === String(order.userId)) return { granted: false, reason: 'SELF_PURCHASE' };

  const baseCents = yuanToCents(order.amount);
  if (baseCents <= 0) return { granted: false, reason: 'ZERO_AMOUNT' };

  // 该订单实际产生的普通两级分销佣金（实发口径，作为成本先行扣除）
  const normalRow = db.prepare("SELECT COALESCE(SUM(commission_cents),0) s FROM commission_records WHERE order_no = ? AND record_type IN ('COMMISSION','COMMISSION_L2') AND status != 'REVERSED'").get(orderNo);
  const normalCents = normalRow ? normalRow.s : 0;

  const costRate = (Number(cfg.feePercent) || 0) + (Number(cfg.storePercent) || 0) + (Number(cfg.aiCostPercent) || 0);
  const feeCostCents = Math.floor(baseCents * (Number(cfg.feePercent) + Number(cfg.storePercent)) / 100);
  const aiCostCents = Math.floor(baseCents * Number(cfg.aiCostPercent) / 100);
  const netCents = baseCents - feeCostCents - aiCostCents - normalCents;
  if (netCents <= 0) return { granted: false, reason: 'NET_NOT_POSITIVE' };

  const commissionCents = Math.floor(netCents * Number(cfg.commissionPercent) / 100);

  // 直属培养奖励：上级合伙人（仅直属一级；平台承担，不扣本合伙人）
  const me = getPartner(partnerId);
  let nurtureInviterId = null;
  let nurtureCents = 0;
  if (me && me.referrer_partner_id && isApprovedPartner(me.referrer_partner_id)) {
    const rp = getPartner(me.referrer_partner_id);
    if (rp && String(rp.user_id) !== String(order.userId)) {
      nurtureInviterId = rp.user_id;
      nurtureCents = Math.floor(netCents * Number(cfg.nurturePercent) / 100);
    }
  }

  const now = nowIso();
  const note = `合伙人渠道单 实付${baseCents}分 手续费${feeCostCents}分 AI成本${aiCostCents}分 普通佣金成本${normalCents}分 净收入${netCents}分`;
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO commission_records (order_no, record_type, payer_user_id, inviter_user_id, ratio_percent, base_amount_cents, commission_cents, status, created_at, unfreeze_at, note)
      VALUES (?, 'PARTNER_COMMISSION', ?, ?, ?, ?, ?, 'FROZEN', ?, NULL, ?)`)
      .run(orderNo, parseInt(order.userId, 10) || 0, partnerId, Number(cfg.commissionPercent), netCents, commissionCents, now, (order.title || '') + ' ' + note);
    creditPartnerFrozen(db, partnerId, commissionCents);

    if (nurtureInviterId && nurtureCents > 0) {
      try {
        db.prepare(`INSERT INTO commission_records (order_no, record_type, payer_user_id, inviter_user_id, ratio_percent, base_amount_cents, commission_cents, status, created_at, unfreeze_at, note)
          VALUES (?, 'PARTNER_NURTURE', ?, ?, ?, ?, ?, 'FROZEN', ?, NULL, ?)`)
          .run(orderNo, parseInt(order.userId, 10) || 0, nurtureInviterId, Number(cfg.nurturePercent), netCents, nurtureCents, now,
            `培养奖励 sub=${partnerId} order=${orderNo} ${(order.title || '')}`.slice(0, 200));
        creditPartnerFrozen(db, nurtureInviterId, nurtureCents);
      } catch (e) {
        if (!/UNIQUE/.test(e.message)) throw e;
      }
    }

    // 逐单精确成本留痕（结算单成本明细唯一数据源，禁止按费率反推）
    db.prepare(`INSERT INTO partner_order_log (order_no, partner_id, payer_user_id, gross_cents, fee_cost_cents, ai_cost_cents, normal_commission_cents, net_cents, base_commission_cents, nurture_partner_id, nurture_cents, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`)
      .run(orderNo, partnerId, parseInt(order.userId, 10) || 0, baseCents, feeCostCents, aiCostCents, normalCents, netCents, commissionCents,
        nurtureInviterId || null, nurtureCents, now);
  });
  try {
    tx();
  } catch (e) {
    if (/UNIQUE/.test(e.message)) return { granted: false, reason: 'DUPLICATE' };
    console.error('[Partner] 分佣失败:', e.message);
    return { granted: false, reason: 'ERROR:' + e.message };
  }
  console.log(`[Partner] 渠道分佣入账 order=${orderNo} partner=${partnerId} net=${netCents}分 佣金=${commissionCents}分${nurtureInviterId ? ` 培养奖励=${nurtureCents}分→${nurtureInviterId}` : ''}`);
  return { granted: true, partnerId, netCents, commissionCents, nurtureInviterId, nurtureCents };
}

/**
 * 订单退款 → 冲正合伙人佣金与培养奖励（按退款比例，幂等）
 */
function reversePartnerCommission(orderNo, refundYuan) {
  const db = getDb();
  const recs = db.prepare("SELECT * FROM commission_records WHERE order_no = ? AND record_type IN ('PARTNER_COMMISSION','PARTNER_NURTURE')").all(String(orderNo));
  if (!recs.length) return { reversed: false, reason: 'NO_RECORD' };
  let any = false;
  for (const rec of recs) {
    if (rec.status === 'REVERSED') continue;
    const refundCents = refundYuan != null ? yuanToCents(refundYuan) : rec.base_amount_cents;
    const proportion = Math.min(1, refundCents / Math.max(1, rec.base_amount_cents));
    const reverseCents = Math.round(rec.commission_cents * proportion);
    if (reverseCents <= 0) continue;
    const tx = db.transaction(() => {
      db.prepare("UPDATE commission_records SET status = 'REVERSED', note = COALESCE(note,'') || ? WHERE id = ?")
        .run(` | 合伙人冲正${reverseCents}分(${Math.round(proportion * 100)}%)`, rec.id);
      ensureAccount(db, rec.inviter_user_id);
      const acct = db.prepare('SELECT frozen_cents, withdrawable_cents FROM commission_accounts WHERE user_id = ?').get(rec.inviter_user_id);
      let fromFrozen = 0, fromWithdrawable = 0, toNegative = 0;
      if (rec.status === 'FROZEN') fromFrozen = Math.min(acct.frozen_cents, reverseCents);
      else fromWithdrawable = Math.min(acct.withdrawable_cents, reverseCents);
      const remaining = reverseCents - fromFrozen - fromWithdrawable;
      if (remaining > 0) toNegative = remaining;
      db.prepare('UPDATE commission_accounts SET frozen_cents = frozen_cents - ?, withdrawable_cents = withdrawable_cents - ?, negative_cents = negative_cents + ?, total_earnings_cents = total_earnings_cents - ?, updated_at = ? WHERE user_id = ?')
        .run(fromFrozen, fromWithdrawable, toNegative, reverseCents, nowIso(), rec.inviter_user_id);
    });
    tx();
    any = true;
    console.log(`[Partner] 冲正 order=${orderNo} type=${rec.record_type} reverse=${reverseCents}分`);
  }
  // 成本留痕同步：全额退款→REVERSED；部分退款→按剩余比例缩放各项金额保持精确
  try {
    const log = db.prepare("SELECT * FROM partner_order_log WHERE order_no = ?").get(String(orderNo));
    if (log && log.status === 'ACTIVE') {
      // 不传退款金额=全额退款（proportion=1 → 整单 REVERSED）；
      // 传入金额=按退款金额/订单实付毛额比例缩放留痕（部分退款）
      const proportion = refundYuan != null
        ? Math.min(1, yuanToCents(refundYuan) / Math.max(1, log.gross_cents))
        : 1;
      if (proportion >= 1) {
        db.prepare("UPDATE partner_order_log SET status = 'REVERSED' WHERE id = ?").run(log.id);
      } else if (proportion > 0) {
        const keep = 1 - proportion;
        const scale = (v) => Math.round(v * keep);
        db.prepare(`UPDATE partner_order_log SET gross_cents=?, fee_cost_cents=?, ai_cost_cents=?, normal_commission_cents=?, net_cents=?, base_commission_cents=?, nurture_cents=? WHERE id = ?`)
          .run(scale(log.gross_cents), scale(log.fee_cost_cents), scale(log.ai_cost_cents), scale(log.normal_commission_cents), scale(log.net_cents), scale(log.base_commission_cents), scale(log.nurture_cents), log.id);
      }
    }
  } catch (e) {
    console.error('[Partner] 成本留痕冲正失败:', e.message);
  }
  return { reversed: any };
}

/**
 * 风控：标记无效订单（异常刷量/虚假注册），扣回该订单全部佣金（普通+合伙人），审计留痕
 */
function markOrderInvalid(orderNo, reason, admin) {
  const db = getDb();
  const recs = db.prepare("SELECT * FROM commission_records WHERE order_no = ? AND status NOT IN ('REVERSED','INVALID')").all(String(orderNo));
  if (!recs.length) return { ok: false, error: '该订单无可扣回佣金记录' };
  const tx = db.transaction(() => {
    for (const rec of recs) {
      db.prepare("UPDATE commission_records SET status = 'INVALID', note = COALESCE(note,'') || ? WHERE id = ?")
        .run(` | 风控标记无效(${String(reason).slice(0, 80)})`, rec.id);
      ensureAccount(db, rec.inviter_user_id);
      const acct = db.prepare('SELECT frozen_cents, withdrawable_cents FROM commission_accounts WHERE user_id = ?').get(rec.inviter_user_id);
      let fromFrozen = Math.min(acct.frozen_cents, rec.commission_cents);
      let fromWithdrawable = Math.min(acct.withdrawable_cents, rec.commission_cents - fromFrozen);
      const toNegative = rec.commission_cents - fromFrozen - fromWithdrawable;
      db.prepare('UPDATE commission_accounts SET frozen_cents = frozen_cents - ?, withdrawable_cents = withdrawable_cents - ?, negative_cents = negative_cents + ?, total_earnings_cents = total_earnings_cents - ?, updated_at = ? WHERE user_id = ?')
        .run(fromFrozen, fromWithdrawable, toNegative, rec.commission_cents, nowIso(), rec.inviter_user_id);
    }
  });
  tx();
  try { db.prepare("UPDATE partner_order_log SET status = 'INVALID' WHERE order_no = ?").run(String(orderNo)); } catch (e) {}
  console.log(`[Partner] 风控标记无效订单 order=${orderNo} by=${admin || 'admin'} 扣回${recs.length}条`);
  return { ok: true, reversed: recs.length };
}

// ==================== 月度结算单 ====================

function periodOf(dateIso) { return String(dateIso || '').slice(0, 7); }

function prevPeriod() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 生成某月结算单（幂等：合伙人+周期唯一；全部金额取自 partner_order_log 逐单精确留痕）
 * @param {string} period 'YYYY-MM'
 * @param {string} operator
 */
function generateMonthlySettlements(period, operator) {
  const db = getDb();
  const p = /^\d{4}-\d{2}$/.test(period || '') ? period : prevPeriod();
  const partners = db.prepare("SELECT user_id FROM partners WHERE status = 'APPROVED'").all();
  let created = 0;
  for (const { user_id: pid } of partners) {
    const exists = db.prepare('SELECT id FROM partner_settlements WHERE partner_id = ? AND period = ?').get(pid, p);
    if (exists) continue;
    // 渠道基础佣金侧：逐单精确成本（status=ACTIVE）
    const agg = db.prepare(`SELECT COALESCE(SUM(gross_cents),0) gross, COALESCE(SUM(fee_cost_cents),0) fee,
        COALESCE(SUM(ai_cost_cents),0) ai, COALESCE(SUM(normal_commission_cents),0) normal,
        COALESCE(SUM(net_cents),0) net, COALESCE(SUM(base_commission_cents),0) base,
        COALESCE(SUM(nurture_cents),0) nurture_out
      FROM partner_order_log WHERE partner_id = ? AND created_at LIKE ? AND status = 'ACTIVE'`).get(pid, p + '%');
    // 培养奖励收入侧：作为上级获得的 PARTNER_NURTURE（经结算单审核转可提现）
    const nurtureRecv = db.prepare("SELECT COALESCE(SUM(commission_cents),0) s FROM commission_records WHERE inviter_user_id = ? AND record_type = 'PARTNER_NURTURE' AND created_at LIKE ? AND status != 'REVERSED'").get(pid, p + '%').s;

    if (agg.base === 0 && nurtureRecv === 0) {
      db.prepare(`INSERT OR IGNORE INTO partner_settlements (partner_id, period, status, created_at) VALUES (?, ?, 'EMPTY', ?)`)
        .run(pid, p, nowIso());
      continue;
    }
    db.prepare(`INSERT OR IGNORE INTO partner_settlements (partner_id, period, gross_cents, fee_cost_cents, ai_cost_cents, normal_commission_cents, net_cents, base_commission_cents, nurture_received_cents, nurture_paid_out_cents, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_REVIEW', ?)`)
      .run(pid, p, agg.gross, agg.fee, agg.ai, agg.normal, agg.net, agg.base, nurtureRecv, agg.nurture_out, nowIso());
    created++;
  }
  console.log(`[Partner] 结算单生成 period=${p} 新建=${created} by=${operator || 'auto'}`);
  return { period: p, created, total: partners.length };
}

/**
 * 审核通过结算单：当期 FROZEN 的合伙人记录转可提现
 */
function approveSettlement(settlementId, admin) {
  const db = getDb();
  const s = db.prepare('SELECT * FROM partner_settlements WHERE id = ?').get(parseInt(settlementId, 10));
  if (!s) return { ok: false, error: '结算单不存在' };
  if (s.status !== 'PENDING_REVIEW') return { ok: false, error: `当前状态${s.status}不可审核` };
  const tx = db.transaction(() => {
    const recs = db.prepare("SELECT id, inviter_user_id, commission_cents FROM commission_records WHERE inviter_user_id = ? AND record_type IN ('PARTNER_COMMISSION','PARTNER_NURTURE') AND status = 'FROZEN' AND created_at LIKE ?")
      .all(s.partner_id, s.period + '%');
    let moved = 0;
    for (const r of recs) {
      db.prepare("UPDATE commission_records SET status = 'UNFROZEN', unfrozen_at = ? WHERE id = ?").run(nowIso(), r.id);
      ensureAccount(db, r.inviter_user_id);
      db.prepare('UPDATE commission_accounts SET frozen_cents = frozen_cents - ?, withdrawable_cents = withdrawable_cents + ?, updated_at = ? WHERE user_id = ?')
        .run(r.commission_cents, r.commission_cents, nowIso(), r.inviter_user_id);
      moved += r.commission_cents;
    }
    if (s.adjust_cents) {
      ensureAccount(db, s.partner_id);
      const delta = s.adjust_cents;
      db.prepare('UPDATE commission_accounts SET withdrawable_cents = withdrawable_cents + ?, total_earnings_cents = total_earnings_cents + ?, updated_at = ? WHERE user_id = ?')
        .run(delta, delta, nowIso(), s.partner_id);
    }
    db.prepare("UPDATE partner_settlements SET status = 'APPROVED', reviewed_at = ?, reviewed_by = ? WHERE id = ?")
      .run(nowIso(), admin || '', s.id);
    return moved;
  });
  const movedCents = tx();
  console.log(`[Partner] 结算单审核通过 id=${s.id} partner=${s.partner_id} period=${s.period} 转可提现=${movedCents}分`);
  return { ok: true, movedCents };
}

function rejectSettlement(settlementId, reason, admin) {
  const db = getDb();
  const s = db.prepare('SELECT * FROM partner_settlements WHERE id = ?').get(parseInt(settlementId, 10));
  if (!s) return { ok: false, error: '结算单不存在' };
  if (s.status !== 'PENDING_REVIEW') return { ok: false, error: '仅待审核状态可驳回' };
  if (!reason || String(reason).trim().length < 2) return { ok: false, error: '必须填写驳回原因' };
  db.prepare("UPDATE partner_settlements SET status = 'REJECTED', reject_reason = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?")
    .run(String(reason).slice(0, 200), nowIso(), admin || '', s.id);
  return { ok: true };
}

function adjustSettlement(settlementId, deltaYuan, reason, admin) {
  const db = getDb();
  const s = db.prepare('SELECT * FROM partner_settlements WHERE id = ?').get(parseInt(settlementId, 10));
  if (!s) return { ok: false, error: '结算单不存在' };
  if (s.status !== 'PENDING_REVIEW') return { ok: false, error: '仅待审核状态可调整' };
  if (!reason || String(reason).trim().length < 2) return { ok: false, error: '必须填写调整原因' };
  const deltaCents = yuanToCents(Math.abs(Number(deltaYuan) || 0)) * (Number(deltaYuan) < 0 ? -1 : 1);
  db.prepare('UPDATE partner_settlements SET adjust_cents = adjust_cents + ?, note = COALESCE(note,\'\') || ? WHERE id = ?')
    .run(deltaCents, ` | 调整${deltaCents}分(${String(reason).slice(0, 80)})`, s.id);
  return { ok: true, deltaCents };
}

/**
 * 每日自动任务：每月 settleGenDay 号自动生成上月结算单（幂等）
 */
function runSettlementScheduler() {
  try {
    const cfg = getConfig();
    if (!cfg.enabled) return;
    const day = new Date().getDate();
    if (day !== Number(cfg.settleGenDay)) return;
    const p = prevPeriod();
    const db = getDb();
    const any = db.prepare('SELECT id FROM partner_settlements WHERE period = ? LIMIT 1').get(p);
    if (any) return;
    generateMonthlySettlements(p, 'auto-scheduler');
  } catch (e) {
    console.error('[Partner] 结算调度异常:', e.message);
  }
}

// ==================== 数据看板（合伙人端·脱敏） ====================

function maskUserId(uid) {
  const s = String(uid || '');
  if (s.length <= 4) return s.replace(/.(?=.{1})/g, '*');
  return s.slice(0, 2) + '****' + s.slice(-2);
}

function maskPhone(phone) {
  const s = String(phone || '');
  if (s.length < 7) return s ? '***' : '';
  return s.slice(0, 3) + '****' + s.slice(-4);
}

/**
 * 合伙人数据概览
 */
function partnerOverview(partnerId) {
  const db = getDb();
  const pid = parseInt(partnerId, 10);
  const cfg = getConfig();
  const chan = channelUserIds(pid);
  const chanArr = Array.from(chan);

  let registered = 0, paidUsers = 0, grossCents = 0;
  if (chanArr.length) {
    const placeholders = chanArr.map(() => '?').join(',');
    registered = chanArr.length;
    // 付费人数与实付总额（订单表 PAID 口径）
    const ord = db.prepare(`SELECT COUNT(DISTINCT user_id) u, COALESCE(SUM(amount),0) a FROM user_orders WHERE user_id IN (${placeholders}) AND status IN ('PAID','paid')`).get(...chanArr);
    paidUsers = ord.u || 0;
    grossCents = yuanToCents(ord.a || 0);
  }

  const baseCommission = db.prepare("SELECT COALESCE(SUM(commission_cents),0) s FROM commission_records WHERE inviter_user_id = ? AND record_type = 'PARTNER_COMMISSION' AND status != 'REVERSED'").get(pid).s;
  const nurtureTotal = db.prepare("SELECT COALESCE(SUM(commission_cents),0) s FROM commission_records WHERE inviter_user_id = ? AND record_type = 'PARTNER_NURTURE' AND status != 'REVERSED'").get(pid).s;
  const settled = db.prepare("SELECT COALESCE(SUM(base_commission_cents + nurture_received_cents + adjust_cents),0) s FROM partner_settlements WHERE partner_id = ? AND status = 'APPROVED'").get(pid).s;

  ensureAccount(db, pid);
  const acct = db.prepare('SELECT withdrawable_cents, frozen_cents FROM commission_accounts WHERE user_id = ?').get(pid);
  const partner = getPartner(pid);
  const subCount = db.prepare("SELECT COUNT(*) c FROM partners WHERE referrer_partner_id = ? AND status = 'APPROVED'").get(pid).c;

  return {
    partnerLevel: partner ? partner.level : 'NORMAL',
    channelRegistered: registered,
    channelPaidUsers: paidUsers,
    channelGrossYuan: (grossCents / 100).toFixed(2),
    baseCommissionYuan: (baseCommission / 100).toFixed(2),
    nurtureTotalYuan: (nurtureTotal / 100).toFixed(2),
    settledTotalYuan: (settled / 100).toFixed(2),
    pendingSettleYuan: ((acct.frozen_cents || 0) / 100).toFixed(2),
    withdrawableYuan: ((acct.withdrawable_cents || 0) / 100).toFixed(2),
    subPartnerCount: subCount,
    ratios: {
      commissionPercent: Number(cfg.commissionPercent),
      nurturePercent: Number(cfg.nurturePercent),
      platformFloorPercent: Number(cfg.platformFloorPercent),
    },
  };
}

/**
 * 趋势：近N日注册/付费/佣金
 */
function partnerTrends(partnerId, days) {
  const db = getDb();
  const pid = parseInt(partnerId, 10);
  const n = Math.min(90, Math.max(7, parseInt(days, 10) || 7));
  const chan = channelUserIds(pid);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({ date: ds, registered: 0, paid: 0, commissionCents: 0 });
  }
  const idx = Object.fromEntries(out.map((o, i) => [o.date, i]));
  if (chan.size) {
    const chanArr = Array.from(chan);
    const placeholders = chanArr.map(() => '?').join(',');
    const regs = db.prepare(`SELECT date(created_at) d, COUNT(*) c FROM users WHERE user_id IN (${placeholders}) AND date(created_at) >= date('now','-${n} day') GROUP BY d`).all(...chanArr);
    for (const r of regs) if (idx[r.d] != null) out[idx[r.d]].registered = r.c;
    const pays = db.prepare(`SELECT date(paid_at) d, COUNT(DISTINCT user_id) c FROM user_orders WHERE user_id IN (${placeholders}) AND status IN ('PAID','paid') AND paid_at IS NOT NULL AND date(paid_at) >= date('now','-${n} day') GROUP BY d`).all(...chanArr);
    for (const r of pays) if (idx[r.d] != null) out[idx[r.d]].paid = r.c;
  }
  const comms = db.prepare(`SELECT date(created_at) d, COALESCE(SUM(commission_cents),0) c FROM commission_records WHERE inviter_user_id = ? AND record_type IN ('PARTNER_COMMISSION','PARTNER_NURTURE') AND created_at >= datetime('now','-${n} day') GROUP BY d`).all(pid);
  for (const r of comms) if (idx[r.d] != null) out[idx[r.d]].commissionCents = r.c;
  return out;
}

/**
 * 我的用户（强制脱敏，禁止导出）
 */
function partnerUsers(partnerId, opts) {
  const db = getDb();
  const pid = parseInt(partnerId, 10);
  const page = Math.max(1, parseInt(opts.page, 10) || 1);
  const size = Math.min(100, parseInt(opts.size, 10) || 20);
  const sort = opts.sort === 'consume' ? 'consume' : 'registered';
  const paidFilter = opts.paid; // '1' 仅付费 '0' 仅未付费 undefined 全部

  const chan = channelUserIds(pid);
  if (!chan.size) return { total: 0, page, size, users: [] };
  const chanArr = Array.from(chan);
  const placeholders = chanArr.map(() => '?').join(',');
  const params = [...chanArr];

  let where = `u.user_id IN (${placeholders})`;
  let join = `LEFT JOIN (SELECT user_id, COALESCE(SUM(amount),0) consume, COUNT(*) cnt FROM user_orders WHERE status IN ('PAID','paid') GROUP BY user_id) o ON o.user_id = u.user_id`;
  if (paidFilter === '1') where += ' AND o.consume > 0';
  if (paidFilter === '0') where += ' AND (o.consume IS NULL OR o.consume = 0)';

  const total = db.prepare(`SELECT COUNT(*) c FROM users u ${join} WHERE ${where}`).get(...params).c;
  const orderBy = sort === 'consume' ? 'COALESCE(o.consume,0) DESC, u.created_at DESC' : 'u.created_at DESC';
  const rows = db.prepare(`SELECT u.user_id, u.phone, u.created_at, COALESCE(o.consume,0) consume FROM users u ${join} WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, size, (page - 1) * size);

  return {
    total, page, size,
    users: rows.map(r => ({
      userIdMasked: maskUserId(r.user_id),
      phoneMasked: maskPhone(r.phone),
      registeredAt: r.created_at,
      isPaid: Number(r.consume) > 0,
      consumeYuan: (Number(r.consume) || 0).toFixed(2),
    })),
  };
}

/**
 * 我的合伙人（直属一级）：汇总数据 + 我获得的培养奖励
 */
function partnerSubPartners(partnerId) {
  const db = getDb();
  const pid = parseInt(partnerId, 10);
  const subs = db.prepare(`
    SELECT p.user_id, u.nickname, p.level, p.applied_at, p.reviewed_at
    FROM partners p LEFT JOIN users u ON u.user_id = p.user_id
    WHERE p.referrer_partner_id = ? AND p.status = 'APPROVED'
    ORDER BY p.reviewed_at DESC`).all(pid);
  return subs.map(s => {
    const flow = db.prepare("SELECT COALESCE(SUM(gross_cents),0) s FROM partner_order_log WHERE partner_id = ? AND status = 'ACTIVE'").get(s.user_id).s;
    const nurture = db.prepare("SELECT COALESCE(SUM(nurture_cents),0) s FROM partner_order_log WHERE nurture_partner_id = ? AND partner_id = ? AND status = 'ACTIVE'").get(pid, s.user_id).s;
    const chan = channelUserIds(s.user_id);
    return {
      partnerUserId: String(s.user_id),
      nickname: s.nickname || `合伙人${maskUserId(s.user_id)}`,
      level: s.level,
      joinedAt: s.reviewed_at || s.applied_at,
      channelUserCount: chan.size,
      channelFlowYuan: (flow / 100).toFixed(2),
      nurtureFromYuan: (nurture / 100).toFixed(2),
    };
  });
}

/**
 * 单个直属合伙人的月度业绩与奖励明细（不含其下级用户隐私）
 */
function partnerSubMonthly(partnerId, subPartnerId) {
  const db = getDb();
  const pid = parseInt(partnerId, 10);
  const sub = parseInt(subPartnerId, 10);
  const rel = db.prepare('SELECT * FROM partners WHERE user_id = ? AND referrer_partner_id = ? AND status = ?').get(sub, pid, 'APPROVED');
  if (!rel) return null;
  const monthly = db.prepare(`SELECT strftime('%Y-%m', created_at) m,
      COALESCE(SUM(gross_cents),0) flow_c,
      COALESCE(SUM(nurture_cents),0) my_nurture_c
    FROM partner_order_log WHERE nurture_partner_id = ? AND partner_id = ? AND status = 'ACTIVE'
    GROUP BY m ORDER BY m DESC LIMIT 12`).all(pid, sub);
  const flowTotal = db.prepare("SELECT COALESCE(SUM(gross_cents),0) s FROM partner_order_log WHERE partner_id = ? AND status = 'ACTIVE'").get(sub).s;
  return {
    partnerUserId: String(sub),
    channelFlowYuan: (flowTotal / 100).toFixed(2),
    monthly: monthly.map(m => ({ period: m.m, flowYuan: (m.flow_c / 100).toFixed(2), nurtureYuan: (m.my_nurture_c / 100).toFixed(2) })),
  };
}

/**
 * 佣金明细：type=base|nurture|withdrawal
 */
function partnerRecords(partnerId, type, limit) {
  const db = getDb();
  const pid = parseInt(partnerId, 10);
  const lim = Math.min(200, parseInt(limit, 10) || 50);
  if (type === 'withdrawal') {
    const rows = db.prepare('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY id DESC LIMIT ?').all(pid, lim);
    return rows.map(w => ({
      withdrawNo: w.withdraw_no, amountYuan: (w.amount_cents / 100).toFixed(2), status: w.status,
      failReason: w.fail_reason || '', createdAt: w.created_at, paidAt: w.paid_at, transferNo: w.wechat_transfer_no || '',
    }));
  }
  const recordType = type === 'nurture' ? 'PARTNER_NURTURE' : 'PARTNER_COMMISSION';
  const rows = db.prepare(`SELECT r.order_no, r.payer_user_id, r.ratio_percent, r.base_amount_cents, r.commission_cents, r.status, r.created_at, r.note, u.nickname payer_name
    FROM commission_records r LEFT JOIN users u ON u.user_id = r.payer_user_id
    WHERE r.inviter_user_id = ? AND r.record_type = ? ORDER BY r.id DESC LIMIT ?`).all(pid, recordType, lim);
  return rows.map(r => ({
    orderNo: r.order_no,
    payerMasked: maskUserId(r.payer_user_id),
    payerName: r.payer_name || '',
    ratioPercent: r.ratio_percent,
    netYuan: (r.base_amount_cents / 100).toFixed(2),
    amountYuan: (r.commission_cents / 100).toFixed(2),
    status: r.status,
    createdAt: r.created_at,
    note: r.note || '',
  }));
}

// ==================== 管理端（全量数据） ====================

function adminPartnerList(opts) {
  const db = getDb();
  const page = Math.max(1, parseInt(opts.page, 10) || 1);
  const size = Math.min(200, parseInt(opts.size, 10) || 20);
  let where = '1=1'; const params = [];
  if (opts.status) { where += ' AND p.status = ?'; params.push(opts.status); }
  if (opts.q) {
    where += ' AND (p.real_name LIKE ? OR p.contact LIKE ? OR u.nickname LIKE ? OR CAST(p.user_id AS TEXT) LIKE ?)';
    const like = `%${opts.q}%`;
    params.push(like, like, like, like);
  }
  const total = db.prepare(`SELECT COUNT(*) c FROM partners p LEFT JOIN users u ON u.user_id = p.user_id WHERE ${where}`).get(...params).c;
  const rows = db.prepare(`SELECT p.*, u.nickname, ru.user_id ref_uid, ru2.nickname ref_name
    FROM partners p
    LEFT JOIN users u ON u.user_id = p.user_id
    LEFT JOIN partners rp ON rp.user_id = p.referrer_partner_id
    LEFT JOIN users ru ON ru.user_id = p.referrer_partner_id
    LEFT JOIN users ru2 ON ru2.user_id = rp.user_id
    WHERE ${where} ORDER BY p.applied_at DESC LIMIT ? OFFSET ?`).all(...params, size, (page - 1) * size);
  const list = rows.map(p => {
    const chan = channelUserIds(p.user_id);
    const gross = db.prepare("SELECT COALESCE(SUM(gross_cents),0) s FROM partner_order_log WHERE partner_id = ? AND status = 'ACTIVE'").get(p.user_id).s;
    const commission = db.prepare("SELECT COALESCE(SUM(commission_cents),0) s FROM commission_records WHERE inviter_user_id = ? AND record_type IN ('PARTNER_COMMISSION','PARTNER_NURTURE') AND status != 'REVERSED'").get(p.user_id).s;
    const u = db.prepare('SELECT phone, email, created_at FROM users WHERE user_id = ?').get(p.user_id);
    return {
      userId: String(p.user_id), nickname: p.nickname || '', realName: p.real_name, contact: p.contact,
      phone: u ? u.phone : '', email: u ? u.email : '',
      level: p.level, status: p.status,
      referrerUserId: p.referrer_partner_id ? String(p.referrer_partner_id) : '',
      referrerName: p.ref_name || '',
      appliedAt: p.applied_at, reviewedAt: p.reviewed_at, rejectReason: p.reject_reason || '',
      channelUserCount: chan.size,
      channelGrossYuan: (gross / 100).toFixed(2),
      commissionTotalYuan: (commission / 100).toFixed(2),
    };
  });
  return { total, page, size, partners: list };
}

function adminSetPartnerStatus(userId, action, admin, extra) {
  const db = getDb();
  const uid = parseInt(userId, 10);
  const p = getPartner(uid);
  if (!p) return { ok: false, error: '合伙人记录不存在' };
  if (action === 'approve') {
    if (p.status === 'APPROVED') return { ok: false, error: '已是开通状态' };
    if (p.referrer_partner_id === uid) return { ok: false, error: '推荐关系异常' };
    db.prepare("UPDATE partners SET status = 'APPROVED', reviewed_at = ?, reviewed_by = ?, reject_reason = NULL, level = ? WHERE user_id = ?")
      .run(nowIso(), admin, extra && extra.level ? String(extra.level).slice(0, 20) : p.level, uid);
  } else if (action === 'reject') {
    if (!extra || !extra.reason || String(extra.reason).trim().length < 2) return { ok: false, error: '必须填写驳回原因' };
    db.prepare("UPDATE partners SET status = 'REJECTED', reviewed_at = ?, reviewed_by = ?, reject_reason = ? WHERE user_id = ?")
      .run(nowIso(), admin, String(extra.reason).slice(0, 200), uid);
  } else if (action === 'disable') {
    db.prepare("UPDATE partners SET status = 'DISABLED', reviewed_at = ?, reviewed_by = ? WHERE user_id = ?").run(nowIso(), admin, uid);
  } else if (action === 'enable') {
    if (p.status !== 'DISABLED') return { ok: false, error: '仅禁用状态可重新开通' };
    db.prepare("UPDATE partners SET status = 'APPROVED', reviewed_at = ?, reviewed_by = ? WHERE user_id = ?").run(nowIso(), admin, uid);
  } else if (action === 'level') {
    if (!extra || !extra.level) return { ok: false, error: '缺少等级参数' };
    db.prepare('UPDATE partners SET level = ? WHERE user_id = ?').run(String(extra.level).slice(0, 20), uid);
  } else {
    return { ok: false, error: '未知操作' };
  }
  return { ok: true };
}

function adminSetReferrer(userId, referrerUserId, admin, reason) {
  const db = getDb();
  const uid = parseInt(userId, 10);
  const p = getPartner(uid);
  if (!p || p.status !== 'APPROVED') return { ok: false, error: '仅已开通合伙人可调整推荐关系' };
  if (!reason || String(reason).trim().length < 2) return { ok: false, error: '必须填写调整原因' };
  if (referrerUserId == null || referrerUserId === '') {
    db.prepare('UPDATE partners SET referrer_partner_id = NULL WHERE user_id = ?').run(uid);
    return { ok: true };
  }
  const ref = parseInt(referrerUserId, 10);
  if (ref === uid) return { ok: false, error: '不能将自己设为上级' };
  const rp = getPartner(ref);
  if (!rp || rp.status !== 'APPROVED') return { ok: false, error: '上级必须是已开通合伙人' };
  // 环检测：沿上级链上溯不得回到自己
  let cur = rp;
  for (let i = 0; i < 64 && cur && cur.referrer_partner_id; i++) {
    if (cur.referrer_partner_id === uid) return { ok: false, error: '检测到循环推荐关系' };
    cur = getPartner(cur.referrer_partner_id);
  }
  db.prepare('UPDATE partners SET referrer_partner_id = ? WHERE user_id = ?').run(ref, uid);
  return { ok: true };
}

/** 渠道总览：按合伙人维度对比传播效果 */
function adminChannelOverview() {
  const db = getDb();
  const partners = db.prepare("SELECT p.user_id, u.nickname FROM partners p LEFT JOIN users u ON u.user_id = p.user_id WHERE p.status = 'APPROVED'").all();
  let totalGross = 0;
  const list = partners.map(p => {
    const chan = channelUserIds(p.user_id);
    const chanArr = Array.from(chan);
    let registered = chanArr.length, paid = 0, gross = 0;
    if (chanArr.length) {
      const placeholders = chanArr.map(() => '?').join(',');
      const o = db.prepare(`SELECT COUNT(DISTINCT user_id) u, COALESCE(SUM(amount),0) a FROM user_orders WHERE user_id IN (${placeholders}) AND status IN ('PAID','paid')`).get(...chanArr);
      paid = o.u || 0;
      gross = yuanToCents(o.a || 0);
    }
    totalGross += gross;
    return {
      partnerUserId: String(p.user_id), nickname: p.nickname || `合伙人${p.user_id}`,
      registered, paid, grossYuan: (gross / 100).toFixed(2),
    };
  });
  for (const it of list) it.grossShare = totalGross > 0 ? (Number(it.grossYuan) / (totalGross / 100) * 100).toFixed(1) + '%' : '0.0%';
  list.sort((a, b) => Number(b.grossYuan) - Number(a.grossYuan));
  return { partners: list, totalGrossYuan: (totalGross / 100).toFixed(2) };
}

/** 用户层级树：任意用户完整上下级链路 */
function adminUserTree(userId) {
  const db = getDb();
  const uid = parseInt(userId, 10);
  const user = db.prepare('SELECT user_id, nickname, phone, invited_by, created_at FROM users WHERE user_id = ?').get(uid);
  if (!user) return null;
  const upline = [];
  let cur = user.invited_by ? parseInt(user.invited_by, 10) : null;
  for (let i = 0; i < 64 && cur; i++) {
    const u = db.prepare('SELECT user_id, nickname, invited_by FROM users WHERE user_id = ?').get(cur);
    if (!u) break;
    const partner = getPartner(u.user_id);
    upline.push({ userId: String(u.user_id), nickname: u.nickname || '', isPartner: !!(partner && partner.status === 'APPROVED'), partnerLevel: partner ? partner.level : null });
    cur = u.invited_by ? parseInt(u.invited_by, 10) : null;
  }
  const buildDown = (id, depth) => {
    if (depth > 5) return [];
    const children = db.prepare('SELECT user_id, nickname, invited_by FROM users WHERE invited_by = ? LIMIT 200').all(id);
    return children.map(c => {
      const partner = getPartner(c.user_id);
      return {
        userId: String(c.user_id), nickname: c.nickname || '',
        isPartner: !!(partner && partner.status === 'APPROVED'),
        children: (partner && partner.status === 'APPROVED') ? [] : buildDown(c.user_id, depth + 1),
      };
    });
  };
  return {
    user: { userId: String(user.user_id), nickname: user.nickname || '', phone: user.phone || '', createdAt: user.created_at },
    upline: upline.reverse(),
    downline: buildDown(uid, 0),
  };
}

/** 合伙人关系树 */
function adminPartnerTree() {
  const db = getDb();
  const all = db.prepare("SELECT p.user_id, p.referrer_partner_id, p.level, u.nickname FROM partners p LEFT JOIN users u ON u.user_id = p.user_id WHERE p.status = 'APPROVED'").all();
  const byId = new Map(all.map(p => [p.user_id, { userId: String(p.user_id), nickname: p.nickname || `合伙人${p.user_id}`, level: p.level, children: [] }]));
  const roots = [];
  for (const p of all) {
    const node = byId.get(p.user_id);
    if (p.referrer_partner_id && byId.has(p.referrer_partner_id)) byId.get(p.referrer_partner_id).children.push(node);
    else roots.push(node);
  }
  return { roots };
}

function adminSettlements(opts) {
  const db = getDb();
  const page = Math.max(1, parseInt(opts.page, 10) || 1);
  const size = Math.min(200, parseInt(opts.size, 10) || 20);
  let where = '1=1'; const params = [];
  if (opts.period) { where += ' AND s.period = ?'; params.push(opts.period); }
  if (opts.status) { where += ' AND s.status = ?'; params.push(opts.status); }
  const total = db.prepare(`SELECT COUNT(*) c FROM partner_settlements s WHERE ${where}`).get(...params).c;
  const rows = db.prepare(`SELECT s.*, u.nickname FROM partner_settlements s LEFT JOIN users u ON u.user_id = s.partner_id
    WHERE ${where} ORDER BY s.period DESC, s.id DESC LIMIT ? OFFSET ?`).all(...params, size, (page - 1) * size);
  return {
    total, page, size,
    settlements: rows.map(s => ({
      id: s.id, partnerId: String(s.partner_id), nickname: s.nickname || '', period: s.period,
      grossYuan: (s.gross_cents / 100).toFixed(2), feeCostYuan: (s.fee_cost_cents / 100).toFixed(2),
      aiCostYuan: (s.ai_cost_cents / 100).toFixed(2), netYuan: (s.net_cents / 100).toFixed(2),
      baseCommissionYuan: (s.base_commission_cents / 100).toFixed(2),
      nurtureReceivedYuan: (s.nurture_received_cents / 100).toFixed(2),
      adjustYuan: (s.adjust_cents / 100).toFixed(2),
      status: s.status, createdAt: s.created_at, reviewedAt: s.reviewed_at, reviewedBy: s.reviewed_by,
      rejectReason: s.reject_reason || '',
    })),
  };
}

/** 查看某合伙人完整用户明细（管理端不脱敏） */
function adminPartnerUsers(partnerId, opts) {
  const db = getDb();
  const pid = parseInt(partnerId, 10);
  const chan = channelUserIds(pid);
  const page = Math.max(1, parseInt(opts.page, 10) || 1);
  const size = Math.min(200, parseInt(opts.size, 10) || 50);
  if (!chan.size) return { total: 0, page, size, users: [] };
  const chanArr = Array.from(chan);
  const placeholders = chanArr.map(() => '?').join(',');
  const params = [...chanArr];
  let where = `u.user_id IN (${placeholders})`;
  if (opts.q) {
    where += ' AND (u.nickname LIKE ? OR u.phone LIKE ?)';
    params.push(`%${opts.q}%`, `%${opts.q}%`);
  }
  const join = `LEFT JOIN (SELECT user_id, COALESCE(SUM(amount),0) consume FROM user_orders WHERE status IN ('PAID','paid') GROUP BY user_id) o ON o.user_id = u.user_id`;
  const total = db.prepare(`SELECT COUNT(*) c FROM users u ${join} WHERE ${where}`).get(...params).c;
  const rows = db.prepare(`SELECT u.user_id, u.nickname, u.phone, u.email, u.created_at, u.last_login_at, COALESCE(o.consume,0) consume
    FROM users u ${join} WHERE ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`).all(...params, size, (page - 1) * size);
  return {
    total, page, size,
    users: rows.map(r => ({
      userId: String(r.user_id), nickname: r.nickname || '', phone: r.phone || '', email: r.email || '',
      registeredAt: r.created_at, lastLoginAt: r.last_login_at || '',
      isPaid: Number(r.consume) > 0, consumeYuan: (Number(r.consume) || 0).toFixed(2),
    })),
  };
}

// ==================== 启动调度 ====================

/**
 * 合伙人自身状态（前端门户入口判定）：
 * status: NONE / PENDING / APPROVED / REJECTED / DISABLED
 */
function partnerMyStatus(userId) {
  const uid = parseInt(userId, 10);
  if (!uid || isNaN(uid)) return { status: 'NONE' };
  const p = getPartner(uid);
  if (!p) return { status: 'NONE' };
  return {
    status: p.status,
    level: p.level,
    appliedAt: p.applied_at,
    reviewedAt: p.reviewed_at,
    rejectReason: p.reject_reason || '',
    userId: String(uid),
  };
}

function initScheduler() {
  try { runSettlementScheduler(); } catch (e) { /* ignore */ }
  setInterval(() => {
    try { runSettlementScheduler(); } catch (e) { /* ignore */ }
  }, 24 * 60 * 60 * 1000).unref();
}

module.exports = {
  getConfig, saveConfig,
  getDb,
  getPartner, isApprovedPartner, applyPartner, partnerMyStatus,
  findChannelPartner, channelUserIds,
  grantPartnerCommission, reversePartnerCommission, markOrderInvalid,
  generateMonthlySettlements, approveSettlement, rejectSettlement, adjustSettlement,
  partnerOverview, partnerTrends, partnerUsers, partnerSubPartners, partnerSubMonthly, partnerRecords,
  adminPartnerList, adminSetPartnerStatus, adminSetReferrer, adminChannelOverview,
  adminUserTree, adminPartnerTree, adminSettlements, adminPartnerUsers,
  initScheduler, prevPeriod, maskPhone, maskUserId,
};
