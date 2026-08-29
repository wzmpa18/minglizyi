/**
 * 合伙人渠道分销体系 V2 路由（DEV-V22-PARTNER-V2）
 *
 * 用户端（JWT，挂载 /api/partner）：
 *   GET  /my/status                     — 我的合伙人状态（NONE/PENDING/APPROVED/REJECTED/DISABLED）
 *   POST /apply                         — 提交合伙人申请（refCode=招募海报推荐人，自主申请可空）
 *   GET  /my/overview                   — 数据概览（渠道注册/付费/实付/佣金/奖励/待结算/可提现）
 *   GET  /my/trends?days=7|30           — 近N日注册/付费/佣金趋势
 *   GET  /my/users?page&size&sort&paid  — 我的用户（强制脱敏：ID部分隐藏+手机号打码，禁止导出）
 *   GET  /my/sub-partners               — 直属下级合伙人列表（汇总数据+培养奖励）
 *   GET  /my/sub-partners/:subId/monthly— 单个直属合伙人月度业绩与奖励明细
 *   GET  /my/records?type=base|nurture|withdrawal — 佣金/培养奖励/提现明细
 *
 * 管理端（密钥鉴权，挂载 /api/admin/partner）：
 *   GET  /partners?page&size&status&q   — 合伙人全量列表
 *   POST /partners/:userId/action       — 审核/开通/禁用/等级（approve|reject|disable|enable|level）
 *   POST /partners/:userId/referrer     — 手动调整上级推荐关系（唯一可调整入口）
 *   GET  /partners/:userId/users        — 该合伙人渠道完整用户明细（不脱敏，仅管理端）
 *   GET  /channel-overview              — 渠道总览（各渠道注册/付费/流水占比）
 *   GET  /user-tree?userId=             — 用户层级树（任意用户完整上下级链路）
 *   GET  /partner-tree                  — 合伙人关系树
 *   GET  /settlements?page&size&period&status — 结算单列表
 *   POST /settlements/generate          — 生成指定月结算单（幂等）
 *   POST /settlements/:id/approve       — 审核通过（FROZEN→可提现）
 *   POST /settlements/:id/reject        — 驳回
 *   POST /settlements/:id/adjust        — 手动调整金额（±元）
 *   POST /risk/order-invalid            — 风控标记无效订单（扣回全部佣金）
 *   GET  /config                        — 引擎配置
 *   PUT  /config                        — 更新配置（SUPER_ADMIN）
 *
 * 数据脱敏红线：/my/* 一切接口仅输出脱敏字段；禁止导出用户名单
 */
'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const partnerEngine = require('./partnerEngine');
const { adminAuth, audit } = require('./adminRoles');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET 未配置或长度不足32位，服务拒绝启动（fail-closed）。请在部署 .env 设置 ≥32 位随机密钥。');
}
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

function requireApprovedPartner(req, res, next) {
  if (!partnerEngine.isApprovedPartner(req.user.userId)) {
    return res.status(403).json({ success: false, error: '尚未开通渠道合伙人资格' });
  }
  next();
}

function guard(fn) {
  return (req, res) => {
    try {
      fn(req, res);
    } catch (e) {
      console.error('[PartnerRoutes]', req.method, req.path, e.message);
      res.status(500).json({ success: false, error: '服务异常，请稍后重试' });
    }
  };
}

// ============================================================================
// 用户端
// ============================================================================

router.get('/my/status', authRequired, guard((req, res) => {
  const st = partnerEngine.partnerMyStatus(req.user.userId);
  const cfg = partnerEngine.getConfig();
  res.json({
    success: true,
    data: {
      ...st,
      systemEnabled: !!cfg.enabled,
      ratios: {
        commissionPercent: Number(cfg.commissionPercent),
        nurturePercent: Number(cfg.nurturePercent),
      },
    },
  });
}));

router.post('/apply', authRequired, guard((req, res) => {
  const { realName, contact, resources, expectedScale, refCode } = req.body || {};
  const r = partnerEngine.applyPartner({
    userId: req.user.userId, realName, contact, resources, expectedScale, refCode,
  });
  if (!r.ok) return res.status(400).json({ success: false, error: r.error });
  res.json({ success: true, data: { submitted: true } });
}));

