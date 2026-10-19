"use client";
import {useEffect,useState} from 'react';
import {ModalSurface} from './ui/ModalSurface';
import {LiveChartBoard} from './LiveChartBoard';
import type {LiveSnapshot} from '@/lib/liveCharts';
import {InterfaceButton as Button} from './InterfaceControls';
import {useInterfaceLocale} from '@/lib/interfaceLocale';
const action='rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950';
export function LiveChartViewport({chart,anchor,onAnchor,height=360,collapsed=false,onCollapsedChange}:{chart:LiveSnapshot;anchor?:string;onAnchor?:(value:string)=>void;height?:number;collapsed?:boolean;onCollapsedChange?:(value:boolean)=>void}){
 const {ui}=useInterfaceLocale(),[full,setFull]=useState(false),[zoom,setZoom]=useState(1),[mode,setMode]=useState<'sanhe'|'feixing'|'sihua'>('sanhe');
 useEffect(()=>{setZoom(1);setMode('sanhe');},[chart.version]);
 const board=<section className="bg-white text-stone-950"><div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 bg-white p-2">
  <Button className={action} onClick={()=>setZoom(z=>Math.max(.5,z-.2))}>缩小</Button><span>{Math.round(zoom*100)}%</span><Button className={action} onClick={()=>setZoom(z=>Math.min(3,z+.2))}>放大</Button><Button className={action} onClick={()=>setZoom(1)}>复位</Button>
  <Button className={action} onClick={()=>{onCollapsedChange?.(false);setFull(f=>!f);}}>{full?'退出全屏':'全屏'}</Button>{!full&&onCollapsedChange&&<Button className={action} onClick={()=>onCollapsedChange(!collapsed)}>{collapsed?'展开盘面':'折叠盘面'}</Button>}
 </div>{(!collapsed||full)&&<div className="overflow-auto" style={full?undefined:{height}}><div style={{width:`${zoom*100}%`,minWidth:260}}><LiveChartBoard chart={chart} anchor={anchor} onAnchor={onAnchor} displayMode={mode} onModeChange={setMode}/></div></div>}</section>;
 return full?<ModalSurface label={ui('授权盘面全屏')} onClose={()=>setFull(false)} locked={false} className="bg-stone-950/90"><div className="mx-auto max-w-5xl">{board}</div></ModalSurface>:<div className="rounded-xl border border-stone-300">{board}</div>;
}
