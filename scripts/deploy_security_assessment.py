"""CAS patch Guoxue security modules without replacing unrelated live code.
No credentials, user rows or database backups are downloaded to the workstation.
"""
import argparse,base64,difflib,hashlib,json,re,shlex,subprocess
from pathlib import Path
EXISTING=['server.js','middleware/auth.js','register_routes.js','adminRoles.js','adminPrivacy.js','verificationStore.js','backupEngine.js']
NEW=['securityAudit.js','businessIdentityGate.js','publicTextGuard.js','securityBackupJob.js']
REMOTE=r'''
import sys,json,base64,hashlib,subprocess,sqlite3,datetime,time,urllib.request
from pathlib import Path
p=json.load(sys.stdin);root=Path('/www/yandaoguoxue-backend');sha=lambda b:hashlib.sha256(b).hexdigest();updates={};original={}
for name,item in p['files'].items():
 assert name in ['server.js','middleware/auth.js','register_routes.js','adminRoles.js','adminPrivacy.js','verificationStore.js','backupEngine.js','securityAudit.js','businessIdentityGate.js','publicTextGuard.js','securityBackupJob.js']
 f=root/name;assert not f.is_symlink();old=f.read_bytes() if f.exists() else None
 assert (sha(old) if old is not None else None)==item['expected'],name+' changed since baseline'
 original[name]=old
 if item['patches'] is None:result=base64.b64decode(item['content'])
 else:
  text=old.decode();newline='\r\n' if '\r\n' in text else '\n';text=text.replace('\r\n','\n')
  for before,after in item['patches']:
   assert text.count(before)==1,name+' patch context not unique'
   text=text.replace(before,after,1)
  result=text.replace('\n',newline).encode()
 updates[name]=result
proof={'source':p['source'],'before':{n:sha(b) if b is not None else None for n,b in original.items()},'after':{n:sha(b) for n,b in updates.items()},'mode':'dry-run','historicalLogsFabricated':False,'accountNumbersReassigned':False}
if not p['apply']:print(json.dumps(proof));sys.exit()
dbfile=Path('/root/backend-auth/data/yandao_users.db');backup=Path('/root/backend-auth/data/yandao_users.security-before.db')
assert not backup.is_symlink()
with sqlite3.connect(dbfile) as db:
 before=db.execute('SELECT COUNT(*),MIN(user_id),MAX(user_id) FROM users').fetchone();sequence=db.execute('SELECT last_issued FROM account_number_sequence WHERE singleton=1').fetchone()
 with sqlite3.connect(backup) as destination:db.backup(destination)
backup.chmod(0o600)
replaced=[]
try:
 for name,data in updates.items():
  staged=root/(name+'.security-next.js');assert not staged.exists();staged.write_bytes(data)
  subprocess.run(['node','--check',str(staged)],check=True,capture_output=True)
 for name,data in updates.items():
  target=root/name
  if original[name] is not None:
   previous=target.with_name(target.name+'.security-previous');assert not previous.is_symlink();previous.write_bytes(original[name]);previous.chmod(0o600)
  (root/(name+'.security-next.js')).replace(target);replaced.append(name)
 subprocess.run(['pm2','restart','yandaoguoxue-backend'],check=True,capture_output=True)
 for attempt in range(25):
  try:
   with urllib.request.urlopen('http://127.0.0.1:3001/api/health',timeout=2) as response:healthy=response.status==200
  except Exception:healthy=False
  if healthy:break
  time.sleep(1)
 assert healthy,'service health failed'
 with sqlite3.connect(dbfile) as db:
  assert db.execute('SELECT COUNT(*),MIN(user_id),MAX(user_id) FROM users').fetchone()==before
  assert db.execute('SELECT last_issued FROM account_number_sequence WHERE singleton=1').fetchone()==sequence
  assert 'phone_verified_at' in [row[1] for row in db.execute('PRAGMA table_info(users)')]
 for name,data in updates.items():assert sha((root/name).read_bytes())==sha(data)
 proof.update(mode='deployed-health-verified',verifiedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),accountCountUnchanged=True,accountSequenceUnchanged=True,protectedDatabaseBackup=str(backup))
 print(json.dumps(proof))
except Exception:
 for name in reversed(replaced):
  if original[name] is None:(root/name).unlink(missing_ok=True)
  else:(root/name).write_bytes(original[name])
 subprocess.run(['pm2','restart','yandaoguoxue-backend'],capture_output=True)
 raise
finally:
 for name in updates:(root/(name+'.security-next.js')).unlink(missing_ok=True)
'''
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',required=True);p.add_argument('--base',required=True);p.add_argument('--baseline',required=True,type=Path);p.add_argument('--evidence',required=True,type=Path);p.add_argument('--apply',action='store_true');a=p.parse_args()
 assert all(re.fullmatch('[a-f0-9]{40}',s) for s in [a.source,a.base])
 baseline=json.loads(a.baseline.read_bytes());files={}
 for name in EXISTING+NEW:
  after=subprocess.check_output(['git','show',a.source+':backend_deploy/'+name]).decode().replace('\r\n','\n')
  item={'expected':baseline[name],'content':base64.b64encode(after.encode()).decode(),'patches':None}
  if name in EXISTING:
   before=subprocess.check_output(['git','show',a.base+':backend_deploy/'+name]).decode().replace('\r\n','\n');left=before.splitlines(keepends=True);right=after.splitlines(keepends=True)
   groups=difflib.SequenceMatcher(a=left,b=right,autojunk=False).get_grouped_opcodes(3)
   item['patches']=[(''.join(left[g[0][1]:g[-1][2]]),''.join(right[g[0][3]:g[-1][4]])) for g in groups]
  files[name]=item
 payload={'source':a.source,'files':files,'apply':a.apply}
 result=subprocess.run(['ssh','-o','BatchMode=yes','root@82.156.228.87','python3 -c '+shlex.quote(REMOTE)],input=json.dumps(payload).encode(),capture_output=True,timeout=100)
 if result.returncode:raise RuntimeError(result.stderr.decode()[-1800:])
 proof=json.loads(result.stdout);a.evidence.write_bytes((json.dumps(proof,ensure_ascii=False,indent=2)+'\n').encode());print(json.dumps(proof))
if __name__=='__main__':main()
