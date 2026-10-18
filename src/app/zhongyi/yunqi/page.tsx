"use client";
import { SectionGate } from "@/components/SectionGate";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { calculateYunqiStudy, formatChinaTime, yunqiPhaseAt } from "@/lib/astronomyStudy";
import originalEditions from "@/data/tcmOriginalEditions.json";
import { ContinuousListenPlayer } from "@/components/ContinuousListenPlayer";
import { LocalStudyNotes } from "@/components/LocalStudyNotes";

const CHAPTER_NUMBERS = [66, 67, 68, 69, 70, 71, 74];
const suwen = originalEditions.find(book => book.id === "suwen-original")!;
const chapters = CHAPTER_NUMBERS.map(number => suwen.chapters.find(chapter => chapter.id === `suwen-original-${number}`)!);
const listening = chapters.map(chapter => ({ id: chapter.id, title: chapter.title, text: chapter.content }));
const QUESTIONS = [
  { question: "丙午年的中运，使用哪一个年干推算？", options: ["丙", "午", "出生时辰"], answer: 0, explanation: "本页用年干配中运，丙辛配水，丙为阳干，因此丙午年为水运太过；这不是个人健康结论。" },
  { question: "客气的哪一步对应司天？", options: ["初之气", "三之气", "终之气"], answer: 1, explanation: "客气按三阴三阳次序轮转，司天置于三之气，在泉置于终之气。主气与客气的次序不可混用。" },
  { question: "页面的六步日期采用什么交界？", options: ["每月初一", "每个季节第一天", "大寒、春分、小满、大暑、秋分、小雪"], answer: 2, explanation: "本页采用明确标注的大寒起点、节气分步学习规则，日期由太阳视黄经计算；古法交司还有不同观点，不能混成唯一标准。" },
];

