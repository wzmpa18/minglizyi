/**
 * Provider 师傅服务体系正式引擎（FINAL-OPERATIONS-COMPLETION-MASTER-05 第三十一~五十三章）
 *
 * 定位：服务提供者（师傅）完整后端闭环，替代前端 localStorage 原型 SSOT。
 *
 * 铁律（不可协商）：
 *   1. Provider / Partner / Referral 三种角色可同人兼有，但账务完全分开：
 *      Provider Revenue 独立账本 provider_accounts，禁止写入 Partner Revenue
 *      或 Referral Commission（第四十二章）
 *   2. 价格服务端 SSOT：订单只传 serviceId，金额一律取 provider_services.price_cents
 *      快照（第三十八章），禁止客户端传任意 amount
 *   3. 金额全程整数「分」，禁止 JS float 直接算钱
 *   4. 支付复用现有 Payment Engine（SERVICE_ORDER 订单类型），禁止造第二套微信支付
 *      （第四十章）；Payment 与 Provider 解耦（第四十一章）
 *   5. SERVICE_ORDER 订单禁止进入 Commission Router 分佣链（第四十二章）：
 *      paymentRoutes PAID 分支对 SERVICE_ORDER 直接路由到本引擎
 *   6. 幂等：service_orders.order_no / provider_settlements.settlement_no /
 *      provider_reviews.order_no / provider_withdrawals.withdraw_no 全部 UNIQUE
 *   7. 提现复用既有 withdrawal 基础设施口径（窗口/门槛/限额与 commissionEngine 一致），
 *      ledger type 必须明确 PROVIDER_REVENUE（第四十八章）
 *   8. 中医类目合规（第四十九章）：定位知识学习/健康教育/资料解释参考，
 *      禁止确诊/处方/保证治愈/替代医生类文案
 *
 * 状态机（第三十九章）：
 *   Provider: DRAFT → PENDING_REVIEW → APPROVED → SUSPENDED → CLOSED（REJECTED 可重申）
 *   Order:    PENDING_PAYMENT → PAID → CONFIRMED → IN_SERVICE → COMPLETED → CLOSED
 *             （任一服务前阶段可 CANCEL_REQUESTED → REFUND_PENDING → REFUNDED；
 *              CONFIRMED/IN_SERVICE/COMPLETED 可 DISPUTED 仲裁）
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'provider_config.json');
const USERS_DB_PATH = process.env.DB_PATH || '/root/backend-auth/data/yandao_users.db';

// ==================== 配置（后台可视化，不写死） ====================

const DEFAULT_CONFIG = {
  enabled: true,                  // Provider 体系总开关
  platformFeePercent: 10,         // 平台服务费比例（成交金额 %，结算时扣除）
  settleDays: 7,                  // 完成后 T+N 天可提现
  minPriceYuan: 10,               // 服务最低定价（元）
  maxPriceYuan: 2000,             // 服务最高定价（元）
  maxDeliveryDays: 30,            // 最长交付时限（天）
  entryAuditRequired: true,       // 准入三要素：实名+证件后4位+收款账户
  minWithdrawYuan: 10,            // 最低提现门槛（口径与 commissionEngine 一致）
  withdrawOpenDay: 16,            // 提现窗口起始日（每月16日-月末）
  dailyWithdrawLimit: 1,          // 每日提现次数
  dailyWithdrawAmountLimitYuan: 20000, // 单日单用户提现限额（元）
  zhongyiCategories: ['ZHONGYI', 'ZHONGYI_EDU', 'TCM'], // 中医相关类目代码
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
    console.error('[Provider] 配置读取失败:', e.message);
  }
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function saveConfig(cfg) {
  ensureDataDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  return cfg;
}

// ==================== 常量 ====================

const PROVIDER_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
  CLOSED: 'CLOSED',
};

const SERVICE_STATUS = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  FROZEN: 'FROZEN',
};

const ORDER_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID: 'PAID',
  CONFIRMED: 'CONFIRMED',
  IN_SERVICE: 'IN_SERVICE',
  COMPLETED: 'COMPLETED',
  CANCEL_REQUESTED: 'CANCEL_REQUESTED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
  DISPUTED: 'DISPUTED',
  CLOSED: 'CLOSED',
};

// 第三十九章：订单合法状态转移表（服务端唯一裁决）
const ORDER_TRANSITIONS = {
  // PENDING_PAYMENT → REFUND_PENDING：支付金额与 SSOT 不一致时的异常防护路径（管理员裁决退款）
  PENDING_PAYMENT: ['PAID', 'CLOSED', 'REFUND_PENDING'],
  PAID: ['CONFIRMED', 'CANCEL_REQUESTED', 'REFUND_PENDING', 'CLOSED'],
  CONFIRMED: ['IN_SERVICE', 'CANCEL_REQUESTED', 'REFUND_PENDING', 'DISPUTED'],
  IN_SERVICE: ['COMPLETED', 'REFUND_PENDING', 'DISPUTED'],
  COMPLETED: ['DISPUTED', 'REFUND_PENDING', 'CLOSED'],
  CANCEL_REQUESTED: ['REFUND_PENDING', 'PAID', 'CLOSED'],
  REFUND_PENDING: ['REFUNDED', 'IN_SERVICE', 'COMPLETED', 'CLOSED'],
  REFUNDED: ['CLOSED'],
  DISPUTED: ['REFUND_PENDING', 'IN_SERVICE', 'COMPLETED', 'CLOSED'],
  CLOSED: [],
};

const SETTLEMENT_STATUS = {
  PENDING: 'PENDING',             // 已入 frozen，待 T+settleDays 解冻
  SETTLED: 'SETTLED',             // 已转可提现
  PARTIAL_REFUND: 'PARTIAL_REFUND',
  REVERSED: 'REVERSED',           // 全额退款冲销
};

const DELIVERY_TYPES = ['TEXT', 'VOICE', 'VIDEO', 'OFFLINE'];

// 第四十九章：中医类目禁止文案（合规红线）
const ZHONGYI_FORBIDDEN_WORDS = [
  '确诊', '处方', '开方', '保证治愈', '包治', '根治', '替代医生', '痊愈承诺', '治愈率', '医疗诊断',
];

function nowIso() { return new Date().toISOString(); }

function yuanToCents(yuan) {
  const n = Number(yuan);
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}

function centsToYuan(cents) { return Math.round(Number(cents) || 0) / 100; }

function genNo(prefix) {
  return prefix + Date.now().toString(36).toUpperCase() + crypto.randomBytes(4).toString('hex').toUpperCase();
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
    CREATE TABLE IF NOT EXISTS providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      category TEXT NOT NULL,
      expertise TEXT DEFAULT '[]',
      qualification TEXT DEFAULT '',
      contact TEXT DEFAULT '',
      real_name TEXT DEFAULT '',
      id_card_last4 TEXT DEFAULT '',
      payout_alipay TEXT DEFAULT '',
      payout_wechat TEXT DEFAULT '',
      payout_bank TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
      reject_reason TEXT DEFAULT '',
      reviewed_by TEXT DEFAULT '',
      reviewed_at TEXT,
      applied_at TEXT,
      updated_at TEXT,
      note TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_providers_status ON providers(status);

    CREATE TABLE IF NOT EXISTS provider_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_no TEXT NOT NULL UNIQUE,
      provider_id INTEGER NOT NULL,
      service_name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price_cents INTEGER NOT NULL,
      duration_minutes INTEGER DEFAULT 60,
      delivery_type TEXT NOT NULL DEFAULT 'TEXT',
      status TEXT NOT NULL DEFAULT 'ONLINE',
      availability TEXT DEFAULT '',
      sales_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ps_provider ON provider_services(provider_id);
    CREATE INDEX IF NOT EXISTS idx_ps_status ON provider_services(status);

    CREATE TABLE IF NOT EXISTS service_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      payment_order_id TEXT DEFAULT '',
      service_id INTEGER NOT NULL,
      service_snapshot TEXT DEFAULT '{}',
      provider_id INTEGER NOT NULL,
      buyer_user_id INTEGER NOT NULL,
      price_cents INTEGER NOT NULL,
      platform_fee_cents INTEGER NOT NULL DEFAULT 0,
      provider_revenue_cents INTEGER NOT NULL DEFAULT 0,
      refund_cents INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
      requirement TEXT DEFAULT '',
      cancel_reason TEXT DEFAULT '',
      dispute_reason TEXT DEFAULT '',
      paid_at TEXT,
      confirmed_at TEXT,
      in_service_at TEXT,
      completed_at TEXT,
      refunded_at TEXT,
      closed_at TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_so_provider ON service_orders(provider_id);
    CREATE INDEX IF NOT EXISTS idx_so_buyer ON service_orders(buyer_user_id);
    CREATE INDEX IF NOT EXISTS idx_so_status ON service_orders(status);

    CREATE TABLE IF NOT EXISTS provider_settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      settlement_no TEXT NOT NULL UNIQUE,
      provider_id INTEGER NOT NULL,
      provider_user_id INTEGER NOT NULL,
      order_no TEXT NOT NULL,
      gross_cents INTEGER NOT NULL DEFAULT 0,
      refund_cents INTEGER NOT NULL DEFAULT 0,
      platform_fee_cents INTEGER NOT NULL DEFAULT 0,
      provider_revenue_cents INTEGER NOT NULL DEFAULT 0,
      settlement_status TEXT NOT NULL DEFAULT 'PENDING',
      settle_due_at TEXT,
      settled_at TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_pset_provider ON provider_settlements(provider_id);
    CREATE INDEX IF NOT EXISTS idx_pset_status ON provider_settlements(settlement_status);

    CREATE TABLE IF NOT EXISTS provider_accounts (
      user_id INTEGER PRIMARY KEY,
      total_revenue_cents INTEGER NOT NULL DEFAULT 0,
      withdrawable_cents INTEGER NOT NULL DEFAULT 0,
      frozen_cents INTEGER NOT NULL DEFAULT 0,
      negative_cents INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS provider_withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      withdraw_no TEXT NOT NULL UNIQUE,
      provider_user_id INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL,
      ledger_type TEXT NOT NULL DEFAULT 'PROVIDER_REVENUE',
      status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
      reviewed_by TEXT DEFAULT '',
      reviewed_at TEXT,
      paid_at TEXT,
      fail_reason TEXT DEFAULT '',
      created_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_pwd_user ON provider_withdrawals(provider_user_id);
    CREATE INDEX IF NOT EXISTS idx_pwd_status ON provider_withdrawals(status);

    CREATE TABLE IF NOT EXISTS provider_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      service_id INTEGER NOT NULL,
      provider_id INTEGER NOT NULL,
      reviewer_user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      content TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_prev_provider ON provider_reviews(provider_id);

    CREATE TABLE IF NOT EXISTS provider_disputes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispute_no TEXT NOT NULL UNIQUE,
      order_no TEXT NOT NULL,
      service_order_id INTEGER NOT NULL,
      raised_by_user_id INTEGER NOT NULL,
      raised_role TEXT DEFAULT 'BUYER',
      reason TEXT NOT NULL,
      evidence TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'OPEN',
      resolution TEXT DEFAULT '',
      handled_by TEXT DEFAULT '',
      handled_at TEXT,
      created_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_pd_order ON provider_disputes(order_no);
    CREATE INDEX IF NOT EXISTS idx_pd_status ON provider_disputes(status);
  `);
  _db = db;
  return db;
}

function ensureProviderAccount(db, userId) {
  db.prepare('INSERT OR IGNORE INTO provider_accounts (user_id, updated_at) VALUES (?, ?)')
    .run(userId, nowIso());
}

// ==================== 合规（第四十九章） ====================

/** 中医类目服务文案合规扫描：返回违禁词数组（空=通过） */
function zhongyiComplianceScan(category, texts) {
  const cfg = getConfig();
  const zhongyi = (cfg.zhongyiCategories || []).map(String);
  if (!zhongyi.includes(String(category || '').trim().toUpperCase())) return [];
  const hits = [];
  const joined = (Array.isArray(texts) ? texts : [texts]).filter(Boolean).join(' ');
  for (const w of ZHONGYI_FORBIDDEN_WORDS) {
    if (joined.includes(w)) hits.push(w);
  }
  return hits;
}

