const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const ts=require('typescript');
// Only transpile this pure helper. Its atlasPack dependency is a type import;
// loading a rendering test never starts networking, React or a download.
const filename=path.resolve('src/components/anatomy-atlas/atlasMeridianRoutes.ts'),Module=require('node:module'),compiled=new Module(filename,module);
compiled.filename=filename;compiled.paths=Module._nodeModulePaths(path.dirname(filename));compiled._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
const helper=compiled.exports,data=require('../src/data/atlasClassicalRoutes.json');
const digest=raw=>createHash('sha256').update(raw).digest('hex');

test('six classical schematics have fixed in-app chapter anchors and explicit external-only scope',()=>{
 assert.equal(helper.EXTRAORDINARY_ROUTES.length,6);assert.equal(new Set(helper.EXTRAORDINARY_ROUTES.map(r=>r.id)).size,6);
 for(const route of helper.EXTRAORDINARY_ROUTES){assert.equal(route.routeKind,'classical-surface-schematic');assert.equal(route.professionallyCalibrated,false);assert.equal(route.sourceBookId,'li-qijing-bamai-original');assert.ok(route.sourceChapterId.startsWith(route.sourceBookId+'-'));assert.ok(route.description&&route.omitted&&route.sourceChapterTitle);assert.ok(data.paths.some(p=>p.id===route.id),'every listed schematic has real external skin segments');assert.equal(helper.routeStudyMetadata(route.id),route);}
 assert.equal(helper.routeStudyMetadata('untrusted-id'),undefined);assert.equal(data.outerSkinVertexCount,11401);assert.equal(data.innerShellExcluded,true);
});

test('precomputed curves and local LI repairs are finite bounded source-skin data',()=>{
 assert.equal(data.sourceGapRepairs.length,8);assert.equal(new Set(data.sourceGapRepairs.map(r=>r.sourcePathIndex+':'+r.beforeSegment)).size,8);
 for(const repair of data.sourceGapRepairs){assert.equal(repair.id,'LI');assert.ok(repair.originalGap>.03&&repair.originalGap<.065);assert.ok(repair.length<=repair.originalGap*2.6);assert.equal(repair.professionallyCalibrated,false);assert.equal(repair.routeKind,'source-gap-surface-repair');}
 for(const curve of [...data.paths,...data.sourceGapRepairs]){assert.equal(curve.points.length,curve.normals.length);assert.ok(curve.points.length>=2);for(let i=0;i<curve.points.length;i++){assert.equal(curve.points[i].length,3);assert.ok(curve.points[i].every(Number.isFinite));assert.ok(Math.abs(curve.points[i][0])<.4&&curve.points[i][1]>=-.01&&curve.points[i][1]<1.75&&Math.abs(curve.points[i][2])<.2);const n=curve.normals[i];assert.ok(Math.abs(Math.hypot(...n)-1)<.003);}}
});

test('unmatched atlases fall back to original segments without extra coordinates or repairs',()=>{
 const input={version:'other',atlas:{parts:[]},surface:{points:[],paths:[{id:'LI',vertices:[0,0,0,1,0,0,1,0,0,1,1,0]}]}},before=JSON.stringify(input),plan=helper.buildAtlasMeridianPlan(input);
 assert.equal(plan.compatible,false);assert.equal(plan.paths.length,1);assert.deepEqual([...plan.paths[0].positions],input.surface.paths[0].vertices);assert.deepEqual([...plan.paths[0].distances],[0,1,1,2]);assert.equal(JSON.stringify(input),before);
 const original={position:[0,1,0],normal:[0,0,1],meshId:'a',faceIndex:1};assert.deepEqual(helper.renderPointTarget('untrusted',original,false),{position:[0,1,.0015],normal:[0,0,1]});
});

test('moving dashes preserve a shared distance phase and never increase line width',()=>{
 assert.equal(helper.MERIDIAN_DASH_PERIOD,.034);assert.equal(helper.MERIDIAN_DASH_FILL,.72);assert.ok(helper.meridianFlowFragment.includes('fract(travelDistance/0.034-flowTime)'));assert.ok(helper.meridianFlowFragment.includes('discard'));assert.ok(!helper.meridianFlowFragment.includes('gl_FragDepth'));
 const scene=fs.readFileSync('src/components/anatomy-atlas/AtlasScene.tsx','utf8');assert.ok(!/linewidth\s*:/.test(scene));assert.ok(scene.includes('new T.LineBasicMaterial'));assert.ok(scene.includes('new T.BufferAttribute(path.distances,1)'));
});