router.get('/my/overview', authRequired, requireApprovedPartner, guard((req, res) => {
  res.json({ success: true, data: partnerEngine.partnerOverview(req.user.userId) });
}));

router.get('/my/trends', authRequired, requireApprovedPartner, guard((req, res) => {
  const days = parseInt(req.query.days, 10) || 7;
  res.json({ success: true, data: partnerEngine.partnerTrends(req.user.userId, days) });
}));

router.get('/my/users', authRequired, requireApprovedPartner, guard((req, res) => {
  const data = partnerEngine.partnerUsers(req.user.userId, {
    page: req.query.page, size: req.query.size, sort: req.query.sort, paid: req.query.paid,
  });
  res.json({ success: true, data });
}));

router.get('/my/sub-partners', authRequired, requireApprovedPartner, guard((req, res) => {
  res.json({ success: true, data: partnerEngine.partnerSubPartners(req.user.userId) });
}));

router.get('/my/sub-partners/:subId/monthly', authRequired, requireApprovedPartner, guard((req, res) => {
  const data = partnerEngine.partnerSubMonthly(req.user.userId, req.params.subId);
  if (!data) return res.status(404).json({ success: false, error: '非您的直属合伙人' });
  res.json({ success: true, data });
}));

router.get('/my/records', authRequired, requireApprovedPartner, guard((req, res) => {
  const type = req.query.type === 'nurture' ? 'nurture' : (req.query.type === 'withdrawal' ? 'withdrawal' : 'base');
  res.json({ success: true, data: partnerEngine.partnerRecords(req.user.userId, type, req.query.limit) });
}));

// ============================================================================
// 管理端
// ============================================================================

router.get('/partners', adminAuth('SUPPORT_ADMIN', 'ops'), guard((req, res) => {
  const data = partnerEngine.adminPartnerList({
    page: req.query.page, size: req.query.size, status: req.query.status, q: req.query.q,
  });
  res.json({ success: true, data });
}));

router.post('/partners/:userId/action', adminAuth('SUPPORT_ADMIN', 'ops'), guard((req, res) => {
  const { action, level, reason } = req.body || {};
  const r = partnerEngine.adminSetPartnerStatus(req.params.userId, action, req.admin && req.admin.name, { level, reason });
  if (!r.ok) return res.status(400).json({ success: false, error: r.error });
  audit(req.admin, 'PARTNER_STATUS', `userId=${req.params.userId} action=${action}`, null, null, '', null, null, '', req);
  res.json({ success: true, data: r });
}));

router.post('/partners/:userId/referrer', adminAuth('SUPER_ADMIN'), guard((req, res) => {
  const { referrerUserId, reason } = req.body || {};
  const r = partnerEngine.adminSetReferrer(req.params.userId, referrerUserId, req.admin && req.admin.name, reason);
  if (!r.ok) return res.status(400).json({ success: false, error: r.error });
  audit(req.admin, 'PARTNER_REFERRER_CHANGE', `userId=${req.params.userId} referrer=${referrerUserId || '清除'} reason=${reason || ''}`, null, null, '', null, null, '', req);
  res.json({ success: true, data: r });
}));

router.get('/partners/:userId/users', adminAuth('SUPPORT_ADMIN', 'ops'), guard((req, res) => {
  const data = partnerEngine.adminPartnerUsers(req.params.userId, {
    page: req.query.page, size: req.query.size, q: req.query.q,
  });
  res.json({ success: true, data });
}));

router.get('/channel-overview', adminAuth('SUPPORT_ADMIN', 'ops'), guard((req, res) => {
  res.json({ success: true, data: partnerEngine.adminChannelOverview() });
}));

router.get('/user-tree', adminAuth('SUPPORT_ADMIN', 'ops'), guard((req, res) => {
  if (!req.query.userId) return res.status(400).json({ success: false, error: '缺少 userId' });
  const data = partnerEngine.adminUserTree(req.query.userId);
  if (!data) return res.status(404).json({ success: false, error: '用户不存在' });
  res.json({ success: true, data });
}));

