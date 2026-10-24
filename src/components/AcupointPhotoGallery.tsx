"use client";
import {useEffect,useState} from "react";
import {BUNDLED_PHOTOS,loadPhotoManifest,PHOTO_ORIGIN,PHOTO_PREFIX,type AcupointPhoto} from "@/lib/acupointPhotos";
import {useBodyScrollLock} from "@/hooks/useBodyScrollLock";
import {usePopupBackHandler} from "@/hooks/usePopupBackHandler";

export function AcupointPhotoGallery({code}:{code?:string}){
 const [manifest,setManifest]=useState(BUNDLED_PHOTOS),[expanded,setExpanded]=useState<AcupointPhoto|null>(null),[failed,setFailed]=useState<Record<string,boolean>>({});
 useBodyScrollLock(!!expanded);usePopupBackHandler(()=>setExpanded(null),!!expanded);
 useEffect(()=>{let live=true;loadPhotoManifest().then(m=>{if(live)setManifest(m);});return()=>{live=false;};},[]);
 const records=manifest.records.filter(p=>code&&p.codes.includes(code));
 if(!records.length)return null;
 function image(p:AcupointPhoto,large=false){return <img src={(failed[p.id]?"":PHOTO_ORIGIN)+PHOTO_PREFIX+p.file} alt={p.title} onError={()=>{if(!failed[p.id])setFailed(s=>({...s,[p.id]:true}));}} style={{display:"block",width:"100%",height:"auto",maxWidth:large?1600:680,margin:"auto"}}/>;}
 return <section aria-label="真人部位照片" style={{margin:"12px",padding:12,border:"1px solid #D7C9E3",borderRadius:12,background:"white",color:"#292524"}}>
  <h3 style={{margin:"0 0 8px",fontSize:16}}>真人部位照片</h3>
  {records.map(p=><figure key={p.id} style={{margin:"0 0 12px"}}><button type="button" aria-label={`放大${p.title}`} onClick={()=>setExpanded(p)} style={{padding:0,border:0,width:"100%",background:"#f8f6f2",cursor:"zoom-in"}}>{image(p)}</button><figcaption style={{fontSize:12,lineHeight:1.7,marginTop:8}}><strong>{p.title}</strong><p>{p.caption}</p><p>摄影／资料：{p.author} · <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">查看原始出处</a> · <a href={p.licenseUrl} target="_blank" rel="noopener noreferrer">{p.license}</a></p><p>{p.changes}。仅作图文学习对照，不能据照片自行针刺。</p></figcaption></figure>)}
  {expanded&&<div role="dialog" aria-modal="true" aria-label={expanded.title} style={{position:"fixed",inset:0,zIndex:1500,padding:"calc(env(safe-area-inset-top,0px) + 12px) 12px calc(env(safe-area-inset-bottom,0px) + 12px)",background:"#171717",color:"white",display:"flex",flexDirection:"column"}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",paddingBottom:10}}><strong>{expanded.title}</strong><button type="button" onClick={()=>setExpanded(null)} style={{minHeight:44,minWidth:60,color:"#222",background:"white",borderRadius:8}}>关闭</button></div><div style={{flex:1,overflow:"auto",touchAction:"pan-x pan-y pinch-zoom"}}>{image(expanded,true)}<p>{expanded.caption}</p><p>{expanded.author} · {expanded.license}</p></div></div>}
 </section>;
}
