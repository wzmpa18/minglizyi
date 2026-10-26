"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {listNiCourses,loadNiCourse,importNiCourse,importNiCourseCollection,NI_COURSE_IMPORT_MAX_BYTES,type NiCourse,type NiCourseSummary} from "@/lib/niTeacherCourses";
import {readOfflineFile,writeOfflineFile} from "@/lib/durableOfflineStore";
import {useAccountScope} from "@/lib/useAccountScope";
import {LocalListenButton} from "@/components/LocalListenButton";
import {prepareCompleteTcm} from "@/lib/completeTcmLearning";

const button={border:"1px solid #ded3e7",borderRadius:9,padding:"9px 12px",background:"white",color:"#66368b",fontSize:14,cursor:"pointer"} as const;
const input={width:"100%",padding:"12px",border:"1px solid #ddd3e4",borderRadius:10,background:"white",color:"#292524",fontSize:15} as const;

export default function NiStudyPage(){const scope=useAccountScope().split(":")[0];return <NiStudyLibrary key={scope} scope={scope}/>;}
function NiStudyLibrary({scope}:{scope:string}){
 const [rows,setRows]=useState<NiCourseSummary[]>([]),[course,setCourse]=useState<NiCourse|null>(null),[query,setQuery]=useState("");
 const [group,setGroup]=useState("全部"),[selected,setSelected]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const request=useRef(0),file=useRef<HTMLInputElement>(null);
 const reload=()=>{void listNiCourses().then(setRows).catch(()=>setMessage("暂时无法读取目录，已保存的内容保留"));};
 useEffect(()=>{reload();window.addEventListener("ni-courses-ready",reload);return()=>{request.current++;window.removeEventListener("ni-courses-ready",reload);};},[]);
 const open=async(id:string)=>{const turn=++request.current;setBusy(true);setMessage("");try{let next=await loadNiCourse(id);if(!next){await prepareCompleteTcm(value=>{if(turn===request.current)setMessage(value);});next=await loadNiCourse(id);}if(turn!==request.current)return;if(!next){setMessage("完整资料中尚未找到本课程，已保存的课程仍可阅读。");return;}setCourse(next);const progress=await readOfflineFile<{chapter:string}>(`ni-progress-${scope}-${id}`).catch(()=>null);if(turn!==request.current)return;setSelected(next.chapters.some(c=>c.id===progress?.chapter)?progress!.chapter:(next.chapters.find(c=>!/前言|目录|版权|编者按/.test(c.title))||next.chapters[0]).id);setQuery("");reload();}catch(e){if(turn===request.current)setMessage(e instanceof Error?e.message:"课程读取失败");}finally{if(turn===request.current)setBusy(false);}};
 const downloadAll=async()=>{setBusy(true);setMessage("");try{await prepareCompleteTcm(setMessage);reload();setMessage("中医资料已保存，可离线阅读。");}catch(e){setMessage(e instanceof Error?e.message:"下载尚未完成，原资料保留");}finally{setBusy(false);}};
 const importFile=async(selectedFile:File)=>{setBusy(true);setMessage("");try{if(selectedFile.size>NI_COURSE_IMPORT_MAX_BYTES)throw Error("课程文件超过容量范围");const raw=JSON.parse(await selectedFile.text());if(raw.schema==="yandao.ni-course-collection.v1"){await importNiCourseCollection(raw);setMessage("课程合集已保存本机。");}else{const imported=await importNiCourse(raw);setCourse(imported);setSelected(imported.chapters[0].id);setMessage("课程已保存本机。");}reload();}catch(e){setMessage(e instanceof Error?e.message:"文件未能导入，原资料保留");}finally{setBusy(false);if(file.current)file.current.value="";}};
 return <main style={{maxWidth:900,margin:"0 auto",padding:"16px 14px 120px",background:"#faf8f4",minHeight:"100vh",color:"#292524"}}>
  <header style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>{course?<button style={button} onClick={()=>{request.current++;setCourse(null);setQuery("");setBusy(false);}}>‹ 课程</button>:<Link href="/zhongyi/" style={{...button,textDecoration:"none"}}>‹ 中医</Link>}<div><h1 style={{fontSize:22,margin:0}}>倪师自学专区</h1><p style={{fontSize:12,color:"#827486",margin:"5px 0 0"}}>课程研读 · 学习笔记 · 原文对照</p></div></header>
  {message&&<p role="status" style={{padding:10,fontSize:13,lineHeight:1.7,background:"#f1eaf6",borderRadius:8}}>{message}</p>}
  {!course?<>
   <p style={{fontSize:14,lineHeight:1.8,color:"#685d65"}}>按章节阅读讲课整理、经典与研习记录；随手记下自己的理解，下次继续学习。</p>
   <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}><button style={button} disabled={busy} onClick={downloadAll}>{busy?"正在准备…":"保存完整中医资料"}</button><button style={button} disabled={busy} onClick={()=>file.current?.click()}>导入本机课程</button><input ref={file} type="file" accept=".json,application/json" style={{display:"none"}} onChange={e=>{const chosen=e.target.files?.[0];if(chosen)void importFile(chosen);}}/></div>
   <input aria-label="查找课程" placeholder="查找课程、作者或资料" value={query} onChange={e=>setQuery(e.target.value)} style={input}/>
   <nav aria-label="课程分类" style={{display:"flex",gap:7,overflowX:"auto",margin:"12px 0"}}>{["全部","人纪课程","研习记录","补充研习"].map(value=><button key={value} style={{...button,whiteSpace:"nowrap",background:group===value?"#eee3f6":"white"}} aria-pressed={group===value} onClick={()=>setGroup(value)}>{value}</button>)}</nav>
   <div style={{display:"grid",gap:10}}>{rows.filter(row=>(group==="全部"||row.group===group)&&`${row.title}${row.author}${row.description}`.includes(query.trim())).map(row=><button key={row.id} style={{display:"block",width:"100%",textAlign:"left",border:"1px solid #e7dfd5",borderRadius:12,padding:16,color:"#292524",background:"white",cursor:"pointer"}} disabled={busy} onClick={()=>void open(row.id)}><strong style={{fontSize:17}}>{row.title}</strong><span style={{float:"right",fontSize:12,color:row.available?"#42754d":"#82678f"}}>{row.available?"已保存":"阅读并保存"} ›</span><p style={{fontSize:13,lineHeight:1.7,margin:"8px 0",color:"#746c70"}}>{row.description}</p><small style={{color:"#837b81"}}>{row.author} · {row.chapterCount}个章节／阅读段</small></button>)}</div>
   <p style={{fontSize:11,color:"#827986",lineHeight:1.8,marginTop:18}}>讲课整理、学员笔记和其他作者著作分别署名；个人笔记保存在当前账号的本机空间。</p>
  </>:<CourseReader key={course.id} course={course} selected={selected} select={setSelected} scope={scope}/>}
 </main>;
}

