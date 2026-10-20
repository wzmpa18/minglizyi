'use strict';
// Filter only generated exports. Source assets and owner originals stay untouched.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const slugs=['lung','large-intestine','stomach','spleen','heart','small-intestine','bladder','kidney','pericardium','triple-energizer','gallbladder','liver','governor-vessel','conception-vessel'];
const excluded=slugs.flatMap(s=>['assets/meridians/'+s+'.webp','assets/meridians/skeleton/'+s+'.webp']);
function filterExport(root){
 root=path.resolve(root);
 if(path.basename(root)!=='out'||fs.lstatSync(root).isSymbolicLink()||!fs.statSync(path.join(root,'index.html')).isFile())throw Error('Only a generated out/ export with index.html may be filtered');
 const rows=[];
 for(const relative of excluded){const file=path.join(root,relative);if(!fs.existsSync(file))continue;
  if(fs.lstatSync(file).isSymbolicLink()||!fs.lstatSync(file).isFile()||!fs.realpathSync(file).startsWith(fs.realpathSync(root)+path.sep))throw Error('Unsafe export asset');
  const data=fs.readFileSync(file);rows.push({path:relative,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});
  fs.unlinkSync(file);
 }
 const proof={reason:'Redistribution license not verified. Excluded from public web/native delivery, not approved by a disclaimer.',excluded:rows,retained:['assets/meridians/lung-open-reference.svg','assets/anatomy/skeleton-front.svg'],sourceFilesModified:false};
 fs.writeFileSync(path.join(root,'meridian-publication.json'),JSON.stringify(proof,null,2)+'\n');return proof;
}
if(require.main===module){const proof=filterExport(path.resolve(__dirname,'../out'));console.log('Publication rights filter: '+proof.excluded.length+' unlicensed animations excluded; licensed references retained.');}
module.exports={filterExport,excluded};
