/** Private domain: no authentication, analytics, fetch, cloud client or AI dependency. */
export const LIFE_SCHEMA=1;
export const LIFE_CATEGORIES=["生活随记","健康记录","梦境","排盘点评","工作","人际往来","学习"];
export type DataClass="PRIVATE_LOCAL"|"USER_BACKUP"|"SHARED_COLLABORATION"|"PUBLIC_CONTENT";
export interface SourceRef {kind:"SELF"|"DOCTOR_ORIGINAL"|"SOURCE_USER_IMPORTED"|"CHAT_QUOTE"|"AI_DRAFT"; author?:string;platform?:string;at?:string;messageId?:string;chartVersion?:string;attachmentId?:string;page?:number;quote?:string;verified?:boolean;}
export interface OcrBlock {id:string;page:number;box:[number,number,number,number];text:string;confidence:number|null;confirmedText?:string;confirmedAt?:string;}
export interface LifeAttachment {id:string;name:string;type:string;bytes:number;sha256:string;chunks:string[];ocr?:{model:string;sourceHash:string;blocks:OcrBlock[];};}
export interface HealthData {kind:"symptom"|"visit"|"lab"|"medicine"|"allergy"|"instruction"|"followup"|"lifestyle";hospital?:string;department?:string;doctor?:string;doctorOriginal?:string;confirmedText?:string;confirmedAt?:string;userNotes?:string;drug?:string;dose?:string;frequency?:string;route?:string;start?:string;end?:string;unit?:string;reference?:string;sampleAt?:string;questions?:string;}
export interface LifeReminderRule {id:string;calendarEventId?:string;dateTime:string;endDate:string;timeZone:string;repeat:"none"|"weekly"|"monthly";confirmedAt:string;needsConfirmation:boolean;}
export interface LifeEntry {reminders?:LifeReminderRule[];schema:1;id:string;ownerProfileId:string;dataClass:"PRIVATE_LOCAL";consentScope:"LOCAL_ONLY";title:string;text:string;occurredAt:string;createdAt:string;updatedAt:string;categories:string[];tags:string[];people:string[];sourceRefs:SourceRef[];attachments:LifeAttachment[];health?:HealthData;chartRefs?:{tool:string;version:string;record:Record<string,unknown>}[];draft?:boolean;deletedAt?:string;pinned?:boolean;favorite?:boolean;revision:number;}
export interface LifeRevision {entry:LifeEntry;savedAt:string;}
export function validateLifeEntry(x:unknown,owner?:string):asserts x is LifeEntry {
 if(!x||typeof x!=="object")throw Error("记录格式无效");const e=x as LifeEntry;
 if(e.schema!==1||e.dataClass!=="PRIVATE_LOCAL"||e.consentScope!=="LOCAL_ONLY"||!/^[-a-zA-Z0-9]{8,80}$/.test(e.id)||typeof e.ownerProfileId!=="string"||(owner&&owner!==e.ownerProfileId)||typeof e.title!=="string"||typeof e.text!=="string"||!Array.isArray(e.attachments)||!Array.isArray(e.sourceRefs)||!Array.isArray(e.categories)||!Array.isArray(e.tags)||!Array.isArray(e.people)||!Number.isSafeInteger(e.revision)||!Number.isFinite(Date.parse(e.occurredAt)))throw Error("记录格式或档案归属无效");
 for(const arr of [e.categories,e.tags,e.people])if(arr.some(t=>typeof t!=="string"))throw Error("分类格式无效");
 for(const a of e.attachments)if(!a||!/^[-a-zA-Z0-9]{8,80}$/.test(a.id)||typeof a.name!=="string"||!Number.isSafeInteger(a.bytes)||a.bytes<0||a.bytes>64*1024*1024||!Array.isArray(a.chunks)||a.chunks.length>128||a.chunks.some(k=>!/^blob:[-a-zA-Z0-9:]+$/.test(k))||!a.sha256.match(/^[a-f0-9]{64}$/))throw Error("附件索引无效");
}
// Normalization affects the index only. Original spelling, units and quotes remain intact.
const traditional="醫藥體夢學習記錄曆時間關係張陳劉會診過敏處頁轉備份復還檔案腎臟頭痛飲酒腸胃氣虛陽陰術後經驗對話師說見尋個資脈觀點";
const simplified ="医药体梦学习记录历时间关系张陈刘会诊过敏处页转备份复还档案肾脏头痛饮酒肠胃气虚阳阴术后经验对话师说见寻个资脉观点";
export function normalizeLifeText(s:string){return Array.from(s.normalize("NFKC").toLowerCase()).map(c=>{const i=traditional.indexOf(c);return i<0?c:simplified[i];}).join("");}
export function lifeSearchText(e:LifeEntry){return [e.title,e.text,...e.categories,...e.tags,...e.people,e.occurredAt,...e.sourceRefs.flatMap(r=>[r.author,r.platform,r.quote,r.at]),...e.attachments.flatMap(a=>[a.name,...(a.ocr?.blocks||[]).map(b=>b.confirmedText??b.text)]),e.health&&Object.values(e.health).join(" ")].filter(Boolean).join("\n");}
export class LifeSearchIndex {
 private documents=new Map<string,string>(); private postings=new Map<string,Set<string>>();
 private grams(s:string){const a=Array.from(s),out=new Set<string>();for(let i=0;i<a.length;i++){out.add(a[i]);if(i+1<a.length)out.add(a[i]+a[i+1]);}return out;}
 remove(id:string){const old=this.documents.get(id);if(old!==undefined)for(const g of this.grams(old)){const set=this.postings.get(g);set?.delete(id);if(!set?.size)this.postings.delete(g);}this.documents.delete(id);}
 put(id:string,text:string){this.remove(id);const n=normalizeLifeText(text);this.documents.set(id,n);for(const g of this.grams(n)){if(!this.postings.has(g))this.postings.set(g,new Set());this.postings.get(g)!.add(id);}}
 search(query:string,limit=100,offset=0):{ids:string[];total:number}{
  const words=normalizeLifeText(query).trim().split(/\s+/u).filter(Boolean);if(!words.length){const ids=[...this.documents.keys()];return {ids:ids.slice(offset,offset+limit),total:ids.length};}
  const grams=words.flatMap(w=>[...this.grams(w)]),sets=grams.map(g=>this.postings.get(g)||new Set<string>()).sort((a,b)=>a.size-b.size);let candidates=sets[0]||new Set<string>();
  for(const set of sets.slice(1)){candidates=new Set([...candidates].filter(id=>set.has(id)));if(!candidates.size)break;}
  const ids=[...candidates].filter(id=>words.every(w=>this.documents.get(id)!.includes(w)));return {ids:ids.slice(offset,offset+limit),total:ids.length};
 }
 clear(){this.documents.clear();this.postings.clear();}
 stats(){return {documents:this.documents.size,terms:this.postings.size,characters:[...this.documents.values()].reduce((a,b)=>a+b.length,0)};}
}
export function healthPreparation(entries:LifeEntry[]){
 const records=entries.filter(e=>!e.deletedAt&&e.health?.confirmedAt).sort((a,b)=>a.occurredAt.localeCompare(b.occurredAt));
 return "个人健康记录整理——供就诊沟通参考\n由本人选择、核对；不是医院病历、诊断或处方。\n\n"+records.map(e=>`${e.occurredAt}\n${e.title}\n本人核对：${e.health!.confirmedText||""}\n本人补充：${e.health!.userNotes||""}\n原件索引：${e.attachments.map(a=>a.name+" ["+a.id+"]").join("；")}\n拟问医生：${e.health!.questions||""}`).join("\n\n");
}
export function compareLabUnits(a:HealthData,b:HealthData){return a.kind==="lab"&&b.kind==="lab"&&!!a.unit&&a.unit===b.unit;}
export function privateOutboundAllowed(dataClass:DataClass,purpose:string){return dataClass!=="PRIVATE_LOCAL"&&["EXPLICIT_SHARED_COPY","PUBLIC_CONTENT"].includes(purpose);}