function CourseReader({course,selected,select,scope}:{course:NiCourse;selected:string;select:(id:string)=>void;scope:string}){
 const [query,setQuery]=useState(""),[toc,setToc]=useState(false),[original,setOriginal]=useState(false),[progressStatus,setProgressStatus]=useState("");
 const article=useRef<HTMLElement>(null),chapter=course.chapters.find(c=>c.id===selected)||course.chapters[0],index=course.chapters.findIndex(c=>c.id===chapter.id);
 const chapterRows=course.chapters.filter(c=>!query||`${c.title}\n${c.content}`.includes(query.trim()));
 useEffect(()=>{let active=true;setProgressStatus("");void writeOfflineFile(`ni-progress-${scope}-${course.id}`,{chapter:chapter.id,at:Date.now()}).then(()=>{if(active)setProgressStatus("阅读进度已保存");}).catch(()=>{if(active)setProgressStatus("阅读进度暂未保存");});return()=>{active=false;};},[scope,course.id,chapter.id]);
 const change=(id:string)=>{select(id);setToc(false);requestAnimationFrame(()=>article.current?.scrollIntoView({block:"start"}));};
 return <>
  <div style={{padding:16,borderRadius:12,background:"#f1e9f6",marginBottom:12}}><h2 style={{fontSize:20,margin:0}}>{course.title}</h2><p style={{fontSize:12,color:"#786981",margin:"8px 0"}}>{course.author} · {course.persisted===false?"本次可读，保存尚未完成":"已保存，可离线阅读"}</p><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button type="button" style={button} onClick={()=>setToc(value=>!value)}>目录与查找</button><button type="button" style={button} aria-pressed={original} onClick={()=>setOriginal(value=>!value)}>{original?"切换笔记排版":"查看原稿排版"}</button></div></div>
  {toc&&<aside aria-label="章节目录" style={{background:"white",padding:14,borderRadius:12,marginBottom:12}}><input aria-label="查找章节或正文" style={input} placeholder="按标题或正文查找" value={query} onChange={e=>setQuery(e.target.value)}/><div style={{maxHeight:"50vh",overflowY:"auto",marginTop:10}}>{chapterRows.map(c=><button type="button" key={c.id} aria-current={c.id===chapter.id?"page":undefined} onClick={()=>change(c.id)} style={{display:"block",width:"100%",padding:12,border:0,borderBottom:"1px solid #eee",textAlign:"left",fontSize:15,lineHeight:1.7,color:"#4d354f",background:c.id===chapter.id?"#f3eafb":"white"}}>{c.title}</button>)}{!chapterRows.length&&<p>没有找到该词，可换一个关键词。</p>}</div></aside>}
  <article ref={article} style={{padding:"20px 18px",borderRadius:12,background:"white",scrollMarginTop:12}}>
   <p style={{fontSize:12,color:"#8b7f8e",margin:"0 0 8px"}}>第{index+1}／{course.chapters.length}节</p><h2 style={{fontSize:21,lineHeight:1.6,margin:"0 0 14px"}}>{chapter.title}</h2>
   <LocalListenButton key={chapter.id} text={chapter.content} contentId={`ni-course:${chapter.id}`}/>
   {original?<pre style={{fontFamily:"inherit",fontSize:16,lineHeight:2,whiteSpace:"pre-wrap",overflowWrap:"anywhere",margin:"20px 0"}}>{chapter.content}</pre>:<div aria-label="课程笔记排版" style={{marginTop:20}}>{chapter.content.split(/\n\s*\n|\r?\n/).filter(Boolean).map((paragraph,i)=><p key={i} style={{fontSize:17,lineHeight:2,margin:"0 0 18px",whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{paragraph}</p>)}</div>}
   <details style={{fontSize:11,color:"#827986",lineHeight:1.8,borderTop:"1px solid #eee",paddingTop:12}}><summary>出处与版本</summary><p>{course.source.filename} · 原稿第{chapter.lineStart}–{chapter.lineEnd}行</p><p>{course.source.licenseNote}</p><p>{course.source.qualityNote}</p><p>笔记排版仅整理阅读段落，原稿字词保留；个人理解请记在下方。</p></details>
  </article>
  <PrivateChapterNotes key={`${scope}-${chapter.id}`} scope={scope} chapterId={chapter.id}/>
  <nav aria-label="课程前后章" style={{display:"flex",justifyContent:"space-between",gap:8,marginTop:14}}><button style={button} disabled={!index} onClick={()=>change(course.chapters[index-1].id)}>‹ 上一节</button><button style={button} onClick={()=>setToc(true)}>目录</button><button style={button} disabled={index===course.chapters.length-1} onClick={()=>change(course.chapters[index+1].id)}>下一节 ›</button></nav><p style={{fontSize:11,color:"#827986",textAlign:"center"}}>{progressStatus}</p>
 </>;
}
function PrivateChapterNotes({scope,chapterId}:{scope:string;chapterId:string}){
 const [text,setText]=useState(""),[ready,setReady]=useState(false),[message,setMessage]=useState(""),[saving,setSaving]=useState(false);
 const revision=useRef(0),pending=useRef(false),live=useRef(true);
 const key=`ni-note-${scope}-${chapterId}`;
 useEffect(()=>{let active=true;live.current=true;void readOfflineFile<{text:string}>(key).then(row=>{if(active){setText(typeof row?.text==="string"?row.text:"");setReady(true);}}).catch(()=>{if(active){setMessage("暂时无法读取本机笔记");setReady(true);}});return()=>{active=false;live.current=false;};},[key]);
 const save=async()=>{if(pending.current)return;const snapshot=text,atRevision=revision.current;pending.current=true;setSaving(true);try{const row={text:snapshot,updatedAt:Date.now()};await writeOfflineFile(key,row);const saved=await readOfflineFile<{text:string}>(key);if(saved?.text!==snapshot)throw Error();if(live.current)setMessage(revision.current===atRevision?"笔记已保存本机":"新修改尚未保存");}catch{if(live.current)setMessage("本次保存未完成，请保留输入后重试");}finally{pending.current=false;if(live.current)setSaving(false);}};
 return <section aria-label="我的学习笔记" style={{padding:16,borderRadius:12,background:"#fffdf4",border:"1px solid #ece4cd",marginTop:12}}><h3 style={{fontSize:16,margin:"0 0 10px"}}>我的学习笔记</h3><textarea aria-label="个人学习笔记" disabled={!ready} maxLength={20000} value={text} onChange={e=>{revision.current++;setText(e.target.value);setMessage("尚未保存");}} placeholder="记录这节的要点、疑问和原文对照…" style={{...input,minHeight:120,lineHeight:1.8,resize:"vertical"}}/><div style={{display:"flex",gap:10,alignItems:"center",marginTop:8}}><button style={button} disabled={!ready||saving} onClick={()=>void save()}>{saving?"正在保存…":"保存笔记"}</button><span role="status" style={{fontSize:12,color:"#827986"}}>{message}</span></div></section>;
}
