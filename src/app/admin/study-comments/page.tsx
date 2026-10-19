"use client";
import {ConfirmDialog} from "@/components/ui/ConfirmDialog";
import {useEffect,useState} from "react";
import {getAdminKey} from "@/lib/admin/client";
import {AdminCard,styles} from "../_shared";
interface Row{id:number;target_id:string;user_id:string;nickname:string;content:string;status:string;created_ms:number;safety?:{decision:string;provider:string;reason:string;flags:string[];checkedAt?:number;};}
interface Report{id:number;comment_id:number;reason:string;content:string;author_id:string;created_ms:number;}
interface Queue{research?:{symptom:{enabled:boolean};life:{enabled:boolean}};safetyCapability?:{configured:boolean;manualReviewRequired:boolean;};comments:Row[];blocked?:Row[];recent:Row[];reports:Report[];overdue:number;enabled:boolean;limits?:{minIntervalSeconds:number;perDay:number;perTargetDay:number};audit:{id:number;actor:string;action:string;target:string;note:string;created_ms:number}[];}
export default function StudyCommentAdmin(){
  const [safetyConfirmed,setSafetyConfirmed]=useState<Record<number,boolean>>({});
  const [researchOpening,setResearchOpening]=useState<"symptom"|"life"|null>(null);
  const [opening,setOpening]=useState(false),[rates,setRates]=useState({minIntervalSeconds:30,perDay:20,perTargetDay:5});
  const [data,setData]=useState<Queue|null>(null),[note,setNote]=useState(''),[evidence,setEvidence]=useState(''),[target,setTarget]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  async function api(path:string,body?:unknown){
    const response=await fetch(`/api/study-comments/admin${path}`,{method:body?'PUT':'GET',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getAdminKey()}`},body:body?JSON.stringify(body):undefined,cache:'no-store'});
    const result=await response.json();if(!response.ok||!result.success)throw new Error(result.error||'操作失败');return result;
  }
  async function load(){try{const result=await api('/queue');setData(result);if(result.limits)setRates(result.limits);}catch(e){setMessage(e instanceof Error?e.message:'读取失败');}}
  useEffect(()=>{void load();},[]);
  async function action(path:string,body:unknown){if(busy)return;setBusy(true);try{await api(path,body);setSafetyConfirmed({});setMessage('已保存');await load();}catch(e){setMessage(e instanceof Error?e.message:'操作失败');}finally{setBusy(false);}}
  function review(id:number,status:string,pinned=false){if(!note.trim()){setMessage('请先填写审核依据');return;}void action(`/comment/${id}`,{status,note,pinned,evidenceUrl:evidence,safetyConfirmed:safetyConfirmed[id]===true});}
  return <div style={{padding:16,color:'#333'}}>
    <ConfirmDialog open={opening} title="开放学习讨论" message="投稿先进入待审队列，未经审核不会公开。请安排管理员持续处理审核及举报。" onCancel={()=>setOpening(false)} onConfirm={()=>{setOpening(false);void action('/config',{enabled:true});}}/>
    <ConfirmDialog open={!!researchOpening} title="开放研习交流" message="只有已落实逐条人工审核、举报值守及当前渠道健康/UGC披露后才确认。开放记录会保留管理员及下方依据，不能将仅供学习代替治理。" onCancel={()=>setResearchOpening(null)} onConfirm={()=>{const domain=researchOpening;setResearchOpening(null);if(domain)void action(`/research/${domain}`,{enabled:true,operatorConfirmed:true,channelDisclosureConfirmed:true,note});}}/>
    <h1 style={{fontSize:22,fontWeight:700}}>工具与穴位学习交流管理</h1>
    <p>纯文字、每条500字素。所有投稿先待审；审核服务或人工队列不可用时不自动公开。请在24小时内处理待审与举报。</p>
    {message&&<p role="status" style={{color:'#B45309'}}>{message}</p>}
    <AdminCard title="运营开关与审核依据">
      <p>内容安全：{data?.safetyCapability?.configured?"已配置云检测，仍需人工复核":"云内容安全尚未配置，当前必须逐条人工合规复核；不会自动公开"}</p>
      <p>全局状态：{data?data.enabled?'已开放':'关闭':'读取中'}；超过24小时待审：{data?.overdue??'—'}条</p>
      <div className="my-3 rounded border p-3"><strong>10号研习域（默认关闭，使用同一待审队列）</strong>{(['symptom','life'] as const).map(d=><p key={d}>{d==='symptom'?'同证研习':'同辰人生'}：{data?.research?.[d]?.enabled?'已开放':'关闭'} <button disabled={busy||note.trim().length<8} onClick={()=>setResearchOpening(d)}>确认值守/披露后开放</button> <button disabled={busy} onClick={()=>void action(`/research/${d}`,{enabled:false,note})}>暂停</button></p>)}</div>
      <label style={styles.label}>审核/撤回/禁言依据<textarea value={note} onChange={e=>setNote(e.target.value)} style={styles.input}/></label>
      <label style={styles.label}>置顶解答的来源链接<input value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="https://…" style={styles.input}/></label>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}>
        <button style={styles.btnPrimary} disabled={busy} onClick={()=>void load()}>刷新队列</button>
        <button style={styles.btnSecondary} disabled={busy} onClick={()=>setOpening(true)}>全局开放（管理员）</button>
        <button style={styles.btnDanger} disabled={busy} onClick={()=>void action('/config',{enabled:false})}>暂停全部讨论</button>
      </div>
      <div className="my-3 space-y-2">{([["minIntervalSeconds","最短间隔（秒，1–3600）"],["perDay","每人每日上限（1–100）"],["perTargetDay","每人每讨论区每日上限（1–100）"]] as const).map(([key,label])=><label key={key} style={styles.label}>{label}<input type="number" min={1} max={key==="minIntervalSeconds"?3600:100} value={rates[key]} onChange={e=>setRates({...rates,[key]:Number(e.target.value)})} style={styles.input}/></label>)}<button disabled={busy} style={styles.btnSecondary} onClick={()=>void action("/config",rates)}>保存留言频率（管理员）</button></div>
      <label style={styles.label}>单讨论区控制<input value={target} onChange={e=>setTarget(e.target.value)} placeholder="例如 tool:bazi 或 standard:LU1" style={styles.input}/></label>
      <button disabled={busy||!target} style={styles.btnSecondary} onClick={()=>void action('/config',{enabled:false,targetId:target})}>关闭本区</button>{' '}
      <button disabled={busy||!target} style={styles.btnSecondary} onClick={()=>void action('/config',{enabled:true,targetId:target})}>恢复本区</button>
    </AdminCard>
    <AdminCard title={`待审核 ${data?.comments.length??0} 条`} style={{marginTop:14}}>
      {data?.comments.map(row=><article key={row.id} style={{borderBottom:'1px solid #DDD',padding:'12px 0'}}>
        <strong>#{row.id} · {row.target_id} · {row.nickname}</strong><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row.content}</p>
        <p style={{fontSize:12,color:'#92400e'}}>安全检测：{row.safety?.decision||'NOT_CHECKED'} · {row.safety?.reason||'待人工复核'}{row.safety?.flags?.length?` · 语境标记：${row.safety.flags.join('、')}`:''}</p>
        <label style={{display:'flex',gap:8,fontSize:13,margin:'10px 0'}}><input type="checkbox" checked={!!safetyConfirmed[row.id]} onChange={e=>setSafetyConfirmed(v=>({...v,[row.id]:e.target.checked}))}/>已逐条阅读正文与昵称，核对涉政、违法、仇恨、暴恐、隐私及危险医疗指导；疑似语境已结合原文复核。此确认仅适用于本条。</label>
        <button disabled={busy} style={styles.btnSecondary} onClick={()=>void action(`/comment/${row.id}/check`,{})}>重新进行内容安全检测</button>{' '}
        <button disabled={busy||!safetyConfirmed[row.id]||row.safety?.decision==='BLOCK'} style={styles.btnPrimary} onClick={()=>review(row.id,'APPROVED')}>审核通过</button>{' '}
        <button disabled={busy||!safetyConfirmed[row.id]||row.safety?.decision==='BLOCK'} style={styles.btnSecondary} onClick={()=>review(row.id,'APPROVED',true)}>通过并置顶有据解答</button>{' '}
        <button disabled={busy} style={styles.btnDanger} onClick={()=>review(row.id,'REJECTED')}>拒绝</button>{' '}
        <button disabled={busy||!note.trim()} style={styles.btnDanger} onClick={()=>void action(`/mute/${encodeURIComponent(row.user_id)}`,{hours:24,reason:note})}>禁言24小时</button>
      </article>)}
    </AdminCard>
    <AdminCard title={`内容安全拦截 ${data?.blocked?.length??0} 条`} style={{marginTop:14}}>{data?.blocked?.map(row=><article key={row.id} style={{padding:12,borderBottom:'1px solid #DDD'}}><strong>#{row.id} · {row.target_id}</strong><p style={{whiteSpace:'pre-wrap'}}>{row.content}</p><p>{row.safety?.reason}</p><p style={{fontSize:12}}>不得直接公开。收到申诉后结合原文和依据核查；重新检测通过后才回到待审列表，仍需人工确认。服务异常不能清除原拦截结论。</p><button disabled={busy} style={styles.btnSecondary} onClick={()=>void action(`/comment/${row.id}/check`,{})}>申诉复核后重新检测</button></article>)}</AdminCard>
    <AdminCard title={`待处理举报 ${data?.reports.length??0} 条`} style={{marginTop:14}}>
      {data?.reports.map(row=><article key={row.id} style={{padding:'12px 0',borderBottom:'1px solid #DDD'}}><strong>举报#{row.id} · 留言#{row.comment_id}</strong><p>{row.reason}</p><p style={{whiteSpace:'pre-wrap'}}>{row.content}</p>
        <button disabled={busy} style={styles.btnDanger} onClick={()=>review(row.comment_id,'REMOVED')}>撤回被举报留言</button>{' '}
        <button disabled={busy||!note.trim()} style={styles.btnSecondary} onClick={()=>void action(`/report/${row.id}`,{note})}>记录处理结果</button>
      </article>)}
    </AdminCard>
    <AdminCard title="已公开留言（最近100条）" style={{marginTop:14}}>{data?.recent.map(row=><div key={row.id} style={{padding:8,borderBottom:'1px solid #EEE'}}>#{row.id} · {row.target_id}<p style={{whiteSpace:'pre-wrap'}}>{row.content}</p><button disabled={busy} style={styles.btnDanger} onClick={()=>review(row.id,'REMOVED')}>撤回</button></div>)}</AdminCard>
    <AdminCard title="最近审核记录" style={{marginTop:14}}>{data?.audit.map(row=><p key={row.id}>{new Date(row.created_ms).toLocaleString()} · {row.actor} · {row.action} #{row.target} · {row.note}</p>)}</AdminCard>
  </div>;
}
