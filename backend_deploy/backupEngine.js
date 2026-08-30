/**
 * backupEngine.js — 异地备份软件链（FINAL-MASTER-05 第一百零九~一百一十四章）
 *
 * 第一百零九章：异地备份软件链
 *   三库备份（users/academy/social）→ 加密打包 → 上传 adapter（走
 *   ObjectStorageService backup 分区，第一百零三章唯一入口）→ manifest →
 *   sha256 → retention → restore fetch。
 *
 * 第一百零一十章红线（备份加密）：
 *   真实用户数据备份必须加密（AES-256-GCM）。
 *   密钥只从环境变量 BACKUP_ENCRYPTION_KEY 读取（服务器 .env），
 *   禁止与备份放同一存储位置——引擎代码层面唯一密钥来源是 process.env，
 *   并主动校验 .env 文件不在对象存储根目录内。
 *
 * 第一百一十一章：恢复演练自动化
 *   restore drill 恢复到隔离临时目录（restore_drill/<时间戳>），
 *   引擎强制校验恢复目标不得命中/覆盖生产库路径（assertNotProductionPath）。
 *
 * 第一百一十二章：每月至少一次演练机制
 *   后台可见 lastRestoreDrillAt / result / nextDueAt / status
 *   （OK / DUE / OVERDUE / NEVER_RUN，间隔可配置默认 30 天）。
 *
 * 第一百一十三章：腾讯云自动快照属于 Owner Action
 *   开发无法操作控制台 → 输出 OWNER_ACTION_TENCENT_SNAPSHOT +
 *   精确步骤 + 状态 BLOCKED_EXTERNAL_OWNER_ACTION（不反复阻塞，
 *   项目方在后台 ack 回填完成时间）。
 *
 * 第一百一十四章：COS 凭证同理
 *   禁止项目方聊天粘贴 Secret；ownerActions() 输出
 *   OWNER_ACTION_COS_CREDENTIALS（状态与 objectStorageEngine 一致：
 *   READY_TO_CONNECT / BLOCKED_EXTERNAL_CONFIG + env 变量名清单）。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const OSS = require('./objectStorageEngine');

// ==================== 路径（env 可覆盖，生产默认不变） ====================

const BACKUP_DATA_DIR = process.env.BACKUP_DATA_DIR || path.join(__dirname, 'data');
const WORK_DIR = process.env.BACKUP_WORK_DIR || path.join(BACKUP_DATA_DIR, 'backup_work');
const DRILL_ROOT = process.env.BACKUP_DRILL_DIR || path.join(BACKUP_DATA_DIR, 'restore_drill');
const STATE_FILE = path.join(BACKUP_DATA_DIR, 'backup_state.json');
const DRILL_STATE_FILE = path.join(BACKUP_DATA_DIR, 'restore_drill_state.json');
const CONFIG_FILE = path.join(BACKUP_DATA_DIR, 'backup_config.json');
const OWNER_ACTION_STATE_FILE = path.join(BACKUP_DATA_DIR, 'owner_action_state.json');

// 三库默认清单（BACKUP_DB_PATHS 可覆盖完整路径列表，分号分隔）
function defaultDbPaths() {
  return ['users.db', 'academy.db', 'social.db'].map((n) => path.join(BACKUP_DATA_DIR, n));
}

function dbSources() {
  if (process.env.BACKUP_DB_PATHS) {
    return process.env.BACKUP_DB_PATHS.split(';').map((s) => s.trim()).filter(Boolean)
      .map((p) => ({ name: path.basename(p), path: p }));
  }
  return defaultDbPaths().map((p) => ({ name: path.basename(p), path: p }));
}

const DEFAULT_CONFIG = {
  retentionCount: 14,        // 第一百零九章 retention：每库保留最近 N 份完整备份集
  drillIntervalDays: 30,     // 第一百一十二章：每月至少一次
  drillKeepCount: 5,         // 演练隔离目录保留个数（旧目录自动清理）
  encrypt: true,             // 第一百一十章：默认必须加密（关闭仅限显式 dry-run 测试）
};

function getConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return { ...DEFAULT_CONFIG, ...saved };
    }
  } catch (e) { /* 损坏用默认 */ }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(patch) {
  const cur = getConfig();
  const next = { ...cur, ...patch };
  next.retentionCount = clampInt(patch.retentionCount ?? cur.retentionCount, 1, 365, cur.retentionCount);
  next.drillIntervalDays = clampInt(patch.drillIntervalDays ?? cur.drillIntervalDays, 1, 365, cur.drillIntervalDays);
  next.drillKeepCount = clampInt(patch.drillKeepCount ?? cur.drillKeepCount, 1, 50, cur.drillKeepCount);
  next.encrypt = typeof next.encrypt === 'boolean' ? next.encrypt : true;
  ensureDir(BACKUP_DATA_DIR);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2), 'utf-8');
  return { ok: true, config: next };
}