/** 中医类目合规定位说明（服务端生成，前端展示口径） */
function zhongyiPositioningNote(category) {
  const cfg = getConfig();
  const zhongyi = (cfg.zhongyiCategories || []).map(String);
  if (!zhongyi.includes(String(category || '').trim().toUpperCase())) return null;
  return {
    positioning: '知识学习 / 健康教育 / 资料解释参考',
    disclaimer: '本服务为中医药知识学习与健康教育参考，不构成医疗诊断、处方或治疗建议；如有健康问题请前往正规医疗机构就诊。',
  };
}

// ==================== Provider 申请与审核（第三十五~三十六章） ====================

function applyProvider(params) {
  const cfg = getConfig();
  if (!cfg.enabled) return { ok: false, error: 'Provider 服务体系当前未开放' };
  const db = getDb();
  const userId = parseInt(params.userId, 10);
  if (!userId || isNaN(userId)) return { ok: false, error: '用户未登录' };

  const displayName = String(params.displayName || '').trim();
  if (!displayName || displayName.length < 2) return { ok: false, error: '请填写展示名称（至少2字）' };
  const bio = String(params.bio || '').trim();
  if (!bio || bio.length < 30) return { ok: false, error: '请填写至少30字的简介，说明擅长领域与服务方式' };
  const category = String(params.category || '').trim().toUpperCase();
  if (!category) return { ok: false, error: '请选择服务类别' };
  const expertise = JSON.stringify(
    (Array.isArray(params.expertise) ? params.expertise : String(params.expertise || '').split(/[,，、\s]+/))
      .map(s => String(s).trim()).filter(Boolean).slice(0, 8)
  );
  const qualification = String(params.qualification || '').trim().slice(0, 500);

  // 中医合规（第四十九章）
  const badWords = zhongyiComplianceScan(category, [bio, qualification, displayName, params.expertiseStr || '']);
  if (badWords.length) {
    return { ok: false, error: `中医类目合规红线：禁止「${badWords.join('、')}」类医疗承诺文案（定位仅限知识学习/健康教育/资料解释参考）` };
  }

  // 准入三要素（第三十五章：实名+证件后4位+收款账户）
  const realName = String(params.realName || '').trim();
  const idCardLast4 = String(params.idCardLast4 || '').trim();
  const payout = {
    alipay: String(params.payoutAlipay || '').trim(),
    wechat: String(params.payoutWechat || '').trim(),
    bank: String(params.payoutBank || '').trim(),
  };
  if (cfg.entryAuditRequired) {
    if (!realName) return { ok: false, error: '准入校验：请填写实名姓名' };
    if (!/^\d{4}$/.test(idCardLast4)) return { ok: false, error: '准入校验：请填写证件号码后4位' };
    if (!payout.alipay && !payout.wechat && !payout.bank) {
      return { ok: false, error: '准入校验：请至少绑定一种收款账户（支付宝/微信/银行卡）' };
    }
  }

  const existing = db.prepare('SELECT id, status FROM providers WHERE user_id = ?').get(userId);
  if (existing && [PROVIDER_STATUS.PENDING_REVIEW, PROVIDER_STATUS.APPROVED].includes(existing.status)) {
    return { ok: false, error: existing.status === PROVIDER_STATUS.APPROVED ? '您已是认证 Provider，无需重复申请' : '申请审核中，请耐心等待' };
  }

  const contact = String(params.contact || '').trim().slice(0, 100);
  const now = nowIso();
  const tx = db.transaction(() => {
    if (existing) {
      db.prepare(`UPDATE providers SET display_name=?, avatar=?, bio=?, category=?, expertise=?, qualification=?,
        contact=?, real_name=?, id_card_last4=?, payout_alipay=?, payout_wechat=?, payout_bank=?,
        status='PENDING_REVIEW', reject_reason='', applied_at=?, updated_at=? WHERE user_id=?`)
        .run(displayName, String(params.avatar || '').slice(0, 200), bio, category, expertise, qualification,
          contact, realName, idCardLast4, payout.alipay, payout.wechat, payout.bank, now, now, userId);
    } else {
      db.prepare(`INSERT INTO providers (user_id, display_name, avatar, bio, category, expertise, qualification,
        contact, real_name, id_card_last4, payout_alipay, payout_wechat, payout_bank, status, applied_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_REVIEW', ?, ?)`)
        .run(userId, displayName, String(params.avatar || '').slice(0, 200), bio, category, expertise, qualification,
          contact, realName, idCardLast4, payout.alipay, payout.wechat, payout.bank, now, now);
    }
  });
  tx();
  return { ok: true, userId, status: PROVIDER_STATUS.PENDING_REVIEW };
}

function reviewProvider(params) {
  const db = getDb();
  const providerId = parseInt(params.providerId, 10);
  const action = String(params.action || '').trim();
  const admin = String(params.admin || '').trim();
  if (!providerId || isNaN(providerId)) return { ok: false, error: '参数错误：providerId' };
  if (!['approve', 'reject', 'suspend', 'resume', 'close'].includes(action)) {
    return { ok: false, error: 'action 仅支持 approve/reject/suspend/resume/close' };
  }
  const p = db.prepare('SELECT * FROM providers WHERE id = ?').get(providerId);
  if (!p) return { ok: false, error: 'Provider 不存在' };

  const now = nowIso();
  let newStatus;
  if (action === 'approve') {
    if (p.status !== PROVIDER_STATUS.PENDING_REVIEW) return { ok: false, error: '仅待审核状态可通过' };
    newStatus = PROVIDER_STATUS.APPROVED;
  } else if (action === 'reject') {
    if (p.status !== PROVIDER_STATUS.PENDING_REVIEW) return { ok: false, error: '仅待审核状态可驳回' };
    newStatus = PROVIDER_STATUS.REJECTED;
  } else if (action === 'suspend') {
    if (p.status !== PROVIDER_STATUS.APPROVED) return { ok: false, error: '仅已开通状态可停用' };
    newStatus = PROVIDER_STATUS.SUSPENDED;
  } else if (action === 'resume') {
    if (p.status !== PROVIDER_STATUS.SUSPENDED) return { ok: false, error: '仅已停用状态可恢复' };
    newStatus = PROVIDER_STATUS.APPROVED;
  } else {
    if (p.status === PROVIDER_STATUS.CLOSED) return { ok: false, error: '已是关闭状态' };
    newStatus = PROVIDER_STATUS.CLOSED;
  }

  const tx = db.transaction(() => {
    db.prepare('UPDATE providers SET status=?, reject_reason=?, reviewed_by=?, reviewed_at=?, updated_at=? WHERE id=?')
      .run(newStatus, action === 'reject' ? String(params.reason || '').slice(0, 200) : '', admin, now, now, providerId);
    // 停用/关闭：在架服务同步冻结（禁止继续售卖）
    if (newStatus === PROVIDER_STATUS.SUSPENDED || newStatus === PROVIDER_STATUS.CLOSED) {
      db.prepare("UPDATE provider_services SET status='FROZEN', updated_at=? WHERE provider_id=? AND status='ONLINE'")
        .run(now, providerId);
    }
    if (newStatus === PROVIDER_STATUS.APPROVED && p.status === PROVIDER_STATUS.SUSPENDED) {
      db.prepare("UPDATE provider_services SET status='ONLINE', updated_at=? WHERE provider_id=? AND status='FROZEN'")
        .run(now, providerId);
    }
  });
  tx();
  return { ok: true, providerId, from: p.status, to: newStatus };
}

