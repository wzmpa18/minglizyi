"use client";
import { getUserProfile, getUserToken } from "./auth";
import { readOfflineFile, writeOfflineFile, removeOfflineFile } from "./durableOfflineStore";
import { loadJsonPack } from "./offlinePackClient";

type Row = Record<string, any>;
type Kind = "knowledge"|"questions";
interface Group {track:string;category:string;kind:Kind;pages:string[];pageInfo?:Array<{before:number|null;next:number|null;etag:string|null;count:number}>;cursor:number|null;complete:boolean;updatedAt:number;count:number;generation:number;previous?:Group;packVersion?:string;}
interface Library {categories:Row[];groups:Record<string,Group>;updatedAt:number;tracks?:Row[];}
interface AcademyPack {schema:string;version:string;track:string;categories:Row[];knowledge:Row[];questions:Row[];}
export interface OfflinePreparation {phase:"idle"|"downloading"|"ready"|"waiting"|"login";items:number;completed:number;total:number;message:string;}
let status:OfflinePreparation={phase:"idle",items:0,completed:0,total:0,message:"内置排盘与资料已在手机，在线资料将自动下载"};
let active:Promise<void>|null=null;
let lastOwner="", lastRun=0;
const owner=()=>getUserToken()?String(getUserProfile()?.userId||""):"";
const root=(uid:string)=>`learning:${uid}`;
const groupId=(track:string,category:string,kind:Kind)=>JSON.stringify([track,category,kind]);
const fresh=(g:Group)=>g.complete && (!!g.packVersion || Date.now()-g.updatedAt<7*86400000);
const publish=(patch:Partial<OfflinePreparation>)=>{status={...status,...patch};window.dispatchEvent(new CustomEvent("offline-preparation",{detail:status}));};
export const offlinePreparationStatus=()=>status;
const pause=()=>new Promise<void>(resolve=>setTimeout(resolve,120));
async function importInstalledPacks(uid:string,library:Library):Promise<boolean>{
 let changed=false;
 for(const track of ["zhongyi","yixue"]){
  const pack=await loadJsonPack<AcademyPack>(`academy-${track}-approved`);
  if(!pack||pack.schema!=="yandao.academy.offline.v1"||pack.track!==track)continue;
  const categoryMap=new Map(library.categories.map((row)=>[`${row.track}|${row.name}`,row]));
  for(const row of pack.categories||[])categoryMap.set(`${row.track}|${row.name}`,row);
  library.categories=[...categoryMap.values()];
  for(const kind of ["knowledge","questions"] as const){
   const rows=kind==="knowledge"?(pack.knowledge||[]):(pack.questions||[]);
   const byCategory=new Map<string,Row[]>();
   for(const row of rows){const category=String(row.category||"未分类");byCategory.set(category,[...(byCategory.get(category)||[]),row]);}
   for(const [category,items] of byCategory){
    const id=groupId(track,category,kind),existing=library.groups[id];
    if(existing?.packVersion===pack.version&&existing.complete)continue;
    const key=`${root(uid)}:pack:${track}:${kind}:${encodeURIComponent(category)}:${pack.version}`;
    await writeOfflineFile(key,items);
    if(existing)for(const oldKey of existing.pages.filter((value)=>value!==key))await removeOfflineFile(oldKey);
    library.groups[id]={track,category,kind,pages:[key],cursor:null,complete:true,updatedAt:Date.now(),count:items.length,generation:Date.now(),packVersion:pack.version};
    changed=true;
   }
  }
 }
 return changed;
}
async function request(uid:string,path:string,etag?:string|null):Promise<any>{
 if(owner()!==uid)throw Error("账号已切换，下载稍后继续");
 if(navigator.onLine===false)throw Error("等待联网后继续下载，已下载资料可直接使用");
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),20000);
 try{
  const r=await fetch(path,{headers:{Authorization:`Bearer ${getUserToken()}`,...(etag?{"If-None-Match":etag}:{})},signal:c.signal});
  if(r.status===304)return {success:true,unchanged:true};
  if(r.status===401)throw Error("登录后继续下载，已下载文件保留在手机");
  if(r.status===403)return {success:false,denied:true};
  if(!r.ok)throw Error("网络暂不可用，稍后自动继续");
  const body=await r.json();if(!body.success)throw Error(body.error||"资料下载暂未完成");return {...body,_offlineEtag:r.headers.get("ETag")};
 }finally{clearTimeout(timer);}
}
async function prepare(force:boolean){
 const uid=owner();
 if(!uid){publish({phase:"login",message:"内置资料可离线使用；登录后自动下载学堂资料"});return;}
 if(!force && lastOwner===uid && Date.now()-lastRun<60000)return;
 lastOwner=uid;lastRun=Date.now();
 let library=await readOfflineFile<Library>(root(uid))||{categories:[],groups:{},updatedAt:0};
 if(await importInstalledPacks(uid,library)){library.updatedAt=Date.now();await writeOfflineFile(root(uid),library);}
 const stats=()=>{const gs=Object.values(library.groups);return {items:gs.reduce((n,g)=>n+(g.previous?.count||g.count),0),completed:gs.filter(g=>g.complete).length,total:gs.length};};
 publish({...stats(),phase:"downloading",message:"正在后台准备离线资料，可继续使用其他功能"});
 try{
  if(!library.categories.length||force||Date.now()-library.updatedAt>86400000){
   const categories:Row[]=[];
   for(const track of ["zhongyi","yixue","guoxue","yikao"]){
    const r=await request(uid,`/api/academy/categories?track=${track}`);
    if(!r.denied)categories.push(...(r.categories||[]));await pause();
   }
   const overview=await request(uid,"/api/academy/tracks");
   if(!overview.denied)library.tracks=overview.tracks||[];
   library.categories=categories;library.updatedAt=Date.now();await writeOfflineFile(root(uid),library);
  }
  for(const cat of library.categories){
   for(const kind of ["knowledge","questions"] as const){
    const id=groupId(cat.track,cat.name,kind);let g=library.groups[id];
    if(g&&fresh(g)&&!force)continue;
    if(!g||g.complete){g={track:cat.track,category:cat.name,kind,pages:[],cursor:null,complete:false,count:0,generation:Date.now(),updatedAt:0,...(g?{previous:{...g,previous:undefined}}:{})};library.groups[id]=g;}
    for(;;){
     await pause();
     const q=new URLSearchParams({track:g.track,category:g.category,limit:"100",status:"approved"});
     if(g.cursor!==null)q.set("beforeId",String(g.cursor));
     const previousIndex=g.previous?.pageInfo?.findIndex(p=>p.before===g.cursor)??-1;
     const previousInfo=previousIndex>=0?g.previous!.pageInfo![previousIndex]:null;
     const oldKey=previousIndex>=0?g.previous!.pages[previousIndex]:null;
     const oldRows=oldKey?await readOfflineFile<Row[]>(oldKey):null;
     const result=await request(uid,`/api/academy/${kind}?${q}`,oldRows?previousInfo?.etag:null);
     if(result.denied){break;}
     if(!result.pagination && !result.unchanged)throw Error("离线资料服务正在准备，稍后自动继续");
     const rows:Row[]=result.unchanged?oldRows!:result[kind==="knowledge"?"points":"questions"]||[];
     const key=result.unchanged?oldKey!:`${root(uid)}:${id}:${g.generation}:${g.pages.length}`;
     if(!result.unchanged)await writeOfflineFile(key,rows);
     const next=result.unchanged?previousInfo!.next:result.pagination.nextBeforeId;
     if(next!=null && (!Number.isSafeInteger(next)||next<1||(g.cursor!==null&&next>=g.cursor)))throw Error("资料分页异常，已保留下载进度");
     g.pages.push(key);g.count+=rows.length;
     (g.pageInfo??=[]).push({before:g.cursor,next:next??null,etag:result.unchanged?previousInfo!.etag:result._offlineEtag,count:rows.length});
     g.cursor=next??null;g.complete=next==null;g.updatedAt=Date.now();
     await writeOfflineFile(root(uid),library);
     publish({...stats(),message:`正在下载${cat.name}，已保存 ${stats().items} 条；可继续操作`});
     if(g.complete){
      const old=g.previous;delete g.previous;await writeOfflineFile(root(uid),library);
      if(old)for(const key of old.pages.filter(key=>!g.pages.includes(key)))await removeOfflineFile(key);
      break;
     }
    }
   }
  }
  const all=Object.keys(library.groups).length>0 && Object.values(library.groups).every(g=>g.complete);
  publish({...stats(),phase:all?"ready":"waiting",message:all?"离线资料已下载到手机，关机重启后仍可使用":"已下载资料可离线使用，部分资料待联网或授权后继续"});
 }catch(e){publish({...stats(),phase:"waiting",message:(e as Error).message||"下载稍后继续，已保存资料不会丢失"});}
}
export function prepareOfflineLearning(force=false):Promise<void>{
 if(typeof window==="undefined")return Promise.resolve();
 if(active)return active;
 active=prepare(force).catch(()=>publish({phase:"waiting",message:"手机存储暂不可用，稍后重试"})).finally(()=>{active=null;});return active;
}

