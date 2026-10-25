const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {webcrypto,createHash}=require('node:crypto');
function load(file,deps,extra={}){const exports={};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(code,{exports,URL,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,AbortSignal,atob,btoa,console,...extra,require:name=>{if(name in deps)return deps[name];throw Error(name);}});return exports;}
const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
test('CI offline injection blocks services and image fetch while preserving bundled navigation and the native bridge',async()=>{
 const allowed=[],proof=[],timers=[];
 class Xhr{open(){}send(){allowed.push('xhr');}}
 const window={XMLHttpRequest:Xhr,location:{href:'capacitor://localhost/',protocol:'capacitor:',host:'localhost'},fetch:async input=>{allowed.push(String(input));return {ok:true};},webkit:{messageHandlers:{qaOfflineNetworkProof:{postMessage:value=>proof.push(copy(value))}}}};
 vm.runInNewContext(fs.readFileSync('scripts/ios-learning-network-fault.js','utf8'),{window,XMLHttpRequest:Xhr,URL,WeakMap,setInterval:fn=>{timers.push(fn);return 1;},clearInterval:()=>{}});
 await window.fetch('/offline/index.html');await window.fetch('/zhongyi/meridian/?_rsc=local');
 for(const path of ['https://yandaoguoxue.yandao.vip/api/health','/api/health','/assets/acupoint-photos/hegu-li4-mk2010.jpg','/assets/meridians/large-intestine.webp'])await assert.rejects(window.fetch(path));
 const local=new window.XMLHttpRequest();local.open('GET','/offline/index.html');local.send();
 const remote=new window.XMLHttpRequest();remote.open('GET','https://example.org');assert.throws(()=>remote.send());
 await timers[0]();assert.deepEqual(proof,[{fetchBlocked:true,xhrBlocked:true,imageFetchBlocked:true,bundledRouteAllowed:true}]);assert.equal(allowed.length,3);
 // Native bridge setup may replace browser functions after document-start.
 window.fetch=async()=>({ok:true});window.XMLHttpRequest=class NativeXHR {constructor(){this.open=function(){};this.send=function(){};}};
 await timers[0]();await assert.rejects(window.fetch('/api/health'));const later=new window.XMLHttpRequest();later.open('GET','https://example.org');assert.throws(()=>later.send());assert.equal(proof.length,2);
});
test('full original books survive IndexedDB loss; corrupted native copies and partial replacements are rejected',async()=>{
 const store=disk(),edition=load('src/lib/tcmEditionPack.ts',{});
 const book={id:'original-test',name:'原典',author:'原作者',dynasty:'古代',pinyin:'original',description:'原文',sourceName:'测试底本',license:'古代原文',verification:'提取核对',sourceUrl:'https://example.org/source',sourceRevisionUrl:'https://example.org/revision',chapters:[{id:'original-chapter',title:'原篇',content:'完整原文。'.repeat(20)}]};
 const pack={schema:'yandao.tcm.original-editions.v1',version:'1.0.0',books:[book]};
 const api=raw=>load('src/lib/retainedTcmEditions.ts',{'@/algorithm-core/modules/tcm/classics':{getAllBooks:()=>[]},'./offlinePackClient':{loadJsonPack:async()=>copy(raw)},'./durableOfflineStore':store.api,'./tcmEditionPack':edition,'./releaseFeatures':{CLIENT_VERSION:'25.0.115'}});
 assert.equal((await api(pack).retainedEditionPack('tcm-materia-originals',[],true)).books.length,1);
 assert.equal((await api(null).retainedEditionPack('tcm-materia-originals')).books[0].chapters[0].content,book.chapters[0].content);
 const partial=copy(pack);partial.books[0].chapters[0].content='短文';assert.equal((await api(partial).retainedEditionPack('tcm-materia-originals',[book])).books[0].chapters[0].content,book.chapters[0].content);
 const key=[...store.files.keys()].find(k=>k.startsWith('tcm-book-'));store.files.get(key).book.chapters[0].content='损坏';assert.equal(await api(null).retainedEditionPack('tcm-materia-originals'),null);
});
function disk(){const files=new Map();return {files,api:{readOfflineFile:async key=>copy(files.get(key)||null),writeOfflineFile:async(key,value)=>{files.set(key,copy(value));}}};}
const text='百会的来源测试段落。';
function fixture(){const id='a'.repeat(24);return {schema:'yandao.medical.study-library.v1',version:'1.0.0',sources:{'test-source':{title:'测试原典',author:'测试作者',kind:'CLASSIC_ORIGINAL',sha256:'b'.repeat(64),url:'https://zh.wikisource.org/w/index.php?oldid=1'}},passages:{[id]:{source:'test-source',chapter:'test-chapter',chapterTitle:'测试篇章',text,lineStart:1,lineEnd:2,sha256:createHash('sha256').update(text).digest('hex')}},subjects:{'point:DU20':{name:'百会',kind:'point',references:[id]},'herb:h001':{name:'桂枝',kind:'herb',references:[]}}};}
function library(raw,store){return load('src/lib/medicalStudyLibrary.ts',{'./offlinePackClient':{loadJsonPack:async()=>copy(raw)},'./durableOfflineStore':store.api,'./releaseFeatures':{CLIENT_VERSION:'25.0.115'}});}