function getProviderByUserId(userId) {
  const db = getDb();
  const uid = parseInt(userId, 10);
  if (!uid || isNaN(uid)) return null;
  return db.prepare('SELECT * FROM providers WHERE user_id = ?').get(uid) || null;
}

function getProviderById(providerId) {
  return getDb().prepare('SELECT * FROM providers WHERE id = ?').get(parseInt(providerId, 10)) || null;
}

function isApprovedProvider(providerId) {
  const p = getProviderById(providerId);
  return !!(p && p.status === PROVIDER_STATUS.APPROVED);
}

// ==================== 服务商品（第三十七~三十八章） ====================

function createService(params) {
  const cfg = getConfig();
  if (!cfg.enabled) return { ok: false, error: 'Provider 服务体系当前未开放' };
  const db = getDb();
  const userId = parseInt(params.userId, 10);
  if (!userId || isNaN(userId)) return { ok: false, error: '用户未登录' };
  const p = getProviderByUserId(userId);
  if (!p) return { ok: false, error: '请先提交 Provider 入驻申请' };
  if (p.status !== PROVIDER_STATUS.APPROVED) return { ok: false, error: `当前状态 ${p.status}，仅 APPROVED 可上架服务` };

  const serviceName = String(params.serviceName || '').trim();
  if (!serviceName || serviceName.length < 4) return { ok: false, error: '服务名称至少4个字' };
  const description = String(params.description || '').trim();
  if (!description || description.length < 20) return { ok: false, error: '请填写至少20字的服务说明（做什么/不做什么）' };

  const priceCents = yuanToCents(params.price);
  const minC = yuanToCents(cfg.minPriceYuan), maxC = yuanToCents(cfg.maxPriceYuan);
  if (priceCents < minC || priceCents > maxC) {
    return { ok: false, error: `定价须在 ¥${cfg.minPriceYuan} ~ ¥${cfg.maxPriceYuan} 区间内` };
  }

  const deliveryType = String(params.deliveryType || 'TEXT').toUpperCase();
  if (!DELIVERY_TYPES.includes(deliveryType)) return { ok: false, error: `deliveryType 仅支持 ${DELIVERY_TYPES.join('/')}` };
  const durationMinutes = Math.max(15, Math.min(1440, parseInt(params.duration, 10) || 60));

  // 中医合规
  const badWords = zhongyiComplianceScan(p.category, [serviceName, description]);
  if (badWords.length) {
    return { ok: false, error: `中医类目合规红线：禁止「${badWords.join('、')}」类医疗承诺文案` };
  }

  const availability = String(params.availability || '').trim().slice(0, 300);
  const now = nowIso();
  const serviceNo = genNo('SVC');
  db.prepare(`INSERT INTO provider_services (service_no, provider_id, service_name, description, price_cents,
    duration_minutes, delivery_type, status, availability, sales_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ONLINE', ?, 0, ?, ?)`)
    .run(serviceNo, p.id, serviceName, description, priceCents, durationMinutes, deliveryType, availability, now, now);
  return { ok: true, serviceNo, serviceId: db.prepare('SELECT id FROM provider_services WHERE service_no = ?').get(serviceNo).id };
}

function updateService(params) {
  const db = getDb();
  const userId = parseInt(params.userId, 10);
  const serviceId = parseInt(params.serviceId, 10);
  const svc = db.prepare('SELECT * FROM provider_services WHERE id = ?').get(serviceId);
  if (!svc) return { ok: false, error: '服务不存在' };
  const p = getProviderByUserId(userId);
  if (!p || p.id !== svc.provider_id) return { ok: false, error: '无权修改他人服务' };

  const fields = {};
  if (params.serviceName != null) {
    const n = String(params.serviceName).trim();
    if (n.length < 4) return { ok: false, error: '服务名称至少4个字' };
    fields.service_name = n;
  }
  if (params.description != null) {
    const d = String(params.description).trim();
    if (d.length < 20) return { ok: false, error: '请填写至少20字的服务说明' };
    fields.description = d;
  }
  if (params.price != null) {
    const cfg = getConfig();
    const priceCents = yuanToCents(params.price);
    const minC = yuanToCents(cfg.minPriceYuan), maxC = yuanToCents(cfg.maxPriceYuan);
    if (priceCents < minC || priceCents > maxC) return { ok: false, error: `定价须在 ¥${cfg.minPriceYuan} ~ ¥${cfg.maxPriceYuan} 区间内` };
    fields.price_cents = priceCents;
  }
  if (params.duration != null) fields.duration_minutes = Math.max(15, Math.min(1440, parseInt(params.duration, 10) || 60));
  if (params.deliveryType != null) {
    const dt = String(params.deliveryType).toUpperCase();
    if (!DELIVERY_TYPES.includes(dt)) return { ok: false, error: 'deliveryType 非法' };
    fields.delivery_type = dt;
  }
  if (params.availability != null) fields.availability = String(params.availability).trim().slice(0, 300);

  // 中医合规复扫
  const pRow = getProviderById(svc.provider_id);
  const merged = {
    serviceName: fields.service_name || svc.service_name,
    description: fields.description || svc.description,
  };
  const badWords = zhongyiComplianceScan(pRow.category, [merged.serviceName, merged.description]);
  if (badWords.length) return { ok: false, error: `中医类目合规红线：禁止「${badWords.join('、')}」类文案` };

  const keys = Object.keys(fields);
  if (!keys.length) return { ok: false, error: '无更新字段' };
  db.prepare(`UPDATE provider_services SET ${keys.map(k => `${k}=?`).join(', ')}, updated_at=? WHERE id=?`)
    .run(...keys.map(k => fields[k]), nowIso(), serviceId);
  return { ok: true, serviceId };
}

function setServiceStatus(params) {
  const db = getDb();
  const serviceId = parseInt(params.serviceId, 10);
  const status = String(params.status || '').toUpperCase();
  if (![SERVICE_STATUS.ONLINE, SERVICE_STATUS.OFFLINE, SERVICE_STATUS.FROZEN].includes(status)) {
    return { ok: false, error: 'status 仅支持 ONLINE/OFFLINE/FROZEN' };
  }
  const svc = db.prepare('SELECT * FROM provider_services WHERE id = ?').get(serviceId);
  if (!svc) return { ok: false, error: '服务不存在' };
  const isAdmin = !!params.admin;
  const p = getProviderByUserId(params.userId);
  if (!isAdmin) {
    if (!p || p.id !== svc.provider_id) return { ok: false, error: '无权操作他人服务' };
    if (p.status !== PROVIDER_STATUS.APPROVED) return { ok: false, error: 'Provider 状态不允许上架' };
    if (status === SERVICE_STATUS.FROZEN) return { ok: false, error: '冻结仅管理端可操作' };
  }
  db.prepare('UPDATE provider_services SET status=?, updated_at=? WHERE id=?').run(status, nowIso(), serviceId);
  return { ok: true, serviceId, status };
}

function getService(serviceId) {
  return getDb().prepare('SELECT * FROM provider_services WHERE id = ?').get(parseInt(serviceId, 10)) || null;
}

/** 第三十八章：价格 SSOT（供 paymentRoutes resolveServerPrice 调用） */
function getServicePrice(serviceId) {
  const svc = getService(serviceId);
  if (!svc) return { price: null, reason: '服务不存在' };
  if (svc.status !== SERVICE_STATUS.ONLINE) return { price: null, reason: '服务当前不可预约' };
  const p = getProviderById(svc.provider_id);
  if (!p || p.status !== PROVIDER_STATUS.APPROVED) return { price: null, reason: '服务者当前不可接单' };
  return { price: centsToYuan(svc.price_cents), priceCents: svc.price_cents, serviceName: svc.service_name };
}

