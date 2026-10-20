"use client";
import {useInterfaceLocale} from "@/lib/interfaceLocale";
import Link from "next/link";

const ENTRIES = [
  { href: "/zhongyi/classic", label: "典籍阅读", detail: "按书名与篇章查阅" },
  { href: "/zhongyi/herb", label: "中药性味归经", detail: "药性、药味与归经检索" },
  { href: "/zhongyi/formula", label: "经典方剂", detail: "组成、配伍与原典对照" },
  { href: "/zhongyi/meridian", label: "经络穴位", detail: "图文对照与名称查询" },
  { href: "/academy/astronomy", label: "天文馆", detail: "时间地点与日月行星" },
  { href: "/zhongyi/yunqi", label: "五运六气", detail: "主客气对照与原典听学" },
];

export default function LearningEntryPanel() {
  const {ui}=useInterfaceLocale();
  return (
    <section aria-label="中医与经典学习" className="mx-3 mt-3 rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-[#267364]">读经典 · 查知识 · 做练习</p>
      <h2 className="mt-1 text-lg font-bold text-gray-800">从一节经典学习课开始</h2>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">16节原创入门讲解、44道自测，覆盖易学、中医与天文历法。查看解析、错题重练，也可连续听学；无需登录，内容随应用提供。</p>
      <Link href="/academy/start" className="mt-3 block rounded-xl bg-[#267364] px-3 py-3 text-center text-sm font-bold text-white">{ui("开始入门学习")}</Link>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {ENTRIES.map((entry) => <Link key={entry.href} href={entry.href} className="rounded-xl bg-[#f1f7f4] p-3"><span className="block text-sm font-semibold text-gray-800">{ui(entry.label)}</span><span className="mt-1 block text-[11px] text-gray-500">{entry.detail}</span></Link>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#5c3677]">
        <Link href="/books?book=huangdi_yinfujing" className="rounded-lg bg-[#f5f0f8] px-3 py-2">{ui("阴符经原文")}</Link>
        <Link href="/zhongyi/classic?book=suwen-original" className="rounded-lg bg-[#f5f0f8] px-3 py-2">{ui("黄帝内经·素问")}</Link>
        <Link href="/academy/learn?track=zhongyi" className="rounded-lg bg-[#f5f0f8] px-3 py-2">{ui("进阶知识点")}</Link>
        <Link href="/academy/question-bank?track=zhongyi" className="rounded-lg bg-[#f5f0f8] px-3 py-2">{ui("章节题库")}</Link>
        <Link href="/academy/wrong-book" className="rounded-lg bg-[#f5f0f8] px-3 py-2">{ui("账号错题本")}</Link>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-gray-400">资料用于知识学习，不提供个人诊断或处方。进阶账号功能按页面提示登录使用。</p>
    </section>
  );
}
