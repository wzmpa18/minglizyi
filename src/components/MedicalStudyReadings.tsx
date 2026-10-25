'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {StudyIllustration} from './StudyIllustration';
import {medicalSubject,type SubjectReading} from '@/lib/medicalStudyLibrary';
export function MedicalStudyReadings({subject}:{subject:string}){
  const [reading,setReading]=useState<SubjectReading|null>(null);
  const [filter,setFilter]=useState('all');
  const [imagePage,setImagePage]=useState(0);
  useEffect(()=>{let live=true;setReading(null);setFilter('all');setImagePage(0);const load=()=>{void medicalSubject(subject).then(value=>{if(live)setReading(value);}).catch(()=>{});};load();window.addEventListener('medical-study-ready',load);return()=>{live=false;window.removeEventListener('medical-study-ready',load);};},[subject]);
  return <section aria-label="倪师课件与各家文献对照" style={{margin:12,padding:14,borderRadius:14,background:'white',color:'#333',fontSize:13,lineHeight:1.8}}>
    <h2 style={{fontSize:15,color:'#7B2FBE'}}>原图与经典资料</h2>
    {!reading?<p>可在<Link href="/offline/">离线中心准备文献与图片</Link>，保存后无需联网即可阅读。</p>:<>
      {reading.persisted===false&&<p>本页资料可读，但手机暂未保存成功，请在离线中心重试。</p>}
      {reading.retainedPreviousVersion&&<p>更新资料尚未通过校验，当前继续显示已保存的原资料。</p>}
      {reading.region&&<p style={{fontSize:12}}>原书部位：{reading.region}。同名异位条目按部位分开。</p>}
      <details style={{color:'#777',fontSize:11}}><summary>资料与版本说明</summary><p>原典、讲课整理和资料摘要分别标明；同段出现不自动代表配伍或治疗方案，定位与版本差异按原页对照。</p></details>
      {reading.illustrations?.slice(imagePage*4,imagePage*4+4).map(image=><StudyIllustration key={image.path} {...image} credit={image.sourceInfo.author+' · 《'+image.sourceInfo.title+'》'}/>)}
      {(reading.illustrations?.length||0)>4&&<div style={{display:'flex',gap:8,alignItems:'center',fontSize:12}}>
        <button disabled={!imagePage} onClick={()=>setImagePage(page=>Math.max(0,page-1))}>上一组原页</button>
        <span>{imagePage*4+1}–{Math.min(imagePage*4+4,reading.illustrations!.length)} / {reading.illustrations!.length}页</span>
        <button disabled={(imagePage+1)*4>=reading.illustrations!.length} onClick={()=>setImagePage(page=>page+1)}>下一组原页</button>
      </div>}
      {!!reading.passages.length&&<div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{[['all','全部出处'],['ni','倪师课程'],['combination_context','配伍与配穴相关'],['caution_context','禁忌相关']].map(([value,label])=><button key={value} onClick={()=>setFilter(value)} aria-pressed={filter===value} style={{padding:'6px 8px',border:'1px solid #ddd',borderRadius:7,background:filter===value?'#eee3fa':'white'}}>{label}</button>)}</div>}
      {!reading.passages.length&&<p>{reading.illustrations?.length?'已收录对应文献原页，主治、配穴及版本差异请放大对照原文；未将未核对的识别稿冒充已审校文字。':'目前收录来源未核得本条对应段落，未移用其他药穴的见解。'}</p>}
      {reading.passages.filter(entry=>filter==='all'||(filter==='ni'?entry.source.startsWith('ni-')||entry.sourceInfo.author.includes('倪海厦'):entry.topic===filter)).map((entry,index)=><details key={entry.sha256+index} open={index===0} style={{borderTop:'1px solid #eee',padding:'8px 0'}}>
        <summary style={{fontSize:12}}>{entry.sourceInfo.kind==='LECTURE_TRANSCRIPT'?'倪海厦老师讲课（课件整理）':entry.sourceInfo.kind==='COMMUNITY_COURSE_NOTES'?'倪海厦老师讲课（社区学习笔记）':entry.sourceInfo.author} · 《{entry.sourceInfo.title}》</summary>
        <p style={{fontSize:12,color:'#666'}}>{entry.sourceInfo.kind==='LECTURE_TRANSCRIPT'?'课程文字整理':entry.sourceInfo.kind==='COMMUNITY_COURSE_NOTES'?'公开课程学习笔记，非倪师著作逐字原文':entry.sourceInfo.kind==='STUDY_REFERENCE'?'资料原文，版本见出处':'原典录文'} · {entry.chapterTitle}{entry.presentation==='EDITORIAL_SUMMARY'?' · 资料摘要，非逐字引文':<> · 第{entry.lineStart}–{entry.lineEnd}行</>}</p>
        {entry.presentation==='EDITORIAL_SUMMARY'?<p style={{whiteSpace:'pre-wrap'}}>{entry.text}</p>:<blockquote style={{margin:'8px 0',whiteSpace:'pre-wrap'}}>{entry.text.replace(/^#{1,6}\s*/gm,'')}</blockquote>}
        {entry.mappingNote&&<p style={{fontSize:12,color:'#666'}}>{entry.mappingNote}</p>}
        {entry.sourceInfo.kind==='CLASSIC_ORIGINAL'&&entry.sourceInfo.inAppBook!==false&&<Link href={'/zhongyi/classic?book='+encodeURIComponent(entry.source)+'&chapter='+encodeURIComponent(entry.chapter)}>阅读已收录篇章 →</Link>}
        {entry.sourceInfo.url&&<p><a href={entry.sourceInfo.url} target="_blank" rel="noopener noreferrer">核对来源版本 ↗</a></p>}
        {entry.sourceInfo.license&&typeof entry.sourceInfo.license==='string'&&<p style={{fontSize:11,color:'#777'}}>{entry.sourceInfo.kind==='STUDY_REFERENCE'?'来源说明':'资料许可'}：{entry.sourceInfo.license}{entry.sourceInfo.kind==='COMMUNITY_COURSE_NOTES'&&<> · <a href="/legal/medical-study-notes-license.txt">查看完整许可</a></>}</p>}
      </details>)}
    </>}
  </section>;
}
