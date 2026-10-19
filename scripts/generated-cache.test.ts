import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generatedCacheBytes,clearGeneratedCache} from '../src/lib/generatedCache';
test('cache cleanup preserves private vault metadata, records, notes, reminders, login and interface choices',()=>{
 const retained={yandao_login_token:'token',yandao_interface_locale:'ja',yandao_calendar_events:'birthday',yandao_life_vaults:'encrypted vault metadata',yandao_chart_notebook:'private note','acupoint-study-draft-v1:me:point':'unsent text',unknown_future_personal_data:'retain'};
 const map=new Map(Object.entries({...retained,yandao_ai_cache_rebuildable:'cached response'}));
 const storage={get length(){return map.size;},key:(i:number)=>[...map.keys()][i]??null,getItem:(key:string)=>map.get(key)??null,removeItem:(key:string)=>{map.delete(key);}};
 assert.ok(generatedCacheBytes(storage)>0);assert.equal(clearGeneratedCache(storage),1);
 assert.deepEqual(Object.fromEntries(map),retained);assert.equal(generatedCacheBytes(storage),0);assert.equal(clearGeneratedCache(storage),0);
});
