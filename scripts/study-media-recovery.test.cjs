'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),fflate=require('fflate'),{webcrypto,createHash}=require('node:crypto');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
function compiled(file){return ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;}
function codec(){const exports={};vm.runInNewContext(compiled('src/lib/learningBundleCodec.ts'),{exports,Uint8Array,ArrayBuffer,TextDecoder,crypto:webcrypto,require:id=>{if(id==='fflate')return fflate;throw Error(id);}});return exports;}
const bundleCodec=codec();
function fixture({bytes=null,disk=new Map(),dropCatalogue=false,loadPack}={}){
 const events=new Map(),state={bytes,disk,packReads:0,fetches:0,authLookups:0,catalogueWrites:0};
 const Files={read:async({key})=>({value:disk.get(key)??null}),write:async({key,value})=>{if(key==='study-media-manifest'){state.catalogueWrites++;if(dropCatalogue)return {saved:false,bytes:0};}disk.set(key,value);return {saved:true,bytes:Buffer.byteLength(value)};},remove:async({key})=>disk.delete(key)};
 const durable={};vm.runInNewContext(compiled('src/lib/durableOfflineStore.ts'),{exports:durable,require:id=>id==='@capacitor/core'?{Capacitor:{isPluginAvailable:()=>true},registerPlugin:()=>Files}:id==='./storageManager'?{}:(()=>{throw Error(id);})()});
 const exports={},window={addEventListener:(name,fn)=>events.set(name,fn)};
 const client={loadPackContent:async id=>{assert.equal(id,'tcm-learning-complete');state.packReads++;return loadPack?loadPack(id):state.bytes;}};
 vm.runInNewContext(compiled('src/lib/studyMedia.ts'),{exports,window,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,AbortSignal,URL,btoa,atob,process:{env:{}},fetch:async()=>{state.fetches++;throw Error('No network');},require:id=>{
  if(id==='./durableOfflineStore')return durable;
  if(id==='./offlinePackClient')return client;
  if(id==='./learningBundleCodec')return bundleCodec;
  if(id==='./authInterceptor')return {fetchWithAuth:async()=>{state.authLookups++;throw Error('No network');}};
  if(id.startsWith('../../public/'))return require(path.resolve('src/lib',id));
  throw Error(id);
 }});
 return {api:exports,state,installEvent:()=>events.get('offline-pack-installed')?.({detail:{packId:'tcm-learning-complete'}})};
}
const original=copy(fixture().api.bundledStudyMedia),newBytes=fs.readFileSync('public/assets/acupoint-photos/hegu-li4-mk2010.jpg');
const extra={path:'/assets/acupoint-photos/atlas-recovery-test.jpg',bytes:newBytes.length,sha256:hash(newBytes),mime:'image/jpeg'};
function archive({corruptCatalogue=false,corruptImage=false}={}){
 const catalog={...copy(original),version:original.version+1,records:[...copy(original.records),extra]},raw=Buffer.from(JSON.stringify(catalog)),files={'data/tcm-study-media.json':raw};
 for(const row of catalog.records)files[row.path.slice(1)]=row.path===extra.path?newBytes:fs.readFileSync('public'+row.path);
 const entries=Object.entries(files).map(([name,value])=>({path:name,bytes:value.length,sha256:hash(value),mime:name.endsWith('.json')?'application/json':catalog.records.find(row=>row.path==='/'+name).mime})),media=entries[0];
 const manifest={schema:'yandao.learning-bundle.v1',packId:'tcm-learning-complete',version:'1.1.2',name:'Synthetic recovery fixture',files:entries,members:[{packId:'tcm-study-media',version:'1.0.0',entryPath:media.path,bytes:media.bytes,sha256:media.sha256}]};
 if(corruptCatalogue){const changed=Buffer.from(raw);changed[changed.length-2]^=1;files[media.path]=changed;}
 if(corruptImage){const changed=Buffer.from(newBytes);changed[0]^=1;files[extra.path.slice(1)]=changed;}
 files['manifest.json']=Buffer.from(JSON.stringify(manifest));const zipped=fflate.zipSync(files);return {catalog,bytes:zipped.buffer.slice(zipped.byteOffset,zipped.byteOffset+zipped.byteLength)};
}
const base=archive();
test('a missing durable catalogue recovers from the installed archive without HTTP and survives a new reader',async()=>{
 const first=fixture({bytes:base.bytes});const result=await first.api.studyMediaManifest();assert.equal(result.records.length,31);assert.equal(first.state.fetches,0);assert.equal(first.state.catalogueWrites,1);assert.deepEqual(JSON.parse(first.state.disk.get('study-media-manifest')),base.catalog);
 const data=await first.api.retainedStudyImage(extra.path);assert.equal(hash(Buffer.from(data.split(',')[1],'base64')),extra.sha256);assert.equal(first.state.authLookups,0);
 const cold=fixture({bytes:base.bytes,disk:first.state.disk});assert.equal(await cold.api.retainedStudyImage(extra.path),data);assert.equal(cold.state.fetches,0);
});
test('newer retained catalogues win; a damaged archive never overwrites retained metadata or verified images',async()=>{
 const retained={...copy(base.catalog),version:base.catalog.version+10},disk=new Map([['study-media-manifest',JSON.stringify(retained)]]),newer=fixture({bytes:base.bytes,disk});assert.equal((await newer.api.studyMediaManifest()).version,retained.version);assert.equal(newer.state.catalogueWrites,0);
 const damaged=fixture({bytes:archive({corruptCatalogue:true}).bytes,disk});disk.set('study-image-'+extra.sha256,JSON.stringify({data:newBytes.toString('base64')}));const before=disk.get('study-media-manifest');
 assert.equal((await damaged.api.studyMediaManifest()).version,retained.version);assert.equal(await damaged.api.retainedStudyImage(extra.path),'data:image/jpeg;base64,'+newBytes.toString('base64'));assert.equal(disk.get('study-media-manifest'),before);
});
test('metadata write loss still permits verified local reading and cannot manufacture a saved directory',async()=>{
 const disk=new Map([['study-media-manifest',JSON.stringify(original)]]),first=fixture({bytes:base.bytes,disk,dropCatalogue:true});assert.equal((await first.api.studyMediaManifest()).records.length,31);assert.equal(JSON.parse(disk.get('study-media-manifest')).records.length,30);
 assert.equal(hash(Buffer.from((await first.api.retainedStudyImage(extra.path)).split(',')[1],'base64')),extra.sha256);assert.equal(first.state.fetches,0);assert.equal(first.state.authLookups,0);
});
test('a pre-installation cached directory repairs in the same session with or without an installer event',async()=>{
 for(const sendEvent of [false,true]){const first=fixture();assert.equal((await first.api.studyMediaManifest()).records.length,30);first.state.bytes=base.bytes;if(sendEvent)first.installEvent();const fetches=first.state.fetches;assert.match(await first.api.retainedStudyImage(extra.path),/^data:image\/jpeg;base64,/);assert.equal(first.state.fetches,fetches);assert.equal(first.state.authLookups,0);}
});
test('protected originals remain immutable, corrupt image bytes are never saved, and missing packs retain originals',async()=>{
 const first=fixture({bytes:archive({corruptImage:true}).bytes});await assert.rejects(first.api.retainedStudyImage(extra.path));assert.equal(first.state.disk.has('study-image-'+extra.sha256),false);
 const changed=copy(original);changed.records[0].sha256='0'.repeat(64);assert.throws(()=>first.api.validateStudyMedia(changed));
 const missing=fixture();assert.equal((await missing.api.studyMediaManifest()).records.length,30);assert.equal(missing.state.fetches,1);
});

