const test=require('node:test'),assert=require('node:assert/strict');
const {initialView,surfaceStudyView,AtlasHistory}=require('../src/components/anatomy-atlas/atlasState.ts');

test('point study restores intact surface after peeling, isolation and transparency without losing chosen side or clothing',()=>{
 const prior={...initialView(),visible:['muscular','skeletal'],hidden:['FJ2810','FJ2813','some-part'],faded:['other-part'],selected:'bone',isolate:true,isolateIds:['bone'],opacity:.3,continuous:true,section:.8,explode:1,region:'head',underwear:false,flow:true,flowSpeed:1.5};
 const next=surfaceStudyView(prior,{point:'SP14',meridian:'SP',side:-1,points:true,focus:8});
 assert.deepEqual(next.visible,['integumentary','sensory']);assert.deepEqual(next.hidden,['FJ2813']);assert.deepEqual(next.faded,[]);
 assert.equal(next.isolate,false);assert.equal(next.isolateIds,undefined);assert.equal(next.selected,null);assert.equal(next.region,null);assert.equal(next.section,null);assert.equal(next.explode,0);assert.equal(next.opacity,1);assert.equal(next.continuous,false);
 assert.equal(next.point,'SP14');assert.equal(next.side,-1);assert.equal(next.underwear,false);assert.equal(next.flow,true);assert.equal(next.flowSpeed,1.5);
 assert.deepEqual(prior.hidden,['FJ2810','FJ2813','some-part']);assert.equal(prior.continuous,true);
});

test('returning to intact skin is one reversible model edit and cannot mutate the saved anatomical view',()=>{
 const history=new AtlasHistory(),prior={view:{...initialView(),visible:['muscular'],hidden:['FJ2810'],continuous:true},isolation:null};
 history.record(prior);const next={view:surfaceStudyView(prior.view,{meridian:'LU',points:true}),isolation:null};
 next.view.hidden.push('new');const restored=history.undo(next);assert.deepEqual(restored.view.hidden,['FJ2810']);assert.equal(restored.view.continuous,true);assert.deepEqual(restored.view.visible,['muscular']);
 assert.equal(initialView().continuous,false);assert.deepEqual(initialView().visible,['integumentary','sensory']);
});
