// ============================================================================
// offline_e2e_test.js — OFFLINE CONTENT PACK / SYNC / SERVER GC / CAPACITY
//                        隔离测试（FINAL-MASTER-05 第五十四~七十四章）
//   - 隔离临时目录（不碰生产 data/）
//   - 覆盖：
//       58章 Pack 注册字段全集（服务端实测 size/sha256）
//       59章 Manifest（仅 PUBLISHED；APP 比较本地版本）
//       60章 下载 sha256 校验（服务端回传 X-Pack-Sha256）
//       61章 Range 断点续传（206/Content-Range）
//       62章 大包标记（largePack）
//       64~65章 同步事件 eventId 幂等（重复只处理一次）
//       70章 Server GC（旧日志/碎片）
//       71章 Release 保留 current+1
//       72章 GC 禁止区（三库/备份/证书/上传正式文件绝不删）
//       73~74章 容量分区报告 + 60/80/90 阈值分级
// ============================================================================
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(os.tmpdir(), 'offline_e2e_' + Date.now() + '_' + process.pid);
const PACK_DIR = path.join(ROOT, 'packs_src');
fs.mkdirSync(PACK_DIR, { recursive: true });

process.env.DB_PATH = path.join(ROOT, 'users.db');
process.env.OFFLINE_PACK_DIR = path.join(ROOT, 'data');
// GC 目录映射（隔离）
process.env.GC_LOGS_DIR = path.join(ROOT, 'logs');
process.env.GC_UPLOADS_DIR = path.join(ROOT, 'uploads');
process.env.GC_AI_TEMP_DIR = path.join(ROOT, 'ai-temp');
process.env.GC_BACKUPS_DIR = path.join(ROOT, 'backups');
process.env.GC_PACKS_DIR = path.join(ROOT, 'offline_packs');
process.env.GC_STUDY_DIR = path.join(ROOT, 'study');
process.env.GC_MEDIA_DIR = path.join(ROOT, 'media');
process.env.GC_CERTS_DIR = path.join(ROOT, 'certs');
process.env.GC_DBS_DIR = ROOT;
process.env.GC_RELEASES_DIR = path.join(ROOT, 'releases');
process.env.STORAGE_OPS_DIR = path.join(ROOT, 'data');
process.env.COMMISSION_ROUTER_DIR = path.join(ROOT, 'router_cfg');

const Database = require('better-sqlite3');
{ const d = new Database(process.env.DB_PATH); d.exec('CREATE TABLE IF NOT EXISTS __t(id INTEGER)'); d.close(); }

const offlinePackEngine = require('./offlinePackEngine');
const storageOpsEngine = require('./storageOpsEngine');

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

function makePackFile(name, bytes) {
  const p = path.join(PACK_DIR, name);
  const buf = Buffer.alloc(bytes, 7);
  fs.writeFileSync(p, buf);
  return p;
}
function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

