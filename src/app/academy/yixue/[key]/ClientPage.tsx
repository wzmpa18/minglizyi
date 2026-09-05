"use client";

// IOS-4.3B-RECOVERY §四：易学学科页统一结构
// 课程简介 / 章节目录 / 知识点 / 术语解释 / 章节练习 / 答案解析 / 学习笔记 / 收藏 / 学习进度
// 禁止出现"立即排盘"等预测入口
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import { PageLoginGuard } from "@/components/PageLoginGuard";
import { getSubject, YIXUE_SUBJECTS } from "@/lib/yixueSubjects";
import {
  fetchKnowledge,
  fetchQuestions,
  fetchProgress,
  checkinProgress,
  fetchWrongAnswers,
  type KnowledgeVo,
  type QuestionVo,
} from "@/lib/academyApi";
import { listNotes, addNote, deleteNote, isFavorited, toggleFavorite, type StudyNote } from "@/lib/academyStudyStore";

const BRAND = "#7B2FBE";
const NATURE_TAGS = ["课程", "知识", "资料", "练习"];

type Tab = "points" | "quiz" | "notes";

export default function YixueSubjectPage() {
  const params = useParams();
  const key = String(params?.key || "");
  const subject = getSubject(key) || YIXUE_SUBJECTS[0];

  const [tab, setTab] = useState<Tab>("points");
  const [points, setPoints] = useState<KnowledgeVo[]>([]);
  const [questions, setQuestions] = useState<QuestionVo[]>([]);
  const [wrongs, setWrongs] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const kpReqs = subject.categories.map((c) => fetchKnowledge({ track: "yixue", category: c, limit: 1000 }));
      const qReqs = subject.categories.map((c) => fetchQuestions({ track: "yixue", category: c, limit: 1000 }));
      const [p, w, ...rest] = await Promise.all([
        fetchProgress("yixue"),
        fetchWrongAnswers(),
        ...kpReqs,
        ...qReqs,
      ]);
      const kpResps = rest.slice(0, subject.categories.length);
      const qResps = rest.slice(subject.categories.length);
      const allPoints: KnowledgeVo[] = [];
      kpResps.forEach((r) => { if (r && r.success && r.points) allPoints.push(...r.points); });
      allPoints.sort((a, b) => (a.chapter || "").localeCompare(b.chapter || "", "zh") || String(a.id).localeCompare(String(b.id)));
      setPoints(allPoints);
      const allQuestions: QuestionVo[] = [];
      qResps.forEach((r) => { if (r && r.success && r.questions) allQuestions.push(...r.questions); });
      allQuestions.sort((a, b) => String(a.id).localeCompare(String(b.id)));
      setQuestions(allQuestions);
      if (w && w.success && w.wrongs) {
        setWrongs(new Set(w.wrongs.map((x) => String(x.questionId))));
      }
      if (p && p.success && p.progress) {
        setChecked(new Set(p.progress.map((x) => `${x.track}:${x.chapter}`)));
      }
      setNotes(listNotes().filter((n) => subject.categories.includes(n.category) || n.category === subject.name));
    } catch {} finally {
      setLoading(false);
    }
  }, [subject]);

  useEffect(() => { void load(); }, [load]);

  // 章节分组
  const chapters = useMemo(() => {
    const map = new Map<string, KnowledgeVo[]>();
    points.forEach((p) => {
      const c = p.chapter || "基础知识";
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(p);
    });
    return Array.from(map.entries());
  }, [points]);

  const checkedCount = useMemo(
    () => points.filter((p) => checked.has(`yixue:${p.chapter || p.title}`)).length,
    [points, checked]
  );

  const handleCheckin = async (p: KnowledgeVo) => {
    const k = `yixue:${p.chapter || p.title}`;
    if (checked.has(k)) return;
    try {
      const r = await checkinProgress("yixue", p.chapter || p.title);
      if (r && r.success) {
        setChecked((prev) => new Set(prev).add(k));
        showToast("学习打卡成功 +1");
      }
    } catch {}
  };

  const saveNote = () => {
    if (!noteDraft.trim()) return;
    addNote({ title: `${subject.name}学习笔记`, content: noteDraft.trim(), track: "yixue", category: subject.categories[0] });
    setNotes(listNotes().filter((n) => subject.categories.includes(n.category) || n.category === subject.name));
    setNoteDraft("");
    showToast("笔记已保存");
  };

  const isObjective = (q: QuestionVo) => ["single", "multi", "judge"].includes(q.type);

  return (
    <div className="mx-auto w-full" style={{ maxWidth: "420px", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <PageLoginGuard />
      <BrandHeader title={subject.name} showBack backUrl="/academy/yixue" />

      <div className="px-3 pb-28 pt-3">
        {/* 课程简介 */}
        <div className="mb-3 rounded-2xl bg-white p-3.5 shadow-sm">
          <div className="mb-1.5 flex items-center gap-1.5">
            {NATURE_TAGS.map((t) => (
              <span key={t} className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: BRAND }}>{t}</span>
            ))}
          </div>
          <p className="text-[13px] leading-relaxed text-gray-700">{subject.intro}</p>
          <div className="mt-2.5 rounded-lg bg-[#f7f2fb] p-2.5">
            <p className="mb-1 text-[11px] font-bold text-gray-600">课程结构</p>
            {subject.structure.map((s) => (
              <p key={s} className="text-[11px] leading-relaxed text-gray-500">· {s}</p>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
            <span>知识点 {points.length} 条 · 练习题 {questions.length} 道</span>
            <span>已打卡 {checkedCount}/{points.length}</span>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="mb-3 flex gap-1.5">
          {([["points", `知识点 ${points.length}`], ["quiz", `章节练习 ${questions.length}`], ["notes", `学习笔记 ${notes.length}`]] as Array<[Tab, string]>).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 rounded-xl py-2 text-xs font-bold transition-colors"
              style={{ backgroundColor: tab === t ? BRAND : "#fff", color: tab === t ? "#fff" : "#666" }}
            >{label}</button>
          ))}
        </div>

        {loading && <p className="py-8 text-center text-sm text-gray-400">加载中…</p>}

        {/* 知识点（章节目录 + 术语解释 + 打卡） */}
        {!loading && tab === "points" && (
          chapters.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">知识点整理中，敬请期待</p>
          ) : (
            <div className="space-y-2">
              {chapters.map(([chapter, kps]) => (
                <div key={chapter} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  <button
                    onClick={() => setOpenId(openId === chapter ? null : chapter)}
                    className="flex w-full items-center justify-between px-3.5 py-3"
                  >
                    <span className="text-sm font-bold text-gray-800">{chapter}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">{kps.length} 条</span>
                      <span className="text-xs text-gray-400">{openId === chapter ? "▲" : "▼"}</span>
                    </span>
                  </button>
                  {openId === chapter && (
                    <div className="border-t border-gray-100 px-3.5 py-2">
                      {kps.map((p) => (
                        <div key={p.id} className="border-b border-gray-50 py-2.5 last:border-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] font-semibold text-gray-800">{p.title}</p>
                            <button
                              onClick={() => handleCheckin(p)}
                              className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                              style={{
                                backgroundColor: checked.has(`yixue:${p.chapter || p.title}`) ? "#e8f5e9" : "#f0f0f0",
                                color: checked.has(`yixue:${p.chapter || p.title}`) ? "#27ae60" : "#999",
                              }}
                            >{checked.has(`yixue:${p.chapter || p.title}`) ? "✓ 已学" : "打卡"}</button>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-gray-600">{p.content}</p>
                          {(p.tags || []).length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {p.tags.slice(0, 6).map((tg) => (
                                <span key={tg} className="rounded bg-[#f7f2fb] px-1.5 py-0.5 text-[9px] text-gray-500">#{tg}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* 章节练习（作答 + 答案解析 + 收藏 + 错题标记） */}
        {!loading && tab === "quiz" && (
          questions.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">练习题生成中，敬请期待</p>
          ) : (
            <div className="space-y-2.5">
              {questions.map((q) => {
                const open = revealed.has(String(q.id));
                const isWrong = wrongs.has(String(q.id));
                return (
                  <div key={q.id} className="rounded-2xl bg-white p-3.5 shadow-sm">
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span className="rounded bg-[#f7f2fb] px-1.5 py-0.5 text-[9px] text-gray-500">{q.category}</span>
                      {isWrong && <span className="rounded bg-[#fdecea] px-1.5 py-0.5 text-[9px] font-semibold" style={{ color: "#c0392b" }}>错题</span>}
                    </div>
                    <p className="text-[13px] font-semibold leading-relaxed text-gray-800">{q.stem}</p>

                    {isObjective(q) && (q.options || []).length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {q.options.map((opt, i) => {
                          const val = ["A", "B", "C", "D", "E", "F"][i] || String(i);
                          const picked = answers[String(q.id)] === val;
                          const isAns = open && (q.answer || "").includes(val);
                          return (
                            <button
                              key={i}
                              onClick={() => !open && setAnswers((prev) => ({ ...prev, [String(q.id)]: val }))}
                              className="flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-[12px] leading-relaxed"
                              style={{
                                borderColor: isAns ? "#27ae60" : picked ? BRAND : "#eee",
                                backgroundColor: isAns ? "#e8f5e9" : picked ? "#f7f2fb" : "#fff",
                                color: "#444",
                              }}
                            >
                              <span className="font-bold" style={{ color: isAns ? "#27ae60" : picked ? BRAND : "#999" }}>{val}</span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        onClick={() => setRevealed((prev) => new Set(prev).add(String(q.id)))}
                        className="rounded-full px-3.5 py-1.5 text-[11px] font-bold text-white"
                        style={{ backgroundColor: BRAND }}
                      >查看答案解析</button>
                      <button
                        onClick={() => {
                          const fav = toggleFavorite({ questionId: String(q.id), stem: q.stem, track: "yixue", category: q.category, answer: q.answer || "", analysis: q.analysis || "" });
                          showToast(fav ? "已收藏" : "已取消收藏");
                        }}
                        className="rounded-full px-3.5 py-1.5 text-[11px] font-bold"
                        style={{ backgroundColor: isFavorited(String(q.id)) ? "#fff7e6" : "#f0f0f0", color: isFavorited(String(q.id)) ? "#e67e22" : "#999" }}
                      >{isFavorited(String(q.id)) ? "★ 已收藏" : "☆ 收藏"}</button>
                    </div>

                    {open && (
                      <div className="mt-2 rounded-xl bg-[#f9f9f9] p-2.5">
                        <p className="text-[11px]">
                          参考答案：<span className="font-bold" style={{ color: "#27ae60" }}>{q.answer || "—"}</span>
                        </p>
                        {q.analysis && <p className="mt-1 text-[11px] leading-relaxed text-gray-500">解析：{q.analysis}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* 学习笔记 */}
        {!loading && tab === "notes" && (
          <div>
            <div className="mb-3 rounded-2xl bg-white p-3 shadow-sm">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder={`记录${subject.name}的学习要点…`}
                maxLength={500}
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-[12px] leading-relaxed outline-none focus:border-purple-400"
                rows={3}
              />
              <button
                onClick={saveNote}
                className="mt-2 w-full rounded-xl py-2 text-xs font-bold text-white"
                style={{ backgroundColor: BRAND }}
              >保存笔记</button>
            </div>
            {notes.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">还没有笔记，学完随手记一笔吧</p>
            ) : (
              <div className="space-y-2">
                {notes.map((n) => (
                  <div key={n.id} className="rounded-2xl bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between">
                      <p className="text-[13px] font-semibold text-gray-800">{n.title}</p>
                      <button
                        onClick={() => { deleteNote(n.id); setNotes(listNotes().filter((x) => subject.categories.includes(x.category) || x.category === subject.name)); }}
                        className="text-[10px] text-gray-400"
                      >删除</button>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-gray-600">{n.content}</p>
                    <p className="mt-1 text-[10px] text-gray-300">{new Date(n.createdAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed left-1/2 top-20 z-[9999] -translate-x-1/2 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-lg" style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
