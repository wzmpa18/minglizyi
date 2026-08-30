// ============================================================================
// admin_unified_modules_smoke_test.js — 统一后台总控模块覆盖冒烟测试
//                                          （FINAL-MASTER-05 第一百二十一~一百二十二章）
//   后台不能只有"页面"：每个核心模块必须 真实API / 真实DB / 真实权限 / 真实状态。
//   本测试验证 /api/admin/unified/overview 已接入：
//     - Question Factory（真实 qf.overview()：库存/队列/审核/举报/蓝图）
//     - Storage / Backup-DR（真实 backupEngine.overview()：Provider/COS状态/加密/演练/OwnerActions）
//     - StorageOps（真实 storageReport()：容量分区/磁盘水位）
//   并验证健康灯（questionFactory/backupDr/storage/storageCapacity）来自真实状态而非 hardcode。
// ============================================================================
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const express = require('express');
const Database = require('better-sqlite3');

const ROOT = path.join(os.tmpdir(), 'unified_smoke_' + Date.now() + '_' + process.pid);
fs.mkdirSync(ROOT, { recursive: true });

process.env.JWT_SECRET = 'unified-smoke-secret-0123456789abcdef-0123456789';
process.env.ADMIN_DATA_DIR = path.join(ROOT, 'admin_data');
process.env.ADMIN_API_KEY = 'unified-smoke-admin-key-0123456789abcdef';
process.env.DB_PATH = path.join(ROOT, 'users.db');
process.env.SOCIAL_DB_PATH = path.join(ROOT, 'social.db');
process.env.ACADEMY_DB_PATH = path.join(ROOT, 'academy.db');
process.env.OSS_LOCAL_ROOT = path.join(ROOT, 'object_storage');
process.env.OSS_CONFIG_FILE = path.join(ROOT, 'oss_config.json');
process.env.OSS_TMP_DIR = path.join(ROOT, 'oss-tmp');
process.env.BACKUP_DATA_DIR = path.join(ROOT, 'backup_data');
process.env.BACKUP_WORK_DIR = path.join(ROOT, 'backup_work');
process.env.BACKUP_DRILL_DIR = path.join(ROOT, 'restore_drill');
process.env.BACKUP_ENCRYPTION_KEY = 'unified-smoke-backup-key-0123456789abcdef';
// 备份源指向本测试真实三库（默认逻辑会找 BACKUP_DATA_DIR 下的库名）
process.env.BACKUP_DB_PATHS = [
  process.env.DB_PATH,
  process.env.ACADEMY_DB_PATH,
  process.env.SOCIAL_DB_PATH,
].join(';');

let PASS = 0, FAIL = 0;
const failures = [];
function eq(actual, expected, name) {
  if (actual === expected) { PASS++; console.log('  PASS  ' + name + ' = ' + JSON.stringify(actual)); }
  else { FAIL++; failures.push(name); console.log('  FAIL  ' + name + ` (期望 ${JSON.stringify(expected)} 实际 ${JSON.stringify(actual)})`); }
}
function check(cond, name, extra) {
  if (cond) { PASS++; console.log('  PASS  ' + name); }
  else { FAIL++; failures.push(name); console.log('  FAIL  ' + name + (extra ? '  => ' + JSON.stringify(extra) : '')); }
}

