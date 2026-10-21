"""Configure only Guoxue log retention and its audit backup scheduler."""
import argparse,base64,hashlib,json,shlex,subprocess
from pathlib import Path
REMOTE=r'''
from pathlib import Path
import sys,json,base64,hashlib,re,subprocess,datetime
p=json.load(sys.stdin);sha=lambda b:hashlib.sha256(b).hexdigest()
nginx=Path('/www/server/nginx/conf/nginx.conf');rotate=Path('/etc/logrotate.d/yandao-guoxue');cron=Path('/etc/cron.d/yandao-security-backup')
assert all(not f.is_symlink() for f in [nginx,rotate,cron])
old=nginx.read_bytes();text=old.decode();pattern=r"log_format guoxue_log\s+'[^;]+;"
assert len(re.findall(pattern,text))==1
replacement=base64.b64decode(p['format']).decode().strip();updated=re.sub(pattern,lambda _:replacement,text).encode()
config=base64.b64decode(p['rotate'])
assert config.count(b'rotate 200')==2 and b'maxsize' not in config
schedule=b'SHELL=/bin/sh\nPATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n20 3 * * * root cd /www/yandaoguoxue-backend && /usr/bin/flock -n /run/yandao-security-backup.lock /usr/local/bin/node securityBackupJob.js >/dev/null 2>&1\n'
original={nginx:old,rotate:rotate.read_bytes() if rotate.exists() else None,cron:cron.read_bytes() if cron.exists() else None}
proof={'before':{str(f):sha(v) if v is not None else None for f,v in original.items()},'minimumRetentionDays':200,'scheduler':'03:20 server timezone daily','queryStringsRemoved':True,'oldLogsDeleted':False,'scope':'Guoxue only'}
try:
 for f,data in [(nginx,updated),(rotate,config),(cron,schedule)]:
  if original[f] is not None:
   backup=f.with_name(f.name+'.security-previous');backup.write_bytes(original[f]);backup.chmod(0o600)
  f.write_bytes(data)
 rotate.chmod(0o644);cron.chmod(0o644)
 subprocess.run(['/www/server/nginx/sbin/nginx','-t'],check=True,capture_output=True)
 subprocess.run(['/usr/sbin/logrotate','--debug',str(rotate)],check=True,capture_output=True)
 subprocess.run(['/www/server/nginx/sbin/nginx','-s','reload'],check=True,capture_output=True)
 proof.update(after={str(f):sha(f.read_bytes()) for f in original},verifiedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),nginxConfigurationTest=True,logrotateDebugTest=True)
 print(json.dumps(proof))
except Exception:
 for f,data in original.items():
  if data is None:f.unlink(missing_ok=True)
  else:f.write_bytes(data)
 subprocess.run(['/www/server/nginx/sbin/nginx','-s','reload'],capture_output=True)
 raise
'''
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--evidence',required=True,type=Path);a=p.parse_args()
 payload={'format':base64.b64encode(Path('backend_deploy/security/nginx-guoxue-log-format.conf').read_bytes()).decode(),'rotate':base64.b64encode(Path('backend_deploy/security/logrotate-guoxue.conf').read_bytes()).decode()}
 r=subprocess.run(['ssh','root@82.156.228.87','python3 -c '+shlex.quote(REMOTE)],input=json.dumps(payload).encode(),capture_output=True,timeout=45)
 if r.returncode:raise RuntimeError(r.stderr.decode()[-1000:])
 v=json.loads(r.stdout);a.evidence.write_bytes((json.dumps(v,indent=2)+'\n').encode());print(json.dumps(v))
if __name__=='__main__':main()
