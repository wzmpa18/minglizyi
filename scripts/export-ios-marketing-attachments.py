"""Export only explicitly named public marketing screenshots, never xcresult logs."""
import argparse,hashlib,json,shutil,struct,zlib
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('raw',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
manifest=json.loads((a.raw/'manifest.json').read_text(encoding='utf8'));rows=[]
for group in manifest:
 for record in group.get('attachments',[]):
  name=record.get('suggestedHumanReadableName','')
  if not name.startswith('MARKETING_') or record.get('isAssociatedWithFailure'):continue
  file=record['exportedFileName'];assert Path(file).name==file and file.endswith('.png')
  source=a.raw/file;assert source.is_file() and not source.is_symlink()
  data=source.read_bytes();assert data[:8]==b'\x89PNG\r\n\x1a\n';offset=8;chunks=[];width=height=0
  while offset<len(data):
   length=struct.unpack_from('>I',data,offset)[0];kind=data[offset+4:offset+8];body=data[offset+8:offset+8+length];crc=struct.unpack_from('>I',data,offset+8+length)[0];assert zlib.crc32(kind+body)&0xffffffff==crc;chunks.append(kind)
   if kind==b'IHDR':width,height,depth,colour,compression,filtering,interlace=struct.unpack('>IIBBBBB',body);assert depth==8 and colour==2,'Preserve originals; alpha must be separately reviewed'
   offset+=12+length
  assert chunks[-1]==b'IEND' and b'tRNS' not in chunks and width>0 and height>0
  a.output.mkdir(parents=True,exist_ok=True);target=a.output/file;assert not target.exists();shutil.copyfile(source,target)
  public={k:record[k] for k in ['configurationName','deviceId','deviceName','exportedFileName','suggestedHumanReadableName','timestamp','isAssociatedWithFailure'] if k in record}
  rows.append({**public,'feature':name[len('MARKETING_'):].split('_',1)[0],'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'width':width,'height':height,'mode':'RGB','hasAlphaChannel':False})
assert rows,'No explicit public marketing captures were exported'
(a.output/'manifest.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
required={'anatomy','ni-study','learning-community','medical-home','original-texts'}
assert required.issubset({r['feature'] for r in rows}),'Actual captures do not cover all requested learning features'
print(json.dumps({'publicMarketingScreenshots':len(rows),'features':sorted({r['feature'] for r in rows}),'credentialsOrSessionExported':False}))
