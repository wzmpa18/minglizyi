"use client";

// ============================================================================
// 医考题库专区 - P6-补04
// 100% 复用唯一题库引擎（track='yikao'）+ 知识工厂 + 统一 Paywall + LOC 配置
// 页面结构对标行业成熟医考产品（顶部考试切换/题库文库双Tab/快捷五入口/
// 精选题库2×2印章卡片/三练习模式/章节树手风琴+掌握度进度条/实践技能三站带锁/文库）
// 红线：前端任何位置不展示具体题目数量；覆盖文案由后台覆盖度引擎触发
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageLoginGuard } from "@/components/PageLoginGuard";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import {
  fetchQuestions,
  fetchCoverage,
  fetchKnowledge,
  TYPE_NAMES,
  type QuestionVo,
  type CoverageVo,
  type KnowledgeVo,
} from "@/lib/academyApi";
import { getToolConfig, type YikaoCardDef, type YikaoSubjectDef, type YikaoStationDef } from "@/lib/toolConfigStore";
import { getMembershipStatus } from "@/lib/membershipStore";
import { payForUnlock, pollPaymentStatus } from "@/lib/paymentService";
import { isSingleUnlocked, activateSingleUnlock } from "@/lib/aiService";
import { recordAnswer, getMastery, isAnswerCorrect } from "@/lib/yikaoStudyStore";
import { addNote, toggleFavorite, isFavorited, addComment } from "@/lib/academyStudyStore";

// 医考专区独立视觉体系（对标行业医考产品：青绿主色 + 朱红印章 + 米色纸感）
const GREEN = "#2FAE9E";
const GREEN_DARK = "#1F8A7D";
const SEAL_RED = "#C05046";
const CREAM = "#FAF6ED";
const INK = "#333333";

const DIFF_NAMES: Record<string, string> = { easy: "易", medium: "中", hard: "难" };

// 文库学科 Tab 别名（短标签 → 科目名包含的关键词）
const LIB_TAB_ALIASES: Record<string, string[]> = {
  中诊: ["中医诊断"],
  中基: ["中医基础"],
  中内: ["中医内科"],
};

const EXAM_KEY = "yandao_yikao_exam";
const UNLOCK_KEY = "yandao_yikao_unlocked";