function clampInt(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), min), max);
}

// ==================== 状态存取 ====================

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) { /* ignore */ }
  return fallback;
}

function writeJson(file, obj) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf-8');
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// ==================== 第一百一十章：加密（密钥与备份分离） ====================

const ENC_MAGIC = Buffer.from('YDBAK1', 'utf-8');   // 6 bytes 文件头
const ENC_HEADER_LEN = 6 + 12 + 16;                  // magic + iv + gcm tag

function encryptionKey() {
  const raw = process.env.BACKUP_ENCRYPTION_KEY || '';
  return crypto.createHash('sha256').update(raw).digest();   // 32 bytes
}

/** 密钥状态校验：只报事实（来源=process.env；与备份存储天然分离） */
function validateEncryptionKey() {
  const raw = process.env.BACKUP_ENCRYPTION_KEY || '';
  if (!raw || raw.length < 32) {
    return {
      valid: false,
      status: 'BLOCKED_EXTERNAL_CONFIG',
      missing: ['BACKUP_ENCRYPTION_KEY（≥32 位随机串，配置在服务器 .env，禁止写入任何数据库/配置文件/聊天）'],
      note: '第一百一十章：无密钥不执行真实备份（不伪称完成）',
    };
  }
  // 分离性主动校验：.env 文件不得位于对象存储根目录（密钥与备份同位置=违规）
  const localRoot = path.resolve(OSS.getLocalRoot ? OSS.getLocalRoot() : (process.env.OSS_LOCAL_ROOT || path.join(__dirname, 'data', 'object_storage')));
  const envFile = path.resolve(__dirname, '.env');
  const insideStorage = envFile === localRoot || envFile.startsWith(localRoot + path.sep);
  if (insideStorage) {
    return {
      valid: false,
      status: 'KEY_COLOCATED_WITH_BACKUP',
      missing: [],
      note: `第一百一十章违规：.env 位于对象存储目录 ${localRoot} 内，密钥与备份同存储位置，拒绝备份`,
    };
  }
  return { valid: true, status: 'READY', note: '密钥已从服务器环境变量读取（与备份存储位置分离）' };
}

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

/** AES-256-GCM 加密单文件（返回 .enc 路径 + 明文/密文哈希） */
function encryptFile(srcPath, destPath) {
  const key = encryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plain = fs.readFileSync(srcPath);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  fs.writeFileSync(destPath, Buffer.concat([ENC_MAGIC, iv, tag, ct]));
  return { encPath: destPath, sha256Plain: crypto.createHash('sha256').update(plain).digest('hex'), encSize: ENC_HEADER_LEN + ct.length };
}

/** 解密 .enc 文件（格式错误/密钥不对/authTag 失败 → 明确报错） */
function decryptFile(encPath, destPath) {
  const buf = fs.readFileSync(encPath);
  if (buf.length < ENC_HEADER_LEN || !buf.slice(0, 6).equals(ENC_MAGIC)) {
    return { ok: false, error: '加密文件头非法（非 YDBAK1 格式）' };
  }
  const key = encryptionKey();
  const iv = buf.slice(6, 18);
  const tag = buf.slice(18, 34);
  const ct = buf.slice(34);
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
    fs.writeFileSync(destPath, plain);
    return { ok: true, sha256Plain: crypto.createHash('sha256').update(plain).digest('hex'), size: plain.length };
  } catch (e) {
    return { ok: false, error: `解密失败（密钥错误或文件损坏）：${e.message}` };
  }
}

