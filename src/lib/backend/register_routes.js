// ============================================================================
// 注册认证路由完整集成模块 - v20.3
// 可直接挂载到 ai-proxy-server.js 的 Express 应用
// 路由前缀：/api/auth
//
// 功能：
//   - SQLite 用户数据存储
//   - bcrypt 密码加密
//   - JWT 双轨 token 签发（access 7天 + refresh 30天）与刷新
//   - 腾讯云SMS验证码发送（SdkAppId=1401146274, 模板186686）
//   - 腾讯云SES邮件验证码发送（发件noreply@yandao.vip, 模板186641）
//   - 验证码存储与频率限制（60秒冷却/IP每分钟3次/每日10次/5分钟有效一次性）
//
// 路由列表（前缀 /api/auth）：
//   POST /api/auth/send-code       — 发送验证码（手机/邮箱）
//   POST /api/auth/verify-code     — 校验验证码
//   POST /api/auth/register        — 注册（手机/邮箱+密码）
//   POST /api/auth/check-duplicate — 查重（手机/邮箱失焦实时校验）
//   POST /api/auth/refresh-token   — 刷新token
//   POST /api/auth/login           — 密码登录（手机/邮箱）
//
// 依赖：
//   npm install express bcrypt jsonwebtoken better-sqlite3
//
// 用法（在 ai-proxy-server.js 中）：
//   const registerRoutes = require('./src/lib/backend/register_routes');
//   app.use('/api/auth', registerRoutes.createRouter());
// ============================================================================

'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 尝试加载 better-sqlite3（同步接口，性能好）
let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.warn('[register_routes] better-sqlite3 未安装，请运行: npm install better-sqlite3');
  console.warn('[register_routes] 回退到 sqlite3 异步模式');
  Database = null;
}

const { sendSmsCode } = require('./smsService');
const { sendEmailCode } = require('./emailService');
const verificationStore = require('./verificationStore');

// ============================================================================
// 配置
// ============================================================================
const JWT_SECRET = process.env.JWT_SECRET || 'yandao_default_jwt_secret_2026';
const JWT_ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '7d';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d';
const DB_PATH = process.env.DB_PATH || '/root/backend-auth/data/yandao_users.db';
const BCRYPT_ROUNDS = 10;

// ============================================================================
// SQLite 数据库初始化
// ============================================================================
let dbInstance = null;

/**
 * 初始化 SQLite 数据库
 * @returns {Object} 数据库实例
 */
