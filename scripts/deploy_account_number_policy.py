"""Pinned, additive account-number migration; never renumber or restore live users.

Default is read-only inspection. --apply validates exact prior module hashes,
tests full createUser with synthetic data in an isolated database, takes one
consistent private migration backup, installs guards, probes with ROLLBACK,
restarts only Guoxue and verifies health. External contacts are never called.
"""
import argparse,base64,hashlib,json,re,shlex,subprocess
from pathlib import Path
REMOTE=r'''
import json,sys,pathlib,hashlib,subprocess,sqlite3,tempfile,os,urllib.request,time,datetime,base64
p=json.load(sys.stdin);root=pathlib.Path('/www/yandaoguoxue-backend');auth=pathlib.Path('/root/backend-auth/data/yandao_users.db')
sha=lambda b:hashlib.sha256(b).hexdigest()
original={}
for name,item in p['files'].items():
 assert name in ['register_routes.js','userIdPolicy.js']
 file=root/name;assert not file.is_symlink();old=file.read_bytes() if file.exists() else None
 assert (sha(old) if old is not None else None)==item['expected'],'Live module changed: '+name
 assert sha(base64.b64decode(item['content']))==item['sha256'];original[name]=old
with sqlite3.connect('file:'+str(auth)+'?mode=ro',uri=True) as db:
 schema=db.execute("SELECT sql FROM sqlite_master WHERE name='users'").fetchone()[0]
 count=db.execute('SELECT count(*) FROM users').fetchone()[0]
 assert db.execute('SELECT count(*) FROM users WHERE user_id=100000').fetchone()[0]==1
 assert db.execute('SELECT max(user_id) FROM users WHERE user_id BETWEEN 100000 AND 899999').fetchone()[0]==100075
 before={'count':count,'maxLegacyId':db.execute('SELECT max(user_id) FROM users').fetchone()[0]}
proof={'source':p['source'],'before':before,'mode':'read-only-baseline-verified','renumberedUsers':0,'contactsSent':0}
if not p['apply']:print(json.dumps(proof));sys.exit(0)
assert original['userIdPolicy.js'] is None,'Initial migration already installed; inspect before maintenance'
candidate=root/'.register-sequence-candidate.js';assert not candidate.exists()
policy=root/'userIdPolicy.js';installed=False;migrated=False
fd,probe=tempfile.mkstemp(prefix='yandao-id-policy-',suffix='.sqlite');os.close(fd)
try:
 policy.write_bytes(base64.b64decode(p['files']['userIdPolicy.js']['content']))
 candidate.write_bytes(base64.b64decode(p['files']['register_routes.js']['content']))
 for f in [policy,candidate]:subprocess.run(['node','--check',str(f)],check=True,capture_output=True)
 with sqlite3.connect(probe) as db:
  db.execute(schema)
  for i in [100000,100075,910075,999999939]:db.execute('INSERT INTO users(user_id,nickname,email,password_hash,invite_code) VALUES(?,?,?,?,?)',(i,'synthetic',str(i)+'@example.invalid','!disabled','probe'+str(i)))
 env={**os.environ,'DB_PATH':probe,'JWT_SECRET':'isolated-policy-test-only-'+'x'*48,'NODE_ENV':'test'}
 program="""const r=require('./.register-sequence-candidate.js');const a=r.createUser({email:'sequence-one@example.invalid',password:'test-only-never-used'}, {skipAttribution:true}),b=r.createUser({email:'sequence-two@example.invalid',password:'test-only-never-used'}, {skipAttribution:true});let duplicate=false;try{r.createUser({email:'sequence-one@example.invalid',password:'test-only-never-used'},{skipAttribution:true})}catch{duplicate=true}const d=r.initDatabase(),n=require('./userIdPolicy').nextUserId(d),assets=d.prepare('SELECT count(*) n FROM user_assets WHERE user_id IN (?,?)').get(a.userId,b.userId).n;if(a.userId!==100076||b.userId!==100077||n!==100078||assets!==2||!duplicate)throw Error('FULL_REGISTRATION_PROBE_FAILED');console.log(JSON.stringify({allocated:[a.userId,b.userId],next:n,assets,duplicateRejected:duplicate}));d.close();process.exit(0);"""
 out=subprocess.run(['node','-e',program],cwd=root,env=env,capture_output=True,timeout=40,check=True)
 proof['isolatedFullRegistration']=json.loads(out.stdout.decode().splitlines()[-1])
 backup=auth.with_name('yandao_users.db.pre-creator-sequence');assert not backup.exists()
 with sqlite3.connect('file:'+str(auth)+'?mode=ro',uri=True) as source,sqlite3.connect(backup) as target:source.backup(target)
 os.chmod(backup,0o600);proof['migrationBackup']=str(backup)
 migration="""const D=require('better-sqlite3'),p=require('./userIdPolicy'),d=new D('/root/backend-auth/data/yandao_users.db');const state=p.initializeUserIdPolicy(d);const count=d.prepare('SELECT count(*) n FROM users').get().n;d.exec('BEGIN IMMEDIATE');let candidate;try{candidate=p.nextUserId(d);d.prepare('INSERT INTO users(user_id,nickname,email,password_hash,invite_code) VALUES(?,?,?,?,?)').run(candidate,'rollback-probe','sequence-probe@example.invalid','!disabled','__sequence_rollback_probe__');if(p.nextUserId(d)!==candidate+1)throw Error('LIVE_PROBE_FAILED');}finally{d.exec('ROLLBACK')}if(d.prepare('SELECT count(*) n FROM users').get().n!==count||p.nextUserId(d)!==candidate)throw Error('ROLLBACK_NOT_VERIFIED');console.log(JSON.stringify({state,next:candidate,liveProbe:'insert-then-rollback',persistedTestUsers:0,count}));d.close();"""
 migrated=True
 result=subprocess.run(['node','-e',migration],cwd=root,capture_output=True,check=True,timeout=30)
 migrated=True;proof['migration']=json.loads(result.stdout)
 old=root/'register_routes.js.previous';old.write_bytes(original['register_routes.js'])
 os.replace(candidate,root/'register_routes.js');installed=True
 subprocess.run(['pm2','restart','yandaoguoxue-backend'],check=True,capture_output=True,timeout=30)
 healthy=False
 for _ in range(25):
  try:
   with urllib.request.urlopen('http://127.0.0.1:3001/api/health',timeout=2) as response:healthy=response.status==200
   if healthy:break
  except Exception:pass
  time.sleep(1)
 assert healthy,'Migrated registration requires manual health recovery; do not restore the whole database'
 for name,item in p['files'].items():assert sha((root/name).read_bytes())==item['sha256']
 with sqlite3.connect('file:'+str(auth)+'?mode=ro',uri=True) as db:
  proof['usersAfter']=db.execute('SELECT count(*) FROM users').fetchone()[0]
  assert proof['usersAfter']>=count
  proof['nextAccountId']=db.execute('SELECT last_issued+1 FROM account_number_sequence WHERE singleton=1').fetchone()[0]
 proof.update(mode='additive-policy-installed-health-verified',verifiedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),after={n:i['sha256'] for n,i in p['files'].items()})
 print(json.dumps(proof))
finally:
 if migrated and not installed:
  with sqlite3.connect('file:'+str(auth)+'?mode=ro',uri=True) as db:active=db.execute("SELECT count(*) FROM sqlite_master WHERE type='trigger' AND name='account_number_insert_guard'").fetchone()[0]
  if active and candidate.exists():
   (root/'register_routes.js.previous').write_bytes(original['register_routes.js']);os.replace(candidate,root/'register_routes.js');installed=True
   subprocess.run(['pm2','restart','yandaoguoxue-backend'],capture_output=True,timeout=30)
 if candidate.exists():candidate.unlink()
 if not migrated and not installed and original['userIdPolicy.js'] is None:policy.unlink(missing_ok=True)
 # Once guards are active, old auto-rowid code is NOT a safe rollback writer.
 # Preserve migration + new writer for manual recovery; never overwrite user DB.
 for suffix in ['', '-wal', '-shm']:
  file=pathlib.Path(probe+suffix);assert file.parent==pathlib.Path(tempfile.gettempdir()) and file.name.startswith('yandao-id-policy-');file.unlink(missing_ok=True)
'''
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--source',required=True);parser.add_argument('--expected-register-sha',required=True);parser.add_argument('--evidence',type=Path,required=True);parser.add_argument('--apply',action='store_true');a=parser.parse_args()
 assert re.fullmatch('[0-9a-f]{40}',a.source) and re.fullmatch('[0-9a-f]{64}',a.expected_register_sha)
 files={}
 for name in ['register_routes.js','userIdPolicy.js']:
  data=subprocess.check_output(['git','show',a.source+':backend_deploy/'+name]);files[name]={'expected':a.expected_register_sha if name=='register_routes.js' else None,'content':base64.b64encode(data).decode(),'sha256':hashlib.sha256(data).hexdigest()}
 payload=json.dumps({'source':a.source,'apply':a.apply,'files':files}).encode()
 result=subprocess.run(['ssh','-o','BatchMode=yes','root@82.156.228.87','python3 -c '+shlex.quote(REMOTE)],input=payload,capture_output=True,timeout=140)
 if result.returncode:raise RuntimeError('Migration failed or requires recovery; '+result.stderr.decode(errors='replace')[-1200:])
 proof=json.loads(result.stdout);a.evidence.parent.mkdir(parents=True,exist_ok=True);a.evidence.write_text(json.dumps(proof,indent=2)+'\n','utf-8');print(json.dumps(proof))
if __name__=='__main__':main()
