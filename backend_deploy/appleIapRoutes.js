'use strict';
const express = require('express');
const Database = require('better-sqlite3');
const activeAccount = require('./middleware/activeAccount');
const verifier = require('./appleIapVerifier');
const ledger = require('./appleIapLedger');
const catalog = require('./appleIapCatalog.json');
let database;
const db = () => database || (database = new Database(process.env.DB_PATH || process.env.USER_DB_PATH || '/root/backend-auth/data/yandao_users.db', { fileMustExist: true }));
const policy = require('./appleIapPolicy').load;
const limited = new Map();
function rateLimit(req, res, next) {
  const key = String(req.account?.user_id || req.ip);
  const now = Date.now(), entry = limited.get(key);
  if (limited.size > 10000) for (const [id, value] of limited) if (value.until <= now) limited.delete(id);
  if (entry && entry.until > now) { if (++entry.count > 120) return res.status(429).json({ success: false, error: '请求过于频繁，请稍后重试' }); }
  else limited.set(key, { until: now + 60000, count: 1 });
  next();
}
function createRouter() {
  const router = express.Router();
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  // Apple retries failed notifications. Return a failure if signature/DB checks
  // fail, and never acknowledge an undelivered financial transaction as success.
  router.post('/notifications', rateLimit, async (req, res) => {
    try {
      const notification = await verifier.notification(req.body?.signedPayload);
      if (notification.notificationType === 'TEST') return res.json({ success: true });
      const signed = notification.data?.signedTransactionInfo;
      if (!signed) return res.json({ success: true, delivered: false });
      const transaction = await verifier.transaction(signed);
      if (transaction.environment !== notification.data.environment || notification.data.bundleId !== catalog.bundleId) throw Error('通知所属应用不一致');
      // The signed transaction is authoritative; a refund must contain a signed
      // revocationDate. Only a verified reversal may re-enable refunded rights.
      if (['REFUND', 'REVOKE'].includes(notification.notificationType) && transaction.revocationDate == null) throw Error('撤销通知缺少已签名撤销时间');
      ledger.apply(db(), transaction, policy(), undefined, Date.now(), notification.notificationType === 'REFUND_REVERSED');
      return res.json({ success: true });
    } catch { return res.status(503).json({ success: false, error: '苹果通知尚未确认，请重试' }); }
  });
  router.use(activeAccount, rateLimit);
  router.get('/context', (req, res) => {
    try {
      verifier.ready();
      res.json({ success: true, data: { appAccountToken: ledger.context(db(), req.account.user_id), sandboxAllowed: ledger.sandboxAllowed(req.account.user_id, policy()), products: catalog.products.map(({ key, productId, kind, days, count }) => ({ key, productId, kind, days, count })) } });
    } catch { res.status(503).json({ success: false, error: '苹果购买服务暂不可用，请稍后重试' }); }
  });
  router.post('/transactions', async (req, res) => {
    try {
      const transaction = await verifier.transaction(req.body?.signedTransaction);
      const result = ledger.apply(db(), transaction, policy(), req.account.user_id);
      res.json({ success: true, data: result });
    } catch (error) {
      // Return only our controlled business errors, never SDK internals/JWS.
      res.status(409).json({ success: false, error: error.message === '苹果购买验证未通过，请稍后重试' || /^(该苹果购买|此账号未配置|购买所属账号)/.test(error.message) ? error.message : '苹果订单尚未确认，请勿重复购买，可稍后恢复购买' });
    }
  });
  return router;
}
module.exports = { createRouter };
