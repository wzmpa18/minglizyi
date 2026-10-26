const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript');

function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}

/** Run the actual component with controlled asynchronous retention and React's
 * state/ref/effect lifecycle. No reimplementation of its image state machine. */
function mount(initialProps){
 const slots=[],requests=[],commits=[];let cursor=0,dirty=false,live=true,props=initialProps,tree,pending=[],passive=[];
 const react={
  useState(initial){const id=cursor++;if(!slots[id])slots[id]={value:typeof initial==='function'?initial():initial};const slot=slots[id];return[slot.value,next=>{if(!live)return;const value=typeof next==='function'?next(slot.value):next;if(!Object.is(value,slot.value)){slot.value=value;dirty=true;}}];},
  useRef(initial){const id=cursor++;if(!slots[id])slots[id]={value:{current:initial}};return slots[id].value;},
  useEffect(create,deps){const id=cursor++,old=slots[id];if(!old||!deps||!old.deps||deps.some((value,index)=>!Object.is(value,old.deps[index]))||deps.length!==old.deps.length){const next={deps,cleanup:old?.cleanup};slots[id]=next;pending.push(()=>{next.cleanup?.();next.cleanup=create();});}},
  useCallback(fn,deps){const id=cursor++,old=slots[id];if(!old||!deps||deps.some((value,index)=>!Object.is(value,old.deps?.[index])))slots[id]={deps,value:fn};return slots[id].value;},
 };
 const jsx=(type,props,key)=>({type,props:props||{},key}),exports={};
 const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/components/StudyImage.tsx'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(source,{exports,console,URL,Error,Promise,require:name=>{
  if(name==='react')return react;
  if(name==='react/jsx-runtime')return{jsx,jsxs:jsx,Fragment:Symbol.for('test.fragment')};
  if(name==='@/lib/studyMedia')return{bundledStudyMedia:{records:[{path:'/assets/meridians/lung.webp'}]},retainedStudyImage:src=>{const call={src,...deferred()};requests.push(call);return call.promise;}};
  throw Error('Unexpected component dependency: '+name);
 }});
 const flushPassive=()=>{for(const effect of passive.splice(0))effect();};
 const render=(deferEffects=false)=>{cursor=0;dirty=false;pending=[];tree=exports.StudyImage(props);commits.push(tree);passive.push(...pending);if(!deferEffects)flushPassive();};
 render();
 return{
  get tree(){return tree;},requests,commits,
  update(next,{deferEffects=false}={}){flushPassive();props={...props,...next};render(deferEffects);},
  async flush(){for(let i=0;i<12;i++){if(live)flushPassive();await Promise.resolve();if(live&&dirty)render();}},
  unmount(){live=false;dirty=false;passive=[];for(const slot of slots)slot.cleanup?.();},
 };
}
function nodes(tree,type){const out=[];function visit(value){if(Array.isArray(value)){value.forEach(visit);return;}if(!value||typeof value!=='object')return;if(value.type===type)out.push(value);visit(value.props?.children);}visit(tree);return out;}
function text(tree){if(tree===null||tree===undefined||typeof tree==='boolean')return'';if(Array.isArray(tree))return tree.map(text).join('');return typeof tree==='object'?text(tree.props?.children):String(tree);}
function retry(tree){const buttons=nodes(tree,'button').filter(node=>/重试|重新(?:加载|读取)/.test(text(node)));assert.equal(buttons.length,1,'one explicit retry action is available');let prevented=0,stopped=0;buttons[0].props.onClick({preventDefault(){prevented++;},stopPropagation(){stopped++;}});assert.equal(prevented,1);assert.equal(stopped,1);}

const privateA='/assets/acupoint-photos/atlas-lan-sp14.jpg',privateB='/assets/acupoint-photos/dong-wm-11-01.jpg',publicA='/assets/meridians/lung.webp';
const dataA='data:image/jpeg;base64,c3R1ZHktaW1hZ2UtYQ==',dataB='data:image/jpeg;base64,c3R1ZHktaW1hZ2UtYg==';

test('a private initial image renders a loading placeholder without an empty or unverified img',async()=>{
 const view=mount({src:privateA+'?v=1',alt:'腹结定位图'});
 assert.equal(nodes(view.tree,'img').length,0);assert.ok(text(view.tree).trim().length>0,'loading state is visible');assert.doesNotMatch(text(view.tree),/已保存/);
 await view.flush();assert.equal(view.requests.length,1);assert.equal(view.requests[0].src,privateA);assert.equal(nodes(view.tree,'img').length,0);view.unmount();
});

