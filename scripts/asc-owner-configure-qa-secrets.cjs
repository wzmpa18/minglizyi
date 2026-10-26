'use strict';
// Owner-authorized existing reviewer credentials -> this repository's encrypted
// Actions secrets. Input is memory/stdin only, never argv, a file or a log.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {createClient}=require('./lib/guoxueAscClient.cjs'),auth=require('../docs/requirements/apple-owner-release.json');
const repo='wzmpa18/minglizyi',arg=n=>process.argv.find(a=>a.startsWith('--'+n+'='))?.slice(n.length+3),versionId=arg('version-id'),output=arg('output');
if(!/^[a-f0-9-]{36}$/.test(versionId||'')||!output||fs.existsSync(output))throw Error('Existing Guoxue version and a new metadata-only proof path required');
(async()=>{
 const {api}=createClient();const app=(await api('GET','/v1/apps/'+auth.appId)).data;if(app.attributes.bundleId!==auth.bundleId)throw Error('Wrong app');
 const versions=(await api('GET','/v1/apps/'+auth.appId+'/appStoreVersions?filter[platform]=IOS&limit=50')).data;if(!versions.some(v=>v.id===versionId))throw Error('Version does not belong to Guoxue');
 const privateFields=(await api('GET','/v1/appStoreVersions/'+versionId+'/appStoreReviewDetail')).data?.attributes;if(!privateFields?.demoAccountName||!privateFields.demoAccountPassword)throw Error('Existing private reviewer credentials absent');
 for(const [name,value] of [['GUOXUE_REVIEW_ACCOUNT',privateFields.demoAccountName],['GUOXUE_REVIEW_PASSWORD',privateFields.demoAccountPassword]])execFileSync('gh',['secret','set',name,'--repo',repo],{input:value,stdio:['pipe','ignore','ignore'],timeout:30000});
 const response=JSON.parse(execFileSync('gh',['api','repos/'+repo+'/actions/secrets'],{encoding:'utf8',maxBuffer:500000})),names=['GUOXUE_REVIEW_ACCOUNT','GUOXUE_REVIEW_PASSWORD'];const secrets=response.secrets.filter(x=>names.includes(x.name)).map(x=>({name:x.name,updatedAt:x.updated_at}));if(secrets.length!==2)throw Error('Encrypted QA secret metadata readback incomplete');
 const proof={checkedAt:new Date().toISOString(),appId:auth.appId,repository:repo,purpose:'Owner-authorized real iOS screenshot login using existing private review fields',secrets,credentialValuesWrittenToFilesOrArguments:false,credentialValuesPrinted:false,reviewerOrEntitlementMutations:0};fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(proof));
})().catch(()=>{console.error('Guoxue encrypted QA secret setup did not complete; no credential values printed');process.exitCode=1;});
