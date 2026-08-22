// ============================================================================
// P0-5 / P0-6 安全加固中间件 - v23.2
// 部署路径：/www/yandaoguoxue-backend/middleware/auth.js
//
// 功能：
//   1. authMiddleware      — JWT Token 验证中间件
//   2. requireMembership   — 会员等级校验中间件（从SQLite读取真实数据）
//   3. checkAIQuota        — AI配额校验中间件（从SQLite读取真实数据）
//   4. getMembershipFromDB — 从数据库读取会员状态
//   5. getAIQuotaFromDB    — 从数据库读取AI配额
//   6. consumeAIQuotaInDB  — 从数据库扣减AI配额
//
// 核心原则：不信任前端任何参数，所有权限判断以数据库为准
// ============================================================================

'use strict';

const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// ==================== 配置 ====================
const JWT_SECRET = process.env.JWT_SECRET || 'yandao_default_jwt_secret_2026';
const DB_PATH = process.env.DB_PATH || '/root/backend-auth/data/yandao_users.db';

// ==================== 会员等级定义 ====================
const MEMBER_LEVELS = {
  basic: 0,
  monthly: 1,
  yearly: 2,
  lifetime: 3,
};

// ==================== AI配额配置 ====================
const AI_DAILY_LIMITS = {
  basic: 3,
  monthly: 50,
  yearly: Infinity,
  lifetime: Infinity,
};

// ==================== 数据库连接 ====================
let dbInstance = null;

function getDB() {
  if (dbInstance) return dbInstance;
  try {
    const Database = require('better-sqlite3');
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL');
    console.log('[middleware/auth] SQLite 数据库已连接:', DB_PATH);
    return dbInstance;
  } catch (e) {
    console.error('[middleware/auth] 数据库连接失败:', e.message);
    return null;
  }
}

