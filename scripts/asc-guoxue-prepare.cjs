'use strict';
// Updates the existing Guoxue draft only. No formal submission or price writes.
const fs=require('node:fs');
const {createClient}=require('./lib/guoxueAscClient.cjs');
const APP='6807592575',VERSION='299afd61-88b3-4f82-b0dd-54847928f1e8';
const arg=n=>process.argv.find(a=>a.startsWith('--'+n+'='))?.slice(n.length+3),apply=process.argv.includes('--apply');
const build=arg('build'),output=arg('output');if(build!=='30')throw Error('This owner-authorized preparation is pinned to build 30');
const notes=`Version 25.0.115 (30) is a Chinese traditional-culture and source-literature learning app. Start with the learning home, original-text editions, chapter reading/listening, calendar, astronomy and traditional calculation practice. Chart tools remain visible as cultural study tools, not factual predictions or medical decisions.

Answers to the previous review questions: Account registration and basic learning are free. Payment is required only for optional paid learning memberships and AI learning credits, not to register or join a recruitment hierarchy. Monthly, quarterly and yearly plans are durations, not distributor ranks; a longer duration does not grant recruitment or commission privileges. This iOS edition has no referral/recruitment/commission/withdrawal UI, and Apple IAP delivery does not invoke the separate legacy referral commission engine. Purchases pay for digital learning access/quotas and AI learning usage. It is not a purchase-to-recruit scheme. Other channels' historical promotion functionality is not offered by this iOS product profile, consistently for all users rather than only reviewers.

Sign in using the existing review login fields to test membership, AI learning credits and adult community features. The exact review account is active and enabled for Apple Sandbox receipts. Profile > membership provides monthly/quarterly/yearly non-renewing memberships and a lifetime non-consumable. Profile > AI credits provides consumables. Use Apple IAP, not an external payment page. After purchase the signed Apple transaction is verified server-side and bound to the app account token; restore uses the same app account. Do not purchase twice if delivery is pending. Consumable recovery depends on the server account ledger; it is not a general StoreKit consumable restore claim. Existing prices and benefits are unchanged.

Tool, acupoint and source-learning discussions accept at most 500 graphemes of text, with reply, report, block, moderation and account deletion. Tongchen is voluntary, 18+, pseudonymous and requires mutual consent before messages. Birth conditions are not a compatibility guarantee; private charts and health records are not automatically searchable. No random anonymous chat. Private life records stay in a separately encrypted local vault; sharing requires preview and confirmation. The review account must opt in to any voluntary matching. Empty results are real, not fabricated users.

Medical pages are literature/reference education, not a medical device, diagnosis or prescription service. User experiences are distinct from cited sources. The 28 legacy meridian animations without confirmed redistribution permission are excluded from this build and replaced in the UI by attributed public-domain/open-license references or clearly labeled conceptual diagrams. These diagrams do not claim verified anatomical point coordinates. Licenses and source notices are accessible in-app and in the privacy policy. Astronomy/HYG and source-text attributions remain visible.

Genuine WidgetKit home/lock widgets and local notifications use supported system APIs and device permissions; refresh/delivery is system-managed. Location is user-initiated and manual location remains available. Four languages cover main navigation/buttons; classical text stays original. Real iPhone/iPad simulator captures and shared native storage checks passed; owner physical-device widget, notification and purchase-delivery/restore checks are still not fully recorded. No review-only hiding or remote substitution of unreviewed executable features.`;
(async()=>{const {api}=createClient({mutations:apply});if(notes.length>4000)throw Error('Review notes exceed Apple limit');const app=(await api('GET','/v1/apps/'+APP)).data;if(app.attributes.bundleId!=='com.yandaoguoxue.app')throw Error('Wrong app');
 const version=(await api('GET','/v1/appStoreVersions/'+VERSION)).data;if(version.attributes.versionString!=='25.0.115'||version.attributes.appStoreState!=='PREPARE_FOR_SUBMISSION')throw Error('Draft is not uniquely editable; stop before any duplicate submission');
 const builds=(await api('GET','/v1/builds?filter[app]='+APP+'&filter[version]=30&include=preReleaseVersion&limit=20')).data;
 if(builds.length!==1||builds[0].attributes.processingState!=='VALID'||builds[0].attributes.expired)throw Error('Build30 not ready; do not upload again');
 const candidate=builds[0],pre=(await api('GET','/v1/builds/'+candidate.id+'/preReleaseVersion')).data;if(pre.attributes.version!=='25.0.115')throw Error('Wrong build train');
 const detail=(await api('GET','/v1/appStoreVersions/'+VERSION+'/appStoreReviewDetail')).data;
 if(!detail?.attributes.demoAccountName||!detail.attributes.demoAccountPassword)throw Error('Review login missing');
 const proof={appId:APP,build,buildId:candidate.id,checkedAt:new Date().toISOString(),apply,formalSubmission:false,rightsBefore:app.attributes.contentRightsDeclaration,changes:[]};
 if(apply){
  await api('PATCH','/v1/appStoreVersions/'+VERSION+'/relationships/build',{data:{type:'builds',id:candidate.id}});proof.changes.push('linked exact VALID30');
  await api('PATCH','/v1/appStoreReviewDetails/'+detail.id,{data:{type:'appStoreReviewDetails',id:detail.id,attributes:{notes}}});proof.changes.push('accurate review notes; login fields preserved');
  await api('PATCH','/v1/apps/'+APP,{data:{type:'apps',id:APP,attributes:{contentRightsDeclaration:'USES_THIRD_PARTY_CONTENT'}}});proof.changes.push('declared third-party open-license source content');
  const products=(await api('GET','/v1/apps/'+APP+'/inAppPurchasesV2?limit=100')).data;if(products.length!==8||products.some(p=>!p.attributes.productId.startsWith('com.yandaoguoxue.app.')))throw Error('Unexpected product set; no prices changed');
  for(const p of products){await api('PATCH','/v2/inAppPurchases/'+p.id,{data:{type:'inAppPurchases',id:p.id,attributes:{reviewNote:'Version25.0.115(30). Access from Profile > membership or AI credits after signing in using the app review login. That exact account is enabled for server-verified Apple Sandbox transactions. Purchase delivery is bound to the signed appAccountToken; use the same app account for restore. Existing product ID, price and benefits unchanged. Real app screenshot attached. Physical purchase delivery/restore acceptance is not claimed by simulator screenshots.'}}});}
  proof.changes.push('8 existing IAP review notes updated without price/rights changes');
  const linked=(await api('GET','/v1/appStoreVersions/'+VERSION+'/build')).data;if(linked.id!==candidate.id)throw Error('Build linkage readback mismatch');
  proof.verified=true;
 }
 if(output)fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
})().catch(e=>{console.error(e.message);if(e.details)console.error(JSON.stringify(e.details));process.exitCode=1;});
