import traditionalCharacters from "../data/lifeSearchTraditional.json" with {type:"json"};
/** Private domain: no authentication, analytics, fetch, cloud client or AI dependency. */
export const LIFE_SCHEMA=1;
export const LIFE_CATEGORIES=["生活随记","健康记录","梦境","排盘点评","工作","人际往来","学习"];
export type DataClass="PRIVATE_LOCAL"|"USER_BACKUP"|"SHARED_COLLABORATION"|"PUBLIC_CONTENT";
export interface SourceRef {kind:"SELF"|"DOCTOR_ORIGINAL"|"SOURCE_USER_IMPORTED"|"CHAT_QUOTE"|"AI_DRAFT"; author?:string;platform?:string;at?:string;messageId?:string;chartVersion?:string;shareId?:string;authorId?:string;exportAllowed?:boolean;reshareAllowed?:boolean;attachmentId?:string;page?:number;quote?:string;verified?:boolean;}
export interface OcrBlock {id:string;page:number;box:[number,number,number,number];text:string;confidence:number|null;confirmedText?:string;confirmedAt?:string;model?:string;sourceHash?:string;}
export interface OcrRevision {model:string;sourceHash:string;blocks:OcrBlock[];totalPages?:number;recognizedAt?:string;}
export interface LifeAttachment {id:string;name:string;type:string;bytes:number;sha256:string;chunks:string[];caption?:string;ocrHistory?:OcrRevision[];ocr?:OcrRevision;}
export interface HealthData {kind:"symptom"|"visit"|"lab"|"medicine"|"allergy"|"instruction"|"followup"|"lifestyle";hospital?:string;department?:string;doctor?:string;doctorOriginal?:string;confirmedText?:string;confirmedAt?:string;userNotes?:string;drug?:string;specification?:string;asNeeded?:boolean;dose?:string;frequency?:string;route?:string;start?:string;end?:string;labName?:string;labValue?:string;labMethod?:string;trendComparable?:boolean;unit?:string;reference?:string;sampleAt?:string;questions?:string;}
export interface LifeReminderRule {id:string;calendarEventId?:string;dateTime:string;endDate:string;timeZone:string;repeat:"none"|"weekly"|"monthly";confirmedAt:string;needsConfirmation:boolean;cancelledAt?:string;}
export interface LifeEntry {reminders?:LifeReminderRule[];schema:1;id:string;ownerProfileId:string;dataClass:"PRIVATE_LOCAL";consentScope:"LOCAL_ONLY";title:string;text:string;occurredAt:string;createdAt:string;updatedAt:string;categories:string[];tags:string[];people:string[];sourceRefs:SourceRef[];attachments:LifeAttachment[];health?:HealthData;chartRefs?:{tool:string;version:string;record:Record<string,unknown>}[];draft?:boolean;deletedAt?:string;pinned?:boolean;favorite?:boolean;revision:number;}
export interface LifeRevision {entry:LifeEntry;savedAt:string;}
export function validateLifeEntry(x:unknown,owner?:string):asserts x is LifeEntry {
 if(!x||typeof x!=="object")throw Error("记录格式无效");const e=x as LifeEntry;
 if(e.schema!==1||e.dataClass!=="PRIVATE_LOCAL"||e.consentScope!=="LOCAL_ONLY"||!/^[-a-zA-Z0-9]{8,80}$/.test(e.id)||typeof e.ownerProfileId!=="string"||(owner&&owner!==e.ownerProfileId)||typeof e.title!=="string"||typeof e.text!=="string"||!Array.isArray(e.attachments)||!Array.isArray(e.sourceRefs)||!Array.isArray(e.categories)||!Array.isArray(e.tags)||!Array.isArray(e.people)||!Number.isSafeInteger(e.revision)||!Number.isFinite(Date.parse(e.occurredAt)))throw Error("记录格式或档案归属无效");
 for(const arr of [e.categories,e.tags,e.people])if(arr.some(t=>typeof t!=="string"))throw Error("分类格式无效");
 for(const a of e.attachments)if(!a||!/^[-a-zA-Z0-9]{8,80}$/.test(a.id)||typeof a.name!=="string"||!["image/jpeg","image/png","image/webp","application/pdf","text/plain"].includes(a.type)||!Number.isSafeInteger(a.bytes)||a.bytes<0||a.bytes>64*1024*1024||!Array.isArray(a.chunks)||a.chunks.length>128||a.chunks.some(k=>!/^blob:[-a-zA-Z0-9:]+$/.test(k))||!a.sha256.match(/^[a-f0-9]{64}$/))throw Error("附件索引无效");
 for(const a of e.attachments)for(const ocr of [...(a.ocrHistory||[]),...(a.ocr?[a.ocr]:[])]){if(ocr.sourceHash!==a.sha256||typeof ocr.model!=="string"||!Array.isArray(ocr.blocks))throw Error("识字来源无效");for(const block of ocr.blocks)if(typeof block.text!=="string"||!Number.isInteger(block.page)||block.page<1||block.page>10000||!Array.isArray(block.box)||block.box.length!==4||block.box.some(n=>!Number.isFinite(n)||n<0||n>1.001)||!(block.confidence===null||Number.isFinite(block.confidence)&&block.confidence>=0&&block.confidence<=1))throw Error("识字页码或坐标无效");}
}
// Normalization affects the index only. Original spelling, units and quotes remain intact.
const characterMap:Record<string,string>=traditionalCharacters;
export function normalizeLifeText(s:string){return Array.from(s.normalize("NFKC").toLowerCase()).map(c=>characterMap[c]||c).join("");}
export function lifeSearchText(e:LifeEntry){return [e.title,e.text,...e.categories,...e.tags,...e.people,e.occurredAt,...e.sourceRefs.flatMap(r=>[r.author,r.platform,r.quote,r.at]),...e.attachments.flatMap(a=>[a.name,a.caption,...(a.ocr?.blocks||[]).map(b=>b.confirmedText??b.text)]),e.health&&Object.values(e.health).join(" ")].filter(Boolean).join("\n");}
/** Frequent terms use compact bitmaps; sparse terms keep small sets. This avoids
 * allocating a full JS Set of 100,000 UUID strings for every common character. */
