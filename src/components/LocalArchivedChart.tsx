"use client";
import {useMemo,useState} from "react";
import {snapshot as project} from "../../backend_deploy/liveChartPolicy";
import type {LiveSnapshot} from "@/lib/liveCharts";
import {LiveChartBoard} from "./LiveChartBoard";

/** Local renderer only. Does not fetch, recompute, send or recover redacted data. */
export function LocalArchivedChart({tool,version,record}:{tool:string;version:string;record:Record<string,unknown>}){
 const [open,setOpen]=useState(false);
 const resolved=useMemo(()=>{
  try{
   if(record.schemaVersion===1&&record.renderVersion===1&&record.data)return {chart:{...record,version} as unknown as LiveSnapshot,error:""};
   if(record.result&&typeof record.result==='object')return {chart:{...project(tool as keyof typeof import('../../backend_deploy/liveChartPolicy').ADAPTERS,record.result,{showPillars:true}),version} as unknown as LiveSnapshot,error:""};
   return {chart:null,error:"此旧记录缺少完整结果，无法补排；原始数据仍保留在本机备份中。"};
  }catch(error){return {chart:null,error:error instanceof Error?error.message:"此盘式暂未支持本地交互显示，原始记录仍完整保留"};}
 },[record,tool,version]);
 return <section className="my-3 rounded-xl border border-stone-200 p-3"><button type="button" className="flex w-full justify-between text-left text-sm font-semibold text-purple-900" onClick={()=>setOpen(v=>!v)} aria-expanded={open}><span>归档盘面 · {resolved.chart?.title||tool} · {version.slice(0,8)}</span><span>{open?'收起':'打开'}</span></button>{open&&<div className="mt-3">{resolved.chart?<LiveChartBoard chart={resolved.chart}/>:<p className="text-sm leading-6 text-stone-600">{resolved.error}</p>}<p className="mt-3 text-xs text-stone-500">固定归档版本，本机读取；不会向原分享者回传你的笔记。缺失或隐藏的输入不补算。</p></div>}</section>;
}
