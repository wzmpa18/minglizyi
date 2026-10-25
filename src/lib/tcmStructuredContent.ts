'use client';
import {loadJsonPack} from './offlinePackClient';
import {readOfflineFile,writeOfflineFile} from './durableOfflineStore';
export interface TcmStructuredPack {schema:string;version:string;records:Array<Record<string,unknown>>}
const ids=['tcm-herbs','tcm-formulas'] as const;
const cache=new Map<string,Promise<TcmStructuredPack|null>>();
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
export function validateTcmStructuredPack(raw:unknown,id:'tcm-herbs'|'tcm-formulas',requiredIds:readonly string[]):TcmStructuredPack {
 const pack=raw as TcmStructuredPack;
 if(!pack||pack.schema!==(id==='tcm-herbs'?'yandao.tcm.herbs.v1':'yandao.tcm.formulas.v1')||!/^\d+\.\d+\.\d+$/.test(pack.version)||!Array.isArray(pack.records)||pack.records.length>10000||new TextEncoder().encode(JSON.stringify(raw)).byteLength>6*1024*1024)throw Error('中医资料格式或容量不匹配');
 const seen=new Set<string>(),text=(x:unknown,max=12000)=>typeof x==='string'&&x.length<=max&&!/[\u0000]/.test(x);
 for(const row of pack.records){
  if(!row||typeof row.id!=='string'||!new RegExp('^'+(id==='tcm-herbs'?'h':'f')+'[0-9]{3,5}$').test(row.id)||seen.has(row.id)||!text(row.name,100)||!row.name||!text(row.pinyin,200)||!text(row.category,200)||!text(row.source,1000)||!Array.isArray(row.alias)||row.alias.length>100||row.alias.some(x=>!text(x,200)))throw Error('中医条目或来源无效');
  for(const key of id==='tcm-herbs'?['nature','taste','meridian','efficacy','indications','dosage','contraindications']:['efficacy','indications','preparation','contraindications'])if(!text(row[key]))throw Error('中医条目字段缺失');
  if(id==='tcm-herbs'&&typeof row.toxic!=='boolean')throw Error('药材风险字段缺失');
  if(id==='tcm-formulas'&&(!Array.isArray(row.composition)||row.composition.length>100||row.composition.some(item=>!item||typeof item!=='object'||!text(item.herb,100)||!text(item.dosage,500))))throw Error('方剂组成字段无效');
  seen.add(row.id);
 }
 if(requiredIds.some(key=>!seen.has(key)))throw Error('资料目录缺少现有条目，保留原资料');return pack;
}
export async function retainedTcmStructuredPack(id:'tcm-herbs'|'tcm-formulas',requiredIds:readonly string[]):Promise<TcmStructuredPack|null>{
 if(!cache.has(id))cache.set(id,(async()=>{
  async function previous(){try{const head=await readOfflineFile<{key:string;sha256:string}>('tcm-dataset-head-'+id);if(!head||!new RegExp('^tcm-dataset-'+id+'-[a-f0-9]{64}$').test(head.key))return null;const body=await readOfflineFile<TcmStructuredPack>(head.key);if(!body||await hash(JSON.stringify(body))!==head.sha256)return null;return validateTcmStructuredPack(body,id,requiredIds);}catch{return null;}}
  const incoming=await loadJsonPack<unknown>(id).catch(()=>null);
  if(incoming){try{const valid=validateTcmStructuredPack(incoming,id,requiredIds),sha256=await hash(JSON.stringify(valid)),key='tcm-dataset-'+id+'-'+sha256;const old=await readOfflineFile<{sha256:string}>('tcm-dataset-head-'+id).catch(()=>null);if(old?.sha256!==sha256){await writeOfflineFile(key,valid);if(JSON.stringify(await readOfflineFile(key))!==JSON.stringify(valid))throw Error('中医资料读回不一致');await writeOfflineFile('tcm-dataset-head-'+id,{key,sha256,version:valid.version});}return valid;}catch{return previous();}}
  return previous();
 })());return cache.get(id)!;
}
if(typeof window!=='undefined')window.addEventListener('offline-pack-installed',event=>{const id=(event as CustomEvent<{packId?:string}>).detail?.packId;if(ids.some(x=>x===id)||id==='tcm-learning-complete')cache.clear();});
