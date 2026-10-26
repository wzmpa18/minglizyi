const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const policy=require('../backend_deploy/promotionPolicy');
const campaign=require('../backend_deploy/nonAiInviteCampaign');
function fixture(){
 const sql=new DatabaseSync(':memory:');
 const db={prepare:query=>sql.prepare(query),exec:query=>sql.exec(query),pragma:()=>[]};
 db.transaction=fn=>{const call=(...args)=>{sql.exec('BEGIN IMMEDIATE');try{const result=fn(...args);sql.exec('COMMIT');return result;}catch(error){sql.exec('ROLLBACK');throw error;}};call.immediate=call;return call;};
 db.exec(`CREATE TABLE users(user_id INTEGER PRIMARY KEY,invited_by INTEGER,deleted_at TEXT,created_at TEXT,status TEXT DEFAULT 'active');
 CREATE TABLE user_invite_relation(id INTEGER PRIMARY KEY,inviter_id INTEGER,invitee_id INTEGER,level INTEGER,invite_time TEXT);
 CREATE TABLE user_orders(order_no TEXT PRIMARY KEY,user_id INTEGER,amount REAL,status TEXT,payment_method TEXT,transaction_id TEXT);`);
 const user=(id,parent=null)=>{db.prepare('INSERT INTO users(user_id,invited_by,created_at) VALUES(?,?,?)').run(id,parent,new Date().toISOString());if(parent)db.prepare('INSERT INTO user_invite_relation(inviter_id,invitee_id,level,invite_time) VALUES(?,?,1,?)').run(parent,id,new Date().toISOString());};
 const paid=(id,uid,channel='wechat',amount=100)=>{db.prepare('INSERT INTO user_orders VALUES(?,?,?,\'PAID\',?,?)').run(id,uid,amount,channel,'verified-provider-'+id);return {orderId:id,userId:uid,amount:99999,type:'MEMBERSHIP',distributionSource:'COMPANY_DIRECT'};};
 const evidence=uid=>policy.recordDistributionEvidence(db,uid,{distributionSource:'COMPANY_DIRECT',evidenceRef:'download-log:'+uid,evidenceSha256:'a'.repeat(64)},'reviewer');
 return {db,sql,user,paid,evidence};
}
function engineFor(db){
 const mod={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../backend_deploy/commissionEngine.js'),'utf8'),{module:mod,exports:mod.exports,__dirname:path.join(__dirname,'../backend_deploy'),process:{env:{DB_PATH:'fixture-users.db'}},console:{log(){},error(){}},require:name=>{
  if(name==='fs')return {existsSync:file=>file==='fixture-users.db'};
  if(name==='better-sqlite3')return function(){return db;};
  if(name==='./promotionPolicy')return policy;
  if(['path','crypto'].includes(name))return require(name);
  throw Error('Unexpected dependency '+name);
 }});return mod.exports;
}
function routerFor(engine,partner){
 const mod={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../backend_deploy/commissionRouter.js'),'utf8'),{module:mod,exports:mod.exports,__dirname:path.join(__dirname,'../backend_deploy'),process:{env:{}},console:{log(){},error(){}},require:name=>{
  if(name==='fs')return {existsSync:()=>false,mkdirSync(){}};
  if(name==='path')return path;
  if(name==='./promotionPolicy')return policy;
  if(name==='./commissionEngine')return engine;
  if(name==='./partnerEngine')return partner;
  throw Error('Unexpected dependency '+name);
 }});return mod.exports;
}
test('zero and decimal percentages survive; malformed values fail rather than changing into defaults',()=>{
 for(const value of [0,'0','0.00'])assert.equal(policy.percent(value,15),0);
 assert.equal(policy.percent(undefined,15),15);assert.equal(policy.percent('12.75',15),12.75);
 for(const value of ['',null,-1,101,'1bad','1.234',NaN])assert.throws(()=>policy.percent(value,15));
 assert.equal(policy.referralRates({ratios:{level1:0,level2:5}}).level1,0);assert.equal(policy.referralRates({ratios:{level1:15,level2:5}}).level2,0);
 assert.equal(policy.contractRates({ratios:{level1:0,level2:0}}).level2,0);assert.equal(policy.contractRates({}).level2,5);
 assert.equal(policy.commissionCents(101,12.5),12);assert.equal(policy.cents('0.01'),1);
});
test('a client source claim cannot qualify; a store payment or original store installation remains excluded',()=>{
 const f=fixture();f.user(1);f.user(2,1);policy.approvePromoter(f.db,1,'signed-contract','admin');
 assert.equal(policy.evaluateSourceOrder(f.db,f.paid('unknown',2)).reason,'COMPANY_DOWNLOAD_NOT_VERIFIED');
 f.evidence(2);
 assert.equal(policy.evaluateSourceOrder(f.db,f.paid('apple',2,'apple_iap')).reason,'STORE_OR_UNVERIFIED_PAYMENT_NO_COMMISSION');
 f.user(3,1);policy.recordDistributionEvidence(f.db,3,{distributionSource:'STORE_GOOGLE',evidenceRef:'store-receipt',evidenceSha256:'b'.repeat(64)},'admin');
 assert.equal(policy.evaluateSourceOrder(f.db,f.paid('store-webpay',3)).ok,false);
 const conflict=policy.recordDistributionEvidence(f.db,3,{distributionSource:'COMPANY_DIRECT',evidenceRef:'new-install',evidenceSha256:'c'.repeat(64)},'admin');assert.equal(conflict.ok,false);
 assert.equal(f.db.prepare('SELECT distribution_source FROM promotion_distribution_evidence WHERE user_id=3').get().distribution_source,'STORE_GOOGLE');f.sql.close();
});
test('source guard preserves current contract rates with exact paid-base cents; repeat callbacks and full refunds are idempotent',()=>{
 const f=fixture();f.user(1);f.user(2,1);const engine=engineFor(f.db);
 const first=f.paid('unknown-source',2);assert.equal(engine.grantCommission(first).reason,'COMPANY_DOWNLOAD_NOT_VERIFIED');
 f.evidence(2);
 assert.equal(engine.grantCommission(f.paid('missing-contract',2)).reason,'PROMOTER_NOT_APPROVED');
 policy.approvePromoter(f.db,1,'company-direct-contract','admin');
 const order=f.paid('eligible',2);const result=engine.grantCommission(order);assert.equal(result.granted,true);assert.equal(result.commissionCents,1500);assert.equal(result.level2CommissionCents,0);
 assert.equal(engine.grantCommission(order).reason,'DUPLICATE');assert.equal(f.db.prepare('SELECT count(*) n FROM commission_records').get().n,1);
 assert.equal(engine.reverseCommission('eligible').reversed,true);assert.equal(engine.reverseCommission('eligible').reason,'ALREADY_REVERSED');
 const balance=f.db.prepare('SELECT frozen_cents,withdrawable_cents,negative_cents FROM commission_accounts WHERE user_id=1').get();assert.equal(balance.frozen_cents+balance.withdrawable_cents+balance.negative_cents,0);f.sql.close();
});
test('cash qualification freezes its rate/base and refuses unpaid facts, cycles and self-invites',()=>{
 const f=fixture();f.user(1);f.user(2,1);f.evidence(2);policy.approvePromoter(f.db,1,'contract','admin');
 const order=f.paid('rate-zero',2);const first=policy.evaluateSourceOrder(f.db,order,{ratios:{level1:0}});assert.equal(first.rates.level1,0);assert.equal(first.baseCents,10000);
 assert.equal(policy.evaluateSourceOrder(f.db,order,{ratios:{level1:15}}).rates.level1,0);
 const unpaid=f.paid('unpaid',2);f.db.prepare("UPDATE user_orders SET status='PENDING' WHERE order_no='unpaid'").run();assert.equal(policy.evaluateSourceOrder(f.db,unpaid).ok,false);
 assert.equal(policy.canBindInvitation(f.db,1,2).reason,'INVITE_CYCLE');assert.equal(policy.canBindInvitation(f.db,1,1).reason,'INVITE_CYCLE');f.sql.close();
});
test('owner-confirmed new policy uses 15/0 without rewriting a historical source-policy snapshot',()=>{
 const f=fixture();f.user(1);f.user(2,1);f.evidence(2);policy.approvePromoter(f.db,1,'draft-contract','admin');const order=f.paid('draft-order',2);
 assert.equal(policy.POLICY_CONFIRMATION.status,'OWNER_CONFIRMED');assert.equal(policy.evaluateCashOrder(f.db,order).ok,true);
 const isolated=policy.evaluateCashOrder(f.db,order,{policyStatus:'ISOLATED_TEST',ratios:{level1:15,level2:5}});assert.equal(isolated.ok,true);assert.equal(isolated.rates.level2,0);
 assert.equal(policy.evaluateSourceOrder(f.db,order,{ratios:{level1:15,level2:5}}).rates.level2,5);f.sql.close();
});
test('a real full refund reverses historical L1 and L2 exactly once; the new policy never issues L2',()=>{
 const f=fixture();f.user(1);f.user(2,1);f.user(3);const engine=engineFor(f.db);engine.getDb();
 f.db.prepare('INSERT INTO commission_accounts(user_id,frozen_cents,total_earnings_cents) VALUES(1,1500,1500),(3,500,500)').run();
 for(const [kind,uid,rate,amount] of [['COMMISSION',1,15,1500],['COMMISSION_L2',3,5,500]])f.db.prepare("INSERT INTO commission_records(order_no,record_type,payer_user_id,inviter_user_id,ratio_percent,base_amount_cents,commission_cents,status) VALUES('historical-paid',?,?,?,?,10000,?,'FROZEN')").run(kind,2,uid,rate,amount);
 const result=engine.reverseCommission('historical-paid');assert.equal(result.level1ReverseCents,1500);assert.equal(result.level2ReverseCents,500);assert.equal(result.reverseCents,2000);
 assert.equal(engine.reverseCommission('historical-paid').reason,'ALREADY_REVERSED');assert.equal(f.db.prepare('SELECT sum(frozen_cents) n FROM commission_accounts').get().n,0);
 assert.equal(f.db.prepare("SELECT count(*) n FROM commission_records WHERE status='REVERSED'").get().n,2);f.sql.close();
});
test('router preserves zero in snapshots and refuses store orders before either cash engine runs',()=>{
 const f=fixture();f.user(1);f.user(2,1);f.user(3,1);f.evidence(2);f.evidence(3);policy.approvePromoter(f.db,1,'contract','admin');
 const original=engineFor(f.db);let referrals=0,partners=0;
 const engine={...original,getConfig:()=>({...original.getConfig(),ratios:{level1:0,level2:0}}),grantCommission:order=>{referrals++;return original.grantCommission(order);}};
 const partner={getConfig:()=>({commissionPercent:0,nurturePercent:0,feePercent:0,storePercent:0,aiCostPercent:0}),findChannelPartner:()=>null,grantPartnerCommission:()=>{partners++;return {granted:false,reason:'NO_CHANNEL_PARTNER'};}};
 const router=routerFor(engine,partner);
 const rates=JSON.parse(router.buildRateSnapshot());assert.equal(rates.referralL1Percent,0);assert.equal(rates.referralL2Percent,0);assert.equal(rates.partnerPercent,0);
 assert.equal(router.processPaidOrder(f.paid('google-router',2,'google_play')).status,'NO_COMMISSION');assert.equal(referrals,0);assert.equal(partners,0);
 assert.equal(router.processPaidOrder(f.paid('zero-router',3)).ok,true);
 const snapshot=f.db.prepare("SELECT gross_cents,rate_snapshot FROM commission_router_snapshots WHERE order_no='zero-router'").get();assert.equal(snapshot.gross_cents,10000);assert.equal(JSON.parse(snapshot.rate_snapshot).referralL1Percent,0);
 assert.equal(f.db.prepare('SELECT count(*) n FROM commission_records').get().n,0);f.sql.close();
});
test('a missing provider transaction is a reviewable pending fact and can be rechecked after a genuine callback',()=>{
 const f=fixture();f.user(1);f.user(2,1);f.evidence(2);policy.approvePromoter(f.db,1,'contract','admin');const order=f.paid('missing-tx',2);f.db.prepare("UPDATE user_orders SET transaction_id=NULL WHERE order_no='missing-tx'").run();assert.equal(policy.evaluateCashOrder(f.db,order).reason,'TRANSACTION_ID_NOT_VERIFIED');assert.equal(f.db.prepare('SELECT status FROM promotion_order_reviews').get().status,'OPEN');assert.equal(f.db.prepare('SELECT count(*) n FROM promotion_order_policy_snapshots').get().n,0);f.db.prepare("UPDATE user_orders SET transaction_id='real-verified-provider-tx' WHERE order_no='missing-tx'").run();assert.equal(policy.evaluateCashOrder(f.db,order).ok,true);assert.equal(f.db.prepare('SELECT status FROM promotion_order_reviews').get().status,'RESOLVED');f.sql.close();
});
test('nine effective registrations do not grant; ten grant permanent non-AI once, shared networks add no identity requirement',()=>{
 const f=fixture();f.user(1);f.evidence(1);
 const cfg={...campaign.DEFAULT_CONFIG,enabled:true,channelPolicies:{COMPANY_DIRECT:'CONFIRMED'}};
 const now=Date.now()+49*3600000;
 for(let id=2;id<=10;id++){f.user(id,1);campaign.markVerifiedRegistration(f.db,id,'EMAIL');campaign.reviewLearningActivation(f.db,id,{status:'QUALIFIED',evidenceRef:'completed-intro-course-and-note:'+id,noteSha256:'d'.repeat(64)},'learning-reviewer','ISOLATED_TEST');}
 assert.equal(campaign.syncUser(f.db,1,cfg,now,'ISOLATED_TEST').effectiveInvites,9);assert.equal(campaign.syncUser(f.db,1,cfg,now,'ISOLATED_TEST').granted,false);
 f.user(11,1);campaign.markVerifiedRegistration(f.db,11,'SMS');campaign.reviewLearningActivation(f.db,11,{status:'QUALIFIED',evidenceRef:'completed-course-and-note:11',noteSha256:'e'.repeat(64)},'learning-reviewer','ISOLATED_TEST');
 assert.equal(campaign.syncUser(f.db,1,cfg,Date.now(),'ISOLATED_TEST').granted,false);
 assert.equal(campaign.syncUser(f.db,1,cfg,now).granted,false);
 assert.equal(campaign.syncUser(f.db,1,cfg,now,'ISOLATED_TEST').granted,true);assert.equal(campaign.syncUser(f.db,1,cfg,now,'ISOLATED_TEST').granted,true);
 const rights=f.db.prepare('SELECT * FROM user_entitlements WHERE user_id=1').all();assert.equal(rights.length,1);assert.equal(rights[0].entitlement_key,'non_ai_full_v1');assert.equal(rights[0].expire_at,null);
 const access=campaign.accessForUser(f.db,1,'default');assert.equal(access.active,true);assert.ok(access.features.includes('anatomy3d'));assert.equal(access.aiCreditsGranted,0);assert.equal(access.membershipLevelChanged,false);assert.equal(campaign.accessForUser(f.db,1,'google').active,false);assert.equal(campaign.accessForUser(f.db,1,'ios-full-learning').active,false);
 assert.equal(f.db.prepare('SELECT count(*) n FROM non_ai_invite_grants').get().n,1);
 f.db.prepare("UPDATE users SET deleted_at='normal account deletion' WHERE user_id=11").run();assert.equal(campaign.syncUser(f.db,1,cfg,now,'ISOLATED_TEST').granted,true);f.sql.close();
});
test('pending store policies and unreviewed clicks cannot issue non-AI rights',()=>{
 const f=fixture();f.user(1);f.evidence(1);const cfg={...campaign.DEFAULT_CONFIG,enabled:true};
 for(let id=2;id<=12;id++){f.user(id,1);campaign.markVerifiedRegistration(f.db,id,'EMAIL');}
 const result=campaign.syncUser(f.db,1,cfg,Date.now()+72*3600000,'ISOLATED_TEST');assert.equal(result.effectiveInvites,0);assert.equal(result.granted,false);assert.equal(result.channelPolicy,'PENDING');
 assert.equal(f.db.prepare('SELECT count(*) n FROM user_entitlements').get().n,0);f.sql.close();
});
test('an arbitrary client/admin qualification row is not a trusted learning receipt',()=>{const f=fixture();f.user(1);assert.throws(()=>campaign.reviewLearningActivation(f.db,1,{status:'QUALIFIED',evidenceRef:'client-claim',noteSha256:'d'.repeat(64)},'admin'),/TRUSTED_LEARNING_RECEIPT/);f.sql.close();});
