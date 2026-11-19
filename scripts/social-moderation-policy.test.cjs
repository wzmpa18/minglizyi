'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createSelectedTextModerator}=require('../backend_deploy/socialModerationPolicy');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');

test('normal social text sends immediately without consent version or third-party screening',async()=>{
 let externalCalls=0,audits=[];
 const moderate=createSelectedTextModerator({
  screen:async()=>{externalCalls++;throw Error('must not run');},
  audit:async row=>audits.push(row),
 });
 const result=await moderate('讨论节气原文',{userId:'ACCOUNT_CANARY'});
 assert.equal(result.status,'active');
 assert.equal(result.model,'platform-local');
 assert.equal(externalCalls,0);
 assert.equal(audits.length,1);
 assert.equal(audits[0].contentHash,hash('讨论节气原文'));
 assert.ok(!JSON.stringify(audits).includes('讨论节气原文'));
});

test('local mainland-sensitive rules block prohibited text without an AI call',async()=>{
 const moderate=createSelectedTextModerator({screen:async()=>{throw Error('must not run');},audit:async()=>{}});
 for(const text of ['出售毒品','组织赌博博彩','发送色情网盘','宣扬恐怖主义','鼓吹台独']){
  const result=await moderate(text,{userId:'1'});
  assert.equal(result.status,'rejected',text);
  assert.equal(result.model,'platform-local');
 }
 assert.equal((await moderate('正常学习交流',{userId:'1'})).status,'active');
});

test('empty text and missing account remain unavailable',async()=>{
 const moderate=createSelectedTextModerator({audit:async()=>{}});
 assert.equal((await moderate(' ',{userId:'1'})).status,'pending');
 assert.equal((await moderate('正常文字',{})).status,'pending');
});
