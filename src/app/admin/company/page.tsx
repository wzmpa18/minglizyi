"use client";
import {useEffect,useState} from "react";
import {fetchPosterConfig,savePosterConfig} from "@/lib/admin/client";
import defaults from "../../../../backend_deploy/companyProfile.default.json";
export default function CompanySettings(){
 const [base,setBase]=useState<Record<string,unknown>|null>(null),[value,setValue]=useState(defaults),[message,setMessage]=useState("");
 useEffect(()=>{fetchPosterConfig().then(d=>{if(d){setBase(d);setValue({...defaults,...(d.companyProfile as typeof defaults||{})});}else setMessage("请先登录有运营权限的后台账号");});},[]);
 const save=async()=>{if(!base)return;const result=await savePosterConfig({...base,companyProfile:value});setMessage(result.ok?"已保存，公司与产品介绍将在重新打开页面后更新":result.error||"保存失败");};
 return <main className="p-5 max-w-xl"><h1 className="text-xl font-bold">公司与产品介绍</h1><p className="my-3 text-sm text-gray-600">公开展示纯文本和官网，不放置App数字内容的外部购买引导。</p>{(["companyName","productName","introduction","services","website"] as const).map(k=><label className="block my-3" key={k}>{{companyName:"公司名称",productName:"产品名称",introduction:"公司及产品介绍",services:"软件开发业务",website:"官网网址"}[k]}<textarea maxLength={2000} className="block w-full border p-2 rounded" value={value[k]} onChange={e=>setValue({...value,[k]:e.target.value})}/></label>)}<label>产品列表（每行一项）<textarea className="block border w-full p-2" value={value.products.join("\n")} onChange={e=>setValue({...value,products:e.target.value.split("\n").filter(Boolean)})}/></label><label className="block my-3"><input type="checkbox" checked={value.enabled} onChange={e=>setValue({...value,enabled:e.target.checked})}/> 显示公司介绍</label><button disabled={!base} onClick={()=>void save()} className="rounded bg-purple-800 text-white px-4 py-2">保存介绍</button><p role="status">{message}</p></main>;
}
