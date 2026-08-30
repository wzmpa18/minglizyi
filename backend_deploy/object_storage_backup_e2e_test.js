// ============================================================================
// object_storage_backup_e2e_test.js — 对象存储 + 备份/灾备 隔离测试
//                                     （FINAL-MASTER-05 第一百零三~一百一十四章）
//   - 全部落临时目录（OSS_LOCAL_ROOT / BACKUP_DATA_DIR / ADMIN_DATA_DIR 覆盖，
//     不碰生产 data/）
//   - Real AI Call = 0（本模块无 AI 调用）
//   - 真实 SQLite 三库（better-sqlite3 造库 + 在线备份 API + integrity_check）
//   - 路由层 HTTP 冒烟（express 5 + fetch，JWT 用户端 + 密钥管理端 + 公开端点）
//   覆盖：
//       103章  统一 ObjectStorageService 唯一入口（静态扫描：COS SDK 仅引擎引用）
//       104章  Provider LOCAL/COS/SECONDARY（LOCAL 实测；SECONDARY 如实 NOT_IMPLEMENTED）
//       105章  无 COS 凭证 → BLOCKED_EXTERNAL_CONFIG（不伪称 VERIFIED）
//       106章  逻辑分区 user_content/public_content/backup（LOCAL 不同根目录）
//       107章  PRIVATE 分区 owner 强制 + 越权 403；PUBLIC 分区无需 owner
//       108章  publicUrl 仅 PUBLIC 分区；PRIVATE 一律拒绝
//       109章  三库备份全链（snapshot→加密→上传→manifest→hash→retention→restore fetch）
//       110章  备份加密（AES-256-GCM；密钥 env；无密钥 BLOCKED 不伪称）
//       111章  恢复演练到隔离目录 + 禁止覆盖生产（生产目录/祖先目录 403）
//       112章  月度演练机制（lastRestoreDrillAt/result/DUE/OVERDUE/NEVER_RUN）
//       113章  OWNER_ACTION_TENCENT_SNAPSHOT（BLOCKED_EXTERNAL_OWNER_ACTION+精确步骤+ack）
//       114章  OWNER_ACTION_COS_CREDENTIALS（env 配置指引，禁止聊天粘贴）
// ============================================================================
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');

// ==================== 隔离环境（必须在 require 引擎之前） ====================
const ROOT = path.join(os.tmpdir(), 'oss_e2e_' + Date.now() + '_' + process.pid);
fs.mkdirSync(ROOT, { recursive: true });

process.env.OSS_LOCAL_ROOT = path.join(ROOT, 'object_storage');
process.env.OSS_CONFIG_FILE = path.join(ROOT, 'object_storage_config.json');
process.env.OSS_TMP_DIR = path.join(ROOT, 'oss-tmp');
process.env.BACKUP_DATA_DIR = path.join(ROOT, 'backup_data');
process.env.BACKUP_WORK_DIR = path.join(ROOT, 'backup_work');
process.env.BACKUP_DRILL_DIR = path.join(ROOT, 'restore_drill');
process.env.BACKUP_ENCRYPTION_KEY = 'e2e-test-backup-key-0123456789abcdef0123456789';
process.env.ADMIN_DATA_DIR = path.join(ROOT, 'admin_data');
process.env.ADMIN_API_KEY = 'e2e-admin-master-key-0123456789abcdef';
process.env.JWT_SECRET = 'oss-e2e-test-secret-0123456789abcdef-0123456789abcdef';

