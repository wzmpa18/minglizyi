"""Update Guoxue's public download metadata only after full COS APK verification.

Uses an immutable URL, preserves one configuration rollback, never changes
accounts, purchase rights, credentials, store submissions or other products.
"""
import argparse,base64,hashlib,json,re,shlex,subprocess,urllib.request
from pathlib import Path

REMOTE=r'''
from pathlib import Path
import sys,json,hashlib,base64,datetime,subprocess,urllib.request,time
p=json.load(sys.stdin);root=Path('/www/yandaoguoxue-backend');f=root/'data/app-release-config.json';module=root/'appVersionRoutes.js'
sha=lambda b:hashlib.sha256(b).hexdigest()
old=f.read_bytes();before=module.read_bytes();assert not f.is_symlink() and not module.is_symlink()
assert sha(old)==p['expectedConfig'] and sha(before)==p['expectedModule']
assert json.loads(old)['latestVersionCode']==p['expectedCode']
updated=base64.b64decode(p['module']);config=p['config'];config['publishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();data=(json.dumps(config,ensure_ascii=False,indent=2)+'\n').encode()
proof={'packageSource':p['packageSource'],'moduleSource':p['moduleSource'],'beforeConfigSha256':sha(old),'beforeModuleSha256':sha(before),'publicApk':p['publicApk'],'forceUpdate':False,'databaseChanged':False,'credentialsChanged':False,'storeSubmission':False}
pending=module.with_name('appVersionRoutes.release-pending.js');assert not pending.exists()
try:
 pending.write_bytes(updated);subprocess.run(['node','--check',str(pending)],check=True,capture_output=True)
 f.with_name(f.name+'.security-previous').write_bytes(old);module.with_name(module.name+'.security-previous').write_bytes(before)
 pending.replace(module);f.write_bytes(data)
 subprocess.run(['pm2','restart','yandaoguoxue-backend'],check=True,capture_output=True)
 for attempt in range(20):
  try:
   with urllib.request.urlopen('http://127.0.0.1:3001/api/health',timeout=2) as r:assert r.status==200
   break
  except Exception:
   if attempt==19:raise
   time.sleep(1)
 checks={}
 for platform,headers in [('web',{}),('ios',{'X-Client-Platform':'ios'}),('google',{'X-Store-Channel':'google'})]:
  req=urllib.request.Request('http://127.0.0.1:3001/api/public/app-version',headers=headers)
  with urllib.request.urlopen(req,timeout=10) as r:value=json.load(r)['data']
  if platform=='web':assert value['latestVersionCode']==config['latestVersionCode'] and value['downloadUrl']==config['downloadUrl'] and value['forceUpdate'] is False
  else:assert not value['downloadUrl'] and value['forceUpdate'] is False
  checks[platform]=value
 proof.update(configSha256=sha(f.read_bytes()),moduleSha256=sha(module.read_bytes()),checks=checks,publishedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
 print(json.dumps(proof,ensure_ascii=False))
except Exception:
 f.write_bytes(old);module.write_bytes(before);subprocess.run(['pm2','restart','yandaoguoxue-backend'],capture_output=True);raise
finally:pending.unlink(missing_ok=True)
'''

def main():
 p=argparse.ArgumentParser(description=__doc__)
 for name in ['proof','evidence']:p.add_argument('--'+name,type=Path,required=True)
 for name in ['package-source','module-source','expected-config','expected-module']:p.add_argument('--'+name,required=True)
 p.add_argument('--expected-code',type=int,required=True);a=p.parse_args()
 assert all(re.fullmatch('[a-f0-9]{40}',v) for v in [a.package_source,a.module_source])
 assert all(re.fullmatch('[a-f0-9]{64}',v) for v in [a.expected_config,a.expected_module])
 item=next(x for x in json.loads(a.proof.read_bytes()) if x['kind']=='apk' and x['channel']=='tencent')
 assert item['source']==a.package_source and item['versionCode']>a.expected_code and item['version']=='25.0.115'
 run=json.loads(subprocess.check_output(['gh','api',f"repos/wzmpa18/minglizyi/actions/runs/{item['workflowRun']}"]))
 assert run['head_sha']==a.package_source and run['conclusion']=='success'
 url='https://www.yandao.vip/app-download/'+Path(item['path']).name
 h=hashlib.sha256();size=0
 with urllib.request.urlopen(url,timeout=60) as r:
  while b:=r.read(1024*1024):h.update(b);size+=len(b)
 assert size==item['bytes'] and h.hexdigest()==item['fileSha256']
 module=subprocess.check_output(['git','show',a.module_source+':backend_deploy/appVersionRoutes.js'])
 config={'latestVersion':item['version'],'latestVersionCode':item['versionCode'],'downloadUrl':url,'downloadPage':'https://yandaoguoxue.yandao.vip/download/','releaseNotes':['完善登录与手机号验证，保护原账号、购买权益及学习记录','增加真实安全审计后台与敏感内容筛选','优化会员、AI点数及恢复购买入口；身份验证或网络异常不再提示重复购买'],'forceUpdate':False}
 payload={'expectedCode':a.expected_code,'expectedConfig':a.expected_config,'expectedModule':a.expected_module,'packageSource':a.package_source,'moduleSource':a.module_source,'publicApk':{'url':url,'bytes':size,'sha256':h.hexdigest()},'config':config,'module':base64.b64encode(module).decode()}
 result=subprocess.run(['ssh','root@82.156.228.87','python3 -c '+shlex.quote(REMOTE)],input=json.dumps(payload).encode(),capture_output=True,check=True,timeout=90)
 proof=json.loads(result.stdout);a.evidence.write_bytes((json.dumps(proof,ensure_ascii=False,indent=2)+'\n').encode());print(json.dumps(proof,ensure_ascii=False))
if __name__=='__main__':main()
