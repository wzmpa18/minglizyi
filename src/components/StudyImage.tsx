'use client';
import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import { retainedStudyImage } from '@/lib/studyMedia';
export function StudyImage({src,onRetained,...props}:ImgHTMLAttributes<HTMLImageElement>&{src:string;onRetained?:()=>void}) {
  const initial=(value:string)=>/\/(?:atlas-lan-|dong-wm-)/.test(value)?'':value;
  const [resolved,setResolved]=useState(initial(src));
  const callback=useRef(onRetained);callback.current=onRetained;
  useEffect(()=>{let live=true;setResolved(initial(src));void retainedStudyImage(src.split('?')[0]).then(value=>{if(live){setResolved(value);callback.current?.();}}).catch(()=>{});return()=>{live=false;};},[src]);
  return <><img {...props} src={resolved||undefined}/>{resolved.startsWith('data:')&&<span style={{display:'block',fontSize:11,color:'#347546',padding:'4px 0'}}>图片已保存，可离线查看</span>}</>;
}
