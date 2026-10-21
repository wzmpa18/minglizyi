"""Publish reviewed public course data through existing server-side admin auth, no client build."""
import argparse,base64,json,shlex,subprocess
from pathlib import Path
REMOTE=r'''
const fs=require('fs'),crypto=require('crypto');let input='';process.stdin.on('data',b=>input+=b).on('end',async()=>{try{
const p=JSON.parse(input),root='/www/yandaoguoxue-backend',policy=require(root+'/studyContentPolicy'),check=policy.validateStudyCatalog(p.catalog);if(!check.ok)throw Error('Catalog rejected');
const env=require(root+'/node_modules/dotenv').parse(fs.readFileSync(root+'/.env'));let key=env.ADMIN_API_KEY;
if(!key){const {execFileSync}=require('child_process');const proc=JSON.parse(execFileSync('pm2',['jlist'],{encoding:'utf8',maxBuffer:5000000})).find(x=>x.name==='yandaoguoxue-backend');key=proc?.pm2_env?.ADMIN_API_KEY;}
if(!key)throw Error('Existing admin key unavailable; no credential changed');
const url='http://127.0.0.1:3001/api/academy/admin/starter-content',headers={'Content-Type':'application/json','x-admin-key':key};
const before=await fetch(url,{headers});if(!before.ok)throw Error('Admin authorization failed');const current=await before.json();
if(current.catalog.revision!==p.expectedRevision||p.catalog.revision!==p.expectedRevision+1)throw Error('Revision changed; reread and merge');
if(!p.apply){console.log(JSON.stringify({mode:'validated-dry-run',currentRevision:current.catalog.revision,nextRevision:p.catalog.revision,lessons:p.catalog.lessons.length}));return;}
if(!p.reviewed)throw Error('Review confirmation required');
const response=await fetch(url,{method:'PUT',headers,body:JSON.stringify({catalog:p.catalog,expectedRevision:p.expectedRevision,reviewed:true})});if(!response.ok)throw Error('Publication unconfirmed; read current revision before retry');
const result=await response.json(),read=await fetch(url,{headers}).then(r=>r.json());if(!result.success||JSON.stringify(read.catalog)!==JSON.stringify(p.catalog))throw Error('Readback mismatch; do not retry blindly');
console.log(JSON.stringify({mode:'published-and-readback',revision:read.catalog.revision,lessons:read.catalog.lessons.length,questions:read.catalog.lessons.flatMap(x=>x.questions).length,sha256:read.sha256,verifiedAt:new Date().toISOString(),credentialLogged:false}));
}catch(e){console.error(e.message);process.exitCode=1;}});
'''
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--catalog',required=True,type=Path);p.add_argument('--expected-revision',required=True,type=int);p.add_argument('--evidence',required=True,type=Path);p.add_argument('--apply',action='store_true');p.add_argument('--reviewed',action='store_true');a=p.parse_args()
 data=json.loads(a.catalog.read_bytes());assert len(a.catalog.read_bytes())<=2000000
 assert not a.apply or a.reviewed,'Read and confirm source/answers before publishing'
 body=json.dumps({'catalog':data,'expectedRevision':a.expected_revision,'reviewed':a.reviewed,'apply':a.apply}).encode()
 command='node -e '+shlex.quote(REMOTE)
 result=subprocess.run(['ssh','-o','BatchMode=yes','root@82.156.228.87',command],input=body,capture_output=True,timeout=40)
 if result.returncode:raise RuntimeError(result.stderr.decode(errors='replace')[-1000:])
 proof=json.loads(result.stdout);a.evidence.write_bytes((json.dumps(proof,ensure_ascii=False,indent=2)+'\n').encode());print(json.dumps(proof,ensure_ascii=False))
if __name__=='__main__':main()
