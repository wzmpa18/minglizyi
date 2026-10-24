"""Import fourteen unchanged, individually licensed Wellcome historical charts.

These are historical source images, never a claim of modern clinical precision.
The Wikimedia image metadata, original dimensions and checksums are retained.
"""
from pathlib import Path
import hashlib, html, json, re, urllib.parse, urllib.request

ROWS = [
 ('lung','肺经','Acupuncture chart, lung channel of hand taiyin, Chinese Wellcome L0037830.jpg'),
 ('large-intestine','大肠经','Acupuncture chart, large intestine channel of hand yangmin Wellcome L0037831.jpg'),
 ('stomach','胃经','Acupuncture chart, stomach channel of foot yangming Wellcome L0037812.jpg'),
 ('spleen','脾经','Acupuncture chart, spleen channel of foot taiyin, Chinese Wellcome L0037833.jpg'),
 ('heart','心经','Acupuncture chart, heart channel of hand shaoyin, Chinese Wellcome L0037816.jpg'),
 ('small-intestine','小肠经','Acupuncture chart, small intestine channel of hand taiyang Wellcome L0037818.jpg'),
 ('bladder','膀胱经','Acupuncture chart, bladder channel of foot taiyang, Chinese Wellcome L0037820.jpg'),
 ('kidney','肾经','Acupuncture chart, kidney channel of foot shaoyin, Chinese Wellcome L0037822.jpg'),
 ('pericardium','心包经','Acu-moxa chart; Heart Envelope channel of hand jueyin Wellcome L0037931.jpg'),
 ('triple-energizer','三焦经','Acupuncture chart, sanjiao channel of hand shaoyang, Chinese Wellcome L0037823.jpg'),
 ('gallbladder','胆经','Acupuncture chart, gall bladder channel of foot shaoyang Wellcome L0037825.jpg'),
 ('liver','肝经','Acupuncture chart, liver channel of foot jueyin, Chinese Wellcome L0037826.jpg'),
 ('governor-vessel','督脉','Acupuncture chart, dumai (Governor Vessel), Chinese Wellcome L0037827.jpg'),
 ('conception-vessel','任脉','Acupuncture chart, renmai (the Director Vessel) Wellcome L0037828.jpg'),
]
HEADERS={'User-Agent':'YandaoGuoxue/1.0 (educational image attribution audit; https://yandao.vip)'}
def fetch(url):
 return urllib.request.urlopen(urllib.request.Request(url,headers=HEADERS),timeout=45).read()
def text(value):
 return html.unescape(re.sub('<[^>]+>',' ',value or '')).strip()
def main():
 root=Path('public/assets/meridians/historical');root.mkdir(parents=True,exist_ok=True)
 result=[]
 source_titles={}
 for category in ['Acupuncture charts','Acu-moxa charts in the Wellcome Collection']:
  query=urllib.parse.urlencode({'action':'query','list':'categorymembers','cmtitle':'Category:'+category,'cmlimit':500,'cmtype':'file','format':'json'})
  for member in json.loads(fetch('https://commons.wikimedia.org/w/api.php?'+query))['query']['categorymembers']:
   serial=re.search(r'L[0-9]{7}',member['title'])
   if serial:source_titles[serial.group()]=member['title'].removeprefix('File:')
 for slug,name,title in ROWS:
  serial=re.search(r'L[0-9]{7}',title).group();title=source_titles.get(serial,title)
  query=urllib.parse.urlencode({'action':'query','titles':'File:'+title,'prop':'imageinfo','iiprop':'url|size|sha1|extmetadata','format':'json'})
  page=next(iter(json.loads(fetch('https://commons.wikimedia.org/w/api.php?'+query))['query']['pages'].values()))
  if 'imageinfo' not in page:raise RuntimeError('Missing source image: '+title)
  info=page['imageinfo'][0];meta=info['extmetadata'];license=text(meta.get('LicenseShortName',{}).get('value'))
  if license!='CC BY 4.0':raise RuntimeError('Unreviewed license: '+title+' '+license)
  asset=root/(slug+'.jpg');raw=asset.read_bytes() if asset.exists() else fetch(info['url'])
  if len(raw)!=info['size'] or hashlib.sha1(raw).hexdigest()!=info['sha1']:raise RuntimeError('Source checksum mismatch: '+title)
  if not asset.exists():asset.write_bytes(raw)
  result.append({'slug':slug,'meridian':name,'title':name+'循行与穴位原典图','originalTitle':title,'asset':'/'+asset.relative_to('public').as_posix(),'width':info['width'],'height':info['height'],'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'source':info['descriptionurl'],'author':'Wellcome Collection / Wellcome Library, London','license':license,'licenseUrl':meta.get('LicenseUrl',{}).get('value','https://creativecommons.org/licenses/by/4.0/'),'description':text(meta.get('ImageDescription',{}).get('value'))[:8000],'credit':text(meta.get('Credit',{}).get('value'))[:3000],'changes':'原图原样收录，无裁切、重绘或穴位坐标补造。','historicalReference':True,'clinicalPositionReviewed':False})
  print(slug,info['width'],info['height'],len(raw))
 Path('src/data/meridianHistoricalCharts.json').write_bytes((json.dumps({'version':'2026-10-24','notice':'十四经高清历史原图，与现有逐穴文字、原典、3D工程示意分别对照；历史图不替代现代标准定位。','images':result},ensure_ascii=False,indent=2)+'\n').encode())
 Path('public/licenses/meridian-historical').mkdir(exist_ok=True)
 Path('public/licenses/meridian-historical/ATTRIBUTION.json').write_bytes((json.dumps({'license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','images':result},ensure_ascii=False,indent=2)+'\n').encode())
if __name__=='__main__':main()