function rawInstalledClient(bytes){
 const {IDBFactory,IDBKeyRange}=require('fake-indexeddb'),indexedDB=new IDBFactory(),cache=new Map();
 function load(name){if(cache.has(name))return cache.get(name);const exports={};cache.set(name,exports);vm.runInNewContext(compiled('src/lib/'+name+'.ts'),{exports,indexedDB,IDBKeyRange,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,Blob,URL,process:{env:{}},require:id=>id==='fflate'?fflate:id==='./authInterceptor'?{}:load(id.slice(2))});return exports;}
 return {install:async()=>{const m=bundleCodec.learningBundleManifest(bytes);await load('storageManager').activateOfflinePack(m.packId,m.version,hash(Buffer.from(bytes)),bytes,m.members);},loadPack:id=>load('offlinePackClient').loadPackContent(id)};
}
test('actual 1.1.2 raw installation recovers all 299 records and original new-page bytes offline',{skip:!process.env.TCM_MEDIA_RECOVERY_CANDIDATE},async()=>{
 const raw=fs.readFileSync(process.env.TCM_MEDIA_RECOVERY_CANDIDATE),bytes=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);assert.equal(hash(raw),'f214938bff5e9e3501422bc698e328789d8aca58a0eb0a332326d9833be8229e');
 await bundleCodec.validateLearningBundle(bytes,'tcm-learning-complete','1.1.2');const client=rawInstalledClient(bytes);await client.install();const view=fixture({loadPack:client.loadPack});assert.equal(view.state.disk.has('study-media-manifest'),false);
 const media=await view.api.studyMediaManifest();assert.equal(media.records.length,299);assert.equal(view.state.fetches,0);assert.equal(view.state.authLookups,0);
 const record=media.records.find(row=>row.path.includes('atlas-lan-'));assert.ok(record);const image=await view.api.retainedStudyImage(record.path);assert.equal(hash(Buffer.from(image.split(',')[1],'base64')),record.sha256);
 const protectedRecord=media.records.find(row=>row.path===original.records[0].path);const oldImage=await view.api.retainedStudyImage(protectedRecord.path);assert.equal(hash(Buffer.from(oldImage.split(',')[1],'base64')),protectedRecord.sha256);assert.equal(view.state.fetches,0);
 const cold=fixture({disk:view.state.disk,loadPack:client.loadPack});assert.equal((await cold.api.studyMediaManifest()).records.length,299);assert.equal(await cold.api.retainedStudyImage(record.path),image);assert.equal(cold.state.fetches,0);
 const proof={checkedAt:new Date().toISOString(),candidateSha256:hash(raw),rawArchiveAndVirtualIndexOnlyBeforeReading:true,durableMediaDirectoryInitiallyAbsent:true,recoveredRecords:299,newOriginalPage:record.path,newOriginalPageSha256:record.sha256,newPageBytesFullyVerified:true,protectedOriginalImageVerified:true,networkRequests:0,privateShortLinkRequests:0,freshReaderColdRead:true,physicalDeviceAcceptance:false};
 if(process.env.TCM_MEDIA_RECOVERY_PROOF){if(fs.existsSync(process.env.TCM_MEDIA_RECOVERY_PROOF))throw Error('Prior recovery proof exists');fs.writeFileSync(process.env.TCM_MEDIA_RECOVERY_PROOF,JSON.stringify(proof,null,2)+'\n',{flag:'wx'});}console.log(JSON.stringify(proof));
});
