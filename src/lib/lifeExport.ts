import {exportableLifeEntries,healthPreparation,type LifeEntry} from './lifeRecords';
import {lifeReminderIcs} from './lifeReminderExport';
import {lifeExportProjection,type LifeExportPrivacy} from './lifeExportPrivacy';
export type LifeExportFormat='txt'|'md'|'html'|'csv'|'json'|'pdf'|'ics'|'health';
export function buildLifeExport(entries:LifeEntry[],format:LifeExportFormat,privacy:LifeExportPrivacy){
 if(!entries.length)throw Error('没有选中可导出的记录');
 const selected=lifeExportProjection(entries,privacy);
 let body=selected.map(e=>`${e.title}\n${e.occurredAt}\n${e.text}\n\n${e.sourceRefs.map(r=>`来源：${r.kind} ${r.author||''} ${r.platform||''} ${r.at||''}\n${r.quote||''}`).join('\n')}\n${e.health?`本人核对：${e.health.confirmedText||'未核对'}`:''}`).join('\n\n——\n\n');
 let type='text/plain;charset=utf-8',ext:string=format;
 if(format==='health'){body=healthPreparation(selected);ext='txt';}
 if(format==='json'){body=JSON.stringify({schema:1,purpose:'SELECTED_REDACTED_EXPORT_NOT_RESTORABLE_BACKUP',entries:selected},null,2);type='application/json';}
 if(format==='csv'){const cell=(s:string)=>'"'+s.replace(/"/g,'""').replace(/^[\s]*[=+@-]/,"'$&")+'"';body='\ufeff'+[['标题','日期','正文','分类'],...selected.map(e=>[e.title,e.occurredAt,e.text,e.categories.join('；')])].map(r=>r.map(cell).join(',')).join('\r\n');type='text/csv;charset=utf-8';}
 if(format==='html'){const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));body=`<!doctype html><html lang="zh"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>个人所选记录</title><style>body{font:16px sans-serif;max-width:760px;margin:24px auto;white-space:pre-wrap;overflow-wrap:anywhere}@media print{body{margin:0}}</style><body>${escape(body)}</body></html>`;type='text/html;charset=utf-8';}
 // The calendar writer already excludes all medical prose and names. Date
 // removal is not meaningful for a usable calendar; disclose this in preview.
 if(format==='ics'){body=lifeReminderIcs(exportableLifeEntries(entries));type='text/calendar;charset=utf-8';}
 if(body.length>4000000)throw Error('所选导出内容超过400万字符，请按日期或分类分批；未截断原件');
 return {body,type,name:`言道人生记录_所选脱敏副本.${ext}`};
}
