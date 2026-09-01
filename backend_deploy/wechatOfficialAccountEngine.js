// ============================================================================
// 言道国学 - 微信服务号核心引擎（指令书第七~十二章 / 九十七章）
// - GET 验签：sha1(sort(token, timestamp, nonce)) === signature → 回显 echostr
// - POST 事件：明文/兼容/安全三模式；安全模式用 EncodingAESKey（aes-256-cbc）
// - 事件幂等：fingerprint 唯一索引（FromUserName+MsgType+Event+EventKey+CreateTime）
// - Webhook 安全：签名不合法直接 403，不进入业务
// ============================================================================
const crypto = require('crypto');
const { getDb } = require('./wechatOaDb');

// ---------- 签名 ----------
function checkSignature(signature, timestamp, nonce) {
  const token = process.env.WECHAT_OA_TOKEN || '';
  if (!token) return false;
  const arr = [token, String(timestamp || ''), String(nonce || '')].sort();
  const sha1 = crypto.createHash('sha1').update(arr.join(''), 'utf8').digest('hex');
  return sha1 === signature;
}

// ---------- 轻量 XML 解析（微信消息格式扁平，无需 xml 库） ----------
function parseXml(xml) {
  const out = {};
  if (!xml || typeof xml !== 'string') return out;
  const re = /<([A-Za-z0-9_]+)>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/\1>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    out[m[1]] = m[2] !== undefined ? m[2] : (m[3] || '');
  }
  return out;
}

// ---------- WXBizMsgCrypt 安全模式 ----------
function aesKeyFromEncoding(encodingAesKey) {
  return Buffer.from(encodingAesKey + '=', 'base64'); // 43位 + '=' → 32字节
}

function decryptMessage(encryptedBase64, encodingAesKey) {
  const key = aesKeyFromEncoding(encodingAesKey);
  const iv = key.slice(0, 16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  decipher.setAutoPadding(false);
  let plain = Buffer.concat([decipher.update(Buffer.from(encryptedBase64, 'base64')), decipher.final()]);
  // 去PKCS#7填充
  const pad = plain[plain.length - 1];
  if (pad > 0 && pad <= 32) plain = plain.slice(0, plain.length - pad);
  // 结构：16字节随机 + 4字节msg_len(网络序) + msg + appid
  const msgLen = plain.readUInt32BE(16);
  const msg = plain.slice(20, 20 + msgLen).toString('utf8');
  const appId = plain.slice(20 + msgLen).toString('utf8');
  return { msg, appId };
}

function encryptMessage(replyXml, encodingAesKey, appId) {
  const key = aesKeyFromEncoding(encodingAesKey);
  const iv = key.slice(0, 16);
  const random = crypto.randomBytes(16);
  const msgBuf = Buffer.from(replyXml, 'utf8');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(msgBuf.length, 0);
  const appBuf = Buffer.from(appId, 'utf8');
  const raw = Buffer.concat([random, lenBuf, msgBuf, appBuf]);
  const padLen = 32 - (raw.length % 32);
  const padBuf = Buffer.alloc(padLen, padLen);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(Buffer.concat([raw, padBuf])), cipher.final()]).toString('base64');
}

function replySignature(token, encrypted, timestamp, nonce) {
  const arr = [token, encrypted, String(timestamp), String(nonce)].sort();
  return crypto.createHash('sha1').update(arr.join(''), 'utf8').digest('hex');
}

