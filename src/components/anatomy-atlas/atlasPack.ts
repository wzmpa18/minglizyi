"use client";
import { unzipSync } from "fflate";
import { loadPackContent, type DownloadProgress } from "@/lib/offlinePackClient";

export const PACK_ID = "tcm-anatomy-atlas-v3";
export interface LearningMetadata {zhName?:string;learningDescription?:string;learningSource?:string}
export interface Part extends LearningMetadata { id:string; name:string; conceptId:string; system:string; chunk:number; positions:number; normals:number; indices:number; vertexCount:number; indexCount:number; bounds:[number[],number[]] }
export interface Point { code:string; name:string; pinyin:string; meridianId:string; meridian:string; reviewed:boolean; surfaceUnavailable?:boolean; midline:boolean; source:string; positionProvenance:string }
export interface Atlas { viewerPreferences?:{overviewDistance?:number;overviewTargetY?:number}; parts:Part[]; chunks:{url:string;bytes:number}[]; concepts:({id:string;name:string;elements:string[]}&LearningMetadata)[]; version:string }
export interface Surface { points:{key:string;target:{position:number[];normal:number[];meshId:string;faceIndex:number}}[]; paths:{meridianId?:string;id?:string;positions?:number[];[key:string]:unknown}[] }
export interface Dataset { atlas:Atlas; points:Point[]; surface:Surface; files:Record<string,Uint8Array>; version:string;verifiedFiles?:Record<string,string>;routeDerivation?:unknown }
export interface AssetManifest { format:string; version:string; viewerProtocol:number; files:{path:string;size:number;sha256:string}[] }
export async function verifyBytes(bytes:Uint8Array, expected:string) {
  const digest=await crypto.subtle.digest("SHA-256",new Uint8Array(bytes).buffer);
  const actual=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
  if(actual!==expected) throw new Error("图谱资源校验失败，原有资源仍保留");
}
export async function openAtlas():Promise<Dataset|null> {
  const bytes=await loadPackContent(PACK_ID); if(!bytes)return null;
  return decodeAtlas(bytes);
}
export async function decodeAtlas(bytes:ArrayBuffer):Promise<Dataset> {
  const files=unzipSync(new Uint8Array(bytes));
  const json=<T,>(name:string):T=>{if(!files[name])throw new Error("图谱缺少资源："+name);return JSON.parse(new TextDecoder().decode(files[name]));};
  const manifest=json<AssetManifest>("manifest.json");
  if(manifest.format!=="yandao-bodyparts-atlas"||manifest.viewerProtocol!==1)throw new Error("图谱版本需要更新客户端");
  for(const entry of manifest.files){const b=files[entry.path];if(!b||b.byteLength!==entry.size)throw new Error("图谱文件不完整");await verifyBytes(b,entry.sha256);}
  const atlas=json<Atlas>("atlas.json");
  for(const c of atlas.chunks)if(!files[c.url]||files[c.url].length!==c.bytes)throw new Error("人体网格不完整");
  const verifiedFiles=Object.fromEntries(manifest.files.map(entry=>[entry.path,entry.sha256]));
  // Optional pure data can update with an authenticated, verified atlas pack.
  // Unlisted members never become a trusted override. Bad optional JSON does
  // not make the original anatomy unavailable; the viewer retains its fallback.
  const derived="classical-surface-routes.json";let routeDerivation:unknown;
  if(verifiedFiles[derived]&&files[derived]?.byteLength<=4_000_000){try{routeDerivation=json<unknown>(derived);}catch{}}
  return {atlas,points:json<Point[]>("points.json"),surface:json<Surface>("surface.json"),files,version:manifest.version,verifiedFiles,routeDerivation};
}
export class AtlasAccessError extends Error { constructor(message:string, public action?:"login"|"membership"){super(message);this.name="AtlasAccessError";} }
export async function installAtlas(progress?:DownloadProgress) {
  try { await (await import("@/lib/anatomyLearningBundle")).downloadCompleteAnatomy(progress); }
  catch(error) { const e=error as Error&{action?:"login"|"membership"};throw new AtlasAccessError(e.message,e.action); }
}
export const SYSTEMS:[string,string,string,string][]=[
 ["integumentary","体表","#cda78e","体表为观察方位的参考，参与屏障保护、感觉和体温调节。"],
 ["skeletal","骨骼","#ded5b5","骨骼支撑身体、保护器官，提供肌肉附着点，并参与造血和矿物质储存。"],
 ["muscular","肌肉","#af6258","骨骼肌通过收缩参与运动、姿势维持和产热，需结合起止点与神经支配学习。"],
 ["cardiac","心脏","#b96760","心脏通过肺循环和体循环泵送血液，瓣膜维持血液的定向流动。"],
 ["arterial","动脉","#c05245","动脉将血液从心脏输送至组织或肺部；颜色为教学区分，并非真实血管颜色。"],
 ["venous","静脉","#527c9f","静脉将血液回流至心脏；浅、深静脉的关系需结合局部解剖观察。"],
 ["nervous","神经","#d8b565","中枢及周围神经参与感觉、运动和自主功能调节；示意网格不代表全部微细分支。"],
 ["respiratory","呼吸","#b98991","气道传导空气，肺参与气体交换；胸廓与呼吸肌共同完成通气。"],
 ["digestive","消化","#b8916b","消化道与附属器官共同完成食物处理、营养吸收和废物排出。"],
 ["urinary","泌尿","#b47961","肾脏参与滤过和内环境调节，尿液经输尿管、膀胱、尿道排出。"],
 ["lymphatic","淋巴","#879f7c","淋巴系统参与组织液回流和免疫功能，图中仅显示数据集收录结构。"],
 ["endocrine","内分泌","#c5a09a","内分泌器官通过激素调节代谢、生长及其他生理过程。"],
 ["reproductive","生殖","#bda098","当前数据为成人男性参考体，不代表女性、儿童或所有解剖变异。"],
 ["connective","结缔组织","#aec3bb","软骨、韧带等组织连接和支持结构，参与关节稳定与负荷分配。"],
 ["sensory","感觉器官","#b0c8ce","视觉、听觉和平衡相关结构将刺激转化为神经信号。"],
];
const NAMES:Record<string,string>={"hair of head":"头发","pubic hair":"阴毛",eyebrow:"眉毛",lip:"唇",heart:"心脏",liver:"肝脏",brain:"脑",stomach:"胃",spleen:"脾脏",pancreas:"胰腺",trachea:"气管",diaphragm:"膈肌",gallbladder:"胆囊","urinary bladder":"膀胱",duodenum:"十二指肠",jejunum:"空肠",ileum:"回肠",rectum:"直肠",prostate:"前列腺",skin:"皮肤",aorta:"主动脉","left kidney":"左肾","right kidney":"右肾","left lung":"左肺","right lung":"右肺",sacrum:"骶骨",mandible:"下颌骨",sternum:"胸骨","ascending colon":"升结肠","transverse colon":"横结肠","descending colon":"降结肠","sigmoid colon":"乙状结肠"};
const BONES:Record<string,string>={humerus:"肱骨",ulna:"尺骨",radius:"桡骨",femur:"股骨",tibia:"胫骨",fibula:"腓骨",clavicle:"锁骨",scapula:"肩胛骨",patella:"髌骨",talus:"距骨",calcaneus:"跟骨",sternum:"胸骨",skull:"颅骨",sacrum:"骶骨",mandible:"下颌骨"};
export const chineseName=(part:Pick<Part,"name">&LearningMetadata)=>{
 if(typeof part.zhName==="string"&&part.zhName.trim())return part.zhName.slice(0,120);
 const raw=part.name.toLowerCase();if(NAMES[raw]||BONES[raw])return NAMES[raw]||BONES[raw];
 const side=raw.startsWith("left ")?"左":raw.startsWith("right ")?"右":"";const base=side?raw.slice(raw.indexOf(" ")+1):raw;
 return side&&(NAMES[base]||BONES[base])?side+(NAMES[base]||BONES[base]):"中文名待校对";
};
export function selectionParts(atlas:Atlas,id:string|null):Part[]{
 if(!id)return [];const concept=atlas.concepts.find(c=>c.id===id);const ids=new Set(concept?.elements||[id]);return atlas.parts.filter(p=>ids.has(p.id));
}
