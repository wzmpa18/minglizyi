'use client';
import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import { retainedStudyImage } from '@/lib/studyMedia';
export function StudyImage({src,onRetained,...props}:ImgHTMLAttributes<HTMLImageElement>&{src:string;onRetained?:()=>void}) {
  const [resolved,setResolved]=useState(src);
  const callback=useRef(onRetained);callback.current=onRetained;
  useEffect(()=>{let live=true;setResolved(src);void retainedStudyImage(src.split('?')[0]).then(value=>{if(live){setResolved(value);callback.current?.();}}).catch(()=>{});return()=>{live=false;};},[src]);
  return <><img {...props} src={resolved}/>{resolved.startsWith('data:')&&<span style={{display:'block',fontSize:11,color:'#347546',padding:'4px 0'}}>图片已保存，可离线查看</span>}</>;
}
