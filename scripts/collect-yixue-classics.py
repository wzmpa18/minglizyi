"""Collect exact tool-cited ancient editions; modern course titles remain separate."""
import argparse,concurrent.futures,hashlib,html,json,re,sys,urllib.parse,urllib.request
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import importlib.util
spec=importlib.util.spec_from_file_location('materia_source_parser',Path(__file__).with_name('collect-classic-materia.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);MateriaParser=module.MateriaParser
COMMIT='fce547b73db49408b34a4144d12e09f09eebafd3'
TITLES=['三命通會','十八飛星策天紫微斗數','卜筮正宗','周公解夢','周易','周易本義','增刪卜易','大六壬大全','大六壬心鏡','六壬指南','六壬斷案','太乙數統宗大全','太乙統宗寶鑑','太乙金鏡式經','奇門遁甲統宗','小六壬掌訣','御定奇門寶鑑','斷易天機','梅花易數','沈氏玄空學','淵海子平','滴天髓','火珠林','煙波釣叟歌','焦氏易林','玄空紫白訣','玉匣記','窮通寶鑑','紫微斗數全書','紫微斗數骨髓賦','欽定協紀辨方書','馬前課']
def run(root):
 root.mkdir(parents=True,exist_ok=True)
 def one(title):
  slug='yixue-'+hashlib.sha256(title.encode()).hexdigest()[:12];file=root/(slug+'.html');url='https://gitlab.com/jicheng/jc.data/-/raw/'+COMMIT+'/pages/book/'+urllib.parse.quote(title)+'/index.html'
  try:
   if file.exists():raw=file.read_bytes()
   else:
    with urllib.request.urlopen(url,timeout=35) as response:raw=response.read(30_000_001)
    if len(raw)>30_000_000:raise ValueError('Source too large')
    file.write_bytes(raw)
   p=MateriaParser();p.feed(raw.decode('utf-8-sig'));header=''.join(p.meta);body='\n'.join(t['text']for t in p.tokens)
   author=re.search(r'作者\s*([^\n]+)',header);dynasty=re.search(r'朝代\s*([^\n]+)',header)
   return {'id':slug,'title':title,'author':author[1].strip()if author else None,'dynasty':dynasty[1].strip()if dynasty else None,'sourceHeader':header,'rawFile':str(file),'sha256':hashlib.sha256(raw).hexdigest(),'characters':len(body),'paragraphs':len(p.records),'headings':sum(t['kind'].startswith('h')for t in p.tokens),'sourceUrl':url.replace('/-/raw/','/-/blob/'),'status':'FETCHED_FOR_SOURCE_REVIEW' if len(body)>1000 else 'SHORT_SOURCE_NEEDS_REVIEW'}
  except Exception as e:return {'id':slug,'title':title,'sourceUrl':url,'status':'NOT_RETRIEVED','errorType':type(e).__name__}
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:rows=list(ex.map(one,TITLES))
 (root/'source-catalogue.json').write_text(json.dumps({'commit':COMMIT,'books':rows,'modernOrEditorialTitles':['天纪','奇门预测术讲义','干支命理讲义','子平必背','紫微斗数笔记','奇门遁甲知识库','紫微斗数知识库'],'published':False},ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps([{k:r.get(k)for k in ['title','author','dynasty','characters','status']}for r in rows],ensure_ascii=False))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);run(p.parse_args().output)
