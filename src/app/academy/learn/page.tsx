"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BrandHeader } from "@/components/shared";
import {
  fetchKnowledge,
  fetchCategories,
  checkinProgress,
  fetchProgress,
  TRACK_LIST,
  type KnowledgeVo,
  type CategoryVo,
} from "@/lib/academyApi";
import { PageLoginGuard } from "@/components/PageLoginGuard";

const BRAND = "#7B2FBE";

export default function AcademyLearnPage() {
  const [track, setTrack] = useState<string>("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<CategoryVo[]>([]);
  const [points, setPoints] = useState<KnowledgeVo[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [k, p] = await Promise.all([
        fetchKnowledge(track ? { track, category: category || undefined } : category ? { category } : undefined),
        fetchProgress(),
      ]);
      if (k && k.success && k.points) setPoints(k.points);
      if (p && p.success && p.progress) {
        setChecked(new Set(p.progress.map((x) => `${x.track}:${x.chapter}`)));
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [track, category]);

  useEffect(() => {
    // URL ?track= 预选板块
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("track");
      if (q) setTrack(q);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setCategory("");
    if (!track) { setCategories([]); return; }
    fetchCategories(track)
      .then((r) => setCategories(r && r.success && r.categories ? r.categories : []))
      .catch(() => setCategories([]));
  }, [track]);

  const handleCheckin = async (pt: KnowledgeVo) => {
    const key = `${pt.track}:${pt.chapter || pt.title}`;
    if (checked.has(key)) return;
    try {
      const r = await checkinProgress(pt.track, pt.chapter || pt.title);
      if (r && r.success) {
        setChecked((prev) => new Set(prev).add(key));
        showToast("学习打卡成功 +1");
      }
    } catch {}
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <PageLoginGuard />
      <BrandHeader title="知识学习" showBack backUrl="/academy" />

      {/* 板块筛选 */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="flex gap-2 overflow-x-auto px-3 py-2.5">
          <button
            onClick={() => setTrack("")}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{ backgroundColor: track === "" ? BRAND : "#f0f0f0", color: track === "" ? "#fff" : "#666" }}
          >
            全部
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
        {track && categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto border-t border-gray-100 px-3 py-2" style={{ backgroundColor: "#faf8fc" }}>
            <button
              onClick={() => setCategory("")}
              className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors"
              style={{ backgroundColor: category === "" ? BRAND + "22" : "#fff", color: category === "" ? BRAND : "#888", border: `1px solid ${category === "" ? BRAND + "44" : "#eee"}` }}
            >
              全部类目
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.name)}
                className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors"
                style={{ backgroundColor: category === c.name ? BRAND + "22" : "#fff", color: category === c.name ? BRAND : "#888", border: `1px solid ${category === c.name ? BRAND + "44" : "#eee"}` }}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-3 pb-24">
        {loading ? (
          <div className="rounded-2xl bg-white p-6 text-center text-xs text-gray-400 shadow-sm">加载中...</div>
        ) : points.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">暂无知识点</p>
            <p className="mt-1 text-xs text-gray-400">知识点由知识工厂的资料经 AI 解析并审核后生成</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {points.map((pt) => {
              const key = `${pt.track}:${pt.chapter || pt.title}`;
              const open = openId === pt.id;
              const done = checked.has(key);
              return (
                <div key={pt.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  <button
                    onClick={() => { setOpenId(open ? null : pt.id); if (!open) void handleCheckin(pt); }}
                    className="flex w-full items-start gap-3 p-4 text-left active:bg-gray-50"
                  >
                    <span
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm"
                      style={{ backgroundColor: done ? "#27ae6018" : BRAND + "12", color: done ? "#27ae60" : BRAND }}
                    >
                      {done ? "✓" : "读"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug text-gray-800">{pt.title}</p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        {TRACK_LIST.find((t) => t.key === pt.track)?.name || pt.track}
                        {pt.category ? ` · ${pt.category}` : ""}
                        {pt.chapter ? ` · ${pt.chapter}` : ""}
                        {pt.difficulty ? ` · ${pt.difficulty}` : ""}
                      </p>
                    </div>
                    <svg
                      width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"
                      className="mt-1 shrink-0 transition-transform"
                      style={{ transform: open ? "rotate(90deg)" : "none" }}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  {open && (
                    <div className="border-t border-gray-100 px-4 py-3">
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-600">{pt.content}</p>
                      {pt.tags && pt.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {pt.tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {pt.sourceText && (
                        <p className="mt-2 rounded-lg bg-gray-50 p-2 text-[10px] leading-relaxed text-gray-400">
                          原文出处：{pt.sourceText.slice(0, 120)}{pt.sourceText.length > 120 ? "..." : ""}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-4 text-center text-[10px] text-gray-300">点击知识点展开即自动完成学习打卡</p>
      </div>

      {toast && (
        <div
          className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-xs text-white shadow-lg"
          style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
        >
          {toast}
        </div>
      )}

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
