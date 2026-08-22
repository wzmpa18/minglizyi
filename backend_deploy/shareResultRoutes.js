/**
 * 分享引擎路由（Share Engine）- v25.0.47_5 · FINAL-PRODUCTION-SEAL-03
 *
 * 统一"分享排盘结果"闭环：
 *   POST /api/share/result       — 创建签名分享Token（服务端映射：工具/内容/分享者/邀请归因）
 *   GET  /api/share/result/:token — 落地页解析Token（含下载开关+邀请归因参数）
 *   POST /api/share/log          — 分享行为日志（修复历史404：shareConfigRoutes未挂载/api/share）
 *
 * 存储：data/share_tokens.json（JSON文件，与share_config.json同一模式，不动数据库结构）
 * 归因：复用 register_routes.js 的 INVITE_SIGN_SECRET HMAC口径（同一密钥同一算法，
 *       落地页携带 ref/ts/sig → 注册时走 resolveInviteAttribution signed_link 通道）
 * 安全：Token 32位随机hex不可枚举；有效期7天；创建限频；payload深度脱敏
 */
'use strict';

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOKENS_FILE = path.join(__dirname, 'data', 'share_tokens.json');
const SHARE_CONFIG_FILE = path.join(__dirname, 'data', 'share_config.json');
const SHARE_STATS_FILE = path.join(__dirname, 'data', 'share_stats.json');

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7天
const MAX_TOKENS = 10000;
const MAX_PAYLOAD_BYTES = 16 * 1024;
const CREATE_RATE_LIMIT = 30; // 每IP每小时
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'https://yandaoguoxue.yandao.vip';

// ============ 邀请归因签名（与 register_routes.js 完全同口径，同一密钥） ============

function inviteSignSecret() {
  return process.env.INVITE_SIGN_SECRET || 'yandao-invite-sign-fallback-2026';
}

function signInviteRef(userId, ts) {
  return crypto.createHmac('sha256', inviteSignSecret()).update(`${userId}.${ts}`).digest('hex').slice(0, 32);
}

// ============ 敏感字段脱敏（第五章：禁止暴露手机号/生日/身份证/核心ID/私人备注） ============

const SENSITIVE_KEY_PATTERNS = [
  /phone|mobile|tel(?!e)/i,
  /idcard|id_card|identity/i,
  /password|passwd|secret|token|session/i,
  /birthday|birth_?time|birth_?date|birthdate/i,
  /手机|电话|身份证|生日|出生|密码/i,
  /^name$|^realName$|^userName$|^nickname$/i,
  /备注|私人|私聊|private_?note/i,
  /email/i,
  /avatar|photo|image|headimg/i,
];

function sanitizeValue(value, depth) {
  if (depth > 6) return '[TRUNCATED]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    // 字符串内容级脱敏：手机号/身份证号打码
    return value
      .replace(/1[3-9]\d{9}/g, (m) => m.slice(0, 3) + '****' + m.slice(-2))
      .replace(/\d{17}[\dXx]/g, (m) => m.slice(0, 4) + '**********' + m.slice(-2));
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitizeValue(v, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEY_PATTERNS.some((re) => re.test(k))) continue; // 整字段剔除
      out[k] = sanitizeValue(v, depth + 1);
    }
    return out;
  }
  return String(value);
}

// ============ Token 存储（读改写 + 过期清理 + 容量上限） ============

function ensureDataFile(file, initial) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(initial, null, 2), 'utf-8');
}

