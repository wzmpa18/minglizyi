'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {prepareCompleteTcm} from '@/lib/completeTcmLearning';
import {readOfflineFile} from '@/lib/durableOfflineStore';
export function MedicalPreparationCard(){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[ready,setReady]=useState(false);
 const [disk,setDisk]=useState('checking');
 useEffect(()=>{void readOfflineFile('tcm-complete-ready').then(value=>setReady(Boolean(value))).catch(()=>{});},[]);
 useEffect(()=>{let live=true;void(async()=>{try{
  const key='learning-storage-readback-check',expected={schema:1,synthetic:true,content:'offline-learning-storage-check'};
  const previous=await readOfflineFile<typeof expected>(key);
  if(!previous)await (await import('@/lib/durableOfflineStore')).writeOfflineFile(key,expected);
  const read=await readOfflineFile<typeof expected>(key);if(read?.content!==expected.content)throw Error('storage');
  if(live)setDisk('ready');
 }catch{if(live)setDisk('error');}})();return()=>{live=false;};},[]);
 async function prepare(){if(busy)return;setBusy(true);setMessage('正在准备文献资料…');try{
  await prepareCompleteTcm(setMessage);
  setReady(true);setMessage('文献与已收录原图已保存，可断网查看。未收录的单穴照片不会冒充已下载。');
 }catch(error){setMessage(error instanceof Error?error.message:'资料尚未全部保存，请重试；已保存内容保留');}finally{setBusy(false);}}
 return <section aria-label="中医文献与原图离线保存" style={{padding:16,margin:'12px 0',borderRadius:12,background:'white',color:'#333',lineHeight:1.8}}>
  <strong>完整中医学习资料包</strong><p style={{fontSize:13}}>一次下载已收录的药材、方剂、整本原典、药穴出处、28幅经络动图、经穴真人总图和董氏教材原页。所有账号均可下载正文与图谱，三维人体保留现有会员权益。</p>
  {disk==='ready'&&<p role="status" style={{fontSize:12,color:'#347546'}}>本机离线保存正常</p>}
  {disk==='error'&&<p role="status" style={{fontSize:12}}>手机存储暂不可写，在线阅读仍可继续。</p>}
  <p><Link href="/zhongyi/meridian/?acupoint=%E5%90%88%E8%B0%B7">查看动图与图片示例 · 合谷</Link></p>
  <button disabled={busy} onClick={()=>void prepare()} style={{padding:'10px 14px',border:0,borderRadius:8,background:'#7B2FBE',color:'white'}}>{busy?'正在保存…':ready?'检查并补齐学习资料':'一次保存文献与图片'}</button>
  {message&&<p role="status" style={{fontSize:13}}>{message}</p>}
 </section>;
}