function listServices(filter) {
  const db = getDb();
  const f = filter || {};
  const where = [];
  const args = [];
  if (f.providerId) { where.push('s.provider_id = ?'); args.push(parseInt(f.providerId, 10)); }
  if (f.status) { where.push('s.status = ?'); args.push(String(f.status).toUpperCase()); }
  if (f.onlineOnly) { where.push("s.status = 'ONLINE' AND p.status = 'APPROVED'"); }
  const sql = `SELECT s.*, p.display_name, p.avatar, p.category FROM provider_services s
    JOIN providers p ON p.id = s.provider_id ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY s.sales_count DESC, s.id DESC`;
  const rows = db.prepare(sql).all(...args);
  return rows.map(r => ({
    serviceId: r.id, serviceNo: r.service_no, providerId: r.provider_id,
    providerName: r.display_name, providerAvatar: r.avatar, category: r.category,
    serviceName: r.service_name, description: r.description,
    priceYuan: centsToYuan(r.price_cents), priceCents: r.price_cents,
    durationMinutes: r.duration_minutes, deliveryType: r.delivery_type,
    status: r.status, availability: r.availability, salesCount: r.sales_count,
    compliance: zhongyiPositioningNote(r.category),
    createdAt: r.created_at, updatedAt: r.updated_at,
  }));
}

// ==================== 订单创建与状态机（第三十八~三十九章） ====================

/**
 * 创建服务订单（PENDING_PAYMENT）。
 * 铁律：仅传 serviceId，金额由 provider_services SSOT 快照决定，忽略客户端 amount。
 */
function createServiceOrder(params) {
  const cfg = getConfig();
  if (!cfg.enabled) return { ok: false, error: 'Provider 服务体系当前未开放' };
  const db = getDb();
  const buyerId = parseInt(params.userId, 10);
  if (!buyerId || isNaN(buyerId)) return { ok: false, error: '用户未登录' };
  const serviceId = parseInt(params.serviceId, 10);
  if (!serviceId || isNaN(serviceId)) return { ok: false, error: '参数错误：serviceId' };

  const svc = getService(serviceId);
  if (!svc) return { ok: false, error: '服务不存在' };
  if (svc.status !== SERVICE_STATUS.ONLINE) return { ok: false, error: '该服务当前不可预约' };
  const p = getProviderById(svc.provider_id);
  if (!p || p.status !== PROVIDER_STATUS.APPROVED) return { ok: false, error: '服务者当前不可接单' };
  if (p.user_id === buyerId) return { ok: false, error: '不能预约自己的服务' };

  // 未支付挂单去重：同一买家同一服务仅允许一笔 PENDING_PAYMENT
  const pending = db.prepare("SELECT id, order_no FROM service_orders WHERE service_id=? AND buyer_user_id=? AND status='PENDING_PAYMENT' ORDER BY id DESC LIMIT 1")
    .get(serviceId, buyerId);
  if (pending) return { ok: false, error: '已有待支付的同一服务订单', orderNo: pending.order_no };

  const platformFeeCents = Math.floor(svc.price_cents * Number(cfg.platformFeePercent) / 100);
  const providerRevenueCents = svc.price_cents - platformFeeCents;
  const now = nowIso();
  const orderNo = genNo('SO');
  const snapshot = JSON.stringify({
    serviceName: svc.service_name, priceCents: svc.price_cents,
    deliveryType: svc.delivery_type, durationMinutes: svc.duration_minutes,
    providerId: p.id, providerName: p.display_name, platformFeePercent: Number(cfg.platformFeePercent),
  });
  db.prepare(`INSERT INTO service_orders (order_no, service_id, service_snapshot, provider_id, buyer_user_id,
    price_cents, platform_fee_cents, provider_revenue_cents, status, requirement, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_PAYMENT', ?, ?, ?)`)
    .run(orderNo, serviceId, snapshot, svc.provider_id, buyerId, svc.price_cents, platformFeeCents,
      providerRevenueCents, String(params.requirement || '').trim().slice(0, 500), now, now);
  return { ok: true, orderNo, serviceId, priceCents: svc.price_cents, platformFeeCents, providerRevenueCents };
}

/** 第三十八章：paymentRoutes 创建支付单时回填 payment_order_id（金额一致性校验） */
function bindPaymentOrder(orderNo, paymentOrderId, amountYuan) {
  const db = getDb();
  const o = db.prepare('SELECT * FROM service_orders WHERE order_no = ?').get(String(orderNo));
  if (!o) return { ok: false, error: '服务订单不存在' };
  if (o.payment_order_id) return { ok: true, already: true, paymentOrderId: o.payment_order_id };
  const expectCents = yuanToCents(amountYuan);
  if (expectCents !== o.price_cents) {
    return { ok: false, error: `金额不一致：支付单 ${expectCents}分 ≠ 服务订单 ${o.price_cents}分（价格 SSOT 拒绝）` };
  }
  db.prepare('UPDATE service_orders SET payment_order_id=?, updated_at=? WHERE order_no=?')
    .run(String(paymentOrderId), nowIso(), String(orderNo));
  return { ok: true, paymentOrderId: String(paymentOrderId) };
}

function transitionOrder(db, orderNo, fromStatuses, toStatus, extra) {
  const o = db.prepare('SELECT * FROM service_orders WHERE order_no = ?').get(String(orderNo));
  if (!o) return { ok: false, error: '订单不存在' };
  if (!fromStatuses.includes(o.status)) {
    return { ok: false, error: `状态机拒绝：${o.status} → ${toStatus}` };
  }
  const allowed = ORDER_TRANSITIONS[o.status] || [];
  if (!allowed.includes(toStatus) && toStatus !== ORDER_STATUS.CLOSED) {
    return { ok: false, error: `非法状态转移：${o.status} → ${toStatus}（允许：${allowed.join('/') || '无'}）` };
  }
  const now = nowIso();
  const setClause = ['status = ?', 'updated_at = ?'];
  const args = [toStatus, now];
  const tsField = {
    PAID: 'paid_at', CONFIRMED: 'confirmed_at', IN_SERVICE: 'in_service_at',
    COMPLETED: 'completed_at', REFUNDED: 'refunded_at', CLOSED: 'closed_at',
  }[toStatus];
  if (tsField) { setClause.push(`${tsField} = ?`); args.push(now); }
  if (extra) {
    for (const [k, v] of Object.entries(extra)) { setClause.push(`${k} = ?`); args.push(v); }
  }
  args.push(String(orderNo));
  db.prepare(`UPDATE service_orders SET ${setClause.join(', ')} WHERE order_no = ?`).run(...args);
  return { ok: true, from: o.status, to: toStatus, order: o };
}

/**
 * 第四十~四十一章：支付成功联动（paymentRoutes PAID 回调调用，幂等）。
 * Payment 只负责收钱事实；服务状态由本函数推进 PAID。
 */
function onOrderPaid(paymentOrderId, amountYuan) {
  const db = getDb();
  const o = db.prepare('SELECT * FROM service_orders WHERE payment_order_id = ?').get(String(paymentOrderId));
  if (!o) return { ok: false, error: '无对应服务订单' };
  if (o.status !== ORDER_STATUS.PENDING_PAYMENT) return { ok: true, skipped: true, status: o.status };
  const paidCents = yuanToCents(amountYuan);
  if (paidCents !== o.price_cents) {
    console.error(`[Provider] 支付金额不一致 payment=${paymentOrderId} paid=${paidCents}分 expect=${o.price_cents}分，标记 REFUND_PENDING`);
    const t = transitionOrder(db, o.order_no, [ORDER_STATUS.PENDING_PAYMENT], ORDER_STATUS.REFUND_PENDING,
      { cancel_reason: '支付金额与服务订单不一致，待人工退款' });
    return { ok: true, amountMismatch: true, ...t };
  }
  const t = transitionOrder(db, o.order_no, [ORDER_STATUS.PENDING_PAYMENT], ORDER_STATUS.PAID);
  if (!t.ok) return t;
  // 销量 +1
  db.prepare('UPDATE provider_services SET sales_count = sales_count + 1 WHERE id = ?').run(o.service_id);
  console.log(`[Provider] 订单已支付 order=${o.order_no} provider=${o.provider_id} price=${o.price_cents}分`);
  return { ok: true, orderNo: o.order_no, providerId: o.provider_id };
}

/** Provider 接单确认（PAID → CONFIRMED） */
function confirmOrder(params) {
  const db = getDb();
  const userId = parseInt(params.userId, 10);
  const p = getProviderByUserId(userId);
  const o = db.prepare('SELECT * FROM service_orders WHERE order_no = ?').get(String(params.orderNo || ''));
  if (!o) return { ok: false, error: '订单不存在' };
  if (!p || p.id !== o.provider_id) return { ok: false, error: '无权操作此订单' };
  if (p.status !== PROVIDER_STATUS.APPROVED) return { ok: false, error: 'Provider 状态不允许接单' };
  return transitionOrder(db, o.order_no, [ORDER_STATUS.PAID], ORDER_STATUS.CONFIRMED);
}

/** 开始服务（CONFIRMED → IN_SERVICE） */
function startService(params) {
  const db = getDb();
  const p = getProviderByUserId(params.userId);
  const o = db.prepare('SELECT * FROM service_orders WHERE order_no = ?').get(String(params.orderNo || ''));
  if (!o) return { ok: false, error: '订单不存在' };
  if (!p || p.id !== o.provider_id) return { ok: false, error: '无权操作此订单' };
  return transitionOrder(db, o.order_no, [ORDER_STATUS.CONFIRMED], ORDER_STATUS.IN_SERVICE);
}

/**
 * 完成服务（IN_SERVICE → COMPLETED）：
 * 生成结算单（第四十三章字段）+ Provider 独立账本入 frozen（T+settleDays）。
 */