test('source-linked drug and point data reject dangling sources, malformed references and unsafe links',()=>{
 const api=library(null,disk());assert.ok(api.validateMedicalLibrary(fixture()));
 for(const change of [
  x=>x.passages['a'.repeat(24)].source='__proto__',
  x=>x.sources['test-source'].url='javascript:alert(1)',
  x=>x.subjects['herb:h001'].references=['missing'],
  x=>x.passages['a'.repeat(24)].lineEnd=0,
  x=>x.sources['test-source'].kind='UNVERIFIED_GENERATION',
  x=>x.subjects['herb:h001'].illustrations=[{path:'javascript:alert(1)',title:'图',caption:'说明',source:'test-source'}],
  x=>x.subjects['herb:h001'].illustrations=[{path:'/assets/acupoint-photos/example.webp',title:'图',caption:'说明',source:'missing-source'}],
 ]){const bad=fixture();change(bad);assert.throws(()=>api.validateMedicalLibrary(bad));}
});

test('phone-file persistence survives a fresh session with no IndexedDB pack and resolves legacy point codes',async()=>{
 const store=disk();const first=library(fixture(),store);const saved=await first.medicalSubject('point:DU20');assert.equal(saved.persisted,true);assert.equal(saved.passages[0].text,text);
 const restarted=library(null,store);const offline=await restarted.medicalSubject('point:GV20');assert.equal(offline.passages[0].text,text);assert.equal(offline.persisted,true);
 const name=[...store.files.keys()][0];store.files.get(name).passages[0].text='Corrupted local text';
 assert.equal(await library(null,store).medicalSubject('point:DU20'),null);
});

test('the retained source index remains navigable without IndexedDB and refuses malformed directory entries',async()=>{
 const store=disk();await store.api.writeOfflineFile('medical-subject-catalogue',{items:[{key:'dong:大间',name:'大间',kind:'dong'}]});
 const rows=await library(null,store).medicalSubjectList('dong');assert.equal(rows.length,1);assert.equal(rows[0].key,'dong:大间');
 await store.api.writeOfflineFile('medical-subject-catalogue',{items:[{key:'dong:../../outside',name:'坏目录',kind:'dong'}]});assert.equal((await library(null,store).medicalSubjectList('dong')).length,0);
});

test('a damaged incoming passage never overwrites a usable native record; storage failure does not hide online reading',async()=>{
 const store=disk();await library(fixture(),store).medicalSubject('point:DU20');const before=JSON.stringify([...store.files]);
 const bad=fixture();bad.passages['a'.repeat(24)].text='wrong digest';const old=await library(bad,store).medicalSubject('point:DU20');assert.equal(old.passages[0].text,text);assert.equal(old.retainedPreviousVersion,true);assert.equal(JSON.stringify([...store.files]),before);
 const failed=disk();failed.api.writeOfflineFile=async()=>{throw Error('disk full');};const reading=await library(fixture(),failed).medicalSubject('point:DU20');assert.equal(reading.persisted,false);assert.equal(reading.passages[0].text,text);
});

function media(store,fetch,deps={}){return load('src/lib/studyMedia.ts',{'../../public/assets/meridians/ANIMATION-MANIFEST.json':require('../public/assets/meridians/ANIMATION-MANIFEST.json'),'../../public/assets/acupoint-photos/MANIFEST.json':require('../public/assets/acupoint-photos/MANIFEST.json'),'./durableOfflineStore':store.api,...deps},{fetch,process:{env:{}}});}