/** Read only the current user's downloaded, authorized learning data. Never handles AI/payment APIs. */
export async function offlineAcademyResponse(path:string):Promise<any|null>{
 const uid=owner();if(!uid)return null;
 const url=new URL(path,"https://offline.local");
 if(!["/api/academy/categories","/api/academy/knowledge","/api/academy/questions","/api/academy/tracks"].includes(url.pathname))return null;
 if(url.searchParams.get("status") && url.searchParams.get("status")!=="approved")return null;
 const library=await readOfflineFile<Library>(root(uid));if(!library)return null;
 if(url.pathname.endsWith("/tracks"))return navigator.onLine===false&&library.tracks&&owner()===uid?{success:true,tracks:library.tracks,offline:true}:null;
 const track=url.searchParams.get("track"),category=url.searchParams.get("category");
 if(url.pathname.endsWith("/categories"))return library.categories.length && owner()===uid?{success:true,categories:library.categories.filter(r=>!track||r.track===track),offline:true}:null;
 const kind:Kind=url.pathname.endsWith("/knowledge")?"knowledge":"questions";
 const groups=Object.values(library.groups).filter(g=>g.kind===kind&&(!track||g.track===track)&&(!category||g.category===category));
 if(!groups.length)return null;
 if(navigator.onLine!==false && groups.some(g=>!g.complete&&!g.previous))return null;
 const unique=new Map<string,Row>();
 for(const group of groups){const g=group.previous||group;for(const key of g.pages){
  const rows=await readOfflineFile<Row[]>(key);if(rows===null)return null;
  for(const row of rows)unique.set(String(row.id),row);
 }}
 const limit=Math.min(1000,Math.max(1,Number(url.searchParams.get("limit"))||300));
 const rows=[...unique.values()].filter(r=>(!url.searchParams.get("materialId")||String(r.materialId)===url.searchParams.get("materialId"))&&(!url.searchParams.get("type")||r.type===url.searchParams.get("type"))).sort((a,b)=>Number(b.id)-Number(a.id)).slice(0,limit);
 if(owner()!==uid)return null;
 return {success:true,[kind==="knowledge"?"points":"questions"]:rows,offline:true};
}
