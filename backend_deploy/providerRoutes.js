/**
 * Provider 师傅服务体系路由（FINAL-OPERATIONS-COMPLETION-MASTER-05 第三十一~五十三章）
 *
 * 用户端（JWT，挂载 /api/provider）：
 *   POST /apply                        — 提交 Provider 入驻申请（第三十五章字段）
 *   GET  /my/status                    — 我的 Provider 状态
 *   GET  /my/dashboard                 — 本人工作台（第五十一章：资料/服务/订单/收入/评价/提现）
 *   POST /services                     — 上架服务（第三十七章）
 *   PUT  /services/:serviceId          — 更新服务（价格 SSOT）
 *   POST /services/:serviceId/status   — 上/下架自己的服务
 *   GET  /my/services                  — 我的服务列表
 *   GET  /services                     — 在架服务列表（公开只读，价格 SSOT 展示）
 *   GET  /services/:serviceId          — 服务详情
 *   POST /orders                       — 创建服务订单（仅传 serviceId，第三十八章）
 *   GET  /my/orders                    — 我的订单（买家视角）
 *   GET  /orders/:orderNo              — 订单详情（当事人可见）
 *   POST /orders/:orderNo/confirm      — Provider 接单（PAID→CONFIRMED）
 *   POST /orders/:orderNo/start        — 开始服务（CONFIRMED→IN_SERVICE）
 *   POST /orders/:orderNo/complete     — 完成服务（IN_SERVICE→COMPLETED+结算入账）
 *   POST /orders/:orderNo/cancel       — 买家请求取消（服务开始前）
 *   POST /orders/:orderNo/review       — 买家评价（仅 COMPLETED，一单一条）
 *   POST /orders/:orderNo/dispute      — 当事人发起争议（第四十七章）
 *   GET  /reviews                      — Provider 评价列表
 *   GET  /my/account                   — Provider 收益账户（PROVIDER_REVENUE 独立账本）
 *   POST /my/withdrawals               — 提现申请（第四十八章）
 *   GET  /my/withdrawals               — 提现记录
 *
 * 管理端（密钥鉴权，挂载 /api/admin/provider）：
 *   GET  /stats                        — 后台统计总控（第五十章）
 *   GET  /providers                    — Provider 列表（含审核状态）
 *   POST /providers/:providerId/action — approve/reject/suspend/resume/close（第三十六章）
 *   GET  /orders                       — 全量服务订单
 *   GET  /orders/:orderNo              — 订单详情（含结算/争议）
 *   POST /orders/:orderNo/refund       — 退款（全额/部分，第四十四章）
 *   GET  /disputes                     — 争议列表
 *   POST /disputes/:disputeNo/resolve  — 争议处理（退款/驳回，Audit 留痕）
 *   GET  /settlements                  — 结算单列表（第四十三章字段）
 *   POST /settlements/settle-due       — 手动触发到期解冻
 *   GET  /withdrawals                  — Provider 提现列表（ledger_type=PROVIDER_REVENUE）
 *   POST /withdrawals/:withdrawNo/action — 提现审核 approve/reject
 *   POST /services/:serviceId/status   — 冻结/恢复服务
 *   GET  /config                       — 引擎配置
 *   PUT  /config                       — 更新配置（SUPER_ADMIN）
 */
'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const providerEngine = require('./providerEngine');
const { adminAuth, audit } = require('./adminRoles');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET 未配置或长度不足32位，服务拒绝启动（fail-closed）。请在部署 .env 设置 ≥32 位随机密钥。');
}

