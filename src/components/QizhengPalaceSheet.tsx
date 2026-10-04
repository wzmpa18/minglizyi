"use client";
import { useMemo } from "react";
import { createPortal } from "react-dom";
import type { QizhengResult } from "@/algorithm-core/modules/qizheng";
import type { QizhengLiunianResult } from "@/algorithm-core/modules/qizheng-liunian";
import { buildPalaceBasicInterpretation, PALACE_KNOWLEDGE } from "@/lib/qizhengPalaceInterpretation";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";
import AIInterpretButton from "@/components/AIInterpretButton";
export function QizhengPalaceSheet({chart,branch,transit,age,onClose,onSelect}: {
 chart:QizhengResult; branch:string;transit:QizhengLiunianResult|null;age?:number;onClose:()=>void;onSelect:(branch:string)=>void;
}) {
 const palace=chart.palaces.find(p=>p.branch===branch)!;
 const detail=useMemo(()=>buildPalaceBasicInterpretation(chart,palace,transit,age),[chart,palace,transit,age]);
 useBodyScrollLock(true); usePopupBackHandler(onClose,true);
 const nav=(delta:number)=>{const index=(palace.renshiIndex-1+delta+12)%12+1;const next=chart.palaces.find(p=>p.renshiIndex===index);if(next)onSelect(next.branch);};
 const section=(title:string,content:React.ReactNode)=><section className="border-b border-gray-100 py-3"><h3 className="mb-1 font-semibold text-purple-800">{title}</h3>{content}</section>;
 return createPortal(<div className="fixed inset-0 z-[100] flex items-end justify-center md:items-stretch md:justify-end" role="dialog" aria-modal="true" aria-label={detail.title+"基本解读"}>
  <button className="absolute inset-0 bg-black/50" aria-label="关闭宫位解读" onClick={onClose}/>
  <div className="relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 text-sm leading-6 text-gray-700 md:max-h-full md:rounded-none" style={{paddingBottom:"max(24px, env(safe-area-inset-bottom))"}}>
   <div className="sticky top-0 flex items-center justify-between bg-white py-2"><button onClick={()=>nav(-1)} aria-label="上一宫">← 上一宫</button><h2 className="text-lg font-bold text-purple-800">{detail.title}</h2><button onClick={()=>nav(1)} aria-label="下一宫">下一宫 →</button><button onClick={onClose} aria-label="关闭" className="ml-2 text-xl">×</button></div>
   <p className="text-xs text-gray-500">古称：{detail.classicalName} · {branch}宫 · 宫主 {detail.lord} · {detail.strength}</p>
   {section("基础宫义",<p>{detail.baseMeaning}</p>)}
   {section("我的盘",<>
    <p>辅助对应：{detail.auxiliary.zodiac} · 后天八卦 {detail.auxiliary.bagua}</p>
    {detail.stars.length===0 && <p>本宫无入星；请结合宫主和对宫，不以空宫作吉凶结论。</p>}
    {detail.stars.map(s=><div key={s.key} className="my-2 rounded-lg bg-purple-50 p-2">
     <strong>{s.name}</strong> · {s.kind==="yu"?"四余":"七政"} · {s.palaceBranch}宫{s.palaceDegree.toFixed(2)}° · {s.xiuFullName}{s.xiuDegree.toFixed(2)}°
     <p className="text-xs">度主 {s.xiuOwner} · {s.retrograde?"逆行":"顺行"} · 日行 {s.speed.toFixed(4)}° · 时令 {s.seasonStrength}</p>
     <p className="text-xs">得地：{s.states.join("、")||"未命中特殊垣殿状态"} · 化曜：{s.huayao.join("、")||"无"}</p>
    </div>)}
    <p>原局神煞：{detail.shenshaNatal.map(s=>s.name).join("、")||"无已计算神煞落入"}</p>
    <p>原局化曜：{detail.huayaoNatal.join("；")||"无"}</p>
    {transit && <><p>流年入星：{detail.transitStars.map(s=>`${s.name} ${s.xiuName}${s.xiuDegree.toFixed(2)}°`).join("、")||"无"}</p><p>流年神煞：{detail.shenshaTransit.map(s=>s.name).join("、")||"无"}</p><p>流年化曜：{detail.huayaoTransit.join("；")||"无"}</p></>}
   </>)}
   {section("与其他宫的关系",<>{detail.relations.map(rel=><p key={rel.name}>{rel.name}：{rel.palaces.map(p=>`${p.branch}·${p.name}（${p.stars.join("、")||"无入星"}）`).join("；")}</p>)}{detail.starRelations.map((s,i)=><p key={i}>{s}</p>)}</>)}
   {section("当前限运",<><p>{detail.currentDaXian?`虚岁 ${detail.currentDaXian.age}，大限在${detail.currentDaXian.branch}宫，${detail.currentDaXian.xiu}${detail.currentDaXian.degree.toFixed(2)}°；${detail.currentDaXian.inPalace?"正在经过本宫":"未经过本宫"}`:"选择流年或输入行限虚岁后显示当前大限"}</p><p>小限 / 月限：资料未提供完整起算法，暂不推算。</p></>)}
   {section("综合基本解读",<p data-testid="palace-local-summary">{detail.summary}</p>)}
   <details className="py-3"><summary className="cursor-pointer font-medium text-purple-800">传统资料依据</summary><p>{detail.focus}</p>{detail.sourceRefs.map(s=><p key={s} className="text-xs text-gray-500">{s}</p>)}{detail.shenshaNatal.map(s=><p key={s.id} className="text-xs">{s.name}：{s.source}</p>)}</details>
   <AIInterpretButton discussionEnabled key={branch} toolName="七政四余" scope={detail.title+"深入解读"} buttonText="AI深入解读" contextData={JSON.stringify({chartSnapshot:{schemaVersion:1,profile:chart.input,ming:chart.mingDu,shen:chart.shenDu,stars:chart.stars},palace:detail})} systemPrompt="只解释传入的确定性盘面和资料依据，不自行排盘，不增补不存在的星曜、神煞或限运。使用现代中文，避免确定性命运、疾病与投资判断。" />
   <p className="mt-3 text-xs text-gray-400">基础解读在本地生成。传统文化学习参考，不作为医疗、投资、婚姻或其他现实决策的唯一依据。</p>
  </div>
 </div>,document.body);
}
