"""Deploy only the reviewed recovery fix; preserve unrelated live server changes."""
import argparse, base64, hashlib, json, shlex, subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--source', required=True)
parser.add_argument('--expected', required=True)
parser.add_argument('--evidence', required=True)
parser.add_argument('--apply', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
source = subprocess.check_output(['git', 'rev-parse', args.source + '^{commit}'], cwd=root, text=True).strip()
names = ['register_routes.js', 'businessIdentityGate.js', 'middleware/auth.js']
expected = json.loads(Path(args.expected).read_text(encoding='utf-8'))
assert set(expected) == set(names + ['server.js'])
files = {}
for name in names:
    data = subprocess.check_output(['git', 'show', source + ':backend_deploy/' + name], cwd=root)
    files[name] = base64.b64encode(data).decode()
payload = {'source': source, 'expected': expected, 'files': files, 'apply': args.apply}
remote = r'''
import sys,json,base64,hashlib,subprocess,sqlite3,time,urllib.request,urllib.error,datetime,os
from pathlib import Path
p=json.load(sys.stdin); root=Path('/www/yandaoguoxue-backend')
sha=lambda b:hashlib.sha256(b).hexdigest()
names=['register_routes.js','businessIdentityGate.js','middleware/auth.js','server.js']
assert set(p['expected'])==set(names) and set(p['files'])==set(names[:-1])
assert len(p['source'])==40 and all(c in '0123456789abcdef' for c in p['source'])
processes=[x for x in json.loads(subprocess.check_output(['pm2','jlist'])) if x.get('name')=='yandaoguoxue-backend']
assert len(processes)==1 and processes[0]['pm2_env']['pm_cwd']==str(root)
original={n:(root/n).read_bytes() for n in names}
assert all(sha(original[n])==p['expected'][n] for n in names),'Live code changed; stop before mutation'
new={n:base64.b64decode(v,validate=True) for n,v in p['files'].items()}
before=b'SELECT user_id,phone,phone_verified_at,status,deleted_at FROM users WHERE user_id=?'
after=b'SELECT user_id,phone,phone_verified_at,status,deleted_at,auth_version FROM users WHERE user_id=?'
assert original['server.js'].count(before)==1
new['server.js']=original['server.js'].replace(before,after)
proof={'source':p['source'],'applied':False,'serverDriftPreserved':True,'before':{n:sha(original[n]) for n in names},'after':{n:sha(new[n]) for n in names},'personalPasswordsChanged':False,'accountsCreated':False}
if p['apply']:
 backup=root/'data'/('password-recovery-'+p['source'][:12]);backup.mkdir(mode=0o700,exist_ok=False)
 database='/root/backend-auth/data/yandao_users.db'
 with sqlite3.connect('file:'+database+'?mode=ro',uri=True) as live, sqlite3.connect(str(backup/'accounts.db')) as dest:live.backup(dest)
 os.chmod(backup/'accounts.db',0o600)
 for n in names:
  f=backup/n;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(original[n]);os.chmod(f,0o600)
 try:
  staged={}
  for n in names:
   f=root/(n+'.recovery-next.js');f.write_bytes(new[n]);subprocess.run(['node','--check',str(f)],check=True,capture_output=True);staged[n]=f
  for n in names:os.replace(staged[n],root/n)
  subprocess.run(['pm2','restart','yandaoguoxue-backend'],check=True,capture_output=True)
  healthy=False
  for _ in range(15):
   try:
    with urllib.request.urlopen('http://127.0.0.1:3001/api/health',timeout=3) as r:healthy=r.status==200
    if healthy:break
   except Exception:time.sleep(1)
  assert healthy,'Health did not recover'
  req=urllib.request.Request('http://127.0.0.1:3001/api/auth/reset-password',data=b'{}',headers={'Content-Type':'application/json'})
  try:urllib.request.urlopen(req,timeout=10);raise AssertionError('Empty reset accepted')
  except urllib.error.HTTPError as e:assert e.code==400
  assert all(sha((root/n).read_bytes())==sha(new[n]) for n in names)
  proof.update(applied=True,health=True,emptyResetStatus=400,backup=str(backup))
 except Exception:
  for n in names:(root/n).write_bytes(original[n])
  subprocess.run(['pm2','restart','yandaoguoxue-backend'],capture_output=True)
  raise
proof['checkedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
print(json.dumps(proof))
'''
result = subprocess.run(['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', 'root@82.156.228.87', 'python3 -c ' + shlex.quote(remote)], input=json.dumps(payload), text=True, capture_output=True, timeout=90)
if result.returncode:
    raise SystemExit('Deployment stopped: ' + result.stderr[-700:])
proof = json.loads(result.stdout)
Path(args.evidence).write_text(json.dumps(proof, indent=2) + '\n', encoding='utf-8')
print(json.dumps(proof))