// ---------- 事件处理（幂等 + 持久化） ----------
function eventFingerprint(msg) {
  const raw = [msg.FromUserName, msg.MsgType, msg.Event || '', msg.EventKey || '', msg.CreateTime || ''].join('|');
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

function upsertFollower(openid, patch) {
  const db = getDb();
  const now = new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19); // 北京时间口径
  const existing = db.prepare('SELECT openid FROM wechat_oa_followers WHERE openid = ?').get(openid);
  if (existing) {
    db.prepare(`UPDATE wechat_oa_followers SET subscribe = ?, nickname = ?, avatar = ?, language = ?, source_scene = ?, qr_scene = ?, updated_at = datetime('now','localtime'),
      subscribe_time = CASE WHEN ? = 1 AND subscribe = 0 THEN ? ELSE subscribe_time END,
      unsubscribe_time = CASE WHEN ? = 0 THEN ? ELSE unsubscribe_time END
      WHERE openid = ?`)
      .run(patch.subscribe ?? 1, patch.nickname || '', patch.avatar || '', patch.language || '',
        patch.source_scene || '', patch.qr_scene || '',
        patch.subscribe ?? 1, now, patch.subscribe ?? 1, now, openid);
  } else {
    db.prepare(`INSERT INTO wechat_oa_followers(openid, unionid, subscribe, subscribe_time, unsubscribe_time, nickname, avatar, language, source_scene, qr_scene)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(openid, patch.unionid || '', patch.subscribe ?? 1,
        (patch.subscribe ?? 1) === 1 ? now : '', (patch.subscribe ?? 1) === 0 ? now : '',
        patch.nickname || '', patch.avatar || '', patch.language || '', patch.source_scene || '', patch.qr_scene || '');
  }
}

// 处理单条消息/事件。返回 'ok'（微信要求200，正文随意）或需回复的XML
function handleMessage(msg) {
  const db = getDb();
  const openid = msg.FromUserName || '';
  if (!openid) return { action: 'ok' };

  const fp = eventFingerprint(msg);
  // 幂等：同一指纹已处理则跳过（微信会重复推送）
  const dup = db.prepare('SELECT event_id FROM wechat_oa_events WHERE fingerprint = ?').get(fp);
  if (dup) return { action: 'ok', duplicated: true };

  const msgType = msg.MsgType || '';
  const eventType = msg.Event || '';
  let eventTypeLabel = msgType;

  if (msgType === 'event') {
    if (eventType === 'subscribe') {
      eventTypeLabel = 'subscribe';
      upsertFollower(openid, { subscribe: 1, source_scene: 'direct', qr_scene: (msg.EventKey || '').replace('qrscene_', '') });
    } else if (eventType === 'unsubscribe') {
      eventTypeLabel = 'unsubscribe';
      upsertFollower(openid, { subscribe: 0 });
    } else if (eventType === 'SCAN') {
      eventTypeLabel = 'SCAN';
      upsertFollower(openid, { subscribe: 1, source_scene: 'qr', qr_scene: msg.EventKey || '' });
    } else if (eventType === 'CLICK') {
      eventTypeLabel = 'CLICK';
      const bound = db.prepare("SELECT user_id FROM wechat_user_binding WHERE openid = ? AND bind_status = 'BOUND'").get(openid);
      if (bound) {
        db.prepare("UPDATE wechat_user_binding SET last_seen_at = datetime('now','localtime') WHERE openid = ? AND bind_status = 'BOUND'").run(openid);
      }
    } else if (eventType === 'VIEW') {
      eventTypeLabel = 'VIEW';
    } else if (eventType === 'LOCATION') {
      eventTypeLabel = 'LOCATION';
    } else {
      eventTypeLabel = `event:${eventType}`;
    }
  } else if (msgType === 'text') {
    eventTypeLabel = 'text';
    // 不保存私人正文（第十一章：不要保存不必要的私人正文）
  }

  db.prepare(`INSERT INTO wechat_oa_events(openid, event_type, event_key, fingerprint, processed_at, status)
    VALUES(?, ?, ?, ?, datetime('now','localtime'), 'PROCESSED')`)
    .run(openid, eventTypeLabel, eventType === 'VIEW' || eventType === 'CLICK' ? String(msg.EventKey || '').slice(0, 200) : '', fp);

  // subscribe 首次欢迎回复（明文模式回复；安全模式由 routes 层加密）
  if (msgType === 'event' && eventType === 'subscribe') {
    const reply = buildTextReply(openid, msg.ToUserName || '', '欢迎关注言道国学研习！这里有专业罗盘、七政四余、八字排盘等国学工具与系统学习资料。点击下方菜单开始探索。');
    return { action: 'reply', xml: reply };
  }
  return { action: 'ok' };
}

function buildTextReply(toUser, fromUser, content) {
  const ts = Math.floor(Date.now() / 1000);
  return `<xml><ToUserName><![CDATA[${toUser}]]></ToUserName><FromUserName><![CDATA[${fromUser}]]></FromUserName><CreateTime>${ts}</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[${content}]]></Content></xml>`;
}

// ---------- OAuth（第十三~十四章：state 随机/一次性/短TTL/redirect白名单） ----------
const oauthStates = new Map(); // state → { redirect, expires }
const OAUTH_TTL_MS = 5 * 60 * 1000;
const REDIRECT_ALLOW = [
  'https://yandaoguoxue.yandao.vip',
  'https://www.yandao.vip',
];

function isRedirectAllowed(redirect) {
  if (!redirect || typeof redirect !== 'string') return false;
  return REDIRECT_ALLOW.some((base) => redirect === base || redirect.startsWith(base + '/'));
}

function createOAuthState(redirect) {
  if (!isRedirectAllowed(redirect)) return null;
  const state = crypto.randomBytes(16).toString('hex');
  oauthStates.set(state, { redirect, expires: Date.now() + OAUTH_TTL_MS });
  // 过期清理
  if (oauthStates.size > 500) {
    const now = Date.now();
    for (const [k, v] of oauthStates) if (v.expires < now) oauthStates.delete(k);
  }
  return state;
}

function consumeOAuthState(state) {
  const rec = oauthStates.get(state);
  if (!rec) return null;
  oauthStates.delete(state); // 一次性
  if (Date.now() > rec.expires) return null;
  return rec.redirect;
}

module.exports = {
  checkSignature, parseXml, decryptMessage, encryptMessage, replySignature,
  handleMessage, upsertFollower, buildTextReply,
  createOAuthState, consumeOAuthState, isRedirectAllowed, REDIRECT_ALLOW,
};
