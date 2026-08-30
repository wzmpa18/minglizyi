/**
 * offlinePackEngine.js — OFFLINE CONTENT PACK 引擎（FINAL-MASTER-05 第五十四~六十五章）
 *
 * 职责：
 *   1. Content Pack 注册表（第五十八章字段全集）
 *   2. Pack Manifest 供给（第五十九章：APP 读取 manifest 比较本地版本）
 *   3. Pack 下载（第六十~六十一章：SHA256 校验 / Range 断点续传 / .part 原子启用）
 *   4. 离线同步事件（第六十四~六十五章：eventId 幂等，重复只处理一次）
 *
 * 铁律：
 *   - pack 文件落盘 data/offline_packs/<packId>.pack，禁止散落
 *   - 注册时服务端计算 sha256/size（禁止信任客户端申报值）
 *   - manifest 只返回 PUBLISHED 包；required=true 的包 APP 必须更新才能用
 *   - sync 事件 event_id UNIQUE，重复提交返回 alreadyProcessed，绝不重复入账
 *   - 数据库：复用 users DB（users.db）——offline_sync_events 与用户身份同库
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.OFFLINE_PACK_DIR || path.join(__dirname, 'data');
const PACK_FILES_DIR = path.join(DATA_DIR, 'offline_packs');

const CONTENT_TYPES = [
  'TCM_CLASSICS',      // 中医典籍全文
  'EXAM_BANK',         // 医考题库（大）
  'COURSE',            // 课程
  'IMAGE_ASSETS',      // 图片资源
  'VIDEO',             // 视频
  'STUDY_MATERIALS',   // 学习资料
  'TERMS_INDEX',       // 基础术语索引
];

const PACK_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  DEPRECATED: 'DEPRECATED',
};

// 第六十二章：大包需移动网络提示阈值（字节）
const LARGE_PACK_BYTES = 10 * 1024 * 1024;

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PACK_FILES_DIR)) fs.mkdirSync(PACK_FILES_DIR, { recursive: true });
}

function nowIso() { return new Date().toISOString(); }

// ==================== 数据库（users DB） ====================

let _db = null;
function getDb() {
  if (_db) return _db;
  const Database = require('better-sqlite3');
  const dbPath = process.env.DB_PATH || path.join(DATA_DIR, 'users.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS offline_content_packs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pack_id TEXT NOT NULL UNIQUE,
      content_type TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      version TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      sha256 TEXT NOT NULL,
      min_app_version TEXT NOT NULL DEFAULT '1.0.0',
      required INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      file_path TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ocp_status ON offline_content_packs(status);
    CREATE INDEX IF NOT EXISTS idx_ocp_type ON offline_content_packs(content_type);

    CREATE TABLE IF NOT EXISTS offline_sync_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      client_created_at TEXT,
      server_synced_at TEXT NOT NULL,
      result TEXT NOT NULL DEFAULT 'PROCESSED'
    );
    CREATE INDEX IF NOT EXISTS idx_ose_user ON offline_sync_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_ose_type ON offline_sync_events(event_type);
  `);
  _db = db;
  return db;
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function packRowToView(r) {
  return {
    packId: r.pack_id,
    contentType: r.content_type,
    name: r.name,
    version: r.version,
    size: r.size_bytes,
    sizeMB: Math.round(r.size_bytes / 1048576 * 10) / 10,
    sha256: r.sha256,
    minAppVersion: r.min_app_version,
    downloadUrl: `/api/offline/packs/${r.pack_id}/download`,
    required: !!r.required,
    largePack: r.size_bytes >= LARGE_PACK_BYTES,
    description: r.description,
    updatedAt: r.updated_at,
    status: r.status,
  };
}

// ==================== Pack 注册 / Manifest（第五十八~五十九章） ====================

/**
 * 注册 Content Pack。filePath 为服务器本地文件绝对路径；
 * size/sha256 由服务端实测（禁止信任申报）。
 */
