"""Transfer a static release using identical prior files, with full source/hash verification."""
import argparse,hashlib,json,os,zipfile
from pathlib import Path,PurePosixPath

def digest(path):
 h=hashlib.sha256()
 with Path(path).open('rb')as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def create(base,target,patch,source):
 base,target,patch=map(Path,(base,target,patch));assert not patch.exists();records=[];reused=0
 with zipfile.ZipFile(patch,'w',compression=zipfile.ZIP_DEFLATED)as z:
  for p in sorted(target.rglob('*')):
   if not p.is_file():continue
   assert not p.is_symlink();name=p.relative_to(target).as_posix();prior=base/name;sha=digest(p);reuse=prior.is_file()and not prior.is_symlink()and digest(prior)==sha
   records.append({'path':name,'bytes':p.stat().st_size,'sha256':sha,'reuse':reuse})
   if reuse:reused+=p.stat().st_size
   else:z.write(p,'files/'+name)
  z.writestr('manifest.json',json.dumps({'schema':'yandao.static-release-delta.v1','source':source,'files':records},separators=(',',':')))
 return {'files':len(records),'reusedBytes':reused,'patchBytes':patch.stat().st_size}
def apply(base,patch,target,source):
 base,patch,target=map(Path,(base,patch,target));assert base.is_dir()and not target.exists();assert target.resolve()!=base.resolve()
 with zipfile.ZipFile(patch)as z:
  assert z.getinfo('manifest.json').file_size<4000000;meta=json.loads(z.read('manifest.json'));assert meta['schema']=='yandao.static-release-delta.v1'and meta['source']==source
  expected=['manifest.json'];seen=set()
  for row in meta['files']:
   p=PurePosixPath(row['path']);assert not p.is_absolute()and '..'not in p.parts and row['path']not in seen;seen.add(row['path']);assert type(row['bytes'])is int and 0<=row['bytes']<=268435456
   if not row['reuse']:expected.append('files/'+row['path'])
  assert len(z.namelist())==len(expected)and set(z.namelist())==set(expected)
  target.mkdir()
  for row in meta['files']:
   p=target/row['path'];assert p.resolve().is_relative_to(target.resolve());p.parent.mkdir(parents=True,exist_ok=True)
   if row['reuse']:
    prior=base/row['path'];assert prior.resolve().is_relative_to(base.resolve())and not prior.is_symlink();assert prior.stat().st_size==row['bytes']and digest(prior)==row['sha256'];os.link(prior,p)
   else:
    assert z.getinfo('files/'+row['path']).file_size==row['bytes']
    with z.open('files/'+row['path'])as f,p.open('xb')as out:
     for b in iter(lambda:f.read(1048576),b''):out.write(b)
   assert p.stat().st_size==row['bytes']and digest(p)==row['sha256']
 return {'source':source,'verifiedFiles':len(meta['files']),'target':str(target)}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('mode',choices=['create','apply']);p.add_argument('base');p.add_argument('input');p.add_argument('output');p.add_argument('--source',required=True);a=p.parse_args();print(json.dumps((create if a.mode=='create'else apply)(a.base,a.input,a.output,a.source)))
