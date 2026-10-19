'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const {screenPublicComment,interpret,localFlags}=require('../backend_deploy/studyCommentSafety');
const {createStudyCommentStore}=require('../backend_deploy/studyCommentStore');
const env={TMS_SECRET_ID:'synthetic-test-id',TMS_SECRET_KEY:'synthetic-test-key',STUDY_TMS_PRIVACY_READY:'true'};
test('political/violent context is flagged for contextual review without treating academic quotation as a verdict',()=>{
 assert.deepEqual(localFlags('学习二十四节气与古代历法。'),[]);
 assert.ok(localFlags('历史课讨论“民族仇恨”的危害。').includes('POLITY_CONTEXT'));
 assert.ok(localFlags('讨论民\u200b族 仇恨的危害。').includes('POLITY_CONTEXT'));
});
test('only exact complete provider results with Polity coverage can receive machine Pass',()=>{
 assert.equal(interpret({}).decision,'UNAVAILABLE');
 assert.equal(interpret({Response:{Suggestion:'Pass',RequestId:'synthetic-1'}}).decision,'REVIEW');
 for(const [suggestion,decision] of [['Pass','PASS'],['Review','REVIEW'],['Block','BLOCK'],['unknown','UNAVAILABLE']])assert.equal(interpret({Response:{Suggestion:suggestion,RequestId:'synthetic-1',DetailResults:[{Label:'Polity',Suggestion:suggestion}]}}).decision,decision);
 assert.equal(interpret({Response:{Suggestion:'Pass',RequestId:'synthetic-1',DetailResults:[{Label:'Polity',Suggestion:'Block'}]}}).decision,'BLOCK');
});
test('missing dedicated credentials, provider failures and misleading pass results cannot become publication',async()=>{
 let requests=0;
 const absent=await screenPublicComment('正常学习留言',{env:{COS_SECRET_ID:'must-not-reuse',COS_SECRET_KEY:'must-not-reuse'},request:async()=>{requests++;}});assert.equal(absent.decision,'UNAVAILABLE');assert.equal(requests,0);
 const failed=await screenPublicComment('正常学习留言',{env,request:async()=>{throw Error('synthetic error');}});assert.equal(failed.decision,'UNAVAILABLE');
 let payload;
 const pass=await screenPublicComment('正常学习留言',{env,request:async body=>{payload=body;return {Response:{Suggestion:'Pass',RequestId:'synthetic-1',DetailResults:[{Label:'Polity',Suggestion:'Pass'}]}};}});assert.equal(pass.decision,'PASS');assert.deepEqual(Object.keys(payload).sort(),['BizType','Content','DataId','SourceLanguage','Type']);assert.equal(Buffer.from(payload.Content,'base64').toString('utf8'),'正常学习留言');assert.ok(!JSON.stringify(pass).includes('synthetic-test-key'));
 const flagged=await screenPublicComment('历史课讨论民族仇恨的危害',{env,request:async()=>({Response:{Suggestion:'Pass',RequestId:'synthetic-1',DetailResults:[{Label:'Polity',Suggestion:'Pass'}]}})});assert.equal(flagged.decision,'REVIEW');
});
test('human confirmation is per item; blocked content stays private even after a failed recheck and cannot be revived after user removal',()=>{
 const d=new DatabaseSync(':memory:'),s=createStudyCommentStore(d,new Set(['tool:ziwei']));s.setConfig('admin',{enabled:true});
 try{const posted=s.submit('tool:ziwei','alice','合成学习者',{content:'如何理解传统历法中的节气？',requestId:crypto.randomUUID()}),input=s.safetyInput(posted.id);
 assert.throws(()=>s.review(posted.id,'admin',{status:'APPROVED',note:'已阅读'}),/逐条/);
 const result={fingerprint:input.content_hash,provider:'tencent-tms',decision:'BLOCK',reason:'合成拦截结果',requestId:'synthetic-1'};s.recordSafety(posted.id,result);assert.equal(s.list('tool:ziwei').length,0);assert.equal(s.queue().blocked.length,1);
 assert.throws(()=>s.review(posted.id,'admin',{status:'APPROVED',note:'不可绕过机器拦截',safetyConfirmed:true}),/不能直接公开/);
 s.recordSafety(posted.id,{...result,decision:'UNAVAILABLE'});assert.equal(s.queue().blocked[0].safety.decision,'BLOCK');
 s.recordSafety(posted.id,{...result,decision:'PASS'});assert.equal(s.queue().comments.length,1);assert.equal(s.list('tool:ziwei').length,0);
 s.review(posted.id,'admin',{status:'APPROVED',note:'合成资料已逐条复核',safetyConfirmed:true});assert.equal(s.list('tool:ziwei').length,1);
 s.remove(posted.id,'alice');assert.equal(s.recordSafety(posted.id,{...result,decision:'PASS'}).success,false);assert.equal(s.list('tool:ziwei').length,0);
 }finally{d.close();}
});
