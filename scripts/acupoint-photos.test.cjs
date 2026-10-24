const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),ts=require('typescript');
const exportsValue={},file=path.resolve('src/lib/acupointPhotos.ts');
vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{exports:exportsValue,require:n=>require(path.resolve(path.dirname(file),n)),console,Set,Number,Error});
const {validatePhotoManifest,BUNDLED_PHOTOS}=exportsValue,copy=()=>JSON.parse(JSON.stringify(BUNDLED_PHOTOS));
test('bundled real photos match untouched originals and their declared complete file hashes',()=>{
 assert.equal(BUNDLED_PHOTOS.records.length,2);const codes=new Set();
 for(const p of BUNDLED_PHOTOS.records){const b=fs.readFileSync('public/assets/acupoint-photos/'+p.file);assert.equal(b.length,p.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),p.sha256);assert.equal(p.kind,'real-photo');assert.equal(p.clinicalReviewed,false);p.codes.forEach(c=>codes.add(c));}
 assert.equal(codes.size,7);assert.ok(!codes.has('HT1'),'Lower HT1 must not be presented as standard HT1');
 assert.match(BUNDLED_PHOTOS.records[1].caption,/蓝色Sham.*不能作为穴位/);
});
test('remote metadata cannot inject executable files, external image hosts or missing provenance',()=>{
 for(const [field,value] of [['file','../../secret.jpg'],['file','evil.svg'],['file','https://evil.test/a.jpg'],['sourceUrl','javascript:alert(1)'],['licenseUrl','https://evil.test/'],['bytes',21_000_000]]){const bad=copy();bad.records[0][field]=value;assert.throws(()=>validatePhotoManifest(bad));}
 const duplicate=copy();duplicate.records.push(duplicate.records[0]);assert.throws(()=>validatePhotoManifest(duplicate));
 const old=copy();old.schemaVersion=2;assert.throws(()=>validatePhotoManifest(old));
});
