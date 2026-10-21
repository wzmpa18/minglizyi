"""Publish a pinned data-only original-text pack to existing COS delivery.

Default is dry-run. Upload/read back COS first, then compare-and-swap the one
existing public catalogue row. Never deprecate the current pack before upload.
No credential, temporary signed URL, source HTML or local build is logged.
"""
import argparse,gzip,hashlib,json,re,shlex,subprocess
from pathlib import Path

REMOTE=r'''
const fs=require('fs'),crypto=require('crypto'),zlib=require('zlib'),{execFileSync}=require('child_process');
const root='/www/yandaoguoxue-backend';process.chdir(root);let chunks=[];
process.stdin.on('data',c=>chunks.push(c)).on('end',async()=>{
 let db,lockHandle,stageOwned=false,phase='input';const lock=root+'/data/tcm-edition-publish.lock',stage=root+'/data/offline_pack_sources/.tcm-original-editions-approved.next.pack';
 try{
 const wire=Buffer.concat(chunks),boundary=wire.indexOf(10),p=JSON.parse(wire.subarray(0,boundary)),data=zlib.gunzipSync(wire.subarray(boundary+1),{maxOutputLength:50000000}),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
 if(hash(data)!==p.sha256||data.length!==p.bytes||p.packId!=='tcm-original-editions-approved'||p.version!=='1.2.0')throw Error('Pinned input invalid');
 const pack=JSON.parse(data);if(pack.schema!=='yandao.tcm.original-editions.v1'||pack.version!==p.version||pack.books.length!==32||pack.books.reduce((n,b)=>n+b.chapters.length,0)!==590)throw Error('Catalogue invalid');
 const runtime=JSON.parse(execFileSync('pm2',['jlist'],{encoding:'utf8',maxBuffer:5000000})).find(x=>x.name==='yandaoguoxue-backend');if(!runtime)throw Error('Service not found');
 const dotenv=require(root+'/node_modules/dotenv');const configured=dotenv.parse(fs.readFileSync(root+'/.env'));
 for(const [name,value] of Object.entries({...configured,...runtime.pm2_env}))if(typeof value==='string')process.env[name]=value;
 process.env.DB_PATH='/root/backend-auth/data/yandao_users.db';
 const Database=require(root+'/node_modules/better-sqlite3');db=new Database(process.env.DB_PATH);db.pragma('busy_timeout=5000');
 const query=()=>db.prepare('SELECT * FROM offline_content_packs WHERE pack_id=?').get(p.packId),old=query();
 if(!old||old.version!==p.expectedVersion||old.sha256!==p.expectedSha256||old.status!=='PUBLISHED'||old.delivery_provider!=='COS'||old.access_level!=='PUBLIC')throw Error('Existing catalogue changed; reread before retry');
 const storage=require(root+'/objectStorageEngine');if(storage.getConfig().provider!=='COS')throw Error('COS not active; current catalogue retained');
 const service=storage.ObjectStorageService,newKey='offline-packs/'+p.packId+'/'+p.version+'.pack';
 async function readObject(key){const signed=await service.temporaryDownloadUrl('learning_content',key,900);if(!signed.ok)throw Error('COS read authorization unavailable');const response=await fetch(signed.url,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('COS read failed');return Buffer.from(await response.arrayBuffer());}
 phase='old-pack-readback';const previous=await readObject(old.object_key);if(hash(previous)!==old.sha256)throw Error('Previous pack does not match registry');
 const previousPack=JSON.parse(previous);for(const b of previousPack.books){const next=pack.books.find(x=>x.id===b.id);if(!next||JSON.stringify(next)!==JSON.stringify(b))throw Error('Existing full edition would change');}
 if(!p.apply){console.log(JSON.stringify({mode:'verified-dry-run',source:p.source,currentVersion:old.version,nextVersion:p.version,books:pack.books.length,chapters:590,bytes:data.length,sha256:p.sha256,existingBooksUnchanged:previousPack.books.length,provider:'COS',catalogueChanged:false}));return;}
 if(!p.reviewed)throw Error('Source review confirmation missing');
 phase='publish-lock';lockHandle=fs.openSync(lock,'wx',0o600);
 if(query().version!==p.expectedVersion||query().sha256!==p.expectedSha256)throw Error('Concurrent update refused');
 phase='new-object-preflight';const present=await service.statObject({partition:'learning_content',objectKey:newKey});
 if(present.ok){if(hash(await readObject(newKey))!==p.sha256)throw Error('Existing target differs; no overwrite');}
 else{
  if(!/NoSuchKey|does not exist|not exist|404|^Not Found$/i.test(present.error||''))throw Error('COS target existence unconfirmed; no overwrite');
  phase='stage-original';const handle=fs.openSync(stage,'wx',0o600);stageOwned=true;try{fs.writeFileSync(handle,data);fs.fsyncSync(handle);}finally{fs.closeSync(handle);}
  phase='cos-upload';const uploaded=await service.putObject({partition:'learning_content',objectKey:newKey,filePath:stage,sha256:p.sha256,owner:'system'});if(!uploaded.ok||uploaded.provider!=='COS')throw Error('COS upload not confirmed; current catalogue retained');
 }
 phase='new-pack-full-readback';const actual=await readObject(newKey);if(actual.length!==data.length||hash(actual)!==p.sha256)throw Error('COS complete readback failed; current catalogue retained');
 phase='registry-compare-and-swap';db.transaction(()=>{
  const current=query();if(current.version!==p.expectedVersion||current.sha256!==p.expectedSha256)throw Error('Concurrent catalogue update; no replacement');
  fs.writeFileSync(root+'/data/tcm-original-editions.registry.previous.json',JSON.stringify(current,null,2)+'\n',{mode:0o600});
  const changed=db.prepare("UPDATE offline_content_packs SET name=?,version=?,size_bytes=?,sha256=?,description=?,object_key=?,updated_at=? WHERE pack_id=? AND version=? AND sha256=? AND status='PUBLISHED' AND delivery_provider='COS' AND access_level='PUBLIC'").run('中医原典录文扩充 · 32部590篇卷',p.version,data.length,p.sha256,'原十部保留；新增经方医家原作与针灸文献。录文版含256处未收原图的位置说明，现代著作及编者文未冒充全文，来源和校勘边界随书标注。',newKey,new Date().toISOString(),p.packId,p.expectedVersion,p.expectedSha256);
  if(changed.changes!==1)throw Error('Catalogue compare-and-swap refused');
 })();const row=query();if(row.version!==p.version||row.sha256!==p.sha256)throw Error('Registry readback unconfirmed');
 console.log(JSON.stringify({mode:'cos-readback-and-catalogue-published',source:p.source,packId:p.packId,version:row.version,books:32,chapters:590,bytes:data.length,sha256:row.sha256,provider:'COS',accessLevel:row.access_level,previousVersion:old.version,previousObjectRetained:true,existingBooksUnchanged:previousPack.books.length,credentialsChanged:false,clientBuildRequired:false,verifiedAt:new Date().toISOString()}));
 }catch{console.error('Original-text publication not confirmed at '+phase+'. Inspect exact current version before retry; no secrets logged.');process.exitCode=1;}
 finally{if(stageOwned&&fs.existsSync(stage))fs.unlinkSync(stage);if(lockHandle!==undefined){fs.closeSync(lockHandle);fs.unlinkSync(lock);}if(db)db.close();}
});
'''

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',required=True);p.add_argument('--expected-version',required=True);p.add_argument('--expected-sha256',required=True);p.add_argument('--evidence',required=True,type=Path);p.add_argument('--retain',required=True,type=Path);p.add_argument('--apply',action='store_true');p.add_argument('--reviewed',action='store_true');a=p.parse_args()
    assert re.fullmatch('[0-9a-f]{40}',a.source) and re.fullmatch('[0-9a-f]{64}',a.expected_sha256)
    assert not a.apply or a.reviewed
    def source(name):return json.loads(subprocess.check_output(['git','show',a.source+':'+name]))
    old=[*source('src/data/tcmOriginalEditions.json'),source('src/data/nanjingOriginal.json'),*source('src/data/tcmClinicalOriginalEditions.json')]
    books=old+source('backend_deploy/data/tcm-jingfang-originals.json');pack={'schema':'yandao.tcm.original-editions.v1','version':'1.2.0','books':books}
    data=json.dumps(pack,ensure_ascii=False,separators=(',',':')).encode()
    # Use the existing client's actual schema policy before touching production.
    checker="const fs=require('fs'),assert=require('assert');const {isCompatibleTcmEditionPack}=require('./src/lib/tcmEditionPack.ts');const p=JSON.parse(fs.readFileSync(0,'utf8'));assert.equal(isCompatibleTcmEditionPack(p,p.books.slice(0,10)),true);console.log('compatible')"
    subprocess.run(['node','--experimental-strip-types','-e',checker],input=data,capture_output=True,check=True)
    assert str(a.retain.resolve()).lower().startswith('e:')
    a.retain.parent.mkdir(parents=True,exist_ok=True)
    if a.retain.exists():assert a.retain.read_bytes()==data
    else:
        with a.retain.open('xb') as out:out.write(data)
    spec={'source':a.source,'packId':'tcm-original-editions-approved','version':'1.2.0','sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'expectedVersion':a.expected_version,'expectedSha256':a.expected_sha256,'apply':a.apply,'reviewed':a.reviewed}
    result=subprocess.run(['ssh','-o','BatchMode=yes','root@82.156.228.87','node -e '+shlex.quote(REMOTE)],input=json.dumps(spec).encode()+b'\n'+gzip.compress(data),capture_output=True,timeout=360)
    if result.returncode:raise RuntimeError(result.stderr.decode(errors='replace')[-600:])
    proof=json.loads(result.stdout);proof['retainedPackage']=str(a.retain);a.evidence.write_bytes((json.dumps(proof,ensure_ascii=False,indent=2)+'\n').encode());print(json.dumps(proof,ensure_ascii=False))
if __name__=='__main__':main()
