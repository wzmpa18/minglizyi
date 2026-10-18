"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {tongchenRequest} from "@/lib/tongchenApi";
import {useInterfaceLocale} from "@/lib/interfaceLocale";
export function TongchenEntry(){const [name,setName]=useState("同辰雅集");const {ui}=useInterfaceLocale();useEffect(()=>{let alive=true;void tongchenRequest('/config').then(result=>{if(alive&&result.success&&result.config?.name)setName(result.config.name);});return()=>{alive=false;};},[]);return <Link href="/discover/tongchen/" className="m-3 block rounded-2xl border p-5 shadow-sm" style={{background:"var(--theme-card-bg)",borderColor:"var(--theme-border)",color:"var(--theme-text-primary)"}}><span className="text-xs tracking-widest" style={{color:"var(--theme-primary)"}}>学习 · 同好 · 自愿交流</span><h2 className="my-2 text-xl font-semibold">{ui(name)} <span className="float-right">›</span></h2><p className="text-sm leading-6 opacity-75">寻找同生日、同辰与共同学习兴趣的成年同好。本人加入、双方同意、随时退出。</p></Link>;}
