'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const express=require('express');
const policy=require('../backend_deploy/announcementPolicy');
const {createAnnouncementRouter,normalizeNotice}=require('../backend_deploy/announcementRoutes');
const {createBusinessIdentityGate,publicRequest}=require('../backend_deploy/businessIdentityGate');
const now=Date.parse('2026-10-27T04:00:00Z');
const context={channel:'google',platform:'android',version:'25.0.119'};
function body(overrides={}){return {title:'原典学习提示',content:'学习笔记可以在本机保存，请结合原文复习。',kind:'learning',level:'info',channels:['google','ios-full-learning','default'],platforms:['web','android','ios'],minVersion:'25.0.119',maxVersion:'25.0.119',publishAt:'2026-10-26T00:00:00Z',expiresAt:'2026-11-01T00:00:00Z',reviewApproved:true,reviewReference:'company-content-note-001',published:true,...overrides};}
function notice(overrides={}){return normalizeNotice(body(overrides),null,now);}
function loadDisplay(){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/lib/noticeDisplay.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,require:name=>{if(name==='../../backend_deploy/announcementPolicy')return policy;throw Error(name);}});return exports;}
function storage(){const rows=new Map();return {rows,getItem:key=>rows.get(key)||null,setItem:(key,value)=>rows.set(key,value)};}
async function server(initial,run){
 let rows=structuredClone(initial);const writes=[];
 const app=express();app.use(express.json({limit:'16kb'}));
 app.use(createBusinessIdentityGate({verifyToken:token=>token==='Bearer ordinary'?{userId:42}:null,getUser:()=>({auth_version:0}),resolveAdminKey:token=>token==='admin-test-key'?{role:'CONTENT_ADMIN'}:null,journal:{append(){}}}));
 app.use('/api/announcements',createAnnouncementRouter({readAll:()=>structuredClone(rows),writeAll:value=>{rows=structuredClone(value);writes.push(structuredClone(value));},verifyAdmin:req=>req.admin?.role==='CONTENT_ADMIN',now:()=>now}));
 const listener=app.listen(0,'127.0.0.1');await new Promise(resolve=>listener.once('listening',resolve));
 const request=async(url,method='GET',value,headers={})=>{const response=await fetch(`http://127.0.0.1:${listener.address().port}${url}`,{method,headers:{'X-Store-Channel':context.channel,'X-Client-Platform':context.platform,'X-Client-Version':context.version,...(value?{'Content-Type':'application/json'}:{}),...headers},body:value?JSON.stringify(value):undefined});return {status:response.status,headers:response.headers,json:await response.json()};};
 try{await run(request,()=>rows,writes);}finally{await new Promise(resolve=>listener.close(resolve));}
}
test('only reviewed pure text learning/service notices match explicit channel, platform, version and window',()=>{
 const item=notice();assert.equal(item.popup,false);assert.equal(policy.eligibleNotice(item,context,now),true);
 for(const patch of [{schema:undefined},{published:false},{kind:'cash'},{channels:['tencent']},{platforms:['ios']},{minVersion:'25.0.120'},{maxVersion:'25.0.118'},{publishAt:'2026-10-28T00:00:00Z'},{expiresAt:'2026-10-27T00:00:00Z'},{review:{...item.review,revision:0}},{review:{...item.review,status:'DRAFT'}}])assert.equal(policy.eligibleNotice({...item,...patch},context,now),false);
 for(const content of ['<a>学习</a>','详情https://example.test','邀请十人解锁会员','官网购买会员','现金返佣15%','审核后开启隐藏功能'])assert.ok(policy.noticeError(notice({content})),content);
});
test('published content updates require review of the exact revision; old originals stay in history',()=>{
 const old=notice(),changed=normalizeNotice(body({content:'新增一段学习复习提示。',reviewApproved:false}),old,now+1000);
 assert.equal(changed.revision,2);assert.equal(changed.review.status,'DRAFT');assert.equal(changed.history[0].content,old.content);assert.equal(policy.eligibleNotice(changed,context,now),false);
 const severity=normalizeNotice(body({level:'urgent',reviewApproved:false}),old,now);assert.equal(severity.revision,2);assert.equal(severity.review.status,'DRAFT');
 const dto=policy.publicNotice(old);assert.equal(dto.review.reference,'公司内容审核已留证');assert.equal('_noticeFingerprint' in dto,false);assert.equal('history' in dto,false);
});
test('real identity gate plus router allows only anonymous public GET and does not let query unlock cash or another scope',async()=>{
 const legacy={id:'old',title:'旧公告',content:'旧资料原文',published:true,link:'https://old.invalid'};
 await server([legacy,notice()],async(request,rows,writes)=>{
  const result=await request('/api/announcements/public?channel=default&version=99.0.0&role=reviewer');assert.equal(result.status,200);assert.equal(result.json.total,1);assert.match(result.headers.get('cache-control'),/no-store/);assert.equal(result.json.announcements[0].review.reference,'公司内容审核已留证');
  assert.equal((await request('/api/announcements/public','GET',null,{'X-Store-Channel':'huawei'})).json.total,0);
  assert.equal((await request('/api/announcements/public','POST',body())).status,401);
  assert.equal((await request('/api/announcements/public/other')).status,401);
  assert.equal((await request('/api/announcements')).status,401);
  assert.equal((await request('/api/announcements','GET',null,{authorization:'Bearer ordinary'})).status,401);
  assert.deepEqual(rows()[0],legacy);assert.equal(writes.length,0);
 });
 assert.equal(publicRequest('GET','/api/announcements/public'),true);assert.equal(publicRequest('HEAD','/api/announcements/public'),false);
});
test('company content admin can save a default disabled draft; marketing or missing scope cannot publish',async()=>{
 await server([],async(request,rows)=>{
  const auth={authorization:'Bearer admin-test-key'};
  const draft=await request('/api/announcements','POST',body({published:false,reviewApproved:false,popup:undefined}),auth);assert.equal(draft.status,200);assert.equal(draft.json.data.popup,false);assert.equal(draft.json.data.published,false);assert.equal(draft.json.data.review.status,'DRAFT');
  for(const value of [body({content:'邀请注册送现金'}),body({channels:[]}),body({expiresAt:''}),body({reviewApproved:false})])assert.equal((await request('/api/announcements','POST',value,auth)).status,400);
  assert.equal(rows().length,1);assert.equal((await request('/api/announcements/public')).json.total,0);
 });
});
test('admin editing and archiving retains old raw rows and previous text instead of deleting records',async()=>{
 const legacy={id:'old',title:'旧标题',content:'旧原件',published:true,link:'https://old.invalid',custom:'原始字段'};
 await server([legacy,notice()],async(request,rows)=>{
  const auth={authorization:'Bearer admin-test-key'};
  assert.equal((await request('/api/announcements/old','PUT',body({published:false,reviewApproved:false}),auth)).status,200);
  assert.deepEqual(rows()[0].history[0],legacy);
  const id=rows()[1].id;assert.equal((await request('/api/announcements/'+id,'DELETE',null,auth)).status,200);assert.equal(rows().length,2);assert.equal(rows()[1].published,false);assert.equal(rows()[1].content,'学习笔记可以在本机保存，请结合原文复习。');
 });
});
test('cold start is opt-in, once per day and remembers exact notice revisions without blocking manual access',()=>{
 const api=loadDisplay(),store=storage(),item=notice({popup:true});
 assert.equal(api.startupNotice([notice()],context,store,now),null);assert.equal(api.startupNotice([item],context,store,now).id,item.id);
 assert.equal(api.markNoticeShown(store,now),true);assert.equal(api.startupNotice([item],context,store,now+100),null);
 api.rememberNotice(item,context,store);assert.equal(api.startupNotice([item],context,store,now+86400001),null);
 const next={...item,revision:2,review:{...item.review,revision:2}};assert.equal(api.startupNotice([next],context,store,now+86400001).revision,2);
 const broken={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};assert.equal(api.startupNotice([item],context,broken,now),null);assert.equal(api.markNoticeShown(broken,now),false);assert.doesNotThrow(()=>api.rememberNotice(item,context,broken));
});
