const {test}=require('node:test'),assert=require('node:assert/strict');
const {snapshot,revalidate}=require('../backend_deploy/liveChartPolicy');
test('serialization removes private birth fields before transmission while preserving palace and star names',()=>{
 const original={name:'SECRET_PERSON',solarDate:'SECRET_DATE',lunarDate:'SECRET_LUNAR',input:{lon:'SECRET_LOCATION'},note:'SECRET_NOTE',aiReport:'SECRET_AI',palaces:Array.from({length:12},(_,index)=>({index,name:'命宫',heavenlyStem:'甲',earthlyBranch:'寅',majorStars:['紫微'],minorStars:['孤辰'],ageRange:[10,20],ages:[10],note:'SECRET_NESTED'})),stars:[{name:'紫微',palace:'命宫'}]};
 const copy=snapshot('ziwei',original,{showPillars:false});assert.ok(!JSON.stringify(copy).includes('SECRET'));assert.equal(copy.data.palaces[0].name,'命宫');assert.equal(copy.data.stars[0].name,'紫微');assert.equal(copy.data.palaces[0].ageRange,undefined);assert.deepEqual(revalidate(copy).data,copy.data);assert.equal(original.palaces[0].note,'SECRET_NESTED');assert.deepEqual(copy.allowedLayers,['natal']);
});
test('astronomical longitude is retained, unknown tools and malformed charts fail explicitly',()=>{
 const c=snapshot('qizheng',{palaces:[{branch:'子',startLon:12}],stars:[{key:'sun',name:'日',lon:123.45}],input:{lon:116.4,lat:39.9},utcTime:'HIDDEN'});assert.equal(c.data.stars[0].lon,123.45);assert.equal(c.data.input,undefined);assert.ok(!JSON.stringify(c).includes('HIDDEN'));assert.throws(()=>snapshot('unknown',{}),/CAPABILITY_UNSUPPORTED/);assert.throws(()=>snapshot('ziwei',{palaces:[]}),/十二宫/);
});
test('hide all four pillars and daily stems, no hidden CSS or recomputation data',()=>{
 const c=snapshot('bazi',{pillars:Array.from({length:4},(_,i)=>({name:['年柱','月柱','日柱','时柱'][i],gan:'甲',zhi:'子'})),dayGan:'甲',input:{solarDate:'1990-05-15'}},{showPillars:false});assert.equal(c.data.pillars,undefined);assert.equal(c.data.dayGan,undefined);assert.ok(c.inferenceNotice.includes('无法保证匿名'));assert.equal(revalidate(c).data.pillars,undefined);
});
