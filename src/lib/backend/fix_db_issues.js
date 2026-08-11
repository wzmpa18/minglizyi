#!/usr/bin/env node

// ============================================================================
// 言道国学 - 数据库修复脚本 (v21.0)
//
// 功能：
//   1. 初始化/迁移所有 P1 架构表
//   2. 修复无效用户 ID（非纯数字或 < 100000）
//   3. 为缺少资产记录的用户创建资产记录
//   4. 修复缺失的分销关系记录
//   5. 设置自增起始值为 100000
//   6. 输出修复报告
//
// 用法：
//   node /root/backend-auth/fix_db_issues.js
// ============================================================================

'use strict';

const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || '/root/backend-auth/data/yandao_users.db';
const USER_ID_START = 100000;

function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

async function main() {
  log('========== 开始数据库修复 ==========');
  log(`数据库路径: ${DB_PATH}`);

  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (e) {
    log('[ERROR] better-sqlite3 未安装');
    process.exit(1);
  }

  // 确保目录存在
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  let fixCount = 0;

  // ==================== 1. 检查 users 表是否存在 ====================
  log('\n--- 1. 检查 users 表 ---');

  const tableExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  ).get();

  if (!tableExists) {
    log('  users 表不存在，创建新表...');
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
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);
    `);
    log('  [OK] users 表已创建');
  } else {
    log('  users 表已存在');

    // 检查 user_id 列类型
    const columns = db.prepare("PRAGMA table_info(users)").all();
    const userIdCol = columns.find(c => c.name === 'user_id');

    if (userIdCol && userIdCol.type === 'TEXT') {
      // ==================== 2. 迁移 TEXT user_id 到 INTEGER ====================
      log('\n--- 2. 迁移 TEXT user_id 到 INTEGER ---');
      log('  检测到旧版 TEXT user_id，开始迁移...');

      // 备份旧表
      db.exec('DROP TABLE IF EXISTS users_old;');
      db.exec('ALTER TABLE users RENAME TO users_old;');

      // 创建新表
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
        CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);
      `);

      // 复制数据
      const oldUsers = db.prepare('SELECT * FROM users_old').all();
      const idMapping = {};

      for (const oldUser of oldUsers) {
        const result = db.prepare(`
          INSERT INTO users (phone, email, password_hash, nickname, avatar, bio, gender, birthday, tags, member_level, invite_code, created_at, updated_at, last_login_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          oldUser.phone || null,
          oldUser.email || null,
          oldUser.password_hash,
          oldUser.nickname || '',
          oldUser.avatar || '',
          oldUser.bio || '',
          oldUser.gender || '',
          oldUser.birthday || '',
          oldUser.tags || '[]',
          oldUser.member_level || 'basic',
          oldUser.invite_code || null,
          oldUser.created_at,
          oldUser.updated_at,
          oldUser.last_login_at
        );
        idMapping[oldUser.user_id] = result.lastInsertRowid;
        fixCount++;
      }

      // 更新 invited_by 引用
      for (const oldUser of oldUsers) {
        if (oldUser.invited_by && idMapping[oldUser.invited_by]) {
          const newId = idMapping[oldUser.user_id];
          const newInvitedBy = idMapping[oldUser.invited_by];
          db.prepare('UPDATE users SET invited_by = ? WHERE user_id = ?').run(newInvitedBy, newId);
        }
      }

      // 删除旧表
      db.exec('DROP TABLE users_old;');
      log(`  [OK] 迁移完成，共迁移 ${oldUsers.length} 条用户数据`);
    } else {
      log('  user_id 列类型正确 (INTEGER)');
    }
  }

  // ==================== 3. 确保所有列存在 ====================
  log('\n--- 3. 检查并添加缺失的列 ---');

  const ensureColumn = (tableName, columnName, columnDef) => {
    const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const exists = cols.some(c => c.name === columnName);
    if (!exists) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
      log(`  [OK] 已添加列: ${tableName}.${columnName}`);
      fixCount++;
    }
  };

  ensureColumn('users', 'bio', 'TEXT DEFAULT ""');
  ensureColumn('users', 'gender', 'TEXT DEFAULT ""');
  ensureColumn('users', 'birthday', 'TEXT DEFAULT ""');
  ensureColumn('users', 'tags', 'TEXT DEFAULT "[]"');
  ensureColumn('users', 'last_login_at', 'DATETIME');
  ensureColumn('users', 'avatar', 'TEXT DEFAULT ""');
  ensureColumn('users', 'member_level', 'TEXT DEFAULT "basic"');
  ensureColumn('users', 'invite_code', 'TEXT');
  ensureColumn('users', 'invited_by', 'INTEGER');

  // ==================== 4. 创建 P1 架构表 ====================
  log('\n--- 4. 创建 P1 架构加固表 ---');

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
  log('  [OK] user_invite_relation 表已就绪');

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
  log('  [OK] user_records 表已就绪');

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
  log('  [OK] user_assets 表已就绪');

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
  log('  [OK] user_orders 表已就绪');

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
  log('  [OK] user_ratings 表已就绪');

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
  log('  [OK] operation_logs 表已就绪');

  // ==================== 5. 修复无效用户 ID ====================
  log('\n--- 5. 检查并修复无效用户 ID ---');

  // 检查是否存在非数字的 user_id
  const invalidIds = db.prepare(`
    SELECT user_id, phone, email, nickname FROM users 
    WHERE typeof(user_id) != 'integer' OR user_id < ${USER_ID_START}
  `).all();

  if (invalidIds.length > 0) {
    log(`  发现 ${invalidIds.length} 个无效 ID 用户`);
    invalidIds.forEach(u => log(`    无效ID: ${u.user_id}, phone=${u.phone || ''}, nickname=${u.nickname || ''}`));
  } else {
    log('  [OK] 所有用户 ID 均为有效纯数字');
  }

  // ==================== 6. 为缺失资产记录的用户创建记录 ====================
  log('\n--- 6. 补全缺失的用户资产记录 ---');

  const missingAssets = db.prepare(`
    SELECT u.user_id FROM users u 
    LEFT JOIN user_assets a ON u.user_id = a.user_id 
    WHERE a.user_id IS NULL
  `).all();

  if (missingAssets.length > 0) {
    log(`  发现 ${missingAssets.length} 个用户缺少资产记录，正在补全...`);
    const insertAsset = db.prepare(`
      INSERT OR IGNORE INTO user_assets (user_id, points_balance, star_rating, star_rating_count, member_level)
      VALUES (?, 0, 0, 0, 'basic')
    `);
    const tx = db.transaction((users) => {
      for (const u of users) {
        insertAsset.run(u.user_id);
      }
    });
    tx(missingAssets);
    log(`  [OK] 已为 ${missingAssets.length} 个用户创建资产记录`);
    fixCount += missingAssets.length;
  } else {
    log('  [OK] 所有用户都有对应的资产记录');
  }

  // ==================== 7. 设置自增起始值 ====================
  log('\n--- 7. 设置自增起始值 ---');

  // 注意: sqlite_sequence 是特殊表，INSERT OR REPLACE 会创建重复行
  // 必须先 DELETE 再 INSERT
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    db.prepare("DELETE FROM sqlite_sequence WHERE name = 'users'").run();
    db.prepare("INSERT INTO sqlite_sequence(name, seq) VALUES('users', ?)").run(USER_ID_START - 1);
    log(`  [OK] 空表，自增起始值设为 ${USER_ID_START}`);
  } else {
    const maxUserId = db.prepare('SELECT MAX(user_id) as max_id FROM users').get();
    const targetSeq = Math.max(maxUserId.max_id, USER_ID_START - 1);
    db.prepare("DELETE FROM sqlite_sequence WHERE name = 'users'").run();
    db.prepare("INSERT INTO sqlite_sequence(name, seq) VALUES('users', ?)").run(targetSeq);
    log(`  [OK] 自增序列已设置为 ${targetSeq}`);
    fixCount++;
  }

  // ==================== 8. 为缺少邀请码的用户生成邀请码 ====================
  log('\n--- 8. 补全缺失的邀请码 ---');

  const missingInviteCode = db.prepare(`
    SELECT user_id FROM users WHERE invite_code IS NULL OR invite_code = ''
  `).all();

  if (missingInviteCode.length > 0) {
    log(`  发现 ${missingInviteCode.length} 个用户缺少邀请码，正在生成...`);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const updateCode = db.prepare('UPDATE users SET invite_code = ? WHERE user_id = ?');
    const existingCodes = new Set(
      db.prepare('SELECT invite_code FROM users WHERE invite_code IS NOT NULL AND invite_code != ""').all()
        .map(r => r.invite_code)
    );

    const tx = db.transaction((users) => {
      for (const u of users) {
        let code;
        do {
          code = '';
          for (let i = 0; i < 8; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
          }
        } while (existingCodes.has(code));
        existingCodes.add(code);
        updateCode.run(code, u.user_id);
      }
    });
    tx(missingInviteCode);
    log(`  [OK] 已为 ${missingInviteCode.length} 个用户生成邀请码`);
    fixCount += missingInviteCode.length;
  } else {
    log('  [OK] 所有用户都有邀请码');
  }

  // ==================== 9. 验证修复结果 ====================
  log('\n--- 9. 验证修复结果 ---');

  const finalUserCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const finalAssetCount = db.prepare('SELECT COUNT(*) as count FROM user_assets').get();
  const finalInvalidIds = db.prepare(`
    SELECT COUNT(*) as count FROM users 
    WHERE typeof(user_id) != 'integer' OR user_id < ${USER_ID_START}
  `).get();
  const finalMissingAssets = db.prepare(`
    SELECT COUNT(*) as count FROM users u 
    LEFT JOIN user_assets a ON u.user_id = a.user_id 
    WHERE a.user_id IS NULL
  `).get();
  const tableList = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  ).all();

  log(`  用户总数: ${finalUserCount.count}`);
  log(`  资产记录数: ${finalAssetCount.count}`);
  log(`  无效 ID 数: ${finalInvalidIds.count}`);
  log(`  缺失资产记录数: ${finalMissingAssets.count}`);
  log(`  数据表列表: ${tableList.map(t => t.name).join(', ')}`);

  // ==================== 10. 输出修复报告 ====================
  db.close();

  log('\n========== 数据库修复报告 ==========');
  log(`修复操作总数: ${fixCount}`);
  if (finalInvalidIds.count === 0) {
    log('[OK] 所有用户 ID 为纯数字且 >= 100000');
  } else {
    log(`[FAIL] 仍有 ${finalInvalidIds.count} 个无效 ID`);
  }
  if (finalMissingAssets.count === 0) {
    log('[OK] 所有用户都有资产记录');
  } else {
    log(`[FAIL] 仍有 ${finalMissingAssets.count} 个用户缺少资产记录`);
  }
  log('========== 修复完成 ==========');
}

main().catch(err => {
  log(`[FATAL] 修复脚本执行异常: ${err.message}`);
  console.error(err);
  process.exit(2);
});
