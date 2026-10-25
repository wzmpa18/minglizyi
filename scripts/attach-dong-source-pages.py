"""Attach visually checked source-page images; never promote OCR to clinical text."""
import argparse
import collections
import hashlib
import json
import re
from pathlib import Path
from PIL import Image


def build(base_pack, review_file, source_directory, output, media_directory, media_manifest, audit):
    root=Path(__file__).resolve().parents[1]
    pack=json.loads(base_pack.read_text(encoding='utf-8'))
    review=json.loads(review_file.read_text(encoding='utf-8'))
    source_record=json.loads((source_directory/'page-0031.json').read_text(encoding='utf-8-sig'))
    pdf=Path(source_record['source']);source_sha=hashlib.sha256(pdf.read_bytes()).hexdigest()
    if source_sha!=source_record['sourceSha256'].lower():raise ValueError('Original PDF changed')
    source='dong-wangmin-source-pages'
    pack['sources'][source]={'title':'董氏奇穴精要整理（用户提供扫描本）','author':'王敏整理',
        'kind':'STUDY_REFERENCE','sha256':source_sha,'localOriginalName':pdf.name,
        'license':'用户提供教材原页节选，保留作者与底本信息；未标为开放许可或专业审校','inAppBook':False}
    checked={key:value for key,value in review.items() if value['name'] and value['review'].startswith(('HEADING_','HEADING_AND_'))}
    if len(checked)!=267:raise ValueError('Expected the reviewed 267 original-book entries; do not count OCR candidates as points')
    def parts(name):return [p for p in re.split('[、（）()]',name) if p]
    frequencies=collections.Counter(p for item in checked.values() for p in parts(item['name']))
    standard={p['name'] for p in json.loads((root/'src/algorithm-core/modules/tcm/data/meridians.json').read_text(encoding='utf-8'))['acupoints']}
    supplemental={}
    for page in range(115,233):
        row=json.loads((source_directory/f'page-{page:04}.json').read_text(encoding='utf-8-sig'))
        supplemental[page]=row['text'].replace(' ','')
    chosen_pages=set();link_records=[]
    for identifier,item in sorted(checked.items(),key=lambda pair:(pair[1]['pdfPage'],pair[0])):
        pages=[item['pdfPage']]
        # The scan often continues a definition on the next page. The caption
        # explicitly says a source page can contain several neighbouring entries.
        if item['pdfPage']<114:pages.append(item['pdfPage']+1)
        pages.extend(item.get('additionalPages',[]))
        terms=[term for term in parts(item['name']) if len(term)>=2 and frequencies[term]==1 and term not in standard and term not in ['木穴','感冒']]
        for page,text in supplemental.items():
            if any(re.search(re.escape(term.removesuffix('穴'))+r'(?:一|二|三)?穴',text) for term in terms):pages.append(page)
        pages=list(dict.fromkeys(pages));chosen_pages.update(pages)
        key='dong:'+item['name']+'@wm-'+identifier
        if len(key[5:])>40:raise ValueError('Source name exceeds client bounds')
        illustrations=[{'path':f'/assets/acupoint-photos/dong-wm-{source_sha[:10]}-p{page:04}.webp',
            'title':f'《董氏奇穴精要整理》原页 · PDF第{page}页', 'source':source,
            'caption':f'原书第{page-14}页；{item["region"]}部条目的'+('定位、主治与图示原页' if page in pages[:2] else '同名相关讨论原页')+'。同页可能有其他穴位或不同版本，按原页标注对照，不把同页出现自动当作配穴。'} for page in pages]
        pack['subjects'][key]={'name':item['name'],'kind':'dong','references':[],'region':item['region'],'catalogueVisible':True,'illustrations':illustrations}
        link_records.append({'key':key,'name':item['name'],'region':item['region'],'pages':pages})
    # Existing bookmarks use the application's old 39 names. Keep them; link to
    # the matching named original entry without overwriting legacy clinical fields.
    legacy_names=re.findall(r'name: "([^"]+)"',(root/'src/algorithm-core/modules/tcm/dong-acupoints.ts').read_text(encoding='utf-8'))
    linked=[];unresolved=[]
    for name in legacy_names:
        exact=[row for row in link_records if name in parts(row['name'])]
        matches=exact or [row for row in link_records if name.removesuffix('穴') in parts(row['name'])]
        if len(matches)!=1:unresolved.append(name);continue
        source_subject=pack['subjects'][matches[0]['key']]
        key='dong:'+name
        pack['subjects'][key]={**source_subject,'name':name,'catalogueVisible':False}
        linked.append({'legacy':name,'sourceKey':matches[0]['key']})
    media_directory.mkdir(parents=True,exist_ok=True)
    manifest=json.loads(media_manifest.read_text(encoding='utf-8'))
    catalogue={row['path']:row for row in manifest['records']}
    image_proof=[]
    for page in sorted(chosen_pages):
        original=source_directory/f'page-{page:04}.png'
        destination=media_directory/f'dong-wm-{source_sha[:10]}-p{page:04}.webp'
        with Image.open(original) as image:
            rgb=image.convert('RGB');rgb.save(destination,'WEBP',lossless=True,method=6)
            with Image.open(destination) as saved:
                if saved.convert('RGB').tobytes()!=rgb.tobytes():raise ValueError('Source image pixels changed')
        raw=destination.read_bytes();record={'path':'/assets/acupoint-photos/'+destination.name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'mime':'image/webp'}
        if len(raw)>5_000_000:raise ValueError('Source image exceeds client limit')
        catalogue[record['path']]=record
        image_proof.append({**record,'sourcePdfPage':page,'sourcePdfSha256':source_sha,'renderedPngSha256':hashlib.sha256(original.read_bytes()).hexdigest(),'pixelIdenticalToRenderedPage':True})
    manifest['version']=2026102502;manifest['records']=list(catalogue.values())
    output.write_text(json.dumps(pack,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    media_manifest.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    proof={'sourcePdfSha256':source_sha,'originalEntries':len(checked),'notAnIndividualPointCount':True,'legacyLinks':linked,'unresolvedLegacyNames':unresolved,
           'sourcePageImages':image_proof,'sourcePageLinks':link_records,'packBytes':output.stat().st_size,'packSha256':hashlib.sha256(output.read_bytes()).hexdigest(),
           'ocrClinicalTextPublished':False,'clinicalReviewClaimed':False}
    audit.write_text(json.dumps(proof,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in proof.items() if k not in ['sourcePageImages','sourcePageLinks','legacyLinks']},ensure_ascii=False))
    print('source images',len(image_proof),'legacy names linked',len(linked))


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    for name in ['base-pack','review-file','source-directory','output','media-directory','media-manifest','audit']:parser.add_argument('--'+name,type=Path,required=True)
    args=parser.parse_args();build(args.base_pack,args.review_file,args.source_directory,args.output,args.media_directory,args.media_manifest,args.audit)
