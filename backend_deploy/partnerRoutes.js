/**
 * 合伙人渠道分销体系 V2 路由（DEV-V22-PARTNER-V2 + FINAL-MASTER-05 第十八~三十章）
 *
 * 用户端（JWT，挂载 /api/partner）：
 *   GET  /my/status                     — 我的合伙人状态（NONE/PENDING/APPROVED/REJECTED/DISABLED）
 *   POST /apply                         — 提交合伙人申请（refCode=招募海报推荐人，自主申请可空）
 *   GET  /my/overview                   — 数据概览（渠道注册/付费/实付/佣金/奖励/待结算/可提现）
 *   GET  /my/trends?days=7|30           — 近N日注册/付费/佣金趋势
 *   GET  /my/users?page&size&sort&paid  — 我的用户（第二十七章字段全集，强制脱敏，禁止导出）
 *   GET  /my/orders?page&size           — 逐单透明账（第二十五章：脱敏+ESTIMATED口径）
 *   GET  /my/settlements                — 本人月度结算单（第二十四章快照字段）
 *   GET  /my/contracts                  — 本人合同状态（第二十一章）
 *   GET  /my/sub-partners               — 直属下级合伙人列表（汇总数据+培养奖励）
 *   GET  /my/sub-partners/:subId/monthly— 单个直属合伙人月度业绩与奖励明细
 *   GET  /my/records?type=base|nurture|withdrawal — 佣金/培养奖励/提现明细
 *
 * 管理端（密钥鉴权，挂载 /api/admin/partner）：
 *   GET  /partners?page&size&status&q   — 合伙人全量列表
 *   POST /partners/:userId/action       — 审核/开通/禁用/等级（approve|reject|disable|enable|level）
 *   POST /partners/:userId/referrer     — 手动调整上级推荐关系（唯一可调整入口）
 *   GET  /partners/:userId/users        — 该合伙人渠道完整用户明细（不脱敏，仅管理端）
 *   GET  /partners/:userId/orders       — 逐单账全量（不脱敏，第二十八章）
 *   GET  /partners/:userId/withdrawals  — 提现记录（第二十八章）
 *   GET  /channel-overview              — 渠道总览（各渠道注册/付费/流水占比）
 *   GET  /user-tree?userId=             — 用户层级树（任意用户完整上下级链路）
 *   GET  /partner-tree                  — 合伙人关系树
 *   GET  /invite-stats?userId=          — 邀请关系只读统计（第二十九章 TOTAL_RELATIONS）
 *   GET  /attribution?page&size&partnerId&userId&status — 归属快照列表（第十九章，含历史版本）
 *   GET  /attribution/lookup?userId=    — 单用户归属全链路（版本链+改绑审计）
 *   POST /attribution/rebind            — SUPER_ADMIN 改绑（原因必填+Audit，第二十章）
 *   GET  /contracts?page&size&partnerId&status          — 合同列表（第二十一章）
 *   POST /contracts                     — 创建合同（默认3年，SUPER_ADMIN）
 *   POST /contracts/:id/action          — renew/terminate/policy（SUPER_ADMIN）
 *   GET  /partners/:userId/channel-codes — 渠道子码列表（第二十八章）
 *   POST /partners/:userId/channel-codes — 创建渠道子码（SUPER_ADMIN）
 *   POST /channel-codes/:id/action      — 子码 disable/enable（SUPER_ADMIN）
 *   GET  /settlements?page&size&period&status — 结算单列表（第二十四章口径字段）
 *   POST /settlements/generate          — 生成指定月结算单（幂等）
 *   POST /settlements/:id/approve       — 审核通过（FROZEN→可提现）
 *   POST /settlements/:id/reject        — 驳回
 *   POST /settlements/:id/adjust        — 手动调整金额（±元）
 *   POST /risk/order-invalid            — 风控标记无效订单（扣回全部佣金）
 *   GET  /config                        — 引擎配置
 *   PUT  /config                        — 更新配置（SUPER_ADMIN）
 *
 * 数据脱敏红线：/my/* 一切接口仅输出脱敏字段；禁止导出用户名单；
 * 禁止输出聊天正文/AI Prompt/命理输入/完整手机号/支付凭证（第二十六章）
 */
