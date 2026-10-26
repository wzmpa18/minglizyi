'use client';
import { useEffect, useRef, useState, type ImgHTMLAttributes, type MouseEvent } from 'react';
import { retainedStudyImage,bundledStudyMedia } from '@/lib/studyMedia';
const initial=(value:string)=>bundledStudyMedia.records.some(row=>row.path===value.split('?')[0])?value:'';
type ImageState={forSrc:string;value:string;status:'loading'|'retained'|'local'|'error'};
export function StudyImage({src,onRetained,onLoad,onError,...props}:ImgHTMLAttributes<HTMLImageElement>&{src:string;onRetained?:()=>void}) {
  const [state,setState]=useState<ImageState>({forSrc:src,value:initial(src),status:'loading'}),[attempt,setAttempt]=useState(0),[nested,setNested]=useState(true);
  const host=useRef<HTMLSpanElement>(null),loaded=useRef<string|null>(null);
  const callback=useRef(onRetained),currentSource=useRef(src);callback.current=onRetained;currentSource.current=src;
  useEffect(()=>{setNested(Boolean(host.current?.closest('button,a,[role="button"]')));},[]);
  useEffect(()=>{let live=true;loaded.current=null;setState({forSrc:src,value:initial(src),status:'loading'});void retainedStudyImage(src.split('?')[0]).then(value=>{if(live&&currentSource.current===src){setState({forSrc:src,value,status:'retained'});callback.current?.();}}).catch(()=>{if(live&&currentSource.current===src)setState({forSrc:src,value:loaded.current===src?initial(src):'',status:loaded.current===src?'local':'error'});});return()=>{live=false;};},[src,attempt]);
  // The new source's first render must never flash the previous point's photo.
  const shown:ImageState=state.forSrc===src?state:{forSrc:src,value:initial(src),status:'loading'};
  const retry=(event:MouseEvent)=>{event.preventDefault();event.stopPropagation();setAttempt(value=>value+1);};
  return <span ref={host} style={{display:'block'}}>
    {shown.value?<img key={src} {...props} src={shown.value} onLoad={event=>{loaded.current=src;onLoad?.(event);}} onError={event=>{setState(current=>current.forSrc===src?{...current,value:'',status:current.status==='loading'?'loading':'error'}:current);onError?.(event);}}/>:shown.status==='error'?<span role="status" style={{display:'block',padding:'16px 8px',fontSize:12,color:'#756879'}}>{nested?<span onClick={retry}>原图暂未读取，点此重试</span>:<><span>原图暂未读取。 </span><button type="button" onClick={retry} style={{padding:'5px 8px',border:'1px solid #d9d0df',borderRadius:6,background:'white',color:'#6f397e'}}>重新读取原图</button></>}</span>:<span role="status" style={{display:'block',padding:'24px 8px',fontSize:12,color:'#827986'}}>正在读取原图…</span>}
    {shown.status==='retained'&&shown.value.startsWith('data:')&&<span style={{display:'block',fontSize:11,color:'#347546',padding:'4px 0'}}>图片已保存，可离线查看</span>}
  </span>;
}
