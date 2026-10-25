'use client';
import {useEffect,useState} from 'react';
import {medicalSubject,type SubjectReading} from '@/lib/medicalStudyLibrary';
export function MedicalStudyReadings({subject}:{subject:string}){
  const [reading,setReading]=useState<SubjectReading|null>(null);
  const [filter,setFilter]=useState('all');
  useEffect(()=>{let live=true;const load=()=>{void medicalSubject(subject).then(value=>{if(live)setReading(value);}).catch(()=>{});};load();window.addEventListener('medical-study-ready',load);return()=>{live=false;window.removeEventListener('medical-study-ready',load);};},[subject]);
  return <section aria-label="倪师课件与各家文献对照" style={{margin:12,padding:14,borderRadius:14,background:'white',color:'#333',fontSize:13,lineHeight:1.8}}>
    <h2 style={{fontSize:16,color:'#7B2FBE'}}>倪师课件与各家文献对照</h2>
    {!reading?<p>可在<a href="/offline/">离线中心准备文献与图片</a>，保存后无需联网即可阅读。</p>:<>
      {reading.persisted===false&&<p>本页资料可读，但手机暂未保存成功，请在离线中心重试。</p>}
      <p style={{color:'#666',fontSize:12}}>原典、课程整理分别标明。以下为包含本条名称的相关段落；不把同段出现的药穴自动推断为配伍或治疗方案。</p>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{[['all','全部出处'],['ni','倪师课程'],['combination_context','配伍与配穴相关'],['caution_context','禁忌相关']].map(([value,label])=><button key={value} onClick={()=>setFilter(value)} aria-pressed={filter===value} style={{padding:'6px 8px',border:'1px solid #ddd',borderRadius:7,background:filter===value?'#eee3fa':'white'}}>{label}</button>)}</div>
      {!reading.passages.length&&<p>目前收录来源未核得本条对应段落，未移用其他药穴的见解。</p>}
      {reading.passages.filter(entry=>filter==='all'||(filter==='ni'?entry.sourceInfo.kind!=='CLASSIC_ORIGINAL':entry.topic===filter)).map((entry,index)=><details key={entry.sha256+index} open={index===0} style={{borderTop:'1px solid #eee',padding:'8px 0'}}>
        <summary>{entry.sourceInfo.author} · 《{entry.sourceInfo.title}》</summary>
        <p style={{fontSize:12,color:'#666'}}>{entry.sourceInfo.kind==='LECTURE_TRANSCRIPT'?'课程文字整理':entry.sourceInfo.kind==='COMMUNITY_COURSE_NOTES'?'公开课程学习笔记，非倪师著作逐字原文':'原典录文'} · {entry.chapterTitle} · 第{entry.lineStart}–{entry.lineEnd}行</p>
        <blockquote style={{margin:'8px 0',whiteSpace:'pre-wrap'}}>{entry.text.replace(/^#{1,6}\s*/gm,'')}</blockquote>
        {entry.sourceInfo.kind==='CLASSIC_ORIGINAL'&&<a href={'/zhongyi/classic?book='+encodeURIComponent(entry.source)+'&chapter='+encodeURIComponent(entry.chapter)}>阅读已收录篇章 →</a>}
        {entry.sourceInfo.url&&<p><a href={entry.sourceInfo.url} target="_blank" rel="noopener noreferrer">核对来源版本 ↗</a></p>}
        {entry.sourceInfo.license&&typeof entry.sourceInfo.license==='string'&&<p style={{fontSize:11,color:'#777'}}>资料许可：{entry.sourceInfo.license}{entry.sourceInfo.kind==='COMMUNITY_COURSE_NOTES'&&<> · <a href="/legal/medical-study-notes-license.txt">查看完整许可</a></>}</p>}
      </details>)}
    </>}
  </section>;
}
