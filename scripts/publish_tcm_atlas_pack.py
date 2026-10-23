"""Publish the audited data pack through the existing private COS learning partition."""
import argparse,base64,hashlib,json,subprocess
from pathlib import Path
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--pack',type=Path,required=True);p.add_argument('--evidence',type=Path,required=True);p.add_argument('--reuse-staged',action='store_true');a=p.parse_args()
 digest=hashlib.sha256(a.pack.read_bytes()).hexdigest();assert digest=='b1c9a4826551cb54152141e104f405f89dcf497434c6bd3ca7987683b40d2f4b'
 remote='/tmp/yandao-atlas-'+digest[:16]+'.pack'
 if not a.reuse_staged:subprocess.run(['scp','-o','BatchMode=yes',str(a.pack),'root@82.156.228.87:'+remote],check=True)
 js="""require('dotenv').config({quiet:true});const fs=require('fs'),crypto=require('crypto'),e=require('./offlinePackEngine');
(async()=>{const file=FILE,expected=SHA;const actual=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');if(actual!==expected)throw Error('Staging SHA mismatch');
let existing=e.listPacksAdmin({}).list.find(p=>p.packId==='tcm-anatomy-atlas-v3');let stage='existing';
if(!existing||existing.sha256!==expected){const registered=e.registerPack({packId:'tcm-anatomy-atlas-v3',contentType:'STUDY_MATERIALS',name:'三维解剖与经络学习图谱',version:'3.0.0',minAppVersion:'25.0.115',required:false,accessLevel:'MEMBER',filePath:file,description:'15系统、2234来源网格；穴位工程示意未逐穴医学核校；独立MIT与CC BY4.0署名。'});if(!registered.ok)throw Error(registered.error);stage='registered';}
fs.unlinkSync(file);existing=e.listPacksAdmin({}).list.find(p=>p.packId==='tcm-anatomy-atlas-v3');
if(existing.deliveryProvider!=='COS'){const sent=await e.distributePack('tcm-anatomy-atlas-v3');if(!sent.ok){console.log('ATLAS_PROOF:'+JSON.stringify({ok:false,stage,sha256:expected,code:sent.status||'COS_UPLOAD_FAILED',error:sent.error,productionPublished:false}));return;}stage='distributed';}
const publish=e.setPackStatus({packId:'tcm-anatomy-atlas-v3',action:'publish'});const item=e.getManifest().packs.find(p=>p.packId==='tcm-anatomy-atlas-v3');console.log('ATLAS_PROOF:'+JSON.stringify({ok:publish.ok,stage,sha256:item?.sha256,bytes:item?.size,version:item?.version,accessLevel:item?.accessLevel,provider:item?.deliveryProvider,productionPublished:!!item,verifiedAt:new Date().toISOString()}));
})().catch(()=>{console.log('ATLAS_PROOF:'+JSON.stringify({ok:false,stage:'failed',productionPublished:false}));process.exitCode=1;});""".replace('FILE',json.dumps(remote)).replace('SHA',json.dumps(digest))
 py='import subprocess\nr=subprocess.run(["node","-e",'+repr(js)+'],cwd="/www/yandaoguoxue-backend",capture_output=True,text=True)\nprint("\\n".join(x for x in r.stdout.splitlines() if x.startswith("ATLAS_PROOF:")))\n'
 b64=base64.b64encode(py.encode()).decode();result=subprocess.check_output(['ssh','-o','BatchMode=yes','root@82.156.228.87',"python3 -c \"import base64;exec(base64.b64decode('"+b64+"'))\""],text=True)
 line=next(x for x in result.splitlines() if x.startswith('ATLAS_PROOF:'));proof=json.loads(line.removeprefix('ATLAS_PROOF:'));a.evidence.write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(proof,ensure_ascii=False))
if __name__=='__main__':main()