function YunqiStudyContent() {
  const [year, setYear] = useState(2026), [selected, setSelected] = useState(0);
  const [now, setNow] = useState<Date | null>(null), [answers, setAnswers] = useState<Record<number, number>>({});
  useEffect(() => { const current = new Date(); setNow(current); setYear(Math.min(2099, Math.max(1900, current.getFullYear()))); }, []);
  const study = useMemo(() => calculateYunqiStudy(year), [year]);
  const phase = study.phases[selected];
  const activePhase = now ? yunqiPhaseAt(study, now) : -1;
  return <div className="bg-[#f5f2e9] px-4 py-5 text-[#263c36]">
    <p className="text-xs tracking-widest text-[#60786d]">历法 · 术语 · 原典</p><h1 className="mt-2 text-2xl font-bold">五运六气学习</h1><p className="mt-3 text-sm leading-7 text-[#5e6c64]">先看年干与年支，再分清主运、客运、主气和客气。把每一步对应到原文，学习传统医学如何描述时序。</p>
    <section className="mt-4 rounded-2xl border border-[#d8dfd4] bg-white p-4">
      <div className="flex items-center justify-between gap-2"><button aria-label="上一年" type="button" disabled={year <= 1900} onClick={() => { setYear(year - 1); setSelected(0); }} className="rounded-lg border px-3 py-3 disabled:opacity-30">‹</button><label className="text-center text-sm">选择年份<select aria-label="运气学习年份" value={year} onChange={event => { setYear(Number(event.target.value)); setSelected(0); }} className="ml-2 rounded-lg border bg-white p-2">{Array.from({ length: 200 }, (_, i) => 1900 + i).map(value => <option key={value} value={value}>{value}</option>)}</select></label><button aria-label="下一年" type="button" disabled={year >= 2099} onClick={() => { setYear(year + 1); setSelected(0); }} className="rounded-lg border px-3 py-3 disabled:opacity-30">›</button></div>
      <h2 className="mt-4 text-center text-3xl font-bold text-[#28665b]">{study.ganzhi}年</h2><p className="mt-2 text-center text-sm">{study.annualMovement}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#edf5f0] p-3"><dt className="text-xs text-[#63766c]">司天 · 客气第三步</dt><dd className="mt-2 font-bold">{study.siTian}</dd></div><div className="rounded-xl bg-[#f4eee2] p-3"><dt className="text-xs text-[#63766c]">在泉 · 客气第六步</dt><dd className="mt-2 font-bold">{study.zaiQuan}</dd></div></dl>
      <p className="mt-4 text-xs leading-6 text-[#68756c]">本页的年度学习周期：{formatChinaTime(study.phases[0].start)}至{formatChinaTime(study.phases[5].end)}（UTC+8，前含后不含）。大寒前属于上一学习周期，不使用春节或立春混切本表。</p>
    </section>
    <section aria-label="主客六气对照" className="mt-5"><h2 className="text-lg font-bold">六步主客气对照</h2><p className="mt-2 text-xs leading-6 text-[#68756c]">主气顺序每年相同；客气随年支轮转。选择一格，看交界与推导。</p><div className="mt-3 grid grid-cols-2 gap-2">{study.phases.map(item => <button type="button" aria-pressed={selected === item.index} key={item.index} onClick={() => setSelected(item.index)} className="rounded-xl border p-3 text-left" style={{ background: selected === item.index ? "#254e43" : "white", color: selected === item.index ? "white" : "#263c36", borderColor: selected === item.index ? "#254e43" : "#d8dfd4" }}><span className="block text-sm font-bold">{item.label}{item.index === activePhase ? " · 当前" : ""}</span><span className="mt-2 block text-xs">主：{item.mainQi}</span><span className="mt-1 block text-xs">客：{item.guestQi}</span><span className="mt-2 block text-[11px] opacity-75">{item.startTerm} → {item.endTerm}</span></button>)}</div>
      <article aria-live="polite" className="mt-3 rounded-2xl bg-white p-4"><h3 className="font-bold">{phase.label} · {phase.startTerm}起</h3><p className="mt-2 text-sm leading-7">起点：{formatChinaTime(phase.start)}<br />终点：{formatChinaTime(phase.end)}<br />主气：{phase.mainQi}<br />客气：{phase.guestQi}</p><p className="mt-3 text-xs leading-6 text-[#68756c]">采用交节时刻分段，包含起点、不含终点。这里的“气”是传统理论术语，不是实时气温、空气质量或个人诊断指标。</p></article>
    </section>
    <section className="mt-5 rounded-2xl border border-[#d8dfd4] bg-white p-4"><h2 className="font-bold">把推演拆开看</h2><ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-7"><li>年干配中运：甲己土、乙庚金、丙辛水、丁壬木、戊癸火；阳干称太过，阴干称不及。本年为{study.stem}干，得到{study.annualMovement}。</li><li>年支配司天：子午少阴、丑未太阴、寅申少阳、卯酉阳明、辰戌太阳、巳亥厥阴。本年{study.branch}支，得到{study.siTian}。</li><li>主气按木、君火、相火、土、金、水依次展开；客气按厥阴、少阴、太阴、少阳、阳明、太阳轮转，将司天置于第三步、在泉置于第六步。</li></ol><details className="mt-4 rounded-lg bg-[#f5f2e9] p-3"><summary className="cursor-pointer text-sm font-bold">五运与六气为什么不是同一张表？</summary><p className="mt-3 text-sm leading-7">五运分木、火、土、金、水，主运按相生次序循环，客运以年干所化之运起始。六气分六步，主客气也各有次序。本页已提供中运与六步主客气；未将六步日期误称为五步主客运交运时刻。</p></details></section>
    <section className="mt-5 rounded-2xl border border-[#d8dfd4] bg-white p-4"><h2 className="font-bold">回到《素问》运气七篇</h2><p className="mt-2 text-xs leading-6 text-[#68756c]">链接进入所收录版本的完整篇章；听学队列也使用该篇全文，不是下方导读或节选。版本来源和校对边界见阅读页。</p><div className="mt-3 space-y-2">{chapters.map(chapter => <Link key={chapter.id} href={`/zhongyi/classic?book=suwen-original&chapter=${chapter.id}`} className="block rounded-lg bg-[#eef4ef] px-3 py-3 text-sm font-semibold">{chapter.title} →</Link>)}</div><div className="mt-4"><ContinuousListenPlayer collectionId="suwen-yunqi-seven-v1" items={listening} title="运气七篇连续听学" /></div></section>
    <section className="mt-5 rounded-2xl border border-[#d8dfd4] bg-white p-4"><h2 className="font-bold">读后自测</h2>{QUESTIONS.map((question, index) => <div key={question.question} className="mt-4 border-t border-[#e4e9df] pt-4"><p className="text-sm font-semibold">{index + 1}. {question.question}</p><div className="mt-2 space-y-2">{question.options.map((option, optionIndex) => <button type="button" aria-pressed={answers[index] === optionIndex} key={option} onClick={() => setAnswers(old => ({ ...old, [index]: optionIndex }))} className="block w-full rounded-lg border p-3 text-left text-sm" style={{ background: answers[index] === optionIndex ? "#e2f0e9" : "white" }}>{option}</button>)}</div>{answers[index] !== undefined && <p role="status" className="mt-3 text-xs leading-6 text-[#28665b]">{answers[index] === question.answer ? "回答正确。" : "请再对照上面的步骤。"}{question.explanation}</p>}</div>)}</section>
    <section className="mt-5 rounded-2xl bg-white p-4"><h2 className="mb-3 font-bold">学习笔记</h2><LocalStudyNotes storageKey="yunqi-study-notes-v1" placeholder="记录年份、采用的交界规则、主客气次序和原文出处；把自己的理解与原文分开。" /></section>
    <footer className="mt-5 text-xs leading-7 text-[#627269]"><h2 className="font-bold">方法与出处</h2><p>本页采用“大寒起点、节气分步”的学习规则。古代及后世学者对交司起点、分步和时刻存在不同观点；未把太阳黄经交节时刻冒充全部古法的统一交司标准。传统运气术语与现代天文计算分别说明，不据年份预测个人疾病或给出用药方案。</p><p className="mt-2"><a href="https://zynj.shutcm.edu.cn/2023/0920/c4359a155053/page.htm" target="_blank" rel="noreferrer" className="underline">上海中医药大学：四时节律与五运六气比较 ↗</a><br /><a href="https://tjzhongyiyao.tjutcm.edu.cn/html/tjzyydxxb/2020/5/20200507.htm" target="_blank" rel="noreferrer" className="underline">天津中医药大学学报：交气起点的不同观点 ↗</a></p><div className="mt-3 flex flex-wrap gap-3"><Link href="/academy/astronomy" className="underline">天文馆</Link><Link href="/yixue/jieqi" className="underline">二十四节气</Link><Link href="/zhongyi/classic?book=suwen-original" className="underline">《素问》版本目录</Link></div></footer>
  </div>;
}

export default function YunqiStudyPage() { return <SectionGate toolId="zhongyi_yunqi" title="五运六气学习" backHref="/zhongyi"><YunqiStudyContent /></SectionGate>; }
