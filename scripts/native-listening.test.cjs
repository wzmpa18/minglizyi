'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../src/lib/localTts.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture(){
  const listeners=new Set(),spoken=[],pendingStops=[];
  let stops=0,delayStop=false,failSpeak=false;
  const emit=state=>{for(const listener of [...listeners])listener({state});};
  const native={
    getStatus:async()=>({ready:true,available:true,voiceName:'system-zh',message:'ready'}),
    listVoices:async()=>({voices:[]}),
    stop:async()=>{stops++;emit('stopped');if(delayStop){delayStop=false;await new Promise(resolve=>pendingStops.push(resolve));}},
    addListener:async(_name,listener)=>{listeners.add(listener);return {remove:async()=>{listeners.delete(listener);}};},
    speak:async options=>{if(failSpeak)throw new Error('Synthetic audio failure');spoken.push(options.text);emit('speaking');return {accepted:true,chunks:1,voiceName:'system-zh'};}
  };
  const exports={};vm.runInNewContext(source,{exports,require:name=>{assert.equal(name,'@capacitor/core');return {Capacitor:{isNativePlatform:()=>true,isPluginAvailable:()=>true,getPlatform:()=> 'ios'},registerPlugin:()=>native};},setTimeout});
  return {api:exports,listeners,spoken,pendingStops,emit,get stops(){return stops;},delayNextStop(){delayStop=true;},failNextSpeak(){failSpeak=true;}};
}
test('native speech reports iOS and an old widget cannot stop newly started playback',async()=>{
  const f=fixture(),first=[],second=[];
  assert.equal((await f.api.getLocalTtsStatus()).source,'ios');
  const cleanupFirst=await f.api.speakLocalText('第一段',0.8,'warmNatural',undefined,e=>first.push(e.state));
  const cleanupSecond=await f.api.speakLocalText('第二段',0.8,'warmNatural',undefined,e=>second.push(e.state));
  assert.deepEqual(first,['speaking','stopped']);assert.equal(f.listeners.size,1);
  const before=f.stops;cleanupFirst();assert.equal(f.stops,before);
  f.emit('finished');assert.deepEqual(second,['speaking','finished']);assert.equal(f.listeners.size,0);
  cleanupSecond();
});
test('a cancelled pending native start neither speaks nor retains a listener',async()=>{
  const f=fixture(),states=[];f.delayNextStop();
  const pending=f.api.speakLocalText('不能迟到播放',0.8,'warmNatural',undefined,e=>states.push(e.state));
  await f.api.stopLocalTts();f.pendingStops.shift()();await pending;
  assert.equal(f.spoken.length,0);assert.equal(f.listeners.size,0);assert.deepEqual(states,['stopped']);
});
test('native audio failure removes the just-added event listener',async()=>{
  const f=fixture();f.failNextSpeak();
  await assert.rejects(f.api.speakLocalText('测试',0.8,'warmNatural'),/Synthetic audio failure/);
  assert.equal(f.listeners.size,0);
});
