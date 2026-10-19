'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const CHECKS=['07-software-localization-calendar','09-software-sharing-vault-provider','10-software-source-discussion-summary','medical-content-rights-professional-validation','legacy-medical-ai-and-ugc-governance','two-adult-two-device-end-to-end','native-widgets-reminders-power','apple-entitlement-restore','candidate-source-signature-regression','store-real-screenshots-disclosures-deduplication','workspace-rotation-cleanup-and-four-handover-hashes'];
function validateReadiness(readiness){
 const errors=[];
 if(readiness?.scope!=='com.yandaoguoxue.app'||readiness?.overallComplete!==true||!/^[a-f0-9]{40}$/.test(readiness?.candidateSource||''))errors.push('整体验收或候选源码未确认');
 if(!Array.isArray(readiness?.checks)||readiness.checks.length!==CHECKS.length)errors.push('验收门槛不完整');
 for(const id of CHECKS){const rows=(readiness?.checks||[]).filter(r=>r.id===id);if(rows.length!==1||rows[0].status!=='PASS'||typeof rows[0].evidence!=='string'||rows[0].evidence.length<10)errors.push(id);}
 if(errors.length)throw Error('禁止正式提审：07/09/10尚未全部验收通过。未满足：'+errors.join('、')+'。继续开发/内部测试，不得改标完成来绕过门槛。');
 return true;
}
function validateAcceptanceContract(contract,{count,sectionCount,completionFlag}){
 const cases=contract?.acceptance||contract?.cases;
 if(contract?.[completionFlag]!==true||contract?.formalSubmissionAllowed!==true||!Array.isArray(cases)||cases.length!==count||new Set(cases.map(c=>c.id)).size!==count||!Array.isArray(contract.sections)||contract.sections.length!==sectionCount||contract.sections.some(s=>s.status!=='PASS'))throw Error('禁止正式提审：验收契约尚未真实全部完成');
 for(const item of cases){const proofs=Array.isArray(item.evidence)?item.evidence:typeof item.evidence==='string'?[item.evidence]:[];if(item.status!=='PASS'||item.blocker||!proofs.length||proofs.some(p=>typeof p!=='string'||p.length<10))throw Error('禁止正式提审：用例未通过或缺验证证据：'+String(item.id));}
 return true;
}
function assertFormalReviewReady(){
 const read=name=>JSON.parse(fs.readFileSync(path.join(root,'docs/requirements',name),'utf8'));
 validateReadiness(read('release-readiness.json'));
 validateAcceptanceContract(read('life-records-09.acceptance.json'),{count:44,sectionCount:40,completionFlag:'deliveryComplete'});
 validateAcceptanceContract(read('research-10.acceptance.json'),{count:25,sectionCount:17,completionFlag:'overallComplete'});
 return true;
}
function guardAscMutation(method,resource){if(!['GET','HEAD'].includes(String(method).toUpperCase())&&/^\/v1\/(?:reviewSubmissions|reviewSubmissionItems|appStoreVersionSubmissions)(?:[/?]|$)/.test(resource))assertFormalReviewReady();}
module.exports={assertFormalReviewReady,guardAscMutation,validateReadiness,validateAcceptanceContract,CHECKS};
