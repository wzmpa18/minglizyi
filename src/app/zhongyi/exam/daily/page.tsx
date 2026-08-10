"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Star,
  Flame,
  Award,
} from "lucide-react";
import {
  getDailyQuestions,
  getCheckins,
  saveCheckin,
  getLearningStats,
  isFavorite,
  toggleFavorite,
  addWrongAnswer,
  savePracticeSession,
  OPTION_LABELS,
  COMPLIANCE_TEXT,
  EXPLANATION_SOURCE,
  type ExamQuestion,
  type DailyCheckin,
} from "@/algorithm-core/modules/tcm/exam";

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#F3EDF7";
const CORRECT_COLOR = "#10B981";
const WRONG_COLOR = "#EF4444";

type DailyMode = "quiz" | "result";

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DailyPracticePage() {
  const router = useRouter();
  const today = useMemo(() => getTodayStr(), []);
  const questions = useMemo(() => getDailyQuestions(today), [today]);

  const [mode, setMode] = useState<DailyMode>("quiz");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => new Array(questions.length).fill(null));
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [checkedIn, setCheckedIn] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [correctCount, setCorrectCount] = useState(0);

  const sessionKey = `daily_${today}`;

  // Load checkin status and favorites
  useEffect(() => {
    const ci = getCheckins();
    setCheckins(ci);
    const todayCheckin = ci.find((c) => c.date === today);
    if (todayCheckin?.completed) {
      setCheckedIn(true);
    }
    const ls = getLearningStats();
    setStreakDays(ls.streakDays);

    const favSet = new Set<string>();
    for (const q of questions) {
      if (isFavorite(q.id)) favSet.add(q.id);
    }
    setFavorites(favSet);
  }, [today, questions]);

  const currentQuestion = questions[currentIndex];
  const answeredCount = answers.filter((a) => a !== null).length;
  const isLastQ = currentIndex >= questions.length - 1;
  const allAnswered = answeredCount === questions.length;
  const selectedOption = answers[currentIndex];
  const isAnswered = selectedOption !== null;
  const isCorrect = isAnswered && selectedOption === currentQuestion?.answer;
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const handleAnswer = useCallback(
    (optionIndex: number) => {
      if (!currentQuestion) return;
      if (answers[currentIndex] !== null) return;

      const newAnswers = [...answers];
      newAnswers[currentIndex] = optionIndex;
      setAnswers(newAnswers);

      if (optionIndex !== currentQuestion.answer) {
        addWrongAnswer(currentQuestion);
      }

      // Update correct count
      let correct = 0;
      for (let i = 0; i < newAnswers.length; i++) {
        if (newAnswers[i] !== null && newAnswers[i] === questions[i].answer) correct++;
      }
      setCorrectCount(correct);

      // Save progress
      const userAnswers = newAnswers
        .map((selected, idx) =>
          selected !== null
            ? {
                questionId: questions[idx].id,
                selectedOption: selected,
                isCorrect: selected === questions[idx].answer,
                timestamp: Date.now(),
              }
            : null
        )
        .filter((a): a is NonNullable<typeof a> => a !== null);
      savePracticeSession(sessionKey, userAnswers, currentIndex);
    },
    [answers, currentIndex, currentQuestion, questions, sessionKey]
  );

  const goNext = () => {
    if (isLastQ) {
      setMode("result");
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleCheckin = () => {
    saveCheckin(today, correctCount, questions.length);
    setCheckedIn(true);
    setStreakDays((prev) => prev + 1);
    const ci = getCheckins();
    setCheckins(ci);
  };

  const handleToggleFav = () => {
    if (!currentQuestion) return;
    const now = toggleFavorite(currentQuestion.id);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (now) next.add(currentQuestion.id);
      else next.delete(currentQuestion.id);
      return next;
    });
  };

  // Generate 30-day heatmap data
  const heatmapDays = useMemo(() => {
    const days: { date: string; checked: boolean; label: string }[] = [];
    const checkinSet = new Set(checkins.filter((c) => c.completed).map((c) => c.date));
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = formatDate(d);
      days.push({
        date: ds,
        checked: checkinSet.has(ds),
        label: `${d.getMonth() + 1}/${d.getDate()}`,
      });
    }
    return days;
  }, [checkins]);

  const todayDate = new Date();
  const dateDisplay = `${todayDate.getFullYear()}年${todayDate.getMonth() + 1}月${todayDate.getDate()}日`;

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
      {/* Top bar */}
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
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>每日一练</h1>
            <p style={{ fontSize: "11px", opacity: 0.8, margin: 0 }}>
              {dateDisplay} · 连续{streakDays}天
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Flame size={16} color="#FFD700" />
            <span style={{ fontSize: "13px", fontWeight: "bold" }}>{streakDays}</span>
          </div>
        </div>

        {mode === "quiz" && currentQuestion && (
          <>
            <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "12px", opacity: 0.9 }}>
              <span>第{currentIndex + 1}/{questions.length}题</span>
              <span>已对{correctCount}题</span>
            </div>
            <div style={{ marginTop: "6px", height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.3)" }}>
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
          </>
        )}
      </div>

      <div style={{ padding: "16px 12px" }}>
        {mode === "quiz" && currentQuestion && (
          <>
            {/* Question card */}
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    backgroundColor: BRAND_BG,
                    color: BRAND,
                  }}
                >
                  {currentQuestion.subject}
                </span>
                <span style={{ fontSize: "11px", color: "#999" }}>{currentQuestion.chapter}</span>
                <div style={{ flex: 1 }} />
                <button
                  onClick={handleToggleFav}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    color: favorites.has(currentQuestion.id) ? "#FFD700" : "#ccc",
                  }}
                >
                  <Star size={18} fill={favorites.has(currentQuestion.id) ? "#FFD700" : "none"} />
                </button>
              </div>
              <p style={{ fontSize: "15px", color: "#333", lineHeight: 1.7, margin: "0 0 16px", fontWeight: 500 }}>
                {currentIndex + 1}. {currentQuestion.question}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {currentQuestion.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrectOpt = idx === currentQuestion.answer;
                  let optBg = "white";
                  let optBorder = "#f0f0f0";
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
                      <span style={{ fontSize: "14px", color: "#333", lineHeight: 1.6, flex: 1, paddingTop: "3px" }}>
                        {opt}
                      </span>
                      {isAnswered && isCorrectOpt && <CheckCircle2 size={20} color={CORRECT_COLOR} />}
                      {isAnswered && isSelected && !isCorrectOpt && <XCircle size={20} color={WRONG_COLOR} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Explanation */}
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

            {/* Navigation */}
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
                {isLastQ ? "完成练习" : "下一题"}
                {!isLastQ && <ChevronRight size={16} />}
              </button>
            </div>
          </>
        )}

        {mode === "result" && (
          <>
            {/* Result card */}
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
              <div style={{ marginBottom: "12px" }}>
                <Award size={48} color={correctCount >= 3 ? CORRECT_COLOR : "#F59E0B"} />
              </div>
              <div
                style={{
                  fontSize: "42px",
                  fontWeight: "bold",
                  color: correctCount >= 3 ? CORRECT_COLOR : "#F59E0B",
                  lineHeight: 1,
                }}
              >
                {correctCount}/{questions.length}
              </div>
              <p style={{ fontSize: "14px", color: "#666", marginTop: "8px", margin: "8px 0 0" }}>
                {correctCount >= 5 ? "太棒了！全部正确！" : correctCount >= 4 ? "很不错，继续保持！" : correctCount >= 3 ? "还可以，再接再厉！" : "加油，多复习巩固！"}
              </p>
              {!checkedIn && (
                <button
                  onClick={handleCheckin}
                  style={{
                    marginTop: "16px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px 32px",
                    borderRadius: "24px",
                    border: "none",
                    background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
                    color: "white",
                    fontSize: "15px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(123,47,190,0.3)",
                  }}
                >
                  <Calendar size={18} />
                  打卡签到
                </button>
              )}
              {checkedIn && (
                <div
                  style={{
                    marginTop: "16px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 20px",
                    borderRadius: "20px",
                    background: "#ECFDF5",
                    color: CORRECT_COLOR,
                    fontSize: "13px",
                    fontWeight: "bold",
                  }}
                >
                  <CheckCircle2 size={16} />
                  今日已打卡
                </div>
              )}
            </div>

            {/* Streak */}
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #FF6B35, #F7931E)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Flame size={24} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#333" }}>
                  连续学习 {streakDays} 天
                </div>
                <div style={{ fontSize: "12px", color: "#999", marginTop: "2px" }}>
                  坚持每日打卡，积累学习成果
                </div>
              </div>
            </div>

            {/* 30-day heatmap */}
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                marginBottom: "12px",
              }}
            >
              <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Calendar size={14} color={BRAND} />
                近30天打卡记录
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: "4px" }}>
                {heatmapDays.map((d) => {
                  const isToday = d.date === today;
                  return (
                    <div
                      key={d.date}
                      title={d.label}
                      style={{
                        aspectRatio: "1",
                        borderRadius: "4px",
                        background: d.checked
                          ? isToday
                            ? BRAND
                            : BRAND_LIGHT
                          : "#f0f0f0",
                        border: isToday ? `2px solid ${BRAND}` : "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "8px",
                        color: d.checked ? "white" : "#ccc",
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px", marginTop: "8px" }}>
                <span style={{ fontSize: "10px", color: "#999" }}>少</span>
                <div style={{ width: "12px", height: "12px", borderRadius: "2px", background: "#f0f0f0" }} />
                <div style={{ width: "12px", height: "12px", borderRadius: "2px", background: BRAND_LIGHT }} />
                <div style={{ width: "12px", height: "12px", borderRadius: "2px", background: BRAND }} />
                <span style={{ fontSize: "10px", color: "#999" }}>多</span>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => router.push("/zhongyi/exam")}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #e0e0e0",
                  background: "white",
                  color: "#666",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                返回首页
              </button>
              <button
                onClick={() => {
                  setAnswers(new Array(questions.length).fill(null));
                  setCurrentIndex(0);
                  setCorrectCount(0);
                  setMode("quiz");
                }}
                style={{
                  flex: 1,
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
                再看一遍
              </button>
            </div>
          </>
        )}
      </div>

      <p style={{ textAlign: "center", fontSize: 12, color: "#999", padding: "16px 0" }}>{COMPLIANCE_TEXT}</p>
    </div>
  );
}