'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const partnerEngine = require('./partnerEngine');
const partnerAttribution = require('./partnerAttribution');
const { adminAuth, audit } = require('./adminRoles');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET 未配置或长度不足32位，服务拒绝启动（fail-closed）。请在部署 .env 设置 ≥32 位随机密钥。');
}
const router = express.Router();

// MASTER-05 第二十二~二十三章：合同到期扫描（每日；历史归属保留不删）
partnerAttribution.initScheduler();

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
  // MASTER-05 第二十七章：字段全集（UID/昵称/脱敏手机号/注册/最后活跃/会员等级/
  // 累计消费/最近消费/模块使用次数/是否付费）
  const data = partnerAttribution.partnerUsersDetailed(req.user.userId, {
    page: req.query.page, size: req.query.size, sort: req.query.sort, paid: req.query.paid,
  });
  res.json({ success: true, data });
}));

// MASTER-05 第二十五章：逐单透明账（脱敏；第二十六章隐私红线）
router.get('/my/orders', authRequired, requireApprovedPartner, guard((req, res) => {
  const data = partnerAttribution.partnerOrders(req.user.userId, {
    page: req.query.page, size: req.query.size,
  });
  res.json({ success: true, data });
}));

// MASTER-05 第二十四章：本人月度结算单（ESTIMATED 口径明确标注）
router.get('/my/settlements', authRequired, requireApprovedPartner, guard((req, res) => {
  res.json({ success: true, data: partnerAttribution.partnerMySettlements(req.user.userId) });
}));