function completeOrder(params) {
  const db = getDb();
  const cfg = getConfig();
  const p = getProviderByUserId(params.userId);
  const o = db.prepare('SELECT * FROM service_orders WHERE order_no = ?').get(String(params.orderNo || ''));
  if (!o) return { ok: false, error: '订单不存在' };
  if (!p || p.id !== o.provider_id) return { ok: false, error: '无权操作此订单' };

  // 幂等：已完成订单直接跳过（结算单已存在）
  if (o.status === ORDER_STATUS.COMPLETED) {
    const existedAlready = db.prepare('SELECT id FROM provider_settlements WHERE order_no = ?').get(o.order_no);
    if (existedAlready) return { ok: true, orderNo: o.order_no, settlementSkipped: true };
  }

  const t = transitionOrder(db, o.order_no, [ORDER_STATUS.IN_SERVICE], ORDER_STATUS.COMPLETED,
    params.deliverNote ? { requirement: o.requirement + ' | 交付说明：' + String(params.deliverNote).slice(0, 300) } : null);
  if (!t.ok) return t;

  // 幂等：结算单已存在则跳过
  const existed = db.prepare('SELECT id FROM provider_settlements WHERE order_no = ?').get(o.order_no);
  if (existed) return { ok: true, orderNo: o.order_no, settlementSkipped: true };

  const now = nowIso();
  const settleDue = new Date(Date.now() + Number(cfg.settleDays) * 86400000).toISOString();
  const settlementNo = genNo('PS');
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO provider_settlements (settlement_no, provider_id, provider_user_id, order_no,
      gross_cents, refund_cents, platform_fee_cents, provider_revenue_cents, settlement_status, settle_due_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'PENDING', ?, ?, ?)`)
      .run(settlementNo, o.provider_id, p.user_id, o.order_no, o.price_cents, o.platform_fee_cents,
        o.provider_revenue_cents, settleDue, now, now);
    ensureProviderAccount(db, p.user_id);
    db.prepare(`UPDATE provider_accounts SET frozen_cents = frozen_cents + ?, total_revenue_cents = total_revenue_cents + ?, updated_at = ?
      WHERE user_id = ?`).run(o.provider_revenue_cents, o.provider_revenue_cents, now, p.user_id);
  });
  tx();
  console.log(`[Provider] 服务完成结算入账 order=${o.order_no} settlement=${settlementNo} revenue=${o.provider_revenue_cents}分 frozen T+${cfg.settleDays}d`);
  return { ok: true, orderNo: o.order_no, settlementNo, providerRevenueCents: o.provider_revenue_cents };
}

/** 买家请求取消（服务开始前：PAID/CONFIRMED → CANCEL_REQUESTED） */
function requestCancel(params) {
  const db = getDb();
  const o = db.prepare('SELECT * FROM service_orders WHERE order_no = ?').get(String(params.orderNo || ''));
  if (!o) return { ok: false, error: '订单不存在' };
  if (o.buyer_user_id !== parseInt(params.userId, 10)) return { ok: false, error: '无权操作此订单' };
  const reason = String(params.reason || '').trim();
  if (reason.length < 5) return { ok: false, error: '请填写至少5字的取消原因' };
  return transitionOrder(db, o.order_no, [ORDER_STATUS.PAID, ORDER_STATUS.CONFIRMED], ORDER_STATUS.CANCEL_REQUESTED,
    { cancel_reason: reason.slice(0, 300) });
}

/**
 * 第四十四章：退款（管理员操作）。
 * 支持未服务全额退款 / 部分退款 / 争议仲裁退款；幂等；账务从 Provider 独立账本冲回。
 */
function refundOrder(params) {
  const db = getDb();
  const orderNo = String(params.orderNo || '');
  const o = db.prepare('SELECT * FROM service_orders WHERE order_no = ?').get(orderNo);
  if (!o) return { ok: false, error: '订单不存在' };
  const admin = String(params.admin || '').trim();
  if (!admin) return { ok: false, error: '缺少操作人' };

  let refundCents = yuanToCents(params.refundAmount);
  if (params.full) refundCents = o.price_cents;
  if (refundCents <= 0) return { ok: false, error: '退款金额必须大于 0' };
  if (refundCents > o.price_cents - o.refund_cents) {
    return { ok: false, error: `累计退款不得超过实付 ${o.price_cents} 分（已退 ${o.refund_cents} 分）` };
  }
  const already = o.refund_cents;
  const totalRefund = already + refundCents;
  const isFull = totalRefund >= o.price_cents;

  // 状态校验：仅已支付后的状态可退款
  const refundable = [ORDER_STATUS.PAID, ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCEL_REQUESTED,
    ORDER_STATUS.REFUND_PENDING, ORDER_STATUS.DISPUTED, ORDER_STATUS.IN_SERVICE, ORDER_STATUS.COMPLETED];
  if (!refundable.includes(o.status)) return { ok: false, error: `状态 ${o.status} 不允许退款` };

  const now = nowIso();
  const tx = db.transaction(() => {
    // 结算单冲销（按退款比例）
    const s = db.prepare('SELECT * FROM provider_settlements WHERE order_no = ?').get(orderNo);
    if (s) {
      if (isFull) {
        db.prepare("UPDATE provider_settlements SET settlement_status='REVERSED', refund_cents=?, updated_at=? WHERE id=?")
          .run(totalRefund, now, s.id);
        reverseProviderRevenue(db, s, s.provider_revenue_cents, now);
      } else {
        // 部分退款：按退款比例冲减 provider 收入，platform_fee 不退
        const newRevenue = Math.max(0, Math.round((o.price_cents - totalRefund) * (1 - Number(getConfig().platformFeePercent) / 100)));
        const cut = s.provider_revenue_cents - newRevenue;
        if (cut > 0) reverseProviderRevenue(db, s, cut, now);
        db.prepare("UPDATE provider_settlements SET settlement_status='PARTIAL_REFUND', refund_cents=?, provider_revenue_cents=?, updated_at=? WHERE id=?")
          .run(totalRefund, newRevenue, now, s.id);
      }
    }

    if (isFull) {
      // 状态机路径：refundable → REFUND_PENDING → REFUNDED（第三十九章）
      const cur = db.prepare('SELECT status FROM service_orders WHERE order_no = ?').get(orderNo);
      if (cur.status !== ORDER_STATUS.REFUND_PENDING) {
        const t1 = transitionOrder(db, orderNo, refundable, ORDER_STATUS.REFUND_PENDING);
        if (!t1.ok) throw new Error('退款状态转移失败：' + t1.error);
      }
      const t2 = transitionOrder(db, orderNo, [ORDER_STATUS.REFUND_PENDING], ORDER_STATUS.REFUNDED, { refund_cents: totalRefund });
      if (!t2.ok) throw new Error('退款终态失败：' + t2.error);
    } else {
      // 部分退款：退款留痕；可选关闭订单
      db.prepare('UPDATE service_orders SET refund_cents=?, updated_at=? WHERE order_no=?').run(totalRefund, now, orderNo);
      if (params.closeOrder) {
        db.prepare('UPDATE service_orders SET status=?, closed_at=?, updated_at=? WHERE order_no=?')
          .run(ORDER_STATUS.CLOSED, now, now, orderNo);
      }
    }
  });
  tx();
  return { ok: true, orderNo, refundCents, totalRefund, full: isFull };
}

/** 结算冲销：从 Provider 账本扣回（frozen 优先，其次 withdrawable，不足记 negative） */
function reverseProviderRevenue(db, settlement, cutCents, now) {
  ensureProviderAccount(db, settlement.provider_user_id);
  const acct = db.prepare('SELECT frozen_cents, withdrawable_cents FROM provider_accounts WHERE user_id = ?')
    .get(settlement.provider_user_id);
  let fromFrozen = 0, fromWithdrawable = 0, toNegative = 0;
  fromFrozen = Math.min(acct.frozen_cents, cutCents);
  fromWithdrawable = Math.min(acct.withdrawable_cents, cutCents - fromFrozen);
  toNegative = cutCents - fromFrozen - fromWithdrawable;
  db.prepare(`UPDATE provider_accounts SET frozen_cents = frozen_cents - ?, withdrawable_cents = withdrawable_cents - ?,
    negative_cents = negative_cents + ?, total_revenue_cents = total_revenue_cents - ?, updated_at = ? WHERE user_id = ?`)
    .run(fromFrozen, fromWithdrawable, toNegative, cutCents, now, settlement.provider_user_id);
}

// ==================== 评价（第四十五~四十六章） ====================

function reviewOrder(params) {
  const db = getDb();
  const userId = parseInt(params.userId, 10);
  const o = db.prepare('SELECT * FROM service_orders WHERE order_no = ?').get(String(params.orderNo || ''));
  if (!o) return { ok: false, error: '订单不存在' };
  if (o.buyer_user_id !== userId) return { ok: false, error: '仅买家可评价' };
  if (o.status !== ORDER_STATUS.COMPLETED) return { ok: false, error: '仅 COMPLETED 订单允许评价' };
  const rating = parseInt(params.rating, 10);
  if (!rating || rating < 1 || rating > 5) return { ok: false, error: 'rating 须为 1~5' };
  const content = String(params.content || '').trim().slice(0, 500);

  // 幂等：一单一条有效评价（order_no UNIQUE）
  const existed = db.prepare('SELECT id FROM provider_reviews WHERE order_no = ?').get(o.order_no);
  if (existed) return { ok: false, error: '该订单已评价，每单最多一条有效评价' };

  db.prepare(`INSERT INTO provider_reviews (order_no, service_id, provider_id, reviewer_user_id, rating, content, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`)
    .run(o.order_no, o.service_id, o.provider_id, userId, rating, content, nowIso());
  return { ok: true, orderNo: o.order_no };
}

function listReviews(providerId) {
  const db = getDb();
  const stmt = db.prepare("SELECT r.*, s.service_name FROM provider_reviews r LEFT JOIN provider_services s ON s.id = r.service_id WHERE r.provider_id = ? AND r.status = 'ACTIVE' ORDER BY r.id DESC LIMIT 100");
  return stmt.all(parseInt(providerId, 10)).map(r => ({
    orderNo: r.order_no, serviceName: r.service_name, rating: r.rating,
    content: r.content, createdAt: r.created_at, reviewerUserId: r.reviewer_user_id,
  }));
}

function providerRating(providerId) {
  const db = getDb();
  const r = db.prepare("SELECT AVG(rating) avg_r, COUNT(*) cnt FROM provider_reviews WHERE provider_id = ? AND status = 'ACTIVE'")
    .get(parseInt(providerId, 10));
  return { avgRating: r && r.avg_r ? Math.round(Number(r.avg_r) * 10) / 10 : 0, reviewCount: r ? r.cnt : 0 };
}

// ==================== 投诉争议（第四十七章） ====================

function raiseDispute(params) {
  const db = getDb();
  const userId = parseInt(params.userId, 10);
  const o = db.prepare('SELECT * FROM service_orders WHERE order_no = ?').get(String(params.orderNo || ''));
  if (!o) return { ok: false, error: '订单不存在' };
  const isBuyer = o.buyer_user_id === userId;
  const p = getProviderByUserId(userId);
  const isProvider = !!(p && p.id === o.provider_id);
  if (!isBuyer && !isProvider) return { ok: false, error: '仅订单当事人可发起争议' };

  const disputeable = [ORDER_STATUS.CONFIRMED, ORDER_STATUS.IN_SERVICE, ORDER_STATUS.COMPLETED, ORDER_STATUS.PAID];
  if (!disputeable.includes(o.status)) return { ok: false, error: `状态 ${o.status} 不允许发起争议` };

  const reason = String(params.reason || '').trim();
  if (reason.length < 10) return { ok: false, error: '请填写至少10字的争议原因' };
  const evidence = JSON.stringify(Array.isArray(params.evidence) ? params.evidence.slice(0, 10) : []);

  // 幂等：一单一笔 OPEN 争议
  const open = db.prepare("SELECT id FROM provider_disputes WHERE order_no = ? AND status = 'OPEN'").get(o.order_no);
  if (open) return { ok: false, error: '该订单已有处理中的争议' };

  const disputeNo = genNo('DSP');
  const now = nowIso();
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO provider_disputes (dispute_no, order_no, service_order_id, raised_by_user_id, raised_role, reason, evidence, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)`)
      .run(disputeNo, o.order_no, o.id, userId, isBuyer ? 'BUYER' : 'PROVIDER', reason.slice(0, 500), evidence, now);
    transitionOrder(db, o.order_no, disputeable, ORDER_STATUS.DISPUTED, { dispute_reason: reason.slice(0, 300) });
  });
  tx();
  return { ok: true, disputeNo, orderNo: o.order_no };
}