function createRouter() {
  const router = express.Router();

  function authRequired(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : (req.headers['x-access-token'] || '');
    if (!token) return res.status(401).json({ success: false, error: '请先登录' });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      return res.status(401).json({ success: false, error: '登录已过期，请重新登录' });
    }
  }

  function guard(fn) {
    return (req, res) => {
      try {
        fn(req, res);
      } catch (e) {
        console.error('[ProviderRoutes]', req.method, req.path, e.message);
        res.status(500).json({ success: false, error: '服务异常，请稍后重试' });
      }
    };
  }

  // 买家ID脱敏（Provider 视角，第四十九章隐私口径沿用第二十六章红线）
  function maskUserId(id) {
    const s = String(id || '');
    if (s.length <= 4) return '****';
    return s.slice(0, 2) + '****' + s.slice(-2);
  }

  // ============================================================================
  // 用户端
  // ============================================================================

  // 第三十五章：Provider 入驻申请
  router.post('/apply', authRequired, guard((req, res) => {
    const b = req.body || {};
    const r = providerEngine.applyProvider({
      userId: req.user.userId,
      displayName: b.displayName, avatar: b.avatar, bio: b.bio,
      category: b.category, expertise: b.expertise, qualification: b.qualification,
      contact: b.contact, realName: b.realName, idCardLast4: b.idCardLast4,
      payoutAlipay: b.payoutAlipay, payoutWechat: b.payoutWechat, payoutBank: b.payoutBank,
    });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, data: r });
  }));

  router.get('/my/status', authRequired, guard((req, res) => {
    const p = providerEngine.getProviderByUserId(req.user.userId);
    const cfg = providerEngine.getConfig();
    if (!p) return res.json({ success: true, data: { status: 'NONE', systemEnabled: !!cfg.enabled } });
    res.json({
      success: true,
      data: {
        providerId: p.id, status: p.status, category: p.category,
        appliedAt: p.applied_at, reviewedAt: p.reviewed_at, rejectReason: p.reject_reason,
        systemEnabled: !!cfg.enabled,
        compliance: providerEngine.zhongyiPositioningNote(p.category),
      },
    });
  }));

  // 第五十一章：本人工作台
  router.get('/my/dashboard', authRequired, guard((req, res) => {
    const d = providerEngine.providerDashboard(req.user.userId);
    if (!d.ok) return res.status(403).json({ success: false, error: d.error });
    res.json({ success: true, data: d });
  }));

  // 第三十七章：上架服务
  router.post('/services', authRequired, guard((req, res) => {
    const b = req.body || {};
    const r = providerEngine.createService({
      userId: req.user.userId, serviceName: b.serviceName, description: b.description,
      price: b.price, duration: b.duration, deliveryType: b.deliveryType, availability: b.availability,
    });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, data: r });
  }));

  router.put('/services/:serviceId', authRequired, guard((req, res) => {
    const b = req.body || {};
    const r = providerEngine.updateService({ userId: req.user.userId, serviceId: req.params.serviceId, ...b });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, data: r });
  }));

  router.post('/services/:serviceId/status', authRequired, guard((req, res) => {
    const status = (req.body || {}).status;
    const r = providerEngine.setServiceStatus({ userId: req.user.userId, serviceId: req.params.serviceId, status });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, data: r });
  }));

  router.get('/my/services', authRequired, guard((req, res) => {
    const p = providerEngine.getProviderByUserId(req.user.userId);
    if (!p) return res.status(403).json({ success: false, error: '尚未申请 Provider' });
    res.json({ success: true, data: { list: providerEngine.listServices({ providerId: p.id }) } });
  }));

  // 公开只读：在架服务（价格 SSOT 展示 + 中医合规声明）
  router.get('/services', guard((req, res) => {
    res.json({ success: true, data: { list: providerEngine.listServices({ onlineOnly: true }) } });
  }));

  router.get('/services/:serviceId', guard((req, res) => {
    const list = providerEngine.listServices({});
    const svc = list.find(s => String(s.serviceId) === String(req.params.serviceId));
    if (svc) return res.json({ success: true, data: svc });
    const raw = providerEngine.getService(req.params.serviceId);
    if (!raw) return res.status(404).json({ success: false, error: '服务不存在' });
    res.json({ success: true, data: { ...raw, priceYuan: providerEngine.centsToYuan(raw.price_cents) } });
  }));

  // 第三十八章：创建服务订单（只传 serviceId，金额服务端 SSOT）
  router.post('/orders', authRequired, guard((req, res) => {
    const b = req.body || {};
    const r = providerEngine.createServiceOrder({
      userId: req.user.userId, serviceId: b.serviceId, requirement: b.requirement,
    });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({
      success: true,
      data: {
        orderNo: r.orderNo, serviceId: r.serviceId,
        amountYuan: (r.priceCents / 100).toFixed(2),
        message: '订单已创建（PENDING_PAYMENT），请通过统一支付体系完成支付',
      },
    });
  }));

  router.get('/my/orders', authRequired, guard((req, res) => {
    const data = providerEngine.listOrders({
      buyerUserId: req.user.userId, page: req.query.page, size: req.query.size, status: req.query.status,
    });
    res.json({ success: true, data });
  }));

  router.get('/orders/:orderNo', authRequired, guard((req, res) => {
    const d = providerEngine.getOrderDetail(req.params.orderNo);
    if (!d) return res.status(404).json({ success: false, error: '订单不存在' });
    // 当事人鉴权：买家或该订单 Provider 本人
    const uid = parseInt(req.user.userId, 10);
    const p = providerEngine.getProviderByUserId(uid);
    const isProvider = !!(p && p.id === d.providerId);
    if (d.buyerUserId !== uid && !isProvider) {
      return res.status(403).json({ success: false, error: '无权查看此订单' });
    }
    // Provider 视角脱敏买家ID（隐私红线）
    if (isProvider && d.buyerUserId !== uid) d.buyerUserId = maskUserId(d.buyerUserId);
    res.json({ success: true, data: d });
  }));

  // Provider 工作台订单列表
  router.get('/my/provider-orders', authRequired, guard((req, res) => {
    const data = providerEngine.listOrders({
      providerUserId: req.user.userId, page: req.query.page, size: req.query.size, status: req.query.status,
    });
    // Provider 视角：买家ID 脱敏
    for (const o of data.list) o.buyerUserId = maskUserId(o.buyerUserId);
    res.json({ success: true, data });
  }));

  router.post('/orders/:orderNo/confirm', authRequired, guard((req, res) => {
    const r = providerEngine.confirmOrder({ userId: req.user.userId, orderNo: req.params.orderNo });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, data: r });
  }));

  router.post('/orders/:orderNo/start', authRequired, guard((req, res) => {
    const r = providerEngine.startService({ userId: req.user.userId, orderNo: req.params.orderNo });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, data: r });
  }));

  router.post('/orders/:orderNo/complete', authRequired, guard((req, res) => {
    const r = providerEngine.completeOrder({
      userId: req.user.userId, orderNo: req.params.orderNo, deliverNote: (req.body || {}).deliverNote,
    });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, data: r });
  }));

  router.post('/orders/:orderNo/cancel', authRequired, guard((req, res) => {
    const r = providerEngine.requestCancel({
      userId: req.user.userId, orderNo: req.params.orderNo, reason: (req.body || {}).reason,
    });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, data: r });
  }));

  // 第四十五~四十六章：评价（仅 COMPLETED，一单一条有效）
  router.post('/orders/:orderNo/review', authRequired, guard((req, res) => {
    const b = req.body || {};
    const r = providerEngine.reviewOrder({
      userId: req.user.userId, orderNo: req.params.orderNo, rating: b.rating, content: b.content,
    });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, data: r });
  }));

  // 第四十七章：发起争议
  router.post('/orders/:orderNo/dispute', authRequired, guard((req, res) => {
    const b = req.body || {};
    const r = providerEngine.raiseDispute({
      userId: req.user.userId, orderNo: req.params.orderNo, reason: b.reason, evidence: b.evidence,
    });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, data: r });
  }));

  router.get('/reviews', guard((req, res) => {
    const providerId = parseInt(req.query.providerId, 10);
    if (!providerId) return res.status(400).json({ success: false, error: '缺少 providerId' });
    res.json({
      success: true,
      data: {
        list: providerEngine.listReviews(providerId),
        summary: providerEngine.providerRating(providerId),
      },
    });
  }));

  // Provider 收益账户（第四十二章：独立账本 PROVIDER_REVENUE）
  router.get('/my/account', authRequired, guard((req, res) => {
    res.json({ success: true, data: providerEngine.accountSummary(req.user.userId) });
  }));

  // 第四十八章：提现申请
  router.post('/my/withdrawals', authRequired, guard((req, res) => {
    const r = providerEngine.applyProviderWithdrawal({
      userId: req.user.userId, amount: (req.body || {}).amount,
    });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, data: r });
  }));

  router.get('/my/withdrawals', authRequired, guard((req, res) => {
    res.json({ success: true, data: { list: providerEngine.listWithdrawals(req.user.userId, 50) } });
  }));

  // ============================================================================
  // 管理端（第五十章：老板后台 Provider 总控）
  // ============================================================================

  router.get('/stats', adminAuth('SUPPORT_ADMIN', 'ops'), guard((req, res) => {
    res.json({ success: true, data: providerEngine.adminStats() });
  }));

  router.get('/providers', adminAuth('SUPPORT_ADMIN', 'ops'), guard((req, res) => {
    const data = providerEngine.listProvidersAdmin({
      page: req.query.page, size: req.query.size, status: req.query.status, q: req.query.q,
    });
    res.json({ success: true, data });
  }));

  // 第三十六章：审核状态机
  router.post('/providers/:providerId/action', adminAuth('SUPPORT_ADMIN', 'ops'), guard((req, res) => {
    const { action, reason } = req.body || {};
    const r = providerEngine.reviewProvider({
      providerId: req.params.providerId, action, reason, admin: req.admin && req.admin.name,
    });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    audit(req.admin, 'PROVIDER_REVIEW', `provider=${req.params.providerId} ${r.from} → ${r.to} reason=${reason || ''}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: r });
  }));

  router.get('/orders', adminAuth('SUPPORT_ADMIN', 'ops'), guard((req, res) => {
    const data = providerEngine.listOrders({
      page: req.query.page, size: req.query.size, status: req.query.status, providerId: req.query.providerId,
    });
    res.json({ success: true, data });
  }));

  router.get('/orders/:orderNo', adminAuth('SUPPORT_ADMIN', 'ops'), guard((req, res) => {
    const d = providerEngine.getOrderDetail(req.params.orderNo);
    if (!d) return res.status(404).json({ success: false, error: '订单不存在' });
    res.json({ success: true, data: d });
  }));

  // 第四十四章：退款（全额/部分）
  router.post('/orders/:orderNo/refund', adminAuth('FINANCE_ADMIN', 'finance'), guard((req, res) => {
    const { refundAmount, full, closeOrder } = req.body || {};
    const r = providerEngine.refundOrder({
      orderNo: req.params.orderNo, refundAmount, full, closeOrder, admin: req.admin && req.admin.name,
    });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    audit(req.admin, 'PROVIDER_ORDER_REFUND', `order=${req.params.orderNo} refund=${r.refundCents}分 total=${r.totalRefund}分 full=${r.full}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: r });
  }));

  router.get('/disputes', adminAuth('SUPPORT_ADMIN', 'ops'), guard((req, res) => {
    res.json({ success: true, data: { list: providerEngine.listDisputes({ status: req.query.status }) } });
  }));

  // 第四十七章：争议处理（Audit 留痕）
  router.post('/disputes/:disputeNo/resolve', adminAuth('SUPPORT_ADMIN', 'ops'), guard((req, res) => {
    const { outcome, resolution, refundAmount } = req.body || {};
    const r = providerEngine.resolveDispute({
      disputeNo: req.params.disputeNo, outcome, resolution, refundAmount, admin: req.admin && req.admin.name,
    });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    audit(req.admin, 'PROVIDER_DISPUTE_RESOLVE', `dispute=${req.params.disputeNo} outcome=${outcome} order=${r.orderNo}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: r });
  }));

  // 第四十三章：结算单列表
  router.get('/settlements', adminAuth('FINANCE_ADMIN', 'finance'), guard((req, res) => {
    const data = providerEngine.listSettlementsAdmin({
      page: req.query.page, size: req.query.size, status: req.query.status, providerId: req.query.providerId,
    });
    res.json({ success: true, data });
  }));

  router.post('/settlements/settle-due', adminAuth('FINANCE_ADMIN', 'finance'), guard((req, res) => {
    const r = providerEngine.settleDueSettlements();
    res.json({ success: true, data: r });
  }));

  // 第四十八章：提现审核（ledger_type=PROVIDER_REVENUE 独立体系）
  router.get('/withdrawals', adminAuth('FINANCE_ADMIN', 'finance'), guard((req, res) => {
    const data = providerEngine.listWithdrawalsAdmin({ page: req.query.page, size: req.query.size, status: req.query.status });
    res.json({ success: true, data });
  }));

  router.post('/withdrawals/:withdrawNo/action', adminAuth('FINANCE_ADMIN', 'finance'), guard((req, res) => {
    const { action, reason } = req.body || {};
    const r = providerEngine.processWithdrawal({
      withdrawNo: req.params.withdrawNo, action, reason, admin: req.admin && req.admin.name,
    });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    audit(req.admin, 'PROVIDER_WITHDRAWAL_' + String(action).toUpperCase(), `no=${req.params.withdrawNo} reason=${reason || ''}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: r });
  }));

  // 管理端冻结/恢复服务
  router.post('/services/:serviceId/status', adminAuth('SUPPORT_ADMIN', 'ops'), guard((req, res) => {
    const status = (req.body || {}).status;
    const r = providerEngine.setServiceStatus({ serviceId: req.params.serviceId, status, admin: true, userId: null });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    audit(req.admin, 'PROVIDER_SERVICE_STATUS', `service=${req.params.serviceId} → ${status}`, null, null, '', null, null, '', req);
    res.json({ success: true, data: r });
  }));

  router.get('/config', adminAuth('SUPER_ADMIN'), guard((req, res) => {
    res.json({ success: true, data: providerEngine.getConfig() });
  }));

  router.put('/config', adminAuth('SUPER_ADMIN'), guard((req, res) => {
    const cfg = providerEngine.getConfig();
    const allowed = ['enabled', 'platformFeePercent', 'settleDays', 'minPriceYuan', 'maxPriceYuan',
      'maxDeliveryDays', 'entryAuditRequired', 'minWithdrawYuan', 'withdrawOpenDay',
      'dailyWithdrawLimit', 'dailyWithdrawAmountLimitYuan'];
    const next = { ...cfg };
    for (const k of allowed) {
      if (req.body && req.body[k] !== undefined) next[k] = req.body[k];
    }
    providerEngine.saveConfig(next);
    audit(req.admin, 'PROVIDER_CONFIG_UPDATE', JSON.stringify({ before: cfg, after: next }), null, null, '', null, null, '', req);
    res.json({ success: true, data: next });
  }));

  return router;
}

module.exports = { createRouter };