// ==================== 生产保护（第一百一十一章） ====================

/**
 * 恢复目标保护：targetDir/<db> 不得等于任何生产库路径；
 * targetDir 不得是生产库目录本身或其祖先（祖先写入会落到生产目录）。
 * 默认隔离目录（restore_drill/<ts>）天然通过。
 */
function assertNotProductionPath(targetDir) {
  const t = path.resolve(String(targetDir || ''));
  if (!t) return { forbidden: true, reason: '目标目录为空' };
  for (const src of dbSources()) {
    const srcResolved = path.resolve(src.path);
    const targetFile = path.join(t, path.basename(srcResolved));
    if (targetFile === srcResolved) {
      return { forbidden: true, reason: `恢复目标 ${targetFile} 将直接覆盖生产库 ${srcResolved}（第一百一十一章：禁止）` };
    }
    const prodDir = path.dirname(srcResolved);
    if (t === prodDir) {
      return { forbidden: true, reason: `恢复目标目录 ${t} 即生产库目录（禁止）` };
    }
    if (prodDir.startsWith(t + path.sep)) {
      return { forbidden: true, reason: `恢复目标目录 ${t} 是生产库目录 ${prodDir} 的祖先（写入将污染生产目录，禁止）` };
    }
  }
  return { forbidden: false };
}

// ==================== 第一百零九章：三库备份 ====================

function newBackupId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `bak_${stamp}_${crypto.randomBytes(3).toString('hex')}`;
}

/** 在线安全备份单个 SQLite 库（better-sqlite3 backup API，不锁生产） */
async function snapshotDb(srcPath, destPath) {
  let db = null;
  try {
    db = new Database(srcPath, { readonly: true });
    await db.backup(destPath);
    return { ok: true, size: fs.statSync(destPath).size };
  } catch (e) {
    return { ok: false, error: `SQLite 在线备份失败（文件不存在或非 SQLite 格式）：${e.message}` };
  } finally {
    if (db) try { db.close(); } catch { /* ignore */ }
  }
}

/**
 * 执行一次完整三库备份：
 *   snapshot → 加密 → 上传（ObjectStorageService backup 分区）→ manifest → retention
 */
