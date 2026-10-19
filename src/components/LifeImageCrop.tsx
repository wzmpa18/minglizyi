"use client";
import {ModalSurface} from "./ui/ModalSurface";
import {useEffect,useRef,useState} from 'react';
import {useInterfaceLocale} from '@/lib/interfaceLocale';
import type {LifeAttachment} from '@/lib/lifeRecords';
import {InterfaceButton as Button,InterfaceLabel as Label} from './InterfaceControls';
const action='rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 disabled:opacity-40';
export function LifeImageCrop({source,blob,onCancel,onSave}:{source:LifeAttachment;blob:Blob;onCancel:()=>void;onSave:(file:File,box:[number,number,number,number])=>Promise<void>}){
 const {ui}=useInterfaceLocale();
 const [url,setUrl]=useState(''),[size,setSize]=useState<{width:number;height:number}|null>(null),[box,setBox]=useState<[number,number,number,number]>([0,0,100,100]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const image=useRef<HTMLImageElement|null>(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;const next=URL.createObjectURL(blob);setUrl(next);return()=>{mounted.current=false;URL.revokeObjectURL(next);};},[blob]);
 async function save(){
  setBusy(true);setError('');try{
   if(!image.current||!size)throw Error('原图尚未完整加载');
   const [x,y,w,h]=box;if(x<0||y<0||w<=0||h<=0||x+w>100||y+h>100)throw Error('裁剪范围需在原图内，宽高不能为零');
   const pixels:[number,number,number,number]=[Math.floor(size.width*x/100),Math.floor(size.height*y/100),Math.max(1,Math.floor(size.width*w/100)),Math.max(1,Math.floor(size.height*h/100))];
   if(pixels[2]*pixels[3]>16000000)throw Error('本次裁剪副本超过1600万像素，请缩小范围；原图不变');
   const canvas=document.createElement('canvas');canvas.width=pixels[2];canvas.height=pixels[3];const context=canvas.getContext('2d');if(!context)throw Error('此设备不能建立本机裁剪画布');
   context.drawImage(image.current,...pixels,0,0,pixels[2],pixels[3]);
   const result=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('本机裁剪未完成，原图保留')),'image/png'));canvas.width=canvas.height=0;
   if(!mounted.current)return;
   await onSave(new File([result],source.name.replace(/\.[^.]+$/,'')+'_裁剪副本.png',{type:'image/png'}),box.map(n=>n/100) as [number,number,number,number]);
  }catch(e){if(mounted.current)setError(e instanceof Error?e.message:'裁剪未完成，原图保留');}finally{if(mounted.current)setBusy(false);}
 }
 return <ModalSurface label="裁剪独立副本" onClose={onCancel} locked={busy} className="bg-stone-950 text-white"><div className="mx-auto max-w-3xl space-y-4">
  <h2 className="text-lg font-semibold">{ui('裁剪独立副本')}</h2><p className="text-sm leading-6">只在本机处理，保留原图与原识字结果；新副本有独立指纹和来源，需重新识字核对。裁剪不等于完整脱敏，保存后请检查边缘文字。</p>
  <div className="relative mx-auto w-full max-w-2xl">{url&&<img ref={image} src={url} alt="本人选择的本机裁剪原图" className="h-auto w-full" onLoad={e=>{setSize({width:e.currentTarget.naturalWidth,height:e.currentTarget.naturalHeight});}} onError={()=>setError('原图解码失败，未生成副本')}/>}<div aria-hidden="true" className="pointer-events-none absolute border-2 border-red-500 bg-white/10" style={{left:box[0]+'%',top:box[1]+'%',width:box[2]+'%',height:box[3]+'%'}}/></div>
  <div className="grid grid-cols-2 gap-3">{['左侧起点','上侧起点','宽度','高度'].map((label,i)=><Label className="block text-sm" key={label}>{ui(label)}（%）<input type="number" min={i<2?0:1} max={100} value={box[i]} disabled={busy} className="mt-1 w-full rounded-lg bg-white p-3 text-base text-stone-950" onChange={e=>setBox(old=>old.map((v,j)=>i===j?Number(e.target.value):v) as [number,number,number,number])}/></Label>)}</div>
  <p className="text-xs">{size?`原图${size.width} × ${size.height}像素`:'正在加载原图'} · PNG副本可能比压缩原图更大</p>{error&&<p role="alert" className="rounded-lg bg-red-100 p-3 text-red-950">{error}</p>}
  <div className="flex flex-wrap gap-3"><Button className={action} disabled={busy||!size} onClick={()=>void save()}>{busy?'正在本机保存…':'保存独立裁剪副本'}</Button><Button className={action} disabled={busy} onClick={onCancel}>取消</Button></div>
 </div></ModalSurface>;
}
