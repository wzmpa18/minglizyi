'use strict';
const initialized = new WeakSet();
function ensure(db) {
  if (initialized.has(db)) return;
  db.exec(`CREATE TABLE IF NOT EXISTS paid_ai_credits (
    source_order_no TEXT PRIMARY KEY, user_id INTEGER NOT NULL,
    remaining INTEGER NOT NULL DEFAULT 1 CHECK(remaining >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(user_id))`);
  const columns = db.prepare('PRAGMA table_info(paid_ai_credits)').all().map(row => row.name);
  if (!columns.includes('purchased')) db.exec('ALTER TABLE paid_ai_credits ADD COLUMN purchased INTEGER NOT NULL DEFAULT 1');
  if (!columns.includes('expires_at')) db.exec('ALTER TABLE paid_ai_credits ADD COLUMN expires_at TEXT');
  initialized.add(db);
}
function grant(db, userId, orderNo, count = 1, expiresAt = null) {
  if (!Number.isSafeInteger(count) || count < 1 || count > 1000000) throw Error('AI购买数量无效');
  if (expiresAt != null && (typeof expiresAt !== 'string' || !Number.isFinite(Date.parse(expiresAt)))) throw Error('AI购买有效期无效');
  expiresAt = expiresAt == null ? null : new Date(expiresAt).toISOString();
  ensure(db);
  db.prepare('INSERT OR IGNORE INTO paid_ai_credits(source_order_no,user_id,remaining,purchased,expires_at) VALUES (?,?,?,?,?)').run(orderNo,userId,count,count,expiresAt);
  const row=db.prepare('SELECT user_id,purchased,expires_at FROM paid_ai_credits WHERE source_order_no=?').get(orderNo);
  if(!row || String(row.user_id)!==String(userId) || row.purchased!==count || row.expires_at!==expiresAt) throw Error('AI购买权益归属或快照冲突');
}
function status(db,userId) {
  ensure(db);
  const credits=db.prepare('SELECT COALESCE(SUM(remaining),0) AS n FROM paid_ai_credits WHERE user_id=? AND (expires_at IS NULL OR expires_at>?)').get(userId,new Date().toISOString()).n;
  const plans=db.prepare("SELECT entitlement_key FROM user_entitlements WHERE user_id=? AND entitlement_key IN ('ai_plan_daily','ai_plan_monthly','ai_plan_quarterly','ai_plan_yearly') AND expire_at IS NOT NULL AND expire_at>?").all(userId,new Date().toISOString());
  return {credits,activePlan:plans.length>0};
}
function consume(db,userId) {
  ensure(db);
  return db.transaction(()=>{
    const row=db.prepare('SELECT source_order_no FROM paid_ai_credits WHERE user_id=? AND remaining>0 AND (expires_at IS NULL OR expires_at>?) ORDER BY expires_at IS NULL,expires_at,created_at,source_order_no LIMIT 1').get(userId,new Date().toISOString());
    if(!row)return false;
    return db.prepare('UPDATE paid_ai_credits SET remaining=remaining-1 WHERE source_order_no=? AND remaining>0').run(row.source_order_no).changes===1;
  }).immediate();
}
module.exports={ensure,grant,status,consume};
