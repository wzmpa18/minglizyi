'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG_FILE = path.join(__dirname, 'data', 'growth-campaign-config.json');
const DEFAULT_CONFIG = {
  enabled: true,
  campaignId: 'invite10_member20_v1',
  name: '邀请10位新用户，会员八折',
  startsAt: '2026-10-03T00:00:00+09:00',
  endsAt: '2027-03-31T23:59:59+08:00',
  targetInvites: 10,
  discountPercent: 20,
  couponValidDays: 7,
  eligibleMembershipLevels: ['monthly', 'quarterly', 'yearly'],
  // 普通邀请积分/佣金不叠加；既有 Partner 渠道合同继续按实付金额结算。
  commissionPolicy: 'REFERRAL_EXCLUDED_PARTNER_PRESERVED',
  termsVersion: '2026-10-03-v1',
};

function getConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return { ...DEFAULT_CONFIG, ...saved };
    }
  } catch (e) {
    console.error('[GrowthCampaign] 配置读取失败，使用默认配置:', e.message);
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(patch) {
  const current = getConfig();
  const allowed = [
    'enabled', 'name', 'startsAt', 'endsAt', 'targetInvites', 'discountPercent',
    'couponValidDays', 'eligibleMembershipLevels', 'termsVersion',
  ];
  const next = { ...current };
  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(patch || {}, key)) next[key] = patch[key];
  next.enabled = next.enabled === true;
  next.targetInvites = Math.max(1, Math.min(100, Math.floor(Number(next.targetInvites) || 10)));
  next.discountPercent = Math.max(1, Math.min(50, Math.floor(Number(next.discountPercent) || 20)));
  next.couponValidDays = Math.max(1, Math.min(90, Math.floor(Number(next.couponValidDays) || 7)));
  next.name = String(next.name || DEFAULT_CONFIG.name).slice(0, 80);
  next.termsVersion = String(next.termsVersion || DEFAULT_CONFIG.termsVersion).slice(0, 40);
  next.eligibleMembershipLevels = [...new Set((Array.isArray(next.eligibleMembershipLevels) ? next.eligibleMembershipLevels : [])
    .map(String).filter((v) => DEFAULT_CONFIG.eligibleMembershipLevels.includes(v)))];
  if (!next.eligibleMembershipLevels.length) throw new Error('至少选择一个可用会员套餐');
  const start = validDate(next.startsAt);
  const end = validDate(next.endsAt);
  if (start == null || end == null || end <= start) throw new Error('活动开始、结束时间无效');
  next.startsAt = String(next.startsAt);
  next.endsAt = String(next.endsAt);
  next.updatedAt = nowIso();
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  const tmp = `${CONFIG_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
  fs.renameSync(tmp, CONFIG_FILE);
  return next;
}

function ensureTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS growth_campaign_coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coupon_code TEXT NOT NULL UNIQUE,
      campaign_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      discount_percent INTEGER NOT NULL,
      eligible_levels TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      issued_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      reserved_order_no TEXT,
      reserved_at TEXT,
      consumed_order_no TEXT,
      consumed_at TEXT,
      terms_version TEXT NOT NULL,
      UNIQUE(campaign_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_growth_coupon_user ON growth_campaign_coupons(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_growth_coupon_order ON growth_campaign_coupons(reserved_order_no, consumed_order_no);
  `);
}

function nowIso() { return new Date().toISOString(); }
function validDate(raw) { const n = Date.parse(raw || ''); return Number.isFinite(n) ? n : null; }

function campaignActive(cfg, now = Date.now()) {
  if (!cfg.enabled) return false;
  const start = validDate(cfg.startsAt);
  const end = validDate(cfg.endsAt);
  return (start == null || now >= start) && (end == null || now <= end);
}

function expireStale(db) {
  ensureTables(db);
  db.prepare("UPDATE growth_campaign_coupons SET status='EXPIRED' WHERE status IN ('AVAILABLE','RESERVED') AND expires_at <= ?")
    .run(nowIso());
}

function qualifiedInviteCount(db, userId, cfg) {
  const start = cfg.startsAt || '1970-01-01T00:00:00.000Z';
  const end = cfg.endsAt || '2999-12-31T23:59:59.999Z';
  const userColumns = new Set(db.prepare('PRAGMA table_info(users)').all().map((c) => c.name));
  const statusFilter = userColumns.has('status') ? "AND COALESCE(u.status, 'active') != 'banned'" : '';
  const row = db.prepare(`
    SELECT COUNT(DISTINCT r.invitee_id) AS c
    FROM user_invite_relation r
    JOIN users u ON u.user_id = r.invitee_id
    WHERE r.inviter_id = ? AND r.level = 1
      AND r.invite_time >= ? AND r.invite_time <= ?
      AND u.phone IS NOT NULL AND length(trim(u.phone)) >= 6
      ${statusFilter}
  `).get(Number(userId), start, end);
  return Number(row && row.c) || 0;
}

function makeCouponCode() {
  return 'YD20-' + crypto.randomBytes(5).toString('hex').toUpperCase();
}

