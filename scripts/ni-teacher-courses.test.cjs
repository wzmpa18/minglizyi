'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module'),{webcrypto,createHash}=require('node:crypto');
const path=require('node:path');
const pinnedCatalogue=require('../src/data/niTeacherCourseCatalogue.json');
const pinnedRelease=require('../src/data/niTeacherCourseRelease.json');
const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const courseData=pinnedCatalogue.map(row=>{
 if(process.env.NI_COURSES_DIR)return JSON.parse(fs.readFileSync(path.join(process.env.NI_COURSES_DIR,row.id+'.json'),'utf8'));
 const content=row.title+'：合成测试文字，不含用户课件。',chapters=[{id:row.id+'-0001',title:'测试篇章',content,lineStart:1,lineEnd:1,sha256:hash(content)}];
 return {schema:'yandao.ni-course.v1',version:row.version,id:row.id,title:row.title,author:row.author,group:row.group,description:row.description,source:{filename:row.sourceFilename,sha256:row.sourceSha256,kind:'STUDY_REFERENCE',licenseNote:'合成测试资料',qualityNote:'用于完整性测试'},chapters,contentSha256:hash(chapters)};
});
const catalogue=pinnedCatalogue.map((row,index)=>({...copy(row),chapterCount:courseData[index].chapters.length,characters:courseData[index].chapters.reduce((n,c)=>n+c.content.length,0),contentSha256:courseData[index].contentSha256,recordSha256:hash(courseData[index])}));
const baselineRelease={version:pinnedRelease.version,collectionSha256:hash({schema:'yandao.ni-course-collection.v1',version:pinnedRelease.version,catalogue,courses:courseData})};
function api(disk=new Map(),unusedFetch,write,pack=null,release=baselineRelease,summaries=catalogue){
 const source=fs.readFileSync('src/lib/niTeacherCourses.ts','utf8').replace(/^import .*;\r?\n/gm,'');
 const code=stripTypeScriptTypes(source).replace(/^export /gm,'');
 const context={catalogueData:summaries,baselineRelease:release,crypto:webcrypto,TextEncoder,process:{env:{}},fetch:()=>{throw Error('anonymous content fetch forbidden');},loadJsonPack:async id=>id==='ni-teacher-courses'?copy(pack):null,window:{dispatchEvent(){},addEventListener(){}},Event:class{},readOfflineFile:async key=>copy(disk.get(key)||null),writeOfflineFile:write||(async(key,value)=>disk.set(key,copy(value)))};
 vm.createContext(context);vm.runInContext(code+'\nthis.result={validateNiCourse,listNiCourses,loadNiCourse,importNiCourse,importNiCourseCollection,validateApprovedNiCollection,installApprovedNiCollection};',context);
 return {api:context.result,disk};
}
const file=id=>JSON.stringify(courseData.find(course=>course.id===id))+'\n';
test('all supplied editions validate and survive a fresh offline reader session',async()=>{
 const first=api();
 for(const row of catalogue){
  const text=file(row.id);assert.equal(hash(JSON.parse(text)),row.recordSha256);
  const course=JSON.parse(text);await first.api.importNiCourse(course);
  assert.equal(course.chapters.reduce((n,c)=>n+c.content.length,0),row.characters);
 }
 const restarted=api(first.disk);
 for(const row of await restarted.api.listNiCourses()){
  assert.equal(row.available,true);const restored=await restarted.api.loadNiCourse(row.id);
  assert.equal(restored.contentSha256,row.contentSha256);assert.equal(restored.persisted,true);
 }
});
test('altered text or a wrong source edition cannot replace saved content',async()=>{
 const {api:reader,disk}=api(),course=JSON.parse(file(catalogue[0].id));await reader.importNiCourse(course);
 const before=JSON.stringify([...disk]);
 for(const mutate of [c=>c.chapters[0].content+='篡改',c=>c.source.sha256='0'.repeat(64),c=>c.chapters[0].lineStart=0]){
  const changed=copy(course);mutate(changed);await assert.rejects(reader.importNiCourse(changed));assert.equal(JSON.stringify([...disk]),before);
 }
});
test('a collection is entirely validated before any course is written',async()=>{
 const {api:reader,disk}=api(),first=JSON.parse(file(catalogue[0].id)),last=JSON.parse(file(catalogue[1].id));last.chapters[0].sha256='0'.repeat(64);
 await assert.rejects(reader.importNiCourseCollection({schema:'yandao.ni-course-collection.v1',version:baselineRelease.version,courses:[first,last]}));assert.equal(disk.size,0);
});
test('only an installed authenticated collection can prepare readings, with no anonymous content fetch',async()=>{
 const row=catalogue[0],disk=new Map(),damaged=collection();damaged.courses[0].chapters[0].content+=' unverified';const bad=api(disk,undefined,undefined,damaged);
 assert.equal(await bad.api.loadNiCourse(row.id),null);assert.equal(disk.size,0);
 const online=api(disk,undefined,undefined,collection());assert.equal((await online.api.loadNiCourse(row.id)).persisted,true);
 const offline=api(disk);assert.equal((await offline.api.loadNiCourse(row.id)).contentSha256,row.contentSha256);
 const key=[...disk.keys()].find(key=>key.startsWith('ni-course-'+row.id+'-'));disk.get(key).chapters[0].content='损坏';
 assert.equal(await offline.api.loadNiCourse(row.id),null);
});
test('a failed body readback never creates a completed directory entry',async()=>{
 const disk=new Map(),reader=api(disk,undefined,async(key,value)=>{if(key.startsWith('ni-course-head-'))disk.set(key,copy(value));});
 await assert.rejects(reader.api.importNiCourse(JSON.parse(file(catalogue[0].id))));assert.equal(disk.size,0);
});
const collection=()=>({schema:'yandao.ni-course-collection.v1',version:baselineRelease.version,catalogue:copy(catalogue),courses:catalogue.map(row=>JSON.parse(file(row.id)))});
test('an application upgrade retains a valid older installed catalogue and advances it without touching private notes',async()=>{
 const old=collection();old.version='1.0.0';
 for(let i=0;i<old.courses.length;i++){old.courses[i].version=old.catalogue[i].version='1.0.0';old.catalogue[i].recordSha256=hash(old.courses[i]);}
 const legacy=api(new Map(),undefined,undefined,null,{version:old.version,collectionSha256:hash(old)},old.catalogue);
 await legacy.api.installApprovedNiCollection(old);
 legacy.disk.set('ni-note-accountA-kept',{text:'保留本人的学习笔记',revision:3});
 const oldHead=copy(legacy.disk.get('ni-course-collection-head')),oldBodyKeys=[...legacy.disk.keys()].filter(k=>k.startsWith('ni-course-')&&!k.includes('head'));
 const upgraded=api(legacy.disk);assert.equal((await upgraded.api.loadNiCourse(old.courses[0].id)).version,'1.0.0');
 await upgraded.api.installApprovedNiCollection(collection());
 assert.equal((await api(legacy.disk).api.loadNiCourse(catalogue[0].id)).version,courseData[0].version);
 assert.deepEqual(legacy.disk.get('ni-note-accountA-kept'),{text:'保留本人的学习笔记',revision:3});
 for(const key of oldBodyKeys)assert.ok(legacy.disk.has(key),'old body and directory retained');
 const damaged=new Map(legacy.disk);damaged.set('ni-course-collection-head',oldHead);damaged.get('ni-course-catalogue-'+oldHead.version+'-'+oldHead.catalogueSha256).entries[0].title+=' corrupted';
 const before=JSON.stringify([...damaged]);await assert.rejects(api(damaged).api.installApprovedNiCollection(collection()),/目录需要恢复/);assert.equal(JSON.stringify([...damaged]),before);
});
function nextEdition(){
 const bundle=collection();bundle.version='1.2.0';const course=bundle.courses[0],row=bundle.catalogue[0];
 course.version=row.version='1.2.0';course.chapters[0].content+='\n新增学习整理文字。';course.chapters[0].sha256=hash(course.chapters[0].content);course.contentSha256=row.contentSha256=hash(course.chapters);
 row.characters=course.chapters.reduce((sum,c)=>sum+c.content.length,0);row.recordSha256=hash(course);
 return bundle;
}
test('a trusted newer data edition updates reading without rebuilding the bundled catalogue',async()=>{
 const original=collection();assert.equal(hash(original),baselineRelease.collectionSha256);
 const first=api();await first.api.installApprovedNiCollection(original);const updated=nextEdition();
 await first.api.installApprovedNiCollection(updated);const cold=api(first.disk),course=await cold.api.loadNiCourse(updated.courses[0].id);
 assert.equal(course.version,'1.2.0');assert.ok(course.chapters[0].content.endsWith('新增学习整理文字。'));
 assert.equal((await cold.api.listNiCourses())[0].version,'1.2.0');
 await assert.rejects(cold.api.importNiCourse(original.courses[0]));
});
test('downgrade, same-version replacement and corrupt incoming data preserve the current directory',async()=>{
 const first=api(),current=nextEdition();await first.api.installApprovedNiCollection(current);const before=JSON.stringify([...first.disk]);
 await assert.rejects(first.api.installApprovedNiCollection(collection()));assert.equal(JSON.stringify([...first.disk]),before);
 const same=copy(current);same.catalogue[0].description+=' changed';same.courses[0].description+=' changed';same.catalogue[0].recordSha256=hash(same.courses[0]);
 await assert.rejects(first.api.installApprovedNiCollection(same));assert.equal(JSON.stringify([...first.disk]),before);
 const corrupt=copy(current);corrupt.version='1.2.0';corrupt.courses[0].chapters[0].content+=' unsigned';
 await assert.rejects(first.api.installApprovedNiCollection(corrupt));assert.equal(JSON.stringify([...first.disk]),before);
});
test('failed update storage keeps the previous complete directory and body usable',async()=>{
 const first=api();await first.api.installApprovedNiCollection(collection());const originalHead=copy(first.disk.get('ni-course-collection-head'));
 const updated=nextEdition(),failed=api(first.disk,undefined,async(key,value)=>{if(key.includes(updated.catalogue[0].recordSha256))throw Error('disk full');first.disk.set(key,copy(value));});
 await assert.rejects(failed.api.installApprovedNiCollection(updated));assert.deepEqual(first.disk.get('ni-course-collection-head'),originalHead);
 assert.equal((await api(first.disk).api.loadNiCourse(catalogue[0].id)).version,baselineRelease.version);
});
test('a new course in an authenticated collection becomes searchable in the current reader',async()=>{
 const bundle=collection();bundle.version='1.2.0';const course=copy(bundle.courses[0]);course.version='1.2.0';
 course.id='ni-additional-study';course.title='补充研习笔记';course.group='补充研习';course.description='新增目录及内容的数据更新测试。';
 course.chapters=[{id:course.id+'-0001',title:'补充主题',content:'原资料的新增学习记录。',lineStart:1,lineEnd:1,sha256:hash('原资料的新增学习记录。')}];course.contentSha256=hash(course.chapters);
 const row={...copy(bundle.catalogue[0]),id:course.id,title:course.title,group:course.group,description:course.description,version:course.version,chapterCount:1,characters:course.chapters[0].content.length,contentSha256:course.contentSha256,recordSha256:hash(course)};
 bundle.catalogue.push(row);bundle.courses.push(course);const first=api();await first.api.installApprovedNiCollection(bundle);
 const cold=api(first.disk);assert.equal((await cold.api.listNiCourses()).length,catalogue.length+1);assert.equal((await cold.api.loadNiCourse(course.id)).chapters[0].content,course.chapters[0].content);
});
