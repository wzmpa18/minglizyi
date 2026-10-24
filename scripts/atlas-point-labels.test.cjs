const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),ts=require('typescript');
const {arrangePointLabels,MERIDIAN_COLORS}=require('../src/components/anatomy-atlas/atlasPointLabels.ts');
test('names remain separated and selected names win conflicts without entering controls or screen edges',()=>{
 const items=[{key:'a',x:20,y:150,width:45,height:26,selected:false},{key:'b',x:22,y:151,width:45,height:26,selected:true},{key:'c',x:90,y:150,width:45,height:26,selected:false},{key:'d',x:320,y:150,width:90,height:26,selected:false},{key:'e',x:10,y:50,width:45,height:26,selected:false}];
 assert.deepEqual(arrangePointLabels(items,390,844).map(p=>p.key),['b','c']);assert.equal(items[0].key,'a');assert.deepEqual(arrangePointLabels(items,390,844,42,[{x:0,y:140,width:80,height:70}]).map(p=>p.key),['c']);
});
test('fourteen meridians have distinct bounded colours and more labels fit after zoom',()=>{
 assert.equal(Object.keys(MERIDIAN_COLORS).length,14);assert.equal(new Set(Object.values(MERIDIAN_COLORS)).size,14);for(const c of Object.values(MERIDIAN_COLORS))assert.match(c,/^#[a-f0-9]{6}$/);
 const points=Array.from({length:20},(_,i)=>({key:String(i).padStart(2,'0'),x:20,y:150+i*4,width:40,height:26,selected:false}));const distant=arrangePointLabels(points,390,844),zoomed=arrangePointLabels(points.map(p=>({...p,y:150+(p.y-150)*5})),390,844);assert.ok(zoomed.length>distant.length);
});
test('all 362 actual model identities resolve to existing study pages, including the name variant and extra point',()=>{
 const exports={},source=fs.readFileSync('src/algorithm-core/modules/tcm/meridians.ts','utf8'),code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports,require:n=>{if(n==='./data/meridians.json')return require('../src/algorithm-core/modules/tcm/data/meridians.json');throw Error(n);},console});
 const fixture=require('./fixtures/atlas-point-identities.json');assert.equal(fixture.points.length,362);for(const p of fixture.points){const actual=exports.getAcupointByCode(p.code)||exports.getAcupointByName(p.name);assert.ok(actual,p.code+' '+p.name);assert.equal(exports.getAcupointByName(actual.name).code,actual.code);}
 assert.equal(exports.getAcupointByCode('GV24+').code,'EX-HN3');assert.equal(exports.getAcupointByCode('GV24+').meridian,'经外奇穴');assert.equal(exports.getAcupointByName('瘛脉').code,'TE18');
 for(const point of exports.ACUPOINTS_DB){const meridian=exports.getMeridianByName(point.meridian);assert.ok(meridian,point.code+' must have a real return list');assert.ok(exports.getAcupointsByMeridian(meridian.name).some(p=>p.code===point.code));}
 assert.equal(exports.getMeridianByName('手少阴心经').name,'心经');assert.equal(exports.getMeridianByName('经外奇穴'),undefined);
 assert.equal(exports.ACUPOINTS_DB.length,361);
});