function loadTokens() {
  ensureDataFile(TOKENS_FILE, {});
  try {
    return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveTokens(tokens) {
  ensureDataFile(TOKENS_FILE, {});
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
}

function pruneTokens(tokens) {
  const now = Date.now();
  let changed = false;
  for (const [token, rec] of Object.entries(tokens)) {
    if (new Date(rec.expiresAt).getTime() < now || rec.status !== 'active') {
      delete tokens[token];
      changed = true;
    }
  }
  const keys = Object.keys(tokens);
  if (keys.length > MAX_TOKENS) {
    keys
      .sort((a, b) => new Date(tokens[a].createdAt) - new Date(tokens[b].createdAt))
      .slice(0, keys.length - MAX_TOKENS)
      .forEach((k) => { delete tokens[k]; changed = true; });
  }
  return changed;
}

// ============ 下载/落地配置（读 share_config.json，与后台同一数据源） ============

function getLandingConfig() {
  ensureDataFile(SHARE_CONFIG_FILE, {});
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(SHARE_CONFIG_FILE, 'utf-8')); } catch { /* 默认值 */ }
  return {
    androidDownloadEnabled: cfg.androidDownloadEnabled !== false,
    webContinueEnabled: cfg.webContinueEnabled !== false,
    iosStoreEnabled: cfg.iosStatus === 'available',
    iosStoreUrl: (cfg.urls && cfg.urls.iosStore) || '',
    androidUrl: (cfg.urls && cfg.urls.android) || 'https://yandaoguoxue.yandao.vip/download',
    downloadPage: (cfg.urls && cfg.urls.downloadPage) || 'https://yandaoguoxue.yandao.vip/download',
    registerUrl: (cfg.urls && cfg.urls.register) || (PUBLIC_BASE_URL + '/register'),
    complianceText: cfg.complianceText || '内容仅供传统文化学习参考，不构成任何决策建议。',
  };
}

// ============ 创建限频（内存计数） ============

const createCounters = new Map(); // ip -> { hour, count }

function rateLimitCreate(ip) {
  const hour = Math.floor(Date.now() / 3600000);
  const rec = createCounters.get(ip);
  if (!rec || rec.hour !== hour) {
    createCounters.set(ip, { hour, count: 1 });
    return true;
  }
  rec.count += 1;
  return rec.count <= CREATE_RATE_LIMIT;
}

// ============ 扫码统计（写入 share_stats.json，与 shareConfigRoutes 同格式） ============

