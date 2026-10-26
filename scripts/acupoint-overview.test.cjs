const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function loader(storage=new Map()){
 const cache=new Map();
 return function load(file){
  file=path.resolve(root,file);if(cache.has(file))return cache.get(file);
  if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
  const exports={};cache.set(file,exports);
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInNewContext(source,{exports,console,URL,Date,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},require:name=>{
   const resolved=name.startsWith('@/')?path.join(root,'src',name.slice(2)):path.resolve(path.dirname(file),name);
   return load(resolved+(/\.json$|\.ts$/.test(resolved)?'':'.ts'));
  }},{filename:file});return exports;
 };
}
test('every catalog point has a sourced location; original excerpts retain their digests',()=>{
 const load=loader(),api=load('src/lib/acupointOverview.ts');
 const data=load('src/algorithm-core/modules/tcm/data/meridians.json'),index=load('src/data/acupointOverviewEvidence.json');
 assert.equal(data.acupoints.length,361);assert.equal(Object.keys(index.points).length,359);
 for(const point of data.acupoints){
  const card=api.resolveAcupointOverview(point);assert.ok(card.location?.text,point.code);
  assert.doesNotMatch(card.location.text,/暂无|待补充|待核实/);assert.ok(card.location.sourceTitle);
 }
 for(const row of Object.values(index.points)){
  assert.equal(crypto.createHash('sha256').update(row.location).digest('hex'),row.locationSha256);
  assert.equal(crypto.createHash('sha256').update(row.indications).digest('hex'),row.indicationsSha256);
 }
});
test('SP1 and SP14 resolve main information, distinguish edition measurements and label plain explanations',()=>{
 const load=loader(),api=load('src/lib/acupointOverview.ts'),base=load('src/algorithm-core/modules/tcm/data/meridians.json');
 const resolve=code=>api.resolveAcupointOverview(base.acupoints.find(point=>point.code===code));
 const sp1=resolve('SP1'),sp14=resolve('SP14');
 assert.match(sp1.location.text,/0\.1寸/);assert.match(sp1.indications.text,/腹胀/);assert.match(sp1.combinations.text,/厉兑/);
 assert.match(sp14.location.text,/1\.3寸/);assert.match(sp14.location.text,/旁开4寸/);assert.match(sp14.indications.text,/绕脐痛/);
 assert.equal(sp14.plainExplanation.kind,'EDITORIAL_EXPLANATION');assert.match(sp14.plainExplanation.locator,/非原文/);
 assert.match(sp14.plainExplanation.text,/四寸半/);
 assert.equal(api.cleanAcupointText('腹结穴','腹结'),'');assert.equal(api.cleanAcupointText('本库暂无已整理的主治资料。'),'');
});
test('disease substrings and unrelated herbal chapters cannot become point evidence',()=>{
 const api=loader()('src/lib/acupointOverview.ts'),point={name:'腹结',code:'SP14'};
 const entry=(text,title,extra={})=>({text,sourceInfo:{title},...extra});
 assert.equal(api.isDirectAcupointPassage(point,entry('主心腹結氣，虛熱濕毒腰痛。','本草綱目')),false);
 assert.equal(api.isDirectAcupointPassage(point,entry('又或少腹结痛，大便黑色。','金匮要略 · 人纪系列')),false);
 assert.equal(api.isDirectAcupointPassage(point,entry('再过来是腹结，要从石门找。','针灸 · 人纪系列')),true);
 assert.equal(api.isDirectAcupointPassage(point,entry('◎腹結（一名腸窟）：','針灸大成')),true);
 assert.equal(api.isDirectAcupointPassage(point,entry('真实段落','针灸大成',{mappingNote:'DIRECT_ACUPOINT_SECTION:SP1'})),false);
 assert.equal(api.isDirectAcupointPassage(point,entry('课程只列范围，不重复本穴名称','人纪针灸',{mappingNote:'EXACT_ACUPOINT_COURSE_TITLE:SP14'})),true);
 assert.equal(api.isDirectAcupointPassage(point,entry('课程只列范围，不重复本穴名称','人纪针灸',{mappingNote:'EXACT_ACUPOINT_COURSE_TITLE:SP1'})),false);
});
test('same-name head/foot and hand/leg sections have different locations',()=>{
 const index=loader()('src/data/acupointOverviewEvidence.json');
 for(const [a,b] of [['LI10','ST36'],['LI8','ST39'],['LI9','ST37'],['GB15','GB41'],['GB11','GB44'],['BL66','KI20'],['GB33','GV3']])assert.notEqual(index.points[a].location,index.points[b].location,a+' '+b);
});
test('installed valid point-location updates take effect without replacing the bundled application',()=>{
 const load=loader(),api=load('src/lib/acupointOverview.ts'),base=load('src/algorithm-core/modules/tcm/data/meridians.json');
 const point=base.acupoints.find(row=>row.code==='SP13');
 const before=api.resolveAcupointOverview(point);assert.equal(before.location.kind,'CLASSIC_QUOTE');
 const after=api.resolveAcupointOverview({...point,location_detail:'受控资料更新定位测试文本',literature:'新来源版本测试'});
 assert.equal(after.location.text,'受控资料更新定位测试文本');assert.equal(after.location.kind,'EXISTING_SUMMARY');assert.equal(after.location.sourceTitle,'新来源版本测试');
 const empty=api.resolveAcupointOverview({...point,location_detail:'定位资料待补充核实'});assert.equal(empty.location.text,before.location.text);
 const sp14=base.acupoints.find(row=>row.code==='SP14');assert.equal(api.resolveAcupointOverview({...sp14,location_detail:'旧课程讲义不同分寸'}).location.kind,'LOCATION_REFERENCE');
});
test('legacy empty notices expire immediately and unknown points receive no invented data',()=>{
 const storage=new Map(),api=loader(storage)('src/lib/tcmScraper.ts');
 storage.set('tcm_scrape_cache',JSON.stringify({SP14:{cachedAt:Date.now(),data:{data_revision:2,indications:'本库暂无已整理的主治资料。'}}}));
 assert.equal(api.getCachedAcupointInfo('SP14'),null);
 const sp14=api.triggerScrape('SP14','腹结','脾经');assert.match(sp14.indications,/绕脐痛/);assert.equal(sp14.data_revision,3);
 const unknown=api.triggerScrape('UNKNOWN','不存在的穴位测试','测试经络');
 for(const key of ['detail','indications','combinations','needling_method','contraindications'])assert.equal(unknown[key],'');
});
test('corrected candidate obeys the deployed medical-library protocol and exact point mappings',{skip:!process.env.MEDICAL_CANDIDATE},()=>{
 const exports={};
 const code=ts.transpileModule(fs.readFileSync(path.join(root,'src/lib/medicalStudyLibrary.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports,URL,require:name=>{assert.ok(['./offlinePackClient','./durableOfflineStore','./releaseFeatures'].includes(name));return {};}});
 const candidate=exports.validateMedicalLibrary(JSON.parse(fs.readFileSync(process.env.MEDICAL_CANDIDATE,'utf8')));
 assert.match(candidate.version,/^1\.[12]\.0$/);assert.equal(Object.keys(candidate.subjects).length,1217);
 for(const passage of Object.values(candidate.passages))assert.equal(crypto.createHash('sha256').update(passage.text).digest('hex'),passage.sha256);
 const direct=candidate.subjects['point:SP14'].references.map(key=>candidate.passages[key]);
 assert.ok(direct.some(entry=>entry.mappingNote==='DIRECT_ACUPOINT_SECTION:SP14'));
 assert.ok(!direct.some(entry=>entry.source==='materia-bencao-gangmu'));
 const api=loader()('src/lib/acupointOverview.ts');
 for(const [key,subject] of Object.entries(candidate.subjects).filter(([key])=>key.startsWith('point:'))){
  for(const id of subject.references){const entry=candidate.passages[id];if(entry.mappingNote?.startsWith('EXACT_ACUPOINT_COURSE_TITLE:'))assert.equal(api.isDirectAcupointPassage({name:subject.name,code:key.slice(6)},{...entry,sourceInfo:candidate.sources[entry.source]}),true,key);}
 }
});
