const test=require('node:test'),assert=require('node:assert/strict'),T=require('three');
const {AtlasSceneGestures}=require('../src/components/anatomy-atlas/atlasSceneGestures.ts');
const {AtlasGestureTracker}=require('../src/components/anatomy-atlas/atlasInteraction.ts');
function fakeClock(){let time=0,next=0;const jobs=new Map();const add=(fn,ms,repeat)=>{const id=++next;jobs.set(id,{at:time+ms,fn,repeat});return id;};return{now:()=>time,later:(fn,ms)=>add(fn,ms,0),every:(fn,ms)=>add(fn,ms,ms),cancelLater:id=>jobs.delete(id),cancelEvery:id=>jobs.delete(id),advance(ms){const until=time+ms;for(;;){const job=[...jobs].sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!job||job[1].at>until)break;time=job[1].at;if(job[1].repeat)jobs.set(job[0],{...job[1],at:time+job[1].repeat});else jobs.delete(job[0]);job[1].fn();}time=until;},get pending(){return jobs.size;}};}
function harness(continuous=false,pointTarget=false){
 const clock=fakeClock(),meshes=['skin','muscle','bone'].map((name,index)=>{const mesh=new T.Mesh(new T.BoxGeometry(.5,.5,.02),new T.MeshBasicMaterial());mesh.position.z=.3-index*.1;mesh.userData.key=name;mesh.updateMatrixWorld();return mesh;}),ray=new T.Raycaster(),peeled=[],selected=[],progress=[];
 const pick=(x,y,meshOnly)=>{if(pointTarget&&!meshOnly)return {key:"point:LU1",code:"LU1",side:1};ray.set(new T.Vector3(x/100,y/100,2),new T.Vector3(0,0,-1));const hit=ray.intersectObjects(meshes.filter(mesh=>mesh.visible))[0];return hit?{key:hit.object.userData.key,position:hit.point.toArray()}:null;};
 const interaction=new AtlasSceneGestures({tracker:new AtlasGestureTracker(1000),clock,pick,peelOnTap:()=>continuous,onPeel:hit=>{peeled.push({key:hit.key,time:clock.now(),position:hit.position});meshes.find(mesh=>mesh.userData.key===hit.key).visible=false;},onSelect:(hit,kind)=>selected.push({key:hit.key,kind}),onHold:value=>progress.push(value)});
 const pointer=(id=1,x=0,y=0)=>({pointerId:id,clientX:x,clientY:y,button:0});
 return {clock,meshes,peeled,selected,progress,interaction,pointer,pick};
}

test('default hold peels at one second and repeats every 800ms by re-raycasting real visible meshes',()=>{
 const h=harness();h.interaction.pointerDown(h.pointer(),true);h.clock.advance(500);const progress=h.progress.filter(Boolean).at(-1);assert.ok(progress.progress>=.47&&progress.progress<=.51);h.clock.advance(499);assert.equal(h.peeled.length,0);h.clock.advance(1);assert.deepEqual(h.peeled.map(item=>[item.key,item.time]),[['skin',1000]]);h.clock.advance(799);assert.equal(h.peeled.length,1);h.clock.advance(1);h.clock.advance(800);assert.deepEqual(h.peeled.map(item=>[item.key,item.time]),[['skin',1000],['muscle',1800],['bone',2600]]);assert.ok(h.peeled.every(item=>item.position.every(Number.isFinite)));h.clock.advance(800);assert.equal(h.clock.pending,0);h.interaction.pointerUp(h.pointer(),true);assert.equal(h.selected.length,0);
});

test('the delayed peel uses the current ray hit, never the surface cached on initial press',()=>{
 const h=harness();h.interaction.pointerDown(h.pointer(),true);h.clock.advance(600);h.meshes[0].visible=false;h.clock.advance(400);assert.equal(h.peeled[0].key,'muscle');h.interaction.pointerUp(h.pointer(),true);h.clock.advance(5000);assert.equal(h.peeled.length,1);assert.equal(h.selected.length,0);
});

test('ordinary clicks identify, double clicks focus, and continuous mode retains tap-to-peel',()=>{
 const h=harness();h.interaction.pointerDown(h.pointer(),true);h.clock.advance(100);h.interaction.pointerUp(h.pointer(),true);h.clock.advance(100);h.interaction.pointerDown(h.pointer(),true);h.clock.advance(100);h.interaction.pointerUp(h.pointer(),true);assert.deepEqual(h.selected,[{key:'skin',kind:'tap'},{key:'skin',kind:'double'}]);assert.equal(h.peeled.length,0);assert.equal(h.clock.pending,0);
 const continuous=harness(true);continuous.interaction.pointerDown(continuous.pointer(),true);continuous.clock.advance(100);continuous.interaction.pointerUp(continuous.pointer(),true);assert.equal(continuous.peeled[0].key,'skin');assert.equal(continuous.selected.length,0);continuous.clock.advance(5000);assert.equal(continuous.peeled.length,1);
});

test('movement beyond eight pixels cancels permanently even after returning to the original spot',()=>{
 const h=harness();h.interaction.pointerDown(h.pointer(),true);h.clock.advance(500);h.interaction.pointerMove(h.pointer(1,8.01));h.interaction.pointerMove(h.pointer());h.clock.advance(5000);h.interaction.pointerUp(h.pointer(),true);assert.equal(h.peeled.length,0);assert.equal(h.selected.length,0);assert.equal(h.clock.pending,0);
});

test('a second finger on an overlay cancels the hold and cannot rearm it when the second finger lifts',()=>{
 const h=harness();h.interaction.pointerDown(h.pointer(),true);h.clock.advance(900);h.interaction.pointerDown(h.pointer(2,20),false);h.interaction.pointerUp(h.pointer(2,20),false);h.clock.advance(5000);h.interaction.pointerUp(h.pointer(),true);assert.equal(h.peeled.length,0);assert.equal(h.selected.length,0);assert.equal(h.clock.pending,0);
});

test('release, pointercancel and lifecycle stop cancel pending and repeated peels without a late selection',()=>{
 for(const afterFirst of [false,true])for(const method of ['release','outside-release','pointercancel','stop']){
  const h=harness();h.interaction.pointerDown(h.pointer(),true);h.clock.advance(afterFirst?1050:950);
  if(method==='release')h.interaction.pointerUp(h.pointer(),true);else if(method==='outside-release')h.interaction.pointerUp(h.pointer(),false);else if(method==='pointercancel')h.interaction.pointerCancel(h.pointer());else h.interaction.stop();
  const count=h.peeled.length;h.clock.advance(5000);assert.equal(h.peeled.length,count,method);assert.equal(h.clock.pending,0,method);if(afterFirst||method!=='release')assert.equal(h.selected.length,0,method);
 }
});

test('sub-eight-pixel movement keeps the hold and raycasts at the current finger position',()=>{
 const h=harness();h.interaction.pointerDown(h.pointer(),true);h.clock.advance(500);h.interaction.pointerMove(h.pointer(1,8));h.clock.advance(500);assert.equal(h.peeled.length,1);assert.ok(Math.abs(h.peeled[0].position[0]-.08)<1e-6);h.interaction.pointerUp(h.pointer(1,8),true);assert.equal(h.selected.length,0);
});

test('tap-to-peel mode does not turn a point-dot click into an anatomical peel',()=>{
 const h=harness(true,true);h.interaction.pointerDown(h.pointer(),true);h.clock.advance(100);h.interaction.pointerUp(h.pointer(),true);assert.deepEqual(h.selected,[{key:'point:LU1',kind:'tap'}]);assert.equal(h.peeled.length,0);assert.equal(h.clock.pending,0);
});
