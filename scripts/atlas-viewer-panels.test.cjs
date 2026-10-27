'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const base=path.join(__dirname,'../src/components/anatomy-atlas');
function compile(file,require){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(base,file),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require,console,Set,Map,Array,Number,Math,Date,JSON,URLSearchParams});return exports;}
const state=compile('atlasState.ts',()=>{throw Error('Unexpected state dependency');});
const routes=[{id:'CHONG',name:'冲脉',routeKind:'classical-surface-schematic',description:'体表示意',omitted:'不展示内行',sourceBookId:'li-qijing-bamai-original',sourceChapterId:'li-qijing-bamai-original-9',sourceChapterTitle:'冲脉',anchorCodes:['LU1']}];
const data={atlas:{parts:[],concepts:[]},surface:{points:[],paths:[]},points:[{code:'LU1',name:'中府',pinyin:'zhong fu',meridianId:'LU',meridian:'手太阴肺经',midline:false},{code:'ST36',name:'足三里',meridianId:'ST',meridian:'足阳明胃经'}],files:{}};
const jsx=(type,props,key)=>({type,props:props||{},key});
function nodes(tree,type){const result=[];function walk(v){if(Array.isArray(v)){v.forEach(walk);return;}if(!v||typeof v!=='object')return;if(v.type===type)result.push(v);walk(v.props?.children);}walk(tree);return result;}
function text(v){if(v==null||typeof v==='boolean')return'';if(Array.isArray(v))return v.map(text).join('');return typeof v==='object'?text(v.props?.children):String(v);}
/** Execute the actual Viewer render and handlers. Environment/data loading
 * effects are omitted here; full DOM/layout/pointer acceptance uses the browser
 * script against the real Next build and source geometry. */
