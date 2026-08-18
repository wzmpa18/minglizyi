// ============================================================================
// 注册认证路由完整集成模块 - v21.0
// 总工程师级架构加固：用户数据零丢失 + 全功能闭环
//
// 核心变更（v21.0）：
//   1. 用户ID改为纯数字自增主键（从100000起步，BIGINT）
//   2. 新增 POST /api/auth/profile/update 接口（JWT鉴权 + SQLite持久化）
//   3. 新增 GET /api/auth/profile 接口（获取当前用户资料）
//   4. 登录/注册时设置 httpOnly cookie 存 refresh token
//   5. 密码登录走后端 SQLite + bcrypt 校验，不再依赖 localStorage
//   6. 完整数据落库：用户表/分销关系/业务记录/资产权益/星级评价
//   7. 数据迁移：旧版 TEXT user_id 自动迁移为纯数字 ID
//
// 路由列表（前缀 /api/auth）：
//   POST /api/auth/send-code        — 发送验证码（手机/邮箱）
//   POST /api/auth/verify-code      — 校验验证码
//   POST /api/auth/register         — 注册（手机/邮箱+密码）
//   POST /api/auth/check-duplicate  — 查重（手机/邮箱失焦实时校验）
//   POST /api/auth/refresh-token    — 刷新token（支持cookie和body两种方式）
//   POST /api/auth/login            — 密码登录（手机/邮箱，走SQLite校验）
//   GET  /api/auth/profile          — 获取当前用户资料（JWT鉴权）
//   POST /api/auth/profile/update   — 更新用户资料（JWT鉴权 + SQLite持久化）
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

// 用户ID起始值（6位起步）
const USER_ID_START = 100000;

// Cookie 配置
const COOKIE_NAME = 'yd_refresh_token';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30天（毫秒）

// ============================================================================
// Cookie 解析工具（不依赖 cookie-parser 中间件）
// ============================================================================
function parseCookies(req) {
  const cookies = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name) {
      cookies[name.trim()] = decodeURIComponent(rest.join('=').trim());
    }
  });
  return cookies;
}

// ============================================================================
// SQLite 数据库初始化
// ============================================================================
let dbInstance = null;

/**
 * 初始化 SQLite 数据库
 * 包含表结构创建和旧数据迁移
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

  // ========================================================================
  // 1. 检查是否需要从旧版 TEXT user_id 迁移
  // ========================================================================
  const tableExists = dbInstance.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  ).get();

  let needsMigration = false;

  if (tableExists) {
    const columns = dbInstance.prepare("PRAGMA table_info(users)").all();
    const userIdCol = columns.find(c => c.name === 'user_id');
    if (userIdCol && userIdCol.type === 'TEXT') {
      needsMigration = true;
    }
  }

  // ========================================================================
  // 2. 如果需要迁移，执行迁移逻辑
  // ========================================================================
  if (needsMigration) {
    migrateUserIdToNumeric(dbInstance);
  }

  // ========================================================================
  // 3. 创建/更新用户表（纯数字自增主键 + 完整资料字段）
  // ========================================================================
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      nickname TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      gender TEXT DEFAULT '',
      birthday TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      member_level TEXT DEFAULT 'basic',
      invite_code TEXT,
      invited_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME
    );

    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);
  `);

  // ========================================================================
  // 4. 为已有表添加新列（如果不存在）
  // ========================================================================
  ensureColumn(dbInstance, 'users', 'bio', 'TEXT DEFAULT ""');
  ensureColumn(dbInstance, 'users', 'gender', 'TEXT DEFAULT ""');
  ensureColumn(dbInstance, 'users', 'birthday', 'TEXT DEFAULT ""');
  ensureColumn(dbInstance, 'users', 'tags', 'TEXT DEFAULT "[]"');
  ensureColumn(dbInstance, 'users', 'last_login_at', 'DATETIME');

  // ========================================================================
  // 5. 设置自增起始值为 100000
  // ========================================================================
  const userCount = dbInstance.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    // 表为空，设置自增起始值
    // 注意: sqlite_sequence 是特殊表，INSERT OR REPLACE 会创建重复行
    // 必须先 DELETE 再 INSERT
    dbInstance.prepare("DELETE FROM sqlite_sequence WHERE name = 'users'").run();
    dbInstance.prepare(
      "INSERT INTO sqlite_sequence(name, seq) VALUES('users', ?)"
    ).run(USER_ID_START - 1);
    console.log(`[register_routes] 自增起始值设为 ${USER_ID_START}`);
  } else {
    // 表有数据，确保自增值不低于 100000
    const maxUserId = dbInstance.prepare('SELECT MAX(user_id) as max_id FROM users').get();
    if (maxUserId.max_id < USER_ID_START) {
      dbInstance.prepare("DELETE FROM sqlite_sequence WHERE name = 'users'").run();
      dbInstance.prepare(
        "INSERT INTO sqlite_sequence(name, seq) VALUES('users', ?)"
      ).run(USER_ID_START - 1);
    } else {
      // 确保自增序列值 >= 当前最大 ID
      const seq = dbInstance.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'users'").get();
      if (!seq || seq.seq < maxUserId.max_id) {
        dbInstance.prepare("DELETE FROM sqlite_sequence WHERE name = 'users'").run();
        dbInstance.prepare(
          "INSERT INTO sqlite_sequence(name, seq) VALUES('users', ?)"
        ).run(maxUserId.max_id);
      }
    }
  }

  // ========================================================================
  // 6. 创建 P1 架构加固表
  // ========================================================================
  createAdditionalTables(dbInstance);

  console.log('[register_routes] SQLite 数据库初始化完成:', DB_PATH);
  return dbInstance;
}

/**
 * 确保列存在（SQLite 不支持 IF NOT EXISTS 语法用于 ADD COLUMN）
 */
function ensureColumn(db, tableName, columnName, columnDef) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some(c => c.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
    console.log(`[register_routes] 已添加列: ${tableName}.${columnName}`);
  }
}

/**
 * 旧版 TEXT user_id 迁移为纯数字自增 ID
 */
