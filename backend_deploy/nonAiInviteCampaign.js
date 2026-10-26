'use strict';
const fs=require('fs'),path=require('path');
const policy=require('./promotionPolicy');
const CONFIG_FILE=process.env.NON_AI_INVITE_CONFIG||path.join(__dirname,'data','non_ai_invite_campaign.json');
const DEFAULT_CONFIG={enabled:false,campaignId:'invite10_non_ai_v1',policyVersion:'2026-10-26-v1',name:'邀请学习权益',
  targetInvites:10,reviewHours:48,startsAt:'2026-10-26T00:00:00+09:00',endsAt:null,
  entitlementKey:'non_ai_full_v1',channelPolicies:{COMPANY_DIRECT:'PENDING',STORE_APPLE:'PENDING',STORE_GOOGLE:'PENDING',STORE_DOMESTIC:'PENDING'},
  scope:['经典阅读','穴位药材检索','已发布课程笔记','复习收藏与普通笔记','约定离线资料','已发布三维学习功能'],
  excluded:['实时AI推理','未来第三方新增版权商品']};
function validateConfig(raw){
  const cfg={...DEFAULT_CONFIG,...raw,channelPolicies:{...DEFAULT_CONFIG.channelPolicies,...raw?.channelPolicies}};
  if(typeof cfg.enabled!=='boolean'||cfg.entitlementKey!=='non_ai_full_v1'||!Number.isInteger(cfg.targetInvites)||cfg.targetInvites!==10||!Number.isInteger(cfg.reviewHours)||cfg.reviewHours<48||cfg.reviewHours>720||
    !/^[a-z0-9_-]{2,80}$/.test(cfg.campaignId)||typeof cfg.policyVersion!=='string'||cfg.policyVersion.length>80||!Number.isFinite(Date.parse(cfg.startsAt))||
    (cfg.endsAt!==null&&(!Number.isFinite(Date.parse(cfg.endsAt))||Date.parse(cfg.endsAt)<=Date.parse(cfg.startsAt)))||
    Object.values(cfg.channelPolicies).some(value=>!['PENDING','CONFIRMED','DISABLED'].includes(value)))throw Error('INVALID_NON_AI_CAMPAIGN_CONFIG');
  return cfg;
}
function getConfig(){try{return validateConfig(JSON.parse(fs.readFileSync(CONFIG_FILE,'utf8')));}catch{return validateConfig(DEFAULT_CONFIG);}}
function saveConfig(raw){const cfg=validateConfig(raw);fs.mkdirSync(path.dirname(CONFIG_FILE),{recursive:true});const tmp=CONFIG_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(cfg,null,2));fs.renameSync(tmp,CONFIG_FILE);return cfg;}
function ensureTables(db){
  policy.ensureTables(db);
  db.exec(`CREATE TABLE IF NOT EXISTS promotion_registered_verification(user_id INTEGER PRIMARY KEY,method TEXT NOT NULL,verified_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS promotion_learning_activation(user_id INTEGER PRIMARY KEY,status TEXT NOT NULL,evidence_ref TEXT NOT NULL,note_sha256 TEXT NOT NULL,reviewed_by TEXT NOT NULL,activated_at TEXT NOT NULL,reason TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS non_ai_invite_grants(user_id INTEGER NOT NULL,campaign_id TEXT NOT NULL,policy_version TEXT NOT NULL,entitlement_key TEXT NOT NULL,channels_json TEXT NOT NULL,granted_at TEXT NOT NULL,PRIMARY KEY(user_id,campaign_id));
    CREATE TABLE IF NOT EXISTS user_entitlements(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,entitlement_key TEXT NOT NULL,expire_at TEXT,source_order_no TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,entitlement_key));`);
}
function markVerifiedRegistration(db,userId,method){
  ensureTables(db);if(!['SMS','EMAIL'].includes(method))throw Error('INVALID_REGISTRATION_VERIFICATION');
  db.prepare('INSERT OR IGNORE INTO promotion_registered_verification(user_id,method,verified_at) VALUES(?,?,?)').run(Number(userId),method,new Date().toISOString());
}
// Only a trusted learning service or an audited reviewer calls this. A client
// reporting "completed=true" is never sufficient learning evidence.
function reviewLearningActivation(db,userId,evidence,operator,execution='LIVE'){
  if(execution!=='ISOLATED_TEST')throw Error('TRUSTED_LEARNING_RECEIPT_PIPELINE_REQUIRED');
  ensureTables(db);
  if(!operator||!['QUALIFIED','REJECTED','PENDING'].includes(evidence.status)||typeof evidence.evidenceRef!=='string'||!evidence.evidenceRef.trim()||evidence.evidenceRef.length>300||!/^[a-f0-9]{64}$/.test(evidence.noteSha256||''))throw Error('INVALID_LEARNING_EVIDENCE');
  if(!db.prepare('SELECT user_id FROM users WHERE user_id=?').get(Number(userId)))throw Error('USER_NOT_FOUND');
  const old=db.prepare('SELECT status,evidence_ref,note_sha256 FROM promotion_learning_activation WHERE user_id=?').get(Number(userId));
  if(old&&old.status===evidence.status&&old.evidence_ref===evidence.evidenceRef&&old.note_sha256===evidence.noteSha256)return {ok:true,duplicate:true};
  db.prepare(`INSERT INTO promotion_learning_activation(user_id,status,evidence_ref,note_sha256,reviewed_by,activated_at,reason) VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET status=excluded.status,evidence_ref=excluded.evidence_ref,note_sha256=excluded.note_sha256,reviewed_by=excluded.reviewed_by,activated_at=excluded.activated_at,reason=excluded.reason`)
    .run(Number(userId),evidence.status,evidence.evidenceRef,evidence.noteSha256,String(operator),new Date().toISOString(),String(evidence.reason||'').slice(0,300));
  db.prepare('INSERT INTO promotion_policy_audit(event,subject_id,operator,details,created_at) VALUES(?,?,?,?,?)').run('LEARNING_ACTIVATION_REVIEW',String(userId),String(operator),JSON.stringify(evidence),new Date().toISOString());
  return {ok:true};
}
function syncUser(db,userId,provided=getConfig(),now=Date.now(),execution='LIVE'){
  ensureTables(db);const cfg=validateConfig(provided);
  const columns=new Set(db.prepare('PRAGMA table_info(users)').all().map(row=>row.name));
  const status=columns.has('status')?'u.status':'NULL';
  const deleted=columns.has('deleted_at')?'u.deleted_at':'NULL';
  const entries=db.prepare(`SELECT r.invitee_id,r.invite_time,u.created_at,${status} user_status,${deleted} deleted_at,v.verified_at,a.status,a.activated_at,a.reason
    FROM user_invite_relation r JOIN users u ON u.user_id=r.invitee_id
    LEFT JOIN promotion_registered_verification v ON v.user_id=u.user_id
    LEFT JOIN promotion_learning_activation a ON a.user_id=u.user_id
    WHERE r.inviter_id=? AND r.level=1`).all(Number(userId));
  const unique=new Map();
  for(const entry of entries){if(unique.has(entry.invitee_id))continue;
    let reason='';
    const registration=Date.parse(String(entry.created_at||'').replace(' ','T')+(/Z|[+-]\d\d:\d\d$/.test(entry.created_at||'')?'':'Z'));
    const activation=Date.parse(entry.activated_at||'');
    if(Number(entry.invitee_id)===Number(userId)||!policy.canBindInvitation(db,entry.invitee_id,userId).ok)reason='SELF_OR_CYCLE';
    else if(entry.deleted_at||entry.user_status==='banned')reason='ACCOUNT_NOT_ELIGIBLE';
    else if(!Number.isFinite(registration)||registration<Date.parse(cfg.startsAt))reason='OUTSIDE_NEW_CAMPAIGN';
    else if(!entry.verified_at)reason='EXISTING_REGISTRATION_VERIFICATION_NOT_RECORDED';
    else if(entry.status==='REJECTED')reason=entry.reason||'LEARNING_REVIEW_REJECTED';
    else if(entry.status!=='QUALIFIED'||!Number.isFinite(activation))reason='LEARNING_REVIEW_PENDING';
    else if(now<Math.max(registration,activation)+cfg.reviewHours*3600000)reason='REVIEW_WINDOW';
    unique.set(entry.invitee_id,{inviteeId:entry.invitee_id,state:!reason?'EFFECTIVE':reason==='REVIEW_WINDOW'||reason==='LEARNING_REVIEW_PENDING'?'PENDING':'INELIGIBLE',reason});
  }
  const list=[...unique.values()],effective=list.filter(row=>row.state==='EFFECTIVE').length;
  const source=db.prepare('SELECT distribution_source,status FROM promotion_distribution_evidence WHERE user_id=?').get(Number(userId));
  const channel=source?.status==='VERIFIED'?source.distribution_source:'UNKNOWN';
  const confirmed=cfg.channelPolicies[channel]==='CONFIRMED';
  const launchApproved=execution==='ISOLATED_TEST'||process.env.NON_AI_INVITE_LIVE_APPROVED==='true';
  const active=launchApproved&&cfg.enabled&&now>=Date.parse(cfg.startsAt)&&(!cfg.endsAt||now<=Date.parse(cfg.endsAt));
  let granted=db.prepare('SELECT * FROM non_ai_invite_grants WHERE user_id=? AND campaign_id=?').get(Number(userId),cfg.campaignId);
  if(!granted&&active&&confirmed&&effective>=cfg.targetInvites){
    db.transaction(()=>{
      const inserted=db.prepare('INSERT OR IGNORE INTO non_ai_invite_grants(user_id,campaign_id,policy_version,entitlement_key,channels_json,granted_at) VALUES(?,?,?,?,?,?)')
        .run(Number(userId),cfg.campaignId,cfg.policyVersion,cfg.entitlementKey,JSON.stringify(Object.keys(cfg.channelPolicies).filter(key=>cfg.channelPolicies[key]==='CONFIRMED')),new Date(now).toISOString());
      if(inserted.changes)db.prepare('INSERT INTO user_entitlements(user_id,entitlement_key,expire_at,source_order_no) VALUES(?,?,NULL,?) ON CONFLICT(user_id,entitlement_key) DO NOTHING')
        .run(Number(userId),cfg.entitlementKey,'invite-campaign:'+cfg.campaignId);
    }).immediate();
    granted=db.prepare('SELECT * FROM non_ai_invite_grants WHERE user_id=? AND campaign_id=?').get(Number(userId),cfg.campaignId);
  }
  return {enabled:active,policyStatus:launchApproved?'REQUIRES_CONFIRMED_CHANNEL':'DRAFT_NOT_LAUNCHED',policyVersion:cfg.policyVersion,campaignId:cfg.campaignId,name:cfg.name,effectiveInvites:effective,pendingInvites:list.filter(row=>row.state==='PENDING').length,targetInvites:cfg.targetInvites,granted:!!granted,channelPolicy:confirmed?'CONFIRMED':'PENDING',scope:cfg.scope,excluded:cfg.excluded,invites:list};
}
function accessForUser(db,userId,channel){
  ensureTables(db);
  const mapped=['default','internal'].includes(String(channel))?'COMPANY_DIRECT':channel==='google'?'STORE_GOOGLE':String(channel).startsWith('ios')?'STORE_APPLE':'STORE_DOMESTIC';
  const grant=db.prepare('SELECT * FROM non_ai_invite_grants WHERE user_id=? AND entitlement_key=? ORDER BY granted_at LIMIT 1').get(Number(userId),'non_ai_full_v1');
  const right=db.prepare("SELECT entitlement_key FROM user_entitlements WHERE user_id=? AND entitlement_key='non_ai_full_v1' AND (expire_at IS NULL OR expire_at>?)").get(Number(userId),new Date().toISOString());
  let channels=[];try{channels=JSON.parse(grant?.channels_json||'[]');}catch{}
  const allowed=!!grant&&!!right&&channels.includes(mapped);
  return {key:'non_ai_full_v1',granted:!!grant,active:allowed,channel:mapped,allowedChannels:channels,permanent:!!grant,policyVersion:grant?.policy_version||DEFAULT_CONFIG.policyVersion,
    campaignStatus:process.env.NON_AI_INVITE_LIVE_APPROVED==='true'?'REQUIRES_CONFIRMED_CHANNEL':'DRAFT_NOT_LAUNCHED',features:allowed?['anatomy3d','classic-reading','herb-point-search','course-notes','review-notes','offline-learning','local-diagnosis-study']:[],aiCreditsGranted:0,membershipLevelChanged:false};
}
module.exports={DEFAULT_CONFIG,validateConfig,getConfig,saveConfig,ensureTables,markVerifiedRegistration,reviewLearningActivation,syncUser,accessForUser};
