"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { fetchTracks, LEVEL_NAMES, type TrackOverview } from "@/lib/academyApi";
import { PageLoginGuard } from "@/components/PageLoginGuard";
import { getToolConfig } from "@/lib/toolConfigStore";

const BRAND = "#7B2FBE";

// v25.0.29（P7-3）：言道学堂重构为五大学习区
// 易学学习区 / 中医学习区（现有学习资料分门别类）/ 医学考试区 / 养生学习区（内容完善中）/ 国学学习区
interface ZoneDef {
  key: string;
  name: string;
  emoji: string;
  color: string;
  desc: string;
  trackKey?: string;
  entries: Array<{ key: string; label: string; url: string }>;
  coming?: boolean;
}

const ZONES: ZoneDef[] = [
  {
    key: "yixue",
    name: "易学学习区",
    emoji: "☯️",
    color: "#7B2FBE",
    desc: "八字 · 紫微 · 六爻 · 易学知识点精读与题库",
    trackKey: "yixue",
    entries: [
      { key: "center", label: "🏛️ 易学学习中心", url: "/academy/yixue" },
      { key: "learn", label: "📖 知识学习", url: "/academy/learn?track=yixue" },
      { key: "bank", label: "📝 题库练习", url: "/academy/question-bank" },
      { key: "exam", label: "🎓 等级考试", url: "/academy/exam" },
    ],
  },
  {
    key: "zhongyi",
    name: "中医学习区",
    emoji: "🌿",
    color: "#2FAE9E",
    desc: "典籍讲义分门别类 · 中医知识点与题库",
    trackKey: "zhongyi",
    entries: [
      { key: "learn", label: "📖 知识学习", url: "/academy/learn?track=zhongyi" },
      { key: "bank", label: "📝 题库练习", url: "/academy/question-bank" },
      { key: "exam", label: "🎓 等级考试", url: "/academy/exam" },
    ],
  },
  {
    key: "yikao",
    name: "医学考试区",
    emoji: "🩺",
    color: "#C05046",
    desc: "中医执业医师 · 刷题 / 模考 / 文库一体化",
    entries: [{ key: "yikao", label: "🎓 医考题库专区", url: "/academy/yikao" }],
  },
  {
    key: "yangsheng",
    name: "养生学习区",
    emoji: "🍵",
    color: "#8B6F47",
    desc: "四时养生 · 食疗本草 · 内容持续完善中",
    entries: [],
    coming: true,
  },
  {
    key: "guoxue",
    name: "国学学习区",
    emoji: "📜",
    color: "#B8860B",
    desc: "经史子集 · 传统经典 · 系统研读",
    trackKey: "guoxue",
    entries: [
      { key: "learn", label: "📖 知识学习", url: "/academy/learn?track=guoxue" },
      { key: "bank", label: "📝 题库练习", url: "/academy/question-bank" },
    ],
  },
];

// 通用学习工具（跨区共用）
const TOOLS = [
  { key: "wrong", emoji: "📕", name: "错题本", desc: "错题回顾", url: "/academy/wrong-book" },
  { key: "cert", emoji: "🏅", name: "我的证书", desc: "查验复核", url: "/academy/certificates" },
  { key: "factory", emoji: "🏭", name: "知识工厂", desc: "AI 解析入库", url: "/academy/factory" },
  { key: "orgs", emoji: "🏛️", name: "机构专区", desc: "入驻开班", url: "/academy/orgs" },
];

export default function AcademyPage() {
  const router = useRouter();
  const [tracks, setTracks] = useState<TrackOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const yikaoEnabled = getToolConfig().yikao?.enabled === true;

  useEffect(() => {
    void fetchTracks().then((r) => {
      if (r && r.success && r.tracks) setTracks(r.tracks);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const trackOf = (key?: string) => (key ? tracks.find((t) => t.key === key) : undefined);

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
              <p className="text-base font-bold text-gray-800">言道学堂 · 五大学习区</p>
              <p className="text-[11px] text-gray-400">易学 · 中医 · 医考 · 养生 · 国学</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-gray-500">
            分区学习 · 逐级考核 · 证书验真；上传资料由 AI 解析为结构化知识点，经人工审核后生成题库。
          </p>
        </div>
      </div>

      <div className="px-3 pb-24 pt-1">
        {/* ===== 五大学习区 ===== */}
        <div className="space-y-3">
          {ZONES.map((z) => {
            // 医学考试区受 LOC 开关控制
            if (z.key === "yikao" && !yikaoEnabled) return null;
            const t = trackOf(z.trackKey);
            return (
              <section key={z.key} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                {/* 区头 */}
                <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2" style={{ borderBottom: z.coming ? "none" : "1px solid #f2f2f2" }}>
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
                    style={{ backgroundColor: z.color + "12" }}
                  >
                    {z.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold text-gray-800">{z.name}</span>
                      {z.coming && (
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: z.color + "15", color: z.color }}>
                          持续完善中
                        </span>
                      )}
                      {t && t.myLevel > 0 && (
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: BRAND + "15", color: BRAND }}>
                          {LEVEL_NAMES[t.myLevel] || `L${t.myLevel}`}
                          {t.myTitle ? ` · ${t.myTitle}` : ""}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-gray-400">{z.desc}</p>
                  </div>
                </div>

                {z.coming ? (
                  /* 养生等内容持续完善区：预留说明 */
                  <div className="px-4 pb-3.5 pt-1.5">
                    <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-center text-[11px] text-gray-400">
                      核心知识点持续完善中
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 区内统计（仅学习型板块） */}
                    {t && (
                      <div className="flex items-center gap-1.5 px-4 pt-2 text-[10px] text-gray-400">
                        <span>{t.categoryCount} 个类目</span>
                        <span>·</span>
                        <span>{t.knowledgeCount} 个知识点</span>
                        <span>·</span>
                        <span>覆盖全部核心知识点与考点</span>
                      </div>
                    )}
                    {/* 区内入口 */}
                    <div className="flex flex-wrap gap-2 px-4 pb-3.5 pt-2">
                      {z.entries.map((e) => (
                        <button
                          key={e.key}
                          onClick={() => router.push(e.url)}
                          className="rounded-full px-3.5 py-2 text-xs font-bold active:scale-[0.97] transition-transform"
                          style={{
                            backgroundColor: z.key === "yikao" ? "#2FAE9E" : z.color + "12",
                            color: z.key === "yikao" ? "#fff" : z.color,
                          }}
                        >
                          {e.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </section>
            );
          })}
        </div>

        {/* ===== 学习工具 ===== */}
        <p className="mb-2 mt-4 px-1 text-xs font-semibold text-gray-500">学习工具</p>
        <div className="grid grid-cols-4 gap-2.5">
          {TOOLS.map((e) => (
            <button
              key={e.key}
              onClick={() => router.push(e.url)}
              className="flex flex-col items-center rounded-2xl bg-white p-2.5 shadow-sm active:scale-[0.97] transition-transform"
            >
              <span className="mb-1 flex h-9 w-9 items-center justify-center rounded-xl text-lg" style={{ backgroundColor: BRAND + "12" }}>
                {e.emoji}
              </span>
              <p className="text-[12px] font-bold text-gray-800">{e.name}</p>
              <p className="mt-0.5 text-center text-[9px] leading-tight text-gray-400">{e.desc}</p>
            </button>
          ))}
        </div>

        {loading && (
          <p className="mt-3 text-center text-[10px] text-gray-300">学习区数据加载中...</p>
        )}

        <p className="mt-4 text-center text-[10px] leading-relaxed text-gray-300">
          内容仅供文化娱乐参考，不构成任何专业建议
        </p>
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
