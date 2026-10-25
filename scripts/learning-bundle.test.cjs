'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript'),{zipSync,strToU8}=require('fflate'),{webcrypto,createHash}=require('crypto'),{IDBFactory}=require('fake-indexeddb');
const hash=b=>createHash('sha256').update(b).digest('hex');
process.chdir(path.resolve(__dirname,'..'));
test('complete production candidate verifies every inner file and activates its shared data indexes',{skip:!process.env.TCM_COMPLETE_CANDIDATE},async()=>{
 const f=fixture(),raw=fs.readFileSync(process.env.TCM_COMPLETE_CANDIDATE),bytes=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
 const m=await f.codec.validateLearningBundle(bytes,'tcm-learning-complete','1.0.0');
 assert.equal(m.files.length,308);assert.equal(m.members.length,8);
 assert.equal(m.members.some(x=>/anatomy/.test(x.packId)),false);
 await f.storage.activateOfflinePack(m.packId,m.version,hash(raw),bytes,m.members);
 assert.equal((await f.client.loadJsonPack('tcm-herbs')).records.length,550);
 assert.equal((await f.client.loadJsonPack('tcm-formulas')).records.length,316);
 assert.equal(Object.keys((await f.client.loadJsonPack('medical-study-library')).subjects).length,1217);
 assert.equal((await f.client.loadJsonPack('tcm-study-media')).records.length,299);
 assert.equal((await f.client.getInstalledPacks()).length,9);
});
function fixture(){const cache=new Map(),indexedDB=new IDBFactory();function load(name){name=path.resolve('src/lib',name+'.ts');if(cache.has(name))return cache.get(name);const exports={};cache.set(name,exports);const js=ts.transpileModule(fs.readFileSync(name,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(js,{exports,indexedDB,crypto:webcrypto,URL,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,Blob,process:{env:{}},require:n=>n==='fflate'?require('fflate'):n==='./authInterceptor'?{}:load(n.replace('./',''))});return exports;}return{codec:load('learningBundleCodec'),storage:load('storageManager'),client:load('offlinePackClient')};}
function archive(change){const text=strToU8(JSON.stringify({schema:'sample-content',version:'2.0.0',content:'正文资料'})),entry='data/sample-book.json';const file={path:entry,bytes:text.length,sha256:hash(text),mime:'application/json'},member={packId:'sample-book',version:'2.0.0',sha256:file.sha256,bytes:file.bytes,entryPath:entry};const manifest={schema:'yandao.learning-bundle.v1',packId:'tcm-learning-complete',version:'1.0.0',name:'中医学习资料包',files:[file],members:[member]},files={[entry]:text};change?.(manifest,files);files['manifest.json']=strToU8(JSON.stringify(manifest));const zip=zipSync(files);return{manifest,bytes:zip.slice().buffer,text};}

test('one archive exposes verified child data without separately saving its bytes',async()=>{const f=fixture(),a=archive();await f.codec.validateLearningBundle(a.bytes,'tcm-learning-complete','1.0.0');await f.storage.activateOfflinePack('tcm-learning-complete','1.0.0',hash(Buffer.from(a.bytes)),a.bytes,a.manifest.members);const installed=await f.client.getInstalledPacks();assert.equal(installed.length,2);assert.equal(await f.storage.hasStoredValue('OFFLINE_PACK','sample-book@2.0.0'),false);assert.deepEqual(Buffer.from(await f.client.loadPackContent('sample-book')),Buffer.from(a.text));assert.equal((await f.client.loadJsonPack('sample-book')).content,'正文资料');});

test('archive traversal, executable paths and undeclared files never activate',async()=>{const f=fixture();for(const mutate of [(m,files)=>{files['../escaped.js']=strToU8('code')},(m,files)=>{files['data/extra.js']=strToU8('code')},m=>{m.files[0].path='data/../../outside.json'},m=>{m.members[0].entryPath='data/missing.json'}]){const a=archive(mutate);await assert.rejects(f.codec.validateLearningBundle(a.bytes,'tcm-learning-complete','1.0.0'));}});

test('valid ZIP with wrong inner bytes or version is rejected',async()=>{const f=fixture();const bad=archive((m,files)=>{files[m.files[0].path]=strToU8('x'.repeat(m.files[0].bytes))});await assert.rejects(f.codec.validateLearningBundle(bad.bytes,'tcm-learning-complete','1.0.0'));const valid=archive();await assert.rejects(f.codec.validateLearningBundle(valid.bytes,'tcm-learning-complete','9.0.0'));});

test('a child downgrade aborts parent and every child index change together',async()=>{const f=fixture(),a=archive(),old=new Uint8Array([1,2]).buffer;await f.storage.activateOfflinePack('sample-book','3.0.0','old',old);await assert.rejects(f.storage.activateOfflinePack('tcm-learning-complete','1.0.0',hash(Buffer.from(a.bytes)),a.bytes,a.manifest.members));assert.equal(await f.client.loadPackContent('tcm-learning-complete'),null);assert.deepEqual(Buffer.from(await f.client.loadPackContent('sample-book')),Buffer.from(old));});

test('removing the archive removes its virtual child records and preserves unrelated models',async()=>{const f=fixture(),a=archive(),model=new Uint8Array([7,8]).buffer;await f.storage.activateOfflinePack('tcm-anatomy-model','1.0.0','model',model);await f.storage.activateOfflinePack('tcm-learning-complete','1.0.0',hash(Buffer.from(a.bytes)),a.bytes,a.manifest.members);await f.storage.deactivateOfflinePacks(['tcm-learning-complete']);assert.equal(await f.client.loadPackContent('sample-book'),null);assert.deepEqual(Buffer.from(await f.client.loadPackContent('tcm-anatomy-model')),Buffer.from(model));assert.equal((await f.client.getInstalledPacks()).length,1);});
