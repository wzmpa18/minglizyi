const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const credits = require('../backend_deploy/paymentAiCredits');
function database(legacy = false) {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE users(user_id INTEGER PRIMARY KEY);INSERT INTO users VALUES(1),(2);
    CREATE TABLE user_entitlements(user_id INTEGER,entitlement_key TEXT,expire_at TEXT);`);
  if (legacy) db.exec(`CREATE TABLE paid_ai_credits(source_order_no TEXT PRIMARY KEY,user_id INTEGER NOT NULL,remaining INTEGER NOT NULL DEFAULT 1,created_at TEXT DEFAULT CURRENT_TIMESTAMP);INSERT INTO paid_ai_credits(source_order_no,user_id,remaining) VALUES('legacy',1,1);`);
  // Adapt Node's built-in SQLite transaction API to the production driver's API.
  db.transaction = fn => ({ immediate() { db.exec('BEGIN IMMEDIATE'); try { const result=fn();db.exec('COMMIT');return result; } catch(error) {db.exec('ROLLBACK');throw error;} } });
  return db;
}
test('legacy single credits migrate without losing balances; package grants are owned and idempotent', () => {
  const db = database(true);
  try {
    assert.equal(credits.status(db,1).credits,1);
    credits.grant(db,1,'pack',10);credits.grant(db,1,'pack',10);
    assert.equal(credits.status(db,1).credits,11);
    assert.throws(()=>credits.grant(db,2,'pack',10));
    assert.throws(()=>credits.grant(db,1,'pack',500));
    assert.throws(()=>credits.grant(db,1,'invalid',-1));
    assert.equal(credits.status(db,2).credits,0);
  } finally { db.close(); }
});
test('expired balances and refunded/spent credits cannot be resurrected by replaying a grant', () => {
  const db = database();
  try {
    credits.grant(db,1,'expired',20,'2020-01-01T00:00:00Z');
    credits.grant(db,1,'refunded',10);
    db.prepare("UPDATE paid_ai_credits SET remaining=0 WHERE source_order_no='refunded'").run();
    credits.grant(db,1,'refunded',10);
    assert.equal(credits.status(db,1).credits,0);assert.equal(credits.consume(db,1),false);
    assert.throws(()=>credits.grant(db,1,'bad-time',1,'not-a-date'));
  } finally { db.close(); }
});
test('expiring credits are consumed first and the balance never goes negative', () => {
  const db = database();
  try {
    credits.grant(db,1,'permanent',1);
    credits.grant(db,1,'later',10,new Date(Date.now()+30*86400000).toISOString());
    credits.grant(db,1,'soon',3,new Date(Date.now()+86400000).toISOString());
    assert.equal(credits.status(db,1).credits,14);
    for(let i=0;i<3;i++)assert.equal(credits.consume(db,1),true);
    assert.equal(db.prepare("SELECT remaining FROM paid_ai_credits WHERE source_order_no='soon'").get().remaining,0);
    assert.equal(db.prepare("SELECT remaining FROM paid_ai_credits WHERE source_order_no='permanent'").get().remaining,1);
    for(let i=0;i<11;i++)assert.equal(credits.consume(db,1),true);
    assert.equal(credits.consume(db,1),false);assert.equal(credits.status(db,1).credits,0);
  } finally { db.close(); }
});
