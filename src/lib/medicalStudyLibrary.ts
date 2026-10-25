'use client';
import { loadJsonPack, fetchManifest, checkUpdates, downloadPack, needsUserConfirmation } from './offlinePackClient';
import { readOfflineFile, writeOfflineFile } from './durableOfflineStore';
import { CLIENT_VERSION } from './releaseFeatures';

export interface MedicalSource {title:string;author:string;kind:'LECTURE_TRANSCRIPT'|'CLASSIC_ORIGINAL'|'COMMUNITY_COURSE_NOTES'|'STUDY_REFERENCE';sha256:string;url?:string;localOriginalName?:string;license?:string;inAppBook?:boolean}
export interface MedicalPassage {source:string;chapter:string;chapterTitle:string;text:string;lineStart:number;lineEnd:number;sha256:string;topic?:'combination_context'|'caution_context'|'indication_context'|'related'}
export interface MedicalIllustration {path:string;title:string;source:string;caption:string}
export interface MedicalSubject {name:string;kind:string;references:string[];illustrations?:MedicalIllustration[]}
export interface MedicalLibrary {schema:'yandao.medical.study-library.v1';version:string;sources:Record<string,MedicalSource>;passages:Record<string,MedicalPassage>;subjects:Record<string,MedicalSubject>}
export interface SubjectReading {name:string;version:string;persisted?:boolean;passages:Array<MedicalPassage&{sourceInfo:MedicalSource}>;illustrations?:Array<MedicalIllustration&{sourceInfo:MedicalSource}>}
const PACK='medical-study-library';
let cached:Promise<MedicalLibrary|null>|undefined;
if(typeof window!=='undefined')window.addEventListener('offline-pack-installed',event=>{
  if((event as CustomEvent<{packId:string}>).detail?.packId===PACK){cached=undefined;window.dispatchEvent(new Event('medical-study-ready'));}
});
const plain=(value:unknown,max:number)=>typeof value==='string'&&value.length<=max&&!/[\u0000]/.test(value);
function validSource(source:MedicalSource){
  if(source?.inAppBook!==undefined&&typeof source.inAppBook!=='boolean')return false;
  if(!source||!plain(source.title,300)||!source.title||!plain(source.author,300)||!source.author||!['LECTURE_TRANSCRIPT','CLASSIC_ORIGINAL','COMMUNITY_COURSE_NOTES','STUDY_REFERENCE'].includes(source.kind)||!/^[a-f0-9]{64}$/.test(source.sha256))return false;
  if(source.url){try{const url=new URL(source.url);const community=url.hostname==='github.com'&&/^\/Shanemen\/hantang-nihaixia\/blob\/[a-f0-9]{40}\//.test(url.pathname);const edition=url.hostname==='gitlab.com'&&/^\/jicheng\/jc\.data\/-\/blob\/[a-f0-9]{40}\/pages\/book\//.test(url.pathname);if(url.protocol!=='https:'||(!['zh.wikisource.org','www.shidianguji.com'].includes(url.hostname)&&!community&&!edition)||url.username||url.password)return false;}catch{return false;}}
  return true;
}
async function validReading(reading:SubjectReading){
  if(!reading||!plain(reading.name,100)||!/^\d+\.\d+\.\d+$/.test(reading.version)||!Array.isArray(reading.passages)||reading.passages.length>100)return false;
  for(const entry of reading.passages){
    if(!entry||!validSource(entry.sourceInfo)||!plain(entry.text,2500)||!plain(entry.chapter,200)||!plain(entry.chapterTitle,500)||!Number.isInteger(entry.lineStart)||entry.lineStart<1||!Number.isInteger(entry.lineEnd)||entry.lineEnd<entry.lineStart)return false;
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(entry.text)))).map(v=>v.toString(16).padStart(2,'0')).join('');if(digest!==entry.sha256)return false;
  }
  if(reading.illustrations!==undefined&&(!Array.isArray(reading.illustrations)||reading.illustrations.length>16||reading.illustrations.some(image=>!validIllustration(image)||!validSource(image.sourceInfo))))return false;
  return true;
}
function validIllustration(value:MedicalIllustration){return !!value&&/^\/assets\/acupoint-photos\/[a-z0-9-]+\.(?:webp|jpg|png)$/.test(value.path)&&plain(value.title,300)&&!!value.title&&plain(value.caption,2000)&&plain(value.source,120);}
export function validateMedicalLibrary(raw:unknown):MedicalLibrary {
  const value=raw as MedicalLibrary;
  if(!value||value.schema!=='yandao.medical.study-library.v1'||!/^\d+\.\d+\.\d+$/.test(value.version)||!value.sources||!value.passages||!value.subjects)throw Error('文献资料协议不匹配');
  if(Object.keys(value.sources).length>1000||Object.keys(value.passages).length>50000||Object.keys(value.subjects).length>5000)throw Error('文献资料超出范围');
  for(const [id,source] of Object.entries(value.sources)){
    if(!/^[a-z0-9_-]{2,120}$/.test(id)||!validSource(source))throw Error('文献缺少出处或来源链接不受支持');
  }
  for(const [id,passage] of Object.entries(value.passages)){
    if(!/^[a-f0-9]{24}$/.test(id)||!passage||!Object.hasOwn(value.sources,passage.source)||!plain(passage.text,2500)||!plain(passage.chapter,200)||!plain(passage.chapterTitle,500)||
      !Number.isInteger(passage.lineStart)||passage.lineStart<1||!Number.isInteger(passage.lineEnd)||passage.lineEnd<passage.lineStart||!/^[a-f0-9]{64}$/.test(passage.sha256))throw Error('原文段落无效');
  }
  for(const [key,subject] of Object.entries(value.subjects)){
    if(!/^(?:point:[A-Z]{1,4}\d{1,3}|herb:h\d{3,5}|dong:[^<>\u0000/:]{1,40})$/.test(key)||!subject||!plain(subject.name,100)||!Array.isArray(subject.references)||subject.references.length>100||
      subject.references.some(id=>!Object.hasOwn(value.passages,id))||new Set(subject.references).size!==subject.references.length)throw Error('药穴关联无效');
    if(subject.illustrations!==undefined&&(!Array.isArray(subject.illustrations)||subject.illustrations.length>16||subject.illustrations.some(image=>!validIllustration(image)||!Object.hasOwn(value.sources,image.source))))throw Error('图谱出处或路径无效');
  }
  return value;
}
async function library(){if(!cached)cached=loadJsonPack<unknown>(PACK).then(raw=>raw?validateMedicalLibrary(raw):null).catch(()=>null);return cached;}
async function subjectKey(subject:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(subject));return 'medical-subject-'+Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');}
function aliases(key:string){return [key,key.replace(/^point:DU/,'point:GV').replace(/^point:RN/,'point:CV'),key.replace(/^point:GV/,'point:DU').replace(/^point:CV/,'point:RN')];}
export async function medicalSubject(key:string):Promise<SubjectReading|null>{
  const pack=await library();const target=pack&&aliases(key).find(id=>pack.subjects[id]);
  if(pack&&target){const subject=pack.subjects[target];const result:SubjectReading={name:subject.name,version:pack.version,persisted:true,passages:subject.references.map(id=>({...pack.passages[id],sourceInfo:{...pack.sources[pack.passages[id].source]}})),illustrations:subject.illustrations?.map(image=>({...image,sourceInfo:{...pack.sources[image.source]}}))};if(!await validReading(result))throw Error('文献内容摘要不一致，原资料保留');try{await writeOfflineFile(await subjectKey(key),result);}catch{result.persisted=false;}return result;}
  for(const candidate of new Set(aliases(key))){
    const saved=await readOfflineFile<SubjectReading>(await subjectKey(candidate)).catch(()=>null);
    if(saved&&await validReading(saved))return {...saved,persisted:true};
  }
  return null;
}
export async function prepareMedicalLibrary(progress?:(done:number,total:number)=>void){
  const manifest=await fetchManifest();if(!manifest)throw Error('暂时无法读取学习资料目录，已保存内容仍可离线查看');
  const plan=(await checkUpdates(CLIENT_VERSION,manifest)).find(row=>row.packId===PACK);if(!plan)throw Error('文献资料包尚未发布');
  if(plan.action==='INCOMPATIBLE')throw Error('请更新应用后准备此文献资料，原有资料保留');
  if(plan.action!=='UP_TO_DATE'){
    if(needsUserConfirmation(plan.manifestPack)&&!window.confirm('准备文献学习资料约需'+(plan.manifestPack.size/1048576).toFixed(1)+' MB，是否继续？'))throw Error('已取消，原有资料保留');
    const result=await downloadPack(plan.manifestPack,undefined,async bytes=>{validateMedicalLibrary(JSON.parse(new TextDecoder().decode(bytes)));});
    if(!result.ok)throw Error(result.error||'资料下载尚未完成');
  }
  cached=undefined;const pack=await library();if(!pack)throw Error('文献资料未启用');
  const keys=Object.keys(pack.subjects);let done=0;
  for(const key of keys){const saved=await medicalSubject(key);if(!saved?.persisted)throw Error('手机存储暂不可写，尚未全部保存；可用原资料保留');progress?.(++done,keys.length);}
  await writeOfflineFile('medical-library-ready',{version:pack.version,subjects:keys.length,preparedAt:Date.now()});
  window.dispatchEvent(new Event('medical-study-ready'));
  return {subjects:keys.length,version:pack.version};
}
