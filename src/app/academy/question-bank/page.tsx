"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BrandHeader } from "@/components/shared";
import {
  fetchQuestions,
  fetchCategories,
  fetchCoverage,
  TRACK_LIST,
  TYPE_NAMES,
  type QuestionVo,
  type CategoryVo,
  type CoverageVo,
} from "@/lib/academyApi";
import { PageLoginGuard } from "@/components/PageLoginGuard";

const BRAND = "#7B2FBE";

const DIFF_NAMES: Record<string, string> = { easy: "易", medium: "中", hard: "难" };

export default function QuestionBankPage() {
  const [track, setTrack] = useState<string>("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<CategoryVo[]>([]);
  const [type, setType] = useState<string>("");
  const [questions, setQuestions] = useState<QuestionVo[]>([]);
  const [coverage, setCoverage] = useState<CoverageVo | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchQuestions({
        status: "approved",
        ...(track ? { track } : {}),
        ...(category ? { category } : {}),
        ...(type ? { type } : {}),
      });
      if (r && r.success && r.questions) setQuestions(r.questions);
      else setQuestions([]);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [track, category, type]);

  useEffect(() => {
    void load();
  }, [load]);

  // P6-TCM-02 3.4：覆盖度由后台真实计算动态展示（禁止写死文案）
  useEffect(() => {
    if (!track) { setCoverage(null); return; }
    fetchCoverage(track, category || undefined)
      .then((r) => setCoverage(r && r.success && r.coverage ? r.coverage : null))
      .catch(() => setCoverage(null));
  }, [track, category]);

  useEffect(() => {
    setCategory("");
    if (!track) { setCategories([]); return; }
    fetchCategories(track)
      .then((r) => setCategories(r && r.success && r.categories ? r.categories : []))
      .catch(() => setCategories([]));
  }, [track]);

  const choose = (q: QuestionVo, opt: string) => {
    if (q.type === "multi") {
      const cur = (picked[q.id] || "").split(",").filter(Boolean);
      const next = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt].sort();
      setPicked((p) => ({ ...p, [q.id]: next.join(",") }));
    } else {
      setPicked((p) => ({ ...p, [q.id]: opt }));
    }
  };

  const isSelected = (q: QuestionVo, opt: string) => {
    if (q.type === "multi") return (picked[q.id] || "").split(",").filter(Boolean).includes(opt);
    return picked[q.id] === opt;
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <PageLoginGuard />
      <BrandHeader title="题库练习" showBack backUrl="/academy" />

      {/* 板块筛选 */}
      <div className="sticky top-0 z-10 flex gap-2 overflow-x-auto border-b border-gray-200 bg-white px-3 py-2.5">
        <button
          onClick={() => setTrack("")}
          className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{ backgroundColor: track === "" ? BRAND : "#f0f0f0", color: track === "" ? "#fff" : "#666" }}
        >
          全部板块
        </button>
        {TRACK_LIST.map((t) => (
          <button
            key={t.key}
            onClick={() => setTrack(t.key)}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{ backgroundColor: track === t.key ? BRAND : "#f0f0f0", color: track === t.key ? "#fff" : "#666" }}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* 类目筛选 */}
      {track && categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-b border-gray-100 bg-white px-3 py-2">
          <button
            onClick={() => setCategory("")}
            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
            style={{ backgroundColor: category === "" ? BRAND + "15" : "#f7f7f7", color: category === "" ? BRAND : "#999" }}
          >
            全部类目
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.name)}
              className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
              style={{ backgroundColor: category === c.name ? BRAND + "15" : "#f7f7f7", color: category === c.name ? BRAND : "#999" }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* 题型筛选 */}
      <div className="flex gap-2 overflow-x-auto border-b border-gray-100 bg-white px-3 py-2">
        <button
          onClick={() => setType("")}
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
          style={{ backgroundColor: type === "" ? BRAND + "15" : "#f7f7f7", color: type === "" ? BRAND : "#999" }}
        >
          全题型
        </button>
        {Object.entries(TYPE_NAMES).map(([k, name]) => (
          <button
            key={k}
            onClick={() => setType(k)}
            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
            style={{ backgroundColor: type === k ? BRAND + "15" : "#f7f7f7", color: type === k ? BRAND : "#999" }}
          >
            {name}
          </button>
        ))}
      </div>

      {/* 覆盖度真实计算动态展示（P6-TCM-02 3.4，禁止写死） */}
      {coverage && (
        <div className="border-b border-gray-100 bg-white px-3 py-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium" style={{ color: coverage.coverage_rate >= 100 ? "#15803d" : coverage.coverage_rate >= 70 ? "#a16207" : "#666" }}>
              {coverage.display_text}
            </p>
            <p className="text-[10px] text-gray-400">
              知识点覆盖 {coverage.kp_covered}/{coverage.kp_total}（{coverage.coverage_rate}%）
            </p>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full transition-all" style={{ width: `${coverage.coverage_rate}%`, backgroundColor: coverage.coverage_rate >= 100 ? "#10b981" : BRAND }} />
          </div>
        </div>
      )}

      <div className="px-3 py-3 pb-24">
        {loading ? (
          <div className="rounded-2xl bg-white p-6 text-center text-xs text-gray-400 shadow-sm">加载中...</div>
        ) : questions.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">该筛选下暂无题目</p>
            <p className="mt-1 text-xs text-gray-400">
              题目由知识工厂的知识点经 AI 生成、人工审核后入库
            </p>
          </div>
        ) : (
          <>
            <p className="mb-2 px-1 text-[11px] text-gray-400">共 {questions.length} 题 · 点击选项作答后展开核对</p>
            <div className="space-y-2.5">
              {questions.map((q, idx) => {
                const open = openId === q.id;
                const my = picked[q.id] || "";
                const isObjective = q.type === "single" || q.type === "multi" || q.type === "judge";
                return (
                  <div key={q.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                    <div className="p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{ backgroundColor: BRAND + "12", color: BRAND }}
                        >
                          {TYPE_NAMES[q.type] || q.type}
                        </span>
                        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                          {DIFF_NAMES[q.difficulty] || q.difficulty}
                        </span>
                        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                          {TRACK_LIST.find((t) => t.key === q.track)?.name || q.track}
                        </span>
                        <span className="ml-auto text-[10px] text-gray-300">#{idx + 1}</span>
                      </div>
                      <p className="text-[13px] font-medium leading-relaxed text-gray-800">{q.stem}</p>

                      {/* 客观题选项 */}
                      {isObjective && q.options.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {q.options.map((opt, i) => {
                            const key = String.fromCharCode(65 + i);
                            const sel = isSelected(q, key);
                            return (
                              <button
                                key={key}
                                onClick={() => choose(q, key)}
                                className="flex w-full items-start gap-2 rounded-xl border p-2.5 text-left active:scale-[0.99] transition-transform"
                                style={{
                                  borderColor: sel ? BRAND : "#eee",
                                  backgroundColor: sel ? BRAND + "0a" : "#fafafa",
                                }}
                              >
                                <span
                                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                                  style={{
                                    backgroundColor: sel ? BRAND : "#e5e5e5",
                                    color: sel ? "#fff" : "#999",
                                  }}
                                >
                                  {key}
                                </span>
                                <span className="text-xs leading-relaxed text-gray-700">{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* 主观题输入 */}
                      {(q.type === "fill" || q.type === "qa" || q.type === "case") && (
                        <textarea
                          value={my}
                          onChange={(e) => setPicked((p) => ({ ...p, [q.id]: e.target.value }))}
                          placeholder={q.type === "fill" ? "填写答案" : "写出你的解答思路"}
                          className="mt-3 w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-700 outline-none focus:border-purple-400"
                          rows={q.type === "fill" ? 1 : 3}
                        />
                      )}
                    </div>

                    <button
                      onClick={() => setOpenId(open ? null : q.id)}
                      className="w-full border-t border-gray-100 py-2.5 text-[11px] font-medium"
                      style={{ color: BRAND, backgroundColor: "#fafafa" }}
                    >
                      {open ? "收起解析" : my ? "核对答案" : "查看答案"}
                    </button>

                    {open && (
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                        {my && (
                          <p className="mb-1.5 text-[11px] text-gray-500">
                            我的作答：
                            <span className="font-medium text-gray-700">
                              {isObjective ? my || "（未作答）" : my || "（未作答）"}
                            </span>
                          </p>
                        )}
                        <p className="text-[11px] text-gray-500">
                          参考答案：<span className="font-semibold" style={{ color: "#27ae60" }}>{q.answer}</span>
                        </p>
                        {q.analysis && (
                          <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-2 text-[11px] leading-relaxed text-gray-600">
                            {q.analysis}
                          </p>
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
