"""Render a source-linked reading index from pinned public metadata, no client build."""
import argparse,base64,hashlib,html,json,re,shlex,subprocess
from pathlib import Path

def render(bibliography,books):
    escape=lambda text:html.escape(str(text),quote=True)
    def safe_url(url):
        assert url.startswith('https://www.hantang.com/chinese/ch_Articles/') or url.startswith('/zhongyi/classic?book=') or url=='/offline/'
        return escape(url)
    sources={s['id']:s for s in bibliography['sources']}
    cards=[]
    for person in bibliography['profiles']:
        source=sources[person['evidenceSource']]
        cards.append('<article><h3>'+escape(person['name'])+'</h3><p>'+escape(' / '.join(person['aliases']) or '书目所涉医家')+'</p><a href="'+safe_url(source['url'])+'" target="_blank" rel="noopener noreferrer">查看本人原始推荐或教学说明 ↗</a></article>')
    entries=[]
    names={b['id']:b['name'] for b in books}
    for item in bibliography['entries']:
        links=''.join('<a class="book" href="'+safe_url('/zhongyi/classic?book='+identity)+'">'+escape(names[identity])+' ›</a>' for identity in item['bookIds'])
        source=sources[item['evidenceSource']]
        entries.append('<article class="entry"><h3>'+escape(item['title'])+'</h3><p class="author">'+escape(item['authors'])+'</p><strong>'+escape(item['status'])+'</strong><p>'+escape(item['note'])+'</p>'+links+'<a class="source" href="'+safe_url(source['url'])+'" target="_blank" rel="noopener noreferrer">推荐出处：'+escape(source['title'])+' ↗</a></article>')
    return '''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>经方医家与原典研读索引 · 言道国学</title>
<style>body{margin:0;background:#f5f7f2;color:#243d32;font:16px/1.9 system-ui,sans-serif}main{max-width:1080px;margin:auto;padding:24px 20px 70px}nav{display:flex;gap:24px;flex-wrap:wrap;padding:12px 0 26px}a{color:#246c59;text-underline-offset:4px}header{padding:36px;border:1px solid #cbdacc;border-radius:24px;background:#e8f1e6}h1{font-size:clamp(28px,5vw,44px);line-height:1.4;margin:10px 0 18px}h2{margin:40px 0 18px;font-size:24px}h3{margin:0 0 8px;font-size:19px}p{margin:10px 0}.eyebrow,.author{color:#5f7368}.notice{padding:18px 22px;background:#fff8e8;border-radius:16px;margin:20px 0}.actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:24px}.actions a{padding:10px 18px;background:#246c59;color:white;border-radius:12px;text-decoration:none}.people{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}article{padding:22px;background:white;border:1px solid #dce5d9;border-radius:16px}article a{font-size:14px}.entries{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,400px),1fr));gap:18px}.book,.source{display:block;margin-top:12px}.source{font-size:13px}.entry strong{font-size:14px;color:#566635}footer{margin-top:40px;font-size:13px;color:#647466}@media(max-width:600px){main{padding:14px 14px 50px}header{padding:24px}.entry{padding:18px}nav{gap:15px}}</style>
<main><nav><a href="/">言道国学</a><a href="/academy/start/">学习课程</a><a href="/zhongyi/classic/">中医典籍</a><a href="/offline/">下载原典内容包</a></nav>
<header><span class="eyebrow">经方文献 · 读原作，核出处</span><h1>沿着可靠书目<br>走进医家与原典</h1><p>依据倪海厦本人公开书单、金匮前言和针灸教学说明，核对涉及的医家、书名与版本。收录与授权状态逐项列明。</p><p>15位书目所涉医家 · 21项书目记录 · 当前原典库32部590篇卷</p><div class="actions"><a href="/offline/">先更新1.2.0原典包</a><a href="/zhongyi/classic/">打开原典阅读器</a></div></header>
<aside class="notice">新增书籍需先在“离线内容包”下载或更新“中医原典录文扩充”。完成后返回中医典籍，可搜索、阅读、连续听学并保存原有书签；无需重装2122或苹果32。原十部仍保留，并非库中每一部都属于倪氏书单。录文版标注不含原图时，图像位置说明不能当成穴位定位图。目录与字符核验不等于医学专业校勘。</aside>
<h2>书目所涉医家</h2><p>具体推荐范围以链接原文为据，相关医家的其他作品不自动获得逐本推荐。这里的“涉及”也不等于相关人物对本平台授权或代言。</p><div class="people">'''+''.join(cards)+'''</div><h2>原典、注本与现代书目</h2><p>现代受保护著作先保留书目与原始推荐出处；未取得适用授权的全文、讲义和视频不上传。缺版本或插图的范围直接标明。</p><div class="entries">'''+''.join(entries)+'''</div><footer>本页为言道国学独立书目整理，并非倪海厦讲义或授权课程。历史推荐不等于现代医学共识或疗效保证。古代方药、剂量、医案及针灸资料用于文献学习，不作为个人诊疗或自行操作依据。</footer></main></html>'''

