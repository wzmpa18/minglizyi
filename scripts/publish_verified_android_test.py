"""Publish a pinned signed Guoxue candidate as an explicit test download.
Does not change stable latest.apk, app-version, store submissions or other apps.
All transfer buffers stay in RAM; only the retained E: APK is read locally.
"""
import argparse,hashlib,io,json,re,shlex,subprocess,sys,urllib.request,zipfile
from pathlib import Path

REMOTE=r'''
from pathlib import Path
import sys,json,hashlib,os,datetime
spec=json.loads(sys.stdin.buffer.readline());data=sys.stdin.buffer.read()
assert len(data)==spec['bytes'] and hashlib.sha256(data).hexdigest()==spec['fileSha256']
base=Path('/root/yandaoguoxue/releases').resolve();current=Path('/root/yandaoguoxue/current').resolve()
assert current==base/spec['expectedCurrent'] and current.is_dir()
folder=current/'testing'/str(spec['versionCode'])
assert not (current/'testing').is_symlink()
folder.mkdir(parents=True,exist_ok=True)
assert not folder.is_symlink() and current in folder.resolve().parents
file=folder/spec['apkName'];pending=folder/'candidate.uploading'
assert not pending.exists()
if file.exists():assert hashlib.sha256(file.read_bytes()).hexdigest()==spec['fileSha256']
else:
 with pending.open('xb') as out:out.write(data)
 assert hashlib.sha256(pending.read_bytes()).hexdigest()==spec['fileSha256']
 os.chmod(pending,0o644);os.replace(pending,file)
landing=folder/'index.html'
if landing.exists():assert landing.read_text()==spec['page']
else:landing.write_text(spec['page'])
spec.pop('page')
print(json.dumps({**spec,'publishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'remotePath':str(file),'state':'explicit test download; stable APK and automatic upgrades unchanged'},ensure_ascii=False))
'''

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--proof',type=Path,required=True);p.add_argument('--source',required=True);p.add_argument('--expect-current',required=True);p.add_argument('--evidence',type=Path,required=True)
 a=p.parse_args();assert re.fullmatch(r'[a-f0-9]{40}',a.source)
 assert a.expect_current=='v25.0.115-calendar-community-'+a.source[:7]
 item=next(x for x in json.loads(a.proof.read_text('utf-8')) if x['channel']=='tencent')
 assert item['source']==a.source and item['version']=='25.0.115' and isinstance(item['versionCode'],int) and item['versionCode']>0
 def gh(route):return subprocess.check_output(['gh','api','repos/wzmpa18/minglizyi/'+route])
 meta=json.loads(gh('actions/artifacts/'+str(item['artifactId'])))
 run=json.loads(gh('actions/runs/'+str(meta['workflow_run']['id'])))
 assert meta['name']=='yandao-guoxue-android-apk' and not meta['expired'] and meta['digest']=='sha256:'+item['artifactZipSha256']
 assert run['conclusion']=='success' and run['head_sha']==a.source and run['path']=='.github/workflows/android-build.yml'
 log=subprocess.check_output(['gh','run','view',str(run['id']),'--log']).decode('utf-8')
 assert '签名门禁 OK: 8ca0c414573d4b05fc2bd1ba9c6a2a8090c90c58e3815119494607443dc6d5a0' in log
 data=Path(item['path']).read_bytes();assert len(data)==item['bytes'] and hashlib.sha256(data).hexdigest()==item['fileSha256']
 z=zipfile.ZipFile(io.BytesIO(data));marker=json.loads(z.read('assets/public/app-native.json'))
 assert marker['sourceCommit']==a.source and marker['versionCode']==item['versionCode'] and marker['storeChannel']=='tencent'
 name=f"yandao-guoxue-{item['version']}-{item['versionCode']}-test.apk"
 page=(Path(__file__).parent/'templates/android-test-download.html').read_text('utf-8').replace('{{VERSION}}',item['version']).replace('{{VERSION_CODE}}',str(item['versionCode'])).replace('{{APK_NAME}}',name)
 spec={k:item[k] for k in ['source','version','versionCode','fileSha256','bytes']}
 spec.update(expectedCurrent=a.expect_current,apkName=name,page=page)
 print('Verified pinned candidate; starting RAM transfer to its matching website release',flush=True)
 try:
  result=subprocess.run(['ssh','-o','BatchMode=yes','root@82.156.228.87','python3 -c '+shlex.quote(REMOTE)],input=json.dumps(spec,ensure_ascii=False).encode()+b'\n'+data,capture_output=True,timeout=900,check=True)
 except (subprocess.TimeoutExpired,subprocess.CalledProcessError):raise RuntimeError('Transfer did not confirm completion; inspect exact target before retrying. No release success is assumed.') from None
 proof=json.loads(result.stdout);proof['url']=f"https://yandaoguoxue.yandao.vip/testing/{item['versionCode']}/{name}";proof['landing']=f"https://yandaoguoxue.yandao.vip/testing/{item['versionCode']}/"
 print('Remote candidate verified; reading full public APK hash',flush=True)
 h=hashlib.sha256();size=0
 with urllib.request.urlopen(proof['url'],timeout=90) as response:
  assert response.status==200
  for chunk in iter(lambda:response.read(1024*1024),b''):h.update(chunk);size+=len(chunk)
 assert size==item['bytes'] and h.hexdigest()==item['fileSha256']
 proof.update(publicReadbackSha256=h.hexdigest(),publicReadbackBytes=size)
 a.evidence.write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n','utf-8')
 print(json.dumps(proof,ensure_ascii=False),flush=True)
if __name__=='__main__':
 try:main()
 except Exception as error:print(str(error),file=sys.stderr);sys.exit(1)
