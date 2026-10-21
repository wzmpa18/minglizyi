"""Run all existing report tool fixtures against the configured model in RAM.

Two simultaneous synthetic requests, no customer identity or quota changes.
Persist actual reports and failures to E, never print credentials or full reports.
"""
import argparse,json,shlex,subprocess,sys
from pathlib import Path

REMOTE=r'''
const fs=require('fs'),vm=require('vm'),p=JSON.parse(fs.readFileSync(0,'utf8'));
require('/www/yandaoguoxue-backend/node_modules/dotenv').config({path:'/www/yandaoguoxue-backend/.env',quiet:true});
const cache={};function load(name){name=name.replace(/^\.\//,'').replace(/\.js$/,'');if(cache[name])return cache[name].exports;if(!p.sources[name])throw Error('Non-allowlisted test import');const m={exports:{}};cache[name]=m;vm.runInNewContext(p.sources[name],{module:m,exports:m.exports,require:load});return m.exports;}
const q=load('chartStudyQuality');let cursor=0;
async function worker(){while(cursor<p.samples.length){const sample=p.samples[cursor++];let result={tool:sample.tool,synthetic:true,customerData:false,customerQuotaConsumed:false,source:p.commit};try{
 const request=q.applyStudyPolicy([{role:'user',content:`【${sample.tool}排盘数据】\n${sample.context}\n【用户提问】请细致研习此例，兼顾专业推演、情绪关怀与真实来源；不预测现实结果。`}]);if(!request.applied)throw Error('Report policy not applied');
 const response=await fetch(process.env.HUNYUAN_API_URL||'https://tokenhub.tencentmaas.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+process.env.HUNYUAN_API_KEY},body:JSON.stringify({model:process.env.HUNYUAN_MODEL||'hy3',messages:request.messages,max_tokens:6500,temperature:0.3,thinking:{type:'disabled'}}),signal:AbortSignal.timeout(120000)});
 result.status=response.status;if(!response.ok)throw Error('Upstream HTTP '+response.status);
 const data=await response.json(),content=data.choices?.[0]?.message?.content||'';
 result={...result,checkedAt:new Date().toISOString(),profile:request.kind,model:data.model,finishReason:data.choices?.[0]?.finish_reason,qualityError:q.validateStudyReport(content,request),length:content.length,content:q.appendSourceNotes(content,request),usage:data.usage};
 }catch(e){result.error=e.name+': '+e.message;}
 console.log(JSON.stringify(result));}}
Promise.all([worker(),worker()]).catch(e=>{console.error(e.name);process.exitCode=1});
'''

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--evidence',required=True,type=Path);p.add_argument('--only',help='Comma separated exact fixture names for an explicit retry');a=p.parse_args()
 commit=subprocess.check_output(['git','rev-parse','HEAD']).decode().strip()
 samples=json.loads(Path('scripts/fixtures/chart-study-samples.json').read_bytes())
 if a.only:
  names=a.only.split(',');samples=[x for x in samples if x['tool'] in names];assert len(samples)==len(names)
 sources={n:Path('backend_deploy',n+'.js').read_bytes().decode() for n in ['chartStudyQuality','toolStudySources','liurenStudyQuality']}
 process=subprocess.Popen(['ssh','-o','BatchMode=yes','root@82.156.228.87','node -e '+shlex.quote(REMOTE)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 process.stdin.write(json.dumps({'commit':commit,'samples':samples,'sources':sources}).encode());process.stdin.close()
 rows=[]
 for line in process.stdout:
  d=json.loads(line);rows.append(d);a.evidence.write_bytes((json.dumps({'source':commit,'casesExpected':len(samples),'results':rows,'specialistReviewed':False,'physicalDeviceAccepted':False},ensure_ascii=False,indent=2)+'\n').encode())
  print(json.dumps({k:d.get(k) for k in ['tool','status','profile','qualityError','finishReason','length','error']},ensure_ascii=False),flush=True)
 assert process.wait()==0,process.stderr.read().decode()[-1000:]
 assert len(rows)==len(samples)
 print(json.dumps({'completed':len(rows),'passed':sum(not x.get('error') and not x.get('qualityError') and x.get('finishReason')!='length' for x in rows)},ensure_ascii=False))
if __name__=='__main__':main()
