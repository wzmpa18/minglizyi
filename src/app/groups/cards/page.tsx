"use client";
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {useAccountScope} from '@/lib/useAccountScope';
import {useInterfaceLocale} from '@/lib/interfaceLocale';
import {fetchGroupDetail,type GroupMemberVo} from '@/lib/socialApi';
import {getUserProfile,getUserToken} from '@/lib/auth';
import {listPaipanRecords,type PaipanRecord} from '@/lib/nativePaipanStore';
import {makeLiveSnapshot,type LiveSnapshot} from '@/lib/liveCharts';
import {groupCardRequest,type GroupCard,type GroupCardResult} from '@/lib/studyGroupCards';
import {stageLifeImport} from '@/lib/lifeImport';
import {saveLifeDocument} from '@/lib/lifeDocument';
import {LiveChartViewport} from '@/components/LiveChartViewport';
import {GroupCardDiscussion} from '@/components/GroupCardDiscussion';
import {validChartAnchor} from '../../../../backend_deploy/liveChartPolicy';
import {LiveChartBoard} from '@/components/LiveChartBoard';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {InterfaceButton as Button,InterfaceLabel as Label,InterfaceOption as Option} from '@/components/InterfaceControls';

const action='rounded-xl border border-stone-300 theme-card-bg px-3 py-2 text-sm theme-text-primary disabled:opacity-40';
const primary='rounded-xl bg-[var(--theme-primary)] px-4 py-2 text-sm text-[var(--theme-bg)] disabled:opacity-40';
const field='w-full rounded-xl border border-stone-300 bg-white p-3 text-base text-stone-950';
export default function GroupCardsPage(){const account=useAccountScope();return <GroupCardsAccount key={account}/>;}
function GroupCardsAccount(){
 const {ui}=useInterfaceLocale(),router=useRouter();
 const [group,setGroup]=useState(''),[groupName,setGroupName]=useState(''),[members,setMembers]=useState<GroupMemberVo[]>([]);
 const [cards,setCards]=useState<GroupCard[]>([]),[cursor,setCursor]=useState<string|undefined>(),[current,setCurrent]=useState<GroupCard|null>(null);
 const [records,setRecords]=useState<PaipanRecord[]>([]),[selected,setSelected]=useState<number[]>([]),[recipients,setRecipients]=useState<string[]>([]);
 const [preview,setPreview]=useState<LiveSnapshot[]>([]),[creating,setCreating]=useState(false),[showPillars,setShowPillars]=useState(false),[visiblePillars,setVisiblePillars]=useState([0,1,2,3]);
 const [days,setDays]=useState(7),[archive,setArchive]=useState(false),[allowExport,setAllowExport]=useState(false),[consent,setConsent]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[index,setIndex]=useState(0),[zoom,setZoom]=useState(1),[full,setFull]=useState(false),[report,setReport]=useState('');
 const [mine,setMine]=useState<GroupCard[]>([]),[mineCursor,setMineCursor]=useState<string|undefined>(),[revokeIds,setRevokeIds]=useState<string[]>([]),[anchor,setAnchor]=useState(''),[follow,setFollow]=useState(''),[height,setHeight]=useState(360),[collapsed,setCollapsed]=useState(false);
 const [confirm,setConfirm]=useState<{message:string;run:()=>void}|null>(null);
 const accountToken=useRef(getUserToken()),accountValid=useRef(true);const sameAccount=()=>accountValid.current&&accountToken.current===getUserToken();
 const requestId=useRef(crypto.randomUUID()),generation=useRef(0),myId=String(getUserProfile()?.userId||'');
 const run=async(task:()=>Promise<void>)=>{setBusy(true);setMessage('');try{if(!sameAccount())return;await task();}catch(error){setMessage(error instanceof Error?error.message:'操作未完成');}finally{setBusy(false);}};
 const checked=(result:GroupCardResult)=>{if(!result.success)throw Error(result.error||'授权盘卡不可用');return result;};
 async function loadMine(id:string){const r=checked(await groupCardRequest(id,'/mine'));if(!sameAccount())return;setMine(r.items||[]);setMineCursor(r.nextCursor);setRevokeIds([]);}
 async function load(id:string){await loadMine(id);if(!sameAccount())return;const r=checked(await groupCardRequest(id));if(!sameAccount())return;setCards(r.items||[]);setCursor(r.nextCursor);}
 async function open(id:string,cardId:string,version='',position=''){
  setCurrent(null);setFull(false);setFollow('');setAnchor('');setCollapsed(false);const token=++generation.current,r=checked(await groupCardRequest(id,'/'+encodeURIComponent(cardId)));if(generation.current!==token||!sameAccount())return;if(!r.charts||!r.id)throw Error('盘卡数据不完整，未展示其他缓存');
  const at=version?r.charts.findIndex(c=>c.version===version):0;if(at<0||!validChartAnchor(r.charts[at],position))throw Error('所引用的固定版本或位置不可用，未替换成其他命盘');setCurrent(r as GroupCard);setIndex(at);setFollow(position);setAnchor(position);setZoom(1);setCreating(false);
 }
 useEffect(()=>{const params=new URLSearchParams(window.location.search),id=params.get('group')||'',cardId=params.get('card');setGroup(id);void run(async()=>{
  if(!/^\d{1,16}$/.test(id))throw Error('请从已经加入的学习群打开授权盘卡');
  await loadMine(id);if(!sameAccount())return;const details=await fetchGroupDetail(id);if(!sameAccount())return;if(!details.success)throw Error(details.error||'当前账号无权访问此学习群');
  setMembers(details.members||[]);setGroupName(details.group?.name||'学习群');await load(id);if(cardId&&/^[\w-]{32,40}$/.test(cardId))await open(id,cardId,params.get('version')||'',params.get('anchor')||'');
 });return()=>{generation.current++;};},[]);
 useEffect(()=>{const clear=()=>{if(accountToken.current!==getUserToken()){accountValid.current=false;generation.current++;setCurrent(null);setCards([]);setMine([]);setMembers([]);setRecords([]);setPreview([]);setSelected([]);setRecipients([]);setConsent(false);setCreating(false);setConfirm(null);setMessage('账号已改变，请重新打开学习群');}};window.addEventListener('storage',clear);window.addEventListener('yandao-auth-change',clear);return()=>{window.removeEventListener('storage',clear);window.removeEventListener('yandao-auth-change',clear);};},[]);
  const resetConsent=()=>{setConsent(false);requestId.current=crypto.randomUUID();};
 async function begin(){setCurrent(null);const records=await listPaipanRecords();if(!sameAccount())return;setRecords(records);setSelected([]);setRecipients([]);setPreview([]);setConsent(false);setArchive(false);setAllowExport(false);setCreating(true);requestId.current=crypto.randomUUID();}
 async function send(){
  if(!consent||!preview.length||!recipients.length)throw Error('请预览最小副本、逐一选择当前成员并确认授权');
  const r=checked(await groupCardRequest(group,'','POST',{requestId:requestId.current,recipientIds:recipients,newMembersCanView:false,inferenceConsent:true,rightsConsent:true,days,permissions:{archive,export:allowExport},charts:preview.map(c=>({toolKey:c.toolKey,result:{...c.data,engineVersion:c.engineVersion},showPillars:!c.redaction.pillars,visiblePillars:c.visiblePillars}))}));
  await load(group);if(r.id)await open(group,r.id);setMessage('已向所选当前成员授权；未选成员和以后加入者看不到此卡，私人原件未上传');
 }
 async function archiveCurrent(){if(!current)return;const r=checked(await groupCardRequest(group,`/${current.id}/archive`));if(!sameAccount())return;
  stageLifeImport({title:'学习群授权盘面留档',text:'',categories:['排盘点评'],tags:['群盘卡授权副本'],people:[current.ownerName],sourceRefs:[{kind:'SOURCE_USER_IMPORTED',platform:'言道学习群授权盘卡',author:current.ownerName,at:new Date().toISOString(),verified:false}],chartRefs:(r.charts||[]).map(c=>({tool:c.toolKey,version:c.version,record:{...c,permissions:r.permissions,groupId:group,cardId:current.id}}))},myId);
  router.push('/profile/life/');
 }
 const chart=current?.charts?.[index];
 return <main className="mx-auto min-h-screen max-w-3xl theme-bg px-4 pb-28 pt-[max(20px,calc(env(safe-area-inset-top)+12px))] theme-text-primary">
  <header className="mb-4 flex justify-between gap-3"><Link href={group?`/groups/chat/?id=${group}`:'/groups/'} className="text-sm theme-primary-color">‹ {ui('学习群')}</Link><h1 className="text-lg font-semibold">{ui('群内授权盘卡')}</h1><Link href="/profile/life/" className="text-sm theme-primary-color">{ui('人生记录')}</Link></header>
  <p className="mb-3 text-sm leading-6 theme-text-secondary">{groupName} · 仅分享逐项预览的固定盘面，不附带生日、姓名、地点、私人笔记和健康资料。星位仍可能被推知部分出生信息。撤销只控制后续网络访问。</p>
  {message&&<p role="status" className="my-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{message}</p>}
  <div className="mb-4 flex flex-wrap gap-2"><Button className={primary} disabled={busy||!members.length} onClick={()=>void run(begin)}>{ui('选择排盘并分享')}</Button><Button className={action} disabled={busy||!group} onClick={()=>void run(()=>load(group))}>{ui('刷新')}</Button></div>
  {creating&&<section className="space-y-4 rounded-2xl border theme-card-bg p-4">
   <h2 className="font-semibold">{ui('本次只发送你选中的盘')}</h2>{records.map(r=><Label className="block rounded-lg border p-3 text-sm" key={r.id}><input type="checkbox" disabled={!selected.includes(r.id)&&selected.length>=4} checked={selected.includes(r.id)} onChange={e=>{setSelected(old=>e.target.checked?[...old,r.id]:old.filter(id=>id!==r.id));setPreview([]);resetConsent();}}/> {r.title} · {r.tool}</Label>)}{!records.length&&<p className="text-sm">本机尚无可选排盘，请先排盘并保存。</p>}
   <Label className="block text-sm"><input type="checkbox" checked={showPillars} onChange={e=>{setShowPillars(e.target.checked);setPreview([]);resetConsent();}}/>明确共享四柱</Label>
   {showPillars&&<div className="flex flex-wrap gap-3 text-sm">{['年柱','月柱','日柱','时柱'].map((label,i)=><Label key={i}><input type="checkbox" checked={visiblePillars.includes(i)} onChange={e=>{setVisiblePillars(old=>e.target.checked?[...old,i]:old.filter(n=>n!==i));setPreview([]);resetConsent();}}/>{label}</Label>)}</div>}
   <Button className={action} disabled={busy||!selected.length} onClick={()=>void run(async()=>{const chosen=records.filter(r=>selected.includes(r.id));if(!chosen.length||chosen.length>4)throw Error('请选择1至4张排盘');setPreview(chosen.map(r=>makeLiveSnapshot(r.tool,r.result,showPillars,visiblePillars)));resetConsent();})}>{ui('生成脱敏预览')}</Button>
   {preview.map((c,i)=><div className="rounded-xl border p-3" key={i}><h3>{c.title} · 接收方实际可见副本</h3><LiveChartBoard chart={c}/><p className="text-xs text-amber-800">{c.inferenceNotice}</p></div>)}
   <fieldset className="space-y-2"><legend className="font-semibold text-sm">逐一选择当前接收成员</legend>{members.filter(m=>String(m.userId)!==myId).map(m=><Label key={m.userId} className="block text-sm"><input type="checkbox" checked={recipients.includes(String(m.userId))} onChange={e=>{setRecipients(old=>e.target.checked?[...old,String(m.userId)]:old.filter(id=>id!==String(m.userId)));resetConsent();}}/><span translate="no">{m.nickname}</span></Label>)}</fieldset>
   <p className="text-xs leading-6 theme-text-secondary">仅向以上勾选成员授权。新成员不继承旧卡；离群后重新加入也需重新授权。接收方如获准另存，留存副本和截图无法远程收回。</p>
   <Label className="block text-sm">有效期<select className={field} value={days} onChange={e=>{setDays(Number(e.target.value));resetConsent();}}>{[1,7,14,30].map(n=><Option value={n} key={n}>{n}天</Option>)}</select></Label>
   <Label className="block text-sm"><input type="checkbox" checked={archive} onChange={e=>{setArchive(e.target.checked);resetConsent();}}/>允许接收方长期本机留档</Label>
   <Label className="block text-sm"><input type="checkbox" checked={allowExport} onChange={e=>{setAllowExport(e.target.checked);resetConsent();}}/>允许接收方导出此副本</Label>
   <Label className="block text-sm leading-7"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>我已核对最小副本与接收成员，有权分享并理解推断风险；同意仅将以上副本交由联网共享服务保存和发送</Label>
   <Button className={primary} disabled={busy||!preview.length||!recipients.length||!consent} onClick={()=>void run(send)}>{ui('发送授权盘卡')}</Button>
  </section>}
  {current&&<section className="space-y-3 rounded-2xl border theme-card-bg p-3"><h2 className="font-semibold"><span translate="no">{current.ownerName}</span> · 授权至{new Date(current.expiresAt).toLocaleString()}</h2>
   <nav className="flex flex-wrap gap-2">{current.charts?.map((c,i)=><Button className={i===index?primary:action} key={c.version} onClick={()=>{setIndex(i);setZoom(1);setAnchor('');setFollow('');setCollapsed(false);}}>{c.title}</Button>)}</nav>
   {chart&&<><div className="flex flex-wrap items-center gap-2 text-sm">{[240,360,520].map((n,i)=><Button key={n} className={action} onClick={()=>{setHeight(n);setCollapsed(false);}}>{['小盘','中盘','大盘'][i]}</Button>)}<Label>盘面高度<input aria-label="盘面高度" type="range" min={180} max={700} step={10} value={height} onChange={e=>setHeight(Number(e.target.value))}/></Label></div><LiveChartViewport chart={chart} anchor={follow} onAnchor={setAnchor} height={height} collapsed={collapsed} onCollapsedChange={setCollapsed}/><p className="p-3 text-xs leading-6">{chart.inferenceNotice} · {chart.version}</p><GroupCardDiscussion key={current.id} group={group} card={current} reference={{cardId:current.id,version:chart.version,anchor}} onCompose={()=>setCollapsed(true)} onFollow={ref=>{const at=current.charts?.findIndex(c=>c.version===ref.version)??-1;if(at<0){setMessage('所引用版本不可用');return;}setIndex(at);setFollow(ref.anchor);setAnchor(ref.anchor);setCollapsed(false);}}/></>}

   <div className="flex flex-wrap gap-2"><Button className={action} disabled={busy||!(current.mine||current.permissions?.archive)} onClick={()=>void run(archiveCurrent)}>{ui('保存到人生记录')}</Button><Button className={action} disabled={busy||!(current.mine||current.permissions?.export)} onClick={()=>void run(async()=>{const r=checked(await groupCardRequest(group,`/${current.id}/export`));if(!sameAccount())return;await saveLifeDocument(new Blob([JSON.stringify({dataClass:'SHARED_COLLABORATION',charts:r.charts,permissions:r.permissions},null,2)],{type:'application/json'}),'言道群盘卡授权副本.json');setMessage('已请求保存获准的盘面副本，未附带群聊、成员名单或原始出生资料');})}>{ui('导出授权副本')}</Button>
   {current.mine&&<Button className={action} disabled={busy} onClick={()=>setConfirm({message:'停止此卡的后续访问？不能收回对方此前获准另存的副本或截图。',run:()=>{void run(async()=>{checked(await groupCardRequest(group,`/${current.id}/revoke`,'POST'));setCurrent(null);await load(group);setMessage('此盘卡后续访问已撤销');});}})}>{ui('撤销分享')}</Button>}</div>
   <details className="rounded-xl border p-3 text-sm"><summary>{ui('举报')}</summary><Label>举报原因<textarea className={field} value={report} onChange={e=>setReport(e.target.value)} rows={3}/></Label><Button className={action} disabled={busy||!report.trim()} onClick={()=>void run(async()=>{checked(await groupCardRequest(group,`/${current.id}/report`,'POST',{reason:report}));setReport('');setMessage('举报已登记，当前卡已隔离，待核查后处理');setCurrent(null);await load(group);})}>{ui('提交')}</Button></details>
   <Link href={`/groups/chat/?id=${group}`} className="block text-sm theme-primary-color underline">{ui('返回本群学习交流')}</Link>
  </section>}
  <section className="mt-5 space-y-3"><h2 className="font-semibold">{ui('当前获准查看的盘卡')}</h2>{cards.map(c=><Button key={c.id} className="block w-full rounded-xl border theme-card-bg p-4 text-left" disabled={busy} onClick={()=>void run(()=>open(group,c.id))}><strong translate="no">{c.ownerName}</strong><span className="block text-sm">{c.titles?.join(' / ')}</span><span className="text-xs theme-text-secondary">{new Date(c.expiresAt).toLocaleString()}</span></Button>)}{!busy&&!cards.length&&<p className="text-sm theme-text-secondary">暂无当前向你授权的有效盘卡，不展示其他成员的私人卡片。</p>}{cursor&&<Button className={action} disabled={busy} onClick={()=>void run(async()=>{const r=checked(await groupCardRequest(group,'?cursor='+encodeURIComponent(cursor)));setCards(old=>[...old,...(r.items||[]).filter(c=>!old.some(x=>x.id===c.id))]);setCursor(r.nextCursor);})}>{ui('加载更多')}</Button>}</section>
  <section className="mt-5 space-y-3 rounded-xl border p-3"><h2 className="font-semibold">{ui('我分享的盘卡')}</h2><p className="text-xs leading-6">{ui('可以在退群或群关闭后撤销本人旧卡；选择只包含当前已加载的项目。')}</p>{mine.map(c=><Label key={c.id} className="block rounded border p-3 text-sm"><input type="checkbox" checked={revokeIds.includes(c.id)} disabled={busy||c.state==='revoked'} onChange={e=>setRevokeIds(old=>e.target.checked?[...old,c.id]:old.filter(id=>id!==c.id))}/><span>{c.titles?.join(' / ')} · {ui(c.state||'active')} · {new Date(c.expiresAt).toLocaleString()}</span></Label>)}<div className="flex flex-wrap gap-2"><Button className={action} disabled={busy||!mine.some(c=>c.state!=='revoked')} onClick={()=>setRevokeIds(mine.filter(c=>c.state!=='revoked').slice(0,50).map(c=>c.id))}>选择已加载的本人盘卡</Button><Button className={action} disabled={busy||!revokeIds.length||revokeIds.length>50} onClick={()=>setConfirm({message:`撤销所选${revokeIds.length}张本人分享的盘卡？这会阻断后续访问及引用，无法收回已获准另存的副本或截图。`,run:()=>{void run(async()=>{checked(await groupCardRequest(group,'/revoke','POST',{ids:revokeIds}));setCurrent(null);await loadMine(group);setCards([]);setMessage('所选盘卡已停止后续访问');});}})}>撤销所选盘卡</Button>{mineCursor&&<Button className={action} disabled={busy} onClick={()=>void run(async()=>{const r=checked(await groupCardRequest(group,'/mine?cursor='+encodeURIComponent(mineCursor)));setMine(old=>[...old,...(r.items||[]).filter(c=>!old.some(x=>x.id===c.id))]);setMineCursor(r.nextCursor);})}>加载更多</Button>}</div></section>
  <ConfirmDialog open={!!confirm} title={ui('请确认')} message={confirm?.message} onCancel={()=>setConfirm(null)} onConfirm={()=>{const fn=confirm?.run;setConfirm(null);fn?.();}}/>
 </main>;
}
