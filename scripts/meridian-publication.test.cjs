const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {filterExport,excluded}=require('./filter-unlicensed-meridians.cjs');
test('all 28 unlicensed animations are excluded from generated delivery while original and licensed files survive',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'guoxue-export-')),root=path.join(temp,'out');
 try{fs.mkdirSync(root);fs.writeFileSync(path.join(root,'index.html'),'export');
  for(const name of [...excluded,'assets/meridians/lung-open-reference.svg','assets/anatomy/skeleton-front.svg']){const p=path.join(root,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,name);}
  fs.writeFileSync(path.join(temp,'owner-original.webp'),'keep');const proof=filterExport(root);
  assert.equal(proof.excluded.length,28);assert.equal(excluded.some(p=>fs.existsSync(path.join(root,p))),false);
  for(const p of proof.retained)assert.ok(fs.existsSync(path.join(root,p)));assert.equal(fs.readFileSync(path.join(temp,'owner-original.webp'),'utf8'),'keep');
  assert.equal(filterExport(root).excluded.length,0);assert.throws(()=>filterExport(temp),/Only a generated/);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('meridian UI never requests the excluded images or fabricates point coordinates',()=>{
 const text=fs.readFileSync(path.join(__dirname,'../src/app/zhongyi/meridian/page.tsx'),'utf8');
 assert.doesNotMatch(text,/\/assets\/meridians\/.*\.webp/);assert.match(text,/未标注具体穴位位置/);assert.match(text,/骨骼图不代表本经走向/);
});
