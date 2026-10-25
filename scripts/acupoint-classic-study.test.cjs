const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
process.chdir(require('node:path').resolve(__dirname,'..'));
const data = require('../src/data/acupointClassicStudy.json');
const base = require('../src/algorithm-core/modules/tcm/data/meridians.json');
function load(file, dependencies) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    esModuleInterop: true, resolveJsonModule: true,
  }}).outputText;
  vm.runInNewContext(js, { exports, URL, console, process, require: name => {
    if (name in dependencies) return dependencies[name];
    throw Error('Unexpected dependency ' + name);
  }});
  return exports;
}
const freshDong = () => load('src/algorithm-core/modules/tcm/dong-acupoints.ts', {});
const fresh = () => load('src/algorithm-core/modules/tcm/point-study.ts', {
  '../../../data/acupointClassicStudy.json': structuredClone(data),
});

test('bundled quotations identify known points and preserve source-specific review state', () => {
  const api = fresh();
  assert.ok(api.validatePointStudyIndex(data));
  const codes = new Set(base.acupoints.map(point => point.code));
  for (const [code, records] of Object.entries(data.points)) {
    assert.ok(codes.has(code), code);
    for (const record of records) {
      assert.equal(record.reviewState, 'SOURCE_TRANSCRIPTION');
      assert.ok(record.sourceSha256);
      for (const paired of record.pointCodes || []) assert.ok(codes.has(paired));
    }
  }
});

test('same-name head and foot points retain different edition locators', () => {
  const api = fresh();
  const first = code => api.getPointStudy(code).find(record => record.kind === 'CLASSIC_INDICATION_QUOTE');
  assert.equal(first('GB15').paragraph, 15);
  assert.equal(first('GB41').paragraph, 41);
  assert.equal(first('GB11').paragraph, 11);
  assert.equal(first('GB44').paragraph, 44);
  assert.notEqual(first('GB15').text, first('GB41').text);
  assert.notEqual(first('GB11').text, first('GB44').text);
  assert.equal(first('DU20').text, first('GV20').text);
  assert.equal(first('RN4').text, first('CV4').text);
});

test('malformed or unsafe source updates leave the usable installed content intact', () => {
  const api = fresh();
  const before = JSON.stringify(api.getPointStudy('LU1'));
  const changes = [
    value => { value.points.LU1[0].url = 'javascript:alert(1)'; },
    value => { value.points.LU1[0].sourceId = 'unknown'; },
    value => { value.points.LU1[0].reviewState = 'OCR_UNREVIEWED'; },
    value => { value.points.LU1[0].text = '<script>invalid</script>'; },
    value => { value.points.LU1[0].paragraph = 0; },
    value => { value.points.LU1[0].sourceSha256 = 'unverified'; },
  ];
  for (const change of changes) {
    const invalid = structuredClone(data); change(invalid);
    assert.equal(api.installPointStudyIndex(invalid), false);
    assert.equal(JSON.stringify(api.getPointStudy('LU1')), before);
  }
  const update = structuredClone(data); update.version = 'fixture-update';
  assert.equal(api.installPointStudyIndex(update), true);
  update.points.LU1[0].text = 'caller mutation';
  assert.equal(JSON.stringify(api.getPointStudy('LU1')), before);
});

test('baseline empty functions no longer reject a valid downloaded study pack; failed packs are atomic', () => {
  const study = fresh();
  const api = load('src/algorithm-core/modules/tcm/meridians.ts', {
    './data/meridians.json': structuredClone(base), './point-study': study, './dong-acupoints': freshDong(),
  });
  const pack = {schema:'yandao.tcm.acupoints.v1',version:'1.1.0',reviewState:'APPROVED_EXISTING_BASELINE',
    acupoints: structuredClone(base.acupoints), pointStudy: structuredClone(data)};
  assert.ok(pack.acupoints.some(point => point.function === ''));
  assert.equal(api.installAcupointContentPack(pack), true);
  const before = JSON.stringify(api.ACUPOINTS_DB);
  const preview=structuredClone(pack);preview.acupoints[0].name='fixture preview';
  assert.equal(api.installAcupointContentPack(preview,false),true);
  assert.equal(JSON.stringify(api.ACUPOINTS_DB),before);
  const omitted=structuredClone(pack);omitted.acupoints[360].code='ZZ999';
  assert.equal(api.installAcupointContentPack(omitted,false),false);
  const corrupt = structuredClone(pack); corrupt.acupoints[360].code = corrupt.acupoints[0].code;
  assert.equal(api.installAcupointContentPack(corrupt), false);
  assert.equal(JSON.stringify(api.ACUPOINTS_DB), before);
  const invalidStudy = structuredClone(pack); invalidStudy.pointStudy.points.LU1[0].sourceId = 'missing';
  assert.equal(api.installAcupointContentPack(invalidStudy), false);
  assert.equal(JSON.stringify(api.ACUPOINTS_DB), before);
  const legacy = structuredClone(pack); delete legacy.pointStudy;
  assert.equal(api.installAcupointContentPack(legacy), true);
});
test('actual complete-pack point data passes validation without altering the active catalogue',{skip:!process.env.TCM_ACUPOINT_CANDIDATE},()=>{
 const api=load('src/algorithm-core/modules/tcm/meridians.ts',{'./data/meridians.json':structuredClone(base),'./point-study':fresh(),'./dong-acupoints':freshDong()});
 const before=JSON.stringify(api.ACUPOINTS_DB),pack=JSON.parse(fs.readFileSync(process.env.TCM_ACUPOINT_CANDIDATE,'utf8'));
 assert.equal(api.installAcupointContentPack(pack,false),true);assert.equal(JSON.stringify(api.ACUPOINTS_DB),before);
});

test('Dong content requires individual page provenance and rejects partial or unreviewed replacements', () => {
  const api = freshDong();
  const previous = JSON.stringify(api.DONG_ACUPOINTS_DB);
  assert.equal(api.DONG_ACUPOINTS_DB.length, 39);
  assert.ok(api.DONG_ACUPOINTS_DB.every(point => point.contraindications !== '无特殊禁忌。'));
  const catalog = {schema:'yandao.tcm.dong-catalog.v1',version:'fixture',reviewState:'SOURCE_REFERENCED',
    points: JSON.parse(previous).map(point => ({...point,study_sources:[{
      title:'fixture source',edition:'fixture edition',page:1,sourceSha256:'a'.repeat(64),
    }]}))};
  assert.equal(api.installDongStudyCatalog(catalog), true);
  const installed = JSON.stringify(api.DONG_ACUPOINTS_DB);
  for (const change of [
    value => { value.points[0].study_sources = []; },
    value => { value.points[0].study_sources[0].page = 0; },
    value => { value.reviewState = 'OCR_UNREVIEWED'; },
    value => { value.points[0].code = value.points[1].code; },
    value => { value.points[0].image_url = 'https://untrusted.invalid/image.jpg'; },
    value => { value.points.pop(); },
  ]) {
    const invalid = structuredClone(catalog); change(invalid);
    assert.equal(api.installDongStudyCatalog(invalid), false);
    assert.equal(JSON.stringify(api.DONG_ACUPOINTS_DB), installed);
  }
  catalog.points[0].function = 'caller mutation';
  assert.equal(JSON.stringify(api.DONG_ACUPOINTS_DB), installed);
});