function initDatabase() {
  if (dbInstance) {
    return dbInstance;
  }

  if (!Database) {
    throw new Error('数据库驱动未安装，请运行: npm install better-sqlite3');
  }

  // 确保目录存在
  const path = require('path');
  const fs = require('fs');
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new Database(DB_PATH);
  dbInstance.pragma('journal_mode = WAL');

  // 创建用户表
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      phone TEXT UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      nickname TEXT,
      avatar TEXT DEFAULT '',
      member_level TEXT DEFAULT 'basic',
      invite_code TEXT,
      invited_by TEXT,
      number_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_number_id ON users(number_id);
    CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
  `);

  console.log('[register_routes] SQLite 数据库初始化完成:', DB_PATH);
  return dbInstance;
}

// ============================================================================
// 用户管理函数
// ============================================================================

/**
 * 生成唯一用户ID
 * @returns {string} 用户ID
 */
function generateUserId() {
  const timestamp = Date.now().toString(36).slice(-6).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `YD${timestamp}${random}`;
}

/**
 * 生成唯一数字ID（6-8位）
 * @param {Object} db - 数据库实例
 * @returns {string} 数字ID
 */
function generateNumberId(db) {
  for (let i = 0; i < 100; i++) {
    const num = String(Math.floor(100000 + Math.random() * 900000));
    const exists = db.prepare('SELECT 1 FROM users WHERE number_id = ?').get(num);
    if (!exists) {
      return num;
    }
  }
  return String(Math.floor(1000000 + Math.random() * 9000000));
}

/**
 * 生成邀请码（8位字母数字）
 * @returns {string} 邀请码
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * 通过手机号查找用户
 * @param {string} phone - 手机号
 * @returns {Object|null} 用户记录
 */
function findUserByPhone(phone) {
  const db = initDatabase();
  return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) || null;
}

/**
 * 通过邮箱查找用户
 * @param {string} email - 邮箱
 * @returns {Object|null} 用户记录
 */
function findUserByEmail(email) {
  const db = initDatabase();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) || null;
}

/**
 * 通过用户ID查找用户
 * @param {string} userId - 用户ID
 * @returns {Object|null} 用户记录
 */
function findUserByUserId(userId) {
  const db = initDatabase();
  return db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) || null;
}

/**
 * 通过账号查找用户（支持手机号/邮箱）
 * @param {string} account - 手机号或邮箱
 * @returns {Object|null} 用户记录
 */
function findUserByAccount(account) {
  if (/^1[3-9]\d{9}$/.test(account)) {
    return findUserByPhone(account);
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)) {
    return findUserByEmail(account);
  }
  return null;
}

/**
 * 创建新用户
 * @param {Object} params - { phone, email, password, inviteCode }
 * @returns {Object} 新用户记录（不含密码哈希）
 */
function createUser(params) {
  const db = initDatabase();
  const { phone, email, password, inviteCode } = params;

  const userId = generateUserId();
  const numberId = generateNumberId(db);
  const userInviteCode = generateInviteCode();
  const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);

  // 从邀请码查找邀请人
  let invitedBy = null;
  if (inviteCode) {
    const inviter = db.prepare('SELECT user_id FROM users WHERE invite_code = ?').get(inviteCode);
    if (inviter) {
      invitedBy = inviter.user_id;
    }
  }

  const nickname = phone
    ? `国学爱好者${phone.slice(-4)}`
    : email
    ? email.split('@')[0]
    : '国学爱好者';

  db.prepare(`
    INSERT INTO users (user_id, phone, email, password_hash, nickname, invite_code, invited_by, number_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, phone || null, email || null, passwordHash, nickname, userInviteCode, invitedBy, numberId);

  return {
    userId,
    phone: phone || null,
    email: email || null,
    nickname,
    memberLevel: 'basic',
    numberId,
    inviteCode: userInviteCode,
  };
}

/**
 * 验证密码
 * @param {string} password - 明文密码
 * @param {string} hash - bcrypt 哈希
 * @returns {boolean} 是否匹配
 */
function verifyPassword(password, hash) {
  try {
    return bcrypt.compareSync(password, hash);
  } catch {
    return false;
  }
}

// ============================================================================
// JWT 工具函数
// ============================================================================

/**
 * 生成 JWT token 对
 * @param {Object} payload - JWT 载荷
 * @returns {{ accessToken: string, refreshToken: string, expiresIn: number }}
 */
function generateTokenPair(payload) {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES,
  });
  const refreshToken = jwt.sign(
    { ...payload, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES }
  );
  const expiresIn = 7 * 24 * 60 * 60; // 7天（秒）
  return { accessToken, refreshToken, expiresIn };
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 从请求中提取客户端 IP
 */
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    '0.0.0.0'
  );
}

/**
 * 统一 JSON 响应
 */
function jsonResponse(res, status, success, message, data = null) {
  const body = { success, message };
  if (data !== null) {
    body.data = data;
  }
  return res.status(status).json(body);
}

// ============================================================================
// 创建并返回 Express Router
// ============================================================================

/**
 * 创建认证路由 Router
 * @returns {express.Router} Express Router 实例
 */
