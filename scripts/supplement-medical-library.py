"""Append reviewed source summaries, explicitly separate from original quotations."""
import argparse,hashlib,json,re
from pathlib import Path
POLYU={
'h387':('番泻叶','番泻叶条目把药用部分限定为小叶，讨论积滞便秘和水肿等传统应用；另列腹痛、恶心及滥用后的不良反应，不能据“通便”而长期自行使用。'),
'h424':('仙鹤草','该库以龙芽草地上部分作为仙鹤草，按收敛止血类介绍。除传统出血、痢疾等记载，还提示与降糖药同用的相互作用，并列皮疹等报告。'),
'h440':('苦杏仁','条目专指杏类成熟种子中的苦杏仁药材，分别介绍咳喘与肠燥便秘的传统用途，并明确有毒性风险；不把食品甜杏仁或其他种子资料直接移入本条。'),
'h472':('墨旱莲','该库所指为鳢肠的地上部分，按补阴类介绍，涉及肝肾不足及血热出血的传统应用。网页缺少不良反应资料，不能把“暂无资料”理解为没有风险。'),
'h484':('川木通','该条来源为毛茛科小木通或绣球藤的藤茎，涉及利尿及经闭乳少等传统记载。基原与马兜铃科关木通不同，不能因名称含“木通”而合并资料。'),
'h490':('垂盆草','该库用垂盆草全草立条，讨论湿热黄疸、排尿不畅及疮疡等传统应用。网页未提供不良反应资料，保留该资料空缺，不据此推定可自行治疗肝病。'),
'h509':('罗布麻叶','药用部位是罗布麻的叶，网页讨论眩晕、心悸失眠与浮肿等传统应用。这里保留叶部资料，不把同株的根、茎研究直接套入，也不提供替代降压治疗的建议。'),
'h537':('海风藤','条目所指为胡椒科风藤的藤茎，按祛风湿类介绍，涉及风寒湿痹、肢节拘挛等传统语境。它与防己科青风藤分属不同基原，分别保留。'),
'h549':('明党参','该库以伞形科明党参的根立条，讨论肺热咳嗽、胃气不和等传统用途。名称虽有“党参”，仍按本品来源单独对照，不移用党参的全部功效和配伍。')}
HUNAN={
'h488':('玉米须',460,'取玉米花柱柱头，规范记有利尿及黄疸相关用途。'),
'h491':('地耳草',668,'以全草立条，另名田基黄，涉及湿热黄疸与疮肿。'),
'h514':('沙棘',583,'以果实立条，涉及痰咳、食积与瘀滞；非叶部资料。'),
'h521':('糯稻根',187,'取根和茎基，涉及虚热、汗出与津少的传统用途。'),
'h526':('土荆皮',845,'取金钱松根皮或近根树皮，有毒；规范仅列外用。'),
'h536':('穿山龙',67,'取穿龙薯蓣根茎，涉及湿痹及痰咳相关用途。'),
'h538':('青风藤',336,'以青藤类藤茎立条，涉及湿痹与利尿；与海风藤分开。')}
OTHER={
'h512':('绞股蓝','香港卫生署中医药规管办公室','趣味中药——绞股蓝','绞股蓝-readable.txt','https://www.cmro.gov.hk/html/gb/useful_information/public_health/publication/Interesting_Chinese_Herbs.html','卫生署网页区分绞股蓝的补虚与清热语境，也讨论与黄芪、北沙参或天冬、麦冬等同用的传统配伍。这里保留原页的配伍出处，不把这些药名组合直接变成个人处方。'),
'h513':('红景天','中国科学院上海有机化学研究所','天然药物——红景天','红景天-readable.txt','https://www.sioc.ac.cn/science/kpzy/qtzy/tryw/202306/t20230630_6800203.html','该页讨论库页、圣地及唐古特红景天等多个基原，记载补虚、肺系及瘀损相关传统用途。它不是单一大花红景天的药典专论，不能把不同种、全草与根茎的研究无差别合并。'),
'h550':('银耳','广州中医药大学广东中医药博物馆','银耳与地方药材标准资料','银耳-readable.txt','https://gdcmm.gzucm.edu.cn/info/1010/5037.htm','该馆文章通过湖南地方药材标准介绍银耳，涉及润肺与生津的传统用途。地方标准收载不等于《中国药典》收载；本条原导入的药典标签需要另行核对版次，不能沿用为已经查证的出处。'),
'h483':('关木通','香港卫生署','含马兜铃酸药材及其制剂的管理（2004年公告）','关木通-readable.txt','https://www.dh.gov.hk/textonly/chs/press/2004/040424.html','卫生署2004年公告把关木通列入含马兜铃酸药材的管理范围，并宣布自当年6月起停止相关进口与销售。应作为历史品种与风险资料阅读，不能从旧主治、旧剂量推导为今天的使用建议。')}
def build(a):
 pack=json.loads(a.base_pack.read_text(encoding='utf-8'));overlay={'baseSha256':hashlib.sha256(a.base_pack.read_bytes()).hexdigest(),'sources':{},'passages':{},'subjects':{}};proof=[]
 def add(hid,name,source,title,author,raw_file,url,text,chapter):
  raw=raw_file.read_bytes();sha=hashlib.sha256(raw).hexdigest();overlay['sources'][source]={'title':title,'author':author,'kind':'STUDY_REFERENCE','sha256':sha,'url':url,'inAppBook':False}
  pid=hashlib.sha256((source+':'+hid+':'+text).encode()).hexdigest()[:24];overlay['passages'][pid]={'source':source,'chapter':chapter,'chapterTitle':chapter,'text':text,'lineStart':1,'lineEnd':1,'sha256':hashlib.sha256(text.encode()).hexdigest(),'presentation':'EDITORIAL_SUMMARY','topic':'related'}
  subject={**pack['subjects']['herb:'+hid],'name':name};subject['references']=subject['references']+[pid];overlay['subjects']['herb:'+hid]=subject;proof.append({'id':hid,'name':name,'sourceUrl':url,'sourceSha256':sha,'presentation':'EDITORIAL_SUMMARY','notClaimedAsExactQuotation':True})
 rows={r['name']:r for r in json.loads((a.research/'polyu-search-results.json').read_text(encoding='utf-8'))}
 for hid,(name,text) in POLYU.items():
  url=rows[name]['links'][0];add(hid,name,'reference-polyu-'+hid,'中药资料库——'+name,'香港理工大学中药资料库',a.research/(name+'.html'),url,text,'来源、传统应用与风险要点（编辑摘要）')
 for hid,(name,page,text) in HUNAN.items():
  add(hid,name,'reference-hunan2010-'+hid,'湖南省中药饮片炮制规范（2010年版）——'+name,'湖南省食品药品监督管理局编',a.research/'湖南省中药饮片炮制规范2010.pdf','https://mpa.hunan.gov.cn/mpa/xhtml/img/zyyp2010.pdf#page='+str(page),text,f'{name}；原书第{page-19}页／PDF第{page}页（编辑摘要）')
 for hid,(name,author,title,readable,url,text) in OTHER.items():
  # SHA identifies the original downloaded HTML, not a cleaned derivative.
  add(hid,name,'reference-official-'+hid,title,author,a.research/(name+'.html'),url,text,'相关条目（编辑摘要）')
 # The old import omitted the grass radical. Compare the original 本经 name as
 # preserved and debated in the supplied ancient edition; do not identify a
 # modern botanical part or alter dose/indication fields from this name alone.
 books=json.loads(a.originals.read_text(encoding='utf-8'))['books'];book=next(b for b in books if b['id']=='materia-bencao-gangmu');chapter=next(c for c in book['chapters'] if '麻蕡一名麻勃' in c['content']);lines=chapter['content'].splitlines();i=next(i for i,t in enumerate(lines) if '麻蕡一名麻勃' in t);text=lines[i];assert len(text)<2500
 source='materia-bencao-gangmu';pid=hashlib.sha256((source+':'+chapter['id']+':'+text).encode()).hexdigest()[:24];overlay['passages'][pid]={'source':source,'chapter':chapter['id'],'chapterTitle':chapter['title'],'text':text,'lineStart':i+1,'lineEnd':i+1,'sha256':hashlib.sha256(text.encode()).hexdigest(),'mappingNote':'原导入作“麻贲”，按所引原书药名校正为“麻蕡”；古籍关于花、实等异说保留，不据名称校正合并现代品种。','topic':'related'}
 overlay['subjects']['herb:h145']={**pack['subjects']['herb:h145'],'name':'麻蕡','references':pack['subjects']['herb:h145']['references']+[pid]}
 for kind in ['sources','passages','subjects']:pack[kind].update(overlay[kind])
 a.output.write_text(json.dumps(pack,ensure_ascii=False,separators=(',',':')),encoding='utf-8');a.overlay.write_text(json.dumps(overlay,ensure_ascii=False,separators=(',',':')),encoding='utf-8');a.audit.write_text(json.dumps({'summaries':proof,'originalQuoteNameCorrection':'麻贲→麻蕡','summaryCount':20,'classicQuotationCount':1,'herbsWithAttributedReading':sum(bool(s['references']) for s in pack['subjects'].values() if s['kind']=='herb'),'sha256':hashlib.sha256(a.output.read_bytes()).hexdigest(),'bytes':a.output.stat().st_size},ensure_ascii=False,indent=2),encoding='utf-8');print('all herb readings',sum(bool(s['references'])for s in pack['subjects'].values()if s['kind']=='herb'),'pack',a.output.stat().st_size,hashlib.sha256(a.output.read_bytes()).hexdigest())
if __name__=='__main__':
 p=argparse.ArgumentParser()
 for name in ['base-pack','research','originals','output','overlay','audit']:p.add_argument('--'+name,type=Path,required=True)
 build(p.parse_args())
