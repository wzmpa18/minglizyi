"""Run a synthetic, unbilled-to-users model regression on the existing host.

No customer account, quota, chart or credential is exported. Save the generated
report as acceptance evidence; this is not a substitute for specialist review.
"""
import argparse,json,shlex,subprocess
from pathlib import Path

REMOTE=r'''
const fs=require('fs'),vm=require('vm');const p=JSON.parse(fs.readFileSync(0,'utf8'));
require('/www/yandaoguoxue-backend/node_modules/dotenv').config({path:'/www/yandaoguoxue-backend/.env',quiet:true});
let m={exports:{}};vm.runInNewContext(p.source,{module:m,exports:m.exports});const q=m.exports;
(async()=>{
 const prompt='【大六壬排盘数据】\n起课四柱：丙午 戊戌 戊辰 己未\n日干支：戊辰\n月将：天罡辰加未时\n三传：寅→亥→申（遥克法）\n四课（上/下）：寅/戊 亥/寅 丑/辰 戌/丑\n课体：蒿矢课\n日旬空：戌亥\n昼占\n【用户提问】请以本课为求财主题的传统结构研习案例，解释依据、分歧和资料缺口，不预测财富。';
 const x=q.applyStudyPolicy([{role:'user',content:prompt}]);
 const response=await fetch(process.env.HUNYUAN_API_URL||'https://tokenhub.tencentmaas.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+process.env.HUNYUAN_API_KEY},body:JSON.stringify({model:process.env.HUNYUAN_MODEL||'hy3',messages:x.messages,max_tokens:8192,temperature:0.3,thinking:{type:'disabled'}}),signal:AbortSignal.timeout(120000)});
 if(!response.ok){console.log(JSON.stringify({status:response.status,success:false}));return}
 const data=await response.json(),content=data.choices?.[0]?.message?.content||'';
 console.log(JSON.stringify({checkedAt:new Date().toISOString(),status:response.status,success:true,source:p.commit,policy:q.VERSION,synthetic:true,customerData:false,customerQuotaConsumed:false,qualityError:q.validateStudyReport(content),finishReason:data.choices?.[0]?.finish_reason,length:content.length,content:q.appendSourceNotes(content),usage:data.usage}));
})().catch(e=>{console.log(JSON.stringify({success:false,error:e.name}));process.exitCode=1});
'''

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--evidence',required=True,type=Path);a=p.parse_args()
 commit=subprocess.check_output(['git','rev-parse','HEAD']).decode().strip()
 source=Path('backend_deploy/liurenStudyQuality.js').read_bytes().decode()
 run=subprocess.run(['ssh','-o','BatchMode=yes','root@82.156.228.87','node -e '+shlex.quote(REMOTE)],input=json.dumps({'source':source,'commit':commit}).encode(),capture_output=True,check=True,timeout=145)
 d=json.loads(run.stdout);a.evidence.write_bytes((json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode())
 print(json.dumps({k:v for k,v in d.items() if k not in ('content','usage')},ensure_ascii=False))
if __name__=='__main__':main()
