'use strict';
// Verify all owner-requested animations survive the export. Never remove source media.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const manifest=require('../public/assets/meridians/ANIMATION-MANIFEST.json');
const mediaPaths=manifest.records.map(r=>r.asset.replace(/^\//,''));
function verifyExport(root){
 root=path.resolve(root);
 if(path.basename(root)!=='out'||fs.lstatSync(root).isSymbolicLink()||!fs.statSync(path.join(root,'index.html')).isFile())throw Error('Only a generated out/ export with index.html may be verified');
 if(manifest.records.length!==28||new Set(mediaPaths).size!==28)throw Error('Expected fourteen pairs of meridian animations');
 const included=manifest.records.map(record=>{
  const relative=record.asset.replace(/^\//,''),file=path.join(root,relative);
  if(!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink()||!fs.statSync(file).isFile()||!fs.realpathSync(file).startsWith(fs.realpathSync(root)+path.sep))throw Error('Meridian animation missing: '+relative);
  const data=fs.readFileSync(file),sha256=crypto.createHash('sha256').update(data).digest('hex');
  if(data.length!==record.bytes||sha256!==record.sha256)throw Error('Meridian animation changed: '+relative);
  return {path:relative,bytes:data.length,sha256,frames:record.frames};
 });
 const proof={revision:manifest.revision,included,excluded:[],ownerOriginals:11,sourceFilesModified:false,rightsStatus:manifest.rightsStatus,clinicalPositionReviewed:false};
 fs.writeFileSync(path.join(root,'meridian-publication.json'),JSON.stringify(proof,null,2)+'\n');return proof;
}
if(require.main===module){const p=verifyExport(path.resolve(__dirname,'../out'));console.log('Meridian media verified: '+p.included.length+' actual animations retained.');}
module.exports={verifyExport,mediaPaths};