// MASTER-05 第二十一章：本人合同状态（期限+收益规则）
router.get('/my/contracts', authRequired, requireApprovedPartner, guard((req, res) => {
  res.json({ success: true, data: partnerAttribution.myContract(req.user.userId) });
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

// ============================================================================
// 管理端 — MASTER-05 第十八~三十章新增（归属/合同/子码/逐单账/提现/邀请统计）
// ============================================================================

// 第二十章：归属快照列表（含历史版本）
router.get('/attribution', adminAuth('SUPPORT_ADMIN', 'ops'), guard((req, res) => {
  const data = partnerAttribution.listAttributions({
    page: req.query.page, size: req.query.size,
    partnerId: req.query.partnerId, userId: req.query.userId, status: req.query.status,
  });
  res.json({ success: true, data });
}));

// 单用户归属全链路（版本链 + 改绑审计）
router.get('/attribution/lookup', adminAuth('SUPPORT_ADMIN', 'ops'), guard((req, res) => {
  if (!req.query.userId) return res.status(400).json({ success: false, error: '缺少 userId' });
  const data = partnerAttribution.getAttributionDetail(req.query.userId);
  if (!data) return res.status(404).json({ success: false, error: '该用户无归属记录' });
  res.json({ success: true, data });
}));

// 第二十章：SUPER_ADMIN 改绑（原因必填 + Audit Log）
router.post('/attribution/rebind', adminAuth('SUPER_ADMIN'), guard((req, res) => {
  const { userId, newPartnerId, reason } = req.body || {};
  const r = partnerAttribution.rebindAttribution({
    userId, newPartnerId, reason, operator: req.admin && req.admin.name,
  });
  if (!r.ok) return res.status(400).json({ success: false, error: r.error });
  audit(req.admin, 'PARTNER_ATTRIBUTION_REBIND', `user=${userId} ${r.fromPartnerId || '无'} → ${newPartnerId} reason=${reason || ''}`, null, null, '', null, null, '', req);
  res.json({ success: true, data: r });
}));

// 第二十一章：合同列表
router.get('/contracts', adminAuth('SUPPORT_ADMIN', 'ops'), guard((req, res) => {
  const data = partnerAttribution.listContracts({
    page: req.query.page, size: req.query.size,
    partnerId: req.query.partnerId, status: req.query.status,
  });
  res.json({ success: true, data });
}));

// 第二十一章：创建合同（默认3年；期限与收益规则分开记录）
router.post('/contracts', adminAuth('SUPER_ADMIN'), guard((req, res) => {
  const r = partnerAttribution.createContract({ ...req.body, admin: req.admin && req.admin.name });
  if (!r.ok) return res.status(400).json({ success: false, error: r.error });
  audit(req.admin, 'PARTNER_CONTRACT_CREATE', `partner=${req.body.partnerId} no=${r.contractNo} ${req.body.contractStart}~${req.body.contractEnd || '(+' + (req.body.contractYears || 3) + '年)'} policy=${req.body.revenueRightPolicy || 'NET50_POSTEXPIRY_STOP'}`, null, null, '', null, null, '', req);
  res.json({ success: true, data: r });
}));

// 续约/终止/收益规则调整
router.post('/contracts/:id/action', adminAuth('SUPER_ADMIN'), guard((req, res) => {
  const { action } = req.body || {};
  const params = { ...req.body, contractId: req.params.id, admin: req.admin && req.admin.name };
  let r;
  if (action === 'renew') r = partnerAttribution.renewContract(params);
  else if (action === 'terminate') r = partnerAttribution.terminateContract(params);
  else if (action === 'policy') r = partnerAttribution.updateContractPolicy(params);
  else return res.status(400).json({ success: false, error: 'action 仅支持 renew/terminate/policy' });
  if (!r.ok) return res.status(400).json({ success: false, error: r.error });
  audit(req.admin, 'PARTNER_CONTRACT_' + String(action).toUpperCase(), `id=${req.params.id} ${JSON.stringify(r)}`, null, null, '', null, null, '', req);
  res.json({ success: true, data: r });
}));

// 第二十八章：渠道子码
router.get('/partners/:userId/channel-codes', adminAuth('SUPPORT_ADMIN', 'ops'), guard((req, res) => {
  res.json({ success: true, data: partnerAttribution.listChannelCodes(req.params.userId) });
}));

router.post('/partners/:userId/channel-codes', adminAuth('SUPER_ADMIN'), guard((req, res) => {
  const r = partnerAttribution.createChannelCode({
    partnerId: req.params.userId, code: req.body && req.body.code, label: req.body && req.body.label,
  });
  if (!r.ok) return res.status(400).json({ success: false, error: r.error });
  audit(req.admin, 'PARTNER_CHANNEL_CODE_CREATE', `partner=${req.params.userId} code=${r.code}`, null, null, '', null, null, '', req);
  res.json({ success: true, data: r });
}));

router.post('/channel-codes/:id/action', adminAuth('SUPER_ADMIN'), guard((req, res) => {
  const r = partnerAttribution.setChannelCodeStatus({ codeId: req.params.id, action: req.body && req.body.action });
  if (!r.ok) return res.status(400).json({ success: false, error: r.error });
  audit(req.admin, 'PARTNER_CHANNEL_CODE_STATUS', `id=${req.params.id} → ${r.status}`, null, null, '', null, null, '', req);
  res.json({ success: true, data: r });
}));

// 第二十八章：管理端逐单账（不脱敏，含守恒/公式版本）
router.get('/partners/:userId/orders', adminAuth('FINANCE_ADMIN', 'finance'), guard((req, res) => {
  const data = partnerAttribution.adminPartnerOrders(req.params.userId, {
    page: req.query.page, size: req.query.size,
  });
  res.json({ success: true, data });
}));

// 第二十八章：提现记录
router.get('/partners/:userId/withdrawals', adminAuth('FINANCE_ADMIN', 'finance'), guard((req, res) => {
  res.json({ success: true, data: partnerAttribution.adminPartnerWithdrawals(req.params.userId) });
}));

// 第二十九章：邀请关系只读统计（谁邀请了他/直接数/二级数/TOTAL_RELATIONS）
router.get('/invite-stats', adminAuth('SUPPORT_ADMIN', 'ops'), guard((req, res) => {
  if (!req.query.userId) return res.status(400).json({ success: false, error: '缺少 userId' });
  const data = partnerAttribution.userInviteStats(req.query.userId);
  if (!data) return res.status(404).json({ success: false, error: '用户不存在' });
  res.json({ success: true, data });
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
