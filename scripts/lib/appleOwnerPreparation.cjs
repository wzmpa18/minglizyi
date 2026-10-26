'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const hash=raw=>crypto.createHash('sha256').update(raw).digest('hex');
function readScreenshotManifest(raw,auth){if(!/^[a-f0-9]{64}$/.test(auth.screenshotManifestSha256||'')||hash(raw)!==auth.screenshotManifestSha256)throw Error('Visually reviewed screenshot manifest bytes changed');return JSON.parse(Buffer.from(raw).toString('utf8'));}
function exactCandidate(value,auth){if(value?.appId!==auth.appId||value?.bundleId!==auth.bundleId||value?.version!==auth.version||String(value?.build)!==auth.build||value?.candidateSource!==auth.candidateSource)throw Error('Apple candidate identity mismatch');return true;}
function validateMarketing(value,auth){
 exactCandidate(value,auth);if(value.doesNotAssertOverallComplete!==true)throw Error('Marketing must not assert overall acceptance');
 if(!value.locales?.['zh-Hans']||!value.locales?.['en-US'])throw Error('Missing Chinese or English learning metadata');
 for(const fields of Object.values(value.locales))for(const [key,limit] of [['name',30],['subtitle',30],['keywords',100],['promotionalText',170],['description',4000],['whatsNew',4000]])if(typeof fields[key]!=='string'||!fields[key].trim()||[...fields[key]].length>limit)throw Error('Apple metadata missing or too long: '+key);
 if(typeof value.reviewNotes!=='string'||value.reviewNotes.length<100||value.reviewNotes.length>4000)throw Error('Missing current private review paths');return value;
}
function validateAccess(value,auth,now=Date.now()){
 exactCandidate(value,auth);if(!Number.isFinite(Date.parse(value.checkedAt))||now-Date.parse(value.checkedAt)>3600000||Date.parse(value.checkedAt)>now+60000||value.loginSucceeded!==true||value.sandboxAllowed!==true||value.atlasDownloadAuthorized!==true||value.completeLearningDownloadAuthorized!==true||value.privateAppleReviewFieldsVerified!==true||value.noAdditionalIdentityChallenge!==true||value.noCredentialsPrinted!==true)throw Error('Fresh private reviewer access proof missing');return value;
}
function pngInfo(raw){if(raw.length<33||raw.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||raw.toString('ascii',12,16)!=='IHDR')throw Error('Expected unmodified PNG screenshot');const color=raw[25];if([4,6].includes(color))throw Error('Apple screenshot has an alpha channel');return {width:raw.readUInt32BE(16),height:raw.readUInt32BE(20),colorType:color};}
// ASC retains these enum names for the currently accepted large iPhone/iPad sizes.
const dimensions={APP_IPHONE_67:[[1290,2796],[1320,2868],[1260,2736]],APP_IPAD_PRO_3GEN_129:[[2048,2732],[2064,2752]]};
function validateScreenshots(value,auth,folder){
 if(value?.source!==auth.candidateSource||Number(value?.run)!==auth.ci.screenshots||value.physicalDevice!==false||value.visualReviewed!==true||!Array.isArray(value.sets)||value.sets.length!==2||new Set(value.sets.map(s=>s.device)).size!==2||!value.sets.some(s=>s.device==='iphone')||!value.sets.some(s=>s.device==='ipad'))throw Error('Current complete visually reviewed iPhone/iPad proof missing');
 if(auth.screenshotWorkflowSource&&value.workflowSource!==auth.screenshotWorkflowSource)throw Error('Screenshot QA workflow provenance mismatch');
 if(auth.screenshotRunAttempt&&Number(value.runAttempt)!==auth.screenshotRunAttempt||auth.screenshotArtifactId&&Number(value.artifactId)!==auth.screenshotArtifactId||auth.screenshotReusableWorkflowPath&&value.reusableWorkflowPath!==auth.screenshotReusableWorkflowPath)throw Error('Screenshot attempt, artifact or reusable-workflow provenance mismatch');
 const base=fs.realpathSync(folder),seen=new Set();
 for(const set of value.sets){if(!dimensions[set.displayType]||!Array.isArray(set.files)||set.files.length<5||set.files.length>10||['anatomy','ni-study','study-sharing','medical-home','original-texts'].some(feature=>!set.files.some(row=>row.feature===feature)))throw Error('Current model, course, sharing, medical-home and original-text screenshots are not complete');for(const row of set.files){const file=fs.realpathSync(path.resolve(base,row.path)),relative=path.relative(base,file);if(relative.startsWith('..')||path.isAbsolute(relative)||seen.has(file))throw Error('Screenshot escaped its verified folder');seen.add(file);const raw=fs.readFileSync(file),info=pngInfo(raw);if(hash(raw)!==row.sha256||raw.length!==row.bytes||info.width!==row.width||info.height!==row.height||!dimensions[set.displayType].some(([w,h])=>info.width===w&&info.height===h||info.width===h&&info.height===w))throw Error('Screenshot bytes, dimensions or display target mismatch');}}
 return value;
}
function pendingIapIds(items){const alive=items.filter(i=>i.attributes?.state!=='REMOVED'),apps=alive.filter(i=>i.relationships?.appStoreVersion?.data),iap=alive.filter(i=>i.relationships?.inAppPurchaseVersion?.data);if(apps.length!==1||iap.length!==8||alive.length!==9||new Set(iap.map(i=>i.relationships.inAppPurchaseVersion.data.id)).size!==8)throw Error('Existing review is not the expected one app and eight IAP versions');return {versionId:apps[0].relationships.appStoreVersion.data.id,iapVersionIds:iap.map(i=>i.relationships.inAppPurchaseVersion.data.id).sort()};}
function sameIapIds(a,b){if(JSON.stringify([...a].sort())!==JSON.stringify([...b].sort()))throw Error('Existing pending IAP version identities changed');return true;}
function redactAppleErrors(value,secrets=[]){if(typeof value==='string'){let safe=value;for(const secret of secrets.filter(Boolean))safe=safe.split(String(secret)).join('[private-review-field]');return safe.replace(/\b1[3-9]\d{9}\b/g,'[phone]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]');}if(Array.isArray(value))return value.map(v=>redactAppleErrors(v,secrets));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,/password|authorization|token/i.test(k)?'[private]':redactAppleErrors(v,secrets)]));return value;}
async function upsertAppInfoLocale({api,write,infoId,locale,fields,register}){
 const current=async()=>{const rows=(await api('GET','/v1/appInfos/'+infoId+'/appInfoLocalizations?limit=50')).data;for(const row of rows)register(row.id);return rows;};
 const update=row=>write('PATCH','/v1/appInfoLocalizations/'+row.id,{data:{type:'appInfoLocalizations',id:row.id,attributes:{name:fields.name,subtitle:fields.subtitle}}});
 let rows=await current(),found=rows.find(l=>l.attributes.locale===locale);if(found)return update(found);
 const privacy=rows.find(l=>l.attributes.privacyPolicyUrl)?.attributes.privacyPolicyUrl;if(!privacy?.startsWith('https://'))throw Error('Existing privacy URL missing');
 try{return await write('POST','/v1/appInfoLocalizations',{data:{type:'appInfoLocalizations',attributes:{locale,name:fields.name,subtitle:fields.subtitle,privacyPolicyUrl:privacy},relationships:{appInfo:{data:{type:'appInfos',id:infoId}}}}});}
 catch(error){if(!error.details?.some(e=>e.code==='ENTITY_ERROR.ATTRIBUTE.INVALID.DUPLICATE'))throw error;rows=await current();found=rows.find(l=>l.attributes.locale===locale);if(!found)throw error;return update(found);}
}
function screenshotName(build,device,index,sha){return build+'_'+device+'_'+index+'_'+sha.slice(0,12)+'.png';}
function planScreenshotCapacity(slots,groups,locales,build){
 const plan=[];for(const locale of locales)for(const group of groups){const sets=(slots.find(s=>s.locale===locale)?.sets||[]).filter(s=>s.displayType===group.displayType);if(sets.length>1)throw Error('Duplicate existing screenshot display slots');const shots=sets[0]?.screenshots||[],names=group.files.map((f,i)=>screenshotName(build,group.device,i,f.sha256));if(new Set(names).size!==names.length)throw Error('Duplicate candidate screenshot names');const additions=names.filter(name=>!shots.some(s=>s.fileName===name)).length,total=shots.length+additions;plan.push({locale,device:group.device,displayType:group.displayType,existing:shots.length,additional:additions,maximumDuringUpload:total});if(total>10)throw Error('Screenshot capacity exceeds10 before cancellation: '+locale+'/'+group.device+' existing='+shots.length+' additional='+additions);}return plan;
}
async function recoverableScreenshotUpload({api,write,setId,existing,raw,build,device,index,sha256,trace,put}){
 if(hash(raw)!==sha256||!/^\d+$/.test(build)||!['iphone','ipad'].includes(device)||!Number.isSafeInteger(index)||index<0||index>9)throw Error('New screenshot identity mismatch');
 const name=screenshotName(build,device,index,sha256),matches=existing.filter(s=>s.attributes.fileName===name);if(matches.length>1)throw Error('Duplicate new candidate asset references');let shot=matches[0],rebuilds=0;
 const failed=(message,status)=>Object.assign(Error(message),{rebuildable:status===403||status===404||status===410||status==='FAILED'||status==='NO_UPLOAD_OPERATIONS'});
 for(;;){
  try{
   if(shot){if(shot.attributes.assetDeliveryState?.state==='COMPLETE'){if(shot.attributes.fileSize!==undefined&&shot.attributes.fileSize!==raw.length)throw Error('Completed screenshot size mismatch');return {id:shot.id,fileName:name,sha256};}shot=(await api('GET','/v1/appScreenshots/'+shot.id)).data;}
   else shot=(await write('POST','/v1/appScreenshots',{data:{type:'appScreenshots',attributes:{fileName:name,fileSize:raw.length},relationships:{appScreenshotSet:{data:{type:'appScreenshotSets',id:setId}}}}})).data;
   if(shot.attributes.fileName!==name)throw Error('Refreshed asset is not this candidate hash');
   const state=shot.attributes.assetDeliveryState?.state;
   if(state==='FAILED')throw failed('New candidate asset failed','FAILED');
   if(['COMPLETE','UPLOAD_COMPLETE','PROCESSING'].includes(state)||shot.attributes.uploaded===true)return {id:shot.id,fileName:name,sha256};
   const operations=shot.attributes.uploadOperations||[];if(!operations.length)throw failed('New asset upload operations unavailable','NO_UPLOAD_OPERATIONS');
   for(const op of operations){const url=new URL(op.url);if(url.protocol!=='https:'||!url.hostname.endsWith('.apple.com')||op.method!=='PUT'||!Number.isSafeInteger(op.offset)||!Number.isSafeInteger(op.length)||op.offset<0||op.length<1||op.offset+op.length>raw.length)throw Error('Unexpected Apple asset upload operation');
    const result=await put(op,raw.subarray(op.offset,op.offset+op.length));if(!result.ok)throw failed('Apple asset upload HTTP '+result.status,result.status);
   }
   const id=shot.id;await write('PATCH','/v1/appScreenshots/'+id,{data:{type:'appScreenshots',id,attributes:{uploaded:true,sourceFileChecksum:crypto.createHash('md5').update(raw).digest('hex')}}});trace.push({operation:'uploaded-or-resumed',id,fileName:name});return {id,fileName:name,sha256};
  }catch(error){
   if(error.rebuildable&&shot&&shot.attributes.fileName===name&&shot.attributes.assetDeliveryState?.state!=='COMPLETE'&&rebuilds<1){const id=shot.id;await write('DELETE','/v1/appScreenshots/'+id);trace.push({operation:'removed-only-failed-new-reference',id,fileName:name});shot=null;rebuilds++;continue;}
   trace.push({operation:'interrupted-new-asset-preserved',id:shot?.id,fileName:name,rebuilds});throw error;
  }
 }
}
function mutationScope(auth){
 const owned=new Map(),add=(type,id)=>{if(!owned.has(type))owned.set(type,new Set());owned.get(type).add(id);},has=(type,id)=>owned.get(type)?.has(id)===true;
 const allowed={appStoreVersions:['versionString'],appStoreVersionLocalizations:['description','keywords','promotionalText','whatsNew','supportUrl'],appInfoLocalizations:['name','subtitle','locale','privacyPolicyUrl'],appStoreReviewDetails:['notes'],appScreenshots:['uploaded','sourceFileChecksum'],reviewSubmissions:['canceled','submitted','platform']};
 function assert(method,resource,body){
  const m=resource.match(/^\/v1\/([A-Za-z]+)(?:\/([a-f0-9-]{36}))?$/);if(!m||!['POST','PATCH','DELETE'].includes(method))throw Error('Mutation outside Guoxue release scope');const [,type,id]=m,data=body?.data;
  if(method==='DELETE'){if(type!=='appScreenshots'||!has(type,id))throw Error('Only owned screenshot references may be removed');return;}
  if(data?.type!==type||id&&data.id!==id)throw Error('Mutation body identity mismatch');
  if(Object.hasOwn(data.attributes||{},'supportUrl')&&(type!=='appStoreVersionLocalizations'||typeof auth.publicMetadataUrls?.supportUrl!=='string'||data.attributes.supportUrl!==auth.publicMetadataUrls.supportUrl))throw Error('Support URL is not the verified existing Guoxue URL');
  if(method==='PATCH'){
   if(!has(type,id)||!allowed[type]||Object.keys(data.attributes||{}).some(k=>!allowed[type].includes(k)))throw Error('Mutation outside owned metadata/review fields');
   const rel=data.relationships||{};if(Object.keys(rel).length&&(type!=='appStoreVersions'||Object.keys(rel).some(k=>k!=='build')||rel.build?.data?.id!==auth.buildId||rel.build.data.type!=='builds'))throw Error('Unexpected relationship mutation');return;
  }
  const rel=data.relationships||{};
  if(type==='reviewSubmissions'&&rel.app?.data?.id===auth.appId&&rel.app.data.type==='apps'&&data.attributes?.platform==='IOS')return;
  if(type==='reviewSubmissionItems'&&has('reviewSubmissions',rel.reviewSubmission?.data?.id)&&((has('appStoreVersions',rel.appStoreVersion?.data?.id)&&!rel.inAppPurchaseVersion)||(has('inAppPurchaseVersions',rel.inAppPurchaseVersion?.data?.id)&&!rel.appStoreVersion)))return;
  if(type==='appStoreVersionLocalizations'&&has('appStoreVersions',rel.appStoreVersion?.data?.id)&&['zh-Hans','en-US'].includes(data.attributes?.locale))return;
  if(type==='appInfoLocalizations'&&has('appInfos',rel.appInfo?.data?.id)&&['zh-Hans','en-US'].includes(data.attributes?.locale))return;
  if(type==='appScreenshotSets'&&has('appStoreVersionLocalizations',rel.appStoreVersionLocalization?.data?.id))return;
  if(type==='appScreenshots'&&has('appScreenshotSets',rel.appScreenshotSet?.data?.id))return;
  throw Error('Mutation outside owned Guoxue release objects');
 }
 return {add,has,assert};
}
module.exports={hash,readScreenshotManifest,exactCandidate,validateMarketing,validateAccess,pngInfo,validateScreenshots,pendingIapIds,sameIapIds,redactAppleErrors,upsertAppInfoLocale,screenshotName,planScreenshotCapacity,recoverableScreenshotUpload,mutationScope};
