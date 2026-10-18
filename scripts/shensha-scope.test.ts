import {test} from "node:test";
import assert from "node:assert/strict";
import {calculateAllShenSha} from "../src/algorithm-core/modules/shensha";
import {calculateShenSha} from "../src/algorithm-core/modules/bazi/base";
import {boneWeightCalendar} from "../src/lib/boneWeightCalendar";

const sample={yearGan:"丙",yearZhi:"午",monthGan:"戊",monthZhi:"戌",dayGan:"丙",dayZhi:"寅",hourGan:"庚",hourZhi:"寅",gender:"male"};
test("public2026 reference does not gain day-only stars from its year or month",()=>{
 const result=calculateAllShenSha(sample);
 for(const name of ["魁罡","十恶大败","阴阳差错"])assert.equal(result.all.some((s:{name:string})=>s.name===name),false,name);
 assert.equal((calculateShenSha({...sample,allGanZhi:["丙午","戊戌","丙寅","庚寅"]}) as Record<string,string[]>)["魁罡"],undefined);
});
test("day-only hits remain available and stay on their documented pillar",()=>{
 const result=calculateAllShenSha({...sample,dayGan:"庚",dayZhi:"辰",yearGan:"庚",yearZhi:"辰"});
 for(const name of ["魁罡","十恶大败"])assert.deepEqual(result.all.find((s:{name:string})=>s.name===name)?.pillars,["日柱"]);
 assert.deepEqual((calculateShenSha({...sample,dayGan:"庚",dayZhi:"辰",allGanZhi:["庚辰","戊戌","庚辰","庚寅"]}) as Record<string,string[]>)["魁罡"],["日柱"]);
 const spring=calculateAllShenSha({...sample,yearGan:"庚",yearZhi:"申",monthGan:"戊",monthZhi:"寅",dayGan:"戊",dayZhi:"寅"});
 assert.deepEqual(spring.all.find((s:{name:string})=>s.name==="天赦")?.pillars,["日柱"]);
 assert.equal(spring.all.some((s:{name:string})=>s.name==="四废"),false);
});
test("folk weight inputs use lunar day/month/year including leap-month and CNY boundaries",()=>{
 const a=boneWeightCalendar({year:1990,month:5,day:15,hour:14,minute:19})!;
 assert.equal(a.dayNumber,21);assert.equal(a.monthNumber,4);assert.equal(a.monthBranch,"巳");
 const beforeCny=boneWeightCalendar({year:2024,month:2,day:4,hour:20,minute:0})!;
 assert.equal(beforeCny.yearGanZhi,"癸卯");assert.equal(beforeCny.monthNumber,12);assert.equal(beforeCny.dayNumber,25);
 const leap=boneWeightCalendar({year:2023,month:3,day:22,hour:12,minute:0})!;
 assert.equal(leap.leapMonth,true);assert.equal(leap.monthNumber,2);assert.equal(leap.monthBranch,"卯");assert.equal(leap.dayNumber,1);
 assert.equal(boneWeightCalendar({year:2024,month:2,day:30,hour:0,minute:0}),null);
});
