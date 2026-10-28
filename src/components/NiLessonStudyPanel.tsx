'use client';
import {useMemo} from 'react';
import type {NiCourse,NiCourseChapter} from '@/lib/niTeacherCourses';
import {buildNiLessonStudy,redactNiPrivateContacts,type NiSourceAnchor} from '@/lib/niLessonStudy';

const action={border:'1px solid #ded3e7',borderRadius:8,padding:'7px 10px',background:'white',color:'#66368b',fontSize:13,cursor:'pointer'} as const;
export function NiLessonStudyPanel({course,chapter,onSource,onAnnotate}:{course:NiCourse;chapter:NiCourseChapter;onSource:(anchor:NiSourceAnchor)=>void;onAnnotate:(anchor:NiSourceAnchor)=>void}){
 const study=useMemo(()=>buildNiLessonStudy(course,chapter),[course,chapter]);
 return <section aria-label="原课摘记与复习" style={{marginTop:18}}>
  <p style={{fontSize:12,color:'#827486',lineHeight:1.8}}>原课摘记 · 保留原句与出处；下列阅读提问不新增诊疗结论。</p>
  <details style={{margin:'14px 0',lineHeight:1.9,fontSize:14}}><summary style={{cursor:'pointer',fontWeight:600}}>本课目标与阅读准备</summary><ul>{study.goals.map(text=><li key={text}>{text}</li>)}</ul><strong>阅读准备</strong><ul>{study.prerequisites.map(text=><li key={text}>{text}</li>)}</ul></details>
  <h3 style={{fontSize:18,margin:'20px 0 12px'}}>本节要点</h3>
  {study.points.map((point,index)=><section key={point.id} style={{borderLeft:'3px solid #a47ac2',padding:'4px 0 8px 12px',margin:'12px 0'}}><strong style={{fontSize:15}}>{index+1}. {point.label}</strong><small style={{marginLeft:9,color:'#8b7d8d'}}>{point.kind==='CLASSIC_QUOTE'?'原课所引原文':point.kind==='LECTURE_QUOTE'?'讲课原句':'原课摘录'}</small><blockquote style={{fontSize:16,lineHeight:1.95,margin:'8px 0',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{point.anchor.quote}</blockquote><div style={{display:'flex',gap:8}}><button type="button" style={action} onClick={()=>onSource(point.anchor)}>对照原文</button><button type="button" style={action} onClick={()=>onAnnotate(point.anchor)}>摘录并批注</button></div></section>)}
  {study.points.length<3&&<p style={{fontSize:12,color:'#827486'}}>本节可直接定位的摘录不足三条，按实际内容展示；可连同前后节研读。</p>}
  <details style={{margin:'18px 0',fontSize:14,lineHeight:1.9}}><summary style={{cursor:'pointer',fontWeight:600}}>本节结构与前后联系</summary><ol>{study.structure.map((item,index)=><li key={index}><button style={{...action,border:0,padding:'3px 0',textAlign:'left'}} onClick={()=>onSource(item.anchor)}>{item.label} → 查看对应原文</button></li>)}</ol><strong>带着这些问题继续阅读</strong><ul>{study.openQuestions.map(text=><li key={text}>{text}</li>)}</ul></details>
  {!!study.terms.length&&<details style={{margin:'18px 0',fontSize:14,lineHeight:1.9}}><summary style={{cursor:'pointer',fontWeight:600}}>原文用语与语境</summary><dl>{study.terms.map(item=><div key={item.term} style={{margin:'14px 0'}}><dt><strong>{item.term}</strong></dt><dd style={{margin:'4px 0',color:'#6d6071'}}>{item.explanation}</dd><dd style={{margin:'4px 0'}}>{item.context.quote}<br/><button type="button" style={action} onClick={()=>onSource(item.context)}>回到原句</button></dd></div>)}</dl></details>}
  {!!study.examples.length&&<details style={{margin:'18px 0',fontSize:14,lineHeight:1.9}}><summary style={{cursor:'pointer',fontWeight:600}}>原课举例</summary>{study.examples.map((item,index)=><blockquote key={index} style={{margin:'12px 0'}}>{item.quote}<br/><button type="button" style={action} onClick={()=>onSource(item)}>查看例子的上下文</button></blockquote>)}</details>}
  <details style={{margin:'18px 0',fontSize:14,lineHeight:1.9}}><summary style={{cursor:'pointer',fontWeight:600}}>一页复习摘记</summary><ol>{study.reviewSummary.map((item,index)=><li key={index} style={{marginBottom:12}}>{item.quote}<br/><button type="button" style={action} onClick={()=>onSource(item)}>核对出处</button></li>)}</ol></details>
  <h3 style={{fontSize:18,margin:'22px 0 12px'}}>本节知识点自测</h3>
  <p style={{fontSize:12,color:'#827486',lineHeight:1.8}}>根据课件原有讲次或篇目提出复述题；参考内容直接取自本课原文，不生成未经核实的选择题答案。先自己整理，再展开课件核对，并可摘录到学习笔记。</p>
  {study.knowledgePrompts.map((item,index)=><details key={item.id} style={{border:'1px solid #e5ddeb',borderRadius:10,padding:12,margin:'12px 0'}}><summary style={{cursor:'pointer',fontSize:15,lineHeight:1.8,fontWeight:600}}>{index+1}. {item.prompt}</summary><blockquote style={{fontSize:15,lineHeight:1.9,margin:'10px 0',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{redactNiPrivateContacts(item.answer.quote)}</blockquote><div style={{display:'flex',gap:8}}><button type="button" style={action} onClick={()=>onSource(item.answer)}>核对完整原文</button><button type="button" style={action} onClick={()=>onAnnotate(item.answer)}>摘录并写学习笔记</button></div></details>)}
 </section>;
}
