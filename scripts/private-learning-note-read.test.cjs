'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module');
function readModule(filename,context){const source=fs.readFileSync(filename,'utf8').replace(/^import .*;\r?\n/gm,'');const code=stripTypeScriptTypes(source).replace(/^export /gm,'');vm.createContext(context);vm.runInContext(code,context);return context;}
test('strict browser draft reads reject unavailable storage instead of returning an empty note',async()=>{
 const api=readModule('src/lib/storageManager.ts',{indexedDB:{open(){throw Error('synthetic storage failure');}},compareVersion:()=>0,Blob,ArrayBuffer,TextEncoder,console});
 await assert.rejects(api.getStrict('OFFLINE_PACK','durable:ni-note-synthetic'),/synthetic storage failure/);
});
test('strict native draft reads preserve read and JSON errors, while an absent file is distinct',async()=>{
 for(const mode of ['absent','malformed','failed']){
  const api=readModule('src/lib/durableOfflineStore.ts',{Capacitor:{isPluginAvailable:()=>true},registerPlugin:()=>({read:async()=>{if(mode==='failed')throw Error('synthetic native read failure');return{value:mode==='absent'?null:'{'};}}),get(){throw Error('wrong adapter');},getStrict(){throw Error('wrong adapter');},put(){},remove(){}});
  if(mode==='absent')assert.equal(await api.readOfflineFileStrict('ni-note-synthetic'),null);
  else await assert.rejects(api.readOfflineFileStrict('ni-note-synthetic'));
 }
});
