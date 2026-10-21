'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path'),{pathToFileURL}=require('url');
const {validateStudyCatalog}=require('../backend_deploy/studyContentPolicy'),{createStudyContentStore}=require('../backend_deploy/studyContentStore'),{starterModule}=require('./build-starter-catalog.cjs');
const seed=JSON.parse(fs.readFileSync(path.join(__dirname,'../backend_deploy/data/study-starter-public.json'),'utf8'));
test('reviewed text-only catalog has 24 lessons/68 questions, preserves existing routes, and rejects executable/unknown/duplicate/invalid changes',()=>{
 assert.equal(seed.lessons.length,24);assert.equal(seed.lessons.flatMap(l=>l.questions).length,68);assert.equal(validateStudyCatalog(seed).ok,true);
 for(const change of [v=>v.lessons[0].href='javascript:alert(1)',v=>v.lessons[0].paragraphs[0]='<script>this is not a learning paragraph</script>',v=>v.lessons[0].questions[0].answer=99,v=>v.lessons[0].questions[0].options=['same','same'],v=>v.lessons.pop()&&v.lessons.shift(),v=>v.script='download new logic',v=>v.readerVersion=2,v=>v.lessons[1].id=v.lessons[0].id]){const v=structuredClone(seed);change(v);assert.equal(validateStudyCatalog(v).ok,false);}
 for(const lesson of seed.lessons)assert.ok(fs.existsSync(path.join(__dirname,'../src/app',lesson.href,'page.tsx')),lesson.href);
});
test('publication is reviewed, compare-and-swap, monotonic and persistent, with exactly one previous catalog and no overwritten concurrent edit',()=>{
 const base=path.resolve(process.env.YANDAO_TEST_TMP_DIR||os.tmpdir());fs.mkdirSync(base,{recursive:true});const dir=fs.mkdtempSync(path.join(base,'starter-content-')),file=path.join(dir,'catalog.json');
 try{const original={...structuredClone(seed),revision:1};fs.writeFileSync(file,JSON.stringify(original));const store=createStudyContentStore(file),next={...structuredClone(seed),revision:2};next.lessons[0].summary+='（本次增加资料核对说明）';
  assert.throws(()=>store.publish(next,1,false),e=>e.status===400);assert.equal(store.read().catalog.revision,1);
  assert.equal(store.publish(next,1,true).catalog.revision,2);assert.equal(JSON.parse(fs.readFileSync(file+'.previous')).revision,1);
  assert.throws(()=>store.publish(next,1,true),e=>e.status===409);assert.equal(createStudyContentStore(file).read().catalog.revision,2);
  assert.equal(JSON.parse(fs.readFileSync(file+'.audit.json')).length,1);assert.equal(fs.existsSync(file+'.lock'),false);assert.equal(fs.existsSync(file+'.next'),false);
 }finally{assert.equal(path.dirname(fs.realpathSync(dir)),fs.realpathSync(base));fs.rmSync(dir,{recursive:true});}
});
test('legacy progress survives unchanged lessons; changed question answers are invalidated; temporarily unavailable lessons retain private history',()=>{
 const {STARTER_LESSONS:baseline,parseStarterProgress:parse,mergeStarterProgress:merge}=starterModule(),all=structuredClone(seed.lessons);
 const legacy=JSON.stringify({version:1,lessonId:'classics',read:['classics'],answers:{'classics-1':1}});assert.equal(parse(legacy,all).answers['classics-1'],1);assert.deepEqual(parse(legacy,all).read,['classics']);
 const extra=all[23],next={version:1,lessonId:extra.id,read:['classics',extra.id],answers:{'classics-1':1,[extra.questions[0].id]:extra.questions[0].answer}};
 const stored=merge(legacy,next,all);assert.equal(parse(stored,all).read.length,2);
 const hidden=all.slice(0,16),hiddenStored=merge(stored,parse(stored,hidden),hidden);assert.ok(parse(hiddenStored,all).read.includes(extra.id));assert.equal(parse(hiddenStored,all).answers[extra.questions[0].id],extra.questions[0].answer);
 const changed=structuredClone(all);changed[0].questions[0].answer=0;assert.equal(parse(stored,changed).answers['classics-1'],undefined);assert.ok(parse(stored,changed).read.includes(extra.id));
 changed[0].paragraphs[0]+='新增阅读内容。';assert.ok(!parse(stored,changed).read.includes('classics'));assert.equal(baseline.length,16);
});
test('remote reader validates real streamed data and size, accepts no credentials, and rejects unsupported content without inventing a replacement',async()=>{
 const {downloadStudyCatalog,parseStudyCatalog}=await import(pathToFileURL(path.join(__dirname,'../src/lib/studyCatalog.ts')).href),original=global.fetch;
 try{
  global.fetch=async(url,init)=>{assert.equal(url,'https://yandaoguoxue.yandao.vip/api/academy/starter-content');assert.equal(init.credentials,'omit');assert.equal(init.cache,'no-store');return new Response(JSON.stringify({success:true,catalog:seed}),{headers:{'Content-Type':'application/json'}});};
  assert.equal((await downloadStudyCatalog()).lessons.length,24);assert.equal(parseStudyCatalog(JSON.stringify({...seed,readerVersion:2})),null);
  global.fetch=async()=>new Response(JSON.stringify({success:true,catalog:{...seed,readerVersion:2}}));await assert.rejects(downloadStudyCatalog(),/格式/);
  global.fetch=async()=>new Response(new Uint8Array(2_000_101));await assert.rejects(downloadStudyCatalog(),/大小/);
  global.fetch=async()=>new Response('unavailable',{status:503});await assert.rejects(downloadStudyCatalog(),/不可用/);
 }finally{global.fetch=original;}
});
