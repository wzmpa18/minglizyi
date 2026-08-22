// ============================================================================
// 微信支付 V3 JSAPI 核心模块 - v25.0.47_4
// 提供微信支付V3下单、JSAPI支付参数、回调验签、回调解密、主动查单、关单、
// 公众号网页授权(openid获取)全流程能力
//
// 零外部依赖：仅使用 Node.js 内置 crypto / fetch（Node>=18）
//
// 配置（/www/yandaoguoxue-backend/.env）：
//   WECHAT_MCH_ID          商户号（10位数字，商户平台 pay.weixin.cn → 账户中心）
//   WECHAT_APPID           绑定的公众号/服务号 AppID（JSAPI支付必须与商户号绑定）
//   WECHAT_APP_SECRET      公众号 AppSecret（网页授权获取 openid 用；
//                          仅收款可不需要，但网页授权必须配置）
//   WECHAT_API_V3_KEY      APIv3密钥（32位，商户平台 → 账户中心 → API安全 → 设置APIv3密钥）
//   WECHAT_API_CERT_PATH   商户API私钥文件路径（apiclient_key.pem，
//                          商户平台 → 账户中心 → API安全 → 申请API证书后下载）
//   WECHAT_CERT_SERIAL_NO  商户证书序列号（证书文件第一节 serial_no，或商户平台证书页查看）
//   PUBLIC_BASE_URL        公网站点地址（默认 https://yandaoguoxue.yandao.vip，
//                          回调地址 = ${PUBLIC_BASE_URL}/api/payment/callback/wechat）
// ============================================================================

'use strict';

const crypto = require('crypto');
const fs = require('fs');

const API_HOST = 'https://api.mch.weixin.qq.com';
const OAUTH_HOST = 'https://api.weixin.qq.com';

// ============================================================================
// 配置读取与就绪检查
// ============================================================================

function config() {
  return {
    mchId: process.env.WECHAT_MCH_ID || '',
    appId: process.env.WECHAT_APPID || '',
    appSecret: process.env.WECHAT_APP_SECRET || '',
    apiV3Key: process.env.WECHAT_API_V3_KEY || '',
    certPath: process.env.WECHAT_API_CERT_PATH || '',
    certSerialNo: process.env.WECHAT_CERT_SERIAL_NO || '',
    // v25.0.47_5：微信支付公钥模式（2024+新商户号，回调验签用固定公钥替代平台证书）
    pubKeyPath: process.env.WECHAT_PUB_KEY_PATH || '',
    pubKeyId: process.env.WECHAT_PUB_KEY_ID || '',
    baseUrl: process.env.PUBLIC_BASE_URL || 'https://yandaoguoxue.yandao.vip',
  };
}

/** 商户侧配置是否齐备（下单可用） */
function isConfigured() {
  const c = config();
  return !!(c.mchId && c.appId && c.apiV3Key && c.certPath && c.certSerialNo);
}

/** 网页授权配置是否齐备（获取openid用） */
function isOauthConfigured() {
  const c = config();
  return !!(c.appId && c.appSecret);
}

/** JSAPI下单是否齐备（下单签名 + AppID） */
function isReadyForJsapi() {
  return isConfigured() && !!config().appId;
}

/** 配置自检（只返回布尔状态，绝不返回任何密钥值；供后台状态页使用） */
function getConfigStatus() {
  const c = config();
  const certFileOk = !!c.certPath && fs.existsSync(c.certPath);
  const pubKeyFileOk = !!c.pubKeyPath && fs.existsSync(c.pubKeyPath);
  return {
    mchId: !!c.mchId,
    appId: !!c.appId,
    appSecret: !!c.appSecret,
    apiV3Key: !!c.apiV3Key,
    merchantPrivateKeyFile: certFileOk,
    certSerialNo: !!c.certSerialNo,
    wxPayPublicKeyFile: pubKeyFileOk,
    pubKeyId: !!c.pubKeyId,
    // 整体状态：NOT_CONFIGURED(未配置) / PARTIAL(部分) / READY(齐备可开启)
    overall: isConfigured() ? 'READY' : (c.mchId || certFileOk) ? 'PARTIAL' : 'NOT_CONFIGURED',
  };
}

// ============================================================================
// 商户私钥（下单签名用，懒加载 + 缓存）
// ============================================================================

let cachedPrivateKey = null;