test('real pinned atlas retains every original route, source coordinates and cautious projection fallback',{skip:!process.env.ATLAS_SOURCE_PACK},()=>{
 const {unzipSync}=require('fflate'),raw=fs.readFileSync(process.env.ATLAS_SOURCE_PACK);assert.equal(digest(raw),data.sourcePackSha256);const files=unzipSync(raw),atlas=JSON.parse(Buffer.from(files['atlas.json'])),surface=JSON.parse(Buffer.from(files['surface.json'])),sourceBefore=digest(Buffer.from(JSON.stringify(surface))),input={version:'3.0.0',atlas,surface,verifiedFiles:Object.fromEntries(JSON.parse(Buffer.from(files['manifest.json'])).files.map(entry=>[entry.path,entry.sha256]))};
 const plan=helper.buildAtlasMeridianPlan(input);assert.equal(plan.compatible,true);assert.equal(plan.paths.filter(p=>p.routeKind==='original-surface').length,26);assert.equal(plan.paths.filter(p=>p.routeKind==='classical-surface-schematic').length,data.paths.length);
 for(const rendered of plan.paths){assert.ok(rendered.positions.every(Number.isFinite));assert.equal(rendered.distances.length,rendered.positions.length/3);for(let i=1;i<rendered.distances.length;i++)assert.ok(rendered.distances[i]>=rendered.distances[i-1]);}
 for(let index=0;index<surface.paths.length;index++){const original=surface.paths[index].vertices,projected=data.sourcePathRendering[index],repairs=data.sourceGapRepairs.filter(r=>r.sourcePathIndex===index),rendered=plan.paths.find(p=>p.sourcePathIndex===index);assert.equal(rendered.positions.length,original.length+repairs.reduce((n,r)=>n+(r.points.length-1)*6,0));assert.equal(helper.surfacePathSignature(original),data.sourcePathSignatures[index]);assert.equal(projected.positions.length,original.length);}
 const target=surface.points.find(p=>p.key==='CV2:1').target,copy=JSON.stringify(target),retained=helper.renderPointTarget('CV2:1',target,true);for(let i=0;i<3;i++)assert.ok(Math.abs(retained.position[i]-target.position[i])<=.0015001);assert.equal(JSON.stringify(target),copy);assert.equal(digest(Buffer.from(JSON.stringify(surface))),sourceBefore);
 input.surface.paths[0].vertices[0]+=.00001;assert.equal(helper.compatibleRouteDerivation(input),false);assert.equal(helper.buildAtlasMeridianPlan(input).paths.length,26,'a changed coordinate cannot receive a stale derivation');
});

test('real decoder supports declared SHA-verified route-only content updates and rejects untrusted overrides',{skip:!process.env.ATLAS_SOURCE_PACK},async()=>{
 const packFile=path.resolve('src/components/anatomy-atlas/atlasPack.ts'),packModule=new Module(packFile,module);packModule.filename=packFile;packModule.paths=Module._nodeModulePaths(path.dirname(packFile));packModule.require=id=>id==='@/lib/offlinePackClient'?{loadPackContent:async()=>null}:Module.prototype.require.call(packModule,id);packModule._compile(ts.transpileModule(fs.readFileSync(packFile,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,packFile);
 const {unzipSync,zipSync}=require('fflate'),raw=fs.readFileSync(process.env.ATLAS_SOURCE_PACK),original=await packModule.exports.decodeAtlas(new Uint8Array(raw).buffer),originalCatalogue=helper.getAtlasRouteCatalogue(original);assert.equal(originalCatalogue.length,6,'old pack without an optional member uses compatible bundled data');
 const files=unzipSync(raw),manifest=JSON.parse(Buffer.from(files['manifest.json'])),updated=structuredClone(data);updated.routes[0].description='受校验资料更新：仅修改学习说明。';const optional=Buffer.from(JSON.stringify(updated));files['classical-surface-routes.json']=optional;manifest.version='3.0.1';manifest.files.push({path:'classical-surface-routes.json',size:optional.length,sha256:digest(optional)});files['manifest.json']=Buffer.from(JSON.stringify(manifest));
 const decode=async()=>{const zip=zipSync(files,{level:0});return packModule.exports.decodeAtlas(new Uint8Array(zip).buffer);};
 const next=await decode();assert.equal(next.version,'3.0.1');assert.equal(helper.getAtlasRouteCatalogue(next)[0].description,updated.routes[0].description,'new content metadata is used without rebuilding the client');assert.equal(helper.buildAtlasMeridianPlan(next).compatible,true);assert.equal(originalCatalogue[0].description,data.routes[0].description,'old decoded dataset is retained');
 for(const mutate of [v=>v.sourceSkinChunkSha256='0'.repeat(64),v=>v.sourcePathSignatures[0]='00000000',v=>v.routes[0].id='UNKNOWN',v=>v.paths[0].points[0][0]=Infinity,v=>v.schema='script']){const invalid=structuredClone(updated);mutate(invalid);assert.equal(helper.validateRouteDerivation(invalid,next),false);assert.equal(helper.getAtlasRouteCatalogue({...next,routeDerivation:invalid})[0].description,data.routes[0].description,'bad optional data safely retains bundled geometry');}
 manifest.files=manifest.files.filter(entry=>entry.path!=='classical-surface-routes.json');files['manifest.json']=Buffer.from(JSON.stringify(manifest));const unlisted=await decode();assert.equal(unlisted.routeDerivation,undefined);assert.equal(helper.getAtlasRouteCatalogue(unlisted)[0].description,data.routes[0].description,'unlisted ZIP JSON cannot override verified data');
 manifest.files.push({path:'classical-surface-routes.json',size:optional.length,sha256:'0'.repeat(64)});files['manifest.json']=Buffer.from(JSON.stringify(manifest));await assert.rejects(()=>decode(),/校验失败/,'SHA failure does not install a new corrupt pack');
});
