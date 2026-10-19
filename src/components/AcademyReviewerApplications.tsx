"use client";
import {useEffect,useState} from "react";
import {fetchAcademyAdminApplications,reviewAcademyAdminApplication,TRACK_LIST,type AcademyAdminApplication} from "@/lib/academyApi";
import {validateStudyText} from "@/lib/studyComments";

/** Mounted only after the workbench's server authorization check. */
export default function AcademyReviewerApplications(){
 const [items,setItems]=useState<AcademyAdminApplication[]>([]),[notes,setNotes]=useState<Record<string,string>>({}),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 async function load(){setBusy(true);try{const result=await fetchAcademyAdminApplications();if(!result.success){setItems([]);setMessage(result.error||"登记列表未加载");return;}setItems(result.items||[]);}catch{setItems([]);setMessage("登记列表暂不可用");}finally{setBusy(false);}}
 useEffect(()=>{let live=true;void fetchAcademyAdminApplications().then(r=>{if(!live)return;if(r.success)setItems(r.items||[]);else setMessage(r.error||"登记列表未加载");}).catch(()=>{if(live)setMessage("登记列表暂不可用");});return()=>{live=false;};},[]);
 async function review(item:AcademyAdminApplication,action:"vetted"|"rejected"){
  const note=validateStudyText(notes[item.id]||"");if(!note.ok){setMessage(note.error||"请填写500字以内的复核依据");return;}setBusy(true);
  try{const result=await reviewAcademyAdminApplication(String(item.id),action,note.text);setMessage(result.message||result.error||"复核未完成");if(result.success)await load();}catch{setMessage("复核未确认，请刷新查看状态后再操作");}finally{setBusy(false);}
 }
 return <details className="mb-4 rounded-xl border border-purple-100 bg-white p-4 text-gray-800"><summary className="cursor-pointer text-sm font-semibold text-purple-900">审核员登记复核 · {items.length}项待处理</summary><p className="mt-2 text-xs leading-6 text-gray-600">登记内容仅供资质复核。通过复核不会自动赋予访问权限；管理人员核实后须另行配置授权名单。不会因用户注册或随意输入密码开放后台。</p>{message&&<p role="status" className="my-2 text-sm text-amber-900">{message}</p>}{items.map(item=><article key={item.id} className="mt-3 space-y-2 rounded-lg border p-3"><h3 className="text-sm font-semibold">登记 #{item.id} · 用户 {item.user_id} · {TRACK_LIST.find(t=>t.key===item.track)?.name||item.track}</h3><p className="whitespace-pre-wrap break-words text-xs leading-6">经验：{item.experience}</p><p className="whitespace-pre-wrap break-words text-xs leading-6">申请：{item.reason}</p><textarea aria-label={`登记${item.id}复核依据`} className="w-full rounded border p-2 text-sm" rows={2} value={notes[item.id]||""} onChange={e=>setNotes(current=>({...current,[item.id]:e.target.value}))}/><div className="flex gap-3"><button disabled={busy} className="rounded border px-3 py-2 text-xs disabled:opacity-40" onClick={()=>void review(item,"vetted")}>资质复核通过（不授予权限）</button><button disabled={busy} className="rounded border px-3 py-2 text-xs disabled:opacity-40" onClick={()=>void review(item,"rejected")}>退回申请</button></div></article>)}<button disabled={busy} className="mt-3 rounded border px-3 py-2 text-xs" onClick={()=>void load()}>{busy?"处理中":"刷新登记"}</button></details>;
}
