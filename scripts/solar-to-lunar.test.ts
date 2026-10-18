import {test} from "node:test";
import assert from "node:assert/strict";
import {solarToLunar,getLunarDateString} from "../src/lib/lunar";
// Independent date fixtures: Hong Kong Observatory Gregorian-Lunar conversion tables.
// https://www.hko.gov.hk/tc/gts/time/calendar/pdf/files/2026.pdf
// https://www.hko.gov.hk/tc/gts/time/calendar/pdf/files/2023.pdf
const fixture=(y:number,m:number,d:number,ly:number,lm:number,ld:number,leap=false)=>{const r=solarToLunar(y,m,d);assert.deepEqual([r.year,r.month,r.day,r.isLeapMonth],[ly,lm,ld,leap]);return r;};
test("HKO 2026 autumn dates and New Year do not drift from the home calendar",()=>{
 const r=fixture(2026,10,19,2026,9,10);assert.equal(getLunarDateString(r),"农历九月初十");fixture(2026,10,10,2026,9,1);fixture(2026,11,9,2026,10,1);fixture(2026,2,17,2026,1,1);
});
test("leap-month boundary uses the leap month length independently",()=>{
 fixture(2023,3,22,2023,2,1,true);fixture(2023,4,19,2023,2,29,true);fixture(2023,4,20,2023,3,1);fixture(1900,1,31,1900,1,1);
});
test("civil-date conversion is stable across machine timezones and rejects invalid dates",()=>{
 const previous=process.env.TZ;try{for(const tz of ["UTC","Asia/Shanghai","America/New_York"]){process.env.TZ=tz;fixture(2026,10,19,2026,9,10);}}finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
 for(const d of [[2026,2,30],[2026,13,1],[2026,1,0],[0,1,1],[3001,1,1]])assert.throws(()=>solarToLunar(d[0],d[1],d[2]));
});
