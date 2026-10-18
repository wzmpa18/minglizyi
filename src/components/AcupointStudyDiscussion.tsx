"use client";
import {ConfirmDialog} from "@/components/ui/ConfirmDialog";
import { InterfaceButton } from "@/components/InterfaceControls";
import { interfaceText as ui, useInterfaceLocale } from "@/lib/interfaceLocale";
import Link from "next/link";
import { useEffect,useRef,useState } from "react";
import { getUserProfile,getUserToken } from "@/lib/auth";
import { countStudyCharacters,validateStudyText,studyRequest,type StudyComment,type StudyCommentConfig } from "@/lib/studyComments";

export function AcupointStudyDiscussion({targetId,title}:{targetId:string;title:string}){
  // Remount on resource change so requests/drafts/replies cannot leak between points.
  return <PointDiscussion key={`${getUserProfile()?.userId||'guest'}:${targetId}`} targetId={targetId} title={title}/>;
}
function PointDiscussion({targetId,title}:{targetId:string;title:string}){
  useInterfaceLocale();
  const [confirmation,setConfirmation]=useState<{message:string;run:()=>void}|null>(null);
  const [comments,setComments]=useState<StudyComment[]>([]),[text,setText]=useState(''),[message,setMessage]=useState(''),[config,setConfig]=useState<StudyCommentConfig|null>(null);
  const [mine,setMine]=useState<{id?:string;status?:string}[]>([]),[blocks,setBlocks]=useState<{userId?:string}[]>([]),[reply,setReply]=useState<StudyComment|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[draftReady,setDraftReady]=useState(false);
  const requestId=useRef(''),version=useRef(0),myId=String(getUserProfile()?.userId||'');
  const draftKey=`acupoint-study-draft-v1:${myId||'guest'}:${targetId}`;
  let count=0,countSupported=true;try{count=countStudyCharacters(text);}catch{countSupported=false;}
  useEffect(()=>{try{setText(localStorage.getItem(draftKey)||'');}catch{}setDraftReady(true);},[draftKey]);
  useEffect(()=>{if(!draftReady)return;try{if(text)localStorage.setItem(draftKey,text);else localStorage.removeItem(draftKey);}catch{setMessage('本机存储不可用，请保留尚未发表的输入');}},[text,draftKey,draftReady]);
  async function load(){
    const turn=++version.current;setLoading(true);
    const [result,own,blocked]=await Promise.all([studyRequest(`/target/${encodeURIComponent(targetId)}`),getUserToken()?studyRequest(`/mine/${encodeURIComponent(targetId)}`):Promise.resolve(null),getUserToken()?studyRequest('/blocks'):Promise.resolve(null)]);
    if(turn!==version.current)return;
    if(result.success){setConfig(result.config||null);setComments(result.comments||[]);}else{setConfig(null);setComments([]);setMessage(result.error||'暂时无法读取学习讨论');}
    setMine(own?.success?own.items||[]:[]);setBlocks(blocked?.success?blocked.items||[]:[]);setLoading(false);
  }
  useEffect(()=>{void load();return()=>{version.current++;};},[targetId]);
  async function submit(){
    if(busy)return;if(!getUserToken()){setMessage('请先登录后参与学习讨论');return;}
    const check=validateStudyText(text);if(!check.ok){setMessage(check.error||'请检查输入');return;}
    if(!config?.enabled){setMessage('讨论暂未开放，草稿仅保存在本机');return;}
    if(!navigator.onLine){setMessage('当前离线，草稿仅保存在本机；联网后请手动发表');return;}
    if(!requestId.current)requestId.current=crypto.randomUUID();
    const turn=version.current;setBusy(true);
    const result=await studyRequest(`/target/${encodeURIComponent(targetId)}`,'POST',{content:text,parentId:reply?.parentId||reply?.id||null,requestId:requestId.current});
    if(turn!==version.current)return;
    if(result.success){setText('');setReply(null);requestId.current='';setMessage(result.message||'已提交，审核通过后展示');await load();}
    else setMessage(result.error||'未能发表，草稿仍在本机');setBusy(false);
  }
  async function action(path:string,method:string,body?:unknown){
    if(busy)return;if(!getUserToken()){setMessage('请先登录');return;}
    const turn=version.current;setBusy(true);const result=await studyRequest(path,method,body);if(turn!==version.current)return;
    setMessage(result.message||(result.success?'操作已完成':result.error||'操作失败'));if(result.success)await load();setBusy(false);
  }
  return <section aria-label="文字学习交流" style={{margin:'12px',padding:'14px',background:'white',borderRadius:16,color:'#333',fontSize:13}}>
    <strong style={{fontSize:15}}>💬 {ui(title)}</strong><p style={{color:'#666',fontSize:12}}>用户学习讨论 · 与正文和医学依据分开 · 仅限文字，审核通过后公开</p>
    {reply&&<div style={{padding:8,background:'#F3EDF7'}}>回复{reply.authorName}<InterfaceButton onClick={()=>{setReply(null);requestId.current='';}} style={{marginLeft:8}}>{ui("取消回复")}</InterfaceButton></div>}
    <textarea disabled={busy} aria-label="学习留言，仅支持文字" value={text} rows={4} onChange={e=>{setText(e.target.value);requestId.current='';}} onPaste={e=>{if(Array.from(e.clipboardData.items).some(item=>item.kind==='file')){e.preventDefault();setMessage('仅支持纯文字，不能粘贴图片或附件');}}} onDrop={e=>{e.preventDefault();setMessage('不支持图片或文件，请输入文字');}} placeholder="提问、分享理解或指出资料问题…" style={{width:'100%',boxSizing:'border-box',padding:10,border:'1px solid #CDB8DC',borderRadius:10,background:'#FAF7FC',color:'#333',fontSize:14,lineHeight:1.7}}/>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8,gap:8}}>
      <span aria-live="polite" style={{color:count>500?'#B71C1C':'#666'}}>{countSupported?`${count}/500`:'系统暂不支持文字计数'}</span>
      <InterfaceButton type="button" onClick={()=>void submit()} disabled={busy||!countSupported||count===0||count>500||!config?.enabled} style={{padding:'8px 14px',border:0,borderRadius:20,background:'#7B2FBE',color:'white',opacity:busy||!config?.enabled||count>500 ? .5 : 1}}>{ui(busy?'处理中…':'提交审核')}</InterfaceButton>
    </div>
    {!config?.enabled&&!loading&&<p style={{color:'#666'}}>学习讨论暂未开放。输入仅保存在本机，尚未发表。</p>}
    {message&&<p role="status" style={{color:'#8D3800'}}>{message}</p>}
    <div style={{display:'flex',gap:12,margin:'10px 0'}}><InterfaceButton onClick={()=>void load()} disabled={loading||busy}>{ui("刷新留言")}</InterfaceButton><Link href="/profile/feedback/">{ui("用户反馈")}</Link></div>
    {mine.filter(item=>item.status==='PENDING').map(item=><div key={item.id} style={{padding:8,background:'#FFF8E1'}}>我的留言 #{item.id} · 待审核 <InterfaceButton disabled={busy} onClick={()=>{setConfirmation({message:'撤回这条待审留言？',run:()=>{void action(`/comment/${item.id}`,'DELETE');}});}}>撤回</InterfaceButton></div>)}
    {loading?<p>{ui("正在加载…")}</p>:comments.length===0?<p style={{color:'#777'}}>暂无已通过审核的学习留言。</p>:comments.map(comment=><article key={comment.id} style={{padding:'12px 0',borderTop:'1px solid #EEE'}}>
      <div style={{fontWeight:700,color:'#6C2D98'}}>{comment.authorName}{comment.pinned?' · 置顶解答':''}</div>
      {comment.parentId&&<small style={{color:'#777'}}>回复留言 #{comment.parentId}</small>}
      <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',lineHeight:1.8}}>{comment.content}</p>
      {comment.evidenceUrl&&<a href={comment.evidenceUrl} target="_blank" rel="noopener noreferrer">解答依据</a>}
      <div style={{display:'flex',flexWrap:'wrap',gap:12,fontSize:12}}>
        <InterfaceButton disabled={busy} onClick={()=>{setReply(comment);requestId.current='';}}>{ui("回复")}</InterfaceButton>
        {String(comment.authorId)===myId?<InterfaceButton disabled={busy} onClick={()=>{setConfirmation({message:'删除自己的留言及其回复？',run:()=>{void action(`/comment/${comment.id}`,'DELETE');}});}}>{ui("删除")}</InterfaceButton>:<>
          <InterfaceButton disabled={busy} onClick={()=>{setConfirmation({message:'举报这条不当留言？',run:()=>{void action(`/comment/${comment.id}/report`,'POST',{reason:'用户举报：请审核本条学习留言'});}});}}>{ui("举报")}</InterfaceButton>
          <InterfaceButton disabled={busy} onClick={()=>{setConfirmation({message:'屏蔽此用户在学习讨论中的留言？',run:()=>{void action(`/blocks/${encodeURIComponent(comment.authorId)}`,'POST');}});}}>{ui("屏蔽用户")}</InterfaceButton>
        </>}
      </div>
    </article>)}
    {blocks.length>0&&<details style={{marginTop:12}}><summary>学习讨论屏蔽管理（{blocks.length}）</summary>{blocks.map(item=><div key={item.userId}>用户{item.userId} <InterfaceButton disabled={busy} onClick={()=>void action(`/blocks/${encodeURIComponent(item.userId||'')}`,'DELETE')}>{ui("取消屏蔽")}</InterfaceButton></div>)}</details>}
    <ConfirmDialog open={!!confirmation} title="请确认" message={confirmation?.message} onCancel={()=>setConfirmation(null)} onConfirm={()=>{const run=confirmation?.run;setConfirmation(null);run?.();}}/>
  </section>;
}
