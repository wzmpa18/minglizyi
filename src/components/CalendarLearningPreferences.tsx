"use client";
import {useEffect,useState} from "react";
import {calendarStorageOwner} from "@/lib/calendarEventsStore";
import {DEFAULT_LEARNING_REMINDERS,getLearningReminderPreferences,saveLearningReminderPreferences,type LearningReminderPreferences} from "@/lib/calendarLearning";
import {InterfaceButton,InterfaceLabel} from "./InterfaceControls";
export function CalendarLearningPreferences(){
 const [prefs,setPrefs]=useState<LearningReminderPreferences>(DEFAULT_LEARNING_REMINDERS),[message,setMessage]=useState("");
 useEffect(()=>{const load=()=>{setPrefs(getLearningReminderPreferences(calendarStorageOwner()));setMessage("");};load();window.addEventListener("yandao-auth-change",load);return()=>window.removeEventListener("yandao-auth-change",load);},[]);
 return <div className="my-3 rounded-xl border p-3 text-sm"><p className="mb-2 font-semibold">自选文化学习提醒</p>
 <InterfaceLabel className="my-2 block"><input type="checkbox" checked={prefs.terms} onChange={e=>setPrefs({...prefs,terms:e.target.checked})}/> 节气知识（每个节气当天）</InterfaceLabel>
 <InterfaceLabel className="my-2 block"><input type="checkbox" checked={prefs.yunqi} onChange={e=>setPrefs({...prefs,yunqi:e.target.checked})}/> 五运六气原典（六步学习）</InterfaceLabel>
 <InterfaceLabel className="block">学习时间 <input aria-label="文化学习提醒钟点" type="time" value={prefs.time} onChange={e=>setPrefs({...prefs,time:e.target.value})} className="m-2 rounded border p-2"/></InterfaceLabel>
 <InterfaceLabel className="block">提醒时区 <input aria-label="文化学习提醒时区" value={prefs.timeZone} onChange={e=>setPrefs({...prefs,timeZone:e.target.value})} className="my-2 w-full rounded border p-2"/></InterfaceLabel>
 <InterfaceButton className="my-2 rounded border p-2" onClick={()=>setMessage(saveLearningReminderPreferences(calendarStorageOwner(),prefs)?"已保存选择，并同步替换系统预排提醒。系统通知仍需授权；网页需保持打开。":"未保存，请核对钟点、IANA时区和本机空间")}>保存学习提醒</InterfaceButton>
 {message&&<p role="status" className="text-xs">{message}</p>}
 <p className="text-xs leading-6 opacity-70">默认关闭。关闭并保存会取消相应预排提醒；不使用出生资料，不产生AI费用。五运六气按大寒起始的六步约定，供原典学习，不提供天气、疾病或个人诊疗预测。每次打开日历更新未来提醒，系统关闭权限、强行停止或关机可能影响送达。</p>
 </div>;
}
