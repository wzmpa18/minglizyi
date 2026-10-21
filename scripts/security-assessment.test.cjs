'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { EventEmitter } = require('node:events');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const { createSecurityAudit } = require('../backend_deploy/securityAudit');
const { createBusinessIdentityGate, publicRequest } = require('../backend_deploy/businessIdentityGate');
const { collectPublicText } = require('../backend_deploy/publicTextGuard');
function adapt(raw) { return {exec:sql=>raw.exec(sql),prepare:sql=>raw.prepare(sql),transaction:fn=>(...args)=>{raw.exec('BEGIN IMMEDIATE');try{const result=fn(...args);raw.exec('COMMIT');return result;}catch(e){raw.exec('ROLLBACK');throw e;}}}; }
test('journal persists, never truncates at 1000, rejects UPDATE/DELETE and has reproducible chain',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'yandao-security-')),file=path.join(dir,'audit.sqlite');let raw=new DatabaseSync(file);
 try{
  const audit=createSecurityAudit({db:adapt(raw),now:()=>new Date('2026-10-21T00:00:00Z')});
  for(let i=0;i<1005;i++)audit.append({actor:'100000',kind:'request_completed',route:'/api/test?token=never-retain',status:401,password:'never-retain',body:'never-retain'});
  assert.equal(audit.status().count,1005);assert.equal(audit.status().historicalBackfill,false);
  assert.throws(()=>raw.exec('DELETE FROM security_events'));assert.throws(()=>raw.exec("UPDATE security_events SET actor='x'"));
  let prev='0'.repeat(64);for(const row of raw.prepare('SELECT * FROM security_events ORDER BY id').all()){
   assert.equal(row.previous_hash,prev);const {id,event_hash,...entry}=row;assert.equal(event_hash,crypto.createHash('sha256').update(JSON.stringify(entry)).digest('hex'));prev=event_hash;
  }
  assert.ok(!JSON.stringify(audit.list()).includes('never-retain'));raw.close();raw=new DatabaseSync(file);
  const reopened=createSecurityAudit({db:adapt(raw)});assert.equal(reopened.status().count,1005);assert.equal(reopened.verify().valid,true);
  raw.exec('DROP TRIGGER security_events_no_update');raw.exec("UPDATE security_events SET actor='tampered' WHERE id=1");assert.equal(reopened.verify().valid,false);
 }finally{raw.close();fs.rmSync(dir,{recursive:true,force:true});}
});
function fixture(){
 const events=[],users={verified:{phone:'13800000001',phone_verified_at:'2026-10-21',status:'active'},email:{phone:null},stored:{phone:'13800000002'},banned:{phone:'13800000001',phone_verified_at:'x',status:'banned'}};
 const gate=createBusinessIdentityGate({verifyToken:h=>h?.startsWith('Bearer ')?{userId:h.slice(7)}:null,getUser:id=>users[id],resolveAdminKey:t=>t==='admin'?{role:'SUPER_ADMIN'}:null,journal:{append:e=>events.push(e)}});
 function invoke(route,token='',method='GET'){
  const req={path:route,method,headers:{authorization:token?'Bearer '+token:''},socket:{remoteAddress:'127.0.0.1'}},res=new EventEmitter();let next=false;
  res.status=n=>{res.statusCode=n;return res;};res.json=b=>{res.body=b;res.emit('finish');return res;};gate(req,res,()=>{next=true;});return {next,res,req};
 }
 return {invoke,events};
}
test('anonymous, missing accounts and unverified stored phone cannot access every business namespace',()=>{
 const {invoke}=fixture();for(const route of ['/api/ai/chat','/api/social/posts','/api/study-comments/target/test','/api/auth/records/list','/api/payment/create','/api/academy/starter-content','/api/new-future-feature']){
  assert.equal(invoke(route).res.statusCode,401);assert.equal(invoke(route,'missing').res.statusCode,403);
  assert.equal(invoke(route,'email').res.body.code,'PHONE_VERIFICATION_REQUIRED');assert.equal(invoke(route,'stored').res.body.code,'PHONE_VERIFICATION_REQUIRED');
  assert.equal(invoke(route,'banned').res.body.code,'ACCOUNT_UNAVAILABLE');assert.equal(invoke(route,'verified').next,true);
 }
});
test('admin identity is separate; nested admin paths cannot be used by users',()=>{
 const {invoke}=fixture();for(const route of ['/api/admin/security/events','/api/social/admin/review']){assert.equal(invoke(route,'verified').res.statusCode,401);assert.equal(invoke(route,'admin').next,true);}
});
test('exceptions are exact and method bound; callbacks are not broad auth bypasses',()=>{
 assert.equal(publicRequest('POST','/api/payment/callback/wechat'),true);
 for(const p of ['/api/payment/callback/wechat/other','/api/auth/profile/update','/api/public/unknown'])assert.equal(publicRequest('POST',p),false);
 assert.equal(publicRequest('GET','/api/payment/callback/wechat'),false);
 const {invoke}=fixture();assert.equal(invoke('/api/auth/profile','stored').next,true);assert.equal(invoke('/api/auth/verify-phone','stored','POST').next,true);
});
test('audit/database failures stop business operations and auth attempts are throttled',()=>{
 const gate=createBusinessIdentityGate({journal:{append(){throw Error('disk full');}}});const res={status(n){this.statusCode=n;return this;},json(b){this.body=b;}};
 gate({path:'/api/new',method:'GET'},res,()=>assert.fail('must not execute'));assert.equal(res.statusCode,503);
 const {invoke}=fixture();for(let i=0;i<20;i++)assert.equal(invoke('/api/auth/login','','POST').next,true);assert.equal(invoke('/api/auth/login','','POST').res.statusCode,429);
});
test('content scan excludes secrets and private health objects',()=>{
 assert.deepEqual(collectPublicText({content:'学习经典',password:'secret',health:{content:'private'},messages:[{content:'private'}],tags:['学习']}),['学习经典','学习']);
 const {localFlags}=require('../backend_deploy/studyCommentSafety');assert.ok(localFlags('煽\u200b动 颠覆国家政权').length);assert.ok(localFlags('保证治愈').length);assert.equal(localFlags('学习古籍，尊重不同观点').length,0);
 const {sanitizeAdminData}=require('../backend_deploy/adminPrivacy');assert.equal(sanitizeAdminData({password:'private'}).password,'[REDACTED]');
});

test('public Android metadata never offers a sideload APK to Google or iOS',()=>{
 let handler;const sandbox={module:{exports:{}},__dirname:path.resolve('backend_deploy'),process:{env:{}},console,require:name=>name==='express'?{Router:()=>({get:(_route,h)=>{handler=h}})}:require(name)};
 require('node:vm').runInNewContext(fs.readFileSync('backend_deploy/appVersionRoutes.js','utf8'),sandbox);
 const invoke=headers=>{let result;handler({headers,query:{}},{json:value=>{result=value}});return result.data};
 const google=invoke({'x-store-channel':'google'}),ios=invoke({'x-client-platform':'ios'}),web=invoke({});
 assert.equal(google.downloadUrl,'');assert.equal(google.latestVersionCode,0);assert.equal(google.forceUpdate,false);assert.ok(google.downloadPage.startsWith('https://play.google.com/'));
 assert.equal(ios.downloadUrl,'');assert.equal(ios.forceUpdate,false);assert.ok(web.downloadUrl.endsWith('.apk'));
});
