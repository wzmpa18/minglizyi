#!/usr/bin/env node

// ============================================================================
// 言道国学 - 数据库一致性校验脚本
//
// 功能：
//   1. SQLite 数据库完整性检查（PRAGMA integrity_check）
//   2. 检查用户表数据完整性（空密码、重复手机号/邮箱等）
//   3. 检查分销关系一致性（邀请人/被邀请人是否存在，层级是否正确）
//   4. 检查用户资产记录完整性（每个用户是否有对应的资产记录）
//   5. 检查用户ID格式（必须为纯数字且 >= 100000）
//   6. 检查孤立记录（引用了不存在用户的记录）
//   7. 输出校验报告，异常时发出告警
//
// 用法：
//   node /root/backend-auth/check_db_consistency.js
//
// crontab 配置（每日凌晨 3 点执行，在备份之后）：
//   0 3 * * * node /root/backend-auth/check_db_consistency.js >> /root/backup/consistency.log 2>&1
// ============================================================================

'use strict';

const path = require('path');

// 数据库路径
const DB_PATH = process.env.DB_PATH || '/root/backend-auth/data/yandao_users.db';

// 结果统计
let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
const warnings = [];
const errors = [];

function log(msg) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${timestamp}] ${msg}`);
}

function checkPassed(name) {
  totalChecks++;
  passedChecks++;
  log(`  [PASS] ${name}`);
}

function checkWarning(name, detail) {
  totalChecks++;
  warnings.push({ name, detail });
  log(`  [WARN] ${name}: ${detail}`);
}

function checkFailed(name, detail) {
  totalChecks++;
  errors.push({ name, detail });
  log(`  [FAIL] ${name}: ${detail}`);
}

async function main() {
  log('========== 开始数据库一致性校验 ==========');
  log(`数据库路径: ${DB_PATH}`);

  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (e) {
    log('[ERROR] better-sqlite3 未安装，无法执行校验');
    process.exit(1);
  }

  const fs = require('fs');
  if (!fs.existsSync(DB_PATH)) {
    log(`[ERROR] 数据库文件不存在: ${DB_PATH}`);
    process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: true });
  db.pragma('journal_mode = WAL');

  // ==================== 1. 数据库完整性检查 ====================
  log('\n--- 1. 数据库完整性检查 ---');

  const integrityResult = db.prepare('PRAGMA integrity_check').get();
  if (integrityResult.integrity_check === 'ok') {
    checkPassed('数据库完整性检查通过');
  } else {
    checkFailed('数据库完整性检查', JSON.stringify(integrityResult));
  }

  const foreignKeyCheck = db.prepare('PRAGMA foreign_key_check').all();
  if (foreignKeyCheck.length === 0) {
    checkPassed('外键约束检查通过（无违反外键的记录）');
  } else {
    checkFailed('外键约束检查', `发现 ${foreignKeyCheck.length} 条违反外键约束的记录`);
    foreignKeyCheck.slice(0, 10).forEach(v => log(`    ${JSON.stringify(v)}`));
  }

  // ==================== 2. 用户表数据完整性 ====================
  log('\n--- 2. 用户表数据完整性 ---');

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  log(`  用户总数: ${userCount.count}`);
  checkPassed(`用户表记录数: ${userCount.count}`);

  // 检查空密码用户
  const emptyPwd = db.prepare("SELECT COUNT(*) as count FROM users WHERE password_hash IS NULL OR password_hash = ''").get();
  if (emptyPwd.count === 0) {
    checkPassed('无空密码用户');
  } else {
    checkFailed('空密码用户检查', `发现 ${emptyPwd.count} 个空密码用户`);
  }

  // 检查重复手机号
  const dupPhone = db.prepare(`
    SELECT phone, COUNT(*) as cnt FROM users 
    WHERE phone IS NOT NULL 
    GROUP BY phone HAVING cnt > 1
  `).all();
  if (dupPhone.length === 0) {
    checkPassed('无重复手机号');
  } else {
    checkFailed('重复手机号检查', `发现 ${dupPhone.length} 个重复手机号`);
    dupPhone.slice(0, 5).forEach(v => log(`    手机号 ${v.phone} 重复 ${v.cnt} 次`));
  }

  // 检查重复邮箱
  const dupEmail = db.prepare(`
    SELECT email, COUNT(*) as cnt FROM users 
    WHERE email IS NOT NULL 
    GROUP BY email HAVING cnt > 1
  `).all();
  if (dupEmail.length === 0) {
    checkPassed('无重复邮箱');
  } else {
    checkFailed('重复邮箱检查', `发现 ${dupEmail.length} 个重复邮箱`);
    dupEmail.slice(0, 5).forEach(v => log(`    邮箱 ${v.email} 重复 ${v.cnt} 次`));
  }

  // 检查重复邀请码
  const dupInviteCode = db.prepare(`
    SELECT invite_code, COUNT(*) as cnt FROM users 
    WHERE invite_code IS NOT NULL AND invite_code != ''
    GROUP BY invite_code HAVING cnt > 1
  `).all();
  if (dupInviteCode.length === 0) {
    checkPassed('无重复邀请码');
  } else {
    checkWarning('重复邀请码检查', `发现 ${dupInviteCode.length} 个重复邀请码`);
  }

  // ==================== 3. 用户ID格式检查 ====================
  log('\n--- 3. 用户ID格式检查 ---');

  const invalidId = db.prepare(`
    SELECT user_id FROM users 
    WHERE typeof(user_id) != 'integer' OR user_id < 100000
  `).all();
  if (invalidId.length === 0) {
    checkPassed('所有用户ID均为纯数字且 >= 100000');
  } else {
    checkFailed('用户ID格式检查', `发现 ${invalidId.length} 个无效ID`);
    invalidId.slice(0, 5).forEach(v => log(`    无效ID: ${v.user_id}`));
  }

  // 检查ID连续性（自增无大跳变）
  const idGap = db.prepare(`
    SELECT user_id, 
           user_id - LAG(user_id) OVER (ORDER BY user_id) as gap 
    FROM users 
    ORDER BY user_id
  `).all();
  const bigGaps = idGap.filter(v => v.gap !== null && v.gap > 1);
  if (bigGaps.length === 0) {
    checkPassed('用户ID连续无跳变');
  } else {
    checkWarning('ID跳变检查', `发现 ${bigGaps.length} 处ID不连续（可能因删除导致，属正常现象）`);
  }

  // ==================== 4. 分销关系一致性 ====================
  log('\n--- 4. 分销关系一致性 ---');

  const inviteRelationCount = db.prepare('SELECT COUNT(*) as count FROM user_invite_relation').get();
  log(`  分销关系记录数: ${inviteRelationCount.count}`);

  // 检查邀请人是否存在
  const orphanInviter = db.prepare(`
    SELECT r.id, r.inviter_id, r.invitee_id 
    FROM user_invite_relation r 
    LEFT JOIN users u ON r.inviter_id = u.user_id 
    WHERE u.user_id IS NULL
  `).all();
  if (orphanInviter.length === 0) {
    checkPassed('分销关系无孤立邀请人');
  } else {
    checkFailed('孤立邀请人检查', `发现 ${orphanInviter.length} 条引用不存在邀请人的记录`);
    orphanInviter.slice(0, 5).forEach(v => log(`    关系ID ${v.id}: 邀请人 ${v.inviter_id} 不存在`));
  }

  // 检查被邀请人是否存在
  const orphanInvitee = db.prepare(`
    SELECT r.id, r.inviter_id, r.invitee_id 
    FROM user_invite_relation r 
    LEFT JOIN users u ON r.invitee_id = u.user_id 
    WHERE u.user_id IS NULL
  `).all();
  if (orphanInvitee.length === 0) {
    checkPassed('分销关系无孤立被邀请人');
  } else {
    checkFailed('孤立被邀请人检查', `发现 ${orphanInvitee.length} 条引用不存在被邀请人的记录`);
  }

  // 检查二级分销关系
  const level2Relations = db.prepare(`
    SELECT r1.inviter_id as grandparent, r1.invitee_id as parent, r2.invitee_id as child
    FROM user_invite_relation r1
    JOIN user_invite_relation r2 ON r1.invitee_id = r2.inviter_id
    WHERE r1.level = 1 AND r2.level = 1
  `).all();
  log(`  一级+二级分销链路数: ${level2Relations.length}`);

  // ==================== 5. 用户资产记录完整性 ====================
  log('\n--- 5. 用户资产记录完整性 ---');

  const missingAssets = db.prepare(`
    SELECT u.user_id, u.nickname 
    FROM users u 
    LEFT JOIN user_assets a ON u.user_id = a.user_id 
    WHERE a.user_id IS NULL
  `).all();
  if (missingAssets.length === 0) {
    checkPassed('所有用户都有对应的资产记录');
  } else {
    checkWarning('资产记录检查', `发现 ${missingAssets.length} 个用户缺少资产记录`);
    missingAssets.slice(0, 5).forEach(v => log(`    用户 ${v.user_id} (${v.nickname || '无名'}) 缺少资产记录`));
  }

  // 检查负积分
  const negativePoints = db.prepare(`
    SELECT user_id, points_balance FROM user_assets WHERE points_balance < 0
  `).all();
  if (negativePoints.length === 0) {
    checkPassed('无负积分用户');
  } else {
    checkFailed('负积分检查', `发现 ${negativePoints.length} 个负积分用户`);
  }

  // 检查星级范围有效性
  const invalidRating = db.prepare(`
    SELECT user_id, star_rating FROM user_assets 
    WHERE star_rating < 0 OR star_rating > 5
  `).all();
  if (invalidRating.length === 0) {
    checkPassed('所有星级在有效范围内 (0-5)');
  } else {
    checkWarning('星级范围检查', `发现 ${invalidRating.length} 个异常星级`);
  }

  // ==================== 6. 操作日志完整性 ====================
  log('\n--- 6. 操作日志完整性 ---');

  const logCount = db.prepare('SELECT COUNT(*) as count FROM operation_logs').get();
  log(`  操作日志总数: ${logCount.count}`);

  const orphanLogs = db.prepare(`
    SELECT l.id, l.user_id FROM operation_logs l 
    LEFT JOIN users u ON l.user_id = u.user_id 
    WHERE l.user_id IS NOT NULL AND u.user_id IS NULL
  `).all();
  if (orphanLogs.length === 0) {
    checkPassed('操作日志无孤立用户引用');
  } else {
    checkWarning('孤立日志检查', `发现 ${orphanLogs.length} 条引用不存在用户的日志`);
  }

  // ==================== 7. 业务记录完整性 ====================
  log('\n--- 7. 业务记录完整性 ---');

  const recordCount = db.prepare('SELECT COUNT(*) as count FROM user_records').get();
  log(`  业务记录总数: ${recordCount.count}`);

  const orphanRecords = db.prepare(`
    SELECT r.id, r.user_id FROM user_records r 
    LEFT JOIN users u ON r.user_id = u.user_id 
    WHERE u.user_id IS NULL
  `).all();
  if (orphanRecords.length === 0) {
    checkPassed('业务记录无孤立用户引用');
  } else {
    checkFailed('孤立业务记录检查', `发现 ${orphanRecords.length} 条引用不存在用户的记录`);
  }

  // ==================== 8. 订单记录完整性 ====================
  log('\n--- 8. 订单记录完整性 ---');

  const orderCount = db.prepare('SELECT COUNT(*) as count FROM user_orders').get();
  log(`  订单记录总数: ${orderCount.count}`);

  const orphanOrders = db.prepare(`
    SELECT o.id, o.user_id FROM user_orders o 
    LEFT JOIN users u ON o.user_id = u.user_id 
    WHERE u.user_id IS NULL
  `).all();
  if (orphanOrders.length === 0) {
    checkPassed('订单记录无孤立用户引用');
  } else {
    checkFailed('孤立订单检查', `发现 ${orphanOrders.length} 条引用不存在用户的订单`);
  }

  // ==================== 9. 评价记录完整性 ====================
  log('\n--- 9. 评价记录完整性 ---');

  const ratingCount = db.prepare('SELECT COUNT(*) as count FROM user_ratings').get();
  log(`  评价记录总数: ${ratingCount.count}`);

  const orphanRatings = db.prepare(`
    SELECT r.id, r.master_id, r.rater_id FROM user_ratings r 
    LEFT JOIN users u1 ON r.master_id = u1.user_id 
    LEFT JOIN users u2 ON r.rater_id = u2.user_id 
    WHERE u1.user_id IS NULL OR u2.user_id IS NULL
  `).all();
  if (orphanRatings.length === 0) {
    checkPassed('评价记录无孤立用户引用');
  } else {
    checkFailed('孤立评价检查', `发现 ${orphanRatings.length} 条引用不存在用户的评价`);
  }

  // ==================== 10. WAL 检查点 ====================
  log('\n--- 10. WAL 检查点 ---');

  const walFile = DB_PATH + '-wal';
  const shmFile = DB_PATH + '-shm';
  const fs2 = require('fs');

  if (fs2.existsSync(walFile)) {
    const walSize = fs2.statSync(walFile).size;
    log(`  WAL 文件大小: ${(walSize / 1024).toFixed(1)} KB`);
    if (walSize > 10 * 1024 * 1024) {
      checkWarning('WAL 文件大小', `WAL 文件过大 (${(walSize / 1024 / 1024).toFixed(1)} MB)，建议执行 checkpoint`);
    } else {
      checkPassed('WAL 文件大小正常');
    }
  } else {
    checkPassed('无 WAL 文件（数据已全部写入主库）');
  }

  // ==================== 输出校验报告 ====================
  db.close();

  log('\n========== 数据库一致性校验报告 ==========');
  log(`检查项目总数: ${totalChecks}`);
  log(`通过: ${passedChecks}`);
  log(`警告: ${warnings.length}`);
  log(`失败: ${errors.length}`);
  log('');

  if (warnings.length > 0) {
    log('--- 警告列表 ---');
    warnings.forEach(w => log(`  [WARN] ${w.name}: ${w.detail}`));
    log('');
  }

  if (errors.length > 0) {
    log('--- 错误列表 ---');
    errors.forEach(e => log(`  [FAIL] ${e.name}: ${e.detail}`));
    log('');
    log('[ALERT] 数据库存在一致性错误，请立即排查！');
    process.exit(1);
  } else if (warnings.length > 0) {
    log('[INFO] 数据库存在警告项，建议关注但非阻断性问题');
    process.exit(0);
  } else {
    log('[OK] 数据库一致性校验全部通过，数据状态正常');
    process.exit(0);
  }
}

main().catch(err => {
  log(`[FATAL] 校验脚本执行异常: ${err.message}`);
  console.error(err);
  process.exit(2);
});
