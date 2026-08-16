"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { fetchTracks, LEVEL_NAMES, type TrackOverview } from "@/lib/academyApi";
import { PageLoginGuard } from "@/components/PageLoginGuard";

const BRAND = "#7B2FBE";

const TRACK_EMOJI: Record<string, string> = {
  zhongyi: "🌿", yixue: "☯️", guoxue: "📜",
};

const ENTRIES = [
  { key: "learn", emoji: "📖", name: "知识学习", desc: "分赛道知识点精读打卡", url: "/academy/learn" },
  { key: "bank", emoji: "📝", name: "题库练习", desc: "六大题型逐题精练", url: "/academy/question-bank" },
  { key: "exam", emoji: "🎓", name: "等级考试", desc: "随机组卷 · 限时答题 · 自动判分", url: "/academy/exam" },
  { key: "cert", emoji: "🏅", name: "我的证书", desc: "电子证书查验与复核", url: "/academy/certificates" },
  { key: "wrong", emoji: "📕", name: "错题本", desc: "错题回顾消灭薄弱点", url: "/academy/wrong-book" },
  { key: "factory", emoji: "🏭", name: "知识工厂", desc: "上传资料 · AI 解析入库", url: "/academy/factory" },
];

export default function AcademyPage() {
  const router = useRouter();
  const [tracks, setTracks] = useState<TrackOverview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchTracks().then((r) => {
      if (r && r.success && r.tracks) setTracks(r.tracks);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <PageLoginGuard />
      <BrandHeader title="言道学堂" showBack />

      {/* 顶部定位 */}
      <div
        className="px-4 pb-4 pt-3"
        style={{ background: `linear-gradient(180deg, ${BRAND} 0%, #8E44AD 55%, #f5f5f5 100%)` }}
      >
        <div className="rounded-2xl bg-white/95 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-base font-bold text-white"
              style={{ backgroundColor: BRAND }}
            >
              学
            </span>
            <div>
              <p className="text-base font-bold text-gray-800">言道学堂 · AI 知识工厂</p>
              <p className="text-[11px] text-gray-400">学 · 练 · 考 · 证 一体化国学成长体系</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-gray-500">
            上传资料由 AI 解析为结构化知识点，自动生成六大题型题库；随机组卷考试通过后颁发分赛道等级证书，可公开验真。
          </p>
        </div>
      </div>

      <div className="px-3 pb-24 pt-1">
        {/* 功能入口宫格 */}
        <div className="grid grid-cols-3 gap-2.5">
          {ENTRIES.map((e) => (
            <button
              key={e.key}
              onClick={() => router.push(e.url)}
              className="flex flex-col items-center rounded-2xl bg-white p-3 shadow-sm active:scale-[0.97] transition-transform"
            >
              <span className="mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: BRAND + "12" }}>
                {e.emoji}
              </span>
              <p className="text-[13px] font-bold text-gray-800">{e.name}</p>
              <p className="mt-0.5 text-center text-[10px] leading-tight text-gray-400">{e.desc}</p>
            </button>
          ))}
        </div>

        {/* 板块概览 */}
        <p className="mb-2 mt-4 px-1 text-xs font-semibold text-gray-500">板块概览</p>
        {loading ? (
          <div className="rounded-2xl bg-white p-6 text-center text-xs text-gray-400 shadow-sm">加载中...</div>
        ) : tracks.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-xs text-gray-400">暂无赛道数据，去知识工厂上传第一份资料吧</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {tracks.map((t) => (
              <button
                key={t.key}
                onClick={() => router.push(`/academy/learn?track=${t.key}`)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm active:bg-gray-50"
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
                  style={{ backgroundColor: BRAND + "12" }}
                >
                  {TRACK_EMOJI[t.key] || "📚"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">{t.name}</span>
                    {t.myLevel > 0 && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ backgroundColor: BRAND + "15", color: BRAND }}
                      >
                        {LEVEL_NAMES[t.myLevel] || `L${t.myLevel}`}
                        {t.myTitle ? ` · ${t.myTitle}` : ""}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">
                    {t.categoryCount} 个类目 · {t.knowledgeCount} 个知识点 · {t.questionCount} 道题
                    {t.myCertificates.length > 0 ? ` · ${t.myCertificates.length} 张证书` : ""}
                  </p>
                </div>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        )}

        <p className="mt-4 text-center text-[10px] leading-relaxed text-gray-300">
          言道学堂内容由 AI 辅助生成并经人工审核<br />仅供传统文化学习参考
        </p>
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
