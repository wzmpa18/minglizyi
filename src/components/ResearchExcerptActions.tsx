'use client';
import {InterfaceButton as Button,InterfaceLabel as Label,InterfaceOption as Option} from './InterfaceControls';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {getUserProfile} from '@/lib/auth';
import {stageLifeImport} from '@/lib/lifeImport';
import {createEvent} from '@/lib/calendarEventsStore';
import type {StudyComment} from '@/lib/studyComments';
export function ResearchExcerptActions({comment}:{comment:StudyComment}){
 const router=useRouter(),[message,setMessage]=useState(''),[when,setWhen]=useState(''),[confirmed,setConfirmed]=useState(false);
 if(!comment.research?.archiveConsent)return null;
 function save(visit=false){try{stageLifeImport({title:visit?'交流摘录 · 待关联就诊':'研习交流摘录',text:comment.content,categories:['学习'],tags:['交流摘录','未独立核实',...(visit?['待关联就诊']:[])],sourceRefs:[{kind:'CHAT_QUOTE',author:comment.authorName,at:comment.createdAt,platform:'言道研习交流',messageId:comment.id,shareId:comment.targetId,quote:comment.content,verified:false,exportAllowed:true,reshareAllowed:false}],...(visit?{health:{kind:'visit' as const,userNotes:'学习交流摘录，待本人核对及关联；不是医嘱。'}}:{})},String(getUserProfile()?.userId||''));router.push('/profile/life/');}catch(e){setMessage(e instanceof Error?e.message:'请先登录后保存摘录');}}
 function schedule(){if(!when||!confirmed)return;const [date,time]=when.split('T'),[year,month,day]=date.split('-').map(Number);const result=createEvent({title:'研习复盘',type:'todo',year,month,day,dateMode:'solar',repeat:'none',reminders:[{offsetMinutes:0}],eventTime:time,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,note:`学习复盘，非诊疗安排。来源：${comment.targetId} 留言#${comment.id}；发言人当时化名 ${comment.authorName}`,sourceRef:`study:${comment.targetId.split(':').slice(1).join(':')}:${comment.id}`});setMessage(result.success?'本人确认的学习提醒已保存；锁屏不显示留言正文。':'未保存：'+result.error);if(result.success){setWhen('');setConfirmed(false);}}
 return <div className="my-2 space-y-2 text-xs"><div className="flex flex-wrap gap-3"><Button className="underline" onClick={()=>save()}>保存到我的人生记录</Button><Button className="underline" onClick={()=>save(true)}>关联我的一次就诊</Button></div><details><summary>创建学习／复盘提醒草稿</summary><p className="my-2">不自动安排用药或复查；如需诊疗安排，请以专业医嘱为准。通知只显示普通安排，不含自述。</p><input aria-label="研习复盘时间" type="datetime-local" className="rounded border p-2" value={when} onChange={e=>{setWhen(e.target.value);setConfirmed(false);}}/><Label className="my-2 block"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>我已核对本机时区与时间，仅创建本人学习安排</Label><Button className="rounded border p-2 disabled:opacity-40" disabled={!confirmed||!when} onClick={schedule}>确认保存到言道日历</Button></details>{message&&<p role="status">{message}</p>}</div>;
}
