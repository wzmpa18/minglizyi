"use client";
import {getUserProfile,getUserToken} from "./auth";
import {readOfflineFile,writeOfflineFile} from "./durableOfflineStore";
interface Progress {track:string;chapter:string;completedAt:string;pending?:boolean;}
const uid=()=>getUserToken()?String(getUserProfile()?.userId||""):"";
const key=(id:string)=>`learning-progress:${id}`;
let writes:Promise<unknown>=Promise.resolve(),flushing:Promise<void>|null=null;
const serial=<T,>(fn:()=>Promise<T>):Promise<T>=>{const result=writes.then(fn,fn);writes=result.catch(()=>{});return result;};
export async function localLearningProgress(){const id=uid();return id?await readOfflineFile<Progress[]>(key(id))||[]:[];}
export async function saveLearningCheckin(track:string,chapter:string){
 const id=uid();if(!id)return {success:false};
 await serial(async()=>{const rows=await readOfflineFile<Progress[]>(key(id))||[];
  const next={track,chapter,completedAt:new Date().toISOString(),pending:true};
  await writeOfflineFile(key(id),[...rows.filter(r=>r.track!==track||r.chapter!==chapter),next]);
 });
 void flushLearningProgress();return {success:true};
}
export function flushLearningProgress():Promise<void>{
 if(flushing)return flushing;
 flushing=(async()=>{
  const id=uid();if(!id||navigator.onLine===false)return;
  const rows=await readOfflineFile<Progress[]>(key(id))||[];
  for(const row of rows.filter(r=>r.pending)){
   if(uid()!==id)return;
   const c=new AbortController(),timer=setTimeout(()=>c.abort(),15000);
   try{
    const r=await fetch('/api/academy/progress/checkin',{method:"POST",headers:{'Content-Type':'application/json',Authorization:`Bearer ${getUserToken()}`},body:JSON.stringify({track:row.track,chapter:row.chapter}),signal:c.signal});
    if(!r.ok||!(await r.json()).success)return;
    await serial(async()=>{const latest=await readOfflineFile<Progress[]>(key(id))||[];
     await writeOfflineFile(key(id),latest.map(p=>p.track===row.track&&p.chapter===row.chapter&&p.completedAt===row.completedAt?{...p,pending:false}:p));
    });
   }catch{return;}finally{clearTimeout(timer);}
  }
 })().catch(()=>{}).finally(()=>{flushing=null;});return flushing;
}
export async function fetchLearningProgress(track?:string){
 const id=uid();if(!id)return {success:true,progress:[]};
 // Local first, including pending check-ins; network sync is independent of rendering.
 let rows=await localLearningProgress();
 if(!rows.length&&navigator.onLine!==false){
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),5000);
  try{const r=await fetch('/api/academy/progress',{headers:{Authorization:`Bearer ${getUserToken()}`},signal:c.signal});const j=await r.json();
   if(r.ok&&j.success&&uid()===id){await serial(async()=>{const local=await readOfflineFile<Progress[]>(key(id))||[];const map=new Map<string,Progress>();for(const row of [...(j.progress||[]),...local])map.set(`${row.track}:${row.chapter}`,row);rows=[...map.values()];await writeOfflineFile(key(id),rows);});}
  }catch{}finally{clearTimeout(timer);}
 }
 void flushLearningProgress();return {success:true,progress:uid()===id?rows.filter(r=>!track||r.track===track):[]};
}
