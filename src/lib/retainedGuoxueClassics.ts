'use client';
import classics from '@/data/guoxueClassics.json';
import {isCompatibleGuoxuePack} from './classicReading';
import {loadJsonPack} from './offlinePackClient';
import {readOfflineFile,writeOfflineFile} from './durableOfflineStore';
export type ReadingBook=(typeof classics.books)[number];
interface Pack {schema:'yandao.guoxue.classics.v1';version:string;notice:string;books:ReadingBook[]}
const sha=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(x=>x.toString(16).padStart(2,'0')).join('');
export async function retainedGuoxueClassics(id:'guoxue-classics-approved'|'yixue-classics-library',strict=false):Promise<Pack|null>{
 const incoming=await loadJsonPack<Pack>(id).catch(()=>null);
 if(isCompatibleGuoxuePack(incoming)&&incoming){
  try{
   const records=[];
   for(const book of incoming.books){const digest=await sha(book),key='reading-book-'+id+'-'+digest;let saved=await readOfflineFile<ReadingBook>(key).catch(()=>null);if(!saved||await sha(saved)!==digest){await writeOfflineFile(key,book);saved=await readOfflineFile<ReadingBook>(key);}if(!saved||await sha(saved)!==digest)throw Error('典籍正文保存读回未通过');records.push({key,digest});}
   await writeOfflineFile('reading-books-head-'+id,{version:incoming.version,notice:incoming.notice,records});return incoming;
  }catch(error){if(strict)throw error;}
 }
 const head=await readOfflineFile<{version:string;notice:string;records:Array<{key:string;digest:string}>}>('reading-books-head-'+id).catch(()=>null);
 if(!head||!Array.isArray(head.records)||head.records.length>200)return null;
 const books:ReadingBook[]=[];
 for(const row of head.records){if(!/^[a-f0-9]{64}$/.test(row.digest)||row.key!=='reading-book-'+id+'-'+row.digest)return null;const book=await readOfflineFile<ReadingBook>(row.key).catch(()=>null);if(!book||await sha(book)!==row.digest)return null;books.push(book);}
 const pack:Pack={schema:'yandao.guoxue.classics.v1',version:head.version,notice:head.notice,books};return isCompatibleGuoxuePack(pack)?pack:null;
}
