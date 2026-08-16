"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Star,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ListChecks,
  AlertTriangle,
} from "lucide-react";
import {
  getSubjects,
  getSubjectById,
  getChapterById,
  getQuestionsBySubject,
  getQuestionsByChapter,
  getQuestionsByIds,
  getQuestionById,
  savePracticeSession,
  getPracticeSession,
  addWrongAnswer,
  toggleFavorite,
  isFavorite,
  OPTION_LABELS,
  COMPLIANCE_TEXT,
  EXPLANATION_SOURCE,
  type ExamQuestion,
  type ExamSubject,
  type ExamChapter,
  type UserAnswer,
} from "@/algorithm-core/modules/tcm/exam";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#F3EDF7";
const CORRECT_COLOR = "#10B981";
const WRONG_COLOR = "#EF4444";

type Mode = "chapters" | "quiz" | "result";

function PracticePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectId = searchParams.get("subjectId") || "";
  const chapterId = searchParams.get("chapterId") || "";
  const mode = searchParams.get("mode") || ""; // "wrong" | "favorites" | ""

  const [viewMode, setViewMode] = useState<Mode>("chapters");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [markedUncertain, setMarkedUncertain] = useState<Set<number>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showJumper, setShowJumper] = useState(false);
  const [sessionKey, setSessionKey] = useState("");

  // P1-6/P1-7: 题号跳转弹窗滚动锁 + 返回拦截
  useBodyScrollLock(showJumper);
  usePopupBackHandler(() => setShowJumper(false), showJumper);

  const subject = useMemo(() => getSubjectById(subjectId), [subjectId]);
  const chapter = useMemo(
    () => (subjectId && chapterId ? getChapterById(subjectId, chapterId) : undefined),
    [subjectId, chapterId]
  );

  // Load questions based on params
  useEffect(() => {
    let qs: ExamQuestion[] = [];
    let key = "";

    if (mode === "wrong") {
      // Wrong book re-practice - loaded in wrong page, passed via sessionStorage
      const wrongIds = typeof window !== "undefined" ? sessionStorage.getItem("tcm_wrong_practice_ids") : null;
      if (wrongIds) {
        const ids = JSON.parse(wrongIds) as string[];
        qs = getQuestionsByIds(ids);
        key = "wrong_practice";
      }
    } else if (mode === "favorites") {
      // Favorites practice
      const favIds = typeof window !== "undefined" ? sessionStorage.getItem("tcm_fav_practice_ids") : null;
      if (favIds) {
        const ids = JSON.parse(favIds) as string[];
        qs = getQuestionsByIds(ids);
        key = "fav_practice";
      }
    } else if (subjectId && chapterId) {
      qs = getQuestionsByChapter(subjectId, chapterId);
      key = `${subjectId}_${chapterId}`;
    } else if (subjectId) {
      // Subject only - show chapter list
      qs = getQuestionsBySubject(subjectId);
      key = `${subjectId}_all`;
      setViewMode("chapters");
      setQuestions(qs);
      setSessionKey(key);
      return;
    }

    if (qs.length > 0) {
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(null));
      setCurrentIndex(0);
      setSessionKey(key);

      // Restore saved progress
      const saved = getPracticeSession(key);
      if (saved && saved.answers.length === qs.length) {
        setAnswers(saved.answers.map((a) => a.selectedOption));
        setCurrentIndex(Math.min(saved.currentIndex, qs.length - 1));
      }

      // Load favorites status
      const favSet = new Set<string>();
      for (const q of qs) {
        if (isFavorite(q.id)) favSet.add(q.id);
      }
      setFavorites(favSet);

      setViewMode("quiz");
    }
  }, [subjectId, chapterId, mode]);

  const currentQuestion = questions[currentIndex];
  const answeredCount = answers.filter((a) => a !== null).length;
  const correctCount = useMemo(() => {
    let c = 0;
    for (let i = 0; i < questions.length; i++) {
      if (answers[i] !== null && answers[i] === questions[i].answer) c++;
    }
    return c;
  }, [answers, questions]);

  const handleAnswer = useCallback(
    (optionIndex: number) => {
      if (!currentQuestion) return;
      if (answers[currentIndex] !== null) return; // already answered

      const newAnswers = [...answers];
      newAnswers[currentIndex] = optionIndex;
      setAnswers(newAnswers);

      // Track wrong answers
      if (optionIndex !== currentQuestion.answer) {
        addWrongAnswer(currentQuestion);
      }

      // Save progress
      const userAnswers: UserAnswer[] = newAnswers
        .map((selected, idx) =>
          selected !== null && questions[idx]
            ? {
                questionId: questions[idx].id,
                selectedOption: selected,
                isCorrect: selected === questions[idx].answer,
                timestamp: Date.now(),
              }
            : null
        )
        .filter((a): a is UserAnswer => a !== null);

      savePracticeSession(sessionKey, userAnswers, currentIndex);
    },
    [answers, currentIndex, currentQuestion, questions, sessionKey]
  );

  const handleToggleFavorite = useCallback(() => {
    if (!currentQuestion) return;
    const isFav = toggleFavorite(currentQuestion.id);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isFav) next.add(currentQuestion.id);
      else next.delete(currentQuestion.id);
      return next;
    });
  }, [currentQuestion]);

  const handleToggleUncertain = useCallback(() => {
    setMarkedUncertain((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All done - show results
      setViewMode("result");
    }
  }, [currentIndex, questions.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }, [currentIndex]);

  const handleRestart = useCallback(() => {
    setAnswers(new Array(questions.length).fill(null));
    setMarkedUncertain(new Set());
    setCurrentIndex(0);
    setViewMode("quiz");
    savePracticeSession(sessionKey, [], 0);
  }, [questions.length, sessionKey]);

  const jumpToQuestion = (idx: number) => {
    setCurrentIndex(idx);
    setShowJumper(false);
  };

  // Chapter selection view
  if (viewMode === "chapters" && subject && !chapterId && mode !== "wrong" && mode !== "favorites") {
    return (
      <ChapterListView
        subject={subject}
        onBack={() => router.back()}
        onSelectChapter={(chId) => {
          router.push(`/zhongyi/exam/practice?subjectId=${subjectId}&chapterId=${chId}`);
        }}
        onStartAll={() => {
          setQuestions(getQuestionsBySubject(subjectId));
          setAnswers(new Array(getQuestionsBySubject(subjectId).length).fill(null));
          setCurrentIndex(0);
          setSessionKey(`${subjectId}_all`);
          setViewMode("quiz");
        }}
      />
    );
  }

  // Result view
  if (viewMode === "result") {
    const wrongIndices: number[] = [];
    const markedIndices: number[] = [];
    for (let i = 0; i < questions.length; i++) {
      if (answers[i] !== null && answers[i] !== questions[i].answer) wrongIndices.push(i);
      if (markedUncertain.has(i)) markedIndices.push(i);
    }

    return (
      <ResultView
        totalQuestions={questions.length}
        correctCount={correctCount}
        wrongIndices={wrongIndices}
        markedIndices={markedIndices}
        subjectName={subject?.name || ""}
        chapterName={chapter?.name || ""}
        onBack={() => router.back()}
        onRestart={handleRestart}
        onReviewWrong={() => {
          if (wrongIndices.length > 0) {
            setCurrentIndex(wrongIndices[0]);
            setViewMode("quiz");
          }
        }}
        onReviewMarked={() => {
          if (markedIndices.length > 0) {
            setCurrentIndex(markedIndices[0]);
            setViewMode("quiz");
          }
        }}
      />
    );
  }

  // Quiz view
  if (!currentQuestion || questions.length === 0) {
    return (
      <div
        style={{
          maxWidth: "420px",
          margin: "0 auto",
          minHeight: "100vh",
          backgroundColor: "#f8f5fc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#999" }}>加载中...</p>
      </div>
    );
  }

  const selectedOption = answers[currentIndex];
  const isAnswered = selectedOption !== null;
  const isCorrect = isAnswered && selectedOption === currentQuestion.answer;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        minHeight: "100vh",
        backgroundColor: "#f8f5fc",
        paddingBottom: "80px",
      }}
    >
      {/* 顶部导航 */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
          padding: "12px 16px",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => router.back()}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "white",
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "14px", fontWeight: "bold" }}>
              {subject?.name || "练习"}
              {chapter ? ` · ${chapter.name}` : ""}
            </div>
            <div style={{ fontSize: "11px", opacity: 0.8 }}>
              第{currentIndex + 1}/{questions.length}题 · 已对{correctCount}题
            </div>
          </div>
          <button
            onClick={handleToggleFavorite}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: favorites.has(currentQuestion.id) ? "#FFD700" : "rgba(255,255,255,0.6)",
              padding: "4px",
            }}
          >
            <Star size={20} fill={favorites.has(currentQuestion.id) ? "#FFD700" : "none"} />
          </button>
          <button
            onClick={() => setShowJumper(!showJumper)}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: "8px",
              padding: "6px 10px",
              color: "white",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            <ListChecks size={16} />
          </button>
        </div>

        {/* 进度条 */}
        <div style={{ marginTop: "10px", height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.3)" }}>
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              borderRadius: "2px",
              background: "white",
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>

      {/* 题号跳转面板 */}
      {showJumper && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 200,
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={() => setShowJumper(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px 16px 0 0",
              padding: "20px 16px",
              width: "100%",
              maxWidth: "420px",
              margin: "0 auto",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "16px", fontWeight: "bold", margin: "0 0 12px" }}>题号跳转</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: "8px" }}>
              {questions.map((_, idx) => {
                const ans = answers[idx];
                const isCurrent = idx === currentIndex;
                let bg = "#f5f5f5";
                let color = "#666";
                if (ans !== null) {
                  bg = ans === questions[idx].answer ? "#D1FAE5" : "#FEE2E2";
                  color = ans === questions[idx].answer ? CORRECT_COLOR : WRONG_COLOR;
                }
                if (isCurrent) {
                  bg = BRAND;
                  color = "white";
                }
                return (
                  <button
                    key={idx}
                    onClick={() => jumpToQuestion(idx)}
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      borderRadius: "8px",
                      border: "none",
                      background: bg,
                      color,
                      fontSize: "13px",
                      fontWeight: isCurrent ? "bold" : "normal",
                      cursor: "pointer",
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <div className="modal-safe-bottom" />
          </div>
        </div>
      )}

      {/* 题目卡片 */}
      <div style={{ padding: "16px 12px" }}>
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          {/* 难度和标记 */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "4px",
                backgroundColor:
                  currentQuestion.difficulty === 1
                    ? "#E8F5E9"
                    : currentQuestion.difficulty === 2
                    ? "#FFF3E0"
                    : "#FFEBEE",
                color:
                  currentQuestion.difficulty === 1
                    ? "#2E7D32"
                    : currentQuestion.difficulty === 2
                    ? "#E65100"
                    : "#C62828",
              }}
            >
              {currentQuestion.difficulty === 1 ? "简单" : currentQuestion.difficulty === 2 ? "中等" : "困难"}
            </span>
            <span style={{ fontSize: "11px", color: "#999" }}>{currentQuestion.chapter}</span>
            <div style={{ flex: 1 }} />
            <button
              onClick={handleToggleUncertain}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                color: markedUncertain.has(currentIndex) ? "#F59E0B" : "#ccc",
              }}
              title="标记不确定"
            >
              <AlertTriangle size={16} fill={markedUncertain.has(currentIndex) ? "#F59E0B" : "none"} />
            </button>
          </div>

          {/* 题目内容 */}
          <p
            style={{
              fontSize: "15px",
              color: "#333",
              lineHeight: 1.7,
              margin: "0 0 16px",
              fontWeight: 500,
            }}
          >
            {currentIndex + 1}. {currentQuestion.question}
          </p>

          {/* 选项 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrectOpt = idx === currentQuestion.answer;
              let optBg = "white";
              let optBorder = "#f0f0f0";
              let optColor = "#333";
              let labelBg = "#f5f5f5";
              let labelColor = "#999";

              if (isAnswered) {
                if (isCorrectOpt) {
                  optBg = "#ECFDF5";
                  optBorder = CORRECT_COLOR;
                  labelBg = CORRECT_COLOR;
                  labelColor = "white";
                } else if (isSelected && !isCorrectOpt) {
                  optBg = "#FEF2F2";
                  optBorder = WRONG_COLOR;
                  labelBg = WRONG_COLOR;
                  labelColor = "white";
                }
              } else if (isSelected) {
                optBg = BRAND_BG;
                optBorder = BRAND;
                labelBg = BRAND;
                labelColor = "white";
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={isAnswered}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: `1.5px solid ${optBorder}`,
                    background: optBg,
                    cursor: isAnswered ? "default" : "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  <span
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: labelBg,
                      color: labelColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      fontWeight: "bold",
                      flexShrink: 0,
                    }}
                  >
                    {OPTION_LABELS[idx]}
                  </span>
                  <span style={{ fontSize: "14px", color: optColor, lineHeight: 1.6, flex: 1, paddingTop: "3px" }}>
                    {opt}
                  </span>
                  {isAnswered && isCorrectOpt && <CheckCircle2 size={20} color={CORRECT_COLOR} />}
                  {isAnswered && isSelected && !isCorrectOpt && <XCircle size={20} color={WRONG_COLOR} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 解析 */}
        {isAnswered && (
          <div
            style={{
              marginTop: "12px",
              background: "white",
              borderRadius: "16px",
              padding: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              borderLeft: `4px solid ${isCorrect ? CORRECT_COLOR : WRONG_COLOR}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              {isCorrect ? (
                <CheckCircle2 size={16} color={CORRECT_COLOR} />
              ) : (
                <XCircle size={16} color={WRONG_COLOR} />
              )}
              <span style={{ fontSize: "14px", fontWeight: "bold", color: isCorrect ? CORRECT_COLOR : WRONG_COLOR }}>
                {isCorrect ? "回答正确" : "回答错误"}
              </span>
              <span style={{ fontSize: "12px", color: "#999", marginLeft: "auto" }}>
                正确答案：{OPTION_LABELS[currentQuestion.answer]}
              </span>
            </div>
            <p style={{ fontSize: "13px", color: "#666", lineHeight: 1.7, margin: "0 0 8px" }}>
              {currentQuestion.explanation}
            </p>
            <p style={{ fontSize: "11px", color: "#bbb", margin: 0 }}>{EXPLANATION_SOURCE}</p>
          </div>
        )}

        {/* 导航按钮 */}
        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "10px 16px",
              borderRadius: "12px",
              border: "1px solid #e0e0e0",
              background: "white",
              color: "#666",
              fontSize: "14px",
              cursor: currentIndex === 0 ? "not-allowed" : "pointer",
              opacity: currentIndex === 0 ? 0.5 : 1,
            }}
          >
            <ChevronLeft size={16} />
            上一题
          </button>
          <button
            onClick={goNext}
            disabled={!isAnswered}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              padding: "10px 16px",
              borderRadius: "12px",
              border: "none",
              background: isAnswered ? BRAND : "#e0e0e0",
              color: "white",
              fontSize: "14px",
              fontWeight: "bold",
              cursor: isAnswered ? "pointer" : "not-allowed",
            }}
          >
            {currentIndex === questions.length - 1 ? (
              <>
                查看结果
                <RotateCcw size={16} />
              </>
            ) : (
              <>
                下一题
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      <p style={{ textAlign: "center", fontSize: 12, color: "#999", padding: "16px 0" }}>{COMPLIANCE_TEXT}</p>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", backgroundColor: "#f8f5fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 14, color: "#999" }}>加载中...</div>
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PracticePageContent />
    </Suspense>
  );
}

// 章节选择列表
function ChapterListView({
  subject,
  onBack,
  onSelectChapter,
  onStartAll,
}: {
  subject: ExamSubject;
  onBack: () => void;
  onSelectChapter: (chapterId: string) => void;
  onStartAll: () => void;
}) {
  return (
    <div
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        minHeight: "100vh",
        backgroundColor: "#f8f5fc",
        paddingBottom: "80px",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
          padding: "12px 16px",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={onBack}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "white",
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>{subject.name}</h1>
            <p style={{ fontSize: "11px", opacity: 0.8, margin: 0 }}>共{subject.questionCount}题</p>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 12px" }}>
        {/* 开始全部练习 */}
        <button
          onClick={onStartAll}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "14px",
            borderRadius: "16px",
            border: "none",
            background: BRAND,
            color: "white",
            fontSize: "15px",
            fontWeight: "bold",
            cursor: "pointer",
            marginBottom: "12px",
            boxShadow: "0 2px 8px rgba(123,47,190,0.3)",
          }}
        >
          <ListChecks size={18} />
          开始全部练习（{subject.questionCount}题）
        </button>

        {/* 章节列表 */}
        <h2 style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 10px" }}>选择章节</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {subject.chapters.map((ch) => (
            <button
              key={ch.id}
              onClick={() => onSelectChapter(ch.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px",
                borderRadius: "12px",
                border: "none",
                background: "white",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                textAlign: "left",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>{ch.name}</div>
                <div style={{ fontSize: "12px", color: "#999", marginTop: "2px" }}>{ch.questionCount}题</div>
              </div>
              <ChevronRight size={16} color="#ccc" />
            </button>
          ))}
        </div>
      </div>

      <p style={{ textAlign: "center", fontSize: 12, color: "#999", padding: "16px 0" }}>{COMPLIANCE_TEXT}</p>
    </div>
  );
}

// 结果页
function ResultView({
  totalQuestions,
  correctCount,
  wrongIndices,
  markedIndices,
  subjectName,
  chapterName,
  onBack,
  onRestart,
  onReviewWrong,
  onReviewMarked,
}: {
  totalQuestions: number;
  correctCount: number;
  wrongIndices: number[];
  markedIndices: number[];
  subjectName: string;
  chapterName: string;
  onBack: () => void;
  onRestart: () => void;
  onReviewWrong: () => void;
  onReviewMarked: () => void;
}) {
  const rate = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const wrongCount = totalQuestions - correctCount;

  return (
    <div
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        minHeight: "100vh",
        backgroundColor: "#f8f5fc",
        paddingBottom: "80px",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
          padding: "12px 16px",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={onBack}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "white",
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>练习完成</h1>
        </div>
      </div>

      <div style={{ padding: "16px 12px" }}>
        {/* 成绩卡片 */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "24px",
            textAlign: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            marginBottom: "12px",
          }}
        >
          <div style={{ fontSize: "48px", fontWeight: "bold", color: rate >= 60 ? CORRECT_COLOR : WRONG_COLOR }}>
            {rate}%
          </div>
          <div style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>
            正确 {correctCount}/{totalQuestions} 题
          </div>
          <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
            {subjectName}
            {chapterName ? ` · ${chapterName}` : ""}
          </div>
        </div>

        {/* 统计 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "12px",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontSize: "20px", fontWeight: "bold", color: CORRECT_COLOR }}>{correctCount}</div>
            <div style={{ fontSize: "11px", color: "#999" }}>答对</div>
          </div>
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "12px",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontSize: "20px", fontWeight: "bold", color: WRONG_COLOR }}>{wrongCount}</div>
            <div style={{ fontSize: "11px", color: "#999" }}>答错</div>
          </div>
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "12px",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#F59E0B" }}>{markedIndices.length}</div>
            <div style={{ fontSize: "11px", color: "#999" }}>标记</div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {wrongCount > 0 && (
            <button
              onClick={onReviewWrong}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                background: "#FEF2F2",
                color: WRONG_COLOR,
                fontSize: "14px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              <XCircle size={16} />
              复习错题（{wrongCount}题）
            </button>
          )}
          {markedIndices.length > 0 && (
            <button
              onClick={onReviewMarked}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                background: "#FFFBEB",
                color: "#F59E0B",
                fontSize: "14px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              <AlertTriangle size={16} />
              复习标记题（{markedIndices.length}题）
            </button>
          )}
          <button
            onClick={onRestart}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              background: BRAND,
              color: "white",
              fontSize: "14px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={16} />
            重新练习
          </button>
        </div>
      </div>

      <p style={{ textAlign: "center", fontSize: 12, color: "#999", padding: "16px 0" }}>{COMPLIANCE_TEXT}</p>
    </div>
  );
}
