'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const ledger = require('../backend_deploy/appleIapLedger');
const catalog = require('../backend_deploy/appleIapCatalog.json');
const now = Date.parse('2026-10-18T10:00:00Z'), day = 86400000;
function database() {
  const db = new DatabaseSync(':memory:');
  db.exec("CREATE TABLE users(user_id INTEGER PRIMARY KEY,member_level TEXT,membership_expiry TEXT,status TEXT,deleted_at TEXT); INSERT INTO users VALUES(1,'basic',NULL,'active',NULL),(2,'basic',NULL,'active',NULL)");
  Object.defineProperty(db, 'inTransaction', { get() { return db.isTransaction; } });
  db.transaction = fn => ({ immediate() { db.exec('BEGIN IMMEDIATE'); try { const result = fn(); db.exec('COMMIT'); return result; } catch (e) { db.exec('ROLLBACK'); throw e; } } });
  ledger.ensure(db); return db;
}
function tx(db, key = 'pack_10', overrides = {}) {
  const product = catalog.products.find(p => p.key === key);
  return { bundleId: catalog.bundleId, productId: product.productId, type: { CONSUMABLE: 'Consumable', NON_CONSUMABLE: 'Non-Consumable', NON_RENEWING_SUBSCRIPTION: 'Non-Renewing Subscription' }[product.type], quantity: 1, transactionId: '100001', originalTransactionId: '100001', purchaseDate: now - 1000, signedDate: now, appAccountToken: ledger.context(db, 1), environment: 'Production', ...overrides };
}
test('verified transaction owns a stable account token; duplicate delivery never refills spent Apple credits', () => {
  const db = database(); try {
    const t = tx(db); assert.equal(ledger.context(db, 1), t.appAccountToken);
    ledger.apply(db, t, {}, 1, now);
    db.prepare('UPDATE paid_ai_credits SET remaining=6').run();
    ledger.apply(db, t, {}, 1, now);
    assert.equal(db.prepare('SELECT remaining,expires_at FROM paid_ai_credits').get().remaining, 6);
    assert.equal(db.prepare('SELECT expires_at FROM paid_ai_credits').get().expires_at, null);
    assert.throws(() => ledger.apply(db, t, {}, 2, now), /其他言道国学账号/);
    assert.throws(() => ledger.apply(db, { ...t, productId: catalog.products[5].productId }, {}, 1, now), /快照冲突/);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM apple_iap_transactions').get().n, 1);
  } finally { db.close(); }
});
test('wrong bundle, unknown SKU, unbound token, wrong quantity/type, LocalTesting, bad dates and deleted account fail closed', () => {
  const db = database(); try {
    const t = tx(db);
    for (const invalid of [{ bundleId: 'other' }, { productId: 'other' }, { appAccountToken: 'unknown' }, { quantity: 2 }, { type: 'Non-Consumable' }, { environment: 'Xcode' }, { environment: 'LocalTesting' }, { signedDate: now - 2000 }, { purchaseDate: now + day }]) assert.throws(() => ledger.apply(db, { ...t, ...invalid }, {}, 1, now));
    db.prepare("UPDATE users SET deleted_at='deleted' WHERE user_id=1").run();
    assert.throws(() => ledger.apply(db, t, {}, 1, now), /账号不可用/);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM apple_iap_transactions').get().n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM paid_ai_credits').get().n, 0);
  } finally { db.close(); }
});
test('sandbox is explicitly restricted to configured test accounts and transaction IDs are environment namespaced', () => {
  const db = database(); try {
    const t = tx(db, 'pack_10', { environment: 'Sandbox' });
    assert.throws(() => ledger.apply(db, t, {}, 1, now), /沙盒测试权限/);
    ledger.apply(db, t, { sandboxUserIds: [1] }, 1, now);
    ledger.apply(db, { ...t, environment: 'Production' }, {}, 1, now);
    assert.equal(db.prepare('SELECT SUM(remaining) AS n FROM paid_ai_credits').get().n, 20);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM apple_iap_transactions').get().n, 2);
  } finally { db.close(); }
});
test('refund revokes only remaining credits, stale receipts cannot restore them, verified reversal does not replenish spent credits', () => {
  const db = database(); try {
    const t = tx(db); ledger.apply(db, t, {}, 1, now);
    db.prepare('UPDATE paid_ai_credits SET remaining=6').run();
    const refunded = { ...t, signedDate: now + 1000, revocationDate: now + 1000 };
    ledger.apply(db, refunded, {}, undefined, now + 1000);
    ledger.apply(db, t, {}, 1, now + 1000);
    assert.equal(db.prepare('SELECT remaining FROM paid_ai_credits').get().remaining, 0);
    const reversed = { ...t, signedDate: now + 2000 };
    ledger.apply(db, reversed, {}, 1, now + 2000);
    assert.equal(db.prepare('SELECT remaining FROM paid_ai_credits').get().remaining, 0);
    // The same snapshot arriving as a client replay cannot reverse a refund;
    // an official signed REFUND_REVERSED notification can.
    const official = reversed;
    ledger.apply(db, official, {}, undefined, now + 3000, true);
    assert.equal(db.prepare('SELECT remaining FROM paid_ai_credits').get().remaining, 6);
    db.prepare('UPDATE paid_ai_credits SET remaining=4').run();
    ledger.apply(db, official, {}, undefined, now + 3000, true);
    ledger.apply(db, refunded, {}, 1, now + 3000);
    assert.equal(db.prepare('SELECT remaining FROM paid_ai_credits').get().remaining, 4);
  } finally { db.close(); }
});
test('membership refund and Apple reversal preserve independent Android rights', () => {
  const db = database(); try {
    db.prepare("UPDATE users SET member_level='monthly',membership_expiry=? WHERE user_id=1").run(new Date(now + 10 * day).toISOString());
    const t = tx(db, 'yearly', { purchaseDate: now });
    ledger.apply(db, t, {}, 1, now);
    const m = require('../backend_deploy/membershipLedger');
    m.purchase(db, { source: 'payment:later', userId: 1, provider: 'payment', level: 'monthly', days: 30, purchasedAt: now + 1000 }, now + 1000);
    ledger.apply(db, { ...t, signedDate: now + 2000, revocationDate: now + 2000 }, {}, undefined, now + 2000);
    assert.equal(db.prepare('SELECT member_level FROM users WHERE user_id=1').get().member_level, 'monthly');
    assert.equal(Date.parse(db.prepare('SELECT membership_expiry FROM users WHERE user_id=1').get().membership_expiry), now + 40 * day);
    ledger.apply(db, { ...t, signedDate: now + 3000 }, {}, undefined, now + 3000, true);
    assert.equal(db.prepare('SELECT member_level FROM users WHERE user_id=1').get().member_level, 'yearly');
  } finally { db.close(); }
});
test('restoring expired historical time cards cannot extend a currently valid legacy Android membership', () => {
  const db = database(); try {
    db.prepare("UPDATE users SET member_level='monthly',membership_expiry=? WHERE user_id=1").run(new Date(now + 10 * day).toISOString());
    ledger.apply(db, tx(db, 'monthly', { purchaseDate: now - 100 * day }), {}, 1, now);
    assert.equal(Date.parse(db.prepare('SELECT membership_expiry FROM users WHERE user_id=1').get().membership_expiry), now + 10 * day);
  } finally { db.close(); }
});