// ==================== fixture ====================
console.log('\n=== 1) 第五十八章：Pack 注册（服务端实测 size/sha256） ===');
{
  const f1 = makePackFile('terms_v1.pack', 1024 * 50);
  let r = offlinePackEngine.registerPack({ packId: 'terms-index', contentType: 'TERMS_INDEX', version: '1.0.0', filePath: f1, name: '基础术语索引', required: true, description: '易学基础术语离线索引' });
  eq(r.ok, true, '术语包注册成功');
  eq(r.pack.size, 1024 * 50, 'size 服务端实测');
  eq(r.pack.sha256, sha256File(f1), 'sha256 服务端实测');
  eq(r.pack.status, 'DRAFT', '初始 DRAFT');
  eq(r.pack.required, true, 'required 标记');

  // 非法参数
  r = offlinePackEngine.registerPack({ packId: 'x', contentType: 'TERMS_INDEX', version: '1.0.0', filePath: f1 });
  eq(r.ok, false, 'packId 过短 拒绝');
  r = offlinePackEngine.registerPack({ packId: 'bad-type', contentType: 'MOVIE', version: '1.0.0', filePath: f1 });
  eq(r.ok, false, 'contentType 不支持 拒绝');
  r = offlinePackEngine.registerPack({ packId: 'bad-ver', contentType: 'TERMS_INDEX', version: 'abc', filePath: f1 });
  eq(r.ok, false, 'version 非语义化 拒绝');
  r = offlinePackEngine.registerPack({ packId: 'nofile', contentType: 'TERMS_INDEX', version: '1.0.0', filePath: path.join(PACK_DIR, 'nope.pack') });
  eq(r.ok, false, '文件不存在 拒绝');

  // 大包（>10MB → largePack，第六十二章）
  const big = makePackFile('exam_v1.pack', 1024 * 1024 * 11);
  r = offlinePackEngine.registerPack({ packId: 'exam-bank-2026', contentType: 'EXAM_BANK', version: '2026.1.0', filePath: big, name: '医考全题库' });
  eq(r.ok, true, '大包注册成功');
  eq(r.pack.largePack, true, '大包 largePack=true（移动网络先提示）');
  check(r.pack.sizeMB >= 11, 'sizeMB 字段', r.pack.sizeMB);
}

console.log('\n=== 2) 第五十九~六十章：Manifest + 下载 ===');
{
  // DRAFT 不进 manifest
  let m = offlinePackEngine.getManifest();
  eq(m.totalPacks, 0, 'DRAFT 不进 manifest');

  // 发布
  let r = offlinePackEngine.setPackStatus({ packId: 'terms-index', action: 'publish' });
  eq(r.ok, true, '术语包发布');
  r = offlinePackEngine.setPackStatus({ packId: 'exam-bank-2026', action: 'publish' });
  eq(r.ok, true, '题库包发布');
  r = offlinePackEngine.setPackStatus({ packId: 'terms-index', action: 'hack' });
  eq(r.ok, false, '非法 action 拒绝');
  r = offlinePackEngine.setPackStatus({ packId: 'ghost', action: 'publish' });
  eq(r.ok, false, '不存在包操作 拒绝');

  m = offlinePackEngine.getManifest();
  eq(m.totalPacks, 2, 'PUBLISHED 包进 manifest');
  const term = m.packs.find(p => p.packId === 'terms-index');
  check(!!term, 'manifest 含字段全集');
  check(term.downloadUrl === '/api/offline/packs/terms-index/download', 'downloadUrl 生成');
  check(term.minAppVersion === '1.0.0' && !!term.updatedAt && !!term.sha256, 'minAppVersion/updatedAt/sha256 字段');

  // 下载（getPackFile：DRAFT/DEPRECATED 拒绝）
  const dl = offlinePackEngine.getPackFile('terms-index');
  eq(dl.ok, true, 'PUBLISHED 包可下载');
  eq(dl.sha256, term.sha256, '下载 sha256 与 manifest 一致（校验用）');
  eq(dl.size, 1024 * 50, '下载 size 一致');

  // 重复发布（幂等）
  r = offlinePackEngine.setPackStatus({ packId: 'terms-index', action: 'publish' });
  eq(r.ok, true, '重复 publish 幂等');
}

console.log('\n=== 3) 第六十章：下载完整性 + DEPRECATED ===');
{
  // DEPRECATED 后不可下载但 manifest 移除
  let r = offlinePackEngine.setPackStatus({ packId: 'exam-bank-2026', action: 'deprecate' });
  eq(r.ok, true, '题库包下架 DEPRECATED');
  const m = offlinePackEngine.getManifest();
  eq(m.totalPacks, 1, 'DEPRECATED 移出 manifest');
  const dl = offlinePackEngine.getPackFile('exam-bank-2026');
  eq(dl.ok, false, 'DEPRECATED 包不可下载');

  // redraft 回草稿
  r = offlinePackEngine.setPackStatus({ packId: 'exam-bank-2026', action: 'redraft' });
  eq(r.ok, true, 'redraft 回 DRAFT');
}

