"""CAS deployment of server-owned report policy, with no client repack or database change.

Pins source and exact live server hash; patches three call sites, preserves one
previous revision, checks syntax and service health, rolls back on failure.
"""
import argparse,base64,hashlib,json,re,shlex,subprocess
from pathlib import Path

REMOTE=r'''
import sys,json,base64,hashlib,subprocess,time,urllib.request,datetime
from pathlib import Path
p=json.load(sys.stdin);root=Path('/www/yandaoguoxue-backend');sha=lambda b:hashlib.sha256(b).hexdigest()
server=root/'server.js';assert not server.is_symlink();old=server.read_bytes();assert sha(old)==p['expectedServer']
new=old
for before,after in p['patches']:
 before=before.encode();after=after.encode();assert new.count(before)==1
 new=new.replace(before,after,1)
assert b"require('./chartStudyQuality')" in new
original={'server.js':old};updates={'server.js':new}
for name,item in p['files'].items():
 assert name in ['chartStudyQuality.js','toolStudySources.js']
 f=root/name;assert not f.is_symlink();before=f.read_bytes() if f.exists() else None
 assert (sha(before) if before is not None else None)==item['expected']
 data=base64.b64decode(item['content']);assert sha(data)==item['sha256']
 original[name]=before;updates[name]=data
proof={'source':p['source'],'before':{n:sha(b) if b is not None else None for n,b in original.items()},'after':{n:sha(b) for n,b in updates.items()},'mode':'dry-run','databaseChanged':False,'credentialsChanged':False,'clientsRepacked':False}
if not p['apply']:print(json.dumps(proof));sys.exit()
replaced=[]
try:
 for name,data in updates.items():
  f=root/(name+'.next.js');assert not f.exists();f.write_bytes(data)
  subprocess.run(['node','--check',str(f)],check=True,capture_output=True)
 for name,data in updates.items():
  target=root/name
  if original[name] is not None:target.with_name(name+'.previous').write_bytes(original[name])
  (root/(name+'.next.js')).replace(target);replaced.append(name)
 subprocess.run(['node','-e',"require('./chartStudyQuality')"],cwd=root,check=True,capture_output=True)
 subprocess.run(['pm2','restart','yandaoguoxue-backend'],check=True,capture_output=True)
 healthy=False
 for _ in range(20):
  try:
   with urllib.request.urlopen('http://127.0.0.1:3001/api/health',timeout=2) as r:healthy=r.status==200
  except Exception:pass
  if healthy:break
  time.sleep(1)
 assert healthy
 for name,data in updates.items():assert sha((root/name).read_bytes())==sha(data)
 proof.update(mode='deployed-and-health-verified',verifiedAt=datetime.datetime.now(datetime.timezone.utc).isoformat());print(json.dumps(proof))
except Exception:
 for name in reversed(replaced):
  if original[name] is None:(root/name).unlink(missing_ok=True)
  else:(root/name).write_bytes(original[name])
 subprocess.run(['pm2','restart','yandaoguoxue-backend'],capture_output=True)
 raise
finally:
 for name in updates:(root/(name+'.next.js')).unlink(missing_ok=True)
'''

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',required=True);p.add_argument('--expected-server',required=True);p.add_argument('--evidence',required=True,type=Path);p.add_argument('--apply',action='store_true');a=p.parse_args()
 assert re.fullmatch('[a-f0-9]{40}',a.source) and re.fullmatch('[a-f0-9]{64}',a.expected_server)
 files={}
 for name in ['chartStudyQuality.js','toolStudySources.js']:
  data=subprocess.check_output(['git','show',a.source+':backend_deploy/'+name]);files[name]={'expected':None,'content':base64.b64encode(data).decode(),'sha256':hashlib.sha256(data).hexdigest()}
 patches=[("require('./liurenStudyQuality')","require('./chartStudyQuality')"),('validateStudyReport(content);','validateStudyReport(content, studyRequest);'),('appendSourceNotes(content);','appendSourceNotes(content, studyRequest);')]
 payload={'source':a.source,'expectedServer':a.expected_server,'files':files,'patches':patches,'apply':a.apply}
 result=subprocess.run(['ssh','-o','BatchMode=yes','root@82.156.228.87','python3 -c '+shlex.quote(REMOTE)],input=json.dumps(payload).encode(),capture_output=True,timeout=90)
 if result.returncode:raise RuntimeError(result.stderr.decode()[-1500:])
 proof=json.loads(result.stdout);a.evidence.write_bytes((json.dumps(proof,ensure_ascii=False,indent=2)+'\n').encode());print(json.dumps(proof))
if __name__=='__main__':main()
