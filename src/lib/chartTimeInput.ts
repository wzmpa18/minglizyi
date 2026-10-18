import {applyChinaDstCorrection} from "../algorithm-core/common/dst";
import {calcTrueSolarTime} from "../algorithm-core/common/jieqi";
import type {ChartDateTime} from "./chartHandoff";
/** Input adapter only: reuse the established DST and solar-time engines once.
 * Civil chart input is UTC+8 regardless of the phone/browser's current zone. */
export function prepareChartTime(civil:ChartDateTime,options:{xiaLing:boolean;zhenTaiyang:boolean;longitude:number}){
 const standard=applyChinaDstCorrection(civil.year,civil.month,civil.day,civil.hour,civil.minute,options.xiaLing).corrected;
 let calculation={...standard},solar:ReturnType<typeof calcTrueSolarTime>|null=null;
 if(options.zhenTaiyang){
  const instant=new Date(Date.UTC(standard.year,standard.month-1,standard.day,standard.hour,standard.minute)-8*3600000);
  solar=calcTrueSolarTime(instant,options.longitude);
  const t=new Date(solar.trueSolarTime.getTime()+8*3600000);
  calculation={year:t.getUTCFullYear(),month:t.getUTCMonth()+1,day:t.getUTCDate(),hour:t.getUTCHours(),minute:t.getUTCMinutes()};
 }
 return {standard,calculation,solar};
}
export const baziSectForOptions=(separateLateZi:boolean):1|2=>separateLateZi?2:1;
