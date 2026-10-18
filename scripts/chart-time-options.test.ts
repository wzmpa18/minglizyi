import {test} from "node:test";
import assert from "node:assert/strict";
import {astro} from "iztro";
import {prepareChartTime,baziSectForOptions} from "../src/lib/chartTimeInput";
import {solarToBazi} from "../src/algorithm-core/modules/bazi/base";
import {calculateZiwei} from "../src/algorithm-core/modules/ziwei";
import {withZiweiDayRule} from "../src/algorithm-core/modules/ziwei/dayRule";
import fixture from "./fixtures/existing-engine-golden.json";
test("existing E-drive reference facts remain stable, without claiming live Jishiyu parity",()=>{
 const bazi=solarToBazi(fixture.input);assert.deepEqual(bazi.pillars.map((p:{ganzhi:string})=>p.ganzhi),fixture.bazi);assert.ok(bazi.input);assert.equal(bazi.input.time,'14:30');
 const zw=calculateZiwei({...fixture.input,gender:'male'});
 for(const key of ['fiveElementsClass','soulStar','bodyStar','earthlyBranchOfSoulPalace','earthlyBranchOfBodyPalace'] as const)assert.equal(zw[key],fixture.ziwei[key]);
 assert.deepEqual(zw.palaces.map(p=>({index:p.index,name:p.name,branch:p.earthlyBranch,majorStars:p.majorStars})),fixture.ziwei.palaces);
});
test("existing early/late Zi rule reaches the engine and does not leak to another chart",()=>{
 const birth={year:1990,month:5,day:15,hour:23,minute:30,gender:'male'};
 assert.equal(solarToBazi({...birth,sect:baziSectForOptions(true)}).pillars[2].ganzhi,'庚辰');
 assert.equal(solarToBazi({...birth,sect:baziSectForOptions(false)}).pillars[2].ganzhi,'辛巳');
 const signature=(value:ReturnType<typeof calculateZiwei>)=>value.palaces.map(p=>[p.name,p.majorStars]);
 assert.deepEqual(signature(calculateZiwei({...birth,gender:'male',separateLateZi:true})),signature(calculateZiwei({...birth,hour:0,gender:'male'})));
 assert.deepEqual(signature(calculateZiwei({...birth,gender:'male',separateLateZi:false})),signature(calculateZiwei({...birth,day:16,hour:0,gender:'male'})));
 const before=astro.getConfig().dayDivide;
 assert.throws(()=>withZiweiDayRule(true,()=>{throw new Error('fixture failure')}),/fixture/);assert.equal(astro.getConfig().dayDivide,before);
});
test("DST precedes solar-time correction once; browser/device timezone cannot change calculation",()=>{
 const civil={year:1990,month:5,day:15,hour:0,minute:30};
 const corrected=prepareChartTime(civil,{xiaLing:true,zhenTaiyang:false,longitude:116});
 assert.deepEqual(corrected.calculation,{year:1990,month:5,day:14,hour:23,minute:30});assert.deepEqual(civil,{year:1990,month:5,day:15,hour:0,minute:30});
 const original=process.env.TZ;try{let baseline:string|undefined;for(const zone of ['Asia/Shanghai','Asia/Tokyo','America/New_York']){process.env.TZ=zone;const value=JSON.stringify(prepareChartTime(civil,{xiaLing:true,zhenTaiyang:true,longitude:116}).calculation);if(baseline)assert.equal(value,baseline);baseline=value;}}finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
});
