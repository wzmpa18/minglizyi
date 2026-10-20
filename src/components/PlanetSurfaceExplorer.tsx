"use client";
import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {useBodyScrollLock} from "@/hooks/useBodyScrollLock";
import surfaceData from "../../public/assets/astronomy/surfaces/manifest.json";

// Imagery is packaged locally. No third-party request or GPU work before opening.
export function PlanetSurfaceExplorer(){
 const [enabled,setEnabled]=useState(false),[body,setBody]=useState("moon"),[quality,setQuality]=useState(4096),[full,setFull]=useState(false);
 const [status,setStatus]=useState(""),[error,setError]=useState(""),[actualWidth,setActualWidth]=useState(0);
 const mount=useRef<HTMLDivElement>(null),panel=useRef<HTMLElement>(null),close=useRef<HTMLButtonElement>(null);
 const commands=useRef<{zoom:(factor:number)=>void;reset:()=>void}|null>(null);
 const entry=surfaceData.bodies.find(item=>item.id===body)||surfaceData.bodies[0];
 const requested=entry.maps.filter(map=>map.width<=quality).at(-1)||entry.maps[0];
 useBodyScrollLock(full);
 useEffect(()=>{
  if(!full)return;
  const previous=document.activeElement as HTMLElement|null;close.current?.focus();
  const keys=(event:KeyboardEvent)=>{if(event.key==="Escape"){setFull(false);return;}if(event.key!=="Tab")return;
   const items=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),select,a[href],[tabindex="0"]')||[]);
   if(!items.length)return;const first=items[0],last=items[items.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}};
  window.addEventListener("keydown",keys);return()=>{window.removeEventListener("keydown",keys);previous?.focus();};
 },[full]);
 useEffect(()=>{
  if(!enabled||!mount.current)return;
  const host=mount.current,abort=new AbortController();let alive=true,dispose=()=>{},timer:ReturnType<typeof setTimeout>|undefined;
  setError("");setActualWidth(0);setStatus("正在准备本机图像视图…");
  void(async()=>{
   const THREE=await import("three"),{OrbitControls}=await import("three/examples/jsm/controls/OrbitControls.js");
   if(!alive)return;
   const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setClearColor("#050e1c");renderer.outputColorSpace=THREE.SRGBColorSpace;
   const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,0.01,100);camera.position.set(0,0,3.2);
   const controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableDamping=false;controls.minDistance=1.08;controls.maxDistance=7;controls.saveState();
   const geometry=new THREE.SphereGeometry(1,128,64),material=new THREE.MeshBasicMaterial({color:0x737d89});
   const globe=new THREE.Mesh(geometry,material);scene.add(globe);host.replaceChildren(renderer.domElement);
   renderer.domElement.setAttribute("aria-label",entry.name+"三维图像，拖动旋转，双指或滚轮缩放");renderer.domElement.tabIndex=0;
   renderer.domElement.style.touchAction="none";renderer.domElement.style.width="100%";renderer.domElement.style.height="100%";
   const render=()=>{if(alive)renderer.render(scene,camera);};
   const resize=()=>{if(!alive)return;const r=host.getBoundingClientRect();camera.aspect=Math.max(r.width,1)/Math.max(r.height,1);camera.updateProjectionMatrix();renderer.setSize(Math.max(r.width,1),Math.max(r.height,1),false);render();};
   const observer=new ResizeObserver(resize);observer.observe(host);controls.addEventListener("change",render);
   const zoom=(factor:number)=>{const distance=camera.position.length(),next=Math.max(controls.minDistance,Math.min(controls.maxDistance,distance*factor));camera.position.multiplyScalar(next/distance);controls.update();render();};
   commands.current={zoom,reset:()=>{controls.reset();render();}};
   const keyboard=(event:KeyboardEvent)=>{if(["+","=","-","Home"].includes(event.key)){event.preventDefault();if(event.key==="Home")commands.current?.reset();else zoom(event.key==="-"?1.2:0.8);}};
   const contextLost=(event:Event)=>{event.preventDefault();if(alive){setError("本机图形资源暂不可用，请关闭视图后重试或查看平面图。");setStatus("");}};
   renderer.domElement.addEventListener("keydown",keyboard);renderer.domElement.addEventListener("webglcontextlost",contextLost);
   let texture:InstanceType<typeof THREE.Texture>|null=null,objectUrl="";let image:HTMLImageElement|null=null;
   dispose=()=>{commands.current=null;observer.disconnect();controls.removeEventListener("change",render);controls.dispose();renderer.domElement.removeEventListener("keydown",keyboard);renderer.domElement.removeEventListener("webglcontextlost",contextLost);if(image){image.onload=null;image.onerror=null;image.src="";}if(objectUrl)URL.revokeObjectURL(objectUrl);texture?.dispose();geometry.dispose();material.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
   resize();
   const available=entry.maps.filter(map=>map.width<=Math.min(quality,renderer.capabilities.maxTextureSize));
   if(!available.length)throw Error("本机图形能力不足，请查看平面图。");
   const asset=available[available.length-1];setStatus("正在加载"+entry.name+" "+asset.width+"像素图像（"+(asset.bytes/1048576).toFixed(1)+" MB）…");
   timer=setTimeout(()=>abort.abort(),30000);
   const response=await fetch(asset.url,{signal:abort.signal});if(!response.ok)throw Error("图像暂未加载成功，可重试或查看平面图。");
   const blob=await response.blob();if(!alive)return;objectUrl=URL.createObjectURL(blob);
   image=await new Promise<HTMLImageElement>((resolve,reject)=>{const target=new Image();image=target;target.onload=()=>resolve(target);target.onerror=()=>reject(Error("图像解码失败，请切换清晰度。"));target.src=objectUrl;});
   if(!alive)return;
   texture=new THREE.Texture(image);texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;
   material.map=texture;material.color.set(0xffffff);material.needsUpdate=true;render();setActualWidth(asset.width);
   setStatus(asset.width<quality?"按素材及设备能力使用"+asset.width+"像素图像；可继续旋转和缩放。":"图像已加载。拖动旋转，双指或滚轮缩放。");
  })().catch(cause=>{if(alive){setError(abort.signal.aborted?"图像加载超时，请检查网络或降低清晰度后重试。":cause instanceof Error?cause.message:"本机暂不能打开三维视图。");setStatus("");}}).finally(()=>{if(timer)clearTimeout(timer);});
  return()=>{alive=false;abort.abort();if(timer)clearTimeout(timer);dispose();};
 },[enabled,body,quality,full,entry.name,entry.maps]);
 const content=<section ref={panel} id="planet-surfaces" role={full?"dialog":undefined} aria-modal={full||undefined} aria-label="高清天体图像研习" className={full?"fixed inset-0 z-[200] overflow-y-auto bg-[#071322] px-4 pb-6 text-[#e6edf5]":"mt-4 rounded-2xl border border-[#355265] bg-[#0b1e30] p-4 text-[#e6edf5]"} style={full?{paddingTop:"calc(env(safe-area-inset-top, 0px) + 20px)",paddingBottom:"calc(env(safe-area-inset-bottom, 0px) + 24px)"}:undefined}>
  <div className="mx-auto max-w-5xl"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">高清天体图像研习</h2><p className="mt-2 text-xs leading-6 text-[#adc5d8]">从整颗天体放大到表面细节。保留原有星空、轨道、时间地点与五运六气学习。</p></div>{full&&<button ref={close} type="button" onClick={()=>setFull(false)} className="shrink-0 rounded-lg border border-[#8bb8d1] px-4 py-3 text-sm">退出全屏</button>}</div>
  <div className="mt-3 flex flex-wrap gap-3"><label className="text-xs">观察对象<select className="ml-2 rounded-lg border border-[#50748c] bg-[#10283d] p-2 text-white" value={body} onChange={e=>{const next=surfaceData.bodies.find(item=>item.id===e.target.value);setBody(e.target.value);if(next)setQuality(old=>Math.min(old,Math.max(...next.maps.map(map=>map.width))));}}>{surfaceData.bodies.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-xs">图像清晰度<select className="ml-2 rounded-lg border border-[#50748c] bg-[#10283d] p-2 text-white" value={quality} onChange={e=>setQuality(Number(e.target.value))}><option value={2048}>2K · 节省资源</option><option value={4096}>4K · 高清</option><option value={8192} disabled={!entry.maps.some(map=>map.width===8192)}>8K · {entry.maps.some(map=>map.width===8192)?"按需加载":"本素材未提供"}</option></select></label></div>
  <p className="mt-2 text-xs text-[#b6ccdf]">本次选图约{(requested.bytes/1048576).toFixed(1)} MB；点击打开后才加载。8K较占内存，设备不支持时自动降级。</p>
  {!enabled?<button type="button" onClick={()=>setEnabled(true)} className="mt-4 rounded-xl bg-[#a4ddda] px-5 py-3 text-sm font-bold text-[#102d3c]">打开高清天体视图</button>:<><div className="mt-3 flex flex-wrap gap-2">{[["放大",()=>commands.current?.zoom(0.8)],["缩小",()=>commands.current?.zoom(1.2)],["复位",()=>commands.current?.reset()],[full?"退出全屏":"全屏查看",()=>setFull(value=>!value)],["关闭图像",()=>{setEnabled(false);setFull(false);}]].map(([label,action])=><button key={String(label)} type="button" className="rounded-lg border border-[#698da8] px-3 py-2 text-sm" onClick={action as ()=>void}>{label as string}</button>)}</div><div ref={mount} className="mt-3 overflow-hidden rounded-xl bg-[#050e1c]" style={{height:full?"min(64dvh,680px)":"350px"}}/>{status&&<p role="status" className="mt-2 text-xs leading-6 text-[#b9dfed]">{status}{actualWidth>0&&` 当前实际图像：${actualWidth}×${actualWidth/2}。`}</p>}{error&&<p role="alert" className="mt-2 rounded-lg bg-[#3b2535] p-3 text-sm text-[#ffd5d9]">{error}</p>}</>}
  <p className="mt-3 text-xs leading-6 text-[#bfd1df]">这是均匀照明的球面贴图阅读，不是此刻的月相、实时望远镜画面或地形测量。{entry.note}</p>
  <p className="mt-2 text-[11px] leading-6 text-[#a7bdd0]">来源：{entry.credit} · <a className="underline" href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">素材出处</a> · <a className="underline" href={entry.licenseUrl} target="_blank" rel="noopener noreferrer">{entry.license}</a>。本地衍生为JPEG及2K/4K缩小版，未用AI补绘。</p>
  <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#b7e7e1]"><a className="underline" href={requested.url} target="_blank" rel="noopener noreferrer">打开本张平面图</a><a className="underline" href="https://quickmap.lroc.asu.edu/" target="_blank" rel="noopener noreferrer">LROC月球原始影像研究</a><a className="underline" href="https://worldwidetelescope.org/webclient/" target="_blank" rel="noopener noreferrer">WorldWide Telescope扩展观测</a></div><p className="mt-2 text-[11px] text-[#98b1c8]">外部研究工具仅点击后打开，可能有独立数据许可与网络要求。</p></div>
 </section>;
 return full&&typeof document!=="undefined"?createPortal(content,document.body):content;
}
