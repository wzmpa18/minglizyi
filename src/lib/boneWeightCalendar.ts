import {Solar} from "lunar-javascript";
import type {ChartDateTime} from "./chartHandoff";

/** Supply the existing folk weight table with lunar dates, not Gregorian
 * dates or the solar-term month branch from a separate Four Pillars chart.
 * This documented variant uses civil midnight and the same numbered leap month. */
export function boneWeightCalendar(input:ChartDateTime){
 const {year,month,day,hour,minute}=input;
 if(![year,month,day,hour,minute].every(Number.isInteger)||year<1||year>3000)return null;
 const check=new Date(0);check.setUTCFullYear(year,month-1,day);check.setUTCHours(hour,minute,0,0);
 if(check.getUTCFullYear()!==year||check.getUTCMonth()+1!==month||check.getUTCDate()!==day||check.getUTCHours()!==hour||check.getUTCMinutes()!==minute)return null;
 const lunar=Solar.fromYmdHms(year,month,day,hour,minute,0).getLunar();
 const number=Math.abs(lunar.getMonth());
 return {yearGanZhi:lunar.getYearInGanZhi(),monthBranch:["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"][number-1],monthNumber:number,dayNumber:lunar.getDay(),hourBranch:lunar.getTimeZhi(),leapMonth:lunar.getMonth()<0,lunarLabel:`农历${lunar.getYear()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`};
}
