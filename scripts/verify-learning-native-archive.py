"""Read-only, bounded-memory validation of actual signed learning artifacts."""
import argparse,hashlib,json,plistlib,zipfile
from pathlib import Path
def digest(file):
 h=hashlib.sha256()
 with file.open('rb')as stream:
  for part in iter(lambda:stream.read(1024*1024),b''):h.update(part)
 return h.hexdigest()
def verify(a):
 expected=[]
 animations=json.loads((a.repository/'public/assets/meridians/ANIMATION-MANIFEST.json').read_text(encoding='utf-8'))
 photos=json.loads((a.repository/'public/assets/acupoint-photos/MANIFEST.json').read_text(encoding='utf-8'))
 expected.extend({'path':r['asset'],'bytes':r['bytes'],'sha256':r['sha256']}for r in animations['records'])
 expected.extend({'path':'/assets/acupoint-photos/'+r['file'],'bytes':r['bytes'],'sha256':r['sha256']}for r in photos['records'])
 markers={text:False for text in ['tcm-learning-complete','study-image-link','tcm-dataset-head-','reading-books-head-','local_tts_voice']}
 with zipfile.ZipFile(a.archive)as z:
  names=z.namelist();versions=[n for n in names if n.endswith('/public/version.json')];assert len(versions)==1
  web=json.loads(z.read(versions[0]));assert web['version']=='v'+a.version
  native=None
  if a.kind=='ios':
   infos=[n for n in names if n.startswith('Payload/')and n.count('/')==2 and n.endswith('.app/Info.plist')];assert len(infos)==1
   info=plistlib.loads(z.read(infos[0]));assert info['CFBundleIdentifier']=='com.yandaoguoxue.app'and info['CFBundleShortVersionString']==a.version and info['CFBundleVersion']==a.build
   widgets=[n for n in names if '/PlugIns/'in n and n.endswith('.appex/Info.plist')];assert len(widgets)==1
   widget=plistlib.loads(z.read(widgets[0]));assert widget['CFBundleShortVersionString']==a.version and widget['CFBundleVersion']==a.build
   native={'bundleId':info['CFBundleIdentifier'],'version':info['CFBundleShortVersionString'],'build':info['CFBundleVersion'],'widgetMatches':True}
  configs=[n for n in names if n.endswith('/capacitor.config.json')];assert configs
  for name in configs:assert not json.loads(z.read(name)).get('server',{}).get('url'),'Unexpected remote-app URL'
  for record in expected:
   entries=[n for n in names if n.endswith('/public'+record['path'])];assert len(entries)==1,record['path'];h=hashlib.sha256();size=0
   with z.open(entries[0])as stream:
    for chunk in iter(lambda:stream.read(65536),b''):size+=len(chunk);h.update(chunk)
   assert size==record['bytes']and h.hexdigest()==record['sha256'],record['path']
  for name in names:
   if not name.endswith('.js')or '/public/_next/'not in name:continue
   with z.open(name)as stream:
    tail=b''
    for chunk in iter(lambda:stream.read(65536),b''):
     combined=tail+chunk
     for marker in markers:
      if marker.encode()in combined:markers[marker]=True
     tail=combined[-256:]
  assert all(markers.values()),markers
 proof={'kind':a.kind,'archive':str(a.archive),'bytes':a.archive.stat().st_size,'sha256':digest(a.archive),'source':a.source,'version':a.version,'build':a.build,'nativeMetadata':native,'bundledWebVersion':web['version'],'originalMediaFilesFullyVerified':len(expected),'protocolMarkers':markers,'remoteAppUrlAbsent':True,'physicalPhoneAcceptance':False}
 a.output.write_text(json.dumps(proof,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(proof,ensure_ascii=False))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--archive',type=Path,required=True);p.add_argument('--repository',type=Path,required=True);p.add_argument('--kind',choices=['ios','android'],required=True);p.add_argument('--version',required=True);p.add_argument('--build',required=True);p.add_argument('--source',required=True);p.add_argument('--output',type=Path,required=True);verify(p.parse_args())