router.get('/partner-tree', adminAuth('SUPPORT_ADMIN', 'ops'), guard((req, res) => {
  res.json({ success: true, data: partnerEngine.adminPartnerTree() });
}));

router.get('/settlements', adminAuth('FINANCE_ADMIN', 'finance'), guard((req, res) => {
  const data = partnerEngine.adminSettlements({
    page: req.query.page, size: req.query.size, period: req.query.period, status: req.query.status,
  });
  res.json({ success: true, data });
}));

router.post('/settlements/generate', adminAuth('FINANCE_ADMIN', 'finance'), guard((req, res) => {
  const r = partnerEngine.generateMonthlySettlements(req.body && req.body.period, req.admin && req.admin.name);
  audit(req.admin, 'PARTNER_SETTLEMENT_GENERATE', `period=${r.period} created=${r.created}`, null, null, '', null, null, '', req);
  res.json({ success: true, data: r });
}));

router.post('/settlements/:id/approve', adminAuth('FINANCE_ADMIN', 'finance'), guard((req, res) => {
  const r = partnerEngine.approveSettlement(req.params.id, req.admin && req.admin.name);
  if (!r.ok) return res.status(400).json({ success: false, error: r.error });
  audit(req.admin, 'PARTNER_SETTLEMENT_APPROVE', `id=${req.params.id} moved=${r.movedCents}分`, null, null, '', null, null, '', req);
  res.json({ success: true, data: r });
}));

router.post('/settlements/:id/reject', adminAuth('FINANCE_ADMIN', 'finance'), guard((req, res) => {
  const r = partnerEngine.rejectSettlement(req.params.id, req.body && req.body.reason, req.admin && req.admin.name);
  if (!r.ok) return res.status(400).json({ success: false, error: r.error });
  audit(req.admin, 'PARTNER_SETTLEMENT_REJECT', `id=${req.params.id} reason=${(req.body && req.body.reason) || ''}`, null, null, '', null, null, '', req);
  res.json({ success: true, data: r });
}));

router.post('/settlements/:id/adjust', adminAuth('SUPER_ADMIN'), guard((req, res) => {
  const { deltaYuan, reason } = req.body || {};
  const r = partnerEngine.adjustSettlement(req.params.id, deltaYuan, reason, req.admin && req.admin.name);
  if (!r.ok) return res.status(400).json({ success: false, error: r.error });
  audit(req.admin, 'PARTNER_SETTLEMENT_ADJUST', `id=${req.params.id} delta=${r.deltaCents}分 reason=${reason || ''}`, null, null, '', null, null, '', req);
  res.json({ success: true, data: r });
}));

router.post('/risk/order-invalid', adminAuth('SUPPORT_ADMIN', 'ops'), guard((req, res) => {
  const { orderNo, reason } = req.body || {};
  if (!orderNo) return res.status(400).json({ success: false, error: '缺少 orderNo' });
  const r = partnerEngine.markOrderInvalid(orderNo, reason, req.admin && req.admin.name);
  if (!r.ok) return res.status(400).json({ success: false, error: r.error });
  audit(req.admin, 'PARTNER_RISK_ORDER_INVALID', `order=${orderNo} reason=${reason || ''} reversed=${r.reversed}`, null, null, '', null, null, '', req);
  res.json({ success: true, data: r });
}));

router.get('/config', adminAuth('SUPER_ADMIN'), guard((_req, res) => {
  res.json({ success: true, data: partnerEngine.getConfig() });
}));

router.put('/config', adminAuth('SUPER_ADMIN'), guard((req, res) => {
  const allowed = ['enabled', 'commissionPercent', 'nurturePercent', 'feePercent', 'storePercent', 'aiCostPercent', 'platformFloorPercent', 'settleGenDay'];
  const cur = partnerEngine.getConfig();
  const next = { ...cur };
  for (const k of allowed) {
    if (req.body && req.body[k] !== undefined) next[k] = req.body[k];
  }
  partnerEngine.saveConfig(next);
  audit(req.admin, 'PARTNER_CONFIG_UPDATE', JSON.stringify(next), null, null, '', null, null, '', req);
  res.json({ success: true, data: next });
}));

function createRouter() { return router; }
module.exports = createRouter;
module.exports.createRouter = createRouter;
