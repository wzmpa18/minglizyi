'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const prep=require('./lib/appleOwnerPreparation.cjs'),auth=require('../docs/requirements/apple-owner-release.json'),{validateOwnerRelease}=require('./lib/formalReviewGate.cjs');
const copy=x=>JSON.parse(JSON.stringify(x)),identity=()=>({appId:auth.appId,bundleId:auth.bundleId,version:auth.version,build:auth.build,candidateSource:auth.candidateSource});
test('118 authorization remains exact while historical53 and another source/build/app are refused',()=>{
 const context={ownerChannelSpecific:true,...identity(),action:'submit',sameSourceChecksPassed:true};assert.equal(validateOwnerRelease(auth,context),true);
 for(const patch of [{version:'25.0.115',build:'53'},{candidateSource:'b'.repeat(40)},{appId:'other'},{action:'delete-products'},{sameSourceChecksPassed:false}])assert.throws(()=>validateOwnerRelease(auth,{...context,...patch}));
 assert.equal(require('../docs/requirements/release-readiness.json').overallComplete,false);
 const material=require('../docs/marketing/20261027/apple-118-learning-release.json');assert.equal(prep.validateMarketing(material,auth),material);for(const mutate of [m=>m.build='53',m=>delete m.locales['en-US'],m=>m.locales['zh-Hans'].keywords='长'.repeat(101)]){const m=copy(material);mutate(m);assert.throws(()=>prep.validateMarketing(m,auth));}
});
test('fresh overseas review access requires real login and download proofs without imposing a China-phone flag',()=>{
 const value={...identity(),checkedAt:new Date().toISOString(),loginSucceeded:true,sandboxAllowed:true,atlasDownloadAuthorized:true,completeLearningDownloadAuthorized:true,privateAppleReviewFieldsVerified:true,noAdditionalIdentityChallenge:true,noCredentialsPrinted:true};assert.equal(prep.validateAccess(value,auth),value);assert.equal(Object.hasOwn(value,'phoneVerified'),false);
 for(const patch of [{checkedAt:'2026-01-01'},{loginSucceeded:false},{completeLearningDownloadAuthorized:false},{privateAppleReviewFieldsVerified:false},{noAdditionalIdentityChallenge:false}])assert.throws(()=>prep.validateAccess({...value,...patch},auth));
});
test('only the exact owned Guoxue metadata and original pending IAP relationships can be mutated',()=>{
 const a={...auth,buildId:'11111111-1111-4111-8111-111111111111'},scope=prep.mutationScope(a),id='22222222-2222-4222-8222-222222222222',review='33333333-3333-4333-8333-333333333333',iap='44444444-4444-4444-8444-444444444444';scope.add('appStoreVersions',id);scope.add('reviewSubmissions',review);scope.add('inAppPurchaseVersions',iap);
 scope.assert('PATCH','/v1/appStoreVersions/'+id,{data:{type:'appStoreVersions',id,attributes:{versionString:a.version},relationships:{build:{data:{type:'builds',id:a.buildId}}}}});
 scope.assert('POST','/v1/reviewSubmissionItems',{data:{type:'reviewSubmissionItems',relationships:{reviewSubmission:{data:{type:'reviewSubmissions',id:review}},inAppPurchaseVersion:{data:{type:'inAppPurchaseVersions',id:iap}}}}});
 for(const [method,url,body] of [['DELETE','/v1/inAppPurchases/'+iap],['PATCH','/v1/appStoreReviewDetails/'+id,{data:{type:'appStoreReviewDetails',id,attributes:{demoAccountPassword:'must never be rewritten'}}}],['POST','/v1/reviewSubmissionItems',{data:{type:'reviewSubmissionItems',relationships:{reviewSubmission:{data:{type:'reviewSubmissions',id:review}},inAppPurchaseVersion:{data:{type:'inAppPurchaseVersions',id:'unowned'}}}}}],['PATCH','/v1/appStoreVersions/'+id,{data:{type:'appStoreVersions',id,relationships:{build:{data:{type:'builds',id:'other-build'}}}}}]])assert.throws(()=>scope.assert(method,url,body));
});
test('a nine-item review retains exactly its eight distinct existing IAP version IDs',()=>{
 const rows=[{attributes:{state:'WAITING_FOR_REVIEW'},relationships:{appStoreVersion:{data:{id:'version'}}}},...Array.from({length:8},(_,i)=>({attributes:{state:'WAITING_FOR_REVIEW'},relationships:{inAppPurchaseVersion:{data:{id:'iap-'+i}}}}))];const pending=prep.pendingIapIds(rows);assert.equal(pending.iapVersionIds.length,8);assert.equal(prep.sameIapIds(pending.iapVersionIds,[...pending.iapVersionIds].reverse()),true);assert.throws(()=>prep.sameIapIds(pending.iapVersionIds,pending.iapVersionIds.slice(1)));assert.throws(()=>prep.pendingIapIds(rows.slice(1)));assert.throws(()=>prep.pendingIapIds([...rows,rows[1]]));
});
test('source-pinned screenshots reject alpha, stale source, altered bytes, wrong size and escaped files before mutation',()=>{
 const folder=path.resolve('synthetic-screenshot-fixture'),files=new Map(),manifest={source:auth.candidateSource,workflowSource:auth.screenshotWorkflowSource||auth.candidateSource,run:auth.ci.screenshots,runAttempt:auth.screenshotRunAttempt,artifactId:auth.screenshotArtifactId,reusableWorkflowPath:auth.screenshotReusableWorkflowPath,physicalDevice:false,visualReviewed:true,sets:[]},features=['anatomy','ni-study','study-sharing','medical-home','original-texts'];
 for(const [device,displayType,w,h] of [['iphone','APP_IPHONE_67',1290,2796],['ipad','APP_IPAD_PRO_3GEN_129',2048,2732]]){const set={device,displayType,files:[]};manifest.sets.push(set);for(let i=0;i<5;i++){const raw=Buffer.alloc(33);Buffer.from('89504e470d0a1a0a','hex').copy(raw);raw.write('IHDR',12);raw.writeUInt32BE(w,16);raw.writeUInt32BE(h,20);raw[24]=8;raw[25]=2;const name=device+i+'.png';files.set(path.join(folder,name),raw);set.files.push({path:name,feature:features[i],bytes:raw.length,sha256:crypto.createHash('sha256').update(raw).digest('hex'),width:w,height:h});}}
 const module={exports:{}};vm.runInNewContext(fs.readFileSync('scripts/lib/appleOwnerPreparation.cjs','utf8'),{module,exports:module.exports,Buffer,require:id=>id==='node:fs'?{realpathSync:p=>p,readFileSync:p=>{if(!files.has(p))throw Error('missing');return files.get(p);}}:require(id)});const check=module.exports.validateScreenshots;assert.equal(check(manifest,auth,folder),manifest);
 for(const mutate of [m=>m.source='0'.repeat(40),m=>m.visualReviewed=false,m=>m.sets[0].files[0].sha256='0'.repeat(64),m=>m.sets[0].files[0].width=1,m=>m.sets[0].files[0].path='../outside.png',m=>m.sets[0].files[0].feature='old-homepage']){const value=copy(manifest);mutate(value);assert.throws(()=>check(value,auth,folder));}
 const alpha=Buffer.from(files.values().next().value);alpha[25]=6;assert.throws(()=>prep.pngInfo(alpha));
});
test('the visually reviewed manifest is pinned by its full bytes, not only editable source labels',()=>{const raw=Buffer.from('{"synthetic":"manifest-only fixture"}'),a={...auth,screenshotManifestSha256:prep.hash(raw)};assert.equal(prep.readScreenshotManifest(raw,a).synthetic,'manifest-only fixture');assert.throws(()=>prep.readScreenshotManifest(Buffer.concat([raw,Buffer.from(' ')]),a));});

