"""Transfer an exact signed ZIP/APK using verified compressed entries from a prior archive.
This is deployment transport only: output bytes must match the complete signed artifact.
"""
import argparse,hashlib,json,os,struct,zipfile
from pathlib import Path

def digest(path):
 h=hashlib.sha256()
 with Path(path).open('rb')as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def blocks(path):
 result={}
 with zipfile.ZipFile(path)as z,Path(path).open('rb')as f:
  for item in z.infolist():
   f.seek(item.header_offset);header=f.read(30);assert header[:4]==b'PK\x03\x04'
   names,extra=struct.unpack_from('<HH',header,26);offset=item.header_offset+30+names+extra
   result[item.filename]=(offset,item.compress_size)
 return result
def segment_hash(f,offset,length):
 f.seek(offset);h=hashlib.sha256()
 while length:
  b=f.read(min(length,1048576));assert b;h.update(b);length-=len(b)
 return h.digest()
def create(base,target,patch):
 base,target,patch=map(Path,(base,target,patch));assert not patch.exists();old=blocks(base);new=blocks(target);ops=[];payloadOffset=0;cursor=0;reused=0
 with base.open('rb')as source,target.open('rb')as current,zipfile.ZipFile(patch,'w',compression=zipfile.ZIP_DEFLATED)as z:
  with z.open('payload.bin','w',force_zip64=True)as payload:
   def literal(offset,length):
    nonlocal payloadOffset
    if not length:return
    ops.append(['data',payloadOffset,length]);payloadOffset+=length;current.seek(offset)
    while length:
     chunk=current.read(min(length,1048576));assert chunk;payload.write(chunk);length-=len(chunk)
   for name,(offset,length)in sorted(new.items(),key=lambda row:row[1][0]):
    assert offset>=cursor;literal(cursor,offset-cursor);prior=old.get(name)
    if length and prior and prior[1]==length and segment_hash(source,*prior)==segment_hash(current,offset,length):ops.append(['copy',prior[0],length]);reused+=length
    else:literal(offset,length)
    cursor=offset+length
   literal(cursor,target.stat().st_size-cursor)
  meta={'schema':'yandao.release-zip-delta.v1','baseSha256':digest(base),'targetSha256':digest(target),'targetBytes':target.stat().st_size,'ops':ops}
  z.writestr('manifest.json',json.dumps(meta,separators=(',',':')))
 return {'patchBytes':patch.stat().st_size,'targetBytes':meta['targetBytes'],'reusedBytes':reused,'targetSha256':meta['targetSha256']}
def apply(base,patch,output):
 base,patch,output=map(Path,(base,patch,output));pending=output.with_name(output.name+'.delta-pending');assert not output.exists()and not pending.exists();assert base.resolve()!=output.resolve()
 try:
  with zipfile.ZipFile(patch)as z,base.open('rb')as source:
   assert len(z.namelist())==2 and set(z.namelist())=={'payload.bin','manifest.json'}
   assert z.getinfo('manifest.json').file_size<=4000000
   meta=json.loads(z.read('manifest.json'));assert meta['schema']=='yandao.release-zip-delta.v1'and digest(base)==meta['baseSha256']
   assert type(meta['targetBytes'])is int and 0<meta['targetBytes']<=268435456
   assert len(meta['ops'])<=20000;total=0;dataCursor=0
   for kind,offset,length in meta['ops']:
    assert kind in ['copy','data']and type(offset)is int and type(length)is int and offset>=0 and length>0
    assert offset+length<=(base.stat().st_size if kind=='copy'else z.getinfo('payload.bin').file_size)
    if kind=='data':assert offset==dataCursor;dataCursor+=length
    total+=length
   assert total==meta['targetBytes']and dataCursor==z.getinfo('payload.bin').file_size
   with z.open('payload.bin')as payload,pending.open('xb')as out:
    for kind,offset,length in meta['ops']:
     reader=source if kind=='copy'else payload
     if kind=='copy':source.seek(offset)
     while length:
      chunk=reader.read(min(length,1048576));assert chunk;out.write(chunk);length-=len(chunk)
   assert digest(pending)==meta['targetSha256'];os.replace(pending,output)
  return {'bytes':output.stat().st_size,'sha256':digest(output),'exactSignedArtifactRestored':True}
 except BaseException:
  if pending.exists():pending.unlink()
  raise
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('mode',choices=['create','apply']);p.add_argument('base');p.add_argument('input');p.add_argument('output');a=p.parse_args();print(json.dumps((create if a.mode=='create'else apply)(a.base,a.input,a.output)))
