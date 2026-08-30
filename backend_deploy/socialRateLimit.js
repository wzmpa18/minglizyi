/**
 * socialRateLimit.js — 服务端社交限频引擎（FINAL-MASTER-05 第七十五~八十章）
 *
 * 第七十五章：社交限频正式补齐（此前服务端未实现，本轮落地）
 * 第七十六章：限频维度 = userId + IP + endpoint category（三维度同时校验）
 * 第七十七章：重点接口分类：
 *   friend_request   好友申请
 *   private_message  私聊发送
 *   group_message    群聊发送
 *   post_publish     动态发布
 *   comment          评论
 *   report           举报
 * 第七十八章：限频值必须合理——正常连续聊天几句不会 429（默认私聊 30条/分钟/人）
 * 第七十九章：刷屏保护——同维度触发限频达到阈值 → 进入短期封锁窗口，窗口内一律 429
 * 第八十章：后台可调（配置存 data/social_rate_limit_config.json，修改走管理端 + Audit）
 *
 * 设计：
 *   - 计数器为内存固定窗口（重启清零，可接受：限频是瞬时保护非持久状态）
 *   - 违规与封锁留痕写 social.db（rate_limit_events 表）供后台审计/统计
 *   - 封锁状态同样内存化（短期窗口，服务重启即解封，属可接受降级）
 *   - 引擎不直接依赖 socialApiRoutes（避免环依赖）：由其注入 getDb 提供者
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_FILE = process.env.SOCIAL_RATE_LIMIT_CONFIG || path.join(DATA_DIR, 'social_rate_limit_config.json');

const CATEGORIES = ['friend_request', 'private_message', 'group_message', 'post_publish', 'comment', 'report'];

// 第七十八章：合理默认值（正常聊天不误伤；超过才视为刷屏）
const DEFAULT_CONFIG = {
  enabled: true,
  limits: {
    friend_request:  { perUser: { limit: 10, windowSec: 3600 },  perIp: { limit: 30,  windowSec: 3600 } },
    private_message: { perUser: { limit: 30, windowSec: 60 },    perIp: { limit: 120, windowSec: 60 } },
    group_message:   { perUser: { limit: 30, windowSec: 60 },    perIp: { limit: 150, windowSec: 60 } },
    post_publish:    { perUser: { limit: 6,  windowSec: 600 },   perIp: { limit: 30,  windowSec: 600 } },
    comment:         { perUser: { limit: 12, windowSec: 60 },    perIp: { limit: 60,  windowSec: 60 } },
    report:          { perUser: { limit: 6,  windowSec: 3600 },  perIp: { limit: 30,  windowSec: 3600 } },
  },
  // 第七十九章：刷屏保护——1 小时内触发同维度限频达到该次数 → 封锁该用户该类目
  flood: { violationThreshold: 3, observeSec: 3600, blockSec: 120 },
  cleanup: { maxCounters: 50000 },
};

let dbProvider = null;   // 由 socialApiRoutes 注入：() => Database（social.db）
const counters = new Map();   // key: cat|scope|id|windowStart → count
const violations = new Map(); // key: cat|userId → { hits: [ts...] }
const blocks = new Map();     // key: cat|userId → untilTs

function setDbProvider(fn) { dbProvider = typeof fn === 'function' ? fn : null; }

function getConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return {
        ...DEFAULT_CONFIG, ...saved,
        limits: mergeLimits(saved.limits),
        flood: { ...DEFAULT_CONFIG.flood, ...(saved.flood || {}) },
        cleanup: { ...DEFAULT_CONFIG.cleanup, ...(saved.cleanup || {}) },
      };
    }
  } catch (e) { console.error('[RateLimit] 配置读取异常，回退默认:', e.message); }
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function mergeLimits(saved) {
  const out = JSON.parse(JSON.stringify(DEFAULT_CONFIG.limits));
  if (!saved || typeof saved !== 'object') return out;
  for (const cat of CATEGORIES) {
    const s = saved[cat];
    if (!s || typeof s !== 'object') continue;
    if (s.perUser && Number.isFinite(Number(s.perUser.limit)) && Number(s.perUser.limit) > 0
      && Number.isFinite(Number(s.perUser.windowSec)) && Number(s.perUser.windowSec) >= 1) {
      out[cat].perUser = { limit: Math.floor(Number(s.perUser.limit)), windowSec: Math.floor(Number(s.perUser.windowSec)) };
    }
    if (s.perIp && Number.isFinite(Number(s.perIp.limit)) && Number(s.perIp.limit) > 0
      && Number.isFinite(Number(s.perIp.windowSec)) && Number(s.perIp.windowSec) >= 1) {
      out[cat].perIp = { limit: Math.floor(Number(s.perIp.limit)), windowSec: Math.floor(Number(s.perIp.windowSec)) };
    }
  }
  return out;
}

function saveConfig(cfg) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  return cfg;
}

// 第八十章：后台更新（校验 + 落盘；Audit 由路由层负责记录）
// 显式传入的非法值（负数/非数字/零窗口）直接报错拒绝，不静默忽略——防止后台误配置无感知生效。
function updateConfig(patch) {
  const current = getConfig();
  const invalid = [];
  if (patch && patch.limits && typeof patch.limits === 'object') {
    for (const cat of CATEGORIES) {
      const s = patch.limits[cat];
      if (!s || typeof s !== 'object') continue;
      for (const dim of ['perUser', 'perIp']) {
        if (s[dim] === undefined) continue;
        const v = s[dim];
        if (!v || typeof v !== 'object' || !Number.isFinite(Number(v.limit)) || !Number.isFinite(Number(v.windowSec))) {
          invalid.push(`${cat}.${dim} 格式非法`); continue;
        }
        if (Number(v.limit) < 1 || Number(v.windowSec) < 1) invalid.push(`${cat}.${dim} 必须为正整数`);
      }
    }
  }
  if (invalid.length) return { ok: false, error: '配置非法：' + invalid.join('；') };
  const next = {
    enabled: typeof patch.enabled === 'boolean' ? patch.enabled : current.enabled,
    limits: mergeLimits({ ...current.limits, ...(patch.limits || {}) }),
    flood: {
      violationThreshold: pickPositiveInt(patch, 'flood.violationThreshold', current.flood.violationThreshold, 1, 100),
      observeSec: pickPositiveInt(patch, 'flood.observeSec', current.flood.observeSec, 60, 86400),
      blockSec: pickPositiveInt(patch, 'flood.blockSec', current.flood.blockSec, 30, 86400),
    },
    cleanup: { ...current.cleanup, ...(patch.cleanup || {}) },
  };
  const errs = validate(next);
  if (errs.length) return { ok: false, error: '配置非法：' + errs.join('；') };
  saveConfig(next);
  // 配置收紧后清理内存计数，避免旧窗口残留导致误判
  counters.clear();
  return { ok: true, config: next };
}

function pickPositiveInt(obj, dotted, fallback, min, max) {
  let v = fallback;
  if (obj && obj.flood && dotted.startsWith('flood.')) v = obj.flood[dotted.slice(6)];
  if (v === undefined || v === null) v = fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), min), max);
}

function validate(cfg) {
  const errs = [];
  for (const cat of CATEGORIES) {
    const l = cfg.limits[cat];
    if (!l || !l.perUser || !l.perIp) { errs.push(`${cat} 限频配置缺失`); continue; }
    if (l.perUser.limit < 1 || l.perUser.windowSec < 1) errs.push(`${cat} perUser 必须为正整数`);
    if (l.perIp.limit < 1 || l.perIp.windowSec < 1) errs.push(`${cat} perIp 必须为正整数`);
  }
  return errs;
}

function clientIp(req) {
  const xf = req && req.headers && req.headers['x-forwarded-for'];
  if (xf) return String(xf).split(',')[0].trim();
  return String((req && req.socket && req.socket.remoteAddress) || 'unknown');
}

function logEvent(d, category, userId, ip, kind, detail) {
  try {
    d.prepare(`INSERT INTO rate_limit_events (category, user_id, ip, kind, detail, created_at)
      VALUES (?,?,?,?,?,datetime('now','localtime'))`)
      .run(String(category), String(userId || ''), String(ip || ''), String(kind), String(detail || '').slice(0, 300));
  } catch (e) { console.error('[RateLimit] 事件留痕失败(不阻断):', e.message); }
}

function ensureEventTable(d) {
  try {
    d.exec(`CREATE TABLE IF NOT EXISTS rate_limit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      user_id TEXT DEFAULT '',
      ip TEXT DEFAULT '',
      kind TEXT NOT NULL,
      detail TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_rle_time ON rate_limit_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_rle_user ON rate_limit_events(user_id, category, created_at);`);
  } catch (e) { console.error('[RateLimit] 事件表创建异常:', e.message); }
}

function cleanupCounters(max) {
  const now = Date.now();
  for (const [k, v] of counters) if (v.expire < now) counters.delete(k);
  if (counters.size > max) {
    const sorted = [...counters.entries()].sort((a, b) => a[1].expire - b[1].expire);
    for (let i = 0; i < Math.floor(sorted.length / 2); i++) counters.delete(sorted[i][0]);
  }
}

function bumpCounter(key, windowSec) {
  const now = Date.now();
  const windowStart = Math.floor(now / (windowSec * 1000));
  const k = `${key}|${windowStart}`;
  const cur = counters.get(k);
  if (cur && cur.expire > now) {
    cur.n++;
    return { count: cur.n, isNew: false };
  }
  counters.set(k, { n: 1, expire: now + windowSec * 1000 });
  return { count: 1, isNew: true };
}

// 第七十九条：违规计数 → 达阈值进入短期封锁
function recordViolation(cfg, category, userId, ip) {
  const key = `${category}|${userId}`;
  const now = Date.now();
  const hits = (violations.get(key) || []).filter((t) => now - t < cfg.flood.observeSec * 1000);
  hits.push(now);
  violations.set(key, hits);
  if (hits.length >= cfg.flood.violationThreshold) {
    blocks.set(key, now + cfg.flood.blockSec * 1000);
    return { blocked: true, blockSec: cfg.flood.blockSec };
  }
  return { blocked: false };
}

/**
 * 限频检查（第七十六~七十九章核心入口）
 * @param {object} p { category, userId, ip, req }
 * @returns {object} { allowed, code?, retryAfterSec?, scope?, category?, reason? }
 */
