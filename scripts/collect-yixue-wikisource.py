"""Discover source revisions and retrieve rendered classical text for review."""
import argparse,concurrent.futures,hashlib,json,re,time,urllib.request,urllib.parse
from html.parser import HTMLParser
from pathlib import Path
AGENT='YandaoGuoxueLearningSourceReview/1.0';API='https://zh.wikisource.org/w/api.php?'
TITLES=['三命通會','十八飛星策天紫微斗數','卜筮正宗','周公解夢','周易本義','增刪卜易','大六壬大全','大六壬心鏡','六壬指南','六壬斷案','太乙數統宗大全','太乙統宗寶鑑','太乙金鏡式經','奇門遁甲統宗','小六壬掌訣','御定奇門寶鑑','斷易天機','梅花易數','沈氏玄空學','淵海子平','滴天髓','火珠林','煙波釣叟歌','焦氏易林','玄空紫白訣','玉匣記','窮通寶鑑','紫微斗數全書','紫微斗數骨髓賦','欽定協紀辨方書','馬前課','果老星宗','星學大成','皇極經世','壬歸','紫白訣']
def api(args):
 req=urllib.request.Request(API+urllib.parse.urlencode({**args,'format':'json'}),headers={'User-Agent':AGENT})
 with urllib.request.urlopen(req,timeout=45)as response:return json.loads(response.read(30_000_001))
class Text(HTMLParser):
 def __init__(self):super().__init__();self.skip=[];self.parts=[];self.links=[];self.images=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs);blocked=tag in ['script','style']or any(x in a.get('class','').split()for x in ['noprint','navbox','mw-editsection','toc','licenseContainer','wst-header','ws-noexport','metadata'])or a.get('id')=='toc'
  if tag in ['br','hr','img','input','meta','link']:
   if any(self.skip):return
   if tag=='br':self.parts.append('\n')
   if tag=='img':
    self.images.append(a)
    alt=a.get('alt','');
    if 0<len(alt)<=8 and not re.search('logo|icon|PD|Wik',alt,re.I):self.parts.append(alt)
   return
  self.skip.append(blocked)
  if not any(self.skip):
   if tag in ['p','div','h1','h2','h3','h4','h5','li','tr']:self.parts.append('\n\n')
   if tag in ['td','th']:self.parts.append('\t')
   if tag=='a'and a.get('href'):self.links.append(a['href'])
 def handle_endtag(self,tag):
  if tag in ['br','hr','img','input','meta','link']:return
  if self.skip:self.skip.pop()
  if not any(self.skip)and tag in ['p','div','h1','h2','h3','h4','li','tr']:self.parts.append('\n\n')
 def handle_data(self,data):
  if not any(self.skip):self.parts.append(data)
 def text(self):return re.sub(r'\n\s*\n(?:\s*\n)+','\n\n',''.join(self.parts)).strip()
def run(root):
 root.mkdir(parents=True,exist_ok=True);queries=[]
 for name in TITLES:queries.extend([name,name+'/全覽',name+' (四庫全書本)',name+' (四庫全書本)/全覽'])
 pages={};redirects={}
 for start in range(0,len(queries),40):
  response=api({'action':'query','titles':'|'.join(queries[start:start+40]),'prop':'info|revisions','rvprop':'ids','redirects':1});q=response.get('query',{});redirects.update({r['from']:r['to']for r in q.get('redirects',[])});pages.update({p['title']:p for p in q.get('pages',{}).values()if 'missing'not in p});time.sleep(.3)
 (root/'discovered-page-revisions.json').write_text(json.dumps({'pages':pages,'redirects':redirects},ensure_ascii=False,indent=2),encoding='utf-8')
 def collect(name):
  candidates=[name+' (四庫全書本)/全覽',name+'/全覽',name+' (四庫全書本)',name];chosen=next((pages.get(redirects.get(c,c))for c in candidates if pages.get(redirects.get(c,c))),None)
  if not chosen:return {'requestedTitle':name,'status':'NO_EXACT_SOURCE_FOUND'}
  title=chosen['title'];revision=chosen['lastrevid'];slug='wiki-'+hashlib.sha256(title.encode()).hexdigest()[:12];raw_path=root/(slug+'.json')
  try:
   if raw_path.exists():raw=raw_path.read_bytes();parsed=json.loads(raw)
   else:parsed=api({'action':'parse','oldid':revision,'prop':'text|sections|links','disableeditsection':1});raw=json.dumps(parsed,ensure_ascii=False).encode();raw_path.write_bytes(raw)
   data=parsed['parse'];parser=Text();parser.feed(data['text']['*']);text=parser.text();(root/(slug+'.txt')).write_text(text,encoding='utf-8')
   chapters=[l for l in data.get('links',[])if l.get('ns')==0 and (l.get('*','').startswith(title.split('/')[0]+'/'))]
   return {'id':slug,'requestedTitle':name,'sourceTitle':title,'revision':revision,'sourceUrl':'https://zh.wikisource.org/w/index.php?oldid='+str(revision),'rawFile':str(raw_path),'textFile':str(root/(slug+'.txt')),'sourceSha256':hashlib.sha256(raw).hexdigest(),'characters':len(text),'sections':data.get('sections',[]),'images':parser.images,'childPages':chapters,'status':'RENDERED_SOURCE_NEEDS_REVIEW'if len(text)>1500 else 'SHORT_OR_INDEX_SOURCE'}
  except Exception as e:return {'requestedTitle':name,'sourceTitle':title,'revision':revision,'status':'NOT_RETRIEVED','errorType':type(e).__name__}
 with concurrent.futures.ThreadPoolExecutor(max_workers=2)as ex:rows=list(ex.map(collect,TITLES))
 (root/'source-catalogue.json').write_text(json.dumps({'books':rows,'published':False},ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps([{k:r.get(k)for k in ['requestedTitle','sourceTitle','characters','status']}for r in rows],ensure_ascii=False))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);run(p.parse_args().output)
