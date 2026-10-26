import type {NiCourse,NiCourseChapter} from './niTeacherCourses';

export interface NiSourceAnchor {courseId:string;courseRevision:string;chapterId:string;chapterSha256:string;start:number;end:number;quote:string}
export interface NiStudyPoint {id:string;label:string;kind:'CLASSIC_QUOTE'|'LECTURE_QUOTE'|'SOURCE_EXTRACT';anchor:NiSourceAnchor}
export interface NiReviewQuestion {id:string;prompt:string;options:string[];answer:number;explanation:string;anchor?:NiSourceAnchor}
export interface NiLessonStudy {
 schema:'yandao.ni-lesson-study.v1';method:'DETERMINISTIC_SOURCE_EXTRACT';professionallyReviewed:false;
 title:string;goals:string[];prerequisites:string[];points:NiStudyPoint[];
 terms:{term:string;context:NiSourceAnchor;explanation:string}[];
 structure:{label:string;anchor:NiSourceAnchor}[];examples:NiSourceAnchor[];
 questions:NiReviewQuestion[];reviewSummary:NiSourceAnchor[];openQuestions:string[];
}
const chapterTitle=(title:string)=>title.replace(/\s*·\s*阅读分段\s*\d+$/,'').replace(/[（(]\d+-[\d:]+[）)]/g,'').trim();
const labels=(text:string)=>[...text.matchAll(/【([^】\r\n]{1,24})】/g)];
const labelKind=(label:string):NiStudyPoint['kind']=>/本经原文|经文|原文/.test(label)?'CLASSIC_QUOTE':/倪注|讲解|课堂/.test(label)?'LECTURE_QUOTE':'SOURCE_EXTRACT';
const contactPattern=()=>/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?<!\d)1[3-9]\d{9}(?!\d)|\+\d{1,3}[ -]?\(?\d{2,4}\)?[ -]?\d{3,4}[ -]\d{3,4}|(?<!\d)\d{2,4}[- ]\d{3,4}[- ]\d{3,4}(?!\d)|(?:电话|電話|手機|手机|QQ|邮箱|郵箱|电子邮件|電子郵件|住址|联络地址|聯絡地址|Tel\s*:|Fax\s*:)[^\r\n。；]{0,80}/gi;
export function redactNiPrivateContacts(text:string):string {return text.replace(contactPattern(),match=>'•'.repeat(match.length));}
export function containsNiPrivateContact(text:string):boolean {return contactPattern().test(text);}

export function verifyNiSourceAnchor(anchor:NiSourceAnchor,course:NiCourse,chapter:NiCourseChapter):boolean {
 return anchor.courseId===course.id&&anchor.courseRevision===course.version&&anchor.chapterId===chapter.id&&anchor.chapterSha256===chapter.sha256&&
 Number.isInteger(anchor.start)&&Number.isInteger(anchor.end)&&anchor.start>=0&&anchor.end>anchor.start&&anchor.end<=chapter.content.length&&chapter.content.slice(anchor.start,anchor.end)===anchor.quote;
}

