'use client';
import {InterfaceButton as Button,InterfaceLabel as Label,InterfaceOption as Option} from './InterfaceControls';
import {useEffect,useRef,useState} from 'react';
import {FIELDS,LABELS,prepareResearch,topics,privacyWarnings,evidence} from '../../backend_deploy/studyResearchPolicy';
import {countStudyCharacters} from '@/lib/studyComments';
export interface ResearchPayload{content:string;research:Record<string,unknown>;valid:boolean;}
export function ResearchComposer({targetId,citationId,onPayload,disabled=false,initial}:{targetId:string;citationId?:string;disabled?:boolean;initial?:{mode:string;fields:Record<string,string>};onPayload:(v:ResearchPayload)=>void}){
 const domain=targetId.split(':')[1],[mode,setMode]=useState(initial?.mode||'knowledge'),[fields,setFields]=useState<Record<string,string>>(initial?.fields||{}),[confirmed,setConfirmed]=useState<string[]>([]),[archive,setArchive]=useState(false),[preview,setPreview]=useState(''),[error,setError]=useState('');
 const callback=useRef(onPayload);callback.current=onPayload;
 useEffect(()=>{
  const selected=Object.keys(fields).filter(k=>fields[k]?.trim()),body={mode,fields:Object.fromEntries(selected.map(k=>[k,fields[k]])),confirmedFields:confirmed,citationId,archiveConsent:archive,consentVersion:topics.consentVersion};
  let text='',valid=false,message='';
  try{text=prepareResearch(targetId,{...body,confirmedFields:selected,archiveConsent:true}).content;prepareResearch(targetId,body);valid=true;}catch(e){message=e instanceof Error?e.message:'请核对分享字段';}
  setPreview(text);setError(message);callback.current({content:text,research:body,valid});
 },[targetId,citationId,mode,fields,confirmed,archive]);
 const choices=domain==='life'?[['knowledge','只谈知识'],['anonymous','匿名展示昵称'],['fragment','分享本人一段人生片段']]:[['knowledge','只谈知识'],['anonymous','匿名展示昵称'],['experience','分享我的一段经历']];
 return <fieldset onDrop={e=>e.preventDefault()} onPaste={e=>{if(Array.from(e.clipboardData.items).some(i=>i.kind==='file')){e.preventDefault();setError('只接收手动选择的纯文字，不能粘贴图片或原件');}}} disabled={disabled} className="space-y-3 rounded-xl border bg-stone-50 p-3"><Label className="block text-sm">本次分享方式<select aria-label="本次分享方式" className="ml-2 max-w-full rounded border p-2" value={mode} onChange={e=>{setMode(e.target.value);setFields({});setConfirmed([]);setArchive(false);}}>{choices.map(([id,label])=><Option key={id} value={id}>{label}</Option>)}</select></Label><p className="text-xs leading-6">前台使用该研习区域的稳定化名，后台仍关联账号以处理举报。这里只接收手动选择的文字；本机原件、姓名、电话、医院、日期、准确年龄和位置均不带入。</p>
 {(FIELDS as Record<string,string[]>)[mode].map(key=><Label key={key} className="block text-sm">{(LABELS as Record<string,string>)[key]}{mode==='experience'?' · 个人经历，未独立核实':''}<textarea aria-label={(LABELS as Record<string,string>)[key]} className="my-1 block w-full rounded border bg-white p-2 text-base" rows={2} value={fields[key]||''} onChange={e=>{setFields(v=>({...v,[key]:e.target.value}));setConfirmed(v=>v.filter(k=>k!==key));}}/>{privacyWarnings(fields[key]||'').map((warning:string)=><small className="block text-red-800" key={warning}>请移除：{warning}</small>)}{fields[key]?.trim()&&<span className="block"><input type="checkbox" checked={confirmed.includes(key)} onChange={e=>setConfirmed(v=>e.target.checked?[...v,key]:v.filter(k=>k!==key))}/> 只分享上方这一字段，已人工核对脱敏</span>}</Label>)}
 {citationId&&<p className="text-xs">已选择来源卡引用；书名、章节、自然段由固定原文索引填写，不接受自造出处。</p>}
 <Label className="block text-sm leading-7"><input type="checkbox" checked={archive} onChange={e=>setArchive(e.target.checked)}/> 同意预览文字经审核后向本区域参加者展示，并允许其他参加者保存带出处的本机学习摘录；不授权再公开转发，撤回不能远程收回他人的本机副本。</Label>
 <details open><summary className="font-semibold">本次拟公开的最小副本</summary><pre className="whitespace-pre-wrap break-words py-2 text-sm">{preview||'填写并去除敏感字段后显示预览；尚未提交'}</pre><p className="text-xs">{preview?countStudyCharacters(preview):0}/500（包括标题与依据）</p></details>
 {error&&<p className="text-xs text-amber-900">{error}</p>}<p className="text-xs leading-6">不能照用他人的药量、针刺深度或复位步骤，不能停药或替代正规诊疗。突然严重胸痛、呼吸困难、意识异常等请及时联系当地急救或线下就医。此处不提供紧急救治服务。</p></fieldset>;
}

export function ResearchCitationFilter({targetId,value,onChange}:{targetId:string;value:string;onChange:(s:string)=>void}){
 const concept=targetId.split(':')[2],chapters=[...new Map(evidence.cards.filter(c=>c.conceptIds.includes(concept)).map(c=>[c.chapterId,c])).values()];
 return <Label className="my-3 block text-sm">按经典章节筛选<select className="my-1 block w-full rounded border p-2" value={value} onChange={e=>onChange(e.target.value)}><Option value="">全部原文与未引文讨论</Option>{chapters.map(c=><Option key={c.chapterId} value={c.chapterId}>{evidence.books.find(b=>b.id===c.bookId)?.name} · {c.chapterTitle}</Option>)}</select></Label>;
}
