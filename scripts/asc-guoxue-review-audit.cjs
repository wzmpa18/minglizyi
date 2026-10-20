'use strict';
// Only reads the Guoxue app; saves public state, never reviewer credentials.
const fs=require('node:fs');
const {createClient}=require('./lib/guoxueAscClient.cjs');
const APP='6807592575',VERSION='299afd61-88b3-4f82-b0dd-54847928f1e8';
const output=process.argv.find(a=>a.startsWith('--output='))?.slice(9);
(async()=>{
 const {api}=createClient();
 const app=(await api('GET','/v1/apps/'+APP)).data;
 const version=(await api('GET','/v1/appStoreVersions/'+VERSION+'?include=build,appStoreReviewDetail')).data;
 const proof={checkedAt:new Date().toISOString(),appId:APP,bundleId:app.attributes.bundleId,version:version.attributes,linkedBuild:version.relationships.build?.data,reviewLoginConfigured:false,localizations:[],iap:[],submissions:[]};
 const detail=(await api('GET','/v1/appStoreVersions/'+VERSION+'/appStoreReviewDetail')).data;
 proof.reviewLoginConfigured=Boolean(detail?.attributes.demoAccountName&&detail?.attributes.demoAccountPassword);
 proof.reviewDetailId=detail?.id;
 const locales=(await api('GET','/v1/appStoreVersions/'+VERSION+'/appStoreVersionLocalizations?limit=20')).data;
 for(const l of locales){
  const sets=(await api('GET','/v1/appStoreVersionLocalizations/'+l.id+'/appScreenshotSets?include=appScreenshots&limit=50')).data;
  const rows=[];
  for(const s of sets){const shots=(await api('GET','/v1/appScreenshotSets/'+s.id+'/appScreenshots?limit=50')).data;rows.push({id:s.id,display:s.attributes.screenshotDisplayType,shots:shots.map(x=>({id:x.id,...x.attributes,uploadOperations:undefined}))});}
  proof.localizations.push({id:l.id,locale:l.attributes.locale,screenshotSets:rows});
 }
 const products=(await api('GET','/v1/apps/'+APP+'/inAppPurchasesV2?limit=100')).data;
 proof.iap=products.map(x=>({id:x.id,...x.attributes}));
 const submissions=(await api('GET','/v1/reviewSubmissions?filter[app]='+APP+'&limit=20')).data;
 for(const s of submissions){const items=(await api('GET','/v1/reviewSubmissions/'+s.id+'/items?limit=50&include=appStoreVersion,inAppPurchaseVersion')).data;proof.submissions.push({id:s.id,...s.attributes,items});}
 if(output)fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n');
 console.log(JSON.stringify({...proof,localizations:proof.localizations.map(l=>({...l,screenshotSets:l.screenshotSets.map(s=>({...s,shots:s.shots.map(x=>({id:x.id,fileName:x.fileName,state:x.assetDeliveryState?.state}))}))}))}));
})().catch(e=>{console.error(e.message);if(e.details)console.error(JSON.stringify(e.details));process.exitCode=1;});
