'use strict';
// Guoxue only. Inspect first. No cancellation until explicit root readiness.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const auth=require('../docs/requirements/apple-owner-release.json'),{createClient}=require('./lib/guoxueAscClient.cjs');
const prep=require('./lib/appleOwnerPreparation.cjs');
const arg=n=>process.argv.find(a=>a.startsWith('--'+n+'='))?.slice(n.length+3),stage=arg('stage')||'inspect',output=arg('output');
if(!['inspect','validate-local','replace-metadata','assemble','submit'].includes(stage)||!output||fs.existsSync(output))throw Error('Explicit supported stage and new evidence output required');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),material=prep.validateMarketing(read(path.join(__dirname,'../docs/marketing/20261027/apple-118-learning-release.json')),auth);
const proof={appId:auth.appId,bundleId:auth.bundleId,version:auth.version,build:auth.build,candidateSource:auth.candidateSource,checkedAt:new Date().toISOString(),stage,operations:[],doesNotAssertOverallComplete:true};
let privateReviewValues=[];
const save=()=>{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n');};
function verifyCI(){
 const paths={quality:'.github/workflows/study-quality.yml',native:'.github/workflows/ios-build.yml',upload:'.github/workflows/ios-build.yml',screenshots:auth.screenshotWorkflowPath||'.github/workflows/ios-simulator-proof.yml'};
 const runs={};for(const [kind,id] of Object.entries(auth.ci)){const row=JSON.parse(execFileSync('gh',['api','repos/wzmpa18/minglizyi/actions/runs/'+id],{encoding:'utf8',maxBuffer:2000000})),expectedSource=kind==='screenshots'?(auth.screenshotWorkflowSource||auth.candidateSource):auth.candidateSource;if(row.head_sha!==expectedSource||row.status!=='completed'||row.conclusion!=='success'||row.repository?.full_name!=='wzmpa18/minglizyi'||row.path!==paths[kind]||kind==='screenshots'&&auth.screenshotRunAttempt&&row.run_attempt!==auth.screenshotRunAttempt)throw Error('Pinned '+kind+' evidence not successful at exact approved source');runs[kind]={id,source:row.head_sha,appSource:auth.candidateSource,runAttempt:row.run_attempt,status:row.status,conclusion:row.conclusion,path:row.path};}return runs;
}
function localReady(){
 const file=arg('screenshots'),access=arg('access');if(!file||!access)throw Error('Verified actual screenshots and fresh existing-reviewer proof required');
 const screenshots=prep.validateScreenshots(prep.readScreenshotManifest(fs.readFileSync(file),auth),auth,path.dirname(file));prep.validateAccess(read(access),auth);
 return {screenshots,access:read(access),ci:verifyCI()};
}
const scope=prep.mutationScope(auth),context={ownerChannelSpecific:true,appId:auth.appId,bundleId:auth.bundleId,version:auth.version,build:auth.build,candidateSource:auth.candidateSource,action:'assemble',sameSourceChecksPassed:true};
const {api}=createClient({mutations:!['inspect','validate-local'].includes(stage),reviewContext:context});
async function write(method,url,body){scope.assert(method,url,body);const result=await api(method,url,body);if(result.data?.type&&result.data.id)scope.add(result.data.type,result.data.id);return result;}
const alive=rows=>rows.filter(x=>x.attributes?.state!=='REMOVED');
async function inspect(){
 const app=(await api('GET','/v1/apps/'+auth.appId)).data;if(app.attributes.bundleId!==auth.bundleId)throw Error('Wrong app');
 const versions=(await api('GET','/v1/apps/'+auth.appId+'/appStoreVersions?filter[platform]=IOS&limit=50')).data;for(const v of versions)scope.add('appStoreVersions',v.id);
 const builds=await api('GET','/v1/builds?filter[app]='+auth.appId+'&filter[version]='+auth.build+'&include=preReleaseVersion,buildBetaDetail,betaGroups&limit=20');
 const candidates=builds.data.filter(b=>b.attributes.version===auth.build&&(builds.included||[]).some(v=>v.type==='preReleaseVersions'&&v.id===b.relationships.preReleaseVersion?.data?.id&&v.attributes.version===auth.version));
 if(candidates.length!==1||candidates[0].attributes.processingState!=='VALID'||candidates[0].attributes.expired)throw Error('Exact uploaded build60 is not uniquely VALID');const build=candidates[0];auth.buildId=build.id;
 const products=(await api('GET','/v1/apps/'+auth.appId+'/inAppPurchasesV2?limit=100')).data;if(products.length!==8||products.some(p=>!p.attributes.productId.startsWith(auth.bundleId+'.')))throw Error('Existing eight Guoxue product identities changed');
 const productVersions=[];for(const p of products){const row=await api('GET','/v2/inAppPurchases/'+p.id+'?include=versions,appStoreReviewScreenshot');for(const v of row.included||[])if(v.type==='inAppPurchaseVersions'){scope.add(v.type,v.id);productVersions.push({id:v.id,productId:p.attributes.productId,state:v.attributes.state});}}
 const submissions=(await api('GET','/v1/reviewSubmissions?filter[app]='+auth.appId+'&limit=50')).data;for(const s of submissions)scope.add('reviewSubmissions',s.id);
 const active=submissions.filter(s=>['WAITING_FOR_REVIEW','IN_REVIEW','CANCELING'].includes(s.attributes.state));if(active.length>1)throw Error('More than one active Guoxue review; inspect explicitly');
 let pending=null;if(active.length){const s=active[0],items=(await api('GET','/v1/reviewSubmissions/'+s.id+'/items?limit=50&include=appStoreVersion,inAppPurchaseVersion')).data;pending={submissionId:s.id,state:s.attributes.state,...prep.pendingIapIds(items)};if(pending.iapVersionIds.some(id=>!productVersions.some(p=>p.id===id)))throw Error('Pending review includes an unowned IAP version');const v=versions.find(v=>v.id===pending.versionId);if(!v)throw Error('Active review version not in Guoxue');const b=(await api('GET','/v1/appStoreVersions/'+v.id+'/build')).data;pending.version=v.attributes.versionString;pending.build=b.attributes.version;}
 const target=versions.find(v=>v.attributes.versionString===auth.version),old=pending?versions.find(v=>v.id===pending.versionId):versions.find(v=>v.attributes.versionString===auth.previousPendingCandidate.version);
 const version=target||old;if(!version)throw Error('No existing Guoxue version to safely update');
 const detail=(await api('GET','/v1/appStoreVersions/'+version.id+'/appStoreReviewDetail')).data;if(!detail?.attributes?.demoAccountName||!detail.attributes.demoAccountPassword)throw Error('Existing private reviewer fields missing');scope.add('appStoreReviewDetails',detail.id);
 privateReviewValues=[detail.attributes.demoAccountName,detail.attributes.demoAccountPassword];
 const localizations=(await api('GET','/v1/appStoreVersions/'+version.id+'/appStoreVersionLocalizations?limit=50')).data;for(const l of localizations)scope.add('appStoreVersionLocalizations',l.id);
 const infos=(await api('GET','/v1/apps/'+auth.appId+'/appInfos?limit=50')).data;for(const i of infos)scope.add('appInfos',i.id);
 const infoLocalizations=[];for(const info of infos){const rows=(await api('GET','/v1/appInfos/'+info.id+'/appInfoLocalizations?limit=50')).data;infoLocalizations.push({appInfoId:info.id,locales:rows.map(l=>({id:l.id,locale:l.attributes.locale,name:l.attributes.name,subtitle:l.attributes.subtitle,privacyPolicyUrl:l.attributes.privacyPolicyUrl||null}))});}
 const screenshotSlots=[];for(const locale of localizations){const sets=(await api('GET','/v1/appStoreVersionLocalizations/'+locale.id+'/appScreenshotSets?limit=50')).data,rows=[];for(const s of sets){const shots=(await api('GET','/v1/appScreenshotSets/'+s.id+'/appScreenshots?limit=50')).data;rows.push({id:s.id,displayType:s.attributes.screenshotDisplayType,screenshots:shots.map(x=>({id:x.id,fileName:x.attributes.fileName,state:x.attributes.assetDeliveryState?.state}))});}screenshotSlots.push({locale:locale.attributes.locale,sets:rows});}
 const betaDetail=(builds.included||[]).find(v=>v.type==='buildBetaDetails'&&v.id===build.relationships.buildBetaDetail?.data?.id),groups=(builds.included||[]).filter(v=>v.type==='betaGroups'&&build.relationships.betaGroups?.data?.some(g=>g.id===v.id));
 return {versions,build,productVersions,submissions,pending,version,detail,localizations,infos,infoLocalizations,screenshotSlots,testFlight:{internalBuildState:betaDetail?.attributes.internalBuildState,externalBuildState:betaDetail?.attributes.externalBuildState,existingInternalGroups:groups.filter(g=>g.attributes.isInternalGroup===true).map(g=>({id:g.id,name:g.attributes.name}))}};
}
function recordSnapshot(live){
 proof.buildRecord={id:live.build.id,build:live.build.attributes.version,processingState:live.build.attributes.processingState};proof.versionRecord={id:live.version.id,version:live.version.attributes.versionString,state:live.version.attributes.appStoreState};proof.previousPending=live.pending;proof.productVersions=live.productVersions;proof.privateReviewFieldsPresent=true;proof.existingLocaleNames=live.localizations.map(l=>l.attributes.locale);proof.historicalIapMutations=0;proof.otherAppMutations=0;
 proof.appInfoRecords=live.infos.map(i=>({id:i.id,state:i.attributes.appStoreState}));proof.existingScreenshotSlots=live.screenshotSlots;
 proof.testFlight=live.testFlight;
 proof.existingAppInfoLocalizations=live.infoLocalizations;
 proof.versionLocaleUrls=live.localizations.map(l=>({id:l.id,locale:l.attributes.locale,supportUrl:l.attributes.supportUrl||null,marketingUrl:l.attributes.marketingUrl||null}));
}
async function replace(live,ready,snapshot){
 if(!process.argv.includes('--root-all-preparations-ready'))throw Error('Root has not confirmed all preparations ready; old review retained');
 if(live.version.id!==snapshot.versionRecord?.id)throw Error('Target Guoxue store-version identity changed; no mutation');
 proof.screenshotCapacity=prep.planScreenshotCapacity(live.screenshotSlots,ready.screenshots.sets,Object.keys(material.locales),auth.build);save();
 if(live.pending){
  if(live.pending.build===auth.build&&live.pending.version===auth.version)throw Error('Current118 review already active; no cancellation or duplicate');
  if(live.pending.build!==auth.previousPendingCandidate.build||live.pending.version!==auth.previousPendingCandidate.version||live.pending.submissionId!==snapshot.previousPending?.submissionId||live.pending.versionId!==snapshot.previousPending?.versionId)throw Error('Old review changed; no cancellation');prep.sameIapIds(live.pending.iapVersionIds,snapshot.previousPending.iapVersionIds);
  if(live.pending.state==='IN_REVIEW')throw Error('Old version is already in review; this replacement command is limited to the owner-specified waiting review');
  context.action='withdraw-existing';if(live.pending.state==='WAITING_FOR_REVIEW'){await write('PATCH','/v1/reviewSubmissions/'+live.pending.submissionId,{data:{type:'reviewSubmissions',id:live.pending.submissionId,attributes:{canceled:true}}});proof.operations.push('Canceled only the freshly verified waiting53 review; product records, order history and private fields retained');save();}
  const state=(await api('GET','/v1/reviewSubmissions/'+live.pending.submissionId)).data.attributes.state;if(state==='CANCELING'){proof.state='AWAITING_OLD_CANCELLATION';return;}if(!['CANCELED','COMPLETE'].includes(state))throw Error('Old review cancellation not confirmed');
 }
 context.action='assemble';const version=(await api('GET','/v1/appStoreVersions/'+live.version.id)).data;if(!['PREPARE_FOR_SUBMISSION','DEVELOPER_REJECTED','REJECTED','METADATA_REJECTED'].includes(version.attributes.appStoreState))throw Error('Version not editable; previous content preserved');
 // Cancellation changes App Info state too: do not reuse the waiting-state
 // objects that were intentionally read before any cancellation.
 const freshInfos=(await api('GET','/v1/apps/'+auth.appId+'/appInfos?limit=50')).data;
 const editable=freshInfos.filter(i=>live.infos.some(old=>old.id===i.id)&&['PREPARE_FOR_SUBMISSION','DEVELOPER_REJECTED','REJECTED','METADATA_REJECTED'].includes(i.attributes.appStoreState));if(editable.length!==1)throw Error('Exactly one existing editable Guoxue App Info required');const info=editable[0];scope.add('appInfos',info.id);
 await write('PATCH','/v1/appStoreVersions/'+version.id,{data:{type:'appStoreVersions',id:version.id,attributes:{versionString:auth.version},relationships:{build:{data:{type:'builds',id:live.build.id}}}}});proof.operations.push('Linked only exact VALID118(60) and updated the existing editable version string');
 const published=live.versions.some(v=>['READY_FOR_SALE','READY_FOR_DISTRIBUTION'].includes(v.attributes.appStoreState));
 for(const [locale,fields] of Object.entries(material.locales)){
  let loc=live.localizations.find(l=>l.attributes.locale===locale);if(!loc)loc=(await write('POST','/v1/appStoreVersionLocalizations',{data:{type:'appStoreVersionLocalizations',attributes:{locale,description:fields.description,keywords:fields.keywords,promotionalText:fields.promotionalText,supportUrl:auth.publicMetadataUrls?.supportUrl,...(published?{whatsNew:fields.whatsNew}:{})},relationships:{appStoreVersion:{data:{type:'appStoreVersions',id:version.id}}}}})).data;
  else await write('PATCH','/v1/appStoreVersionLocalizations/'+loc.id,{data:{type:'appStoreVersionLocalizations',id:loc.id,attributes:{description:fields.description,keywords:fields.keywords,promotionalText:fields.promotionalText,...(!loc.attributes.supportUrl?{supportUrl:auth.publicMetadataUrls?.supportUrl}:{}),...(published?{whatsNew:fields.whatsNew}:{})}}});
  await prep.upsertAppInfoLocale({api,write,infoId:info.id,locale,fields,register:id=>scope.add('appInfoLocalizations',id)});
 }
 await write('PATCH','/v1/appStoreReviewDetails/'+live.detail.id,{data:{type:'appStoreReviewDetails',id:live.detail.id,attributes:{notes:material.reviewNotes}}});
 const privateRead=(await api('GET','/v1/appStoreReviewDetails/'+live.detail.id)).data.attributes;if(privateRead.demoAccountName!==live.detail.attributes.demoAccountName||privateRead.demoAccountPassword!==live.detail.attributes.demoAccountPassword||privateRead.notes!==material.reviewNotes)throw Error('Existing private review fields or new notes readback mismatch');proof.privateReviewFieldsPreserved=true;
 proof.initialReleaseWhatsNewOmitted=!published;
 const locales=(await api('GET','/v1/appStoreVersions/'+version.id+'/appStoreVersionLocalizations?limit=50')).data;const complete=[],previous=[],legacySets=[];
 for(const locale of Object.keys(material.locales)){
  const loc=locales.find(l=>l.attributes.locale===locale);scope.add('appStoreVersionLocalizations',loc.id);const f=material.locales[locale];if(['description','keywords','promotionalText'].some(k=>loc.attributes[k]!==f[k])||loc.attributes.supportUrl!==auth.publicMetadataUrls?.supportUrl)throw Error('Learning metadata or verified support URL readback mismatch');
  let sets=(await api('GET','/v1/appStoreVersionLocalizations/'+loc.id+'/appScreenshotSets?limit=50')).data;
  // Old explicit 6.5-inch screenshots otherwise override scaling of the new
  // large-display set. Retain their references until *all* new sets complete.
  for(const legacy of sets.filter(s=>/^APP_(?:IPHONE|IPAD)_/.test(s.attributes.screenshotDisplayType)&&!ready.screenshots.sets.some(n=>n.displayType===s.attributes.screenshotDisplayType))){
   const old=(await api('GET','/v1/appScreenshotSets/'+legacy.id+'/appScreenshots?limit=50')).data;for(const shot of old){scope.add('appScreenshots',shot.id);previous.push(shot.id);}legacySets.push({locale,setId:legacy.id,displayType:legacy.attributes.screenshotDisplayType});
  }
  for(const group of ready.screenshots.sets){
   let set=sets.find(s=>s.attributes.screenshotDisplayType===group.displayType);if(set)scope.add('appScreenshotSets',set.id);else set=(await write('POST','/v1/appScreenshotSets',{data:{type:'appScreenshotSets',attributes:{screenshotDisplayType:group.displayType},relationships:{appStoreVersionLocalization:{data:{type:'appStoreVersionLocalizations',id:loc.id}}}}})).data;
   const before=(await api('GET','/v1/appScreenshotSets/'+set.id+'/appScreenshots?limit=50')).data;for(const s of before)scope.add('appScreenshots',s.id);const selected=[];
   for(let index=0;index<group.files.length;index++){
    const row=group.files[index],raw=fs.readFileSync(path.resolve(path.dirname(arg('screenshots')),row.path));if(!proof.assetRecoveryOperations)proof.assetRecoveryOperations=[];
    selected.push(await prep.recoverableScreenshotUpload({api,write,setId:set.id,existing:before,raw,build:auth.build,device:group.device,index,sha256:row.sha256,trace:proof.assetRecoveryOperations,put:async(op,bytes)=>fetch(op.url,{method:'PUT',headers:Object.fromEntries(op.requestHeaders.map(h=>[h.name,h.value])),body:bytes,redirect:'error',signal:AbortSignal.timeout(60000)})}));save();
   }
   const readback=(await api('GET','/v1/appScreenshotSets/'+set.id+'/appScreenshots?limit=50')).data;complete.push({locale,device:group.device,setId:set.id,selected,allComplete:selected.every(s=>readback.some(r=>r.id===s.id&&r.attributes.assetDeliveryState?.state==='COMPLETE'))});previous.push(...before.filter(s=>!selected.some(n=>n.id===s.id)).map(s=>s.id));
  }
 }
 proof.screenshotSets=complete;if(complete.some(s=>!s.allComplete)){proof.state='AWAITING_NEW_SCREENSHOT_PROCESSING_OLD_REFERENCES_RETAINED';return;}
 for(const id of new Set(previous))await write('DELETE','/v1/appScreenshots/'+id);proof.operations.push('Removed old screenshot references only after every new iPhone/iPad image was COMPLETE; source images retained');
 for(const set of complete){const rows=(await api('GET','/v1/appScreenshotSets/'+set.setId+'/appScreenshots?limit=50')).data;if(rows.length!==set.selected.length||rows.some(s=>!set.selected.some(n=>n.id===s.id)||s.attributes.assetDeliveryState?.state!=='COMPLETE'))throw Error('Final screenshot set readback mismatch');}
 for(const set of legacySets)if((await api('GET','/v1/appScreenshotSets/'+set.setId+'/appScreenshots?limit=50')).data.length)throw Error('A stale explicit screenshot set still overrides current screenshots');proof.clearedLegacyDisplayReferences=legacySets;
 proof.state='CURRENT118_METADATA_AND_SCREENSHOTS_VERIFIED';proof.versionId=version.id;
}
async function assemble(live,snapshot,submit){
 if(live.pending)throw Error('Active review exists; no duplicate assembly or submission');if(live.version.attributes.versionString!==auth.version)throw Error('118 editable version not prepared');
 const metadataProof=read(arg('metadata-proof')||'');prep.exactCandidate(metadataProof,auth);if(metadataProof.state!=='CURRENT118_METADATA_AND_SCREENSHOTS_VERIFIED'||metadataProof.versionId!==live.version.id||metadataProof.privateReviewFieldsPreserved!==true)throw Error('118 metadata/screenshots proof missing');
 const linked=(await api('GET','/v1/appStoreVersions/'+live.version.id+'/build')).data;if(linked.id!==live.build.id)throw Error('118 build link changed');
 for(const [locale,fields] of Object.entries(material.locales)){
  const loc=live.localizations.find(l=>l.attributes.locale===locale);if(!loc||['description','keywords','promotionalText'].some(k=>loc.attributes[k]!==fields[k]))throw Error('Current learning metadata changed after preparation');if(!loc.attributes.supportUrl?.startsWith('https://'))throw Error('Required localized supportUrl is missing; do not add an incomplete app to review');
  const sets=(await api('GET','/v1/appStoreVersionLocalizations/'+loc.id+'/appScreenshotSets?limit=50')).data;
  for(const expectedSet of metadataProof.screenshotSets.filter(s=>s.locale===locale)){
   if(!sets.some(s=>s.id===expectedSet.setId))throw Error('Prepared screenshot set no longer belongs to the locale');
   const shots=(await api('GET','/v1/appScreenshotSets/'+expectedSet.setId+'/appScreenshots?limit=50')).data;
   if(shots.length!==expectedSet.selected.length||shots.some(s=>!expectedSet.selected.some(e=>e.id===s.id&&e.fileName===s.attributes.fileName)||s.attributes.assetDeliveryState?.state!=='COMPLETE'))throw Error('Current screenshot assets changed or not COMPLETE');
  }
 }
 const notes=(await api('GET','/v1/appStoreReviewDetails/'+live.detail.id)).data.attributes;if(notes.notes!==material.reviewNotes||!notes.demoAccountName||!notes.demoAccountPassword)throw Error('Current review paths or retained private fields missing');
 const expected=snapshot.previousPending?.iapVersionIds;if(!Array.isArray(expected)||expected.length!==8||expected.some(id=>!live.productVersions.some(v=>v.id===id)))throw Error('Original eight pending IAP identities missing');
 const pending=expected.filter(id=>live.productVersions.find(v=>v.id===id).state!=='APPROVED');
 if(pending.some(id=>!['PREPARE_FOR_SUBMISSION','READY_FOR_REVIEW','DEVELOPER_REJECTED','READY_TO_SUBMIT'].includes(live.productVersions.find(v=>v.id===id).state)))throw Error('Existing IAP state not editable; products and old links preserved');
 const drafts=live.submissions.filter(s=>s.attributes.state==='READY_FOR_REVIEW');if(drafts.length>1)throw Error('Multiple draft reviews; do not select arbitrarily');let target=drafts[0];
 if(!target)target=(await write('POST','/v1/reviewSubmissions',{data:{type:'reviewSubmissions',attributes:{platform:'IOS'},relationships:{app:{data:{type:'apps',id:auth.appId}}}}})).data;else if(target.attributes.platform===null)await write('PATCH','/v1/reviewSubmissions/'+target.id,{data:{type:'reviewSubmissions',id:target.id,attributes:{platform:'IOS'}}});else if(target.attributes.platform!=='IOS')throw Error('Existing draft has another platform');
 proof.submissionId=target.id;proof.operations.push('Selected the single owned review draft; no duplicate created');save();
 const itemsUrl='/v1/reviewSubmissions/'+target.id+'/items?limit=50&include=appStoreVersion,inAppPurchaseVersion';let items=alive((await api('GET',itemsUrl)).data);
 if(items.some(i=>i.relationships.appStoreVersion?.data&&i.relationships.appStoreVersion.data.id!==live.version.id||i.relationships.inAppPurchaseVersion?.data&&!pending.includes(i.relationships.inAppPurchaseVersion.data.id)))throw Error('Unrelated existing draft items; not removed');
 if(!items.some(i=>i.relationships.appStoreVersion?.data?.id===live.version.id))await write('POST','/v1/reviewSubmissionItems',{data:{type:'reviewSubmissionItems',relationships:{reviewSubmission:{data:{type:'reviewSubmissions',id:target.id}},appStoreVersion:{data:{type:'appStoreVersions',id:live.version.id}}}}});
 for(const id of pending)if(!items.some(i=>i.relationships.inAppPurchaseVersion?.data?.id===id))await write('POST','/v1/reviewSubmissionItems',{data:{type:'reviewSubmissionItems',relationships:{reviewSubmission:{data:{type:'reviewSubmissions',id:target.id}},inAppPurchaseVersion:{data:{type:'inAppPurchaseVersions',id}}}}});
 items=alive((await api('GET',itemsUrl)).data);prep.sameIapIds(items.filter(i=>i.relationships.inAppPurchaseVersion?.data).map(i=>i.relationships.inAppPurchaseVersion.data.id),pending);if(items.length!==pending.length+1)throw Error('Review items not exactly one118 app plus original pending IAPs');proof.submissionId=target.id;proof.pendingIapVersionIds=pending;proof.originalIapVersionsPreserved=expected;save();
 if(submit){context.action='submit';await write('PATCH','/v1/reviewSubmissions/'+target.id,{data:{type:'reviewSubmissions',id:target.id,attributes:{submitted:true}}});proof.operations.push('Submitted the exact118 app and original pending IAP versions once');}
 const final=(await api('GET','/v1/reviewSubmissions/'+target.id)).data;proof.state=final.attributes.state;proof.submittedDate=final.attributes.submittedDate;if(submit&&!['WAITING_FOR_REVIEW','IN_REVIEW'].includes(proof.state))throw Error('Apple review acceptance not confirmed');
}
(async()=>{
 if(stage==='validate-local'){proof.local=localReady();const current=await inspect();recordSnapshot(current);proof.screenshotCapacity=prep.planScreenshotCapacity(current.screenshotSlots,proof.local.screenshots.sets,Object.keys(material.locales),auth.build);proof.state='LOCAL_PREPARATION_VERIFIED_NOT_CANCELED';return;}
 const live=await inspect();recordSnapshot(live);if(stage==='inspect'){proof.state='READ_ONLY_CURRENT_APP_SNAPSHOT';return;}
 const ready=localReady(),snapshot=read(arg('snapshot')||'');prep.exactCandidate(snapshot,auth);if(snapshot.state!=='READ_ONLY_CURRENT_APP_SNAPSHOT')throw Error('Fresh initial Apple inspect snapshot required');proof.ci=ready.ci;
 if(stage==='replace-metadata')await replace(live,ready,snapshot);else await assemble(live,snapshot,stage==='submit');
})().catch(e=>{proof.error=prep.redactAppleErrors(e.message,privateReviewValues);proof.appleErrors=prep.redactAppleErrors(e.details||[],privateReviewValues);process.exitCode=1;}).finally(()=>{save();console.log(JSON.stringify({appId:proof.appId,version:proof.version,build:proof.build,stage,state:proof.state,error:proof.error,output}));});
