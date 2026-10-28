"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {listNiCourses,loadNiCourse,importNiCourse,importNiCourseCollection,NI_COURSE_IMPORT_MAX_BYTES,type NiCourse,type NiCourseSummary} from "@/lib/niTeacherCourses";
import {readOfflineFile,writeOfflineFile} from "@/lib/durableOfflineStore";
import {useAccountScope} from "@/lib/useAccountScope";
import {LocalListenButton} from "@/components/LocalListenButton";
import {prepareCompleteTcm} from "@/lib/completeTcmLearning";
import {NiLessonStudyPanel} from "@/components/NiLessonStudyPanel";
import {NiPrivateNotebook} from "@/components/NiPrivateNotebook";
import {verifyNiSourceAnchor,redactNiPrivateContacts,type NiSourceAnchor} from "@/lib/niLessonStudy";
import {readNiBookmarks,type NiBookmark} from "@/lib/niStudyNotebook";

const button={border:"1px solid #ded3e7",borderRadius:9,padding:"9px 12px",background:"white",color:"#66368b",fontSize:14,cursor:"pointer"} as const;
const input={width:"100%",padding:"12px",border:"1px solid #ddd3e4",borderRadius:10,background:"white",color:"#292524",fontSize:15} as const;
const unitName=(id:string)=>id==="ni-acupuncture"?"讲次":id.includes("materia")?"条目":id.includes("shanghan")||id.includes("jingui")||id.includes("neijing")?"篇目":"单元";
const acupunctureLectureNumber=(title:string)=>title.match(/第\s*(\d+)\s*讲/u)?.[1]??null;