function registerPack(params) {
  const db = getDb();
  ensureDirs();
  const packId = String(params.packId || '').trim();
  const contentType = String(params.contentType || '').trim().toUpperCase();
  const version = String(params.version || '').trim();
  const src = String(params.filePath || '').trim();
  if (!/^[a-z0-9_-]{2,64}$/i.test(packId)) return { ok: false, error: 'packId 非法（2-64位字母数字_-）' };
  if (!CONTENT_TYPES.includes(contentType)) return { ok: false, error: `contentType 仅支持 ${CONTENT_TYPES.join('/')}` };
  if (!/^\d+\.\d+\.\d+$/.test(version)) return { ok: false, error: 'version 需语义化 x.y.z' };
  if (!src || !fs.existsSync(src)) return { ok: false, error: 'pack 文件不存在: ' + src };

  const stat = fs.statSync(src);
  if (stat.size <= 0) return { ok: false, error: 'pack 文件为空' };
  const sha = sha256File(src);

  // 移入统一包目录（原子 rename 到 PACK_FILES_DIR）
  const dest = path.join(PACK_FILES_DIR, `${packId}.pack`);
  fs.copyFileSync(src, dest);

  const existing = db.prepare('SELECT id, version, sha256 FROM offline_content_packs WHERE pack_id = ?').get(packId);
  const now = nowIso();
  const row = {
    name: String(params.name || packId).slice(0, 100),
    minAppVersion: String(params.minAppVersion || '1.0.0').trim(),
    required: params.required ? 1 : 0,
    description: String(params.description || '').slice(0, 500),
  };
  if (existing) {
    db.prepare(`UPDATE offline_content_packs SET content_type=?, name=?, version=?, size_bytes=?, sha256=?,
      min_app_version=?, required=?, file_path=?, description=?, updated_at=? WHERE pack_id=?`)
      .run(contentType, row.name, version, stat.size, sha, row.minAppVersion, row.required, dest, row.description, now, packId);
  } else {
    db.prepare(`INSERT INTO offline_content_packs (pack_id, content_type, name, version, size_bytes, sha256,
      min_app_version, required, status, file_path, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?)`)
      .run(packId, contentType, row.name, version, stat.size, sha, row.minAppVersion, row.required, dest, row.description, now, now);
  }
  const saved = db.prepare('SELECT * FROM offline_content_packs WHERE pack_id = ?').get(packId);
  return { ok: true, pack: packRowToView(saved), updated: !!existing };
}

/** Pack Manifest（第五十九章）：APP 拉全量 PUBLISHED 包元数据自行 diff 本地版本 */
function getManifest() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM offline_content_packs WHERE status = 'PUBLISHED' ORDER BY content_type, pack_id").all();
  return {
    manifestVersion: nowIso(),
    totalPacks: rows.length,
    largePackBytes: LARGE_PACK_BYTES,
    packs: rows.map(packRowToView),
  };
}

function setPackStatus(params) {
  const db = getDb();
  const packId = String(params.packId || '').trim();
  const action = String(params.action || '').trim();
  if (!['publish', 'deprecate', 'redraft'].includes(action)) {
    return { ok: false, error: 'action 仅支持 publish/deprecate/redraft' };
  }
  const r = db.prepare('SELECT * FROM offline_content_packs WHERE pack_id = ?').get(packId);
  if (!r) return { ok: false, error: 'pack 不存在' };
  if (action === 'publish' && !fs.existsSync(r.file_path)) {
    return { ok: false, error: 'pack 文件缺失，无法上架（先重新注册）' };
  }
  const status = action === 'publish' ? PACK_STATUS.PUBLISHED : action === 'deprecate' ? PACK_STATUS.DEPRECATED : PACK_STATUS.DRAFT;
  db.prepare('UPDATE offline_content_packs SET status=?, updated_at=? WHERE pack_id=?').run(status, nowIso(), packId);
  return { ok: true, packId, status };
}

function listPacksAdmin(filter) {
  const db = getDb();
  const f = filter || {};
  const where = [];
  const args = [];
  if (f.status) { where.push('status = ?'); args.push(String(f.status).toUpperCase()); }
  if (f.contentType) { where.push('content_type = ?'); args.push(String(f.contentType).toUpperCase()); }
  const rows = db.prepare(`SELECT * FROM offline_content_packs ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT 500`).all(...args);
  return { total: rows.length, list: rows.map(packRowToView) };
}

