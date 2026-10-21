"use client";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getUserToken, clearLoginState } from "@/lib/auth";
import { fetchWithAuth } from "@/lib/authInterceptor";
const API = "https://yandaoguoxue.yandao.vip";
const OPEN = /^\/(?:login|register|forgot-password|reset-password|privacy|agreement|membership-agreement|guide|admin|testing|download|account-delete|profile\/(?:settings|feedback))(?:\/|$)/;
export default function BusinessIdentityBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state,setState] = useState<"checking"|"login"|"phone"|"ready"|"error">("checking");
  const [phone,setPhone] = useState(""); const [code,setCode] = useState("");
  const [message,setMessage] = useState(""); const [busy,setBusy] = useState(false); const [cooldown,setCooldown] = useState(0);
  const open = OPEN.test(pathname);
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
      setState(data.data?.user?.phoneVerified || data.data?.phoneVerified ? "ready" : "phone");
    }).catch(()=>{if(active)setState("error");});
    };
    check();window.addEventListener("yandao-auth-change",check);
    return ()=>{active=false;window.removeEventListener("yandao-auth-change",check);};
  },[pathname,open]);
  useEffect(()=>{if(!cooldown)return;const t=setTimeout(()=>setCooldown(c=>Math.max(0,c-1)),1000);return ()=>clearTimeout(t);},[cooldown]);
  async function submit(send: boolean){
    if(busy)return;setBusy(true);setMessage("");
    try{
      const r=await fetchWithAuth(API+ (send?"/api/auth/send-code":"/api/auth/verify-phone"), {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(send?{phone}:{phone,code})});
      const data=await r.json();setMessage(data.message||data.error||"请稍后再试");
      if(r.ok&&data.success){if(send)setCooldown(60);else setState("ready");}
    }catch{setMessage("网络暂不可用，请稍后重试");}finally{setBusy(false);}
  }
  if(open || state==="ready") return <>{children}</>;
  return <main style={{maxWidth:480,margin:"max(32px, env(safe-area-inset-top)) auto 100px",padding:28,lineHeight:1.8,background:"white",borderRadius:20,border:"1px solid #e9dff1",boxShadow:"0 12px 40px #62308a12"}}>
    <h1 style={{fontSize:24,fontWeight:700,color:"#6b21a8"}}>言道国学</h1>
    {state==="checking"?<p>正在验证登录状态…</p>:state==="login"?<><h2>请先登录</h2><p>使用学习工具、购买和交流前，需要登录并完成手机号验证码验证。</p><Link className="my-5 block rounded-xl bg-purple-800 px-5 py-3 text-center font-medium text-white" href="/login/">登录或注册</Link></>:state==="error"?<><p>暂时无法完成身份校验，请检查网络后重试。</p><button onClick={()=>window.location.reload()}>重新验证</button></>:<>
      <h2>验证手机号</h2><p>为保护账号与交流安全，请完成短信验证。原账号编号、购买权益和记录保持不变。手机号不会公开展示。</p>
      <label>手机号<input type="tel" autoComplete="tel" value={phone} maxLength={11} onChange={e=>setPhone(e.target.value.replace(/\D/g,""))} style={{display:"block",padding:12,width:"100%",border:"1px solid #aaa",borderRadius:8}}/></label>
      <button className="my-3 rounded-lg border border-purple-700 px-4 py-2 text-purple-900 disabled:border-stone-300 disabled:text-stone-500" disabled={busy||cooldown>0||!/^1[3-9]\d{9}$/.test(phone)} onClick={()=>submit(true)}>{cooldown?`${cooldown}秒后重发`:"发送验证码"}</button>
      <label style={{display:"block"}}>验证码<input inputMode="numeric" autoComplete="one-time-code" value={code} maxLength={6} onChange={e=>setCode(e.target.value.replace(/\D/g,""))} style={{display:"block",padding:12,width:"100%",border:"1px solid #aaa",borderRadius:8}}/></label>
      <button className="mt-4 w-full rounded-xl bg-purple-800 px-4 py-3 text-white disabled:bg-stone-200 disabled:text-stone-600" disabled={busy||!/^\d{6}$/.test(code)} onClick={()=>submit(false)}>验证并继续</button><p role="status">{message}</p>
      <button onClick={()=>{clearLoginState();setState("login");}}>切换账号</button>
      <p><Link href="/profile/feedback/">验证问题反馈</Link> · <Link href="/profile/settings/">账号设置与注销</Link></p>
    </>}
    <p><Link href="/privacy/">隐私政策</Link> · <Link href="/agreement/">用户协议</Link></p>
  </main>;
}
