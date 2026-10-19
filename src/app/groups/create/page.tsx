"use client";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { PageLoginGuard } from "@/components/PageLoginGuard";
import { createGroup } from "@/lib/socialApi";
import { useAccountScope } from "@/lib/useAccountScope";
const topics=[["classics","经典原典"],["calendar","历法与节气"],["tool-learning","排盘工具学习"],["medical-literature","中医古籍学习"]];
function CreateStudyGroup(){
 const router=useRouter(),[name,setName]=useState(""),[topic,setTopic]=useState("classics"),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const request=useRef({key:"",id:""}),alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 async function submit(){if(busy||!consent||!name.trim())return;const key=JSON.stringify([name.trim(),topic]);if(request.current.key!==key)request.current={key,id:crypto.randomUUID()};setBusy(true);setMessage("");try{const result=await createGroup(name.trim(),{topic,adultConsent:consent,requestId:request.current.id});if(!alive.current)return;if(result.success&&result.group){router.push("/groups/chat?id="+encodeURIComponent(result.group.groupId));}else setMessage(result.error||"提交失败，输入保留，请重试");}catch{if(alive.current)setMessage("网络暂不可用，输入保留；尚未确认建群");}finally{if(alive.current)setBusy(false);}}
 return <main className="mx-auto min-h-screen max-w-lg bg-[var(--bg)] text-[var(--text-primary)] pb-24"><PageLoginGuard/><BrandHeader title="创建专题学习群" showBack/><section className="m-4 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 space-y-5"><p className="text-sm leading-6">围绕一个学习专题交流，每群最多50人，每日最多创建3群。群名须审核，管理员邀请已同意的好友；受邀者自行确认后入群。</p><label className="block text-sm">群名称<input className="mt-2 w-full rounded-lg border p-3 bg-transparent" value={name} maxLength={30} onChange={e=>setName(e.target.value)} placeholder="例如：历法原典共读"/></label><label className="block text-sm">学习专题<select className="mt-2 w-full rounded-lg border p-3 bg-[var(--card-bg)]" value={topic} onChange={e=>setTopic(e.target.value)}>{topics.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><p className="text-xs leading-6 text-[var(--text-secondary)]">文字每条最多500字，审核不可用时先待审。不得发布他人病历、未经授权的资料、诊疗操作建议或广告；群主和管理员无法读取成员的本机笔记或健康库。是否开放建群仍取决于当前渠道。</p><label className="flex gap-3 text-sm leading-6"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>我已满18岁，自愿创建此学习群，并遵守以上交流规则。</label><button className="w-full rounded-xl bg-purple-800 py-3 text-white disabled:opacity-40" disabled={busy||!consent||!name.trim()} onClick={()=>void submit()}>{busy?"正在提交":"提交群名审核"}</button>{message&&<p className="text-sm text-red-700" role="status">{message}</p>}</section></main>;
}
export default function Page(){const scope=useAccountScope();return <CreateStudyGroup key={scope}/>;}
