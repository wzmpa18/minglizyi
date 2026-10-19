"""Inspect a pinned, signed Guoxue CI artifact and optionally upgrade one ADB device.
No APK/ZIP/extraction is written to C:. Replacement preserves app data; this tool
never uninstalls, clears data, grants permissions or downgrades an installed app.
"""
import argparse,hashlib,io,json,re,shutil,subprocess,time,zipfile
from pathlib import Path,PurePosixPath

PACKAGE='com.yandao.guoxue'
CERT='8ca0c414573d4b05fc2bd1ba9c6a2a8090c90c58e3815119494607443dc6d5a0'
def main():
 p=argparse.ArgumentParser(description=__doc__)
 for name in ['artifact-id','sha256','source','serial']:p.add_argument('--'+name,required=True)
 mode=p.add_mutually_exclusive_group();mode.add_argument('--install',action='store_true');mode.add_argument('--verify-installed',action='store_true',help='Read back the pending candidate after the owner completes the device confirmation; never transfer or install again')
 p.add_argument('--evidence',type=Path);args=p.parse_args()
 assert re.fullmatch(r'\d+',args.artifact_id) and re.fullmatch(r'[a-f0-9]{64}',args.sha256) and re.fullmatch(r'[a-f0-9]{7,40}',args.source)
 assert re.fullmatch(r'[A-Za-z0-9_.:-]{4,80}',args.serial)
 def gh(path):return subprocess.check_output(['gh','api','repos/wzmpa18/minglizyi/'+path])
 meta=json.loads(gh('actions/artifacts/'+args.artifact_id));run=json.loads(gh('actions/runs/'+str(meta['workflow_run']['id'])))
 assert meta['name']=='yandao-guoxue-android-apk' and not meta['expired'] and meta['digest']=='sha256:'+args.sha256
 assert run['head_sha'].startswith(args.source) and run['conclusion']=='success' and run['path']=='.github/workflows/android-build.yml'
 log=subprocess.check_output(['gh','run','view',str(run['id']),'--repo','wzmpa18/minglizyi','--log']).decode('utf-8')
 identity=re.search(r"package: name='com\.yandao\.guoxue' versionCode='(\d+)' versionName='([^']+)'",log)
 assert identity and '签名门禁 OK: '+CERT in log,'The successful CI must verify the official package and signing certificate'
 code=int(identity[1]);name=identity[2]
 raw=gh('actions/artifacts/'+args.artifact_id+'/zip');assert hashlib.sha256(raw).hexdigest()==args.sha256
 archive=zipfile.ZipFile(io.BytesIO(raw));files=[f for f in archive.infolist() if not f.is_dir()]
 assert len(files)==1 and files[0].filename=='app-release.apk' and files[0].file_size<150_000_000
 assert all('..' not in PurePosixPath(f.filename).parts for f in files)
 apk=archive.read(files[0]);bundle=zipfile.ZipFile(io.BytesIO(apk));marker=json.loads(bundle.read('assets/public/app-native.json'))
 assert marker['versionCode']==code and marker['versionName']==name and marker['isNativeApp'] is True
 if marker.get('sourceCommit'):assert marker['sourceCommit']==run['head_sha'],'Bundled source marker does not match the pinned workflow'
 config=json.loads(bundle.read('assets/capacitor.config.json'));assert config['appId']==PACKAGE and not config.get('server',{}).get('url')
 adb=shutil.which('adb');assert adb,'ADB is unavailable'
 def device(*command):return subprocess.check_output([adb,'-s',args.serial,*command],timeout=30).decode('utf-8',errors='replace')
 assert device('get-state').strip()=='device','Unlock and authorize this particular device first'
 before=device('shell','dumpsys','package',PACKAGE);old=re.search(r'versionCode=(\d+)',before);assert old,'Existing Guoxue installation required; this tool only performs replacement upgrades'
 assert int(old[1])<=code,'Refusing a downgrade'
 proof={'source':run['head_sha'],'workflow':run['id'],'artifactId':int(args.artifact_id),'artifactZipSha256':args.sha256,'apkSha256':hashlib.sha256(apk).hexdigest(),'bytes':len(apk),'package':PACKAGE,'versionName':name,'versionCode':code,'certificateSha256':CERT,'previousCode':int(old[1]),'serial':args.serial,'state':'verified in RAM, not installed','preservesData':True}
 print(json.dumps(proof,ensure_ascii=False),flush=True)
 def record(state):
  proof['state']=state
  if args.evidence:args.evidence.write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n','utf-8')
  print(json.dumps(proof,ensure_ascii=False),flush=True)
 if args.install:
  # The official ADB exec-in path copies binary stdin directly. Some Windows
  # shell transports stop at binary Ctrl-Z; never retry a failed shell stream.
  # '--' ends BasicShellCommandHandler options before the stdin '-'. No
  # uninstall, downgrade, blanket permission grant or security bypass flags.
  focus=device('shell','dumpsys','window')
  assert not re.search(r'mCurrentFocus=.*com\.android\.packageinstaller',focus),'A system installation confirmation is already open. Let the owner complete it, then use --verify-installed; do not retransmit.'
  record('TRANSFER_REQUESTED; not installed or functionally accepted')
  result=subprocess.run([adb,'-s',args.serial,'exec-in','cmd','package','install','-r','-S',str(len(apk)),'--','-'],input=apk,capture_output=True,timeout=180)
  if result.returncode!=0:raise RuntimeError('ADB binary transfer failed; no installation success is assumed')
  matched=False
  for attempt in range(15):
   after=device('shell','dumpsys','package',PACKAGE);actual=re.search(r'versionCode=(\d+)',after)
   if actual and int(actual[1])==code:matched=True;break
   time.sleep(1)
  if not matched:
   proof['transport']='official adb exec-in; transfer return does not prove installation'
   record('OWNER_ACTION_OR_PACKAGE_MANAGER_CONFIRMATION_REQUIRED; no installation success assumed; resume with --verify-installed')
   return
 if args.install or args.verify_installed:
  after=device('shell','dumpsys','package',PACKAGE);actual=re.search(r'versionCode=(\d+)',after)
  if not actual or int(actual[1])!=code:
   proof['actualVersionCode']=int(actual[1]) if actual else None
   record('REQUESTED_VERSION_NOT_INSTALLED; owner confirmation may still be pending; do not retransmit or uninstall')
   return
  installed_paths=device('shell','pm','path',PACKAGE).strip().splitlines();base=[line[8:] for line in installed_paths if line.startswith('package:') and line.endswith('/base.apk')];assert len(base)==1 and base[0].startswith('/data/app/')
  installed_sha=device('shell','sha256sum',base[0]).split()[0];assert installed_sha==proof['apkSha256'],'Installed APK differs from the pinned candidate; do not mark acceptance complete'
  proof['installedApkSha256']=installed_sha
  proof['transport']='installed package version and APK hash independently read back; no transfer in verify-only mode'
  record('replacement installed, package version and APK SHA-256 match; functional acceptance remains separate')
if __name__=='__main__':main()
