import {test} from "node:test";
import assert from "node:assert/strict";
import {timeDivination,timeDivinationNumbers,numberDivination,getBianGua,getHuGua,getTrigramInfo,analyzeTiYong,TRIGRAM_NUMBER_MAP} from "../src/algorithm-core/modules/meihua";
import {pillarRelations} from "../src/lib/baziRelations";
test("known lunar New Year and leap-month inputs use branch/hour counts",()=>{
 assert.deepEqual(timeDivinationNumbers(2026,2,17,0),{yearNumber:7,lunarMonth:1,lunarDay:1,hourNumber:1});
 assert.deepEqual(timeDivination(2026,2,17,0),{upperTrigram:"乾",lowerTrigram:"兑",changeYao:4,hexNum:10});
 assert.equal(timeDivinationNumbers(2023,3,22,23).lunarMonth,2);
 assert.equal(timeDivinationNumbers(2023,3,22,23).hourNumber,1);
 assert.throws(()=>timeDivination(2026,2,30,12));
});
test("classic observing-plum example: Chen5+12+17+Shen9=43; Ge first line to Xian",()=>{
 const r=numberDivination(5+12+17,5+12+17+9,43);
 assert.equal(r.upperTrigram,"兑");assert.equal(r.lowerTrigram,"离");assert.equal(r.changeYao,1);
 assert.equal(getBianGua(r.upperTrigram,r.lowerTrigram,1).name,"泽山咸");
 assert.deepEqual(getHuGua("兑","离"),{upper:"乾",lower:"巽",name:"天风姤",num:44});
});
test("all64x6 changes flip exactly one bottom-indexed line; body is always stationary trigram",()=>{
 for(const upper of Object.values(TRIGRAM_NUMBER_MAP))for(const lower of Object.values(TRIGRAM_NUMBER_MAP))for(let moving=1;moving<=6;moving++){
  const before=getTrigramInfo(lower).lines+getTrigramInfo(upper).lines,r=getBianGua(upper,lower,moving),after=getTrigramInfo(r.lower).lines+getTrigramInfo(r.upper).lines;
  assert.deepEqual([...before].flatMap((c,i)=>c!==after[i]?[i+1]:[]),[moving]);
  assert.equal(analyzeTiYong(upper,lower,moving).tiGua,moving>3?lower:upper);
  const restored=getBianGua(r.upper,r.lower,moving);assert.equal(restored.upper,upper);assert.equal(restored.lower,lower);
 }
 assert.throws(()=>numberDivination(0,1,2));assert.throws(()=>getBianGua("乾","坤",0));
});
test("Bazi labels distinguish六合/害/刑/破 without claiming automatic transformation",()=>{
 const p=[{gan:"甲",zhi:"子"},{gan:"己",zhi:"丑"},{gan:"庚",zhi:"未"},{gan:"甲",zhi:"卯"}];
 const g=pillarRelations(p,"gan").map(x=>x.text).join(";");const z=pillarRelations(p,"zhi").map(x=>x.text).join(";");
 assert.match(g,/五合（合不等于化）/);assert.match(g,/相冲/);assert.match(z,/子丑六合/);assert.match(z,/子未相害/);assert.match(z,/子卯相刑/);assert.doesNotMatch(z,/半合/);
 const triple=pillarRelations([{gan:"甲",zhi:"申"},{gan:"乙",zhi:"子"},{gan:"丙",zhi:"辰"}],"zhi");assert.ok(triple.some(r=>r.text.includes("三合水")));
});
