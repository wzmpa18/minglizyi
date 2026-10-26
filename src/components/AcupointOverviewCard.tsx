"use client";
import {useState} from "react";
import type {TcmAcupoint} from "@/algorithm-core/types/tcm";
import {resolveAcupointOverview,type OverviewText} from "@/lib/acupointOverview";
import type {SubjectReading} from "@/lib/medicalStudyLibrary";
import {LocalListenButton} from "./LocalListenButton";

export function AcupointOverviewCard({point,reading,onIllustration}:{point:TcmAcupoint;reading?:SubjectReading|null;onIllustration:()=>void}){
 const overview=resolveAcupointOverview(point,reading||undefined);
 const [plain,setPlain]=useState(true);
 const rows:Array<{label:string;value:OverviewText|undefined}>=[
  {label:overview.location?.label||"定位",value:overview.location},
  {label:plain&&overview.plainExplanation?"白话理解":"文献主治",value:plain&&overview.plainExplanation?overview.plainExplanation:overview.indications},
  {label:"经典配穴",value:overview.combinations},
 ];
 const text=rows.filter(row=>row.value).map(row=>`${row.label}。${row.value!.text}`).join("\n");
 return <section id="point-overview" aria-label={`${point.name}定位与主治`} style={{margin:12,padding:"18px 16px",borderRadius:14,background:"white",color:"#292524",scrollMarginTop:64}}>
  <div style={{display:"flex",alignItems:"baseline",gap:10}}><h2 style={{fontSize:26,margin:0}}>{point.name}</h2><span style={{color:"#777",fontSize:13}}>{point.pinyin}</span></div>
  <p style={{fontSize:13,color:"#62536b",margin:"6px 0 14px"}}>{point.meridian} · {point.code}{overview.aliases?` · 别名：${overview.aliases}`:""}</p>
  <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><LocalListenButton key={`${point.code}:${plain}`} text={text} contentId={`acupoint:${point.code}:${plain?"plain":"original"}`} compact/>
   {overview.plainExplanation&&<div aria-label="主治文字版本" style={{display:"flex",gap:4}}>{([true,false] as const).map(value=><button type="button" key={String(value)} aria-pressed={plain===value} onClick={()=>setPlain(value)} style={{padding:"6px 10px",fontSize:12,border:"1px solid #e4d7ec",borderRadius:16,background:plain===value?"#f2e9f8":"white",color:"#65338a"}}>{value?"白话":"原文"}</button>)}</div>}
  </div>
  {rows.filter(row=>row.value).map(({label,value})=><div key={label} style={{padding:"16px 0 12px",borderBottom:"1px solid #eee"}}>
   <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}><h3 style={{fontSize:16,margin:"0 0 7px",color:"#69338a"}}>{label}</h3>{value===overview.location&&<button type="button" onClick={onIllustration} style={{fontSize:12,border:0,background:"none",color:"#7131a3",padding:6}}>查看图文 ›</button>}</div>
   <p style={{fontSize:16,lineHeight:1.9,whiteSpace:"pre-wrap",margin:0,overflowWrap:"anywhere"}}>{value!.text}</p>
   <p style={{fontSize:11,lineHeight:1.6,color:"#827986",margin:"7px 0 0"}}>{value!.kind==="EDITORIAL_EXPLANATION"?"学习释义 · ":""}{value!.sourceTitle}{value!.locator?` · ${value!.locator}`:""}</p>
  </div>)}
 </section>;
}
