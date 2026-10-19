'use client';
import {InterfaceButton as Button,InterfaceLabel as Label,InterfaceOption as Option} from './InterfaceControls';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ConfirmDialog} from './ui/ConfirmDialog';
import {getUserToken} from '@/lib/auth';
import {studyRequest} from '@/lib/studyComments';
import {useAccountScope} from '@/lib/useAccountScope';
import {AcupointStudyDiscussion} from './AcupointStudyDiscussion';
type Access={success:boolean;enabled?:boolean;joined?:boolean;eligible?:boolean;consentVersion?:string;error?:string;message?:string};
export function ResearchAccess({targetId,title,citationId}:{targetId:string;title:string;citationId?:string}){
 const owner=useAccountScope();return <ScopedResearchAccess key={`${owner}:${targetId}`} targetId={targetId} title={title} citationId={citationId}/>;
}
function ScopedResearchAccess({targetId,title,citationId}:{targetId:string;title:string;citationId?:string}){
 const domain=targetId.split(':')[1],[state,setState]=useState<Access|null>(null),[birth,setBirth]=useState(''),[checks,setChecks]=useState([false,false,false]),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[exitConfirm,setExitConfirm]=useState(false);
 const active=useRef(true);
 async function load(){const r=await studyRequest(`/research/${domain}`) as Access;if(active.current){setState(r);if(!r.success)setMessage(r.error||'读取失败，请重试');}}
 useEffect(()=>{active.current=true;void load();return()=>{active.current=false;};},[domain]);
 async function act(exit=false){setBusy(true);try{const r=await studyRequest(`/research/${domain}`,exit?'DELETE':'PUT',exit?undefined:{birthDate:birth,adultConsent:checks[0],inferenceConsent:checks[1],publicScopeConsent:checks[2],consentVersion:state?.consentVersion}) as Access;if(!active.current)return;setMessage(r.message||r.error||'操作未完成');if(r.success){setBirth('');setChecks([false,false,false]);await load();}}finally{if(active.current)setBusy(false);}}
 return <section className="my-3 rounded-xl border border-stone-300 bg-white p-3 text-stone-900"><h3 className="font-semibold">{title}</h3><p className="my-2 text-sm leading-7">同症状不等于同病或适用相同治疗；同辰不表示相同人生。交流仅对主动参加的成年账号可见，仍可能被他人保存。不能上传原始病历、真实出生资料或联系方式。私人记录不会自动进入这里。</p>
 {!getUserToken()?<Link href="/login/" className="underline">登录后自愿参加；古籍仍可直接阅读</Link>:state?.joined?<><Button className="my-2 rounded border p-2 text-sm" disabled={busy} onClick={()=>setExitConfirm(true)}>退出并撤下本人片段</Button><AcupointStudyDiscussion targetId={targetId} title="" expanded researchCitationId={citationId}/></>:<>
 {!state?.enabled?<p>此研习交流尚未开放，需先完成自动审核配置及渠道披露；当前没有上传自述。</p>:state.eligible===false?<Link href="/discover/tongchen/" className="underline">先主动加入同辰雅集，再单独确认人生主题交流</Link>:<div className="space-y-3"><Label className="block">本人出生日期（仅一次性校验18岁，不保存）<input className="block rounded border p-2" type="date" aria-label="研习成年核验日期" value={birth} onChange={e=>setBirth(e.target.value)}/></Label>{['我已满18岁，使用本人已验证账号，自愿参加。','我理解症状或同辰标签可能使他人推断敏感健康或出生信息，仍同意此用途。','我理解片段向已参加的成年人展示，先审后公开；可撤回、举报和退出，私人原件不会上传。'].map((s,i)=><Label className="block text-sm leading-7" key={s}><input type="checkbox" checked={checks[i]} onChange={e=>setChecks(v=>v.map((n,k)=>k===i?e.target.checked:n))}/> {s}</Label>)}<Button className="rounded bg-purple-800 px-4 py-2 text-white disabled:opacity-40" disabled={busy||!birth||checks.some(v=>!v)} onClick={()=>void act()}>确认参加</Button></div>}
 </>}{message&&<p role="status" className="my-2 text-sm text-amber-900">{message}</p>}<Button className="m-2 text-xs underline" disabled={busy} onClick={()=>void load()}>刷新状态</Button><ConfirmDialog open={exitConfirm} title="退出研习交流" message="退出会撤下本人该区所有片段；他人已保存的本机摘录无法远程收回。是否退出？" onCancel={()=>setExitConfirm(false)} onConfirm={()=>{setExitConfirm(false);void act(true);}}/></section>;
}
