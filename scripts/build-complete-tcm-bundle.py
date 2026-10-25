"""Build one data-only TCM archive from verified current local resources."""
import argparse,hashlib,json,mimetypes,zipfile
from pathlib import Path

def build(a):
 root=Path(__file__).resolve().parents[1];a.output.parent.mkdir(parents=True,exist_ok=True);proof=json.loads(a.local_receipt.read_text(encoding='utf-8-sig'));current={r['id']:r for r in proof['resources']};files={};members=[]
 def add(name,raw,mime,member=None,version=None):
  if name in files:raise ValueError('Duplicate asset')
  record={'path':name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'mime':mime};files[name]=(raw,record)
  if member:members.append({'packId':member,'version':version,'sha256':record['sha256'],'bytes':len(raw),'entryPath':name})
 for identifier in ['medical-study-library','tcm-materia-originals','tcm-original-editions-approved']:
  row=current[identifier];raw=Path(row['file']).read_bytes();assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256'];add('data/'+identifier+'.json',raw,'application/json',identifier,row['version'])
 raw=a.acupoints.read_bytes();point=json.loads(raw);assert len(point['acupoints'])==361;add('data/tcm-acupoints.json',raw,'application/json','tcm-acupoints',point['version'])
 for identifier in ['tcm-herbs','tcm-formulas']:
  raw=(a.structured/(identifier+'.json')).read_bytes();data=json.loads(raw);add('data/'+identifier+'.json',raw,'application/json',identifier,data['version'])
 media=json.loads(a.media_manifest.read_text(encoding='utf-8'));assert len(media['records'])==299
 raw=json.dumps(media,ensure_ascii=False,separators=(',',':')).encode();add('data/tcm-study-media.json',raw,'application/json','tcm-study-media','1.0.0')
 references={'schema':'yandao.tcm.reference-data.v1','version':'1.0.0','shanghan':json.loads((root/'public/data/tcm/shanghan_texts.json').read_text(encoding='utf-8-sig')),'basicExam':json.loads((root/'public/data/tcm/exam_questions.json').read_text(encoding='utf-8-sig'))};raw=json.dumps(references,ensure_ascii=False,separators=(',',':')).encode();add('data/tcm-reference-data.json',raw,'application/json','tcm-reference-data','1.0.0')
 credits={'schema':'yandao.study-source-credits.v1','originalPhotoNotice':(root/'public/assets/acupoint-photos/NOTICE.txt').read_text(encoding='utf-8-sig'),'courseNotesLicense':(root/'public/legal/medical-study-notes-license.txt').read_text(encoding='utf-8-sig'),'originalPhotos':json.loads((root/'public/assets/acupoint-photos/MANIFEST.json').read_text(encoding='utf-8')),'originalAnimations':json.loads((root/'public/assets/meridians/ANIMATION-MANIFEST.json').read_text(encoding='utf-8'))};add('data/source-credits.json',json.dumps(credits,ensure_ascii=False,separators=(',',':')).encode(),'application/json')
 for record in media['records']:
  path=record['path'];source=a.media_directory/Path(path).name if '/dong-wm-'in path or '/atlas-lan-'in path else root/'public'/path.lstrip('/');raw=source.read_bytes();assert len(raw)==record['bytes']and hashlib.sha256(raw).hexdigest()==record['sha256'];add(path.lstrip('/'),raw,record['mime'])
 manifest={'schema':'yandao.learning-bundle.v1','packId':'tcm-learning-complete','version':'1.0.0','name':'中医学习资料包','accessLevel':'PUBLIC','files':[files[k][1]for k in sorted(files)],'members':members,'sourceSummary':{'herbs':550,'formulas':316,'standardPoints':361,'dongOriginalEntriesIncludingGroups':267,'books':46,'images':299},'optionalMemberResources':['tcm-anatomy-3d-v2','tcm-anatomy-atlas-v3','academy-zhongyi'],'notice':'正文与图谱供全部账号下载，三维及原有会员课程按现有权益；原典、讲课整理、编辑摘要与原页分别标明。'}
 with zipfile.ZipFile(a.output,'w',allowZip64=False)as archive:
  for name,raw,mime in [('manifest.json',json.dumps(manifest,ensure_ascii=False,separators=(',',':')).encode(),'application/json')]+[(k,files[k][0],files[k][1]['mime'])for k in sorted(files)]:
   info=zipfile.ZipInfo(name,(2026,10,26,0,0,0));info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED if mime=='application/json'else zipfile.ZIP_STORED;archive.writestr(info,raw,compresslevel=6)
 with zipfile.ZipFile(a.output)as archive:
  assert len(archive.namelist())==len(files)+1 and archive.testzip()is None
  for name,(raw,row)in files.items():
   body=archive.read(name);assert len(body)==row['bytes']and hashlib.sha256(body).hexdigest()==row['sha256']
 result={'packId':manifest['packId'],'version':manifest['version'],'bytes':a.output.stat().st_size,'sha256':hashlib.sha256(a.output.read_bytes()).hexdigest(),'files':len(files),'members':members,'sourceSummary':manifest['sourceSummary'],'allInnerFilesFullyReadBack':True,'containsMemberModels':False,'uncompressedBytes':sum(r['bytes']for r in manifest['files'])};a.audit.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:v for k,v in result.items()if k!='members'},ensure_ascii=False))
if __name__=='__main__':
 p=argparse.ArgumentParser()
 for name in ['local-receipt','acupoints','structured','media-manifest','media-directory','output','audit']:p.add_argument('--'+name,type=Path,required=True)
 build(p.parse_args())
