const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createSelectedTextModerator}=require('../backend_deploy/socialModerationPolicy');
const {VERSION}=require('../backend_deploy/studyModerationAutomation');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
test('collaboration screening requires per-send consent; model sees only text and generic label, and audit must succeed before publication',async()=>{
 let calls=0,audits=[];const moderate=createSelectedTextModerator({screen:async input=>{calls++;assert.deepEqual(Object.keys(input).sort(),['content','displayName','moderationVersion']);assert.equal(input.displayName,'学习者');assert.ok(!JSON.stringify(input).includes('ACCOUNT_CANARY'));return {decision:'PASS',automatic:true,flags:[],policyVersion:VERSION,fingerprint:hash(input.content)};},audit:async row=>audits.push(row)});
 assert.equal((await moderate('讨论节气',{userId:'ACCOUNT_CANARY'})).status,'pending');assert.equal(calls,0);
 assert.equal((await moderate('讨论节气',{userId:'ACCOUNT_CANARY',moderationVersion:VERSION})).status,'active');assert.equal(calls,1);assert.equal(audits[0].userId,'ACCOUNT_CANARY');assert.equal(audits[0].contentHash,hash('讨论节气'));assert.ok(!JSON.stringify(audits).includes('讨论节气'));
 const auditFailure=createSelectedTextModerator({screen:async input=>({decision:'PASS',automatic:true,flags:[],policyVersion:VERSION,fingerprint:hash(input.content)}),audit:async()=>{throw Error('database not writable');}});assert.equal((await auditFailure('学习',{userId:'1',moderationVersion:VERSION})).status,'pending');
});
test('PASS-like strings, wrong policy/hash, unclear or rule-conflicting results cannot activate collaboration',async()=>{
 for(const result of ['PASS',{decision:'PASS'}, {decision:'PASS',automatic:true,flags:[],policyVersion:VERSION,fingerprint:'wrong'},{decision:'PASS',automatic:true,flags:['MEDICAL_RISK'],policyVersion:VERSION,fingerprint:hash('学习')},{decision:'REVIEW',automatic:false,flags:[],policyVersion:VERSION,fingerprint:hash('学习')}]){
  const moderate=createSelectedTextModerator({screen:async()=>result,audit:async()=>{}});assert.equal((await moderate('学习',{userId:'1',moderationVersion:VERSION})).status,'pending');
 }
 const block=createSelectedTextModerator({screen:async()=>({decision:'BLOCK',policyVersion:VERSION,fingerprint:hash('学习')}),audit:async()=>{}});assert.equal((await block('学习',{userId:'1',moderationVersion:VERSION})).status,'rejected');
});
