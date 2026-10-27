'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
const root=path.resolve(__dirname,'..'),policy=require('../backend_deploy/promotionPolicy');
function functions(file,names,globals={}){
 const text=fs.readFileSync(path.join(root,file),'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
 const selected=names.map(name=>{const node=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert.ok(node,'Missing real function '+name);return node.getText(source);}).join('\n');
 const exports={};vm.runInNewContext(ts.transpileModule(selected+'\n'+names.map(name=>`exports.${name}=${name};`).join('\n'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,console,process:{env:{INVITE_REWARD_REGISTER:'999',INVITE_REWARD_FIRST_PAY:'999',INVITE_REBATE_RATE_LEVEL2:'0.9'}},...globals});return exports;
}
function fixture(){
 const sql=new DatabaseSync(':memory:'),db={prepare:q=>sql.prepare(q),exec:q=>sql.exec(q)};
 db.transaction=fn=>{const call=()=>{sql.exec('BEGIN IMMEDIATE');try{const value=fn();sql.exec('COMMIT');return value;}catch(error){sql.exec('ROLLBACK');throw error;}};call.immediate=call;return call;};
 sql.exec(`CREATE TABLE users(user_id INTEGER PRIMARY KEY,invited_by INTEGER);
 CREATE TABLE user_invite_relation(id INTEGER PRIMARY KEY,inviter_id INTEGER,invitee_id INTEGER,level INTEGER);
 CREATE TABLE invite_rewards(id INTEGER PRIMARY KEY,invitee_id INTEGER,inviter_id INTEGER,reward_type TEXT,points REAL,status TEXT);
 CREATE TABLE points_transactions(id INTEGER PRIMARY KEY,user_id INTEGER,amount REAL);
 CREATE TABLE consumption_rebates(id INTEGER PRIMARY KEY,order_no TEXT,level1_points REAL,level2_points REAL,status TEXT);
 CREATE TABLE commission_records(id INTEGER PRIMARY KEY,order_no TEXT,record_type TEXT,commission_cents INTEGER);
 CREATE TABLE partner_order_log(id INTEGER PRIMARY KEY,order_no TEXT,gross_cents INTEGER);
 INSERT INTO users VALUES(1,NULL),(2,1),(3,NULL),(4,3);
 INSERT INTO invite_rewards VALUES(1,2,1,'register',50,'granted');
 INSERT INTO points_transactions VALUES(1,1,50);
 INSERT INTO consumption_rebates VALUES(1,'historical-points',15,8,'active');
 INSERT INTO commission_records VALUES(1,'historical-commission','PARTNER_NURTURE',500);
 INSERT INTO partner_order_log VALUES(1,'historical-log',10000);`);
 const history=()=>JSON.stringify(['invite_rewards','points_transactions','consumption_rebates','commission_records','partner_order_log'].map(table=>db.prepare('SELECT * FROM '+table+' ORDER BY id').all()));
 return {db,sql,history};
}
test('actual registration attribution binds a valid learning share once without minting points; cycles and self-invites still reject',()=>{
 const f=fixture(),old=f.history(),events=[];let grants=0,friends=0;
 const api=functions('backend_deploy/register_routes.js',['inviteRewardPoints','bindInviteAndReward'],{require:name=>{assert.equal(name,'./promotionPolicy');return policy;},logInviteAudit:(...args)=>events.push(args),grantPointsTx:()=>grants++,enqueueInviteFriendTask:()=>friends++,runInviteFriendTask:()=>friends++});
 assert.equal(api.inviteRewardPoints('register'),0);assert.equal(api.inviteRewardPoints('first_pay'),0);
 const result=api.bindInviteAndReward(f.db,3,{ok:true,inviterId:1,source:'signed_link'},'fixture-ip','fixture-device');
 assert.equal(result.bound,true);assert.equal(result.rewardPoints,0);assert.equal(f.db.prepare('SELECT invited_by FROM users WHERE user_id=3').get().invited_by,1);assert.equal(friends,2);assert.equal(grants,0);assert.equal(f.history(),old);
 assert.equal(api.bindInviteAndReward(f.db,3,{ok:true,inviterId:2,source:'spoof_header'},'','').bound,false);
 assert.equal(api.bindInviteAndReward(f.db,1,{ok:true,inviterId:4,source:'signed_link'},'','').reason,'INVITE_CYCLE');
 assert.equal(api.bindInviteAndReward(f.db,1,{ok:true,inviterId:1,source:'signed_link'},'','').reason,'SELF_INVITE');
 assert.ok(events.some(event=>event.includes('ATTRIBUTION_ONLY_NO_REWARD')));assert.equal(f.history(),old);f.sql.close();
});
test('actual first-pay and legacy consumption callbacks cannot add points for company, store or unknown source; historical records unchanged',()=>{
 const f=fixture(),old=f.history();let grants=0;
 const api=functions('backend_deploy/register_routes.js',['inviteRewardPoints','grantFirstPayReward','grantConsumptionRebate'],{initDatabase:()=>f.db,grantPointsTx:()=>grants++,logInviteAudit:()=>{throw Error('must not claim rewarded');}});
 for(const source of ['COMPANY_DIRECT','STORE_GOOGLE','STORE_APPLE','UNKNOWN']){
  assert.equal(api.grantFirstPayReward(2,'new-'+source).reason,'LEGACY_INVITE_REWARDS_NOT_ACTIVE');
  const result=api.grantConsumptionRebate(2,'new-'+source,100,'年度会员');assert.equal(result.reason,'LEGACY_CONSUMPTION_REWARDS_NOT_ACTIVE');assert.equal(result.level2Points,0);
 }
 assert.equal(api.grantConsumptionRebate(2,'historical-points',100,'年度会员').reason,'ALREADY_GRANTED');assert.equal(grants,0);assert.equal(f.history(),old);f.sql.close();
});
test('actual partner engine never replays old ledgers and cannot create a default 50/5 settlement without immutable per-order contract evidence',()=>{
 const f=fixture(),old=f.history();let evaluations=0,currentVersion='confirmed-direct-v1';
 const p={POLICY_VERSION:'confirmed-direct-v1',evaluateCashOrder(){evaluations++;return {ok:true,policyVersion:currentVersion,baseCents:10000};}};
 const api=functions('backend_deploy/partnerEngine.js',['grantPartnerCommission'],{getDb:()=>f.db,getConfig:()=>({enabled:true,commissionPercent:50,nurturePercent:5}),findChannelPartner:()=>1,require:name=>name==='./promotionPolicy'?p:{getConfig:()=>({ratios:{level1:15,level2:0}})}});
 for(const orderId of ['historical-commission','historical-log'])assert.equal(api.grantPartnerCommission({orderId,userId:2}).reason,'DUPLICATE');assert.equal(evaluations,0);
 assert.equal(api.grantPartnerCommission({orderId:'new-current',userId:2}).reason,'NEW_POLICY_PARTNER_CONTRACT_REVIEW_REQUIRED');
 currentVersion='frozen-legacy-contract';const pending=api.grantPartnerCommission({orderId:'old-unsettled',userId:2});assert.equal(pending.reason,'LEGACY_PARTNER_CONTRACT_SNAPSHOT_REQUIRED');assert.equal(pending.reviewRequired,true);
 assert.equal(f.history(),old);f.sql.close();
});
test('actual router and partner functions persist contract gaps as REVIEW_REQUIRED for current, legacy and coupon orders without changing historical money',()=>{
 const f=fixture();f.db.exec("ALTER TABLE commission_records ADD COLUMN status TEXT DEFAULT 'FROZEN';ALTER TABLE partner_order_log ADD COLUMN status TEXT DEFAULT 'ACTIVE';ALTER TABLE partner_order_log ADD COLUMN fee_cost_cents INTEGER DEFAULT 0;ALTER TABLE partner_order_log ADD COLUMN ai_cost_cents INTEGER DEFAULT 0;");
 const history=f.history();let frozenVersion=policy.POLICY_VERSION;
 const p={...policy,evaluateCashOrder:()=>({ok:true,policyVersion:frozenVersion,payerId:2,inviterId:99,baseCents:10000,rates:{level1:15,level2:0}})};
 const engine={getDb:()=>f.db,getConfig:()=>({ratios:{level1:15,level2:0}}),getDirectInviter:(_db,id)=>String(id)==='2'?99:null,yuanToCents:policy.cents,grantCommission:()=>({granted:false,reason:'NO_ADDITIONAL_REFERRAL_WRITE_IN_CONTRACT_REGRESSION'})};
 const partnerConfig={enabled:true,commissionPercent:50,nurturePercent:5,feePercent:0,storePercent:0,aiCostPercent:0};
 const partner=functions('backend_deploy/partnerEngine.js',['grantPartnerCommission'],{getDb:()=>f.db,getConfig:()=>partnerConfig,findChannelPartner:()=>1,require:name=>name==='./promotionPolicy'?p:engine});
 partner.getConfig=()=>partnerConfig;partner.findChannelPartner=()=>1;
 const mod={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'backend_deploy/commissionRouter.js'),'utf8'),{module:mod,exports:mod.exports,__dirname:path.join(root,'backend_deploy'),process:{env:{}},console:{log(){},error(){}},require:name=>{
  if(name==='fs')return {existsSync:()=>false,mkdirSync(){}};if(name==='path')return path;if(name==='./promotionPolicy')return p;if(name==='./commissionEngine')return engine;if(name==='./partnerEngine')return partner;throw Error(name);
 }});
 for(const [orderId,version,coupon] of [['new-contract-gap',policy.POLICY_VERSION,false],['legacy-contract-gap','frozen-legacy-contract',false],['legacy-coupon-gap','frozen-legacy-contract',true]]){
  frozenVersion=version;const result=mod.exports.processPaidOrder({orderId,userId:2,amount:100,type:'MEMBERSHIP',extra:coupon?{growthCampaign:{commissionPolicy:'REFERRAL_EXCLUDED_PARTNER_PRESERVED'}}:undefined});
  assert.equal(result.ok,true);assert.equal(result.reviewRequired,true);assert.equal(result.status,'REVIEW_REQUIRED');
  const row=f.db.prepare('SELECT status,note,partner_revenue_cents,nurture_revenue_cents FROM commission_router_snapshots WHERE order_no=?').get(orderId);
  assert.equal(row.status,'REVIEW_REQUIRED');assert.equal(row.partner_revenue_cents,0);assert.equal(row.nurture_revenue_cents,0);assert.match(row.note,version===policy.POLICY_VERSION?/新15\/0政策/:/逐单独立合同快照/);
  assert.equal(f.history(),history);
 }
 assert.equal(mod.exports.processPaidOrder({orderId:'legacy-contract-gap',userId:2,amount:100,type:'MEMBERSHIP'}).reason,'DUPLICATE');assert.equal(f.history(),history);f.sql.close();
});
function client(file,deps={},globals={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,console,require:name=>{if(name in deps)return deps[name];throw Error(name);},...globals});return exports;}
test('client attribution preserves old rows but refuses new indirect, self, cycle and duplicate relations and never releases old rewards',()=>{
 const old=[{id:'old',inviterId:'1',inviteeId:'2',level:1,rewardAmount:50,rewardClaimed:true,createdAt:'2020-01-01'}],data=new Map([['yandao_invite_relations',JSON.stringify(old)]]),storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
 const api=client('src/lib/inviteStore.ts',{}, {window:{},localStorage:storage});
 assert.equal(api.addInviteRelation({id:'new',inviterId:'2',inviteeId:'3',level:1,rewardAmount:999,rewardClaimed:true}).success,true);
 const rows=JSON.parse(data.get('yandao_invite_relations'));assert.deepEqual(rows[0],old[0]);assert.equal(rows[1].rewardAmount,0);assert.equal(rows[1].rewardClaimed,false);assert.equal(rows.length,2);
 for(const pair of [['3','1',1],['1','1',1],['1','3',1],['1','4',2]])assert.equal(api.addInviteRelation({id:'blocked',inviterId:pair[0],inviteeId:pair[1],level:pair[2]}).success,false);
 const before=data.get('yandao_invite_relations');assert.equal(api.releaseMaturedFrozenRewards(),0);assert.equal(data.get('yandao_invite_relations'),before);
 const anti=client('src/lib/antiCheatStore.ts',{'./toolConfigStore':{getToolConfig:()=>({})}},{window:{},localStorage:storage});assert.equal(anti.releaseDueFrozenRewards(),0);assert.equal(anti.forceReleaseFrozenReward('old'),false);assert.equal(data.get('yandao_invite_relations'),before);
});
test('client invite point sources and local cash callbacks do not invoke wallet/points writes',async()=>{
 let writes=0;const api=functions('src/lib/pointsStore.ts',['earnPoints'],{POINTS_RULES:{},isDailyLimitReached:()=>{writes++;throw Error('must not enter local award');}});
 for(const source of ['invite_register','invite_pay','invite_review','invite_active_7d']){const result=api.earnPoints(source,'test','2');assert.equal(result.success,false);assert.equal(result.amount,0);}assert.equal(writes,0);
 const cash=functions('src/lib/payment/paymentCallback.ts',['settleDistributionRebate'],{distributionAdapter:{addWalletBalance:()=>writes++,recordRebateFlow:()=>writes++}});
 const result=await cash.settleDistributionRebate({orderId:'test-only-no-payment',userId:'2',amount:100});assert.equal(result.level1Rebate,0);assert.equal(result.level2Rebate,0);assert.equal(writes,0);
});
