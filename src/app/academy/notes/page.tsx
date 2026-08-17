"use client";

import { useEffect, useState } from "react";
import { BrandHeader } from "@/components/shared";
import { PageLoginGuard } from "@/components/PageLoginGuard";
import { listNotes, addNote, deleteNote, type StudyNote } from "@/lib/academyStudyStore";

const BRAND = "#7B2FBE";
const TRACK_NAMES: Record<string, string> = { zhongyi: "中医", yixue: "易学", guoxue: "国学" };

export default function AcademyNotesPage() {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [track, setTrack] = useState("zhongyi");

  useEffect(() => { setNotes(listNotes()); }, []);

  const save = () => {
    if (!title.trim() || !content.trim()) return;
    addNote({ title: title.trim(), content: content.trim(), track, category: "" });
    setNotes(listNotes());
    setTitle(""); setContent(""); setAdding(false);
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <PageLoginGuard />
      <BrandHeader title="我的笔记" showBack backUrl="/academy/question-bank" />

      <div className="px-3 py-3 pb-24">
        <button
          onClick={() => setAdding(v => !v)}
          className="mb-3 w-full rounded-xl py-2.5 text-sm font-bold text-white"
          style={{ backgroundColor: BRAND }}
        >{adding ? "收起编辑" : "＋ 新增笔记"}</button>

        {adding && (
          <div className="mb-3 rounded-2xl bg-white p-3.5 shadow-sm">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="笔记标题（如：十二地支取象要点）"
              maxLength={40}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400"
            />
            <div className="mt-2 flex gap-1.5">
              {Object.entries(TRACK_NAMES).map(([k, name]) => (
                <button
                  key={k}
                  onClick={() => setTrack(k)}
                  className="rounded-full px-3 py-1 text-[11px] font-semibold"
                  style={{ backgroundColor: track === k ? BRAND : "#f0f0f0", color: track === k ? "#fff" : "#666" }}
                >{name}</button>
              ))}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="笔记内容"
              rows={4}
              className="mt-2 w-full rounded-lg border border-gray-200 p-2.5 text-xs leading-relaxed outline-none focus:border-purple-400"
            />
            <button
              onClick={save}
              disabled={!title.trim() || !content.trim()}
              className="mt-2 w-full rounded-lg py-2 text-sm font-bold text-white disabled:opacity-40"
              style={{ backgroundColor: BRAND }}
            >保存笔记</button>
          </div>
        )}

        {notes.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">暂无笔记</p>
            <p className="mt-1 text-xs text-gray-400">可在题库解析区点击「记笔记」自动收录，或在此手动新增</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notes.map((n) => (
              <div key={n.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: BRAND + "12", color: BRAND }}>
                    {TRACK_NAMES[n.track] || n.track || "通用"}
                  </span>
                  <span className="text-[13px] font-bold text-gray-800">{n.title}</span>
                  <button onClick={() => { deleteNote(n.id); setNotes(listNotes()); }} className="ml-auto text-[10px] text-gray-400 active:text-red-500">删除</button>
                </div>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-600">{n.content}</p>
                <p className="mt-1.5 text-[10px] text-gray-300">{new Date(n.createdAt).toLocaleString("zh-CN")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
