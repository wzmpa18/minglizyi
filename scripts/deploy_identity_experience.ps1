param(
  [Parameter(Mandatory=$true)][string]$Source,
  [Parameter(Mandatory=$true)][string]$ExpectedLiveSha256,
  [Parameter(Mandatory=$true)][string]$Evidence
)
$ErrorActionPreference='Stop'
if($Source -notmatch '^[a-f0-9]{40}$' -or $ExpectedLiveSha256 -notmatch '^[a-f0-9]{64}$'){throw 'Require pinned source and live SHA-256'}
$repo=Split-Path -Parent $PSScriptRoot
$content=(& git -C $repo show ($Source+':backend_deploy/businessIdentityGate.js')) -join "`n"
if($LASTEXITCODE -ne 0){throw 'Pinned source unavailable'}
$content+="`n"
$payload=@{source=$Source;expected=$ExpectedLiveSha256;content=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($content))}|ConvertTo-Json -Compress
$remote=@'
import sys,json,base64,hashlib,subprocess,time,urllib.request,datetime
from pathlib import Path
d=json.load(sys.stdin);p=Path('/www/yandaoguoxue-backend/businessIdentityGate.js')
assert not p.is_symlink();old=p.read_bytes();sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha(old)==d['expected'],'Live identity gate changed; review before deploying'
new=base64.b64decode(d['content']);stage=p.with_name('businessIdentityGate.identity-next.js')
assert not stage.exists();stage.write_bytes(new)
subprocess.run(['node','--check',str(stage)],check=True,capture_output=True)
backup=p.with_name('businessIdentityGate.identity-previous');assert not backup.is_symlink()
backup.write_bytes(old);backup.chmod(0o600)
try:
 assert p.read_bytes()==old
 stage.replace(p)
 subprocess.run(['pm2','restart','yandaoguoxue-backend'],check=True,capture_output=True)
 healthy=False
 for _ in range(20):
  try:
   with urllib.request.urlopen('http://127.0.0.1:3001/api/health',timeout=2) as r:healthy=r.status==200
  except Exception:pass
  if healthy:break
  time.sleep(1)
 assert healthy,'Health verification failed'
 assert sha(p.read_bytes())==sha(new)
 print(json.dumps({'source':d['source'],'before':sha(old),'after':sha(new),'healthy':True,'deployedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'databaseModified':False,'socialPublishingIdentityRequired':True,'accountReadsRequirePhone':False,'privateAccountServicesRequireLogin':True,'backup':str(backup)}))
except Exception:
 p.write_bytes(old)
 subprocess.run(['pm2','restart','yandaoguoxue-backend'],capture_output=True)
 raise
finally:
 if stage.exists():stage.unlink()
'@
$encoded=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($remote))
# Only base64 code is interpolated into the remote shell command; payload stays on stdin.
$command='python3 -c "import base64;exec(base64.b64decode('''+$encoded+'''))"'
$result=$payload | & ssh -o BatchMode=yes -o ConnectTimeout=12 root@82.156.228.87 $command
if($LASTEXITCODE -ne 0){throw 'Identity experience deployment failed'}
$proof=$result|ConvertFrom-Json
if(-not $proof.healthy){throw 'Missing health proof'}
[IO.File]::WriteAllText($Evidence,($proof|ConvertTo-Json -Depth 6)+"`n",[Text.UTF8Encoding]::new($false))
$proof|ConvertTo-Json -Compress
