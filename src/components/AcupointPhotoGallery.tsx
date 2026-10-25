"use client";
import {StudyImage} from "@/components/StudyImage";
import {useEffect,useState} from "react";
import {BUNDLED_PHOTOS,loadPhotoManifest,PHOTO_ORIGIN,PHOTO_PREFIX,type AcupointPhoto} from "@/lib/acupointPhotos";
import {useBodyScrollLock} from "@/hooks/useBodyScrollLock";
import {usePopupBackHandler} from "@/hooks/usePopupBackHandler";

export function AcupointPhotoGallery({code,nested=false}:{code?:string;nested?:boolean}){
 const [manifest,setManifest]=useState(BUNDLED_PHOTOS),[expanded,setExpanded]=useState<AcupointPhoto|null>(null),[zoom,setZoom]=useState(1),[failed,setFailed]=useState<Record<string,boolean>>({});
 useBodyScrollLock(!!expanded);usePopupBackHandler(()=>setExpanded(null),!!expanded&&!nested);
 useEffect(()=>{let live=true;loadPhotoManifest().then(m=>{if(live)setManifest(m);});return()=>{live=false;};},[]);
 const [retained,setRetained]=useState<Record<string,boolean>>({});
 const records=manifest.records.filter(p=>code&&p.codes.includes(code));
 const creditsUrl=PHOTO_ORIGIN+"/privacy/#acupoint-photo-credits";
 const readingNote=(p:AcupointPhoto)=>p.id==="sun-2026-regional"?"红点为穴位；蓝点为研究对照位置，并非穴位。图中下极泉不等同于标准极泉穴。":"";
 if(!records.length)return null;
 function image(p:AcupointPhoto,large=false){return <StudyImage src={PHOTO_PREFIX+p.file} onRetained={()=>setRetained(previous=>previous[p.id]?previous:{...previous,[p.id]:true})} onLoad={()=>setFailed(s=>({...s,[p.id]:false}))} alt={p.title} onError={()=>{if(!failed[p.id])setFailed(s=>({...s,[p.id]:true}));}} style={{display:"block",width:large?`${zoom*100}%`:"100%",height:"auto",maxWidth:large?"none":680,margin:"auto"}}/>;}
 return <section aria-label="真人部位照片" style={{margin:"12px",padding:12,border:"1px solid #D7C9E3",borderRadius:12,background:"white",color:"#292524"}}>
  <h3 style={{margin:"0 0 8px",fontSize:16}}>真人部位照片</h3>
  {records.map(p=><figure key={p.id} style={{margin:"0 0 12px"}}><button type="button" aria-label={`放大${p.title}`} onClick={()=>{setZoom(1);setExpanded(p);}} style={{padding:0,border:0,width:"100%",background:"#f8f6f2",cursor:"zoom-in"}}>{image(p)}</button><figcaption style={{fontSize:12,lineHeight:1.7,marginTop:8}}>{readingNote(p)&&<p>{readingNote(p)}</p>}{retained[p.id]&&<p role="status">{p.id==="hegu-li4-mk2010"?"合谷图片已保存，可离线查看":"图片已保存，可离线查看"}</p>}</figcaption></figure>)}
  <a href={creditsUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:"#6b6470"}}>图片署名与许可</a>
  {expanded&&<div role="dialog" aria-modal="true" aria-label={expanded.title} style={{position:"fixed",inset:0,zIndex:1500,padding:"calc(env(safe-area-inset-top,0px) + 12px) 12px calc(env(safe-area-inset-bottom,0px) + 12px)",background:"#171717",color:"white",display:"flex",flexDirection:"column"}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",paddingBottom:10}}><strong style={{fontSize:13,flex:1}}>{expanded.title}</strong><button type="button" aria-label="缩小真人照片" disabled={zoom<=1} onClick={()=>setZoom(z=>Math.max(1,z-.5))} style={{minWidth:44,minHeight:44,color:"#222",background:"#fff",border:"1px solid #ddd",borderRadius:8}}>−</button><button type="button" aria-label="放大真人照片" disabled={zoom>=4} onClick={()=>setZoom(z=>Math.min(4,z+.5))} style={{minWidth:44,minHeight:44,color:"#222",background:"#fff",border:"1px solid #ddd",borderRadius:8}}>＋</button><button type="button" onClick={()=>setExpanded(null)} style={{minHeight:44,minWidth:60,color:"#222",background:"white",borderRadius:8}}>关闭</button></div><div style={{flex:1,overflow:"auto",touchAction:"pan-x pan-y pinch-zoom"}}>{image(expanded,true)}{readingNote(expanded)&&<p>{readingNote(expanded)}</p>}<a href={creditsUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:"#ddd"}}>图片署名与许可</a></div></div>}
 </section>;
}
