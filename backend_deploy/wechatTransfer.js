/**
 * P8-DISTRIBUTION-COMMISSION-AUTO 阶段二：微信商家转账到零钱（V3）
 *
 * 产品前提：微信商户平台开通「商家转账到零钱」产品权限，并完成转账场景报备。
 * 未配置/未开通时返回 notConfigured，提现保持 PROCESSING 走人工打款（强制审核红线不破）。
 *
 * 接口：
 *   发起转账 POST /v3/fund-app/mch-transfer/transfer-bills
 *   查询转账 GET  /v3/fund-app/mch-transfer/transfer-bills/out-bill-no/{out_bill_no}
 *   撤销转账 POST /v3/fund-app/mch-transfer/transfer-bills/out-bill-no/{out_bill_no}/cancel
 *
 * 复用 wechatPayV3 的商户配置（WECHAT_MCH_ID/WECHAT_APPID/APIv3密钥/商户私钥/证书序列号）。
 * 商家转账专属配置（.env）：
 *   WECHAT_TRANSFER_ENABLED=true           总开关（默认 false）
 *   WECHAT_TRANSFER_SCENE_ID=1001           转账场景ID（商户平台报备后获得）
 *   WECHAT_TRANSFER_DAILY_LIMIT_CENTS=...   单日限额（分）
 *   WECHAT_TRANSFER_SINGLE_MAX_CENTS=...    单笔限额（分）
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const wechatPayV3 = require('./wechatPayV3');

const API_HOST = 'api.mch.weixin.qq.com';

// ==================== 配置 ====================

function transferConfig() {
  return {
    enabled: process.env.WECHAT_TRANSFER_ENABLED === 'true',
    sceneId: process.env.WECHAT_TRANSFER_SCENE_ID || '',
    dailyLimitCents: parseInt(process.env.WECHAT_TRANSFER_DAILY_LIMIT_CENTS, 10) || 0,
    singleMaxCents: parseInt(process.env.WECHAT_TRANSFER_SINGLE_MAX_CENTS, 10) || 0,
  };
}

function isConfigured() {
  const cfg = wechatPayV3.config();
  const tc = transferConfig();
  return !!(
    tc.enabled &&
    cfg.mchId &&
    cfg.appid &&
    cfg.apiV3Key &&
    tc.sceneId &&
    cfg.privateKeyPath &&
    fs.existsSync(cfg.privateKeyPath) &&
    cfg.certSerialNo
  );
}

// ==================== 签名与请求（V3 规范） ====================

let _cachedKey = null;
function getPrivateKey() {
  if (_cachedKey) return _cachedKey;
  const cfg = wechatPayV3.config();
  const pem = fs.readFileSync(cfg.privateKeyPath, 'utf8');
  _cachedKey = crypto.createPrivateKey(pem);
  return _cachedKey;
}

function buildAuthHeader(method, urlPath, bodyStr) {
  const cfg = wechatPayV3.config();
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString('hex');
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${bodyStr}\n`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(message), getPrivateKey());
  const auth = `WECHATPAY2-SHA256-RSA20488 mchid="${cfg.mchId}",nonce_str="${nonce}",signature="${signature.toString('base64')}",timestamp="${timestamp}",serial_no="${cfg.certSerialNo}"`;
  return auth;
}

function httpsRequest(method, urlPath, bodyObj) {
  return new Promise((resolve, reject) => {
    const bodyStr = bodyObj ? JSON.stringify(bodyObj) : '';
    const options = {
      hostname: API_HOST,
      path: urlPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'yandao-guoxue/25.0.47',
        Authorization: buildAuthHeader(method, urlPath, bodyStr),
      },
      timeout: 15000,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let json = null;
        try {
          json = data ? JSON.parse(data) : null;
        } catch { /* 空响应 */ }
        resolve({ statusCode: res.statusCode, body: json, raw: data });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('请求超时')));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ==================== 核心接口 ====================

/**
 * 发起商家转账（用户提现打款）
 * @param {object} params
 *   withdrawNo  商户转账单号（提现单号，幂等键）
 *   openid      收款用户openid
 *   amountCents 金额（分）
 *   note        转账备注（默认「言道国学推荐收益」）
 *   recvPerception 用户收款感知文案
 * @returns {{success:boolean, transferNo?:string, state?:string, notConfigured?:boolean, error?:string}}
 */
