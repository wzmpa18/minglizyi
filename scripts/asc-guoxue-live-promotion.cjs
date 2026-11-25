'use strict';
const {createClient}=require('./lib/guoxueAscClient.cjs');
const {api}=createClient({mutations:true});
const appId='6807592575';
const versionString='25.0.124';
const promo={
 'zh-Hans':'用八字排盘看四柱，打开奇门遁甲九宫、紫微斗数十二宫或六爻卦盘，对照经典研习。也可查中医古籍与经络穴位，登录后按年免费阅读已收录的 2020—2025 年临床执业医师和助理医师真题及解析。',
 'zh-Hant':'查看八字四柱、奇門遁甲九宮、紫微斗數十二宮和六爻卦盤，對照經典研習。也可查閱中醫古籍與經絡穴位，登入後按年份免費閱讀已收錄的 2020—2025 年臨床執業及助理醫師考試真題與解析。',
 'en-US':'Explore BaZi, Liu Yao, Qi Men and Zi Wei charts, read Chinese medicine classics, and study collected 2020–2025 clinical exam papers and explanations after sign-in.',
 'en-GB':'Explore BaZi, Liu Yao, Qi Men and Zi Wei charts, read Chinese medicine classics, and study collected 2020–2025 clinical exam papers and explanations after sign-in.',
};
(async()=>{
 const app=(await api('GET','/v1/apps/'+appId)).data;
 if(app.attributes.bundleId!=='com.yandaoguoxue.app')throw Error('Unexpected app');
 const versions=(await api('GET',`/v1/apps/${appId}/appStoreVersions?filter[platform]=IOS&filter[versionString]=${versionString}&limit=20`)).data;
 if(versions.length!==1||versions[0].attributes.versionString!==versionString)throw Error('Target version not unique');
 const version=versions[0];
 const build=(await api('GET',`/v1/appStoreVersions/${version.id}/build`)).data;
 if(build.attributes.version!=='73')throw Error('Unexpected build');
 const localizations=(await api('GET',`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=50`)).data;
 const verified=[];
 for(const row of localizations){
  const locale=row.attributes.locale, promotionalText=promo[locale];
  if(!promotionalText)continue;
  if([...promotionalText].length>170)throw Error('Promotional text too long');
  const path='/v1/appStoreVersionLocalizations/'+row.id;
  if(row.attributes.promotionalText!==promotionalText)await api('PATCH',path,{data:{type:'appStoreVersionLocalizations',id:row.id,attributes:{promotionalText}}});
  const read=(await api('GET',path)).data.attributes;
  if(read.promotionalText!==promotionalText)throw Error('Readback mismatch');
  verified.push({locale,promotionalText,screenshotsKept:true});
 }
 if(!verified.some(r=>r.locale==='zh-Hans'))throw Error('Missing existing Simplified Chinese localization');
 console.log(JSON.stringify({appId,version:versionString,build:build.attributes.version,state:version.attributes.appStoreState,verified},null,2));
})().catch(e=>{console.error(e.message,JSON.stringify(e.details?.map(x=>({code:x.code,title:x.title}))||[]));process.exitCode=1;});