function getMerchantPrivateKey() {
  if (cachedPrivateKey) return cachedPrivateKey;
  const c = config();
  if (!c.certPath || !fs.existsSync(c.certPath)) {
    throw new Error(`商户API私钥文件不存在: ${c.certPath || '(未配置WECHAT_API_CERT_PATH)'}`);
  }
  const pem = fs.readFileSync(c.certPath, 'utf-8');
  cachedPrivateKey = crypto.createPrivateKey(pem);
  return cachedPrivateKey;
}

function rsaSha256Sign(message, privateKey) {
  return crypto.createSign('RSA-SHA256').update(message, 'utf-8').sign(privateKey, 'base64');
}

// ============================================================================
// V3 请求签名与调用
// ============================================================================

function buildAuthorizationHeader(method, urlPath, bodyStr) {
  const c = config();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${bodyStr}\n`;
  const signature = rsaSha256Sign(message, getMerchantPrivateKey());
  return (
    `WECHATPAY2-SHA256-RSA2048 ` +
    `mchid="${c.mchId}",` +
    `nonce_str="${nonce}",` +
    `signature="${signature}",` +
    `timestamp="${timestamp}",` +
    `serial_no="${c.certSerialNo}"`
  );
}

/**
 * 调用微信支付V3接口（自动签名）
 * @param {string} method HTTP方法
 * @param {string} urlPath 接口路径（如 /v3/pay/transactions/jsapi）
 * @param {object|null} body 请求体对象（GET为null）
 * @returns {Promise<{ok: boolean, status: number, data: object}>}
 */
async function wxApiRequest(method, urlPath, body) {
  const bodyStr = body ? JSON.stringify(body) : '';
  const authorization = buildAuthorizationHeader(method, urlPath, bodyStr);
  const res = await fetch(`${API_HOST}${urlPath}`, {
    method,
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'yandaoguoxue-node/25.0.47',
    },
    body: bodyStr || undefined,
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

// ============================================================================
// JSAPI 下单
// ============================================================================

/**
 * JSAPI下单
 * @param {object} params
 * @param {string} params.outTradeNo 商户订单号（本系统orderId，唯一）
 * @param {string} params.description 商品描述（合规口径标题）
 * @param {number} params.amountYuan 金额（元）
 * @param {string} params.openid 支付者openid（商户绑定AppID维度）
 * @param {string} [params.notifyUrl] 回调地址（默认 公网站点/api/payment/callback/wechat）
 * @returns {Promise<{success: boolean, prepayId?: string, error?: string}>}
 */
async function createJsapiOrder(params) {
  if (!isConfigured()) {
    return { success: false, error: '微信支付配置未完成' };
  }
  const { outTradeNo, description, amountYuan, openid } = params;
  if (!outTradeNo || !description || !openid) {
    return { success: false, error: '缺少订单号/描述/openid' };
  }
  const totalFen = Math.round(Number(amountYuan) * 100);
  if (!Number.isFinite(totalFen) || totalFen <= 0) {
    return { success: false, error: '金额无效' };
  }
  const c = config();
  const notifyUrl = params.notifyUrl || `${c.baseUrl}/api/payment/callback/wechat`;
  const r = await wxApiRequest('POST', '/v3/pay/transactions/jsapi', {
    appid: c.appId,
    mchid: c.mchId,
    description,
    out_trade_no: outTradeNo,
    notify_url: notifyUrl,
    amount: { total: totalFen, currency: 'CNY' },
    payer: { openid },
  });
  if (r.ok && r.data && r.data.prepay_id) {
    return { success: true, prepayId: r.data.prepay_id };
  }
  const errMsg =
    (r.data && (r.data.message || r.data.code)) ||
    `微信下单失败(HTTP ${r.status})`;
  console.error('[wechatPayV3] createJsapiOrder失败:', JSON.stringify(r.data));
  return { success: false, error: errMsg };
}

/**
 * 由 prepayId 构建前端 WeixinJSBridge 所需支付参数
 * （appId/timeStamp/nonceStr/package/signType/paySign，paySign为商户私钥签名）
 */
function buildJsapiParams(prepayId) {
  const c = config();
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const pkg = `prepay_id=${prepayId}`;
  const message = `${c.appId}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;
  const paySign = rsaSha256Sign(message, getMerchantPrivateKey());
  return {
    appId: c.appId,
    timeStamp,
    nonceStr,
    package: pkg,
    signType: 'RSA',
    paySign,
  };
}

// ============================================================================
// 平台证书管理（回调验签用，自动拉取+缓存）
// ============================================================================

