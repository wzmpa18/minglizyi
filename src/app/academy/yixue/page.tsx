"use client";

// IOS-4.3B-RECOVERY §三：/academy/yixue 正式易学学习中心
// COURSE / KNOWLEDGE / REFERENCE / QUIZ —— 不提供排盘/预测工具入口
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BrandHeader } from "@/components/shared";
import { PageLoginGuard } from "@/components/PageLoginGuard";
import { YIXUE_SUBJECTS } from "@/lib/yixueSubjects";
import { solarToLunar, getLunarDateString } from "@/lib/lunar";
import { fetchKnowledge, type KnowledgeVo } from "@/lib/academyApi";

const BRAND = "#7B2FBE";

const STUDY_LOOP = [
  { href: "/academy/learn?track=yixue", label: "章节学习", icon: "📖", desc: "知识点 · 打卡进度" },
  { href: "/academy/question-bank?track=yixue", label: "章节练习", icon: "✏️", desc: "单选 · 多选 · 判断" },
  { href: "/academy/wrong-book", label: "错题复习", icon: "📝", desc: "错题重练 · 巩固" },
  { href: "/academy/favorites", label: "我的收藏", icon: "⭐", desc: "收藏知识点与题目" },
  { href: "/academy/notes", label: "学习笔记", icon: "🗒️", desc: "随手记 · 复习要点" },
  { href: "/academy/exam", label: "等级考试", icon: "🎓", desc: "初级 · 中级 · 高级" },
];

const TOOLS = [
  { href: "/yixue/wannianli", label: "万年历", icon: "历" },
  { href: "/yixue/huangli", label: "老黄历", icon: "黄" },
  { href: "/yixue/jieqi", label: "二十四节气", icon: "节" },
  { href: "/yixue/compass", label: "专业罗盘", icon: "罗" },
  { href: "/yixue/liji", label: "立极尺", icon: "极" },
  { href: "/yixue/luban", label: "鲁班尺", icon: "鲁" },
];

export default function YixueLearningCenterPage() {
  const [mounted, setMounted] = useState(false);
  const [kpCount, setKpCount] = useState<number>(0);
  useEffect(() => {
    setMounted(true);
    // 按类目并行取数求和：单次 track 查询有 300 条上限，类目级查询上限 1000 足以覆盖
    const cats = Array.from(new Set(YIXUE_SUBJECTS.flatMap((s) => s.categories)));
    Promise.all(cats.map((c) => fetchKnowledge({ track: "yixue", category: c, limit: 1000 }).catch(() => null)))
      .then((rs) => {
        setKpCount(rs.reduce((n, r) => n + (r && r.success && r.points ? r.points.length : 0), 0));
      })
      .catch(() => {});
  }, []);

  const nongli = useMemo(() => {
    const now = mounted ? new Date() : new Date(2026, 0, 1, 12, 0, 0);
    try {
      return getLunarDateString(solarToLunar(now.getFullYear(), now.getMonth() + 1, now.getDate()));
    } catch { return ""; }
  }, [mounted]);

  return (
    <div className="mx-auto w-full" style={{ maxWidth: "420px", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <PageLoginGuard />
      <BrandHeader title="易学学习中心" showBack backUrl="/academy" />

      <div className="px-3 pb-28 pt-3">
        {/* 今日历法（仅展示传统历法数据） */}
        <div className="mb-3 rounded-2xl bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">今日农历</p>
              <p className="text-base font-bold" style={{ color: BRAND }}>{nongli || "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">知识点总量</p>
              <p className="text-base font-bold" style={{ color: BRAND }}>{kpCount > 0 ? `${kpCount} 条` : "加载中"}</p>
            </div>
          </div>
          <p className="mt-2 rounded-lg bg-[#f7f2fb] px-2.5 py-1.5 text-[11px] leading-relaxed text-gray-500">
            本中心为传统文化学习版块：课程 · 知识 · 资料 · 练习，供易学与传统文化爱好者系统研读。
          </p>
        </div>

        {/* 学科目录 */}
        <h2 className="mb-2 px-1 text-base font-bold text-gray-800">学科目录</h2>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {YIXUE_SUBJECTS.map((s) => (
            <Link
              key={s.key}
              href={`/academy/yixue/${s.key}`}
              className="rounded-2xl bg-white p-3 shadow-sm transition-transform active:scale-[0.98]"
            >
              <div className="flex items-start gap-2">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white"
                  style={{ backgroundColor: BRAND }}
                >{s.icon}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-800">{s.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-gray-500">{s.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* 学习闭环 */}
        <h2 className="mb-2 px-1 text-base font-bold text-gray-800">学习闭环</h2>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {STUDY_LOOP.map((x) => (
            <Link
              key={x.label}
              href={x.href}
              className="flex flex-col items-center rounded-2xl bg-white px-1 py-3 shadow-sm transition-transform active:scale-[0.98]"
            >
              <span className="text-xl">{x.icon}</span>
              <p className="mt-1 text-xs font-semibold text-gray-800">{x.label}</p>
              <p className="mt-0.5 text-center text-[9px] leading-tight text-gray-400">{x.desc}</p>
            </Link>
          ))}
        </div>

        {/* 传统历法工具 */}
        <h2 className="mb-2 px-1 text-base font-bold text-gray-800">历法工具</h2>
        <div className="grid grid-cols-3 gap-2">
          {TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 shadow-sm transition-transform active:scale-[0.98]"
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: BRAND }}
              >{t.icon}</span>
              <span className="text-xs font-medium text-gray-700">{t.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
