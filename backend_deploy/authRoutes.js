// ============================================================================
// 认证路由模块 - v20.3
// 提供注册/登录相关的 Express 路由
// 路由前缀：/api/auth
// 路由列表：
//   POST /api/auth/send-code      — 发送验证码（手机/邮箱）
//   POST /api/auth/verify-code    — 校验验证码
//   POST /api/auth/register       — 注册（手机/邮箱+密码）
//   POST /api/auth/check-duplicate — 查重（手机/邮箱失焦实时校验）
//   POST /api/auth/refresh-token  — 刷新token
// ============================================================================

'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');

const { sendSmsCode } = require('./smsService');
const { sendEmailCode } = require('./emailService');
const verificationStore = require('./verificationStore');

const router = express.Router();

// JWT 配置
const JWT_SECRET = process.env.JWT_SECRET || 'yandao_default_jwt_secret_2026';
const JWT_ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '7d';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d';

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 从请求中提取客户端 IP
 * @param {Object} req - Express 请求对象
 * @returns {string} IP 地址
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
 * 统一 JSON 响应格式
 * @param {Object} res - Express 响应对象
 * @param {number} status - HTTP 状态码
 * @param {boolean} success - 是否成功
 * @param {string} message - 消息
 * @param {Object} data - 额外数据
 */
function jsonResponse(res, status, success, message, data = null) {
  const body = { success, message };
  if (data !== null) {
    body.data = data;
  }
  return res.status(status).json(body);
}

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
  // 计算过期秒数
  const expiresIn = 7 * 24 * 60 * 60; // 7天
  return { accessToken, refreshToken, expiresIn };
}

// ============================================================================
// 数据库操作接口（由 register_routes.js 注入或默认使用）
// ============================================================================
// db 接口需提供以下方法：
//   db.findUserByPhone(phone) -> user | null
//   db.findUserByEmail(email) -> user | null
//   db.createUser({ phone, email, password, inviteCode }) -> user
//   db.findUserByAccount(account) -> user | null

let db = null;

/**
 * 注入数据库模块
 * @param {Object} dbModule - 数据库模块
 */
function setDatabase(dbModule) {
  db = dbModule;
}

// ============================================================================
// POST /api/auth/send-code — 发送验证码（手机/邮箱）
// ============================================================================
router.post('/send-code', async (req, res) => {
  try {
    const { phone, email } = req.body;
    const ip = getClientIp(req);

    // 确定发送类型
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

    // 2. 检查 IP 频率限制（每分钟3次，每日10次）
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

    // 5. 存储验证码（5分钟有效）
    verificationStore.setCode(identifier, code, ip);

    // 6. 记录 IP 发送次数
    verificationStore.recordIpSend(ip);

    return jsonResponse(res, 200, true, '验证码已发送');
  } catch (error) {
    console.error('[AUTH /send-code] error:', error);
    return jsonResponse(res, 500, false, '服务异常，请稍后重试');
  }
});

// ============================================================================
// POST /api/auth/verify-code — 校验验证码
// ============================================================================
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

// ============================================================================
// POST /api/auth/register — 注册（手机/邮箱+密码）
// ============================================================================
router.post('/register', async (req, res) => {
  try {
    if (!db) {
      return jsonResponse(res, 500, false, '数据库未初始化');
    }

    const { phone, email, code, password, inviteCode } = req.body;

    // 参数校验
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
      const existing = await db.findUserByPhone(phone);
      if (existing) {
        return jsonResponse(res, 409, false, '该手机号已注册，请直接登录或找回密码');
      }
    } else {
      const existing = await db.findUserByEmail(email);
      if (existing) {
        return jsonResponse(res, 409, false, '该邮箱已注册，请直接登录或找回密码');
      }
    }

    // 创建用户
    const user = await db.createUser({
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
        phone: user.phone || null,
        email: user.email || null,
        memberLevel: user.memberLevel || 'basic',
      },
      ...tokenPair,
    });
  } catch (error) {
    console.error('[AUTH /register] error:', error);
    return jsonResponse(res, 500, false, '注册失败，请稍后重试');
  }
});

