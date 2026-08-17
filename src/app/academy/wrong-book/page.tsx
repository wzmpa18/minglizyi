"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { fetchWrongAnswers, TRACK_LIST, TYPE_NAMES } from "@/lib/academyApi";
import { PageLoginGuard } from "@/components/PageLoginGuard";
import AIInterpretButton from "@/components/AIInterpretButton";
import { getToolConfig } from "@/lib/toolConfigStore";

const BRAND = "#7B2FBE";

export default function WrongBookPage() {
  const router = useRouter();
  const aiWrongEnabled = getToolConfig().yikao?.aiWrongAnalysisEnabled === true;
  const [wrongs, setWrongs] = useState<Array<{
    id: string; questionId: string; myAnswer: string; type: string; track: string;
    stem: string; options: string[]; answer: string; analysis: string; createdAt: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchWrongAnswers();
      if (r && r.success && r.wrongs) setWrongs(r.wrongs);
      else setWrongs([]);
    } catch {
      setWrongs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <PageLoginGuard />
      <BrandHeader title="错题本" showBack backUrl="/academy" />

      <div className="px-3 py-3 pb-24">
        {loading ? (
          <div className="rounded-2xl bg-white p-6 text-center text-xs text-gray-400 shadow-sm">加载中...</div>
        ) : wrongs.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-2xl">📕</p>
            <p className="mt-2 text-sm text-gray-500">错题本是空的</p>
            <p className="mt-1 text-xs text-gray-400">考试或练习中的错题会自动收录到这里</p>
            <button
              onClick={() => router.push("/academy/question-bank")}
              className="mt-4 rounded-xl px-5 py-2.5 text-xs font-bold text-white"
              style={{ backgroundColor: BRAND }}
            >
              去题库练习
            </button>
          </div>
        ) : (
          <>
            <p className="mb-2 px-1 text-[11px] text-gray-400">共 {wrongs.length} 道错题 · 点击展开解析</p>
            <div className="space-y-2.5">
              {wrongs.map((w) => {
                const open = openId === w.id;
                const isObjective = w.type === "single" || w.type === "multi" || w.type === "judge";
                return (
                  <div key={w.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                    <button
                      onClick={() => setOpenId(open ? null : w.id)}
                      className="w-full p-4 text-left active:bg-gray-50"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">
                          错题
                        </span>
                        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                          {TYPE_NAMES[w.type] || w.type}
                        </span>
                        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                          {TRACK_LIST.find((t) => t.key === w.track)?.name || w.track}
                        </span>
                        <span className="ml-auto text-[10px] text-gray-300">{(w.createdAt || "").slice(0, 10)}</span>
                      </div>
                      <p className="text-[13px] font-medium leading-relaxed text-gray-800">{w.stem}</p>
                      <p className="mt-1.5 text-[11px] text-gray-400">
                        我的作答：
                        <span className="text-red-500">{w.myAnswer || "（未作答）"}</span>
                      </p>
                    </button>

                    {open && (
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                        {isObjective && w.options.length > 0 && (
                          <div className="mb-2 space-y-1.5">
                            {w.options.map((opt, i) => {
                              const key = String.fromCharCode(65 + i);
                              const isCorrect = (w.answer || "").includes(key);
                              return (
                                <div
                                  key={key}
                                  className="flex items-start gap-2 rounded-lg p-2"
                                  style={{ backgroundColor: isCorrect ? "#27ae6010" : "#fff" }}
                                >
                                  <span
                                    className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                                    style={{ height: 18, width: 18, backgroundColor: isCorrect ? "#27ae60" : "#e5e5e5", color: isCorrect ? "#fff" : "#999" }}
                                  >
                                    {key}
                                  </span>
                                  <span className="text-[11px] leading-relaxed text-gray-600">{opt}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <p className="text-[11px] text-gray-500">
                          正确答案：<span className="font-semibold" style={{ color: "#27ae60" }}>{w.answer}</span>
                        </p>
                        {w.analysis && (
                          <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-2 text-[11px] leading-relaxed text-gray-600">
                            {w.analysis}
                          </p>
                        )}
                        {w.track === "yikao" && aiWrongEnabled && (
                          <div className="mt-2">
                            <AIInterpretButton
                              toolName="医考错题"
                              scope="AI深度解析"
                              contextData={`题干：${w.stem}\n我的作答：${w.myAnswer || "（未作答）"}\n正确答案：${w.answer}\n基础解析：${w.analysis || "（无）"}`}
                              systemPrompt="你是中医执业医师资格考试辅导老师。请针对这道错题进行深度解析：1. 指出错误原因与易混淆点；2. 讲透背后的考点原理；3. 给出同类题的举一反三思路。语言书面化、条理清晰，避免绝对化表述。结尾标注：「以上内容由AI生成，仅供文化娱乐参考，不构成任何专业建议」"
                              buttonText="AI 错题深度解析（增值）"
                              buttonStyle="secondary"
                              cacheKey={`yikao_wrong_${w.questionId}`}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
