const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {verifyExport,mediaPaths}=require('./verify-meridian-media.cjs');
test('all 28 requested animations survive delivery and missing or changed media fails the build',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'guoxue-export-')),root=path.join(temp,'out');
 try{
  fs.mkdirSync(root);fs.writeFileSync(path.join(root,'index.html'),'export');
  for(const name of mediaPaths){const p=path.join(root,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(path.join(__dirname,'../public',name),p);}
  const proof=verifyExport(root);assert.equal(proof.included.length,28);assert.equal(proof.excluded.length,0);assert.ok(mediaPaths.every(p=>fs.existsSync(path.join(root,p))));
  const file=path.join(root,mediaPaths[0]);fs.appendFileSync(file,'corrupt');assert.throws(()=>verifyExport(root),/animation changed/);fs.unlinkSync(file);assert.throws(()=>verifyExport(root),/animation missing/);assert.throws(()=>verifyExport(temp),/Only a generated/);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
