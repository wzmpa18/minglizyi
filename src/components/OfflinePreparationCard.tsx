"use client";
import {useEffect,useState} from "react";
import {offlinePreparationStatus,prepareOfflineLearning,type OfflinePreparation} from "@/lib/offlineLearning";
export default function OfflinePreparationCard(){
 const [state,setState]=useState<OfflinePreparation>(offlinePreparationStatus);
 useEffect(()=>{const update=()=>setState(offlinePreparationStatus());window.addEventListener("offline-preparation",update);void prepareOfflineLearning();return()=>window.removeEventListener("offline-preparation",update);},[]);
 return <section className="mb-3 rounded-2xl bg-white p-4" data-testid="durable-offline-status">
  <h2 className="mb-2 font-bold text-purple-900">手机离线资料</h2>
  <p className="text-sm leading-6 text-gray-700">排盘算法、基础解读和内置资料随 APP 安装。其他已授权的学习资料首次打开后自动在后台下载，不影响使用。</p>
  <p className="mt-2 text-sm font-medium text-purple-800">{state.message}</p>
  <p className="mt-1 text-xs text-gray-500">已下载 {state.items} 条 · {state.completed}/{state.total} 组完成</p>
  <p className="mt-2 text-xs leading-5 text-gray-500">资料长期保存在手机，退出、关机和重启不会删除，也不会被自动清理。更新检查会跳过未变化的数据。AI、登录、支付及正式考试提交需要联网。</p>
  <button type="button" disabled={state.phase==="downloading"} onClick={()=>void prepareOfflineLearning(true)} className="mt-3 rounded-lg bg-purple-700 px-4 py-2 text-sm text-white disabled:opacity-50">{state.phase==="downloading"?"正在后台下载…":state.phase==="ready"?"检查资料更新":"继续下载"}</button>
 </section>;
}