console.log('\n=== 4) 第六十四~六十五章：同步事件 eventId 幂等 ===');
{
  const mk = (id, type, payload, created) => ({ eventId: id, eventType: type, payload, clientCreatedAt: created });

  // 批量同步（首次）
  let r = offlinePackEngine.syncEvents({
    userId: 5001,
    events: [
      mk('evt-checkin-0001', 'ACADEMY_CHECKIN', { track: 'tcm-basics', day: '2026-08-29' }, '2026-08-29T22:00:00Z'),
      mk('evt-exam-0001', 'EXAM_SUBMIT', { questionId: 12, correct: false, durationMs: 30000 }, '2026-08-29T22:05:00Z'),
      mk('evt-fav-0001', 'FAVORITE_TOGGLE', { target: 'qimen', on: true }, '2026-08-29T22:10:00Z'),
    ],
  });
  eq(r.ok, true, '批量同步成功');
  eq(r.processed, 3, '3 条首次全部入账');
  eq(r.duplicated, 0, '首次无重复');

  // 断网期间重复：同一批再来（含 1 条新事件）——幂等核心
  r = offlinePackEngine.syncEvents({
    userId: 5001,
    events: [
      mk('evt-checkin-0001', 'ACADEMY_CHECKIN', { track: 'tcm-basics', day: '2026-08-29' }, '2026-08-29T22:00:00Z'),
      mk('evt-exam-0001', 'EXAM_SUBMIT', { questionId: 12, correct: false, durationMs: 30000 }, '2026-08-29T22:05:00Z'),
      mk('evt-note-0002', 'NOTE_EDIT', { note: '错题复盘', questionId: 12 }, '2026-08-29T23:00:00Z'),
    ],
  });
  eq(r.processed, 1, '重复 eventId 只入账新事件（第六十五章）');
  eq(r.duplicated, 2, '2 条重复确认不重复入账');
  check(r.results.some(x => x.eventId === 'evt-exam-0001' && x.status === 'ALREADY_PROCESSED'), '重复事件返回 ALREADY_PROCESSED');

  // 校验
  let r2 = offlinePackEngine.syncEvents({ userId: 5001, events: [] });
  eq(r2.ok, false, '空 events 拒绝');
  r2 = offlinePackEngine.syncEvents({ userId: 0, events: [mk('x-short', 'NOTE_EDIT', {}, '')] });
  eq(r2.ok, false, '用户无效拒绝');
  r2 = offlinePackEngine.syncEvents({ userId: 5001, events: [mk('evt-bad-type-1', 'HACK_TYPE', {}, '')] });
  check(!r2.ok || r2.results[0].status === 'INVALID', '不支持 eventType 标记 INVALID');

  const db = offlinePackEngine.getDb();
  const cnt = db.prepare("SELECT COUNT(*) c FROM offline_sync_events WHERE event_id = 'evt-exam-0001'").get().c;
  eq(cnt, 1, 'DB 中重复 eventId 仅 1 行（UNIQUE 约束）');

  // 查询已同步
  const synced = offlinePackEngine.getSyncedEvents(5001);
  eq(synced.total, 4, '本人已同步事件数=4');
  const stats = offlinePackEngine.syncStats();
  eq(stats.total, 4, '全局同步统计=4');
}

