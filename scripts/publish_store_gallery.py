"""Publish code-native marketing layouts around unchanged authentic UI captures.

No image fabrication, image manipulation, browser control or local build output.
Browser screenshots of these exact layouts are captured separately through CUA.
"""
import argparse,base64,hashlib,html,json,re,shlex,subprocess
from pathlib import Path

PAGES=[
 ('首页','读经典，学文化','从言道学堂开始','阅读、练习与记录，连成日常学习','学习内容与传统文化工具相互衔接'),
 ('原典阅读','读完整篇章','原文有据可查','从《黄帝内经·素问》开始研读','收录版本与出处随书标注，不代替医学判断'),
 ('连续听学','不只看，也能听','一章接着一章','使用本机中文语音，按章节连续听学','阅读进度留本机 · 不会自动播放'),
 ('工具交流','带着问题来','一起交流学习','易学工具下的独立500字文字交流区','支持内容安全处理、举报与屏蔽'),
 ('同辰','同一条件','也有不同人生','成年人自愿加入，寻找同辰与学习兴趣同好','双方同意后文字交流 · 支持退出'),
 ('日历','日子记清楚','学习有安排','公历农历、节气、生日与学习记事','私人安排默认不公开 · 提醒以系统支持为准'),
]
REMOTE="""import sys,json,base64,hashlib,pathlib\ns=json.load(sys.stdin); root=pathlib.Path('/root/yandaoguoxue/current').resolve(); assert root.name==s['expected']; p=root/'marketing'/'20261020'; assert not (root/'marketing').is_symlink(); p.mkdir(parents=True,exist_ok=True); assert not p.is_symlink(); result=[]\nfor name,encoded in s['files'].items():\n assert '/' not in name and '..' not in name; data=base64.b64decode(encoded); dest=p/name\n if dest.exists(): assert dest.read_bytes()==data\n else: dest.write_bytes(data)\n result.append({'file':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})\nprint(json.dumps({'source':s['source'],'url':'https://yandaoguoxue.yandao.vip/marketing/20261020/','files':result}))"""
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--captures',type=Path,required=True);p.add_argument('--evidence',type=Path,required=True);p.add_argument('--deployment-source',default='ade8e42726bd37198620e778be2330a08c947c72');a=p.parse_args()
 source=a.deployment_source;assert re.fullmatch(r'[a-f0-9]{40}',source);files={};template=(Path(__file__).parent/'templates/store-screenshot.html').read_text('utf-8')
 for n,(key,title,accent,sub,foot) in enumerate(PAGES,1):
  original=a.captures/('11_同辰营销原始实际页面.png' if key=='同辰' else f'11_营销原图_{key}.png');data=original.read_bytes();assert data[:3]==b'\xff\xd8\xff', 'Expected unchanged actual CUA JPEG capture'
  files[f'original-{n}.jpg']=base64.b64encode(data).decode();page=template
  for k,v in dict(TITLE=title,ACCENT=accent,SUBTITLE=sub,FOOTER=foot,IMAGE=f'original-{n}.jpg',NUMBER=f'{n:02}').items():page=page.replace('{{'+k+'}}',html.escape(v))
  files[f'page-{n}.html']=base64.b64encode(page.encode()).decode()
 files['feature.html']=base64.b64encode((Path(__file__).parent/'templates/store-feature.html').read_bytes()).decode()
 files['account-deletion.html']=base64.b64encode((Path(__file__).parent/'templates/account-deletion.html').read_bytes()).decode()
 spec={'source':source,'expected':'v25.0.115-calendar-community-'+source[:7],'files':files}
 result=subprocess.run(['ssh','-o','BatchMode=yes','root@82.156.228.87','python3 -c '+shlex.quote(REMOTE)],input=json.dumps(spec).encode(),capture_output=True,check=True,timeout=90)
 proof=json.loads(result.stdout);proof['captureSource']='ade8e42726bd37198620e778be2330a08c947c72';a.evidence.write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n','utf-8');print(json.dumps(proof,ensure_ascii=False))
if __name__=='__main__':main()