// ============================================================================
// POST /api/auth/check-duplicate — 查重（手机/邮箱失焦实时校验）
// ============================================================================
router.post('/check-duplicate', async (req, res) => {
  try {
    if (!db) {
      return jsonResponse(res, 200, false, '数据库未初始化', { exists: false });
    }

    const { phone, email } = req.body;
    const ip = getClientIp(req);

    // IP 频率限制（查重接口更宽松，但仍需限制防刷）
    const ipCheck = verificationStore.checkIpRateLimit(ip);
    if (!ipCheck.allowed) {
      return jsonResponse(res, 429, false, ipCheck.message);
    }

    let exists = false;

    if (phone && /^1[3-9]\d{9}$/.test(phone)) {
      const user = await db.findUserByPhone(phone);
      exists = !!user;
    } else if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const user = await db.findUserByEmail(email);
      exists = !!user;
    } else {
      return jsonResponse(res, 400, false, '请提供有效的手机号或邮箱', { exists: false });
    }

    return jsonResponse(res, 200, true, exists ? '该账号已注册' : '账号可用', { exists });
  } catch (error) {
    console.error('[AUTH /check-duplicate] error:', error);
    // 查重失败不阻塞用户操作
    return jsonResponse(res, 200, false, '校验服务异常', { exists: false });
  }
});

// ============================================================================
// POST /api/auth/refresh-token — 刷新token
// ============================================================================
router.post('/refresh-token', (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return jsonResponse(res, 400, false, '缺少 refresh_token');
    }

    // 验证 refresh_token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (err) {
      return jsonResponse(res, 401, false, 'refresh_token 无效或已过期');
    }

    if (decoded.type !== 'refresh') {
      return jsonResponse(res, 401, false, '无效的 refresh_token');
    }

    // 生成新的 token 对
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

module.exports = {
  router,
  setDatabase,
  generateTokenPair,
};
// v21.6: 邀请码+团队API
router.get('/invite-code', async (req, res) => {
  try {
    if (!db) return jsonResponse(res, 500, false, '数据库未初始化');
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return jsonResponse(res, 401, false, '未登录');
    let d; try { d = jwt.verify(auth.split(' ')[1], JWT_SECRET); } catch(e) { return jsonResponse(res, 401, false, '登录已过期'); }
    const u = await db.findUserById(d.userId);
    if (!u) return jsonResponse(res, 404, false, '用户不存在');
    return jsonResponse(res, 200, true, 'ok', { inviteCode: u.invite_code || '', inviteUrl: u.invite_code ? 'https://yandaoguoxue.yandao.vip/invite?code=' + u.invite_code : '' });
  } catch(e) { return jsonResponse(res, 500, false, '服务异常'); }
});
router.get('/team/members', async (req, res) => {
  try {
    if (!db) return jsonResponse(res, 500, false, '数据库未初始化');
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return jsonResponse(res, 401, false, '未登录');
    let d; try { d = jwt.verify(auth.split(' ')[1], JWT_SECRET); } catch(e) { return jsonResponse(res, 401, false, '登录已过期'); }
    const m = await db.getTeamMembers(d.userId, parseInt(req.query.level) || 1);
    return jsonResponse(res, 200, true, 'ok', { members: m || [] });
  } catch(e) { return jsonResponse(res, 500, false, '服务异常'); }
});
router.get('/team/stats', async (req, res) => {
  try {
    if (!db) return jsonResponse(res, 500, false, '数据库未初始化');
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return jsonResponse(res, 401, false, '未登录');
    let d; try { d = jwt.verify(auth.split(' ')[1], JWT_SECRET); } catch(e) { return jsonResponse(res, 401, false, '登录已过期'); }
    const s = await db.getTeamStats(d.userId);
    return jsonResponse(res, 200, true, 'ok', s || { level1Count: 0, level2Count: 0, totalCount: 0, totalOrders: 0, totalCommission: 0 });
  } catch(e) { return jsonResponse(res, 500, false, '服务异常'); }
});
