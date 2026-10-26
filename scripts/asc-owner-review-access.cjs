'use strict';
// Read existing Apple private fields; no credential, product or account mutation.
const fs=require('node:fs'),path=require('node:path');
const auth=require('../docs/requirements/apple-owner-release.json'),{createClient}=require('./lib/guoxueAscClient.cjs');
const arg=name=>process.argv.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3),output=arg('output'),versionId=arg('version-id');
if(!output||!/^[a-f0-9-]{36}$/.test(versionId||'')||fs.existsSync(output))throw Error('Explicit existing Guoxue version ID and new non-secret proof path required');
(async()=>{
 const {api}=createClient();const app=(await api('GET','/v1/apps/'+auth.appId)).data;if(app.attributes.bundleId!==auth.bundleId)throw Error('Wrong app');
 const versions=(await api('GET','/v1/apps/'+auth.appId+'/appStoreVersions?filter[platform]=IOS&limit=50')).data;if(!versions.some(v=>v.id===versionId))throw Error('Version does not belong to Guoxue');
 const detail=(await api('GET','/v1/appStoreVersions/'+versionId+'/appStoreReviewDetail')).data?.attributes;
 if(!detail?.demoAccountRequired||!detail.demoAccountName||!detail.demoAccountPassword)throw Error('Existing private reviewer fields missing');
 const headers={'Content-Type':'application/json','X-Client-Platform':'ios','X-Store-Channel':'ios-full-learning','X-Client-Version':auth.version};
 const response=await fetch('https://yandaoguoxue.yandao.vip/api/auth/login',{method:'POST',headers,body:JSON.stringify({account:detail.demoAccountName,password:detail.demoAccountPassword}),signal:AbortSignal.timeout(30000)}),login=await response.json();
 if(!response.ok||login.success!==true||!login.data?.accessToken)throw Error('Existing review account login failed');
 // Overseas release does not require a China phone-verification flag.
 const privateHeaders={...headers,Authorization:'Bearer '+login.data.accessToken};delete privateHeaders['Content-Type'];
 const context=await fetch('https://yandaoguoxue.yandao.vip/api/apple-iap/context',{headers:privateHeaders,signal:AbortSignal.timeout(30000)}),iap=await context.json();if(!context.ok||iap.data?.sandboxAllowed!==true)throw Error('Existing Sandbox entitlement unavailable');
 async function canDownload(id){const r=await fetch('https://yandaoguoxue.yandao.vip/api/offline/packs/'+id+'/download?resolve=1',{headers:privateHeaders,signal:AbortSignal.timeout(30000)});await r.body?.cancel();return r.status===200;}
 const atlasDownloadAuthorized=await canDownload('tcm-anatomy-atlas-v3'),completeLearningDownloadAuthorized=await canDownload('tcm-learning-complete');if(!atlasDownloadAuthorized||!completeLearningDownloadAuthorized)throw Error('Review learning download entitlement missing');
 const proof={appId:auth.appId,bundleId:auth.bundleId,version:auth.version,build:auth.build,candidateSource:auth.candidateSource,checkedAt:new Date().toISOString(),existingVersionId:versionId,loginSucceeded:true,sandboxAllowed:true,atlasDownloadAuthorized,completeLearningDownloadAuthorized,privateAppleReviewFieldsVerified:true,noAdditionalIdentityChallenge:true,noCredentialsPrinted:true,accountOrCredentialMutations:0,physicalPurchaseOrRestoreAcceptance:false};
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(proof));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