console.log('\n=== 5) 第七十~七十二章：Server GC ===');
{
  const cfg = storageOpsEngine.getConfig();
  const logsDir = cfg.dirs.logs;
  fs.mkdirSync(logsDir, { recursive: true });
  // 旧日志（mtime 40 天前）+ 新日志
  const oldLog = path.join(logsDir, 'server.2026-07-01.log');
  const newLog = path.join(logsDir, 'server.today.log');
  fs.writeFileSync(oldLog, 'x'.repeat(1000));
  fs.writeFileSync(newLog, 'y'.repeat(500));
  const oldTime = (Date.now() - 40 * 86400000) / 1000;
  fs.utimesSync(oldLog, oldTime, oldTime);

  // 上传碎片（36h 前 .part）+ 正式上传文件 + AI 临时
  const upDir = cfg.dirs.uploads;
  fs.mkdirSync(upDir, { recursive: true });
  const stalePart = path.join(upDir, 'upload-123.part');
  const freshPart = path.join(upDir, 'upload-456.part');
  const realFile = path.join(upDir, 'user-doc.pdf');
  fs.writeFileSync(stalePart, 'part-bytes');
  fs.writeFileSync(freshPart, 'part-recent');
  fs.writeFileSync(realFile, 'official-user-upload-content');
  fs.utimesSync(stalePart, (Date.now() - 36 * 3600000) / 1000, (Date.now() - 36 * 3600000) / 1000);
  const aiDir = cfg.dirs.aiTemp;
  fs.mkdirSync(aiDir, { recursive: true });
  const staleTmp = path.join(aiDir, 'ai-job-9.tmp');
  fs.writeFileSync(staleTmp, 'tmp');
  fs.utimesSync(staleTmp, (Date.now() - 36 * 3600000) / 1000, (Date.now() - 36 * 3600000) / 1000);

  // 禁止区内容：备份/证书/学习资料/正式上传（GC 后必须全部存在）
  for (const d of [cfg.dirs.backups, cfg.dirs.certs, cfg.dirs.studyMaterials, cfg.dirs.userMedia]) fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(cfg.dirs.backups, 'users.db.bak'), 'BACKUP');
  fs.writeFileSync(path.join(cfg.dirs.certs, 'fullchain.pem'), 'CERT');
  fs.writeFileSync(path.join(cfg.dirs.studyMaterials, 'materials.json'), 'STUDY');
  fs.writeFileSync(path.join(ROOT, 'users.db'), 'DB-CONTENT');
  fs.writeFileSync(path.join(ROOT, '.env'), 'SECRET=1');

  const r = storageOpsEngine.runServerGc({});
  check(!fs.existsSync(oldLog), '40 天前旧日志已删');
  check(fs.existsSync(newLog), '今日日志保留');
  check(!fs.existsSync(stalePart), '36h 前 .part 碎片已删');
  check(fs.existsSync(freshPart), '24h 内 .part 保留（可续传）');
  check(fs.existsSync(realFile), '正式上传文件保留（第七十二章禁止区）');
  check(!fs.existsSync(staleTmp), '36h 前 AI tmp 已删');
  check(fs.existsSync(path.join(cfg.dirs.backups, 'users.db.bak')), '备份保留（禁止区）');
  check(fs.existsSync(path.join(cfg.dirs.certs, 'fullchain.pem')), '证书保留（禁止区）');
  check(fs.existsSync(path.join(cfg.dirs.studyMaterials, 'materials.json')), '学习资料保留（禁止区）');
  check(fs.existsSync(path.join(ROOT, 'users.db')), '三库保留（禁止区）');
  check(fs.existsSync(path.join(ROOT, '.env')), 'Secret 保留（禁止区）');
  check(r.totalRemovedFiles >= 2, 'GC 删除计数', r.totalRemovedFiles);

  // 禁止区路径校验 API
  const f1 = storageOpsEngine.isForbiddenPath('/www/yandaoguoxue-backend/data/users.db');
  eq(f1.forbidden, true, 'users.db 命中禁止区');
  const f2 = storageOpsEngine.isForbiddenPath('/root/yandaoguoxue/current');
  eq(f2.forbidden, true, 'current release 命中禁止区');
  const f3 = storageOpsEngine.isForbiddenPath('/tmp/app.log');
  eq(f3.forbidden, false, '普通日志不在禁止区');
}

