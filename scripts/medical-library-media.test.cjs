const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {webcrypto,createHash}=require('node:crypto');
function load(file,deps,extra={}){const exports={};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(code,{exports,URL,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,AbortSignal,atob,btoa,console,...extra,require:name=>{if(name in deps)return deps[name];throw Error(name);}});return exports;}
const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
test('CI offline injection blocks services and image fetch while preserving bundled navigation and the native bridge',async()=>{
 const allowed=[],proof=[],timers=[];
 class Xhr{open(){}send(){allowed.push('xhr');}}
 const window={location:{href:'capacitor://localhost/',protocol:'capacitor:',host:'localhost'},fetch:async input=>{allowed.push(String(input));return {ok:true};},Capacitor:{nativePromise:async(_plugin,_method,value)=>proof.push(JSON.parse(value.value))}};
 vm.runInNewContext(fs.readFileSync('scripts/ios-learning-network-fault.js','utf8'),{window,XMLHttpRequest:Xhr,URL,WeakMap,setInterval:fn=>{timers.push(fn);return 1;},clearInterval:()=>{}});
 await window.fetch('/offline/index.html');await window.fetch('/zhongyi/meridian/?_rsc=local');
 for(const path of ['https://yandaoguoxue.yandao.vip/api/health','/api/health','/assets/acupoint-photos/hegu-li4-mk2010.jpg','/assets/meridians/large-intestine.webp'])await assert.rejects(window.fetch(path));
 const local=new Xhr();local.open('GET','/offline/index.html');local.send();
 const remote=new Xhr();remote.open('GET','https://example.org');assert.throws(()=>remote.send());
 await timers[0]();assert.deepEqual(proof,[{fetchBlocked:true,xhrBlocked:true,imageFetchBlocked:true,bundledRouteAllowed:true}]);assert.equal(allowed.length,3);
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

function media(store,fetch){return load('src/lib/studyMedia.ts',{'../../public/assets/meridians/ANIMATION-MANIFEST.json':require('../public/assets/meridians/ANIMATION-MANIFEST.json'),'../../public/assets/acupoint-photos/MANIFEST.json':require('../public/assets/acupoint-photos/MANIFEST.json'),'./durableOfflineStore':store.api},{fetch});}
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