export default function NiStudyPage(){const scope=useAccountScope().split(":")[0];return <NiStudyLibrary key={scope} scope={scope}/>;}
function NiStudyLibrary({scope}:{scope:string}){
 const [rows,setRows]=useState<NiCourseSummary[]>([]),[course,setCourse]=useState<NiCourse|null>(null),[query,setQuery]=useState("");
 const [group,setGroup]=useState("全部"),[selected,setSelected]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [bookmarks,setBookmarks]=useState<NiBookmark[]>([]);
 const request=useRef(0),file=useRef<HTMLInputElement>(null),readerBack=useRef<(()=>boolean)|null>(null),currentCourse=useRef<NiCourse|null>(null);currentCourse.current=course;
 const reload=()=>{void listNiCourses().then(setRows).catch(()=>setMessage("暂时无法读取目录，已保存的内容保留"));void readNiBookmarks(scope).then(setBookmarks).catch(()=>{});};
 useEffect(()=>{reload();window.addEventListener("ni-courses-ready",reload);return()=>{request.current++;window.removeEventListener("ni-courses-ready",reload);};},[]);
 useEffect(()=>{const back=()=>{if(readerBack.current?.()){(window as Window&{__zhongyiBackHandled?:boolean}).__zhongyiBackHandled=true;return;}if(currentCourse.current){request.current++;setCourse(null);setQuery("");setBusy(false);(window as Window&{__zhongyiBackHandled?:boolean}).__zhongyiBackHandled=true;}};window.addEventListener("zhongyi-back",back);return()=>window.removeEventListener("zhongyi-back",back);},[]);
 const open=async(id:string,chapterId?:string)=>{const turn=++request.current;setBusy(true);setMessage("");try{let next=await loadNiCourse(id);if(!next){await prepareCompleteTcm(value=>{if(turn===request.current)setMessage(value);});next=await loadNiCourse(id);}if(turn!==request.current)return;if(!next){setMessage("完整资料中尚未找到本课程，已保存的课程仍可阅读。");return;}const progress=await readOfflineFile<{chapter:string}>(`ni-progress-${scope}-${id}`).catch(()=>null);if(turn!==request.current)return;const target=chapterId||progress?.chapter;setSelected(next.chapters.some(c=>c.id===target)?target!:(next.chapters.find(c=>!/前言|目录|版权|编者按/.test(c.title))||next.chapters[0]).id);setCourse(next);setQuery("");reload();}catch(e){if(turn===request.current)setMessage(e instanceof Error?e.message:"课程读取失败");}finally{if(turn===request.current)setBusy(false);}};
 const downloadAll=async()=>{setBusy(true);setMessage("");try{await prepareCompleteTcm(setMessage);reload();setMessage("中医资料已保存，可离线阅读。");}catch(e){setMessage(e instanceof Error?e.message:"下载尚未完成，原资料保留");}finally{setBusy(false);}};
 const importFile=async(selectedFile:File)=>{setBusy(true);setMessage("");try{if(selectedFile.size>NI_COURSE_IMPORT_MAX_BYTES)throw Error("课程文件超过容量范围");const raw=JSON.parse(await selectedFile.text());if(raw.schema==="yandao.ni-course-collection.v1"){await importNiCourseCollection(raw);setMessage("课程合集已保存本机。");}else{const imported=await importNiCourse(raw);setCourse(imported);setSelected(imported.chapters[0].id);setMessage("课程已保存本机。");}reload();}catch(e){setMessage(e instanceof Error?e.message:"文件未能导入，原资料保留");}finally{setBusy(false);if(file.current)file.current.value="";}};
 return <main style={{maxWidth:900,margin:"0 auto",padding:"16px 14px 120px",background:"#faf8f4",minHeight:"100vh",color:"#292524"}}>
  <header style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>{course?<button style={button} onClick={()=>{request.current++;setCourse(null);setQuery("");setBusy(false);}}>‹ 课程</button>:<Link href="/zhongyi/" style={{...button,textDecoration:"none"}}>‹ 中医</Link>}<div><h1 style={{fontSize:22,margin:0}}>倪师自学专区</h1><p style={{fontSize:12,color:"#827486",margin:"5px 0 0"}}>课程研读 · 学习笔记 · 原文对照</p></div></header>
  {message&&<p role="status" style={{padding:10,fontSize:13,lineHeight:1.7,background:"#f1eaf6",borderRadius:8}}>{message}</p>}
  {!course?<>
   <section style={{padding:14,marginBottom:14,borderRadius:12,background:"#fff",border:"1px solid #eee4f3",fontSize:13,lineHeight:1.85,color:"#685d65"}}>
    <strong style={{color:"#553469"}}>倪师课程 · 笔记式自学</strong>
    <p style={{margin:"6px 0"}}>编者学识有限，为尽量避免曲解原意，课程讲课文字依所提供课件保留原稿字词，不作解释性改写；只按原有课程标题与自然段落分节，方便阅读、听学和记笔记。原稿中的个别识别或校勘问题仍请对照出处。</p>
    <p style={{margin:"6px 0"}}>欢迎提交有来源的勘误、课程笔记和学习资料：<a href="mailto:support@yandao.vip?subject=%E8%A8%80%E9%81%93%E5%9B%BD%E5%AD%A6%E8%AF%BE%E7%A8%8B%E8%B5%84%E6%96%99%E6%8A%95%E7%A8%BF" style={{color:"#713aa1",textDecoration:"underline"}}>support@yandao.vip</a>。投稿会先核对来源、授权和内容，再决定是否收录。</p>
   </section>
   <p style={{fontSize:14,lineHeight:1.8,color:"#685d65"}}>按课程原有讲次、经典篇目或药物条目阅读；听完一讲可自动进入下一讲。阅读进度、原文摘记和个人笔记分开保存。</p>
   <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}><button style={button} disabled={busy} onClick={downloadAll}>{busy?"正在准备…":"保存完整中医资料"}</button><button style={button} disabled={busy} onClick={()=>file.current?.click()}>导入本机课程</button><input ref={file} type="file" accept=".json,application/json" style={{display:"none"}} onChange={e=>{const chosen=e.target.files?.[0];if(chosen)void importFile(chosen);}}/></div>
   <input aria-label="查找课程" placeholder="查找课程、作者或资料" value={query} onChange={e=>setQuery(e.target.value)} style={input}/>
   <nav aria-label="课程分类" style={{display:"flex",gap:7,overflowX:"auto",margin:"12px 0"}}>{["全部","人纪课程","研习记录","补充研习"].map(value=><button key={value} style={{...button,whiteSpace:"nowrap",background:group===value?"#eee3f6":"white"}} aria-pressed={group===value} onClick={()=>setGroup(value)}>{value}</button>)}</nav>
   {!!bookmarks.length&&<details style={{padding:12,marginBottom:12,background:"#fffdf4",borderRadius:10,fontSize:14,lineHeight:1.8}}><summary>我的课程收藏 · {bookmarks.length}节</summary>{bookmarks.map(mark=><button key={mark.chapterId} type="button" disabled={busy} style={{...button,display:"block",width:"100%",textAlign:"left",margin:"8px 0"}} onClick={()=>void open(mark.courseId,mark.chapterId)}>{mark.title}</button>)}</details>}
   <div style={{display:"grid",gap:10}}>{rows.filter(row=>(group==="全部"||row.group===group)&&`${row.title}${row.author}${row.description}`.includes(query.trim())).map(row=><button key={row.id} style={{display:"block",width:"100%",textAlign:"left",border:"1px solid #e7dfd5",borderRadius:12,padding:16,color:"#292524",background:"white",cursor:"pointer"}} disabled={busy} onClick={()=>void open(row.id)}><strong style={{fontSize:17}}>{row.title}</strong><span style={{float:"right",fontSize:12,color:row.available?"#42754d":"#82678f"}}>{row.available?"已保存":"阅读并保存"} ›</span><p style={{fontSize:13,lineHeight:1.7,margin:"8px 0",color:"#746c70"}}>{row.description}</p><small style={{color:"#837b81"}}>{row.author} · {row.chapterCount}{unitName(row.id)}</small></button>)}</div>
   <p style={{fontSize:11,color:"#827986",lineHeight:1.8,marginTop:18}}>讲课整理、学员笔记和其他作者著作分别署名；个人笔记保存在当前账号的本机空间。</p>
  </>:<CourseReader key={course.id} course={course} selected={selected} select={setSelected} scope={scope} registerBack={handler=>{readerBack.current=handler;}}/>}
 </main>;
}

