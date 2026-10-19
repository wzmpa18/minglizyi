"use client";
import {useEffect,useState,type CSSProperties} from "react";
import {createPortal} from "react-dom";
import {useBodyScrollLock} from "@/hooks/useBodyScrollLock";
import {usePopupBackHandler} from "@/hooks/usePopupBackHandler";
import {InterfaceButton} from "./InterfaceControls";
import { usePathname } from "next/navigation";
import { AcupointStudyDiscussion } from "./AcupointStudyDiscussion";
import { STUDY_TOOL_IDS } from "../../backend_deploy/studyToolTargets";

const OPEN_EVENT="yandao:open-tool-study-discussion";
export function ToolDiscussionButton({toolId,style,className}:{toolId:string;style?:CSSProperties;className?:string}){
 return <InterfaceButton type="button" aria-haspopup="dialog" className={className} style={style} onClick={()=>window.dispatchEvent(new CustomEvent(OPEN_EVENT,{detail:toolId}))}>学习交流</InterfaceButton>;
}
export function ToolStudyDiscussion() {
  const pathname = usePathname();
  const [open,setOpen]=useState(false);
  useBodyScrollLock(open);
  usePopupBackHandler(()=>setOpen(false),open);
  useEffect(()=>{setOpen(false);},[pathname]);
  useEffect(()=>{const show=(event:Event)=>{const tool=pathname.split("/").filter(Boolean)[1];if((event as CustomEvent).detail===tool&&STUDY_TOOL_IDS.includes(tool))setOpen(true);};window.addEventListener(OPEN_EVENT,show);return()=>window.removeEventListener(OPEN_EVENT,show);},[pathname]);
  useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[open]);
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || parts[0] !== "yixue" || !STUDY_TOOL_IDS.includes(parts[1])) return null;
  return <>{parts[1]!=="ziwei"&&<div className="pointer-events-none fixed inset-x-0 z-[70] mx-auto flex max-w-[420px] justify-start px-3" style={{bottom:'calc(76px + env(safe-area-inset-bottom, 0px))'}}><InterfaceButton type="button" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)} className="pointer-events-auto rounded-full border border-purple-300 bg-white px-4 py-2 text-sm font-semibold text-purple-900 shadow-lg">💬 学习交流</InterfaceButton></div>}{open&&typeof document!=="undefined"&&createPortal(<div className="fixed inset-0 z-[11000] flex items-end justify-center bg-black/40" onClick={()=>setOpen(false)}><section id="tool-study-discussion-dialog" role="dialog" aria-modal="true" aria-label="工具学习交流" className="w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white pb-[max(20px,env(safe-area-inset-bottom))]" style={{maxHeight:'85dvh'}} onClick={event=>event.stopPropagation()}><header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4 text-stone-900"><h2 className="font-semibold">学习交流 · 500字文字留言</h2><InterfaceButton className="rounded-lg border px-3 py-2" onClick={()=>setOpen(false)}>关闭交流</InterfaceButton></header><AcupointStudyDiscussion targetId={`tool:${parts[1]}`} title="" expanded/></section></div>,document.body)}</>;
}
