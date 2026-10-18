import {astro} from "iztro";
/** iztro 2.5.8 uses global settings. Scope the existing day rule synchronously,
 * restore it even on failure, and wrap later horoscope calls the same way. */
export function withZiweiDayRule<T>(separateLateZi:boolean|undefined,calculate:()=>T):T{
 const previous=astro.getConfig().dayDivide;
 try{astro.config({dayDivide:separateLateZi?"current":"forward"});return calculate();}
 finally{astro.config({dayDivide:previous});}
}
