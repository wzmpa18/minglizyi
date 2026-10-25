"""Fetch pinned public ancient materia medica transcriptions; no modern rewrites."""
import argparse
import concurrent.futures
import hashlib
import json
import re
import html
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

COMMIT='fce547b73db49408b34a4144d12e09f09eebafd3'
BOOKS=[('bencao-beiyao','本草備要','汪昂'),('bencao-congxin','本草從新','吴仪洛'),
       ('bencao-qiuzhen','本草求真','黄宫绣'),('bencao-xinbian','本草新編','陈士铎'),
       ('benjing-shuzheng','本經疏證','邹澍'),('benjing-fengyuan','本經逢原','张璐'),
       ('depei-bencao','得配本草','严洁、施雯等'),('tangye-bencao','湯液本草','王好古'),
       ('bencao-gangmu','本草綱目','李时珍'),('gangmu-shiyi','本草綱目拾遺','赵学敏'),
       ('yaoxing-jie','藥性解','李中梓')]


class MateriaParser(HTMLParser):
    def __init__(self):
        super().__init__();self.header=False;self.tag=None;self.buffer=[];self.heading='';self.records=[];self.meta=[];self.headings={};self.tokens=[];self.section=0
    def handle_starttag(self,tag,attrs):
        if tag=='header':self.header=True
        if tag in ['p','h1','h2','h3','h4']:
            self.tag=tag;self.buffer=[]
    def handle_data(self,data):
        if self.header:self.meta.append(data)
        if self.tag:self.buffer.append(data)
        elif not self.header and data.strip():
            # Some editions contain lists outside paragraph tags. Preserve their
            # original order rather than silently losing those clauses.
            record={'heading':self.heading,'headings':[v for _,v in sorted(self.headings.items())],
                    'paragraph':len(self.records)+1,'text':data.strip(),'section':self.section,'sectionTitle':self.headings.get(1,'原文')}
            self.records.append(record);self.tokens.append({'kind':'p',**record})
    def handle_endtag(self,tag):
        if tag=='header':self.header=False
        if tag==self.tag:
            text=''.join(self.buffer).strip()
            if not self.header and text:
                if tag.startswith('h'):
                    level=int(tag[1]);self.headings={k:v for k,v in self.headings.items() if k<level};self.headings[level]=text
                    self.heading=text
                    if level==1:self.section+=1
                    self.tokens.append({'kind':tag,'text':text,'section':self.section,'sectionTitle':self.headings.get(1,'原文')})
                elif tag=='p':
                    record={'heading':self.heading,'headings':[v for _,v in sorted(self.headings.items())],
                            'paragraph':len(self.records)+1,'text':text,'section':self.section,'sectionTitle':self.headings.get(1,'原文')}
                    self.records.append(record);self.tokens.append({'kind':'p',**record})
            self.tag=None;self.buffer=[]


def collect(output):
    output.mkdir(parents=True,exist_ok=True)
    def fetch(spec):
        identifier,title,author=spec
        url='https://gitlab.com/jicheng/jc.data/-/raw/'+COMMIT+'/pages/book/'+urllib.parse.quote(title)+'/index.html'
        file=output/(identifier+'.html')
        try:
            if not file.exists():
                with urllib.request.urlopen(url,timeout=45) as response:
                    raw=response.read(30_000_001)
                if len(raw)>30_000_000:raise ValueError('Source too large')
                file.write_bytes(raw)
            raw=file.read_bytes();parser=MateriaParser();parser.feed(raw.decode('utf-8'))
            if len(parser.records)<30:raise ValueError('Insufficient source body')
            return {'id':identifier,'title':title,'author':author,'sourceHeader':''.join(parser.meta),
                    'rawFile':str(file),'sha256':hashlib.sha256(raw).hexdigest(),'paragraphs':len(parser.records),
                    'url':url.replace('/-/raw/','/-/blob/'),'status':'FETCHED_FOR_SOURCE_REVIEW'}
        except Exception as error:return {'id':identifier,'title':title,'status':'UNAVAILABLE','error':str(error)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as workers:records=list(workers.map(fetch,BOOKS))
    (output/'source-catalogue.json').write_text(json.dumps({'commit':COMMIT,'books':records},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps([{k:b[k] for k in ['id','status']+(['paragraphs'] if 'paragraphs' in b else ['error'])} for b in records],ensure_ascii=True))


def build_original_pack(catalogue, destination):
    books=[]
    for source in json.loads(catalogue.read_text(encoding='utf-8'))['books']:
        if source['status']!='FETCHED_FOR_SOURCE_REVIEW':continue
        raw=Path(source['rawFile']).read_bytes()
        if hashlib.sha256(raw).hexdigest()!=source['sha256']:raise ValueError('Source hash changed')
        text=raw.decode('utf-8');parser=MateriaParser();parser.feed(text)
        body=re.sub(r'<header\b.*?</header>','',text,flags=re.S|re.I);body=re.sub(r'<!--.*?-->','',body,flags=re.S)
        expected=re.sub(r'\s+','',html.unescape(re.sub(r'<[^>]+>','',body)))
        if expected!=re.sub(r'\s+','',''.join(t['text'] for t in parser.tokens)):raise ValueError('Incomplete extraction')
        sections={}
        for token in parser.tokens:
            section=sections.setdefault(token['section'],{'title':token['sectionTitle'],'texts':[]})
            section['texts'].append(token['text'])
        identifier='materia-'+source['id'];chapters=[]
        for number,section in sections.items():
            content='\n\n'.join(section['texts'])
            if len(content)>500000:raise ValueError('Chapter requires explicit subdivision')
            chapters.append({'id':identifier+'-section-'+str(number),'title':section['title'],'content':content})
        author=next(spec[2] for spec in BOOKS if spec[0]==source['id'])
        books.append({'id':identifier,'name':source['title'],'author':author,'dynasty':'古代本草原典（底本信息见来源）','pinyin':source['id'],
                      'description':'古代本草原文录文，保留原书异说；不包含现代译注，不能作为个人用药处方。',
                      'sourceName':'集成公开原典录文；固定来源版本 '+COMMIT,'sourceUrl':source['url'],'sourceRevisionUrl':source['url'],
                      'sourceRawSha256':source['sha256'],'contentSha256':hashlib.sha256('\n'.join(c['content'] for c in chapters).encode()).hexdigest(),
                      'license':'古代原文录文；不包含现代译注','verification':'逐字核对提取前后正文一致；未据扫描本逐字审校，底本信息见原来源',
                      'chapters':chapters})
    destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_text(json.dumps({'schema':'yandao.tcm.original-editions.v1','version':'1.0.0','books':books},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    print(json.dumps({'books':len(books),'chapters':sum(len(b['chapters']) for b in books),'bytes':destination.stat().st_size,'sha256':hashlib.sha256(destination.read_bytes()).hexdigest()}))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path);parser.add_argument('--catalogue',type=Path);parser.add_argument('--pack',type=Path)
    args=parser.parse_args()
    if args.catalogue and args.pack:build_original_pack(args.catalogue,args.pack)
    elif args.output:collect(args.output)
    else:parser.error('Use --output or --catalogue with --pack')
