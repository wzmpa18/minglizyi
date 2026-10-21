'use strict';
// Separate append-only journal. Never record bodies, query strings, credentials,
// phone numbers or AI prompts. No automatic deletion: retention >= six months.
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
function createSecurityAudit({ db, now = () => new Date() }) {
  db.exec(`CREATE TABLE IF NOT EXISTS security_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, time TEXT NOT NULL,
    actor TEXT NOT NULL, kind TEXT NOT NULL, method TEXT NOT NULL,
    route TEXT NOT NULL, status INTEGER NOT NULL, ip TEXT NOT NULL, request_id TEXT NOT NULL,
    previous_hash TEXT NOT NULL, event_hash TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS security_events_time ON security_events(time);
    CREATE TRIGGER IF NOT EXISTS security_events_no_update BEFORE UPDATE ON security_events
      BEGIN SELECT RAISE(ABORT,'security audit is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS security_events_no_delete BEFORE DELETE ON security_events
      BEGIN SELECT RAISE(ABORT,'security audit retention forbids deletion'); END;`);
  const append = db.transaction(input => {
    const previous = db.prepare('SELECT event_hash FROM security_events ORDER BY id DESC LIMIT 1').get()?.event_hash || '0'.repeat(64);
    const entry = {
      time: now().toISOString(), actor: String(input.actor || 'anonymous').replace(/[^\w@.-]/g, '').slice(0, 80),
      kind: String(input.kind || 'request').replace(/[^\w.-]/g, '').slice(0, 64),
      method: String(input.method || '').slice(0, 10),
      route: String(input.route || '').split('?')[0].replace(/[^/\w.-]/g, '').slice(0, 240),
      status: Number(input.status) || 0,
      ip: String(input.ip || '').replace(/[^a-fA-F0-9:.]/g, '').slice(0, 64),
      request_id: String(input.requestId || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64),
      previous_hash: previous,
    };
    const hash = crypto.createHash('sha256').update(JSON.stringify(entry)).digest('hex');
    db.prepare('INSERT INTO security_events(time,actor,kind,method,route,status,ip,request_id,previous_hash,event_hash) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(...Object.values(entry), hash);
    return hash;
  });
  return {
    append,
    list({ before = Number.MAX_SAFE_INTEGER, limit = 50 } = {}) {
      return db.prepare('SELECT * FROM security_events WHERE id<? ORDER BY id DESC LIMIT ?').all(Math.max(1, Number(before) || Number.MAX_SAFE_INTEGER), Math.max(1, Math.min(200, Number(limit) || 50)));
    },
    status() {
      return { ...db.prepare('SELECT COUNT(*) AS count, MIN(time) AS firstEventAt, MAX(time) AS lastEventAt FROM security_events').get(), retention: 'no-automatic-deletion', minimumRetentionMonths: 6, historicalBackfill: false };
    },
  };
}
let singleton;
function getSecurityAudit() {
  if (singleton) return singleton;
  const file = process.env.SECURITY_AUDIT_DB || path.join(process.env.ADMIN_DATA_DIR || path.join(__dirname, 'data'), 'security-audit.sqlite');
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const db = new (require('better-sqlite3'))(file);
  fs.chmodSync(file, 0o600);
  db.pragma('journal_mode = WAL'); db.pragma('synchronous = FULL'); db.pragma('busy_timeout = 5000');
  singleton = createSecurityAudit({ db });
  return singleton;
}
module.exports = { createSecurityAudit, getSecurityAudit };
