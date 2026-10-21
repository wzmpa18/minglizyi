import type {StarterLesson} from "../data/studyStarter";
import {validateStudyCatalog,MAX_CATALOG_BYTES} from "../../backend_deploy/studyContentPolicy.js";
export interface StudyCatalog {schemaVersion:1;readerVersion:1;revision:number;publishedAt:string;releaseNotes:string;lessons:StarterLesson[];}
export const STUDY_CATALOG_CACHE="yandao_starter_catalog_v1";
export const STUDY_CATALOG_URL="https://yandaoguoxue.yandao.vip/api/academy/starter-content";
export function parseStudyCatalog(raw:string):StudyCatalog|null{
 try{if(new TextEncoder().encode(raw).byteLength>MAX_CATALOG_BYTES)return null;const value=JSON.parse(raw);return validateStudyCatalog(value).ok?value as StudyCatalog:null;}catch{return null;}
}
export async function downloadStudyCatalog(signal?:AbortSignal):Promise<StudyCatalog>{
 const controller=new AbortController(),cancel=()=>controller.abort();signal?.addEventListener("abort",cancel,{once:true});if(signal?.aborted)controller.abort();
 const timer=setTimeout(cancel,8000);
 try{
  const response=await fetch(STUDY_CATALOG_URL,{credentials:"omit",cache:"no-store",signal:controller.signal});
  if(!response.ok||Number(response.headers.get("Content-Length"))>MAX_CATALOG_BYTES+100)throw Error("课程更新暂不可用");
  if(!response.body)throw Error("课程更新内容为空");
  const reader=response.body.getReader(),parts:Uint8Array[]=[];let size=0;
  try{for(;;){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>MAX_CATALOG_BYTES+100){controller.abort();throw Error("课程更新超出安全大小");}parts.push(chunk.value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
  const value=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  const catalog=parseStudyCatalog(JSON.stringify(value.catalog));if(value.success!==true||!catalog)throw Error("课程格式暂不受支持，保留现有资料");return catalog;
 }finally{clearTimeout(timer);signal?.removeEventListener("abort",cancel);}
}