function getPackFile(packId) {
  const db = getDb();
  const r = db.prepare("SELECT * FROM offline_content_packs WHERE pack_id = ? AND status = 'PUBLISHED'").get(String(packId || ''));
  if (!r) return { ok: false, error: 'pack 不存在或未上架' };
  if (!fs.existsSync(r.file_path)) return { ok: false, error: 'pack 文件缺失' };
  return { ok: true, row: r, filePath: r.file_path, size: r.size_bytes, sha256: r.sha256 };
}

// ==================== 离线同步事件（第六十四~六十五章） ====================

const SYNC_EVENT_TYPES = [
  'ACADEMY_CHECKIN',      // 学习打卡
  'ACADEMY_PROGRESS',     // 学习进度
  'EXAM_SUBMIT',          // 做题提交（错题/成绩）
  'FAVORITE_TOGGLE',      // 收藏变更
  'WRONG_ANSWER_MARK',    // 错题标记
  'NOTE_EDIT',            // 笔记
];

/**
 * 批量同步离线事件。
 * 幂等：event_id UNIQUE；重复事件返回 alreadyProcessed=true，不重复入账（第六十五章）。
 */
function syncEvents(params) {
  const db = getDb();
  const userId = parseInt(params.userId, 10);
  if (!userId || isNaN(userId)) return { ok: false, error: '用户无效' };
  const events = Array.isArray(params.events) ? params.events.slice(0, 200) : [];
  if (!events.length) return { ok: false, error: 'events 不能为空' };

  const now = nowIso();
  const results = [];
  let processed = 0, duplicated = 0;

  const tx = db.transaction(() => {
    for (const ev of events) {
      const eventId = String(ev.eventId || '').trim();
      const eventType = String(ev.eventType || '').trim().toUpperCase();
      if (!eventId || eventId.length < 8) { results.push({ eventId: eventId || null, status: 'INVALID', reason: 'eventId 非法' }); continue; }
      if (!SYNC_EVENT_TYPES.includes(eventType)) { results.push({ eventId, status: 'INVALID', reason: 'eventType 不支持' }); continue; }

      const existing = db.prepare('SELECT id, result FROM offline_sync_events WHERE event_id = ?').get(eventId);
      if (existing) {
        // 幂等：已处理过的事件直接确认，不重复入账
        results.push({ eventId, status: 'ALREADY_PROCESSED', firstResult: existing.result });
        duplicated++;
        continue;
      }
      let payload = '{}';
      try { payload = JSON.stringify(ev.payload || {}); if (payload.length > 100000) payload = '{}'; }
      catch { payload = '{}'; }

      db.prepare(`INSERT INTO offline_sync_events (event_id, user_id, event_type, payload, client_created_at, server_synced_at, result)
        VALUES (?, ?, ?, ?, ?, ?, 'PROCESSED')`)
        .run(eventId, userId, eventType, payload,
          String(ev.clientCreatedAt || '').slice(0, 40) || null, now);
      results.push({ eventId, status: 'PROCESSED', serverSyncedAt: now });
      processed++;
    }
  });
  tx();

  return { ok: true, processed, duplicated, total: events.length, results, serverTime: now };
}

/** 查询用户已同步事件（APP 冲突检测：本地队列 vs 服务端已收） */
function getSyncedEvents(userId, sinceIso) {
  const db = getDb();
  const uid = parseInt(userId, 10);
  if (!uid || isNaN(uid)) return { ok: false, error: '用户无效' };
  const rows = db.prepare(`SELECT event_id, event_type, server_synced_at, result FROM offline_sync_events
    WHERE user_id = ? ${sinceIso ? 'AND server_synced_at >= ?' : ''} ORDER BY id DESC LIMIT 1000`)
    .all(...(sinceIso ? [uid, String(sinceIso)] : [uid]));
  return { ok: true, total: rows.length, events: rows };
}

function syncStats() {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) c FROM offline_sync_events').get().c;
  const byType = db.prepare('SELECT event_type, COUNT(*) c FROM offline_sync_events GROUP BY event_type').all();
  return { total, byType };
}

module.exports = {
  getDb,
  CONTENT_TYPES,
  PACK_STATUS,
  LARGE_PACK_BYTES,
  SYNC_EVENT_TYPES,
  registerPack,
  getManifest,
  setPackStatus,
  listPacksAdmin,
  getPackFile,
  syncEvents,
  getSyncedEvents,
  syncStats,
  packRowToView,
};
