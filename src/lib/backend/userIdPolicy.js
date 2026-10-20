'use strict';
// Public account numbers are a durable sequence, never SQLite's polluted rowid maximum.
const FOUNDER_USER_ID = 100000;
const LEGACY_LAST_CANONICAL_ID = 100075;
const POLICY_VERSION = 'creator-100000-sequence-v1';

function initializeUserIdPolicy(db) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS account_number_sequence (
      singleton INTEGER PRIMARY KEY CHECK(singleton=1),
      founder_id INTEGER NOT NULL CHECK(founder_id=100000),
      last_issued INTEGER NOT NULL CHECK(last_issued>=100075),
      policy_version TEXT NOT NULL CHECK(policy_version='creator-100000-sequence-v1')
    );
    CREATE TABLE IF NOT EXISTS account_number_reservations (
      user_id INTEGER PRIMARY KEY, origin TEXT NOT NULL CHECK(origin IN ('legacy','sequence'))
    );`);
    let state = db.prepare('SELECT * FROM account_number_sequence WHERE singleton=1').get();
    if (!state) {
      if (!db.prepare('SELECT user_id FROM users WHERE user_id=?').get(FOUNDER_USER_ID)) throw Error('USER_ID_FOUNDER_MISSING');
      // Audited migration: 100000..100075 are the historic ordinary range.
      // 910xxx and 999999xxx are retained legacy identities, not counter seeds.
      const normal = db.prepare('SELECT MAX(user_id) AS last FROM users WHERE user_id>=100000 AND user_id<900000').get();
      if (normal.last !== LEGACY_LAST_CANONICAL_ID) throw Error('USER_ID_BOOTSTRAP_REQUIRES_AUDIT');
      db.prepare('INSERT INTO account_number_sequence VALUES(1,?,?,?)').run(FOUNDER_USER_ID, LEGACY_LAST_CANONICAL_ID, POLICY_VERSION);
      db.exec("INSERT INTO account_number_reservations SELECT user_id,'legacy' FROM users");
      state = db.prepare('SELECT * FROM account_number_sequence WHERE singleton=1').get();
    }
    validateState(state);
    const triggers = {
      account_number_insert_guard: `BEFORE INSERT ON users BEGIN
        SELECT CASE WHEN NEW.user_id != (SELECT last_issued+1 FROM account_number_sequence WHERE singleton=1)
          THEN RAISE(ABORT,'USER_ID_NOT_NEXT_SEQUENCE') END;
        SELECT CASE WHEN EXISTS(SELECT 1 FROM account_number_reservations WHERE user_id=NEW.user_id)
          THEN RAISE(ABORT,'USER_ID_LEGACY_COLLISION') END;
      END`,
      account_number_insert_commit: `AFTER INSERT ON users BEGIN
        INSERT INTO account_number_reservations VALUES(NEW.user_id,'sequence');
        UPDATE account_number_sequence SET last_issued=NEW.user_id WHERE singleton=1;
      END`,
      account_number_immutable: `BEFORE UPDATE OF user_id ON users WHEN NEW.user_id!=OLD.user_id BEGIN
        SELECT RAISE(ABORT,'USER_ID_IMMUTABLE'); END`,
      account_number_counter_guard: `BEFORE UPDATE ON account_number_sequence
        WHEN NEW.singleton!=OLD.singleton OR NEW.founder_id!=OLD.founder_id OR NEW.policy_version!=OLD.policy_version
          OR NEW.last_issued!=OLD.last_issued+1 OR NOT EXISTS(SELECT 1 FROM users WHERE user_id=NEW.last_issued)
        BEGIN SELECT RAISE(ABORT,'USER_ID_COUNTER_IMMUTABLE'); END`,
      account_number_counter_insert_guard: `BEFORE INSERT ON account_number_sequence WHEN EXISTS(SELECT 1 FROM account_number_sequence) BEGIN
        SELECT RAISE(ABORT,'USER_ID_COUNTER_PROTECTED'); END`,
      account_number_counter_delete_guard: `BEFORE DELETE ON account_number_sequence BEGIN
        SELECT RAISE(ABORT,'USER_ID_COUNTER_PROTECTED'); END`,
      account_number_reservation_delete_guard: `BEFORE DELETE ON account_number_reservations BEGIN
        SELECT RAISE(ABORT,'USER_ID_RESERVATION_PROTECTED'); END`,
      account_number_reservation_update_guard: `BEFORE UPDATE ON account_number_reservations BEGIN
        SELECT RAISE(ABORT,'USER_ID_RESERVATION_PROTECTED'); END`,
    };
    for (const [name, definition] of Object.entries(triggers)) {
      const sql = `CREATE TRIGGER ${name} ${definition}`;
      const existing = db.prepare("SELECT sql FROM sqlite_master WHERE type='trigger' AND name=?").get(name);
      if (existing && existing.sql.replace(/\s+/g,' ').trim() !== sql.replace(/\s+/g,' ').trim()) throw Error('USER_ID_TRIGGER_CHANGED');
      if (!existing) db.exec(sql);
    }
    db.exec('COMMIT');
    return {founderId: FOUNDER_USER_ID, lastIssued: state.last_issued, policyVersion: POLICY_VERSION};
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
function validateState(state) {
  if (!state || state.founder_id !== FOUNDER_USER_ID || state.policy_version !== POLICY_VERSION ||
      !Number.isSafeInteger(state.last_issued) || state.last_issued < LEGACY_LAST_CANONICAL_ID) throw Error('USER_ID_POLICY_INVALID');
}
function nextUserId(db) {
  const state = db.prepare('SELECT * FROM account_number_sequence WHERE singleton=1').get();
  validateState(state);
  const next = state.last_issued + 1;
  if (!Number.isSafeInteger(next) || db.prepare('SELECT user_id FROM account_number_reservations WHERE user_id=?').get(next)) throw Error('USER_ID_LEGACY_COLLISION');
  return next;
}
module.exports = {FOUNDER_USER_ID, LEGACY_LAST_CANONICAL_ID, POLICY_VERSION, initializeUserIdPolicy, nextUserId};
