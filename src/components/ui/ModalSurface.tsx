"use client";
import {useEffect,useRef,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
/** Dialogs escape page transforms/headers and the fixed bottom navigation.
 * The modal owns focus while open; no private contents are read or persisted. */
export function ModalSurface({label,children,onClose,locked=false,className=''}:{label:string;children:ReactNode;onClose:()=>void;locked?:boolean;className?:string}){
 const root=useRef<HTMLDivElement>(null),state=useRef({onClose,locked});state.current={onClose,locked};
 useEffect(()=>{
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const controls=()=>[...(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')||[])].filter(el=>el.getClientRects().length>0);
  (controls()[0]||root.current)?.focus();
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(!state.current.locked)state.current.onClose();return;}
   if(event.key!=='Tab')return;
   const items=controls(),first=items[0],last=items.at(-1);
   if(!first){event.preventDefault();root.current?.focus();return;}
   if(event.shiftKey&&(document.activeElement===first||!root.current?.contains(document.activeElement))){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&(document.activeElement===last||!root.current?.contains(document.activeElement))){event.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',key,true);
  return()=>{document.removeEventListener('keydown',key,true);if(previous?.isConnected)previous.focus();};
 },[]);
 if(typeof document==='undefined')return null;
 return createPortal(<div ref={root} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className={'fixed inset-0 z-[30000] overflow-auto p-4 pt-[max(28px,calc(env(safe-area-inset-top)+16px))] pb-[max(24px,calc(env(safe-area-inset-bottom)+16px))] '+className}>{children}</div>,document.body);
}
