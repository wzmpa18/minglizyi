// ============================================================================
// 验证码服务端存储模块 - v20.3
// 内存 Map 存储 + 自动过期清理
// 防刷规则：
//   - 单号码 60 秒冷却（RESEND_COOLDOWN_MS）
//   - 单 IP 每分钟 3 次（IP_PER_MINUTE_LIMIT）
//   - 单 IP 每日 10 次（IP_PER_DAY_LIMIT）
//   - 验证码 5 分钟有效（CODE_TTL_MS）
//   - 一次性使用：校验后立即删除
// ============================================================================

'use strict';

/**
 * @typedef {Object} CodeEntry
 * @property {string} code - 6位验证码
 * @property {number} expireTime - 过期时间戳（毫秒）
 * @property {number} sendTime - 发送时间戳（毫秒）
 * @property {string} ip - 发送方IP
 */

/** 验证码存储 Map<key, CodeEntry> */
const codeStore = new Map();

/**
 * IP 频率限制存储
 * Map<ip, { minute: number[], daily: number[] }>
 * minute[] - 当前分钟窗口内的发送时间戳列表
 * daily[] - 当天窗口内的发送时间戳列表
 */
const ipRateStore = new Map();

/** 验证码有效期 5 分钟 */
const CODE_TTL_MS = 5 * 60 * 1000;

/** 60秒内不可重复发送 */
const RESEND_COOLDOWN_MS = 60 * 1000;

/** 单IP每分钟限制 3 次 */
const IP_PER_MINUTE_LIMIT = 3;

/** 单IP每日限制 10 次 */
const IP_PER_DAY_LIMIT = 10;

/** 每分钟窗口 60 秒 */
const MINUTE_WINDOW_MS = 60 * 1000;

/** 每日窗口 24 小时 */
const DAY_WINDOW_MS = 24 * 60 * 60 * 1000;

// 每 60 秒清理过期验证码
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of codeStore) {
      if (now > entry.expireTime) {
        codeStore.delete(key);
      }
    }
    // 清理过期的 IP 频率记录
    for (const [ip, buckets] of ipRateStore) {
      const minuteFiltered = buckets.minute.filter(t => now - t < MINUTE_WINDOW_MS);
      const dailyFiltered = buckets.daily.filter(t => now - t < DAY_WINDOW_MS);
      if (minuteFiltered.length === 0 && dailyFiltered.length === 0) {
        ipRateStore.delete(ip);
      } else {
        buckets.minute = minuteFiltered;
        buckets.daily = dailyFiltered;
      }
    }
  }, 60000).unref?.();
}

/**
 * 生成6位随机数字验证码
 * @returns {string} 6位验证码
 */
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * 检查 IP 频率限制
 * @param {string} ip - 客户端IP地址
 * @returns {{ allowed: boolean, message: string, retryAfter?: number }}
 */
function checkIpRateLimit(ip) {
  if (!ip) {
    return { allowed: true, message: '' };
  }

  const now = Date.now();
  let buckets = ipRateStore.get(ip);

  if (!buckets) {
    buckets = { minute: [], daily: [] };
    ipRateStore.set(ip, buckets);
  }

  // 过滤有效窗口内的记录
  buckets.minute = buckets.minute.filter(t => now - t < MINUTE_WINDOW_MS);
  buckets.daily = buckets.daily.filter(t => now - t < DAY_WINDOW_MS);

  // 检查每分钟限制
  if (buckets.minute.length >= IP_PER_MINUTE_LIMIT) {
    const oldest = buckets.minute[0];
    const retryAfter = Math.ceil((MINUTE_WINDOW_MS - (now - oldest)) / 1000);
    return {
      allowed: false,
      message: `操作过于频繁，请${retryAfter}秒后再试`,
      retryAfter,
    };
  }

  // 检查每日限制
  if (buckets.daily.length >= IP_PER_DAY_LIMIT) {
    return {
      allowed: false,
      message: '今日验证码发送次数已达上限，请明日再试',
    };
  }

  return { allowed: true, message: '' };
}

/**
 * 记录一次 IP 发送（在发送成功后调用）
 * @param {string} ip - 客户端IP地址
 */
function recordIpSend(ip) {
  if (!ip) return;
  const now = Date.now();
  let buckets = ipRateStore.get(ip);
  if (!buckets) {
    buckets = { minute: [], daily: [] };
    ipRateStore.set(ip, buckets);
  }
  buckets.minute.push(now);
  buckets.daily.push(now);
}

/**
 * 检查是否可以重发验证码（60秒冷却）
 * @param {string} key - 验证码存储key（如 sms:13800138000）
 * @returns {{ allowed: boolean, retryAfter?: number }}
 */
function canResend(key) {
  const entry = codeStore.get(key);
  if (!entry) {
    return { allowed: true };
  }
  const elapsed = Date.now() - entry.sendTime;
  if (elapsed < RESEND_COOLDOWN_MS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000),
    };
  }
  return { allowed: true };
}

/**
 * 存储验证码
 * @param {string} key - 存储key（如 sms:13800138000 或 email:test@example.com）
 * @param {string} code - 6位验证码
 * @param {string} ip - 客户端IP
 */
function setCode(key, code, ip) {
  const now = Date.now();
  codeStore.set(key, {
    code,
    expireTime: now + CODE_TTL_MS,
    sendTime: now,
    ip: ip || '',
  });
}

/**
 * 校验验证码（一次性使用，校验后立即删除）
 * @param {string} key - 存储key
 * @param {string} code - 用户输入的验证码
 * @returns {boolean} 校验是否通过
 */
function verifyCode(key, code) {
  const entry = codeStore.get(key);
  if (!entry) {
    return false;
  }

  // 已过期
  if (Date.now() > entry.expireTime) {
    codeStore.delete(key);
    return false;
  }

  // 验证码不匹配
  if (entry.code !== code) {
    return false;
  }

  // 验证通过，立即删除（一次性使用）
  codeStore.delete(key);
  return true;
}

/**
 * 获取验证码剩余有效时间（秒），用于调试
 * @param {string} key - 存储key
 * @returns {number} 剩余秒数，0表示不存在或已过期
 */
function getRemainingTTL(key) {
  const entry = codeStore.get(key);
  if (!entry) return 0;
  const remaining = Math.ceil((entry.expireTime - Date.now()) / 1000);
  return Math.max(0, remaining);
}

module.exports = {
  generateCode,
  checkIpRateLimit,
  recordIpSend,
  canResend,
  setCode,
  verifyCode,
  getRemainingTTL,
  CODE_TTL_MS,
  RESEND_COOLDOWN_MS,
  IP_PER_MINUTE_LIMIT,
  IP_PER_DAY_LIMIT,
};
