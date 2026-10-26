'use strict';

// Distribution, acquisition and payment are separate facts. Nothing in a
// client's request body (including an invite code) is distribution evidence.
const POLICY_VERSION = 'company-direct-single-v1';
const SOURCE_POLICY_VERSION = 'company-download-source-v1';
const DRAFT_POLICY_STATUS = 'DRAFT_NOT_ACCEPTED';
const POLICY_CONFIRMATION=Object.freeze({status:'OWNER_CONFIRMED',confirmedOn:'2026-10-26',confirmedBy:'PROJECT_OWNER',directPercent:15,level2Percent:0});
const DEFAULT_RATES = Object.freeze({level1:15, level2:0});

function percent(value, fallback, key='rate') {
  if (value === undefined) value = fallback;
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim()==='' ||
      !/^\d+(?:\.\d{1,2})?$/.test(String(value).trim())) throw new Error('INVALID_PERCENT:'+key);
  const number=Number(value);
  if(!Number.isFinite(number)||number<0||number>100)throw new Error('INVALID_PERCENT:'+key);
  return number;
}
function referralRates(config={}) {
  const rates=config.ratios||{};
  // Historical L2 configuration remains readable in archived configuration;
  // it cannot create new downline payments under this independent policy.
  return {level1:percent(rates.level1,DEFAULT_RATES.level1,'level1'),level2:0};
}
function contractRates(config={}){
  const rates=config.ratios||{};
  return {level1:percent(rates.level1,15,'level1'),level2:percent(rates.level2,5,'level2')};
}
function cents(value) {
  const text=String(value);
  if(!/^\d+(?:\.\d{1,2})?$/.test(text))return 0;
  const [whole,part='']=text.split('.');
  const result=BigInt(whole)*100n+BigInt(part.padEnd(2,'0'));
  return result<=BigInt(Number.MAX_SAFE_INTEGER)?Number(result):0;
}
function commissionCents(base,rate) {
  if(!Number.isSafeInteger(base)||base<0)throw Error('INVALID_CENTS');
  const basisPoints=Math.round(percent(rate,0)*100);
  return Number(BigInt(base)*BigInt(basisPoints)/10000n);
}
function ensureTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS promotion_distribution_evidence (
      user_id INTEGER PRIMARY KEY, distribution_source TEXT NOT NULL,
      acquisition_source TEXT NOT NULL DEFAULT 'UNKNOWN', evidence_ref TEXT NOT NULL,
      evidence_sha256 TEXT NOT NULL, verified_by TEXT NOT NULL, verified_at TEXT NOT NULL,
      evidence_kind TEXT NOT NULL DEFAULT 'MANUAL_REVIEW', source_quality TEXT NOT NULL DEFAULT 'MANUAL_REFERENCE', original_distribution_source TEXT NOT NULL DEFAULT 'UNKNOWN',
      status TEXT NOT NULL DEFAULT 'VERIFIED'
    );
    CREATE TABLE IF NOT EXISTS promotion_promoters (
      user_id INTEGER PRIMARY KEY, policy_version TEXT NOT NULL, status TEXT NOT NULL,
      contract_ref TEXT NOT NULL, approved_by TEXT NOT NULL, approved_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS promotion_order_policy_snapshots (
      order_no TEXT NOT NULL, policy_version TEXT NOT NULL, decision TEXT NOT NULL,
      payer_user_id INTEGER NOT NULL, inviter_user_id INTEGER, base_cents INTEGER NOT NULL,
      evidence_json TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(order_no,policy_version)
    );
    CREATE TABLE IF NOT EXISTS promotion_policy_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, subject_id TEXT NOT NULL,
      operator TEXT NOT NULL, details TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS promotion_order_reviews(order_no TEXT NOT NULL,policy_version TEXT NOT NULL,reason TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'OPEN',last_seen TEXT NOT NULL,PRIMARY KEY(order_no,policy_version));
  `);
  const columns=new Set(db.prepare('PRAGMA table_info(promotion_distribution_evidence)').all().map(row=>row.name));
  for(const name of ['evidence_kind','source_quality','original_distribution_source'])if(!columns.has(name))db.exec('ALTER TABLE promotion_distribution_evidence ADD COLUMN '+name+" TEXT NOT NULL DEFAULT 'UNKNOWN'");
}
function audit(db,event,id,operator,details) {
  db.prepare('INSERT INTO promotion_policy_audit(event,subject_id,operator,details,created_at) VALUES(?,?,?,?,?)')
    .run(event,String(id),String(operator),JSON.stringify(details),new Date().toISOString());
}
function recordDistributionEvidence(db,userId,evidence,operator) {
  ensureTables(db);
  if(!Number.isSafeInteger(Number(userId))||Number(userId)<1||!operator)throw Error('INVALID_EVIDENCE_IDENTITY');
  if(!['COMPANY_DIRECT','STORE_APPLE','STORE_GOOGLE','STORE_DOMESTIC','UNKNOWN'].includes(evidence.distributionSource)||
      typeof evidence.evidenceRef!=='string'||!evidence.evidenceRef.trim()||evidence.evidenceRef.length>300||
      !/^[a-f0-9]{64}$/.test(evidence.evidenceSha256||''))throw Error('INVALID_DISTRIBUTION_EVIDENCE');
  const existing=db.prepare('SELECT * FROM promotion_distribution_evidence WHERE user_id=?').get(Number(userId));
  if(existing){
    if(existing.distribution_source===evidence.distributionSource&&existing.evidence_sha256===evidence.evidenceSha256)return {ok:true,duplicate:true};
    // Installing another package or supplying another code never silently
    // overwrites the original source. Conflicts stop future automatic payouts.
    db.prepare("UPDATE promotion_distribution_evidence SET status='CONFLICT' WHERE user_id=?").run(Number(userId));
    audit(db,'DISTRIBUTION_CONFLICT',userId,operator,evidence);
    return {ok:false,reason:'SOURCE_CONFLICT_REVIEW_REQUIRED'};
  }
  if(!db.prepare('SELECT user_id FROM users WHERE user_id=?').get(Number(userId)))throw Error('USER_NOT_FOUND');
  db.prepare('INSERT INTO promotion_distribution_evidence(user_id,distribution_source,acquisition_source,evidence_ref,evidence_sha256,verified_by,verified_at,evidence_kind,source_quality,original_distribution_source) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run(Number(userId),evidence.distributionSource,String(evidence.acquisitionSource||'UNKNOWN').slice(0,80),evidence.evidenceRef,evidence.evidenceSha256,String(operator),new Date().toISOString(),String(evidence.evidenceKind||'MANUAL_REVIEW').slice(0,100),String(evidence.sourceQuality||'MANUAL_REFERENCE').slice(0,100),String(evidence.originalDistributionSource||'UNKNOWN').slice(0,100));
  audit(db,'DISTRIBUTION_VERIFIED',userId,operator,evidence);
  return {ok:true};
}
function approvePromoter(db,userId,contractRef,operator,status='APPROVED') {
  ensureTables(db);
  if(!operator||!['APPROVED','SUSPENDED'].includes(status)||typeof contractRef!=='string'||!contractRef.trim()||contractRef.length>300)throw Error('INVALID_PROMOTER_APPROVAL');
  if(!db.prepare('SELECT user_id FROM users WHERE user_id=?').get(Number(userId)))throw Error('USER_NOT_FOUND');
  db.prepare(`INSERT INTO promotion_promoters(user_id,policy_version,status,contract_ref,approved_by,approved_at) VALUES(?,?,?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET policy_version=excluded.policy_version,status=excluded.status,contract_ref=excluded.contract_ref,approved_by=excluded.approved_by,approved_at=excluded.approved_at`)
    .run(Number(userId),POLICY_VERSION,status,contractRef,String(operator),new Date().toISOString());
  audit(db,'PROMOTER_'+status,userId,operator,{contractRef,policyVersion:POLICY_VERSION});
  return {ok:true};
}
function directInviter(db,userId) {
  const user=db.prepare('SELECT invited_by FROM users WHERE user_id=?').get(Number(userId));
  const fromUser=Number(user?.invited_by)||null;
  let relation=null;
  try{relation=db.prepare('SELECT inviter_id FROM user_invite_relation WHERE invitee_id=? AND level=1 ORDER BY id LIMIT 1').get(Number(userId));}catch{}
  const fromRelation=Number(relation?.inviter_id)||null;
  if(fromRelation&&fromUser&&fromRelation!==fromUser)return {ok:false,reason:'INVITER_CONFLICT'};
  const inviter=fromRelation||fromUser;
  if(!inviter)return {ok:false,reason:'NO_INVITER'};
  const visited=new Set([Number(userId)]);let current=inviter;
  for(let depth=0;current;depth++){
    if(visited.has(current)||depth>=64)return {ok:false,reason:'INVITE_CYCLE'};
    visited.add(current);
    const ancestor=db.prepare('SELECT invited_by FROM users WHERE user_id=?').get(current);
    current=Number(ancestor?.invited_by)||null;
  }
  return {ok:true,inviterId:inviter};
}
function canBindInvitation(db,inviteeId,inviterId){
  const visited=new Set([Number(inviteeId)]);let current=Number(inviterId);
  if(!Number.isSafeInteger(current)||current<1)return {ok:false,reason:'INVALID_INVITER'};
  for(let depth=0;current;depth++){
    if(visited.has(current)||depth>=64)return {ok:false,reason:'INVITE_CYCLE'};
    visited.add(current);
    const row=db.prepare('SELECT invited_by FROM users WHERE user_id=?').get(current);
    if(!row)return {ok:false,reason:'INVITER_NOT_FOUND'};
    current=Number(row.invited_by)||0;
  }
  return {ok:true};
}
function evaluateOrder(db,order,config={},draft=false) {
  ensureTables(db);
  const no=String(order?.orderId||'');
  const version=draft?POLICY_VERSION:SOURCE_POLICY_VERSION;
  const old=db.prepare('SELECT evidence_json FROM promotion_order_policy_snapshots WHERE order_no=? AND policy_version=?').get(no,version);
  if(old)return JSON.parse(old.evidence_json);
  const answer={ok:false,reason:'ORDER_NOT_VERIFIED',policyVersion:version,payerId:Number(order?.userId)||0,inviterId:null,baseCents:0,rates:draft?referralRates(config):contractRates(config),rounding:'FLOOR_TO_CENT',paymentChannel:'UNKNOWN',distributionSource:'UNKNOWN'};
  let row;
  try{row=db.prepare('SELECT order_no,user_id,amount,status,payment_method,transaction_id FROM user_orders WHERE order_no=?').get(no);}catch{}
  // No snapshot for an unpaid/missing order: a later genuine signed payment
  // callback must still be able to evaluate it normally.
  if(!row||row.status!=='PAID'||String(row.user_id)!==String(order?.userId)||!row.transaction_id){
    answer.reason=!row?'ORDER_NOT_FOUND':row.status!=='PAID'?'ORDER_NOT_PAID':String(row.user_id)!==String(order?.userId)?'ORDER_OWNER_MISMATCH':'TRANSACTION_ID_NOT_VERIFIED';
    db.prepare("INSERT INTO promotion_order_reviews(order_no,policy_version,reason,last_seen) VALUES(?,?,?,?) ON CONFLICT(order_no,policy_version) DO UPDATE SET reason=excluded.reason,status='OPEN',last_seen=excluded.last_seen").run(no,version,answer.reason,new Date().toISOString());
    return answer;
  }
  answer.baseCents=cents(row.amount);answer.paymentChannel=String(row.payment_method||'').toLowerCase();
  if(!answer.baseCents)return {...answer,reason:'INVALID_PAID_AMOUNT'};
  let source=db.prepare('SELECT * FROM promotion_distribution_evidence WHERE user_id=?').get(Number(row.user_id));
  const store=require('./companyDownloadRoutes').knownStoreEvidence(db,row.user_id);
  if(store){recordDistributionEvidence(db,row.user_id,{...store,evidenceKind:'EXISTING_STORE_LEDGER',sourceQuality:'STORE_TRANSACTION_VERIFIED'},'PAYMENT_POLICY');source=db.prepare('SELECT * FROM promotion_distribution_evidence WHERE user_id=?').get(Number(row.user_id));}
  answer.distributionSource=source?.distribution_source||'UNKNOWN';
  answer.sourceEvidence=source?{sha256:source.evidence_sha256,ref:source.evidence_ref,status:source.status}:null;
  const relation=directInviter(db,row.user_id);
  answer.inviterId=relation.inviterId||null;
  if(!['wechat','alipay'].includes(answer.paymentChannel))answer.reason='STORE_OR_UNVERIFIED_PAYMENT_NO_COMMISSION';
  else if(!source||source.status!=='VERIFIED'||source.distribution_source!=='COMPANY_DIRECT')answer.reason=source?.status==='CONFLICT'?'SOURCE_CONFLICT_REVIEW_REQUIRED':'COMPANY_DOWNLOAD_NOT_VERIFIED';
  else if(!relation.ok&&(draft||relation.reason!=='NO_INVITER'))answer.reason=relation.reason;
  else {
    const promoter=db.prepare('SELECT * FROM promotion_promoters WHERE user_id=? AND policy_version=?').get(relation.inviterId,POLICY_VERSION);
    const inviter=db.prepare('SELECT * FROM users WHERE user_id=?').get(relation.inviterId);
    const payer=db.prepare('SELECT * FROM users WHERE user_id=?').get(Number(row.user_id));
    if((inviter&&(inviter.deleted_at||inviter.status==='banned'))||!payer||payer.deleted_at||payer.status==='banned')answer.reason='ACCOUNT_NOT_ELIGIBLE';
    else if(draft&&(!promoter||promoter.status!=='APPROVED'))answer.reason='PROMOTER_NOT_APPROVED';
    else {answer.ok=true;answer.reason='ELIGIBLE_COMPANY_DIRECT';if(draft)answer.contractRef=promoter.contract_ref;}
  }
  db.prepare('INSERT OR IGNORE INTO promotion_order_policy_snapshots(order_no,policy_version,decision,payer_user_id,inviter_user_id,base_cents,evidence_json,created_at) VALUES(?,?,?,?,?,?,?,?)')
    .run(no,version,answer.reason,answer.payerId,answer.inviterId,answer.baseCents,JSON.stringify(answer),new Date().toISOString());
  const frozen=db.prepare('SELECT evidence_json FROM promotion_order_policy_snapshots WHERE order_no=? AND policy_version=?').get(no,version);
  db.prepare("UPDATE promotion_order_reviews SET status='RESOLVED',last_seen=? WHERE order_no=? AND policy_version=?").run(new Date().toISOString(),no,version);
  return frozen?JSON.parse(frozen.evidence_json):answer;
}
function evaluateSourceOrder(db,order,config={}){return evaluateOrder(db,order,config,false);}
function evaluateCashOrder(db,order,config={}){
  return evaluateOrder(db,order,config,true);
}
module.exports={POLICY_VERSION,SOURCE_POLICY_VERSION,DRAFT_POLICY_STATUS,POLICY_CONFIRMATION,DEFAULT_RATES,percent,referralRates,contractRates,cents,commissionCents,ensureTables,recordDistributionEvidence,approvePromoter,directInviter,canBindInvitation,evaluateSourceOrder,evaluateCashOrder};
