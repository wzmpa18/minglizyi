'use strict';
// Run the actual released client's codec/index/readers against a private local
// data candidate. No network, app build, COS publication or real account data.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{webcrypto,createHash}=require('node:crypto');
const arg=name=>process.argv.find(value=>value.startsWith('--'+name+'='))?.slice(name.length+3);
const previous=arg('previous'),candidate=arg('candidate'),revision=arg('client-source'),output=arg('output');
if(!previous||!candidate||!output||!/^[a-f0-9]{40}$/.test(revision||''))throw Error('Explicit previous/candidate/client-source/output required');
if(fs.existsSync(output))throw Error('A prior verification receipt must not be overwritten');
const ts=require('typescript'),fflate=require('fflate'),{IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=file=>execFileSync('git',['show',revision+':'+file],{encoding:'utf8',maxBuffer:25*1024*1024});
const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const nativeDisk=new Map();let networkCalls=0;
function fixture(indexedDB=new IDBFactory()){
 const cache=new Map(),window={dispatchEvent(){},addEventListener(){},confirm:()=>true};
 function load(name){
  const file=name.startsWith('src/')?name:'src/lib/'+name.replace(/^\.\//,'')+'.ts';
  if(cache.has(file))return cache.get(file);
  const exports={};cache.set(file,exports);
  const code=ts.transpileModule(source(file),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const context={exports,console,window,CustomEvent:class{},Event:class{},indexedDB,IDBKeyRange,crypto:webcrypto,URL,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,Blob,AbortSignal,process:{env:{}},fetch:async()=>{networkCalls++;throw Error('Network must stay unavailable');},require:id=>{
   if(id==='fflate')return fflate;
   if(id==='@capacitor/core')return {Capacitor:{isPluginAvailable:name=>name==='OfflineFiles'},registerPlugin:()=>({read:async({key})=>({value:nativeDisk.get(key)||null}),write:async({key,value})=>{nativeDisk.set(key,value);return {saved:true,bytes:Buffer.byteLength(value)};},remove:async({key})=>nativeDisk.delete(key)})};
   if(id==='./authInterceptor')return {fetchWithAuth:async()=>{networkCalls++;throw Error('Network unavailable');}};
   if(id==='@/algorithm-core/modules/tcm/classics')return {getAllBooks:()=>[]};
   if(id.startsWith('@/data/')&&id.endsWith('.json'))return JSON.parse(source('src/data/'+id.slice('@/data/'.length)));
   if(id.startsWith('./'))return load(id.slice(2));
   throw Error('Unexpected dependency '+id+' in '+file);
  }};
  vm.runInNewContext(code,context,{filename:file});return exports;
 }
 return {load};
}
const asBuffer=bytes=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
(async()=>{
 const oldBytes=fs.readFileSync(previous),newBytes=fs.readFileSync(candidate),oldRaw=asBuffer(oldBytes),newRaw=asBuffer(newBytes),warm=fixture();
 assert.equal(warm.load('releaseFeatures').CLIENT_VERSION,'25.0.117');
 const codec=warm.load('learningBundleCodec'),storage=warm.load('storageManager'),client=warm.load('offlinePackClient');
 const oldManifest=codec.learningBundleManifest(oldRaw),nextManifest=await codec.validateLearningBundle(newRaw,'tcm-learning-complete','1.1.2');
 assert.equal(nextManifest.files.length,309);assert.equal(nextManifest.members.length,9);
 const changes=oldManifest.files.filter(row=>nextManifest.files.find(next=>next.path===row.path)?.sha256!==row.sha256).map(row=>row.path);
 assert.deepEqual(copy(changes),['data/tcm-original-editions-approved.json']);
 const imageRows=oldManifest.files.filter(row=>row.path.startsWith('assets/'));
 for(const row of imageRows){const next=nextManifest.files.find(next=>next.path===row.path);assert.equal(next.sha256,row.sha256);assert.equal(next.bytes,row.bytes);}
 await storage.activateOfflinePack(oldManifest.packId,oldManifest.version,hash(oldBytes),oldRaw,oldManifest.members);
 const priorBooks=await client.loadJsonPack('tcm-original-editions-approved'),priorMedical=await client.loadJsonPack('medical-study-library'),priorNi=await client.loadJsonPack('ni-teacher-courses');
 assert.equal(priorBooks.books.length,36);assert.equal(priorMedical.version,'1.2.0');assert.equal(priorNi.version,'1.0.1');
 await warm.load('retainedTcmEditions').retainedEditionPack('tcm-original-editions-approved',[],true);
 await warm.load('niTeacherCourses').installApprovedNiCollection(priorNi);
 await storage.activateOfflinePack(nextManifest.packId,nextManifest.version,hash(newBytes),newRaw,nextManifest.members);
 const installedBooks=await client.loadJsonPack('tcm-original-editions-approved'),medical=await client.loadJsonPack('medical-study-library'),ni=await client.loadJsonPack('ni-teacher-courses');
 assert.equal(installedBooks.version,'1.4.0');assert.equal(installedBooks.books.length,39);
 for(const book of priorBooks.books)assert.deepEqual(copy(installedBooks.books.find(next=>next.id===book.id)),copy(book));
 assert.deepEqual(copy(medical),copy(priorMedical));assert.deepEqual(copy(ni),copy(priorNi));
 const retained=await warm.load('retainedTcmEditions').retainedEditionPack('tcm-original-editions-approved',priorBooks.books,true);assert.equal(retained.books.length,39);
 await warm.load('niTeacherCourses').installApprovedNiCollection(ni);
 // A fresh VM and an empty IndexedDB emulate a cold reader that has only the
 // same persisted native files. This is not a physical iPhone acceptance run.
 const cold=fixture(),offline=await cold.load('retainedTcmEditions').retainedEditionPack('tcm-original-editions-approved',priorBooks.books,true);assert.equal(offline.books.length,39);
 const newBookIds=['wang-zisheng-original','hua-shisijing-original','li-qijing-bamai-original'],newBooks=[];
 for(const id of newBookIds){const book=offline.books.find(book=>book.id===id),expected=installedBooks.books.find(book=>book.id===id);assert.ok(book);assert.deepEqual(copy(book),copy(expected));newBooks.push({id,chapters:book.chapters.length,contentSha256:book.contentSha256});}
 let chapters=0;for(const course of ni.courses){const restored=await cold.load('niTeacherCourses').loadNiCourse(course.id);assert.ok(restored?.persisted);assert.equal(restored.version,course.version);assert.deepEqual(copy(restored.chapters),copy(course.chapters));chapters+=restored.chapters.length;}
 assert.equal(chapters,1141);assert.equal(networkCalls,0);
 const proof={checkedAt:new Date().toISOString(),candidate:path.resolve(candidate),bytes:newBytes.length,sha256:hash(newBytes),clientSource:revision,clientVersion:'25.0.117',protocolCompatible:true,dataOnly:true,recompiledApplication:false,published:false,previousArchiveSha256:hash(oldBytes),changedEntries:changes,unchangedEntriesShaVerified:308,originalImagesPreserved:imageRows.length,oldBooksRetained:36,installedBooks:39,newBooks,medicalVersion:medical.version,medicalUnchanged:true,courseVersion:ni.version,courses:ni.courses.length,chapters,courseBodiesUnchanged:true,actualReleasedCodecAndIndexUsed:true,nativePersistenceBridge:'in-memory adapter matching OfflineFiles contract',freshSessionAndEmptyIndexedDBColdRead:true,networkCalls,physicalDeviceAcceptance:false};
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(proof));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