function migrateUserIdToNumeric(db) {
  console.log('[register_routes] 检测到旧版 TEXT user_id，开始迁移...');

  // 1. 备份旧表
  db.exec('ALTER TABLE users RENAME TO users_old;');

  // 2. 创建新表（纯数字自增主键）
  db.exec(`
    CREATE TABLE users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      nickname TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      gender TEXT DEFAULT '',
      birthday TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      member_level TEXT DEFAULT 'basic',
      invite_code TEXT,
      invited_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME
    );
  `);

  // 3. 复制数据并建立 ID 映射
  const oldUsers = db.prepare('SELECT * FROM users_old').all();
  const idMapping = {}; // old_text_id -> new_numeric_id

  for (const oldUser of oldUsers) {
    const result = db.prepare(`
      INSERT INTO users (phone, email, password_hash, nickname, avatar, bio, gender, birthday, tags, member_level, invite_code, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      oldUser.phone, oldUser.email, oldUser.password_hash, oldUser.nickname || '',
      oldUser.avatar || '', '', '', '', '[]',
      oldUser.member_level || 'basic', oldUser.invite_code,
      oldUser.created_at, oldUser.updated_at
    );
    idMapping[oldUser.user_id] = result.lastInsertRowid;
  }

  // 4. 更新 invited_by 引用
  for (const oldUser of oldUsers) {
    if (oldUser.invited_by && idMapping[oldUser.invited_by]) {
      const newId = idMapping[oldUser.user_id];
      const newInvitedBy = idMapping[oldUser.invited_by];
      db.prepare('UPDATE users SET invited_by = ? WHERE user_id = ?').run(newInvitedBy, newId);
    }
  }

  // 5. 删除旧表
  db.exec('DROP TABLE users_old;');

  console.log(`[register_routes] 迁移完成，共迁移 ${oldUsers.length} 条用户数据`);
}

/**
 * 创建 P1 架构加固的额外表
 */
function createAdditionalTables(db) {
  // 分销关系表
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_invite_relation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inviter_id INTEGER NOT NULL,
      invitee_id INTEGER NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      invite_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      reward_claimed INTEGER DEFAULT 0,
      accumulated_points INTEGER DEFAULT 0,
      FOREIGN KEY (inviter_id) REFERENCES users(user_id),
      FOREIGN KEY (invitee_id) REFERENCES users(user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_invite_inviter ON user_invite_relation(inviter_id);
    CREATE INDEX IF NOT EXISTS idx_invite_invitee ON user_invite_relation(invitee_id);
  `);

  // 用户业务记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      record_type TEXT NOT NULL,
      record_data TEXT,
      note TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_records_user ON user_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_records_type ON user_records(record_type);
  `);

  // 用户资产表
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      points_balance INTEGER DEFAULT 0,
      star_rating REAL DEFAULT 0,
      star_rating_count INTEGER DEFAULT 0,
      member_level TEXT DEFAULT 'basic',
      member_expire_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_assets_user ON user_assets(user_id);
  `);

  // 用户订单表
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_no TEXT UNIQUE NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      order_type TEXT,
      status TEXT DEFAULT 'pending',
      payment_method TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      paid_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_orders_user ON user_orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON user_orders(status);
  `);

  // P9-推广中心：积分流水表（服务端发放，明细可查）
  db.exec(`
    CREATE TABLE IF NOT EXISTS points_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tx_type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      ref_id INTEGER,
      note TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_ptx_user ON points_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_ptx_type ON points_transactions(tx_type);
  `);

  // P9-推广中心：邀请绑定审计表（多来源冲突/防作弊全记录，可回溯）
  db.exec(`
    CREATE TABLE IF NOT EXISTS invite_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invitee_id INTEGER,
      inviter_id INTEGER,
      source TEXT NOT NULL,
      result TEXT NOT NULL,
      reason TEXT DEFAULT '',
      ip TEXT DEFAULT '',
      device_id TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_iaudit_invitee ON invite_audit(invitee_id);
    CREATE INDEX IF NOT EXISTS idx_iaudit_inviter ON invite_audit(inviter_id);
  `);

  // P9-推广中心：设备注册登记表（同设备批量注册/关联账号检测）
  db.exec(`
    CREATE TABLE IF NOT EXISTS device_registry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      ip TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_dev_device ON device_registry(device_id);
    CREATE INDEX IF NOT EXISTS idx_dev_user ON device_registry(user_id);
  `);

  // P9-推广中心：邀请奖励幂等表（register/first_pay 每被邀请人每类型仅一次）
  db.exec(`
    CREATE TABLE IF NOT EXISTS invite_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invitee_id INTEGER NOT NULL,
      inviter_id INTEGER NOT NULL,
      reward_type TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'granted',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(invitee_id, reward_type)
    );
    CREATE INDEX IF NOT EXISTS idx_ireward_inviter ON invite_rewards(inviter_id);
  `);

  // 星级评价表
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      master_id INTEGER NOT NULL,
      rater_id INTEGER NOT NULL,
      communication_score REAL DEFAULT 5.0,
      response_score REAL DEFAULT 5.0,
      attitude_score REAL DEFAULT 5.0,
      avg_score REAL DEFAULT 5.0,
      comment TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (master_id) REFERENCES users(user_id),
      FOREIGN KEY (rater_id) REFERENCES users(user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_ratings_master ON user_ratings(master_id);
    CREATE INDEX IF NOT EXISTS idx_ratings_rater ON user_ratings(rater_id);
  `);

  // 操作日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      detail TEXT,
      ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_logs_user ON operation_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_logs_action ON operation_logs(action);
  `);

  console.log('[register_routes] P1 架构加固表创建完成');
}

// ============================================================================
// 用户管理函数
// ============================================================================

/**
 * 生成邀请码（8位字母数字，不含易混淆字符）
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
 */
function findUserByPhone(phone) {
  const db = initDatabase();
  return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) || null;
}

/**
 * 通过邮箱查找用户
 */
function findUserByEmail(email) {
  const db = initDatabase();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) || null;
}

/**
 * 通过用户ID查找用户
 */
function findUserByUserId(userId) {
  const db = initDatabase();
  // 支持数字和字符串形式的ID
  const numericId = parseInt(userId, 10);
  if (isNaN(numericId)) return null;
  return db.prepare('SELECT * FROM users WHERE user_id = ?').get(numericId) || null;
}

/**
 * 通过账号查找用户（支持手机号/邮箱）
 */
function findUserByAccount(account) {
  if (/^1[3-9]\d{9}$/.test(account)) {
    return findUserByPhone(account);
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)) {
    return findUserByEmail(account);
  }
  // 支持纯数字ID登录
  if (/^\d{6,}$/.test(account)) {
    return findUserByUserId(account);
  }
  return null;
}

/**
 * ============ P9-推广中心：签名链接 / 服务端发奖 / 防作弊（单层奖励） ============
 */

// 签名密钥：env 优先，缺省用固定派生值（部署时必须在 .env 配置 INVITE_SIGN_SECRET）
function inviteSignSecret() {
  return process.env.INVITE_SIGN_SECRET || 'yandao-invite-sign-fallback-2026';
}

// 生成签名（HMAC-SHA256，永久有效，ts 仅防篡改）
function signInviteRef(userId, ts) {
  const crypto = require('crypto');
  return crypto.createHmac('sha256', inviteSignSecret()).update(`${userId}.${ts}`).digest('hex').slice(0, 32);
}

function verifyInviteSig(userId, ts, sig) {
  if (!userId || !ts || !sig) return false;
  if (!/^\d+$/.test(String(ts)) || Number(ts) > Date.now() + 600000) return false; // 不允许未来时间戳
  return signInviteRef(userId, ts) === String(sig).toLowerCase();
}

// 奖励额度（env 可覆盖，默认与前端宣传一致）
function inviteRewardPoints(type) {
  if (type === 'first_pay') return Number(process.env.INVITE_REWARD_FIRST_PAY) || 200;
  return Number(process.env.INVITE_REWARD_REGISTER) || 50;
}

// 服务端积分发放：更新余额 + 写流水（幂等由调用方保证）
function grantPointsTx(db, userId, txType, amount, refId, note) {
  db.prepare(`INSERT OR IGNORE INTO user_assets (user_id, points_balance, star_rating, star_rating_count, member_level)
    VALUES (?, 0, 0, 0, 'basic')`).run(userId);
  const bal = db.prepare('UPDATE user_assets SET points_balance = points_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
    .run(amount, userId);
  const row = db.prepare('SELECT points_balance FROM user_assets WHERE user_id = ?').get(userId);
  db.prepare('INSERT INTO points_transactions (user_id, tx_type, amount, balance_after, ref_id, note) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, txType, amount, row ? row.points_balance : 0, refId || null, note || '');
  return row ? row.points_balance : null;
}

// 记录绑定审计
function logInviteAudit(db, inviteeId, inviterId, source, result, reason, ip, deviceId) {
  db.prepare('INSERT INTO invite_audit (invitee_id, inviter_id, source, result, reason, ip, device_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(inviteeId || null, inviterId || null, source, result, reason || '', ip || '', deviceId || '');
}

/**
 * 归因解析 + 五类防作弊（返回 { inviterId, source, ok, reason }）
 * 场景：signed_link（签名链接，最可信）> code（邀请码）> none
 * 拦截：自邀/关联设备、同设备批量注册、同IP批量注册、多来源冲突（取可信源）、被邀人已绑定（首绑优先）
 */
function resolveInviteAttribution(db, { inviteRef, inviteTs, inviteSig, inviteCode, deviceId, clientIp }) {
  const sources = [];

  if (inviteRef && verifyInviteSig(inviteRef, inviteTs, inviteSig)) {
    const inviter = db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(Number(inviteRef));
    if (inviter) sources.push({ inviterId: inviter.user_id, source: 'signed_link' });
  } else if (inviteRef) {
    // 签名不通过的 ref 一律不采信（防伪造）
    logInviteAudit(db, null, Number(inviteRef) || null, 'signed_link', 'rejected', 'SIG_INVALID', clientIp, deviceId);
  }

  if (inviteCode) {
    const inviter = db.prepare('SELECT user_id FROM users WHERE invite_code = ?').get(String(inviteCode).trim());
    if (inviter) sources.push({ inviterId: inviter.user_id, source: 'code' });
  }

  if (!sources.length) return { inviterId: null, source: 'none', ok: false, reason: 'NO_SOURCE' };

  // 多来源冲突：取最高可信源；若两个可信源指向不同邀请人，记冲突审计
  const ranked = sources.sort((a, b) => (a.source === 'signed_link' ? -1 : 1) - (b.source === 'signed_link' ? -1 : 1));
  const picked = ranked[0];
  const conflict = sources.find(s => s !== picked && s.inviterId !== picked.inviterId);
  if (conflict) {
    logInviteAudit(db, null, picked.inviterId, 'multi_source', 'conflict_logged', `PICKED_${picked.source}_OVER_${conflict.source}`, clientIp, deviceId);
  }

  // 防作弊1：自邀（邀请人与被邀人同设备 → 关联账号）
  if (deviceId) {
    const inviterSameDevice = db.prepare('SELECT id FROM device_registry WHERE device_id = ? AND user_id = ?').get(deviceId, picked.inviterId);
    if (inviterSameDevice) {
      return { inviterId: null, source: picked.source, ok: false, reason: 'SELF_OR_LINKED_DEVICE' };
    }
    // 防作弊2：同设备批量注册（该设备已注册 ≥3 个账号）
    const devCount = db.prepare('SELECT COUNT(DISTINCT user_id) c FROM device_registry WHERE device_id = ?').get(deviceId);
    if (devCount.c >= 3) {
      return { inviterId: null, source: picked.source, ok: false, reason: 'DEVICE_BATCH_REGISTER' };
    }
  }

  // 防作弊3：同IP批量注册（24h 内同IP注册 ≥5 次 → 不绑定）
  if (clientIp) {
    const ipCount = db.prepare("SELECT COUNT(*) c FROM device_registry WHERE ip = ? AND created_at >= datetime('now','-1 day')").get(clientIp);
    if (ipCount.c >= 5) {
      return { inviterId: null, source: picked.source, ok: false, reason: 'IP_BATCH_REGISTER' };
    }
  }

  return { inviterId: picked.inviterId, source: picked.source, ok: true, reason: '' };
}

/**
 * 绑定 + 单层奖励发放（注册成功后调用）
 * 单层规则：只写 level=1 关系，只奖励直接邀请人（不写二级关系、不发二级奖励）
 */
function bindInviteAndReward(db, inviteeId, attribution, clientIp, deviceId) {
  const { inviterId, source, ok, reason } = attribution;
  if (!ok || !inviterId) {
    logInviteAudit(db, inviteeId, inviterId || null, source || 'none', 'rejected', reason, clientIp, deviceId);
    return { bound: false, reason };
  }

  // 首绑优先：已被绑定则拒绝（永久生效，不可覆盖）
  const invitee = db.prepare('SELECT invited_by FROM users WHERE user_id = ?').get(inviteeId);
  if (!invitee) return { bound: false, reason: 'INVITEE_NOT_FOUND' };
  if (invitee.invited_by) {
    logInviteAudit(db, inviteeId, inviterId, source, 'rejected', 'ALREADY_BOUND_FIRST_WINS', clientIp, deviceId);
    return { bound: false, reason: 'ALREADY_BOUND' };
  }
  if (inviteeId === inviterId) {
    logInviteAudit(db, inviteeId, inviterId, source, 'rejected', 'SELF_INVITE', clientIp, deviceId);
    return { bound: false, reason: 'SELF_INVITE' };
  }

  // 写绑定（单层）
  db.prepare('UPDATE users SET invited_by = ? WHERE user_id = ?').run(inviterId, inviteeId);
  db.prepare('INSERT INTO user_invite_relation (inviter_id, invitee_id, level) VALUES (?, ?, 1)').run(inviterId, inviteeId);

  // 发放注册奖励（幂等：invite_rewards 唯一约束）
  let rewarded = 0;
  try {
    const pts = inviteRewardPoints('register');
    db.prepare('INSERT INTO invite_rewards (invitee_id, inviter_id, reward_type, points, status) VALUES (?, ?, ?, ?, ?)')
      .run(inviteeId, inviterId, 'register', pts, 'granted');
    grantPointsTx(db, inviterId, 'invite_register', pts, inviteeId, `邀请新用户注册奖励(单层)`);
    rewarded = pts;
  } catch (e) {
    // 唯一约束冲突 = 已发过，幂等跳过
  }

  logInviteAudit(db, inviteeId, inviterId, source, 'bound', rewarded ? `REWARDED_${rewarded}` : 'REWARD_IDEMPOTENT_SKIP', clientIp, deviceId);
  return { bound: true, rewardPoints: rewarded };
}

/**
 * P9-推广中心：被邀请人首次有效付费 → 奖励直接邀请人（单层、幂等）
 * 由支付链路在订单支付成功时调用；重复调用安全（invite_rewards 唯一约束）
 * @param {number|string} inviteeUserId - 被邀请人用户ID
 * @param {string} orderNo - 关联订单号（审计留痕）
 */
function grantFirstPayReward(inviteeUserId, orderNo) {
  const db = initDatabase();
  const inviteeId = parseInt(inviteeUserId, 10);
  if (!inviteeId || isNaN(inviteeId)) return { granted: false, reason: 'INVALID_USER' };

  const invitee = db.prepare('SELECT user_id, invited_by FROM users WHERE user_id = ?').get(inviteeId);
  if (!invitee) return { granted: false, reason: 'INVITEE_NOT_FOUND' };
  if (!invitee.invited_by) return { granted: false, reason: 'NOT_INVITED' };

  try {
    const pts = inviteRewardPoints('first_pay');
    db.prepare('INSERT INTO invite_rewards (invitee_id, inviter_id, reward_type, points, status) VALUES (?, ?, ?, ?, ?)')
      .run(inviteeId, invitee.invited_by, 'first_pay', pts, 'granted');
    grantPointsTx(db, invitee.invited_by, 'invite_first_pay', pts, inviteeId, `被邀请人首次有效付费奖励(单层)${orderNo ? ' 订单:' + orderNo : ''}`);
    logInviteAudit(db, inviteeId, invitee.invited_by, 'payment', 'first_pay_rewarded', `PTS_${pts}${orderNo ? '_ORDER_' + orderNo : ''}`, '', '');
    return { granted: true, points: pts };
  } catch (e) {
    return { granted: false, reason: 'ALREADY_GRANTED' };
  }
}

/**
 * 创建新用户（用户ID由数据库自增分配，从100000开始）
 * P9-推广中心：邀请归因/防作弊/单层奖励统一走 resolveInviteAttribution + bindInviteAndReward
 * @param {Object} params - { phone, email, password, inviteRef, inviteTs, inviteSig, inviteCode, deviceId, clientIp }
 * @param {Object} opts - { skipAttribution: 跳过邀请归因（内部迁移场景） }
 * @returns {Object} 新用户记录（不含密码哈希）
 */
function createUser(params, opts = {}) {
  const db = initDatabase();
  const { phone, email, password, inviteRef, inviteTs, inviteSig, inviteCode, deviceId, clientIp } = params;

  const userInviteCode = generateInviteCode();
  const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);

  const nickname = phone
    ? `国学爱好者${phone.slice(-4)}`
    : email
    ? email.split('@')[0]
    : '国学爱好者';

  // 插入用户（user_id 由数据库自增分配；invited_by 由 bindInviteAndReward 统一写入）
  const result = db.prepare(`
    INSERT INTO users (phone, email, password_hash, nickname, invite_code)
    VALUES (?, ?, ?, ?, ?)
  `).run(phone || null, email || null, passwordHash, nickname, userInviteCode);

  const newUserId = result.lastInsertRowid;

  // 为新用户创建资产记录
  db.prepare(`
    INSERT OR IGNORE INTO user_assets (user_id, points_balance, star_rating, star_rating_count, member_level)
    VALUES (?, 0, 0, 0, 'basic')
  `).run(newUserId);

  // 设备登记（同设备批量注册/关联账号检测的数据基础）
  if (deviceId) {
    db.prepare('INSERT INTO device_registry (device_id, user_id, ip) VALUES (?, ?, ?)')
      .run(String(deviceId).slice(0, 128), newUserId, clientIp || '');
  } else {
    db.prepare('INSERT INTO device_registry (device_id, user_id, ip) VALUES (?, ?, ?)')
      .run('unknown', newUserId, clientIp || '');
  }

  // 邀请归因 + 单层绑定发奖（签名链接 > 邀请码；五类防作弊拦截）
  let inviteResult = { bound: false, reason: 'SKIPPED' };
  if (!opts.skipAttribution) {
    const attribution = resolveInviteAttribution(db, { inviteRef, inviteTs, inviteSig, inviteCode, deviceId, clientIp });
    inviteResult = bindInviteAndReward(db, newUserId, attribution, clientIp, deviceId);
  }

  // 记录操作日志
  logOperation(db, newUserId, 'register', `注册成功，手机号:${phone || ''}，邮箱:${email || ''}`);

  return {
    userId: newUserId,
    phone: phone || null,
    email: email || null,
    nickname,
    avatar: '',
    bio: '',
    gender: '',
    birthday: '',
    tags: [],
    memberLevel: 'basic',
    inviteCode: userInviteCode,
    inviteBound: inviteResult.bound,
    inviteBoundReason: inviteResult.reason || '',
  };
}

/**
 * 验证密码
 */
function verifyPassword(password, hash) {
  try {
    return bcrypt.compareSync(password, hash);
  } catch {
    return false;
  }
}

/**
 * 记录操作日志
 */
function logOperation(db, userId, action, detail, ip) {
  try {
    db.prepare(`
      INSERT INTO operation_logs (user_id, action, detail, ip)
      VALUES (?, ?, ?, ?)
    `).run(userId || null, action, detail || '', ip || null);
  } catch (e) {
    console.error('[register_routes] 记录操作日志失败:', e.message);
  }
}

// ============================================================================
// JWT 工具函数
// ============================================================================

/**
 * 生成 JWT token 对
 * @param {Object} payload - JWT 载荷（包含 userId）
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
// JWT 鉴权中间件
// ============================================================================

/**
 * JWT 鉴权中间件
 * 从 Authorization: Bearer <token> 头中提取并验证 JWT
 * 验证通过后，将用户信息挂载到 req.user
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse(res, 401, false, '未提供有效的认证令牌，请先登录');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return jsonResponse(res, 401, false, '认证令牌格式错误');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type === 'refresh') {
      return jsonResponse(res, 401, false, '请使用 access token，不要使用 refresh token');
    }

    // 从数据库验证用户是否存在
    const user = findUserByUserId(decoded.userId);
    if (!user) {
      return jsonResponse(res, 401, false, '用户不存在或已被删除');
    }

    req.user = {
      userId: decoded.userId,
      phone: decoded.phone,
      email: decoded.email,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return jsonResponse(res, 401, false, '登录已过期，请重新登录');
    }
    return jsonResponse(res, 401, false, '认证令牌无效');
  }
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

/**
 * 设置 refresh token 的 httpOnly cookie
 */
function setRefreshTokenCookie(res, refreshToken) {
  res.cookie(COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

/**
 * 清除 refresh token cookie
 */
function clearRefreshTokenCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

/**
 * 构建用户信息返回对象（不含敏感字段）
 */
function buildUserResponse(user) {
  let tags = [];
  try {
    tags = JSON.parse(user.tags || '[]');
  } catch {
    tags = [];
  }

  return {
    userId: user.user_id,
    nickname: user.nickname || '',
    avatar: user.avatar || '',
    bio: user.bio || '',
    gender: user.gender || '',
    birthday: user.birthday || '',
    tags,
    phone: user.phone || null,
    email: user.email || null,
    memberLevel: user.member_level || 'basic',
    inviteCode: user.invite_code || '',
  };
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
  // 注册成功后设置 httpOnly cookie + 返回 access token
  // P9-推广中心：全量接收邀请归因参数（签名链接 ref/ts/sig、邀请码、设备指纹）
  // ------------------------------------------------------------------
  router.post('/register', async (req, res) => {
    try {
      const { phone, email, code, password, inviteCode, inviteRef, inviteTs, inviteSig, deviceId, referrer_id } = req.body;

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

      // 创建用户（user_id 由数据库自增分配，从100000开始；归因+防作弊+单层发奖在服务端完成）
      const user = createUser({
        phone: isPhone ? phone : null,
        email: isEmail ? email : null,
        password,
        inviteCode: inviteCode || null,
        inviteRef: inviteRef || null,
        inviteTs: inviteTs || null,
        inviteSig: inviteSig || null,
        deviceId: deviceId || null,
        clientIp: getClientIp(req),
      });

      // P7-社交修复-01：纯 referrer_id（无签名）不直接采信（防伪造），但审计留痕供人工对账
      if (!inviteRef && !inviteCode && referrer_id) {
        try {
          const db0 = initDatabase();
          const plainInviter = db0.prepare('SELECT user_id FROM users WHERE user_id = ?').get(Number(referrer_id));
          logInviteAudit(db0, user.userId, plainInviter ? plainInviter.user_id : null, 'plain_ref', 'rejected', 'UNSIGNED_REF_MANUAL_RECONCILE', getClientIp(req), deviceId || '');
        } catch (e) {
          console.error('[AUTH /register] plain_ref audit error:', e);
        }
      }

      // 生成 token 对
      const tokenPair = generateTokenPair({
        userId: user.userId,
        phone: user.phone || undefined,
        email: user.email || undefined,
      });

      // 设置 httpOnly cookie（refresh token）
      setRefreshTokenCookie(res, tokenPair.refreshToken);

      // 更新最后登录时间
      const db = initDatabase();
      db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(user.userId);

      return jsonResponse(res, 200, true, '注册成功', {
        user: buildUserResponse(user),
        accessToken: tokenPair.accessToken,
        expiresIn: tokenPair.expiresIn,
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
  // 支持从 httpOnly cookie 或 request body 获取 refresh token
  // ------------------------------------------------------------------
  router.post('/refresh-token', (req, res) => {
    try {
      // 优先从 cookie 获取，其次从 body 获取
      const cookies = parseCookies(req);
      const refreshToken = cookies[COOKIE_NAME] || req.body.refreshToken;

      if (!refreshToken) {
        return jsonResponse(res, 400, false, '缺少 refresh_token，请重新登录');
      }

      let decoded;
      try {
        decoded = jwt.verify(refreshToken, JWT_SECRET);
      } catch (err) {
        clearRefreshTokenCookie(res);
        return jsonResponse(res, 401, false, 'refresh_token 无效或已过期，请重新登录');
      }

      if (decoded.type !== 'refresh') {
        return jsonResponse(res, 401, false, '无效的 refresh_token');
      }

      // 验证用户是否存在
      const user = findUserByUserId(decoded.userId);
      if (!user) {
        clearRefreshTokenCookie(res);
        return jsonResponse(res, 401, false, '用户不存在');
      }

      const tokenPair = generateTokenPair({
        userId: decoded.userId,
        phone: decoded.phone,
        email: decoded.email,
      });

      // 刷新 httpOnly cookie
      setRefreshTokenCookie(res, tokenPair.refreshToken);

      return jsonResponse(res, 200, true, 'token 刷新成功', {
        accessToken: tokenPair.accessToken,
        expiresIn: tokenPair.expiresIn,
      });
    } catch (error) {
      console.error('[AUTH /refresh-token] error:', error);
      return jsonResponse(res, 500, false, '服务异常，请稍后重试');
    }
  });

  // ------------------------------------------------------------------
  // POST /api/auth/login — 密码登录（手机/邮箱/数字ID）
  // 走 SQLite + bcrypt 校验，不再依赖 localStorage
  // 登录成功后设置 httpOnly cookie + 返回 access token
  // ------------------------------------------------------------------
  router.post('/login', (req, res) => {
    try {
      const { phone, email, password, account } = req.body;

      // 兼容前端传 phone/email 或 account
      const loginAccount = account || phone || email;

      if (!loginAccount || !password) {
        return jsonResponse(res, 400, false, '请输入账号和密码');
      }

      const user = findUserByAccount(loginAccount);

      if (!user) {
        return jsonResponse(res, 404, false, '该账号未注册');
      }

      if (!verifyPassword(password, user.password_hash)) {
        return jsonResponse(res, 401, false, '密码错误');
      }

      // 更新最后登录时间
      const db = initDatabase();
      db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(user.user_id);

      // 记录操作日志
      logOperation(db, user.user_id, 'login', '密码登录成功', getClientIp(req));

      const tokenPair = generateTokenPair({
        userId: user.user_id,
        phone: user.phone || undefined,
        email: user.email || undefined,
      });

      // 设置 httpOnly cookie（refresh token）
      setRefreshTokenCookie(res, tokenPair.refreshToken);

      return jsonResponse(res, 200, true, '登录成功', {
        user: buildUserResponse(user),
        accessToken: tokenPair.accessToken,
        expiresIn: tokenPair.expiresIn,
      });
    } catch (error) {
      console.error('[AUTH /login] error:', error);
      return jsonResponse(res, 500, false, '登录失败，请稍后重试');
    }
  });

  // ------------------------------------------------------------------
  // GET /api/auth/profile — 获取当前用户资料（JWT鉴权）
  // ------------------------------------------------------------------
  router.get('/profile', authMiddleware, (req, res) => {
    try {
      const user = findUserByUserId(req.user.userId);
      if (!user) {
        return jsonResponse(res, 404, false, '用户不存在');
      }

      // 获取用户资产信息
      const db = initDatabase();
      const assets = db.prepare('SELECT * FROM user_assets WHERE user_id = ?').get(user.user_id);

      const profile = buildUserResponse(user);
      if (assets) {
        profile.pointsBalance = assets.points_balance || 0;
        profile.starRating = assets.star_rating || 0;
        profile.starRatingCount = assets.star_rating_count || 0;
      }

      return jsonResponse(res, 200, true, '获取资料成功', profile);
    } catch (error) {
      console.error('[AUTH /profile] error:', error);
      return jsonResponse(res, 500, false, '获取资料失败');
    }
  });

  // ------------------------------------------------------------------
  // POST /api/auth/profile/update — 更新用户资料（JWT鉴权 + SQLite持久化）
  // 可修改字段：昵称、头像、个人简介、性别、生日、个性标签
  // ------------------------------------------------------------------
  router.post('/profile/update', authMiddleware, (req, res) => {
    try {
      const { nickname, avatar, bio, gender, birthday, tags } = req.body;
      const userId = req.user.userId;

      // 参数校验
      if (nickname !== undefined && (typeof nickname !== 'string' || nickname.length > 30)) {
        return jsonResponse(res, 400, false, '昵称长度不能超过30个字符');
      }
      if (bio !== undefined && (typeof bio !== 'string' || bio.length > 200)) {
        return jsonResponse(res, 400, false, '个人简介长度不能超过200个字符');
      }
      if (gender !== undefined && !['', 'male', 'female', 'secret'].includes(gender)) {
        return jsonResponse(res, 400, false, '性别参数无效');
      }
      if (nickname !== undefined && nickname.trim() === '') {
        return jsonResponse(res, 400, false, '昵称不能为空');
      }

      const db = initDatabase();

      // 构建更新字段
      const updates = [];
      const values = [];

      if (nickname !== undefined) {
        updates.push('nickname = ?');
        values.push(nickname.trim());
      }
      if (avatar !== undefined) {
        updates.push('avatar = ?');
        values.push(avatar);
      }
      if (bio !== undefined) {
        updates.push('bio = ?');
        values.push(bio);
      }
      if (gender !== undefined) {
        updates.push('gender = ?');
        values.push(gender);
      }
      if (birthday !== undefined) {
        updates.push('birthday = ?');
        values.push(birthday);
      }
      if (tags !== undefined) {
        // 标签存储为 JSON 数组字符串
        const tagsStr = Array.isArray(tags) ? JSON.stringify(tags.slice(0, 5)) : '[]';
        updates.push('tags = ?');
        values.push(tagsStr);
      }

      if (updates.length === 0) {
        return jsonResponse(res, 400, false, '没有需要更新的字段');
      }

      // 添加更新时间
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(userId);

      // 执行更新（直接写入磁盘数据库，持久化）
      db.prepare(`
        UPDATE users SET ${updates.join(', ')} WHERE user_id = ?
      `).run(...values);

      // 记录操作日志
      logOperation(db, userId, 'profile_update', `更新字段: ${updates.filter(u => !u.includes('updated_at')).map(u => u.split(' =')[0]).join(', ')}`, getClientIp(req));

      // 查询更新后的用户数据
      const updatedUser = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);

      return jsonResponse(res, 200, true, '保存成功', buildUserResponse(updatedUser));
    } catch (error) {
      console.error('[AUTH /profile/update] error:', error);
      return jsonResponse(res, 500, false, '保存失败，请稍后重试');
    }
  });

  // ------------------------------------------------------------------
  // POST /api/auth/records/save — 保存排盘记录（JWT鉴权 + SQLite持久化）
  // ------------------------------------------------------------------
  router.post('/records/save', authMiddleware, (req, res) => {
    try {
      const { record_type, record_data, note } = req.body;
      const userId = req.user.userId;

      if (!record_type || typeof record_type !== 'string') {
        return jsonResponse(res, 400, false, '记录类型不能为空');
      }
      if (!record_data) {
        return jsonResponse(res, 400, false, '记录数据不能为空');
      }

      // record_data 序列化为 JSON 字符串存储
      const dataStr = typeof record_data === 'string' ? record_data : JSON.stringify(record_data);
      // 限制单条记录大小（防止过大）
      if (dataStr.length > 500000) {
        return jsonResponse(res, 400, false, '记录数据过大');
      }

      const db = initDatabase();
      const stmt = db.prepare(`
        INSERT INTO user_records (user_id, record_type, record_data, note, status)
        VALUES (?, ?, ?, ?, 'completed')
      `);
      const result = stmt.run(userId, record_type, dataStr, note || '');

      return jsonResponse(res, 200, true, '记录已保存', {
        record_id: result.lastInsertRowid,
        record_type,
        saved_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[AUTH /records/save] error:', error);
      return jsonResponse(res, 500, false, '保存记录失败');
    }
  });

  // ------------------------------------------------------------------
  // GET /api/auth/records/list — 获取用户所有排盘记录
  // ------------------------------------------------------------------
  router.get('/records/list', authMiddleware, (req, res) => {
    try {
      const userId = req.user.userId;
      const recordType = req.query.type || '';
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const offset = parseInt(req.query.offset) || 0;

      const db = initDatabase();
      let rows;
      if (recordType) {
        rows = db.prepare(`
          SELECT id, user_id, record_type, record_data, note, status, created_at
          FROM user_records
          WHERE user_id = ? AND record_type = ?
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `).all(userId, recordType, limit, offset);
      } else {
        rows = db.prepare(`
          SELECT id, user_id, record_type, record_data, note, status, created_at
          FROM user_records
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `).all(userId, limit, offset);
      }

      // 解析 record_data JSON
      const records = rows.map(r => {
        let parsed = null;
        try {
          parsed = JSON.parse(r.record_data);
        } catch (e) {
          parsed = r.record_data;
        }
        return {
          id: r.id,
          record_type: r.record_type,
          record_data: parsed,
          note: r.note,
          status: r.status,
          created_at: r.created_at,
        };
      });

      return jsonResponse(res, 200, true, '获取记录成功', { records, total: records.length });
    } catch (error) {
      console.error('[AUTH /records/list] error:', error);
      return jsonResponse(res, 500, false, '获取记录失败');
    }
  });

  // ------------------------------------------------------------------
  // DELETE /api/auth/records/:id — 删除指定记录
  // ------------------------------------------------------------------
  router.delete('/records/:id', authMiddleware, (req, res) => {
    try {
      const userId = req.user.userId;
      const recordId = parseInt(req.params.id, 10);
      if (!recordId) {
        return jsonResponse(res, 400, false, '记录ID无效');
      }

      const db = initDatabase();
      const result = db.prepare(`
        DELETE FROM user_records WHERE id = ? AND user_id = ?
      `).run(recordId, userId);

      if (result.changes === 0) {
        return jsonResponse(res, 404, false, '记录不存在或无权删除');
      }

      return jsonResponse(res, 200, true, '记录已删除');
    } catch (error) {
      console.error('[AUTH /records/delete] error:', error);
      return jsonResponse(res, 500, false, '删除记录失败');
    }
  });

  // ------------------------------------------------------------------
  // POST /api/auth/login-code — 验证码登录（手机/邮箱）
  // P9-推广中心：验证码登录自动识别邀请参数；老用户直接登录，新用户自动注册（随机初始密码，可后续找回/修改）
  // 注册口径与 /register 完全一致：签名链接归因 + 防作弊 + 单层发奖
  // ------------------------------------------------------------------
  router.post('/login-code', async (req, res) => {
    try {
      const { phone, email, code, inviteCode, inviteRef, inviteTs, inviteSig, deviceId } = req.body;

      const isPhone = phone && /^1[3-9]\d{9}$/.test(phone);
      const isEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!isPhone && !isEmail) {
        return jsonResponse(res, 400, false, '请输入正确的手机号或邮箱');
      }
      if (!code || !/^\d{6}$/.test(code)) {
        return jsonResponse(res, 400, false, '请输入6位验证码');
      }

      const identifier = isPhone ? `sms:${phone}` : `email:${email}`;
      const valid = verificationStore.verifyCode(identifier, code);
      if (!valid) {
        return jsonResponse(res, 400, false, '验证码错误或已过期');
      }

      const db = initDatabase();
      const existing = isPhone ? findUserByPhone(phone) : findUserByEmail(email);

      let user;
      let isNewUser = false;
      if (existing) {
        user = existing;
        // 首绑优先：老用户从未绑定过邀请人时，登录也补归因（首绑永久生效）
        if (!existing.invited_by && (inviteRef || inviteCode)) {
          const attribution = resolveInviteAttribution(db, { inviteRef, inviteTs, inviteSig, inviteCode, deviceId, clientIp: getClientIp(req) });
          if (attribution.ok && attribution.inviterId && attribution.inviterId !== existing.user_id) {
            bindInviteAndReward(db, existing.user_id, attribution, getClientIp(req), deviceId);
          } else if (!attribution.ok) {
            logInviteAudit(db, existing.user_id, attribution.inviterId || null, attribution.source, 'rejected', attribution.reason, getClientIp(req), deviceId);
          }
        }
        if (deviceId) {
          db.prepare('INSERT INTO device_registry (device_id, user_id, ip) VALUES (?, ?, ?)')
            .run(String(deviceId).slice(0, 128), existing.user_id, getClientIp(req));
        }
      } else {
        // 新用户自动注册：随机强密码（用户可通过"忘记密码"重置）
        const randomPassword = `Yd${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}!`;
        user = createUser({
          phone: isPhone ? phone : null,
          email: isEmail ? email : null,
          password: randomPassword,
          inviteCode: inviteCode || null,
          inviteRef: inviteRef || null,
          inviteTs: inviteTs || null,
          inviteSig: inviteSig || null,
          deviceId: deviceId || null,
          clientIp: getClientIp(req),
        });
        isNewUser = true;
        user.isAutoRegistered = true;
      }

      db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(user.user_id);

      const tokenPair = generateTokenPair({
        userId: user.user_id,
        phone: user.phone || undefined,
        email: user.email || undefined,
      });
      setRefreshTokenCookie(res, tokenPair.refreshToken);

      const fresh = findUserByUserId(user.user_id);
      return jsonResponse(res, 200, true, isNewUser ? '注册成功' : '登录成功', {
        user: buildUserResponse(fresh || user),
        accessToken: tokenPair.accessToken,
        expiresIn: tokenPair.expiresIn,
        isNewUser,
      });
    } catch (error) {
      console.error('[AUTH /login-code] error:', error);
      return jsonResponse(res, 500, false, '登录失败，请稍后重试');
    }
  });

  // ------------------------------------------------------------------
  // GET /api/auth/invite/link — 获取专属签名邀请链接（JWT鉴权）
  // P9-推广中心：二维码/分享统一数据源；签名永久有效，防伪造
  // ------------------------------------------------------------------
  router.get('/invite/link', authMiddleware, (req, res) => {
    try {
      const user = findUserByUserId(req.user.userId);
      if (!user) {
        return jsonResponse(res, 404, false, '用户不存在');
      }
      const ts = Date.now();
      const sig = signInviteRef(user.user_id, ts);
      const base = process.env.PUBLIC_BASE_URL || `https://${req.headers.host || 'yandaoguoxue.yandao.vip'}`;
      const inviteLink = `${base}/register?ref=${user.user_id}&ts=${ts}&sig=${sig}`;
      return jsonResponse(res, 200, true, '获取成功', {
        userId: user.user_id,
        inviteCode: user.invite_code || '',
        inviteLink,
        inviteRef: String(user.user_id),
        inviteTs: String(ts),
        inviteSig: sig,
        rewardRules: {
          register: inviteRewardPoints('register'),
          firstPay: inviteRewardPoints('first_pay'),
        },
      });
    } catch (error) {
      console.error('[AUTH /invite/link] error:', error);
      return jsonResponse(res, 500, false, '获取邀请链接失败');
    }
  });

  // ------------------------------------------------------------------
  // GET /api/auth/invite/overview — 推广中心总览（JWT鉴权）
  // 单层口径：仅直接邀请（level=1）；统计 + 被邀请人明细（脱敏） + 奖励明细
  // ------------------------------------------------------------------
  router.get('/invite/overview', authMiddleware, (req, res) => {
    try {
      const userId = req.user.userId;
      const db = initDatabase();

      const relations = db.prepare(
        "SELECT r.invitee_id, r.invite_time, u.nickname FROM user_invite_relation r LEFT JOIN users u ON u.user_id = r.invitee_id WHERE r.inviter_id = ? AND r.level = 1 ORDER BY r.invite_time DESC"
      ).all(userId);

      const rewards = db.prepare(
        "SELECT id, invitee_id, reward_type, points, status, created_at FROM invite_rewards WHERE inviter_id = ? ORDER BY created_at DESC LIMIT 100"
      ).all(userId);

      const pointsRow = db.prepare('SELECT points_balance FROM user_assets WHERE user_id = ?').get(userId);

      const todayPrefix = new Date().toISOString().slice(0, 10);
      const todayInvites = relations.filter(r => String(r.invite_time || '').slice(0, 10) === todayPrefix).length;
      const monthPrefix = todayPrefix.slice(0, 7);
      const monthInvites = relations.filter(r => String(r.invite_time || '').slice(0, 7) === monthPrefix).length;
      const totalRewardPoints = rewards.reduce((s, r) => s + (r.points || 0), 0);

      const maskName = (name) => {
        if (!name) return '国学爱好者';
        const n = String(name);
        if (n.length <= 1) return n + '**';
        return n.charAt(0) + '**' + n.slice(-1);
      };

      return jsonResponse(res, 200, true, '获取成功', {
        stats: {
          totalInvites: relations.length,
          todayInvites,
          monthInvites,
          totalRewardPoints,
          pointsBalance: pointsRow ? pointsRow.points_balance || 0 : 0,
        },
        invitees: relations.map(r => ({
          inviteeId: r.invitee_id,
          name: maskName(r.nickname),
          invitedAt: r.invite_time,
        })),
        rewards: rewards.map(r => ({
          id: r.id,
          inviteeId: r.invitee_id,
          type: r.reward_type === 'first_pay' ? '被邀请人首次付费' : '被邀请人注册',
          points: r.points,
          status: r.status,
          grantedAt: r.created_at,
        })),
      });
    } catch (error) {
      console.error('[AUTH /invite/overview] error:', error);
      return jsonResponse(res, 500, false, '获取推广数据失败');
    }
  });

  // ------------------------------------------------------------------
  // GET /api/auth/points/transactions — 积分明细（JWT鉴权）
  // P9-推广中心：奖励明细可查（与积分流水同源）
  // ------------------------------------------------------------------
  router.get('/points/transactions', authMiddleware, (req, res) => {
    try {
      const userId = req.user.userId;
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const offset = parseInt(req.query.offset) || 0;
      const db = initDatabase();

      const rows = db.prepare(
        'SELECT id, tx_type, amount, balance_after, ref_id, note, created_at FROM points_transactions WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?'
      ).all(userId, limit, offset);

      const TYPE_LABELS = {
        invite_register: '邀请注册奖励',
        invite_first_pay: '邀请付费奖励',
        share: '分享奖励',
        consume: '消费扣减',
        recharge: '充值',
        adjust: '调整',
      };

      const balanceRow = db.prepare('SELECT points_balance FROM user_assets WHERE user_id = ?').get(userId);

      return jsonResponse(res, 200, true, '获取成功', {
        balance: balanceRow ? balanceRow.points_balance || 0 : 0,
        transactions: rows.map(r => ({
          id: r.id,
          type: r.tx_type,
          typeLabel: TYPE_LABELS[r.tx_type] || r.tx_type,
          amount: r.amount,
          balanceAfter: r.balance_after,
          note: r.note,
          createdAt: r.created_at,
        })),
      });
    } catch (error) {
      console.error('[AUTH /points/transactions] error:', error);
      return jsonResponse(res, 500, false, '获取积分明细失败');
    }
  });

  // ------------------------------------------------------------------
  // POST /api/auth/logout — 退出登录（清除 cookie）
  // ------------------------------------------------------------------
  router.post('/logout', (req, res) => {
    try {
      clearRefreshTokenCookie(res);

      // 记录操作日志
      if (req.user) {
        const db = initDatabase();
        logOperation(db, req.user.userId, 'logout', '用户退出登录', getClientIp(req));
      }

      return jsonResponse(res, 200, true, '已退出登录');
    } catch (error) {
      console.error('[AUTH /logout] error:', error);
      return jsonResponse(res, 500, false, '退出失败');
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
  authMiddleware,
  logOperation,
  grantFirstPayReward,
  grantPointsTx,
  inviteRewardPoints,
};
