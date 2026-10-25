"""Build data-only originals from already pinned, complete source-volume receipts."""
import argparse,hashlib,json
from pathlib import Path
def build(root:Path,output:Path,version:str):
 rows=json.loads((root/'已收齐卷册与底本核对.json').read_text(encoding='utf-8'));books=[]
 for row in rows:
  assert row['status']=='COMPLETE_SOURCE_FILES_RETRIEVED' and row['allListedVolumesPresent']
  archive=root/row['repository']/'原始仓库卷册.zip'
  assert hashlib.sha256(archive.read_bytes()).hexdigest()==row['archiveSha256']
  book=json.loads(Path(row['bookFile']).read_text(encoding='utf-8'))
  assert len(book['content'])==row['characters'] and book['sectionCount']==row['retrievedVolumes']
  if book['title']=='宅經':book['author']='旧题黄帝（实际成书与作者待考）'
  if row['repository']=='KR1a0007':book['author']='魏·王弼、晋·韩康伯注；唐·陆德明音义、孔颖达疏（附王弼略例及后世考证）'
  books.append(book)
 pack={'schema':'yandao.guoxue.classics.v1','version':version,'notice':'古籍原文用于传统文化学习。各书注明底本与数字转写出处；卷册文件收齐不代表逐字校勘，古代术数观点不作为现实预测或决策依据。','books':books}
 raw=json.dumps(pack,ensure_ascii=False,separators=(',',':')).encode();output.parent.mkdir(parents=True,exist_ok=True);output.write_bytes(raw)
 receipt={'file':str(output),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'books':len(books),'sourceVolumes':sum(b['sectionCount']for b in books),'characters':sum(len(b['content'])for b in books),'titles':[b['title']for b in books]}
 output.with_suffix('.receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(receipt,ensure_ascii=False))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--version',default='1.0.0');a=p.parse_args();build(a.source,a.output,a.version)