let platformCertsCache = { fetchedAt: 0, bySerial: {} }; // serial -> { publicKeyObject, expireAt }

/**
 * AES-256-GCM 解密（APIv3密钥）——平台证书/回调报文通用
 */
function aesGcmDecrypt(nonce, ciphertext, associatedData) {
  const c = config();
  const key = Buffer.from(c.apiV3Key, 'utf-8');
  const buf = Buffer.from(ciphertext, 'base64');
  const authTag = buf.subarray(buf.length - 16);
  const data = buf.subarray(0, buf.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(nonce, 'utf-8'));
  decipher.setAuthTag(authTag);
  if (associatedData) decipher.setAAD(Buffer.from(associatedData, 'utf-8'));
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf-8');
}

async function loadPlatformCertificates(force = false) {
  const now = Date.now();
  // 10分钟内不重复拉取
  if (!force && now - platformCertsCache.fetchedAt < 10 * 60 * 1000) {
    return platformCertsCache.bySerial;
  }
  const r = await wxApiRequest('GET', '/v3/certificates', null);
  if (!r.ok || !Array.isArray(r.data.data)) {
    throw new Error(`拉取平台证书失败: HTTP ${r.status}`);
  }
  const bySerial = {};
  for (const item of r.data.data) {
    try {
      const certPem = aesGcmDecrypt(
        item.encrypt_certificate.nonce,
        item.encrypt_certificate.ciphertext,
        item.encrypt_certificate.associated_data
      );
      const certObj = new crypto.X509Certificate(certPem);
      bySerial[item.serial_no] = {
        publicKey: crypto.createPublicKey(certObj),
        // 提前1天视为过期，保证边界安全
        expireAt: certObj.validTo ? Date.parse(certObj.validTo) - 86400000 : Infinity,
      };
    } catch (e) {
      console.error('[wechatPayV3] 平台证书解析失败 serial=', item.serial_no, e.message);
    }
  }
  platformCertsCache = { fetchedAt: now, bySerial };
  return bySerial;
}

/**
 * 微信支付公钥（公钥模式验签用，懒加载 + 缓存）
 * 2024+新商户号：商户平台下载的"微信支付公钥"（固定不过期），
 * 回调 Wechatpay-Serial 头返回公钥ID（PUB_KEY_ID_xxx）
 */
let cachedWxPayPublicKey = null;

function getWxPayPublicKey() {
  if (cachedWxPayPublicKey) return cachedWxPayPublicKey;
  const c = config();
  if (!c.pubKeyPath || !fs.existsSync(c.pubKeyPath)) return null;
  cachedWxPayPublicKey = crypto.createPublicKey(fs.readFileSync(c.pubKeyPath, 'utf-8'));
  return cachedWxPayPublicKey;
}

/**
 * 验证回调签名（Wechatpay-Signature 头）
 * 双模式：优先"微信支付公钥"（新商户号），回退"平台证书"（老商户号）
 * @param {object} headers 请求头（小写键名）
 * @param {string} rawBody 原始请求体字符串
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
async function verifyCallbackSignature(headers, rawBody) {
  const timestamp = headers['wechatpay-timestamp'];
  const nonce = headers['wechatpay-nonce'];
  const signature = headers['wechatpay-signature'];
  const serial = headers['wechatpay-serial'];
  if (!timestamp || !nonce || !signature || !serial) {
    return { valid: false, error: '缺少验签头' };
  }
  // 时间戳容忍5分钟，防重放
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    return { valid: false, error: '回调时间戳超出容忍窗口' };
  }

  const message = Buffer.from(`${timestamp}\n${nonce}\n${rawBody}\n`, 'utf-8');
  const sigBuf = Buffer.from(signature, 'base64');

  // 模式一：微信支付公钥（2024+新商户号，serial === 公钥ID）
  const wxPubKey = getWxPayPublicKey();
  if (wxPubKey) {
    const c = config();
    if (serial !== c.pubKeyId) {
      return { valid: false, error: `回调serial(${serial.slice(0, 12)}...)与配置公钥ID不匹配` };
    }
    const ok = crypto.verify('RSA-SHA256', message, wxPubKey, sigBuf);
    return ok ? { valid: true } : { valid: false, error: '签名不匹配（公钥模式）' };
  }

  // 模式二：平台证书（老商户号回退）
  let certs;
  try {
    certs = await loadPlatformCertificates();
  } catch (e) {
    return { valid: false, error: '平台证书拉取失败: ' + e.message };
  }
  let entry = certs[serial];
  if (!entry || Date.now() > entry.expireAt) {
    // 证书轮换：强制刷新一次
    try {
      certs = await loadPlatformCertificates(true);
      entry = certs[serial];
    } catch (e) {
      return { valid: false, error: '平台证书刷新失败: ' + e.message };
    }
  }
  if (!entry) {
    return { valid: false, error: `未知平台证书序列号 ${serial}` };
  }
  const ok = crypto.verify(
    'RSA-SHA256',
    message,
    entry.publicKey,
    Buffer.from(signature, 'base64')
  );
  return ok ? { valid: true } : { valid: false, error: '签名不匹配' };
}

/**
 * 解密回调报文 resource 字段，返回订单明文对象
 * { out_trade_no, transaction_id, trade_state, amount:{total,payer_total}, success_time, ... }
 */
