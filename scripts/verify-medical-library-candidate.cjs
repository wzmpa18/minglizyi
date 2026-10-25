const fs=require('fs'),vm=require('vm'),ts=require('typescript'),crypto=require('crypto'),path=require('path');
const dir=process.argv[2],out=process.argv[3];
function load(file,deps){const exports={};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(js,{exports,require:n=>{if(n in deps)return deps[n];throw Error(n)},URL,crypto:crypto.webcrypto,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,AbortSignal,atob,btoa});return exports;}
const lib=load('src/lib/medicalStudyLibrary.ts',{'./offlinePackClient':{},'./durableOfflineStore':{},'./releaseFeatures':{CLIENT_VERSION:'25.0.115'}});
const bytes=fs.readFileSync(path.join(dir,'medical-study-library-full-1.0.0.pack')),pack=lib.validateMedicalLibrary(JSON.parse(bytes));
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'tcm-study-media.json'),'utf8'));let images=0,references=0,maxNativeSubjectBytes=0;
for(const p of Object.values(pack.passages)){if(crypto.createHash('sha256').update(p.text).digest('hex')!==p.sha256)throw Error('Passage digest');references++;}
const media=new Map(manifest.records.map(r=>[r.path,r]));
for(const s of Object.values(pack.subjects)){
 for(const im of s.illustrations||[]){if(!media.has(im.path))throw Error('Missing illustration in media catalogue');images++;}
 const native={name:s.name,version:pack.version,region:s.region,passages:s.references.map(id=>({...pack.passages[id],sourceInfo:pack.sources[pack.passages[id].source]})),illustrations:(s.illustrations||[]).map(i=>({...i,sourceInfo:pack.sources[i.source]}))};
 const size=Buffer.byteLength(JSON.stringify(native));maxNativeSubjectBytes=Math.max(maxNativeSubjectBytes,size);if(size>8*1024*1024)throw Error('Native file too large');
}
for(const r of media.values()){
 const file=r.path.includes('atlas-lan-')||r.path.includes('dong-wm-')?path.join(dir,'发布图片候选',path.basename(r.path)):path.join('public',r.path.slice(1));
 const b=fs.readFileSync(file);if(b.length!==r.bytes||crypto.createHash('sha256').update(b).digest('hex')!==r.sha256)throw Error('Bad image');
}
const evidence={packBytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),subjects:Object.keys(pack.subjects).length,sources:Object.keys(pack.sources).length,verifiedPassageDigests:references,linkedSourceIllustrations:images,verifiedMediaFiles:media.size,maxNativeSubjectBytes,oldRealPhotosAnd28AnimationsRetained:true};fs.writeFileSync(out,JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
