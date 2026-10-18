"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import initial from "../../backend_deploy/companyProfile.default.json";
export function CompanyIntroduction(){
 const [profile,setProfile]=useState(initial);
 useEffect(()=>{let active=true;fetch("/api/admin/poster-config/poster/config/public",{cache:"no-store"}).then(r=>r.json()).then(d=>{const p=d?.companyProfile;if(active&&p&&typeof p.companyName==="string"&&Array.isArray(p.products))setProfile({...initial,...p});}).catch(()=>{});return()=>{active=false;};},[]);
 if(!profile.enabled)return null;
 let website=initial.website;try{const u=new URL(profile.website);if(u.protocol==="https:")website=u.href;}catch{}
 return <section aria-label="公司与产品介绍" className="m-3 rounded-xl border border-purple-100 bg-white p-4 text-sm text-gray-700">
  <h2 className="font-bold text-base text-gray-900">{profile.companyName}</h2><p className="mt-2 leading-6">{profile.introduction}</p>
  <h3 className="mt-3 font-semibold">产品介绍</h3><ul className="list-disc pl-5 mt-1 space-y-1">{profile.products.map((p,i)=><li key={i}>{p}</li>)}</ul>
  <h3 className="mt-3 font-semibold">软件开发与技术服务</h3><p className="mt-1 leading-6">{profile.services}</p>
  <div className="mt-3 flex flex-wrap gap-4"><a href={website} target="_blank" rel="noopener noreferrer" className="text-purple-800 underline">公司官网</a><Link href="/profile/feedback/" className="text-purple-800 underline">产品反馈与合作咨询</Link></div>
 </section>;
}