test('new original pages use account-authorized short links; object requests contain no application credentials',async()=>{
 const store=disk(),raw=fs.readFileSync('public/assets/acupoint-photos/hegu-li4-mk2010.jpg'),record={path:'/assets/acupoint-photos/atlas-lan-synthetic-p0010.jpg',bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex'),mime:'image/jpeg'};
 let lookups=0,objects=0,badHost=false;
 const api=media(store,async(url,options)=>{if(url.endsWith('tcm-study-media.json'))throw Error('use retained directory');objects++;assert.equal(options.credentials,'omit');assert.equal(options.headers,undefined);return{ok:true,arrayBuffer:async()=>raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)};},{'./offlinePackClient':{loadPackContent:async()=>null},'./authInterceptor':{fetchWithAuth:async url=>{lookups++;assert.ok(url.includes(encodeURIComponent(record.path)));return{ok:true,json:async()=>({success:true,...record,downloadUrl:(badHost?'https://attacker.invalid':'https://learning-123.cos.ap-shanghai.myqcloud.com')+'/learning-content/study-media/'+record.sha256+'.jpg?synthetic=test'})};}}});
 store.files.set('study-media-manifest',{...copy(api.bundledStudyMedia),version:2026102601,records:[...copy(api.bundledStudyMedia.records),record]});
 assert.match(await api.retainedStudyImage(record.path),/^data:image\/jpeg;base64,/);assert.equal(lookups,1);assert.equal(objects,1);
 store.files.delete('study-image-'+record.sha256);badHost=true;await assert.rejects(api.retainedStudyImage(record.path));assert.equal(objects,1);
});
test('original learning media save with full SHA verification and remain readable without the network after restart',async()=>{
 const store=disk();let catalog;const api=media(store,async url=>{
  if(url.endsWith('/data/tcm-study-media.json'))return {ok:true,text:async()=>JSON.stringify(catalog)};
  const path=new URL(url,'https://yandaoguoxue.yandao.vip').pathname;const bytes=fs.readFileSync('public'+path);return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
 });catalog=api.bundledStudyMedia;const path=catalog.records[0].path;
 const value=await api.retainedStudyImage(path);assert.match(value,/^data:image\/webp;base64,/);assert.ok([...store.files.keys()].some(key=>key.startsWith('study-image-')));
 let assetFetches=0;const restarted=media(store,async url=>{if(!url.endsWith('tcm-study-media.json'))assetFetches++;throw Error('offline');});assert.equal(await restarted.retainedStudyImage(path),value);assert.equal(assetFetches,0);
});

test('cloud catalogue cannot drop retained originals or point at external executables; bad bytes are not saved',async()=>{
 const store=disk();const api=media(store,async()=>({ok:true,text:async()=>JSON.stringify(api.bundledStudyMedia),arrayBuffer:async()=>new ArrayBuffer(16)}));
 const removed=copy(api.bundledStudyMedia);removed.records.pop();assert.throws(()=>api.validateStudyMedia(removed));
 const injected=copy(api.bundledStudyMedia);injected.records[0].path='https://other.invalid/code.js';assert.throws(()=>api.validateStudyMedia(injected));
 await assert.rejects(()=>api.retainedStudyImage(api.bundledStudyMedia.records[0].path));assert.equal([...store.files.keys()].filter(key=>key.startsWith('study-image-')).length,0);
});


test('attributed editorial summaries retain their explicit type after an offline restart',async()=>{
 const pack=fixture(),id='a'.repeat(24),source=pack.sources['test-source'];
 source.kind='STUDY_REFERENCE';source.url='https://herbaltcm.sn.polyu.edu.hk/tc/herbal/senna-leaf';
 pack.passages[id].presentation='EDITORIAL_SUMMARY';
 const store=disk();await library(pack,store).medicalSubject('point:DU20');
 const offline=await library(null,store).medicalSubject('point:GV20');assert.equal(offline.passages[0].presentation,'EDITORIAL_SUMMARY');
 const wrong=copy(pack);wrong.passages[id].presentation='EXPERT_VERIFIED';assert.throws(()=>library(null,disk()).validateMedicalLibrary(wrong));
 const external=copy(pack);external.sources['test-source'].url='https://herbaltcm.sn.polyu.edu.hk.attacker.example/tc/herbal/senna-leaf';assert.throws(()=>library(null,disk()).validateMedicalLibrary(external));
});


test('a cloud catalogue cannot replace protected original bytes under the same path',()=>{
 const api=media(disk());const changed=copy(api.bundledStudyMedia);changed.records[0].sha256='0'.repeat(64);assert.throws(()=>api.validateStudyMedia(changed));
});


test('a storage write that silently loses data is never reported as saved',async()=>{
 const store=disk();store.api.writeOfflineFile=async()=>{};
 const result=await library(fixture(),store).medicalSubject('point:DU20');assert.equal(result.persisted,false);assert.equal(result.passages[0].text,text);
});
