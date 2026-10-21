'use strict';
// Pure data validation shared by the browser, publisher and public reader.
const MAX_CATALOG_BYTES=2_000_000;
const BASE_IDS=['classics','herb-reading','meridian-reading','review-method','calendar-foundation','bazi-relationships','ziwei-reading','hexagram-foundation','liuren-qimen-reading','qizheng-coordinates','sky-image-reading','yunqi-reading','tcm-evidence','herb-formula-terms','anatomy-meridian','comparison-records'];
const STUDY_ROUTES=['/zhongyi/classic','/zhongyi/herb','/zhongyi/formula','/zhongyi/meridian','/zhongyi/diagnosis','/zhongyi/yunqi','/academy/question-bank','/academy/astronomy','/yixue/bazi','/yixue/ziwei','/yixue/meihua','/yixue/liuyao','/yixue/qimen','/yixue/daliuren','/yixue/qizheng','/yixue/jieqi','/discover/tongchen','/profile/life','/calendar'];
const id=value=>typeof value==='string'&&/^[a-z][a-z0-9-]{0,79}$/.test(value);
const text=(value,min,max)=>typeof value==='string'&&value.trim().length>=min&&value.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u202a-\u202e\u2066-\u2069]/.test(value)&&!/<\/?[a-z][^>]*>/i.test(value);
function validateStudyCatalog(value){
 const errors=[];const fail=message=>errors.push(message);
 if(!value||typeof value!=='object'||Array.isArray(value))return {ok:false,errors:['课程包须为对象']};
 if(Object.keys(value).some(k=>!['schemaVersion','readerVersion','revision','publishedAt','releaseNotes','lessons'].includes(k)))fail('课程包含未支持字段');
 if(value.schemaVersion!==1||value.readerVersion!==1)fail('课程格式需要新版客户端');
 if(!Number.isSafeInteger(value.revision)||value.revision<1)fail('资料版本必须为正整数');
 if(typeof value.publishedAt!=='string'||!/^\d{4}-\d\d-\d\dT/.test(value.publishedAt)||!Number.isFinite(Date.parse(value.publishedAt)))fail('发布时间无效');
 if(!text(value.releaseNotes,2,500))fail('请填写更新说明');
 if(!Array.isArray(value.lessons)||value.lessons.length<16||value.lessons.length>200)return {ok:false,errors:[...errors,'课程数量须为16—200']};
 const lessonIds=new Set(),questionIds=new Set();let questions=0;
 for(const lesson of value.lessons){
  if(!lesson||typeof lesson!=='object'||Array.isArray(lesson)){fail('课程结构无效');continue;}
  if(Object.keys(lesson).some(k=>!['id','title','summary','paragraphs','source','href','linkLabel','questions'].includes(k)))fail('课程含未支持字段');
  if(!id(lesson.id)||lessonIds.has(lesson.id))fail('课程ID无效或重复');lessonIds.add(lesson.id);
  if(!text(lesson.title,2,100)||!text(lesson.summary,4,400)||!text(lesson.source,12,1500)||!text(lesson.linkLabel,2,60))fail('标题、提要或来源说明不完整');
  if(!STUDY_ROUTES.includes(lesson.href))fail('只允许已有学习板块入口');
  if(!Array.isArray(lesson.paragraphs)||lesson.paragraphs.length<3||lesson.paragraphs.length>40||lesson.paragraphs.some(p=>!text(p,20,6000)))fail('每课至少三段完整纯文本');
  if(!Array.isArray(lesson.questions)||lesson.questions.length<1||lesson.questions.length>20){fail('每课须有1—20题');continue;}
  for(const q of lesson.questions){
   questions++;
   if(!q||typeof q!=='object'||Array.isArray(q)){fail('题目结构无效');continue;}
   if(Object.keys(q).some(k=>!['id','stem','options','answer','explanation'].includes(k)))fail('题目含未支持字段');
   if(!id(q.id)||questionIds.has(q.id))fail('题目ID无效或重复');questionIds.add(q.id);
   if(!text(q.stem,4,500)||!text(q.explanation,12,1500))fail('题干或解析不完整');
   if(!Array.isArray(q.options)||q.options.length<2||q.options.length>6||q.options.some(p=>!text(p,1,300))||new Set(q.options).size!==q.options.length)fail('选项无效或重复');
   if(!Number.isInteger(q.answer)||q.answer<0||!Array.isArray(q.options)||q.answer>=q.options.length)fail('正确答案超出选项');
  }
 }
 if(BASE_IDS.some(k=>!lessonIds.has(k)))fail('不能移除原有16课');
 if(questions>1000)fail('单个资料包最多1000题');
 if(new TextEncoder().encode(JSON.stringify(value)).byteLength>MAX_CATALOG_BYTES)fail('课程包超过2MB');
 return {ok:errors.length===0,errors:[...new Set(errors)]};
}
module.exports={MAX_CATALOG_BYTES,BASE_IDS,STUDY_ROUTES,validateStudyCatalog};
