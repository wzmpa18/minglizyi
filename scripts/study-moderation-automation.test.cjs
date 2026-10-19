'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{DatabaseSync}=require('node:sqlite'),crypto=require('node:crypto');
const {VERSION,CATEGORIES,interpretAI,requestAI,automationCapability,createAutomaticModerator}=require('../backend_deploy/studyModerationAutomation');
const {createStudyCommentStore}=require('../backend_deploy/studyCommentStore');
const env={STUDY_COMMENT_AUTOMATION:'true',STUDY_AI_MODERATION_READY:'true',HUNYUAN_API_KEY:'synthetic-only',STUDY_AI_MODERATION_DAILY_LIMIT:'2'};
const verdict=(change={})=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({decision:'ALLOW',confidence:0.99,needs_context:false,topic_learning:true,categories:Object.fromEntries(CATEGORIES.map(k=>[k,'CLEAR'])),...change})}}]});
test('automated approval needs every category, complete JSON, high certainty and no conflicting category',()=>{
 assert.equal(automationCapability({HUNYUAN_API_KEY:'synthetic'}).configured,false);
 assert.equal(automationCapability({...env,HUNYUAN_API_URL:'https://untrusted.example'}).configured,false);
 assert.equal(interpretAI(verdict()).decision,'PASS');
 for(const r of [null,{choices:[{finish_reason:'length',message:{content:'PASS'}}]},verdict({extra:'instruction'}),verdict({confidence:0.97}),verdict({needs_context:true}),verdict({topic_learning:false}),verdict({categories:{political_illegality:'CLEAR'}})])assert.notEqual(interpretAI(r).decision,'PASS');
 assert.equal(interpretAI(verdict({categories:{...Object.fromEntries(CATEGORIES.map(k=>[k,'CLEAR'])),privacy:'RISK'}})).decision,'BLOCK');
 assert.notEqual(interpretAI({choices:[{finish_reason:'stop',message:{content:'```json\n{"decision":"ALLOW"}\n```'}}]}).decision,'PASS');
});
test('no external call without consent; cache is bounded by text/name/policy; daily budget persists across moderator recreation',async()=>{
 const db=new DatabaseSync(':memory:');let calls=0;
 const request=async()=>{calls++;return verdict();},m=createAutomaticModerator(db,{env,request});
 const input={content:'请讨论节气原文的含义',displayName:'学习者'};
 assert.equal((await m.screen(input)).decision,'UNAVAILABLE');assert.equal(calls,0);
 input.moderationVersion=VERSION;
 assert.equal((await m.screen(input)).automatic,true);assert.equal(calls,1);
 await m.screen(input);assert.equal(calls,1);
 await m.screen({...input,displayName:'另一化名'});assert.equal(calls,2);
 assert.equal((await createAutomaticModerator(db,{env,request}).screen({...input,content:'新的学习问题'})).decision,'UNAVAILABLE');assert.equal(calls,2);
 const stored=JSON.stringify(db.prepare('SELECT * FROM study_moderation_cache').all());assert.ok(!stored.includes(input.content));assert.ok(!stored.includes(input.displayName));db.close();
});
test('rules detect obfuscated identity before AI and a model pass cannot cancel contextual risks; transport failures stay held',async()=>{
 const db=new DatabaseSync(':memory:');let calls=0;const m=createAutomaticModerator(db,{env:{...env,STUDY_AI_MODERATION_DAILY_LIMIT:'10'},request:async()=>{calls++;return verdict();}});
 const input={displayName:'学习者',moderationVersion:VERSION};
 for(const content of ['电话１３８１２３４５６７８','电\u200b话1 3 8 1 2 3 4 5 6 7 8','姓名：某人','自行针刺'])assert.equal((await m.screen({...input,content})).decision,'BLOCK');assert.equal(calls,0);
 const context=await m.screen({...input,content:'历史课分析民族仇恨的危害'});assert.equal(context.decision,'REVIEW');assert.equal(context.automatic,false);
 const failed=await createAutomaticModerator(db,{env,request:async()=>{throw Error('never print this provider error');}}).screen({...input,content:'如何核对其他章节'});assert.equal(failed.decision,'UNAVAILABLE');assert.ok(!failed.reason.includes('provider error'));db.close();
});
test('public payload omits identity, uses fixed provider, bounded output, no redirects or tools',async()=>{
 let body,options,url;const r=await requestAI('仅公开文字','公开化名',{env,fetcher:async(u,o)=>{url=u;options=o;body=JSON.parse(o.body);return new Response(JSON.stringify(verdict()),{status:200});}});
 assert.equal(interpretAI(r).decision,'PASS');assert.equal(url,'https://tokenhub.tencentmaas.com/v1/chat/completions');assert.equal(options.redirect,'error');assert.equal(body.max_tokens,512);assert.equal(body.stream,false);assert.equal(body.tools,undefined);
 assert.deepEqual(JSON.parse(body.messages[1].content),{public_text:'仅公开文字',public_display_name:'公开化名'});
 assert.equal(await requestAI('文字','化名',{env,fetcher:async()=>new Response('x'.repeat(70000))}),null);
});
test('database publishes only consented verified passes; report, block, delete, failed recheck and stale fingerprint cannot revive a post',async()=>{
 const db=new DatabaseSync(':memory:');let now=Date.UTC(2026,9,19);const s=createStudyCommentStore(db,new Set(['tool:ziwei']),()=>now,{moderationEnv:{...env,STUDY_AI_MODERATION_DAILY_LIMIT:'10'},moderationRequest:async()=>verdict()});s.setConfig('owner',{enabled:true});
 const post=(user,content,consent=true)=>s.submit('tool:ziwei',user,'学习者',{content,requestId:crypto.randomUUID(),...(consent?{moderationConsentVersion:VERSION}:{})});
 const first=post('a','如何对照节气原文？'),input=s.safetyInput(first.id),pass=await s.automaticScreen(input);s.recordSafety(first.id,pass);assert.equal(s.list('tool:ziwei').length,1);
 s.report(first.id,'b','复核原文版本');assert.equal(s.list('tool:ziwei').length,0);s.recordSafety(first.id,pass);assert.equal(s.list('tool:ziwei').length,0);
 const legacy=post('b','请讨论另一章节',false);s.recordSafety(legacy.id,{...pass,fingerprint:s.safetyInput(legacy.id).content_hash});assert.equal(s.list('tool:ziwei').length,0);
 now+=31000;const second=post('a','如何核对第三章节？'),secondPass=await s.automaticScreen(s.safetyInput(second.id));s.recordSafety(second.id,secondPass);assert.equal(s.list('tool:ziwei').length,1);
 s.recordSafety(second.id,{...secondPass,decision:'UNAVAILABLE',automatic:false});assert.equal(s.list('tool:ziwei').length,0);
 s.recordSafety(second.id,{...secondPass,fingerprint:'stale'});assert.equal(s.list('tool:ziwei').length,0);
 s.recordSafety(second.id,{...secondPass,decision:'BLOCK',automatic:false});s.recordSafety(second.id,secondPass);assert.equal(s.list('tool:ziwei').length,0);
 s.remove(second.id,'a');assert.equal(s.recordSafety(second.id,secondPass).success,false);assert.equal(s.list('tool:ziwei').length,0);db.close();
});
