'use strict';
// Guoxue public marketing only. Never links a build or creates a review submission.
const fs=require('node:fs'),https=require('node:https'),crypto=require('node:crypto');
const key=require('./lib/ascCredentials.cjs').readAscPrivateKey();
const APP='6807592575',apply=process.argv.includes('--apply');
const output=process.argv.find(v=>v.startsWith('--output='))?.slice(9);
const copy=JSON.parse(fs.readFileSync('docs/marketing/20261020/store-copy.json','utf8'));
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function token(){const now=Math.floor(Date.now()/1000),s=b64({alg:'ES256',kid:process.env.ASC_KEY_ID,typ:'JWT'})+'.'+b64({iss:process.env.APP_STORE_CONNECT_ISSUER_ID,iat:now-30,exp:now+600,aud:'appstoreconnect-v1'});return s+'.'+crypto.sign('sha256',Buffer.from(s),{key,dsaEncoding:'ieee-p1363'}).toString('base64url');}
async function api(method,path,body){if(method!=='GET'&&!(apply&&method==='PATCH'&&/^\/v1\/appStoreVersionLocalizations\/[a-f0-9-]+$/.test(path)))throw Error('Marketing endpoint not allowed');return new Promise((resolve,reject)=>{const data=body?JSON.stringify(body):null,r=https.request({hostname:'api.appstoreconnect.apple.com',path,method,headers:{Authorization:'Bearer '+token(),...(data?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}:{})}},res=>{let text='';res.on('data',v=>text+=v);res.on('end',()=>{if(res.statusCode<200||res.statusCode>=300)return reject(Error('ASC marketing HTTP '+res.statusCode));try{resolve(JSON.parse(text));}catch{reject(Error('Invalid ASC marketing response'));}});});r.setTimeout(30000,()=>r.destroy(Error('ASC marketing timed out')));r.on('error',reject);if(data)r.write(data);r.end();});}
(async()=>{
 const list=await api('GET',`/v1/apps/${APP}/appStoreVersions?filter[platform]=IOS&limit=50`),versions=list.data.filter(v=>v.attributes.versionString==='25.0.115');
 if(versions.length!==1||versions[0].attributes.appStoreState!=='PREPARE_FOR_SUBMISSION')throw Error('Expected unique editable Guoxue draft; no formal review changes made');
 const version=versions[0],rows=(await api('GET',`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=50`)).data;
 const map={'zh-Hans':'zh-CN','zh-Hant':'zh-HK','en-US':'en-SG','en-GB':'en-SG'},proof={appId:APP,version:version.attributes.versionString,state:version.attributes.appStoreState,checkedAt:new Date().toISOString(),apply,formalSubmission:false,changes:[]};
 for(const row of rows){const locale=map[row.attributes.locale];if(!locale)continue;const source=copy.locales[locale];
  const description=source.full.replace('Google Play版暂不提供应用内购买，已获得权益可登录使用。','').replace('Google Play版暫不提供應用程式內購買，已取得權益可登入使用。','').replace('The Google Play edition does not offer in-app purchases. Existing entitlements can be used after sign-in. ','');
  const promotionalText=source.short;const attributes={description,promotionalText};
  const change={locale:row.attributes.locale,id:row.id,before:{description:row.attributes.description,promotionalText:row.attributes.promotionalText},after:attributes,verified:false};
  if(apply){await api('PATCH',`/v1/appStoreVersionLocalizations/${row.id}`,{data:{type:'appStoreVersionLocalizations',id:row.id,attributes}});const read=(await api('GET',`/v1/appStoreVersionLocalizations/${row.id}`)).data.attributes;if(read.description!==description||read.promotionalText!==promotionalText)throw Error('ASC marketing readback mismatch');change.verified=true;}
  proof.changes.push(change);
 }
 if(!proof.changes.length)throw Error('No existing supported localization; no unrelated locale created');
 if(output)fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({...proof,changes:proof.changes.map(v=>({locale:v.locale,descriptionCharacters:v.after.description.length,verified:v.verified}))}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
