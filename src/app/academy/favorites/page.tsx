"use client";

import { useEffect, useState } from "react";
import { BrandHeader } from "@/components/shared";
import { PageLoginGuard } from "@/components/PageLoginGuard";
import { listFavorites, removeFavorite, type FavoriteQuestion } from "@/lib/academyStudyStore";

const BRAND = "#7B2FBE";
const TRACK_NAMES: Record<string, string> = { zhongyi: "中医", yixue: "易学", guoxue: "国学" };

export default function AcademyFavoritesPage() {
  const [favs, setFavs] = useState<FavoriteQuestion[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => { setFavs(listFavorites()); }, []);

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <PageLoginGuard />
      <BrandHeader title="我的收藏" showBack backUrl="/academy/question-bank" />

      <div className="px-3 py-3 pb-24">
        {favs.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">暂无收藏题目</p>
            <p className="mt-1 text-xs text-gray-400">在题库练习中点击题卡上的 ⭐ 即可收藏</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {favs.map((f) => {
              const open = openId === f.questionId;
              return (
                <div key={f.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  <div className="p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: BRAND + "12", color: BRAND }}>
                        {TRACK_NAMES[f.track] || f.track}
                      </span>
                      {f.category && <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{f.category}</span>}
                      <button
                        onClick={() => { removeFavorite(f.questionId); setFavs(listFavorites()); }}
                        className="ml-auto text-[11px] text-amber-500 active:text-red-500"
                        title="取消收藏"
                      >★ 取消收藏</button>
                    </div>
                    <p className="text-[13px] font-medium leading-relaxed text-gray-800">{f.stem}</p>
                  </div>
                  <button
                    onClick={() => setOpenId(open ? null : f.questionId)}
                    className="w-full border-t border-gray-100 py-2.5 text-[11px] font-medium"
                    style={{ color: BRAND, backgroundColor: "#fafafa" }}
                  >{open ? "收起答案" : "查看答案"}</button>
                  {open && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                      <p className="text-[11px] text-gray-500">参考答案：<span className="font-semibold" style={{ color: "#27ae60" }}>{f.answer}</span></p>
                      {f.analysis && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-2 text-[11px] leading-relaxed text-gray-600">{f.analysis}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
