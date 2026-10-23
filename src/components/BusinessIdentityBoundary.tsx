"use client";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getUserToken } from "@/lib/auth";
import { fetchWithAuth } from "@/lib/authInterceptor";
const API = "https://yandaoguoxue.yandao.vip";
const OPEN = /^\/(?:login|register|forgot-password|reset-password|privacy|agreement|membership-agreement|guide|admin|testing|download|account-delete|profile\/(?:settings|feedback))(?:\/|$)/;
// Local reading and chart calculation must not be blocked by account enrolment.
// Authenticated API requests continue to enforce identity on the server.
const ACCOUNT_PAGES = /^\/(?:friends?|contacts|messages|groups|chat|tongchen)(?:\/|$)/;
export default function BusinessIdentityBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state,setState] = useState<"checking"|"login"|"ready"|"error">("checking");
  const open = OPEN.test(pathname) || !ACCOUNT_PAGES.test(pathname);
  useEffect(() => {
    if(open) return;
    let active = true;
    const check = () => {
    setState("checking");
    if(!getUserToken()){setState("login");return;}
    void fetchWithAuth(API+"/api/auth/profile").then(async r=>{
      const data = await r.json(); if(!active)return;
      if(r.status===401 || r.status===403){setState("login");return;}
      if(!r.ok || !data.success){setState("error");return;}
      setState("ready"); // API enforces identity on publishing operations, not page viewing.
    }).catch(()=>{if(active)setState("error");});
    };
    check();window.addEventListener("yandao-auth-change",check);
    return ()=>{active=false;window.removeEventListener("yandao-auth-change",check);};
  },[pathname,open]);
  if(open || state==="ready") return <>{children}</>;
  return <main style={{maxWidth:480,margin:"max(32px, env(safe-area-inset-top)) auto 100px",padding:28,lineHeight:1.8,background:"white",borderRadius:20,border:"1px solid #e9dff1",boxShadow:"0 12px 40px #62308a12"}}>
    <h1 style={{fontSize:24,fontWeight:700,color:"#6b21a8"}}>言道国学</h1>
    {state==="checking"?<p>正在读取账号状态…</p>:state==="login"?<><h2>登录后参与交流</h2><p>学习阅读和本地排盘可以直接使用。登录后可使用好友与交流服务。</p><Link className="my-5 block rounded-xl bg-purple-800 px-5 py-3 text-center font-medium text-white" href="/login/">登录或注册</Link></>:<><p>暂时无法读取账号状态，请检查网络后重试。</p><button onClick={()=>window.location.reload()}>重试</button></>}
    <p><Link href="/privacy/">隐私政策</Link> · <Link href="/agreement/">用户协议</Link></p>
  </main>;
}
