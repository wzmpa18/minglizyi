'use client';
import {checkUpdates,downloadPack,fetchManifest,loadPackContent,loadJsonPack,needsUserConfirmation} from './offlinePackClient';
import {validateLearningBundle,readLearningBundleFile,validateLearningBundleMedia} from './learningBundleCodec';
import {activateOfflinePack} from './storageManager';
import {CLIENT_VERSION} from './releaseFeatures';
import {validateMedicalLibrary,retainInstalledMedicalLibrary} from './medicalStudyLibrary';
import {EDITION_PACKS,retainedEditionPack} from './retainedTcmEditions';
import {isCompatibleTcmEditionPack} from './tcmEditionPack';
import {installStudyMediaCatalogue,prepareStudyImages,releaseStudyMediaReader,validateStudyMedia} from './studyMedia';
import {validateTcmStructuredPack,retainedTcmStructuredPack} from './tcmStructuredContent';
import {writeOfflineFile} from './durableOfflineStore';
import {HERBS_DB} from '@/algorithm-core/modules/tcm/herbs';
import {FORMULAS_DB} from '@/algorithm-core/modules/tcm/formulas';
import {getMembershipStatus} from './membershipStore';
import {ANATOMY_BUNDLE_MEMBERS} from './anatomyLearningBundle';
import {installAcupointContentPack} from '@/algorithm-core/modules/tcm/meridians';
export const COMPLETE_TCM_ID='tcm-learning-complete';
let active:Promise<void>|undefined;
async function validate(bytes:ArrayBuffer,version:string){
 const m=await validateLearningBundle(bytes,COMPLETE_TCM_ID,version);
 const json=async(id:string)=>{const row=m.members.find(x=>x.packId===id);if(!row)throw Error('完整资料缺少板块：'+id);return JSON.parse(new TextDecoder().decode(await readLearningBundleFile(bytes,row.entryPath,row)));};
 const medical=validateMedicalLibrary(await json('medical-study-library'));
 const media=validateStudyMedia(await json('tcm-study-media'));
 validateLearningBundleMedia(m,media.records,Object.values(medical.subjects).flatMap(subject=>(subject.illustrations||[]).map(image=>image.path)));
 if(!installAcupointContentPack(await json('tcm-acupoints'),false))throw Error('经穴资料结构未通过检查，原有资料保留');
 for(const id of EDITION_PACKS)if(!isCompatibleTcmEditionPack(await json(id),[]))throw Error('原典内容格式无效');
 validateTcmStructuredPack(await json('tcm-herbs'),'tcm-herbs',HERBS_DB.map(row=>row.id));
 validateTcmStructuredPack(await json('tcm-formulas'),'tcm-formulas',FORMULAS_DB.map(row=>row.id));
 return m;
}
/** A single public archive; paid 3D resources remain separate entitlement-controlled objects. */
export function prepareCompleteTcm(progress?:(message:string)=>void):Promise<void>{
 if(active)return active;
 active=(async()=>{
  const manifest=await fetchManifest();if(!manifest)throw Error('暂时无法检查资料更新，原有离线内容保留');
  const plans=await checkUpdates(CLIENT_VERSION,manifest),plan=plans.find(x=>x.packId===COMPLETE_TCM_ID);
  if(!plan||plan.action==='INCOMPATIBLE')throw Error('完整中医资料包尚未就绪，原有资料保留');
  const member=getMembershipStatus();
  const models=member.isActive&&member.level!=='basic'?ANATOMY_BUNDLE_MEMBERS.map(id=>plans.find(x=>x.packId===id)):[];
  if(models.some(x=>!x||x.action==='INCOMPATIBLE'))throw Error('会员三维资料暂未全部就绪，已保存内容保留');
  const pending=[plan,...models.filter((x):x is NonNullable<typeof x>=>Boolean(x))].filter(x=>x.action!=='UP_TO_DATE');
  if(pending.some(x=>needsUserConfirmation(x.manifestPack))&&!window.confirm(`本次中医学习资料约 ${(pending.reduce((n,x)=>n+x.manifestPack.size,0)/1048576).toFixed(1)} MB，是否使用当前网络下载？`))throw Error('已取消，原资料保留');
  if(plan.action!=='UP_TO_DATE'){
   const result=await downloadPack(plan.manifestPack,(done,total)=>progress?.(`正在下载中医资料 ${Math.min(100,Math.round(done/Math.max(total,1)*100))}%`),async bytes=>(await validate(bytes,plan.manifestPack.version)).members);
   if(!result.ok)throw Error(result.error||'资料下载尚未完成');
  }
  let bytes:ArrayBuffer|undefined=(await loadPackContent(COMPLETE_TCM_ID))||undefined;if(!bytes)throw Error('完整资料未保存成功');
  const catalogue=await validate(bytes,plan.manifestPack.version);
  // Also repairs an archive installed by an older downloader without virtual child indexes.
  await activateOfflinePack(COMPLETE_TCM_ID,plan.manifestPack.version,plan.manifestPack.sha256,bytes,catalogue.members);
  for(const child of catalogue.members)window.dispatchEvent(new CustomEvent('offline-pack-installed',{detail:{packId:child.packId}}));
  for(const id of EDITION_PACKS){progress?.('正在保存整本原典');if(!await retainedEditionPack(id,[],true))throw Error('原典保存尚未完成');}
  await retainInstalledMedicalLibrary((done,total)=>progress?.(`正在保存药穴出处 ${done}/${total}`));
  for(const id of ['tcm-herbs','tcm-formulas'] as const){const source=await loadJsonPack(id),saved=await retainedTcmStructuredPack(id,[]);if(!saved||JSON.stringify(source)!==JSON.stringify(saved))throw Error('药材或方剂保存尚未完成');}
  await installStudyMediaCatalogue(await loadJsonPack('tcm-study-media'),path=>readLearningBundleFile(bytes!,path.replace(/^\//,'')));
  try{await prepareStudyImages((done,total)=>progress?.(`正在保存原图 ${done}/${total}`));}finally{releaseStudyMediaReader();bytes=undefined;}
  for(const model of models){
   if(!model||model.action==='UP_TO_DATE')continue;
   const validateModel=model.packId===ANATOMY_BUNDLE_MEMBERS[0]?async(raw:ArrayBuffer)=>{await(await import('./anatomy3dPack')).decodeAnatomyPack(raw);}:async(raw:ArrayBuffer)=>{await(await import('../components/anatomy-atlas/atlasPack')).decodeAtlas(raw);};
   const result=await downloadPack(model.manifestPack,(done,total)=>progress?.(`正在保存会员三维资料 ${Math.min(100,Math.round(done/Math.max(total,1)*100))}%`),validateModel);
   if(!result.ok)throw Error((result.error||'会员三维资料尚未完成')+'；正文和原图已保存，可重试补齐。');
  }
  await writeOfflineFile('tcm-complete-ready',{version:catalogue.version,sha256:plan.manifestPack.sha256,preparedAt:Date.now()});
 })().finally(()=>{active=undefined;});
 return active;
}
