"use client";

import {useCallback,useEffect,useRef,useState} from 'react';
import {getRuntimePlatform} from '@/lib/platformGate';
import {CLIENT_VERSION,STORE_CHANNEL} from '@/lib/releaseFeatures';
import {eligibleNotice,type NoticeContext,type NoticeItem} from '../../backend_deploy/announcementPolicy';
import {startupNotice,markNoticeShown,rememberNotice} from '@/lib/noticeDisplay';
import {useBodyScrollLock} from '@/hooks/useBodyScrollLock';
import {usePopupBackHandler} from '@/hooks/usePopupBackHandler';

/** Permanent notice entry; only reviewed learning/service text, no links/actions. */
export default function AnnouncementBar(){
 const [items,setItems]=useState<NoticeItem[]>([]),[open,setOpen]=useState(false),[idx,setIdx]=useState(0);
 const [startup,setStartup]=useState<NoticeItem|null>(null),[remember,setRemember]=useState(true);
 const contextRef=useRef<NoticeContext|null>(null);
 const close=useCallback(()=>{if(startup&&remember&&contextRef.current){try{rememberNotice(startup,contextRef.current,window.localStorage);}catch{}}setOpen(false);setStartup(null);},[startup,remember]);
 useBodyScrollLock(open);usePopupBackHandler(close,open);
 useEffect(()=>{if(!open)return;const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();close();}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[open,close]);
 useEffect(()=>{
  const abort=new AbortController();let live=true;
  const context={channel:STORE_CHANNEL,platform:getRuntimePlatform(),version:CLIENT_VERSION};contextRef.current=context;
  void(async()=>{try{
   const response=await fetch('/api/announcements/public',{cache:'no-store',signal:abort.signal,headers:{'X-Store-Channel':context.channel,'X-Client-Platform':context.platform,'X-Client-Version':context.version}});
   if(!response.ok)return;const payload=await response.json();if(!live||payload?.success!==true||!Array.isArray(payload.announcements))return;
   const rows=payload.announcements.filter((row:unknown):row is NoticeItem=>eligibleNotice(row,context));setItems(rows);
   try{const candidate=startupNotice(rows,context,window.localStorage);
    if(candidate&&!document.querySelector('[role="dialog"],[role="alertdialog"],.modal-overlay-center')&&markNoticeShown(window.localStorage)){setStartup(candidate);setRemember(true);setOpen(true);}
   }catch{/* Storage unavailable: keep the manual entry, never repeat popups. */}
  }catch{/* A notice failure never blocks learning or login. */}})();
  return()=>{live=false;abort.abort();};
 },[]);
 useEffect(()=>{if(items.length<2||open)return;const timer=setInterval(()=>setIdx(n=>(n+1)%items.length),5000);return()=>clearInterval(timer);},[items.length,open]);
 if(!items.length)return null;
 const shown=startup?[startup]:items,current=items[idx]||items[0];
 return <>
  <button aria-label="官方公告" onClick={()=>{setStartup(null);setOpen(true);}} className="mx-3 mt-3 flex w-[calc(100%-24px)] items-center gap-2 rounded-xl bg-white px-3 py-2 text-left shadow-sm" style={{border:'1px solid #eee4f7',minHeight:44}}>
   <span style={{color:'#7b2fbe',fontSize:12,fontWeight:700}}>公告</span><span className="flex-1 truncate text-xs text-gray-700">{current.title}</span><span className="text-xs text-gray-400">{items.length>1?`${idx+1}/${items.length}`:'查看'}</span>
  </button>
  {open&&<div className="modal-overlay-center" onClick={close}>
   <section role="dialog" aria-modal="true" aria-labelledby="official-notice-title" className="modal-center" onClick={event=>event.stopPropagation()} style={{width:'min(90vw,400px)',maxHeight:'75dvh',overflowY:'auto'}}>
    <header className="flex items-center justify-between px-4 pt-3"><h2 id="official-notice-title" className="text-base font-bold" style={{color:'#7b2fbe'}}>官方公告</h2><button autoFocus aria-label="关闭公告" onClick={close} style={{minWidth:44,minHeight:44,fontSize:24,border:0,background:'transparent'}}>×</button></header>
    <div className="px-4 pb-2">{shown.map(item=><article key={`${item.id}:${item.revision}`} className="mb-3 rounded-xl bg-[#faf8fd] p-3">
     <h3 className="text-sm font-semibold text-gray-800">{item.title}</h3>
     <p onClick={close} className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">{item.content}</p>
     <p className="mt-2 text-[11px] text-gray-400">{item.publisher} · {item.publishAt.slice(0,10)}</p>
    </article>)}</div>
    {startup&&<label className="mx-4 flex items-center gap-2 text-xs text-gray-500" style={{minHeight:44}}><input type="checkbox" checked={remember} onChange={event=>setRemember(event.target.checked)}/>不再自动提示这条通知</label>}
    <button onClick={close} className="mx-4 mb-4 rounded-xl bg-[#7b2fbe] text-sm text-white" style={{width:'calc(100% - 32px)',minHeight:44}}>关闭</button>
   </section>
  </div>}
 </>;
}
