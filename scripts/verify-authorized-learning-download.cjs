'use strict';
// Credentials are read from the owner's protected local file into memory only.
// Neither responses, tokens, account identifiers nor signed URLs are logged.
const fs=require('node:fs'),crypto=require('node:crypto');
const arg=name=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3);
const credential=arg('credential-file'),output=arg('output'),version=arg('version'),sha=arg('sha256'),size=Number(arg('bytes'));
if(!credential||!output||!/^\d+\.\d+\.\d+$/.test(version||'')||!/^[a-f0-9]{64}$/.test(sha||'')||!Number.isSafeInteger(size)||size<1||fs.existsSync(output))throw Error('Explicit protected credentials and a new receipt path required');
const origin='https://yandaoguoxue.yandao.vip';
(async()=>{
 const text=fs.readFileSync(credential,'utf8'),account=text.match(/^\s*账号\s*[:：]\s*(\S+)/m)?.[1],password=text.match(/^\s*密码\s*[:：]\s*(\S+)/m)?.[1];
 if(!account||!password)throw Error('Protected account format is not recognized');
 const login=await fetch(origin+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account,password}),signal:AbortSignal.timeout(30000)});
 const result=await login.json(),token=result.data?.accessToken;
 if(!login.ok||!result.success||typeof token!=='string')throw Error('Authorized test login did not succeed');
 const headers={Authorization:'Bearer '+token,'X-Store-Channel':'google','X-Client-Version':'25.0.117'};
 const manifestResponse=await fetch(origin+'/api/offline/manifest',{headers,cache:'no-store',signal:AbortSignal.timeout(30000)}),body=await manifestResponse.json();
 const packs=body.packs||body.data?.packs||body.data?.manifest?.packs;
 const row=packs?.find(p=>p.packId==='tcm-learning-complete');
 if(!manifestResponse.ok||!row||row.version!==version||row.sha256!==sha||row.accessLevel!=='PUBLIC')throw Error('Published catalogue does not match the verified public learning package');
 const linkResponse=await fetch(origin+'/api/offline/packs/tcm-learning-complete/download?resolve=1',{headers,cache:'no-store',signal:AbortSignal.timeout(30000)}),link=await linkResponse.json();
 if(!linkResponse.ok||link.sha256!==sha||link.version!==version||Number(link.size)!==size||new URL(link.downloadUrl).protocol!=='https:')throw Error('Authenticated learning delivery did not match');
 const response=await fetch(link.downloadUrl,{signal:AbortSignal.timeout(240000)});if(!response.ok)throw Error('Authorized full download failed');
 const digest=crypto.createHash('sha256');let bytes=0;for await(const chunk of response.body){bytes+=chunk.length;if(bytes>size)throw Error('Download exceeded declared bytes');digest.update(chunk);}
 if(bytes!==size||digest.digest('hex')!==sha)throw Error('Full authorized download did not match the declared package');
 const anonymous=await fetch(origin+'/api/offline/packs/tcm-learning-complete/download?resolve=1',{cache:'no-store',signal:AbortSignal.timeout(30000)});
 if(anonymous.status!==401)throw Error('Anonymous learning delivery unexpectedly changed');
 const proof={checkedAt:new Date().toISOString(),packId:row.packId,version,bytes,sha256:sha,accessLevel:row.accessLevel,minimumAppVersion:row.minAppVersion,authorizedLogin:true,downloadStatus:response.status,fullDownloadShaVerified:true,anonymousStatus:anonymous.status,clientContext:'google / 25.0.117',accountMembership:result.data?.user?.memberLevel||'not returned',noAdditionalIdentityChallenge:true};
 fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(proof));
})().catch(()=>{console.error('Authorized learning verification failed; credentials and response bodies withheld');process.exitCode=1;});
