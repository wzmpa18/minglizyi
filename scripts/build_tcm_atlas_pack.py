"""Package an audited, pinned TCM 3D checkout as data only. Never bundle upstream executable code."""
import argparse,hashlib,json,subprocess,zipfile
from pathlib import Path
PIN='e8b9ad1c17e67a25e94406100e3fb5c296c24f7a'
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
 commit=subprocess.check_output(['git','-C',str(a.source),'rev-parse','HEAD'],text=True).strip();assert commit==PIN,'Audit a changed source before updating PIN'
 assert not a.output.exists(),'Never overwrite a prior verified release'
 files={}
 atlas=json.loads((a.source/'public/models/atlas.json').read_bytes())
 for chunk in atlas['chunks']:
  name=Path(chunk['url']).name;blob=(a.source/'public/models'/name).read_bytes();assert len(blob)==chunk['bytes'] and not blob.startswith(b'version https://git-lfs')
  files[name]=blob;chunk['url']=name;chunk.pop('gzip',None);chunk.pop('gzipBytes',None)
 files['atlas.json']=json.dumps(atlas,separators=(',',':')).encode()
 files['points.json']=(a.source/'app/teaching-points.json').read_bytes();files['surface.json']=(a.source/'app/meridian-surface.json').read_bytes()
 for local,remote in [('LICENSE','CODE-LICENSE.txt'),('NOTICE','NOTICE'),('public/ATTRIBUTION.md','ATTRIBUTION.md')]:files[remote]=(a.source/local).read_bytes()
 points=json.loads(files['points.json']);assert len({p['code'] for p in points})==362 and all(not p['reviewed'] for p in points)
 manifest={'format':'yandao-bodyparts-atlas','version':'3.0.0','viewerProtocol':1,'source':'https://github.com/JICio/tcm-3d','commit':commit,'coordinateSystem':'meters / Y-up / adult male / same BodyParts3D reference','sourceMeshCount':len(atlas['parts']),'displayOmissions':['FJ2813 hair','FJ2815 pubic hair'],'pointReview':'engineering illustration; no individual medical verification','files':[{'path':n,'size':len(b),'sha256':hashlib.sha256(b).hexdigest()} for n,b in files.items()]}
 files['manifest.json']=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode();a.output.parent.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(a.output,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for name,b in sorted(files.items()):z.writestr(name,b)
 proof={'packId':'tcm-anatomy-atlas-v3','version':'3.0.0','minAppVersion':'25.0.115','sourceCommit':commit,'bytes':a.output.stat().st_size,'sha256':hashlib.sha256(a.output.read_bytes()).hexdigest(),'sourceMeshes':len(atlas['parts']),'concepts':len(atlas['concepts']),'systems':{s:sum(p['system']==s for p in atlas['parts']) for s in sorted({p['system'] for p in atlas['parts']})},'acupointNames':len(points),'medicallyReviewed':0,'files':manifest['files']}
 a.output.with_suffix('.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({k:v for k,v in proof.items() if k!='files'}))
if __name__=='__main__':main()
