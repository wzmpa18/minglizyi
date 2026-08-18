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
// 当前状态：路由完整实现，内部调用支付通道函数标注 "// TODO: 参数到位后启用"
//          当前返回友好的"支付通道即将开放"提示
// ============================================================================

'use strict';

const express = require('express');

const router = express.Router();

// ============================================================================
// 尝试加载支付模块（TypeScript 编译后可用，当前为预留）
// ============================================================================

let paymentModules = null;
try {
  // 当 TypeScript 模块编译后可用时自动加载
  // TODO: 参数到位后启用
  // paymentModules = {
  //   orderService: require('../payment/orderService'),
  //   paymentRouter: require('../payment/paymentRouter'),
  //   paymentCallback: require('../payment/paymentCallback'),
  //   paymentTypes: require('../payment/paymentTypes'),
  // };
} catch (e) {
  console.warn('[paymentRoutes] 支付模块尚未编译，当前为预留模式');
}

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
  // TODO: 参数到位后启用
  // 当微信支付或支付宝环境变量配置完成后返回 true
  const wechatConfigured = !!(
    process.env.WECHAT_MCH_ID &&
    process.env.WECHAT_APPID &&
    process.env.WECHAT_API_V3_KEY &&
    process.env.WECHAT_API_CERT_PATH
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
      wechat: !!(process.env.WECHAT_MCH_ID && process.env.WECHAT_APPID),
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
};

// ============================================================================
// 内存订单存储（预留，正式环境替换为数据库）
// ============================================================================

const ordersStore = new Map();

/**
 * 创建订单（内存存储）
 * TODO: 参数到位后替换为数据库实现
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
  }
  return order;
}

// ============================================================================
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

    const validChannels = ['wechat', 'alipay'];
    if (channel && !validChannels.includes(channel)) {
      return jsonResponse(res, 400, false, `支付渠道无效，支持: ${validChannels.join(', ')}`);
    }

    // 检查支付通道是否已启用
    if (!isPaymentEnabled()) {
      // TODO: 参数到位后启用
      // 通道未配置时仍创建订单（PENDING 状态），但返回"即将开放"提示
      const order = createOrderRecord({ userId, type, amount, title, extra });
      console.log(`[payment/create] 订单已创建（通道未启用）orderId=${order.orderId}`);
      return paymentNotReadyResponse(res);
    }

    // === 支付通道已启用时的完整流程 ===
    // TODO: 参数到位后启用
    //
    // 1. 创建统一订单
    //    const order = createOrderRecord({ userId, type, amount, title, extra });
    //
    // 2. 调用支付路由器下单
    //    const paymentResult = await paymentRouter.createPayment(channel, order, {
    //      wechat: { openid: extra?.openid, notifyUrl: `${BASE_URL}/api/payment/callback/wechat` },
    //      alipay: { notifyUrl: `${BASE_URL}/api/payment/callback/alipay`, returnUrl: extra?.returnUrl },
    //    });
    //
    // 3. 返回支付参数
    //    if (paymentResult.success) {
    //      return jsonResponse(res, 200, true, '订单创建成功', {
    //        orderId: order.orderId,
    //        channel,
    //        payUrl: paymentResult.payUrl,
    //        prepayId: paymentResult.prepayId,
    //        jsapiParams: paymentResult.jsapiParams,
    //      });
    //    }
    //    return jsonResponse(res, 500, false, paymentResult.error || '下单失败');

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

    // === 支付通道已启用时的完整流程 ===
    // TODO: 参数到位后启用
    //
    // 1. 查询本地订单
    //    const order = getOrderRecord(orderId);
    //    if (!order) return jsonResponse(res, 404, false, '订单不存在');
    //
    // 2. 调用支付路由器查询第三方支付状态
    //    const queryResult = await paymentRouter.queryPayment(channel || order.channel, orderId);
    //
    // 3. 如果第三方状态与本地不一致，更新本地状态
    //    if (queryResult.success && queryResult.status === ORDER_STATUS.PAID && order.status === ORDER_STATUS.PENDING) {
    //      await paymentCallback.processPaymentCallback(...);
    //    }
    //
    // 4. 返回最新状态
    //    return jsonResponse(res, 200, true, '订单查询成功', { ... });

    return paymentNotReadyResponse(res);
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

    // === 支付通道已启用时的完整流程 ===
    // TODO: 参数到位后启用
    //
    // 1. 查询本地订单
    //    const order = getOrderRecord(orderId);
    //    if (!order) return jsonResponse(res, 404, false, '订单不存在');
    //    if (order.status !== ORDER_STATUS.PENDING) return jsonResponse(res, 400, false, '仅待支付订单可关闭');
    //
    // 2. 调用支付路由器关闭第三方支付
    //    const closeResult = await paymentRouter.closePayment(channel || order.channel, orderId);
    //
    // 3. 更新本地状态
    //    if (closeResult.success) {
    //      updateOrderRecord(orderId, ORDER_STATUS.CLOSED);
    //      return jsonResponse(res, 200, true, '订单已关闭');
    //    }
    //    return jsonResponse(res, 500, false, closeResult.error || '关闭失败');

    return paymentNotReadyResponse(res);
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

    // === 支付通道已启用时的完整流程 ===
    // TODO: 参数到位后启用
    //
    // 1. 调用回调处理器验签 + 发放权益 + 分销返佣
    //    const result = await paymentCallback.processPaymentCallback('wechat', { headers, body });
    //
    // 2. 返回微信要求的响应格式
    //    if (result.success) {
    //      return res.status(200).json({ code: 'SUCCESS', message: '成功' });
    //    }
    //    return res.status(200).json({ code: 'FAIL', message: result.error || '失败' });

    return res.status(200).json({
      code: 'SUCCESS',
      message: '成功',
    });
  } catch (error) {
    console.error('[payment/callback/wechat] error:', error);
    return res.status(200).json({
      code: 'FAIL',
      message: '处理异常',
    });
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

module.exports = {
  router,
  createRouter() {
    return router;
  },
  isPaymentEnabled,
  // 预留：供外部注入数据库适配器
  setDatabase(dbModule) {
    // TODO: 参数到位后启用
    // 注入数据库模块，替换内存存储
  },
};