function CourseReader({course,selected,select,scope,registerBack}:{course:NiCourse;selected:string;select:(id:string)=>void;scope:string;registerBack:(handler:(()=>boolean)|null)=>void}){
 const [query,setQuery]=useState(""),[toc,setToc]=useState(false),[original,setOriginal]=useState(false),[progressStatus,setProgressStatus]=useState(""),[autoNext,setAutoNext]=useState(true),[autoPlayChapter,setAutoPlayChapter]=useState("");
 const [highlight,setHighlight]=useState<NiSourceAnchor|null>(null),[quote,setQuote]=useState<NiSourceAnchor|null>(null);
 const article=useRef<HTMLElement>(null),sourceMark=useRef<HTMLElement>(null),chapter=course.chapters.find(c=>c.id===selected)||course.chapters[0],index=course.chapters.findIndex(c=>c.id===chapter.id);
 const acupunctureLectures=course.id==="ni-acupuncture"?course.chapters.filter(c=>acupunctureLectureNumber(c.title)!==null):[];
 const currentLectureNumber=course.id==="ni-acupuncture"?acupunctureLectureNumber(chapter.title):null;
 const chapterRows=course.chapters.filter(c=>!query||`${c.title}\n${c.content}`.includes(query.trim()));
 useEffect(()=>{let active=true;setProgressStatus("");void writeOfflineFile(`ni-progress-${scope}-${course.id}`,{chapter:chapter.id,at:Date.now()}).then(()=>{if(active)setProgressStatus("阅读进度已保存");}).catch(()=>{if(active)setProgressStatus("阅读进度暂未保存");});return()=>{active=false;};},[scope,course.id,chapter.id]);
 useEffect(()=>{try{setAutoNext(window.localStorage.getItem(`ni-course-auto-next-${course.id}`)!=="off");}catch{}},[course.id]);
 useEffect(()=>{registerBack(()=>{if(!toc)return false;setToc(false);return true;});return()=>registerBack(null);},[toc,registerBack]);
 useEffect(()=>{setHighlight(null);setQuote(null);setOriginal(false);},[chapter.id,chapter.sha256]);
 useEffect(()=>{if(original&&highlight)requestAnimationFrame(()=>sourceMark.current?.scrollIntoView({block:"center"}));},[original,highlight]);
 const showSource=(anchor:NiSourceAnchor)=>{if(!verifyNiSourceAnchor(anchor,course,chapter))return;setHighlight(anchor);setOriginal(true);};
 const validHighlight=highlight&&verifyNiSourceAnchor(highlight,course,chapter)?highlight:null;
 const displayContent=redactNiPrivateContacts(chapter.content);
 const change=(id:string)=>{select(id);setToc(false);requestAnimationFrame(()=>article.current?.scrollIntoView({block:"start"}));};
 return <>
  <div style={{padding:16,borderRadius:12,background:"#f1e9f6",marginBottom:12}}><h2 style={{fontSize:20,margin:0}}>{course.title}</h2><p style={{fontSize:12,color:"#786981",margin:"8px 0"}}>{course.author} · {course.persisted===false?"本次可读，保存尚未完成":"已保存，可离线阅读"}</p><div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}><button type="button" style={button} onClick={()=>setToc(value=>!value)}>目录与查找</button><button type="button" style={button} aria-pressed={original} onClick={()=>setOriginal(value=>!value)}>{original?"返回学习摘记":"查看原稿文字"}</button><label style={{fontSize:12,color:"#685d65"}}><input type="checkbox" checked={autoNext} onChange={e=>{setAutoNext(e.target.checked);try{window.localStorage.setItem(`ni-course-auto-next-${course.id}`,e.target.checked?"on":"off");}catch{}}}/> 听完自动进入下一{unitName(course.id)==="讲次"?"讲":"节"}</label></div><p style={{fontSize:11,color:"#827986",margin:"8px 0 0"}}>开启后会自动切换并尝试朗读下一单元；若系统不允许自动播放，可点播放继续。</p></div>
  {toc&&<aside aria-label="章节目录" style={{background:"white",padding:14,borderRadius:12,marginBottom:12}}><input aria-label="查找章节或正文" style={input} placeholder="按标题或正文查找" value={query} onChange={e=>setQuery(e.target.value)}/><div style={{maxHeight:"50vh",overflowY:"auto",marginTop:10}}>{chapterRows.map(c=><button type="button" key={c.id} aria-current={c.id===chapter.id?"page":undefined} onClick={()=>change(c.id)} style={{display:"block",width:"100%",padding:12,border:0,borderBottom:"1px solid #eee",textAlign:"left",fontSize:15,lineHeight:1.7,color:"#4d354f",background:c.id===chapter.id?"#f3eafb":"white"}}>{c.title}</button>)}{!chapterRows.length&&<p>没有找到该词，可换一个关键词。</p>}</div></aside>}
  <article ref={article} style={{padding:"20px 18px",borderRadius:12,background:"white",scrollMarginTop:12}}>
   <p style={{fontSize:12,color:"#8b7f8e",margin:"0 0 8px"}}>{course.id==="ni-acupuncture"?(currentLectureNumber?`第${currentLectureNumber}／${acupunctureLectures.length}讲`:"课程导读"): `第${index+1}／${course.chapters.length}${unitName(course.id)}`}</p><h2 style={{fontSize:21,lineHeight:1.6,margin:"0 0 14px"}}>{chapter.title}</h2>
   <LocalListenButton key={chapter.id} text={displayContent} contentId={`ni-course:${chapter.id}`} autoStart={autoPlayChapter===chapter.id} onAutoStartHandled={()=>setAutoPlayChapter("")} onFinished={()=>{if(autoNext&&index<course.chapters.length-1){const next=course.chapters[index+1].id;setAutoPlayChapter(next);change(next);}}}/>
   {original?<pre style={{fontFamily:"inherit",fontSize:16,lineHeight:2,whiteSpace:"pre-wrap",overflowWrap:"anywhere",margin:"20px 0"}}>{validHighlight?<>{displayContent.slice(0,validHighlight.start)}<mark ref={sourceMark} style={{background:"#fff0a6",color:"inherit"}}>{displayContent.slice(validHighlight.start,validHighlight.end)}</mark>{displayContent.slice(validHighlight.end)}</>:displayContent}</pre>:<NiLessonStudyPanel key={chapter.id+chapter.sha256} course={course} chapter={chapter} onSource={showSource} onAnnotate={setQuote}/>}
   <details style={{fontSize:11,color:"#827986",lineHeight:1.8,borderTop:"1px solid #eee",paddingTop:12}}><summary>出处与版本</summary><p>{course.source.filename} · 原稿第{chapter.lineStart}–{chapter.lineEnd}行</p><p>{course.source.licenseNote}</p><p>{course.source.qualityNote}</p><p>笔记排版仅整理阅读段落，原稿字词保留；个人理解请记在下方。</p></details>
  </article>
  <NiPrivateNotebook key={`${scope}-${chapter.id}`} scope={scope} course={course} chapter={chapter} quote={quote}/>
  <nav aria-label="课程前后章" style={{display:"flex",justifyContent:"space-between",gap:8,marginTop:14}}><button style={button} disabled={!index} onClick={()=>change(course.chapters[index-1].id)}>‹ 上一节</button><button style={button} onClick={()=>setToc(true)}>目录</button><button style={button} disabled={index===course.chapters.length-1} onClick={()=>change(course.chapters[index+1].id)}>下一节 ›</button></nav><p style={{fontSize:11,color:"#827986",textAlign:"center"}}>{progressStatus}</p>
 </>;
}
