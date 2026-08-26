// ============================================================================
// 支付路由模块 - v20.4
// 提供支付下单、查询、关闭、回调相关的 Express 路由
// 路由前缀：/api/payment
// 路由列表：
//   POST /api/payment/create            — 创建支付订单
//   POST /api/payment/query             — 查询订单状态
//   POST /api/payment/close             — 关闭订单
//   POST /api/payment/callback/wechat   — 微信支付回调
//   POST /api/payment/callback/alipay   — 支付宝回调
//
// v25.0.47_4：微信支付V3 JSAPI通道已实装（wechatPayV3.js，零外部依赖）
//   - POST /api/payment/create          微信JSAPI下单（需extra.openid）
//   - POST /api/payment/query           本地状态+微信侧主动对账
//   - POST /api/payment/close           本地关单+微信侧关单
//   - POST /api/payment/callback/wechat 验签+解密+订单状态机（幂等）
//   - GET  /api/payment/wechat/oauth-config 网页授权跳转URL构造
//   - GET  /api/payment/wechat/openid   code换openid
//   启用条件：.env 配置 WECHAT_MCH_ID/WECHAT_APPID/WECHAT_API_V3_KEY/
//            WECHAT_API_CERT_PATH/WECHAT_CERT_SERIAL_NO 后自动生效
// ============================================================================

'use strict';

const express = require('express');
const wechatPayV3 = require('./wechatPayV3');

const router = express.Router();

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 从请求中提取客户端 IP
 * @param {Object} req - Express 请求对象
 * @returns {string} IP 地址
 */
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    '0.0.0.0'
  );
}

/**
 * 统一 JSON 响应格式
 * @param {Object} res - Express 响应对象
 * @param {number} status - HTTP 状态码
 * @param {boolean} success - 是否成功
 * @param {string} message - 消息
 * @param {Object} data - 额外数据
 */
function jsonResponse(res, status, success, message, data = null) {
  const body = { success, message };
  if (data !== null) {
    body.data = data;
  }
  return res.status(status).json(body);
}

/**
 * 生成订单号
 * 规则：YD + 年月日时分秒 + 6位随机数
 * @returns {string} 订单号
 */
function generateOrderId() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());
  const random = Math.floor(100000 + Math.random() * 900000).toString();
  return 'YD' + timestamp + random;
}

/**
 * 检查支付通道是否已启用
 * @returns {boolean}
 */
function isPaymentEnabled() {
  // FIX-PAY-UNBIND-WECHAT-APPID: 支付总开关仅受商户核心参数控制
  // （商户号+APIv3密钥+私钥文件+证书序列号），与公众号 AppID/AppSecret 完全解耦。
  // Native扫码支付（全场景兜底通道）在上述4项齐全时即可下单收款；
  // JSAPI/网页授权在公众号参数补充后自动启用，无需改代码。
  const wechatConfigured = !!(
    process.env.WECHAT_MCH_ID &&
    process.env.WECHAT_API_V3_KEY &&
    process.env.WECHAT_API_CERT_PATH &&
    process.env.WECHAT_CERT_SERIAL_NO
  );
  const alipayConfigured = !!(
    process.env.ALIPAY_APP_ID &&
    process.env.ALIPAY_APP_PRIVATE_KEY &&
    process.env.ALIPAY_PUBLIC_KEY
  );
  return wechatConfigured || alipayConfigured;
}

/**
 * 友好的"支付通道即将开放"响应
 */
function paymentNotReadyResponse(res) {
  return jsonResponse(res, 200, false, '支付通道即将开放，敬请期待', {
    enabled: false,
    channels: {
      // FIX-PAY-UNBIND: 微信通道可用性以商户核心参数为准（不含公众号AppID）
      wechat: !!(process.env.WECHAT_MCH_ID && process.env.WECHAT_API_V3_KEY),
      alipay: !!process.env.ALIPAY_APP_ID,
    },
  });
}

// ============================================================================
// 订单类型与状态常量（与 paymentTypes.ts 枚举值保持一致）
// ============================================================================

const ORDER_TYPES = {
  SINGLE_UNLOCK: 'SINGLE_UNLOCK',
  MEMBERSHIP: 'MEMBERSHIP',
  POINTS_RECHARGE: 'POINTS_RECHARGE',
  AI_PACKAGE: 'AI_PACKAGE',
  BATCH_INTERPRET: 'BATCH_INTERPRET',
};

const ORDER_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  CLOSED: 'CLOSED',
  REFUNDED: 'REFUNDED',
};

// 合规口径标题
const COMPLIANCE_TITLES = {
  SINGLE_UNLOCK: '传统文化学习资料深度解读（单次）',
  MEMBERSHIP: '传统文化学习平台会员服务',
  POINTS_RECHARGE: '传统文化学习平台积分充值',
  AI_PACKAGE: '传统文化AI智能解读服务套餐',
  BATCH_INTERPRET: '传统文化号码批量解读服务',
};

// ============================================================================
// v25.0.47_7 价格SSOT：公开定价端点（无鉴权，前端展示与下单金额来源）
// 读取后台管理配置 data/admin-ai-config.json + data/admin-membership-config.json，
// 管理端改价后此处自动生效（前端带缓存，最迟5分钟同步）。
// ============================================================================

/** AI时长套餐默认值（与前端 aiService.AI_PAID_PLANS 保持一致） */
const DEFAULT_AI_TIME_PLANS = [
  { key: 'single', name: '单次解读', price: 2.9, duration: '1次', desc: '单次AI深度解读' },
  { key: 'daily', name: '日卡', price: 9.9, duration: '24小时', desc: '当日无限次解读' },
  { key: 'monthly', name: '月卡', price: 39.9, duration: '30天', desc: '全工具月度畅享' },
  { key: 'quarterly', name: '季卡', price: 99.9, duration: '90天', desc: '季度无限解读' },
  { key: 'yearly', name: '年卡', price: 199, duration: '365天', desc: '全年无限解读' },
];

const DEFAULT_SINGLE_UNLOCK_PRICE = 9.9;

/** 批量解读默认定价（v25.0.47_12：非会员200元/次，会员折扣与档位强对齐） */
const DEFAULT_BATCH_CONFIG = {
  basePrice: 200,
  discounts: { basic: 1, monthly: 0.95, quarterly: 0.85, yearly: 0.8, lifetime: 0 },
  maxNumbers: 100,
};

/** 读取批量解读后台配置（admin-batch-config.json，未配置用默认） */
function readBatchConfig() {
  const cfg = readAdminConfig('admin-batch-config.json');
  if (!cfg) return DEFAULT_BATCH_CONFIG;
  return {
    basePrice: (typeof cfg.basePrice === 'number' && cfg.basePrice > 0) ? cfg.basePrice : DEFAULT_BATCH_CONFIG.basePrice,
    discounts: Object.assign({}, DEFAULT_BATCH_CONFIG.discounts, cfg.discounts || {}),
    maxNumbers: (typeof cfg.maxNumbers === 'number' && cfg.maxNumbers > 0) ? cfg.maxNumbers : DEFAULT_BATCH_CONFIG.maxNumbers,
  };
}

