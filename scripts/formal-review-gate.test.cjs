const {test}=require('node:test'),assert=require('node:assert/strict');
const {validateReadiness,guardAscMutation,CHECKS}=require('./lib/formalReviewGate.cjs');
test('formal review mutations fail closed while internal testing and read-only checks remain available',()=>{
 for(const url of ['/v1/reviewSubmissions','/v1/reviewSubmissions/id','/v1/reviewSubmissionItems','/v1/appStoreVersionSubmissions'])assert.throws(()=>guardAscMutation('POST',url),/禁止正式提审/);
 guardAscMutation('GET','/v1/reviewSubmissions');guardAscMutation('POST','/v1/builds/id/relationships/betaGroups');
 const complete={scope:'com.yandaoguoxue.app',overallComplete:true,candidateSource:'a'.repeat(40),checks:CHECKS.map(id=>({id,status:'PASS',evidence:'verified-specific-proof.json'}))};
 assert.equal(validateReadiness(complete),true);
 for(const key of ['overallComplete','candidateSource','checks']){const broken=structuredClone(complete);delete broken[key];assert.throws(()=>validateReadiness(broken));}
 const pending=structuredClone(complete);pending.checks[0].status='INCOMPLETE';assert.throws(()=>validateReadiness(pending));
});
