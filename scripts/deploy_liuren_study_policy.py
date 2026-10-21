"""Deploy the pinned Liuren policy and two reviewed server hooks; preserve live server differences.

Runs syntax checks before activation, keeps one .previous, rolls back on failed
service health. Never copies credentials, databases or a complete local server.
"""
import argparse, base64, hashlib, json, shlex, subprocess
from pathlib import Path

REMOTE = r'''
import sys,json,hashlib,base64,subprocess,time,urllib.request,datetime
from pathlib import Path
p=json.load(sys.stdin);root=Path('/www/yandaoguoxue-backend');server=root/'server.js';module=root/'liurenStudyQuality.js'
assert not server.is_symlink() and not module.is_symlink()
sha=lambda b:hashlib.sha256(b).hexdigest()
old=server.read_bytes();assert sha(old)==p['expectedServer'],'Live server changed; review again'
updated=old
for hook in p['hooks']:
 before=base64.b64decode(hook['before']);after=base64.b64decode(hook['after'])
 assert updated.count(before)==1,'Hook context ambiguous'
 updated=updated.replace(before,after,1)
policy=base64.b64decode(p['module']);assert sha(policy)==p['moduleSHA']
proof={'source':p['source'],'previousServerSHA':sha(old),'serverSHA':sha(updated),'policySHA':sha(policy),'credentialsChanged':False,'databaseChanged':False,'mode':'dry-run'}
if not p['apply']:print(json.dumps(proof));sys.exit()
oldmodule=module.read_bytes() if module.exists() else None
stages=[(server,updated),(module,policy)]
try:
 for target,data in stages:
  pending=target.with_name(target.name+'.next.js');assert not pending.exists();pending.write_bytes(data)
  subprocess.run(['node','--check',str(pending)],check=True,capture_output=True)
 for target,data in stages:
  if target.exists():target.with_name(target.name+'.previous').write_bytes(target.read_bytes())
  target.with_name(target.name+'.next.js').replace(target)
 subprocess.run(['pm2','restart','yandaoguoxue-backend'],check=True,capture_output=True)
 healthy=False
 for _ in range(20):
  try:
   with urllib.request.urlopen('http://127.0.0.1:3001/health',timeout=3) as r: healthy=r.status==200
  except Exception:pass
  if healthy:break
  time.sleep(1)
 assert healthy
 assert sha(server.read_bytes())==proof['serverSHA'] and sha(module.read_bytes())==proof['policySHA']
 proof.update(mode='deployed-and-health-verified',verifiedAt=datetime.datetime.now(datetime.timezone.utc).isoformat());print(json.dumps(proof))
except Exception:
 server.write_bytes(old)
 if oldmodule is None:module.unlink(missing_ok=True)
 else:module.write_bytes(oldmodule)
 subprocess.run(['pm2','restart','yandaoguoxue-backend'],capture_output=True)
 raise
finally:
 for target,_ in stages:target.with_name(target.name+'.next.js').unlink(missing_ok=True)
'''

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source',required=True);p.add_argument('--expected-server',required=True)
    p.add_argument('--evidence',required=True,type=Path);p.add_argument('--apply',action='store_true');a=p.parse_args()
    import re
    assert re.fullmatch('[a-f0-9]{40}',a.source) and re.fullmatch('[a-f0-9]{64}',a.expected_server)
    git=lambda path:subprocess.check_output(['git','show',a.source+':'+path])
    policy=git('backend_deploy/liurenStudyQuality.js');new=git('backend_deploy/server.js')
    before1=b"    // ===== v25.0.61 FINAL-SEAL P2-B"
    index=new.index(before1);prefix=b"    const studyQuality = require('./liurenStudyQuality');\n    const studyRequest = studyQuality.applyStudyPolicy(finalMessages);\n    finalMessages = studyRequest.messages;\n"
    assert new[index-len(prefix):index]==prefix
    before2=b"    // v25.0.60 P0-3/P1-7";end=new.index(before2);start=new.index(b'    if (studyRequest.applied) {',index)
    hooks=[(before1,prefix+before1),(b"    const content = data.choices?.[0]?.message?.content || '';",b"    let content = data.choices?.[0]?.message?.content || '';"),(before2,new[start:end]+before2)]
    enc=lambda b:base64.b64encode(b).decode()
    payload={'source':a.source,'expectedServer':a.expected_server,'module':enc(policy),'moduleSHA':hashlib.sha256(policy).hexdigest(),'hooks':[{'before':enc(x),'after':enc(y)} for x,y in hooks],'apply':a.apply}
    result=subprocess.run(['ssh','-o','BatchMode=yes','root@82.156.228.87','python3 -c '+shlex.quote(REMOTE)],input=json.dumps(payload).encode(),capture_output=True,check=True,timeout=90)
    proof=json.loads(result.stdout);a.evidence.write_bytes((json.dumps(proof,ensure_ascii=False,indent=2)+'\n').encode());print(json.dumps(proof))
if __name__=='__main__':main()
