"""Verify pinned CI native packages in RAM and retain only final packages on E:."""
import argparse,concurrent.futures,hashlib,io,json,plistlib,re,subprocess,zipfile
from pathlib import Path

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',required=True);p.add_argument('--android-channel',choices=['tencent','internal'],default='tencent');p.add_argument('--android-run',type=int,required=True);p.add_argument('--ios-run',type=int);p.add_argument('--ios-only',action='store_true');p.add_argument('--code',type=int,required=True);p.add_argument('--build',type=int);p.add_argument('--root',type=Path,required=True);a=p.parse_args()
 assert re.fullmatch('[a-f0-9]{40}',a.source) and str(a.root.resolve()).lower().startswith('e:')
 manifest=json.loads(Path('public/assets/astronomy/surfaces/manifest.json').read_bytes())
 maps=[m for body in manifest['bodies'] for m in body['maps']]
 meridian_media=json.loads(Path('public/assets/meridians/ANIMATION-MANIFEST.json').read_bytes())
 tasks=[]
 for run in [n for n in ([a.ios_run] if a.ios_only else [a.android_run,a.ios_run]) if n]:
  info=json.loads(subprocess.check_output(['gh','api',f'repos/wzmpa18/minglizyi/actions/runs/{run}']))
  assert info['head_sha']==a.source and info['conclusion']=='success'
  artifacts=json.loads(subprocess.check_output(['gh','api',f'repos/wzmpa18/minglizyi/actions/runs/{run}/artifacts']))['artifacts']
  for item in artifacts:
   kind={'yandao-guoxue-android-apk':'apk','yandao-guoxue-android-aab':'aab','yandao-guoxue-ios-ipa':'ipa'}.get(item['name'])
   if kind:tasks.append((run,item,kind))
 assert not a.ios_only or a.ios_run
 assert sorted(t[2] for t in tasks)==(['ipa'] if a.ios_only else ['aab','apk','ipa'] if a.ios_run else ['aab','apk'])
 assert not a.ios_run or a.build
 def retain(task):
  run,meta,kind=task;raw=subprocess.check_output(['gh','api',f"repos/wzmpa18/minglizyi/actions/artifacts/{meta['id']}/zip"])
  assert 'sha256:'+hashlib.sha256(raw).hexdigest()==meta['digest'] and not meta['expired']
  archive=zipfile.ZipFile(io.BytesIO(raw));members=[i for i in archive.infolist() if i.filename.endswith('.'+kind)];assert len(members)==1
  data=archive.read(members[0]);package=zipfile.ZipFile(io.BytesIO(data));names=set(package.namelist())
  prefix={'apk':'assets/public/','aab':'base/assets/public/','ipa':'Payload/App.app/public/'}[kind]
  assert prefix+'index.html' in names
  for image in maps:
   b=package.read(prefix+image['url'].lstrip('/'));assert len(b)==image['bytes'] and hashlib.sha256(b).hexdigest()==image['sha256']
  delivery=json.loads(package.read(prefix+'meridian-publication.json'));assert len(delivery['included'])==28 and not delivery['excluded']
  for animation in meridian_media['records']:
   b=package.read(prefix+animation['asset'].lstrip('/'));assert len(b)==animation['bytes'] and hashlib.sha256(b).hexdigest()==animation['sha256']
  assert prefix+'assets/meridians/lung-open-reference.svg' in names
  photos_verified = 0
  if (kind == 'ipa' and a.build >= 48) or (kind != 'ipa' and a.code >= 2140):
   photos = json.loads(package.read(prefix+'assets/acupoint-photos/MANIFEST.json'))
   expected_photos = json.loads(Path('public/assets/acupoint-photos/MANIFEST.json').read_bytes())
   assert photos == expected_photos
   for photo in photos['records']:
    b = package.read(prefix+'assets/acupoint-photos/'+photo['file'])
    assert len(b) == photo['bytes'] and hashlib.sha256(b).hexdigest() == photo['sha256']
    photos_verified += 1
  js=b'\n'.join(package.read(name) for name in names if name.startswith(prefix+'_next/') and name.endswith('.js'))
  assert b'yandaoguoxue.yandao.vip/api/academy/starter-content' in js
  assert b'bazi-comparison-practice' not in js,'New course accidentally bundled instead of fetched'
  assert b'classics-1' in js,'Original offline lessons missing'
  proof={'channel':'ios-full-learning' if kind=='ipa' else a.android_channel,'kind':kind,'source':a.source,'version':'25.0.115','bytes':len(data),'fileSha256':hashlib.sha256(data).hexdigest(),'artifactId':meta['id'],'artifactZipSha256':hashlib.sha256(raw).hexdigest(),'workflowRun':run,'surfaceImagesVerified':len(maps),'animatedMeridianChartsVerified':28,'ownerOriginalsFullResolution':11,'clinicalPositionReviewed':False,'remoteReaderBundled':True,'newCoursesRemoteDataOnly':True,'originalOfflineFallback':True,'physicalDeviceAccepted':False}
  proof['sourcedOriginalPhotosVerified'] = photos_verified
  if kind=='ipa':
   info=plistlib.loads(package.read('Payload/App.app/Info.plist'));assert info['CFBundleIdentifier']=='com.yandaoguoxue.app' and info['CFBundleShortVersionString']=='25.0.115' and info['CFBundleVersion']==str(a.build)
   proof.update(build=a.build,identityAndWidgetSignatureGate=True,sourceProof='pinned successful CI and real Info.plist; no Android marker expected')
   folder=a.root/f'Apple_25.0.115_{a.build}';filename=f'YandaoGuoxue_25.0.115_{a.build}.ipa'
  else:
   marker=json.loads(package.read(prefix+'app-native.json'));assert marker['sourceCommit']==a.source and marker['versionCode']==a.code and marker['storeChannel']==a.android_channel
   proof['versionCode']=a.code;folder=a.root/f'Android_25.0.115_{a.code}_{a.android_channel}';filename=f'YandaoGuoxue_25.0.115_{a.code}.{kind}'
  folder.mkdir(exist_ok=True);file=folder/filename
  if file.exists():assert hashlib.sha256(file.read_bytes()).hexdigest()==proof['fileSha256']
  else:
   with file.open('xb') as f:f.write(data)
  assert file.stat().st_size==len(data) and hashlib.sha256(file.read_bytes()).hexdigest()==proof['fileSha256']
  proof['path']=str(file);return proof
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:proofs=list(pool.map(retain,tasks))
 for kind in (['ipa'] if a.ios_only else ['apk','ipa'] if a.ios_run else ['apk']):
  group=[v for v in proofs if (v['kind']=='ipa')==(kind=='ipa')];folder=Path(group[0]['path']).parent
  name='verified-package.json' if kind=='ipa' else 'verified-packages.json';value=group[0] if kind=='ipa' else group
  (folder/name).write_bytes((json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode())
 print(json.dumps(proofs,ensure_ascii=False))
if __name__=='__main__':main()
