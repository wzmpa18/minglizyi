"use client";

import { useState } from "react";
import Link from "next/link";
import { fetchKnowledgeById, fetchQuestionStudyExplanation, type KnowledgeVo, type QuestionVo } from "@/lib/academyApi";

export function QuestionStudyHelp({ question }: { question: QuestionVo }) {
  const [point, setPoint] = useState<KnowledgeVo | null>(null);
  const [opened, setOpened] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [explanation, setExplanation] = useState("");
  const [explanationBusy, setExplanationBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [membershipNeeded, setMembershipNeeded] = useState(false);

  const showSource = async () => {
    if (opened) { setOpened(false); return; }
    if (!question.knowledgeId) { setError("这道题尚未关联已审核的知识点"); return; }
    if (point) { setOpened(true); return; }
    setBusy(true);
    setError("");
    try {
      const result = await fetchKnowledgeById(question.knowledgeId);
      if (!result.success || !result.point) throw new Error(result.error || "知识点暂时不可用");
      setPoint(result.point);
      setOpened(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "知识点读取失败"); }
    finally { setBusy(false); }
  };

  const showExplanation = async () => {
    if (explanation) return;
    setExplanationBusy(true);
    setError("");
    try {
      const result = await fetchQuestionStudyExplanation(question.id);
      if (!result.success || !result.content) {
        if (result.code === "MEMBERSHIP_REQUIRED") setMembershipNeeded(true);
        throw new Error(result.error || "讲解暂不可用");
      }
      setExplanation(result.content);
      setRemaining(result.remaining ?? null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "讲解暂不可用"); }
    finally { setExplanationBusy(false); }
  };

  return <div className="mt-3 rounded-lg border border-emerald-100 bg-white p-3 text-xs leading-6">
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => void showSource()} disabled={busy}
        className="rounded-full border border-emerald-200 px-3 py-1 font-semibold text-emerald-800 disabled:opacity-50">
        {busy ? "读取中…" : opened ? "收起考点资料" : "查看考点资料"}
      </button>
      <Link href="/academy/resources" className="rounded-full border border-emerald-200 px-3 py-1 font-semibold text-emerald-800">查看资料库</Link>
    </div>
    {error && <p role="status" className="mt-2 text-amber-800">{error}</p>}
    {opened && point && <section className="mt-3 rounded-lg bg-emerald-50 p-3">
      <h3 className="font-semibold text-emerald-950">{point.title}</h3>
      {point.chapter && <p className="text-emerald-800">{point.chapter}</p>}
      <p className="mt-2 whitespace-pre-wrap text-gray-700">{point.content}</p>
      {point.sourceText && <details className="mt-2"><summary className="cursor-pointer text-emerald-800">查看引用原文</summary><p className="mt-1 whitespace-pre-wrap text-gray-700">{point.sourceText}</p></details>}
    </section>}
    <div className="mt-3">
      <button type="button" onClick={() => void showExplanation()} disabled={explanationBusy}
        className="rounded-full bg-emerald-700 px-3 py-1 font-semibold text-white disabled:opacity-50">
        {explanationBusy ? "准备讲解中…" : explanation ? "讲解已保存" : "会员 AI 讲解这道题"}
      </button>
      {membershipNeeded && <Link href="/membership" className="ml-2 text-emerald-800 underline">查看会员权益</Link>}
      {explanation && <div className="mt-3 rounded-lg bg-amber-50 p-3"><p className="whitespace-pre-wrap text-gray-700">{explanation}</p><p className="mt-2 text-[11px] text-gray-500">已保存的讲解可复用；今日还可查看 {remaining ?? 0} 道新讲解。</p></div>}
    </div>
  </div>;
}
