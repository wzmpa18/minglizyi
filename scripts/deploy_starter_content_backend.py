"""Pinned Guoxue course reader deployment. Existing edited catalog is never replaced."""
import argparse,base64,hashlib,json,re,shlex,subprocess
from pathlib import Path

MODULES=['academyRoutes.js','studyContentPolicy.js','studyContentStore.js']
REMOTE=r'''
import sys,json,base64,hashlib,os,subprocess,time,urllib.request,datetime
from pathlib import Path
p=json.load(sys.stdin);root=Path('/www/yandaoguoxue-backend');digest=lambda b:hashlib.sha256(b).hexdigest()
assert set(p['files'])=={'academyRoutes.js','studyContentPolicy.js','studyContentStore.js'}
old={};changed=[];staged=[];installed=[];seed=root/'data/study-starter-public.json';initialized=False
for name,item in p['files'].items():
 f=root/name;assert not f.is_symlink();old[name]=f.read_bytes() if f.exists() else None
 assert (digest(old[name]) if old[name] is not None else None)==item['expected'],'Live source drift: '+name
 assert digest(base64.b64decode(item['content'],validate=True))==item['sha256']
 if old[name] is None or digest(old[name])!=item['sha256']:changed.append(name)
assert not seed.is_symlink()
result={'source':p['source'],'mode':'dry-run','modules':{n:i['sha256'] for n,i in p['files'].items()},'existingCatalogPreserved':seed.exists(),'databaseChanged':False,'credentialsChanged':False}
if not p['apply']:print(json.dumps(result));sys.exit()
try:
 for name in changed:
  f=root/(name+'.next.js');assert not f.exists();f.write_bytes(base64.b64decode(p['files'][name]['content']));staged.append(f)
  subprocess.run(['node','--check',str(f)],check=True,capture_output=True)
 for name in changed:
  if old[name] is not None:(root/(name+'.previous')).write_bytes(old[name])
  os.replace(root/(name+'.next.js'),root/name);installed.append(name)
 if not seed.exists():
  data=base64.b64decode(p['seed'],validate=True);assert digest(data)==p['seedSha256']
  validation=subprocess.run(['node','-e',"const p=require('./studyContentPolicy');let b='';process.stdin.on('data',c=>b+=c).on('end',()=>{if(!p.validateStudyCatalog(JSON.parse(b)).ok)process.exit(1)})"],cwd=root,input=data,capture_output=True)
  assert validation.returncode==0,'Seed rejected'
  with seed.open('xb') as f:f.write(data)
  os.chmod(seed,0o600);initialized=True
 subprocess.run(['pm2','restart','yandaoguoxue-backend'],check=True,capture_output=True)
 for attempt in range(25):
  try:
   with urllib.request.urlopen('http://127.0.0.1:3001/api/academy/starter-content',timeout=3) as response:live=json.load(response)
   if live.get('success') and len(live['catalog']['lessons'])>=24:break
  except Exception:pass
  time.sleep(1)
 else:raise RuntimeError('Public course readback failed')
 for n,i in p['files'].items():assert digest((root/n).read_bytes())==i['sha256']
 result.update(mode='deployed-and-readback',catalogInitialized=initialized,revision=live['catalog']['revision'],lessons=len(live['catalog']['lessons']),verifiedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
 print(json.dumps(result))
except Exception:
 for name in reversed(installed):
  if old[name] is None:(root/name).unlink(missing_ok=True)
  else:(root/name).write_bytes(old[name])
 for f in staged:f.unlink(missing_ok=True)
 # Remove only the seed created by this failed deployment, never an existing editor catalog.
 if initialized:seed.unlink()
 subprocess.run(['pm2','restart','yandaoguoxue-backend'],capture_output=True)
 raise
'''

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',required=True);p.add_argument('--expected',required=True,type=Path);p.add_argument('--evidence',required=True,type=Path);p.add_argument('--apply',action='store_true');a=p.parse_args()
 assert re.fullmatch('[0-9a-f]{40}',a.source)
 expected=json.loads(a.expected.read_text(encoding='utf-8-sig'));assert set(expected)==set(MODULES)
 files={}
 for n in MODULES:
  assert expected[n] is None or re.fullmatch('[0-9a-f]{64}',expected[n])
  data=subprocess.check_output(['git','show',a.source+':backend_deploy/'+n]);files[n]={'expected':expected[n],'sha256':hashlib.sha256(data).hexdigest(),'content':base64.b64encode(data).decode()}
 seed=subprocess.check_output(['git','show',a.source+':backend_deploy/data/study-starter-public.json'])
 body=json.dumps({'source':a.source,'files':files,'seed':base64.b64encode(seed).decode(),'seedSha256':hashlib.sha256(seed).hexdigest(),'apply':a.apply}).encode()
 result=subprocess.run(['ssh','-o','BatchMode=yes','root@82.156.228.87','python3 -c '+shlex.quote(REMOTE)],input=body,capture_output=True,timeout=110)
 if result.returncode:raise RuntimeError('Deployment refused or failed: '+result.stderr.decode(errors='replace')[-1500:])
 proof=json.loads(result.stdout);a.evidence.write_bytes((json.dumps(proof,ensure_ascii=False,indent=2)+'\n').encode());print(json.dumps(proof,ensure_ascii=False))
if __name__=='__main__':main()
