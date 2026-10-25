"""Attach original JPEG pages by exact printed point codes, never OCR clinical fields."""
import argparse,hashlib,json,re,collections,io
from pathlib import Path
from pypdf import PdfReader
from PIL import Image
RANGES={'LU':(10,12,11),'SP':(13,17,15),'PC':(18,20,19),'LR':(21,25,23),'HT':(26,28,27),'KI':(29,33,30),'SI':(34,37,35),'BL':(38,46,39),'LI':(47,50,48),'ST':(51,58,53),'TE':(59,62,60),'GB':(63,70,65),'CV':(71,75,72),'GV':(76,81,77)}
# These eight table entries were checked against actual original page images.
MANUAL={'TE22':62,'GB3':65,'CV1':72,'CV2':72,'CV4':72,'CV5':73,'CV7':73,'CV8':73}
def normal(code):return code.replace('RN','CV').replace('DU','GV').replace('SJ','TE').replace('LV','LR')
def build(args):
 root=Path(__file__).resolve().parents[1];pack=json.loads(args.base_pack.read_text(encoding='utf-8'));manifest=json.loads(args.media_manifest.read_text(encoding='utf-8'))
 sample=json.loads((args.source_directory/'page-0011.json').read_text(encoding='utf-8-sig'));pdf=Path(sample['source']);sha=hashlib.sha256(pdf.read_bytes()).hexdigest()
 if sha!='7715ec0b706700f7937d685f650450c47715379f3c92ad99941b68b39fd57428':raise ValueError('Original atlas changed')
 points=json.loads((root/'src/algorithm-core/modules/tcm/data/meridians.json').read_text(encoding='utf-8'))['acupoints'];codes={normal(p['code']) for p in points};anchors=collections.defaultdict(list)
 for prefix,(first,last,table_first) in RANGES.items():
  for page in range(table_first,last+1):
   row=json.loads((args.source_directory/f'page-{page:04}.json').read_text(encoding='utf-8-sig'))
   if row['sourceSha256'].lower()!=sha:raise ValueError('OCR from another original')
   for line in row['lines']:
    text=normal(re.sub(r'\s','',line['text']).upper());m=re.fullmatch(r'(LU|SP|PC|LR|HT|KI|SI|BL|LI|ST|TE|GB|CV|GV)(\d{1,2})',text)
    if m and m[1]==prefix and min(w['x'] for w in line['words'])<450:
     code=m[1]+str(int(m[2]));
     if code in codes:anchors[code].append({'pdfPage':page,'codeLine':line,'review':'EXACT_TABLE_CODE'})
 for code,page in MANUAL.items():
  if anchors.get(code):raise ValueError('A manually reviewed missing code is no longer missing')
  anchors[code]=[{'pdfPage':page,'review':'NAME_AND_CODE_VISUALLY_CHECKED_ON_ORIGINAL_PAGE'}]
 if set(anchors)!=codes or any(len(rows)!=1 for rows in anchors.values()):raise ValueError('Incomplete or ambiguous code mapping')
 # Page progression must be monotonic for each complete meridian sequence.
 for prefix in RANGES:
  ordered=sorted(((int(c[2:]),rows[0]['pdfPage']) for c,rows in anchors.items() if c[:2]==prefix))
  if [n for n,p in ordered]!=list(range(1,len(ordered)+1)) or [p for n,p in ordered]!=sorted(p for n,p in ordered):raise ValueError('Broken point order')
 source='atlas-lan-qiao-ji-2010';pack['sources'][source]={'title':'针灸经络取穴全真图解（真人全彩版）','author':'蓝晓步、乔成平、纪剑峰等主编','kind':'STUDY_REFERENCE','sha256':sha,'localOriginalName':pdf.name,'license':'用户提供教材原页；江苏科学技术出版社，2010年7月，ISBN 978-7-5345-7360-6。保留书籍署名，不标为开放许可或新版专业审校。','inAppBook':False}
 links=[];pages=set()
 for point in points:
  code=normal(point['code']);first,last,table_first=RANGES[code[:2]];table=anchors[code][0]['pdfPage'];photos=list(range(first,table_first));selected=photos+[table];pages.update(selected)
  illustrations=[]
  for page in selected:
   photo=page in photos
   illustrations.append({'path':f'/assets/acupoint-photos/atlas-lan-{sha[:10]}-p{page:04}.jpg','title':('本经真人取穴总图' if photo else f'{point["name"]} · {point["code"]} 原书表页')+f' · 原书第{page-5}页','source':source,'caption':('本经共用真人照片与穴位标注，需放大查看原书代码；不是每个穴位各有一张独立近照。' if photo else f'本穴定位、主治与刺灸法见表中{point["name"]}／{code}（原书任、督及三焦可记RN、DU、SJ）对应行；不把同页其他穴位内容当成本穴内容。')+'2010年教材原页，供文献学习对照。'})
  key='point:'+point['code'];subject=pack['subjects'][key];subject['illustrations']=list({im['path']:im for im in subject.get('illustrations',[])+illustrations}.values())
  links.append({'key':key,'name':point['name'],'normalizedCode':code,'photoPages':photos,'tablePage':table,'anchorReview':anchors[code][0]['review']})
 reader=PdfReader(str(pdf));catalogue={r['path']:r for r in manifest['records']};proof=[];args.media_directory.mkdir(parents=True,exist_ok=True)
 for page in sorted(pages):
  images=list(reader.pages[page-1].images)
  if len(images)!=1:raise ValueError('Page is not one complete original scan')
  raw=images[0].data
  if not raw.startswith(b'\xff\xd8') or len(raw)>5_000_000:raise ValueError('Original JPEG missing or oversized')
  with Image.open(io.BytesIO(raw)) as image:
   if image.height/image.width<1.3:raise ValueError('Expected full book page')
   dimensions=list(image.size)
  name=f'atlas-lan-{sha[:10]}-p{page:04}.jpg';target=args.media_directory/name;target.write_bytes(raw)
  if target.read_bytes()!=raw:raise ValueError('JPEG readback mismatch')
  record={'path':'/assets/acupoint-photos/'+name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'mime':'image/jpeg'};catalogue[record['path']]=record;proof.append({**record,'sourcePdfSha256':sha,'sourcePdfPage':page,'originalJpegBytesUnchanged':True,'dimensions':dimensions})
 manifest['version']=2026102503;manifest['records']=list(catalogue.values());args.output.write_text(json.dumps(pack,ensure_ascii=False,separators=(',',':')),encoding='utf-8');args.media_manifest.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 audit={'sourcePdfSha256':sha,'standardPoints':len(points),'exactTableCodeAnchors':len(points)-len(MANUAL),'visuallyCheckedMissingCodes':MANUAL,'sourceLinks':links,'images':proof,'not361SeparatePointCloseups':True,'ocrClinicalTextPublished':False,'packBytes':args.output.stat().st_size,'packSha256':hashlib.sha256(args.output.read_bytes()).hexdigest(),'mediaFiles':len(catalogue),'mediaBytes':sum(r['bytes'] for r in catalogue.values())};args.audit.write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:v for k,v in audit.items() if k not in ['images','sourceLinks']},ensure_ascii=False))
if __name__=='__main__':
 parser=argparse.ArgumentParser()
 for name in ['base-pack','source-directory','output','media-directory','media-manifest','audit']:parser.add_argument('--'+name,type=Path,required=True)
 build(parser.parse_args())
