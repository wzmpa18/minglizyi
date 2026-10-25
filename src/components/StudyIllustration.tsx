'use client';
import {useState} from 'react';
import {StudyImage} from './StudyImage';
import {useBodyScrollLock} from '@/hooks/useBodyScrollLock';
import {usePopupBackHandler} from '@/hooks/usePopupBackHandler';
export function StudyIllustration({path,title,caption,credit}:{path:string;title:string;caption:string;credit:string}){
 const [open,setOpen]=useState(false),[zoom,setZoom]=useState(1);
 useBodyScrollLock(open);usePopupBackHandler(()=>setOpen(false),open);
 return <figure style={{margin:'10px 0'}}>
  <button type="button" aria-label={'放大'+title} onClick={()=>{setZoom(1);setOpen(true);}} style={{width:'100%',padding:6,border:'1px solid #ddd',background:'#faf9f6',borderRadius:8}}>
   <StudyImage src={path} alt={title} style={{width:'100%',height:'auto',maxHeight:260,objectFit:'contain'}}/>
   <span style={{fontSize:12}}>文献原页 · 点图放大</span>
  </button>
  <figcaption style={{fontSize:12}}>{title} · {caption}<br/>{credit}</figcaption>
  {open&&<div role="dialog" aria-modal="true" aria-label={title} style={{position:'fixed',inset:0,zIndex:1600,display:'flex',flexDirection:'column',background:'#171717',color:'white',padding:'calc(env(safe-area-inset-top,0px) + 12px) 12px calc(env(safe-area-inset-bottom,0px) + 12px)'}}>
   <div style={{display:'flex',alignItems:'center',gap:8,paddingBottom:8}}><strong style={{fontSize:13,flex:1}}>{title}</strong>
    <button aria-label="缩小文献图" disabled={zoom<=.5} onClick={()=>setZoom(v=>Math.max(.5,v-.5))} style={{minWidth:44,minHeight:44,color:'#222'}}>−</button>
    <button aria-label="放大文献图" disabled={zoom>=4} onClick={()=>setZoom(v=>Math.min(4,v+.5))} style={{minWidth:44,minHeight:44,color:'#222'}}>＋</button>
    <button onClick={()=>setOpen(false)} style={{minWidth:52,minHeight:44,color:'#222'}}>关闭</button></div>
   <div style={{flex:1,overflow:'auto',touchAction:'pan-x pan-y pinch-zoom'}}><StudyImage src={path} alt={title} style={{display:'block',width:`${zoom*100}%`,maxWidth:'none',height:'auto'}}/><p style={{fontSize:12}}>{caption}<br/>{credit}</p></div>
  </div>}
 </figure>;
}
