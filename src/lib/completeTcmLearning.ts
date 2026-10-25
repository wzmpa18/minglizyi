'use client';
import {checkUpdates,downloadPack,fetchManifest,loadPackContent,loadJsonPack,needsUserConfirmation} from './offlinePackClient';
import {validateLearningBundle,readLearningBundleFile} from './learningBundleCodec';
import {activateOfflinePack} from './storageManager';
import {CLIENT_VERSION} from './releaseFeatures';
import {validateMedicalLibrary,retainInstalledMedicalLibrary} from './medicalStudyLibrary';
import {EDITION_PACKS,retainedEditionPack} from './retainedTcmEditions';
import {isCompatibleTcmEditionPack} from './tcmEditionPack';
import {installStudyMediaCatalogue,prepareStudyImages,releaseStudyMediaReader} from './studyMedia';
import {validateTcmStructuredPack,retainedTcmStructuredPack} from './tcmStructuredContent';
import {writeOfflineFile} from './durableOfflineStore';
export const COMPLETE_TCM_ID='tcm-learning-complete';
let active:Promise<void>|undefined;
async function validate(bytes:ArrayBuffer,version:string){
 const m=await validateLearningBundle(bytes,COMPLETE_TCM_ID,version);
 const json=async(id:string)=>{const row=m.members.find(x=>x.packId===id);if(!row)throw Error('完整资料缺少板块：'+id);return JSON.parse(new TextDecoder().decode(await readLearningBundleFile(bytes,row.entryPath,row)));};
 validateMedicalLibrary(await json('medical-study-library'));
 for(const id of EDITION_PACKS)if(!isCompatibleTcmEditionPack(await json(id),[]))throw Error('原典内容格式无效');
 validateTcmStructuredPack(await json('tcm-herbs'),'tcm-herbs',[]);
 validateTcmStructuredPack(await json('tcm-formulas'),'tcm-formulas',[]);
 return m;
}
/** A single public archive; paid 3D resources remain separate entitlement-controlled objects. */
export function prepareCompleteTcm(progress?:(message:string)=>void):Promise<void>{
 if(active)return active;
 active=(async()=>{
  const manifest=await fetchManifest();if(!manifest)throw Error('暂时无法检查资料更新，原有离线内容保留');
  const plan=(await checkUpdates(CLIENT_VERSION,manifest)).find(x=>x.packId===COMPLETE_TCM_ID);
  if(!plan||plan.action==='INCOMPATIBLE')throw Error('完整中医资料包尚未就绪，原有资料保留');
  if(plan.action!=='UP_TO_DATE'){
   if(needsUserConfirmation(plan.manifestPack)&&!window.confirm(`完整中医学习资料约 ${(plan.manifestPack.size/1048576).toFixed(1)} MB，是否使用当前网络下载？`))throw Error('已取消，原资料保留');
   const result=await downloadPack(plan.manifestPack,(done,total)=>progress?.(`正在下载中医资料 ${Math.min(100,Math.round(done/Math.max(total,1)*100))}%`),async bytes=>(await validate(bytes,plan.manifestPack.version)).members);
   if(!result.ok)throw Error(result.error||'资料下载尚未完成');
  }
  const bytes=await loadPackContent(COMPLETE_TCM_ID);if(!bytes)throw Error('完整资料未保存成功');
  const catalogue=await validate(bytes,plan.manifestPack.version);
  // Also repairs an archive installed by an older downloader without virtual child indexes.
  await activateOfflinePack(COMPLETE_TCM_ID,plan.manifestPack.version,plan.manifestPack.sha256,bytes,catalogue.members);
  for(const child of catalogue.members)window.dispatchEvent(new CustomEvent('offline-pack-installed',{detail:{packId:child.packId}}));
  for(const id of EDITION_PACKS){progress?.('正在保存整本原典');if(!await retainedEditionPack(id,[],true))throw Error('原典保存尚未完成');}
  await retainInstalledMedicalLibrary((done,total)=>progress?.(`正在保存药穴出处 ${done}/${total}`));
  for(const id of ['tcm-herbs','tcm-formulas'] as const){const source=await loadJsonPack(id),saved=await retainedTcmStructuredPack(id,[]);if(!saved||JSON.stringify(source)!==JSON.stringify(saved))throw Error('药材或方剂保存尚未完成');}
  await installStudyMediaCatalogue(await loadJsonPack('tcm-study-media'),path=>readLearningBundleFile(bytes,path.replace(/^\//,'')));
  try{await prepareStudyImages((done,total)=>progress?.(`正在保存原图 ${done}/${total}`));}finally{releaseStudyMediaReader();}
  await writeOfflineFile('tcm-complete-ready',{version:catalogue.version,sha256:plan.manifestPack.sha256,preparedAt:Date.now()});
 })().finally(()=>{active=undefined;});
 return active;
}
