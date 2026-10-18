'use strict';
const levels = ['basic', 'monthly', 'quarterly', 'yearly', 'lifetime'];
const initialized = new WeakSet();
const normalize = level => level === 'premium' ? 'monthly' : levels.includes(level) ? level : 'basic';
function ensure(db) {
  if (initialized.has(db)) return;
  db.exec(`CREATE TABLE IF NOT EXISTS membership_baselines (
    user_id TEXT PRIMARY KEY, level TEXT NOT NULL, expires_at TEXT,
    captured_at INTEGER NOT NULL, reset_at INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS membership_purchase_grants (
    source TEXT PRIMARY KEY, user_id TEXT NOT NULL, provider TEXT NOT NULL,
    level TEXT NOT NULL, days INTEGER NOT NULL, purchased_at INTEGER NOT NULL,
    revoked_at INTEGER, created_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS membership_grants_user ON membership_purchase_grants(user_id,purchased_at);`);
  initialized.add(db);
}
const atomic = (db, fn) => db.inTransaction ? fn() : db.transaction(fn).immediate();
function capture(db, userId, now) {
  const user = db.prepare('SELECT user_id,member_level,membership_expiry FROM users WHERE user_id=?').get(userId);
  if (!user) throw Error('会员账号不存在');
  const level = normalize(user.member_level), expires = user.membership_expiry || null;
  if (expires && !Number.isFinite(Date.parse(expires))) throw Error('原会员有效期需人工核查');
  db.prepare('INSERT OR IGNORE INTO membership_baselines(user_id,level,expires_at,captured_at) VALUES(?,?,?,?)').run(String(userId), level, expires, now);
}
function calculate(baseline, grants, now) {
  let level = 'basic', end = 0;
  const applyGrant = grant => {
    if (grant.revoked_at != null || grant.purchased_at <= baseline.reset_at) return;
    if (end <= grant.purchased_at) { level = 'basic'; end = grant.purchased_at; }
    // A lower-tier renewal never downgrades an active higher-tier membership.
    if (levels.indexOf(grant.level) > levels.indexOf(level)) level = grant.level;
    if (grant.level === 'lifetime' || end === Infinity) end = Infinity;
    else end = Math.max(end, grant.purchased_at) + grant.days * 86400000;
  };
  // Restore history predating this ledger must first age on its own timeline.
  // Otherwise an expired 2024 time card would extend a valid 2026 Android plan.
  const capturedAt = baseline.captured_at;
  for (const grant of grants) if (grant.purchased_at < capturedAt) applyGrant(grant);
  const baseLevel = normalize(baseline.level);
  const baseEnd = baseLevel === 'basic' ? 0 : baseLevel === 'lifetime' || !baseline.expires_at ? Infinity : Date.parse(baseline.expires_at);
  if (end <= capturedAt) { level = 'basic'; end = capturedAt; }
  if (baseEnd > capturedAt) {
    if (levels.indexOf(baseLevel) > levels.indexOf(level)) level = baseLevel;
    end = end === Infinity || baseEnd === Infinity ? Infinity : end + baseEnd - capturedAt;
  }
  for (const grant of grants) if (grant.purchased_at >= capturedAt) applyGrant(grant);
  if (end <= now) return { level: 'basic', expiresAt: null };
  return { level, expiresAt: end === Infinity ? null : new Date(end).toISOString() };
}
function project(db, userId, now) {
  const baseline = db.prepare('SELECT * FROM membership_baselines WHERE user_id=?').get(String(userId));
  const grants = db.prepare('SELECT * FROM membership_purchase_grants WHERE user_id=? ORDER BY purchased_at,source').all(String(userId));
  const state = calculate(baseline, grants, now);
  if (db.prepare('UPDATE users SET member_level=?,membership_expiry=? WHERE user_id=?').run(state.level, state.expiresAt, userId).changes !== 1) throw Error('会员账号不存在');
  // Some deployments do not have this optional materialized assets table.
  const columns = db.prepare('PRAGMA table_info(user_assets)').all().map(row => row.name);
  if (['user_id', 'member_level', 'member_expire_at'].every(name => columns.includes(name))) db.prepare('UPDATE user_assets SET member_level=?,member_expire_at=? WHERE user_id=?').run(state.level, state.expiresAt, userId);
  return state;
}
function purchase(db, grant, now = Date.now()) {
  ensure(db);
  const { source, userId, provider, level, days, purchasedAt } = grant;
  if (typeof source !== 'string' || !source || source.length > 200 || typeof provider !== 'string' || !provider || !levels.includes(level) || level === 'basic' || !Number.isSafeInteger(purchasedAt) || purchasedAt <= 0 || purchasedAt > now + 60000 || (level === 'lifetime' ? days !== -1 : !Number.isSafeInteger(days) || days < 1 || days > 36500)) throw Error('会员购买快照无效');
  return atomic(db, () => {
    capture(db, userId, now);
    const existing = db.prepare('SELECT * FROM membership_purchase_grants WHERE source=?').get(source);
    if (existing && (existing.user_id !== String(userId) || existing.provider !== provider || existing.level !== level || existing.days !== days)) throw Error('会员订单归属或快照冲突');
    db.prepare('INSERT OR IGNORE INTO membership_purchase_grants(source,user_id,provider,level,days,purchased_at,created_at) VALUES(?,?,?,?,?,?,?)').run(source, String(userId), provider, level, days, purchasedAt, now);
    return project(db, userId, now);
  });
}
function revoke(db, source, now = Date.now()) {
  ensure(db);
  return atomic(db, () => {
    const row = db.prepare('SELECT * FROM membership_purchase_grants WHERE source=?').get(source);
    if (!row) return { found: false }; // Never guess which legacy entitlement to subtract.
    db.prepare('UPDATE membership_purchase_grants SET revoked_at=COALESCE(revoked_at,?) WHERE source=?').run(now, source);
    return { found: true, ...project(db, row.user_id, now) };
  });
}
function adminReset(db, userId, level, expiresAt, now = Date.now()) {
  ensure(db);
  if (!levels.includes(level) || expiresAt != null && !Number.isFinite(Date.parse(expiresAt))) throw Error('会员调整无效');
  return atomic(db, () => {
    capture(db, userId, now);
    // Explicit administrator adjustments supersede preceding grants. Replaying
    // an old App Store receipt cannot undo a documented account-level decision.
    db.prepare('UPDATE membership_baselines SET level=?,expires_at=?,reset_at=? WHERE user_id=?').run(level, expiresAt || null, now, String(userId));
    return project(db, userId, now);
  });
}
module.exports = { ensure, purchase, revoke, adminReset, calculate };