/** 后台争议处理：支持退款（买家胜）/ 驳回（恢复服务流）/ 关闭 */
function resolveDispute(params) {
  const db = getDb();
  const admin = String(params.admin || '').trim();
  const d = db.prepare('SELECT * FROM provider_disputes WHERE dispute_no = ?').get(String(params.disputeNo || ''));
  if (!d) return { ok: false, error: '争议不存在' };
  if (d.status !== 'OPEN') return { ok: false, error: '该争议已处理' };
  // 第四十七章：仲裁为管理端动作，必须留操作人（并透传给退款冲销链）
  if (!admin) return { ok: false, error: '缺少仲裁操作人' };
  const resolution = String(params.resolution || '').trim();
  if (resolution.length < 5) return { ok: false, error: '请填写处理说明' };
  const outcome = String(params.outcome || '').trim();
  if (!['REFUND_FULL', 'REFUND_PARTIAL', 'REJECT', 'CLOSE'].includes(outcome)) {
    return { ok: false, error: 'outcome 仅支持 REFUND_FULL/REFUND_PARTIAL/REJECT/CLOSE' };
  }

  const now = nowIso();
  const o = db.prepare('SELECT * FROM service_orders WHERE order_no = ?').get(d.order_no);

  if (outcome === 'REFUND_FULL') {
    const r = refundOrder({ orderNo: d.order_no, full: true, admin });
    if (!r.ok) return r;
  } else if (outcome === 'REFUND_PARTIAL') {
    const r = refundOrder({ orderNo: d.order_no, refundAmount: params.refundAmount, admin, closeOrder: true });
    if (!r.ok) return r;
  } else {
    // REJECT/CLOSE：订单恢复服务流（DISPUTED → IN_SERVICE，服务者继续履约）
    transitionOrder(db, d.order_no, [ORDER_STATUS.DISPUTED], ORDER_STATUS.IN_SERVICE);
  }

  db.prepare(`UPDATE provider_disputes SET status=?, resolution=?, handled_by=?, handled_at=? WHERE id=?`)
    .run(outcome === 'REJECT' ? 'RESOLVED_REJECT' : outcome === 'CLOSE' ? 'CLOSED' : 'RESOLVED_REFUND',
      resolution.slice(0, 500), admin, now, d.id);
  return { ok: true, disputeNo: d.dispute_no, outcome, orderNo: d.order_no, status: o ? o.status : null };
}

function listDisputes(filter) {
  const db = getDb();
  const f = filter || {};
  const where = [];
  const args = [];
  if (f.status) { where.push('status = ?'); args.push(String(f.status).toUpperCase()); }
  const rows = db.prepare(`SELECT * FROM provider_disputes ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT 200`).all(...args);
  return rows.map(r => ({
    disputeNo: r.dispute_no, orderNo: r.order_no, raisedBy: r.raised_by_user_id, raisedRole: r.raised_role,
    reason: r.reason, evidence: safeJson(r.evidence, []), status: r.status, resolution: r.resolution,
    handledBy: r.handled_by, handledAt: r.handled_at, createdAt: r.created_at,
  }));
}

function safeJson(s, fallback) {
  try { return JSON.parse(s); } catch (e) { return fallback; }
}

// ==================== 结算解冻与提现（第四十三/四十八章） ====================

/** 结算到期：PENDING 且过 settle_due_at → SETTLED（frozen → withdrawable），幂等 */
function settleDueSettlements() {
  const db = getDb();
  const now = nowIso();
  const due = db.prepare("SELECT * FROM provider_settlements WHERE settlement_status = 'PENDING' AND settle_due_at <= ?").all(now);
  let settled = 0;
  for (const s of due) {
    const tx = db.transaction(() => {
      const cur = db.prepare('SELECT settlement_status FROM provider_settlements WHERE id = ?').get(s.id);
      if (!cur || cur.settlement_status !== 'PENDING') return;
      ensureProviderAccount(db, s.provider_user_id);
      const moved = Math.min(
        db.prepare('SELECT frozen_cents FROM provider_accounts WHERE user_id = ?').get(s.provider_user_id).frozen_cents,
        s.provider_revenue_cents
      );
      db.prepare('UPDATE provider_accounts SET frozen_cents = frozen_cents - ?, withdrawable_cents = withdrawable_cents + ?, updated_at = ? WHERE user_id = ?')
        .run(moved, moved, now, s.provider_user_id);
      db.prepare("UPDATE provider_settlements SET settlement_status = 'SETTLED', settled_at = ?, updated_at = ? WHERE id = ?")
        .run(now, now, s.id);
    });
    tx();
    settled++;
  }
  if (settled) console.log(`[Provider] 结算到期解冻 ${settled} 笔`);
  return { settled };
}

/** Provider 账户总览 */
function accountSummary(userId) {
  const db = getDb();
  const uid = parseInt(userId, 10);
  ensureProviderAccount(db, uid);
  const a = db.prepare('SELECT * FROM provider_accounts WHERE user_id = ?').get(uid);
  return {
    totalRevenueYuan: centsToYuan(a.total_revenue_cents),
    withdrawableYuan: centsToYuan(a.withdrawable_cents),
    frozenYuan: centsToYuan(a.frozen_cents),
    negativeYuan: centsToYuan(a.negative_cents),
    ledgerType: 'PROVIDER_REVENUE',
  };
}

