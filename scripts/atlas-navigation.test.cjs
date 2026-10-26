const test=require('node:test'),assert=require('node:assert/strict');
const {initialView,AtlasHistory}=require('../src/components/anatomy-atlas/atlasState.ts');
const {atlasReturnHref,newAtlasToken,saveAtlasContext,readAtlasContext,latestAtlasToken}=require('../src/components/anatomy-atlas/atlasNavigation.ts');
const {studyParentHref}=require('../src/lib/studyParentNavigation.ts');
const token='a'.repeat(32),now=10000000;
function storage(){const rows=new Map();return{getItem:key=>rows.get(key)||null,setItem:(key,value)=>rows.set(key,value),removeItem:key=>rows.delete(key),rows};}
function context(){return {schema:1,at:now,snapshot:{view:{...initialView(),point:'SP14',side:-1,hidden:['FJ2810'],faded:['bone']},isolation:null},anatomy:{view:{...initialView(),hidden:['FJ2810'],continuous:true},isolation:null},pose:{position:[1,2,3],target:[0,1,0]},past:[],future:[],quickList:'points',page:'info',panel:false,pinned:true,treeScroll:450,quickScroll:110,expanded:['@system:muscular','thorax'],limits:{muscular:160},query:'胸',pointQuery:'中府'};}
test('detail return round trip keeps anatomical layers, camera, side, history and directory position',()=>{
 const s=storage(),c=context(),history=new AtlasHistory(30);for(let i=0;i<35;i++)history.record({view:{...initialView(),hidden:['part'+i]},isolation:null});Object.assign(c,history.capture());
 assert.equal(saveAtlasContext(s,token,c),true);c.snapshot.view.hidden.push('later');
 const saved=readAtlasContext(s,token,now+3000);assert.deepEqual(saved.snapshot.view.hidden,['FJ2810']);assert.deepEqual(saved.pose,c.pose);assert.equal(saved.snapshot.view.side,-1);assert.equal(saved.quickScroll,110);assert.equal(saved.anatomy.view.continuous,true);assert.deepEqual(saved.expanded,c.expanded);assert.equal(saved.limits.muscular,160);
 const restored=new AtlasHistory(30);restored.restore(saved);assert.equal(restored.undoCount,30);assert.deepEqual(restored.undo(saved.snapshot).view.hidden,['part34']);assert.equal(restored.redoCount,1);
 assert.equal(latestAtlasToken(s),token);assert.equal(readAtlasContext(s,token,now+4*60*60*1000+1),null);
});
test('malformed, missing, oversized and unavailable state never prevents a safe model return',()=>{
 const s=storage();assert.equal(readAtlasContext(s,token,now),null);assert.equal(saveAtlasContext(s,'https://outside.test',context()),false);
 for(const raw of ['{',JSON.stringify({...context(),pose:{position:[NaN,0,0],target:[0,0,0]}}),JSON.stringify({...context(),past:Array(31).fill(context().snapshot)}),' '.repeat(400001)]){s.setItem('yandao-atlas-return-v1:'+token,raw);assert.equal(readAtlasContext(s,token,now),null);}
 assert.equal(saveAtlasContext({getItem(){throw Error()},setItem(){throw Error()},removeItem(){throw Error()}},token,context()),false);
 assert.equal(atlasReturnHref('https://evil.test','腹结',-1),'/zhongyi/anatomy3d/?pointName=%E8%85%B9%E7%BB%93&side=-1');
 assert.match(newAtlasToken(),/^[a-f0-9]{32}$/);
});
test('deep links have a deterministic hierarchy, never an external returnTo or an empty-history dead end',()=>{
 assert.equal(studyParentHref('/zhongyi/meridian/','?acupoint=腹结&atlasReturn='+token),'/zhongyi/anatomy3d/?atlasReturn='+token+'&pointName=%E8%85%B9%E7%BB%93');
 assert.equal(studyParentHref('/zhongyi/meridian/','?acupoint=腹结&returnTo=https://evil.test'),'/zhongyi/meridian/');
 assert.equal(studyParentHref('/zhongyi/meridian/','?meridian=足太阴脾经'),'/zhongyi/meridian/');
 assert.equal(studyParentHref('/zhongyi/meridian/'),'/zhongyi/');assert.equal(studyParentHref('/zhongyi/anatomy3d/'),'/zhongyi/');
 assert.equal(studyParentHref('/profile/settings/'),'/profile/');assert.equal(studyParentHref('/zhongyi/','?'),'/');
});
