"""Resume cached public-source research serially; stop on access/rate rejection."""
import argparse,hashlib,importlib.util,json,time,urllib.error
from pathlib import Path
def run(root:Path):
 spec=importlib.util.spec_from_file_location('source_collector',Path(__file__).with_name('collect-yixue-wikisource.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
 file=root/'source-catalogue.json';catalogue=json.loads(file.read_text(encoding='utf-8'));discovery=json.loads((root/'discovered-page-revisions.json').read_text(encoding='utf-8'));pages=discovery['pages'];redirects=discovery['redirects']
 for row in catalogue['books']:
  if row['status']!='NOT_RETRIEVED':continue
  name=row['requestedTitle'];variants=[name+' (四庫全書本)/全覽',name+'/全覽',name+' (四庫全書本)',name];chosen=next((pages.get(redirects.get(v,v))for v in variants if pages.get(redirects.get(v,v))),None)
  if not chosen:continue
  title=chosen['title'];revision=chosen['lastrevid'];slug='wiki-'+hashlib.sha256(title.encode()).hexdigest()[:12];raw_path=root/(slug+'.json')
  try:
   if raw_path.exists():raw=raw_path.read_bytes();parsed=json.loads(raw)
   else:parsed=module.api({'action':'parse','oldid':revision,'prop':'text|sections|links','disableeditsection':1});raw=json.dumps(parsed,ensure_ascii=False).encode();raw_path.write_bytes(raw)
   data=parsed['parse'];parser=module.Text();parser.feed(data['text']['*']);text=parser.text();text_path=root/(slug+'.txt');text_path.write_text(text,encoding='utf-8');children=[link for link in data.get('links',[])if link.get('ns')==0 and link.get('*','').startswith(title.split('/')[0]+'/')]
   row.update({'id':slug,'sourceTitle':title,'revision':revision,'sourceUrl':'https://zh.wikisource.org/w/index.php?oldid='+str(revision),'rawFile':str(raw_path),'textFile':str(text_path),'sourceSha256':hashlib.sha256(raw).hexdigest(),'characters':len(text),'sections':data.get('sections',[]),'images':parser.images,'childPages':children,'status':'RENDERED_SOURCE_NEEDS_REVIEW'if len(text)>1500 else'SHORT_OR_INDEX_SOURCE'});row.pop('errorType',None)
   print(json.dumps({'title':title,'characters':len(text),'status':row['status']},ensure_ascii=False),flush=True)
  except urllib.error.HTTPError as error:
   row.update({'status':'NOT_RETRIEVED','errorType':'HTTPError','httpStatus':error.code});print(json.dumps({'title':title,'httpStatus':error.code,'stopped':error.code in[401,403,429]},ensure_ascii=False),flush=True)
   if error.code in[401,403,429]:file.write_text(json.dumps(catalogue,ensure_ascii=False,indent=2),encoding='utf-8');break
  file.write_text(json.dumps(catalogue,ensure_ascii=False,indent=2),encoding='utf-8');time.sleep(2)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--directory',type=Path,required=True);run(p.parse_args().directory)
