"""Refresh four attributed, bounded planet maps; all source TIFF bytes stay in RAM.

Requires Pillow only when maintainers intentionally refresh the checked-in data.
Web/runtime builds do not download imagery or require Pillow.
"""
import concurrent.futures,datetime,hashlib,io,json,pathlib,urllib.request
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/astronomy/surfaces'
SOURCES=[
 ('moon','月球','https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_8k.tif','https://svs.gsfc.nasa.gov/4720/',"NASA Scientific Visualization Studio / Ernie Wright; LRO LROC/LOLA teams",'Public domain per NASA SVS, retain credits','https://svs.gsfc.nasa.gov/help/','LRO拼接影像的可视化贴图；极区含较低分辨率填补，科学测量请使用LROC/LOLA源数据。'),
 ('earth','地球','https://www.solarsystemscope.com/textures/download/8k_earth_daymap.jpg','https://www.solarsystemscope.com/textures/','Solar System Scope / INOVE; based on NASA imagery','CC BY 4.0','https://creativecommons.org/licenses/by/4.0/','季节、色彩经艺术调整的全球贴图，不是实时卫星影像。'),
 ('mars','火星','https://www.solarsystemscope.com/textures/download/8k_mars.jpg','https://www.solarsystemscope.com/textures/','Solar System Scope / INOVE; based on NASA imagery','CC BY 4.0','https://creativecommons.org/licenses/by/4.0/','艺术增强的行星贴图；来源说明部分缺测区有补绘，不能据此进行地形测量。'),
 ('jupiter','木星','https://www.solarsystemscope.com/textures/download/8k_jupiter.jpg','https://www.solarsystemscope.com/textures/','Solar System Scope / INOVE; based on NASA imagery','CC BY 4.0','https://creativecommons.org/licenses/by/4.0/','艺术增强的云层拼接示意，不代表此刻的大红斑位置或真实云层变化。'),
]
def fetch(item):
 key,name,url,source,credit,license,license_url,note=item
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'YandaoLearningAssetImporter/1.0'}),timeout=90) as response:
  data=response.read(85_000_001)
  assert len(data)<=85_000_000
 image=Image.open(io.BytesIO(data));image.load();assert image.size in [(4096,2048),(8192,4096)], key+': unexpected dimensions '+str(image.size)
 image=image.convert('RGB');outputs=[]
 source_dimensions=list(image.size)
 for width in [w for w in [2048,4096,8192] if w<=image.width]:
  resized=image if width==image.width else image.resize((width,width//2),Image.Resampling.LANCZOS)
  buffer=io.BytesIO();resized.save(buffer,'JPEG',quality=90,optimize=True);body=buffer.getvalue()
  target=OUT/f'{key}-{width}.jpg';target.write_bytes(body)
  outputs.append({'width':width,'height':width//2,'url':'/assets/astronomy/surfaces/'+target.name,'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest()})
 return {'id':key,'name':name,'sourceUrl':source,'downloadUrl':url,'sourceSha256':hashlib.sha256(data).hexdigest(),'sourceDimensions':source_dimensions,'credit':credit,'license':license,'licenseUrl':license_url,'note':note,'processing':'JPEG quality 90; smaller variants downsampled from actual source dimensions; no upscaling, AI enhancement or invented terrain added by Yandao','maps':outputs}
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 # Do not replace a reviewed collection without deliberate maintainer action.
 assert not (OUT/'manifest.json').exists(),'Reviewed manifest exists; audit upstream changes before replacing assets'
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:rows=list(pool.map(fetch,SOURCES))
 result={'version':'surface-study-20261021-v1','importedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'use':'Attributed visualization and image reading, not scientific measurement or live telescope imagery','bodies':rows}
 (OUT/'manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n','utf-8')
 print(json.dumps({'bodies':len(rows),'files':sum(len(r['maps']) for r in rows),'bytes':sum(x['bytes'] for r in rows for x in r['maps'])}))
if __name__=='__main__':main()