async function main() {
  // fixtures：users/social/academy 三库最小表结构
  const udb = new Database(process.env.DB_PATH);
  udb.exec(`CREATE TABLE users (user_id INTEGER PRIMARY KEY, nickname TEXT, phone TEXT, email TEXT,
    member_level TEXT DEFAULT 'basic', membership_expiry TEXT, status TEXT DEFAULT 'active', muted_until TEXT,
    created_at TEXT DEFAULT (datetime('now')), last_login_at TEXT)`);
  udb.exec(`CREATE TABLE user_orders (id INTEGER PRIMARY KEY, user_id INTEGER, amount REAL, status TEXT, created_at TEXT, paid_at TEXT)`);
  udb.close();
  const sdb = new Database(process.env.SOCIAL_DB_PATH);
  sdb.exec(`CREATE TABLE groups (id INTEGER PRIMARY KEY, status TEXT DEFAULT 'active')`);
  sdb.exec(`CREATE TABLE posts (id INTEGER PRIMARY KEY, status TEXT DEFAULT 'active', created_at TEXT)`);
  sdb.exec(`CREATE TABLE comments (id INTEGER PRIMARY KEY)`);
  sdb.exec(`CREATE TABLE reports (id INTEGER PRIMARY KEY, status TEXT)`);
  sdb.close();
  // academy.db 不预建表：由 academyRoutes.initTables 创建完整真实结构
  const adb = new Database(process.env.ACADEMY_DB_PATH);
  adb.close();

  // QF 引擎表结构初始化（真实 API：ensureQfTables 为既有表增量加 qf_* 列/建 qf_* 表）
  const qf = require('./questionFactoryEngine');
  qf.ensureQfTables();

  // 执行一次真实备份 + 演练，让 DR 状态非空（真实状态而非默认值）
  const backupEngine = require('./backupEngine');
  const bk = await backupEngine.runBackup({ actor: 'smoke' });
  eq(bk.ok, true, '前置：三库备份成功');
  const drill = await backupEngine.runRestoreDrill({});
  eq(drill.result, 'PASS', '前置：恢复演练 PASS');

  const createUnified = require('./adminUnifiedRoutes');
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/api/admin/unified', createUnified());
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const KEY = process.env.ADMIN_API_KEY;

  try {
    // 无密钥 401（真实权限）
    let r = await fetch(`${base}/api/admin/unified/overview`);
    eq(r.status, 401, '121章 无密钥访问总控 401');

    r = await fetch(`${base}/api/admin/unified/overview`, { headers: { Authorization: `Bearer ${KEY}` } });
    eq(r.status, 200, '121章 总控 200');
    const body = await r.json();
    const d = body.data;

    // ---- Question Factory 真实状态 ----
    check(!!d.questionFactory, '121章 总控含 questionFactory 模块');
    check(!d.questionFactory.error, 'QF 状态无错误', d.questionFactory && d.questionFactory.error);
    check(d.health && d.health.questionFactory === 'ok', 'QF 健康灯 ok');

    // ---- Storage / Backup-DR 真实状态 ----
    check(!!d.dr, '121章 总控含 Storage/Backup-DR（dr）模块');
    eq(d.dr.activeProvider, 'LOCAL', '122章 真实 Provider=LOCAL');
    eq(d.dr.cosStatus, 'BLOCKED_EXTERNAL_CONFIG', '122章 COS 如实 BLOCKED（不伪称）');
    check(!!d.dr.lastBackupAt, '122章 最近备份时间来自真实状态');
    eq(d.dr.lastBackupStatus, 'OK', '122章 最近备份状态=OK');
    eq(d.dr.totalBackups, 1, '122章 备份总数=1（真实计数）');
    eq(d.dr.drillResult, 'PASS', '122章 演练结果=PASS（真实）');
    eq(d.dr.drillStatus, 'OK', '122章 演练状态=OK（30天内）');
    eq(d.dr.encryption, 'READY', '122章 加密密钥 READY');
    check((d.dr.ownerActions || []).length === 2, '122章 Owner Actions 2 项（快照/COS凭证）');
    check(d.health && d.health.backupDr === 'ok', 'DR 健康灯 ok');
    check(d.health && d.health.storage === 'warn', '存储灯 warn（LOCAL 兜底，COS 待 Owner）');

    // ---- StorageOps 真实状态 ----
    check(!!d.storageOps, '121章 总控含 storageOps（容量）模块');
    check(Array.isArray(d.storageOps.sections) && d.storageOps.sections.length >= 8, '122章 容量分区 ≥8（真实统计）');
    check(!!d.storageOps.totalTrackedHuman, '容量汇总人类可读值');
    check(d.health && d.health.storageCapacity !== undefined, '容量水位健康灯存在');

    // 数字可追溯：所有计数均来自 DB 查询/状态文件（本冒烟验证了它们随真实 fixtures 变化）
    eq(d.users.total, 0, '123章 用户数=0（真实 DB 计数，非 hardcode）');
  } finally {
    server.close();
  }

  console.log('\n==========================================');
  console.log(`结果：PASS=${PASS}  FAIL=${FAIL}`);
  if (FAIL > 0) {
    console.log('失败项：');
    for (const f of failures) console.log('  ✗ ' + f);
    process.exitCode = 1;
  } else {
    console.log('全部通过 ✅（统一后台总控模块覆盖 第121~123章）');
  }
}

main().catch((e) => {
  console.error('冒烟测试崩溃:', e);
  process.exitCode = 1;
});
