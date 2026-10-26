'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module'),{createHash}=require('node:crypto');
const hash=text=>createHash('sha256').update(text).digest('hex'),copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
function load(file,context,names){const code=stripTypeScriptTypes(fs.readFileSync(file,'utf8').replace(/^import .*;\r?\n/gm,'')).replace(/^export /gm,'');vm.createContext(context);vm.runInContext(code+'\nthis.api={'+names.join(',')+'};',context);return context.api;}
const study=load('src/lib/niLessonStudy.ts',{},['buildNiLessonStudy','verifyNiSourceAnchor','redactNiPrivateContacts','containsNiPrivateContact','shouldHandleNiStudyBack']);
function fixture(id='course-test-1',content='【本经原文】\n这是所提供原书的第一段学习文字，应在本章上下文中理解。\n【性味】\n这里保留原课关于这一栏目的实际文字，供原文辨认和来源核对。\n【主治】\n例如，这里是所据课程的示例原句，不能被改成应用新提出的医学结论。\n【禁忌】\n本栏保留原文所载的限制与条件，阅读时需要对照原作者语境。'){
 const chapter={id,title:'本课主题',content,lineStart:1,lineEnd:8,sha256:hash(content)},course={schema:'yandao.ni-course.v1',version:'1.0.0',id:'course-test',title:'原课程',author:'所据作者',group:'人纪课程',description:'测试课程',source:{filename:'原件.doc',sha256:'a'.repeat(64),kind:'LECTURE_TRANSCRIPT',licenseNote:'测试资料',qualityNote:'测试'},chapters:[chapter],contentSha256:'b'.repeat(64)};return {course,chapter};
}
test('study points, terms, examples and review sources are exact anchored extracts',()=>{
 const {course,chapter}=fixture(),result=study.buildNiLessonStudy(course,chapter);assert.equal(result.professionallyReviewed,false);assert.ok(result.points.length>=3&&result.points.length<=7);assert.ok(result.questions.length>=3&&result.questions.length<=5);
 for(const anchor of [...result.points.map(p=>p.anchor),...result.terms.map(p=>p.context),...result.examples,...result.reviewSummary,...result.questions.flatMap(q=>q.anchor?[q.anchor]:[])])assert.ok(study.verifyNiSourceAnchor(anchor,course,chapter));
 assert.equal(result.method,'DETERMINISTIC_SOURCE_EXTRACT');assert.ok(result.points.every(p=>chapter.content.includes(p.anchor.quote)));
});
test('source quiz answers remain correct after deterministic choice rotation and are not always A',()=>{
 const answers=new Set();for(let i=0;i<30;i++){const {course,chapter}=fixture('course-test-'+i),a=study.buildNiLessonStudy(course,chapter),b=study.buildNiLessonStudy(course,chapter);assert.deepEqual(a.questions,b.questions);
 for(const q of a.questions){assert.ok(q.answer>=0&&q.answer<q.options.length);assert.equal(new Set(q.options).size,q.options.length);answers.add(q.answer);if(q.id.endsWith('-q-source'))assert.equal(q.options[q.answer],course.title);if(q.id.endsWith('-q-context'))assert.equal(q.options[q.answer],q.anchor.quote.slice(0,120));}}
 assert.ok(answers.size>=3);
});
test('short originals are not padded with invented facts; contacts are hidden without shifting source offsets',()=>{
 const {course,chapter}=fixture('course-short','只有这一段可核对的原课文字。'),short=study.buildNiLessonStudy(course,chapter);assert.ok(short.points.length<3);assert.ok(short.questions.length>=3);
 const privateText='邮箱 test.person@example.test，电话13900000000。正文仍在。',redacted=study.redactNiPrivateContacts(privateText);assert.equal(redacted.length,privateText.length);assert.ok(!redacted.includes('@'));assert.ok(!redacted.includes('13900000000'));
 assert.equal(study.redactNiPrivateContacts('原稿100-200，年代2004-2005，时长15-20分钟。'),'原稿100-200，年代2004-2005，时长15-20分钟。');
 const p=fixture('course-private','例如请发邮件到 test.person@example.test，或电话13900000000。\n这里是一段可以公开展示的原课学习语境，保留完整的实际文字。');
 const extracted=study.buildNiLessonStudy(p.course,p.chapter);assert.ok(extracted.points.every(p=>!study.containsNiPrivateContact(p.anchor.quote)));assert.equal(extracted.examples.length,0);
});
test('the reader returns one level at a time',()=>{assert.equal(study.shouldHandleNiStudyBack({courseOpen:true,tocOpen:true}),'toc');assert.equal(study.shouldHandleNiStudyBack({courseOpen:true,tocOpen:false}),'course');assert.equal(study.shouldHandleNiStudyBack({courseOpen:false,tocOpen:false}),null);});

