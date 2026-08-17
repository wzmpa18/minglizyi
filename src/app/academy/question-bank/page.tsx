"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { addNote, toggleFavorite, isFavorited } from "@/lib/academyStudyStore";

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
  // P6-补03 阶段3：顶部双 Tab（题库/文库）、二级类目手风琴、练习模式切换
  const [topTab, setTopTab] = useState<"bank" | "lib">("bank");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [practiceMode, setPracticeMode] = useState<"order" | "random">("order");
  const [favTick, setFavTick] = useState(0);
  const [noteToast, setNoteToast] = useState(false);
  const router = useRouter();
  void favTick; // 收藏状态刷新触发器

  // P6-补03 阶段3：随机练习模式下打乱题序（洗牌一次，随筛选条件变化重洗）
  const displayQuestions = useMemo(() => {
    if (practiceMode !== "random") return questions;
    const arr = [...questions];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [questions, practiceMode]);

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

      {/* P6-补03 阶段3：顶部「题库/文库」双 Tab */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="grid grid-cols-2">
          <button
            onClick={() => setTopTab("bank")}
            className="py-2.5 text-sm font-bold transition-colors"
            style={{ color: topTab === "bank" ? BRAND : "#999", borderBottom: topTab === "bank" ? `2px solid ${BRAND}` : "2px solid transparent" }}
          >题库</button>
          <button
            onClick={() => setTopTab("lib")}
            className="py-2.5 text-sm font-bold transition-colors"
            style={{ color: topTab === "lib" ? BRAND : "#999", borderBottom: topTab === "lib" ? `2px solid ${BRAND}` : "2px solid transparent" }}
          >文库</button>
        </div>

        {topTab === "lib" ? (
          /* 文库 Tab：知识文库入口（知识点学习） */
          <div className="px-3 py-4">
            <button
              onClick={() => router.push("/academy/learn")}
              className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-sm font-bold"
              style={{ backgroundColor: "#F3EDF7", color: BRAND }}
            >
              <span>📚 进入知识文库</span><span>›</span>
            </button>
            <p className="mt-2 px-1 text-[11px] text-gray-400">文库收录各板块知识点，支持按类目逐章学习与打卡</p>
          </div>
        ) : (
          <>
            {/* 快捷入口区（错题本/我的笔记/我的收藏/排行榜） */}
            <div className="grid grid-cols-4 border-b border-gray-100 px-2 py-2.5">
              {[
                { icon: "📕", label: "错题本", path: "/academy/wrong-book" },
                { icon: "📝", label: "我的笔记", path: "/academy/notes" },
                { icon: "⭐", label: "我的收藏", path: "/academy/favorites" },
                { icon: "🏆", label: "排行榜", path: "/academy/leaderboard" },
              ].map((e) => (
                <button key={e.path} onClick={() => router.push(e.path)} className="flex flex-col items-center gap-1 py-1 active:opacity-60">
                  <span className="text-xl leading-none">{e.icon}</span>
                  <span className="text-[10px] font-medium text-gray-600">{e.label}</span>
                </button>
              ))}
            </div>

            {/* 精选题库卡片区：板块直达 */}
            <div className="flex gap-2 overflow-x-auto px-3 py-2.5">
              <button
                onClick={() => setTrack("")}
                className="shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold transition-colors"
                style={{ backgroundColor: track === "" ? BRAND : "#f0f0f0", color: track === "" ? "#fff" : "#666" }}
              >全部</button>
              {TRACK_LIST.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTrack(track === t.key ? "" : t.key)}
                  className="shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold transition-colors"
                  style={{ backgroundColor: track === t.key ? BRAND : "#f0f0f0", color: track === t.key ? "#fff" : "#666" }}
                >{t.name}</button>
              ))}
            </div>
          </>
        )}
      </div>

      {topTab === "bank" && (
      <>
      {/* 类目筛选：手风琴折叠抽屉（P6-补03 阶段3） */}
      {track && categories.length > 0 && (
        <div className="border-b border-gray-100 bg-white px-3 py-2">
          <button
            onClick={() => setDrawerOpen(v => !v)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-bold"
            style={{ color: BRAND, border: "1px solid #e9def5", backgroundColor: "#faf7fd" }}
          >
            <span>{category ? `章节：${category}` : "全部章节（点击展开章节树）"}</span>
            <span style={{ fontSize: "10px", color: "#999" }}>{drawerOpen ? "收起 ▲" : "展开 ▼"}</span>
          </button>
          {drawerOpen && (
            <div className="mt-1.5 flex flex-col gap-1">
              <button
                onClick={() => setCategory("")}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold"
                style={{ backgroundColor: category === "" ? BRAND + "18" : "#fff", color: category === "" ? BRAND : "#666", border: `1px solid ${category === "" ? BRAND + "44" : "#eee"}` }}
              >
                <span>全部章节</span>{category === "" && <span style={{ color: BRAND }}>✓</span>}
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCategory(c.name); setDrawerOpen(false); }}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold"
                  style={{ backgroundColor: category === c.name ? BRAND + "18" : "#fff", color: category === c.name ? BRAND : "#666", border: `1px solid ${category === c.name ? BRAND + "44" : "#eee"}` }}
                >
                  <span>{c.name}</span>{category === c.name && <span style={{ color: BRAND }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 题型筛选 + 练习模式切换栏 */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-gray-100 bg-white px-3 py-2">
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
        <span className="ml-auto shrink-0 text-[10px] text-gray-300">|</span>
        {(["order", "random"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setPracticeMode(m)}
            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
            style={{ backgroundColor: practiceMode === m ? BRAND + "15" : "#f7f7f7", color: practiceMode === m ? BRAND : "#999" }}
          >{m === "order" ? "顺序练习" : "随机练习"}</button>
        ))}
      </div>

      {/* 覆盖度展示：P6-补03 阶段3 前端不展示题量，仅展示覆盖状态文案（由后台覆盖度引擎触发） */}
      <div className="border-b border-gray-100 bg-white px-3 py-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium" style={{ color: coverage && coverage.coverage_rate >= 100 ? "#15803d" : "#666" }}>
            {coverage && coverage.coverage_rate >= 100 ? "覆盖全部核心知识点与考点" : "核心知识点持续完善中"}
          </p>
          <p className="text-[10px] text-gray-400">{coverage ? `覆盖 ${coverage.coverage_rate}%` : ""}</p>
        </div>
        {coverage && (
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full transition-all" style={{ width: `${coverage.coverage_rate}%`, backgroundColor: coverage.coverage_rate >= 100 ? "#10b981" : BRAND }} />
          </div>
        )}
      </div>

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
            {/* P6-补03 阶段3：不展示题量，仅提示作答方式 */}
            <p className="mb-2 px-1 text-[11px] text-gray-400">点击选项作答后展开核对 · {practiceMode === "random" ? "随机练习中" : "顺序练习中"}</p>
            <div className="space-y-2.5">
              {displayQuestions.map((q, idx) => {
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
                        {/* P6-补03 阶段3：收藏 + 记笔记（写入快捷入口对应页面） */}
                        <button
                          onClick={() => {
                            toggleFavorite({ questionId: q.id, stem: q.stem, track: q.track || "", category: q.category || "", answer: q.answer || "", analysis: q.analysis || "" });
                            setFavTick(t => t + 1);
                          }}
                          className="text-[13px] leading-none"
                          style={{ color: isFavorited(q.id) ? "#f5a623" : "#ccc" }}
                          title="收藏"
                        >★</button>
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
                        <button
                          onClick={() => {
                            addNote({ title: q.stem.slice(0, 30), content: `题干：${q.stem}\n参考答案：${q.answer}\n解析：${q.analysis || "（无）"}`, track: q.track || "", category: q.category || "", questionId: q.id });
                            setNoteToast(true);
                            setTimeout(() => setNoteToast(false), 1600);
                          }}
                          className="mt-2 rounded-full px-3 py-1 text-[11px] font-bold"
                          style={{ color: BRAND, border: `1px solid ${BRAND}55`, backgroundColor: "#fff" }}
                        >📝 记笔记</button>
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
      {noteToast && (
        <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-lg px-4 py-2.5 text-xs font-medium text-white" style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
          已收录到我的笔记
        </div>
      )}
      </>
      )}
    </div>
  );
}