/** 第四十八章：Provider 提现申请（复用既有提现口径：窗口/门槛/限额；账本独立；ledger_type=PROVIDER_REVENUE） */
function applyProviderWithdrawal(params) {
  const cfg = getConfig();
  const db = getDb();
  const uid = parseInt(params.userId, 10);
  if (!uid || isNaN(uid)) return { ok: false, error: '用户无效' };
  const p = getProviderByUserId(uid);
  if (!p || p.status !== PROVIDER_STATUS.APPROVED) return { ok: false, error: '仅 APPROVED Provider 可提现' };

  // 提现窗口（与 commissionEngine 口径一致：每月 withdrawOpenDay 日-月末）
  const openDay = parseInt(cfg.withdrawOpenDay, 10) || 16;
  const d = new Date();
  const inWindow = d.getUTCDate() >= openDay;
  if (!inWindow) {
    return { ok: false, error: `每月${openDay}日-月末开放提现；当前不在提现窗口内，收益正常累计` };
  }

  const amountCents = yuanToCents(params.amount);
  const minCents = Math.round(parseFloat(cfg.minWithdrawYuan) * 100);
  if (amountCents < minCents) return { ok: false, error: `最低提现门槛为 ${cfg.minWithdrawYuan} 元` };

  ensureProviderAccount(db, uid);
  const acct = db.prepare('SELECT * FROM provider_accounts WHERE user_id = ?').get(uid);
  if (acct.withdrawable_cents < amountCents) return { ok: false, error: '可提现余额不足' };

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = db.prepare('SELECT COUNT(*) c FROM provider_withdrawals WHERE provider_user_id = ? AND created_at LIKE ?')
    .get(uid, today + '%').c;
  if (todayCount >= (parseInt(cfg.dailyWithdrawLimit, 10) || 1)) {
    return { ok: false, error: `每日最多申请 ${cfg.dailyWithdrawLimit} 次提现` };
  }
  const dailyLimitCents = Math.round(parseFloat(cfg.dailyWithdrawAmountLimitYuan) * 100);
  const todayAmount = db.prepare("SELECT COALESCE(SUM(amount_cents),0) s FROM provider_withdrawals WHERE provider_user_id = ? AND created_at LIKE ? AND status != 'REJECTED'")
    .get(uid, today + '%').s;
  if (todayAmount + amountCents > dailyLimitCents) {
    return { ok: false, error: `单日提现限额 ${(dailyLimitCents / 100).toFixed(0)} 元，超出部分请明日再提` };
  }

  const withdrawNo = genNo('PWD');
  const now = nowIso();
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO provider_withdrawals (withdraw_no, provider_user_id, amount_cents, ledger_type, status, created_at)
      VALUES (?, ?, ?, 'PROVIDER_REVENUE', 'PENDING_REVIEW', ?)`).run(withdrawNo, uid, amountCents, now);
    db.prepare('UPDATE provider_accounts SET withdrawable_cents = withdrawable_cents - ?, updated_at = ? WHERE user_id = ?')
      .run(amountCents, now, uid);
  });
  tx();
  console.log(`[Provider] 提现申请 user=${uid} amount=${amountCents}分 no=${withdrawNo} ledger=PROVIDER_REVENUE`);
  return { ok: true, withdrawNo, amountCents, ledgerType: 'PROVIDER_REVENUE' };
}

/** 管理端处理提现：approve（PAID 线下打款确认）/ reject（退回余额） */
function processWithdrawal(params) {
  const db = getDb();
  const w = db.prepare('SELECT * FROM provider_withdrawals WHERE withdraw_no = ?').get(String(params.withdrawNo || ''));
  if (!w) return { ok: false, error: '提现单不存在' };
  if (w.status !== 'PENDING_REVIEW') return { ok: false, error: `该提现单已处理（${w.status}）` };
  const action = String(params.action || '').trim();
  const admin = String(params.admin || '').trim();
  if (!['approve', 'reject'].includes(action)) return { ok: false, error: 'action 仅支持 approve/reject' };

  const now = nowIso();
  if (action === 'approve') {
    db.prepare("UPDATE provider_withdrawals SET status='PAID', reviewed_by=?, reviewed_at=?, paid_at=? WHERE id=?")
      .run(admin, now, now, w.id);
  } else {
    const tx = db.transaction(() => {
      db.prepare("UPDATE provider_withdrawals SET status='REJECTED', reviewed_by=?, reviewed_at=?, fail_reason=? WHERE id=?")
        .run(admin, now, String(params.reason || '').slice(0, 200), w.id);
      db.prepare('UPDATE provider_accounts SET withdrawable_cents = withdrawable_cents + ?, updated_at = ? WHERE user_id = ?')
        .run(w.amount_cents, now, w.provider_user_id);
    });
    tx();
  }
  return { ok: true, withdrawNo: w.withdraw_no, action };
}

function listWithdrawals(userId, limit) {
  const db = getDb();
  const uid = parseInt(userId, 10);
  return db.prepare('SELECT withdraw_no, amount_cents, ledger_type, status, reviewed_by, paid_at, fail_reason, created_at FROM provider_withdrawals WHERE provider_user_id = ? ORDER BY id DESC LIMIT ?')
    .all(uid, parseInt(limit, 10) || 50)
    .map(w => ({ ...w, amountYuan: centsToYuan(w.amount_cents) }));
}

// ==================== 订单列表与详情 ====================

function listOrders(filter) {
  const db = getDb();
  const f = filter || {};
  const where = [];
  const args = [];
  if (f.providerUserId) {
    const p = getProviderByUserId(f.providerUserId);
    if (!p) return { list: [], total: 0 };
    where.push('o.provider_id = ?'); args.push(p.id);
  }
  if (f.buyerUserId) { where.push('o.buyer_user_id = ?'); args.push(parseInt(f.buyerUserId, 10)); }
  if (f.status) { where.push('o.status = ?'); args.push(String(f.status).toUpperCase()); }
  if (f.providerId) { where.push('o.provider_id = ?'); args.push(parseInt(f.providerId, 10)); }
  const page = Math.max(1, parseInt(f.page, 10) || 1);
  const size = Math.min(100, Math.max(5, parseInt(f.size, 10) || 20));
  const total = db.prepare(`SELECT COUNT(*) c FROM service_orders o ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`).get(...args).c;
  const rows = db.prepare(`SELECT o.*, p.display_name provider_name FROM service_orders o
    JOIN providers p ON p.id = o.provider_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY o.id DESC LIMIT ? OFFSET ?`).all(...args, size, (page - 1) * size);
  return {
    total, page, size,
    list: rows.map(o => ({
      orderNo: o.order_no, paymentOrderId: o.payment_order_id, serviceId: o.service_id,
      providerId: o.provider_id, providerName: o.provider_name, buyerUserId: o.buyer_user_id,
      priceYuan: centsToYuan(o.price_cents), platformFeeYuan: centsToYuan(o.platform_fee_cents),
      providerRevenueYuan: centsToYuan(o.provider_revenue_cents), refundYuan: centsToYuan(o.refund_cents),
      status: o.status, requirement: o.requirement, cancelReason: o.cancel_reason, disputeReason: o.dispute_reason,
      createdAt: o.created_at, paidAt: o.paid_at, confirmedAt: o.confirmed_at, inServiceAt: o.in_service_at,
      completedAt: o.completed_at, refundedAt: o.refunded_at, closedAt: o.closed_at,
      ...providerOrderView(o),
    })),
  };
}

/** 用户端订单视图脱敏：买家ID对Provider脱敏，Provider信息对买家完整 */
function providerOrderView(o) {
  return {
    serviceSnapshot: safeJson(o.service_snapshot, {}),
  };
}

function getOrderDetail(orderNo) {
  const db = getDb();
  const o = db.prepare('SELECT * FROM service_orders WHERE order_no = ?').get(String(orderNo));
  if (!o) return null;
  const settlement = db.prepare('SELECT * FROM provider_settlements WHERE order_no = ?').get(o.order_no);
  const disputes = db.prepare('SELECT dispute_no, status, reason, resolution, handled_by, created_at FROM provider_disputes WHERE order_no = ? ORDER BY id DESC').all(o.order_no);
  return {
    orderNo: o.order_no, paymentOrderId: o.payment_order_id, serviceId: o.service_id,
    serviceSnapshot: safeJson(o.service_snapshot, {}), providerId: o.provider_id,
    buyerUserId: o.buyer_user_id, priceYuan: centsToYuan(o.price_cents),
    platformFeeYuan: centsToYuan(o.platform_fee_cents), providerRevenueYuan: centsToYuan(o.provider_revenue_cents),
    refundYuan: centsToYuan(o.refund_cents), status: o.status,
    requirement: o.requirement, cancelReason: o.cancel_reason, disputeReason: o.dispute_reason,
    timeline: {
      createdAt: o.created_at, paidAt: o.paid_at, confirmedAt: o.confirmed_at,
      inServiceAt: o.in_service_at, completedAt: o.completed_at,
      refundedAt: o.refunded_at, closedAt: o.closed_at,
    },
    settlement: settlement ? {
      settlementNo: settlement.settlement_no, grossYuan: centsToYuan(settlement.gross_cents),
      refundYuan: centsToYuan(settlement.refund_cents), platformFeeYuan: centsToYuan(settlement.platform_fee_cents),
      providerRevenueYuan: centsToYuan(settlement.provider_revenue_cents),
      settlementStatus: settlement.settlement_status, settleDueAt: settlement.settle_due_at, settledAt: settlement.settled_at,
    } : null,
    disputes,
  };
}

// ==================== Provider 本人工作台（第五十一章） ====================

function providerDashboard(userId) {
  const db = getDb();
  const uid = parseInt(userId, 10);
  const p = getProviderByUserId(uid);
  if (!p) return { ok: false, error: '尚未申请 Provider' };
  const rating = providerRating(p.id);
  const orders = db.prepare(`SELECT status, COUNT(*) c FROM service_orders WHERE provider_id = ? GROUP BY status`).all(p.id);
  const statusCount = {};
  for (const r of orders) statusCount[r.status] = r.c;
  const revenue = db.prepare(`SELECT COALESCE(SUM(gross_cents),0) g, COALESCE(SUM(refund_cents),0) rf,
    COALESCE(SUM(platform_fee_cents),0) pf, COALESCE(SUM(provider_revenue_cents),0) pr FROM provider_settlements WHERE provider_id = ?`).get(p.id);
  const services = db.prepare('SELECT COUNT(*) c FROM provider_services WHERE provider_id = ?').get(p.id).c;
  return {
    ok: true,
    provider: {
      providerId: p.id, displayName: p.display_name, avatar: p.avatar, bio: p.bio,
      category: p.category, expertise: safeJson(p.expertise, []), qualification: p.qualification,
      status: p.status, appliedAt: p.applied_at, reviewedAt: p.reviewed_at, rejectReason: p.reject_reason,
      compliance: zhongyiPositioningNote(p.category),
    },
    services: { total: services, online: db.prepare("SELECT COUNT(*) c FROM provider_services WHERE provider_id = ? AND status='ONLINE'").get(p.id).c },
    orders: statusCount,
    rating,
    revenue: {
      grossYuan: centsToYuan(revenue.g), refundYuan: centsToYuan(revenue.rf),
      platformFeeYuan: centsToYuan(revenue.pf), providerRevenueYuan: centsToYuan(revenue.pr),
    },
    account: accountSummary(uid),
    withdrawals: listWithdrawals(uid, 10),
  };
}

// ==================== 管理端统计（第五十章） ====================

function adminStats() {
  const db = getDb();
  const providers = db.prepare('SELECT status, COUNT(*) c FROM providers GROUP BY status').all();
  const pStat = {};
  for (const r of providers) pStat[r.status] = r.c;
  const orders = db.prepare('SELECT status, COUNT(*) c FROM service_orders GROUP BY status').all();
  const oStat = {};
  for (const r of orders) oStat[r.status] = r.c;
  const revenue = db.prepare(`SELECT COALESCE(SUM(gross_cents),0) g, COALESCE(SUM(refund_cents),0) rf,
    COALESCE(SUM(platform_fee_cents),0) pf, COALESCE(SUM(provider_revenue_cents),0) pr FROM provider_settlements`).get();
  const disputes = db.prepare("SELECT COUNT(*) c FROM provider_disputes WHERE status = 'OPEN'").get().c;
  const withdrawals = db.prepare("SELECT COUNT(*) c FROM provider_withdrawals WHERE status = 'PENDING_REVIEW'").get().c;
  return {
    providers: { ...pStat, total: Object.values(pStat).reduce((a, b) => a + b, 0) },
    services: {
      online: db.prepare("SELECT COUNT(*) c FROM provider_services WHERE status='ONLINE'").get().c,
      total: db.prepare('SELECT COUNT(*) c FROM provider_services').get().c,
    },
    orders: { ...oStat, total: Object.values(oStat).reduce((a, b) => a + b, 0) },
    revenue: {
      grossYuan: centsToYuan(revenue.g), refundYuan: centsToYuan(revenue.rf),
      platformFeeYuan: centsToYuan(revenue.pf), providerRevenueYuan: centsToYuan(revenue.pr),
    },
    disputesOpen: disputes,
    withdrawalsPending: withdrawals,
  };
}

function listProvidersAdmin(filter) {
  const db = getDb();
  const f = filter || {};
  const where = [];
  const args = [];
  if (f.status) { where.push('status = ?'); args.push(String(f.status).toUpperCase()); }
  if (f.q) { where.push('(display_name LIKE ? OR contact LIKE ?)'); args.push('%' + f.q + '%', '%' + f.q + '%'); }
  const page = Math.max(1, parseInt(f.page, 10) || 1);
  const size = Math.min(100, Math.max(5, parseInt(f.size, 10) || 20));
  const total = db.prepare(`SELECT COUNT(*) c FROM providers ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`).get(...args).c;
  const rows = db.prepare(`SELECT * FROM providers ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...args, size, (page - 1) * size);
  return {
    total, page, size,
    list: rows.map(p => ({
      providerId: p.id, userId: p.user_id, displayName: p.display_name, category: p.category,
      status: p.status, contact: p.contact, realName: p.real_name, idCardLast4: p.id_card_last4,
      payout: { alipay: p.payout_alipay, wechat: p.payout_wechat, bank: p.payout_bank },
      appliedAt: p.applied_at, reviewedAt: p.reviewed_at, reviewedBy: p.reviewed_by, rejectReason: p.reject_reason,
      ...providerRating(p.id),
    })),
  };
}