function createRouter() {
  const router = express.Router();

  // 确保数据库已初始化
  initDatabase();

  // ------------------------------------------------------------------
  // POST /api/auth/send-code — 发送验证码（手机/邮箱）
  // ------------------------------------------------------------------
  router.post('/send-code', async (req, res) => {
    try {
      const { phone, email } = req.body;
      const ip = getClientIp(req);

      const isPhone = phone && /^1[3-9]\d{9}$/.test(phone);
      const isEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!isPhone && !isEmail) {
        return jsonResponse(res, 400, false, '请输入正确的手机号或邮箱');
      }

      const identifier = isPhone ? `sms:${phone}` : `email:${email}`;

      // 1. 检查 60 秒冷却
      const resendCheck = verificationStore.canResend(identifier);
      if (!resendCheck.allowed) {
        return jsonResponse(res, 429, false, `发送过于频繁，请${resendCheck.retryAfter}秒后再试`);
      }

      // 2. IP 频率限制
      const ipCheck = verificationStore.checkIpRateLimit(ip);
      if (!ipCheck.allowed) {
        return jsonResponse(res, 429, false, ipCheck.message);
      }

      // 3. 生成验证码
      const code = verificationStore.generateCode();

      // 4. 发送验证码
      let sendResult;
      if (isPhone) {
        sendResult = await sendSmsCode(phone, code);
      } else {
        sendResult = await sendEmailCode(email, code);
      }

      if (!sendResult.success) {
        return jsonResponse(res, 500, false, sendResult.message);
      }

      // 5. 存储验证码
      verificationStore.setCode(identifier, code, ip);

      // 6. 记录 IP 发送
      verificationStore.recordIpSend(ip);

      return jsonResponse(res, 200, true, '验证码已发送');
    } catch (error) {
      console.error('[AUTH /send-code] error:', error);
      return jsonResponse(res, 500, false, '服务异常，请稍后重试');
    }
  });

  // ------------------------------------------------------------------
  // POST /api/auth/verify-code — 校验验证码
  // ------------------------------------------------------------------
  router.post('/verify-code', (req, res) => {
    try {
      const { phone, email, code } = req.body;

      if (!code || !/^\d{6}$/.test(code)) {
        return jsonResponse(res, 400, false, '请输入6位验证码');
      }

      const identifier = phone
        ? `sms:${phone}`
        : email
        ? `email:${email}`
        : null;

      if (!identifier) {
        return jsonResponse(res, 400, false, '请提供手机号或邮箱');
      }

      const valid = verificationStore.verifyCode(identifier, code);
      if (!valid) {
        return jsonResponse(res, 400, false, '验证码错误或已过期');
      }

      return jsonResponse(res, 200, true, '验证码校验通过');
    } catch (error) {
      console.error('[AUTH /verify-code] error:', error);
      return jsonResponse(res, 500, false, '服务异常，请稍后重试');
    }
  });

  // ------------------------------------------------------------------
  // POST /api/auth/register — 注册（手机/邮箱+密码）
  // ------------------------------------------------------------------
  router.post('/register', async (req, res) => {
    try {
      const { phone, email, code, password, inviteCode } = req.body;

      const isPhone = phone && /^1[3-9]\d{9}$/.test(phone);
      const isEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!isPhone && !isEmail) {
        return jsonResponse(res, 400, false, '请输入正确的手机号或邮箱');
      }
      if (!code || !/^\d{6}$/.test(code)) {
        return jsonResponse(res, 400, false, '请输入6位验证码');
      }
      if (!password || password.length < 8 || password.length > 16) {
        return jsonResponse(res, 400, false, '密码长度需为8-16位');
      }
      if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
        return jsonResponse(res, 400, false, '密码需包含字母和数字');
      }

      const identifier = isPhone ? `sms:${phone}` : `email:${email}`;

      // 校验验证码（一次性使用）
      const valid = verificationStore.verifyCode(identifier, code);
      if (!valid) {
        return jsonResponse(res, 400, false, '验证码错误或已过期');
      }

      // 查重
      if (isPhone) {
        const existing = findUserByPhone(phone);
        if (existing) {
          return jsonResponse(res, 409, false, '该手机号已注册，请直接登录或找回密码');
        }
      } else {
        const existing = findUserByEmail(email);
        if (existing) {
          return jsonResponse(res, 409, false, '该邮箱已注册，请直接登录或找回密码');
        }
      }

      // 创建用户
      const user = createUser({
        phone: isPhone ? phone : null,
        email: isEmail ? email : null,
        password,
        inviteCode: inviteCode || null,
      });

      // 生成 token 对
      const tokenPair = generateTokenPair({
        userId: user.userId,
        phone: user.phone || undefined,
        email: user.email || undefined,
      });

      return jsonResponse(res, 200, true, '注册成功', {
        user: {
          userId: user.userId,
          nickname: user.nickname,
          phone: user.phone,
          email: user.email,
          memberLevel: user.memberLevel,
          numberId: user.numberId,
          inviteCode: user.inviteCode,
        },
        ...tokenPair,
      });
    } catch (error) {
      console.error('[AUTH /register] error:', error);
      return jsonResponse(res, 500, false, '注册失败，请稍后重试');
    }
  });

  // ------------------------------------------------------------------
  // POST /api/auth/check-duplicate — 查重（手机/邮箱失焦实时校验）
  // ------------------------------------------------------------------
  router.post('/check-duplicate', (req, res) => {
    try {
      const { phone, email } = req.body;
      const ip = getClientIp(req);

      // IP 频率限制
      const ipCheck = verificationStore.checkIpRateLimit(ip);
      if (!ipCheck.allowed) {
        return jsonResponse(res, 429, false, ipCheck.message);
      }

      let exists = false;

      if (phone && /^1[3-9]\d{9}$/.test(phone)) {
        const user = findUserByPhone(phone);
        exists = !!user;
      } else if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const user = findUserByEmail(email);
        exists = !!user;
      } else {
        return jsonResponse(res, 400, false, '请提供有效的手机号或邮箱', { exists: false });
      }

      return jsonResponse(res, 200, true, exists ? '该账号已注册' : '账号可用', { exists });
    } catch (error) {
      console.error('[AUTH /check-duplicate] error:', error);
      return jsonResponse(res, 200, false, '校验服务异常', { exists: false });
    }
  });

  // ------------------------------------------------------------------
  // POST /api/auth/refresh-token — 刷新token
  // ------------------------------------------------------------------
  router.post('/refresh-token', (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return jsonResponse(res, 400, false, '缺少 refresh_token');
      }

      let decoded;
      try {
        decoded = jwt.verify(refreshToken, JWT_SECRET);
      } catch (err) {
        return jsonResponse(res, 401, false, 'refresh_token 无效或已过期');
      }

      if (decoded.type !== 'refresh') {
        return jsonResponse(res, 401, false, '无效的 refresh_token');
      }

      const tokenPair = generateTokenPair({
        userId: decoded.userId,
        phone: decoded.phone,
        email: decoded.email,
      });

      return jsonResponse(res, 200, true, 'token 刷新成功', tokenPair);
    } catch (error) {
      console.error('[AUTH /refresh-token] error:', error);
      return jsonResponse(res, 500, false, '服务异常，请稍后重试');
    }
  });

  // ------------------------------------------------------------------
  // POST /api/auth/login — 密码登录（手机/邮箱）
  // ------------------------------------------------------------------
  router.post('/login', (req, res) => {
    try {
      const { phone, email, password } = req.body;

      const account = phone || email;
      if (!account || !password) {
        return jsonResponse(res, 400, false, '请输入账号和密码');
      }

      const user = findUserByAccount(account);
      if (!user) {
        return jsonResponse(res, 404, false, '该账号未注册');
      }

      if (!verifyPassword(password, user.password_hash)) {
        return jsonResponse(res, 401, false, '密码错误');
      }

      const tokenPair = generateTokenPair({
        userId: user.user_id,
        phone: user.phone || undefined,
        email: user.email || undefined,
      });

      return jsonResponse(res, 200, true, '登录成功', {
        user: {
          userId: user.user_id,
          nickname: user.nickname,
          phone: user.phone,
          email: user.email,
          memberLevel: user.member_level,
          numberId: user.number_id,
          inviteCode: user.invite_code,
        },
        ...tokenPair,
      });
    } catch (error) {
      console.error('[AUTH /login] error:', error);
      return jsonResponse(res, 500, false, '登录失败，请稍后重试');
    }
  });

  return router;
}

module.exports = {
  createRouter,
  initDatabase,
  findUserByPhone,
  findUserByEmail,
  findUserByUserId,
  findUserByAccount,
  createUser,
  verifyPassword,
  generateTokenPair,
};
