"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {MakeTime,Body,EquatorFromVector,HelioVector,Horizon,Observer,RotateVector,Rotation_EQJ_ECL,Rotation_EQJ_EQD,Vector} from "astronomy-engine";
import {projectSky,projectSpace} from "@/lib/planetariumProjection";
import {useBodyScrollLock} from "@/hooks/useBodyScrollLock";
type Star={id:number;hip:number|null;name:string;ra:number;dec:number;mag:number;distancePc:number|null};
type Catalogue={stars:Star[];sourceUrl:string;author:string;license:string;licenseUrl:string};
const planets=[Body.Mercury,Body.Venus,Body.Earth,Body.Mars,Body.Jupiter,Body.Saturn,Body.Uranus,Body.Neptune];
const labels=["水星","金星","地球","火星","木星","土星","天王星","海王星"];
const colors=["#d3c7ac","#f8d38d","#72bdff","#ff9b79","#e2c199","#e8d6a6","#77e0e4","#7a9dff"];
const RAD=Math.PI/180;
export function InteractivePlanetarium({date,latitude,longitude,bodies}:{date:Date;latitude:number;longitude:number;bodies:{name:string;altitude:number;azimuth:number}[]}){
 const [catalogue,setCatalogue]=useState<Catalogue|null>(null),[error,setError]=useState("");
 const [mode,setMode]=useState<"sky"|"solar"|"stellar">("sky"),[yaw,setYaw]=useState(180),[pitch,setPitch]=useState(35),[fov,setFov]=useState(100),[radius,setRadius]=useState(40),[full,setFull]=useState(false),[query,setQuery]=useState("");
 const [selected,setSelected]=useState(""),[showLabels,setShowLabels]=useState(true),[showGrid,setShowGrid]=useState(true),[visible,setVisible]=useState(0);
 const canvas=useRef<HTMLCanvasElement>(null),hits=useRef<{x:number;y:number;text:string}[]>([]),pointers=useRef(new Map<number,{x:number;y:number}>()),last=useRef<{x:number;y:number;distance:number;dragged:boolean}|null>(null);
 useBodyScrollLock(full);
 useEffect(()=>{const abort=new AbortController();fetch("/assets/astronomy/bright-stars.json",{signal:abort.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{if(!Array.isArray(d.stars)||d.stars.length<5000)throw Error();setCatalogue(d);}).catch(e=>{if(e.name!=="AbortError")setError("恒星目录暂未读到，可继续使用日月行星视图");});return()=>abort.abort();},[]);
 useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==="Escape")setFull(false);};window.addEventListener("keydown",escape);return()=>window.removeEventListener("keydown",escape);},[]);
 const dateValue=date.getTime();
 const stars=useMemo(()=>{
  if(!catalogue)return[];
  const observer=new Observer(latitude,longitude,0),rotation=Rotation_EQJ_EQD(date);
  return catalogue.stars.map(s=>{const a=s.ra*15*RAD,d=s.dec*RAD,x=Math.cos(d)*Math.cos(a),y=Math.cos(d)*Math.sin(a),z=Math.sin(d),eq=EquatorFromVector(RotateVector(rotation,new Vector(x,y,z,MakeTime(date)))),hor=Horizon(date,observer,eq.ra,eq.dec,"normal");return {...s,azimuth:hor.azimuth,altitude:hor.altitude,x,y,z};});
 // Star directions include precession; proper motion is not extrapolated.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[catalogue,dateValue,latitude,longitude]);
 const solar=useMemo(()=>planets.map((b,i)=>{const v=RotateVector(Rotation_EQJ_ECL(),HelioVector(b,date));return {x:v.x,y:v.y,z:v.z,name:labels[i],color:colors[i]};}),[dateValue]); // eslint-disable-line react-hooks/exhaustive-deps
 const search=()=>{const s=stars.find(s=>s.name.toLowerCase().includes(query.trim().toLowerCase())||String(s.hip)===query.trim());if(!s||!query.trim()){setSelected("未找到恒星，请输入英文常用名或HIP编号，例如Sirius、32349。");return;}setMode("sky");setYaw(s.azimuth);setPitch(s.altitude);setFov(30);setSelected(`${s.name} · HIP ${s.hip||"—"} · 视星等${s.mag} · 方位${s.azimuth.toFixed(2)}° 高度${s.altitude.toFixed(2)}°`);};
 const reset=()=>{setYaw(180);setPitch(35);setFov(100);setRadius(mode==="stellar"?100:40);};
 useEffect(()=>{
  const element=canvas.current;if(!element)return;const parent=element.parentElement;if(!parent)return;
  const render=()=>{const w=parent.clientWidth,h=parent.clientHeight,dpr=Math.min(2,window.devicePixelRatio||1);element.width=w*dpr;element.height=h*dpr;const ctx=element.getContext("2d");if(!ctx)return;ctx.scale(dpr,dpr);ctx.fillStyle="#050c1b";ctx.fillRect(0,0,w,h);hits.current=[];let count=0;const labelBoxes:{x:number;y:number;w:number;h:number}[]=[];
   const map=(az:number,alt:number)=>{const p=projectSky(az,alt,yaw,pitch,fov);return p?{x:w/2+p.x*h/2,y:h/2+p.y*h/2}:null;};
   const point=(x:number,y:number,size:number,color:string,text:string,label=false)=>{if(x<0||x>w||y<0||y>h)return;ctx.beginPath();ctx.arc(x,y,size,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();count++;if(size>1.1)hits.current.push({x,y,text});if(label&&showLabels){ctx.font="12px sans-serif";const name=text.split(" · ")[0],tw=ctx.measureText(name).width;for(const [dx,dy] of [[7,-7],[7,17],[-tw-7,-7],[-tw-7,17],[7,-24],[7,34]]){const box={x:x+dx-2,y:y+dy-12,w:tw+4,h:15};if(box.x<2||box.x+box.w>w-2||box.y<2||box.y+box.h>h-28||labelBoxes.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y))continue;labelBoxes.push(box);ctx.strokeStyle=color;ctx.globalAlpha=.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx+(dx<0?tw:0),y+dy-4);ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle=color;ctx.fillText(name,x+dx,y+dy);break;}}};
   if(mode==="sky"){
    if(showGrid){ctx.strokeStyle="#1d3852";ctx.lineWidth=.6;for(let alt=-60;alt<=60;alt+=30){ctx.beginPath();let connected=false;for(let az=0;az<=360;az+=2){const p=map(az,alt);if(!p||Math.abs(p.x)>w*3||Math.abs(p.y)>h*3){connected=false;continue;}if(connected)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);connected=true;}ctx.stroke();}for(let az=0;az<360;az+=30){ctx.beginPath();let connected=false;for(let alt=-89;alt<90;alt+=2){const p=map(az,alt);if(!p||Math.abs(p.x)>w*3||Math.abs(p.y)>h*3){connected=false;continue;}if(connected)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);connected=true;}ctx.stroke();}}
    for(const s of stars){const p=map(s.azimuth,s.altitude);if(p)point(p.x,p.y,Math.max(.45,2.5-s.mag*.34),s.altitude>=0?"#e6eefb":"#6b778e",`${s.name} · 视星等${s.mag} · 方位${s.azimuth.toFixed(2)}° 高度${s.altitude.toFixed(2)}°`,s.mag<1.5);}
    for(const body of bodies){const p=map(body.azimuth,body.altitude);if(p)point(p.x,p.y,4,"#ffd484",`${body.name} · 方位${body.azimuth.toFixed(2)}° 高度${body.altitude.toFixed(2)}°`,true);}
    for(const [az,name]of [[0,"北"],[90,"东"],[180,"南"],[270,"西"]] as const){const p=map(az,0);if(p){ctx.fillStyle="#9fc8b2";ctx.font="bold 15px sans-serif";ctx.fillText(name,p.x,p.y);}}
   }else{
    const r=radius;if(showGrid){ctx.strokeStyle="#20374d";ctx.lineWidth=.8;for(const frac of [.25,.5,1]){ctx.beginPath();for(let n=0;n<=180;n++){const a=n*Math.PI/90,p=projectSpace(r*frac*Math.cos(a),r*frac*Math.sin(a),0,yaw,pitch,r),x=w/2+p.x*h*.44,y=h/2+p.y*h*.44;if(n===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}}
    point(w/2,h/2,5,"#ffdf83","太阳",true);
    if(mode==="solar")for(const p of solar){const v=projectSpace(p.x,p.y,p.z,yaw,pitch,r);point(w/2+v.x*h*.44,h/2+v.y*h*.44,4,p.color,`${p.name} · 距太阳${Math.hypot(p.x,p.y,p.z).toFixed(3)} AU`,true);}
    else for(const s of stars){if(!s.distancePc||s.distancePc>=100000)continue;const distance=s.distancePc*3.26156;if(distance>r*2)continue;const v=projectSpace(s.x*distance,s.y*distance,s.z*distance,yaw,pitch,r);point(w/2+v.x*h*.44,h/2+v.y*h*.44,Math.max(.7,2.5-s.mag*.25),"#c2ddff",`${s.name} · 距太阳约${distance.toFixed(2)}光年`,s.mag<1.5);}
   }
   ctx.font="12px sans-serif";ctx.fillStyle="#c0d0df";ctx.fillText(mode==="sky"?`朝向 ${yaw.toFixed(0)}° / 仰角 ${pitch.toFixed(0)}° · 视野 ${fov.toFixed(0)}°`:`${mode==="solar"?"日心黄道坐标":"日心J2000赤道坐标"} · 参照半径 ${radius.toFixed(1)}${mode==="solar"?"AU":"光年"}`,10,h-13);setVisible(count);
  };render();const ro=new ResizeObserver(render);ro.observe(parent);return()=>ro.disconnect();
 },[stars,solar,bodies,mode,yaw,pitch,fov,radius,showLabels,showGrid,full]);
 const page=<section data-local-zoom="true" aria-label="交互天文馆" className={full?"fixed inset-0 z-[20000] bg-[#071120] text-white flex flex-col":"mt-5 rounded-2xl border border-[#34506b] bg-[#071120] text-white overflow-hidden"} style={full?{paddingTop:"calc(env(safe-area-inset-top, 0px) + 18px)",paddingBottom:"env(safe-area-inset-bottom, 0px)"}:undefined}>
 <div className="p-3"><div className="flex justify-between items-center"><h2 className="font-bold">星空与空间探索</h2><button onClick={()=>setFull(v=>!v)} className="border rounded px-3 py-2">{full?"退出全屏":"全屏探索"}</button></div><div className="flex gap-2 flex-wrap mt-3">{([["sky","全天星空"],["solar","太阳系"],["stellar","近邻恒星空间"]] as const).map(([id,name])=><button aria-pressed={mode===id} key={id} onClick={()=>{setMode(id);setRadius(id==="stellar"?100:40);}} className={`rounded border px-3 py-2 text-sm ${mode===id?"bg-[#264e70]":""}`}>{name}</button>)}</div></div>
 <div className={full?"relative flex-1 min-h-0":"relative h-[420px] sm:h-[560px]"}>
 <canvas ref={canvas} role="img" aria-label="可拖动、双指缩放的实时星空与空间图；文字数据见下方" style={{width:"100%",height:"100%",display:"block",touchAction:"none"}}
 onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});const ps=[...pointers.current.values()];last.current={x:e.clientX,y:e.clientY,distance:ps.length===2?Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y):0,dragged:ps.length>1};}}
 onPointerMove={e=>{if(!pointers.current.has(e.pointerId)||!last.current)return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});const ps=[...pointers.current.values()],prev=last.current;if(ps.length===2){const distance=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);if(prev.distance>0){const ratio=prev.distance/distance;if(mode==="sky")setFov(v=>Math.max(5,Math.min(160,v*ratio)));else setRadius(v=>Math.max(.2,Math.min(mode==="solar"?500:50000,v*ratio)));}last.current={...prev,distance,dragged:true};}else{const dx=e.clientX-prev.x,dy=e.clientY-prev.y;if(Math.abs(dx)+Math.abs(dy)>1){setYaw(v=>(v-dx*.2+360)%360);setPitch(v=>Math.max(-85,Math.min(85,v+dy*.2)));last.current={x:e.clientX,y:e.clientY,distance:0,dragged:true};}}}}
 onPointerUp={e=>{if(!last.current?.dragged){const rect=e.currentTarget.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;const hit=hits.current.map(h=>({...h,d:Math.hypot(h.x-x,h.y-y)})).sort((a,b)=>a.d-b.d)[0];if(hit&&hit.d<20)setSelected(hit.text);}pointers.current.delete(e.pointerId);last.current=null;}}
 onPointerCancel={e=>{pointers.current.delete(e.pointerId);last.current=null;}}/>
 </div><div className="p-3 space-y-3"><div className="flex gap-2 items-center flex-wrap"><button className="rounded border px-3 py-2" onClick={()=>mode==="sky"?setFov(v=>Math.max(5,v/1.4)):setRadius(v=>Math.max(.2,v/1.4))}>放大</button><button className="rounded border px-3 py-2" onClick={()=>mode==="sky"?setFov(v=>Math.min(160,v*1.4)):setRadius(v=>Math.min(mode==="solar"?500:50000,v*1.4))}>缩小</button><button onClick={reset} className="rounded border px-3 py-2">复位</button><label><input type="checkbox" checked={showLabels} onChange={e=>setShowLabels(e.target.checked)}/>名称</label><label><input type="checkbox" checked={showGrid} onChange={e=>setShowGrid(e.target.checked)}/>坐标网格</label></div><div className="flex gap-2"><input className="min-w-0 flex-1 rounded border border-[#456581] bg-[#101f32] px-2 py-2 text-white" aria-label="搜索恒星名称或HIP编号" placeholder="Sirius / HIP编号" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")search();}}/><button onClick={search} className="rounded border px-3">定位恒星</button></div><p role="status" className="text-sm text-[#f6deb0]">{selected||error||`已载入${catalogue?.stars.length||0}颗恒星；当前画面${visible}个天体。拖动改变朝向，双指或按钮缩放。`}</p>
 {!full&&<details className="text-xs leading-6 text-[#bdcddd]"><summary>数据、精度与扩展星图</summary><p>8920颗亮于6.5等的HYG v4.1恒星；J2000目录坐标经岁差转换，未外推恒星自行，远古/未来恒星图只作示意。地平线下恒星以暗色绘制；行星由现有Astronomy Engine计算，圆点不代表实际大小。天体靠近时标签自动避让，可放大或点选查看。空间模式是有数据范围的太阳系及近邻恒星，并非完整宇宙模型，不包含所有星云、银河纹理、望远镜控制或DE431。</p>{catalogue&&<p>{catalogue.author}；<a href={catalogue.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">HYG固定版本</a>，<a href={catalogue.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">CC BY-SA 4.0</a>；本子集同许可，筛选和格式转换。</p>}<a href="https://stellarium-web.org/" target="_blank" rel="noopener noreferrer" className="underline">打开Stellarium官方网页版（外部星图）</a></details>}
 </div></section>;
 return full&&typeof document!=="undefined"?createPortal(page,document.body):page;
}
