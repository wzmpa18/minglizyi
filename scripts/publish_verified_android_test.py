"""Publish a pinned signed Guoxue candidate as an explicit test download.
Does not change stable latest.apk, app-version, store submissions or other apps.
All transfer buffers stay in RAM. Retained E: APKs and public textures can
provide exact-byte reuse without changing the signed package.
"""
import argparse,hashlib,io,json,re,shlex,struct,subprocess,sys,urllib.request,zipfile
from pathlib import Path

REMOTE=r'''
from pathlib import Path
import sys,json,hashlib,os,datetime,re
spec=json.loads(sys.stdin.buffer.readline());wire=sys.stdin.buffer.read()
base=Path('/root/yandaoguoxue/releases').resolve();current=Path('/root/yandaoguoxue/current').resolve()
assert current==base/spec['expectedCurrent'] and current.is_dir()
reuse=spec.pop('reusePrevious',None);plan=spec.pop('bytePlan',None)
if reuse:
 assert re.fullmatch(r'v25\.0\.115-calendar-community-[a-f0-9]{7}',reuse['release']) and isinstance(reuse['code'],int) and 0<reuse['code']<spec['versionCode']
 oldroot=base/reuse['release'];old=oldroot/'testing'/str(reuse['code'])/f"yandao-guoxue-25.0.115-{reuse['code']}-test.apk"
 assert oldroot.resolve().parent==base and oldroot.resolve() in old.resolve().parents and not old.is_symlink()
 previous=old.read_bytes();assert hashlib.sha256(previous).hexdigest()==reuse['sha256']
 assert isinstance(plan,list) and 0<len(plan)<10000
 data=bytearray();cursor=0;old_bytes=web_bytes=0
 for item in plan:
  size=item['size'];assert isinstance(size,int) and 0<size<=100_000_000
  if item['kind']=='wire':piece=wire[cursor:cursor+size];cursor+=size
  elif item['kind']=='previous':
   start=item['start'];assert isinstance(start,int) and 0<=start<=len(previous)-size
   piece=previous[start:start+size];old_bytes+=size
  elif item['kind']=='web':
   assert re.fullmatch(r'assets/astronomy/surfaces/(moon|earth|mars|jupiter)-(2048|4096|8192)\.jpg',item['path'])
   file=current/item['path'];assert current in file.resolve().parents and not file.is_symlink()
   piece=file.read_bytes();web_bytes+=size
  else:raise RuntimeError('Unknown byte source')
  assert len(piece)==size and hashlib.sha256(piece).hexdigest()==item['sha256']
  data.extend(piece);assert len(data)<=spec['bytes']
 assert cursor==len(wire)
 spec.update(transferMode='byte-exact reuse; original signed APK retained',transferredBytes=len(wire),reusedPreviousBytes=old_bytes,reusedWebBytes=web_bytes)
else:data=wire
assert len(data)==spec['bytes'] and hashlib.sha256(data).hexdigest()==spec['fileSha256']
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
 p.add_argument('--channel',choices=['tencent','internal'],default='tencent');p.add_argument('--proof',type=Path,required=True);p.add_argument('--source',required=True);p.add_argument('--expect-current',required=True);p.add_argument('--evidence',type=Path,required=True)
 p.add_argument('--reuse-previous-proof',type=Path,help='Reuse exact bytes from one SHA-verified previous test APK and the current web textures; never re-sign or recompress the APK')
 a=p.parse_args();assert re.fullmatch(r'[a-f0-9]{40}',a.source)
 assert a.expect_current=='v25.0.115-calendar-community-'+a.source[:7]
 item=next(x for x in json.loads(a.proof.read_text('utf-8')) if x['channel']==a.channel and x['kind']=='apk')
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
 assert marker['sourceCommit']==a.source and marker['versionCode']==item['versionCode'] and marker['storeChannel']==a.channel
 name=f"yandao-guoxue-{item['version']}-{item['versionCode']}-test.apk"
 page=(Path(__file__).parent/'templates/android-test-download.html').read_text('utf-8').replace('{{VERSION}}',item['version']).replace('{{VERSION_CODE}}',str(item['versionCode'])).replace('{{APK_NAME}}',name).replace('{{CHANNEL_NOTE}}','完整AI功能内部测试包，非商店审核包；AI需登录、联网及有效权益。' if a.channel=='internal' else '国内渠道测试包；各项功能以当前渠道实际开放范围为准。')
 spec={k:item[k] for k in ['source','version','versionCode','fileSha256','bytes']}
 spec.update(expectedCurrent=a.expect_current,apkName=name,page=page)
 payload=data
 if a.reuse_previous_proof:
  previous=next(x for x in json.loads(a.reuse_previous_proof.read_text('utf-8')) if x['channel'] in ('tencent','internal') and str(x['path']).endswith('.apk'))
  assert previous['version']=='25.0.115' and isinstance(previous['versionCode'],int) and 0<previous['versionCode']<item['versionCode'] and re.fullmatch(r'[a-f0-9]{40}',previous['source'])
  old=Path(previous['path']).read_bytes();assert hashlib.sha256(old).hexdigest()==previous['fileSha256']
  def members(raw):
   rows={}
   for entry in zipfile.ZipFile(io.BytesIO(raw)).infolist():
    assert raw[entry.header_offset:entry.header_offset+4]==b'PK\x03\x04'
    name_size,extra=struct.unpack_from('<HH',raw,entry.header_offset+26)
    start=entry.header_offset+30+name_size+extra;end=start+entry.compress_size
    assert 0<=start<=end<=len(raw)
    rows[entry.filename]=(entry,start,end,hashlib.sha256(raw[start:end]).hexdigest())
   return rows
  old_members=members(old);new_members=members(data);plan=[];pieces=[];position=0
  def append_wire(piece):
   if not piece:return
   plan.append({'kind':'wire','size':len(piece),'sha256':hashlib.sha256(piece).hexdigest()});pieces.append(piece)
  for entry,start,end,digest in sorted(new_members.values(),key=lambda row:row[0].header_offset):
   assert position<=entry.header_offset<=start
   append_wire(data[position:start]);size=end-start;relative=entry.filename.removeprefix('assets/public/')
   if not size:pass
   elif entry.filename in old_members and old_members[entry.filename][3]==digest:
    plan.append({'kind':'previous','start':old_members[entry.filename][1],'size':size,'sha256':digest})
   elif entry.compress_type==0 and re.fullmatch(r'assets/astronomy/surfaces/(moon|earth|mars|jupiter)-(2048|4096|8192)\.jpg',relative) and hashlib.sha256((Path(__file__).resolve().parent.parent/'public'/relative).read_bytes()).hexdigest()==digest:
    plan.append({'kind':'web','path':relative,'size':size,'sha256':digest})
   else:append_wire(data[start:end])
   position=end
  append_wire(data[position:]);assert sum(x['size'] for x in plan)==len(data)
  payload=b''.join(pieces);assert len(payload)<len(data)
  spec.update(reusePrevious={'release':'v25.0.115-calendar-community-'+previous['source'][:7],'code':previous['versionCode'],'sha256':previous['fileSha256']},bytePlan=plan)
  print(f'Byte-exact transfer: {len(payload)} bytes instead of {len(data)}; signature and full APK hash must remain identical',flush=True)
 print('Verified pinned candidate; starting RAM transfer to its matching website release',flush=True)
 try:
  result=subprocess.run(['ssh','-o','BatchMode=yes','root@82.156.228.87','python3 -c '+shlex.quote(REMOTE)],input=json.dumps(spec,ensure_ascii=False).encode()+b'\n'+payload,capture_output=True,timeout=900,check=True)
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