test('a verified retained data image becomes visible and alone earns the saved label',async()=>{
 let retained=0;const view=mount({src:privateA,alt:'腹结定位图',className:'study-figure',onRetained:()=>retained++});
 view.requests[0].resolve(dataA);await view.flush();const image=nodes(view.tree,'img');assert.equal(image.length,1);assert.equal(image[0].props.src,dataA);assert.equal(image[0].props.alt,'腹结定位图');assert.equal(image[0].props.className,'study-figure');assert.match(text(view.tree),/已保存.*离线/);assert.equal(retained,1);view.unmount();
});

test('a failed private image offers an explicit retry and can recover without a component remount',async()=>{
 let retained=0;const view=mount({src:privateA,onRetained:()=>retained++});
 view.requests[0].reject(Error('simulated archive is temporarily unavailable'));await view.flush();assert.equal(nodes(view.tree,'img').length,0);assert.doesNotMatch(text(view.tree),/已保存/);assert.equal(retained,0);
 retry(view.tree);await view.flush();assert.equal(view.requests.length,2);assert.equal(view.requests[1].src,privateA);view.requests[1].resolve(dataA);await view.flush();assert.equal(nodes(view.tree,'img')[0].props.src,dataA);assert.match(text(view.tree),/已保存/);assert.equal(retained,1);view.unmount();
});

test('successful public local pixels survive a later persistence failure without a false saved claim',async()=>{
 let retained=0,loaded=0,errors=0;const view=mount({src:publicA,alt:'肺经循行',onRetained:()=>retained++,onLoad:()=>loaded++,onError:()=>errors++});
 const local=nodes(view.tree,'img')[0];assert.equal(local.props.src,publicA);local.props.onLoad?.({currentTarget:{src:publicA,naturalWidth:640,naturalHeight:900}});await view.flush();
 view.requests[0].reject(Error('simulated disk write/readback failure'));await view.flush();assert.equal(nodes(view.tree,'img')[0].props.src,publicA);assert.doesNotMatch(text(view.tree),/已保存/);assert.equal(retained,0);assert.equal(loaded,1);assert.equal(errors,0);view.unmount();
});

test('an old source resolving after the new source cannot replace its pixels or saved callback',async()=>{
 let oldRetained=0,newRetained=0;const view=mount({src:privateA,onRetained:()=>oldRetained++});const old=view.requests[0];
 view.update({src:privateB,onRetained:()=>newRetained++});await view.flush();assert.equal(view.requests.length,2);assert.equal(nodes(view.tree,'img').length,0);
 view.requests[1].resolve(dataB);await view.flush();assert.equal(nodes(view.tree,'img')[0].props.src,dataB);assert.equal(newRetained,1);
 old.resolve(dataA);await view.flush();assert.equal(nodes(view.tree,'img')[0].props.src,dataB);assert.equal(oldRetained,0);assert.equal(newRetained,1);view.unmount();
});

test('changing src hides prior retained pixels immediately and late failures cannot poison the new image',async()=>{
 const view=mount({src:privateA});view.requests[0].resolve(dataA);await view.flush();assert.equal(nodes(view.tree,'img')[0].props.src,dataA);
 view.update({src:privateB});assert.equal(nodes(view.tree,'img').length,0,'the render before the replacement effect must not display old pixels');await view.flush();view.requests[1].resolve(dataB);await view.flush();assert.equal(nodes(view.tree,'img')[0].props.src,dataB);
 view.update({src:privateA});await view.flush();const delayed=view.requests[2];view.update({src:privateB});await view.flush();view.requests[3].resolve(dataB);await view.flush();delayed.reject(Error('stale source failure'));await view.flush();assert.equal(nodes(view.tree,'img')[0].props.src,dataB);assert.equal(nodes(view.tree,'button').filter(node=>/重试|重新(?:加载|读取)/.test(text(node))).length,0);view.unmount();
});

test('unmounted requests cannot call the latest retained callback or render new pixels',async()=>{
 let called=0;const view=mount({src:privateA,onRetained:()=>called++});const last=view.tree;view.unmount();view.requests[0].resolve(dataA);await view.flush();assert.equal(view.tree,last);assert.equal(called,0);
});



test('a previous request cannot claim a new image before passive effect cleanup gets its turn',async()=>{
 let oldRetained=0,newRetained=0;const view=mount({src:privateA,onRetained:()=>oldRetained++});
 try{
  const old=view.requests[0];view.update({src:privateB,onRetained:()=>newRetained++},{deferEffects:true});assert.equal(nodes(view.tree,'img').length,0);
  old.resolve(dataA);await Promise.resolve();await Promise.resolve();assert.equal(oldRetained,0);assert.equal(newRetained,0,'old Promise must not fire the current source saved callback before cleanup');
  await view.flush();view.requests[1].resolve(dataB);await view.flush();assert.equal(nodes(view.tree,'img')[0].props.src,dataB);assert.equal(newRetained,1);
 }finally{view.unmount();}
});
