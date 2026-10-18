"use client";
import {Solar} from "lunar-javascript";
import {calendarAt} from "./calendarSnapshot";
import {civilTimeEpoch} from "./calendarRecurrence";
import type {CalendarEvent} from "./calendarEventsStore";
export interface LearningReminderPreferences{terms:boolean;yunqi:boolean;time:string;timeZone:string;}
export const DEFAULT_LEARNING_REMINDERS:LearningReminderPreferences={terms:false,yunqi:false,time:"09:00",timeZone:"Asia/Shanghai"};
const key=(owner:string)=>`yandao_calendar_learning_${owner}`;
export function getLearningReminderPreferences(owner:string):LearningReminderPreferences{
 try{const value=JSON.parse(localStorage.getItem(key(owner))||"null");if(value&&typeof value.terms==="boolean"&&typeof value.yunqi==="boolean"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)){new Intl.DateTimeFormat("en",{timeZone:value.timeZone});return value;}}catch{}
 return {...DEFAULT_LEARNING_REMINDERS};
}
export function saveLearningReminderPreferences(owner:string,value:LearningReminderPreferences):boolean{
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)||typeof value.terms!=="boolean"||typeof value.yunqi!=="boolean")return false;
 try{new Intl.DateTimeFormat("en",{timeZone:value.timeZone});localStorage.setItem(key(owner),JSON.stringify(value));if(localStorage.getItem(key(owner))!==JSON.stringify(value))return false;window.dispatchEvent(new Event("yandao-calendar-changed"));return true;}catch{return false;}
}
export function learningTermDates(year:number,zone:string):{name:string;date:string;instant:number}[]{
 const aliases:Record<string,string>={DA_XUE:"大雪",DONG_ZHI:"冬至",XIAO_HAN:"小寒",DA_HAN:"大寒",LI_CHUN:"立春",YU_SHUI:"雨水",JING_ZHE:"惊蛰"},items=new Map<number,{name:string;date:string;instant:number}>();
 for(const y of [year-1,year,year+1])for(const [key,value] of Object.entries(Solar.fromYmd(y,6,1).getLunar().getJieQiTable())){
  const term=value as {getYear():number;getMonth():number;getDay():number;getHour():number;getMinute():number;getSecond():number},name=aliases[key]||key;if(!/^[\u4e00-\u9fff]{2}$/.test(name))continue;
  const instant=Date.UTC(term.getYear(),term.getMonth()-1,term.getDay(),term.getHour(),term.getMinute(),term.getSecond())-8*3600000;
  const date=calendarAt(instant,{timeZone:zone,placeName:""}).solar;if(Number(date.slice(0,4))===year)items.set(instant,{name,date,instant});
 }
 return [...items.values()].sort((a,b)=>a.instant-b.instant);
}
/** Opted-in, finite local content schedule. No birth chart, health predictions, AI or network. */
export function learningReminderEvents(owner:string,now=Date.now()):CalendarEvent[]{
 const prefs=getLearningReminderPreferences(owner);if(!prefs.terms&&!prefs.yunqi)return [];
 const year=Number(calendarAt(now,{timeZone:prefs.timeZone,placeName:""}).solar.slice(0,4)),events:CalendarEvent[]=[];
 const steps=["大寒","春分","小满","大暑","秋分","小雪"];
 for(const y of [year,year+1])for(const term of learningTermDates(y,prefs.timeZone))for(const topic of ["terms","yunqi"] as const){
  if(!prefs[topic]||topic==="yunqi"&&!steps.includes(term.name))continue;
  const [year,month,day]=term.date.split('-').map(Number),[hour,minute]=prefs.time.split(':').map(Number);
  const at=civilTimeEpoch(year,month,day,hour,minute,prefs.timeZone);if(at===null||at<now-86400000||at>now+366*86400000)continue;
  events.push({id:`culture_${topic}_${term.date}_${term.name}`,userId:owner,type:"custom",title:topic==="terms"?`节气学习 · ${term.name}`:`五运六气原典学习 · ${steps.indexOf(term.name)+1}之气`,note:topic==="terms"?"自主选择的传统节气文化学习，不是天气预测。打开日历中的二十四节气入口。":"按大寒起始的六步学习约定；用于阅读原典，不是个体健康或疾病预测。打开日历中的五运六气原典入口。",dateMode:"solar",year,month,day,repeat:"none",eventTime:prefs.time,timeZone:prefs.timeZone,reminders:[{offsetMinutes:0}],paused:false,createdAt:"",updatedAt:JSON.stringify(prefs)});
 }
 return events;
}