class LifePosting {
 private small:Set<number>|null=new Set();private blocks=new Map<number,Uint32Array>();count=0;private maximum=0;
 add(id:number){if(this.has(id))return;this.count++;this.maximum=Math.max(this.maximum,id);
  if(this.small){this.small.add(id);if(this.count>256&&this.count>(this.maximum+1)/64){const ids=this.small;this.small=null;for(const value of ids)this.addBit(value);}}else this.addBit(id);
 }
 private addBit(id:number){const block=Math.floor(id/8192),offset=id%8192;let bits=this.blocks.get(block);if(!bits){bits=new Uint32Array(256);this.blocks.set(block,bits);}bits[offset>>>5]|=1<<(offset&31);}
 has(id:number){if(this.small)return this.small.has(id);const bits=this.blocks.get(Math.floor(id/8192));return !!bits&&!!(bits[(id%8192)>>>5]&(1<<(id&31)));}
 remove(id:number){if(!this.has(id))return;this.count--;if(this.small)this.small.delete(id);else{const bits=this.blocks.get(Math.floor(id/8192))!;bits[(id%8192)>>>5]&=~(1<<(id&31));}}
 *values():Generator<number>{if(this.small){yield* this.small;return;}for(const [block,words] of this.blocks)for(let word=0;word<words.length;word++){let mask=words[word]>>>0;while(mask){const bit=31-Math.clz32(mask&-mask);yield block*8192+word*32+bit;mask=(mask&(mask-1))>>>0;}}}
 bytes(){return this.small?this.small.size*8:[...this.blocks.values()].reduce((n,x)=>n+x.byteLength,0);}
}
export class LifeSearchIndex {
 private documents=new Map<number,string>();private numbers=new Map<string,number>();private ids:string[]=[];private free:number[]=[];private postings=new Map<string,LifePosting>();
 private grams(s:string){const a=Array.from(s),out=new Set<string>();for(let i=0;i<a.length;i++){out.add(a[i]);if(i+1<a.length)out.add(a[i]+a[i+1]);}return out;}
 remove(id:string){const n=this.numbers.get(id);if(n===undefined)return;const old=this.documents.get(n)!;for(const g of this.grams(old)){const posting=this.postings.get(g);posting?.remove(n);if(!posting?.count)this.postings.delete(g);}this.documents.delete(n);this.numbers.delete(id);this.ids[n]='';this.free.push(n);}
 put(id:string,text:string){this.remove(id);const n=this.free.pop()??this.ids.length,normalized=normalizeLifeText(text);this.ids[n]=id;this.numbers.set(id,n);this.documents.set(n,normalized);for(const g of this.grams(normalized)){let posting=this.postings.get(g);if(!posting){posting=new LifePosting();this.postings.set(g,posting);}posting.add(n);}}
 search(query:string,limit=100,offset=0):{ids:string[];total:number}{
  const words=normalizeLifeText(query).trim().split(/\s+/u).filter(Boolean);if(!words.length){const ids=[...this.numbers.keys()];return {ids:ids.slice(offset,offset+limit),total:ids.length};}
  const grams=words.flatMap(w=>[...this.grams(w)]);if(grams.some(g=>!this.postings.has(g)))return {ids:[],total:0};
  const sets=grams.map(g=>this.postings.get(g)!).sort((a,b)=>a.count-b.count),ids:string[]=[];let total=0;
  for(const n of sets[0].values())if(sets.every(p=>p.has(n))&&words.every(w=>this.documents.get(n)!.includes(w))){if(total>=offset&&ids.length<limit)ids.push(this.ids[n]);total++;}
  return {ids,total};
 }
 suggestions(query:string,limit=5):string[]{
  const q=normalizeLifeText(query).trim(),letters=Array.from(q);if(letters.length<2||letters.length>12||/[0-9]/.test(q))return [];
  const choices=[...this.grams(q)].map(g=>({g,p:this.postings.get(g)})).filter(x=>x.p?.count).sort((a,b)=>a.p!.count-b.p!.count);if(!choices.length)return [];
  const close=(value:string)=>{const b=Array.from(value);if(Math.abs(b.length-letters.length)>1||value===q)return false;let x=0,y=0,edits=0;while(x<letters.length&&y<b.length){if(letters[x]===b[y]){x++;y++;continue;}if(++edits>1)return false;if(letters.length===b.length&&letters[x]===b[y+1]&&letters[x+1]===b[y]){x+=2;y+=2;}else if(letters.length>b.length)x++;else if(letters.length<b.length)y++;else{x++;y++;}}return edits+(letters.length-x)+(b.length-y)===1;};
  const found=new Set<string>(),visited=new Set<number>(),segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('zh',{granularity:'word'}):null;
  for(const {g,p} of choices.slice(0,6))for(const id of p!.values()){if(visited.has(id))continue;visited.add(id);if(visited.size>120)return [...found].slice(0,limit);const text=this.documents.get(id)!;let from=0;
   for(let hit=0;hit<4;hit++){const at=text.indexOf(g,from);if(at<0)break;from=at+g.length;const window=text.slice(Math.max(0,at-16),at+32),words=segmenter?[...segmenter.segment(window)].filter(x=>x.isWordLike).map(x=>x.segment):window.split(/[\s，,。；;：:]/);for(const word of words)if(!/[0-9]/.test(word)&&close(word))found.add(word);if(found.size>=limit)return [...found];}
  }return [...found];
 }
 clear(){this.documents.clear();this.numbers.clear();this.ids=[];this.free=[];this.postings.clear();}
 stats(){return {documents:this.documents.size,terms:this.postings.size,characters:[...this.documents.values()].reduce((a,b)=>a+b.length,0),postingPayloadBytes:[...this.postings.values()].reduce((n,p)=>n+p.bytes(),0)};}
}
export function healthPreparation(entries:LifeEntry[]){
 const records=entries.filter(e=>!e.deletedAt&&e.health?.confirmedAt).sort((a,b)=>a.occurredAt.localeCompare(b.occurredAt));
 const fields:{[K in keyof HealthData]?:string}={hospital:"医疗机构",department:"科室",doctor:"医生",doctorOriginal:"本人核对的医生原文",confirmedText:"本人核对文字",userNotes:"本人补充",drug:"药名",specification:"规格",asNeeded:"是否必要时服用",labName:"检查项目",labValue:"原数值",labMethod:"检测口径/方法",dose:"规格/剂量（原记录）",frequency:"频次（未自动换算时间）",route:"途径",start:"开始日期",end:"停止/复核日期",unit:"原单位",reference:"原参考区间",sampleAt:"采样日期",questions:"拟问医生"};
 return "个人健康记录整理——供就诊沟通参考\n由本人选择、核对；不是医院病历、诊断或处方。未包含日记正文、命盘、梦境或交流摘录。\n\n"+records.map(e=>`${e.occurredAt} · 健康记录\n${Object.entries(fields).filter(([key])=>e.health![key as keyof HealthData]).map(([key,label])=>`${label}：${typeof e.health![key as keyof HealthData]==='boolean'?(e.health![key as keyof HealthData]?'是':'否'):e.health![key as keyof HealthData]}`).join('\n')}\n原件索引：${e.attachments.map(a=>a.name+" ["+a.id+"]").join("；")}`).join("\n\n");
}
export function compareLabUnits(a:HealthData,b:HealthData){return a.kind==="lab"&&b.kind==="lab"&&!!a.unit&&a.unit===b.unit;}
export function comparableLabTimeline(entries:LifeEntry[],base:LifeEntry){const h=base.health;if(!h?.confirmedAt||!h.trendComparable||!h.labName||!h.unit)return [];
 return entries.filter(e=>!e.deletedAt&&e.health?.confirmedAt&&e.health.trendComparable&&compareLabUnits(h,e.health)&&normalizeLifeText(e.health.labName||'')===normalizeLifeText(h.labName!)&&(e.health.hospital||'')===(h.hospital||'')&&(e.health.labMethod||'')===(h.labMethod||'')&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(e.health.labValue?.trim()||'')).sort((a,b)=>(a.health!.sampleAt||a.occurredAt).localeCompare(b.health!.sampleAt||b.occurredAt));
}
export function possibleDuplicateMedicines(entries:LifeEntry[],base:LifeEntry){const h=base.health;if(h?.kind!=='medicine'||!h.drug)return [];return entries.filter(e=>!e.deletedAt&&e.id!==base.id&&e.health?.kind==='medicine'&&normalizeLifeText(e.health.drug||'')===normalizeLifeText(h.drug!));}
export function privateOutboundAllowed(dataClass:DataClass,purpose:string){return dataClass!=="PRIVATE_LOCAL"&&["EXPLICIT_SHARED_COPY","PUBLIC_CONTENT"].includes(purpose);}

