"use client";
import {Capacitor,registerPlugin} from "@capacitor/core";
import {makeCalendarSnapshot,type CalendarObservation} from "./calendarSnapshot";
import {getUpcomingEvents,getPendingReminderOccurrences,getOccurrenceReminders} from "./calendarEventsStore";
export interface NativeCalendarStatus {native:boolean;platform:string;widgets:boolean;notifications:boolean;exactAlarms?:boolean;scheduled?:number;expiresAt?:number;queueBudget?:number;plannedThrough?:number;deferred?:number;registrationFailed?:number;}
export const LocalCalendar=registerPlugin<{status:()=>Promise<NativeCalendarStatus>;requestAuthorization:()=>Promise<NativeCalendarStatus>;sync:(arg:{payload:string})=>Promise<NativeCalendarStatus>;addWidget:(arg:{kind:string})=>Promise<{requested:boolean;added:boolean}>;openExactSettings:()=>Promise<NativeCalendarStatus>;openDreamSettings:()=>Promise<void>}>("LocalCalendar");
export const hasNativeCalendar=()=>Capacitor.isNativePlatform();
let sequence=0;
function idFor(text:string){let hash=2166136261;for(const ch of text){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}return (hash>>>0)%2147483646+1;}
export async function syncNativeCalendar(){
 if(!hasNativeCalendar())return null;
 const turn=++sequence,now=Date.now(),nativeStatus=await LocalCalendar.status();
 const queueBudget=Math.max(1,Math.min(256,Math.trunc(nativeStatus.queueBudget||32)));
 let observation:CalendarObservation={timeZone:"Asia/Shanghai",placeName:"北京（手选）"};
 try{const value=localStorage.getItem("yandao-calendar-observation");if(value)observation=JSON.parse(value);}catch{}
 const snapshot=makeCalendarSnapshot(now,observation);
 const reminders:{id:number;at:number;exact:boolean}[]=[],ids=new Set<number>();
 const occurrences=getUpcomingEvents(30);
 for(const occurrence of getPendingReminderOccurrences(30))for(const advance of getOccurrenceReminders(occurrence)){
   const at=advance.at;if(at<=now+1000)continue;
   let id=idFor(`${occurrence.event.id}:${occurrence.ts}:${advance.offsetMinutes}:${occurrence.event.updatedAt}`);
   while(ids.has(id))id=id===2147483646?1:id+1;ids.add(id);reminders.push({id,at,exact:occurrence.event.exactReminder===true});
 }
 const locale=localStorage.getItem("yandao_interface_locale")||"zh-CN";
 const texts:Record<string,[string,string]>={"zh-CN":["言道日历","有一项安排，请打开应用查看"],"zh-TW":["言道日曆","有一項安排，請開啟應用程式查看"],ja:["言道カレンダー","予定があります。アプリで確認してください"],en:["Yandao calendar","You have an event. Open the app for details."]};
 const [notificationTitle,notificationBody]=texts[locale]||texts["zh-CN"];
 if(turn!==sequence)return null;
 const selected=reminders.sort((a,b)=>a.at-b.at||a.id-b.id).slice(0,queueBudget);
 return LocalCalendar.sync({payload:JSON.stringify({snapshot,agenda:occurrences.filter(o=>o.ts>now).slice(0,50).map(o=>({at:o.ts})),reminders:selected,deferred:Math.max(0,reminders.length-selected.length),plannedThrough:selected.at(-1)?.at||0,horizonEnd:now+30*86400000,notificationTitle,notificationBody,locale})});
}
