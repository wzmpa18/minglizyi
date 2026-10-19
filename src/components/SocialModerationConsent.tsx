"use client";
import {useEffect,useState,useSyncExternalStore} from 'react';
import {socialReviewSnapshot,subscribeSocialReview,finishSocialReview,type SocialReviewPreview} from '@/lib/socialModerationConsent';
import {InterfaceButton as Button,InterfaceLabel as Label} from './InterfaceControls';
export default function SocialModerationConsent(){
 const request=useSyncExternalStore(subscribeSocialReview,socialReviewSnapshot,()=>null);
 useEffect(()=>{const cancel=()=>finishSocialReview(false);window.addEventListener('yandao-auth-change',cancel);const storage=(e:StorageEvent)=>{if(!e.key||['yandao_user_token','yandao_user_profile','yandao_login_broadcast'].includes(e.key))cancel();};window.addEventListener('storage',storage);return()=>{window.removeEventListener('yandao-auth-change',cancel);window.removeEventListener('storage',storage);cancel();};},[]);
 return request?<ReviewOne key={request.id} request={request}/>:null;
}
function ReviewOne({request}:{request:SocialReviewPreview}){
 const [agree,setAgree]=useState(false);
 return <div role="dialog" aria-modal="true" aria-label="本次交流文字审核授权" className="fixed inset-0 z-[150] overflow-auto bg-stone-950/80 p-4 pt-[max(28px,calc(env(safe-area-inset-top)+16px))]"><section className="mx-auto max-w-xl space-y-4 rounded-2xl bg-white p-5 text-stone-950">
  <h2 className="text-lg font-semibold">确认本次发送</h2><p className="text-sm">{request.scope} · 仅以下文字进入本次机器审核：</p><blockquote className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-stone-300 bg-stone-50 p-3 text-sm leading-7">{request.text}</blockquote>
  <p className="text-sm leading-7">腾讯云混元 Hy3（TokenHub）将对所选文字进行内容安全分类。不会另附账号编号、原始命盘、本机日记或健康原件；你写在文字里的信息仍会一并发送，请先删除隐私。定向交流也需要此项授权，不能把它当作只有收件人可以读取的端到端加密。</p>
  <p className="text-xs leading-6">不确定、失败、超时、预算耗尽或风险冲突会先隔离，不保证自动通过；不扣用户AI点数。取消后不发送，可修改文字后重试。<a className="underline" href="https://intl.cloud.tencent.com/zh/document/product/1300/78952" target="_blank" rel="noopener noreferrer">供应商隐私说明</a> · <a className="underline" href="/privacy/#research-learning" target="_blank" rel="noopener noreferrer">平台说明</a></p>
  <Label className="block text-sm leading-7"><input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)}/>我已核对以上文字，同意仅将本次文字交给该服务审核并继续发送</Label>
  <div className="flex flex-wrap gap-3"><Button className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-950" onClick={()=>finishSocialReview(false)}>取消发送</Button><Button className="rounded-xl bg-purple-900 px-4 py-2 text-sm text-white disabled:opacity-40" disabled={!agree} onClick={()=>finishSocialReview(true)}>同意并发送本次文字</Button></div>
 </section></div>;
}