REMOTE=r'''from pathlib import Path
import sys,json,base64,hashlib,os,datetime
p=json.load(sys.stdin);root=Path('/root/yandaoguoxue/current').resolve();assert root.name==p['expectedCurrent']
folder=root/'guide/jingfang';assert root in folder.resolve().parents and not folder.is_symlink();result=[]
for name,encoded in p['files'].items():
 assert name in ['index.html','bibliography.json'];data=base64.b64decode(encoded,validate=True);assert hashlib.sha256(data).hexdigest()==p['hashes'][name]
 target=folder/name;assert not target.is_symlink()
 if target.exists():assert target.read_bytes()==data,'Existing page differs; review instead of overwrite'
 if p['apply'] and not target.exists():folder.mkdir(parents=True,exist_ok=True);pending=folder/(name+'.next');assert not pending.exists();pending.write_bytes(data);os.replace(pending,target)
 result.append({'name':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
print(json.dumps({'source':p['source'],'mode':'published' if p['apply'] else 'dry-run','url':'https://yandaoguoxue.yandao.vip/guide/jingfang/','files':result,'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}))
'''
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',required=True);p.add_argument('--expected-current',required=True);p.add_argument('--evidence',required=True,type=Path);p.add_argument('--apply',action='store_true');a=p.parse_args()
    assert re.fullmatch('[a-f0-9]{40}',a.source) and re.fullmatch(r'v25\.0\.115-calendar-community-[a-f0-9]{7}',a.expected_current)
    def source(name):return json.loads(subprocess.check_output(['git','show',a.source+':'+name]))
    bibliography=source('backend_deploy/data/jingfang-bibliography.json');books=[*source('src/data/tcmOriginalEditions.json'),source('src/data/nanjingOriginal.json'),*source('src/data/tcmClinicalOriginalEditions.json'),*source('backend_deploy/data/tcm-jingfang-originals.json')]
    files={'index.html':render(bibliography,books).encode(),'bibliography.json':(json.dumps(bibliography,ensure_ascii=False,indent=2)+'\n').encode()}
    payload={'source':a.source,'expectedCurrent':a.expected_current,'files':{k:base64.b64encode(v).decode() for k,v in files.items()},'hashes':{k:hashlib.sha256(v).hexdigest() for k,v in files.items()},'apply':a.apply}
    result=subprocess.run(['ssh','-o','BatchMode=yes','root@82.156.228.87','python3 -c '+shlex.quote(REMOTE)],input=json.dumps(payload).encode(),capture_output=True,check=True,timeout=40)
    proof=json.loads(result.stdout);a.evidence.write_bytes((json.dumps(proof,ensure_ascii=False,indent=2)+'\n').encode());print(json.dumps(proof,ensure_ascii=False))
if __name__=='__main__':main()
