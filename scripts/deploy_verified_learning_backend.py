"""Deploy a reviewed, pinned Guoxue backend module set without local build files.

Only allowlisted source modules, exact prior SHA-256 checks, one previous module
copy and an online SQLite migration backup. No credentials, server.js, .env or
live database is copied from the workspace. Inspect by default; --apply deploys.
"""
import argparse,base64,hashlib,json,re,subprocess
from pathlib import Path

MODULES=['academyRoutes.js','studyTextImport.js','socialApiRoutes.js','socialModerationPolicy.js',
 'liveChartRoutes.js','liveChartPolicy.js','governedGroupRoutes.js','studyGroupCards.js',
 'tongchenRoutes.js','studyCommentStore.js','studyCommentsRoutes.js','socialVisibilityQueries.js','providerRoutes.js']
REMOTE=r'''
import sys,json,base64,hashlib,os,subprocess,sqlite3,time,datetime,urllib.request
from pathlib import Path
payload=json.load(sys.stdin);root=Path('/www/yandaoguoxue-backend').resolve()
assert root==Path('/www/yandaoguoxue-backend')
hash=lambda b:hashlib.sha256(b).hexdigest()
original={};updates={};before={}
for name,item in payload['files'].items():
 assert '/' not in name and '\\' not in name and name.endswith('.js')
 file=root/name;assert file.parent==root and not file.is_symlink()
 old=file.read_bytes() if file.exists() else None;actual=hash(old) if old is not None else None
 assert actual==item['expected'], 'Source changed since review: '+name
 data=base64.b64decode(item['content'],validate=True);assert hash(data)==item['sha256']
 original[name]=old;before[name]=actual
 if actual!=item['sha256']:updates[name]=data
result={'source':payload['source'],'before':before,'after':{n:i['sha256'] for n,i in payload['files'].items()},'mode':'verified-dry-run','databaseReplaced':False,'serverOrCredentialsChanged':False}
if not payload['apply']:
 print(json.dumps(result));sys.exit(0)
staged=[];replaced=[]
try:
 for name,data in updates.items():
  pending=root/(name+'.next.js');assert not pending.exists()
  pending.write_bytes(data);staged.append(pending)
  subprocess.run(['node','--check',str(pending)],check=True,capture_output=True)
 # One independent, consistent backup before additive social schema migrations.
 source=root/'data/social.db';backup=root/'data/social.db.pre-live-chart-migration'
 if source.exists() and not backup.exists():
  with sqlite3.connect('file:'+str(source)+'?mode=ro',uri=True) as db,sqlite3.connect(backup) as out:db.backup(out)
  result['migrationBackup']='data/social.db.pre-live-chart-migration'
 for name,data in updates.items():
  old=original[name]
  if old is not None:(root/(name+'.previous')).write_bytes(old)
  os.replace(root/(name+'.next.js'),root/name);replaced.append(name)
 subprocess.run(['pm2','restart','yandaoguoxue-backend'],check=True,capture_output=True)
 healthy=False
 for attempt in range(25):
  try:
   with urllib.request.urlopen('http://127.0.0.1:3001/api/health',timeout=2) as response:
    if response.status==200:healthy=True;break
  except Exception:pass
  time.sleep(1)
 assert healthy,'Backend health not verified'
 for name,item in payload['files'].items():assert hash((root/name).read_bytes())==item['sha256']
 result.update(mode='modules-readback-and-service-health-verified',verifiedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),functionalAcceptance='separate authenticated UI and two-user tests required')
 print(json.dumps(result))
except Exception:
 for name in reversed(replaced):
  if original[name] is not None:(root/name).write_bytes(original[name])
  else:(root/name).unlink(missing_ok=True)
 for pending in staged:pending.unlink(missing_ok=True)
 subprocess.run(['pm2','restart','yandaoguoxue-backend'],capture_output=True)
 raise
'''

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',required=True);p.add_argument('--expected',required=True,type=Path);p.add_argument('--evidence',required=True,type=Path);p.add_argument('--apply',action='store_true');a=p.parse_args()
 if not re.fullmatch('[0-9a-f]{40}',a.source):raise ValueError('Pin a full Git source SHA')
 baseline=json.loads(a.expected.read_text(encoding='utf-8-sig'))
 if set(baseline)!=set(MODULES):raise ValueError('Expected hashes must cover exactly the maintained module set')
 files={}
 for name in MODULES:
  old=baseline[name]
  if old is not None and not re.fullmatch('[0-9a-f]{64}',old):raise ValueError('Invalid baseline hash: '+name)
  data=subprocess.check_output(['git','show',a.source+':backend_deploy/'+name])
  files[name]={'expected':old,'sha256':hashlib.sha256(data).hexdigest(),'content':base64.b64encode(data).decode()}
 payload=json.dumps({'source':a.source,'files':files,'apply':a.apply}).encode()
 command=['ssh','-o','BatchMode=yes','root@82.156.228.87','python3 -c '+__import__('shlex').quote(REMOTE)]
 result=subprocess.run(command,input=payload,capture_output=True,timeout=110,check=True)
 proof=json.loads(result.stdout);a.evidence.parent.mkdir(parents=True,exist_ok=True)
 a.evidence.write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(proof,ensure_ascii=False))
if __name__=='__main__':main()
