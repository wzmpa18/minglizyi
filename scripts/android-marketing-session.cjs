'use strict';
// Isolated CI screenshot account. Uses normal login and download authorization.
const fs=require('node:fs'),path=require('node:path');
const {authStorage}=require('./ios-marketing-session.cjs');
(async()=>{
 if(process.env.GITHUB_ACTIONS!=='true')throw Error('CI runner required');
 const account=process.env.GUOXUE_REVIEW_ACCOUNT,password=process.env.GUOXUE_REVIEW_PASSWORD;
 if(!account||!password)throw Error('Protected account inputs missing');
 const headers={'Content-Type':'application/json','X-Client-Platform':'android','X-Store-Channel':'appchina','X-Client-Version':require('../package.json').version.replace(/^v/,'')};
 const response=await fetch('https://yandaoguoxue.yandao.vip/api/auth/login',{method:'POST',headers,body:JSON.stringify({account,password}),signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('Normal login unavailable');
 const storage=authStorage(await response.json()),token=storage.yandao_user_token;
 console.log('::add-mask::'+token);
 for(const pack of ['tcm-learning-complete','tcm-anatomy-atlas-v3','tcm-anatomy-3d-v2']){
  const r=await fetch('https://yandaoguoxue.yandao.vip/api/offline/packs/'+pack+'/download?resolve=1',{headers:{...headers,Authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});
  await r.body?.cancel();if(r.status!==200)throw Error('Existing account entitlement unavailable');
 }
 const file=path.join('android/app/src/androidTest/assets/marketing-session.json');
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(storage),{mode:0o600});
 console.log('Normal account and existing learning entitlements verified; private session excluded from artifacts.');
})().catch(()=>{console.error('Native marketing authentication failed; private inputs and responses suppressed.');process.exitCode=1;});
