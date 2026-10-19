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

test('unknown nested birth extensions and a hidden individual pillar never reach the shared JSON',()=>{
 const original={pillars:['甲子','乙丑','丙寅','丁卯'].map((v,i)=>({name:['年柱','月柱','日柱','时柱'][i],gan:v[0],zhi:v[1],birthDate:'SECRET_DATE',extraOwner:{name:'SECRET_NAME'}})),dayGan:'丙',patterns:['PRIVATE_DERIVED']};const c=snapshot('bazi',original,{showPillars:true,visiblePillars:[0,1,3]});assert.equal(c.data.pillars[2].hidden,true);assert.equal(c.data.pillars[2].gan,undefined);assert.equal(c.data.dayGan,undefined);assert.equal(c.data.patterns,undefined);assert.ok(!JSON.stringify(c).includes('SECRET'));assert.deepEqual(revalidate(c).data,c.data);assert.equal(original.pillars[2].gan,'丙');
});

test('additional fixed charts keep real palace values and exclude source counts, place and birth fields',()=>{
 const x=snapshot('xiaoliuren',{month:8,day:15,finalPosition:{name:'大安',wuxing:'木'},monthStop:1,dayStop:2,hourStop:3,steps:[{label:'月上起日',count:15,result:'大安'}],question:'SECRET'});assert.equal(x.data.steps[0].count,undefined);assert.equal(x.data.steps[0].result,'大安');assert.ok(!JSON.stringify(x).includes('SECRET'));assert.deepEqual(revalidate(x).data,x.data);
 const cells=Object.fromEntries(Array.from({length:9},(_,i)=>[i+1,{shan:i+1,xiang:9-i,yun:9,name:'巽',bagua:'巽',stars:['太乙']} ]));const f=snapshot('xuankong-feixing',{zhaiMingData:cells,yunName:'九运',address:'SECRET'});assert.equal(f.data.zhaiMingData[1].shan,1);assert.equal(f.data.zhaiMingData[9].xiang,1);assert.deepEqual(revalidate(f).data,f.data);const t=snapshot('taiyi-sanshi',{gongData:cells,taiyiGong:4,year:1990});assert.equal(t.data.gongData[4].stars[0],'太乙');assert.equal(t.data.year,undefined);
});
test('legacy rule version is explicitly unknown and a known engine version survives revalidation',()=>{const c=snapshot('qizheng',{engineVersion:'qizheng-verified-v3',palaces:[],stars:[]});assert.equal(revalidate(c).engineVersion,'qizheng-verified-v3');assert.equal(snapshot('qizheng',{palaces:[],stars:[]}).engineVersion,'legacy-rule-version-unknown');});
