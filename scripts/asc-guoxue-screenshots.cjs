'use strict';
// Actual simulator screenshots only; never generate or alter pixels.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createClient}=require('./lib/guoxueAscClient.cjs');
const arg=n=>process.argv.find(a=>a.startsWith('--'+n+'='))?.slice(n.length+3);
const directory=arg('directory'),output=arg('output'),apply=process.argv.includes('--apply');
if(!directory||!output)throw Error('Provide source proof directory and E: evidence path');
const source='79885a4573798bc8a9fb034715cb0c88f96ff082',APP='6807592575',VERSION='299afd61-88b3-4f82-b0dd-54847928f1e8';
(async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(directory,'verified-screenshots.json'),'utf8'));
 if(manifest.source!==source||manifest.run!==39399419521||manifest.physicalDevice!==false)throw Error('Wrong real simulator source proof');
 const {api}=createClient({mutations:apply}),proof={appId:APP,source,run:manifest.run,physicalDevice:false,checkedAt:new Date().toISOString(),apply,sets:[]};
 const app=(await api('GET','/v1/apps/'+APP)).data;if(app.attributes.bundleId!=='com.yandaoguoxue.app')throw Error('Wrong app');
 const version=(await api('GET','/v1/appStoreVersions/'+VERSION)).data;if(version.attributes.appStoreState!=='PREPARE_FOR_SUBMISSION')throw Error('Version not editable');
 const locales=(await api('GET','/v1/appStoreVersions/'+VERSION+'/appStoreVersionLocalizations?limit=20')).data;const locale=locales.find(x=>x.attributes.locale==='zh-Hans');if(!locale)throw Error('Missing existing locale');
 const sets=(await api('GET','/v1/appStoreVersionLocalizations/'+locale.id+'/appScreenshotSets?limit=30')).data;
 try{for(const [device,display] of [['iphone','APP_IPHONE_67'],['ipad','APP_IPAD_PRO_3GEN_129']]){
  const set=sets.find(x=>x.attributes.screenshotDisplayType===display);if(!set)throw Error('Missing expected existing device set');
  const before=(await api('GET','/v1/appScreenshotSets/'+set.id+'/appScreenshots?limit=50')).data;
  const row={device,display,setId:set.id,before:before.map(x=>({id:x.id,name:x.attributes.fileName,state:x.attributes.assetDeliveryState?.state})),uploaded:[],oldReferencesRemoved:[]};proof.sets.push(row);
  for(const index of ['00','01','02','04','05']){
   const file=manifest.files.find(x=>x.device===device&&x.index===index);if(!file)throw Error('Screenshot proof missing');const data=fs.readFileSync(path.join(directory,device+'_'+index+'.png'));
   if(crypto.createHash('sha256').update(data).digest('hex')!==file.sha256)throw Error('Screenshot changed after capture');
   const name='29_'+device+'_'+index+'_actual_learning.png',md5=crypto.createHash('md5').update(data).digest('hex');
   let shot=before.find(x=>x.attributes.fileName===name);
   if(!apply){row.uploaded.push({fileName:name,sha256:file.sha256,planned:true});continue;}
   if(!shot){shot=(await api('POST','/v1/appScreenshots',{data:{type:'appScreenshots',attributes:{fileName:name,fileSize:data.length},relationships:{appScreenshotSet:{data:{type:'appScreenshotSets',id:set.id}}}}})).data;
    for(const op of shot.attributes.uploadOperations){const url=new URL(op.url);if(url.protocol!=='https:'||!url.hostname.endsWith('.apple.com')||op.method!=='PUT')throw Error('Unexpected Apple upload operation');
     const headers=Object.fromEntries(op.requestHeaders.map(h=>[h.name,h.value]));const response=await fetch(url,{method:'PUT',headers,body:data.subarray(op.offset,op.offset+op.length),redirect:'error',signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('Apple image part upload failed HTTP '+response.status);
    }
    shot=(await api('PATCH','/v1/appScreenshots/'+shot.id,{data:{type:'appScreenshots',id:shot.id,attributes:{uploaded:true,sourceFileChecksum:md5}}})).data;
   }
   row.uploaded.push({id:shot.id,fileName:name,sha256:file.sha256});console.log('Actual screenshot uploaded: '+device+' '+index);
  }
  if(apply){const all=(await api('GET','/v1/appScreenshotSets/'+set.id+'/appScreenshots?limit=50')).data;
   for(const x of row.uploaded){const found=all.find(s=>s.id===x.id);x.state=found?.attributes.assetDeliveryState?.state;if(x.state!=='COMPLETE')throw Error('Screenshots still processing; safely re-run after completion, no extra upload');}
   // Delete only old screenshot REFERENCES after all new assets are COMPLETE.
   for(const old of before.filter(x=>!x.attributes.fileName.startsWith('29_'))){await api('DELETE','/v1/appScreenshots/'+old.id);row.oldReferencesRemoved.push(old.id);}
   const final=(await api('GET','/v1/appScreenshotSets/'+set.id+'/appScreenshots?limit=50')).data;if(final.length!==5||final.some(x=>!row.uploaded.some(u=>u.id===x.id)||x.attributes.assetDeliveryState?.state!=='COMPLETE'))throw Error('Final screenshot readback mismatch');row.verified=true;
  }
 }}finally{fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n');}
 console.log(JSON.stringify({appId:APP,source,sets:proof.sets.map(s=>({device:s.device,screenshots:s.uploaded.length,verified:s.verified}))}));
})().catch(e=>{console.error(e.message);if(e.details)console.error(JSON.stringify(e.details));process.exitCode=1;});
