"use client";
import {useCallback,useEffect,useRef} from "react";

import {STUDY_MARKER as MARKER,STUDY_SCOPE as SCOPE,STUDY_INDEX as INDEX,normalizedStudyScope,ownedStudyEntry,isAtlasModelScope,clearAtlasDetailNavigation,consumeAtlasDetailStamp,atlasDetailBaseState} from "@/lib/studyNavigationProof";
const currentScope=()=>normalizedStudyScope(window.location.pathname+window.location.search);
/** One reversible scene entry; nested image dialogs keep their own back step. */
export function useAtlasBackNavigation(stepBack:()=>boolean,scope?:string){
 const step=useRef(stepBack),armed=useRef(false),waiting=useRef(false),owner=useRef(""),ownerScope=useRef<string|null>(null),activeScope=useRef<string|null>(null);step.current=stepBack;
 const request=useCallback(()=>{
  if(waiting.current||!activeScope.current||currentScope()!==activeScope.current)return;
  if(armed.current){
   waiting.current=true;
   try{window.history.back();}catch{waiting.current=false;armed.current=false;step.current();}
  }else step.current();
 },[]);
 useEffect(()=>{
  // An owner per hook instance distinguishes our scene entry from an older
  // scene and from child popups which copy the current history state.
  const here=currentScope(),expected=scope===undefined?(window.location.pathname.replace(/\/+$/,"")==="/zhongyi/anatomy3d"?here:null):normalizedStudyScope(scope);
  activeScope.current=expected;
  if(ownerScope.current!==expected||!owner.current){owner.current=Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);ownerScope.current=expected;}
  const matches=()=>!!expected&&currentScope()===expected;
  if(expected&&matches())try{
   if(isAtlasModelScope(expected))clearAtlasDetailNavigation(window.sessionStorage);
   else{const proof=consumeAtlasDetailStamp(window.sessionStorage,expected,window.history.length);if(proof)window.history.replaceState(atlasDetailBaseState(window.history.state,proof),"");}
  }catch{/* A normal controlled parent remains available without private storage. */}
  const arm=()=>{
   if(!matches()){armed.current=false;waiting.current=false;return;}
   try{
    const existing=ownedStudyEntry(window.history.state,expected!,window.history.length);
    if(existing&&window.history.length>1){window.history.replaceState({...window.history.state,[MARKER]:owner.current,[SCOPE]:expected,[INDEX]:existing.index},"");}
    else{window.history.pushState({...window.history.state,[MARKER]:owner.current,[SCOPE]:expected,[INDEX]:0},"");window.history.replaceState({...window.history.state,[INDEX]:window.history.length-1},"");}
    armed.current=true;
   }catch{armed.current=false;}
   waiting.current=false;
  };
  arm();
  const pop=(event:PopStateEvent)=>{
   if(!armed.current||!matches())return;
   waiting.current=false;
   // Back from a child dialog lands on our still-armed scene entry. Closing
   // that child must not also close the scene's panel or selected point.
   if(event.state?.[MARKER]===owner.current&&event.state?.[SCOPE]===expected)return;
   armed.current=false;
   if(step.current())arm();
  };
  const parentBack=()=>{if(!matches())return;(window as Window&{__zhongyiBackHandled?:boolean}).__zhongyiBackHandled=true;request();};
  window.addEventListener("popstate",pop);window.addEventListener("zhongyi-back",parentBack);
  return()=>{armed.current=false;waiting.current=false;activeScope.current=null;window.removeEventListener("popstate",pop);window.removeEventListener("zhongyi-back",parentBack);};
 },[request,scope]);
 return request;
}
