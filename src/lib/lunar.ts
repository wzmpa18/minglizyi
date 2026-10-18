/** Shared civil-date conversion; the old bit table shifted month bits and
 * reused regular-month lengths for leap months, accumulating wrong dates.
 * Use the same calendar engine as the home page and chart input. */
import {Solar} from "lunar-javascript";
export interface LunarDate {
 year:number;month:number;day:number;isLeapMonth:boolean;
 yearGanZhi:string;monthName:string;dayName:string;shengXiao:string;
}
export function solarToLunar(year:number,month:number,day:number):LunarDate {
 if(![year,month,day].every(Number.isInteger)||year<1||year>3000)throw Error("日期超出支持范围");
 const civil=new Date(0);civil.setUTCFullYear(year,month-1,day);civil.setUTCHours(12,0,0,0);
 if(civil.getUTCFullYear()!==year||civil.getUTCMonth()+1!==month||civil.getUTCDate()!==day)throw Error("无效的公历日期");
 const lunar=Solar.fromYmd(year,month,day).getLunar(),leap=lunar.getMonth()<0;
 return {year:lunar.getYear(),month:Math.abs(lunar.getMonth()),day:lunar.getDay(),isLeapMonth:leap,yearGanZhi:lunar.getYearInGanZhi(),monthName:lunar.getMonthInChinese()+"月",dayName:lunar.getDayInChinese(),shengXiao:lunar.getYearShengXiao()};
}
export function getLunarDateString(lunar:LunarDate):string{return `农历${lunar.monthName}${lunar.dayName}`;}
