"use client";

import { useEffect, useState } from "react";
import { BrandHeader } from "@/components/shared";
import { PageLoginGuard } from "@/components/PageLoginGuard";
import { listComments, deleteComment, type StudyComment } from "@/lib/academyStudyStore";

// P6-补04：我的评论（题库快捷五入口之一）
// 展示本人在题目解析区写下的评论，支持删除；与笔记/收藏同级的个人学习数据
const BRAND = "#7B2FBE";
const TRACK_NAMES: Record<string, string> = { zhongyi: "中医", yixue: "易学", guoxue: "国学", yikao: "医考" };

export default function AcademyMyCommentsPage() {
  const [comments, setComments] = useState<StudyComment[]>([]);

  useEffect(() => { setComments(listComments()); }, []);

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <PageLoginGuard />
      <BrandHeader title="我的评论" showBack backUrl="/academy/yikao" />

      <div className="px-3 py-3 pb-24">
        {comments.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">暂无评论</p>
            <p className="mt-1 text-xs text-gray-400">刷题时可在解析区点击「评论」记录你的见解与疑问</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {comments.map((c) => (
              <div key={c.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: BRAND + "12", color: BRAND }}>
                    {TRACK_NAMES[c.track] || c.track || "通用"}
                  </span>
                  <span className="truncate text-[13px] font-bold text-gray-800">{c.stem}</span>
                  <button onClick={() => { deleteComment(c.id); setComments(listComments()); }} className="ml-auto shrink-0 text-[10px] text-gray-400 active:text-red-500">删除</button>
                </div>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-600">{c.content}</p>
                <p className="mt-1.5 text-[10px] text-gray-300">{new Date(c.createdAt).toLocaleString("zh-CN")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