function decryptCallbackResource(resource) {
  if (!resource || !resource.ciphertext) {
    throw new Error('回调resource缺失');
  }
  const plain = aesGcmDecrypt(resource.nonce, resource.ciphertext, resource.associated_data);
  return JSON.parse(plain);
}

// ============================================================================
// 主动查单 / 关单（对账与超时关单用）
// ============================================================================

/**
 * 按商户订单号查询微信侧支付状态
 * @returns {Promise<{success:boolean, tradeState?:string, transactionId?:string, payerTotal?:number, error?:string}>}
 */
async function queryOrderByOutTradeNo(outTradeNo) {
  if (!isConfigured()) return { success: false, error: '配置未完成' };
  const c = config();
  const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${c.mchId}`;
  const r = await wxApiRequest('GET', path, null);
  if (r.ok) {
    return {
      success: true,
      tradeState: r.data.trade_state,
      transactionId: r.data.transaction_id,
      payerTotal: r.data.amount && r.data.amount.payer_total,
      successTime: r.data.success_time,
    };
  }
  if (r.status === 404) {
    // 订单不存在（未下单成功）
    return { success: true, tradeState: 'NOT_FOUND' };
  }
  return { success: false, error: `查单失败 HTTP ${r.status}: ${r.data.message || ''}` };
}

/** 关闭微信侧订单（用户超时未支付时调用） */
async function closeOrderByOutTradeNo(outTradeNo) {
  if (!isConfigured()) return { success: false, error: '配置未完成' };
  const c = config();
  const r = await wxApiRequest('POST', `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}/close`, {
    mchid: c.mchId,
  });
  return r.ok ? { success: true } : { success: false, error: `关单失败 HTTP ${r.status}` };
}

// ============================================================================
// 公众号网页授权（获取openid，JSAPI支付前置）
// ============================================================================

/** 构造网页授权跳转URL（前端重定向到此地址，scope=snsapi_base静默授权） */
function buildOauthAuthorizeUrl(redirectUri, state) {
  const c = config();
  if (!c.appId) throw new Error('WECHAT_APPID未配置');
  const enc = encodeURIComponent(redirectUri);
  const st = state || 'pay';
  return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${c.appId}&redirect_uri=${enc}&response_type=code&scope=snsapi_base&state=${st}#wechat_redirect`;
}

/**
 * code换取openid（网页授权第二步）
 * @returns {Promise<{success:boolean, openid?:string, error?:string}>}
 */
async function getOpenidByOauthCode(code) {
  const c = config();
  if (!c.appId || !c.appSecret) {
    return { success: false, error: '网页授权配置未完成（需WECHAT_APPID+WECHAT_APP_SECRET）' };
  }
  const url = `${OAUTH_HOST}/sns/oauth2/access_token?appid=${c.appId}&secret=${c.appSecret}&code=${encodeURIComponent(code)}&grant_type=authorization_code`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.openid) {
    return { success: true, openid: data.openid };
  }
  return { success: false, error: `code换openid失败: ${data.errcode || ''} ${data.errmsg || ''}` };
}

module.exports = {
  isConfigured,
  isOauthConfigured,
  isReadyForJsapi,
  getConfigStatus,
  config,
  createJsapiOrder,
  buildJsapiParams,
  verifyCallbackSignature,
  decryptCallbackResource,
  queryOrderByOutTradeNo,
  closeOrderByOutTradeNo,
  buildOauthAuthorizeUrl,
  getOpenidByOauthCode,
};
