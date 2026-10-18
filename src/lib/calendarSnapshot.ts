import { Solar } from "lunar-javascript";
export const CALENDAR_RULE_VERSION = "lunar-javascript-1.7.7/sect1/standard-civil-v1";
export interface CalendarObservation { timeZone:string; placeName:string; }
export interface CalendarSnapshot {
  schemaVersion:1;ruleVersion:string;timeZone:string;placeName:string;generatedAt:number;expiresAt:number;
  entries:{from:number;until:number;solar:string;lunar:string;pillars:string;jieqi:string;clock:string}[];
}
export function calendarAt(epoch:number, observation:CalendarObservation) {
  const p=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:observation.timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(epoch).map(x=>[x.type,x.value]));
  const solar=Solar.fromYmdHms(+p.year,+p.month,+p.day,+p.hour,+p.minute,+p.second);
  const lunar=solar.getLunar(),ec=lunar.getEightChar();ec.setSect(1);
  return {solar:`${p.year}-${p.month}-${p.day}`,lunar:`${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,pillars:[ec.getYear(),ec.getMonth(),ec.getDay(),ec.getTime()].join(" · "),jieqi:lunar.getJieQi()||"",clock:`${p.hour}:${p.minute}`};
}
/** Native displays consume the same engine output, never another lunar table. */
export function makeCalendarSnapshot(now:number,observation:CalendarObservation,hours=168):CalendarSnapshot {
  if(!Number.isFinite(now)||!Number.isInteger(hours)||hours<1||hours>192)throw new Error("日历覆盖期无效");
  const starts=new Set<number>([now]),end=now+hours*3600000;
  // Quarter-hour zones and DST are respected; exact solar terms are inserted too.
  for(let t=Math.floor(now/900000)*900000+900000;t<=end;t+=900000)starts.add(t);
  starts.add(end);
  for(let day=0;day<=Math.ceil(hours/24);day++){
    const p=calendarAt(now+day*86400000,observation).solar.split("-").map(Number);
    const next=Solar.fromYmd(p[0],p[1],p[2]).getLunar().getNextJieQi(false);
    if(next){const v=next.getSolar();const date=new Date(`${String(v.getYear()).padStart(4,"0")}-${String(v.getMonth()).padStart(2,"0")}-${String(v.getDay()).padStart(2,"0")}T${String(v.getHour()).padStart(2,"0")}:${String(v.getMinute()).padStart(2,"0")}:${String(v.getSecond()).padStart(2,"0")}+08:00`).getTime();if(date>now&&date<end)starts.add(date);}
  }
  const times=[...starts].sort((a,b)=>a-b),entries:CalendarSnapshot["entries"]=[];
  for(let i=0;i<times.length-1;i++){
    const data=calendarAt(times[i],observation),previous=entries.at(-1);
    if(previous&&previous.solar===data.solar&&previous.lunar===data.lunar&&previous.pillars===data.pillars&&previous.jieqi===data.jieqi)previous.until=times[i+1];
    else entries.push({from:times[i],until:times[i+1],...data});
  }
  return {schemaVersion:1,ruleVersion:CALENDAR_RULE_VERSION,...observation,generatedAt:now,expiresAt:end,entries};
}
