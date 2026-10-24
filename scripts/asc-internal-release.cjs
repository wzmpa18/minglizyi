'use strict';
// Guoxue only. No formal review endpoint, new tester, invitation or public link.
// Apple docs: /documentation/appstoreconnectapi/beta-groups
const crypto=require('node:crypto'),https=require('node:https'),fs=require('node:fs');
const {readAscPrivateKey}=require('./lib/ascCredentials.cjs');
const APP='6807592575',GROUP='言道国学';
const args=process.argv.slice(2),option=name=>args.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3);
const build=option('build'),output=option('output'),assign=args.includes('--assign-existing-internal-group');
const expire=args.includes('--expire-known-broken');let expiringId='';
if(expire&&(!['48','49'].includes(build)||assign))throw Error('Expiry is limited to the two known-broken internal candidates 48/49');
if(!/^[1-9]\d{0,8}$/.test(build||''))throw Error('Provide one exact build number');
const key=readAscPrivateKey();
function jwt(){const now=Math.floor(Date.now()/1000),enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const text=enc({alg:'ES256',kid:process.env.ASC_KEY_ID,typ:'JWT'})+'.'+enc({iss:process.env.APP_STORE_CONNECT_ISSUER_ID,iat:now-30,exp:now+600,aud:'appstoreconnect-v1'});return text+'.'+crypto.sign('sha256',Buffer.from(text),{key,dsaEncoding:'ieee-p1363'}).toString('base64url');}
async function api(method,path,body){
 const expiryAllowed=expire&&method==='PATCH'&&!!expiringId&&path===`/v1/builds/${expiringId}`&&JSON.stringify(body)===JSON.stringify({data:{type:'builds',id:expiringId,attributes:{expired:true}}});
 if(method!=='GET'&&!expiryAllowed&&!(method==='POST'&&/^\/v1\/betaGroups\/[a-f0-9-]{36}\/relationships\/builds$/.test(path)))throw Error('Operation outside internal-build scope');
 return new Promise((resolve,reject)=>{const raw=body?JSON.stringify(body):null,r=https.request({hostname:'api.appstoreconnect.apple.com',path,method,headers:{Authorization:`Bearer ${jwt()}`,...(raw?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(raw)}:{})}},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>{if(res.statusCode<200||res.statusCode>=300)return reject(Error(`Apple ${method} ${path.split('?')[0]} HTTP ${res.statusCode}`));try{resolve(text?JSON.parse(text):{});}catch{reject(Error('Invalid Apple response'));}});});r.setTimeout(30000,()=>r.destroy(Error('Apple request timed out')));r.on('error',reject);if(raw)r.write(raw);r.end();});
}
(async()=>{
 const records=await api('GET',`/v1/builds?filter[app]=${APP}&filter[version]=${build}&include=preReleaseVersion,buildBetaDetail,betaGroups${expire?',appStoreVersion':''}&limit=20`);
 const candidates=records.data.filter(d=>d.attributes.version===build&&records.included?.some(v=>v.type==='preReleaseVersions'&&v.id===d.relationships.preReleaseVersion?.data?.id&&v.attributes.version==='25.0.115'));
 if(!candidates.length){const proof={appId:APP,version:'25.0.115',build,checkedAt:new Date().toISOString(),state:'not visible in Apple build records yet; wait for processing, do not re-upload',formalSubmission:false};if(output)fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));return;}
 if(candidates.length!==1)throw Error('Expected one Guoxue 25.0.115 candidate; do not reuse a build number');
 const item=candidates[0],proof={appId:APP,version:'25.0.115',build,buildId:item.id,checkedAt:new Date().toISOString(),processingState:item.attributes.processingState,expired:item.attributes.expired,assignedNow:false,formalSubmission:false};
 if(expire){
  if(!Object.hasOwn(item.relationships.appStoreVersion||{},'data')||item.relationships.appStoreVersion.data!==null)throw Error('Formal-version attachment is not proven absent; no expiry performed');
  expiringId=item.id;
  if(!item.attributes.expired)await api('PATCH',`/v1/builds/${item.id}`,{data:{type:'builds',id:item.id,attributes:{expired:true}}});
  const read=await api('GET',`/v1/builds/${item.id}`);if(read.data.attributes.expired!==true)throw Error('Build expiry not confirmed');
  proof.expired=true;proof.state='known-broken internal candidate expired; no formal version attached or changed';
  if(output)fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));return;
 }
 if(item.attributes.processingState!=='VALID'||item.attributes.expired){proof.state='not ready for internal testing';}
 else{
  const all=await api('GET',`/v1/apps/${APP}/betaGroups?fields[betaGroups]=name,isInternalGroup,hasAccessToAllBuilds,publicLinkEnabled&limit=100`);
  const groups=all.data.filter(g=>g.attributes.isInternalGroup&&g.attributes.name===GROUP);
  if(groups.length!==1)throw Error('Existing internal Guoxue group is not unique; no membership changed');
  const group=groups[0];proof.groupId=group.id;proof.groupName=group.attributes.name;proof.isInternalGroup=true;
  // Read the relationships already included by the authorized builds response.
  // The separate /builds/:id/betaGroups resource is unavailable on this account.
  if(!Array.isArray(item.relationships.betaGroups?.data))throw Error('Build did not include group linkage; no changes made');
  let links=item.relationships.betaGroups.data;
  if(!links.some(g=>g.id===group.id)&&assign){
   await api('POST',`/v1/betaGroups/${group.id}/relationships/builds`,{data:[{type:'builds',id:item.id}]});proof.assignedNow=true;
   const current=await api('GET',`/v1/builds/${item.id}?include=betaGroups,buildBetaDetail`);
   links=current.data.relationships.betaGroups?.data||[];
   records.included=current.included||[];
  }
  proof.groupAttached=links.some(g=>g.id===group.id);
  const detail=records.included.find(v=>v.type==='buildBetaDetails'&&v.id===item.relationships.buildBetaDetail?.data?.id);
  if(!detail)throw Error('Build did not include beta state; internal testing is not verified');
  proof.internalBuildState=detail.attributes.internalBuildState;proof.externalBuildState=detail.attributes.externalBuildState;
  proof.state=proof.groupAttached&&proof.internalBuildState==='IN_BETA_TESTING'?'available to existing internal group':'internal availability not yet verified';
 }
 if(output)fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n');
 console.log(JSON.stringify(proof));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
