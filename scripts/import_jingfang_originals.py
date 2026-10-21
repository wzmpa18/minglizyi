"""Import pinned public-domain medical texts, with explicit paratext and figure limits.

Default verifies the maintained data. --fetch --write regenerates it from the
reviewed source manifest. No source HTML, cache or image is retained.
"""
import sys
sys.dont_write_bytecode = True
import argparse,concurrent.futures,hashlib,html,json,re,urllib.parse,urllib.request
from pathlib import Path
from import_tcm_clinical_editions import BookParser

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'backend_deploy/data/tcm-jingfang-sources.json'
TARGET=ROOT/'backend_deploy/data/tcm-jingfang-originals.json'
FIGURE=re.compile(r'〔原书插图位置：[^\n]*?；本录文未收录图像，须另核原图〕')
sha=lambda value:hashlib.sha256(value if isinstance(value,bytes) else value.encode()).hexdigest()
compact=lambda value:re.sub(r'[\s〔〕]','',value)

class TextEditionParser(BookParser):
    def handle_starttag(self,tag,attrs):
        values=dict(attrs)
        if tag=='img' and self.visible() and self.title is not None:
            label=values.get('alt') or '无题图'
            assert not re.search(r'[\n\r<>〔〕]',label)
            self.body.append('\n〔原书插图位置：'+label+'；本录文未收录图像，须另核原图〕\n')
        super().handle_starttag(tag,attrs)

def parse_source(raw,source):
    assert sha(raw)==source['rawSha256'],'Pinned source hash changed: '+source['title']
    text=raw.decode('utf-8');header=re.search(r'<header\b[^>]*>(.*?)</header>',text,re.S)
    assert header,'Missing source metadata'
    # A historical sentence such as 必待補而愈 is not a missing-text notice.
    if re.search(r'正文待補|方未校|校訂不足|錯誤百出|缺卷|缺頁',re.sub('<[^>]+>','',header.group())):
        raise ValueError('Source metadata declares an unresolved edition gap')
    parser=TextEditionParser(source.get('level','h1'));parser.feed(text);parser.finish()
    generated_preface=False
    if source.get('prefaceLevel') or source.get('prefaceTitle'):
        body=text[header.end():];first=re.search('<'+source.get('level','h1')+r'\b',body)
        assert first is not None
        preface=TextEditionParser(source.get('prefaceLevel','h9'))
        if source.get('prefaceTitle'):preface.title=source['prefaceTitle'];generated_preface=True
        preface.feed(body[:first.start()]);preface.finish()
        parser.sections=preface.sections+parser.sections
    assert len(parser.sections)==source['sourceChapterCount'],source['title']+' chapter count'
    assert parser.images==source['imagePositions']
    stripped=re.sub(r'<header\b[^>]*>.*?</header>','',text,flags=re.S)
    stripped=re.sub(r'<!--.*?-->','',stripped,flags=re.S)
    stripped=html.unescape(re.sub(r'<[^>]+>','',stripped))
    reconstructed=''.join(('' if generated_preface and i==0 else c['title'])+FIGURE.sub('',c['content']) for i,c in enumerate(parser.sections))
    assert compact(stripped)==compact(reconstructed),'Source text omitted or reordered: '+source['title']
    selected=parser.sections
    if source.get('includeTitles'):
        wanted=source['includeTitles'];selected=[c for c in selected if c['title'] in wanted]
        assert [c['title'] for c in selected]==wanted
    assert len(selected)==source['chapterCount']
    chapters=[{'id':source['id']+'-'+str(i),'title':c['title'],'content':c['content']} for i,c in enumerate(selected,1)]
    content='\n'.join(c['content'] for c in chapters)
    assert len(content)>=source['minimumCharacters'] and content.endswith(source['terminalText'])
    return chapters,header.group()

def fetch_book(source,pin):
    file='pages/book/'+source['title']+'/index.html'
    url='https://gitlab.com/api/v4/projects/jicheng%2Fjc.data/repository/files/'+urllib.parse.quote(file,safe='')+'/raw?ref='+pin
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'YandaoGuoxue-PinnedOriginalText/1.0'}),timeout=45) as response:raw=response.read()
    chapters,header=parse_source(raw,source)
    public='https://jicheng.tw/tcm/book/'+urllib.parse.quote(source['title'])+'/index.html'
    revision='https://gitlab.com/jicheng/jc.data/-/blob/'+pin+'/'+urllib.parse.quote(file,safe='/')
    quality=re.search(r'<dt>品質</dt><dd>(.*?)</dd>',header)
    image_count=source['imagePositions']
    scope=source.get('scope','本来源版本全部篇卷录文，不含本站AI扩写。')
    return {'id':source['id'],'name':source['name'],'author':source['author'],'dynasty':source['dynasty'],'pinyin':source['pinyin'],
      'description':scope+(f'原书{image_count}处插图位置保留标记，图像未收录。' if image_count else ''),
      'sourceName':'中医笈成（固定Git原典录文）','sourceUrl':public,'sourceRevisionUrl':revision,'sourcePages':[{'url':public,'revisionUrl':revision}],
      'sourceRevision':pin,'sourceRawSha256':sha(raw),'sourceQualityLabel':quality.group(1) if quality else '未提供',
      'sourceScope':scope,'unresolvedIllustrationCount':image_count,
      'excludedParatext':source.get('excludedParatext',[]),
      'license':'所列古代或已进入公有领域的原作正文；中医笈成对公有领域文本的编辑以CC0释出：https://jicheng.tw/tcm/copyright.html 。本包不复制未核权的插图、倪海厦讲义或现代编者序跋。',
      'verification':'逐项核对固定源SHA、篇卷顺序、所有可见原文字符及末尾；插图只保留位置标记，不把录文版宣称为完整图本。'+scope+' 来源自标品质不等于本应用医学准确率，尚未逐字校对影印本或完成医学校勘。古代剂量、方药与针灸记载仅供文献研究，不供自行诊疗或操作。',
      'contentSha256':sha('\n'.join(c['content'] for c in chapters)),'chapters':chapters}

def verify(books,manifest):
    assert len(books)==len(manifest['books'])
    for book,source in zip(books,manifest['books']):
        assert book['id']==source['id'] and book['sourceRevision']==manifest['pin'] and book['sourceRawSha256']==source['rawSha256']
        assert len(book['chapters'])==source['chapterCount']
        assert len(set(c['id'] for c in book['chapters']))==len(book['chapters'])
        content='\n'.join(c['content'] for c in book['chapters'])
        assert sha(content)==book['contentSha256'] and len(content)>=source['minimumCharacters'] and content.endswith(source['terminalText'])
        assert len(FIGURE.findall(content))==source['imagePositions']
    return {'books':len(books),'chapters':sum(len(b['chapters']) for b in books),'characters':sum(sum(len(c['content']) for c in b['chapters']) for b in books),'unresolvedImagePositions':sum(b['unresolvedIllustrationCount'] for b in books),'medicalProofread':False}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--fetch',action='store_true');p.add_argument('--write',action='store_true');a=p.parse_args()
    if a.write and not a.fetch:p.error('--write requires --fetch')
    manifest=json.loads(MANIFEST.read_bytes())
    if a.fetch:
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:books=list(pool.map(lambda source:fetch_book(source,manifest['pin']),manifest['books']))
    else:books=json.loads(TARGET.read_bytes())
    result=verify(books,manifest)
    if a.write:TARGET.write_bytes((json.dumps(books,ensure_ascii=False,indent=2)+'\n').encode())
    print(json.dumps(result,ensure_ascii=False))
if __name__=='__main__':main()
