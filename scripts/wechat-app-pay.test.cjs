'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'yandao-wxapp-'));
const keyPath = path.join(directory, 'merchant-key.pem');
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
fs.writeFileSync(keyPath, privateKey.export({ type: 'pkcs8', format: 'pem' }));
process.env.WECHAT_MCH_ID = '1900007291';
process.env.WECHAT_APPID = 'wx1111111111111111';
process.env.WECHAT_OPEN_APP_ID = 'wx2222222222222222';
process.env.WECHAT_API_V3_KEY = '0'.repeat(32);
process.env.WECHAT_API_CERT_PATH = keyPath;
process.env.WECHAT_CERT_SERIAL_NO = 'TEST_SERIAL';
const wx = require('../backend_deploy/wechatPayV3');

test('APP pay signs the mobile AppID, timestamp, nonce and prepay ID', () => {
  const params = wx.buildAppPayParams('wxprepay123');
  assert.equal(params.appId, process.env.WECHAT_OPEN_APP_ID);
  assert.notEqual(params.appId, process.env.WECHAT_APPID);
  assert.equal(params.partnerId, process.env.WECHAT_MCH_ID);
  assert.equal(params.packageValue, 'Sign=WXPay');
  assert.match(params.timeStamp, /^\d{10}$/);
  const message = `${params.appId}\n${params.timeStamp}\n${params.nonceStr}\n${params.prepayId}\n`;
  assert.equal(crypto.verify('RSA-SHA256', Buffer.from(message), publicKey, Buffer.from(params.sign, 'base64')), true);
});

test('APP order uses the APP endpoint and server amount in cents', async () => {
  const originalFetch = global.fetch;
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, text: async () => JSON.stringify({ prepay_id: 'wxprepay456' }) };
  };
  try {
    const result = await wx.createAppOrder({ outTradeNo: 'YD202611100001', description: '学习会员', amountYuan: 37 });
    assert.deepEqual(result, { success: true, prepayId: 'wxprepay456' });
    assert.equal(request.url, 'https://api.mch.weixin.qq.com/v3/pay/transactions/app');
    const body = JSON.parse(request.options.body);
    assert.equal(body.appid, process.env.WECHAT_OPEN_APP_ID);
    assert.equal(body.amount.total, 3700);
    assert.equal(body.notify_url, 'https://yandaoguoxue.yandao.vip/api/payment/callback/wechat');
  } finally {
    global.fetch = originalFetch;
  }
});

test('APP order rejects bad amount before any external request', async () => {
  const originalFetch = global.fetch;
  global.fetch = () => { throw Error('must not request'); };
  try {
    const result = await wx.createAppOrder({ outTradeNo: 'YD202611100002', description: '学习会员', amountYuan: 0 });
    assert.equal(result.success, false);
  } finally {
    global.fetch = originalFetch;
  }
});

test('APP payment stays unavailable without a mobile application AppID', async () => {
  const mobileAppId = process.env.WECHAT_OPEN_APP_ID;
  delete process.env.WECHAT_OPEN_APP_ID;
  try {
    assert.equal(wx.isReadyForAppPay(), false);
    const result = await wx.createAppOrder({ outTradeNo: 'YD202611100003', description: '学习会员', amountYuan: 1 });
    assert.equal(result.success, false);
  } finally {
    process.env.WECHAT_OPEN_APP_ID = mobileAppId;
  }
});

test('APP payment cannot reuse the public-account AppID', () => {
  const mobileAppId = process.env.WECHAT_OPEN_APP_ID;
  process.env.WECHAT_OPEN_APP_ID = process.env.WECHAT_APPID;
  try {
    assert.equal(wx.isReadyForAppPay(), false);
  } finally {
    process.env.WECHAT_OPEN_APP_ID = mobileAppId;
  }
});

process.on('exit', () => fs.rmSync(directory, { recursive: true, force: true }));