export interface LifeSearchHit {source:string;snippet:string;attachmentId?:string;page?:number;}
export function lifeSearchHits(e:LifeEntry,query:string):LifeSearchHit[]{
 const terms=normalizeLifeText(query).trim().split(/\s+/u).filter(Boolean);if(!terms.length)return [];
 const fields:{source:string;text:string;attachmentId?:string;page?:number}[]=[{source:"标题",text:e.title},{source:"正文",text:e.text},{source:"人物/别名",text:e.people.join(' · ')},{source:"分类/标签",text:[...e.categories,...e.tags].join(' · ')},...e.sourceRefs.flatMap(r=>[{source:`来源 · ${r.author||r.kind}`,text:[r.platform,r.quote,r.at].filter(Boolean).join(' ')}]),...e.attachments.flatMap(a=>(a.ocr?.blocks||[]).map(b=>({source:`原件 · ${a.name} · 第${b.page}页${b.confirmedAt?'（已核对）':'（OCR待核对）'}`,text:b.confirmedText??b.text,attachmentId:a.id,page:b.page}))),...(e.health?[{source:"本人健康字段",text:Object.values(e.health).join(' ')}]:[])];
 return fields.flatMap(field=>{const text=normalizeLifeText(field.text),position=Math.min(...terms.map(t=>text.indexOf(t)).filter(i=>i>=0));if(!Number.isFinite(position))return [];const start=Math.max(0,position-28);return [{source:field.source,snippet:(start?'…':'')+Array.from(field.text).slice(start,start+100).join('')+(Array.from(field.text).length>start+100?'…':''),attachmentId:field.attachmentId,page:field.page}];}).slice(0,6);
}

