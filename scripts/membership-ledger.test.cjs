const {test}=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const ledger=require('../backend_deploy/membershipLedger');
const now=Date.parse('2026-10-18T10:00:00Z'),day=86400000;
function database(level='basic',expiry=null){
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE users(user_id INTEGER PRIMARY KEY,member_level TEXT,membership_expiry TEXT);');
  db.prepare('INSERT INTO users VALUES(1,?,?)').run(level,expiry);db.prepare("INSERT INTO users VALUES(2,'basic',NULL)").run();
  db.transaction=fn=>({immediate(){db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}});
  return db;
}
const grant=(source,level='monthly',days=30,time=now)=>({source,userId:1,provider:source.startsWith('apple:')?'apple':'payment',level,days,purchasedAt:time});
test('cross-channel renewal preserves original paid days and a lower purchase cannot downgrade an active tier',()=>{
 const db=database('yearly',new Date(now+20*day).toISOString());
 try{
  const r=ledger.purchase(db,grant('apple:one'),now);
  assert.equal(r.level,'yearly');assert.equal(Date.parse(r.expiresAt),now+50*day);
  assert.deepEqual(ledger.purchase(db,grant('apple:one'),now),r);
  assert.throws(()=>ledger.purchase(db,{...grant('apple:one'),userId:2},now));
  assert.throws(()=>ledger.purchase(db,grant('apple:one','yearly',365),now));
 }finally{db.close();}
});
test('refunding Apple recomputes rather than overwrites later Android purchases; receipt replay cannot restore refunded days',()=>{
 const db=database('monthly',new Date(now+10*day).toISOString());
 try{
  ledger.purchase(db,grant('apple:annual','yearly',365),now);
  ledger.purchase(db,grant('payment:later','monthly',30,now+day),now+day);
  const r=ledger.revoke(db,'apple:annual',now+2*day);
  assert.equal(r.level,'monthly');assert.equal(Date.parse(r.expiresAt),now+40*day);
  const replay=ledger.purchase(db,grant('apple:annual','yearly',365),now+2*day);
  assert.equal(replay.level,'monthly');assert.equal(Date.parse(replay.expiresAt),now+40*day);
  assert.deepEqual(ledger.revoke(db,'unknown-old-order',now),{found:false});
 }finally{db.close();}
});
test('refund lifetime falls back to independently purchased rights and preserves legacy unlimited validity',()=>{
 const db=database('monthly',new Date(now+15*day).toISOString());
 try{ledger.purchase(db,grant('apple:lifetime','lifetime',-1),now);assert.equal(db.prepare('SELECT member_level FROM users WHERE user_id=1').get().member_level,'lifetime');assert.equal(ledger.revoke(db,'apple:lifetime',now).level,'monthly');}finally{db.close();}
 const legacy=database('yearly',null);
 try{assert.deepEqual(ledger.purchase(legacy,grant('payment:one'),now),{level:'yearly',expiresAt:null});}finally{legacy.close();}
});
test('administrator reset and account deletion cannot be undone by replay, while a new purchase remains deliverable',()=>{
 const db=database();
 try{
  ledger.purchase(db,grant('apple:old'),now);
  assert.equal(ledger.adminReset(db,1,'basic',null,now+day).level,'basic');
  assert.equal(ledger.purchase(db,grant('apple:old'),now+2*day).level,'basic');
  assert.equal(ledger.purchase(db,grant('apple:new','monthly',30,now+3*day),now+3*day).level,'monthly');
 }finally{db.close();}
});
test('expired baseline does not add stale time and invalid purchases leave baseline and user unchanged',()=>{
 const db=database('yearly',new Date(now-day).toISOString());
 try{
  const r=ledger.purchase(db,grant('apple:new'),now);assert.equal(r.level,'monthly');assert.equal(Date.parse(r.expiresAt),now+30*day);
  assert.throws(()=>ledger.purchase(db,grant('bad','monthly',-2),now));
  assert.throws(()=>ledger.purchase(db,grant('future','monthly',30,now+day),now));
  assert.equal(db.prepare('SELECT COUNT(*) n FROM membership_purchase_grants').get().n,1);
 }finally{db.close();}
});
