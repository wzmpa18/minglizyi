"""Install the owner-approved provider bootstrap only in existing Guoxue processes."""
import argparse,base64,hashlib,json,re,shlex,subprocess
from pathlib import Path

REMOTE=r'''
import sys,json,base64,hashlib,subprocess,time,urllib.request
from pathlib import Path
d=json.load(sys.stdin);root=Path('/www/yandaoguoxue-backend');sha=lambda x:hashlib.sha256(x).hexdigest()
helper=root/'aiProviderPolicy.js';body=base64.b64decode(d['helper']);assert sha(body)==d['helperSHA']
assert not helper.exists() or helper.read_bytes()==body
rows=[]
for name,expected in d['baseline'].items():
 assert name in ['server.js','wechatContentScheduler.js','wechatContentScheduler.server.js','newsAiScheduler.js']
 p=root/name;assert not p.is_symlink();old=p.read_bytes();assert sha(old)==expected['sha256']
 lines=expected['dotenvLines'];assert len(lines)==1
 needle=lines[0].encode();assert old.count(needle)==1
 addition=b"\nrequire('./aiProviderPolicy').activateHunyuanOnly();"
 assert addition not in old
 stage=p.with_name(name+'.hunyuan-next.js')
 new=old.replace(needle,needle+addition)
 legacy=p.with_name(name+'.hunyuan-next')
 if legacy.exists():
  assert not stage.exists() and legacy.read_bytes()==new
  legacy.replace(stage)
 if stage.exists():assert stage.read_bytes()==new
 else:stage.write_bytes(new)
 subprocess.run(['node','--check',str(stage)],check=True,capture_output=True)
 backup=p.with_name(name+'.before-hunyuan-20261029');assert not backup.exists() or backup.read_bytes()==old
 backup.write_bytes(old);backup.chmod(0o600)
 rows.append((p,old,stage,new))
helper.write_bytes(body);subprocess.run(['node','--check',str(helper)],check=True,capture_output=True)
try:
 for p,old,stage,new in rows:assert p.read_bytes()==old;stage.replace(p)
 subprocess.run(['pm2','restart','yandaoguoxue-backend'],check=True,capture_output=True)
 ok=False
 for _ in range(20):
  try:
   with urllib.request.urlopen('http://127.0.0.1:3001/api/health',timeout=2) as r:ok=r.status==200
  except Exception:pass
  if ok:break
  time.sleep(1)
 assert ok,'Backend health failed'
 print(json.dumps({'source':d['source'],'mode':'hunyuan-only','healthy':ok,'configurationFilesModified':False,'otherProcessesRestarted':False,'files':[{'name':p.name,'before':sha(old),'after':sha(new),'onlyBootstrapChanged':new.replace(addition,b'')==old} for p,old,stage,new in rows]}))
except:
 for p,old,_,_ in rows:p.write_bytes(old)
 subprocess.run(['pm2','restart','yandaoguoxue-backend'],capture_output=True)
 raise
'''

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source',required=True);p.add_argument('--baseline',type=Path,required=True);p.add_argument('--evidence',type=Path,required=True)
    a=p.parse_args();assert re.fullmatch('[a-f0-9]{40}',a.source)
    body=subprocess.check_output(['git','show',a.source+':backend_deploy/aiProviderPolicy.js'])
    spec={'source':a.source,'baseline':json.loads(a.baseline.read_text(encoding='utf-8')),'helper':base64.b64encode(body).decode(),'helperSHA':hashlib.sha256(body).hexdigest()}
    assert not a.evidence.exists()
    result=subprocess.run(['ssh','-o','BatchMode=yes','root@82.156.228.87','python3 -c '+shlex.quote(REMOTE)],input=json.dumps(spec).encode(),capture_output=True,timeout=60,check=True)
    proof=json.loads(result.stdout);a.evidence.write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8');print(json.dumps(proof))

if __name__=='__main__':main()
