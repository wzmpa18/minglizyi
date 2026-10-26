'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {StudyIllustration} from './StudyIllustration';
import {medicalSubject,type SubjectReading} from '@/lib/medicalStudyLibrary';
import {getAcupointByCode} from '@/algorithm-core/modules/tcm/meridians';
import {isDirectAcupointPassage} from '@/lib/acupointOverview';
export function MedicalStudyReadings({subject,reading:supplied,mode='all',loading=false}:{subject:string;reading?:SubjectReading|null;mode?:'all'|'illustrations'|'text';loading?:boolean}){
  const [loaded,setReading]=useState<SubjectReading|null>(null);
  const reading=supplied===undefined?loaded:supplied;
  const [filter,setFilter]=useState('all');
  const [imagePage,setImagePage]=useState(0);
  useEffect(()=>{let live=true;setReading(null);setFilter('all');setImagePage(0);if(supplied!==undefined)return()=>{live=false;};const load=()=>{void medicalSubject(subject).then(value=>{if(live)setReading(value);}).catch(()=>{});};load();window.addEventListener('medical-study-ready',load);return()=>{live=false;window.removeEventListener('medical-study-ready',load);};},[subject,supplied]);
  const point=subject.startsWith('point:')?getAcupointByCode(subject.slice(6)):undefined;
  const passages=reading?.passages.filter(entry=>!point||isDirectAcupointPassage(point,entry))||[];
  if(mode==='illustrations'&&!reading?.illustrations?.length)return <section aria-label="定位图文" style={{margin:12,padding:14,borderRadius:12,background:'white',fontSize:13,color:'#756879'}}>{loading?'正在读取定位图文…':!reading?<Link href="/offline/">保存完整中医资料，查看已收录图谱 →</Link>:'本条暂未收录独立定位原图，可对照下方经络动图及文献定位。'}</section>;
  return <section aria-label="倪师课件与各家文献对照" style={{margin:12,padding:14,borderRadius:14,background:'white',color:'#333',fontSize:13,lineHeight:1.8}}>
    <h2 style={{fontSize:17,color:'#7B2FBE'}}>{mode==='illustrations'?'定位图文':mode==='text'?'各家经典与倪师讲课':'原图与经典资料'}</h2>
    {!reading?<p>可在<Link href="/offline/">离线中心准备文献与图片</Link>，保存后无需联网即可阅读。</p>:<>
      {reading.persisted===false&&<p>本页资料可读，但手机暂未保存成功，请在离线中心重试。</p>}
      {reading.retainedPreviousVersion&&<p>更新资料尚未通过校验，当前继续显示已保存的原资料。</p>}
      {reading.region&&<p style={{fontSize:12}}>原书部位：{reading.region}。同名异位条目按部位分开。</p>}
      {mode!=='illustrations'&&<details style={{color:'#777',fontSize:11}}><summary>资料与版本说明</summary><p>原典、讲课整理和资料摘要分别标明；定位与版本差异按原页对照。</p><Link href="/zhongyi/ni-study/">倪师自学专区 →</Link></details>}
      {mode!=='text'&&reading.illustrations?.slice(imagePage*4,imagePage*4+4).map(image=><StudyIllustration key={image.path} {...image} credit={image.sourceInfo.author+' · 《'+image.sourceInfo.title+'》'}/>)}
      {mode!=='text'&&(reading.illustrations?.length||0)>4&&<div style={{display:'flex',gap:8,alignItems:'center',fontSize:12}}>
        <button disabled={!imagePage} onClick={()=>setImagePage(page=>Math.max(0,page-1))}>上一组原页</button>
        <span>{imagePage*4+1}–{Math.min(imagePage*4+4,reading.illustrations!.length)} / {reading.illustrations!.length}页</span>
        <button disabled={(imagePage+1)*4>=reading.illustrations!.length} onClick={()=>setImagePage(page=>page+1)}>下一组原页</button>
      </div>}
      {mode!=='illustrations'&&!!passages.length&&<div style={{display:'flex',gap:6,flexWrap:'wrap',margin:'12px 0'}}>{[['all','全部出处'],['ni','倪师课程'],['combination_context','配穴'],['caution_context','禁忌']].map(([value,label])=><button key={value} onClick={()=>setFilter(value)} aria-pressed={filter===value} style={{padding:'6px 8px',border:'1px solid #ddd',borderRadius:7,background:filter===value?'#eee3fa':'white'}}>{label}</button>)}</div>}
      {mode!=='illustrations'&&passages.filter(entry=>filter==='all'||(filter==='ni'?entry.source.startsWith('ni-')||entry.sourceInfo.author.includes('倪海厦'):entry.topic===filter)).map((entry,index)=><details key={entry.sha256+index} style={{borderTop:'1px solid #eee',padding:'12px 0'}}>
        <summary style={{fontSize:14,cursor:'pointer'}}>{entry.sourceInfo.kind==='LECTURE_TRANSCRIPT'?'倪海厦老师讲课':entry.sourceInfo.kind==='COMMUNITY_COURSE_NOTES'?'倪师课程学习笔记':entry.sourceInfo.author} · 《{entry.sourceInfo.title}》</summary>
        <p style={{fontSize:11,color:'#827986'}}>{entry.chapterTitle}{entry.presentation==='EDITORIAL_SUMMARY'?' · 学习摘要':null}</p>
        {entry.presentation==='EDITORIAL_SUMMARY'?<p style={{whiteSpace:'pre-wrap',fontSize:16,lineHeight:1.9}}>{entry.text}</p>:<blockquote style={{margin:'8px 0',whiteSpace:'pre-wrap',fontSize:16,lineHeight:1.9}}>{entry.text.replace(/^#{1,6}\s*/gm,'')}</blockquote>}
        {entry.mappingNote&&<p style={{fontSize:12,color:'#666'}}>{entry.mappingNote}</p>}
        {entry.sourceInfo.kind==='CLASSIC_ORIGINAL'&&entry.sourceInfo.inAppBook!==false&&<Link href={'/zhongyi/classic?book='+encodeURIComponent(entry.source)+'&chapter='+encodeURIComponent(entry.chapter)}>阅读已收录篇章 →</Link>}
        {entry.sourceInfo.url&&<p style={{fontSize:11,color:'#777'}}>来源版本：{entry.sourceInfo.title} · {entry.sourceInfo.author}</p>}
        {entry.sourceInfo.license&&typeof entry.sourceInfo.license==='string'&&<p style={{fontSize:11,color:'#777'}}>{entry.sourceInfo.kind==='STUDY_REFERENCE'?'来源说明':'资料许可'}：{entry.sourceInfo.license}{entry.sourceInfo.kind==='COMMUNITY_COURSE_NOTES'&&<> · <a href="/legal/medical-study-notes-license.txt">查看完整许可</a></>}</p>}
      </details>)}
    </>}
  </section>;
}
