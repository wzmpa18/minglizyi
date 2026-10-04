'use strict';
function ensure(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS paid_ai_credits (
    source_order_no TEXT PRIMARY KEY, user_id INTEGER NOT NULL,
    remaining INTEGER NOT NULL DEFAULT 1 CHECK(remaining >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(user_id))`);
}
function grant(db, userId, orderNo) {
  ensure(db);
  db.prepare('INSERT OR IGNORE INTO paid_ai_credits(source_order_no,user_id,remaining) VALUES (?,?,1)').run(orderNo,userId);
  const row=db.prepare('SELECT user_id FROM paid_ai_credits WHERE source_order_no=?').get(orderNo);
  if(!row || String(row.user_id)!==String(userId)) throw Error('AI购买权益归属冲突');
}
function status(db,userId) {
  ensure(db);
  const credits=db.prepare('SELECT COALESCE(SUM(remaining),0) AS n FROM paid_ai_credits WHERE user_id=?').get(userId).n;
  const plans=db.prepare("SELECT entitlement_key FROM user_entitlements WHERE user_id=? AND entitlement_key IN ('ai_plan_daily','ai_plan_monthly','ai_plan_quarterly','ai_plan_yearly') AND expire_at IS NOT NULL AND expire_at>?").all(userId,new Date().toISOString());
  return {credits,activePlan:plans.length>0};
}
function consume(db,userId) {
  ensure(db);
  return db.transaction(()=>{
    const row=db.prepare('SELECT source_order_no FROM paid_ai_credits WHERE user_id=? AND remaining>0 ORDER BY created_at,source_order_no LIMIT 1').get(userId);
    if(!row)return false;
    return db.prepare('UPDATE paid_ai_credits SET remaining=remaining-1 WHERE source_order_no=? AND remaining>0').run(row.source_order_no).changes===1;
  }).immediate();
}
module.exports={ensure,grant,status,consume};