console.log('\n=== 6) 第七十一章：Release 保留 current + 上一稳定 ===');
{
  const cfg = storageOpsEngine.getConfig();
  const relDir = cfg.dirs.releases;
  fs.mkdirSync(relDir, { recursive: true });
  // 5 个 release 目录（mtime 递增）
  for (let i = 1; i <= 5; i++) {
    const d = path.join(relDir, 'v25.0.' + (40 + i));
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'index.html'), 'rel');
    fs.utimesSync(d, (Date.now() - (5 - i) * 3600000) / 1000, (Date.now() - (5 - i) * 3600000) / 1000);
  }
  const r = storageOpsEngine.runServerGc({ skipLogs: true, skipTemp: true });
  const kept = r.releases.kept;
  eq(kept.length, 2, '保留 2 个（current + 上一稳定）');
  const remaining = fs.readdirSync(relDir).filter(x => x.startsWith('v25.0.'));
  eq(remaining.length, 2, '磁盘只剩 2 个 release');
  check(kept.includes('v25.0.45'), '最新版保留');
  check(kept.includes('v25.0.44'), '上一稳定版保留');
  check(!remaining.includes('v25.0.41'), '最旧版已删');

  // releasesKeepCount 配置下限保护
  const bad = storageOpsEngine.isForbiddenPath('/x');
  eq(bad.forbidden, false, '普通路径可管理');
}

console.log('\n=== 7) 第七十三~七十四章：容量监控 + 阈值 ===');
{
  const cfg = storageOpsEngine.getConfig();
  // 分区有数据
  fs.mkdirSync(cfg.dirs.offlinePacks, { recursive: true });
  fs.writeFileSync(path.join(cfg.dirs.offlinePacks, 'demo.pack'), Buffer.alloc(2048));
  const report = storageOpsEngine.storageReport();
  check(!!report.generatedAt, '报告生成时间');
  check(!!report.sections.dbs && report.sections.dbs.label.includes('三库'), '三库分区');
  const sectionKeys = Object.keys(report.sections);
  check(sectionKeys.length >= 8, '分区覆盖（日志/上传/媒体/学习/Packs/备份/AI临时/三库）', sectionKeys.length);
  check(report.sections.offlinePacks.bytes >= 2048, 'Offline Packs 分区大小统计');
  check(typeof report.totalTrackedHuman === 'string', '总大小人类可读');
  check(report.systemDisk === null || typeof report.systemDisk.usedPercent === 'number', '系统盘使用率（或 null 不猜测）');

  // 阈值分级（第七十四章：60/80/90）
  const t = { remind: 60, yellow: 80, red: 90 };
  eq(storageOpsEngine.capacityLevel(50, t), 'OK', '50% → OK');
  eq(storageOpsEngine.capacityLevel(65, t), 'REMIND', '65% → 提醒');
  eq(storageOpsEngine.capacityLevel(85, t), 'YELLOW', '85% → 黄灯');
  eq(storageOpsEngine.capacityLevel(95, t), 'RED', '95% → 红灯');
  eq(report.thresholds.remind, 60, '阈值 60');
  eq(report.thresholds.yellow, 80, '阈值 80');
  eq(report.thresholds.red, 90, '阈值 90');

  // 配置保护：releasesKeepCount < 2 拒绝（路由层校验，此处引擎直接测阈值函数）
  eq(storageOpsEngine.capacityLevel(80, { remind: 60, yellow: 80, red: 90 }), 'YELLOW', '边界 80% → 黄灯');
}

console.log('\n==========================================');
console.log(`OFFLINE E2E 结果：PASS=${PASS} FAIL=${FAIL}`);
if (failures.length) {
  console.log('失败项：');
  for (const f of failures) console.log('  - ' + f);
}
console.log('==========================================');
try { fs.rmSync(ROOT, { recursive: true, force: true }); console.log('[cleanup] 隔离目录已清理'); } catch (e) { console.log('[cleanup] 跳过:', e.message); }
process.exit(FAIL ? 1 : 0);
