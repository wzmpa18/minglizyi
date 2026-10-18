"use client";
import {useEffect,useRef,useState} from "react";
import {calendarAt,type CalendarObservation} from "@/lib/calendarSnapshot";
export function CalendarClock({observation,onClose}:{observation:CalendarObservation;onClose:()=>void}){
 const [now,setNow]=useState(Date.now()),[awake,setAwake]=useState(false),[message,setMessage]=useState("");
 const lock=useRef<WakeLockSentinel|null>(null);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);const release=()=>{void lock.current?.release();lock.current=null;setAwake(false);};document.addEventListener("visibilitychange",release);return()=>{clearInterval(timer);release();document.removeEventListener("visibilitychange",release);};},[]);
 async function toggle(){if(awake){await lock.current?.release();lock.current=null;setAwake(false);return;}try{lock.current=await navigator.wakeLock.request("screen");setAwake(true);lock.current.addEventListener("release",()=>setAwake(false));}catch{setMessage("设备未允许保持亮屏，可按系统自动息屏设置使用。");}}
 const data=calendarAt(now,observation),shift=Math.floor(now/60000)%5-2;
 return <div role="dialog" aria-label="全屏国风时钟" className="fixed inset-0 z-[110000] flex flex-col items-center justify-center" style={{background:"#111820",color:"#C6B79F",padding:"calc(env(safe-area-inset-top,0px) + 24px) 20px"}}>
  <button onClick={onClose} className="absolute right-5 rounded border px-4 py-2" style={{top:"calc(env(safe-area-inset-top,0px) + 22px)"}}>退出时钟</button>
  <div style={{transform:`translate(${shift*3}px,${shift*2}px)`,textAlign:"center"}}><p>言道日历 · {observation.placeName}</p><time style={{fontSize:"clamp(64px,18vw,128px)",fontVariantNumeric:"tabular-nums",fontWeight:200}}>{data.clock}</time><p className="text-lg">{data.solar} · 农历{data.lunar}</p><p className="my-6 text-lg leading-8">此刻四柱<br/>{data.pillars}</p><p>{data.jieqi}</p></div>
  <button className="mt-10 rounded border px-4 py-2" onClick={()=>void toggle()}>{awake?"关闭前台保持亮屏":"主动开启前台保持亮屏"}</button><p className="mt-3 max-w-md text-center text-xs leading-6">APP内时钟。离开即释放亮屏；关屏后不能继续绘制，不替代系统锁屏或息屏显示。</p>{message&&<p role="status">{message}</p>}
 </div>;
}