async function simulateReplacement({rootReady=false,badScreenshotsCI=false,badAccess=false,alreadyCurrent=false,capacityOverflow=false}={}){
 const a=copy(auth),material=copy(require('../docs/marketing/20261027/apple-118-learning-release.json')),version='22222222-2222-4222-8222-222222222222',review='33333333-3333-4333-8333-333333333333',build='11111111-1111-4111-8111-111111111111',detail='55555555-5555-4555-8555-555555555555',ids=Array.from({length:8},(_,i)=>'66666666-6666-4666-8666-66666666666'+i),writes=[],receipts=[];
 a.screenshotManifestSha256=prep.hash(Buffer.from('{}'));
 const access={...identity(),checkedAt:new Date().toISOString(),loginSucceeded:!badAccess,sandboxAllowed:true,atlasDownloadAuthorized:true,completeLearningDownloadAuthorized:true,privateAppleReviewFieldsVerified:true,noAdditionalIdentityChallenge:true,noCredentialsPrinted:true};
 const snapshot={...identity(),state:'READ_ONLY_CURRENT_APP_SNAPSHOT',versionRecord:{id:version},previousPending:{submissionId:review,versionId:version,iapVersionIds:ids}};
 const responses=url=>{
  if(url==='/v1/apps/'+a.appId)return {data:{attributes:{bundleId:a.bundleId}}};
  if(url.includes('/appStoreVersions?'))return {data:[{id:version,attributes:{versionString:alreadyCurrent?a.version:a.previousPendingCandidate.version,appStoreState:'WAITING_FOR_REVIEW'}}]};
  if(url.startsWith('/v1/builds?'))return {data:[{id:build,attributes:{version:a.build,processingState:'VALID',expired:false},relationships:{preReleaseVersion:{data:{id:'pre'}}}}],included:[{id:'pre',type:'preReleaseVersions',attributes:{version:a.version}}]};
  if(url.includes('/inAppPurchasesV2?'))return {data:ids.map((id,i)=>({id:'product-'+i,attributes:{productId:a.bundleId+'.product'+i}}))};
  if(url.startsWith('/v2/inAppPurchases/')){const i=Number(url.match(/product-(\d)/)[1]);return {included:[{id:ids[i],type:'inAppPurchaseVersions',attributes:{state:'WAITING_FOR_REVIEW'}}]};}
  if(url.startsWith('/v1/reviewSubmissions?'))return {data:[{id:review,attributes:{state:'WAITING_FOR_REVIEW',platform:'IOS'}}]};
  if(url.includes('/items?'))return {data:[{attributes:{state:'WAITING_FOR_REVIEW'},relationships:{appStoreVersion:{data:{id:version}}}},...ids.map(id=>({attributes:{state:'WAITING_FOR_REVIEW'},relationships:{inAppPurchaseVersion:{data:{id}}}}))]};
  if(url.endsWith('/build'))return {data:{id:alreadyCurrent?build:'old-build',attributes:{version:alreadyCurrent?a.build:a.previousPendingCandidate.build}}};
  if(url.endsWith('/appStoreReviewDetail'))return {data:{id:detail,attributes:{demoAccountName:'secret-review-login',demoAccountPassword:'secret-review-password'}}};
  if(url.includes('/appStoreVersionLocalizations?'))return {data:capacityOverflow?[{id:'77777777-7777-4777-8777-777777777777',attributes:{locale:'zh-Hans'}}]:[]};
  if(url.includes('/appScreenshotSets?'))return {data:[{id:'88888888-8888-4888-8888-888888888888',attributes:{screenshotDisplayType:'APP_IPHONE_67'}}]};
  if(url.includes('/appScreenshots?'))return {data:Array.from({length:6},(_,i)=>({id:'old-'+i,attributes:{fileName:'53_old'+i,assetDeliveryState:{state:'COMPLETE'}}}))};
  if(url.includes('/appInfos?'))return {data:[]};
  if(url==='/v1/reviewSubmissions/'+review)return {data:{id:review,attributes:{state:'CANCELING'}}};throw Error('Unexpected mock read '+url);
 };
 const api=async(method,url,body)=>{if(method!=='GET'){writes.push({method,url,body});return {data:{type:body.data.type,id:body.data.id,attributes:{state:'CANCELING'}}};}return responses(url);};
 const fakeFS={existsSync:()=>false,readFileSync:p=>JSON.stringify(String(p).endsWith('apple-118-learning-release.json')?material:String(p).endsWith('screens.json')?{}:String(p).endsWith('access.json')?access:snapshot),mkdirSync(){},writeFileSync:(p,text)=>receipts.push(JSON.parse(text))};
 const proc={argv:['node','release','--stage=replace-metadata','--output=receipt.json','--snapshot=snapshot.json','--screenshots=screens.json','--access=access.json',...(rootReady?['--root-all-preparations-ready']:[])],exitCode:0};
 const paths={quality:'.github/workflows/study-quality.yml',native:'.github/workflows/ios-build.yml',upload:'.github/workflows/ios-build.yml',screenshots:a.screenshotWorkflowPath||'.github/workflows/ios-simulator-proof.yml'};
 await vm.runInNewContext(fs.readFileSync('scripts/asc-owner-release.cjs','utf8'),{__dirname:path.resolve('scripts'),process:proc,console:{log(){}},require:id=>{
  if(id==='node:fs')return fakeFS;if(id==='node:child_process')return {execFileSync:(_,args)=>{const number=Number(args[1].split('/').at(-1)),kind=Object.keys(a.ci).find(k=>a.ci[k]===number);return JSON.stringify({head_sha:kind==='screenshots'?(a.screenshotWorkflowSource||a.candidateSource):a.candidateSource,run_attempt:kind==='screenshots'?(a.screenshotRunAttempt||1):1,status:badScreenshotsCI&&kind==='screenshots'?'in_progress':'completed',conclusion:'success',repository:{full_name:'wzmpa18/minglizyi'},path:paths[kind]});}};
  if(id==='../docs/requirements/apple-owner-release.json')return a;if(id==='./lib/guoxueAscClient.cjs')return {createClient:()=>({api})};if(id==='./lib/appleOwnerPreparation.cjs')return {...prep,validateScreenshots:()=>({sets:capacityOverflow?[{device:'iphone',displayType:'APP_IPHONE_67',files:Array.from({length:5},(_,i)=>({sha256:String(i).repeat(64)}))}]:[]})};if(id.startsWith('node:'))return require(id);throw Error(id);
 },TextDecoder,URL,AbortSignal,fetch:()=>{throw Error('No real requests in mutation test');},Buffer});
 // The material file is the first read, while test-specific JSON inputs use fakeFS.
 return {writes,receipts,exitCode:proc.exitCode};
}
test('replacement never cancels with missing root readiness, unfinished screenshot CI, failed reviewer access or an already-current review',async()=>{
 // Supply the actual current marketing object while retaining in-memory receipts.
 for(const option of [{},{rootReady:true,badScreenshotsCI:true},{rootReady:true,badAccess:true},{rootReady:true,alreadyCurrent:true},{rootReady:true,capacityOverflow:true}]){
  const result=await simulateReplacement(option);assert.equal(result.writes.length,0);assert.ok(result.receipts.at(-1).error);
 }
});
test('an explicitly ready replacement cancels only the freshly checked old review and waits without changing its eight product versions',async()=>{
 const result=await simulateReplacement({rootReady:true});assert.equal(result.writes.length,1);assert.equal(result.writes[0].method,'PATCH');assert.match(result.writes[0].url,/^\/v1\/reviewSubmissions\//);assert.equal(JSON.stringify(result.writes[0].body.data.attributes),JSON.stringify({canceled:true}));assert.equal(result.receipts.at(-1).state,'AWAITING_OLD_CANCELLATION');assert.equal(result.receipts.at(-1).historicalIapMutations,0);assert.ok(!JSON.stringify(result.receipts).includes('secret-review-'));
});

function uploadFixture({existingState,expired=false,alwaysExpired=false,interrupt=false}={}){
 const raw=Buffer.from('Real-byte-equivalent upload fixture'),sha256=prep.hash(raw),name=prep.screenshotName(auth.build,'iphone',0,sha256),store=new Map(),writes=[],trace=[];let count=0,parts=0;
 const operations=()=>[{url:'https://upload.apple.com/first',method:'PUT',offset:0,length:10,requestHeaders:[]},{url:'https://upload.apple.com/second',method:'PUT',offset:10,length:raw.length-10,requestHeaders:[]}];
 const make=(id,state)=>({id,attributes:{fileName:name,fileSize:raw.length,assetDeliveryState:{state},uploadOperations:operations()}});
 if(existingState)store.set('old-new-60',make('old-new-60',existingState));
 const old53={id:'protected-old53',attributes:{fileName:'53_iphone_0_old.png',assetDeliveryState:{state:'COMPLETE'}}};
 const api=async(method,url)=>{assert.equal(method,'GET');const row=store.get(url.split('/').at(-1));if(!row)throw Error('missing new asset');return {data:copy(row)};};
 const write=async(method,url,body)=>{writes.push({method,url,body});if(method==='DELETE'){assert.notEqual(url.split('/').at(-1),old53.id);store.delete(url.split('/').at(-1));return {};}
  if(method==='POST'){const row=make('new-'+(++count),'AWAITING_UPLOAD');store.set(row.id,row);return {data:copy(row)};}
  const row=store.get(body.data.id);row.attributes.assetDeliveryState.state='UPLOAD_COMPLETE';return {data:copy(row)};
 };
 const put=async()=>{parts++;if(interrupt&&parts===2)throw Error('Network interrupted after one part');if(alwaysExpired||expired&&parts===1)return {ok:false,status:403};return {ok:true,status:200};};
 const upload=()=>prep.recoverableScreenshotUpload({api,write,setId:'owned-set',existing:[old53,...store.values()].map(copy),raw,build:auth.build,device:'iphone',index:0,sha256,trace,put});return {upload,store,writes,trace,get parts(){return parts;},name};
}
test('a partial upload resumes the same new60 hash asset and never removes old53 references',async()=>{
 const f=uploadFixture({interrupt:true});await assert.rejects(f.upload(),/interrupted/);assert.equal(f.writes.filter(w=>w.method==='POST').length,1);assert.equal(f.writes.filter(w=>w.method==='DELETE').length,0);
 const second=await f.upload();assert.equal(second.id,'new-1');assert.equal(f.writes.filter(w=>w.method==='POST').length,1);assert.equal(f.writes.filter(w=>w.method==='PATCH').length,1);assert.equal(f.writes.filter(w=>w.method==='DELETE').length,0);assert.equal(f.parts,4);assert.ok(f.trace.some(r=>r.operation==='uploaded-or-resumed'));
});
test('FAILED or expired new60 assets rebuild only their own bad reference once; processing and COMPLETE assets do not reupload',async()=>{
 for(const args of [{existingState:'FAILED'},{existingState:'AWAITING_UPLOAD',expired:true}]){const f=uploadFixture(args),result=await f.upload();assert.equal(result.id,'new-1');assert.equal(f.writes.filter(w=>w.method==='DELETE').length,1);assert.equal(f.writes.find(w=>w.method==='DELETE').url,'/v1/appScreenshots/old-new-60');assert.equal(f.writes.filter(w=>w.method==='POST').length,1);}
 const stuck=uploadFixture({existingState:'AWAITING_UPLOAD',alwaysExpired:true});await assert.rejects(stuck.upload(),/HTTP403|HTTP 403/);assert.equal(stuck.writes.filter(w=>w.method==='DELETE').length,1);assert.equal(stuck.writes.filter(w=>w.method==='POST').length,1);
 for(const existingState of ['COMPLETE','UPLOAD_COMPLETE','PROCESSING']){const f=uploadFixture({existingState}),result=await f.upload();assert.equal(result.id,'old-new-60');assert.equal(f.writes.length,0);assert.equal(f.parts,0);}
});
test('slot capacity is checked before cancellation and counts already-created current hash assets without duplicating them',()=>{
 const files=Array.from({length:5},(_,i)=>({sha256:String(i).repeat(64)})),groups=[{device:'iphone',displayType:'APP_IPHONE_67',files}],old=Array.from({length:5},(_,i)=>({fileName:'53_old'+i})),slots=[{locale:'zh-Hans',sets:[{displayType:'APP_IPHONE_67',screenshots:old}]}];
 assert.equal(prep.planScreenshotCapacity(slots,groups,['zh-Hans'],auth.build)[0].maximumDuringUpload,10);slots[0].sets[0].screenshots.push({fileName:'53_extra'});assert.throws(()=>prep.planScreenshotCapacity(slots,groups,['zh-Hans'],auth.build),/before cancellation/);
 slots[0].sets[0].screenshots=old.slice(0,5).concat(files.map((f,i)=>({fileName:prep.screenshotName(auth.build,'iphone',i,f.sha256)})));const plan=prep.planScreenshotCapacity(slots,groups,['zh-Hans'],auth.build)[0];assert.equal(plan.additional,0);assert.equal(plan.maximumDuringUpload,10);
});
