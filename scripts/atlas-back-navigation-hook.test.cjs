const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const proofModule={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/studyNavigationProof.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports:proofModule.exports,URLSearchParams,crypto:require('node:crypto').webcrypto,Uint8Array,Date});const proof=proofModule.exports;

function browser({state={__NA:true,tree:{route:'atlas'}},url="/zhongyi/anatomy3d/",throwPush=false,throwBack=false}={}){
 const events=new Map(),rows=[{state,url}],pending=[],storage=new Map();let at=0;
 const window={location:{pathname:'/zhongyi/anatomy3d/',search:''},addEventListener:(name,fn)=>{const list=events.get(name)||new Set();list.add(fn);events.set(name,list);},removeEventListener:(name,fn)=>events.get(name)?.delete(fn),dispatchEvent:event=>{for(const fn of [...events.get(event.type)||[]])fn(event);return true;}};
 window.sessionStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
  const navigate=row=>{const url=new URL(row.url,'https://qa.invalid');window.location.pathname=url.pathname;window.location.search=url.search;};
 window.history={get state(){return rows[at].state;},get length(){return rows.length;},pushState(state,_title,url){if(throwPush)throw Error('history unavailable');rows.splice(at+1);rows.push({state:structuredClone(state),url:url||rows[at].url});at++;navigate(rows[at]);},replaceState(state,_title,url){rows[at]={state:structuredClone(state),url:url||rows[at].url};navigate(rows[at]);},back(){if(throwBack)throw Error('back unavailable');if(!at)return;pending.push(()=>{at--;navigate(rows[at]);window.dispatchEvent({type:'popstate',state:rows[at].state});});}};
 navigate(rows[at]);
 return {window,rows,get index(){return at;},flush(){while(pending.length)pending.shift()();},get pending(){return pending.length;},listeners:name=>events.get(name)?.size||0};
}
function mounted(env,step,scope){const refs=[],callbacks=[];let index=0,effect,cleanup,currentScope=scope;
 const react={useRef:value=>{const id=index++;return refs[id]||(refs[id]={current:value});},useEffect:fn=>{effect=fn;},useCallback:fn=>fn};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/useAtlasBackNavigation.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,window:env.window,require:name=>{if(name==='react')return react;if(name==='@/lib/studyNavigationProof')return proof;throw Error(name);},Math,Date,URLSearchParams});
 const render=next=>{index=0;callbacks.push(exports.useAtlasBackNavigation(next,currentScope));return callbacks.at(-1);};let back=render(step);cleanup=effect();return{get back(){return back;},rerender(next,nextScope=currentScope){if(nextScope!==currentScope){cleanup();currentScope=nextScope;back=render(next);cleanup=effect();}else back=render(next);},strictRemount(){cleanup();cleanup=effect();},unmount(){cleanup();}};
}

test('an actual hook mount preserves router state and consumes exactly one panel/point/scene level per back',()=>{
 const env=browser(),levels=['panel','point','scene'],visited=[];const hook=mounted(env,()=>{visited.push(levels.shift());return levels.length>0;});
 assert.equal(env.window.history.length,2);assert.equal(env.window.history.state.__NA,true);assert.deepEqual(env.window.history.state.tree,{route:'atlas'});
 for(let i=0;i<3;i++){hook.back();hook.back();assert.equal(env.pending,1);env.flush();}
 assert.deepEqual(visited,['panel','point','scene']);hook.unmount();assert.equal(env.listeners('popstate'),0);
});

test('back from a nested image popup or its close button cannot also consume the scene panel',()=>{
 const env=browser();let stepped=0;const hook=mounted(env,()=>{stepped++;return true;});
 const owner=env.window.history.state.__yandaoAtlasScene;
 env.window.history.pushState({...env.window.history.state,__popup:'1'},'');env.window.history.back();env.flush();assert.equal(stepped,0);assert.equal(env.window.history.state.__yandaoAtlasScene,owner);
 hook.back();env.flush();assert.equal(stepped,1);hook.unmount();
});

test('a stale marker on a one-entry direct link is given a new reversible scene entry',()=>{
 const env=browser({state:{__NA:true,__yandaoAtlasScene:1}});let stepped=0;const hook=mounted(env,()=>{stepped++;return false;});assert.equal(env.window.history.length,2);hook.back();env.flush();assert.equal(stepped,1);hook.unmount();
});

test('strict effect replay does not add another entry and callback ref uses the newest UI state',()=>{
 const env=browser();let old=0,current=0;const hook=mounted(env,()=>{old++;return true;});hook.strictRemount();assert.equal(env.window.history.length,2);hook.rerender(()=>{current++;return true;});hook.back();env.flush();assert.equal(old,0);assert.equal(current,1);hook.unmount();
});

test('parent back events are claimed; unavailable history falls back to a direct in-app UI step',()=>{
 const env=browser();let stepped=0;const hook=mounted(env,()=>{stepped++;return true;});env.window.dispatchEvent({type:'zhongyi-back'});assert.equal(env.window.__zhongyiBackHandled,true);env.flush();assert.equal(stepped,1);hook.unmount();assert.equal(env.listeners('zhongyi-back'),0);
 for(const failure of [{throwPush:true},{throwBack:true}]){const unavailable=browser(failure);let called=0;const other=mounted(unavailable,()=>{called++;return false;});other.back();assert.equal(called,1);other.unmount();}
});

