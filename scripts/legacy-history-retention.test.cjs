const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
test('legacy web chart history keeps more than 100/200 records; quota failure does not evict older originals',async()=>{
 let full=false;const data=new Map(),localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>{if(full)throw Error('QuotaExceededError');data.set(key,value);},removeItem:key=>data.delete(key)};
 const code=stripTypeScriptTypes(fs.readFileSync('src/lib/nativePaipanStore.ts','utf8').replace(/^import .*from "@capacitor\/core";$/m,''),{mode:'strip'}).replace(/^export /gm,'')+'\nmodule.exports={insertPaipanRecord,listPaipanRecords};';
 const sandbox={module:{exports:{}},console,localStorage,window:{localStorage},Capacitor:{isPluginAvailable:()=>false},registerPlugin:()=>({}),Date,Map,JSON,Promise};vm.runInNewContext(code,sandbox);const store=sandbox.module.exports;
 for(let i=0;i<205;i++)await store.insertPaipanRecord({tool:'bazi',title:'合成档案'+i,input:{i},result:{original:i},note:i===0?'长期原文'.repeat(150):''});
 const rows=await store.listPaipanRecords('bazi');assert.equal(rows.length,205);assert.equal(rows.find(r=>r.input.i===0).note.length,600);const previous=data.get('paipan_records_v1');full=true;await assert.rejects(()=>store.insertPaipanRecord({tool:'bazi',title:'未成功保存',input:{i:206}}));assert.equal(data.get('paipan_records_v1'),previous);
});