function syncUser(db, userId) {
  const cfg = getConfig();
  ensureTables(db);
  expireStale(db);
  const count = qualifiedInviteCount(db, userId, cfg);
  let coupon = db.prepare('SELECT * FROM growth_campaign_coupons WHERE campaign_id = ? AND user_id = ?')
    .get(cfg.campaignId, Number(userId));
  if (campaignActive(cfg) && count >= Number(cfg.targetInvites || 10) && !coupon) {
    const issued = new Date();
    const expires = new Date(issued.getTime() + Math.max(1, Number(cfg.couponValidDays || 7)) * 86400000);
    db.prepare(`INSERT OR IGNORE INTO growth_campaign_coupons
      (coupon_code, campaign_id, user_id, discount_percent, eligible_levels, status, issued_at, expires_at, terms_version)
      VALUES (?, ?, ?, ?, ?, 'AVAILABLE', ?, ?, ?)`)
      .run(makeCouponCode(), cfg.campaignId, Number(userId), Number(cfg.discountPercent || 20),
        JSON.stringify(cfg.eligibleMembershipLevels || []), issued.toISOString(), expires.toISOString(), cfg.termsVersion || 'v1');
    coupon = db.prepare('SELECT * FROM growth_campaign_coupons WHERE campaign_id = ? AND user_id = ?')
      .get(cfg.campaignId, Number(userId));
  }
  return publicStatus(cfg, count, coupon);
}

function publicStatus(cfg, count, coupon) {
  const target = Math.max(1, Number(cfg.targetInvites || 10));
  return {
    enabled: campaignActive(cfg),
    campaignId: cfg.campaignId,
    name: cfg.name,
    qualifiedInvites: count,
    targetInvites: target,
    remainingInvites: Math.max(0, target - count),
    progressPercent: Math.min(100, Math.floor(count * 100 / target)),
    discountPercent: Number(cfg.discountPercent || 20),
    eligibleMembershipLevels: cfg.eligibleMembershipLevels || [],
    endsAt: cfg.endsAt,
    termsVersion: cfg.termsVersion,
    coupon: coupon ? {
      id: coupon.id,
      code: coupon.coupon_code,
      status: coupon.status,
      expiresAt: coupon.expires_at,
    } : null,
    rules: [
      '仅活动期内新注册且完成手机号验证的直接邀请计入进度',
      `同一用户仅可获得一张优惠券，领取后${Number(cfg.couponValidDays || 7)}天内有效`,
      '适用于月度、季度、年度会员，不与其他优惠或普通邀请佣金叠加',
      '异常注册、自邀、重复设备或退款订单不计入活动权益',
    ],
  };
}

function quoteMembership(db, params) {
  const cfg = getConfig();
  const basePrice = Math.round(Number(params.basePrice) * 100) / 100;
  if (!params.useCoupon) return { applied: false, price: basePrice };
  if (!campaignActive(cfg)) return { applied: false, price: basePrice, error: '助力活动当前不可用' };
  const status = syncUser(db, params.userId);
  const coupon = status.coupon;
  if (!coupon || coupon.status !== 'AVAILABLE') return { applied: false, price: basePrice, error: '暂无可用会员优惠券' };
  if (!(cfg.eligibleMembershipLevels || []).includes(params.membershipLevel)) {
    return { applied: false, price: basePrice, error: '该会员套餐不适用当前助力优惠券' };
  }
  const discountedCents = Math.round(basePrice * 100 * (100 - Number(cfg.discountPercent || 20)) / 100);
  return {
    applied: true,
    price: discountedCents / 100,
    couponId: coupon.id,
    couponCode: coupon.code,
    campaignSnapshot: {
      campaignId: cfg.campaignId,
      campaignName: cfg.name,
      discountPercent: Number(cfg.discountPercent || 20),
      basePrice,
      finalPrice: discountedCents / 100,
      commissionPolicy: cfg.commissionPolicy || 'REFERRAL_EXCLUDED_PARTNER_PRESERVED',
      termsVersion: cfg.termsVersion,
    },
  };
}

function reserveCoupon(db, couponId, userId, orderNo) {
  ensureTables(db);
  const info = db.prepare(`UPDATE growth_campaign_coupons
    SET status='RESERVED', reserved_order_no=?, reserved_at=?
    WHERE id=? AND user_id=? AND status='AVAILABLE' AND expires_at>?`)
    .run(String(orderNo), nowIso(), Number(couponId), Number(userId), nowIso());
  return info.changes === 1;
}

function consumeCoupon(db, orderNo) {
  ensureTables(db);
  const info = db.prepare(`UPDATE growth_campaign_coupons
    SET status='CONSUMED', consumed_order_no=?, consumed_at=?
    WHERE reserved_order_no=? AND status='RESERVED'`)
    .run(String(orderNo), nowIso(), String(orderNo));
  return info.changes === 1;
}

function releaseCoupon(db, orderNo) {
  ensureTables(db);
  const info = db.prepare(`UPDATE growth_campaign_coupons
    SET status=CASE WHEN expires_at>? THEN 'AVAILABLE' ELSE 'EXPIRED' END,
        reserved_order_no=NULL, reserved_at=NULL
    WHERE reserved_order_no=? AND status='RESERVED'`)
    .run(nowIso(), String(orderNo));
  return info.changes === 1;
}

module.exports = {
  DEFAULT_CONFIG,
  getConfig,
  saveConfig,
  ensureTables,
  syncUser,
  quoteMembership,
  reserveCoupon,
  consumeCoupon,
  releaseCoupon,
};