function check(p) {
  const cfg = getConfig();
  if (!cfg.enabled) return { allowed: true, disabled: true };
  const category = String(p.category || '');
  if (!CATEGORIES.includes(category)) return { allowed: true, unknownCategory: true };

  const userId = String(p.userId || p.req?.user?.userId || '');
  const ip = String(p.ip || (p.req ? clientIp(p.req) : 'unknown'));
  const now = Date.now();

  // 第七十九条：封锁窗口优先（窗口内该用户该类目一律拒绝）
  if (userId) {
    const until = blocks.get(`${category}|${userId}`);
    if (until && until > now) {
      logEventSafe(category, userId, ip, 'blocked', '短期封锁窗口内拒绝');
      return {
        allowed: false, code: 429, scope: 'user', category,
        retryAfterSec: Math.ceil((until - now) / 1000),
        reason: '操作过于频繁，已进入短期保护窗口，请稍后再试',
      };
    }
    if (until) blocks.delete(`${category}|${userId}`);
  }

  const lim = cfg.limits[category];
  cleanupCounters(cfg.cleanup.maxCounters);

  // 维度1：userId
  if (userId) {
    const r = bumpCounter(`${category}|u|${userId}`, lim.perUser.windowSec);
    if (r.count > lim.perUser.limit) {
      const flood = recordViolation(cfg, category, userId, ip);
      logEventSafe(category, userId, ip, 'limit_user', `count=${r.count} limit=${lim.perUser.limit}/${lim.perUser.windowSec}s${flood.blocked ? ' → 触发封锁' : ''}`);
      return {
        allowed: false, code: 429, scope: 'user', category,
        retryAfterSec: windowRetryAfter(lim.perUser.windowSec, r),
        reason: flood.blocked
          ? `操作过于频繁，已触发刷屏保护，${cfg.flood.blockSec} 秒后再试`
          : '操作过于频繁，请稍后再试',
      };
    }
  }

  // 维度2：IP（匿名/多账号共用出口保护）
  const rip = bumpCounter(`${category}|ip|${ip}`, lim.perIp.windowSec);
  if (rip.count > lim.perIp.limit) {
    logEventSafe(category, userId, ip, 'limit_ip', `count=${rip.count} limit=${lim.perIp.limit}/${lim.perIp.windowSec}s`);
    return {
      allowed: false, code: 429, scope: 'ip', category,
      retryAfterSec: windowRetryAfter(lim.perIp.windowSec, rip),
      reason: '当前网络环境操作过于频繁，请稍后再试',
    };
  }

  return { allowed: true };
}

