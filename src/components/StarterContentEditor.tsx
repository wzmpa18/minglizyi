"use client";
import {useState} from "react";
import {InterfaceButton} from "@/components/InterfaceControls";
import {fetchStarterCatalogForAdmin,publishStarterCatalog} from "@/lib/academyApi";
import type {StudyCatalog} from "@/lib/studyCatalog";
import type {StarterLesson,StarterQuestion} from "@/data/studyStarter";
import {STUDY_ROUTES,validateStudyCatalog} from "../../backend_deploy/studyContentPolicy";

export default function StarterContentEditor(){
 const [catalog,setCatalog]=useState<StudyCatalog|null>(null),[selected,setSelected]=useState(""),[reviewed,setReviewed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const lesson=catalog?.lessons.find(l=>l.id===selected);
 async function load(){if(busy)return;setBusy(true);try{const result=await fetchStarterCatalogForAdmin();if(!result.success||!result.catalog)throw Error(result.error||"读取失败");setCatalog(result.catalog);setSelected(result.catalog.lessons[0].id);setReviewed(false);setMessage("已读取服务器当前版本；未发布编辑仅在此页面保存。");}catch(error){setMessage(error instanceof Error?error.message:"读取未完成");}finally{setBusy(false);}}
 function edit(patch:Partial<StarterLesson>){if(!catalog||!lesson)return;setCatalog({...catalog,lessons:catalog.lessons.map(l=>l.id===selected?{...l,...patch}:l)});setReviewed(false);}
 function editQuestion(index:number,patch:Partial<StarterQuestion>){if(lesson)edit({questions:lesson.questions.map((q,i)=>i===index?{...q,...patch}:q)});}
 function add(){if(!catalog||catalog.lessons.length>=200)return;const id="practice-"+Date.now().toString(36),item:StarterLesson={id,title:"新课程",summary:"",paragraphs:["","",""],source:"",href:"/zhongyi/classic",linkLabel:"进入对应板块学习",questions:[1,2,3].map(n=>({id:id+"-"+n,stem:"",options:["","",""],answer:0,explanation:""}))};setCatalog({...catalog,lessons:[...catalog.lessons,item]});setSelected(id);setReviewed(false);}
 async function publish(){if(!catalog||busy)return;const next={...catalog,revision:catalog.revision+1,publishedAt:new Date().toISOString()},check=validateStudyCatalog(next);if(!check.ok){setMessage(check.errors.join("；"));return;}if(!reviewed){setMessage("请先核对正文、答案解析与原创/来源许可。");return;}setBusy(true);try{const result=await publishStarterCatalog(next,catalog.revision,true);if(!result.success||!result.catalog)throw Error(result.error||"发布结果未确认，请重新读取核对");setCatalog(result.catalog);setReviewed(false);setMessage(`服务器已发布第${result.catalog.revision}版。新版客户端下次进入课程或点击检查更新后读取，无需仅为这些资料重新打包。`);}catch(error){setMessage(error instanceof Error?error.message:"结果未确认，请重新读取核对，勿重复提交");}finally{setBusy(false);}}
 const field="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900";
 return <details className="mb-3 rounded-2xl bg-white p-4 shadow-sm"><summary className="cursor-pointer font-semibold">入门课程远程发布</summary><p className="mt-2 text-xs leading-6 text-gray-600">仅维护公开学习正文、练习与现有板块链接。原有16课保留；算法、权限、支付和新增页面能力仍需客户端开发。医学内容须专业复核，编辑核对不能代替医学认证。</p>
  <InterfaceButton disabled={busy} onClick={()=>void load()} className="mt-3 rounded-lg border px-3 py-2 text-sm">读取服务器课程（替换未发布草稿）</InterfaceButton>
  {message&&<p role="status" className="mt-3 rounded-lg bg-slate-50 p-2 text-xs leading-6">{message}</p>}
  {catalog&&<fieldset disabled={busy} className="mt-3 min-w-0 space-y-3"><legend className="text-sm">服务器资料第{catalog.revision}版 · {catalog.lessons.length}课</legend>
   <label className="block text-xs">选择课程<select value={selected} onChange={e=>setSelected(e.target.value)} className={field}>{catalog.lessons.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select></label>
   <InterfaceButton onClick={add} className="rounded-lg border px-3 py-2 text-sm">新增课程</InterfaceButton>
   {lesson&&<><p className="break-all text-xs text-gray-500">固定ID：{lesson.id}。同一内容保留ID；题目改变后客户端会要求重新作答。</p>
    <label className="block text-xs">标题<input value={lesson.title} onChange={e=>edit({title:e.target.value})} className={field}/></label>
    <label className="block text-xs">课程提要<textarea value={lesson.summary} onChange={e=>edit({summary:e.target.value})} className={field}/></label>
    <label className="block text-xs">正文（每段一行，至少三段）<textarea rows={10} value={lesson.paragraphs.join("\n")} onChange={e=>edit({paragraphs:e.target.value.split(/\r?\n/)})} className={field}/></label>
    <label className="block text-xs">出处、版本与原创或许可说明<textarea value={lesson.source} onChange={e=>edit({source:e.target.value})} className={field}/></label>
    <label className="block text-xs">延伸学习入口<select value={lesson.href} onChange={e=>edit({href:e.target.value})} className={field}>{STUDY_ROUTES.map(href=><option key={href} value={href}>{href}</option>)}</select></label>
    {lesson.questions.map((q,index)=><div key={q.id} className="rounded-xl border p-3"><p className="text-xs font-semibold">第{index+1}题</p><label className="mt-2 block text-xs">题干<textarea value={q.stem} onChange={e=>editQuestion(index,{stem:e.target.value})} className={field}/></label>{q.options.map((option,n)=><label key={n} className="mt-2 block text-xs">选项{n+1}<input value={option} onChange={e=>editQuestion(index,{options:q.options.map((v,i)=>i===n?e.target.value:v)})} className={field}/></label>)}<label className="mt-2 block text-xs">正确答案<select value={q.answer} onChange={e=>editQuestion(index,{answer:Number(e.target.value)})} className={field}>{q.options.map((_,n)=><option key={n} value={n}>选项{n+1}</option>)}</select></label><label className="mt-2 block text-xs">解析<textarea value={q.explanation} onChange={e=>editQuestion(index,{explanation:e.target.value})} className={field}/></label></div>)}
   </>}
   <label className="block text-xs">本次更新说明<textarea value={catalog.releaseNotes} onChange={e=>{setCatalog({...catalog,releaseNotes:e.target.value});setReviewed(false);}} className={field}/></label>
   <label className="flex items-start gap-2 text-xs leading-6"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>我已核对本次正文、答案解析和原创/来源许可；不将学习资料作为个体诊疗或处方。</label>
   <InterfaceButton onClick={()=>void publish()} disabled={!reviewed||busy} className="w-full rounded-lg bg-[#267364] px-3 py-3 text-sm text-white disabled:opacity-50">发布课程资料</InterfaceButton>
  </fieldset>}
 </details>;
}