async function transfer(params) {
  if (!isConfigured()) {
    return { success: false, notConfigured: true, error: '商家转账未配置（需开通产品并设置WECHAT_TRANSFER_*变量）' };
  }
  const { withdrawNo, openid, amountCents, note, recvPerception } = params || {};
  if (!withdrawNo || !openid || !amountCents) {
    return { success: false, error: '参数无效（withdrawNo/openid/amountCents必填）' };
  }
  const tc = transferConfig();
  if (tc.singleMaxCents > 0 && amountCents > tc.singleMaxCents) {
    return { success: false, error: `超过单笔限额${(tc.singleMaxCents / 100).toFixed(2)}元` };
  }

  const body = {
    appid: wechatPayV3.config().appid,
    out_bill_no: String(withdrawNo),
    transfer_scene_id: tc.sceneId,
    transfer_remark: (note || '言道国学推荐收益').slice(0, 30),
    openid: String(openid),
    transfer_amount: Math.floor(amountCents),
    user_recv_perception: (recvPerception || '推荐佣金收益').slice(0, 20),
  };

  try {
    const res = await httpsRequest('POST', '/v3/fund-app/mch-transfer/transfer-bills', body);
    if (res.statusCode >= 200 && res.statusCode < 300 && res.body) {
      // 受理成功：transfer_bill_no=微信转账单号；state: WAIT_USER_CONFIRM/TRANSFERING/SUCCESS/FAIL
      return {
        success: true,
        transferNo: res.body.transfer_bill_no || null,
        state: res.body.state || 'TRANSFERING',
      };
    }
    const errMsg =
      (res.body && (res.body.message || res.body.code)) || `微信返回${res.statusCode}`;
    return { success: false, error: String(errMsg) };
  } catch (e) {
    return { success: false, error: '网络异常：' + e.message };
  }
}

/**
 * 查询转账状态（对账/重试用）
 * @param {string} withdrawNo 商户转账单号
 */
async function queryTransfer(withdrawNo) {
  if (!isConfigured()) {
    return { success: false, notConfigured: true, error: '商家转账未配置' };
  }
  try {
    const res = await httpsRequest(
      'GET',
      `/v3/fund-app/mch-transfer/transfer-bills/out-bill-no/${encodeURIComponent(withdrawNo)}`
    );
    if (res.statusCode === 200 && res.body) {
      return {
        success: true,
        transferNo: res.body.transfer_bill_no || null,
        state: res.body.state || null, // WAIT_USER_CONFIRM / TRANSFERING / SUCCESS / FAIL / CANCELLED
        failReason: res.body.fail_reason || null,
        updateTime: res.body.update_time || null,
      };
    }
    return { success: false, error: `查询失败(${res.statusCode})` };
  } catch (e) {
    return { success: false, error: '网络异常：' + e.message };
  }
}

/**
 * 撤销转账（转账失败/用户长期未确认时）
 */
async function cancelTransfer(withdrawNo, reason) {
  if (!isConfigured()) {
    return { success: false, notConfigured: true, error: '商家转账未配置' };
  }
  try {
    const res = await httpsRequest(
      'POST',
      `/v3/fund-app/mch-transfer/transfer-bills/out-bill-no/${encodeURIComponent(withdrawNo)}/cancel`,
      { cancel_reason: (reason || '用户提现取消').slice(0, 30) }
    );
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return { success: true, state: res.body && res.body.state };
    }
    return { success: false, error: (res.body && res.body.message) || `撤销失败(${res.statusCode})` };
  } catch (e) {
    return { success: false, error: '网络异常：' + e.message };
  }
}

/**
 * 商家转账回调处理（微信异步通知转账结果）
 * 复用 wechatPayV3 的验签与解密。挂载：POST /api/payment/callback/transfer
 * @returns {{ok:boolean, withdrawNo?:string, state?:string, error?:string}}
 */
async function handleTransferCallback(headers, rawBody) {
  try {
    const valid = await wechatPayV3.verifyCallbackSignature(headers, rawBody);
    if (!valid) return { ok: false, error: '签名验证失败' };
    const event = JSON.parse(rawBody);
    if (!event || event.event_type !== 'TRANSPORT.BILL.TRANSFER' || !event.resource) {
      return { ok: false, error: '非转账结果通知' };
    }
    const resource = wechatPayV3.decryptCallbackResource(event.resource);
    if (!resource) return { ok: false, error: '解密失败' };
    return {
      ok: true,
      withdrawNo: resource.out_bill_no,
      transferNo: resource.transfer_bill_no || null,
      state: resource.state,
      failReason: resource.fail_reason || null,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = {
  transferConfig,
  isConfigured,
  transfer,
  queryTransfer,
  cancelTransfer,
  handleTransferCallback,
};
