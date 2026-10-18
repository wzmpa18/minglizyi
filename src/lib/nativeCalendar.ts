"use client";
import {Capacitor,registerPlugin} from "@capacitor/core";
import {makeCalendarSnapshot,type CalendarObservation} from "./calendarSnapshot";
import {getUpcomingEvents} from "./calendarEventsStore";
import {reminderDueAt} from "./calendarRecurrence";
export interface NativeCalendarStatus {native:boolean;platform:string;widgets:boolean;notifications:boolean;exactAlarms?:boolean;scheduled?:number;expiresAt?:number;}
export const LocalCalendar=registerPlugin<{status:()=>Promise<NativeCalendarStatus>;requestAuthorization:()=>Promise<NativeCalendarStatus>;sync:(arg:{payload:string})=>Promise<NativeCalendarStatus>;addWidget:(arg:{kind:string})=>Promise<{requested:boolean;added:boolean}>;openExactSettings:()=>Promise<NativeCalendarStatus>;openDreamSettings:()=>Promise<void>}>("LocalCalendar");
export const hasNativeCalendar=()=>Capacitor.isNativePlatform();
let sequence=0;
function idFor(text:string){let hash=2166136261;for(const ch of text){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}return (hash>>>0)%2147483646+1;}
export async function syncNativeCalendar(){
 if(!hasNativeCalendar())return null;
 const turn=++sequence,now=Date.now();
 let observation:CalendarObservation={timeZone:"Asia/Shanghai",placeName:"北京（手选）"};
 try{const value=localStorage.getItem("yandao-calendar-observation");if(value)observation=JSON.parse(value);}catch{}
 const snapshot=makeCalendarSnapshot(now,observation);
 const reminders:{id:number;at:number}[]=[],ids=new Set<number>();
 for(const occurrence of getUpcomingEvents(30))for(const advance of occurrence.event.reminders){
   const at=reminderDueAt(occurrence.ts,advance.offsetMinutes);if(at<=now+1000)continue;
   let id=idFor(`${occurrence.event.id}:${occurrence.ts}:${advance.offsetMinutes}:${occurrence.event.updatedAt}`);
   while(ids.has(id))id=id===2147483646?1:id+1;ids.add(id);reminders.push({id,at});
 }
 const locale=localStorage.getItem("yandao_interface_locale")||"zh-CN";
 const texts:Record<string,[string,string]>={"zh-CN":["言道日历","有一项安排，请打开应用查看"],"zh-TW":["言道日曆","有一項安排，請開啟應用程式查看"],ja:["言道カレンダー","予定があります。アプリで確認してください"],en:["Yandao calendar","You have an event. Open the app for details."]};
 const [notificationTitle,notificationBody]=texts[locale]||texts["zh-CN"];
 if(turn!==sequence)return null;
 return LocalCalendar.sync({payload:JSON.stringify({snapshot,reminders:reminders.sort((a,b)=>a.at-b.at).slice(0,64),notificationTitle,notificationBody,locale})});
}
