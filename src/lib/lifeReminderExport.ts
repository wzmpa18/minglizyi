import type {LifeEntry} from "./lifeRecords";
import {civilTimeEpoch} from "../../backend_deploy/calendarRules.js";
const utc=(at:number)=>new Date(at).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
const escape=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
function fold(s:string){let line='',bytes=0,out='';for(const c of s){const n=new TextEncoder().encode(c).length;if(bytes+n>75){out+=line+'\r\n';line=' ';bytes=1;}line+=c;bytes+=n;}return out+line;}
/** Explicit, finite UTC instances preserve local DST rules without guessing a
 * VTIMEZONE. No VALARM: importing a file must not activate old medical alerts. */
export function lifeReminderIcs(entries:LifeEntry[],now=Date.now()){
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Yandao//Private Local Calendar//ZH','CALSCALE:GREGORIAN'];let count=0;
 for(const entry of entries)for(const r of entry.reminders||[]){if(r.needsConfirmation||!r.confirmedAt)continue;const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(r.dateTime);if(!m||!/^\d{4}-\d{2}-\d{2}$/.test(r.endDate))throw Error('提醒日期无效，未截断导出');new Intl.DateTimeFormat('en',{timeZone:r.timeZone});const start=new Date(Date.UTC(+m[1],+m[2]-1,+m[3])),end=new Date(r.endDate+'T23:59:59Z');if(end.getTime()-start.getTime()>5*366*86400000)throw Error('单次日历导出覆盖不超过五年，请缩小所选范围，原规则不变');
  for(let day=new Date(start);day<=end;day=new Date(day.getTime()+86400000)){const distance=Math.round((day.getTime()-start.getTime())/86400000);if(r.repeat==='none'&&distance>0)break;if(r.repeat==='weekly'&&distance%7)continue;if(r.repeat==='monthly'&&day.getUTCDate()!==start.getUTCDate())continue;const at=civilTimeEpoch(day.getUTCFullYear(),day.getUTCMonth()+1,day.getUTCDate(),+m[4],+m[5],r.timeZone);if(at===null)continue;if(++count>5000)throw Error('所选实例超过5000，请按日期分批，未截断原规则');const date=day.toISOString().slice(0,10).replace(/-/g,'');lines.push('BEGIN:VEVENT',`UID:${escape(r.id)}-${date}@local.yandao`,`DTSTAMP:${utc(now)}`,`DTSTART:${utc(at)}`,`DTEND:${utc(at+60000)}`,'SUMMARY:有一项私人安排',`DESCRIPTION:${escape('本人确认的安排；原时区 '+r.timeZone+'。导入不代表已服药或已启用提醒，请本人在系统日历核对。')}`,'CLASS:PRIVATE','END:VEVENT');}
 }if(!count)throw Error('所选记录没有已确认且启用的提醒，恢复后未确认的旧规则不会导出为已启用安排');lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';
}
