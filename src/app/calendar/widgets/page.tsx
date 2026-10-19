"use client";
import { InterfaceButton } from "@/components/InterfaceControls";
import {useEffect,useState} from "react";
import {BrandHeader} from "@/components/shared";
import {hasNativeCalendar,LocalCalendar,syncNativeCalendar,type NativeCalendarStatus} from "@/lib/nativeCalendar";
export default function WidgetSettings(){
 const [status,setStatus]=useState<NativeCalendarStatus|null>(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{if(hasNativeCalendar())void LocalCalendar.status().then(setStatus).catch(()=>setMessage("当前安装包尚未接入原生日历能力，请安装新版后再检查。"));},[]);
 async function act(action:()=>Promise<unknown>){if(busy)return;setBusy(true);try{await action();setStatus(await LocalCalendar.status());}catch(error){setMessage(error instanceof Error?error.message:"操作未完成");}finally{setBusy(false);}}
 return <main className="mx-auto min-h-screen max-w-[500px] pb-24" style={{background:"var(--theme-bg)",color:"var(--theme-text-primary)"}}><BrandHeader title="桌面组件与提醒" showBack/>
  <section className="m-3 space-y-4 rounded-2xl p-5" style={{background:"var(--theme-card-bg)"}}>
   <h1 className="text-xl font-semibold">系统日历能力</h1><p className="text-sm leading-7">默认只在本机处理日程。锁屏通知仅显示“有一项安排”，不会显示生日、姓名、出生八字或记事详情。只预排未来30天内的有限队列，打开应用时补充。本应用的队列预算与系统容量不同，登记也不代表已送达。</p>
   {!status?<p>网页可使用本机记事和前台时钟；系统桌面组件、充电屏保与后台本地通知需要安装对应原生新版。网页快捷方式不是系统组件。</p>:<>
    <p className="text-sm leading-7">本轮应用预算{status.queueBudget||32}项 · {status.platform==="android"?"上次登记":"系统当前待发"}{status.scheduled||0}项 · 待下次打开补排{status.deferred||0}项{status.plannedThrough?` · 本轮计划最后安排：${new Date(status.plannedThrough).toLocaleString()}`:''}{status.registrationFailed?` · ${status.registrationFailed}项登记失败，请检查权限后刷新`:''}。已登记只表示系统接受了请求，不表示通知送达。</p>
    <p>通知：{status.notifications?"已授权":"未授权"} · 桌面组件：{status.widgets?"当前包已接入":"当前包不支持"}</p>
    <InterfaceButton className="rounded border p-3" disabled={busy} onClick={()=>void act(async()=>{setStatus(await LocalCalendar.requestAuthorization());await syncNativeCalendar();setMessage("权限状态已更新。拒绝授权不影响本机日历。");})}>申请系统通知权限</InterfaceButton>
    <InterfaceButton className="rounded border p-3" disabled={busy} onClick={()=>void act(async()=>{const result=await syncNativeCalendar();setStatus(result);setMessage(`已向系统同步${result?.scheduled||0}条提醒；不代表每条已经送达。`);})}>刷新组件快照与提醒</InterfaceButton>
    {status.widgets&&<div className="space-y-2"><h2 className="font-semibold">主动添加桌面组件</h2>{[["clock","简约时钟"],["pillars","四柱日历"],["agenda","隐私日程卡"]].map(([kind,label])=><InterfaceButton key={kind} disabled={busy} className="mr-2 rounded border p-3" onClick={()=>void act(async()=>{await syncNativeCalendar();const result=await LocalCalendar.addWidget({kind});setMessage(result.requested?"已请求系统添加，请在桌面确认；尚未确认添加成功。":"请在系统桌面组件列表中添加。");})}>{label}</InterfaceButton>)}</div>}
    {status.platform==="android"&&<><p className="text-sm">精确闹钟：{status.exactAlarms?"系统允许":"未授权，将采用可能延迟的系统调度"}。仅在确需准点日程时主动授权；系统强行停止、关机或省电限制仍可能影响送达。</p><InterfaceButton className="rounded border p-3" onClick={()=>void act(()=>LocalCalendar.openExactSettings())}>查看精确闹钟授权</InterfaceButton><InterfaceButton className="rounded border p-3" onClick={()=>void act(()=>LocalCalendar.openDreamSettings())}>设备支持时设置充电屏保</InterfaceButton></>}
   </>}
   <p className="text-xs leading-6 opacity-70">历法组件使用与APP相同的预计算结果，覆盖7天；快照过期时提示打开应用刷新。时间由系统控件显示，四柱显示快照生成时刻。普通应用无法接管所有机型的息屏显示，也不能在真正关屏后绘制。</p>{message&&<p role="status" className="text-sm">{message}</p>}
  </section></main>;
}