function recordScan(sharerUserId, toolType) {
  try {
    ensureDataFile(SHARE_STATS_FILE, { shares: [], scans: [], downloads: [], registrations: [], summary: {} });
    const stats = JSON.parse(fs.readFileSync(SHARE_STATS_FILE, 'utf-8'));
    stats.scans.push({ inviteCode: String(sharerUserId || ''), source: `share_link:${toolType || 'unknown'}`, timestamp: new Date().toISOString() });
    if (stats.scans.length > 10000) stats.scans = stats.scans.slice(-10000);
    stats.summary.totalScans = (stats.summary.totalScans || 0) + 1;
    fs.writeFileSync(SHARE_STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
  } catch (e) {
    console.error('[ShareEngine] recordScan失败:', e.message);
  }
}

function recordShareLog(channel, userId, inviteCode) {
  try {
    ensureDataFile(SHARE_STATS_FILE, { shares: [], scans: [], downloads: [], registrations: [], summary: {} });
    const stats = JSON.parse(fs.readFileSync(SHARE_STATS_FILE, 'utf-8'));
    stats.shares.push({ channel, userId: userId || 'anonymous', inviteCode: inviteCode || '', timestamp: new Date().toISOString() });
    if (stats.shares.length > 10000) stats.shares = stats.shares.slice(-10000);
    stats.summary.totalShares = (stats.summary.totalShares || 0) + 1;
    if (!stats.summary.byChannel) stats.summary.byChannel = {};
    stats.summary.byChannel[channel] = (stats.summary.byChannel[channel] || 0) + 1;
    if (!stats.summary.byUser) stats.summary.byUser = {};
    stats.summary.byUser[userId || 'anonymous'] = (stats.summary.byUser[userId || 'anonymous'] || 0) + 1;
    fs.writeFileSync(SHARE_STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
  } catch (e) {
    console.error('[ShareEngine] recordShareLog失败:', e.message);
  }
}

// ============ 路由 ============

// POST /api/share/result — 创建分享Token
router.post('/result', (req, res) => {
  try {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (!rateLimitCreate(ip)) {
      return res.status(429).json({ success: false, error: '分享创建过于频繁，请稍后再试' });
    }
    const { toolType, title, summary, payload, sharer } = req.body || {};
    if (!toolType || typeof toolType !== 'string' || toolType.length > 32) {
      return res.status(400).json({ success: false, error: 'toolType无效' });
    }
    if (!title || typeof title !== 'string' || title.length > 64) {
      return res.status(400).json({ success: false, error: 'title无效' });
    }

    // 深度脱敏
    const cleanPayload = sanitizeValue(payload === undefined ? null : payload, 0);
    let payloadStr = '';
    try { payloadStr = JSON.stringify(cleanPayload); } catch { payloadStr = ''; }
    if (payloadStr.length > MAX_PAYLOAD_BYTES) {
      return res.status(413).json({ success: false, error: '分享内容过大' });
    }

    // 分享者信息（userId 数字或空；服务端重签邀请参数，不信任客户端传入的sig）
    let sharerUserId = '';
    let sharerName = '言道用户';
    if (sharer && typeof sharer === 'object') {
      if (sharer.userId && /^\d{1,12}$/.test(String(sharer.userId))) sharerUserId = String(sharer.userId);
      if (sharer.userName && typeof sharer.userName === 'string' && sharer.userName.length <= 24) {
        sharerName = sharer.userName;
      }
    }

    // 邀请归因参数：服务端用同一HMAC密钥为分享者签名（永久有效，ts防篡改）
    let invite = null;
    if (sharerUserId) {
      const ts = String(Date.now());
      invite = { ref: sharerUserId, ts, sig: signInviteRef(sharerUserId, ts) };
    }

    const token = crypto.randomBytes(16).toString('hex');
    const now = new Date();
    const tokens = loadTokens();
    pruneTokens(tokens);
    tokens[token] = {
      toolType,
      title: title.slice(0, 64),
      summary: typeof summary === 'string' ? summary.slice(0, 200) : '',
      payload: cleanPayload,
      sharerUserId,
      sharerName,
      invite,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + TOKEN_TTL_MS).toISOString(),
      status: 'active',
      views: 0,
    };
    saveTokens(tokens);

    console.log(`[ShareEngine] 创建分享 token=${token.slice(0, 8)}... tool=${toolType} sharer=${sharerUserId || 'anon'} ip=${ip}`);
    res.json({
      success: true,
      data: {
        token,
        shareUrl: `${PUBLIC_BASE_URL}/share/result?token=${token}`,
        expiresAt: tokens[token].expiresAt,
      },
    });
  } catch (error) {
    console.error('[ShareEngine] create error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// GET /api/share/result/:token — 落地页解析
router.get('/result/:token', (req, res) => {
  try {
    const { token } = req.params;
    if (!/^[0-9a-f]{32}$/.test(token || '')) {
      return res.status(400).json({ success: false, error: 'Token格式无效' });
    }
    const tokens = loadTokens();
    const rec = tokens[token];
    if (!rec || rec.status !== 'active' || new Date(rec.expiresAt).getTime() < Date.now()) {
      return res.json({ success: true, data: { valid: false, reason: 'EXPIRED_OR_NOT_FOUND' } });
    }
    // 浏览计数（读改写，容忍并发丢失）
    rec.views = (rec.views || 0) + 1;
    try { saveTokens(tokens); } catch { /* 计数失败不影响展示 */ }
    recordScan(rec.sharerUserId, rec.toolType);

    const landing = getLandingConfig();
    res.json({
      success: true,
      data: {
        valid: true,
        toolType: rec.toolType,
        title: rec.title,
        summary: rec.summary,
        payload: rec.payload,
        sharerName: rec.sharerName,
        createdAt: rec.createdAt,
        expiresAt: rec.expiresAt,
        views: rec.views,
        invite: rec.invite,
        landing,
      },
    });
  } catch (error) {
    console.error('[ShareEngine] resolve error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// POST /api/share/log — 分享行为日志（修复历史404）
router.post('/log', (req, res) => {
  try {
    const { channel, userId, inviteCode } = req.body || {};
    if (!channel || typeof channel !== 'string' || channel.length > 32) {
      return res.status(400).json({ success: false, error: '缺少渠道参数' });
    }
    recordShareLog(channel, userId, inviteCode);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/share/download — 落地页下载点击记录
router.post('/download', (req, res) => {
  try {
    const { inviteCode, platform } = req.body || {};
    ensureDataFile(SHARE_STATS_FILE, { shares: [], scans: [], downloads: [], registrations: [], summary: {} });
    const stats = JSON.parse(fs.readFileSync(SHARE_STATS_FILE, 'utf-8'));
    stats.downloads.push({ inviteCode: String(inviteCode || ''), platform: String(platform || 'android').slice(0, 16), timestamp: new Date().toISOString() });
    if (stats.downloads.length > 10000) stats.downloads = stats.downloads.slice(-10000);
    stats.summary.totalDownloads = (stats.summary.totalDownloads || 0) + 1;
    fs.writeFileSync(SHARE_STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
