'use strict';
const CALENDAR_RULE_VERSION='lunar-javascript-1.7.7/sect1/instant-jieqi-local-day-v2';
function validCivilDate(year,month,day){
 if(!Number.isInteger(year)||year<1||year>3000||!Number.isInteger(month)||month<1||month>12||!Number.isInteger(day)||day<1)return false;
 const leap=year%4===0&&(year%100!==0||year%400===0);
 return day<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month-1];
}
function civilTimeEpoch(y,m,d,hour,minute,zone){
 if(!validCivilDate(y,m,d)||!Number.isInteger(hour)||hour<0||hour>23||!Number.isInteger(minute)||minute<0||minute>59)return null;
 try{
  const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:zone,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const target=Date.UTC(y,m-1,d,hour,minute),values=new Set();
  for(const delta of [-86400000,0,86400000]){
   const guess=target+delta,p=Object.fromEntries(fmt.formatToParts(guess).map(x=>[x.type,x.value]));
   const offset=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second)-guess,epoch=target-offset;
   const q=Object.fromEntries(fmt.formatToParts(epoch).map(x=>[x.type,x.value]));
   if(+q.year===y&&+q.month===m&&+q.day===d&&+q.hour===hour&&+q.minute===minute)values.add(epoch);
  }
  return values.size?Math.min(...values):null;
 }catch{return null;}
}
function createCalendarRules(Solar){
 const formatters=new Map(),terms=new Map();
 const parts=(epoch,zone)=>{if(!formatters.has(zone))formatters.set(zone,new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}));return Object.fromEntries(formatters.get(zone).formatToParts(epoch).map(x=>[x.type,x.value]));};
 const dateKey=p=>`${p.year}-${p.month}-${p.day}`;
 function calendarAt(epoch,observation){
  const p=parts(epoch,observation.timeZone),cn=parts(epoch,'Asia/Shanghai');
  const local=Solar.fromYmdHms(+p.year,+p.month,+p.day,+p.hour,+p.minute,+p.second).getLunar(),localChart=local.getEightChar();localChart.setSect(1);
  // lunar-javascript's JieQi tables are expressed in UTC+8. Year/month
  // boundaries follow that absolute instant; day/hour use the chosen civil zone.
  const china=Solar.fromYmdHms(+cn.year,+cn.month,+cn.day,+cn.hour,+cn.minute,+cn.second).getLunar(),season=china.getEightChar();season.setSect(1);
  const cacheKey=`${china.getYear()}:${observation.timeZone}`;
  if(!terms.has(cacheKey)){
   const days=new Map(),aliases={DA_XUE:'大雪',DONG_ZHI:'冬至',XIAO_HAN:'小寒',DA_HAN:'大寒',LI_CHUN:'立春',YU_SHUI:'雨水',JING_ZHE:'惊蛰'};
   for(const [key,value] of Object.entries(china.getJieQiTable())){
    const name=aliases[key]||key;if(!/^[\u4e00-\u9fff]{2}$/.test(name))continue;
    const instant=Date.UTC(value.getYear(),value.getMonth()-1,value.getDay(),value.getHour(),value.getMinute(),value.getSecond())-8*3600000;
    days.set(dateKey(parts(instant,observation.timeZone)),name);
   }
   if(terms.size>20)terms.clear();terms.set(cacheKey,days);
  }
  const jieqi=terms.get(cacheKey).get(dateKey(p))||'';
  return {solar:dateKey(p),lunar:`${local.getMonthInChinese()}月${local.getDayInChinese()}`,pillars:[season.getYear(),season.getMonth(),localChart.getDay(),localChart.getTime()].join(' · '),jieqi,clock:`${p.hour}:${p.minute}`,secondsOfDay:+p.hour*3600+(+p.minute)*60+(+p.second),offsetMinutes:(Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second)-Math.floor(epoch/1000)*1000)/60000};
 }
 return {calendarAt};
}
module.exports={CALENDAR_RULE_VERSION,validCivilDate,civilTimeEpoch,createCalendarRules};