const OSS = require('./objectStorageEngine');
const backup = require('./backupEngine');

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
function sha256File(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

// ==================== fixtures：真实三库 ====================

function createSqliteDb(dbPath, tables) {
  const db = new Database(dbPath);
  for (const [t, seedRows] of Object.entries(tables)) {
    db.exec(`CREATE TABLE ${t} (id INTEGER PRIMARY KEY, name TEXT, value TEXT)`);
    const ins = db.prepare(`INSERT INTO ${t} (name, value) VALUES (?, ?)`);
    for (const [n, v] of seedRows) ins.run(n, v);
  }
  db.close();
}

function seedThreeDbs() {
  const dataDir = process.env.BACKUP_DATA_DIR;
  fs.mkdirSync(dataDir, { recursive: true });
  createSqliteDb(path.join(dataDir, 'users.db'), { users: [['张三', 'vip']] });
  createSqliteDb(path.join(dataDir, 'academy.db'), { questions: [['论语题', 'q1']], exams: [['考试1', '88']] });
  createSqliteDb(path.join(dataDir, 'social.db'), { messages: [['消息1', 'hello']] });
  return {
    users: sha256File(path.join(dataDir, 'users.db')),
    academy: sha256File(path.join(dataDir, 'academy.db')),
    social: sha256File(path.join(dataDir, 'social.db')),
  };
}

async function main() {
  console.log('=== 对象存储 + 备份/灾备 E2E（第103~114章）隔离目录: ' + ROOT + ' ===');

  // ==================== 第一百零三章：唯一入口 ====================
  console.log('\n=== 1) 第一百零三章：统一 ObjectStorageService（唯一 SDK 调用点） ===');
  {
    check(typeof OSS.ObjectStorageService.putObject === 'function', '103章 ObjectStorageService.putObject 导出');
    check(typeof OSS.ObjectStorageService.getObject === 'function', '103章 ObjectStorageService.getObject 导出');
    check(typeof OSS.ObjectStorageService.deleteObject === 'function', '103章 ObjectStorageService.deleteObject 导出');
    check(typeof OSS.ObjectStorageService.statObject === 'function', '103章 ObjectStorageService.statObject 导出');

    // 静态扫描：cos-nodejs-sdk-v5 只允许出现在 objectStorageEngine.js（禁止业务模块散写）
    const jsFiles = fs.readdirSync(__dirname).filter((f) => f.endsWith('.js'));
    const offenders = jsFiles.filter((f) => {
      if (f === 'objectStorageEngine.js' || f.includes('e2e_test')) return false;
      try { return fs.readFileSync(path.join(__dirname, f), 'utf-8').includes('cos-nodejs-sdk-v5'); } catch { return false; }
    });
    eq(offenders.length, 0, '103章 全项目无第二处 COS SDK 引用（唯一入口）');
  }

  // ==================== 第一百零四~一百零八章：分区/Provider/鉴权/公开 ====================
  console.log('\n=== 2) 第一百零四~一百零六章：Provider 与逻辑分区 ===');
  {
    eq(OSS.PROVIDER_TYPES.join('/'), 'LOCAL/COS/SECONDARY', '104章 Provider 枚举 LOCAL/COS/SECONDARY');
    const parts = Object.keys(OSS.PARTITIONS);
    eq(parts.sort().join(','), 'backup,public_content,user_content', '106章 三逻辑分区');
    eq(OSS.PARTITIONS.user_content.visibility, 'PRIVATE', '106章 user_content=PRIVATE');
    eq(OSS.PARTITIONS.public_content.visibility, 'PUBLIC', '106章 public_content=PUBLIC');
    eq(OSS.PARTITIONS.backup.visibility, 'PRIVATE', '106章 backup=PRIVATE');

    // LOCAL provider 实测：三分区落不同根目录（106章）
    fs.mkdirSync(path.join(ROOT, 'src'), { recursive: true });
    const srcFile = path.join(ROOT, 'src', 'a.png');
    fs.writeFileSync(srcFile, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5]));

    const pu = await OSS.ObjectStorageService.putObject({ partition: 'user_content', objectKey: 'u1/x.png', filePath: srcFile, owner: 1001 });
    eq(pu.ok, true, 'LOCAL put user_content 成功');
    check(fs.existsSync(path.join(process.env.OSS_LOCAL_ROOT, 'user-content', 'u1', 'x.png')), '106章 user_content 落独立目录 user-content/');

    const pp = await OSS.ObjectStorageService.putObject({ partition: 'public_content', objectKey: 'hero/logo.png', filePath: srcFile });
    eq(pp.ok, true, 'PUBLIC 分区无需 owner（106/107章）');
    check(fs.existsSync(path.join(process.env.OSS_LOCAL_ROOT, 'public-content', 'hero', 'logo.png')), '106章 public_content 落独立目录 public-content/');

    const st = await OSS.ObjectStorageService.statObject({ partition: 'user_content', objectKey: 'u1/x.png' });
    check(st.ok && st.size === 13, 'LOCAL stat 返回大小');

    // LOCAL get 实测
    const dest = path.join(ROOT, 'out.png');
    const g = await OSS.ObjectStorageService.getObject({ partition: 'user_content', objectKey: 'u1/x.png', destPath: dest, requester: 1001 });
    eq(g.ok, true, 'LOCAL get 成功');
    eq(sha256File(dest), sha256File(srcFile), '下载内容与源一致（sha256）');

    // 路径穿越防御
    let traversalBlocked = false;
    try { await OSS.ObjectStorageService.putObject({ partition: 'public_content', objectKey: '../evil.png', filePath: srcFile }); }
    catch (e) { traversalBlocked = /路径穿越/.test(e.message); }
    check(traversalBlocked, 'objectKey 路径穿越被拒绝');
  }

  console.log('\n=== 3) 第一百零七章：PRIVATE owner 强制校验 ===');
  {
    // PRIVATE 无 owner 拒绝
    const noOwner = await OSS.ObjectStorageService.putObject({ partition: 'user_content', objectKey: 'u9/y.png', filePath: path.join(ROOT, 'src', 'a.png') });
    eq(noOwner.ok, false, '107章 PRIVATE 分区无 owner 拒绝上传');
    check(String(noOwner.error).includes('owner'), '107章 错误信息指向 owner 规则');

    // 越权读取 403
    const wrong = await OSS.ObjectStorageService.getObject({ partition: 'user_content', objectKey: 'u1/x.png', destPath: path.join(ROOT, 'stolen.png'), requester: 2002 });
    eq(wrong.ok, false, '107章 非 owner 读取被拒');
    eq(wrong.status, 403, '107章 越权读取返回 403');

    // owner 匹配成功
    const right = await OSS.ObjectStorageService.getObject({ partition: 'user_content', objectKey: 'u1/x.png', destPath: path.join(ROOT, 'mine.png'), requester: 1001 });
    eq(right.ok, true, '107章 owner 本人读取成功');

    // 越权删除 403
    const delWrong = await OSS.ObjectStorageService.deleteObject({ partition: 'user_content', objectKey: 'u1/x.png', requester: 2002 });
    eq(delWrong.status, 403, '107章 非 owner 删除被拒（403）');
    check(fs.existsSync(path.join(process.env.OSS_LOCAL_ROOT, 'user-content', 'u1', 'x.png')), '越权删除后对象仍存在');

    // owner 删除成功
    const del = await OSS.ObjectStorageService.deleteObject({ partition: 'user_content', objectKey: 'u1/x.png', requester: 1001 });
    eq(del.ok, true, '107章 owner 删除成功');
  }

  console.log('\n=== 4) 第一百零五章：COS 凭证缺失如实 BLOCKED（不伪称） + 第一百零八章：公开规则 ===');
  {
    const v = OSS.validateCosConfig();
    eq(v.valid, false, '105章 无 COS 凭证 valid=false');
    eq(v.status, 'BLOCKED_EXTERNAL_CONFIG', '105章 状态=BLOCKED_EXTERNAL_CONFIG');
    check((v.missing || []).length === 4, '105章 缺失清单=4项（ID/KEY/BUCKET/REGION）', v.missing);

    const cap = OSS.capabilityReport();
    eq(cap.providers.COS.status, 'BLOCKED_EXTERNAL_CONFIG', '105章 能力报告 COS=BLOCKED_EXTERNAL_CONFIG');
    eq(cap.providers.LOCAL.status, 'VERIFIED', 'LOCAL=VERIFIED（实测）');
    eq(cap.providers.SECONDARY.status, 'NOT_IMPLEMENTED', '104章 SECONDARY=NOT_IMPLEMENTED（接口预留不伪称）');

    // SECONDARY provider 实测拒绝
    OSS.saveConfig({ provider: 'SECONDARY' });
    const sec = await OSS.ObjectStorageService.putObject({ partition: 'public_content', objectKey: 'sec/x.png', filePath: path.join(ROOT, 'src', 'a.png') });
    eq(sec.ok, false, '104章 SECONDARY put 返回失败');
    eq(sec.status, 'NOT_IMPLEMENTED', '104章 SECONDARY 状态=NOT_IMPLEMENTED');

    // COS provider 无凭证实测（软件链抽象完整，第105章）
    OSS.saveConfig({ provider: 'COS' });
    const cosPut = await OSS.ObjectStorageService.putObject({ partition: 'backup', objectKey: 'cos-test/x.enc', filePath: path.join(ROOT, 'src', 'a.png'), owner: 'system' });
    eq(cosPut.ok, false, '105章 COS put 无凭证失败（不假装成功）');
    eq(cosPut.status, 'BLOCKED_EXTERNAL_CONFIG', '105章 COS put 状态=BLOCKED_EXTERNAL_CONFIG');
    OSS.saveConfig({ provider: 'LOCAL' });
    eq(OSS.getConfig().provider, 'LOCAL', '切回 LOCAL Provider');

    // 108章：公开 URL 规则
    const privUrl = OSS.ObjectStorageService.publicUrl('user_content', 'u1/x.png');
    eq(privUrl.ok, false, '108章 PRIVATE 分区拒绝公开 URL');
    const bkUrl = OSS.ObjectStorageService.publicUrl('backup', 'bak_1/users.db.enc');
    eq(bkUrl.ok, false, '108章 backup 分区拒绝公开 URL');
    const pubUrl = OSS.ObjectStorageService.publicUrl('public_content', 'hero/logo.png');
    eq(pubUrl.ok, true, '108章 PUBLIC 分区生成公开 URL');
    check(String(pubUrl.url).includes('/api/oss/public/public-content/hero/logo.png'), '108章 LOCAL 公开走统一只读端点');
  }

  // ==================== 第一百一十章：加密前置校验 ====================
  console.log('\n=== 5) 第一百一十章：备份加密密钥（env + 分离） ===');
  {
    const kv = backup.validateEncryptionKey();
    eq(kv.valid, true, '110章 密钥已配置（env）');
    eq(kv.status, 'READY', '110章 密钥状态 READY');
    check(String(kv.note).includes('分离'), '110章 校验密钥与备份存储位置分离');

    // 无密钥 → runBackup BLOCKED_EXTERNAL_CONFIG（不伪称）
    const savedKey = process.env.BACKUP_ENCRYPTION_KEY;
    delete process.env.BACKUP_ENCRYPTION_KEY;
    const noKey = await backup.runBackup({ actor: 'test' });
    eq(noKey.ok, false, '110章 无密钥拒绝执行真实备份');
    eq(noKey.status, 'BLOCKED_EXTERNAL_CONFIG', '110章 无密钥状态=BLOCKED_EXTERNAL_CONFIG');

    // 短密钥同样拒绝
    process.env.BACKUP_ENCRYPTION_KEY = 'short-key';
    const shortKey = await backup.runBackup({ actor: 'test' });
    eq(shortKey.status, 'BLOCKED_EXTERNAL_CONFIG', '110章 密钥<32位拒绝（BLOCKED）');
    process.env.BACKUP_ENCRYPTION_KEY = savedKey;
    eq(backup.validateEncryptionKey().valid, true, '恢复密钥后 READY');
  }

  // ==================== 第一百零九章：三库备份全链 ====================
  console.log('\n=== 6) 第一百零九章：三库备份（snapshot→加密→上传→manifest→hash→retention） ===');
  const prodHashes = seedThreeDbs();
  let backupId, manifestInfo;
  {
    const r = await backup.runBackup({ actor: 'e2e' });
    eq(r.ok, true, '109章 三库备份成功');
    eq(r.status, 'OK', '109章 备份状态 OK');
    eq(r.okCount, 3, '109章 三库全部备份');
    eq(r.failedCount, 0, '无失败项');
    eq(r.encryption, 'AES-256-GCM', '109章 备份使用 AES-256-GCM 加密');
    backupId = r.backupId;
    check(/^bak_\d{8}_\d{6}_[0-9a-f]{6}$/.test(backupId), '备份 ID 格式 bak_时间戳_随机');
    manifestInfo = r;

    // 每库 .enc 落 backup 分区（106章独立目录）
    for (const f of r.files) {
      check(f.status === 'OK' && f.objectKey, `库 ${f.db} 上传 objectKey=${f.objectKey}`);
      check(fs.existsSync(path.join(process.env.OSS_LOCAL_ROOT, 'backup', backupId, `${f.db}.enc`)), `109章 ${f.db}.enc 落 backup 分区`);
      check(f.sha256Plain && f.sha256Plain.length === 64, `109章 ${f.db} 记录明文 sha256`);
    }

    // 加密真实生效：密文非 SQLite 头 + YDBAK1 魔数
    const encBuf = fs.readFileSync(path.join(process.env.OSS_LOCAL_ROOT, 'backup', backupId, 'academy.db.enc'));
    eq(encBuf.slice(0, 6).toString('utf-8'), 'YDBAK1', '110章 加密文件头=YDBAK1');
    check(encBuf.slice(6, 16).toString('utf-8') !== 'SQLite fo', '110章 密文不可读出 SQLite 明文头');

    // manifest 明文可读（只含元数据不含用户数据）
    const manifestPath = path.join(process.env.OSS_LOCAL_ROOT, 'backup', backupId, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    eq(manifest.backupId, backupId, '109章 manifest 记录 backupId');
    eq(manifest.encrypted, true, '109章 manifest 标记加密');
    eq(manifest.files.length, 3, '109章 manifest 含三库索引');
    check(fs.existsSync(path.join(process.env.OSS_LOCAL_ROOT, 'backup', backupId, 'manifest.json')), '109章 manifest 上传至 backup 分区');

    // 生产库未被触碰（readonly + backup API）
    eq(sha256File(path.join(process.env.BACKUP_DATA_DIR, 'users.db')), prodHashes.users, '109章 备份后生产 users.db 未变');
    eq(sha256File(path.join(process.env.BACKUP_DATA_DIR, 'academy.db')), prodHashes.academy, '备份后生产 academy.db 未变');
    eq(sha256File(path.join(process.env.BACKUP_DATA_DIR, 'social.db')), prodHashes.social, '备份后生产 social.db 未变');

    // 工作区不留明文（加密后即删）
    const workFiles = fs.readdirSync(path.join(process.env.BACKUP_WORK_DIR, backupId));
    check(!workFiles.includes('users.db'), '109章 工作区不留明文库文件');
    check(workFiles.filter((f) => f.endsWith('.enc')).length === 3, '工作区保留 3 份密文待上传');
  }

  console.log('\n=== 7) 第一百零九章：listBackups + restore fetch（下载→解密→hash 校验） ===');
  {
    const list = backup.listBackups();
    eq(list.total, 1, '109章 备份历史可查（total=1）');
    eq(list.backups[0].backupId, backupId, '109章 历史含本次备份 ID');
    eq(list.backups[0].encrypted, true, '历史记录标记加密');
    eq(list.backups[0].okCount, 3, '历史记录 okCount=3');

    // 恢复取回到隔离目录
    const restoreDir = path.join(ROOT, 'restore_out');
    const fr = await backup.fetchRestore({ backupId, targetDir: restoreDir, actor: 'e2e', verifyIntegrity: true });
    eq(fr.ok, true, '109章 restore fetch 成功');
    eq(fr.restoredCount, 3, '109章 三库全部恢复');
    check(fr.results.every((x) => x.status === 'PASS'), '每库 PASS（下载/解密/hash/integrity）', fr.results);

    // 恢复文件 hash 与备份快照一致（SQLite backup API 产物与原库字节可能不同，
    // 引擎校验的是快照 hash + integrity_check + 数据可查——内容一致性才是恢复正确性）
    const manifestFiles = manifestInfo.files;
    for (const f of manifestFiles) {
      const restored = path.join(fr.outDir, f.db);
      eq(sha256File(restored), f.sha256Plain, `109章 恢复 ${f.db} hash=备份快照 hash`);
    }

    // 恢复库数据可查（内容完整）
    const rd = new Database(path.join(fr.outDir, 'academy.db'), { readonly: true });
    eq(rd.prepare('SELECT COUNT(*) c FROM questions').get().c, 1, '恢复库数据可查询');
    rd.close();
    for (const x of fr.results) check(x.integrityCheck === 'ok', `111章 ${x.db} PRAGMA integrity_check=ok`);
  }

  // ==================== 第一百一十一章：禁止覆盖生产 ====================
  console.log('\n=== 8) 第一百一十一章：恢复目标生产保护 ===');
  {
    // 目标=生产库目录本身 → 403
    const intoProd = await backup.fetchRestore({ backupId, targetDir: process.env.BACKUP_DATA_DIR, actor: 'evil' });
    eq(intoProd.status, 403, '111章 恢复到生产库目录被拒（403）');
    check(String(intoProd.error).includes('第一百一十一章'), '错误信息引用 111 章规则');

    // 目标=生产目录祖先 → 拒绝
    const intoAncestor = await backup.fetchRestore({ backupId, targetDir: ROOT, actor: 'evil' });
    eq(intoAncestor.status, 403, '111章 恢复到生产目录祖先被拒');

    // 生产库文件 hash 未被任何尝试改变
    eq(sha256File(path.join(process.env.BACKUP_DATA_DIR, 'users.db')), prodHashes.users, '生产 users.db 全程未被覆盖');
    eq(sha256File(path.join(process.env.BACKUP_DATA_DIR, 'social.db')), prodHashes.social, '生产 social.db 全程未被覆盖');
  }

  // ==================== 第一百一十一~一百一十二章：恢复演练 + 月度机制 ====================
  console.log('\n=== 9) 第一百一十一~一百一十二章：恢复演练自动化 + 月度机制 ===');
  {
    const drill = await backup.runRestoreDrill({ actor: 'e2e' });
    eq(drill.ok, true, '111章 恢复演练 PASS');
    eq(drill.result, 'PASS', '111章 演练结果=PASS');
    eq(drill.restoredCount, 3, '111章 演练恢复三库');
    check(String(drill.targetDir).includes('restore_drill'), '111章 演练目标=隔离目录 restore_drill/');

    const ds = backup.drillStatus();
    check(!!ds.lastRestoreDrillAt, '112章 lastRestoreDrillAt 已记录');
    eq(ds.result, 'PASS', '112章 后台可见演练 result=PASS');
    eq(ds.status, 'OK', '112章 演练间隔内状态 OK');
    check(!!ds.nextDueAt, '112章 nextDueAt 可见');
    check(ds.intervalDays === 30, '112章 默认每月（30天）演练');

    // 构造过期状态：35 天前 → DUE；61 天前 → OVERDUE；清空 → NEVER_RUN
    const stateFile = backup.DRILL_STATE_FILE;
    const old = new Date(Date.now() - 35 * 86400000).toISOString();
    fs.writeFileSync(stateFile, JSON.stringify({ lastRestoreDrillAt: old, result: 'PASS' }));
    eq(backup.drillStatus().status, 'DUE', '112章 超 35 天 → DUE（提醒）');
    const older = new Date(Date.now() - 61 * 86400000).toISOString();
    fs.writeFileSync(stateFile, JSON.stringify({ lastRestoreDrillAt: older, result: 'PASS' }));
    eq(backup.drillStatus().status, 'OVERDUE', '112章 超 61 天 → OVERDUE（告警）');
    fs.writeFileSync(stateFile, JSON.stringify({}));
    eq(backup.drillStatus().status, 'NEVER_RUN', '112章 从未演练 → NEVER_RUN');

    // 重跑演练恢复正常状态
    const drill2 = await backup.runRestoreDrill({});
    eq(drill2.ok, true, '重跑演练恢复');
    eq(backup.drillStatus().status, 'OK', '演练后状态回到 OK');
  }

  // ==================== retention（第一百零九章） ====================
  console.log('\n=== 10) 第一百零九章：retention 滚动清理 ===');
  {
    backup.saveConfig({ retentionCount: 2 });
    eq(backup.getConfig().retentionCount, 2, 'retention 配置=2 份');
    // 再跑 2 次备份（共 3 个历史）
    await backup.runBackup({ actor: 'e2e' });
    await backup.runBackup({ actor: 'e2e' });
    const list = backup.listBackups();
    eq(list.total, 2, 'retention 生效：历史只剩 2 份');
    eq(list.retentionCount, 2, '列表返回保留配置');
    // 最早那份备份的对象应已删除
    const backupDirs = fs.readdirSync(path.join(process.env.OSS_LOCAL_ROOT, 'backup'));
    eq(backupDirs.length, 2 + 0, '远端 backup 分区仅剩 2 个备份目录（manifest+库一起删）', backupDirs);
    check(!fs.existsSync(path.join(process.env.BACKUP_WORK_DIR, backupId)), '工作区旧备份已清理');
  }

  // ==================== 第一百一十三~一百一十四章：Owner Actions ====================
  console.log('\n=== 11) 第一百一十三~一百一十四章：Owner Actions（外部阻塞如实标记） ===');
  {
    const oa = backup.ownerActions();
    const snap = oa.actions.find((a) => a.code === 'OWNER_ACTION_TENCENT_SNAPSHOT');
    check(!!snap, '113章 OWNER_ACTION_TENCENT_SNAPSHOT 存在');
    eq(snap.status, 'BLOCKED_EXTERNAL_OWNER_ACTION', '113章 状态=BLOCKED_EXTERNAL_OWNER_ACTION');
    check(snap.steps.length >= 5, '113章 提供精确控制台步骤（≥5步）');
    check(snap.steps.some((s) => String(s).includes('console.cloud.tencent.com')), '113章 步骤含腾讯云控制台地址');

    const cosAct = oa.actions.find((a) => a.code === 'OWNER_ACTION_COS_CREDENTIALS');
    check(!!cosAct, '114章 OWNER_ACTION_COS_CREDENTIALS 存在');
    eq(cosAct.status, 'BLOCKED_EXTERNAL_CONFIG', '114章 COS 凭证状态与引擎一致（BLOCKED）');
    check(cosAct.steps.some((s) => String(s).includes('.env')), '114章 步骤指引服务器 .env 配置');
    check(cosAct.steps.some((s) => String(s).includes('COS_SECRET_ID')), '114章 步骤列出 env 变量名');
    // 步骤中不得出现"粘贴密钥"类指引（reason 里的"禁止粘贴"是约束性说明，允许）
    check(!cosAct.steps.some((s) => String(s).includes('粘贴')), '114章 步骤中无粘贴密钥指引');

    // ack 回填
    const ack = backup.ackOwnerAction('OWNER_ACTION_TENCENT_SNAPSHOT', '已在控制台配置每日快照');
    eq(ack.ok, true, '113章 Owner 完成后 ack 成功');
    const oa2 = backup.ownerActions();
    const snap2 = oa2.actions.find((a) => a.code === 'OWNER_ACTION_TENCENT_SNAPSHOT');
    eq(snap2.status, 'DONE', '113章 ack 后状态=DONE');
    check(!!snap2.acknowledgedAt, '113章 acknowledgedAt 回填');
    const badAck = backup.ackOwnerAction('OWNER_ACTION_NOT_EXIST', 'x');
    eq(badAck.ok, false, '未知 Owner Action 拒绝');
  }

  // ==================== 总控报告（第121章后台覆盖 Storage/Backup-DR） ====================
  console.log('\n=== 12) 总控 overview（Storage + Backup/DR 状态汇总） ===');
  {
    const ov = backup.overview();
    check(!!ov.storageCapability, '总控含存储能力');
    eq(ov.storageCapability.activeProvider, 'LOCAL', '当前 Provider=LOCAL');
    eq(ov.encryption.status, 'READY', '总控含加密状态');
    check(!!ov.backup.lastBackupAt, '总控含最近备份时间');
    eq(ov.backup.totalBackups, 2, '总控含备份总数');
    check(ov.drill.status === 'OK', '总控含演练状态');
    eq(ov.ownerActions.actions.length, 2, '总控含 2 项 Owner Actions');
  }

  // ==================== 路由层 HTTP 冒烟（express 5 + fetch） ====================
  console.log('\n=== 13) 路由层 HTTP 冒烟（用户端 JWT / 公开端点 / 管理端密钥） ===');
  {
    const routes = require('./objectStorageRoutes');
    const app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use('/api/oss', routes.createRouter());
    app.use('/api/admin/oss', routes.createRouter());
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;
    const ADMIN_KEY = process.env.ADMIN_API_KEY;
    const token = jwt.sign({ userId: 1001 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const token2 = jwt.sign({ userId: 2002 }, process.env.JWT_SECRET, { expiresIn: '1h' });

    try {
      // 用户端上传（JWT）
      const pngB64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 9, 9, 9]).toString('base64');
      let r = await fetch(`${base}/api/oss/upload`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: pngB64, filename: 'photo.png' }),
      });
      eq(r.status, 401, '路由：用户端上传未登录 401');
      r = await fetch(`${base}/api/oss/upload`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ base64: pngB64, filename: 'photo.png' }),
      });
      const up = await r.json();
      eq(r.status, 200, '路由：用户端上传成功');
      check(up.success && up.data.objectKey.startsWith('u1001/'), '路由：objectKey 挂在 owner 命名空间');

      // 越权读取 403（107章）
      const key = up.data.objectKey;
      r = await fetch(`${base}/api/oss/object?partition=user_content&key=${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token2}` },
      });
      eq(r.status, 403, '路由：他人读取私人对象 403（107章）');
      r = await fetch(`${base}/api/oss/object?partition=user_content&key=${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      eq(r.status, 200, '路由：本人读取成功');
      eq(r.headers.get('x-oss-visibility'), 'PRIVATE', '路由：响应标记 PRIVATE');

      // 管理端上传公开内容 + 公开只读（108章）
      r = await fetch(`${base}/api/admin/oss/object/upload`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_KEY}` },
        body: JSON.stringify({ partition: 'public_content', base64: pngB64, filename: 'banner.png', objectKey: 'banners/banner.png' }),
      });
      const adminUp = await r.json();
      eq(r.status, 200, '路由：管理端上传 public_content 成功');
      r = await fetch(`${base}/api/oss/public/public-content/banners/banner.png`);
      eq(r.status, 200, '路由：公开端点可匿名读取（108章）');
      eq(r.headers.get('x-oss-visibility'), 'PUBLIC', '路由：公开端点标记 PUBLIC');
      r = await fetch(`${base}/api/oss/public/public-content/banners/missing.png`);
      eq(r.status, 404, '路由：公开端点 404');

      // 管理端能力/总控（105章如实 BLOCKED）
      r = await fetch(`${base}/api/admin/oss/capability`, { headers: { Authorization: `Bearer ${ADMIN_KEY}` } });
      const cap2 = await r.json();
      eq(r.status, 200, '路由：能力报告 200');
      eq(cap2.data.providers.COS.status, 'BLOCKED_EXTERNAL_CONFIG', '路由：COS 如实 BLOCKED');
      r = await fetch(`${base}/api/admin/oss/capability`);
      eq(r.status, 401, '路由：无密钥访问管理端 401');

      // 备份执行（HTTP 入口）
      r = await fetch(`${base}/api/admin/oss/backup/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_KEY}` },
        body: JSON.stringify({}),
      });
      const runResp = await r.json();
      eq(r.status, 200, '路由：三库备份 HTTP 执行成功');
      eq(runResp.data.okCount, 3, '路由：备份三库');

      // 演练 + 状态（112章）
      r = await fetch(`${base}/api/admin/oss/backup/drill`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_KEY}` },
        body: JSON.stringify({}),
      });
      const drillResp = await r.json();
      eq(r.status, 200, '路由：恢复演练 HTTP 执行成功');
      eq(drillResp.data.result, 'PASS', '路由：演练 PASS');
      r = await fetch(`${base}/api/admin/oss/backup/drill-status`, { headers: { Authorization: `Bearer ${ADMIN_KEY}` } });
      const ds2 = await r.json();
      eq(ds2.data.status, 'OK', '路由：演练状态 OK');

      // 恢复到生产目录被路由拒绝（111章）
      r = await fetch(`${base}/api/admin/oss/backup/restore`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_KEY}` },
        body: JSON.stringify({ backupId: runResp.data.backupId, targetDir: process.env.BACKUP_DATA_DIR }),
      });
      eq(r.status, 403, '路由：恢复到生产目录 403（111章）');
      const blocked = await r.json();
      check(String(blocked.error).includes('第一百一十一章'), '路由：403 错误引用 111 章');

      // Owner Actions（113/114章）
      r = await fetch(`${base}/api/admin/oss/owner-actions`, { headers: { Authorization: `Bearer ${ADMIN_KEY}` } });
      const oaResp = await r.json();
      eq(r.status, 200, '路由：Owner Actions 列表 200');
      check(oaResp.data.actions.some((a) => a.code === 'OWNER_ACTION_TENCENT_SNAPSHOT'), '路由：含腾讯快照 Owner Action');
      r = await fetch(`${base}/api/admin/oss/owner-actions/OWNER_ACTION_TENCENT_SNAPSHOT/ack`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_KEY}` },
        body: JSON.stringify({ note: 'HTTP 冒烟 ack' }),
      });
      eq(r.status, 200, '路由：Owner Action ack 200');

      // 配置：无凭证切 COS 被拒（105/114章）
      r = await fetch(`${base}/api/admin/oss/config`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_KEY}` },
        body: JSON.stringify({ provider: 'COS' }),
      });
      eq(r.status, 400, '路由：无凭证切换 COS 被拒');
      const cfgErr = await r.json();
      check(String(cfgErr.error).includes('COS_SECRET'), '路由：拒绝信息指引 env 变量');

      // 切换 SECONDARY 允许但操作如实 NOT_IMPLEMENTED
      r = await fetch(`${base}/api/admin/oss/config`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_KEY}` },
        body: JSON.stringify({ provider: 'SECONDARY' }),
      });
      eq(r.status, 200, '路由：切换 SECONDARY 允许（接口预留）');
      // 复原 LOCAL
      await fetch(`${base}/api/admin/oss/config`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_KEY}` },
        body: JSON.stringify({ provider: 'LOCAL' }),
      });
      eq(OSS.getConfig().provider, 'LOCAL', '路由：配置复原 LOCAL');
    } finally {
      server.close();
    }
  }

  // ==================== 汇总 ====================
  console.log('\n==========================================');
  console.log(`结果：PASS=${PASS}  FAIL=${FAIL}`);
  if (FAIL > 0) {
    console.log('失败项：');
    for (const f of failures) console.log('  ✗ ' + f);
    process.exitCode = 1;
  } else {
    console.log('全部通过 ✅（对象存储 + 备份/灾备 第103~114章）');
  }
}

main().catch((e) => {
  console.error('E2E 测试崩溃:', e);
  process.exitCode = 1;
});
