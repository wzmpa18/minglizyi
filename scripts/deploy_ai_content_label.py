"""Deploy only the reviewed AI response metadata patch, preserving live-only code."""
import argparse, base64, hashlib, json, re, shlex, subprocess
from pathlib import Path

REMOTE = r'''
import sys,json,base64,hashlib,subprocess,time,urllib.request
from pathlib import Path
d=json.load(sys.stdin);root=Path('/www/yandaoguoxue-backend');p=root/'server.js'
sha=lambda b:hashlib.sha256(b).hexdigest()
assert not p.is_symlink();old=p.read_bytes();assert sha(old)==d['expected'],'Live source changed'
needle=d['needle'].encode();replacement=d['replacement'].encode()
assert old.count(needle)==1 and b"require('./aiContentLabel')" not in old
helper=root/'aiContentLabel.js';data=base64.b64decode(d['helper'])
assert sha(data)==d['helperSHA']
assert not helper.exists() or helper.read_bytes()==data
next_server=root/'server.aigc-next.js';next_helper=root/'aiContentLabel.aigc-next.js'
assert not next_server.exists() and not next_helper.exists()
next_server.write_bytes(old.replace(needle,replacement));next_helper.write_bytes(data)
for f in [next_server,next_helper]:subprocess.run(['node','--check',str(f)],check=True,capture_output=True)
backup=root/'server.before-aigc-2159';assert not backup.exists() or backup.read_bytes()==old
backup.write_bytes(old);backup.chmod(0o600)
try:
 assert p.read_bytes()==old
 next_helper.replace(helper);next_server.replace(p)
 subprocess.run(['pm2','restart','yandaoguoxue-backend'],check=True,capture_output=True)
 healthy=False
 for _ in range(20):
  try:
   with urllib.request.urlopen('http://127.0.0.1:3001/api/health',timeout=2) as response:healthy=response.status==200
  except Exception:pass
  if healthy:break
  time.sleep(1)
 assert healthy,'Backend health failed'
 print(json.dumps({'source':d['source'],'before':sha(old),'after':sha(p.read_bytes()),'helperSHA':sha(helper.read_bytes()),'healthy':True,'unrelatedLiveCodePreserved':p.read_bytes().replace(replacement,needle)==old,'backup':str(backup),'restartedOnly':'yandaoguoxue-backend'}))
except:
 p.write_bytes(old);subprocess.run(['pm2','restart','yandaoguoxue-backend'],capture_output=True)
 raise
'''

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',required=True)
    parser.add_argument('--expected-live-sha256',required=True)
    parser.add_argument('--evidence',type=Path,required=True)
    args=parser.parse_args()
    assert re.fullmatch('[a-f0-9]{40}',args.source) and re.fullmatch('[a-f0-9]{64}',args.expected_live_sha256)
    root=Path(__file__).resolve().parents[1]
    read=lambda name:subprocess.check_output(['git','show',args.source+':'+name],cwd=root)
    helper=read('backend_deploy/aiContentLabel.js')
    source=read('backend_deploy/server.js').decode()
    start=source.index("    const labelled = require('./aiContentLabel')")
    end=source.index('    res.json(labelled);',start)+len('    res.json(labelled);')
    payload={'source':args.source,'expected':args.expected_live_sha256,
      'needle':'    res.json({ success: true, content, usage, cached: false, data: { content, usage } });',
      'replacement':source[start:end], 'helper':base64.b64encode(helper).decode(),
      'helperSHA':hashlib.sha256(helper).hexdigest()}
    assert not args.evidence.exists()
    result=subprocess.run(['ssh','-o','BatchMode=yes','root@82.156.228.87','python3 -c '+shlex.quote(REMOTE)],input=json.dumps(payload).encode(),capture_output=True,timeout=60,check=True)
    proof=json.loads(result.stdout)
    args.evidence.parent.mkdir(parents=True,exist_ok=True)
    args.evidence.write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(proof))

if __name__=='__main__':main()
