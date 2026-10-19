"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchGroupInvitations, respondGroupInvitation, type GroupInvitation } from "@/lib/socialApi";
import { useAccountScope } from "@/lib/useAccountScope";
function Invitations() {
 const router=useRouter(),alive=useRef(true);
 const [items,setItems]=useState<GroupInvitation[]>([]),[selected,setSelected]=useState(""),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{alive.current=true;void fetchGroupInvitations().then(r=>{if(alive.current&&r.success)setItems(r.invitations||[]);});return()=>{alive.current=false;};},[]);
 async function respond(item:GroupInvitation,accept:boolean){if(busy||accept&&!consent)return;setBusy(true);setMessage("");try{const r=await respondGroupInvitation(item.id,accept,consent);if(!alive.current)return;if(!r.success){setMessage(r.error||"处理失败，请重试");return;}setItems(old=>old.filter(i=>i.id!==item.id));setSelected("");setConsent(false);if(accept&&r.groupId)router.push("/groups/chat?id="+encodeURIComponent(r.groupId));}catch{if(alive.current)setMessage("网络暂不可用，尚未确认处理，请重试");}finally{if(alive.current)setBusy(false);}}
 if(!items.length&&!message)return null;
 return <section className="mx-3 mt-3 rounded-xl bg-white p-4 space-y-3"><h2 className="font-semibold text-gray-800">学习群邀请</h2><p className="text-xs text-gray-600">由你决定是否加入。入群不会公开本机记录、健康资料或生日；加入前的盘卡和消息不会自动向你开放。</p>{items.map(item=><div className="border-t pt-3" key={item.id}><p className="text-sm" translate="no">{item.inviterName} 邀请你加入「{item.name}」</p>{selected===item.id?<><label className="flex gap-2 text-xs py-3"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>我已满18岁，自愿加入此学习群，遵守文字交流规则；不发表他人隐私、危险诊疗建议或广告。</label><button className="rounded bg-purple-700 px-3 py-2 text-sm text-white disabled:opacity-40" disabled={busy||!consent} onClick={()=>void respond(item,true)}>确认加入</button><button className="ml-3 text-sm" disabled={busy} onClick={()=>{setSelected("");setConsent(false);}}>取消</button></>:<button className="text-sm text-purple-800 py-2" disabled={busy} onClick={()=>{setSelected(item.id);setConsent(false);}}>查看并决定</button>}<button className="ml-3 text-sm text-gray-600" disabled={busy} onClick={()=>void respond(item,false)}>拒绝邀请</button></div>)}{message&&<p role="status" className="text-sm text-red-700">{message}</p>}</section>;
}
export default function StudyGroupInvitations(){const owner=useAccountScope();return <Invitations key={owner}/>;}
