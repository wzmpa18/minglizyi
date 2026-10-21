"use client";
import { useEffect, useState } from "react";
import { getAdminKey } from "@/lib/admin/client";
type Event = {id:number;time:string;actor:string;kind:string;method:string;route:string;status:number;event_hash:string};
export default function SecurityAuditPage(){
  const [events,setEvents]=useState<Event[]>([]),[message,setMessage]=useState(""),[first,setFirst]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  async function load(before?:number){setBusy(true);try{
    const r=await fetch("https://yandaoguoxue.yandao.vip/api/admin/security/events?limit=50"+(before?`&before=${before}`:""),{headers:{Authorization:"Bearer "+(getAdminKey()||"")},cache:"no-store"});
    const j=await r.json();if(!r.ok||!j.success)throw Error(j.error||"读取失败");
    setEvents(j.data.events);setFirst(j.data.policy.firstEventAt);setMessage("");
  }catch(e){setMessage(e instanceof Error?e.message:"读取失败");}finally{setBusy(false);}}
  useEffect(()=>{void load();},[]);
  return <section style={{padding:24}}><h1>安全审计</h1><p>服务器实时记录，包含访问结果、身份门禁及管理操作。日志禁止通过业务接口修改或删除；不自动清理，至少保留六个月。</p><p>实际最早记录：{first||"暂无记录"}。历史不足六个月如实保留，不补造。服务器管理员仍须落实异机备份、容量监控和独立审计。</p><button disabled={busy} onClick={()=>load()}>刷新最新记录</button><p role="status">{message}</p><div style={{overflowX:"auto"}}><table style={{width:"100%",fontSize:14}}><thead><tr>{["编号","时间","主体","事件","接口","状态","校验摘要"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{events.map(e=><tr key={e.id}><td>{e.id}</td><td>{e.time}</td><td>{e.actor}</td><td>{e.kind}</td><td>{e.method} {e.route}</td><td>{e.status}</td><td title={e.event_hash}>{e.event_hash.slice(0,12)}</td></tr>)}</tbody></table></div>{events.length===50&&<button disabled={busy} onClick={()=>load(events.at(-1)?.id)}>查看更早记录</button>}</section>;
}