/** Extracts the author's actual words. It never creates medical facts, numbers or advice. */
export function buildNiLessonStudy(course:NiCourse,chapter:NiCourseChapter):NiLessonStudy {
 const text=chapter.content,topic=redactNiPrivateContacts(chapterTitle(chapter.title)),headings=labels(text);
 const anchor=(start:number,end:number):NiSourceAnchor=>({courseId:course.id,courseRevision:course.version,chapterId:chapter.id,chapterSha256:chapter.sha256,start,end,quote:text.slice(start,end)});
 const trim=(start:number,end:number)=>{while(start<end&&/\s/.test(text[start]))start++;while(end>start&&/\s/.test(text[end-1]))end--;return {start,end};};
 const candidates:{label:string;anchor:NiSourceAnchor}[]=[];
 const add=(label:string,start:number,end:number)=>{
  const bounds=trim(start,end);if(bounds.end-bounds.start<8)return;
  // Keep a full sentence where available. A long quotation remains available
  // through its source anchor; shortening is never presented as a paraphrase.
  if(bounds.end-bounds.start>520){const stop=text.indexOf('。',bounds.start+120);if(stop>=0&&stop<bounds.end&&stop-bounds.start<650)bounds.end=stop+1;else bounds.end=Math.min(bounds.end,bounds.start+520);}
  const quote=text.slice(bounds.start,bounds.end);
  if(/^\d+$/.test(quote)||/[·.]{5,}/.test(quote)||quote===chapter.title||containsNiPrivateContact(label+quote)||candidates.some(item=>item.anchor.quote===quote))return;
  candidates.push({label,anchor:anchor(bounds.start,bounds.end)});
 };
 for(let i=0;i<headings.length;i++){const heading=headings[i];add(heading[1],heading.index!+heading[0].length,i+1<headings.length?headings[i+1].index!:text.length);}
 const lines=[...text.matchAll(/[^\r\n]+/g)];
 for(const line of lines){
  const value=line[0].trim();if(value.length<16||value===chapter.title||/^[\d\s]+$/.test(value)||/[·.]{5,}/.test(value))continue;
  // With explicit columns, use the column quotations first and avoid repeating
  // the same paragraph. Remaining sentences provide context for short lessons.
  const sentences=[...line[0].matchAll(/[^。！？!?；;]+[。！？!?；;]?/g)];
  for(const sentence of sentences){if(sentence[0].trim().length<16)continue;const start=line.index!+sentence.index!;if(candidates.some(item=>start>=item.anchor.start&&start+sentence[0].length<=item.anchor.end))continue;add('原课语境',start,start+sentence[0].length);}
 }
 if(!candidates.length&&text.trim())add('本节原文',0,text.length);
 const selected=candidates.slice(0,7);
 const points=selected.map((item,index)=>({id:chapter.id+'-point-'+(index+1),label:item.label,kind:labelKind(item.label),anchor:item.anchor}));
 const structure=headings.slice(0,12).map((heading,index)=>({label:heading[1],anchor:anchor(heading.index!,Math.min(text.length,(index+1<headings.length?headings[index+1].index!:text.length)))}));
 if(!structure.length)for(const point of points.slice(0,5))structure.push({label:point.label==='原课语境'?'原课第'+(structure.length+1)+'段':point.label,anchor:point.anchor});
 const terms:NiLessonStudy['terms']=[];
 for(const match of text.matchAll(/《([^》\r\n]{2,28})》|【([^】\r\n]{1,24})】/g)){
  const term=match[1]||match[2];if(terms.some(item=>item.term===term))continue;
  const start=match.index!,endStop=text.indexOf('。',start),end=Math.min(text.length,endStop>=0?endStop+1:start+200,start+420);
  if(containsNiPrivateContact(term+text.slice(start,end)))continue;
  terms.push({term,context:anchor(start,end),explanation:match[1]?'原课引用的书名或篇名；请与该处引文及版本一起辨认。':'原稿的栏目或署名用语；下方原句保留其在本节的实际语境。'});if(terms.length===8)break;
 }
 const examples=candidates.filter(item=>/例如|比如|举例|譬如/.test(item.anchor.quote)&&!containsNiPrivateContact(item.anchor.quote)&&!/先生|女士|小姐|太太|姓名|住址|居住/.test(item.anchor.quote)).slice(0,2).map(item=>item.anchor);
 const source=points[0]?.anchor;
 const questions:NiReviewQuestion[]=[
  {id:chapter.id+'-q-source',prompt:'本节摘记所依据的课程是什么？',options:[course.title,'未注明来源的网络汇总','用户个人新写的笔记','应用作出的现代临床结论'],answer:0,explanation:'课程为《'+course.title+'》，本节为“'+chapter.title+'”。出处文件：'+course.source.filename+'。',anchor:source},
  {id:chapter.id+'-q-reading',prompt:'怎样理解本节“原课摘记”的文字身份？',options:['是所据课程的原句，需要结合原章上下文','是已经逐项专业审校的现代诊疗规范','是本应用新提出的个人用药建议','是用户自己追加的理解'],answer:0,explanation:'摘记直接截取当前章节，保留来源和章节校验值；它没有被改写成新的诊疗断言。',anchor:source},
 ];
 if(points.length>1){
  const target=points.find(point=>point.label!=='原课语境')||[...points].sort((a,b)=>a.anchor.start-b.anchor.start)[0];
  const labelled=target.label!=='原课语境';
  const other=points.filter(point=>point.anchor.quote!==target.anchor.quote&&(!labelled||point.label!==target.label)).slice(0,3);
  const correct=target.anchor.quote.slice(0,120),choices=[correct,...other.map(point=>point.anchor.quote.slice(0,120))];
  if(choices.length>1&&new Set(choices).size===choices.length)questions.push({id:chapter.id+'-q-context',prompt:labelled?'下列哪段摘句来自本节“'+target.label+'”？':'以下原句中，哪段在当前课节里更早出现？',options:choices,answer:0,explanation:labelled?'对应原课“'+target.label+'”的以下原句。点击出处可核对完整上下文；其余选项也是本节原句，不能互换栏目。':'请按原文的先后顺序核对。此题只考查当前节的文字顺序，不将摘句改写为医学结论。',anchor:target.anchor});
 }
 questions.push({id:chapter.id+'-q-version',prompt:'课程内容更新时，怎样处理自己的学习笔记？',options:['保留个人笔记，并对照它记录的课程版本重新核查','用新课文直接覆盖个人笔记','删除旧笔记后才能阅读新课','把不同版本的出处合并成一个无版本的结论'],answer:0,explanation:'公共课文与个人笔记分别保存。笔记保留自己的修订号和当时课程版本，更新课文不会覆盖笔记。'});
 if(terms.length)questions.push({id:chapter.id+'-q-term',prompt:'“'+terms[0].term+'”在本节应如何核对？',options:['回到出现这个用语的原句，结合其栏目或引文','只凭字面推导治疗方案','把它视为无需出处的现代疗效结论','忽略书名、作者与版本的区别'],answer:0,explanation:terms[0].explanation,anchor:terms[0].context});
 // Rotate choices by chapter ID to avoid training users to always tap option 1.
 const seed=[...chapter.id].reduce((sum,char)=>sum+char.charCodeAt(0),0);
 for(let i=0;i<questions.length;i++){const q=questions[i],offset=(seed+i)%q.options.length;q.options=q.options.slice(offset).concat(q.options.slice(0,offset));q.answer=(q.options.length-offset)%q.options.length;}
 return {schema:'yandao.ni-lesson-study.v1',method:'DETERMINISTIC_SOURCE_EXTRACT',professionallyReviewed:false,title:topic,
  goals:['辨认“'+topic+'”的原课主题及上下文。',headings.length?'按本节原有的'+[...new Set(headings.map(h=>h[1]))].slice(0,4).join('、')+'栏目对照学习。':'按原课叙述顺序整理要点，不把孤立句子当作完整结论。','能回查出处，记录自己的疑问并完成语境复习。'],
  prerequisites:[course.id.includes('materia')?'先分清原书药物记载、各家引述与讲课说明的身份。':course.id.includes('acupuncture')?'先辨认本节经络、部位及穴名的原课写法，版本或同名问题留待核对。':'先阅读本课前后章节及原文出处，保留讲者观点与编辑说明的区别。','本页为原课摘记与阅读练习；医学内容尚未据此完成专业审校。'],
  points,terms,structure,examples,questions:questions.slice(0,5),reviewSummary:points.slice(0,5).map(point=>point.anchor),
  openQuestions:['哪些原句是经典引文，哪些是讲者或整理者的解释？','本节有哪些用语仍需对照原书、前后课节或可靠资料核查？','我的理解是否超出了原课给出的条件和语境？']};
}

export function shouldHandleNiStudyBack(state:{courseOpen:boolean;tocOpen:boolean}):'toc'|'course'|null {return state.tocOpen?'toc':state.courseOpen?'course':null;}
