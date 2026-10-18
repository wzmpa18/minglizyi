import {test} from "node:test";
import assert from "node:assert/strict";
import {calendarAt,makeCalendarSnapshot} from "../src/lib/calendarSnapshot";
test("shared snapshot matches the official lunar fixture and has a bounded continuous timeline",()=>{
 const now=Date.UTC(2026,9,19,1,7),observation={timeZone:"Asia/Shanghai",placeName:"北京"};
 assert.equal(calendarAt(now,observation).lunar,"九月初十");
 const data=makeCalendarSnapshot(now,observation,72);
 assert.equal(data.entries[0].from,now);assert.equal(data.entries.at(-1)!.until,data.expiresAt);
 assert.ok(data.entries.length<100);
 data.entries.forEach((row,index)=>{assert.ok(row.until>row.from);if(index)assert.equal(data.entries[index-1].until,row.from);assert.equal(row.pillars,calendarAt(row.from,observation).pillars);});
 assert.equal(data.expiresAt-now,72*3600000);
});
test("chosen observation zone changes civil date without taking a birth location",()=>{
 const t=Date.UTC(2026,9,18,18),sh=calendarAt(t,{timeZone:"Asia/Shanghai",placeName:"上海"}),ny=calendarAt(t,{timeZone:"America/New_York",placeName:"纽约"});
 assert.equal(sh.solar,"2026-10-19");assert.equal(ny.solar,"2026-10-18");assert.notEqual(sh.pillars,ny.pillars);
});