function mount(){
 const slots=[];let cursor=0,dirty=false,tree;const scene='ActualSceneBoundary';
 const react={useState(initial){const id=cursor++;if(!slots[id])slots[id]={value:typeof initial==='function'?initial():initial};const s=slots[id];return[s.value,next=>{const v=typeof next==='function'?next(s.value):next;if(!Object.is(s.value,v)){s.value=v;dirty=true;}}];},useRef(initial){const id=cursor++;return(slots[id]??={value:{current:initial}}).value;},useEffect(){cursor++;},useMemo(fn,deps){const id=cursor++,old=slots[id];if(!old||deps.some((v,i)=>!Object.is(v,old.deps[i])))slots[id]={value:fn(),deps};return slots[id].value;}};
 const noop=()=>{},index={units:[],parts:[],byId:new Map(),unitId:id=>id};
 const mods={react,'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'Fragment'},'next/link':{__esModule:true,default:'a'},'next/navigation':{useRouter:()=>({replace:noop})},'@/hooks/useBodyScrollLock':{useBodyScrollLock:noop},'@/hooks/useAtlasBackNavigation':{useAtlasBackNavigation:fn=>fn},'./AtlasScene':{__esModule:true,default:scene},'./atlasState':state,'./atlasPack':{chineseName:u=>u.zhName||u.name,SYSTEMS:[['integumentary','体表','#ccc','概述']],openAtlas:noop,installAtlas:noop,AtlasAccessError:Error},'./atlasStructureTree':{buildStructureIndex:()=>index,unitStatus:()=> 'visible'},'./atlasInteraction':{BODY_REGIONS:[]},'./atlasPointLabels':{meridianColor:()=> '#abc',displayPointCode:v=>v,displayPointName:v=>v},'./atlasMeridianRoutes':{getAtlasRouteCatalogue:()=>routes},'./atlasNavigation':{},'@/lib/studyNavigationProof':{},'./atlasViewerStyles':compile('atlasViewerStyles.ts',noop),'./atlasViewerInteraction':{installAtlasTextActionGuard:noop},'@/algorithm-core/modules/tcm/meridians':{getAcupointByName:()=>null,getAcupointByCode:()=>null,loadFullMeridiansDatabase:()=>Promise.resolve()},'@/algorithm-core/modules/tcm/point-study':{getPointStudy:()=>[]},'@/components/AcupointClassicStudy':{AcupointClassicStudy:'ClassicStudy'},'@/components/MedicalStudyReadings':{MedicalStudyReadings:'StudyReadings'},'@/lib/tcmScraper':{triggerScrape:()=>null}};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(base,'AtlasViewer.tsx'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>{if(!(name in mods))throw Error('Unexpected Viewer dependency '+name);return mods[name];},window:{innerWidth:390},console,Set,Map,Array,Number,Math,Date,JSON,URLSearchParams});
 function render(){let loops=0;do{dirty=false;cursor=0;tree=exports.default({previewData:data});assert.ok(++loops<10);}while(dirty);}
 function act(fn){fn();render();}
 render();
 return{get tree(){return tree;},get scene(){return nodes(tree,scene)[0].props;},act,button(label){const rows=nodes(tree,'button').filter(n=>n.props['aria-label']===label);assert.equal(rows.length,1,'one '+label);return rows[0];},click(label){act(()=>this.button(label).props.onClick());},byText(value){const rows=nodes(tree,'button').filter(n=>text(n)===value);assert.equal(rows.length,1,'one button '+value);return rows[0];},get stage(){return nodes(tree,'div').find(n=>n.props.className==='atlas-stage');},get side(){return nodes(tree,'aside')[0];}};
}

test('settings and tools use the actual single sidebar; opening one closes the right directory',()=>{
 const h=mount();assert.equal(h.stage.props['data-sidebar'],'right');h.click('打开模型显示设置');assert.equal(h.stage.props['data-sidebar'],'left');assert.equal(h.side.props['data-page'],'settings');assert.equal(nodes(h.tree,'nav').filter(n=>n.props.className==='atlas-quick-list').length,0);
 h.click('打开模型操作工具');assert.equal(h.side.props['data-page'],'tools');for(const name of ['撤销','重做','恢复隐藏','视角复位','完整体表','经络穴位','开启剥离','隐藏头发','透明、截面与分层'])h.byText(name);assert.equal(nodes(h.tree,'details').length,0,'no uncontrolled floating tool details');
 h.click('打开经络目录');assert.equal(h.side.props.hidden,true);assert.equal(h.stage.props['data-sidebar'],'right');
});
test('the real scene completion callback collapses all directories without changing view or history',()=>{
 const h=mount();h.click('打开模型显示设置');const before=JSON.stringify(h.scene.state);h.act(()=>h.scene.onModelInteraction());assert.equal(h.stage.props['data-sidebar'],'none');assert.equal(h.side.props.hidden,true);assert.equal(JSON.stringify(h.scene.state),before);h.button('打开经络目录');h.button('打开模型操作工具');
 h.click('打开模型操作工具');assert.equal(h.byText('撤销').props.disabled,true,'closing panels did not create a model undo step');
});
test('a pinned directory still collapses on model interaction, and search/selection survive',()=>{
 const h=mount();h.click('查找经络与穴位');const input=nodes(h.tree,'input').find(n=>n.props['aria-label']==='搜索穴名或编号');h.act(()=>input.props.onChange({target:{value:'中府'}}));const pin=nodes(h.side,'input').find(n=>n.props.type==='checkbox');h.act(()=>pin.props.onChange({target:{checked:true}}));
 h.act(()=>h.scene.onPoint('LU1',-1));h.act(()=>h.scene.onModelInteraction());assert.equal(h.scene.state.point,'LU1');assert.equal(h.scene.state.side,-1);assert.equal(h.stage.props['data-sidebar'],'none');assert.ok(nodes(h.tree,'article').some(n=>n.props['data-atlas-point-summary']!==undefined));h.click('查找经络与穴位');assert.equal(nodes(h.tree,'input').find(n=>n.props['aria-label']==='搜索穴名或编号').props.value,'中府');assert.equal(nodes(h.side,'input').find(n=>n.props.type==='checkbox').props.checked,true);
});
test('closing a tool panel never changes a valid operation or its reversible history',()=>{
 const h=mount();h.click('打开模型操作工具');h.act(()=>h.byText('开启剥离').props.onClick());assert.equal(h.scene.state.continuous,true);const before=JSON.stringify(h.scene.state);h.act(()=>h.scene.onModelInteraction());assert.equal(JSON.stringify(h.scene.state),before);h.click('打开模型操作工具');assert.equal(h.byText('撤销').props.disabled,false);h.act(()=>h.byText('撤销').props.onClick());assert.equal(h.scene.state.continuous,false);h.act(()=>h.byText('重做').props.onClick());assert.equal(h.scene.state.continuous,true);
});
test('classical route choices show only provided existing point anchors and preserve the active route on selection',()=>{
 const h=mount();h.act(()=>h.byText('冲脉').props.onClick());assert.equal(h.scene.state.meridian,'CHONG');assert.ok(nodes(h.tree,'article').some(n=>n.props['aria-label']==='冲脉经典循行说明'));assert.equal(nodes(h.tree,'button').filter(n=>n.props.className==='atlas-quick-item').map(text).join('/'),'中府');h.act(()=>h.byText('中府').props.onClick());assert.equal(h.scene.state.meridian,'CHONG');assert.equal(h.scene.state.point,'LU1');h.act(()=>h.scene.onModelInteraction());assert.equal(h.scene.state.meridian,'CHONG');assert.equal(h.scene.state.point,'LU1');
});

const guard=compile('atlasViewerInteraction.ts',()=>{throw Error('Unexpected guard dependency');});
function target({stage=true,editable=false,button=false,copyable=false,inside=true,text=false}={}){const element={nodeType:1,inside,closest(selector){if(selector==='.atlas-stage')return stage?this:null;if(selector.startsWith('input,'))return editable?this:null;if(selector.startsWith('button,'))return button?this:null;if(selector==='[data-atlas-copyable]')return copyable?this:null;throw Error('Unexpected guard selector '+selector);}};return text?{nodeType:3,parentElement:element}:element;}
const root={contains:e=>e.inside};
test('model canvas, text labels and control buttons suppress native copy/search menus only inside the stage',()=>{
 for(const t of [target(),target({button:true}),target({button:true,copyable:true}),target({text:true})])assert.equal(guard.allowAtlasTextAction(root,t),false);
 assert.equal(guard.allowAtlasTextAction(root,target({stage:false})),true);assert.equal(guard.allowAtlasTextAction(root,target({inside:false})),true);
});
test('real reading paragraphs, text nodes, links and form editing keep their native text actions',()=>{
 for(const t of [target({editable:true}),target({editable:true,button:true}),target({copyable:true}),target({copyable:true,text:true})])assert.equal(guard.allowAtlasTextAction(root,t),true);
});
test('native guard installs no pointer/touch/wheel handler and detaches exact capture listeners',()=>{
 const handlers=new Map(),removed=[];const host={...root,addEventListener(type,fn,capture){assert.equal(capture,true);handlers.set(type,fn);},removeEventListener(type,fn,capture){assert.equal(handlers.get(type),fn);assert.equal(capture,true);removed.push(type);}};const dispose=guard.installAtlasTextActionGuard(host);assert.deepEqual([...handlers.keys()],['selectstart','contextmenu']);let prevented=0;handlers.get('contextmenu')({target:target(),preventDefault(){prevented++;}});handlers.get('selectstart')({target:target({copyable:true}),preventDefault(){prevented++;}});assert.equal(prevented,1);dispose();assert.deepEqual(removed,['selectstart','contextmenu']);
});
test('tools directory and viewport-aware camera restore persist while invalid aspect values are rejected',()=>{
 const nav=compile('atlasNavigation.ts',()=>{}),token='a'.repeat(32),values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const snapshot={view:state.initialView(),isolation:null},context={schema:1,at:1000,snapshot,pose:{position:[0,1,3],target:[0,1,0],aspect:.27},past:[],future:[],quickList:'closed',page:'tools',panel:true,pinned:false,treeScroll:0,quickScroll:0};
 assert.equal(nav.saveAtlasContext(storage,token,context),true);assert.equal(nav.readAtlasContext(storage,token,1000).pose.aspect,.27);assert.equal(nav.readAtlasContext(storage,token,1000).page,'tools');
 for(const aspect of [0,-1,21,'0.5',null,Infinity])assert.equal(nav.saveAtlasContext(storage,token,{...context,pose:{...context.pose,aspect}}),false);
 const legacy={...context,pose:{position:[0,1,3],target:[0,1,0]}};assert.equal(nav.saveAtlasContext(storage,token,legacy),true);assert.equal(nav.readAtlasContext(storage,token,1000).pose.aspect,undefined);
});
