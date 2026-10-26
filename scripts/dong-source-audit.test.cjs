'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module');
const audit=require('../src/data/dongLegacySourceAudit.json');
function data(file){const ctx={};vm.createContext(ctx);vm.runInContext(stripTypeScriptTypes(fs.readFileSync(file,'utf8').replace(/^import .*;\r?\n/gm,'')).replace(/^export /gm,'')+'\nthis.api={points:DONG_ACUPOINTS_DB,validateDongStudyCatalog:typeof validateDongStudyCatalog===\'function\'?validateDongStudyCatalog:null};',ctx);return ctx.api;}
test('legacy 39 stay distinct from the source book catalogue and never claim missing cautions are safe',()=>{
 const current=data('src/algorithm-core/modules/tcm/dong-acupoints.ts');assert.equal(current.points.length,39);assert.equal(audit.latestSourceBookEntries,267);assert.equal(audit.records.length,39);
 assert.equal(audit.records.filter(row=>row.oldGenericNoContraindication).length,27);assert.equal(audit.records.filter(row=>row.matchingImageReferences.length).length,37);
 for(const point of current.points){assert.notEqual(point.contraindications,'无特殊禁忌。');assert.equal(point.study_review.status,'UNVERIFIED_LEGACY');assert.ok(point.study_review.unverifiedFields.includes('depth'));assert.ok(point.study_review.unverifiedFields.includes('contraindications'));const row=audit.records.find(row=>row.code===point.code);assert.equal(row.specificClinicalCitationEstablished,false);assert.equal(row.imageReferenceDoesNotValidateClinicalFields,true);}
});
test('a content catalogue cannot silently label a legacy row as professionally verified',()=>{
 const api=data('src/algorithm-core/modules/tcm/dong-acupoints.ts'),points=JSON.parse(JSON.stringify(api.points));
 for(const row of points)row.study_sources=[{title:'测试来源',edition:'测试版',page:1,sourceSha256:'a'.repeat(64)}];
 const raw={schema:'yandao.tcm.dong-catalog.v1',version:'1.0.0',reviewState:'SOURCE_REFERENCED',points};assert.ok(api.validateDongStudyCatalog(raw));points[0].study_review.status='PROFESSIONALLY_REVIEWED';assert.equal(api.validateDongStudyCatalog(raw),null);
});
test('owner attachment adds no new clinical fields and cannot be imported over 267 source entries',{skip:!process.env.DONG_ATTACHMENT},()=>{
 const original=data(process.env.DONG_ATTACHMENT).points,current=data('src/algorithm-core/modules/tcm/dong-acupoints.ts').points;assert.equal(original.length,39);
 for(const row of original){const installed=current.find(point=>point.code===row.code);for(const key of ['name','pinyin','zone','location','location_detail','function','needling_method','depth','duration','literature'])assert.equal(installed[key],row[key]);}
});