function notebook(disk=new Map(),failRead=false){const context={...study,readOfflineFileStrict:async key=>{if(failRead)throw Error('read failed');return copy(disk.get(key)||null);},writeOfflineFile:async(key,value)=>disk.set(key,copy(value))};return {disk,api:load('src/lib/niStudyNotebook.ts',context,['readNiPersonalNote','saveNiPersonalNote','readNiAnnotations','addNiAnnotation','readNiBookmarks','setNiBookmark','exportNiPersonalStudy'])};}
test('personal notes are account-separated, migrate legacy text and survive public course changes',async()=>{
 const {course,chapter}=fixture(),first=notebook();first.disk.set('ni-note-accountA-'+chapter.id,{text:'我的原有笔记',updatedAt:1});const old=await first.api.readNiPersonalNote('accountA',chapter.id);assert.equal(old.userNoteRevision,0);
 const saved=await first.api.saveNiPersonalNote('accountA',course,chapter,old.text,0);assert.equal(saved.userNoteRevision,1);assert.equal(await first.api.readNiPersonalNote('accountB',chapter.id),null);
 const newer=fixture(chapter.id,chapter.content+'\n新版课程补充文字。');newer.course.version='1.0.1';const retained=await first.api.readNiPersonalNote('accountA',chapter.id);assert.equal(retained.text,old.text);assert.equal(retained.courseRevision,'1.0.0');
 const next=await first.api.saveNiPersonalNote('accountA',newer.course,newer.chapter,'继续保留我的理解',1);assert.equal(next.userNoteRevision,2);assert.equal(next.previousSources[0].sourceSnapshot,chapter.content);
 const before=JSON.stringify([...first.disk]);await assert.rejects(first.api.saveNiPersonalNote('accountA',newer.course,newer.chapter,'过期页面',1));assert.equal(JSON.stringify([...first.disk]),before);
 await assert.rejects(notebook(first.disk,true).api.saveNiPersonalNote('accountA',course,chapter,'读取失败不覆盖',2));assert.equal(JSON.stringify([...first.disk]),before);
});
test('bookmarks, annotations and export retain sources without touching another account or course text',async()=>{
 const {course,chapter}=fixture(),book=notebook(),original=JSON.stringify(course),anchor=study.buildNiLessonStudy(course,chapter).points[0].anchor;
 await book.api.setNiBookmark('accountA',course,chapter,true);assert.equal((await book.api.readNiBookmarks('accountA')).length,1);assert.equal((await book.api.readNiBookmarks('accountB')).length,0);
 const marks=await book.api.addNiAnnotation('accountA',course,chapter,anchor,'我的疑问');assert.equal(marks[0].anchor.chapterSha256,chapter.sha256);assert.equal((await book.api.readNiAnnotations('accountB',chapter.id)).length,0);
 await assert.rejects(book.api.addNiAnnotation('accountA',course,chapter,{...anchor,quote:'伪造原句'},'不能保存'));assert.equal(JSON.stringify(course),original);
 const exported=book.api.exportNiPersonalStudy(course,chapter,null,marks);assert.equal(exported.annotations[0].comment,'我的疑问');assert.equal(exported.course.sourceSha256,course.source.sha256);assert.ok(!JSON.stringify(exported).includes('accountA'));
});
test('every actual installed course chapter yields source-checked notes and 3–5 review questions',{skip:!process.env.NI_STUDY_COLLECTION},()=>{
 const collection=JSON.parse(fs.readFileSync(process.env.NI_STUDY_COLLECTION,'utf8'));let chapters=0,points=0,short=0,examples=0;const answers=new Set();
 for(const course of collection.courses)for(const chapter of course.chapters){const note=study.buildNiLessonStudy(course,chapter);chapters++;points+=note.points.length;examples+=note.examples.length;if(note.points.length<3)short++;assert.ok(note.questions.length>=3&&note.questions.length<=5);
 for(const item of note.points){assert.ok(study.verifyNiSourceAnchor(item.anchor,course,chapter));assert.ok(!study.containsNiPrivateContact(item.anchor.quote));}
 for(const q of note.questions){answers.add(q.answer);assert.ok(q.answer>=0&&q.answer<q.options.length);if(q.anchor)assert.ok(study.verifyNiSourceAnchor(q.anchor,course,chapter));}
 }
 assert.equal(chapters,1141);assert.ok(answers.size>=3);console.log(JSON.stringify({actualCourses:collection.courses.length,chapters,sourceAnchoredPoints:points,shortOriginalsBelow3Points:short,sourceExamples:examples,answers:[...answers].sort()}));
});
