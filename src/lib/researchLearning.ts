import topics from '../../backend_deploy/data/study-research-topics.json';
export const researchConcepts=topics.categories.flatMap(c=>c.symptoms);
export type ResearchIndex=typeof import('../../backend_deploy/data/study-research-evidence.json');
export type EvidenceCard=ResearchIndex['cards'][number];
let index:Promise<ResearchIndex>|null=null;
export function loadResearchIndex(){return index||(index=import('../../backend_deploy/data/study-research-evidence.json').then(m=>m.default).catch(e=>{index=null;throw e;}));}
export function evidenceFor(data:ResearchIndex,legacyIds:string[],offset=0,limit=12,casesOnly=false){
 const ids=new Set(researchConcepts.filter(c=>legacyIds.includes(c.id)).map(c=>c.conceptId));
 if(!ids.size)return {items:[] as EvidenceCard[],total:0};
 const rows=data.cards.map(card=>({card,score:card.conceptIds.filter(id=>ids.has(id)).length})).filter(r=>r.score>0&&(!casesOnly||r.card.kind==='ANCIENT_CASE')).sort((a,b)=>b.score-a.score||a.card.bookId.localeCompare(b.card.bookId)||a.card.paragraph-b.card.paragraph);
 return {items:rows.slice(offset,offset+limit).map(r=>r.card),total:rows.length};
}
export async function simulateEvidenceLearning(legacyIds:string[],system:string,focus:string){
 const data=await loadResearchIndex(),found=evidenceFor(data,legacyIds,0,5);
 const systemName=({bagang:'八纲',liujing:'六经',zangfu:'脏腑'} as Record<string,string>)[system]||'所选';
 return [`模拟辨证学习 · ${systemName}知识对照`,`匹配规则：按已选${legacyIds.length}项症状概念及列明的别名查原文，不据此判定本人疾病、证型或适用治疗。`,
 `查到${found.total}段相关古籍条文。普通条文与古籍记载医案分别标记，均不是现代疗效证据；原文尚未完成影印本逐字及医学专业校核。`,
 ...found.items.map(c=>`【古籍原文出处】${data.books.find(b=>b.id===c.bookId)?.name} · ${c.chapterTitle} · 第${c.paragraph}自然段`),
 `学习提问：原文描述的条件是否完整？哪些概念与现代用语不同？有哪些不同解释与未记录的信息？这些问题不能代替专业诊疗。`,
 `所选${focus==='zhenggu'?'正骨':focus==='zhenjiu'?'针灸':'治法'}方向仅是文献分类，不生成本人处方、药量、针刺或复位步骤。`,
 `你的补充自述与既往经历仍留在页面本机内存，未发送AI。开放下方“相关经典医案”核对来源，或主动参加“同证研习”。`].join('\n\n');
}
