const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const IDS=['tcm-anatomy-3d-v2','tcm-anatomy-atlas-v3'];
function fixture(){
 const state={installed:new Map(),calls:[],validated:[],confirmations:0,cellular:true,fail:'',incompatible:false,missing:false};
 const packs=IDS.map((packId,i)=>({packId,version:'2.0.0',size:(i+1)*10,sha256:packId,name:packId,largePack:true}));
 const api={fetchManifest:async()=>({packs:state.missing?packs.slice(0,1):packs}),checkUpdates:async(_version,catalogue)=>catalogue.packs.map(manifestPack=>({packId:manifestPack.packId,manifestPack,installed:state.installed.get(manifestPack.packId),action:state.incompatible?'INCOMPATIBLE':state.installed.get(manifestPack.packId)?.version===manifestPack.version?'UP_TO_DATE':state.installed.has(manifestPack.packId)?'UPDATE':'INSTALL'})),needsUserConfirmation:()=>state.cellular,
  downloadPack:async(pack,progress,validate)=>{state.calls.push(pack.packId);if(state.fail===pack.packId)return {ok:false,error:'下载中断',accessAction:'membership'};progress(pack.size/2,pack.size);try{await validate(new ArrayBuffer(pack.size));}catch(e){return {ok:false,error:e.message};}state.installed.set(pack.packId,{packId:pack.packId,version:pack.version,sha256:pack.sha256});progress(pack.size,pack.size);return {ok:true};}};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/anatomyLearningBundle.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,ArrayBuffer,window:{confirm:()=>{state.confirmations++;return state.consent!==false;}},require:name=>{
  if(name==='./offlinePackClient')return api;if(name==='./releaseFeatures')return {CLIENT_VERSION:'25.0.115'};
  if(name==='./anatomy3dPack')return {decodeAnatomyPack:async()=>{state.validated.push(IDS[0]);if(state.corrupt)throw Error('模型校验失败');}};
  if(name==='../components/anatomy-atlas/atlasPack')return {decodeAtlas:async()=>{state.validated.push(IDS[1]);if(state.corrupt)throw Error('图谱校验失败');}};
  throw Error('Unexpected import '+name);
 }});return {state,api,exports,packs};
}
test('one action installs and schema-validates both resources with one cellular consent and combined progress',async()=>{
 const f=fixture(),progress=[];await f.exports.downloadCompleteAnatomy((n,t)=>progress.push([n,t]));
 assert.deepEqual(f.state.calls,IDS);assert.deepEqual(f.state.validated,IDS);assert.equal(f.state.confirmations,1);
 assert.deepEqual(progress.at(-1),[30,30]);assert.ok(progress.every(([n,t],i)=>t===30&&n<=t&&(!i||n>=progress[i-1][0])));assert.equal(f.state.installed.size,2);
});
test('existing complete downloads are reused without redownload or a second consent',async()=>{
 const f=fixture();for(const p of f.packs)f.state.installed.set(p.packId,{version:p.version});await f.exports.downloadCompleteAnatomy();assert.equal(f.state.calls.length,0);assert.equal(f.state.confirmations,0);
});
test('one existing half means only the missing resource is fetched',async()=>{
 const f=fixture();f.state.installed.set(IDS[0],{version:'2.0.0'});let last;await f.exports.downloadCompleteAnatomy((...p)=>last=p);assert.deepEqual(f.state.calls,[IDS[1]]);assert.deepEqual(last,[20,20]);
});
test('a failed second transfer preserves completed and older data; retry fetches only the remaining resource',async()=>{
 const f=fixture();f.state.installed.set(IDS[1],{version:'1.0.0'});f.state.fail=IDS[1];await assert.rejects(f.exports.downloadCompleteAnatomy(),e=>e.action==='membership'&&e.message.includes('只补齐'));
 assert.equal(f.state.installed.get(IDS[0]).version,'2.0.0');assert.equal(f.state.installed.get(IDS[1]).version,'1.0.0');f.state.fail='';f.state.calls=[];await f.exports.downloadCompleteAnatomy();assert.deepEqual(f.state.calls,[IDS[1]]);
});
test('missing catalogue member, incompatible client, cancelled consent and corrupt data never activate partial invalid content',async()=>{
 for(const scenario of ['missing','incompatible','cancel','corrupt']){const f=fixture();if(scenario==='cancel')f.state.consent=false;else f.state[scenario]=true;await assert.rejects(f.exports.downloadCompleteAnatomy());assert.equal(f.state.installed.size,0);if(scenario!=='corrupt')assert.equal(f.state.calls.length,0);}
});
test('overlapping viewer actions share one transfer and notify both observers',async()=>{
 const f=fixture(),a=[],b=[];await Promise.all([f.exports.downloadCompleteAnatomy((n,t)=>a.push([n,t])),f.exports.downloadCompleteAnatomy((n,t)=>b.push([n,t]))]);assert.deepEqual(f.state.calls,IDS);assert.deepEqual(a.at(-1),[30,30]);assert.deepEqual(b.at(-1),[30,30]);
});
test('the offline centre presents one complete item and does not advertise a partly installed bundle as complete',async()=>{
 const f=fixture();let plans=await f.api.checkUpdates('25.0.115',{packs:f.packs});let p=f.exports.anatomyBundlePlan(plans);assert.equal(p.action,'INSTALL');assert.equal(p.manifestPack.size,30);assert.equal(p.manifestPack.name,'完整三维学习资料');f.state.installed.set(IDS[0],{version:'2.0.0'});plans=await f.api.checkUpdates('25.0.115',{packs:f.packs});assert.equal(f.exports.anatomyBundlePlan(plans).action,'UPDATE');assert.equal(f.exports.anatomyBundlePlan(plans.slice(0,1)),null);
});