test('a pop onto another route is left to the router and unmounted listeners cannot step old UI',()=>{
 const env=browser();let stepped=0;const hook=mounted(env,()=>{stepped++;return true;});env.window.location.pathname='/zhongyi/';env.window.dispatchEvent({type:'popstate',state:{__NA:true}});assert.equal(stepped,0);hook.unmount();env.window.location.pathname='/zhongyi/anatomy3d/';env.window.dispatchEvent({type:'popstate',state:{}});assert.equal(stepped,0);
});

test('explicit reader scope protects a direct detail link and never handles a different query or route',()=>{
 const env=browser({url:'/zhongyi/meridian/?acupoint=A%20B'});let first=0,second=0;
 const hook=mounted(env,()=>{first++;return false;},'/zhongyi/meridian?acupoint=A+B');assert.equal(env.window.history.state.__yandaoStudyScope,'/zhongyi/meridian?acupoint=A+B');
 env.window.history.replaceState(env.window.history.state,'','/zhongyi/meridian/?acupoint=C');env.window.dispatchEvent({type:'popstate',state:{}});env.window.__zhongyiBackHandled=false;env.window.dispatchEvent({type:'zhongyi-back'});assert.equal(first,0);assert.equal(env.window.__zhongyiBackHandled,false);
 hook.rerender(()=>{second++;return false;},'/zhongyi/meridian/?acupoint=C');assert.equal(env.window.history.state.__yandaoStudyScope,'/zhongyi/meridian?acupoint=C');hook.back();env.flush();assert.equal(first,0);assert.equal(second,1);hook.unmount();
});

test('default anatomy scope includes its actual return query and nested reader popups retain the reader',()=>{
 const model=browser({url:'/zhongyi/anatomy3d/?atlasReturn=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'});let modelSteps=0;const modelHook=mounted(model,()=>{modelSteps++;return false;});modelHook.back();model.flush();assert.equal(modelSteps,1);modelHook.unmount();
 const detail=browser({url:'/zhongyi/meridian/?acupoint=SP14'});let readerSteps=0;const detailHook=mounted(detail,()=>{readerSteps++;return false;},'/zhongyi/meridian/?acupoint=SP14');detail.window.history.pushState({...detail.window.history.state,__popup:'1'},'');detail.window.history.back();detail.flush();assert.equal(readerSteps,0);detailHook.back();detail.flush();assert.equal(readerSteps,1);detailHook.unmount();
});


test('three real hook detail trips reuse the model entry and consume a proven detail base once',()=>{
 const env=browser(),modelScope='/zhongyi/anatomy3d/',token='a'.repeat(32),detailScope='/zhongyi/meridian/?acupoint=中府&side=-1&atlasReturn='+token;
 let exited=0,hook=mounted(env,()=>{exited++;return false;});
 for(let round=0;round<3;round++){
  env.window.history.replaceState({...env.window.history.state,[proof.ATLAS_MODEL_TOKEN]:token},'');
  assert.equal(proof.stampAtlasDetail(env.window.sessionStorage,{token,detailHref:detailScope,modelScope,state:env.window.history.state,historyLength:env.window.history.length}),true);
  hook.unmount();env.window.history.pushState({__NA:true,tree:{route:'detail'}},'',detailScope);
  let fallback=0;const reader=mounted(env,()=>{const p=proof.takeAtlasDetailReturn(env.window.sessionStorage,env.window.history.state,detailScope,env.window.history.length);env.window.history.replaceState(proof.withoutStudyNavigation(env.window.history.state),'');if(p)env.window.history.back();else fallback++;return false;},detailScope);
  assert.equal(env.index,3);assert.equal(env.window.history.length,4);assert.ok(env.window.history.state[proof.DETAIL_PROOF]);
  // The image popup has its own hop and must not consume the reader proof.
  env.window.history.pushState({...env.window.history.state,__popup:'1'},'');env.window.history.back();env.flush();assert.equal(env.index,3);assert.equal(fallback,0);
  reader.back();env.flush();assert.equal(env.index,1);assert.equal(fallback,0);reader.unmount();
  assert.equal(proof.atlasModelTokenFromState(env.window.history.state,modelScope,env.window.history.length),token);
  hook=mounted(env,()=>{exited++;return false;});assert.equal(env.index,1);assert.ok(env.window.history.length<=5);assert.equal(exited,0);
 }
 hook.back();env.flush();assert.equal(exited,1);assert.equal(env.index,0);hook.unmount();
});

test('an unproven direct reader back stays on its own base for a controlled parent replace',()=>{
 const env=browser({url:'/zhongyi/meridian/?acupoint=中府&atlasReturn='+'b'.repeat(32)});let fallback=0;
 const hook=mounted(env,()=>{assert.equal(proof.takeAtlasDetailReturn(env.window.sessionStorage,env.window.history.state,env.window.location.pathname+env.window.location.search,env.window.history.length),null);fallback++;return false;},env.window.location.pathname+env.window.location.search);
 hook.back();env.flush();assert.equal(env.index,0);assert.equal(fallback,1);hook.unmount();
});