function listSettlementsAdmin(filter) {
  const db = getDb();
  const f = filter || {};
  const where = [];
  const args = [];
  if (f.status) { where.push('settlement_status = ?'); args.push(String(f.status).toUpperCase()); }
  if (f.providerId) { where.push('provider_id = ?'); args.push(parseInt(f.providerId, 10)); }
  const page = Math.max(1, parseInt(f.page, 10) || 1);
  const size = Math.min(100, Math.max(5, parseInt(f.size, 10) || 20));
  const total = db.prepare(`SELECT COUNT(*) c FROM provider_settlements ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`).get(...args).c;
  const rows = db.prepare(`SELECT s.*, p.display_name FROM provider_settlements s JOIN providers p ON p.id = s.provider_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY s.id DESC LIMIT ? OFFSET ?`).all(...args, size, (page - 1) * size);
  return {
    total, page, size,
    list: rows.map(s => ({
      settlementNo: s.settlement_no, orderNo: s.order_no, providerId: s.provider_id, providerName: s.display_name,
      grossYuan: centsToYuan(s.gross_cents), refundYuan: centsToYuan(s.refund_cents),
      platformFeeYuan: centsToYuan(s.platform_fee_cents), providerRevenueYuan: centsToYuan(s.provider_revenue_cents),
      settlementStatus: s.settlement_status, settleDueAt: s.settle_due_at, settledAt: s.settled_at, createdAt: s.created_at,
    })),
  };
}

function listWithdrawalsAdmin(filter) {
  const db = getDb();
  const f = filter || {};
  const where = [];
  const args = [];
  if (f.status) { where.push('w.status = ?'); args.push(String(f.status).toUpperCase()); }
  const page = Math.max(1, parseInt(f.page, 10) || 1);
  const size = Math.min(100, Math.max(5, parseInt(f.size, 10) || 20));
  const total = db.prepare(`SELECT COUNT(*) c FROM provider_withdrawals w ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`).get(...args).c;
  const rows = db.prepare(`SELECT w.*, p.display_name FROM provider_withdrawals w JOIN providers p ON p.user_id = w.provider_user_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY w.id DESC LIMIT ? OFFSET ?`).all(...args, size, (page - 1) * size);
  return {
    total, page, size,
    list: rows.map(w => ({
      withdrawNo: w.withdraw_no, providerUserId: w.provider_user_id, providerName: w.display_name,
      amountYuan: centsToYuan(w.amount_cents), ledgerType: w.ledger_type, status: w.status,
      reviewedBy: w.reviewed_by, paidAt: w.paid_at, failReason: w.fail_reason, createdAt: w.created_at,
    })),
  };
}

// ==================== 调度器（结算解冻） ====================

let _schedTimer = null;
function initScheduler() {
  if (_schedTimer) return;
  const tick = () => { try { settleDueSettlements(); } catch (e) { console.error('[Provider] 结算调度异常:', e.message); } };
  tick();
  _schedTimer = setInterval(tick, 6 * 3600 * 1000);
  _schedTimer.unref && _schedTimer.unref();
  console.log('[Provider] ✅ Provider 结算解冻调度器已启动（每6小时自检 T+settleDays 到期）');
}

// ==================== 导出 ====================

module.exports = {
  // 常量
  PROVIDER_STATUS, SERVICE_STATUS, ORDER_STATUS, ORDER_TRANSITIONS, SETTLEMENT_STATUS, DELIVERY_TYPES,
  // 配置
  getConfig, saveConfig,
  // DB
  getDb,
  // 合规
  zhongyiComplianceScan, zhongyiPositioningNote,
  centsToYuan, yuanToCents,
  // Provider 档案
  applyProvider, reviewProvider, getProviderByUserId, getProviderById, isApprovedProvider,
  // 服务
  createService, updateService, setServiceStatus, getService, getServicePrice, listServices,
  // 订单
  createServiceOrder, bindPaymentOrder, onOrderPaid, confirmOrder, startService, completeOrder,
  requestCancel, refundOrder, listOrders, getOrderDetail,
  // 评价
  reviewOrder, listReviews, providerRating,
  // 争议
  raiseDispute, resolveDispute, listDisputes,
  // 结算与提现
  settleDueSettlements, accountSummary, applyProviderWithdrawal, processWithdrawal, listWithdrawals,
  // 工作台与后台
  providerDashboard, adminStats, listProvidersAdmin, listSettlementsAdmin, listWithdrawalsAdmin,
  // 调度
  initScheduler,
};