function windowRetryAfter(windowSec, r) {
  if (r.isNew) return windowSec;
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const windowEnd = (Math.floor(now / windowMs) + 1) * windowMs;
  return Math.max(1, Math.ceil((windowEnd - now) / 1000));
}

function logEventSafe(category, userId, ip, kind, detail) {
  if (!dbProvider) return;
  try {
    const d = dbProvider();
    if (d) { ensureEventTable(d); logEvent(d, category, userId, ip, kind, detail); }
  } catch { /* 留痕失败不阻断限频本身 */ }
}

// ==================== 后台统计（第八十章配套） ====================

function stats() {
  const cfg = getConfig();
  const now = Date.now();
  const activeBlocks = [];
  for (const [k, until] of blocks) {
    if (until > now) {
      const [cat, uid] = k.split('|');
      activeBlocks.push({ category: cat, userId: uid, remainSec: Math.ceil((until - now) / 1000) });
    }
  }
  let recentViolations = [];
  let eventCount24h = 0;
  if (dbProvider) {
    try {
      const d = dbProvider();
      ensureEventTable(d);
      recentViolations = d.prepare(`SELECT category, user_id, ip, kind, detail, created_at FROM rate_limit_events
        ORDER BY id DESC LIMIT 100`).all();
      eventCount24h = d.prepare(`SELECT COUNT(*) n FROM rate_limit_events
        WHERE created_at >= datetime('now','localtime','-1 day')`).get().n;
    } catch (e) { console.error('[RateLimit] 统计查询异常:', e.message); }
  }
  return {
    enabled: cfg.enabled,
    limits: cfg.limits,
    flood: cfg.flood,
    countersActive: counters.size,
    activeBlocks,
    recentViolations,
    eventCount24h,
    persistence: dbProvider ? 'social.db(rate_limit_events)' : '内存（未注入DB）',
  };
}

function unblock(category, userId) {
  const key = `${category}|${userId}`;
  const had = blocks.delete(key);
  violations.delete(key);
  return { ok: true, removed: had };
}

module.exports = {
  CATEGORIES, DEFAULT_CONFIG,
  setDbProvider, getConfig, updateConfig, validate,
  check, clientIp, stats, unblock, ensureEventTable,
};
