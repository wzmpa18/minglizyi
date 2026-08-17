"use client";

import { useEffect, useState } from "react";
import { BrandHeader } from "@/components/shared";
import { PageLoginGuard } from "@/components/PageLoginGuard";
import { fetchMyExams, TRACK_LIST } from "@/lib/academyApi";

const BRAND = "#7B2FBE";

interface RankRow { name: string; score: number; count: number; self?: boolean }

export default function AcademyLeaderboardPage() {
  const [tab, setTab] = useState<string>("all");
  const [rows, setRows] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // 排行榜基于本人考试记录生成个人成绩榜（平台级排行需加入机构后于机构榜查看）
    fetchMyExams()
      .then((r) => {
        const exams = r && r.success && r.exams ? r.exams : [];
        const byTrack: Record<string, RankRow> = {};
        for (const e of exams) {
          const t = e.track || "all";
          const label = e.trackName || (t === "all" ? "全部" : (TRACK_LIST.find((x) => x.key === t)?.name || t));
          if (!byTrack[t]) byTrack[t] = { name: label, score: 0, count: 0, self: true };
          byTrack[t].score += e.score || 0;
          byTrack[t].count += 1;
          byTrack[t].self = true;
        }
        const list = Object.values(byTrack);
        setRows(tab === "all"
          ? [{ name: "全部板块", score: exams.reduce((s, e) => s + (e.score || 0), 0), count: exams.length, self: true }, ...list.filter((x) => x.name !== "全部板块")]
          : list.filter((x) => (TRACK_LIST.find((y) => y.key === tab)?.name || tab) === x.name));
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <PageLoginGuard />
      <BrandHeader title="学习排行榜" showBack backUrl="/academy/question-bank" />

      <div className="sticky top-0 z-10 grid grid-cols-4 gap-1.5 border-b border-gray-200 bg-white px-3 py-2.5">
        <button onClick={() => setTab("all")} className="rounded-full px-1 py-1.5 text-xs font-semibold" style={{ backgroundColor: tab === "all" ? BRAND : "#f0f0f0", color: tab === "all" ? "#fff" : "#666" }}>总榜</button>
        {TRACK_LIST.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className="rounded-full px-1 py-1.5 text-xs font-semibold" style={{ backgroundColor: tab === t.key ? BRAND : "#f0f0f0", color: tab === t.key ? "#fff" : "#666" }}>{t.name}</button>
        ))}
      </div>

      <div className="px-3 py-3 pb-24">
        <div className="mb-3 rounded-xl px-3 py-2 text-[11px]" style={{ backgroundColor: BRAND + "14", color: BRAND }}>
          个人成绩榜：汇总你的考试得分与场次；加入学习机构后可在机构页查看同门总榜
        </div>
        {loading ? (
          <div className="rounded-2xl bg-white p-6 text-center text-xs text-gray-400 shadow-sm">加载中...</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">暂无考试记录</p>
            <p className="mt-1 text-xs text-gray-400">完成考试后此处展示你的成绩汇总</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-gray-50 px-4 py-3 last:border-b-0">
                <span className="w-6 text-center text-sm font-bold" style={{ color: i === 0 ? "#e6a817" : i === 1 ? "#b0b0b0" : i === 2 ? "#c88a4d" : "#bbb" }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </span>
                <span className="flex-1 text-[13px] font-semibold text-gray-700">{r.name}{r.self ? "（我）" : ""}</span>
                <span className="text-xs text-gray-500">{r.count} 场</span>
                <span className="text-sm font-bold" style={{ color: BRAND }}>{r.score} 分</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
