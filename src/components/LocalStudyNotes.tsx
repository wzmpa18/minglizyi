"use client";

import { useEffect, useState } from "react";

/** A private, explicitly saved notebook for a single chart or lesson. */
export function LocalStudyNotes({ storageKey, placeholder = "记录四课三传结构、术语和典籍出处…" }: { storageKey: string; placeholder?: string }) {
  const [note, setNote] = useState("");
  const [review, setReview] = useState("");
  const [tab, setTab] = useState<"note" | "review">("note");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (typeof saved?.note === "string") setNote(saved.note);
      if (typeof saved?.review === "string") setReview(saved.review);
      setReady(true);
    } catch { setMessage("本机笔记未能读取，请检查设备存储。为保护旧内容，本次暂不覆盖保存。"); }
  }, [storageKey]);
  const save = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ note, review, updatedAt: Date.now() }));
      setMessage("已保存到本机。");
    } catch { setMessage("保存失败，文字仍在当前页面，请先复制保留。"); }
  };
  return <section aria-label="课例学习笔记">
    <div className="mb-3 flex gap-2">{(["note", "review"] as const).map(value => <button type="button" key={value} aria-pressed={tab === value}
      onClick={() => setTab(value)} className="rounded border px-3 py-2 text-sm" style={{ color: tab === value ? "white" : "#444", background: tab === value ? "#7B2FBE" : "white" }}>{value === "note" ? "学习笔记" : "复盘记录"}</button>)}</div>
    <textarea aria-label={tab === "note" ? "学习笔记内容" : "复盘记录内容"} value={tab === "note" ? note : review}
      onChange={event => { (tab === "note" ? setNote : setReview)(event.target.value); setMessage(""); }}
      placeholder={tab === "note" ? placeholder : "记录本课例的观察与复习结论…"}
      className="min-h-48 w-full rounded border border-gray-300 bg-white p-3 text-sm text-gray-800" />
    <div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-gray-500">仅存本机；离开前请保存，清理应用数据后可能丢失。</span>
      <button type="button" onClick={save} disabled={!ready} className="shrink-0 rounded bg-purple-700 px-4 py-2 text-sm text-white disabled:opacity-40">保存笔记</button></div>
    {message && <p role="status" className="mt-2 text-xs text-purple-800">{message}</p>}
  </section>;
}
