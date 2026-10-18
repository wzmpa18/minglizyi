import {test} from "node:test";
import assert from "node:assert/strict";
import {CHART_HANDOFF_KEY,chartHandoffFromRecord,consumeChartHandoff,writeChartHandoff} from "../src/lib/chartHandoff";
test("cross-chart transfer retains civil midnight boundary, corrected minute, gender and settings without double correction",()=>{
 const input={year:1990,month:5,day:14,hour:23,minute:48,gender:"female",name:"测试",longitude:102.5,zhenTaiyang:true,zaoWanZi:true,xiaLing:false,birthInput:{normalizedDateTime:{year:1990,month:5,day:15,hour:0,minute:20},calculationDateTime:{year:1990,month:5,day:14,hour:23,minute:48}}};
 const p=chartHandoffFromRecord(input,"bazi")!;assert.ok(p);assert.equal(p.civil.day,15);assert.equal(p.calculation.day,14);assert.equal(p.calculation.minute,48);assert.equal(p.zaoWanZi,true);
 const map=new Map<string,string>();const storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}};
 assert.equal(writeChartHandoff(p,storage),true);assert.equal(consumeChartHandoff("ziwei",storage),null);
 assert.deepEqual(consumeChartHandoff("bazi",storage),p);assert.equal(consumeChartHandoff("bazi",storage),null);
 storage.setItem(CHART_HANDOFF_KEY,JSON.stringify(p));assert.equal(consumeChartHandoff("bazi",storage,p.createdAt+600001),null);assert.equal(map.size,0);
 assert.equal(chartHandoffFromRecord({...input,day:32,birthInput:{}},"ziwei"),null);
});
