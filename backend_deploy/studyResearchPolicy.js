'use strict';
// One derived index over the existing editions, never a second medical corpus.
const topics=require('./data/study-research-topics.json');
const evidence=require('./data/study-research-evidence.json');
const {validateStudyText}=require('./studyCommentPolicy');
const concepts=topics.categories.flatMap(c=>c.symptoms);
const TARGETS=new Set([...concepts.map(c=>'research:symptom:'+c.conceptId),...topics.lifeTopics.map(t=>'research:life:'+t.id)]);
const cards=new Map(evidence.cards.map(c=>[c.id,c])),books=new Map(evidence.books.map(b=>[b.id,b]));
function domainFor(id){return TARGETS.has(id)?id.split(':')[1]:null;}
function fail(message,status=400){const e=new Error(message);e.status=status;throw e;}
function ageCheck(date,now=Date.now()){
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))fail('请填写本人出生日期用于一次性成年核验');
 const [y,m,d]=date.split('-').map(Number),v=new Date(Date.UTC(y,m-1,d)),today=new Date(now+8*3600000);
 if(y<1900||v.getUTCFullYear()!==y||v.getUTCMonth()+1!==m||v.getUTCDate()!==d)fail('出生日期无效');
 const age=today.getUTCFullYear()-y-((today.getUTCMonth()+1)*100+today.getUTCDate()<m*100+d?1:0);
 if(age<18||age>125)fail('此交流仅供成年人主动参加',403);
}
const FIELDS={knowledge:['question','interpretation','uncertainty'],anonymous:['question','interpretation','uncertainty'],experience:['symptoms','duration','actions','visit','outcome','review'],fragment:['environment','choices','feelings','review']};
const LABELS={question:'学习问题',interpretation:'我的解释（未独立核实）',uncertainty:'分歧／待考证',symptoms:'症状自述',duration:'持续时间',actions:'本人曾采取的行动',visit:'自愿就医经历',outcome:'主观结果',review:'后续复盘',environment:'成长环境',choices:'自愿分享的选择',feelings:'人生感受'};
function privacyWarnings(text){
 const value=String(text).normalize('NFKC').replace(/[\u200b-\u200f\ufeff]/g,'');
 return [/(?:1[3-9]\d[\s-]?\d{4}[\s-]?\d{4})|\b\d{17}[0-9Xx]\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(value)&&'联系方式或证件',/(?:医院|醫院|卫生院|衛生院|诊所|診所|门诊部|住院号|病案号|姓名[:：]|住址[:：]|地址[:：])/.test(value)&&'身份、医院或病历线索',/\d{4}[-年/.]\d{1,2}[-月/.]\d{1,2}|\d{1,3}\s*(?:岁|歲)|(?:东经|北纬|经度|纬度|街道|小区|路\d+号)/.test(value)&&'具体日期、年龄或位置',/(?:\d+(?:\.\d+)?|[一二三四五六七八九十半]+)\s*(?:mg|ml|g|克|毫克|毫升|片|粒|丸|錢|钱|两|兩|寸|厘米)|停药|停藥|自行复位|自行復位|针刺深度|針刺深度|正骨步骤|正骨步驟/i.test(value)&&'可照用剂量、停药或危险操作'].filter(v=>typeof v==='string');
}
function prepareResearch(id,body){
 const domain=domainFor(id);if(!domain)fail('研习主题不存在',404);
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['mode','fields','confirmedFields','citationId','consentVersion','archiveConsent'].includes(k)))fail('分享字段无效');
 const {mode,fields}=body;
 if(!Object.hasOwn(FIELDS,mode)||(domain==='life'&&!['knowledge','anonymous','fragment'].includes(mode))||(domain==='symptom'&&mode==='fragment'))fail('请选择正确的分享方式');
 if(body.consentVersion!==topics.consentVersion||body.archiveConsent!==true)fail('请确认公开范围、健康推断风险与他人本机摘录许可');
 if(!fields||typeof fields!=='object'||Array.isArray(fields)||Object.keys(fields).some(k=>!FIELDS[mode].includes(k)))fail('只可分享预览中明确选定的文字字段');
 const selected=Object.keys(fields).filter(k=>typeof fields[k]==='string'&&fields[k].trim());
 if(!selected.length||Object.values(fields).some(v=>typeof v!=='string')||!Array.isArray(body.confirmedFields)||selected.some(k=>!body.confirmedFields.includes(k))||body.confirmedFields.some(k=>!selected.includes(k)))fail('请逐项确认拟分享字段');
 if(selected.some(k=>privacyWarnings(fields[k]).length))fail('请移除联系方式、身份/医院、具体日期年龄位置及可照用剂量或操作；原记录可留在本机');
 let citation=null;
 if(body.citationId){const c=cards.get(body.citationId);if(!c||(domain==='symptom'&&!c.conceptIds.includes(id.split(':')[2])))fail('引用与当前症状主题不符或来源不存在');const b=books.get(c.bookId);citation={id:c.id,bookId:c.bookId,chapterId:c.chapterId,title:b.name+' · '+c.chapterTitle,paragraph:c.paragraph,sourceHash:b.contentSha256};}
 const label=mode==='experience'?'个人经历，未独立核实':mode==='fragment'?'本人自愿人生片段，未独立核实':'知识研习，不是个人诊断';
 const content=[label,...selected.map(k=>`${LABELS[k]}：${fields[k].trim()}`),...(citation?[`依据：${citation.title}，第${citation.paragraph}自然段（古籍原文，未经医学校勘）`]:[])].join('\n');
 const check=validateStudyText(content);if(!check.ok)fail(check.error);
 return {content:check.text||'',metadata:{domain,mode,fields:Object.fromEntries(selected.map(k=>[k,fields[k].trim()])),citation,archiveConsent:true,consentVersion:topics.consentVersion}};
}
module.exports={topics,evidence,concepts,TARGETS,domainFor,ageCheck,privacyWarnings,prepareResearch,FIELDS,LABELS};
