'use strict';
// CI-only ordinary review-account login. No account or entitlement mutation.
const fs=require('node:fs');
function authStorage(login,now=Date.now()){
 const token=login?.data?.accessToken,u=login?.data?.user;
 if(login?.success!==true||typeof token!=='string'||token.split('.').length!==3||!/^\d+$/.test(String(u?.userId)))throw Error('Normal review login did not return a valid session');
 // Same optional fields and membership normalization as loginService/auth.ts.
 // Every account and entitlement field comes from the authenticated server.
 const profile={userId:String(u.userId),nickname:u.nickname||'国学爱好者',avatar:u.avatar||'',bio:u.bio||'',gender:u.gender||undefined,birthday:u.birthday||undefined,tags:u.tags||[],memberLevel:u.memberLevel||'basic',membershipExpiry:u.membershipExpiry||null,memberTier:u.memberTier||undefined,phone:u.phone||undefined,email:u.email||undefined,inviteCode:u.inviteCode,loginTime:now};
 const rawTier=profile.memberTier||profile.memberLevel,tier=rawTier==='premium'?'monthly':rawTier,exp=profile.membershipExpiry?new Date(profile.membershipExpiry).getTime():Infinity;
 const paid=['monthly','quarterly','yearly','lifetime'].includes(tier)&&(exp===Infinity||exp>now);
 return{yandao_user_token:token,yandao_user_profile:JSON.stringify(profile),yandao_token_expiry:String(now+7*86400000),yandao_refresh_token:'',yandao_refresh_expiry:String(now+30*86400000),yandao_membership_status:JSON.stringify({level:paid?tier:'basic',startTime:new Date(now).toISOString(),expireTime:paid?profile.membershipExpiry:null,isActive:paid,daysRemaining:paid?(exp===Infinity?Infinity:Math.ceil((exp-now)/86400000)):0})};
}
async function prepare(){
 if(process.env.GITHUB_ACTIONS!=='true'||!process.env.GITHUB_ENV)throw Error('This session bootstrap is restricted to the isolated screenshot runner');
 const account=process.env.GUOXUE_REVIEW_ACCOUNT,password=process.env.GUOXUE_REVIEW_PASSWORD;
 if(!account||!password)throw Error('Encrypted review-account inputs are missing');
 const headers={'Content-Type':'application/json','X-Client-Platform':'ios','X-Store-Channel':'ios-full-learning','X-Client-Version':'25.0.118'};
 const response=await fetch('https://yandaoguoxue.yandao.vip/api/auth/login',{method:'POST',headers,body:JSON.stringify({account,password}),signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('Normal review login HTTP '+response.status);
 const login=await response.json(),storage=authStorage(login),token=storage.yandao_user_token;
 for(const id of ['tcm-learning-complete','tcm-anatomy-atlas-v3','tcm-anatomy-3d-v2']){
  const r=await fetch('https://yandaoguoxue.yandao.vip/api/offline/packs/'+id+'/download?resolve=1',{headers:{...headers,Authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});await r.body?.cancel();if(r.status!==200)throw Error('Normal review-account learning entitlement was not available');
 }
 const encoded=Buffer.from(JSON.stringify(storage)).toString('base64');
 // GitHub masks the real session before it can occur in any later tool output.
 // No password is passed into XCTest, the app, screenshot metadata or artifacts.
 console.log('::add-mask::'+token);console.log('::add-mask::'+encoded);
 fs.appendFileSync(process.env.GITHUB_ENV,'TEST_RUNNER_GUOXUE_QA_SESSION_B64='+encoded+'\n');
 console.log('Normal review login and three existing learning download permissions verified; private session kept inside runner.');
}
module.exports={authStorage};
if(require.main===module)prepare().catch(()=>{console.error('Marketing session preparation failed; private responses are not printed.');process.exitCode=1;});
