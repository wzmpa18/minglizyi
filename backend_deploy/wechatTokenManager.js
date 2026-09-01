// ============================================================================
// 言道国学 - 微信服务号 Token 管理器（指令书第二十一~二十四章）
// access_token / jsapi_ticket 唯一缓存（DB 持久化，进程重启不丢）
// 并发刷新锁：进程内 Promise mutex（PM2 单实例部署）
// 安全刷新窗口：到期前 5 分钟主动刷新；7200s 官方有效期
// 日志纪律：不打印 access_token 完整值（指令书第九十八章）
// ============================================================================
const crypto = require('crypto');
const { getDb } = require('./wechatOaDb');

const REFRESH_WINDOW_MS = 5 * 60 * 1000; // 到期前5分钟刷新
let refreshLocks = { access_token: null, jsapi_ticket: null };

function config() {
  return {
    appId: process.env.WECHAT_OA_APP_ID || '',
    appSecret: process.env.WECHAT_OA_APP_SECRET || '',
    enabled: (process.env.WECHAT_OA_ENABLED || 'false') === 'true',
  };
}

function isConfigured() {
  const c = config();
  return !!(c.appId && c.appSecret);
}

// 微信 API 统一调用（带429限流退避，指令书第七十八章：立即延迟不疯狂重放）
async function wxApiGet(url) {
  const res = await fetch(url);
  if (res.status === 429) {
    const wait = parseInt(res.headers.get('retry-after') || '5', 10) * 1000;
    throw Object.assign(new Error('WECHAT_RATE_LIMITED'), { retryAfterMs: wait });
  }
  return res.json();
}

async function fetchAccessToken() {
  const c = config();
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${c.appId}&secret=${c.appSecret}`;
  const data = await wxApiGet(url);
  if (!data.access_token) {
    throw new Error(`access_token获取失败: ${data.errcode || 'UNKNOWN'} ${data.errmsg || ''}`);
  }
  const expiresIn = (data.expires_in || 7200) * 1000;
  persist('access_token', data.access_token, expiresIn);
  return data.access_token;
}

async function fetchJsapiTicket(accessToken) {
  const url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${accessToken}&type=jsapi`;
  const data = await wxApiGet(url);
  if (!data.ticket) {
    throw new Error(`jsapi_ticket获取失败: ${data.errcode || 'UNKNOWN'} ${data.errmsg || ''}`);
  }
  const expiresIn = (data.expires_in || 7200) * 1000;
  persist('jsapi_ticket', data.ticket, expiresIn);
  return data.ticket;
}

function persist(key, value, ttlMs) {
  getDb().prepare(`INSERT INTO wechat_token_cache(cache_key, value, expires_at, updated_at)
    VALUES(?, ?, ?, datetime('now','localtime'))
    ON CONFLICT(cache_key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at, updated_at = excluded.updated_at`)
    .run(key, value, Date.now() + ttlMs);
}

function loadValid(key) {
  const row = getDb().prepare('SELECT value, expires_at FROM wechat_token_cache WHERE cache_key = ?').get(key);
  if (!row) return null;
  if (Date.now() >= row.expires_at - REFRESH_WINDOW_MS) return null;
  return row.value;
}

function invalidate(key) {
  getDb().prepare('DELETE FROM wechat_token_cache WHERE cache_key = ?').run(key);
}

// 唯一入口：并发调用共享同一个 in-flight Promise（第二十四章并发刷新锁）
async function getAccessToken(force) {
  if (!isConfigured()) throw new Error('WECHAT_OA_NOT_CONFIGURED');
  if (!force) {
    const cached = loadValid('access_token');
    if (cached) return cached;
  } else {
    invalidate('access_token');
    invalidate('jsapi_ticket');
  }
  if (refreshLocks.access_token) return refreshLocks.access_token;
  refreshLocks.access_token = (async () => {
    try {
      const again = loadValid('access_token');
      if (again) return again;
      return await fetchAccessToken();
    } finally {
      refreshLocks.access_token = null;
    }
  })();
  return refreshLocks.access_token;
}

async function getJsapiTicket(force) {
  if (!isConfigured()) throw new Error('WECHAT_OA_NOT_CONFIGURED');
  if (!force) {
    const cached = loadValid('jsapi_ticket');
    if (cached) return cached;
  }
  if (refreshLocks.jsapi_ticket) return refreshLocks.jsapi_ticket;
  refreshLocks.jsapi_ticket = (async () => {
    try {
      const again = loadValid('jsapi_ticket');
      if (again) return again;
      const token = await getAccessToken();
      return await fetchJsapiTicket(token);
    } finally {
      refreshLocks.jsapi_ticket = null;
    }
  })();
  return refreshLocks.jsapi_ticket;
}

// JS-SDK 签名（第二十一章）：nonceStr + timestamp + url + jsapi_ticket → sha1
async function buildJsSignature(url) {
  const ticket = await getJsapiTicket();
  const nonceStr = crypto.randomBytes(8).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000);
  const raw = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
  const signature = crypto.createHash('sha1').update(raw, 'utf8').digest('hex');
  return { appId: config().appId, nonceStr, timestamp, signature };
}

function tokenStatus() {
  const db = getDb();
  const token = db.prepare('SELECT expires_at, updated_at FROM wechat_token_cache WHERE cache_key = ?').get('access_token');
  const ticket = db.prepare('SELECT expires_at, updated_at FROM wechat_token_cache WHERE cache_key = ?').get('jsapi_ticket');
  const fmt = (row) => row ? {
    present: true,
    expiresAt: new Date(Number(row.expires_at)).toISOString(),
    refreshedAt: row.updated_at,
    valid: Date.now() < Number(row.expires_at) - REFRESH_WINDOW_MS,
  } : { present: false, valid: false };
  return { configured: isConfigured(), enabled: config().enabled, accessToken: fmt(token), jsapiTicket: fmt(ticket) };
}

module.exports = { config, isConfigured, getAccessToken, getJsapiTicket, buildJsSignature, tokenStatus, invalidate };
