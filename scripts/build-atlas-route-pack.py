"""Add source-attributed route data to an atlas without changing original assets."""
import argparse, copy, hashlib, io, json, zipfile
from pathlib import Path

ROUTE_FILE='classical-surface-routes.json'
IDS={'CHONG','DAI','YIN_WEI','YANG_WEI','YIN_QIAO','YANG_QIAO'}
digest=lambda raw:hashlib.sha256(raw).hexdigest()

def build(source, routes, output, version):
 source,routes,output=map(Path,(source,routes,output));receipt=output.with_suffix('.receipt.json')
 if output.exists() or receipt.exists():raise FileExistsError('Existing release or receipt must be retained')
 original=source.read_bytes();route_bytes=routes.read_bytes();derived=json.loads(route_bytes)
 if derived.get('schema')!='yandao.atlas.classical-surface-routes.v1' or len(derived.get('routes',[]))!=6 or {row.get('id') for row in derived['routes']}!=IDS:raise ValueError('Expected the existing six-route data protocol')
 if len(route_bytes)>4_000_000:raise ValueError('Route data exceeds the bounded client protocol')
 with zipfile.ZipFile(io.BytesIO(original)) as old:
  if len(old.namelist())!=len(set(old.namelist())) or ROUTE_FILE in old.namelist():raise ValueError('Duplicate or previously extended atlas archive')
  manifest=json.loads(old.read('manifest.json'))
  if manifest['format']!='yandao-bodyparts-atlas' or manifest['viewerProtocol']!=1:raise ValueError('Unexpected atlas protocol')
  if tuple(map(int,version.split('.')))<=tuple(map(int,manifest['version'].split('.'))):raise ValueError('Content version must advance')
  for row in manifest['files']:
   raw=old.read(row['path'])
   if len(raw)!=row['size'] or digest(raw)!=row['sha256']:raise ValueError('Original asset failed SHA validation')
  if derived['sourcePackSha256']!=digest(original) or derived['sourceSkinChunkSha256']!=digest(old.read(derived['sourceSkinChunkUrl'])) or derived['sourceSurfaceSha256']!=digest(old.read('surface.json')):raise ValueError('Route data belongs to a different original geometry')
  updated=copy.deepcopy(manifest);updated['version']=version
  updated['files'].append({'path':ROUTE_FILE,'size':len(route_bytes),'sha256':digest(route_bytes)})
  output.parent.mkdir(parents=True,exist_ok=True)
  with output.open('xb') as stream,zipfile.ZipFile(stream,'w') as new:
   for item in old.infolist():
    raw=json.dumps(updated,ensure_ascii=False,separators=(',',':')).encode() if item.filename=='manifest.json' else old.read(item)
    new.writestr(copy.copy(item),raw)
   new.writestr(ROUTE_FILE,route_bytes,compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
  with zipfile.ZipFile(output) as new:
   kept=[]
   for item in old.infolist():
    if item.filename=='manifest.json':continue
    before,after=old.read(item),new.read(item.filename)
    if before!=after:raise ValueError('An original asset changed')
    kept.append({'path':item.filename,'bytes':len(after),'sha256':digest(after)})
   if new.read(ROUTE_FILE)!=route_bytes:raise ValueError('Route member differs')
 if source.read_bytes()!=original:raise ValueError('The protected original changed')
 proof={'schema':'yandao.atlas-route-pack-build.v1','sourcePath':str(source),'sourcePackSha256':digest(original),'version':version,'output':str(output),'bytes':output.stat().st_size,'sha256':digest(output.read_bytes()),'routeMember':ROUTE_FILE,'routeSha256':digest(route_bytes),'routeBytes':len(route_bytes),'originalAssetsByteEqual':kept,'geometryAndLicensesPreserved':True,'published':False,'viewerProtocol':1}
 receipt.write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');return proof

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',required=True);p.add_argument('--routes',required=True);p.add_argument('--output',required=True);p.add_argument('--version',required=True);a=p.parse_args()
 proof=build(a.source,a.routes,a.output,a.version);print(json.dumps({k:v for k,v in proof.items() if k!='originalAssetsByteEqual'},ensure_ascii=False))