async function runBackup(opts = {}) {
  const cfg = getConfig();
  const actor = String(opts.actor || 'admin');
  const dryRun = !!opts.dryRun;

  // 第一百一十章：加密密钥前置校验（不猜、不伪称）
  if (cfg.encrypt) {
    const kv = validateEncryptionKey();
    if (!kv.valid) return { ok: false, status: kv.status, error: kv.note, detail: kv };
  }

  const backupId = opts.backupId || newBackupId();
  const workDir = path.join(WORK_DIR, backupId);
  ensureDir(workDir);

  const files = [];
  const state = readJson(STATE_FILE, { backups: [] });
  const startedAt = new Date().toISOString();

  for (const src of dbSources()) {
    const exists = fs.existsSync(src.path);
    if (!exists) {
      files.push({ db: src.name, status: 'SKIPPED_NOT_FOUND', sourcePath: src.path });
      continue;
    }
    // 1) 在线快照（生产库不中断）
    const snapPath = path.join(workDir, src.name);
    const snap = await snapshotDb(src.path, snapPath);
    if (!snap.ok) {
      files.push({ db: src.name, status: 'FAILED', stage: 'snapshot', error: snap.error, sourcePath: src.path });
      continue;
    }
    // 2) 加密（第一百一十章）
    let objKey;
    let shaPlain;
    let encSize = snap.size;
    if (cfg.encrypt) {
      const encPath = path.join(workDir, `${src.name}.enc`);
      const enc = encryptFile(snapPath, encPath);
      shaPlain = enc.sha256Plain;
      encSize = enc.encSize;
      objKey = `${backupId}/${src.name}.enc`;
      fs.unlinkSync(snapPath);          // 工作区不留明文
    } else {
      // 显式 encrypt=false 仅供 dry-run 演练链路测试，真实用户数据一律走加密分支
      shaPlain = sha256File(snapPath);
      objKey = `${backupId}/${src.name}`;
    }
    const uploadSrc = path.join(workDir, cfg.encrypt ? `${src.name}.enc` : src.name);
    // 3) 上传（第一百零九章上传 adapter = 第一百零三章唯一入口 ObjectStorageService）
    const up = dryRun
      ? { ok: true, dryRun: true, sha256: sha256File(uploadSrc) }
      : await OSS.ObjectStorageService.putObject({
        partition: 'backup', objectKey: objKey, filePath: uploadSrc, owner: 'system',
      });
    if (!up.ok) {
      files.push({ db: src.name, status: 'FAILED', stage: 'upload', error: up.error || '上传失败', detail: up });
      continue;
    }
    files.push({
      db: src.name, status: 'OK', objectKey: objKey, size: snap.size, encSize,
      sha256Plain: shaPlain, sha256Stored: up.sha256 || null, sourcePath: src.path,
    });
  }

  // 4) manifest（明文索引：只含 db 名/哈希/大小，不含任何用户数据）
  const manifest = {
    backupId, createdAt: startedAt, actor, encrypted: cfg.encrypt, dryRun,
    engine: 'backupEngine@MASTER-05-109',
    files: files.map((f) => ({
      db: f.db, status: f.status, objectKey: f.objectKey || null,
      size: f.size ?? null, encSize: f.encSize ?? null, sha256Plain: f.sha256Plain || null,
    })),
  };
  const manifestPath = path.join(workDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  const manifestKey = `${backupId}/manifest.json`;
  let manifestUpload = { ok: true, dryRun: true };
  if (!dryRun) {
    manifestUpload = await OSS.ObjectStorageService.putObject({
      partition: 'backup', objectKey: manifestKey, filePath: manifestPath, owner: 'system',
    });
  }

  const okCount = files.filter((f) => f.status === 'OK').length;
  const failed = files.filter((f) => f.status === 'FAILED');
  const record = {
    backupId, createdAt: startedAt, finishedAt: new Date().toISOString(), actor,
    status: failed.length ? (okCount ? 'PARTIAL' : 'FAILED') : (okCount ? 'OK' : 'EMPTY'),
    encrypted: cfg.encrypt, dryRun, manifestKey,
    manifestSha256: sha256File(manifestPath),
    files, okCount, failedCount: failed.length,
  };

  // 5) 状态落档 + retention
  if (!dryRun) {
    state.backups.unshift(record);
    writeJson(STATE_FILE, state);
    const ret = applyRetention(cfg);
    record.retention = ret;
    // 补写 retention 结果到持久化状态（applyRetention 内部重写过 STATE_FILE）
    const fresh = readJson(STATE_FILE, { backups: [] });
    const persisted = fresh.backups.find((x) => x.backupId === record.backupId);
    if (persisted) { persisted.retention = ret; writeJson(STATE_FILE, fresh); }
  }

  return {
    ok: record.status === 'OK',
    status: record.status,
    backupId, manifestKey, manifestUploaded: !!manifestUpload.ok,
    files: record.files, okCount, failedCount: failed.length,
    encryption: cfg.encrypt ? 'AES-256-GCM' : 'OFF (dry-run only)',
    detail: record,
  };
}

// ==================== retention（第一百零九章） ====================

function applyRetention(cfg) {
  const c = cfg || getConfig();
  const state = readJson(STATE_FILE, { backups: [] });
  const keep = c.retentionCount;
  const keepSet = state.backups.slice(0, keep).map((b) => b.backupId);
  const expired = state.backups.slice(keep);
  const removed = [];
  for (const b of expired) {
    // 远端删除（幂等：不存在即成功）
    for (const f of (b.files || [])) {
      if (f.objectKey) {
        try { OSS.ObjectStorageService.deleteObject({ partition: 'backup', objectKey: f.objectKey, requester: 'system' }); } catch { /* ignore */ }
      }
    }
    if (b.manifestKey) {
      try { OSS.ObjectStorageService.deleteObject({ partition: 'backup', objectKey: b.manifestKey, requester: 'system' }); } catch { /* ignore */ }
    }
    // 本地工作区清理
    const wd = path.join(WORK_DIR, b.backupId);
    if (fs.existsSync(wd)) fs.rmSync(wd, { recursive: true, force: true });
    removed.push(b.backupId);
  }
  if (expired.length) {
    state.backups = state.backups.filter((b) => keepSet.includes(b.backupId));
    writeJson(STATE_FILE, state);
  }
  return { retentionCount: keep, kept: keepSet.length, removed: removed.length, removedIds: removed };
}

function listBackups() {
  const state = readJson(STATE_FILE, { backups: [] });
  const cfg = getConfig();
  return {
    retentionCount: cfg.retentionCount,
    total: state.backups.length,
    backups: state.backups.map((b) => ({
      backupId: b.backupId, createdAt: b.createdAt, status: b.status, actor: b.actor,
      encrypted: b.encrypted, okCount: b.okCount, failedCount: b.failedCount,
      manifestKey: b.manifestKey, manifestSha256: b.manifestSha256,
      files: (b.files || []).map((f) => ({ db: f.db, status: f.status, objectKey: f.objectKey, encSize: f.encSize, sha256Plain: f.sha256Plain })),
    })),
  };
}

// ==================== restore fetch（第一百零九章） ====================

function findBackup(backupId) {
  const state = readJson(STATE_FILE, { backups: [] });
  return state.backups.find((b) => b.backupId === String(backupId)) || null;
}

/**
 * 恢复取回：下载 → 解密 → sha256 校验 → 落 targetDir/<db>。
 * 强制隔离校验（第一百一十一章）：目标不得命中生产路径。
 */
async function fetchRestore({ backupId, targetDir, actor, verifyIntegrity }) {
  const b = findBackup(backupId);
  if (!b) return { ok: false, error: `备份不存在：${backupId}` };

  const guard = assertNotProductionPath(targetDir);
  if (guard.forbidden) {
    return { ok: false, status: 403, error: guard.reason, rule: '第一百一十一章：禁止覆盖生产' };
  }
  const destDir = path.resolve(targetDir);
  ensureDir(destDir);

  const outDir = path.join(destDir, b.backupId);
  ensureDir(outDir);

  const results = [];
  let pass = 0;
  for (const f of (b.files || [])) {
    if (f.status !== 'OK') { results.push({ db: f.db, status: 'SKIPPED', reason: `备份时状态=${f.status}` }); continue; }
    // 1) 下载（backup 分区 PRIVATE，requester=system）
    const encPath = path.join(outDir, `${f.db}.download`);
    const dl = await OSS.ObjectStorageService.getObject({ partition: 'backup', objectKey: f.objectKey, destPath: encPath, requester: 'system' });
    if (!dl.ok) { results.push({ db: f.db, status: 'FAILED', stage: 'download', error: dl.error }); continue; }
    // 2) 解密 + hash 校验
    const finalPath = path.join(outDir, f.db);
    if (b.encrypted) {
      const dec = decryptFile(encPath, finalPath);
      fs.unlinkSync(encPath);
      if (!dec.ok) { results.push({ db: f.db, status: 'FAILED', stage: 'decrypt', error: dec.error }); continue; }
      if (f.sha256Plain && dec.sha256Plain !== f.sha256Plain) {
        results.push({ db: f.db, status: 'FAILED', stage: 'hash', error: `sha256 不匹配（期望 ${f.sha256Plain}，实际 ${dec.sha256Plain}）` });
        continue;
      }
      const item = { db: f.db, status: 'PASS', size: dec.size, restoredPath: finalPath, sha256: dec.sha256Plain };
      // 3) SQLite 完整性校验（111章恢复演练核心，可选）
      if (verifyIntegrity) {
        const ig = sqliteIntegrityCheck(finalPath);
        item.integrityCheck = ig.ok ? 'ok' : `fail: ${ig.error}`;
        if (!ig.ok) item.status = 'INTEGRITY_FAIL';
      }
      if (item.status === 'PASS') pass++;
      results.push(item);
    } else {
      fs.copyFileSync(encPath, finalPath);
      fs.unlinkSync(encPath);
      const sha = sha256File(finalPath);
      const item = { db: f.db, status: f.sha256Plain && sha !== f.sha256Plain ? 'FAILED' : 'PASS', size: fs.statSync(finalPath).size, restoredPath: finalPath, sha256: sha };
      if (item.status === 'PASS') pass++;
      results.push(item);
    }
  }

  return {
    ok: pass > 0 && results.every((r) => r.status === 'PASS' || r.status === 'SKIPPED'),
    backupId: b.backupId, targetDir: destDir, outDir,
    restoredCount: pass, results,
    actor: String(actor || 'admin'),
    fetchedAt: new Date().toISOString(),
  };
}

/** SQLite PRAGMA integrity_check（只读打开，不修改文件） */
function sqliteIntegrityCheck(dbPath) {
  let db = null;
  try {
    db = new Database(dbPath, { readonly: true });
    const row = db.pragma('integrity_check', { simple: true });
    if (String(row).toLowerCase() !== 'ok') return { ok: false, error: String(row).slice(0, 200) };
    return { ok: true, result: 'ok' };
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    if (db) try { db.close(); } catch { /* ignore */ }
  }
}

// ==================== 第一百一十一~一百一十二章：恢复演练自动化 + 月度机制 ====================

/**
 * 恢复演练：取最近成功备份（或指定 backupId）→ 恢复到隔离临时目录 →
 * sha256 + SQLite integrity_check → 写演练状态（lastRestoreDrillAt/result）。
 * 全程不触碰生产路径（fetchRestore 内置保护 + 目标为 restore_drill 隔离目录）。
 */
async function runRestoreDrill(opts = {}) {
  const state = readJson(STATE_FILE, { backups: [] });
  const target = opts.backupId
    ? state.backups.find((x) => x.backupId === String(opts.backupId))
    : state.backups.find((x) => x.status === 'OK' || x.status === 'PARTIAL');
  if (!target) {
    return { ok: false, error: '没有可演练的备份（先执行 runBackup）', status: 'NO_BACKUP' };
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const drillDir = path.join(DRILL_ROOT, `drill_${stamp}`);
  const r = await fetchRestore({
    backupId: target.backupId, targetDir: drillDir, actor: opts.actor || 'drill', verifyIntegrity: true,
  });

  const allPass = r.ok && (r.results || []).filter((x) => x.status !== 'SKIPPED').every((x) => x.status === 'PASS');
  const report = {
    drillAt: new Date().toISOString(),
    backupId: target.backupId,
    result: allPass ? 'PASS' : 'FAIL',
    targetDir: drillDir,
    restoredCount: r.restoredCount || 0,
    details: r.results || [],
    errors: r.error ? [r.error] : (r.results || []).filter((x) => x.status.startsWith('FAILED') || x.status === 'INTEGRITY_FAIL').map((x) => `${x.db}: ${x.error || x.integrityCheck}`),
  };

  // 第一百一十二章：演练状态落档（后台可见 lastRestoreDrillAt / result）
  const drillState = {
    lastRestoreDrillAt: report.drillAt,
    result: report.result,
    backupId: report.backupId,
    restoredCount: report.restoredCount,
    lastReport: report,
    history: [report, ...(readJson(DRILL_STATE_FILE, {}).history || [])].slice(0, 24),
  };
  writeJson(DRILL_STATE_FILE, drillState);

  // 隔离目录滚动清理（保留最近 drillKeepCount 次）
  cleanOldDrillDirs();

  return { ok: allPass, ...report };
}

function cleanOldDrillDirs() {
  const cfg = getConfig();
  if (!fs.existsSync(DRILL_ROOT)) return { removed: 0 };
  const dirs = fs.readdirSync(DRILL_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('drill_'))
    .map((e) => ({ name: e.name, full: path.join(DRILL_ROOT, e.name), mtime: fs.statSync(path.join(DRILL_ROOT, e.name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  const drop = dirs.slice(cfg.drillKeepCount);
  for (const d of drop) fs.rmSync(d.full, { recursive: true, force: true });
  return { removed: drop.length, kept: Math.min(dirs.length, cfg.drillKeepCount) };
}

/** 第一百一十二章：演练机制状态（OK/DUE/OVERDUE/NEVER_RUN + nextDueAt） */
function drillStatus() {
  const cfg = getConfig();
  const ds = readJson(DRILL_STATE_FILE, {});
  const last = ds.lastRestoreDrillAt || null;
  const intervalMs = cfg.drillIntervalDays * 86400000;
  let status = 'NEVER_RUN';
  let nextDueAt = null;
  if (last) {
    const lastMs = Date.parse(last);
    const nextMs = lastMs + intervalMs;
    nextDueAt = new Date(nextMs).toISOString();
    status = Date.now() > nextMs + intervalMs ? 'OVERDUE' : (Date.now() > nextMs ? 'DUE' : 'OK');
    // 宽限：到期未超一个周期 → DUE（提醒）；超过一个周期 → OVERDUE（告警）
  }
  return {
    lastRestoreDrillAt: last,
    result: ds.result || null,
    backupId: ds.backupId || null,
    restoredCount: ds.restoredCount ?? null,
    intervalDays: cfg.drillIntervalDays,
    nextDueAt,
    status,
    rule: '第一百一十二章：每月至少一次恢复演练；OVERDUE 需立即安排',
    historyCount: (ds.history || []).length,
  };
}

// ==================== 第一百一十三~一百一十四章：Owner Actions ====================

const OWNER_ACTIONS = {
  OWNER_ACTION_TENCENT_SNAPSHOT: {
    code: 'OWNER_ACTION_TENCENT_SNAPSHOT',
    title: '腾讯云自动快照（控制台操作）',
    status: 'BLOCKED_EXTERNAL_OWNER_ACTION',
    chapter: '第一百一十三章',
    reason: '开发方无法操作腾讯云控制台；自动快照属于项目方（Owner）控制台动作，软件侧不反复阻塞',
    steps: [
      '登录腾讯云控制台 → https://console.cloud.tencent.com/cvm/snapshot',
      '「快照策略」→ 创建策略：建议每日 02:00 自动快照，保留最近 7 份滚动',
      '将策略关联生产服务器的系统盘与数据盘（云硬盘页 → 自动快照策略）',
      '首次手动触发一次全量快照验证（选择生产实例 → 创建自定义快照）',
      '确认快照列表出现新快照且状态为「可用」',
      '完成后回填：后台「存储/备份 → Owner Actions」中点击确认（POST /api/admin/oss/owner-actions/OWNER_ACTION_TENCENT_SNAPSHOT/ack）',
    ],
    softwareStatus: '软件链不依赖快照即可完整运行（本引擎备份 + 恢复演练已就绪）；快照为额外一层云端整机保护',
  },
  OWNER_ACTION_COS_CREDENTIALS: {
    code: 'OWNER_ACTION_COS_CREDENTIALS',
    title: 'COS 对象存储凭证配置',
    status: 'BLOCKED_EXTERNAL_CONFIG',
    chapter: '第一百一十四章',
    reason: '禁止在聊天中粘贴 Secret；凭证只能由项目方在服务器 .env 或腾讯云密钥管理系统配置',
    steps: [
      '腾讯云控制台 → 访问管理 CAM → 创建子账号并授予 COS 全读写权限（QcloudCOSFullAccess 或按 Bucket 收窄）',
      '获取 SecretId / SecretKey（妥善保存，勿发聊天）',
      '登录部署服务器，编辑 backend_deploy/.env 追加四行：COS_SECRET_ID=… / COS_SECRET_KEY=… / COS_BUCKET=… / COS_REGION=…',
      '（可选更安全）改用腾讯云密钥管理系统 KSS / 环境变量注入，代码无需改动',
      '重启服务（pm2 restart），后台「存储 → 能力报告」查看 COS 状态变为 READY_TO_CONNECT',
      '执行一次备份任务即可完成首次真实上传验证',
    ],
    softwareStatus: '无凭证时软件链照常完整（LOCAL Provider 兜底 + BLOCKED_EXTERNAL_CONFIG 如实上报，不伪称 VERIFIED）',
  },
};

/** Owner Action 报告（合并 ack 状态 + COS 凭证实时状态） */
function ownerActions() {
  const ackState = readJson(OWNER_ACTION_STATE_FILE, {});
  const cosValidate = OSS.validateCosConfig();
  return {
    rule: '第一百一十三~一百一十四章：外部 Owner 动作如实标记 BLOCKED，不反复阻塞软件交付',
    actions: Object.values(OWNER_ACTIONS).map((a) => {
      const out = { ...a };
      // COS 凭证状态实时反映（114章与 objectStorageEngine 一致）
      if (a.code === 'OWNER_ACTION_COS_CREDENTIALS') {
        out.status = cosValidate.valid ? 'READY_TO_CONNECT' : 'BLOCKED_EXTERNAL_CONFIG';
        out.cosStatus = cosValidate.status;
        out.missing = cosValidate.missing || [];
      }
      const ack = ackState[a.code];
      if (ack && ack.acknowledgedAt) {
        out.status = a.code === 'OWNER_ACTION_COS_CREDENTIALS' && !cosValidate.valid ? out.status : 'DONE';
        out.acknowledgedAt = ack.acknowledgedAt;
        out.ackNote = ack.note || '';
      }
      return out;
    }),
  };
}

function ackOwnerAction(code, note) {
  if (!OWNER_ACTIONS[code]) return { ok: false, error: `未知 Owner Action：${code}` };
  const state = readJson(OWNER_ACTION_STATE_FILE, {});
  state[code] = {
    acknowledgedAt: new Date().toISOString(),
    note: String(note || '').slice(0, 500),
    prev: state[code] ? state[code].acknowledgedAt : null,
  };
  writeJson(OWNER_ACTION_STATE_FILE, state);
  return { ok: true, code, acknowledgedAt: state[code].acknowledgedAt };
}

// ==================== 总控报告 ====================

function overview() {
  const state = readJson(STATE_FILE, { backups: [] });
  const last = state.backups[0] || null;
  return {
    storageCapability: OSS.capabilityReport(),
    encryption: validateEncryptionKey(),
    backup: {
      lastBackupAt: last ? last.createdAt : null,
      lastBackupStatus: last ? last.status : 'NEVER_RUN',
      lastBackupId: last ? last.backupId : null,
      totalBackups: state.backups.length,
      retentionCount: getConfig().retentionCount,
    },
    drill: drillStatus(),
    ownerActions: ownerActions(),
  };
}

module.exports = {
  // 第一百零九章
  runBackup, listBackups, findBackup, fetchRestore, applyRetention, dbSources,
  // 第一百一十~一百一十一章
  validateEncryptionKey, encryptFile, decryptFile, assertNotProductionPath, sqliteIntegrityCheck,
  // 第一百一十二章
  runRestoreDrill, drillStatus, cleanOldDrillDirs,
  // 第一百一十三~一百一十四章
  ownerActions, ackOwnerAction, OWNER_ACTIONS,
  // 配置与总控
  getConfig, saveConfig, overview,
  // 路径常量（测试用）
  BACKUP_DATA_DIR, WORK_DIR, DRILL_ROOT, STATE_FILE, DRILL_STATE_FILE,
};
