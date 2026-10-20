'use strict';
// Owner-authorized, exact app/build/source only. Moves the rejected app item into
// the existing empty draft so all first-time IAPs can accompany the binary.
const fs=require('node:fs'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {createClient}=require('./lib/guoxueAscClient.cjs');
const {validateOwnerRelease}=require('./lib/formalReviewGate.cjs');
const auth=require('../docs/requirements/apple-owner-release.json');
const option=n=>process.argv.find(a=>a.startsWith('--'+n+'='))?.slice(n.length+3);
const output=option('output'),packageProof=option('package-proof'),screenProof=option('screenshots-proof'),webProof=option('web-proof'),submit=process.argv.includes('--submit');
const VERSION='299afd61-88b3-4f82-b0dd-54847928f1e8',SUBMISSION='b574a73e-d8d3-42fb-95d3-0776ccdad897',LEGACY='a8bea0c3-7244-4c2a-b655-3192af447954';
if(!output||!packageProof||!screenProof||!webProof)throw Error('Provide verified package, screenshots, web deployment and output proof paths');
const proof={appId:auth.appId,version:auth.version,build:auth.build,source:auth.candidateSource,checkedAt:new Date().toISOString(),submitRequested:submit,submissionId:SUBMISSION,operations:[]};
(async()=>{
 const pkg=JSON.parse(fs.readFileSync(packageProof,'utf8')),screens=JSON.parse(fs.readFileSync(screenProof,'utf8')),web=JSON.parse(fs.readFileSync(webProof,'utf8'));
 if(pkg.source!==auth.candidateSource||pkg.build!==auth.build||pkg.bundleId!==auth.bundleId||pkg.unlicensedAnimationCountInBundle!==0||pkg.excludedCount!==28||crypto.createHash('sha256').update(fs.readFileSync(pkg.path)).digest('hex')!==pkg.ipaSha256)throw Error('Pinned signed package verification mismatch');
 if(web.source!==auth.candidateSource||!web.current?.endsWith(auth.candidateSource.slice(0,7)))throw Error('Matching web deployment not verified');
 if(screens.appId!==auth.appId||screens.sets.length!==2||screens.sets.some(s=>!s.verified||s.uploaded.length!==5||s.uploaded.some(i=>i.state!=='COMPLETE')))throw Error('Screenshots not complete');
 for(const id of [39402134764,39402130346]){const run=JSON.parse(execFileSync('gh',['api','repos/wzmpa18/minglizyi/actions/runs/'+id],{encoding:'utf8'}));if(run.conclusion!=='success'||run.head_sha!==auth.candidateSource)throw Error('Same-source CI failed or pending');}
 const context={ownerChannelSpecific:true,appId:auth.appId,bundleId:auth.bundleId,version:auth.version,build:auth.build,candidateSource:auth.candidateSource,action:submit?'submit':'assemble',sameSourceChecksPassed:true};validateOwnerRelease(auth,context);
 const {api}=createClient({mutations:true,reviewContext:context});
 const app=(await api('GET','/v1/apps/'+auth.appId)).data;if(app.attributes.bundleId!==auth.bundleId||app.attributes.contentRightsDeclaration!=='USES_THIRD_PARTY_CONTENT')throw Error('Wrong app or outdated rights declaration');
 const version=(await api('GET','/v1/appStoreVersions/'+VERSION)).data;if(version.attributes.versionString!==auth.version)throw Error('Wrong version');
 const build=(await api('GET','/v1/appStoreVersions/'+VERSION+'/build')).data;if(build.attributes.version!==auth.build||build.attributes.processingState!=='VALID')throw Error('Latest valid build is not linked');proof.buildId=build.id;
 const all=(await api('GET','/v1/reviewSubmissions?filter[app]='+auth.appId+'&limit=30')).data;
 const target=all.find(s=>s.id===SUBMISSION);if(!target)throw Error('Existing review missing; no new review created');
 if(['WAITING_FOR_REVIEW','IN_REVIEW'].includes(target.attributes.state)){proof.state=target.attributes.state;proof.alreadySubmitted=true;return;}
 if(all.some(s=>s.id!==SUBMISSION&&['WAITING_FOR_REVIEW','IN_REVIEW'].includes(s.attributes.state)))throw Error('Another active review exists; no duplicate submission');
 if(target.attributes.state!=='READY_FOR_REVIEW')throw Error('Existing draft is not editable');
 const itemsPath='/v1/reviewSubmissions/'+SUBMISSION+'/items?limit=50&include=appStoreVersion,inAppPurchaseVersion';
 let items=(await api('GET',itemsPath)).data;
 const appItems=items.filter(i=>i.relationships?.appStoreVersion?.data?.id===VERSION&&i.attributes.state!=='REMOVED');if(appItems.length>1)throw Error('Existing app review item not unique');
 const products=(await api('GET','/v1/apps/'+auth.appId+'/inAppPurchasesV2?limit=100')).data;if(products.length!==8)throw Error('Unexpected product set');
 const versions=[];
 for(const product of products){
  if(!product.attributes.productId.startsWith(auth.bundleId+'.'))throw Error('Foreign product');
  const data=await api('GET','/v2/inAppPurchases/'+product.id+'?include=versions,appStoreReviewScreenshot');
  const reviewImage=data.included?.find(x=>x.type==='inAppPurchaseAppStoreReviewScreenshots');if(reviewImage?.attributes.assetDeliveryState?.state!=='COMPLETE')throw Error('IAP review screenshot not complete');
  const candidates=data.included?.filter(x=>x.type==='inAppPurchaseVersions'&&['PREPARE_FOR_SUBMISSION','READY_FOR_REVIEW'].includes(x.attributes.state))||[];
  if(candidates.length!==1)throw Error('Product version not uniquely ready: '+product.attributes.productId);versions.push({id:candidates[0].id,productId:product.attributes.productId});
 }
 if(appItems.length===0){
  const old=all.find(s=>s.id===LEGACY);if(!old||!['UNRESOLVED_ISSUES','COMPLETE'].includes(old.attributes.state))throw Error('Legacy review not safely editable');
  const oldItems=(await api('GET','/v1/reviewSubmissions/'+LEGACY+'/items?limit=50&include=appStoreVersion')).data;
  const existing=oldItems.filter(i=>i.relationships?.appStoreVersion?.data?.id===VERSION&&i.attributes.state!=='REMOVED');if(existing.length>1||oldItems.some(i=>i.relationships?.appStoreVersion?.data?.id!==VERSION&&i.attributes.state!=='REMOVED'))throw Error('Unexpected legacy review items; no bulk cancellation');
  for(const item of existing){await api('PATCH','/v1/reviewSubmissionItems/'+item.id,{data:{type:'reviewSubmissionItems',id:item.id,attributes:{removed:true}}});proof.operations.push('removed only updated app-version reference from rejected legacy review; history retained');}
  await api('POST','/v1/reviewSubmissionItems',{data:{type:'reviewSubmissionItems',relationships:{reviewSubmission:{data:{type:'reviewSubmissions',id:SUBMISSION}},appStoreVersion:{data:{type:'appStoreVersions',id:VERSION}}}}});proof.operations.push('added same app-version resource to existing draft');
 }
 for(const v of versions){if(items.some(i=>i.relationships?.inAppPurchaseVersion?.data?.id===v.id))continue;
  await api('POST','/v1/reviewSubmissionItems',{data:{type:'reviewSubmissionItems',relationships:{reviewSubmission:{data:{type:'reviewSubmissions',id:SUBMISSION}},inAppPurchaseVersion:{data:{type:'inAppPurchaseVersions',id:v.id}}}}});proof.operations.push('added existing IAP version '+v.productId);
 }
 items=(await api('GET',itemsPath)).data;
 if(items.length!==9||versions.some(v=>!items.some(i=>i.relationships?.inAppPurchaseVersion?.data?.id===v.id)))throw Error('Expected exactly one app and eight products');
 proof.items=items.map(i=>({id:i.id,state:i.attributes.state,relationships:i.relationships}));
 if(submit){await api('PATCH','/v1/reviewSubmissions/'+SUBMISSION,{data:{type:'reviewSubmissions',id:SUBMISSION,attributes:{submitted:true}}});proof.operations.push('submitted exact existing review once');}
 const final=(await api('GET','/v1/reviewSubmissions/'+SUBMISSION)).data;proof.state=final.attributes.state;proof.submittedDate=final.attributes.submittedDate;
 if(submit&&!['WAITING_FOR_REVIEW','IN_REVIEW'].includes(proof.state))throw Error('No confirmed formal acceptance');
})().catch(e=>{proof.error=e.message;proof.errors=e.details;process.exitCode=1;}).finally(()=>{fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));});