function getUnlocked(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(UNLOCK_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}
function setUnlocked(target: string) {
  const list = getUnlocked();
  if (!list.includes(target)) {
    list.push(target);
    localStorage.setItem(UNLOCK_KEY, JSON.stringify(list));
  }
}

export default function YikaoPage() {
  const router = useRouter();
  const cfg = getToolConfig().yikao;
  const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();

  // ===== 顶部导航状态 =====
  const [topTab, setTopTab] = useState<"bank" | "lib">("bank");
  const [examId, setExamId] = useState<string>("");
  const [showExamPicker, setShowExamPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // ===== 练习状态 =====
  const [practiceMode, setPracticeMode] = useState<"order" | "random" | "skill">("order");
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({});
  const [activeSubject, setActiveSubject] = useState<YikaoSubjectDef | null>(null); // 进入科目答题视图
  const [activeCard, setActiveCard] = useState<YikaoCardDef | null>(null); // 精选卡片专项题集视图
  const [station, setStation] = useState<YikaoStationDef | null>(null); // 实践技能站答题视图

  // ===== 题目数据 =====
  const [questions, setQuestions] = useState<QuestionVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [graded, setGraded] = useState<Record<string, boolean>>({});

  // ===== 评论输入（解析区内联） =====
  const [commentOpenId, setCommentOpenId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentDone, setCommentDone] = useState<Record<string, boolean>>({});

  // ===== 覆盖度（后台引擎真实计算） =====
  const [coverages, setCoverages] = useState<Record<string, CoverageVo | null>>({});
  const [masteryTick, setMasteryTick] = useState(0);
  void masteryTick;

  // ===== 解锁面板 =====
  const [unlockTarget, setUnlockTarget] = useState<{ title: string; target: string; price: number; memberFree: boolean } | null>(null);
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState("");

  // ===== 文库 =====
  const [libTab, setLibTab] = useState("");
  const [libPoints, setLibPoints] = useState<KnowledgeVo[]>([]);
  const [libLoading, setLibLoading] = useState(false);

  // 弹窗规范：背景滚动锁 + 返回键优先关闭
  useBodyScrollLock(showExamPicker || showSettings || !!unlockTarget);
  usePopupBackHandler(() => {
    if (unlockTarget) setUnlockTarget(null);
    else if (showExamPicker) setShowExamPicker(false);
    else if (showSettings) setShowSettings(false);
  }, showExamPicker || showSettings || !!unlockTarget);

  const exams = cfg.exams.filter((e) => e.enabled);
  const currentExam = exams.find((e) => e.id === examId) || exams[0];
  const examSubjects = useMemo(
    () =>
      (currentExam?.subjectIds || [])
        .map((sid) => cfg.subjects.find((s) => s.id === sid))
        .filter((s): s is YikaoSubjectDef => !!s && s.enabled),
    [currentExam, cfg.subjects]
  );
  const stations = cfg.stations.filter((s) => s.enabled);
  const cards = cfg.cards.filter((c) => c.enabled);
  // 分类标签键 = 科目/站名（track='yikao' 独立命名空间；科目池跨考试类别共享复用）
  const catKey = useCallback((name: string) => name, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(EXAM_KEY) || "";
    setExamId(exams.some((e) => e.id === saved) ? saved : exams[0]?.id || "");
    if (cfg.libTabs.length > 0) setLibTab(cfg.libTabs[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 覆盖度：逐科目查询（后台引擎真实计算，触发前端文案）
  useEffect(() => {
    if (topTab !== "bank" || !currentExam) return;
    examSubjects.forEach((s) => {
      const key = catKey(s.name);
      if (coverages[key] !== undefined) return;
      fetchCoverage("yikao", key)
        .then((r) => setCoverages((prev) => ({ ...prev, [key]: r && r.success && r.coverage ? r.coverage : null })))
        .catch(() => setCoverages((prev) => ({ ...prev, [key]: null })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExam?.id, examSubjects.length, topTab]);

  // ===== 题目加载（科目练习 / 卡片专项 / 技能站 共用） =====
  const loadQuestions = useCallback(async (category?: string) => {
    setLoading(true);
    try {
      const r = await fetchQuestions({ status: "approved", track: "yikao", ...(category ? { category } : {}) });
      setQuestions(r && r.success && r.questions ? r.questions : []);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSubject) void loadQuestions(catKey(activeSubject.name));
    else if (activeCard) void loadQuestions();
    else if (station) void loadQuestions(catKey(station.name));
    else return;
    setPicked({});
    setGraded({});
    setOpenId(null);
  }, [activeSubject, activeCard, station, loadQuestions, catKey]);

  // 乱序练习：洗牌一次
  const displayQuestions = useMemo(() => {
    if (practiceMode !== "random" && !activeCard) return questions;
    if (activeSubject && practiceMode !== "random") return questions;
    const arr = [...questions];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [questions, practiceMode, activeCard, activeSubject]);

  // ===== 文库加载 =====
  useEffect(() => {
    if (topTab !== "lib" || !libTab) return;
    setLibLoading(true);
    fetchKnowledge({ track: "yikao" })
      .then((r) => {
        const pts = r && r.success && r.points ? r.points : [];
        const keys = [libTab, ...(LIB_TAB_ALIASES[libTab] || [])];
        setLibPoints(pts.filter((p) => keys.some((k) => p.category.includes(k) || (p.tags || []).some((t) => t.includes(k)))));
      })
      .catch(() => setLibPoints([]))
      .finally(() => setLibLoading(false));
  }, [topTab, libTab]);

  // ===== 解锁判定（会员抵扣 / 永久已购 / 免费直入） =====
  const isMember = () => getMembershipStatus().isActive;
  const checkAccess = (c: { target: string; price: number; memberFree: boolean }): boolean => {
    if (c.price <= 0) return true;
    if (c.memberFree && isMember()) return true;
    if (getUnlocked().includes(c.target) || isSingleUnlocked(c.target)) return true;
    return false;
  };

  const handleCardClick = (c: YikaoCardDef) => {
    if (!requireLogin()) return;
    if (!checkAccess(c)) {
      setUnlockTarget({ title: c.title, target: c.target, price: c.price, memberFree: c.memberFree });
      return;
    }
    setActiveCard(c);
  };

  const handleStationClick = (s: YikaoStationDef) => {
    if (!requireLogin()) return;
    const freeCard = { target: `yikao_station_${s.id}`, price: s.paid ? cfg.aiWrongAnalysisPrice : 0, memberFree: true };
    if (!checkAccess(freeCard)) {
      setUnlockTarget({ title: s.name, target: freeCard.target, price: freeCard.price, memberFree: true });
      return;
    }
    setStation(s);
  };

  const handlePay = async () => {
    if (!unlockTarget || paying) return;
    setPaying(true);
    setPayMsg("");
    try {
      const r = await payForUnlock(unlockTarget.target, unlockTarget.price);
      if (!r || !r.success || !r.orderId) {
        setPayMsg(r && r.message ? r.message : "支付发起失败，请稍后重试");
        return;
      }
      const status = await pollPaymentStatus(r.orderId);
      if (status && status.status === "PAID") {
        setUnlocked(unlockTarget.target);
        activateSingleUnlock(unlockTarget.target);
        setPayMsg("支付成功，权限已生效");
        setTimeout(() => setUnlockTarget(null), 900);
      } else {
        setPayMsg("支付确认中，完成后权限自动生效；如已支付请稍后重进");
        setUnlocked(unlockTarget.target);
        activateSingleUnlock(unlockTarget.target);
      }
    } catch {
      setPayMsg("支付异常，请稍后重试");
    } finally {
      setPaying(false);
    }
  };

  // ===== 答题交互（判分与错题收录走唯一题库引擎；掌握度本地进度） =====
  const choose = (q: QuestionVo, opt: string) => {
    if (graded[q.id]) return;
    if (q.type === "multi") {
      const cur = (picked[q.id] || "").split(",").filter(Boolean);
      const next = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt].sort();
      setPicked((p) => ({ ...p, [q.id]: next.join(",") }));
    } else {
      setPicked((p) => ({ ...p, [q.id]: opt }));
    }
  };

  const grade = (q: QuestionVo) => {
    const key = activeSubject ? catKey(activeSubject.name) : station ? catKey(station.name) : activeCard?.target || "";
    const ok = isAnswerCorrect(q.type, picked[q.id] || "", q.answer || "");
    setGraded((g) => ({ ...g, [q.id]: true }));
    if (key) {
      recordAnswer(key, ok);
      setMasteryTick((t) => t + 1);
    }
  };

  // ==================== 渲染：答题视图（科目练习/卡片专项/技能站共用） ====================
  const renderPractice = (title: string, sub: string) => (
    <div className="px-3 py-3 pb-28">
      <div className="mb-2.5 flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
        <div>
          <p className="text-sm font-bold" style={{ color: INK }}>{title}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>
        </div>
        <button
          onClick={() => { setActiveSubject(null); setActiveCard(null); setStation(null); }}
          className="rounded-full px-3 py-1.5 text-[11px] font-bold"
          style={{ backgroundColor: GREEN + "14", color: GREEN_DARK }}
        >返回列表</button>
      </div>
      {loading ? (
        <div className="rounded-2xl bg-white p-6 text-center text-xs text-gray-400 shadow-sm">加载中...</div>
      ) : displayQuestions.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-500">核心知识点持续完善中</p>
          <p className="mt-1.5 text-xs text-gray-400">题目由知识工厂基于考纲知识点生成，经人工审核后陆续开放</p>
        </div>
      ) : (
        <>
          <p className="mb-2 px-1 text-[11px] text-gray-400">点击选项作答后核对答案 · 自动收录错题至错题本</p>
          <div className="space-y-2.5">
            {displayQuestions.map((q, idx) => {
              const open = openId === q.id;
              const my = picked[q.id] || "";
              const isDone = graded[q.id];
              const isObjective = q.type === "single" || q.type === "multi" || q.type === "judge";
              return (
                <div key={q.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  <div className="p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: GREEN + "14", color: GREEN_DARK }}>
                        {TYPE_NAMES[q.type] || q.type}
                      </span>
                      <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{DIFF_NAMES[q.difficulty] || q.difficulty}</span>
                      <span className="ml-auto text-[10px] text-gray-300">#{idx + 1}</span>
                      <button
                        onClick={() => toggleFavorite({ questionId: q.id, stem: q.stem, track: "yikao", category: q.category || "", answer: q.answer || "", analysis: q.analysis || "" })}
                        className="text-[13px] leading-none"
                        style={{ color: isFavorited(q.id) ? "#f5a623" : "#ccc" }}
                        title="收藏"
                      >★</button>
                    </div>
                    <p className="text-[13px] font-medium leading-relaxed text-gray-800">{q.stem}</p>

                    {isObjective && q.options.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {q.options.map((opt, i) => {
                          const key = String.fromCharCode(65 + i);
                          const sel = q.type === "multi" ? (my.split(",").includes(key)) : my === key;
                          let optColor = "#eee";
                          let optBg = "#fafafa";
                          if (isDone && open) {
                            const refKeys = (q.answer || "").split(",").filter(Boolean).sort();
                            if (refKeys.includes(key)) { optColor = "#10b981"; optBg = "#ecfdf5"; }
                            else if (sel) { optColor = "#ef4444"; optBg = "#fef2f2"; }
                          } else if (sel) { optColor = GREEN; optBg = GREEN + "0d"; }
                          return (
                            <button
                              key={key}
                              onClick={() => choose(q, key)}
                              className="flex w-full items-start gap-2 rounded-xl border p-2.5 text-left transition-transform active:scale-[0.99]"
                              style={{ borderColor: optColor, backgroundColor: optBg }}
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                                style={{ backgroundColor: sel ? GREEN : "#e5e5e5", color: sel ? "#fff" : "#999" }}>{key}</span>
                              <span className="text-xs leading-relaxed text-gray-700">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {(q.type === "fill" || q.type === "qa" || q.type === "case") && (
                      <textarea
                        value={my}
                        onChange={(e) => setPicked((p) => ({ ...p, [q.id]: e.target.value }))}
                        placeholder={q.type === "fill" ? "填写答案" : "写出你的解答思路"}
                        className="mt-3 w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-700 outline-none"
                        style={{ borderColor: GREEN + "55" }}
                        rows={q.type === "fill" ? 1 : 3}
                      />
                    )}
                  </div>

                  {!isDone ? (
                    <button
                      onClick={() => { grade(q); setOpenId(q.id); }}
                      disabled={!my}
                      className="w-full border-t border-gray-100 py-2.5 text-[11px] font-medium disabled:opacity-40"
                      style={{ color: GREEN_DARK, backgroundColor: "#fafafa" }}
                    >{my ? "提交并核对答案" : "请先作答"}</button>
                  ) : (
                    <button
                      onClick={() => setOpenId(open ? null : q.id)}
                      className="w-full border-t border-gray-100 py-2.5 text-[11px] font-medium"
                      style={{ color: GREEN_DARK, backgroundColor: "#fafafa" }}
                    >{open ? "收起解析" : "查看答案与解析"}</button>
                  )}

                  {isDone && open && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                      {my && <p className="mb-1.5 text-[11px] text-gray-500">我的作答：<span className="font-medium text-gray-700">{my || "（未作答）"}</span></p>}
                      <p className="text-[11px] text-gray-500">参考答案：<span className="font-semibold" style={{ color: "#27ae60" }}>{q.answer}</span></p>
                      {q.analysis && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-2 text-[11px] leading-relaxed text-gray-600">{q.analysis}</p>}
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => addNote({ title: q.stem.slice(0, 30), content: `题干：${q.stem}\n参考答案：${q.answer}\n解析：${q.analysis || "（无）"}`, track: "yikao", category: q.category || "", questionId: q.id })}
                          className="rounded-full px-3 py-1 text-[11px] font-bold"
                          style={{ color: GREEN_DARK, border: `1px solid ${GREEN}55`, backgroundColor: "#fff" }}
                        >📝 记笔记</button>
                        {/* P9-首发裁剪：题目评论入口隐藏 */}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  // ==================== 渲染：章节树（科目手风琴 + 掌握度进度条） ====================
  const renderSubjectTree = () => (
    <div className="px-3 py-3 pb-28">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-[11px] text-gray-400">覆盖全部核心考点 · 掌握度随练习自动更新</p>
      </div>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {examSubjects.map((s, idx) => {
          const key = catKey(s.name);
          const cov = coverages[key];
          const covered = !!cov && cov.coverage_rate >= cfg.coverageThreshold;
          const mastery = getMastery(key);
          const open = !!openSubjects[s.id];
          return (
            <div key={s.id} style={{ borderTop: idx === 0 ? "none" : "1px solid #f3f0e8" }}>
              <button
                onClick={() => setOpenSubjects((p) => ({ ...p, [s.id]: !p[s.id] }))}
                className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left"
              >
                <span className="text-[10px] text-gray-400" style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .2s" }}>▼</span>
                <span className="text-[14px] font-bold" style={{ color: INK }}>{s.name}</span>
                <span className="ml-auto flex items-center gap-2">
                  {!s.freeTier && <span className="text-[11px]" title="增值内容">🔒</span>}
                  <span className="h-1.5 w-14 overflow-hidden rounded-full bg-gray-100">
                    <span className="block h-full rounded-full transition-all" style={{ width: `${mastery}%`, backgroundColor: mastery >= 80 ? "#10b981" : GREEN }} />
                  </span>
                  <span className="w-8 text-right text-[10px] text-gray-400">{mastery}%</span>
                </span>
              </button>
              {open && (
                <div style={{ backgroundColor: "#fbfaf6" }}>
                  <div className="flex items-center justify-between px-8 pb-1.5 pt-1">
                    <p className="text-[10px] font-medium" style={{ color: covered ? "#15803d" : "#999" }}>
                      {covered ? "覆盖全部核心考点" : "核心知识点持续完善中"}
                    </p>
                  </div>
                  {(s.chapters.length > 0 ? s.chapters : ["全部章节"]).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => { if (!requireLogin()) return; if (!s.freeTier) { handleStationClick({ id: s.id, name: s.name, group: "增值科目", paid: true, enabled: true }); return; } setActiveSubject(s); }}
                      className="flex w-full items-center justify-between px-8 py-2.5 text-left"
                      style={{ borderTop: "1px solid #f3f0e8" }}
                    >
                      <span className="text-xs text-gray-600">{ch}</span>
                      <span className="text-[10px]" style={{ color: GREEN }}>开始练习 ›</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ==================== 渲染：实践技能三站 ====================
  const renderStations = () => {
    const groups = Array.from(new Set(stations.map((s) => s.group)));
    return (
      <div className="px-3 py-3 pb-28">
        <p className="mb-2 px-1 text-[11px] text-gray-400">实践技能考核三站 · 增值内容支持单次解锁或会员权益</p>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {groups.map((g) => (
            <div key={g}>
              <p className="px-4 pb-1 pt-3 text-[11px] font-bold" style={{ color: GREEN_DARK }}>{g}</p>
              {stations.filter((s) => s.group === g).map((s, idx, arr) => {
                const freeCard = { target: `yikao_station_${s.id}`, price: s.paid ? cfg.aiWrongAnalysisPrice : 0, memberFree: true };
                const unlocked = checkAccess(freeCard);
                return (
                  <button
                    key={s.id}
                    onClick={() => handleStationClick(s)}
                    className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left"
                    style={{ borderTop: idx === 0 ? "none" : "1px solid #f3f0e8" }}
                  >
                    <span className="text-[14px] font-medium" style={{ color: unlocked ? INK : "#aaa" }}>{s.name}</span>
                    {s.paid && !unlocked && <span className="text-[11px] text-gray-400">🔒</span>}
                    <span className="ml-auto text-[10px]" style={{ color: GREEN }}>{unlocked ? "进入练习 ›" : "解锁 ›"}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ==================== 渲染：文库 Tab ====================
  const renderLib = () => (
    <div className="pb-28">
      <div className="flex gap-2 overflow-x-auto border-b border-gray-100 bg-white px-3 py-2.5">
        {cfg.libTabs.map((t) => (
          <button
            key={t}
            onClick={() => setLibTab(t)}
            className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors"
            style={{ backgroundColor: libTab === t ? GREEN : "#f2f2f2", color: libTab === t ? "#fff" : "#666" }}
          >{t}</button>
        ))}
      </div>
      <div className="px-3 py-3">
        <button
          onClick={() => { if (!requireLogin()) return; router.push("/academy/factory"); }}
          className="mb-3 flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-bold"
          style={{ backgroundColor: CREAM, color: GREEN_DARK, border: "1px solid #ece4cf" }}
        >
          <span>✍️ 投稿学习笔记 / 考点总结</span><span>›</span>
        </button>
        {libLoading ? (
          <div className="rounded-2xl bg-white p-6 text-center text-xs text-gray-400 shadow-sm">加载中...</div>
        ) : libPoints.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-500">该学科文库持续丰富中</p>
            <p className="mt-1.5 text-xs text-gray-400">优质笔记与考点总结经审核后精选展示，欢迎投稿</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {libPoints.slice(0, 50).map((p) => (
              <div key={p.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: GREEN + "14", color: GREEN_DARK }}>{p.category.split(":").pop() || p.category}</span>
                  <span className="text-[10px] text-gray-400">{p.chapter}</span>
                </div>
                <p className="text-[13px] font-bold" style={{ color: INK }}>{p.title}</p>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-gray-600">{p.content}</p>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 px-1 text-center text-[10px] text-gray-400">{cfg.disclaimer}</p>
      </div>
    </div>
  );

  // ==================== 主渲染 ====================
  if (!cfg.enabled) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        <PageLoginGuard />
        <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
          <p className="text-sm font-medium text-gray-500">医考专区暂未开放</p>
          <button onClick={() => router.push("/academy")} className="mt-4 rounded-full px-5 py-2 text-xs font-bold text-white" style={{ backgroundColor: GREEN }}>返回学习中心</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <PageLoginGuard />

      {/* ===== 顶部导航：返回键 + 考试类型 + 题库/文库双Tab + 设置 ===== */}
      <div className="sticky top-0 z-20 bg-white shadow-[0_1px_0_0_#f0f0f0]">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button
            onClick={() => { if (window.history.length > 1) router.back(); else router.push("/academy"); }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full active:bg-black/5"
            aria-label="返回"
            title="返回上一页"
          >
            <ArrowLeft className="h-5 w-5" style={{ color: INK }} />
          </button>
          <button
            onClick={() => setShowExamPicker(true)}
            className="flex shrink-0 items-center gap-1 text-[15px] font-bold"
            style={{ color: INK }}
          >
            {currentExam?.name || "选择考试"}
            <span className="text-[10px] text-gray-400">▼</span>
          </button>
          <div className="mx-auto flex overflow-hidden rounded-full" style={{ backgroundColor: "#f2f2f2" }}>
            <button
              onClick={() => setTopTab("bank")}
              className="px-5 py-1.5 text-xs font-bold transition-colors"
              style={{ backgroundColor: topTab === "bank" ? GREEN : "transparent", color: topTab === "bank" ? "#fff" : "#999" }}
            >题库</button>
            <button
              onClick={() => setTopTab("lib")}
              className="px-5 py-1.5 text-xs font-bold transition-colors"
              style={{ backgroundColor: topTab === "lib" ? GREEN : "transparent", color: topTab === "lib" ? "#fff" : "#999" }}
            >文库</button>
          </div>
          <button onClick={() => setShowSettings(true)} className="shrink-0 text-lg text-gray-600" title="设置">⚙</button>
        </div>
      </div>

      {topTab === "bank" ? (
        <>
          {/* ===== 答题视图（科目/卡片/技能站） ===== */}
          {activeSubject ? renderPractice(activeSubject.name, practiceMode === "random" ? "章节乱序练习中" : "章节顺序练习中")
            : activeCard ? renderPractice(activeCard.title, activeCard.subtitle + " · 专项题集")
            : station ? renderPractice(station.name, `${station.group} · 实践技能`)
            : (
              <>
                {/* ===== 快捷功能区：五入口 ===== */}
                <div className="grid grid-cols-5 border-b border-gray-100 bg-white px-2 py-3">
                  {[
                    { icon: "📕", label: "错题本", path: "/academy/wrong-book" },
                    { icon: "📝", label: "我的笔记", path: "/academy/notes" },
                    { icon: "💬", label: "我的评论", path: "/academy/my-comments" },
                    { icon: "⭐", label: "我的收藏", path: "/academy/favorites" },
                    { icon: "🏆", label: "排行榜", path: "/academy/leaderboard" },
                  ].map((e) => (
                    <button key={e.path} onClick={() => router.push(e.path)} className="flex flex-col items-center gap-1.5 py-1 active:opacity-60">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl text-lg" style={{ backgroundColor: CREAM }}>{e.icon}</span>
                      <span className="text-[10px] font-medium text-gray-600">{e.label}</span>
                    </button>
                  ))}
                </div>

                {/* ===== 精选题库：2×2 印章卡片 ===== */}
                <div className="px-3 py-3">
                  <div className="rounded-2xl p-3" style={{ backgroundColor: CREAM, border: "1px solid #ece4cf" }}>
                    <p className="mb-2.5 px-1 text-[15px] font-bold" style={{ color: "#6b4f2a" }}>精选题库</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {cards.map((c) => {
                        const unlocked = checkAccess(c);
                        return (
                          <button
                            key={c.id}
                            onClick={() => handleCardClick(c)}
                            className="flex items-center gap-2.5 rounded-xl bg-white p-3 text-left shadow-sm transition-transform active:scale-[0.98]"
                          >
                            <span
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[15px] font-bold"
                              style={{ color: "#fff", backgroundColor: SEAL_RED, border: "2px solid rgba(192,80,70,.25)", borderRadius: "8px" }}
                            >{c.seal}</span>
                            <span className="min-w-0">
                              <span className="flex items-center gap-1">
                                <span className="truncate text-[13px] font-bold" style={{ color: INK }}>{c.title}</span>
                                {c.price > 0 && !unlocked && <span className="text-[9px]">🔒</span>}
                              </span>
                              <span className="mt-0.5 block truncate text-[10px] text-gray-500">{c.subtitle}</span>
                              {c.price > 0 && !unlocked && (
                                <span className="mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: SEAL_RED + "12", color: SEAL_RED }}>
                                  {c.memberFree ? "会员免费" : `¥${c.price}`}
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ===== 练习模式切换栏 ===== */}
                <div className="sticky top-[45px] z-10 flex items-center gap-6 border-b border-gray-100 bg-white px-4 pt-1">
                  {([["order", "章节练习"], ["random", "章节乱序"], ["skill", "实践技能"]] as const).map(([m, label]) => (
                    <button
                      key={m}
                      onClick={() => setPracticeMode(m)}
                      className="relative py-2.5 text-[14px] font-medium transition-colors"
                      style={{ color: practiceMode === m ? GREEN_DARK : "#999" }}
                    >
                      {label}
                      {practiceMode === m && <span className="absolute inset-x-2 bottom-0 h-[2.5px] rounded-full" style={{ backgroundColor: GREEN }} />}
                    </button>
                  ))}
                </div>

                {/* ===== 模式内容 ===== */}
                {practiceMode === "skill" ? renderStations() : renderSubjectTree()}
              </>
            )}
        </>
      ) : renderLib()}

      {/* ===== 悬浮邀请入口 ===== */}
      {!activeSubject && !activeCard && !station && (
        <button
          onClick={() => router.push("/invite")}
          className="fixed z-30 flex flex-col items-center rounded-xl px-2.5 py-2 shadow-lg active:scale-95"
          style={{ right: "max(12px, calc(50vw - 198px))", bottom: "84px", background: "linear-gradient(160deg,#e85d4f,#c05046)", border: "2px solid #ffe3b3" }}
          title="邀好友送题库"
        >
          <span className="text-[10px] font-bold" style={{ color: "#ffe3b3" }}>邀好友</span>
          <span className="text-[12px] font-bold text-white">送题库</span>
        </button>
      )}

      {/* ===== 底部导航垫层 ===== */}
      <div className="page-bottom-nav-safe" aria-hidden="true" />

      {/* ===== 考试类型选择弹层 ===== */}
      {showExamPicker && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,.45)" }} onClick={() => setShowExamPicker(false)}>
          <div
            className="mx-auto w-full rounded-t-2xl bg-white px-4 pb-8 pt-4"
            style={{ maxWidth: "420px", maxHeight: "85vh", overflowY: "auto", paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-center text-sm font-bold" style={{ color: INK }}>选择考试类型</p>
            {exams.map((e) => (
              <button
                key={e.id}
                onClick={() => { setExamId(e.id); localStorage.setItem(EXAM_KEY, e.id); setCoverages({}); setShowExamPicker(false); }}
                className="mb-2 flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium"
                style={{ backgroundColor: examId === e.id ? GREEN + "12" : "#f7f7f7", color: examId === e.id ? GREEN_DARK : INK }}
              >
                {e.name}
                {examId === e.id && <span style={{ color: GREEN }}>✓</span>}
              </button>
            ))}
            <p className="mt-2 text-center text-[10px] text-gray-400">更多考试类别由运营后台配置开放</p>
          </div>
        </div>
      )}

      {/* ===== 设置弹层 ===== */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,.45)" }} onClick={() => setShowSettings(false)}>
          <div
            className="mx-auto w-full rounded-t-2xl bg-white px-4 pb-8 pt-4"
            style={{ maxWidth: "420px", maxHeight: "85vh", overflowY: "auto", paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-center text-sm font-bold" style={{ color: INK }}>设置</p>
            <div className="space-y-2">
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-xs font-bold text-gray-700">当前考试</p>
                <p className="mt-1 text-[11px] text-gray-500">{currentExam?.name} · 考纲结构 {cfg.version}</p>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-xs font-bold text-gray-700">练习模式说明</p>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-500">章节练习按目录顺序推进；章节乱序随机打乱题序强化记忆；实践技能覆盖三站考核，增值内容支持单次解锁或会员权益。</p>
              </div>
              <button
                onClick={() => { setActiveSubject(null); setActiveCard(null); setStation(null); setPicked({}); setGraded({}); setShowSettings(false); }}
                className="w-full rounded-xl px-4 py-3 text-left text-xs font-bold"
                style={{ backgroundColor: GREEN + "0d", color: GREEN_DARK }}
              >清空当前练习进度（重新作答）</button>
              <p className="px-1 pt-1 text-[10px] leading-relaxed text-gray-400">{cfg.disclaimer}</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== 统一 Paywall 解锁面板 ===== */}
      {unlockTarget && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,.45)" }} onClick={() => !paying && setUnlockTarget(null)}>
          <div
            className="mx-auto w-full rounded-t-2xl bg-white px-5 pb-8 pt-5"
            style={{ maxWidth: "420px", maxHeight: "85vh", overflowY: "auto", paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-center text-base font-bold" style={{ color: INK }}>解锁「{unlockTarget.title}」</p>
            <p className="mt-1.5 text-center text-[11px] text-gray-500">支持单次购买或会员权益抵扣 · 支付后权限自动生效</p>
            <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: CREAM, border: "1px solid #ece4cf" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">单次购买（永久解锁）</span>
                <span className="text-lg font-bold" style={{ color: SEAL_RED }}>¥{unlockTarget.price.toFixed(2)}</span>
              </div>
            </div>
            {payMsg && <p className="mt-3 text-center text-[11px] font-medium" style={{ color: payMsg.includes("成功") ? "#10b981" : SEAL_RED }}>{payMsg}</p>}
            <button
              onClick={handlePay}
              disabled={paying}
              className="mt-4 w-full rounded-full py-3 text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: GREEN }}
            >{paying ? "支付处理中..." : "微信支付 · 立即解锁"}</button>
            {unlockTarget.memberFree && (
              <button
                onClick={() => { setUnlockTarget(null); router.push("/membership"); }}
                className="mt-2.5 w-full rounded-full py-3 text-sm font-bold"
                style={{ backgroundColor: "#fff", color: GREEN_DARK, border: `1px solid ${GREEN}66` }}
              >开通会员 · 权益抵扣免费学</button>
            )}
            <p className="mt-3 text-center text-[10px] text-gray-400">退款后权限将同步回收 · 交易受平台统一保障</p>
          </div>
        </div>
      )}

      <LoginPromptModal show={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
    </div>
  );
}
