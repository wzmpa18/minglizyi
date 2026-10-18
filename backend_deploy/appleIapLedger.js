'use strict';
const { randomUUID } = require('crypto');
const catalog = require('./appleIapCatalog.json');
const memberships = require('./membershipLedger');
const credits = require('./paymentAiCredits');
const initialized = new WeakSet();
const atomic = (db, fn) => db.inTransaction ? fn() : db.transaction(fn).immediate();
function ensure(db) {
  if (initialized.has(db)) return;
  db.exec(`CREATE TABLE IF NOT EXISTS apple_iap_accounts (
    user_id TEXT PRIMARY KEY, app_account_token TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS apple_iap_transactions (
    environment TEXT NOT NULL, transaction_id TEXT NOT NULL, original_transaction_id TEXT NOT NULL,
    user_id TEXT NOT NULL, product_id TEXT NOT NULL, purchased_at INTEGER NOT NULL,
    signed_at INTEGER NOT NULL, revoked_at INTEGER, revoked_remaining INTEGER, created_at INTEGER NOT NULL,
    PRIMARY KEY(environment,transaction_id));`);
  memberships.ensure(db); credits.ensure(db); initialized.add(db);
}
function context(db, userId) {
  ensure(db);
  db.prepare('INSERT OR IGNORE INTO apple_iap_accounts(user_id,app_account_token,created_at) VALUES(?,?,?)').run(String(userId), randomUUID(), Date.now());
  return db.prepare('SELECT app_account_token FROM apple_iap_accounts WHERE user_id=?').get(String(userId)).app_account_token;
}
function sandboxAllowed(userId, policy) {
  return (policy.sandboxUserIds || []).map(String).includes(String(userId));
}
// Input to this function MUST be the result of the official signature verifier.
// A plain client JSON object is never accepted by the HTTP router.
function apply(db, tx, policy = {}, expectedUserId, now = Date.now(), verifiedRefundReversal = false) {
  ensure(db);
  const product = catalog.products.find(item => item.productId === tx.productId);
  if (tx.bundleId !== catalog.bundleId || !['Production', 'Sandbox'].includes(tx.environment) || !product || tx.type !== product.type.replace('NON_RENEWING_SUBSCRIPTION', 'Non-Renewing Subscription').replace('NON_CONSUMABLE', 'Non-Consumable').replace('CONSUMABLE', 'Consumable') || tx.quantity !== 1 || !/^\d{1,30}$/.test(tx.transactionId || '') || !/^\d{1,30}$/.test(tx.originalTransactionId || '') || !Number.isSafeInteger(tx.purchaseDate) || tx.purchaseDate <= 0 || tx.purchaseDate > now + 60000 || !Number.isSafeInteger(tx.signedDate) || tx.signedDate < tx.purchaseDate || tx.signedDate > now + 60000 || typeof tx.appAccountToken !== 'string') throw Error('苹果商品或交易信息不一致');
  const owner = db.prepare('SELECT user_id FROM apple_iap_accounts WHERE app_account_token=?').get(tx.appAccountToken.toLowerCase());
  if (!owner || expectedUserId != null && String(expectedUserId) !== owner.user_id) throw Error('该苹果购买属于其他言道国学账号，请登录购买时的账号');
  if (tx.environment === 'Sandbox' && !sandboxAllowed(owner.user_id, policy)) throw Error('此账号未配置苹果沙盒测试权限，请使用指定测试账号');
  const user = db.prepare('SELECT status,deleted_at FROM users WHERE user_id=?').get(owner.user_id);
  if (!user || user.deleted_at || user.status === 'banned') throw Error('购买所属账号不可用，请联系客服');
  if (tx.revocationDate != null && (!Number.isSafeInteger(tx.revocationDate) || tx.revocationDate < tx.purchaseDate || tx.revocationDate > now + 60000)) throw Error('苹果撤销信息无效');
  return atomic(db, () => {
    const existing = db.prepare('SELECT * FROM apple_iap_transactions WHERE environment=? AND transaction_id=?').get(tx.environment, tx.transactionId);
    if (existing && (existing.user_id !== owner.user_id || existing.product_id !== tx.productId || existing.purchased_at !== tx.purchaseDate || existing.original_transaction_id !== tx.originalTransactionId)) throw Error('苹果交易快照冲突');
    // Only an officially verified REFUND_REVERSED notification can reverse a
    // refund; a client receipt, including a newer one, cannot clear revocation.
    const reversing = verifiedRefundReversal && existing?.revoked_at != null && tx.revocationDate == null && tx.signedDate >= existing.signed_at;
    const incomingRevocation = !existing || tx.signedDate >= existing.signed_at ? tx.revocationDate ?? null : null;
    const revokedAt = reversing ? null : existing?.revoked_at ?? incomingRevocation;
    db.prepare('INSERT OR IGNORE INTO apple_iap_transactions(environment,transaction_id,original_transaction_id,user_id,product_id,purchased_at,signed_at,revoked_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(tx.environment, tx.transactionId, tx.originalTransactionId, owner.user_id, tx.productId, tx.purchaseDate, tx.signedDate, revokedAt, now);
    db.prepare('UPDATE apple_iap_transactions SET signed_at=MAX(signed_at,?),revoked_at=? WHERE environment=? AND transaction_id=?').run(tx.signedDate, revokedAt, tx.environment, tx.transactionId);
    const source = `apple:${tx.environment}:${tx.transactionId}`;
    if (product.kind === 'membership') {
      if (reversing) db.prepare('UPDATE membership_purchase_grants SET revoked_at=NULL WHERE source=?').run(source);
      // Insert even an already-revoked grant, then revoke in the SAME transaction.
      memberships.purchase(db, { source, userId: owner.user_id, provider: 'apple', level: product.key, days: product.days ?? -1, purchasedAt: tx.purchaseDate }, now);
      if (revokedAt != null) memberships.revoke(db, source, now);
    } else {
      credits.grant(db, owner.user_id, source, product.count, null);
      if (reversing) db.prepare('UPDATE paid_ai_credits SET remaining=? WHERE source_order_no=?').run(existing.revoked_remaining ?? 0, source);
      if (revokedAt != null) {
        const remaining = db.prepare('SELECT remaining FROM paid_ai_credits WHERE source_order_no=?').get(source).remaining;
        if (existing?.revoked_at == null) db.prepare('UPDATE apple_iap_transactions SET revoked_remaining=? WHERE environment=? AND transaction_id=?').run(remaining, tx.environment, tx.transactionId);
        db.prepare('UPDATE paid_ai_credits SET remaining=0 WHERE source_order_no=?').run(source);
      }
    }
    return { transactionId: tx.transactionId, productId: tx.productId, environment: tx.environment, delivered: revokedAt == null, revoked: revokedAt != null };
  });
}
module.exports = { ensure, context, apply, sandboxAllowed };
