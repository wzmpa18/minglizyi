import {exportableLifeEntries,type LifeEntry} from './lifeRecords';
export interface LifeExportPrivacy {
 hidePeople:boolean;hideOrganizations:boolean;hideDates:boolean;hideContacts:boolean;
 includeSources:boolean;includeCharts:boolean;includeAttachmentIndex:boolean;extraWords:string;
}
export const DEFAULT_LIFE_EXPORT_PRIVACY:LifeExportPrivacy={hidePeople:true,hideOrganizations:true,hideDates:true,hideContacts:true,includeSources:false,includeCharts:false,includeAttachmentIndex:false,extraWords:''};
/** Best-effort literal redaction, entirely on-device. The user must inspect the
 * preview; arbitrary identifying prose cannot be guaranteed anonymous. */
export function lifeExportProjection(entries:LifeEntry[],options:LifeExportPrivacy):LifeEntry[]{
 const allowed=exportableLifeEntries(entries),words=new Set(options.extraWords.split(/[\n\r]+/u).map(x=>x.trim()).filter(Boolean));
 if(words.size>50||[...words].some(w=>w.length>200))throw Error('额外隐藏词最多50项，每项200字；一行一个原文片段');
 for(const entry of entries){
  if(options.hidePeople)for(const name of [...entry.people,...entry.sourceRefs.map(r=>r.author||''),entry.health?.doctor||''])if(name.trim())words.add(name.trim());
  if(options.hideOrganizations)for(const name of [entry.health?.hospital||'',entry.health?.department||''])if(name.trim())words.add(name.trim());
 }
 const ordered=[...words].sort((a,b)=>b.length-a.length);
 const redact=(input:string)=>{
  let text=input;for(const word of ordered)text=text.split(word).join('[已隐藏]');
  // Dates first: telephone-like masking must not eat only the date prefix and
  // leave a private ISO time behind. An explicitly unhidden date is not a phone.
  if(options.hideDates)text=text.replace(/\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?(?:[T\s]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?/gu,'[日期已隐藏]').replace(/\d{1,2}月\d{1,2}日/gu,'[月日已隐藏]').replace(/(?<!\d)\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?(?!\d)/gu,'[时刻已隐藏]');
  if(options.hideContacts)text=text.replace(/(?<!\d)\+?\d[\d\s()\-]{5,}\d(?!\d)/gu,match=>/^\d{4}-\d{1,2}-\d{1,2}$/.test(match)?match:'[联系信息已隐藏]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu,'[邮箱已隐藏]').replace(/https?:\/\/[^\s<>"']+/giu,'[链接已隐藏]');
  return text;
 };
 const walk=(value:unknown):unknown=>typeof value==='string'?redact(value):Array.isArray(value)?value.map(walk):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,walk(v)])):value;
 return allowed.map(entry=>{
  const copy=structuredClone(entry);copy.id='';copy.ownerProfileId='';copy.relatedEntryIds=[];copy.reminders=[];
  copy.sourceRefs=options.includeSources?copy.sourceRefs:[];copy.chartRefs=options.includeCharts?copy.chartRefs:[];
  // A text export has no encrypted blob references, original SHA or local IDs.
  copy.attachments=options.includeAttachmentIndex?copy.attachments.map(a=>({...a,id:'',sha256:'',chunks:[],ocr:undefined,ocrHistory:undefined,derivedFrom:undefined})):[];
  return walk(copy) as LifeEntry;
 });
}
