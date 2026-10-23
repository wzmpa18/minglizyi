'use strict';
// Exact owner-authorized candidate. Never cancels an active review or changes prices.
const fs=require('node:fs'),{execFileSync}=require('node:child_process');
const {createClient}=require('./lib/guoxueAscClient.cjs');
const auth=require('../docs/requirements/apple-owner-release.json');
const output=process.argv.find(x=>x.startsWith('--output='))?.slice(9);
const submit=process.argv.includes('--submit');
if(!output)throw Error('Provide a non-secret evidence output path');
const VERSION='299afd61-88b3-4f82-b0dd-54847928f1e8';
const proof={checkedAt:new Date().toISOString(),appId:auth.appId,build:auth.build,source:auth.candidateSource,operations:[]};
const save=()=>fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n');
(async()=>{
 if(auth.build!=='36'||auth.candidateSource!=='a5361d7a6a035c56ab2ac22531d9850ac144c754')throw Error('Candidate authorization mismatch');
 for(const id of [39960315606,39960320991]){const r=JSON.parse(execFileSync('gh',['api','repos/wzmpa18/minglizyi/actions/runs/'+id],{encoding:'utf8'}));if(r.head_sha!==auth.candidateSource||r.conclusion!=='success')throw Error('Pinned quality/signing CI not successful');}
 const context={ownerChannelSpecific:true,appId:auth.appId,bundleId:auth.bundleId,version:auth.version,build:auth.build,candidateSource:auth.candidateSource,action:submit?'submit':'assemble',sameSourceChecksPassed:true};
 const {api}=createClient({mutations:true,reviewContext:context});
 const app=(await api('GET','/v1/apps/'+auth.appId)).data;if(app.attributes.bundleId!==auth.bundleId)throw Error('Wrong app');
 const version=(await api('GET','/v1/appStoreVersions/'+VERSION)).data;
 const build=(await api('GET','/v1/appStoreVersions/'+VERSION+'/build')).data;
 if(version.attributes.versionString!==auth.version||build.attributes.version!=='36'||build.attributes.processingState!=='VALID')throw Error('Expected valid linked build 36');
 const products=(await api('GET','/v1/apps/'+auth.appId+'/inAppPurchasesV2?limit=100')).data;
 if(products.length!==8||products.some(p=>!p.attributes.productId.startsWith(auth.bundleId+'.')))throw Error('Expected existing eight Guoxue products');
 const versions=[];
 for(const p of products){const data=await api('GET','/v2/inAppPurchases/'+p.id+'?include=versions,appStoreReviewScreenshot');
  if(data.included?.find(x=>x.type==='inAppPurchaseAppStoreReviewScreenshots')?.attributes.assetDeliveryState?.state!=='COMPLETE')throw Error('Missing complete product review screenshot');
  const candidates=(data.included||[]).filter(x=>x.type==='inAppPurchaseVersions'&&(['PREPARE_FOR_SUBMISSION','READY_FOR_REVIEW'].includes(x.attributes.state)||(x.attributes.state==='DEVELOPER_REJECTED'&&p.attributes.state==='READY_TO_SUBMIT')));
  if(candidates.length!==1)throw Error('Product version not uniquely ready: '+p.attributes.productId);
  versions.push({id:candidates[0].id,productId:p.attributes.productId});
 }
 proof.products=versions;save();
 const all=(await api('GET','/v1/reviewSubmissions?filter[app]='+auth.appId+'&limit=30')).data;
 const active=all.filter(x=>['WAITING_FOR_REVIEW','IN_REVIEW','CANCELING'].includes(x.attributes.state));
 if(active.length){proof.active=active.map(x=>({id:x.id,state:x.attributes.state}));throw Error('Active review still exists; no duplicate created or submitted');}
 const drafts=all.filter(x=>x.attributes.platform==='IOS'&&x.attributes.state==='READY_FOR_REVIEW');
 if(drafts.length>1)throw Error('Multiple editable reviews; inspect before selecting');
 let target=drafts[0];
 if(!target){target=(await api('POST','/v1/reviewSubmissions',{data:{type:'reviewSubmissions',attributes:{platform:'IOS'},relationships:{app:{data:{type:'apps',id:auth.appId}}}}})).data;proof.operations.push('created one review after confirming no active review');}
 proof.submissionId=target.id;save();
 // ASC's product UI may create a platform-less cart. Move only this exact
 // candidate's existing products from that unsubmitted cart, never cancel review.
 for(const cart of all.filter(x=>x.attributes.platform===null&&x.attributes.state==='READY_FOR_REVIEW')){
  const rows=(await api('GET','/v1/reviewSubmissions/'+cart.id+'/items?limit=50&include=appStoreVersion,inAppPurchaseVersion')).data.filter(x=>x.attributes.state!=='REMOVED');
  if(rows.some(i=>i.relationships.appStoreVersion?.data||!versions.some(v=>v.id===i.relationships.inAppPurchaseVersion?.data?.id)))throw Error('Unrelated platform-less draft; manual inspection required');
  for(const i of rows){await api('PATCH','/v1/reviewSubmissionItems/'+i.id,{data:{type:'reviewSubmissionItems',id:i.id,attributes:{removed:true}}});proof.operations.push('moved exact IAP out of unsubmitted platform-less cart '+cart.id);save();}
 }
 const itemPath='/v1/reviewSubmissions/'+target.id+'/items?limit=50&include=appStoreVersion,inAppPurchaseVersion';
 let items=(await api('GET',itemPath)).data.filter(x=>x.attributes.state!=='REMOVED');
 if(items.some(i=>i.relationships.appStoreVersion?.data&&i.relationships.appStoreVersion.data.id!==VERSION||i.relationships.inAppPurchaseVersion?.data&&!versions.some(v=>v.id===i.relationships.inAppPurchaseVersion.data.id)))throw Error('Unexpected items in draft');
 if(!items.some(i=>i.relationships.appStoreVersion?.data?.id===VERSION)){await api('POST','/v1/reviewSubmissionItems',{data:{type:'reviewSubmissionItems',relationships:{reviewSubmission:{data:{type:'reviewSubmissions',id:target.id}},appStoreVersion:{data:{type:'appStoreVersions',id:VERSION}}}}});proof.operations.push('added linked app build36');save();}
 for(const v of versions){if(items.some(i=>i.relationships.inAppPurchaseVersion?.data?.id===v.id))continue;await api('POST','/v1/reviewSubmissionItems',{data:{type:'reviewSubmissionItems',relationships:{reviewSubmission:{data:{type:'reviewSubmissions',id:target.id}},inAppPurchaseVersion:{data:{type:'inAppPurchaseVersions',id:v.id}}}}});proof.operations.push('added '+v.productId);save();}
 items=(await api('GET',itemPath)).data.filter(x=>x.attributes.state!=='REMOVED');
 if(items.length!==9||versions.some(v=>!items.some(i=>i.relationships.inAppPurchaseVersion?.data?.id===v.id)))throw Error('Expected exactly one app and eight IAPs');
 proof.items=items.map(i=>({id:i.id,state:i.attributes.state,relationships:i.relationships}));save();
 if(submit){await api('PATCH','/v1/reviewSubmissions/'+target.id,{data:{type:'reviewSubmissions',id:target.id,attributes:{submitted:true}}});proof.operations.push('submitted verified nine-item review once');save();}
 const final=(await api('GET','/v1/reviewSubmissions/'+target.id)).data;proof.state=final.attributes.state;proof.submittedDate=final.attributes.submittedDate;
 if(submit&&!['WAITING_FOR_REVIEW','IN_REVIEW'].includes(proof.state))throw Error('No confirmed acceptance');
})().catch(e=>{proof.error=e.message;proof.errors=e.details;process.exitCode=1;}).finally(()=>{save();console.log(JSON.stringify(proof));});
