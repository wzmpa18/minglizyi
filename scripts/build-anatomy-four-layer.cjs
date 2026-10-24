'use strict';
// Repackage the existing verified 12A reference body for the already shipped
// four-layer reader. No new model source, coordinate synthesis or remote code.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url'),{unzipSync,zipSync,strToU8}=require('fflate');
const arg=n=>process.argv.find(v=>v.startsWith('--'+n+'='))?.slice(n.length+3);
const input=arg('source'),output=arg('output');if(!input||!output)throw Error('Provide verified atlas source and E: output');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const source=fs.readFileSync(input),sourceSha=sha(source);
 if(sourceSha!=='b1c9a4826551cb54152141e104f405f89dcf497434c6bd3ca7987683b40d2f4b')throw Error('Wrong audited 12A source');
 const sourceFiles=unzipSync(source),atlas=JSON.parse(Buffer.from(sourceFiles['atlas.json']).toString('utf8'));
 const T=await import(pathToFileURL(require.resolve('three').replace(/three\.cjs$/,'three.module.js')).href);
 const {GLTFExporter}=await import(pathToFileURL(require.resolve('three/examples/jsm/exporters/GLTFExporter.js')).href);
 global.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();});} readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result='data:application/octet-stream;base64,'+Buffer.from(b).toString('base64');this.onloadend?.();});}};

 const groups=[['skin','体表',['integumentary']],['muscular','肌肉与结缔组织',['muscular','connective']],['skeletal','骨骼',['skeletal']],['visceral','脏腑、血管与神经',atlas.parts.map(p=>p.system).filter(s=>!['integumentary','muscular','connective','skeletal'].includes(s))]];
 const files={},layers=[],sourceIds=new Set(),boxes={};
 for(const [id,name,systems] of groups){
  const root=new T.Group(),parts=atlas.parts.filter(p=>systems.includes(p.system));
  for(const p of parts){
   const raw=sourceFiles[atlas.chunks[p.chunk].url],buffer=new Uint8Array(raw).buffer;
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(buffer,p.positions,p.vertexCount*3).slice(),3));
   const normals=new Int16Array(buffer,p.normals,p.vertexCount*3);geometry.setAttribute('normal',new T.BufferAttribute(Float32Array.from(normals,n=>Math.max(-1,n/32767)),3));
   geometry.setIndex(new T.BufferAttribute(new Uint32Array(buffer,p.indices,p.indexCount).slice(),1));
   const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color:0xc5b99a,roughness:.8,side:T.DoubleSide}));mesh.name=p.name;mesh.userData={sourceStructureId:p.id,system:p.system};root.add(mesh);sourceIds.add(p.id);
  }
  const box=new T.Box3().setFromObject(root);boxes[id]={min:box.min.toArray(),max:box.max.toArray()};
  const data=new Uint8Array(await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true})),file=id+'_reference.glb';
  files[file]=data;layers.push({id,name,file,size:data.length,sha256:sha(data),sourceStructures:parts.length,systems:[...new Set(parts.map(p=>p.system))]});
  root.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});console.log(id+': '+parts.length+' structures, '+data.length+' bytes');
 }
 if(sourceIds.size!==atlas.parts.length)throw Error('Unexpected missing or duplicated source geometry');
 const manifest={format:'yandao-anatomy-3d',version:'2.1.0',name:'三维人体四层观察资料',layers,license:'BodyParts3D CC BY 4.0; viewer source MIT; see bundled attribution',source:'Existing verified JICio/tcm-3d / human-atlas / BodyParts3D reference body',sourcePackSha256:sourceSha,notice:'与新版分系统图谱为同一参考体。四层是学习观察分组，不是组织学逐层解剖或临床精准定位。保留原始体表及全部2234项来源网格，不再简化体表或删去毛发。'};
 files['manifest.json']=strToU8(JSON.stringify(manifest,null,2));
 for(const name of fs.readdirSync('public/licenses/tcm-3d'))files['licenses/'+name]=new Uint8Array(fs.readFileSync(path.join('public/licenses/tcm-3d',name)));
 files['ANATOMY_NOTICE.txt']=strToU8('Same reference body as the 12A atlas. No unrelated models overlaid. Original source pack SHA256: '+sourceSha+'\nSource attribution and license: licenses/ATTRIBUTION.md and licenses/NOTICE.\nOriginal source surface preserved, including hair; no clinical accuracy claim.');
 const packed=zipSync(files,{level:6});fs.writeFileSync(output,packed);
 const proof={packId:'tcm-anatomy-3d-v2',version:'2.1.0',bytes:packed.length,sha256:sha(packed),sourcePackSha256:sourceSha,sourceStructures:sourceIds.size,layers,bounds:boxes,sharedReferenceFrame:true,clinicalReviewed:false};fs.writeFileSync(output+'.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({packId:proof.packId,bytes:proof.bytes,sha256:proof.sha256}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
