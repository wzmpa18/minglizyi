/**
 * P8-DISTRIBUTION-COMMISSION-AUTO 用户端佣金路由（第一阶段）
 * 挂载: /api/commission
 *
 * 「我的」页面 → 「我的收益」：
 *   GET  /my/summary      — 三余额（可提现/待解冻/累计总收益）
 *   GET  /my/records      — 佣金明细（来源/金额/状态/到账时间）
 *   GET  /my/withdrawals  — 提现记录（状态/金额/到账时间/失败原因）
 *   POST /my/withdraw     — 提现申请（校验最低额/每日次数/余额）
 *   GET  /config          — 前端展示用公开配置（最低提现额/税务提示等）
 */
'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const commissionEngine = require('./commissionEngine');

const JWT_SECRET = process.env.JWT_SECRET || 'yandao_default_jwt_secret_change_me';
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

// 公开配置（无敏感信息）
router.get('/config', (_req, res) => {
  const cfg = commissionEngine.getConfig();
  res.json({
    success: true,
    data: {
      enabled: !!cfg.enabled,
      minWithdrawYuan: cfg.minWithdrawYuan,
      dailyWithdrawLimit: cfg.dailyWithdrawLimit,
      unfreezeDays: cfg.unfreezeDays,
      unfreezeEnabled: cfg.unfreezeEnabled !== false,
      taxNotice: cfg.taxNotice,
      withdrawTip: '提现将转入绑定的微信零钱，到账时间1-3个工作日',
    },
  });
});

router.get('/my/summary', authRequired, (req, res) => {
  try {
    // 顺带触发懒解冻（定时任务的兜底）
    try { commissionEngine.runUnfreeze(); } catch (e) { /* ignore */ }
    const summary = commissionEngine.accountSummary(req.user.userId);
    res.json({ success: true, data: summary });
  } catch (e) {
    console.error('[Commission] summary error:', e.message);
    res.status(500).json({ success: false, error: '查询失败' });
  }
});

router.get('/my/records', authRequired, (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
    const records = commissionEngine.listRecords(req.user.userId, limit).map(r => ({
      orderNo: r.order_no,
      payerUserId: String(r.payer_user_id || ''),
      ratioPercent: r.ratio_percent,
      baseAmountYuan: (r.base_amount_cents / 100).toFixed(2),
      commissionYuan: (r.commission_cents / 100).toFixed(2),
      status: r.status,
      createdAt: r.created_at,
      unfreezeAt: r.unfreeze_at,
      unfrozenAt: r.unfrozen_at,
      note: r.note || '',
    }));
    res.json({ success: true, data: records });
  } catch (e) {
    console.error('[Commission] records error:', e.message);
    res.status(500).json({ success: false, error: '查询失败' });
  }
});

router.get('/my/withdrawals', authRequired, (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
    const list = commissionEngine.listWithdrawals(req.user.userId, limit).map(w => ({
      withdrawNo: w.withdraw_no,
      amountYuan: (w.amount_cents / 100).toFixed(2),
      status: w.status,
      failReason: w.fail_reason || '',
      createdAt: w.created_at,
      reviewedAt: w.reviewed_at,
      paidAt: w.paid_at,
    }));
    res.json({ success: true, data: list });
  } catch (e) {
    console.error('[Commission] withdrawals error:', e.message);
    res.status(500).json({ success: false, error: '查询失败' });
  }
});

router.post('/my/withdraw', authRequired, (req, res) => {
  try {
    const { amount, openid } = req.body || {};
    const amountNum = Number(amount);
    if (!isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: '提现金额无效' });
    }
    if ((amountNum * 100) % 1 !== 0) {
      return res.status(400).json({ success: false, error: '提现金额最多两位小数' });
    }
    const r = commissionEngine.applyWithdrawal(req.user.userId, amountNum, openid);
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, data: { withdrawNo: r.withdrawNo, amountYuan: (r.amountCents / 100).toFixed(2) } });
  } catch (e) {
    console.error('[Commission] withdraw error:', e.message);
    res.status(500).json({ success: false, error: '申请失败，请稍后重试' });
  }
});

function createRouter() { return router; }
module.exports = createRouter;
module.exports.createRouter = createRouter;
