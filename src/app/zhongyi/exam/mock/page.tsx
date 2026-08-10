"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ListChecks,
  Play,
  Trophy,
  RotateCcw,
} from "lucide-react";
import {
  getSubjects,
  getQuestionsByIds,
  generateMockExam,
  saveMockExamState,
  getMockExamState,
  clearMockExamState,
  saveExamRecord,
  addWrongAnswer,
  createSeededRandom,
  OPTION_LABELS,
  COMPLIANCE_TEXT,
  EXPLANATION_SOURCE,
  type ExamQuestion,
  type ExamSubject,
  type ExamRecord,
} from "@/algorithm-core/modules/tcm/exam";

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#F3EDF7";
const CORRECT_COLOR = "#10B981";
const WRONG_COLOR = "#EF4444";

type MockMode = "setup" | "exam" | "result";

export default function MockExamPage() {
  const router = useRouter();
  const [mode, setMode] = useState<MockMode>("setup");
  const [questionCount, setQuestionCount] = useState(100);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<{ [qid: string]: number }>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [duration, setDuration] = useState(120); // minutes
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [examResult, setExamResult] = useState<{
    score: number;
    correct: number;
    total: number;
    duration: number;
    breakdown: { subjectId: string; subjectName: string; total: number; correct: number }[];
  } | null>(null);
  const [reviewFilter, setReviewFilter] = useState<"all" | "wrong" | "flagged">("all");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const subjects = useMemo(() => getSubjects(), []);

  // Check for saved exam state on mount
  useEffect(() => {
    const saved = getMockExamState();
    if (saved) {
      const qs = getQuestionsByIds(saved.questionIds);
      if (qs.length > 0) {
        setQuestions(qs);
        setAnswers(saved.answers);
        setFlagged(new Set(saved.flagged));
        setStartTime(saved.startTime);
        setDuration(saved.duration);
        setSelectedSubjects(saved.subjectIds);
        const elapsed = Math.floor((Date.now() - saved.startTime) / 1000);
        const remaining = Math.max(0, saved.duration * 60 - elapsed);
        setRemainingSeconds(remaining);
        setMode("exam");
      }
    }
  }, []);

  // Timer
  useEffect(() => {
    if (mode !== "exam") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Time up - auto submit
          clearInterval(timerRef.current!);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode]);

  // Persist exam state
  useEffect(() => {
    if (mode === "exam" && questions.length > 0) {
      saveMockExamState({
        examId: `mock_${startTime}`,
        startTime,
        duration,
        questionIds: questions.map((q) => q.id),
        answers,
        flagged: Array.from(flagged),
        subjectIds: selectedSubjects,
      });
    }
  }, [mode, answers, flagged, startTime, duration, questions, selectedSubjects]);

  const handleStartExam = () => {
    const subjectIds = selectedSubjects.length > 0 ? selectedSubjects : subjects.map((s) => s.id);
    const examDuration = Math.ceil((questionCount / 100) * 120); // Scale duration
    const { questionIds, examId } = generateMockExam(questionCount, subjectIds);
    const qs = getQuestionsByIds(questionIds);

    if (qs.length === 0) return;

    setQuestions(qs);
    setAnswers({});
    setFlagged(new Set());
    setCurrentIndex(0);
    const now = Date.now();
    setStartTime(now);
    setDuration(examDuration);
    setRemainingSeconds(examDuration * 60);
    setMode("exam");
  };

  const handleSubmit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    let correct = 0;
    const answeredCount = Object.keys(answers).length;
    const breakdownMap = new Map<string, { subjectId: string; subjectName: string; total: number; correct: number }>();

    for (const q of questions) {
      const userAns = answers[q.id];
      const isCorrect = userAns === q.answer;
      if (isCorrect) correct++;

      // Track wrong answers
      if (userAns !== undefined && !isCorrect) {
        addWrongAnswer(q);
      }

      // Subject breakdown
      const existing = breakdownMap.get(q.subjectId);
      if (existing) {
        existing.total++;
        if (isCorrect) existing.correct++;
      } else {
        const s = subjects.find((sub) => sub.id === q.subjectId);
        breakdownMap.set(q.subjectId, {
          subjectId: q.subjectId,
          subjectName: s?.name || q.subject,
          total: 1,
          correct: isCorrect ? 1 : 0,
        });
      }
    }

    const endTime = Date.now();
    const examDuration = Math.floor((endTime - startTime) / 1000);
    const score = Math.round((correct / questions.length) * 100);

    const record: ExamRecord = {
      id: `mock_${startTime}`,
      startTime,
      endTime,
      totalQuestions: questions.length,
      correctCount: correct,
      score,
      duration: examDuration,
      questionIds: questions.map((q) => q.id),
      answers: questions.map((q) => ({
        questionId: q.id,
        selected: answers[q.id] ?? -1,
        correct: answers[q.id] === q.answer,
      })),
      subjectBreakdown: Array.from(breakdownMap.values()),
    };
    saveExamRecord(record);
    clearMockExamState();

    setExamResult({
      score,
      correct,
      total: questions.length,
      duration: examDuration,
      breakdown: Array.from(breakdownMap.values()),
    });
    setMode("result");
  }, [answers, questions, startTime, subjects]);

  const handleAnswer = (optionIndex: number) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionIndex }));
  };

  const handleToggleFlag = () => {
    if (!currentQuestion) return;
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestion.id)) next.delete(currentQuestion.id);
      else next.add(currentQuestion.id);
      return next;
    });
  };

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const toggleSubject = (sid: string) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(sid)) return prev.filter((s) => s !== sid);
      return [...prev, sid];
    });
  };

  // Review questions based on filter
  const reviewQuestions = useMemo(() => {
    if (!examResult) return [];
    if (reviewFilter === "wrong") {
      return questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== q.answer);
    }
    if (reviewFilter === "flagged") {
      return questions.filter((q) => flagged.has(q.id));
    }
    return questions;
  }, [examResult, reviewFilter, questions, answers, flagged]);

  // ---- SETUP SCREEN ----
  if (mode === "setup") {
    const countOptions = [20, 50, 100, 150];
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
            <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>模拟考试</h1>
          </div>
        </div>

        <div style={{ padding: "16px 12px" }}>
          {/* 题目数量 */}
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              marginBottom: "12px",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 12px" }}>题目数量</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" }}>
              {countOptions.map((c) => (
                <button
                  key={c}
                  onClick={() => setQuestionCount(c)}
                  style={{
                    padding: "10px",
                    borderRadius: "10px",
                    border: `2px solid ${questionCount === c ? BRAND : "#f0f0f0"}`,
                    background: questionCount === c ? BRAND_BG : "white",
                    color: questionCount === c ? BRAND : "#666",
                    fontSize: "14px",
                    fontWeight: questionCount === c ? "bold" : "normal",
                    cursor: "pointer",
                  }}
                >
                  {c}题
                </button>
              ))}
            </div>
            <p style={{ fontSize: "11px", color: "#999", marginTop: "8px", margin: "8px 0 0" }}>
              建议时长：{Math.ceil((questionCount / 100) * 120)}分钟
            </p>
          </div>

          {/* 选择科目 */}
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              marginBottom: "16px",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 12px" }}>
              选择科目（不选默认全部）
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {subjects.map((s) => {
                const selected = selectedSubjects.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSubject(s.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "12px",
                      borderRadius: "10px",
                      border: `1.5px solid ${selected ? s.color : "#f0f0f0"}`,
                      background: selected ? s.bgColor : "white",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>{s.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>{s.name}</div>
                      <div style={{ fontSize: "11px", color: "#999" }}>{s.questionCount}题</div>
                    </div>
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        border: `2px solid ${selected ? s.color : "#ddd"}`,
                        background: selected ? s.color : "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {selected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 开始考试 */}
          <button
            onClick={handleStartExam}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "16px",
              borderRadius: "16px",
              border: "none",
              background: BRAND,
              color: "white",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(123,47,190,0.3)",
            }}
          >
            <Play size={20} fill="white" />
            开始模拟考试
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "#999", padding: "16px 0" }}>{COMPLIANCE_TEXT}</p>
      </div>
    );
  }

  // ---- EXAM SCREEN ----
  if (mode === "exam" && currentQuestion) {
    const progress = ((currentIndex + 1) / questions.length) * 100;
    const isTimeWarning = remainingSeconds < 300; // less than 5 minutes
    const currentAnswer = answers[currentQuestion.id];

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
            background: isTimeWarning ? "#DC2626" : `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
            padding: "12px 16px",
            color: "white",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Clock size={16} />
              <span style={{ fontSize: "14px", fontWeight: "bold", fontVariantNumeric: "tabular-nums" }}>
                {formatTime(remainingSeconds)}
              </span>
            </div>
            <div style={{ flex: 1, textAlign: "center", fontSize: "13px" }}>
              {currentIndex + 1}/{questions.length}
            </div>
            <button
              onClick={() => setShowGrid(!showGrid)}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                borderRadius: "8px",
                padding: "6px",
                color: "white",
                cursor: "pointer",
              }}
            >
              <ListChecks size={16} />
            </button>
            <button
              onClick={handleToggleFlag}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: flagged.has(currentQuestion.id) ? "#FFD700" : "rgba(255,255,255,0.6)",
                padding: "4px",
              }}
            >
              <Flag size={16} fill={flagged.has(currentQuestion.id) ? "#FFD700" : "none"} />
            </button>
          </div>
          <div style={{ marginTop: "8px", height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.3)" }}>
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
          <div style={{ marginTop: "6px", display: "flex", justifyContent: "space-between", fontSize: "11px", opacity: 0.8 }}>
            <span>已答 {answeredCount}/{questions.length}</span>
            <span>标记 {flagged.size}</span>
          </div>
        </div>

        {/* Question grid panel */}
        {showGrid && (
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
            onClick={() => setShowGrid(false)}
          >
            <div
              style={{
                background: "white",
                borderRadius: "16px 16px 0 0",
                padding: "20px 16px",
                width: "100%",
                maxWidth: "420px",
                margin: "0 auto",
                maxHeight: "70vh",
                overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "bold", margin: 0 }}>答题卡</h3>
                <button
                  onClick={handleSubmit}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "8px",
                    border: "none",
                    background: WRONG_COLOR,
                    color: "white",
                    fontSize: "13px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  交卷
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: "6px" }}>
                {questions.map((q, idx) => {
                  const ans = answers[q.id];
                  const isCurrent = idx === currentIndex;
                  const isFlagged = flagged.has(q.id);
                  let bg = "#f5f5f5";
                  let color = "#666";
                  if (ans !== undefined) {
                    bg = "#E0E7FF";
                    color = "#4F46E5";
                  }
                  if (isCurrent) {
                    bg = BRAND;
                    color = "white";
                  }
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setShowGrid(false);
                      }}
                      style={{
                        position: "relative",
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
                      {isFlagged && (
                        <span
                          style={{
                            position: "absolute",
                            top: "1px",
                            right: "1px",
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "#FFD700",
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Question */}
        <div style={{ padding: "16px 12px" }}>
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
                  backgroundColor: "#f5f5f5",
                  color: "#666",
                }}
              >
                {currentQuestion.subject}
              </span>
            </div>
            <p style={{ fontSize: "15px", color: "#333", lineHeight: 1.7, margin: "0 0 16px", fontWeight: 500 }}>
              {currentIndex + 1}. {currentQuestion.question}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {currentQuestion.options.map((opt, idx) => {
                const isSelected = currentAnswer === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      border: `1.5px solid ${isSelected ? BRAND : "#f0f0f0"}`,
                      background: isSelected ? BRAND_BG : "white",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: isSelected ? BRAND : "#f5f5f5",
                        color: isSelected ? "white" : "#999",
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
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
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
              onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
              disabled={currentIndex === questions.length - 1}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                padding: "10px 16px",
                borderRadius: "12px",
                border: "none",
                background: BRAND,
                color: "white",
                fontSize: "14px",
                fontWeight: "bold",
                cursor: currentIndex === questions.length - 1 ? "not-allowed" : "pointer",
                opacity: currentIndex === questions.length - 1 ? 0.5 : 1,
              }}
            >
              下一题
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "#999", padding: "16px 0" }}>{COMPLIANCE_TEXT}</p>
      </div>
    );
  }

  // ---- RESULT SCREEN ----
  if (mode === "result" && examResult) {
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
              onClick={() => router.push("/zhongyi/exam")}
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
            <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>考试结果</h1>
          </div>
        </div>

        <div style={{ padding: "16px 12px" }}>
          {/* Score card */}
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
              <Trophy size={48} color={examResult.score >= 60 ? CORRECT_COLOR : WRONG_COLOR} />
            </div>
            <div
              style={{
                fontSize: "56px",
                fontWeight: "bold",
                color: examResult.score >= 60 ? CORRECT_COLOR : WRONG_COLOR,
                lineHeight: 1,
              }}
            >
              {examResult.score}
            </div>
            <div style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
              正确 {examResult.correct}/{examResult.total} 题 · 用时 {Math.floor(examResult.duration / 60)}分
              {examResult.duration % 60}秒
            </div>
          </div>

          {/* Subject breakdown */}
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              marginBottom: "12px",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 12px" }}>分科统计</h3>
            {examResult.breakdown.map((b) => {
              const rate = b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0;
              return (
                <div key={b.subjectId} style={{ marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                    <span style={{ color: "#333" }}>{b.subjectName}</span>
                    <span style={{ color: rate >= 60 ? CORRECT_COLOR : WRONG_COLOR }}>
                      {b.correct}/{b.total} ({rate}%)
                    </span>
                  </div>
                  <div style={{ height: "6px", borderRadius: "3px", background: "#f0f0f0" }}>
                    <div
                      style={{
                        width: `${rate}%`,
                        height: "100%",
                        borderRadius: "3px",
                        background: rate >= 60 ? CORRECT_COLOR : WRONG_COLOR,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Review filter */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            {(["all", "wrong", "flagged"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setReviewFilter(f)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "10px",
                  border: `1.5px solid ${reviewFilter === f ? BRAND : "#f0f0f0"}`,
                  background: reviewFilter === f ? BRAND_BG : "white",
                  color: reviewFilter === f ? BRAND : "#666",
                  fontSize: "13px",
                  fontWeight: reviewFilter === f ? "bold" : "normal",
                  cursor: "pointer",
                }}
              >
                {f === "all" ? "全部" : f === "wrong" ? `错题(${questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== q.answer).length})` : `标记(${flagged.size})`}
              </button>
            ))}
          </div>

          {/* Question review */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {reviewQuestions.map((q, idx) => {
              const userAns = answers[q.id];
              const isCorrect = userAns === q.answer;
              const isAnswered = userAns !== undefined;
              return (
                <div
                  key={q.id}
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    borderLeft: `4px solid ${isCorrect ? CORRECT_COLOR : isAnswered ? WRONG_COLOR : "#ddd"}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    {isAnswered ? (
                      isCorrect ? (
                        <CheckCircle2 size={16} color={CORRECT_COLOR} style={{ flexShrink: 0, marginTop: "2px" }} />
                      ) : (
                        <XCircle size={16} color={WRONG_COLOR} style={{ flexShrink: 0, marginTop: "2px" }} />
                      )
                    ) : (
                      <span
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "50%",
                          border: "2px solid #ddd",
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "13px", color: "#333", lineHeight: 1.6, margin: "0 0 6px" }}>
                        {idx + 1}. {q.question}
                      </p>
                      <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.5 }}>
                        {isAnswered && !isCorrect && (
                          <span style={{ color: WRONG_COLOR }}>
                            你的答案：{OPTION_LABELS[userAns]}　</span>
                        )}
                        <span style={{ color: CORRECT_COLOR }}>
                          正确答案：{OPTION_LABELS[q.answer]}
                        </span>
                      </div>
                      <p style={{ fontSize: "12px", color: "#999", lineHeight: 1.5, margin: "4px 0 0" }}>
                        {q.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {reviewQuestions.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: "14px" }}>
                暂无符合条件的题目
              </div>
            )}
          </div>

          {/* Back button */}
          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button
              onClick={() => {
                clearMockExamState();
                router.push("/zhongyi/exam");
              }}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
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
                setMode("setup");
                setExamResult(null);
                setQuestions([]);
                setAnswers({});
                setFlagged(new Set());
              }}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
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
              再考一次
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "#999", padding: "16px 0" }}>{COMPLIANCE_TEXT}</p>
      </div>
    );
  }

  return null;
}
