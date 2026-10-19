"""Pin and audit licensed offline OCR assets in a clean Android CI build.
Use --audit-only locally to keep all downloaded bytes in RAM. No APK/ZIP extract.
"""
import argparse,hashlib,io,json,struct,zipfile
from pathlib import Path
from urllib.request import urlopen

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--audit-only',action='store_true');args=parser.parse_args()
 root=Path(__file__).resolve().parent.parent;manifest=json.loads((root/'scripts/fixtures/life-ocr-models.json').read_text(encoding='utf-8'))
 def verified(url,size,digest):
  with urlopen(url,timeout=90) as response:data=response.read(size+1)
  assert len(data)==size and hashlib.sha256(data).hexdigest()==digest,'OCR dependency size or SHA mismatch'
  return data
 aar=verified(manifest['aar']['url'],manifest['aar']['bytes'],manifest['aar']['sha256']);archive=zipfile.ZipFile(io.BytesIO(aar));elf=[]
 for name in archive.namelist():
  if not name.startswith(('jni/arm64-v8a/','jni/x86_64/')) or not name.endswith('.so'):continue
  data=archive.read(name);assert data[:4]==b'\x7fELF' and data[4]==2 and data[5]==1
  offset=struct.unpack_from('<Q',data,32)[0];size,count=struct.unpack_from('<HH',data,54);alignments=[]
  for i in range(count):
   p=offset+i*size
   if struct.unpack_from('<I',data,p)[0]==1:alignments.append(struct.unpack_from('<Q',data,p+48)[0])
  assert alignments and min(alignments)>=16384,'OCR native library lacks 16KiB PT_LOAD alignment'
  elf.append({'file':name,'minimumLoadAlignment':min(alignments)})
 assert len(elf)==8
 if not args.audit_only:
  dest=root/'android/app/libs/life-ocr-tesseract4android-4.9.0.aar';dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(aar)
 modelproof=[]
 for model in manifest['models']:
  url=f"https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/{manifest['modelRevision']}/{model['name']}.traineddata";data=verified(url,model['bytes'],model['sha256'])
  if not args.audit_only:
   dest=root/f"android/app/src/main/assets/life-ocr/tessdata/{model['name']}.traineddata";dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
  modelproof.append(model)
 if not args.audit_only:
  dest=root/'android/app/src/main/assets/life-ocr/model-manifest.json';dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(manifest,ensure_ascii=False),encoding='utf-8')
 print(json.dumps({'engine':manifest['engine'],'models':modelproof,'elf16KiB':elf,'mode':'RAM audit only' if args.audit_only else 'verified clean-build assets'},ensure_ascii=False))
if __name__=='__main__':main()
