"""Preserve full, commit-pinned Kanripo editions and verify every listed volume."""
import argparse,concurrent.futures,hashlib,io,json,re,subprocess,urllib.request,zipfile
from pathlib import Path

def collect(root):
 rows=json.loads((root/'拟收录有底本术数书目.json').read_text(encoding='utf-8'));result=[]
 def one(row):
  repo=row['repository'];folder=root/repo;folder.mkdir(exist_ok=True);saved=folder/'edition-proof.json'
  try:
   if saved.exists():return json.loads(saved.read_text(encoding='utf-8'))
   revision=subprocess.check_output(['gh','api','repos/kanripo/'+repo+'/commits/master','--jq','.sha'],text=True).strip();assert re.fullmatch('[a-f0-9]{40}',revision)
   url='https://codeload.github.com/kanripo/'+repo+'/zip/'+revision
   with urllib.request.urlopen(url,timeout=45)as response:raw=response.read(40_000_001)
   assert len(raw)<=40_000_000;(folder/'原始仓库卷册.zip').write_bytes(raw)
   with zipfile.ZipFile(io.BytesIO(raw))as archive:
    all_names=archive.namelist();readme=next(n for n in all_names if n.endswith('/Readme.org'));toc=archive.read(readme).decode('utf-8-sig');expected=set(re.findall(r'\[\[file:('+repo+r'_\d+\.txt)',toc));text_names=[n for n in all_names if re.search('/'+repo+r'_\d+\.txt$',n)];actual={Path(n).name for n in text_names};assert expected and expected<=actual
    captions={name:caption for name,caption in re.findall(r'\[\[file:('+repo+r'_\d+\.txt)(?:::[^\]]*)?\]\[([^\]]+)\]\]',toc)};chapters=[]
    for n in sorted(text_names):
     source=archive.read(n);text=source.decode('utf-8-sig');pages=re.findall(r'<pb:([^>]+)>',text);body=re.sub(r'^#\+[^\n]*\n?','',text,flags=re.M);body=re.sub(r'<pb:[^>]+>','',body);body=re.sub(r'^\*+\s+','',body,flags=re.M).strip();assert len(body)>10
     chapters.append({'id':Path(n).stem,'title':captions.get(Path(n).name,Path(n).stem),'content':body,'sourceFile':Path(n).name,'sourceSha256':hashlib.sha256(source).hexdigest(),'sourcePages':pages,'sourceUrl':'https://github.com/kanripo/'+repo+'/blob/'+revision+'/'+Path(n).name})
   book={'id':'kanripo-'+repo.lower(),'title':row['title'],'category':'易学原典','author':(row['dynasty']+'·'if row['dynasty']else'')+('原书未署名'if row['author']=='闕名'else row['author']),'content':'\n\n'.join(c['title']+'\n\n'+c['content']for c in chapters),'sourceName':'汉籍库·文渊阁四库全书本','sourceUrl':'https://github.com/kanripo/'+repo+'/tree/'+revision,'sourcePages':[c['sourceUrl']for c in chapters],'license':'古代著作原文录文；数字转写出处与所据底本见原页，未加入现代译解。','completeness':'full','sectionCount':len(chapters),'verifiedAt':'2026-10-26','sourceRevision':revision,'sourceSha256':hashlib.sha256(raw).hexdigest(),'verification':'所据仓库目录列出的卷文件全部收齐并核SHA；非逐字专业校勘。'}
   record={**row,'revision':revision,'archiveSha256':hashlib.sha256(raw).hexdigest(),'archiveBytes':len(raw),'listedVolumes':len(expected),'retrievedVolumes':len(chapters),'allListedVolumesPresent':True,'characters':len(book['content']),'bookFile':str(folder/'book.json'),'chaptersFile':str(folder/'chapters-with-page-provenance.json'),'status':'COMPLETE_SOURCE_FILES_RETRIEVED'}
   (folder/'book.json').write_text(json.dumps(book,ensure_ascii=False,separators=(',',':')),encoding='utf-8');(folder/'chapters-with-page-provenance.json').write_text(json.dumps(chapters,ensure_ascii=False,indent=2),encoding='utf-8');saved.write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8');return record
  except Exception as e:return {**row,'status':'SOURCE_REVIEW_INCOMPLETE','errorType':type(e).__name__}
 with concurrent.futures.ThreadPoolExecutor(max_workers=4)as ex:result=list(ex.map(one,rows))
 (root/'已收齐卷册与底本核对.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps([{k:r.get(k)for k in ['title','repository','retrievedVolumes','characters','status','errorType']}for r in result],ensure_ascii=False))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--directory',type=Path,required=True);collect(p.parse_args().directory)