/** A peer's restricted quote must never lock the user's own subsequent notes. */
export function exportableLifeEntries(entries:LifeEntry[]):LifeEntry[]{return entries.map(e=>({...structuredClone(e),sourceRefs:e.sourceRefs.filter(r=>r.kind!=='CHAT_QUOTE'||r.exportAllowed===true),chartRefs:e.chartRefs?.filter(c=>(c.record.permissions as {export?:boolean}|undefined)?.export!==false)}));}

/** An autosave may finish after more typing. Advance only its base revision;
 * keep every newer keystroke and never replace another record or manual revision. */
export function mergeLifeAutosave(current:LifeEntry|null,submitted:LifeEntry,saved:LifeEntry):LifeEntry|null{
 if(!current||current.id!==submitted.id||current.ownerProfileId!==submitted.ownerProfileId||current.revision!==submitted.revision)return current;
 return JSON.stringify(current)===JSON.stringify(submitted)?saved:{...current,revision:saved.revision,updatedAt:saved.updatedAt};
}

export function segmentLifeQuery(query:string){if(typeof Intl.Segmenter!=='function')throw Error("本浏览器不支持本机中文分词，请继续使用短词、片段或空格组合查询");return [...new Intl.Segmenter('zh',{granularity:'word'}).segment(normalizeLifeText(query))].filter(s=>s.isWordLike).map(s=>s.segment).join(' ');}
