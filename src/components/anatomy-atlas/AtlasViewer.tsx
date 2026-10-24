"use client";
import {useEffect,useState,useRef} from "react";
import Link from "next/link";
import {useBodyScrollLock} from "@/hooks/useBodyScrollLock";
import {usePopupBackHandler} from "@/hooks/usePopupBackHandler";
import AtlasScene,{type ViewState} from "./AtlasScene";
import {openAtlas,installAtlas,chineseName,selectionParts,SYSTEMS,type Dataset} from "./atlasPack";
const INITIAL:ViewState={visible:["integumentary"],hidden:[],selected:null,isolate:false,opacity:1,view:"front",reset:0,points:true,meridian:"",point:null,side:1,section:null,explode:0};
export default function AtlasViewer({previewData}:{previewData?:Dataset}){
 const [data,setData]=useState<Dataset|null>(previewData||null),[state,setState]=useState(INITIAL),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[query,setQuery]=useState(""),[tab,setTab]=useState("layers"),[ready,setReady]=useState(false);
 useEffect(()=>{if(previewData)return;let live=true;openAtlas().then(d=>{if(live)setData(d);}).catch(e=>{if(live)setMessage(e.message);});return()=>{live=false;};},[previewData]);
 const [drawer,setDrawer]=useState(false),[immersive,setImmersive]=useState(false);const drawerRef=useRef<HTMLDivElement>(null);
 useBodyScrollLock(drawer||immersive);
 usePopupBackHandler(()=>{setDrawer(false);setImmersive(false);},drawer||immersive);
 useEffect(()=>{if(!drawer)return;const previous=document.activeElement as HTMLElement|null;drawerRef.current?.focus();return()=>{previous?.focus?.();};},[drawer]);
 useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){if(drawer)setDrawer(false);else setImmersive(false);}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[drawer]);
 const change=(patch:Partial<ViewState>)=>setState(s=>({...s,...patch}));
 async function install(){setBusy(true);setMessage("正在检查图谱版本…");try{await installAtlas((n,total)=>setMessage(`正在下载 ${Math.round(n/total*100)}%`));const next=await openAtlas();setReady(false);setData(next);setMessage("资源已校验并启用；可断网再次打开。");}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 const selectedParts=data?selectionParts(data.atlas,state.selected):[];
 const selectedConcept=data?.atlas.concepts.find(c=>c.id===state.selected);
 const firstPart=selectedParts[0];const part=firstPart?{...firstPart,id:state.selected!,conceptId:selectedConcept?.id||firstPart.conceptId,name:selectedConcept?.name||firstPart.name}:undefined,point=data?.points.find(p=>p.code===state.point);
 const results=data?[...data.atlas.parts,...data.atlas.concepts.filter(c=>c.elements.length>1).map(c=>({...data.atlas.parts.find(p=>c.elements.includes(p.id))!,id:c.id,name:c.name,conceptId:c.id}))].filter(p=>`${p.name} ${p.id} ${p.conceptId} ${chineseName(p)}`.toLowerCase().includes(query.toLowerCase())):[];
 const points=data?.points.filter(p=>(!state.meridian||p.meridianId===state.meridian)&&`${p.name} ${p.code} ${p.pinyin}`.toLowerCase().includes(query.toLowerCase()))||[];
 const selectStructure=(id:string)=>{if(!data)return;const selected=selectionParts(data.atlas,id);const ids=new Set(selected.map(p=>p.id));change({selected:id,point:null,visible:Array.from(new Set([...state.visible,...selected.map(p=>p.system)])),hidden:state.hidden.filter(id=>!ids.has(id)),isolate:true,reset:state.reset+1,opacity:1,section:null,explode:0});setDrawer(false);setImmersive(true);};
 const selectPoint=(code:string,side:1|-1=1)=>{change({point:code,side,selected:null,isolate:false,points:true,explode:0,section:null});setDrawer(false);setImmersive(true);};
 const button="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm disabled:opacity-40";
 return <section className="mx-auto max-w-7xl p-3 text-stone-800" style={immersive?{position:"fixed",inset:0,zIndex:100000,padding:0,maxWidth:"none",background:"#f7f4ef"}:undefined}>
  <div className="mb-3 flex flex-wrap items-center justify-between gap-2" style={immersive?{display:"none"}:undefined}><div><h2 className="text-xl font-semibold">三维解剖与经络图谱</h2><p className="text-xs text-stone-600">成人男性参考体 · 分层观察 · 穴位学习示意</p></div><button className={button} disabled={busy} onClick={()=>void install()}>{busy?"处理中…":data?"检查资源更新":"下载图谱资源"}</button></div>
  {message&&!immersive&&<p role="status" className="mb-3 rounded-lg bg-purple-50 p-3 text-sm">{message}</p>}
  {!data?<div className="rounded-xl border bg-stone-50 p-8"><p>首次使用需下载图谱数据，校验后保存在本机。原有四层图谱仍保留在下方切换入口。</p><p className="mt-3 text-sm">资源包含15个系统、2234个来源网格；实际显示会隐藏独立毛发并简化体表私密区域。模型不代表所有性别、年龄与解剖变异。</p></div>:<>
   <div className="relative">
    <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-[#f7f4ef]" style={{height:immersive?"100dvh":"min(78dvh,900px)",minHeight:390}}>
     <div className="absolute left-3 right-3 z-10 flex flex-wrap gap-2" style={{top:"calc(env(safe-area-inset-top, 0px) + 12px)"}}>
      <button className={button} aria-expanded={drawer} aria-controls="atlas-tools" onClick={()=>{setTab("layers");setDrawer(true);}}>图谱工具</button>
      <button className={button} onClick={()=>{setState({...INITIAL,reset:state.reset+1});setDrawer(false);}}>恢复全身</button>
      <button className={button} aria-pressed={immersive} onClick={()=>{setImmersive(!immersive);setDrawer(false);}}>{immersive?"退出全屏":"全屏观察"}</button>
      {(part||point)&&<button className={button} onClick={()=>{setTab("details");setDrawer(true);}}>部位说明</button>}
     </div>
     <AtlasScene data={data} state={state} onSelect={selectStructure} onPoint={selectPoint} onReady={()=>setReady(true)} onError={setMessage}/>
     {!ready&&<p className="absolute left-3 top-3 rounded bg-white/90 p-2 text-sm">正在准备三维结构…</p>}
     <p className="pointer-events-none absolute left-3 rounded bg-white/90 p-2 text-xs" style={{bottom:"calc(env(safe-area-inset-bottom, 0px) + 12px)"}}>拖动旋转 · 双指缩放 · 点选结构<br/>穴位坐标待专业核校，不用于临床取穴</p>
    </div>
    {drawer&&<div className="fixed inset-0" style={{zIndex:100001}}>
     <button className="absolute inset-0 bg-black/30" aria-label="收起图谱工具" onClick={()=>setDrawer(false)}/>
     <div id="atlas-tools" ref={drawerRef} role="dialog" aria-modal="true" aria-label="图谱工具与部位说明" tabIndex={-1} onKeyDown={e=>{if(e.key!=="Tab")return;const nodes=drawerRef.current?.querySelectorAll<HTMLElement>('button,a[href],input,select,[tabindex="0"]');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===drawerRef.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}} className="absolute bottom-0 right-0 w-full overflow-auto rounded-t-2xl border bg-white p-4 shadow-xl sm:bottom-3 sm:right-3 sm:w-[360px] sm:rounded-2xl" style={{maxHeight:"min(82dvh,900px)",paddingBottom:"calc(env(safe-area-inset-bottom, 0px) + 16px)"}}>
      <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">图谱工具与说明</h3><button className={button} onClick={()=>setDrawer(false)}>收起</button></div>
      <div className="mb-3 flex flex-wrap gap-2">{[["front","正面"],["back","背面"],["side","侧面"]].map(([view,label])=><button key={view} className={button} aria-pressed={state.view===view} onClick={()=>{change({view,reset:state.reset+1});setDrawer(false);}}>{label}</button>)}<button className={button} onClick={()=>{change({visible:SYSTEMS.filter(s=>s[0]!=="integumentary").map(s=>s[0]),hidden:[],isolate:false,points:false});setDrawer(false);}}>内部结构</button><button className={button} onClick={()=>change({hidden:[],isolate:false})}>恢复隐藏结构</button></div>
     <div className="mb-3 flex gap-2">{[["layers","图层"],["parts","结构"],["points","穴位"],...((part||point)?[["details","说明"]]:[])].map(([id,label])=><button key={id} className={button} aria-pressed={tab===id} onClick={()=>{setTab(id);setQuery("");}}>{label}</button>)}</div>
     {tab==="details"?null:tab==="layers"?<><div className="grid grid-cols-2 gap-2">{SYSTEMS.map(([id,name,color])=>{const count=data.atlas.parts.filter(p=>p.system===id).length;return <label key={id} className="flex items-center gap-2 rounded border p-2 text-sm"><input type="checkbox" checked={state.visible.includes(id)} onChange={()=>change({visible:state.visible.includes(id)?state.visible.filter(v=>v!==id):[...state.visible,id],isolate:false})}/><span style={{color}} aria-hidden>●</span>{name}<small>{count}</small></label>;})}</div>
      <label className="mt-4 block text-sm">整体透明度 {Math.round(state.opacity*100)}%<input className="w-full" type="range" min="0.15" max="1" step="0.05" value={state.opacity} onChange={e=>change({opacity:Number(e.target.value)})}/></label>
      <label className="mt-4 block text-sm"><input type="checkbox" checked={state.section!==null} onChange={e=>change({section:e.target.checked?1:null})}/> 水平观察截面</label>{state.section!==null&&<input aria-label="截面高度" className="w-full" type="range" min="0" max="1.7" step="0.01" value={state.section} onChange={e=>change({section:Number(e.target.value)})}/>}
      <label className="mt-4 block text-sm">按系统展开<input className="w-full" type="range" min="0" max="1" step="0.1" value={state.explode} onChange={e=>change({explode:Number(e.target.value),points:false})}/></label><p className="text-xs text-stone-500">展开和截面用于空间观察；切面不补造组织内部纹理。</p>
     </>:<><input className="mb-3 w-full rounded border p-2" value={query} onChange={e=>setQuery(e.target.value)} placeholder={tab==="points"?"穴名、拼音、编号":"英文名、中文已校对词、FMA编号"} aria-label="搜索图谱"/>
      {tab==="parts"?<><p className="mb-2 text-xs">{results.length} 个来源结构。未校对中文名保留英文原名。</p>{results.slice(0,120).map(p=><button key={p.id} className="mb-1 block w-full rounded border p-2 text-left text-sm" onClick={()=>selectStructure(p.id)}>{chineseName(p)}<small className="block text-stone-600">{p.name} · {p.id}</small></button>)}{results.length>120&&<p>请缩小搜索范围以查看其余结构。</p>}</>:<><label className="mb-2 block text-sm"><input type="checkbox" checked={state.points} onChange={e=>change({points:e.target.checked,explode:0})}/> 显示穴位和分段经脉示意</label><select className="mb-2 w-full rounded border p-2" aria-label="筛选经脉" value={state.meridian} onChange={e=>change({meridian:e.target.value})}><option value="">全部十四经脉</option>{Array.from(new Map(data.points.map(p=>[p.meridianId,p.meridian]))).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select>{points.map(p=><button key={p.code} className="mb-1 block w-full rounded border p-2 text-left text-sm" onClick={()=>selectPoint(p.code)}>{p.name} · {p.code}<small className="block">{p.meridian}{p.surfaceUnavailable?" · 仅目录，不放置体表点":""}</small></button>)}</>}
     </>}
   {part&&<article className="mt-3 rounded-xl border bg-white p-4"><h3 className="font-semibold">{chineseName(part)} · {part.name}</h3><p className="my-2 text-sm">{SYSTEMS.find(s=>s[0]===part.system)?.[3]}</p><p className="text-xs text-stone-500">{part.id} · {part.conceptId} · BodyParts3D 4.0 · 系统学习概述；未覆盖每个结构的专篇解释。</p><div className="mt-3 flex flex-wrap gap-2"><button className={button} onClick={()=>{change({isolate:!state.isolate,reset:state.reset+1});setDrawer(false);}}>{state.isolate?"退出隔离":"隔离此结构"}</button><button className={button} onClick={()=>change({hidden:[...state.hidden,...selectedParts.map(p=>p.id)],selected:null,isolate:false})}>隐藏此结构</button><Link className={button} href="/zhongyi/exam/">进入现有学习题库</Link></div></article>}
   {point&&<article className="mt-3 rounded-xl border bg-white p-4"><h3 className="font-semibold">{point.name} · {point.code} · {point.meridian}</h3><p className="my-2 text-sm">工程学习示意，未逐穴专业核校。{point.positionProvenance}</p><div className="flex flex-wrap gap-2">{!point.midline&&<button className={button} onClick={()=>change({side:state.side===1?-1:1})}>{state.side===1?"当前左侧，切换右侧":"当前右侧，切换左侧"}</button>}<Link className={button} href={`/zhongyi/meridian/?acupoint=${encodeURIComponent(point.name)}`}>穴位详情与学习交流</Link><Link className={button} href="/zhongyi/exam/">现有练习题库</Link></div></article>}
   <p className="mt-3 text-xs text-stone-600">资源 {data.version} · {data.atlas.parts.length} 来源网格 · {data.points.length}穴名（含印堂）；与WHO361穴目录口径不同，不代表新增362处已核校点位。</p>
     </div>
    </div>}
   </div>
  </>}
  <Link style={immersive?{display:"none"}:undefined} href="/open-source/" className="mt-4 inline-block text-sm text-purple-800 underline">模型来源、修改记录与开源许可</Link>
 </section>;
}
