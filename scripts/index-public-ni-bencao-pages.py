"""Bibliographic mention-page index only. Never republishes the modern PDF text."""
import argparse
import hashlib
import importlib.util
import json
import re
from pathlib import Path
from pypdf import PdfReader


def build(pdf, provenance, destination):
    spec=importlib.util.spec_from_file_location('reading_builder',Path(__file__).with_name('build-medical-study-library.py'))
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    source=json.loads(provenance.read_text(encoding='utf-8'))
    if hashlib.sha256(pdf.read_bytes()).hexdigest()!=source['sha256']:raise ValueError('Original source changed')
    herbs=json.loads((Path(__file__).resolve().parents[1]/'src/algorithm-core/modules/tcm/data/herbs.json').read_text(encoding='utf-8'))['herbs']
    pages={}
    reader=PdfReader(pdf)
    # Exclude advertisements, introduction and the table of contents. A match is
    # only a mention, not an assertion of a dedicated chapter or clinical claim.
    for number,page in enumerate(reader.pages,1):
        if number<11:continue
        text=re.sub(r'\s+','',module.simple(page.extract_text() or ''))
        for herb in herbs:
            names=[herb['name']]
            names.extend({'黄芪':['黄耆'],'扁蓄':['萹蓄'],'螌蝥':['斑蝥'],'蟅虫':['䗪虫']}.get(herb['name'],[]))
            if any(len(name)>=2 and name in text for name in names):pages.setdefault('herb:'+herb['id'],[]).append(number)
    result={'schema':'yandao.public-course-page-index.v1','source':{
        'id':'ni-bencao-public-page-index','title':'倪师本草视频同步文稿（2025版）','author':'倪海厦课程；岐黄圣贤智慧学子校勘',
        'kind':'EXTERNAL_COURSE_INDEX','sha256':source['sha256'],'url':source['url'],
        'license':'仅提供公开来源页码索引，未在应用转载讲稿；原件使用说明以来源为准','inAppBook':False},
        'pages':pages,'notice':'只表示该药名出现在该PDF原页，不等于该页均为本药专章；索引不包含讲稿正文。'}
    destination.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'indexedHerbs':len(pages),'pdfPages':len(reader.pages),'quotedTextIncluded':False}))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--pdf',type=Path,required=True);parser.add_argument('--provenance',type=Path,required=True);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();build(args.pdf,args.provenance,args.output)
