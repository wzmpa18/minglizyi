"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {STARTER_LESSONS} from "@/data/studyStarter";
import {downloadStudyCatalog,parseStudyCatalog,STUDY_CATALOG_CACHE,type StudyCatalog} from "@/lib/studyCatalog";
export function useStudyCatalog(){
 const [catalog,setCatalog]=useState<StudyCatalog|null>(null),[status,setStatus]=useState("内置学习资料"),[updating,setUpdating]=useState(false);
 const current=useRef<StudyCatalog|null>(null),request=useRef<AbortController|null>(null),alive=useRef(false);
 const refresh=useCallback(async()=>{
  if(request.current)return;const controller=new AbortController();request.current=controller;setUpdating(true);
  try{const next=await downloadStudyCatalog(controller.signal);if(!alive.current||controller.signal.aborted||request.current!==controller)return;
   if(current.current&&next.revision<current.current.revision)throw Error("保留本机已下载的较新资料");
   current.current=next;setCatalog(next);
   try{localStorage.setItem(STUDY_CATALOG_CACHE,JSON.stringify(next));setStatus(`已下载学习资料 · 第${next.revision}版 · 可离线复习`);}catch{setStatus(`学习资料第${next.revision}版 · 本机存储不足，暂未离线保存`);}
  }catch{if(alive.current&&request.current===controller)setStatus(current.current?`使用已下载资料 · 第${current.current.revision}版，稍后可重试更新`:"使用内置16课 · 联网后可获取更多课程");}
  finally{if(request.current===controller){request.current=null;if(alive.current)setUpdating(false);}}
 },[]);
 useEffect(()=>{alive.current=true;try{const cached=parseStudyCatalog(localStorage.getItem(STUDY_CATALOG_CACHE)||"");if(cached){current.current=cached;setCatalog(cached);setStatus(`已下载学习资料 · 第${cached.revision}版`);}}catch{}
  void refresh();return()=>{alive.current=false;request.current?.abort();request.current=null;};
 },[refresh]);
 return {lessons:catalog?.lessons||STARTER_LESSONS,status,revision:catalog?.revision||0,updating,refresh};
}
