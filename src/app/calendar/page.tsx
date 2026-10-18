"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {Solar} from "lunar-javascript";
import {BrandHeader} from "@/components/shared";
import {calendarAt,type CalendarObservation} from "@/lib/calendarSnapshot";
import {getEventsOnDate,getUpcomingEvents} from "@/lib/calendarEventsStore";
import {CalendarClock} from "@/components/CalendarClock";
import {useInterfaceLocale} from "@/lib/interfaceLocale";
export default function CalendarPage(){
 const {ui}=useInterfaceLocale(),[now,setNow]=useState(Date.now()),[date,setDate]=useState(""),[view,setView]=useState<"day"|"month">("day"),[query,setQuery]=useState(""),[clock,setClock]=useState(false);
 const [observation,setObservation]=useState<CalendarObservation>({timeZone:"Asia/Shanghai",placeName:"北京（手选）"}),[status,setStatus]=useState("");
 useEffect(()=>{try{const raw=localStorage.getItem("yandao-calendar-observation");if(raw){const value=JSON.parse(raw);calendarAt(Date.now(),value);setObservation(value);}}catch{}const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[]);
 const current=useMemo(()=>calendarAt(now,observation),[now,observation]);
 const chosen=date||current.solar,[year,month,day]=chosen.split("-").map(Number);
 const lunar=Solar.fromYmd(year,month,day).getLunar(),events=getEventsOnDate(year,month,day),upcoming=getUpcomingEvents(60).filter(o=>!query||o.event.title.includes(query));
 function saveObservation(zone:string,name:string){try{const value={timeZone:zone,placeName:name};calendarAt(Date.now(),value);setObservation(value);localStorage.setItem("yandao-calendar-observation",JSON.stringify(value));window.dispatchEvent(new Event("yandao-calendar-changed"));setStatus("观察时区已保存；此处采用标准民用时间，不套用出生地点。");}catch{setStatus("时区无效，请选择列表中的时区");}}
 return <main className="mx-auto min-h-screen max-w-[500px] pb-24" style={{background:"var(--theme-bg)",color:"var(--theme-text-primary)"}}>
  <BrandHeader title={ui("言道日历")} showBack/>
  <section className="m-3 rounded-2xl p-5 shadow-sm" style={{background:"var(--theme-card-bg)",borderTop:"3px solid var(--theme-primary)"}}>
   <p className="text-xs opacity-70">{observation.placeName} · {observation.timeZone} · 标准民用时 / 23时换日</p><div className="my-3 flex items-center justify-between"><h1 className="text-2xl font-semibold">{chosen}</h1><button className="rounded border px-3 py-2" onClick={()=>setDate("")}>{ui("今天")}</button></div>
   <p className="text-xl">农历{lunar.getMonthInChinese()}月{lunar.getDayInChinese()} · {lunar.getJieQi()}</p>
   <div className="my-4 rounded-xl p-3" style={{background:"var(--theme-primary-bg)"}}><p className="text-xs opacity-70">此刻四柱 · {current.clock}（非出生四柱）</p><p className="mt-2 text-lg tracking-wider">{current.pillars}</p></div>
   <label className="block text-sm">观察时区 <select className="m-2 max-w-full rounded border p-2" value={observation.timeZone} onChange={e=>saveObservation(e.target.value,e.target.selectedOptions[0].text)}>{[["Asia/Shanghai","北京／上海"],["Asia/Hong_Kong","香港"],["Asia/Taipei","台北"],["Asia/Tokyo","东京"],["Europe/London","伦敦"],["America/New_York","纽约"],["America/Los_Angeles","洛杉矶"],["Australia/Sydney","悉尼"]].map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label>
   <div className="flex flex-wrap gap-3 text-sm"><button onClick={()=>setClock(true)} className="rounded border p-2">全屏国风时钟</button><Link className="rounded border p-2" href="/yixue/wannianli/events/">{ui("记事提醒")}</Link><Link className="rounded border p-2" href="/yixue/huangli/">传统历注</Link></div>{status&&<p className="mt-2 text-xs" role="status">{status}</p>}
  </section>
  <section className="m-3 rounded-2xl p-4" style={{background:"var(--theme-card-bg)"}}><div className="flex items-center justify-between gap-2"><input aria-label="选择日历日期" className="max-w-[60%] rounded border p-2" type="date" value={chosen} onChange={e=>{if(e.target.value)setDate(e.target.value);}}/><button onClick={()=>setView(view==="day"?"month":"day")}>{view==="day"?"月视图":"日视图"}</button></div>
   {view==="month"&&<div className="mt-3 grid grid-cols-7 gap-1">{Array.from({length:new Date(year,month,0).getDate()},(_,i)=>{const d=i+1,items=getEventsOnDate(year,month,d);return <button key={d} aria-pressed={d===day} onClick={()=>setDate(`${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`)} className="rounded p-2 text-sm" style={{background:d===day?"var(--theme-primary)":"var(--theme-primary-bg)",color:d===day?"white":"inherit",gridColumnStart:d===1?new Date(year,month-1,1).getDay()+1:undefined}}>{d}{items.length>0?"·":""}</button>;})}</div>}
   <h2 className="my-3 font-semibold">当天私有记事</h2>{events.length?events.map(o=><p key={o.event.id} className="my-2">{o.event.eventTime||"00:00"} · {o.event.title}</p>):<p className="text-sm opacity-70">这一天暂无安排。</p>}
  </section>
  <section className="m-3 rounded-2xl p-4" style={{background:"var(--theme-card-bg)"}}><input aria-label="搜索本机日程" placeholder="搜索未来60天的本机日程" className="w-full rounded border p-2" value={query} onChange={e=>setQuery(e.target.value)}/>{upcoming.slice(0,20).map(o=><p className="my-3 border-b pb-2 text-sm" key={`${o.event.id}:${o.ts}`}>{o.y}-{o.m}-{o.d} · {o.event.title}</p>)}</section>
  <section className="m-3 rounded-2xl p-4 text-sm leading-7" style={{background:"var(--theme-card-bg)"}}><h2 className="font-semibold">文化学习 · 自主选择</h2><Link href="/yixue/jieqi/">二十四节气</Link> · <Link href="/zhongyi/yunqi/">五运六气原典</Link> · <Link href="/academy/astronomy/">天文馆</Link><p className="text-xs opacity-70">传统文化参考与私人日程分开，不据出生信息诊断、开药或推送灾祸。非必要文化通知默认关闭。</p><Link href="/profile/theme/">国风主题</Link> · <Link href="/calendar/widgets/">桌面组件与提醒设置</Link></section>
  {clock&&<CalendarClock observation={observation} onClose={()=>setClock(false)}/>}
 </main>;
}
