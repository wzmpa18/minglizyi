'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/lib/appleIap.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const productId = 'com.yandaoguoxue.app.membership.monthly.v1';
function fixture() {
  const calls = [], exports = {};
  let token = 'account-one', status = 'verified', deliverFailure = false, swapAccount = false, profileFailure = false;
  const native = {
    products: async () => ({ products: [{ productId, displayPrice: '¥29' }, { productId: 'unapproved' }] }),
    purchase: async () => { calls.push('native-purchase'); return { status, transactionId: '100001', signedTransaction: 'official-signed-data' }; },
    transactions: async () => ({ transactions: [{ transactionId: '100001', signedTransaction: 'official-signed-data' }] }),
    restore: async () => { calls.push('native-sync'); return native.transactions(); },
    finish: async () => { calls.push('finish'); }, addListener: async () => ({ remove: async () => {} }),
  };
  async function fetch(url) {
    calls.push(url);
    if (url.endsWith('/context')) return { ok: true, json: async () => ({ success: true, data: { appAccountToken: 'server-owned-token' } }) };
    if (url.endsWith('/transactions')) {
      if (swapAccount) token = 'other-account';
      return { ok: !deliverFailure, json: async () => ({ success: !deliverFailure, error: '订单待确认', data: { transactionId: '100001', productId, delivered: true } }) };
    }
    if (url.endsWith('/profile')) return { ok: !profileFailure, json: async () => ({ success: !profileFailure, data: { userId: '1', memberTier: 'monthly' } }) };
    throw Error('Unexpected HTTP request');
  }
  vm.runInNewContext(source, { exports, fetch, AbortSignal, Event, window: { dispatchEvent: () => { calls.push('entitlements-event'); } }, require: name => {
    if (name === '@capacitor/core') return { Capacitor: { getPlatform: () => 'ios', isPluginAvailable: () => true }, registerPlugin: () => native };
    if (name === './auth') return { getUserToken: () => token, setLoginState: () => { calls.push('profile-updated'); } };
    if (name === './releaseFeatures') return { IS_IOS_FULL_BUILD: true };
    if (name === './platformGate') return { clientPlatformHeaders: () => ({ 'X-Client-Platform': 'ios' }) };
    throw Error('Unexpected import');
  } });
  return { api: exports, calls, cancel: () => { status = 'cancelled'; }, pending: () => { status = 'pending'; }, failDelivery: () => { deliverFailure = true; }, switchAccount: () => { swapAccount = true; }, failProfile: () => { profileFailure = true; } };
}
test('Apple prices are obtained natively, and only approved compiled products are offered', async () => {
  const f = fixture(); const products = await f.api.loadAppleProducts();
  assert.equal(products.length, 1); assert.equal(products[0].displayPrice, '¥29'); assert.equal(f.calls.length, 0);
});
test('successful purchase commits server delivery before finishing and then refreshes authoritative membership', async () => {
  const f = fixture(); assert.match(await f.api.purchaseAppleProduct(productId), /权益已到账/);
  assert.deepEqual(f.calls, ['/api/apple-iap/context', 'native-purchase', '/api/apple-iap/transactions', 'finish', '/api/auth/profile', 'profile-updated', 'entitlements-event']);
});
test('pending/cancelled purchases do not deliver or finish; failed delivery remains retryable', async () => {
  for (const action of ['cancel', 'pending']) { const f = fixture(); f[action](); await f.api.purchaseAppleProduct(productId); assert.equal(f.calls.includes('finish'), false); assert.equal(f.calls.includes('/api/apple-iap/transactions'), false); }
  const f = fixture(); f.failDelivery(); await assert.rejects(f.api.purchaseAppleProduct(productId), /订单待确认/); assert.equal(f.calls.includes('finish'), false);
});
test('account switching during delivery never finishes under the wrong login, and a profile error does not misreport undelivered payment', async () => {
  const f = fixture(); f.switchAccount(); await assert.rejects(f.api.purchaseAppleProduct(productId), /账号已切换/); assert.equal(f.calls.includes('finish'), false);
  const g = fixture(); g.failProfile(); await assert.rejects(g.api.purchaseAppleProduct(productId), /购买已确认/); assert.equal(g.calls.includes('finish'), true); assert.equal(g.calls.includes('profile-updated'), false);
});
test('explicit restore synchronizes Apple history while launch recovery does not prompt App Store sync', async () => {
  const f = fixture(); assert.equal((await f.api.restoreApplePurchases()).restored, 1); assert.ok(f.calls.includes('native-sync'));
  const g = fixture(); g.failDelivery(); const result = await g.api.restoreApplePurchases(false); assert.equal(result.restored, 0); assert.equal(result.failed, 1); assert.equal(g.calls.includes('native-sync'), false); assert.equal(g.calls.includes('finish'), false);
});
