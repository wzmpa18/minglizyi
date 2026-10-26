'use strict';
// Atomically replace one verified learning catalogue row after private COS
// readback. Credentials stay in the existing server .env; no URLs are logged.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const arg=name=>process.argv.find(value=>value.startsWith('--'+name+'='))?.slice(name.length+3);
const app='/www/yandaoguoxue-backend',id=arg('pack'),version=arg('version'),expected=arg('sha256'),previous=arg('previous-sha256'),file=path.resolve(arg('file')||''),minimum=arg('minimum');
if(!['tcm-learning-complete','medical-study-library'].includes(id)||!/^\d+\.\d+\.\d+$/.test(version||'')||!/^25\.0\.\d+$/.test(minimum||'')||![expected,previous].every(value=>/^[a-f0-9]{64}$/.test(value||''))||!file.startsWith(app+'/data/tcm-complete-20261026/'))throw Error('Explicit verified Guoxue candidate arguments required');
require(app+'/node_modules/dotenv').config({path:app+'/.env',quiet:true});
if(process.env.DB_PATH!=='/root/backend-auth/data/yandao_users.db')throw Error('Wrong database');
const engine=require(app+'/offlinePackEngine'),storage=require(app+'/objectStorageEngine').ObjectStorageService;
const digest=async filename=>{const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(filename))hash.update(chunk);return hash.digest('hex');};
async function verifyObject(key,bytes){
 const signed=await storage.temporaryDownloadUrl('learning_content',key,300);if(!signed.ok)throw Error('Cannot read private staged object');
 const response=await fetch(signed.url,{signal:AbortSignal.timeout(180000)});if(!response.ok)throw Error('Private staged download failed');
 const hash=crypto.createHash('sha256');let read=0;for await(const chunk of response.body){read+=chunk.length;if(read>bytes)throw Error('Cloud object exceeded declared size');hash.update(chunk);}
 if(read!==bytes||hash.digest('hex')!==expected)throw Error('Cloud full readback differs from verified candidate');
 const anonymous=new URL(signed.url);anonymous.search='';const denied=await fetch(anonymous,{method:'HEAD'});if(denied.status!==403)throw Error('Learning object is anonymously accessible');
 return denied.status;
}
(async()=>{
 const size=fs.statSync(file).size;if(size<1||size>300*1048576||await digest(file)!==expected)throw Error('Local candidate SHA mismatch');
 const db=engine.getDb(),before=db.prepare('SELECT * FROM offline_content_packs WHERE pack_id=?').get(id);
 if(!before||before.status!=='PUBLISHED'||before.access_level!=='PUBLIC'||before.delivery_provider!=='COS')throw Error('Existing public learning row changed');
 if(before.sha256!==previous&&!(before.version===version&&before.sha256===expected))throw Error('Previous catalogue SHA changed');
 const objectKey=`offline-packs/${id}/${version}.pack`,stat=await storage.statObject({partition:'learning_content',objectKey});
 if(!stat.ok){if(!/404|not.?found|NoSuchKey|does not exist/i.test(stat.error||''))throw Error('Cannot establish that candidate object is new');const upload=await storage.putObject({partition:'learning_content',objectKey,filePath:file,sha256:expected,owner:'system'});if(!upload.ok||upload.provider!=='COS')throw Error('Private COS stage failed');}
 const anonymousStatus=await verifyObject(objectKey,size);
 const proof={checkedAt:new Date().toISOString(),packId:id,version,size,sha256:expected,fullPrivateCloudReadback:true,anonymousStatus,published:false};
 if(process.argv.includes('--publish')){
  const backup=path.join(path.dirname(file),id+'-'+version+'-previous-row.json');
  if(!fs.existsSync(backup))fs.writeFileSync(backup,JSON.stringify(before,null,2),{mode:0o600,flag:'wx'});
  const unrelated=engine.listPacksAdmin({}).list.filter(row=>row.packId!==id);
  db.transaction(()=>{const live=db.prepare('SELECT * FROM offline_content_packs WHERE pack_id=?').get(id);if(live.sha256!==before.sha256||live.version!==before.version)throw Error('Catalogue changed while staging');db.prepare("UPDATE offline_content_packs SET version=?,size_bytes=?,sha256=?,min_app_version=?,file_path=?,object_key=?,delivery_provider='COS',status='PUBLISHED',updated_at=? WHERE pack_id=?").run(version,size,expected,minimum,file,objectKey,new Date().toISOString(),id);})();
  const row=engine.getManifest().packs.find(item=>item.packId===id);if(row?.sha256!==expected||row.version!==version||row.accessLevel!=='PUBLIC'||JSON.stringify(engine.listPacksAdmin({}).list.filter(item=>item.packId!==id))!==JSON.stringify(unrelated))throw Error('Published catalogue readback failed');
  proof.published=true;proof.minimumAppVersion=minimum;proof.unrelatedRowsUnchanged=unrelated.length;
 }
 fs.writeFileSync(path.join(path.dirname(file),id+'-'+version+'-'+(proof.published?'published':'staged')+'-readback.json'),JSON.stringify(proof,null,2),{mode:0o600});
 console.log(JSON.stringify(proof));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
