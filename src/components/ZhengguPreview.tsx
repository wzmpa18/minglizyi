"use client";
import {useEffect,useState} from "react";
import {ResourceDiscussion} from "@/components/ResourceDiscussion";
export function ZhengguPreview(){
 const [points,setPoints]=useState<{id:string;title:string;chapter:string;excerpt:string}[]>([]),[message,setMessage]=useState("正在读取知识点试看…");
 useEffect(()=>{let active=true;fetch("/api/academy/zhenggu/preview",{cache:"no-store"}).then(r=>r.json()).then(d=>{if(!active)return;if(d.success&&Array.isArray(d.points)){setPoints(d.points);setMessage(d.points.length?"":"暂无可公开的知识点试看");}else setMessage(d.error||"暂时无法读取试看");}).catch(()=>{if(active)setMessage("网络暂不可用，请稍后重开");});return()=>{active=false;};},[]);
 return <section className="rounded-xl bg-white p-4 mt-4"><h2 className="font-semibold text-gray-900">知识点试看</h2><p className="my-2 text-xs leading-5 text-gray-600">每项开放一小段，解锁后可在应用内阅读全文。本专区不提供导出功能。</p>{message&&<p role="status">{message}</p>}{points.map(p=><details key={p.id} className="border-t py-3"><summary className="text-sm font-medium text-purple-900">{p.title}</summary><p className="mt-2 text-xs text-gray-500">{p.chapter}</p><p className="my-2 text-sm text-gray-800 leading-6 whitespace-pre-wrap select-none">{p.excerpt||"本知识点请解锁后阅读。"}<span className="block text-gray-500 mt-1">后续内容已锁定</span></p><ResourceDiscussion resourceType="academy" resourceId={`zhenggu-${p.id}`} title="本知识点学习留言"/></details>)}</section>;
}
