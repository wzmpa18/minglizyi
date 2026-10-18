/** A one-use, tab-local transfer. Civil time and calculated time are separate so
 * true solar correction is never applied twice when switching chart tools. */
export type ChartDateTime = {year:number;month:number;day:number;hour:number;minute:number};
export type ChartHandoff = {
  version:1; target:"bazi"|"ziwei"; createdAt:number;
  civil:ChartDateTime; calculation:ChartDateTime;
  name:string; gender:"male"|"female"; longitude:number; birthPlace:string;
  zhenTaiyang:boolean; zaoWanZi:boolean; xiaLing:boolean;
};
export const CHART_HANDOFF_KEY="yandao_chart_handoff_v1";
type StorageLike=Pick<Storage,"getItem"|"setItem"|"removeItem">;
function dateValid(d:ChartDateTime):boolean {
  if(!d||![d.year,d.month,d.day,d.hour,d.minute].every(Number.isInteger))return false;
  const t=new Date(0);t.setUTCFullYear(d.year,d.month-1,d.day);t.setUTCHours(d.hour,d.minute,0,0);
  return d.year>=1&&d.year<=3000&&t.getUTCFullYear()===d.year&&t.getUTCMonth()+1===d.month&&t.getUTCDate()===d.day&&t.getUTCHours()===d.hour&&t.getUTCMinutes()===d.minute;
}
export function validChartHandoff(v:unknown,now=Date.now()):v is ChartHandoff {
  const p=v as ChartHandoff;
  return !!p&&p.version===1&&(p.target==="bazi"||p.target==="ziwei")&&Number.isFinite(p.createdAt)&&now-p.createdAt>=0&&now-p.createdAt<=600000&&dateValid(p.civil)&&dateValid(p.calculation)&&(p.gender==="male"||p.gender==="female")&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180&&typeof p.name==="string"&&p.name.length<=100&&typeof p.birthPlace==="string"&&p.birthPlace.length<=300&&[p.zhenTaiyang,p.zaoWanZi,p.xiaLing].every(v=>typeof v==="boolean");
}
export function writeChartHandoff(p:ChartHandoff,storage:StorageLike=sessionStorage):boolean {
  if(!validChartHandoff(p))return false;
  try{storage.setItem(CHART_HANDOFF_KEY,JSON.stringify(p));return true;}catch{return false;}
}
export function consumeChartHandoff(target:ChartHandoff["target"],storage:StorageLike=sessionStorage,now=Date.now()):ChartHandoff|null {
  try{const raw=storage.getItem(CHART_HANDOFF_KEY);if(!raw)return null;
    const p:unknown=JSON.parse(raw);if(!validChartHandoff(p,now)){storage.removeItem(CHART_HANDOFF_KEY);return null;}
    if(p.target!==target)return null;storage.removeItem(CHART_HANDOFF_KEY);return p;
  }catch{try{storage.removeItem(CHART_HANDOFF_KEY);}catch{}return null;}
}
/** Existing records may predate civil-time capture. Keep their exact calculation
 * input rather than guessing a reverse correction from their four pillars. */
export function chartHandoffFromRecord(input:Record<string,any>,target:ChartHandoff["target"]):ChartHandoff|null {
  const b=input.birthInput||{};
  const c=b.calculationDateTime||input.calculationInput||input;
  const raw=b.normalizedDateTime||(Number.isInteger(b.year)?b:null)||c;
  const dt=(v:Record<string,any>):ChartDateTime=>({year:v.year,month:v.month,day:v.day,hour:v.hour,minute:v.minute??0});
  const p:ChartHandoff={version:1,target,createdAt:Date.now(),civil:dt(raw),calculation:dt(c),name:b.name??input.name??"",gender:b.gender??input.gender,longitude:b.longitude??input.longitude??116.4,birthPlace:b.birthPlace??input.birthPlace??"",zhenTaiyang:b.zhenTaiyang??input.zhenTaiyang??input.useTrueSolar??false,zaoWanZi:b.zaoWanZi??input.zaoWanZi??false,xiaLing:b.xiaLing??input.xiaLing??false};
  return validChartHandoff(p)?p:null;
}

/** Presentation reads the persisted civil/calculation pair, never a mixture of
 * current form state and corrected minutes. Legacy records are not reversed. */
export function chartTimeLabels(input:Record<string,any>) {
  const handoff=chartHandoffFromRecord(input,"ziwei");
  if(!handoff)return null;
  const format=(v:ChartDateTime)=>`${v.year}-${String(v.month).padStart(2,"0")}-${String(v.day).padStart(2,"0")} ${String(v.hour).padStart(2,"0")}:${String(v.minute).padStart(2,"0")}`;
  const original=input.birthInput;
  return {civil:format(handoff.civil),calculation:format(handoff.calculation),civilKnown:!!(original&&(original.normalizedDateTime||Number.isInteger(original.year)))};
}
