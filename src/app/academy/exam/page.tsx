"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";
import {
  startExam,
  submitExam,
  fetchMyExams,
  fetchTracks,
  TRACK_LIST,
  TYPE_NAMES,
  LEVEL_NAMES,
  type ExamPaper,
  type ExamResult,
  type TrackOverview,
} from "@/lib/academyApi";
import { PageLoginGuard } from "@/components/PageLoginGuard";

const BRAND = "#7B2FBE";

const DIFF_NAMES: Record<string, string> = { easy: "易", medium: "中", hard: "难" };

type MyExamRow = {
  id: string; track: string; trackName: string; level: number;
  score: number; passed: boolean; startedAt: string; submittedAt: string;
};

export default function AcademyExamPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"select" | "paper" | "result">("select");
  const [track, setTrack] = useState<string>("general");
  const [level, setLevel] = useState<number>(1);
  const [tracks, setTracks] = useState<TrackOverview[]>([]);
  const [history, setHistory] = useState<MyExamRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  const [paper, setPaper] = useState<ExamPaper | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [qIndex, setQIndex] = useState(0);
  const [remainSec, setRemainSec] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const submitLock = useRef(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const loadOverview = useCallback(async () => {
    try {
      const [t, h] = await Promise.all([fetchTracks(), fetchMyExams()]);
      if (t && t.success && t.tracks) setTracks(t.tracks);
      if (h && h.success && h.exams) setHistory(h.exams);
    } catch {}
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  // ---------- 答题倒计时 ----------
  useEffect(() => {
    if (mode !== "paper" || !paper) return;
    const endAt = new Date(paper.startedAt).getTime() + paper.minutes * 60 * 1000;
    const tick = () => {
      const left = Math.max(0, Math.floor((endAt - Date.now()) / 1000));
      setRemainSec(left);
      if (left <= 0 && !submitLock.current) {
        showToast("考试时间到，已自动交卷");
        void doSubmit(true);
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, paper]);

  const handleStart = async () => {
    setLoading(true);
    try {
      const r = await startExam(track, level);
      if (r && r.success && r.questions && r.questions.length > 0) {
        setPaper(r);
        setAnswers({});
        setQIndex(0);
        setResult(null);
        submitLock.current = false;
        setMode("paper");
      } else {
        showToast((r && r.error) || "题库建设中，暂无法组卷");
      }
    } catch {
      showToast("网络异常，请重试");
    } finally {
      setLoading(false);
    }
  };

  const doSubmit = async (auto = false) => {
    if (!paper || submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    try {
      const r = await submitExam(paper.examId, answers);
      if (r && r.success) {
        setResult(r);
        setMode("result");
        void loadOverview();
      } else {
        showToast((r && r.error) || "交卷失败");
        submitLock.current = false;
      }
    } catch {
      showToast("网络异常，交卷失败");
      submitLock.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  const choose = (qid: string, qtype: string, opt: string) => {
    setAnswers((prev) => {
      if (qtype === "multi") {
        const cur = (prev[qid] || "").split(",").filter(Boolean);
        const next = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt].sort();
        return { ...prev, [qid]: next.join(",") };
      }
      return { ...prev, [qid]: opt };
    });
  };

  const mm = String(Math.floor(remainSec / 60)).padStart(2, "0");
  const ss = String(remainSec % 60).padStart(2, "0");

  // ==================== 选择页 ====================
  if (mode === "select") {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        <PageLoginGuard />
        <BrandHeader title="等级考试" showBack backUrl="/academy" />

        <div className="px-3 py-3 pb-24">
          {/* 报考卡片 */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-gray-800">选择赛道</p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {TRACK_LIST.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTrack(t.key)}
                  className="rounded-xl border py-2.5 text-xs font-semibold transition-colors"
                  style={{
                    borderColor: track === t.key ? BRAND : "#eee",
                    backgroundColor: track === t.key ? BRAND + "0a" : "#fafafa",
                    color: track === t.key ? BRAND : "#666",
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>

            <p className="mt-4 text-sm font-bold text-gray-800">选择等级</p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {[1, 2, 3].map((lv) => (
                <button
                  key={lv}
                  onClick={() => setLevel(lv)}
                  className="rounded-xl border py-2.5 text-xs font-semibold transition-colors"
                  style={{
                    borderColor: level === lv ? BRAND : "#eee",
                    backgroundColor: level === lv ? BRAND + "0a" : "#fafafa",
                    color: level === lv ? BRAND : "#666",
                  }}
                >
                  {LEVEL_NAMES[lv]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-gray-400">
              初级 10 题 / 15 分钟 / 60 分及格；中级 15 题 / 25 分钟 / 70 分及格；高级 20 题 / 40 分钟 / 75 分及格。不限考试次数，通过自动颁发电子证书。
            </p>

            <button
              onClick={handleStart}
              disabled={loading}
              className="mt-4 w-full rounded-xl py-3 text-sm font-bold text-white active:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: BRAND }}
            >
              {loading ? "组卷中..." : "开始考试"}
            </button>
          </div>

          {/* 我的等级概览 */}
          {tracks.length > 0 && (
            <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-gray-800">我的等级</p>
              <div className="mt-2 space-y-2">
                {tracks.map((t) => (
                  <div key={t.key} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{t.name}</p>
                      <p className="mt-0.5 text-[10px] text-gray-400">题库 {t.questionCount} 题</p>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                      style={
                        t.myLevel > 0
                          ? { backgroundColor: "#27ae6018", color: "#27ae60" }
                          : { backgroundColor: "#f0f0f0", color: "#999" }
                      }
                    >
                      {t.myLevel > 0 ? t.myTitle : "未认证"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 考试历史 */}
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-gray-800">考试记录</p>
            {history.length === 0 ? (
              <p className="mt-3 text-center text-xs text-gray-400">暂无考试记录</p>
            ) : (
              <div className="mt-2 divide-y divide-gray-50">
                {history.slice(0, 20).map((h) => (
                  <div key={h.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700">
                        {h.trackName} · {LEVEL_NAMES[h.level] || `${h.level}级`}
                      </p>
                      <p className="mt-0.5 text-[10px] text-gray-400">{h.submittedAt || h.startedAt}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: h.passed ? "#27ae60" : "#e74c3c" }}>
                        {h.score ?? "--"}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={
                          h.passed
                            ? { backgroundColor: "#27ae6018", color: "#27ae60" }
                            : { backgroundColor: "#e74c3c15", color: "#e74c3c" }
                        }
                      >
                        {h.passed ? "通过" : "未过"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {toast && (
          <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-xs text-white shadow-lg" style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
            {toast}
          </div>
        )}
        <div className="page-bottom-nav-safe" aria-hidden="true" />
      </div>
    );
  }

  // ==================== 答题页 ====================
  if (mode === "paper" && paper) {
    const q = paper.questions[qIndex];
    const total = paper.questions.length;
    const answeredCount = paper.questions.filter((x) => (answers[x.id] || "").length > 0).length;
    const isObjective = q.type === "single" || q.type === "multi" || q.type === "judge";
    const urgent = remainSec <= 60;

    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        {/* 顶部考试栏 */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-800">
                {paper.trackName} · {LEVEL_NAMES[paper.level]}认证
              </p>
              <p className="mt-0.5 text-[10px] text-gray-400">
                已答 {answeredCount}/{total} · 每题 {q.score} 分 · 及格 {paper.passScore} 分
              </p>
            </div>
            <div
              className="flex items-center gap-1 rounded-xl px-3 py-1.5 font-mono text-sm font-bold"
              style={{ backgroundColor: urgent ? "#e74c3c15" : BRAND + "12", color: urgent ? "#e74c3c" : BRAND }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {mm}:{ss}
            </div>
          </div>
          {/* 进度点 */}
          <div className="mt-2 flex gap-1 overflow-x-auto">
            {paper.questions.map((x, i) => {
              const done = (answers[x.id] || "").length > 0;
              return (
                <button
                  key={x.id}
                  onClick={() => setQIndex(i)}
                  className="h-6 w-6 shrink-0 rounded-md text-[10px] font-bold transition-colors"
                  style={{
                    backgroundColor: i === qIndex ? BRAND : done ? BRAND + "20" : "#f0f0f0",
                    color: i === qIndex ? "#fff" : done ? BRAND : "#bbb",
                    border: i === qIndex ? "2px solid " + BRAND : "none",
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* 题目 */}
        <div className="px-3 py-3 pb-28">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: BRAND + "12", color: BRAND }}>
                {TYPE_NAMES[q.type] || q.type}
              </span>
              <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                {DIFF_NAMES[q.difficulty] || q.difficulty}
              </span>
              <span className="ml-auto text-[10px] text-gray-300">
                第 {qIndex + 1}/{total} 题
              </span>
            </div>
            <p className="text-[13px] font-medium leading-relaxed text-gray-800">{q.stem}</p>

            {isObjective && q.options.length > 0 && (
              <div className="mt-3 space-y-2">
                {q.options.map((opt, i) => {
                  const key = String.fromCharCode(65 + i);
                  const sel =
                    q.type === "multi"
                      ? (answers[q.id] || "").split(",").filter(Boolean).includes(key)
                      : answers[q.id] === key;
                  return (
                    <button
                      key={key}
                      onClick={() => choose(q.id, q.type, key)}
                      className="flex w-full items-start gap-2 rounded-xl border p-2.5 text-left transition-transform active:scale-[0.99]"
                      style={{ borderColor: sel ? BRAND : "#eee", backgroundColor: sel ? BRAND + "0a" : "#fafafa" }}
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                        style={{ backgroundColor: sel ? BRAND : "#e5e5e5", color: sel ? "#fff" : "#999" }}
                      >
                        {key}
                      </span>
                      <span className="text-xs leading-relaxed text-gray-700">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {(q.type === "fill" || q.type === "qa" || q.type === "case") && (
              <textarea
                value={answers[q.id] || ""}
                onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                placeholder={q.type === "fill" ? "填写答案" : "写出你的解答"}
                className="mt-3 w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-700 outline-none focus:border-purple-400"
                rows={q.type === "fill" ? 1 : 4}
              />
            )}
          </div>

          {/* 上下题切换 */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setQIndex(Math.max(0, qIndex - 1))}
              disabled={qIndex === 0}
              className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-xs font-semibold text-gray-600 active:bg-gray-50 disabled:opacity-40"
            >
              上一题
            </button>
            {qIndex < total - 1 ? (
              <button
                onClick={() => setQIndex(qIndex + 1)}
                className="flex-[2] rounded-xl py-3 text-xs font-bold text-white active:opacity-90"
                style={{ backgroundColor: BRAND }}
              >
                下一题
              </button>
            ) : (
              <button
                onClick={() => void doSubmit(false)}
                disabled={submitting}
                className="flex-[2] rounded-xl py-3 text-xs font-bold text-white active:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#27ae60" }}
              >
                {submitting ? "判分中..." : "交卷"}
              </button>
            )}
          </div>
        </div>

        {toast && (
          <div className="fixed left-1/2 top-24 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-xs text-white shadow-lg" style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
            {toast}
          </div>
        )}
        <div className="page-bottom-nav-safe" aria-hidden="true" />
      </div>
    );
  }

  // ==================== 结果页 ====================
  if (mode === "result" && result) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        <BrandHeader title="考试结果" showBack backUrl="/academy" />

        <div className="px-3 py-4 pb-24">
          {/* 成分卡 */}
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <div
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: result.passed ? "#27ae6015" : "#e74c3c12" }}
            >
              <span className="text-3xl">{result.passed ? "🎉" : "💪"}</span>
            </div>
            <p className="mt-3 text-4xl font-black" style={{ color: result.passed ? "#27ae60" : "#e74c3c" }}>
              {result.score}
              <span className="text-base font-medium text-gray-400"> / {result.totalScore}</span>
            </p>
            <p className="mt-1 text-xs text-gray-500">
              及格线 {result.passScore} 分 · {result.passed ? "恭喜通过认证" : "再接再厉，可随时补考"}
            </p>

            {result.certificate && (
              <div className="mt-4 rounded-xl border border-dashed p-3" style={{ borderColor: BRAND + "55", backgroundColor: BRAND + "08" }}>
                <p className="text-xs font-bold" style={{ color: BRAND }}>
                  🏅 已颁发电子证书
                </p>
                <p className="mt-1 text-[11px] text-gray-600">
                  {result.certificate.title} · 编号 {result.certificate.certNo}
                </p>
                {result.certificate.expireAt && (
                  <p className="mt-0.5 text-[10px] text-orange-500">有效期至 {result.certificate.expireAt}（2 年复核制）</p>
                )}
                <button
                  onClick={() => router.push("/academy/certificates")}
                  className="mt-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white"
                  style={{ backgroundColor: BRAND }}
                >
                  查看我的证书
                </button>
              </div>
            )}
          </div>

          {/* 错题解析 */}
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-gray-800">逐题解析</p>
            <div className="mt-2 space-y-3">
              {result.detail.map((d, i) => (
                <div
                  key={d.questionId}
                  className="rounded-xl border p-3"
                  style={{ borderColor: d.full ? "#27ae6033" : "#e74c3c33", backgroundColor: d.full ? "#27ae6008" : "#e74c3c06" }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm">{d.full ? "✅" : "❌"}</span>
                    <p className="flex-1 text-[12px] font-medium leading-relaxed text-gray-800">
                      {i + 1}. {d.stem}
                    </p>
                    <span className="shrink-0 text-[10px] font-bold" style={{ color: d.full ? "#27ae60" : "#e74c3c" }}>
                      {d.score}分
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-gray-500">
                    我的作答：<span className="font-medium">{d.myAnswer || "（未作答）"}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    正确答案：<span className="font-semibold" style={{ color: "#27ae60" }}>{d.correctAnswer}</span>
                  </p>
                  {d.analysis && (
                    <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-gray-50 p-2 text-[11px] leading-relaxed text-gray-600">
                      {d.analysis}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => { setResult(null); setMode("select"); }}
              className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-xs font-semibold text-gray-600 active:bg-gray-50"
            >
              再考一次
            </button>
            <button
              onClick={() => router.push("/academy/wrong-book")}
              className="flex-1 rounded-xl py-3 text-xs font-bold text-white active:opacity-90"
              style={{ backgroundColor: BRAND }}
            >
              查看错题本
            </button>
          </div>
        </div>
        <div className="page-bottom-nav-safe" aria-hidden="true" />
      </div>
    );
  }

  return null;
}
