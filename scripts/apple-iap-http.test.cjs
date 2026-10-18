'use strict';
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
async function worker(root) {
  const Database = require('better-sqlite3'), express = require('express'), jwt = require('jsonwebtoken');
  process.env.DB_PATH = path.join(root, 'accounts.db');
  process.env.USER_DB_PATH = path.join(root, 'must-not-create.db');
  process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
  const db = new Database(process.env.DB_PATH);
  db.exec("CREATE TABLE users(user_id INTEGER PRIMARY KEY,nickname TEXT,status TEXT,deleted_at TEXT,member_level TEXT,membership_expiry TEXT); INSERT INTO users VALUES(1,'test','active',NULL,'basic',NULL),(2,'deleted','active','deleted','basic',NULL)");
  const verifier = require('../backend_deploy/appleIapVerifier');
  assert.equal(verifier.ready(), true);
  const app = express(); app.use(express.json({ limit: '50kb' }));
  app.use('/api/apple-iap', require('../backend_deploy/appleIapRoutes').createRouter());
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api/apple-iap`;
  const token = id => jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '5m' });
  async function request(route, method = 'GET', id, body) {
    const r = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(id ? { Authorization: `Bearer ${token(id)}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, body: await r.json() };
  }
  try {
    assert.equal((await request('/context')).status, 401);
    for (const id of [2, 999]) assert.equal((await request('/context', 'GET', id)).status, 403);
    const context = await request('/context', 'GET', 1);
    assert.equal(context.status, 200); assert.equal(context.body.data.products.length, 8);
    assert.equal(context.body.data.sandboxAllowed, false);
    assert.match(context.body.data.appAccountToken, /^[0-9a-f-]{36}$/);
    assert.equal((await request('/context', 'GET', 1)).body.data.appAccountToken, context.body.data.appAccountToken);
    assert.equal((await request('/transactions', 'POST', undefined, { signedTransaction: 'forged' })).status, 401);
    assert.equal((await request('/transactions', 'POST', 1, { signedTransaction: 'forged', userId: 2 })).status, 409);
    // An unsigned payload that claims Production/bundle/user ownership must not
    // reach the entitlement ledger, even with an otherwise valid account JWT.
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const forged = encode({ alg: 'none' }) + '.' + encode({ bundleId: 'com.yandaoguoxue.app', environment: 'Production', productId: context.body.data.products[0].productId, appAccountToken: context.body.data.appAccountToken, transactionId: '100001', quantity: 1, purchaseDate: Date.now() }) + '.fake-signature';
    assert.equal((await request('/transactions', 'POST', 1, { signedTransaction: forged })).status, 409);
    assert.equal((await request('/notifications', 'POST', undefined, { signedPayload: forged })).status, 503);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM apple_iap_transactions').get().n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM paid_ai_credits').get().n, 0);
    assert.equal(db.prepare('SELECT member_level FROM users WHERE user_id=1').get().member_level, 'basic');
    assert.equal(fs.existsSync(process.env.USER_DB_PATH), false);
    console.log('PASS: official Apple SDK and pinned public roots load; real HTTP/JWT ownership; forged transaction/notification cannot grant; no substitute account database.');
  } finally { await new Promise(resolve => server.close(resolve)); db.close(); }
}
if (process.argv[2] === '--worker') worker(process.argv[3]).then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); });
else require('node:test').test('Apple purchase HTTP endpoints reject unsigned claims with the real official signature verifier', () => {
  const tempRoot = fs.realpathSync(os.tmpdir()), root = fs.mkdtempSync(path.join(tempRoot, 'guoxue-apple-http-'));
  try {
    const result = require('node:child_process').spawnSync(process.execPath, [__filename, '--worker', root], { encoding: 'utf8', timeout: 45000, windowsHide: true });
    assert.equal(result.status, 0, (result.stdout || '') + (result.stderr || '') + (result.error?.message || ''));
    console.log(result.stdout.trim());
  } finally { const resolved = fs.realpathSync(root); assert.equal(path.dirname(resolved), tempRoot); assert.ok(path.basename(resolved).startsWith('guoxue-apple-http-')); fs.rmSync(resolved, { recursive: true, force: true }); }
});
