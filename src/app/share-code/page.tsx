'use client';
import {useEffect,useState} from 'react';
import {BrandHeader} from '@/components/shared';
import {PageLoginGuard} from '@/components/PageLoginGuard';
import {getInviteLink,type InviteLinkData} from '@/lib/inviteApi';
import {learningShareLink} from '@/lib/learningShare';
import {useAccountScope} from '@/lib/useAccountScope';
import {getUserToken} from '@/lib/auth';

export default function ShareCodePage(){
  const [data,setData]=useState<InviteLinkData|null>(null),[message,setMessage]=useState('');
  const [canShare,setCanShare]=useState(false),scope=useAccountScope();
  useEffect(()=>{setCanShare(typeof navigator.share==='function');},[]);
  useEffect(()=>{let live=true;setData(null);setMessage('');if(!getUserToken()){setMessage('登录后可复制专属学习分享码');return;}
    void getInviteLink(true).then(value=>{if(!live)return;if(!value||!learningShareLink(value.inviteLink)){setMessage('暂时无法读取有效分享链接，请稍后重试');return;}setData(value);}).catch(()=>{if(live)setMessage('暂时无法读取分享码，请稍后重试');});return()=>{live=false;};},[scope]);
  const link=()=>{
    if(!data)return '';
    return learningShareLink(data.inviteLink);
  };
  async function copy(value:string){
    if(!value.trim()){setMessage('分享内容尚未准备好');return;}
    try{await navigator.clipboard.writeText(value);setMessage('已复制');}
    catch{setMessage('复制暂不可用，可长按下方内容复制');}
  }
  return <><PageLoginGuard/><main style={{maxWidth:540,margin:'0 auto',paddingBottom:32,background:'#faf8fc',minHeight:'100vh'}}>
    <BrandHeader title="学习分享码" showBack/>
    <section style={{margin:16,padding:20,background:'white',borderRadius:16,lineHeight:1.8}}>
      <h1 style={{fontSize:22}}>和同好一起学习</h1>
      <p>分享古籍、穴位与课程学习入口，让朋友先了解内容，再选择收藏或注册。</p>
      <p style={{fontSize:28,fontWeight:700,letterSpacing:3,color:'#7b2fbe',userSelect:'text'}}>{data?.inviteCode||'读取分享码中…'}</p>
      {data&&<><button disabled={!data.inviteCode?.trim()} onClick={()=>void copy(data.inviteCode)}>复制分享码</button>{' '}<button disabled={!link()} onClick={()=>void copy(link())}>复制学习链接</button>
        <p style={{wordBreak:'break-all',fontSize:12,userSelect:'text'}}>{link()}</p>
        {canShare&&<button disabled={!link()} onClick={()=>{const url=link();if(url)void navigator.share({title:'言道国学·一起学习',text:'原典、图谱与课程笔记，一起对照学习。',url}).catch(()=>{});}}>分享给朋友</button>}</>}
      <p role="status">{message}</p>
      <p style={{fontSize:12,color:'#777'}}>分享码用于记录邀请来源，不改变安装来源或支付渠道。商店下载及商店订单不计现金佣金。</p>
    </section>
  </main></>;
}
