const {test}=require('node:test');
const assert=require('node:assert/strict');
const {registerHooks}=require('node:module');
const fs=require('node:fs');
// Node's type stripping needs explicit .ts resolution; the application uses TS bundler resolution.
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return next(specifier+'.ts',context);throw error;}}});
const {LifeVault}=require('../src/lib/lifeVault.ts');
const {LifeSearchIndex,normalizeLifeText,healthPreparation,compareLabUnits,privateOutboundAllowed}=require('../src/lib/lifeRecords.ts');
function memoryStorage(){const rows=new Map();return {rows,async commit(items){for(const row of items)rows.set(row.key,structuredClone(row.value));},async read(key){return structuredClone(rows.get(key));},async page(prefix,after='',limit=100){return [...rows].filter(([key])=>key.startsWith(prefix)&&key>after).sort(([a],[b])=>a.localeCompare(b,'en')).slice(0,limit).map(([key,value])=>({key,value:structuredClone(value)}));}};}
test('long private records, independent vaults, quote provenance, versions and authenticated encryption',async()=>{
 const store=memoryStorage(),{vault,recoveryCode}=await LifeVault.create(store,'a-long-private-password');
 let e=vault.newEntry();e.text='不能飲酒，醫師原文。'.repeat(300);e.title='医生资料';e.sourceRefs.push({kind:'SOURCE_USER_IMPORTED',author:'外部张老师',platform:'本人粘贴',quote:'原话不是我的改写',verified:false});e=await vault.save(e);
 assert.ok(e.text.length>500);const original=e.text;e=await vault.save({...e,text:'我的整理'});assert.equal((await vault.versions(e.id))[0].entry.text,original);assert.equal(e.sourceRefs[1].quote,'原话不是我的改写');
 const serialized=JSON.stringify([...store.rows.values()]);assert.ok(!serialized.includes('医生'));assert.ok(!serialized.includes('外部张老师'));assert.ok(!serialized.includes(original));
 const other=await LifeVault.create(store,'another-long-password');assert.equal(other.vault.entries.size,0);
 vault.lock();assert.equal(vault.entries.size,0);assert.throws(()=>vault.newEntry()&&vault.index.search('医生').ids.length===1); // locked index must not retain text
 await assert.rejects(()=>LifeVault.open(store,vault.id,'wrong-password-long'));
 const recovered=await LifeVault.open(store,vault.id,recoveryCode,true);assert.equal(recovered.entries.get(e.id).text,'我的整理');
 const key=[...store.rows.keys()].find(k=>k.includes(vault.id)&&k.includes(':entry:'));const saved=store.rows.get(key);store.rows.set(key,{...saved,ciphertext:saved.ciphertext.slice(0,-4)+'AAAA'});await assert.rejects(()=>LifeVault.open(store,vault.id,'a-long-private-password'));
});
test('original photo chunk SHA, encrypted backup readback, independent restore, wrong password and tamper rejection',async()=>{
 const store=memoryStorage(),{vault}=await LifeVault.create(store,'a-long-private-password');let entry=vault.newEntry();entry.title='合成就诊样例';entry.text='不含真实患者';
 const file=new File([new Uint8Array(700000).map((_,i)=>i%251)],'synthetic.png',{type:'image/png'});const attachment=await vault.addAttachment(file);assert.equal(attachment.chunks.length,2);entry=await vault.save({...entry,attachments:[attachment]});assert.equal((await vault.attachment(attachment)).size,file.size);
 const backup=await vault.backup('separate-backup-password');assert.ok(!(await backup.text()).includes('合成就诊'));await assert.rejects(()=>LifeVault.inspectBackup(backup,'incorrect-backup-password'));
 const inspected=await LifeVault.inspectBackup(backup,'separate-backup-password');assert.equal(inspected.summary.entries,1);assert.equal(inspected.summary.attachments,1);assert.equal(inspected.summary.remindersRestored,false);
 const second=memoryStorage(),restored=await LifeVault.restore(second,inspected,'second-device-password');const found=restored.vault.entries.get(entry.id);assert.equal(found.ownerProfileId,restored.vault.id);assert.notEqual(restored.vault.id,vault.id);assert.equal(await (await restored.vault.attachment(found.attachments[0])).text(),await file.text());assert.equal(restored.vault.index.search('就诊').total,1);
 const data=JSON.parse(await backup.text());data.schema=2;await assert.rejects(()=>LifeVault.inspectBackup(new Blob([JSON.stringify(data)]),'separate-backup-password'));
 await assert.rejects(()=>vault.addAttachment(new File(['<script>bad</script>'],'bad.svg',{type:'image/svg+xml'})));
});
test('short Chinese and traditional matching, aliases, OCR and no medical near-word substitutions',()=>{
 const index=new LifeSearchIndex();index.put('one','医生说不能喝酒 张老师 血糖 5.1 mmol/L');index.put('two','胃不舒服，胃痛，刘大夫');index.put('three','阿莫西林');
 assert.equal(normalizeLifeText('醫師說飲酒'),'医师说饮酒');assert.deepEqual(index.search('醫生 不能').ids,['one']);assert.deepEqual(index.search('胃').ids,['two']);assert.equal(index.search('阿莫西').total,1);assert.equal(index.search('阿司匹林').total,0);index.remove('one');assert.equal(index.search('喝酒').total,0);
 assert.equal(compareLabUnits({kind:'lab',unit:'mg/dL'},{kind:'lab',unit:'mmol/L'}),false);assert.equal(privateOutboundAllowed('PRIVATE_LOCAL','EXPLICIT_SHARED_COPY'),false);
});
test('doctor preparation excludes dreams, chart comments and unconfirmed medical text',async()=>{
 const {vault}=await LifeVault.create(memoryStorage(),'a-long-private-password'),a=vault.newEntry(),b=vault.newEntry(),c=vault.newEntry();a.text='梦到危险';a.categories=['梦境'];b.health={kind:'medicine',confirmedText:'未核实剂量'};c.health={kind:'visit',confirmedText:'本人已核对原文',confirmedAt:new Date().toISOString(),questions:'复查何时'};
 const text=healthPreparation([a,b,c]);assert.ok(text.includes('本人已核对原文'));assert.ok(!text.includes('梦到危险'));assert.ok(!text.includes('未核实剂量'));assert.ok(text.includes('不是医院病历'));
});
test('private data modules do not import cloud/auth/AI/analytics clients',()=>{
 for(const name of ['lifeRecords.ts','lifeVault.ts','lifeVaultCrypto.ts']){const source=fs.readFileSync('src/lib/'+name,'utf8');assert.ok(!/\bfetch\s*\(|axios|sendBeacon|aiService|socialApi|fetchWithAuth/.test(source),name);}
});
test('1k / 10k / 100k synthetic short-record local index benchmark',()=>{
 const results=[];for(const n of [1000,10000,100000]){const index=new LifeSearchIndex(),start=performance.now();for(let i=0;i<n;i++)index.put(String(i),`合成记录${i} 医生 样例${i%100} ${i===n-1?'唯一复查资料':'普通学习'} 2026-10-19`);const indexed=performance.now();assert.equal(index.search('唯一 复查').total,1);const cold=performance.now();for(let i=0;i<20;i++)assert.equal(index.search('唯一 复查').total,1);const hot=performance.now();index.put(String(n-1),'合成改写 唯一新资料');assert.equal(index.search('复查').total,0);results.push({records:n,indexMs:Math.round(indexed-start),firstQueryMs:+(cold-indexed).toFixed(3),hotMeanMs:+((hot-cold)/20).toFixed(3),indexStats:index.stats(),rss:process.memoryUsage().rss});index.clear();}
 console.log('SYNTHETIC_INDEX_BENCHMARK '+JSON.stringify({platform:process.platform,node:process.version,results,scope:'RAM search index; not native SQLite throughput, OCR, physical device energy or disk benchmark'}));
});
