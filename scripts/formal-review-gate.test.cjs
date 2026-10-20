const {test}=require('node:test'),assert=require('node:assert/strict');
const {validateReadiness,validateAcceptanceContract,validateOwnerRelease,guardAscMutation,CHECKS}=require('./lib/formalReviewGate.cjs');
test('formal review mutations fail closed while internal testing and read-only checks remain available',()=>{
 for(const url of ['/v1/reviewSubmissions','/v1/reviewSubmissions/id','/v1/reviewSubmissionItems','/v1/appStoreVersionSubmissions'])assert.throws(()=>guardAscMutation('POST',url),/禁止正式提审/);
 guardAscMutation('GET','/v1/reviewSubmissions');guardAscMutation('POST','/v1/builds/id/relationships/betaGroups');
 const complete={scope:'com.yandaoguoxue.app',overallComplete:true,candidateSource:'a'.repeat(40),checks:CHECKS.map(id=>({id,status:'PASS',evidence:'verified-specific-proof.json'}))};
 assert.equal(validateReadiness(complete),true);
 for(const key of ['overallComplete','candidateSource','checks']){const broken=structuredClone(complete);delete broken[key];assert.throws(()=>validateReadiness(broken));}
 const pending=structuredClone(complete);pending.checks[0].status='INCOMPLETE';assert.throws(()=>validateReadiness(pending));
});
test('explicit owner channel authorization is limited to the exact app, source, build and operation, without changing overall acceptance',()=>{
 const auth=require('../docs/requirements/apple-owner-release.json');const ctx={ownerChannelSpecific:true,appId:auth.appId,bundleId:auth.bundleId,version:auth.version,build:auth.build,candidateSource:auth.candidateSource,action:'submit',sameSourceChecksPassed:true};
 assert.equal(validateOwnerRelease(auth,ctx),true);
 for(const patch of [{appId:'other'},{candidateSource:'b'.repeat(40)},{build:'22'},{sameSourceChecksPassed:false},{action:'delete'},{bundleId:'com.yandao.xuewaiyu'}])assert.throws(()=>validateOwnerRelease(auth,{...ctx,...patch}),/专项/);
 assert.equal(require('../docs/requirements/release-readiness.json').overallComplete,false);
 assert.throws(()=>guardAscMutation('PATCH','/v1/reviewSubmissions/id'),/禁止正式提审/);
});
test('a true overall flag cannot bypass incomplete individual contracts, duplicate/missing cases or absent evidence',()=>{
 const contract={deliveryComplete:true,formalSubmissionAllowed:true,sections:[{status:'PASS'}],acceptance:[{id:'case-1',status:'PASS',evidence:['verified-physical-check.json'],blocker:null}]};
 const spec={count:1,sectionCount:1,completionFlag:'deliveryComplete'};assert.equal(validateAcceptanceContract(contract,spec),true);
 for(const change of [c=>{c.acceptance[0].status='PENDING_E2E';},c=>{c.acceptance[0].evidence=[];},c=>{c.acceptance[0].blocker='pending device';},c=>{c.sections[0].status='IN_PROGRESS';},c=>{c.formalSubmissionAllowed=false;}]){const bad=structuredClone(contract);change(bad);assert.throws(()=>validateAcceptanceContract(bad,spec),/禁止正式提审/);}
 const duplicate=structuredClone(contract);duplicate.acceptance.push(structuredClone(duplicate.acceptance[0]));assert.throws(()=>validateAcceptanceContract(duplicate,{...spec,count:2}));
});
