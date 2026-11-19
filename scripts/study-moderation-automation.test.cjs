'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{DatabaseSync}=require('node:sqlite'),crypto=require('node:crypto');
const {VERSION,automationCapability,createAutomaticModerator}=require('../backend_deploy/studyModerationAutomation');
const {createStudyCommentStore}=require('../backend_deploy/studyCommentStore');

test('local moderation has no consent, quota, timeout or third-party dependency',async()=>{
 const db=new DatabaseSync(':memory:');
 const cap=automationCapability({});
 assert.equal(cap.provider,'platform-local');
 assert.equal(cap.configured,true);
 assert.equal(cap.dailyLimit,0);
 let externalCalls=0;
 const moderator=createAutomaticModerator(db,{request:async()=>{externalCalls++;throw Error('must not run');}});
 const pass=await moderator.screen({content:'一起核对节气原文',displayName:'学习者'});
 assert.equal(pass.decision,'PASS');
 assert.equal(pass.automatic,true);
 assert.equal(pass.policyVersion,VERSION);
 assert.equal(externalCalls,0);
 db.close();
});

test('local moderation blocks prohibited content and identity/contact leaks',async()=>{
 const db=new DatabaseSync(':memory:'),moderator=createAutomaticModerator(db);
 for(const content of ['出售毒品','组织赌博','鼓吹港独','电话１３８１２３４５６７８','姓名：某人','自行针刺']){
  assert.equal((await moderator.screen({content,displayName:'学习者'})).decision,'BLOCK',content);
 }
 db.close();
});

test('study comments publish normal text without a consent field and keep report/delete protections',async()=>{
 const db=new DatabaseSync(':memory:');let now=Date.UTC(2026,10,19);
 const store=createStudyCommentStore(db,new Set(['tool:ziwei']),()=>now);
 store.setConfig('owner',{enabled:true});
 const first=store.submit('tool:ziwei','a','学习者',{content:'如何对照节气原文？',requestId:crypto.randomUUID()});
 const input=store.safetyInput(first.id),pass=await store.automaticScreen(input);
 store.recordSafety(first.id,pass);
 assert.equal(store.list('tool:ziwei').length,1);
 store.report(first.id,'b','请平台核对');
 assert.equal(store.list('tool:ziwei').length,0);
 now+=31000;
 const second=store.submit('tool:ziwei','a','学习者',{content:'如何核对第三章节？',requestId:crypto.randomUUID()});
 store.recordSafety(second.id,await store.automaticScreen(store.safetyInput(second.id)));
 assert.equal(store.list('tool:ziwei').length,1);
 store.remove(second.id,'a');
 assert.equal(store.list('tool:ziwei').length,0);
 db.close();
});
