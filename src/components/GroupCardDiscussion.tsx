"use client";
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {fetchGroupMessages,sendGroupMessage,type ChatMessage} from '@/lib/socialApi';
import {groupCardRequest,type GroupCard,type GroupChartReference} from '@/lib/studyGroupCards';
import {countStudyCharacters,validateStudyText} from '@/lib/studyComments';
import {getUserProfile} from '@/lib/auth';
import {stageLifeImport} from '@/lib/lifeImport';
import {InterfaceButton as Button,InterfaceLabel as Label} from './InterfaceControls';
import {useInterfaceLocale} from '@/lib/interfaceLocale';
const action='rounded-xl border border-stone-300 px-3 py-2 text-sm disabled:opacity-40';
export function GroupCardDiscussion({group,card,reference,onFollow,onCompose}:{group:string;card:GroupCard;reference:GroupChartReference;onFollow:(ref:GroupChartReference)=>void;onCompose:()=>void}){
 const {ui}=useInterfaceLocale(),router=useRouter(),[items,setItems]=useState<ChatMessage[]>([]),[before,setBefore]=useState<string|undefined>(),[text,setText]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[picked,setPicked]=useState<string[]>([]),[saveConsent,setSaveConsent]=useState(false);
 const active=useRef(true),requestId=useRef<string>(crypto.randomUUID()),owner=String(getUserProfile()?.userId||'');
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 useEffect(()=>{requestId.current=crypto.randomUUID();},[reference.cardId,reference.version,reference.anchor]);
 const perform=async(fn:()=>Promise<void>)=>{setBusy(true);setStatus('');try{await fn();}catch(e){if(active.current)setStatus(e instanceof Error?e.message:'操作未完成');}finally{if(active.current)setBusy(false);}};
 async function load(older=false){
  const granted=await groupCardRequest(group,'/'+card.id);if(!granted.success)throw Error(granted.error||'此盘卡已不可访问');
  const result=await fetchGroupMessages(group,0,older?before:undefined);if(!active.current)return;if(!result.success)throw Error(result.error||'读取交流未完成');
  const incoming=(result.messages||[]).filter(m=>m.chartRefs?.some(ref=>ref.cardId===card.id));setBefore(result.nextBefore);
  setItems(old=>older?[...incoming.filter(m=>!old.some(o=>o.id===m.id)),...old]:incoming);setPicked([]);setSaveConsent(false);
 }
 useEffect(()=>{void perform(()=>load());},[card.id]);
 const count=countStudyCharacters(text),chosen=items.filter(m=>picked.includes(m.id)&&m.reviewStatus==='active');
 async function send(){const valid=validateStudyText(text);if(!valid.ok)throw Error(valid.error);const result=await sendGroupMessage(group,valid.text,requestId.current,[{cardId:reference.cardId,version:reference.version,anchor:reference.anchor}]);if(!active.current)return;if(!result.success)throw Error(result.error||'未确认发送');setText('');requestId.current=crypto.randomUUID();await load();setStatus(result.message?.reviewStatus==='active'?'文字已发布；接收方需主动点击引用定位':'已提交，当前未向其他成员展示');}
 async function archive(){
  if(!chosen.length||!saveConsent)throw Error('请核对所选原话并确认本机留档');const result=await groupCardRequest(group,'/'+card.id+'/archive');if(!active.current)return;if(!result.success)throw Error(result.error||'未获留档权限');
  stageLifeImport({title:'群盘交流原话摘录',text:'',categories:['排盘点评'],tags:['群盘交流原话'],people:[...new Set(chosen.map(m=>m.senderName))],sourceRefs:chosen.map(m=>({kind:'CHAT_QUOTE',author:m.senderName,authorId:m.senderId,at:m.createdAt,messageId:m.id,chartVersion:m.chartRefs?.find(r=>r.cardId===card.id)?.version,shareId:'group-card:'+card.id,exportAllowed:result.permissions?.export===true,reshareAllowed:false,quote:m.content,verified:false})),chartRefs:(result.charts||[]).map(c=>({tool:c.toolKey,version:c.version,record:{...c,groupId:group,cardId:card.id,permissions:result.permissions}}))},owner);router.push('/profile/life/');
 }
 return <section className="space-y-3 rounded-xl border p-3"><h3 className="font-semibold">{ui('此盘学习交流')}</h3><p className="text-xs leading-6 theme-text-secondary">{ui('文字仍在原学习群发送；只有原先获准的成员能打开盘内引用。切换盘面不会改写旧消息。')}</p>
 {status&&<p role="status" className="rounded bg-amber-50 p-2 text-sm text-amber-950">{ui(status)}</p>}
 <div className="max-h-80 space-y-3 overflow-auto">{items.map(m=><article key={m.id} className="rounded-lg border p-3"><Label className="text-xs"><input type="checkbox" disabled={m.reviewStatus!=='active'||!(card.mine||card.permissions?.archive)} checked={picked.includes(m.id)} onChange={e=>{setPicked(old=>e.target.checked?[...old,m.id]:old.filter(id=>id!==m.id));setSaveConsent(false);}}/><span translate="no">{m.senderName} · {m.createdAt}</span></Label><p translate="no" className="my-2 whitespace-pre-wrap break-words text-sm">{m.content}</p>{m.reviewStatus!=='active'&&<p className="text-xs text-amber-900">{ui('未送达 · 待核验')}</p>}{m.chartRefs?.filter(r=>r.cardId===card.id).map(ref=><Button className="mr-3 text-xs underline" key={ref.version+ref.anchor} onClick={()=>onFollow(ref)}>{ui('跟随盘内引用')} · {ref.title} · {ref.anchor||ui('整盘')} · {ref.version.slice(0,8)}</Button>)}</article>)}{!items.length&&<p className="text-sm theme-text-secondary">{ui('这一页暂无向你授权的此盘交流，可继续加载更早文字。')}</p>}</div>
 <div className="flex flex-wrap gap-2"><Button className={action} disabled={busy} onClick={()=>void perform(()=>load())}>刷新</Button>{before&&<Button className={action} disabled={busy} onClick={()=>void perform(()=>load(true))}>加载更早文字</Button>}</div>
 {chosen.length>0&&<div className="space-y-2 rounded border p-3"><h4>{ui('所选原话留档预览')} · {chosen.length}</h4>{chosen.map(m=><blockquote translate="no" className="whitespace-pre-wrap break-words border-l-2 pl-2 text-sm" key={m.id}>{m.senderName} · {m.createdAt} · {m.chartRefs?.map(r=>r.version).join(' / ')}
{m.content}</blockquote>)}<Label className="block text-sm"><input type="checkbox" checked={saveConsent} onChange={e=>setSaveConsent(e.target.checked)}/>我已核对来源与原话，仅保存到本机人生记录</Label><Button disabled={busy||!saveConsent} className={action} onClick={()=>void perform(archive)}>保存所选原话</Button></div>}
 <Label className="block text-sm">{ui('引用位置')}：{reference.anchor||ui('整盘')} · {reference.version.slice(0,8)}<textarea aria-label={ui('此盘交流文字')} className="mt-2 w-full rounded border border-stone-300 bg-white p-3 text-base text-stone-950" value={text} rows={3} onFocus={onCompose} onChange={e=>{setText(e.target.value);requestId.current=crypto.randomUUID();}}/></Label><div className="flex justify-between text-sm"><span>{count}/500</span><Button className={action} disabled={busy||!text.trim()||count>500} onClick={()=>void perform(send)}>提交</Button></div>
 </section>;
}
