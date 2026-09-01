// ============================================================================
// 言道国学 - 微信服务号 DB 层（WECHAT-OFFICIAL-ACCOUNT-AI-CONTENT-FINAL-SEAL-10）
// 表寄宿于 academy.db（与 qf_*/org_*/loc_* 业务表同库，不新增第四个数据库文件）
// 全部 CREATE TABLE IF NOT EXISTS 幂等，服务器重启自动恢复
// ============================================================================
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.WECHAT_OA_DATA_DIR || path.join(__dirname, 'data');
const OA_DB_PATH = process.env.WECHAT_OA_DB_PATH || path.join(DATA_DIR, 'academy.db');
// 用户核心库（只读）：选题引擎读 user_records / user_activity_daily 真实需求数据
const AUTH_DB_PATH = process.env.DB_PATH || '/root/backend-auth/data/yandao_users.db';

let oaDb = null;
let authDb = null;

function getDb() {
  if (oaDb) return oaDb;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  oaDb = new Database(OA_DB_PATH);
  oaDb.pragma('journal_mode = WAL');
  oaDb.pragma('busy_timeout = 8000');
  migrate(oaDb);
  return oaDb;
}

// 只读连接用户库（跨库只读，不写入用户核心数据）
function getAuthDb() {
  if (authDb) return authDb;
  if (!fs.existsSync(AUTH_DB_PATH)) return null;
  authDb = new Database(AUTH_DB_PATH, { readonly: true, fileMustExist: true });
  authDb.pragma('busy_timeout = 8000');
  return authDb;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wechat_oa_followers (
      openid TEXT PRIMARY KEY,
      unionid TEXT DEFAULT '',
      subscribe INTEGER DEFAULT 0,
      subscribe_time TEXT DEFAULT '',
      unsubscribe_time TEXT DEFAULT '',
      nickname TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      language TEXT DEFAULT '',
      source_scene TEXT DEFAULT '',
      qr_scene TEXT DEFAULT '',
      user_id INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_woa_follow_sub ON wechat_oa_followers(subscribe, subscribe_time);

    CREATE TABLE IF NOT EXISTS wechat_oa_events (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      openid TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_key TEXT DEFAULT '',
      fingerprint TEXT UNIQUE DEFAULT '',
      received_at TEXT DEFAULT (datetime('now','localtime')),
      processed_at TEXT DEFAULT '',
      status TEXT DEFAULT 'RECEIVED'
    );
    CREATE INDEX IF NOT EXISTS idx_woa_events_time ON wechat_oa_events(received_at);
    CREATE INDEX IF NOT EXISTS idx_woa_events_type ON wechat_oa_events(event_type, received_at);

    CREATE TABLE IF NOT EXISTS wechat_user_binding (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      openid TEXT NOT NULL,
      unionid TEXT DEFAULT '',
      bind_status TEXT DEFAULT 'BOUND',
      bound_at TEXT DEFAULT (datetime('now','localtime')),
      last_seen_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, openid)
    );
    CREATE INDEX IF NOT EXISTS idx_woa_bind_user ON wechat_user_binding(user_id, bind_status);
    CREATE INDEX IF NOT EXISTS idx_woa_bind_openid ON wechat_user_binding(openid, bind_status);

    CREATE TABLE IF NOT EXISTS wechat_topic_candidates (
      topic_id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      cluster TEXT DEFAULT '',
      source TEXT DEFAULT 'INTERNAL',
      source_score REAL DEFAULT 0,
      internal_score REAL DEFAULT 0,
      trend_score REAL DEFAULT NULL,
      content_gap_score REAL DEFAULT 0,
      final_score REAL DEFAULT 0,
      status TEXT DEFAULT 'PENDING',
      pinned INTEGER DEFAULT 0,
      run_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_woa_topic_date ON wechat_topic_candidates(run_date, status);

    CREATE TABLE IF NOT EXISTS wechat_articles (
      article_id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER DEFAULT 0,
      title TEXT NOT NULL,
      digest TEXT DEFAULT '',
      content_html TEXT DEFAULT '',
      cover_media_id TEXT DEFAULT '',
      author TEXT DEFAULT '言道国学',
      source_refs TEXT DEFAULT '[]',
      safety_status TEXT DEFAULT 'PENDING',
      safety_reasons TEXT DEFAULT '[]',
      status TEXT DEFAULT 'LOCAL_DRAFT',
      wechat_media_id TEXT DEFAULT '',
      wechat_draft_id TEXT DEFAULT '',
      ai_model TEXT DEFAULT '',
      word_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_woa_art_status ON wechat_articles(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_woa_art_media ON wechat_articles(wechat_media_id);

    CREATE TABLE IF NOT EXISTS wechat_content_jobs (
      job_id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_date TEXT NOT NULL,
      stage TEXT NOT NULL,
      status TEXT DEFAULT 'RUNNING',
      attempt INTEGER DEFAULT 1,
      started_at TEXT DEFAULT (datetime('now','localtime')),
      finished_at TEXT DEFAULT '',
      error TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_woa_jobs_date ON wechat_content_jobs(run_date, stage);

    CREATE TABLE IF NOT EXISTS wechat_token_cache (
      cache_key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS wechat_oa_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_by TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);
}

function getSetting(key, fallback) {
  const row = getDb().prepare('SELECT value_json FROM wechat_oa_settings WHERE key = ?').get(key);
  if (!row) return fallback;
  try { return JSON.parse(row.value_json); } catch { return fallback; }
}

function setSetting(key, value, updatedBy) {
  getDb().prepare(`INSERT INTO wechat_oa_settings(key, value_json, updated_by, updated_at)
    VALUES(?, ?, ?, datetime('now','localtime'))
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_by = excluded.updated_by, updated_at = excluded.updated_at`)
    .run(key, JSON.stringify(value), updatedBy || 'system');
}

module.exports = { getDb, getAuthDb, getSetting, setSetting, OA_DB_PATH, AUTH_DB_PATH };
