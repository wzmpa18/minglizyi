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
function assertFormalReviewReady(){return validateReadiness(JSON.parse(fs.readFileSync(path.join(root,'docs/requirements/release-readiness.json'),'utf8')));}
function guardAscMutation(method,resource){if(!['GET','HEAD'].includes(String(method).toUpperCase())&&/^\/v1\/(?:reviewSubmissions|reviewSubmissionItems|appStoreVersionSubmissions)(?:[/?]|$)/.test(resource))assertFormalReviewReady();}
module.exports={assertFormalReviewReady,guardAscMutation,validateReadiness,CHECKS};