/** 会员套餐默认值（与 server.js GET /api/admin/membership-config 一致） */
const DEFAULT_MEMBERSHIP_PLANS = [
  { level: 'basic', name: '普通会员', price: 0, originalPrice: 0, duration: '永久免费', features: ['全部14款排盘工具（基础排盘）', '每日3次通用AI问答', '中医基础内容查询', '模拟考试初级题库', '社区浏览发帖 · 签到积分'], badge: '', highlighted: false, enabled: true },
  { level: 'monthly', name: '月度会员', price: 37, originalPrice: 59, duration: '30天', features: ['全部14款排盘工具', '每日50次通用AI问答', 'B类工具月赠3次，超出按¥9.9/次', '批量解读享95折', '中医学习库全部开放', '模拟考试全等级开放', '签到积分2倍 · 无广告体验', '专属标识/头像框 · 导出排盘报告'], badge: '热门', highlighted: false, enabled: true },
  { level: 'quarterly', name: '季度会员', price: 99, originalPrice: 117, duration: '90天', features: ['全部14款排盘工具', '每日50次通用AI问答', 'B类工具月赠8次，超出按¥9.9/次', '批量解读享85折', '中医学习库全部开放', '模拟考试全等级开放', '签到积分2倍 · 无广告体验', '专属标识/头像框 · 导出排盘报告'], badge: '', highlighted: false, enabled: true },
  { level: 'yearly', name: '年度会员', price: 374, originalPrice: 458, duration: '365天', features: ['全部14款排盘工具', '通用AI问答无限次', 'B类工具月赠15次，超出按¥9.9/次', '批量解读享8折', '中医学习库全部开放', '模拟考试全等级开放', '签到积分3倍 · 无广告体验', '专属标识/头像框 · 导出排盘报告', '专属客服支持'], badge: '推荐', highlighted: true, enabled: true },
  { level: 'lifetime', name: '终身会员', price: 3600, originalPrice: 4500, duration: '永久有效', features: ['全部14款排盘工具', '通用AI问答无限次', 'B类工具无限次免费使用', '批量解读免费使用', '中医学习库全部开放', '模拟考试全等级开放', '签到积分5倍 · 无广告体验', '专属标识/头像框 · 导出排盘报告', '专属客服支持 · 新功能优先体验'], badge: '尊享', highlighted: false, enabled: true },
];

