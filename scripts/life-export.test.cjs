const {test}=require('node:test'),assert=require('node:assert/strict');
const {registerHooks}=require('node:module');
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return next(specifier+'.ts',context);throw error;}}});
const {lifeExportProjection,DEFAULT_LIFE_EXPORT_PRIVACY}=require('../src/lib/lifeExportPrivacy.ts');
const {buildLifeExport}=require('../src/lib/lifeExport.ts');
const {validateLifeEntry}=require('../src/lib/lifeRecords.ts');
function fixture(){return {schema:1,id:'local-record-0001',ownerProfileId:'local-owner-0001',dataClass:'PRIVATE_LOCAL',consentScope:'LOCAL_ONLY',title:'李某复盘',text:'李某在甲医院于2026-10-19记录，号码13812345678，邮箱case@example.test，https://example.test/private。额外身份线索。<script>不执行</script>',occurredAt:'2026-10-19T12:30:00Z',createdAt:'2026-10-19T13:00:00Z',updatedAt:'2026-10-19T13:00:00Z',categories:['健康记录'],tags:[],people:['李某'],sourceRefs:[{kind:'CHAT_QUOTE',author:'受限原作者',quote:'不得导出原话',exportAllowed:false},{kind:'CHAT_QUOTE',author:'获准原作者',quote:'获准原话',exportAllowed:true}],chartRefs:[{tool:'bazi',version:'private-chart',record:{permissions:{export:false},private:'受限盘内容'}}],health:{kind:'visit',hospital:'甲医院',doctor:'张医生',confirmedText:'本人核对内容',confirmedAt:'2026-10-19T13:00:00Z'},attachments:[{id:'photo-local-0001',name:'李某病历.png',type:'image/png',bytes:1,sha256:'a'.repeat(64),chunks:['blob:private-photo']}],revision:1};}
test('default preview removes people, institution, dates, contacts and local attachment/source IDs without rewriting original',()=>{
 const entry=fixture(),before=structuredClone(entry),settings={...DEFAULT_LIFE_EXPORT_PRIVACY,extraWords:'额外身份线索'};
 const out=JSON.stringify(lifeExportProjection([entry],settings));
 for(const secret of ['李某','甲医院','张医生','2026-10-19','13812345678','case@example.test','https://example.test','额外身份线索','受限原作者','不得导出原话','private-photo','local-owner-0001','受限盘内容'])assert.ok(!out.includes(secret),secret);
 assert.deepEqual(entry,before);assert.equal(lifeExportProjection([entry],settings)[0].health.confirmedText,'本人核对内容');
 const granted=JSON.stringify(lifeExportProjection([entry],{...settings,includeSources:true,includeCharts:true}));assert.ok(granted.includes('获准原话'));assert.ok(!granted.includes('不得导出原话'));assert.ok(!granted.includes('受限盘内容'));
});
test('all emitted formats use the same privacy projection; HTML inert, CSV formula neutralized, health separate',()=>{
 const entry=fixture();entry.title='=危险公式';
 for(const format of ['txt','md','json','html','csv','pdf','health']){const out=buildLifeExport([entry],format,DEFAULT_LIFE_EXPORT_PRIVACY);assert.ok(!out.body.includes('甲医院'));assert.ok(!out.body.includes('13812345678'));assert.ok(!out.body.includes('不得导出原话'));if(format==='html')assert.ok(!out.body.includes('<script>'));if(format==='csv')assert.ok(out.body.includes("'=危险公式"));if(format==='health')assert.ok(!out.body.includes('额外身份线索'));}
 assert.throws(()=>lifeExportProjection([entry],{...DEFAULT_LIFE_EXPORT_PRIVACY,extraWords:'x'.repeat(201)}));
});
test('derived crop keeps original identity separate; invalid source/range rejected and no OCR reused by metadata',()=>{
 const entry=fixture();entry.attachments.push({...entry.attachments[0],id:'crop-local-0001',sha256:'b'.repeat(64),chunks:['blob:crop-photo'],derivedFrom:{sourceId:entry.attachments[0].id,sourceSha256:entry.attachments[0].sha256,operation:'crop',box:[0.1,0.2,0.5,0.5],createdAt:new Date().toISOString()}});
 validateLifeEntry(entry);assert.notEqual(entry.attachments[0].sha256,entry.attachments[1].sha256);
 const bad=structuredClone(entry);bad.attachments[1].derivedFrom.box=[0.8,0,0.5,1];assert.throws(()=>validateLifeEntry(bad),/裁剪/);
 const invalid=structuredClone(entry);invalid.attachments[1].derivedFrom.sourceSha256='unknown';assert.throws(()=>validateLifeEntry(invalid),/裁剪/);
});
