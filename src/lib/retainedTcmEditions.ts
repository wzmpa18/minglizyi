'use client';
import type { ClassicBook } from '@/algorithm-core/modules/tcm/classics';
import {getAllBooks} from '@/algorithm-core/modules/tcm/classics';
import {loadJsonPack,fetchManifest,checkUpdates,downloadPack,needsUserConfirmation} from './offlinePackClient';
import {readOfflineFile,writeOfflineFile} from './durableOfflineStore';
import {isCompatibleTcmEditionPack,type TcmEditionPack} from './tcmEditionPack';
import {CLIENT_VERSION} from './releaseFeatures';
export const EDITION_PACKS=['tcm-original-editions-approved','tcm-materia-originals'];
const digest=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(n=>n.toString(16).padStart(2,'0')).join('');
type RetainedBook={book:ClassicBook;sha256:string};
type Head={version:string;books:string[]};
export async function retainedEditionPack(id:string,baseline:ClassicBook[]=[],strict=false):Promise<TcmEditionPack|null>{
 if(!EDITION_PACKS.includes(id))throw Error('不支持的原典目录');
 const pack=await loadJsonPack<unknown>(id).catch(()=>null);
 if(isCompatibleTcmEditionPack(pack,baseline)){
  try{
   for(const book of pack.books){
    const record={book,sha256:await digest(JSON.stringify(book))},key='tcm-book-'+id+'-'+pack.version+'-'+book.id;
    await writeOfflineFile(key,record);
    const saved=await readOfflineFile<RetainedBook>(key);
    if(!saved||await digest(JSON.stringify(saved.book))!==record.sha256)throw Error('原典保存读回未通过，原有目录保留');
   }
   await writeOfflineFile('tcm-books-head-'+id,{version:pack.version,books:pack.books.map(b=>b.id)});
  }catch(error){if(strict)throw error;}
  return pack;
 }
 const head=await readOfflineFile<Head>('tcm-books-head-'+id).catch(()=>null);
 if(!head||!/^\d+\.\d+\.\d+$/.test(head.version)||!Array.isArray(head.books)||head.books.length>50||head.books.some(key=>!/^[a-z0-9_-]{1,100}$/.test(key)))return null;
 const books:ClassicBook[]=[];
 for(const key of head.books){const record=await readOfflineFile<RetainedBook>('tcm-book-'+id+'-'+head.version+'-'+key).catch(()=>null);if(!record||record.book?.id!==key||await digest(JSON.stringify(record.book))!==record.sha256)return null;books.push(record.book);}
 const retained={schema:'yandao.tcm.original-editions.v1',version:head.version,books};
 return isCompatibleTcmEditionPack(retained,baseline)?retained:null;
}
export async function prepareOriginalEditions(progress?:(done:number,total:number)=>void){
 const manifest=await fetchManifest();if(!manifest)throw Error('无法读取原典目录，原有资料保留');
 const plans=await checkUpdates(CLIENT_VERSION,manifest);const selected=EDITION_PACKS.map(id=>plans.find(p=>p.packId===id));
 if(selected.some(p=>!p||p.action==='INCOMPATIBLE'))throw Error('原典资料尚未全部就绪，请稍后重试');
 const pending=selected.filter(p=>p&&p.action!=='UP_TO_DATE');
 if(pending.some(p=>p&&needsUserConfirmation(p.manifestPack))&&!window.confirm('准备原典资料约需'+(pending.reduce((n,p)=>n+(p?.manifestPack.size||0),0)/1048576).toFixed(1)+' MB，是否继续？'))throw Error('已取消，原有资料保留');
 let done=0;
 for(const plan of selected){if(!plan)continue;
  const baseline=plan.packId==='tcm-original-editions-approved'?getAllBooks():[];
  if(plan.action!=='UP_TO_DATE'){const result=await downloadPack(plan.manifestPack,undefined,async bytes=>{if(!isCompatibleTcmEditionPack(JSON.parse(new TextDecoder().decode(bytes)),baseline))throw Error('原典结构校验失败');});if(!result.ok)throw Error(result.error||'原典下载未完成');}
  if(!await retainedEditionPack(plan.packId,baseline,true))throw Error('原典尚未保存成功');progress?.(++done,selected.length);
 }
 window.dispatchEvent(new CustomEvent('offline-pack-installed',{detail:{packId:'tcm-materia-originals'}}));
}