/** 读取后台配置 JSON（不存在或损坏返回 null） */
function readAdminConfig(filename) {
  try {
    const fs = require('fs');
    const path = require('path');
    const p = path.join(__dirname, 'data', filename);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (e) {
    return null;
  }
}

/** GET /api/payment/pricing — 公开定价（价格SSOT） */
router.get('/pricing', (req, res) => {
  try {
    const aiCfg = readAdminConfig('admin-ai-config.json');
    const memberCfg = readAdminConfig('admin-membership-config.json');

    const timePlans = Array.isArray(aiCfg && aiCfg.timePlans) && aiCfg.timePlans.length
      ? aiCfg.timePlans
      : DEFAULT_AI_TIME_PLANS;
    const singleUnlockPrice = typeof (aiCfg && aiCfg.singleUnlockPrice) === 'number' && aiCfg.singleUnlockPrice > 0
      ? aiCfg.singleUnlockPrice
      : DEFAULT_SINGLE_UNLOCK_PRICE;
    const membershipPlans = Array.isArray(memberCfg && memberCfg.plans) && memberCfg.plans.length
      ? memberCfg.plans.filter(p => p.enabled !== false)
      : DEFAULT_MEMBERSHIP_PLANS;

    res.json({
      success: true,
      data: {
        aiPlans: timePlans,
        singleUnlockPrice,
        membershipPlans,
        // v25.0.47_12: 批量解读定价（零售价+各档位折扣）
        batchInterpret: readBatchConfig(),
        aiGlobalEnabled: aiCfg ? aiCfg.globalEnabled !== false : true,
        updatedAt: (aiCfg && aiCfg.updatedAt) || (memberCfg && memberCfg.updatedAt) || null,
      },
    });
  } catch (error) {
    // 配置异常时回退默认值，保证前端可用
    res.json({
      success: true,
      data: {
        aiPlans: DEFAULT_AI_TIME_PLANS,
        singleUnlockPrice: DEFAULT_SINGLE_UNLOCK_PRICE,
        membershipPlans: DEFAULT_MEMBERSHIP_PLANS,
        batchInterpret: DEFAULT_BATCH_CONFIG,
        aiGlobalEnabled: true,
        updatedAt: null,
      },
    });
  }
});

// ============================================================================
// 订单存储：内存缓存 + user_orders 表持久化（v25.0.47_5 统一后台订单中心）
// ============================================================================

const ordersStore = new Map();

// SQLite 持久化（user_orders 表：与注册系统同库，仅追加/更新订单行）
let _ordersDb = null;
function getOrdersDb() {
  if (_ordersDb) return _ordersDb;
  try {
    const Database = require('better-sqlite3');
    const dbPath = process.env.DB_PATH || '/root/backend-auth/data/yandao_users.db';
    if (!require('fs').existsSync(dbPath)) return null;
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_user_orders_order_no ON user_orders(order_no)');
    // v25.0.47_8: 权益交付持久化标记（0/1），重启后由 query 接口补交付
  try {
    const cols = db.prepare('PRAGMA table_info(user_orders)').all().map(c => c.name);
    if (!cols.includes('benefit_delivered')) {
      db.exec('ALTER TABLE user_orders ADD COLUMN benefit_delivered INTEGER DEFAULT 0');
      console.log('[payment] user_orders 已添加 benefit_delivered 字段');
    }
    // v25.0.47_21: 微信交易号持久化（后台订单明细展示"是谁通过哪笔交易支付"）
    if (!cols.includes('transaction_id')) {
      db.exec('ALTER TABLE user_orders ADD COLUMN transaction_id TEXT');
      console.log('[payment] user_orders 已添加 transaction_id 字段');
    }
  } catch (e) {
    console.error('[payment] benefit_delivered 迁移失败:', e.message);
  }
  // v25.0.60 AUDIT-20260826 P1-5: 按次/时卡权益服务端持久化（新增表，零破坏）
  // 此前 SINGLE_UNLOCK/AI 时卡权益只存前端 localStorage，换设备/重装即丢失
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_entitlements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        entitlement_key TEXT NOT NULL,
        expire_at TEXT,
        source_order_no TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, entitlement_key)
      )
    `);
  } catch (e) {
    console.error('[payment] user_entitlements 建表失败:', e.message);
  }
    _ordersDb = db;
    return db;
  } catch (e) {
    console.error('[payment] 订单库初始化失败（仅内存模式）:', e.message);
    return null;
  }
}

function persistOrder(order) {
  try {
    const db = getOrdersDb();
    if (!db) return;
    db.prepare(`INSERT INTO user_orders (user_id, order_no, amount, order_type, status, payment_method, created_at, paid_at, benefit_delivered, transaction_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(order_no) DO UPDATE SET status=excluded.status, payment_method=excluded.payment_method, paid_at=excluded.paid_at, benefit_delivered=excluded.benefit_delivered, transaction_id=CASE WHEN excluded.transaction_id IS NOT NULL AND excluded.transaction_id != '' THEN excluded.transaction_id ELSE user_orders.transaction_id END`)
      .run(String(order.userId || ''), order.orderId, Number(order.amount) || 0, order.type, order.status,
           order.channel || '', order.createdAt, order.paidAt, order.benefitDelivered ? 1 : 0, order.transactionId || null);
  } catch (e) {
    console.error('[payment] 订单持久化失败:', e.message);
  }
}

// 模块加载时回灌最近订单到内存缓存（重启后仍可查单/关单/对账）
(function loadPersistedOrders() {
  try {
    const db = getOrdersDb();
    if (!db) return;
    const rows = db.prepare(`SELECT order_no, user_id, amount, order_type, status, payment_method, created_at, paid_at, benefit_delivered, transaction_id
                             FROM user_orders WHERE created_at >= datetime('now', '-30 days') ORDER BY id DESC LIMIT 500`).all();
    for (const r of rows) {
      ordersStore.set(r.order_no, {
        orderId: r.order_no,
        userId: String(r.user_id || ''),
        type: r.order_type,
        amount: r.amount,
        title: COMPLIANCE_TITLES[r.order_type] || '传统文化学习服务',
        description: '',
        status: r.status,
        channel: r.payment_method || null,
        createdAt: r.created_at,
        paidAt: r.paid_at,
        benefitDelivered: !!r.benefit_delivered,
        transactionId: r.transaction_id || null,
        extra: {},
      });
    }
    console.log(`[payment] 已回灌 ${rows.length} 条近30天订单到内存缓存`);
  } catch (e) {
    console.error('[payment] 订单回灌失败:', e.message);
  }
})();

// ============================================================================
// v25.0.47_8 订单权益交付：订单首次 PAID 后发放真实权益（服务端唯一事实源）
// - MEMBERSHIP: 更新 users.member_level + membership_expiry（续费在现有有效期上顺延）
// - POINTS_RECHARGE: user_assets.points_balance 入账 + points_transactions 流水
// - v25.0.60 AUDIT-20260826 P1-5: SINGLE_UNLOCK/AI时卡权益写入 user_entitlements（服务端持久化）
// - 幂等：benefit_delivered 持久化标记；失败留待 query 接口补交付
// ============================================================================
const MEMBERSHIP_LEVEL_DAYS = { monthly: 30, quarterly: 90, yearly: 365, lifetime: -1 };
// AI 时卡 → 天数映射（与前端 AI_PAID_PLANS 一致）
const AI_PLAN_DAYS = { single: 1, daily: 1, monthly: 30, quarterly: 90, yearly: 365 };

// P1-10 修复：到期时间统一取「北京时间当日 23:59:59」。
// 原实现直接 base+days 存 UTC ISO 串，北京时间晚 8 点后购买的会员比应得时长少 8 小时；
// 存北京当日末尾的 ISO 串与前端 new Date(...).getTime() 解析完全兼容。
function beijingEndOfDay(ms) {
  const d = new Date(ms + 8 * 3600 * 1000);
  d.setUTCHours(23, 59, 59, 999);
  return d.toISOString();
}

function deliverOrderBenefits(order) {
  if (!order || order.benefitDelivered) return;
  if (order.type !== 'MEMBERSHIP' && order.type !== 'POINTS_RECHARGE') {
    // v25.0.60 P1-5：SINGLE_UNLOCK/AI时卡权益服务端入库（换设备/重装不再丢失）
    // B 类工具单次解锁（无 ai_plan_ 前缀）expire_at = NULL 表示永久
    try {
      const Database = require('better-sqlite3');
      const dbPath = process.env.DB_PATH || '/root/backend-auth/data/yandao_users.db';
      if (require('fs').existsSync(dbPath)) {
        const db = new Database(dbPath);
        try {
          const uid = parseInt(order.userId, 10);
          const targetId = order.extra && order.extra.unlockTargetId;
          if (!isNaN(uid) && targetId) {
            let expireAt = null;
            const m = /^ai_plan_(\w+)$/.exec(targetId);
            if (m && AI_PLAN_DAYS[m[1]]) {
              expireAt = beijingEndOfDay(Date.now() + AI_PLAN_DAYS[m[1]] * 86400000);
            }
            db.prepare(`INSERT INTO user_entitlements (user_id, entitlement_key, expire_at, source_order_no)
                        VALUES (?, ?, ?, ?)
                        ON CONFLICT(user_id, entitlement_key)
                        DO UPDATE SET expire_at = CASE
                          WHEN user_entitlements.expire_at IS NULL THEN NULL
                          WHEN excluded.expire_at IS NULL THEN user_entitlements.expire_at
                          ELSE excluded.expire_at END,
                          source_order_no = excluded.source_order_no`)
              .run(uid, targetId, expireAt, order.orderId);
            console.log(`[payment] 单项权益已入库 orderId=${order.orderId} userId=${uid} key=${targetId} expire=${expireAt || '永久'}`);
          }
        } finally { db.close(); }
      }
    } catch (e) {
      console.error(`[payment] 单项权益入库失败 orderId=${order.orderId}:`, e.message);
    }
    order.benefitDelivered = true;
    persistOrder(order);
    return;
  }
  let delivered = false;
  try {
    const Database = require('better-sqlite3');
    const dbPath = process.env.DB_PATH || '/root/backend-auth/data/yandao_users.db';
    if (!require('fs').existsSync(dbPath)) throw new Error('数据库文件不存在');
    const db = new Database(dbPath);
    try {
      db.pragma('busy_timeout = 5000');
      const uid = parseInt(order.userId, 10);
      if (isNaN(uid)) throw new Error('userId 无效: ' + order.userId);

      if (order.type === 'MEMBERSHIP') {
        const level = order.extra && order.extra.membershipLevel;
        const days = MEMBERSHIP_LEVEL_DAYS[level];
        if (!days) throw new Error('membershipLevel 无效: ' + level);
        let expireTime = null;
        if (days > 0) {
          let base = Date.now();
          try {
            const row = db.prepare('SELECT membership_expiry FROM users WHERE user_id = ?').get(uid);
            if (row && row.membership_expiry) {
              const cur = new Date(row.membership_expiry).getTime();
              if (cur > base) base = cur;
            }
          } catch (e) {}
          expireTime = beijingEndOfDay(base + days * 86400000);
        }
        const info = db.prepare('UPDATE users SET member_level = ?, membership_expiry = ? WHERE user_id = ?')
          .run(level, expireTime, uid);
        if (info.changes === 0) throw new Error('用户不存在: ' + uid);
        // P2-12 修复：同步写 user_assets.member_expire_at（字段一直存在但从未写入）
        try {
          db.prepare('UPDATE user_assets SET member_level = ?, member_expire_at = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
            .run(level, expireTime, uid);
        } catch (e) {}
        console.log(`[payment] 会员权益已交付 orderId=${order.orderId} userId=${order.userId} level=${level} expire=${expireTime || '永久'}`);
      } else if (order.type === 'POINTS_RECHARGE') {
        const points = parseInt(order.extra && order.extra.pointsAmount, 10);
        if (!points || points <= 0) throw new Error('pointsAmount 无效');
        db.prepare(`INSERT OR IGNORE INTO user_assets (user_id, points_balance, star_rating, star_rating_count, member_level)
          VALUES (?, 0, 0, 0, 'basic')`).run(uid);
        db.prepare('UPDATE user_assets SET points_balance = points_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
          .run(points, uid);
        const row = db.prepare('SELECT points_balance FROM user_assets WHERE user_id = ?').get(uid);
        db.prepare('INSERT INTO points_transactions (user_id, tx_type, amount, balance_after, ref_id, note) VALUES (?, ?, ?, ?, ?, ?)')
          .run(uid, 'recharge', points, row ? row.points_balance : 0, order.orderId, '积分充值订单交付');
        console.log(`[payment] 积分权益已交付 orderId=${order.orderId} userId=${order.userId} points=${points}`);
      }
      delivered = true;
    } finally {
      db.close();
    }
  } catch (e) {
    console.error(`[payment] 权益交付失败 orderId=${order && order.orderId}:`, e.message);
  }
  if (delivered) {
    order.benefitDelivered = true;
    persistOrder(order);
  }
}

/**
 * 创建订单（内存 + SQLite 持久化）
 */
function createOrderRecord(orderData) {
  const order = {
    orderId: generateOrderId(),
    userId: orderData.userId,
    type: orderData.type,
    amount: orderData.amount,
    title: orderData.title || COMPLIANCE_TITLES[orderData.type] || '传统文化学习服务',
    description: orderData.description || '',
    status: ORDER_STATUS.PENDING,
    channel: null,
    createdAt: new Date().toISOString(),
    paidAt: null,
    extra: orderData.extra || {},
  };
  ordersStore.set(order.orderId, order);
  persistOrder(order);
  return order;
}

/**
 * 查询订单
 */
function getOrderRecord(orderId) {
  return ordersStore.get(orderId) || null;
}

/**
 * 更新订单状态
 */
function updateOrderRecord(orderId, status, channel) {
  const order = ordersStore.get(orderId);
  if (!order) return null;
  order.status = status;
  if (channel) order.channel = channel;
  if (status === ORDER_STATUS.PAID && !order.paidAt) {
    order.paidAt = new Date().toISOString();
    // P9-推广中心：订单首次支付成功 → 触发被邀请人首次有效付费奖励（单层/幂等）
    try {
      const { grantFirstPayReward } = require('./register_routes');
      const r = grantFirstPayReward(order.userId, order.orderId);
      if (r && r.granted) {
        console.log(`[payment] 首付费奖励已发放 orderId=${order.orderId} inviter获得=${r.points}积分`);
      }
    } catch (e) {
      console.error('[payment] 首付费奖励发放失败:', e.message);
    }
    // v25.0.47_8 订单权益交付：会员开通/积分入账（幂等，失败由 query 接口补交付）
    try {
      deliverOrderBenefits(order);
    } catch (e) {
      console.error('[payment] 权益交付异常:', e.message);
    }
    // v25.0.41 订单事件驱动返佣：支付成功即由服务端按订单金额发放一/二级返佣（前端上报仅作兜底对账）
    try {
      const { grantConsumptionRebate } = require('./register_routes');
      const rb = grantConsumptionRebate(order.userId, order.orderId, order.amount, order.title);
      if (rb && rb.granted) {
        console.log(`[payment] 订单事件返佣已入账 orderId=${order.orderId} L1=${rb.level1Points}分 L2=${rb.level2Points}分`);
      }
    } catch (e) {
      console.error('[payment] 订单事件返佣发放失败:', e.message);
    }
  }
  if (status === ORDER_STATUS.REFUNDED) {
    // v25.0.41 退款返佣冲正：退款即扣回该订单已发放的一/二级返佣积分（幂等）
    try {
      const { reverseConsumptionRebate } = require('./register_routes');
      const rv = reverseConsumptionRebate(orderId);
      if (rv && rv.reversed) {
        console.log(`[payment] 退款返佣冲正完成 orderId=${orderId} L1扣回=${rv.level1PointsReversed}分 L2扣回=${rv.level2PointsReversed}分`);
      }
    } catch (e) {
      console.error('[payment] 退款返佣冲正失败:', e.message);
    }
  }
  persistOrder(order);
  // P8-DISTRIBUTION-COMMISSION-AUTO：支付成功→一级分佣自动记账（幂等，commissionEngine 内部防重）
  if (status === ORDER_STATUS.PAID) {
    try {
      const commissionEngine = require('./commissionEngine');
      const cr = commissionEngine.grantCommission(order);
      if (cr && cr.granted) {
        // v25.0.47_10: 分佣结果回写订单（后台订单中心显示真实佣金状态）
        order.commissionStatus = 'COMMISSION_FROZEN';
        order.commissionCents = cr.commissionCents;
        order.commissionInviterId = cr.inviterId;
        persistOrder(order);
        console.log(`[payment] 一级分佣已入账 orderId=${order.orderId} inviter=${cr.inviterId} commission=${cr.commissionCents}分`);
      } else if (cr && cr.reason) {
        order.commissionStatus = 'NO_COMMISSION:' + cr.reason;
        persistOrder(order);
      }
    } catch (e) {
      console.error('[payment] 分佣记账失败:', e.message);
    }
    // DEV-V22 合伙人渠道分佣V2：支付成功→渠道合伙人基础佣金50%+直属培养奖励5%（幂等，engine内部防重）
    try {
      const partnerEngine = require('./partnerEngine');
      const pr = partnerEngine.grantPartnerCommission(order);
      if (pr && pr.granted) {
        order.partnerCommissionStatus = 'PARTNER_FROZEN';
        order.partnerId = pr.partnerId;
        console.log(`[payment] 合伙人渠道分佣已入账 orderId=${order.orderId} partner=${pr.partnerId} net=${pr.netCents}分 佣金=${pr.commissionCents}分 培养奖励=${pr.nurtureCents}分`);
      } else if (pr && pr.reason && pr.reason !== 'NO_CHANNEL_PARTNER' && pr.reason !== 'PARTNER_SYSTEM_DISABLED') {
        order.partnerCommissionStatus = 'NO_PARTNER:' + pr.reason;
      }
    } catch (e) {
      console.error('[payment] 合伙人分佣记账失败:', e.message);
    }
  }
  // P8：退款→退佣冲正（全额按订单原额比例冲回）
  if (status === ORDER_STATUS.REFUNDED) {
    try {
      const commissionEngine = require('./commissionEngine');
      commissionEngine.reverseCommission(orderId);
    } catch (e) {
      console.error('[payment] 退佣冲正失败:', e.message);
    }
    // DEV-V22 合伙人退款冲正：扣回渠道佣金与培养奖励（幂等）
    try {
      require('./partnerEngine').reversePartnerCommission(orderId);
    } catch (e) {
      console.error('[payment] 合伙人冲正失败:', e.message);
    }
  }
  return order;
}

// ============================================================================

// ============================================================================
// v25.0.47_10/12: 服务端价格裁决（FINAL-ADMIN-COMMERCIAL-SEAL-02 第七章）
// 正式订单金额必须来自服务端 Product/Price SSOT：
//   MEMBERSHIP     -> extra.membershipLevel -> admin-membership-config.json
//   AI_PACKAGE     -> extra.packageId / planKey -> admin-ai-config.json
//   SINGLE_UNLOCK  -> ai_plan_{key} 时卡 / tool-matrix 工具 / singleUnlockPrice
//   BATCH_INTERPRET -> 下单用户会员等级折扣 -> admin-batch-config.json
//   POINTS_RECHARGE-> 按充值面额（外层范围校验）
// 前端传入 amount 仅作展示对照，下单金额以本函数返回为准。
// ============================================================================
function readUserMemberLevel(userId) {
  try {
    const Database = require('better-sqlite3');
    const dbPath = process.env.DB_PATH || '/root/backend-auth/data/yandao_users.db';
    if (!require('fs').existsSync(dbPath)) return 'basic';
    const db = new Database(dbPath, { readonly: true });
    try {
      const uid = parseInt(userId, 10);
      if (isNaN(uid)) return 'basic';
      const row = db.prepare('SELECT member_level, membership_expiry FROM users WHERE user_id = ?').get(uid);
      if (!row) return 'basic';
      const level = row.member_level || 'basic';
      if (level === 'lifetime') return 'lifetime';
      if (row.membership_expiry) {
        const exp = new Date(row.membership_expiry).getTime();
        if (!isNaN(exp) && exp > Date.now()) return level;
        return 'basic';
      }
      return level;
    } finally {
      db.close();
    }
  } catch (e) {
    return 'basic';
  }
}

function resolveServerPrice(type, extra, userId) {
  try {
    const aiCfg = readAdminConfig('admin-ai-config.json');
    const memberCfg = readAdminConfig('admin-membership-config.json');
    const toolMatrix = readAdminConfig('tool-matrix.json');

    if (type === 'BATCH_INTERPRET') {
      const batchCfg = readBatchConfig();
      const level = userId ? readUserMemberLevel(userId) : 'basic';
      const discount = (batchCfg.discounts && batchCfg.discounts[level] != null) ? Number(batchCfg.discounts[level]) : 1;
      if (discount <= 0) return { price: 0, reason: '终身会员批量解读免费，无需支付' };
      const price = Math.round(Number(batchCfg.basePrice) * discount * 100) / 100;
      if (!(price > 0)) return { price: null, reason: '批量解读价格配置无效' };
      return { price };
    }

    if (type === 'MEMBERSHIP') {
      const level = extra && (extra.membershipLevel || extra.level);
      const plans = (Array.isArray(memberCfg && memberCfg.plans) && memberCfg.plans.length)
        ? memberCfg.plans : DEFAULT_MEMBERSHIP_PLANS;
      const plan = plans.find(p => p.level === level);
      if (!plan) return { price: null, reason: '会员套餐不存在' };
      if (plan.enabled === false) return { price: null, reason: '套餐已下架' };
      return { price: Number(plan.price) };
    }

    if (type === 'AI_PACKAGE') {
      const pkgId = extra && (extra.packageId || extra.id);
      const planKey = extra && (extra.planKey || extra.key);
      if (pkgId && aiCfg && Array.isArray(aiCfg.packages)) {
        const pkg = aiCfg.packages.find(p => p.id === pkgId);
        if (pkg) {
          if (pkg.enabled === false) return { price: null, reason: '套餐已下架' };
          return { price: Number(pkg.price) };
        }
      }
      if (planKey) {
        const tps = (Array.isArray(aiCfg && aiCfg.timePlans) && aiCfg.timePlans.length)
          ? aiCfg.timePlans : DEFAULT_AI_TIME_PLANS;
        const tp = tps.find(p => p.key === planKey);
        if (tp) return { price: Number(tp.price) };
      }
      return { price: null, reason: 'AI套餐不存在' };
    }

    if (type === 'SINGLE_UNLOCK') {
      const targetId = extra && extra.unlockTargetId;
      // AI 时卡（前端约定 unlockTargetId = ai_plan_{key}）
      if (typeof targetId === 'string' && targetId.startsWith('ai_plan_')) {
        const planKey = targetId.slice('ai_plan_'.length);
        const tps = (Array.isArray(aiCfg && aiCfg.timePlans) && aiCfg.timePlans.length)
          ? aiCfg.timePlans : DEFAULT_AI_TIME_PLANS;
        const tp = tps.find(p => p.key === planKey);
        if (tp) return { price: Number(tp.price) };
        return { price: null, reason: 'AI套餐不存在' };
      }
      // B类付费工具（tool-matrix 单项收费）
      if (toolMatrix && toolMatrix.tools && typeof targetId === 'string' && toolMatrix.tools[targetId]) {
        const t = toolMatrix.tools[targetId];
        if (t.status === 'OFF' || t.payMode === 'DISABLED') return { price: null, reason: '工具已关闭' };
        if (t.payMode === 'ONE_TIME' && Number(t.price) > 0) return { price: Number(t.price) };
      }
      // 默认：AI 单次深度解读价
      const sp = (aiCfg && typeof aiCfg.singleUnlockPrice === 'number' && aiCfg.singleUnlockPrice > 0)
        ? aiCfg.singleUnlockPrice : DEFAULT_SINGLE_UNLOCK_PRICE;
      return { price: Number(sp) };
    }

    // POINTS_RECHARGE / 其他：按充值面额，走外层范围校验
    return null;
  } catch (e) {
    console.error('[payment/create] 价格裁决异常:', e.message);
    return null;
  }
}

// POST /api/payment/create — 创建支付订单
// ============================================================================
router.post('/create', async (req, res) => {
  try {
    const { userId, type, amount, title, channel, extra } = req.body;

    // 参数校验
    if (!userId || typeof userId !== 'string' || userId.length < 4) {
      return jsonResponse(res, 400, false, '用户ID无效');
    }

    const validTypes = Object.values(ORDER_TYPES);
    if (!type || !validTypes.includes(type)) {
      return jsonResponse(res, 400, false, `订单类型无效，支持: ${validTypes.join(', ')}`);
    }

    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return jsonResponse(res, 400, false, '金额必须为大于 0 的数字');
    }

    // v25.0.47_10/12: 服务端价格裁决——下单金额以 Product/Price SSOT 为准
    const resolved = resolveServerPrice(type, extra, userId);
    let finalAmount = Number(amount);
    if (resolved) {
      if (resolved.price == null || resolved.price <= 0) {
        // v12: 批量解读终身会员免费（price=0 语义明确区分），直接免费放行无需创建支付订单
        if (type === 'BATCH_INTERPRET' && resolved.price === 0) {
          return jsonResponse(res, 200, true, resolved.reason || '终身会员免费，无需支付', { free: true, payMode: 'FREE' });
        }
        return jsonResponse(res, 400, false, `该产品当前不可购买（${resolved.reason || '免费或已下架'}）`);
      }
      if (Math.abs(Number(resolved.price) - Number(amount)) > 0.001) {
        console.warn(`[payment/create] 金额以服务端为准 type=${type} frontend=${amount} server=${resolved.price}`);
      }
      finalAmount = Number(resolved.price);
    } else if (Number(amount) > 10000) {
      return jsonResponse(res, 400, false, '金额超出合理范围');
    }

    const validChannels = ['wechat', 'alipay'];
    if (channel && !validChannels.includes(channel)) {
      return jsonResponse(res, 400, false, `支付渠道无效，支持: ${validChannels.join(', ')}`);
    }

    // 检查支付通道是否已启用
    if (!isPaymentEnabled()) {
      // TODO: 参数到位后启用
      // 通道未配置时仍创建订单（PENDING 状态），但返回"即将开放"提示
      const order = createOrderRecord({ userId, type, amount: finalAmount, title, extra });
      console.log(`[payment/create] 订单已创建（通道未启用）orderId=${order.orderId}`);
      return paymentNotReadyResponse(res);
    }

    // === 微信支付V3 JSAPI 下单流程 ===
    const order = createOrderRecord({ userId, type, amount: finalAmount, title, extra });
    const payChannel = channel || 'wechat';

    if (payChannel === 'wechat' && wechatPayV3.isConfigured()) {
      // ===== FIX-PAY-UNBIND-WECHAT-APPID 通道选择 =====
      // JSAPI（免扫码，需公众号AppID+openid）；缺任一参数自动降级 Native 扫码支付，
      // 不报错、不阻断流程；微信内环境同样展示二维码（长按识别支付）。
      const openid = extra && extra.openid;
      const canJsapi = !!openid && wechatPayV3.isReadyForJsapi();

      if (canJsapi) {
        const result = await wechatPayV3.createJsapiOrder({
          outTradeNo: order.orderId,
          description: order.title,
          amountYuan: order.amount,
          openid,
        });

        if (result.success) {
          order.channel = 'wechat';
          order.payMode = 'JSAPI';
          order.prepayId = result.prepayId;
          const jsapiParams = wechatPayV3.buildJsapiParams(result.prepayId);
          console.log(`[payment/create] 微信JSAPI下单成功 orderId=${order.orderId} prepayId=${result.prepayId}`);
          return jsonResponse(res, 200, true, '订单创建成功', {
            orderId: order.orderId,
            channel: 'wechat',
            payMode: 'JSAPI',
            prepayId: result.prepayId,
            jsapiParams,
          });
        }
        // JSAPI下单失败：降级Native扫码，不报错不阻断
        console.log(`[payment/create] JSAPI下单失败降级Native orderId=${order.orderId} err=${result.error}`);
      } else if (!openid) {
        console.log(`[payment/create] 无openid(非微信内/未授权)走Native扫码 orderId=${order.orderId}`);
      } else {
        console.log(`[payment/create] 公众号AppID未配置走Native扫码 orderId=${order.orderId}`);
      }

      // ===== Native 扫码支付（全场景兜底收款通道）=====
      const nativeResult = await wechatPayV3.createNativeOrder({
        outTradeNo: order.orderId,
        description: order.title,
        amountYuan: order.amount,
      });

      if (nativeResult.success && nativeResult.codeUrl) {
        order.channel = 'wechat';
        order.payMode = 'NATIVE';
        console.log(`[payment/create] 微信Native扫码下单成功 orderId=${order.orderId}`);
        return jsonResponse(res, 200, true, '订单创建成功（扫码支付）', {
          orderId: order.orderId,
          channel: 'wechat',
          payMode: 'NATIVE',
          codeUrl: nativeResult.codeUrl,
        });
      }

      // Native也失败（典型：商户号尚未绑定/配置appid）：关闭本地订单并给出明确缺口
      updateOrderRecord(order.orderId, ORDER_STATUS.CLOSED, 'wechat');
      const needAppid = !!nativeResult.needAppid;
      return jsonResponse(res, 200, false,
        needAppid
          ? '支付通道尚未完全开通：商户号需绑定AppID（公众号/小程序/移动应用任一），配置后即可收款'
          : (nativeResult.error || '微信下单失败'),
        { enabled: false, needAppid });
    }

    // 支付宝通道尚未配置
    return paymentNotReadyResponse(res);
  } catch (error) {
    console.error('[payment/create] error:', error);
    return jsonResponse(res, 500, false, '服务异常，请稍后重试');
  }
});

// ============================================================================
// POST /api/payment/query — 查询订单状态
// ============================================================================
router.post('/query', async (req, res) => {
  try {
    const { orderId, channel } = req.body;

    if (!orderId) {
      return jsonResponse(res, 400, false, '缺少订单号');
    }

    // 检查支付通道是否已启用
    if (!isPaymentEnabled()) {
      // TODO: 参数到位后启用
      // 通道未启用时仅返回本地订单状态
      const order = getOrderRecord(orderId);
      if (!order) {
        return jsonResponse(res, 404, false, '订单不存在');
      }
      return jsonResponse(res, 200, true, '订单查询成功（本地状态）', {
        orderId: order.orderId,
        status: order.status,
        amount: order.amount,
        channel: order.channel,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
      });
    }

    // === 本地订单 + 微信侧主动对账（回调丢失兜底） ===
    const order = getOrderRecord(orderId);
    if (!order) {
      return jsonResponse(res, 404, false, '订单不存在');
    }

    // 待支付且微信渠道：主动查微信侧，防回调丢失导致状态停滞
    if (order.status === ORDER_STATUS.PENDING && order.channel === 'wechat' && wechatPayV3.isConfigured()) {
      try {
        const qr = await wechatPayV3.queryOrderByOutTradeNo(orderId);
        if (qr.success && qr.tradeState === 'SUCCESS') {
          updateOrderRecord(orderId, ORDER_STATUS.PAID, 'wechat');
          console.log(`[payment/query] 对账发现已支付，本地状态已更新 orderId=${orderId}`);
        } else if (qr.success && (qr.tradeState === 'CLOSED' || qr.tradeState === 'REVOKED' || qr.tradeState === 'PAYERROR')) {
          updateOrderRecord(orderId, ORDER_STATUS.CLOSED, 'wechat');
        }
      } catch (e) {
        console.error('[payment/query] 微信侧对账失败:', e.message);
      }
    }

    const latest = getOrderRecord(orderId) || order;
    // v25.0.47_8 已支付但权益未交付（重启丢单/交付失败）：补交付
    if (latest.status === ORDER_STATUS.PAID && !latest.benefitDelivered) {
      try {
        deliverOrderBenefits(latest);
      } catch (e) {
        console.error('[payment/query] 补交付失败:', e.message);
      }
    }
    return jsonResponse(res, 200, true, '订单查询成功', {
      orderId: latest.orderId,
      status: latest.status,
      amount: latest.amount,
      channel: latest.channel,
      createdAt: latest.createdAt,
      paidAt: latest.paidAt,
    });
  } catch (error) {
    console.error('[payment/query] error:', error);
    return jsonResponse(res, 500, false, '服务异常，请稍后重试');
  }
});

// ============================================================================
// POST /api/payment/close — 关闭订单
// ============================================================================
router.post('/close', async (req, res) => {
  try {
    const { orderId, channel } = req.body;

    if (!orderId) {
      return jsonResponse(res, 400, false, '缺少订单号');
    }

    // 检查支付通道是否已启用
    if (!isPaymentEnabled()) {
      // TODO: 参数到位后启用
      // 通道未启用时仅关闭本地订单
      const order = getOrderRecord(orderId);
      if (!order) {
        return jsonResponse(res, 404, false, '订单不存在');
      }
      if (order.status !== ORDER_STATUS.PENDING) {
        return jsonResponse(res, 400, false, '仅待支付订单可关闭');
      }
      updateOrderRecord(orderId, ORDER_STATUS.CLOSED);
      return jsonResponse(res, 200, true, '订单已关闭');
    }

    // === 本地关单 + 微信侧关单 ===
    const order = getOrderRecord(orderId);
    if (!order) {
      return jsonResponse(res, 404, false, '订单不存在');
    }
    if (order.status !== ORDER_STATUS.PENDING) {
      return jsonResponse(res, 400, false, '仅待支付订单可关闭');
    }

    // 微信渠道：先关微信侧订单（幂等），再关本地
    if ((channel || order.channel) === 'wechat' && wechatPayV3.isConfigured()) {
      try {
        await wechatPayV3.closeOrderByOutTradeNo(orderId);
      } catch (e) {
        console.error('[payment/close] 微信侧关单失败(继续本地关闭):', e.message);
      }
    }

    updateOrderRecord(orderId, ORDER_STATUS.CLOSED);
    return jsonResponse(res, 200, true, '订单已关闭');
  } catch (error) {
    console.error('[payment/close] error:', error);
    return jsonResponse(res, 500, false, '服务异常，请稍后重试');
  }
});

// ============================================================================
// POST /api/payment/callback/wechat — 微信支付回调
// ============================================================================
router.post('/callback/wechat', async (req, res) => {
  try {
    // 提取回调原始数据
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      headers[key.toLowerCase()] = String(value);
    }
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    // 检查支付通道是否已启用
    if (!isPaymentEnabled()) {
      // TODO: 参数到位后启用
      console.log('[payment/callback/wechat] 收到微信回调（通道未启用，忽略）');
      // 微信要求返回 200 + JSON 格式，否则会重试
      return res.status(200).json({
        code: 'SUCCESS',
        message: '成功',
      });
    }

    // === 验签 + 解密 + 幂等状态机 ===
    // 验签必须用原始字节流（server.js express.json verify 钩子捕获 req.rawBody）
    const rawBody = req.rawBody || body;

    // 1. 平台证书验签（防伪造回调）
    const verify = await wechatPayV3.verifyCallbackSignature(headers, rawBody);
    if (!verify.valid) {
      console.error('[payment/callback/wechat] 验签失败:', verify.error);
      return res.status(200).json({ code: 'FAIL', message: '验签失败' });
    }

    // 2. 解密 resource（AES-256-GCM, APIv3密钥）
    const payload = typeof req.body === 'object' && req.body ? req.body : JSON.parse(rawBody);
    if (!payload.resource) {
      return res.status(200).json({ code: 'FAIL', message: '回调缺少resource' });
    }
    let detail;
    try {
      detail = wechatPayV3.decryptCallbackResource(payload.resource);
    } catch (e) {
      console.error('[payment/callback/wechat] 解密失败:', e.message);
      return res.status(200).json({ code: 'FAIL', message: '解密失败' });
    }

    // 3. 订单状态机（幂等：仅 PENDING 可迁移）
    const order = getOrderRecord(detail.out_trade_no);
    if (!order) {
      // 本地无此订单（进程重启内存丢失等）：应答成功防重试风暴，留日志人工核对
      console.warn(`[payment/callback/wechat] 本地订单不存在 out_trade_no=${detail.out_trade_no} trade_state=${detail.trade_state}`);
      return res.status(200).json({ code: 'SUCCESS', message: '成功' });
    }

    if (detail.trade_state === 'SUCCESS') {
      if (order.status === ORDER_STATUS.PENDING) {
        updateOrderRecord(order.orderId, ORDER_STATUS.PAID, 'wechat');
        const paid = getOrderRecord(order.orderId);
        if (paid) {
          paid.transactionId = detail.transaction_id || null;
          paid.successTime = detail.success_time || null;
        }
        console.log(`[payment/callback/wechat] 支付成功 orderId=${order.orderId} transactionId=${detail.transaction_id} amount=${detail.amount && detail.amount.total}分`);
      }
      // 已PAID的重复回调：幂等跳过
    } else if (['CLOSED', 'REVOKED', 'PAYERROR'].includes(detail.trade_state)) {
      if (order.status === ORDER_STATUS.PENDING) {
        updateOrderRecord(order.orderId, ORDER_STATUS.CLOSED, 'wechat');
        console.log(`[payment/callback/wechat] 订单关闭 orderId=${order.orderId} trade_state=${detail.trade_state}`);
      }
    }

    return res.status(200).json({ code: 'SUCCESS', message: '成功' });
  } catch (error) {
    console.error('[payment/callback/wechat] error:', error);
    return res.status(200).json({
      code: 'FAIL',
      message: '处理异常',
    });
  }
});

// ============================================================================
// POST /api/payment/callback/transfer — 微信商家转账回调（v25.0.47_13 提现终态落账）
// 微信商户平台「商家转账到零钱」的转账结果通知地址配置为：
//   https://yandao.vip/api/payment/callback/transfer
// 流程：平台证书验签 → AEAD解密 → commissionEngine.markTransferResult 幂等落账
// ============================================================================
router.post('/callback/transfer', async (req, res) => {
  try {
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      headers[key.toLowerCase()] = String(value);
    }
    const rawBody = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

    let wechatTransfer;
    try { wechatTransfer = require('./wechatTransfer'); } catch (e) {
      console.error('[payment/callback/transfer] 转账模块不可用:', e.message);
      return res.status(200).json({ code: 'FAIL', message: '转账模块不可用' });
    }
    const r = await wechatTransfer.handleTransferCallback(headers, rawBody);
    if (!r.ok) {
      console.error('[payment/callback/transfer] 处理失败:', r.error);
      // 验签失败必须应答FAIL（微信不重试验签失败的通知，防止伪造回调）
      return res.status(200).json({ code: 'FAIL', message: r.error || '处理失败' });
    }
    if (!r.withdrawNo) {
      return res.status(200).json({ code: 'SUCCESS', message: '成功' });
    }
    const commissionEngine = require('./commissionEngine');
    const stateMap = { SUCCESS: 'SUCCESS', FAIL: 'FAIL', FAILED: 'FAIL', CANCELLED: 'CANCELLED' };
    const finalState = stateMap[r.state];
    if (finalState) {
      const result = commissionEngine.markTransferResult(r.withdrawNo, finalState, r.failReason, r.transferNo);
      console.log(`[payment/callback/transfer] 提现终态 no=${r.withdrawNo} state=${r.state} → ${JSON.stringify(result)}`);
    } else {
      console.log(`[payment/callback/transfer] 非终态通知 no=${r.withdrawNo} state=${r.state}`);
    }
    return res.status(200).json({ code: 'SUCCESS', message: '成功' });
  } catch (error) {
    console.error('[payment/callback/transfer] error:', error);
    return res.status(200).json({ code: 'FAIL', message: '处理异常' });
  }
});

// ============================================================================
// GET /api/payment/wechat/oauth-config — 构造公众号网页授权跳转URL
// 用法：前端在微信浏览器内 fetch 本接口（带redirect_uri当前页地址），
//       拿到 authorizeUrl 后 location.href 跳转；微信回跳带 ?code=xxx&state=pay
// ============================================================================
router.get('/wechat/oauth-config', (req, res) => {
  try {
    if (!wechatPayV3.isOauthConfigured()) {
      return jsonResponse(res, 200, false, '网页授权未配置（需WECHAT_APPID+WECHAT_APP_SECRET）', {
        oauthConfigured: false,
      });
    }
    const redirectUri = req.query.redirect_uri || `${wechatPayV3.config().baseUrl}/`;
    const authorizeUrl = wechatPayV3.buildOauthAuthorizeUrl(redirectUri, 'pay');
    return jsonResponse(res, 200, true, '获取授权地址成功', {
      oauthConfigured: true,
      authorizeUrl,
    });
  } catch (error) {
    console.error('[payment/wechat/oauth-config] error:', error.message);
    return jsonResponse(res, 500, false, '服务异常');
  }
});

// ============================================================================
// GET /api/payment/wechat/openid?code=xxx — 网页授权code换openid
// 前端从回跳URL取code后调用，openid存本地供JSAPI下单使用
// ============================================================================
router.get('/wechat/openid', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) {
      return jsonResponse(res, 400, false, '缺少授权code');
    }
    const r = await wechatPayV3.getOpenidByOauthCode(String(code));
    if (!r.success) {
      return jsonResponse(res, 400, false, r.error || 'code换openid失败');
    }
    return jsonResponse(res, 200, true, '获取openid成功', { openid: r.openid });
  } catch (error) {
    console.error('[payment/wechat/openid] error:', error.message);
    return jsonResponse(res, 500, false, '服务异常');
  }
});

// ============================================================================
// POST /api/payment/callback/alipay — 支付宝回调
// ============================================================================
router.post('/callback/alipay', async (req, res) => {
  try {
    // 提取回调原始数据
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      headers[key.toLowerCase()] = String(value);
    }
    const body =
      typeof req.body === 'string'
        ? req.body
        : new URLSearchParams(req.body).toString();

    // 检查支付通道是否已启用
    if (!isPaymentEnabled()) {
      // TODO: 参数到位后启用
      console.log('[payment/callback/alipay] 收到支付宝回调（通道未启用，忽略）');
      // 支付宝要求返回纯文本 "success"
      return res.status(200).send('success');
    }

    // === 支付通道已启用时的完整流程 ===
    // TODO: 参数到位后启用
    //
    // 1. 调用回调处理器验签 + 发放权益 + 分销返佣
    //    const result = await paymentCallback.processPaymentCallback('alipay', { headers, body });
    //
    // 2. 返回支付宝要求的响应格式
    //    if (result.success) {
    //      return res.status(200).send('success');
    //    }
    //    return res.status(200).send('fail');

    return res.status(200).send('success');
  } catch (error) {
    console.error('[payment/callback/alipay] error:', error);
    return res.status(200).send('fail');
  }
});

// ============================================================================
// 导出
// ============================================================================

// ============================================================================
// v25.0.47_10: 后台订单详情 + 权益重试发放（FINAL-ADMIN-COMMERCIAL-SEAL-02 第十八/十九章）
// 鉴权：统一角色密钥（admin-keys.json），不回显任何支付密钥
// ============================================================================

// v25.0.47_13: 统一角色权限模块（adminRoles.js 全后台唯一事实源，含 scope 域校验）
const _prAdminRoles = require('./adminRoles');

function _prAdminAuth(minRole, scope) {
  return _prAdminRoles.adminAuth(minRole, scope);
}

// 订单详情（含权益交付状态/权益类型/发放时间/微信交易号）
router.get('/admin/orders/:orderId', _prAdminAuth('FINANCE_ADMIN', 'finance'), (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = ordersStore.get(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: '订单不存在' });
    }
    // 数据库侧持久化状态（benefit_delivered / paid_at / transaction_id）
    let dbInfo = null;
    try {
      const db = getOrdersDb();
      const row = db.prepare('SELECT status, benefit_delivered, paid_at, transaction_id, payment_method FROM user_orders WHERE order_no = ?').get(orderId);
      if (row) dbInfo = row;
    } catch (e) {}
    const benefitType = order.type === 'MEMBERSHIP' ? '会员时长'
      : order.type === 'POINTS_RECHARGE' ? '积分入账'
      : order.type === 'SINGLE_UNLOCK' ? '单次解锁标记'
      : order.type === 'AI_PLAN' ? 'AI套餐额度'
      : '其他';
    res.json({
      success: true,
      data: {
        orderId: order.orderId,
        userId: order.userId,
        type: order.type,
        title: order.title,
        amount: order.amount,
        status: order.status,
        channel: order.channel || 'wechat',
        payMode: order.payMode || null,
        createdAt: order.createdAt,
        paidAt: (dbInfo && dbInfo.paid_at) || order.paidAt || null,
        transactionId: (dbInfo && dbInfo.transaction_id) || order.transactionId || null,
        benefitDelivered: !!(order.benefitDelivered || (dbInfo && dbInfo.benefit_delivered)),
        benefitType,
        benefitDeliveredAt: order.benefitDeliveredAt || null,
        extra: order.extra || null,
        commissionStatus: (() => {
          // v25.0.47_10: 优先读 commission_records 权威记录（含真实佣金额与推荐人）
          try {
            const _cdb = getOrdersDb();
            const _cr = _cdb.prepare("SELECT status, commission_cents, ratio_percent, inviter_user_id FROM commission_records WHERE order_no = ? AND record_type = 'COMMISSION'").get(orderId);
            if (_cr) {
              return `${_cr.status}(佣金${_cr.commission_cents}分·比例${_cr.ratio_percent}%·推荐人${_cr.inviter_user_id})`;
            }
          } catch (e) {}
          return order.commissionStatus || (order.status === 'PAID' ? 'SETTLED_OR_NO_INVITER' : 'NOT_APPLICABLE');
        })(),
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: '订单详情查询失败: ' + e.message });
  }
});

// 权益重试发放（幂等：benefitDelivered 标记 + DB benefit_delivered 双重校验）
router.post('/admin/orders/:orderId/retry-delivery', _prAdminAuth('SUPER_ADMIN'), async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = ordersStore.get(orderId);
    if (!order) return res.status(404).json({ success: false, error: '订单不存在' });
    if (order.status !== 'PAID') {
      return res.status(400).json({ success: false, error: `订单状态为 ${order.status}，仅已支付订单可重试发放` });
    }
    // 幂等检查1：内存标记
    if (order.benefitDelivered) {
      return res.json({ success: true, message: '权益已发放，无需重复操作（幂等拦截）', data: { benefitDelivered: true } });
    }
    // 幂等检查2：数据库标记
    try {
      const db = getOrdersDb();
      const row = db.prepare('SELECT benefit_delivered FROM user_orders WHERE order_no = ?').get(orderId);
      if (row && row.benefit_delivered) {
        order.benefitDelivered = true;
        return res.json({ success: true, message: '权益已发放（数据库标记），无需重复操作（幂等拦截）', data: { benefitDelivered: true } });
      }
    } catch (e) {}
    // 执行重试
    deliverOrderBenefits(order);
    if (order.benefitDelivered) {
      order.benefitDeliveredAt = new Date().toISOString();
      console.log(`[payment/admin] 权益重试发放成功 orderId=${orderId} operator=${req.admin.name}`);
      res.json({ success: true, message: '权益重试发放成功', data: { benefitDelivered: true, benefitDeliveredAt: order.benefitDeliveredAt } });
    } else {
      res.json({ success: false, error: '权益发放仍失败，请检查数据库连接/用户存在性' });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: '重试发放失败: ' + e.message });
  }
});

module.exports = {
  router,
  createRouter() {
    return router;
  },
  isPaymentEnabled,
  createOrderRecord,
  getOrderRecord,
  updateOrderRecord,
  ORDER_STATUS,
  // 预留：供外部注入数据库适配器
  setDatabase(dbModule) {
    // TODO: 参数到位后启用
    // 注入数据库模块，替换内存存储
  },
};
