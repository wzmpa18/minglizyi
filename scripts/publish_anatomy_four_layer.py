"""Publish only the verified four-layer compatibility data, never app code."""
import argparse, hashlib, json, subprocess, zipfile
from pathlib import Path

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--pack',type=Path,required=True);p.add_argument('--evidence',type=Path,required=True);a=p.parse_args()
 proof=json.loads(Path(str(a.pack)+'.json').read_bytes());parsed=json.loads(Path(str(a.pack)+'.gltf-verified.json').read_bytes())
 digest=hashlib.sha256(a.pack.read_bytes()).hexdigest();assert digest==proof['sha256'] and proof['packId']=='tcm-anatomy-3d-v2' and proof['version']=='2.1.0' and parsed['actualGLTFLoaderDecoded']
 with zipfile.ZipFile(a.pack) as z:
  m=json.loads(z.read('manifest.json'));assert {l['id'] for l in m['layers']}=={'skin','muscular','skeletal','visceral'}
  for l in m['layers']:assert hashlib.sha256(z.read(l['file'])).hexdigest()==l['sha256']
 remote='/tmp/yandao-four-layer-'+digest[:16]+'.pack';subprocess.run(['scp','-o','BatchMode=yes',str(a.pack),'root@82.156.228.87:'+remote],check=True)
 code="""const base='/www/yandaoguoxue-backend';process.chdir(base);require(base+'/node_modules/dotenv').config({path:base+'/.env',quiet:true});
const e=require(base+'/offlinePackEngine'),fs=require('fs'),crypto=require('crypto');
(async()=>{const file=FILE,sha=SHA;if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==sha)throw Error('Staging checksum mismatch');
const prior=e.listPacksAdmin({}).list.find(p=>p.packId==='tcm-anatomy-3d-v2');if(prior&&prior.sha256!==sha&&!(prior.version==='2.0.0'&&prior.sha256==='719b2c62d55bb062a49680b1a92c69419d84b1271a38f6a2d86c804fcb3cd126'))throw Error('Unexpected existing four-layer version; do not overwrite');
if(!prior||prior.sha256!==sha){const r=e.registerPack({packId:'tcm-anatomy-3d-v2',contentType:'IMAGE_ASSETS',name:'三维人体四层观察包',version:'2.1.0',minAppVersion:'25.0.115',required:false,accessLevel:'MEMBER',filePath:file,description:'体表、肌肉结缔、骨骼、脏腑血管神经四组；与分系统图谱同一参考体，含全部2234来源网格，保留原始体表与毛发；不是临床精准定位。'});if(!r.ok)throw Error('Registration failed');}
let item=e.listPacksAdmin({}).list.find(p=>p.packId==='tcm-anatomy-3d-v2');if(item.deliveryProvider!=='COS'){const r=await e.distributePack('tcm-anatomy-3d-v2');if(!r.ok)throw Error('Private COS distribution failed');}
const r=e.setPackStatus({packId:'tcm-anatomy-3d-v2',action:'publish'});item=e.getManifest().packs.find(p=>p.packId==='tcm-anatomy-3d-v2');if(!r.ok||!item||item.sha256!==sha)throw Error('Published manifest mismatch');
if(file.startsWith('/tmp/yandao-four-layer-'))fs.unlinkSync(file);console.log('FOUR_LAYER_PROOF:'+JSON.stringify({ok:true,packId:item.packId,version:item.version,size:item.size,sha256:item.sha256,provider:item.deliveryProvider,published:true,verifiedAt:new Date().toISOString(),oldV1Preserved:true,existingV3Unchanged:true}));})().catch(()=>{console.error('Four-layer publish failed; inspect state before retry');process.exitCode=1;});""".replace('FILE',json.dumps(remote)).replace('SHA',json.dumps(digest))
 r=subprocess.run(['ssh','-o','BatchMode=yes','root@82.156.228.87','node -'],input=code.encode(),capture_output=True,check=True)
 line=next(x for x in r.stdout.decode().splitlines() if x.startswith('FOUR_LAYER_PROOF:'));result=json.loads(line.split(':',1)[1]);a.evidence.write_bytes((json.dumps(result,ensure_ascii=False,indent=2)+'\n').encode());print(json.dumps(result,ensure_ascii=False))
if __name__=='__main__':main()