// ==================== 确保表存在 ====================
function ensureTables() {
  const db = getDB();
  if (!db) return;

  // AI配额使用记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_quota_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      usage_date TEXT NOT NULL,
      used_count INTEGER DEFAULT 0,
      UNIQUE(user_id, usage_date)
    )
  `);

  // 确保 users 表有 member_level 和 membership_expiry 字段
  try {
    const cols = db.prepare("PRAGMA table_info(users)").all();
    const colNames = cols.map(c => c.name);

    if (!colNames.includes('member_level')) {
      db.exec("ALTER TABLE users ADD COLUMN member_level TEXT DEFAULT 'basic'");
      console.log('[middleware/auth] 已添加 member_level 字段');
    }
    if (!colNames.includes('membership_expiry')) {
      db.exec('ALTER TABLE users ADD COLUMN membership_expiry TEXT');
      console.log('[middleware/auth] 已添加 membership_expiry 字段');
    }
  } catch (e) {
    console.warn('[middleware/auth] 表结构检查:', e.message);
  }
}

// ==================== JWT Token 验证 ====================

/**
 * 验证 JWT token 并提取用户信息
 * @param {string} authHeader - Authorization 头的值
 * @returns {object|null} - { userId, phone, email } 或 null
 */
function verifyToken(authHeader) {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.userId) return null;
    return {
      userId: decoded.userId,
      phone: decoded.phone || null,
      email: decoded.email || null,
    };
  } catch (e) {
    return null;
  }
}

// ==================== 认证中间件 ====================

/**
 * JWT 认证中间件
 * 验证请求头中的 Bearer Token，将用户信息附加到 req.user
 */
function authMiddleware(req, res, next) {
  const user = verifyToken(req.headers.authorization || '');
  if (!user) {
    return res.status(401).json({
      success: false,
      error: '请先登录',
      code: 'UNAUTHORIZED',
    });
  }
  req.user = user;
  next();
}

// ==================== 会员校验 ====================

/**
 * 从数据库获取会员状态
 * @param {string} userId - 用户ID
 * @returns {object} - { level, isActive, expireTime, daysRemaining }
 */
function getMembershipFromDB(userId) {
  const db = getDB();
  if (!db) {
    return { level: 'basic', isActive: true, expireTime: null, daysRemaining: -1, source: 'fallback' };
  }

  try {
    const user = db.prepare(
      'SELECT user_id, member_level, membership_expiry FROM users WHERE user_id = ?'
    ).get(userId);

    if (!user) {
      return { level: 'basic', isActive: true, expireTime: null, daysRemaining: -1, source: 'default' };
    }

    const level = user.member_level || 'basic';
    const expireTime = user.membership_expiry || null;

    let isActive = true;
    let daysRemaining = -1;

    if (level !== 'lifetime' && expireTime) {
      const now = Date.now();
      const expire = new Date(expireTime).getTime();
      if (now >= expire) {
        // 已过期，降级为 basic
        isActive = false;
        daysRemaining = 0;
        return { level: 'basic', isActive: true, expireTime: null, daysRemaining: -1, source: 'expired' };
      }
      daysRemaining = Math.ceil((expire - now) / (24 * 60 * 60 * 1000));
    }

    return {
      level,
      isActive,
      expireTime,
      daysRemaining,
      source: 'database',
    };
  } catch (e) {
    console.error('[middleware/auth] 获取会员状态失败:', e.message);
    return { level: 'basic', isActive: true, expireTime: null, daysRemaining: -1, source: 'error_fallback' };
  }
}

/**
 * 会员等级校验中间件
 * @param {string} minLevel - 最低要求等级 ('basic' | 'monthly' | 'yearly' | 'lifetime')
 * @returns {function} Express 中间件
 */
function requireMembership(minLevel) {
  return (req, res, next) => {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: '请先登录', code: 'UNAUTHORIZED' });
    }

    const dbMembership = getMembershipFromDB(userId);
    req.membership = dbMembership;

    const minRank = MEMBER_LEVELS[minLevel] || 0;
    const userRank = MEMBER_LEVELS[dbMembership.level] || 0;

    if (userRank < minRank) {
      return res.status(403).json({
        success: false,
        error: '当前会员等级不足',
        code: 'LEVEL_INSUFFICIENT',
        currentLevel: dbMembership.level,
        requiredLevel: minLevel,
      });
    }

    next();
  };
}

// ==================== AI 配额校验 ====================

/**
 * 从数据库获取AI配额
 * @param {string} userId - 用户ID
 * @returns {object} - { dailyUsed, dailyLimit, level }
 */
function getAIQuotaFromDB(userId) {
  const db = getDB();
  if (!db) {
    return { dailyUsed: 0, dailyLimit: 999, level: 'unknown', source: 'fallback' };
  }

  try {
    const today = new Date().toISOString().slice(0, 10);

    // 获取会员等级
    const membership = getMembershipFromDB(userId);
    const level = membership.level;
    const dailyLimit = AI_DAILY_LIMITS[level] || 3;

    // 获取今日使用次数
    const usage = db.prepare(
      'SELECT used_count FROM ai_quota_usage WHERE user_id = ? AND usage_date = ?'
    ).get(userId, today);

    const dailyUsed = usage ? usage.used_count : 0;

    return {
      dailyUsed,
      dailyLimit,
      level,
      source: 'database',
    };
  } catch (e) {
    console.error('[middleware/auth] 获取AI配额失败:', e.message);
    return { dailyUsed: 0, dailyLimit: 3, level: 'basic', source: 'error_fallback' };
  }
}

/**
 * AI配额校验中间件
 * 检查用户今日AI调用次数是否已达上限
 */
function checkAIQuota(req, res, next) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: '请先登录', code: 'UNAUTHORIZED' });
  }

  const quota = getAIQuotaFromDB(userId);
  req.aiQuota = quota;

  const level = req.membership?.level || quota.level;
  const limit = AI_DAILY_LIMITS[level] || 3;

  if (quota.dailyUsed >= limit) {
    return res.status(429).json({
      success: false,
      error: '今日AI调用次数已用完',
      code: 'AI_QUOTA_EXCEEDED',
      dailyUsed: quota.dailyUsed,
      dailyLimit: limit,
      level,
    });
  }

  next();
}

/**
 * 在数据库中记录一次AI调用
 * @param {string} userId - 用户ID
 */
function consumeAIQuotaInDB(userId) {
  const db = getDB();
  if (!db) return { success: false };

  try {
    const today = new Date().toISOString().slice(0, 10);

    db.prepare(`
      INSERT INTO ai_quota_usage (user_id, usage_date, used_count)
      VALUES (?, ?, 1)
      ON CONFLICT(user_id, usage_date)
      DO UPDATE SET used_count = used_count + 1
    `).run(userId, today);

    return { success: true };
  } catch (e) {
    console.error('[middleware/auth] AI配额扣减失败:', e.message);
    return { success: false, error: e.message };
  }
}

// ==================== 初始化 ====================
ensureTables();

// ==================== 导出 ====================
module.exports = {
  authMiddleware,
  requireMembership,
  checkAIQuota,
  getMembershipFromDB,
  getAIQuotaFromDB,
  consumeAIQuotaInDB,
  verifyToken,
  MEMBER_LEVELS,
  AI_DAILY_LIMITS,
};