'use strict';
// Protected credentials remain in memory. Never log responses containing review login data.
const crypto=require('node:crypto');
const {readAscPrivateKey}=require('./ascCredentials.cjs');
function createClient({mutations=false,reviewContext}={}){
 const key=readAscPrivateKey();
 function jwt(){const now=Math.floor(Date.now()/1000),enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),body=enc({alg:'ES256',kid:process.env.ASC_KEY_ID,typ:'JWT'})+'.'+enc({iss:process.env.APP_STORE_CONNECT_ISSUER_ID,iat:now-30,exp:now+600,aud:'appstoreconnect-v1'});return body+'.'+crypto.sign('sha256',Buffer.from(body),{key,dsaEncoding:'ieee-p1363'}).toString('base64url');}
 async function api(method,path,body){
  if(!/^\/v[12]\//.test(path))throw Error('Expected an official ASC resource path');
  if(!['GET','HEAD'].includes(method)){if(!mutations)throw Error('Read-only Apple client');require('./formalReviewGate.cjs').guardAscMutation(method,path,reviewContext);}
  const response=await fetch('https://api.appstoreconnect.apple.com'+path,{method,headers:{Authorization:'Bearer '+jwt(),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const e=Error('Apple '+method+' '+path.split('?')[0]+' HTTP '+response.status);e.details=(data.errors||[]).map(x=>({code:x.code,title:x.title,detail:x.detail,source:x.source,associatedErrors:x.meta?.associatedErrors}));throw e;}
  return data;
 }
 return {api};
}
module.exports={createClient};
