'use client';
import {useEffect,useRef,useState} from 'react';
import type {NiCourse,NiCourseChapter} from '@/lib/niTeacherCourses';
import type {NiSourceAnchor} from '@/lib/niLessonStudy';
import {verifyNiSourceAnchor,redactNiPrivateContacts} from '@/lib/niLessonStudy';
import {addNiAnnotation,exportNiPersonalStudy,readNiAnnotations,readNiBookmarks,readNiPersonalNote,saveNiPersonalNote,setNiBookmark,type NiAnnotation,type NiPersonalNote} from '@/lib/niStudyNotebook';

const button={border:'1px solid #ded3e7',borderRadius:9,padding:'9px 12px',background:'white',color:'#66368b',fontSize:14,cursor:'pointer'} as const;
const input={width:'100%',padding:12,border:'1px solid #ddd3e4',borderRadius:10,background:'white',color:'#292524',fontSize:15,lineHeight:1.9} as const;
export function NiPrivateNotebook({scope,course,chapter,quote}:{scope:string;course:NiCourse;chapter:NiCourseChapter;quote:NiSourceAnchor|null}){
 const [text,setText]=useState(''),[record,setRecord]=useState<NiPersonalNote|null>(null),[annotations,setAnnotations]=useState<NiAnnotation[]>([]);
 const [ready,setReady]=useState(false),[message,setMessage]=useState(''),[saving,setSaving]=useState(false),[readAttempt,setReadAttempt]=useState(0),[bookmarked,setBookmarked]=useState(false);
 const [draftQuote,setDraftQuote]=useState<NiSourceAnchor|null>(null),[comment,setComment]=useState('');
 const revision=useRef(0),pending=useRef(false),live=useRef(true),section=useRef<HTMLElement>(null);
 useEffect(()=>{let active=true;live.current=true;setReady(false);void Promise.all([readNiPersonalNote(scope,chapter.id),readNiAnnotations(scope,chapter.id),readNiBookmarks(scope)]).then(([note,marks,favorites])=>{if(active){setRecord(note);setText(note?.text||'');setAnnotations(marks);setBookmarked(favorites.some(row=>row.chapterId===chapter.id));setReady(true);setMessage('');}}).catch(()=>{if(active){setMessage('暂时无法读取本机笔记，原内容保留');setReady(false);}});return()=>{active=false;live.current=false;};},[scope,chapter.id,readAttempt]);
 useEffect(()=>{if(quote&&verifyNiSourceAnchor(quote,course,chapter)){setDraftQuote(quote);setComment('');requestAnimationFrame(()=>section.current?.scrollIntoView({block:'start'}));}},[quote,course,chapter]);
 const run=async(work:()=>Promise<void>)=>{if(!ready||pending.current)return;pending.current=true;setSaving(true);try{await work();}catch(error){if(live.current)setMessage(error instanceof Error?error.message:'保存未完成，请保留输入后重试');}finally{pending.current=false;if(live.current)setSaving(false);}};
 const save=()=>run(async()=>{const snapshot=text,atRevision=revision.current;const next=await saveNiPersonalNote(scope,course,chapter,snapshot,record?.userNoteRevision||0);if(live.current){setRecord(next);setMessage(revision.current===atRevision?'笔记已保存本机':'新修改尚未保存');}});
 const saveMark=()=>run(async()=>{if(!draftQuote)return;const next=await addNiAnnotation(scope,course,chapter,draftQuote,comment);if(live.current){setAnnotations(next);setDraftQuote(null);setComment('');setMessage('原文摘录与批注已保存');}});
 const favorite=()=>run(async()=>{const next=await setNiBookmark(scope,course,chapter,!bookmarked);if(live.current){setBookmarked(next.some(row=>row.chapterId===chapter.id));setMessage(bookmarked?'已取消本节收藏':'本节已收藏');}});
 const exportNote=async()=>{if(!ready)return;try{
  const current=record?{...record,text}:{text,updatedAt:Date.now(),userNoteRevision:0};
  const payload={...exportNiPersonalStudy(course,chapter,current,annotations),containsUnsavedText:record?.text!==text};
  const body=JSON.stringify(payload,null,2),{Capacitor}=await import('@capacitor/core');
  if(Capacitor.isNativePlatform()){await(await import('@capacitor/share')).Share.share({title:course.title+' · '+chapter.title,text:body,dialogTitle:'导出本节学习笔记'});}
  else{const url=URL.createObjectURL(new Blob([body],{type:'application/json;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=chapter.id+'-我的学习笔记.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  if(live.current)setMessage('已发起导出；原笔记保留。');
 }catch{if(live.current)setMessage('导出未完成，可先复制保留文字。');}};
 return <section ref={section} aria-label="我的学习笔记" style={{padding:16,borderRadius:12,background:'#fffdf4',border:'1px solid #ece4cd',marginTop:16,scrollMarginTop:12}}>
  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:12}}><h3 style={{fontSize:17,margin:0,marginRight:'auto'}}>我的学习笔记</h3><button type="button" style={button} disabled={!ready||saving} aria-pressed={bookmarked} onClick={()=>void favorite()}>{bookmarked?'★ 已收藏':'☆ 收藏本节'}</button><button type="button" style={button} disabled={!ready} onClick={()=>void exportNote()}>导出本节笔记</button></div>
  {record?.chapterSha256&&record.chapterSha256!==chapter.sha256&&<details style={{fontSize:12,color:'#78677f',lineHeight:1.8,marginBottom:10}}><summary>课程已更新，个人笔记保持原样 · 记于{record.courseRevision}</summary><p>当前课程为{course.version}。请对照原来记笔记时的课文，确认自己的理解。</p><pre style={{whiteSpace:'pre-wrap',maxHeight:260,overflow:'auto',fontFamily:'inherit'}}>{redactNiPrivateContacts(record.sourceSnapshot||'')}</pre></details>}
  <textarea aria-label="个人学习笔记" disabled={!ready} maxLength={20000} value={text} onChange={event=>{revision.current++;setText(event.target.value);setMessage('尚未保存');}} placeholder="记录这节的要点、疑问和自己的理解…" style={{...input,minHeight:150,resize:'vertical'}}/>
  <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',marginTop:8}}><button type="button" style={button} disabled={!ready||saving} onClick={()=>void save()}>{saving?'正在保存…':'保存笔记'}</button>{!ready&&message&&<button type="button" style={button} onClick={()=>setReadAttempt(value=>value+1)}>重新读取</button>}<span role="status" style={{fontSize:12,color:'#827986'}}>{message}</span></div>
  <small style={{display:'block',color:'#827986',lineHeight:1.8,marginTop:8}}>当前账号的本机笔记 · 私人修订{record?.userNoteRevision||0} · 课程{course.version}。课文更新不会覆盖个人文字。</small>
  {draftQuote&&<section style={{marginTop:18,paddingTop:12,borderTop:'1px solid #e9dfbf'}}><strong>给这段原文加批注</strong><blockquote style={{fontSize:14,lineHeight:1.9,margin:'10px 0',whiteSpace:'pre-wrap'}}>{draftQuote.quote}</blockquote><textarea aria-label="原文批注" maxLength={2000} disabled={!ready} value={comment} onChange={event=>setComment(event.target.value)} placeholder="补充自己的理解或疑问…" style={{...input,minHeight:90}}/><div style={{display:'flex',gap:8,marginTop:8}}><button type="button" style={button} disabled={!ready||saving} onClick={()=>void saveMark()}>保存摘录与批注</button><button type="button" style={button} onClick={()=>setDraftQuote(null)}>取消</button></div></section>}
  {!!annotations.length&&<details style={{fontSize:14,lineHeight:1.9,marginTop:16}}><summary>我的原文摘录与批注 · {annotations.length}条</summary>{annotations.map(mark=><div key={mark.id} style={{margin:'12px 0',borderLeft:'2px solid #d8c3e5',paddingLeft:10}}><small style={{color:'#827986'}}>课程{mark.anchor.courseRevision}{mark.anchor.chapterSha256!==chapter.sha256?' · 旧版原文':''}</small><blockquote style={{margin:'4px 0',whiteSpace:'pre-wrap'}}>{mark.anchor.quote}</blockquote><p style={{whiteSpace:'pre-wrap'}}>{mark.comment||'已保存这段原文'}</p></div>)}</details>}
 </section>;
}
