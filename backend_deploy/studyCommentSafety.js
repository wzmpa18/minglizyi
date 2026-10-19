'use strict';
// Public study comments only. Never send a private vault, health record, chart,
// user/device identity or location to this service. Dedicated TMS credentials
// are required; SMS, email and storage keys are deliberately not reused.
// https://cloud.tencent.com/document/api/1124/51860 (2020-12-29)
const crypto=require('node:crypto'),https=require('node:https');
const HOST='tms.tencentcloudapi.com';
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const mac=(key,value)=>crypto.createHmac('sha256',key).update(value).digest();
const safeToken=value=>typeof value==='string'&&/^[A-Za-z0-9_.-]{1,120}$/.test(value)?value:'';
function localFlags(text){
 const value=String(text).normalize('NFKC').replace(/[\s\u200b-\u200f\ufeff]/g,'');
 // Context flags request human review, including historical/academic quotations.
 // They are not a verdict that a political opinion or quotation is unlawful.
 const rules=[['POLITY_CONTEXT',/煽动颠覆|分裂国家|颠覆国家政权|民族仇恨|民族歧视|暴力革命|非法集会/],['VIOLENCE_EXTREMISM',/恐怖主义|极端主义|实施恐袭|宣扬暴恐/],['FRAUD_AD',/赌博|裸聊|诈骗|传销|加我微信|出售毒品/],['MEDICAL_RISK',/保证治愈|包治百病|自行针刺|自行正骨|自行开方/]];
 return rules.filter(([,pattern])=>pattern.test(value)).map(([label])=>label);
}
function capability(env=process.env){return {provider:'tencent-tms',configured:!!(env.TMS_SECRET_ID&&env.TMS_SECRET_KEY&&env.STUDY_TMS_PRIVACY_READY==='true'),manualReviewRequired:true,politicalCoverageRequired:true};}
function interpret(response){
 const r=response?.Response;
 if(!r||r.Error||!safeToken(r.RequestId))return {decision:'UNAVAILABLE',reason:'服务未返回可验证结果',requestId:safeToken(r?.RequestId)};
 const details=Array.isArray(r.DetailResults)?r.DetailResults:[],suggestions=[r.Suggestion,...details.map(x=>x.Suggestion)];
 const labels=Array.from(new Set([r.Label,...details.filter(x=>x.Suggestion!=='Pass').map(x=>x.Label)].map(safeToken).filter(Boolean))).slice(0,20);
 if(suggestions.includes('Block'))return {decision:'BLOCK',reason:'内容安全服务建议拦截，需修订或申诉复核',labels,requestId:r.RequestId};
 if(suggestions.some(x=>!['Pass','Review'].includes(x)))return {decision:'UNAVAILABLE',reason:'内容安全结果格式不完整',requestId:r.RequestId};
 if(!details.some(x=>x.Label==='Polity'))return {decision:'REVIEW',reason:'未取得涉政类别的检测结果，需人工复核',labels,requestId:r.RequestId};
 if(suggestions.includes('Review'))return {decision:'REVIEW',reason:'疑似风险，需人工结合上下文复核',labels,requestId:r.RequestId};
 return {decision:'PASS',reason:'机器未检出风险，仍须人工复核',labels,requestId:r.RequestId};
}
function requestTms(body,env,transport=https.request){
 const timestamp=Math.floor(Date.now()/1000),date=new Date(timestamp*1000).toISOString().slice(0,10),payload=JSON.stringify(body),scope=date+'/tms/tc3_request';
 const canonical='POST\n/\n\ncontent-type:application/json\nhost:'+HOST+'\n\ncontent-type;host\n'+hash(payload);
 const stringToSign='TC3-HMAC-SHA256\n'+timestamp+'\n'+scope+'\n'+hash(canonical);
 const signing=mac(mac(mac('TC3'+env.TMS_SECRET_KEY,date),'tms'),'tc3_request'),signature=crypto.createHmac('sha256',signing).update(stringToSign).digest('hex');
 return new Promise(resolve=>{
  let settled=false,request;const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value);};
  const timer=setTimeout(()=>{finish(null);request?.destroy();},8000);
  try{request=transport({hostname:HOST,path:'/',method:'POST',port:443,headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload),'X-TC-Action':'TextModeration','X-TC-Version':'2020-12-29','X-TC-Region':env.TMS_REGION||'ap-guangzhou','X-TC-Timestamp':timestamp,Authorization:'TC3-HMAC-SHA256 Credential='+env.TMS_SECRET_ID+'/'+scope+', SignedHeaders=content-type;host, Signature='+signature}},response=>{
   let bytes=0,data='';response.on('data',part=>{bytes+=Buffer.byteLength(part);if(bytes>262144){finish(null);request.destroy();return;}data+=part.toString('utf8');});response.on('end',()=>{try{finish(response.statusCode===200?JSON.parse(data):null);}catch{finish(null);}});response.on('error',()=>finish(null));
  });request.on('error',()=>finish(null));request.end(payload);}catch{finish(null);}
 });
}
async function screenPublicComment(content,{env=process.env,request=requestTms}={}){
 const fingerprint=hash(String(content)),flags=localFlags(content),base={fingerprint,flags,provider:'local-and-manual',checkedAt:Date.now()};
 if(!capability(env).configured)return {...base,decision:'UNAVAILABLE',reason:'云内容安全未配置，等待人工逐条合规复核'};
 if(Array.from(String(content)).length>10000)return {...base,decision:'REVIEW',reason:'文字编码长度超出机器检测范围，需人工复核'};
 let result;try{result=interpret(await request({Content:Buffer.from(String(content),'utf8').toString('base64'),Type:'TEXT',SourceLanguage:'zh',BizType:env.TMS_BIZ_TYPE||'TencentCloudDefault',DataId:'study_'+fingerprint.slice(0,48)},env));}catch{result={decision:'UNAVAILABLE',reason:'内容安全服务暂不可用，等待人工复核'};}
 if(flags.length&&result.decision==='PASS')result={...result,decision:'REVIEW',reason:'规则标记了风险语境，需人工复核'};
 return {...base,...result,provider:'tencent-tms'};
}
module.exports={localFlags,capability,interpret,screenPublicComment,requestTms};
