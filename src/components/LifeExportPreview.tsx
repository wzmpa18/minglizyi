"use client";
import {useMemo,useState} from 'react';
import type {LifeEntry} from '@/lib/lifeRecords';
import {DEFAULT_LIFE_EXPORT_PRIVACY} from '@/lib/lifeExportPrivacy';
import {buildLifeExport,type LifeExportFormat} from '@/lib/lifeExport';
import {exportLifePdf,saveLifeDocument} from '@/lib/lifeDocument';
import {InterfaceButton as Button,InterfaceLabel as Label} from './InterfaceControls';
const action='rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 disabled:opacity-40';
export function LifeExportPreview({entries,format,onClose}:{entries:LifeEntry[];format:LifeExportFormat;onClose:()=>void}){
 const [options,setOptions]=useState({...DEFAULT_LIFE_EXPORT_PRIVACY}),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const draft=useMemo(()=>{try{return {result:buildLifeExport(entries,format,options),error:''};}catch(e){return {result:null,error:e instanceof Error?e.message:'无法建立导出预览'};}},[entries,format,options]);
 async function save(){if(!confirmed||!draft.result)return;setBusy(true);setMessage('');try{
  if(format==='pdf'){await exportLifePdf(draft.result.body,draft.result.name);setMessage('已打开本机PDF保存/打印，请在系统窗口完成；没有上传正文');}
  else{const r=await saveLifeDocument(new Blob([draft.result.body],{type:draft.result.type}),draft.result.name);setMessage(r.state==='native-system-confirmed'?'系统已确认保存所选副本，请妥善保管明文文件':'已请求浏览器下载，请检查保存结果；不能据此确认文件已写入云盘');}
 }catch(e){setMessage(e instanceof Error?e.message:'未完成导出，原件仍保留');}finally{setBusy(false);}}
 return <div role="dialog" aria-modal="true" aria-label="所选导出脱敏预览" className="fixed inset-0 z-[136] overflow-auto bg-stone-950/95 p-4 pt-[max(28px,calc(env(safe-area-inset-top)+16px))] text-stone-950"><section className="mx-auto max-w-3xl space-y-4 rounded-2xl bg-white p-4">
  <h2 className="text-lg font-semibold">所选导出脱敏预览</h2><p className="text-sm leading-6">本次{entries.length}条 · {format.toUpperCase()}。只在本机生成另一个副本，不修改原件和加密备份。自动隐藏只覆盖已识别字段和字面模式，无法保证任意经历描述都匿名；请检查预览并补充需要隐藏的原文。</p>
  {format==='ics'?<p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">日历文件必须包含安排日期和时区，默认只含通用私人安排标题，不含姓名、病名、药物和记录正文。请核对下方全部安排后再导出。</p>:<>
   <fieldset className="grid gap-3 text-sm sm:grid-cols-2"><legend className="mb-2 font-semibold">本次副本设置（默认保护隐私）</legend>{([['hidePeople','隐藏已记录人物及医生姓名'],['hideOrganizations','隐藏已记录医疗机构及科室'],['hideDates','隐藏常见完整日期和月日'],['hideContacts','隐藏常见号码、邮箱与链接'],['includeSources','包括已获准导出的来源与原话'],['includeCharts','包括已获准导出的盘面副本'],['includeAttachmentIndex','包括原件名称索引（不含原图）']] as const).map(([key,label])=><Label key={key}><input type="checkbox" disabled={busy} checked={options[key]} onChange={e=>{setOptions(old=>({...old,[key]:e.target.checked}));setConfirmed(false);}}/>{label}</Label>)}</fieldset>
   <Label className="block text-sm">另外隐藏的原文片段（一行一项，最多50项）<textarea className="mt-2 w-full rounded-lg border border-stone-300 bg-white p-3 text-base text-stone-950" rows={3} value={options.extraWords} disabled={busy} onChange={e=>{setOptions(old=>({...old,extraWords:e.target.value}));setConfirmed(false);}}/></Label>
  </>}
  {draft.error?<p role="alert" className="rounded bg-red-50 p-3 text-red-950">{draft.error}</p>:<><p className="text-xs">实际导出共{draft.result?.body.length}字符。下方完整预览可滚动，内容没有因预览而截断。JSON为所选副本，恢复档案请使用独立的加密备份。</p><pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-all rounded-lg border bg-stone-50 p-3 text-sm leading-6">{draft.result?.body}</pre></>}
  <Label className="block text-sm leading-7"><input type="checkbox" checked={confirmed} disabled={busy||!draft.result} onChange={e=>setConfirmed(e.target.checked)}/>我已核对实际导出内容，确认所选资料与隐藏范围</Label>
  {message&&<p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">{message}</p>}
  <div className="flex flex-wrap gap-3"><Button className={action} disabled={busy||!confirmed||!draft.result} onClick={()=>void save()}>{busy?'正在本机处理…':'确认保存所选副本'}</Button><Button className={action} disabled={busy} onClick={onClose}>关闭预览</Button></div>
 </section></div>;
}
