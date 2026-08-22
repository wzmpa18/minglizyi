"use client";

import { SectionGate } from "@/components/SectionGate";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookX, Play, Trash2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import {
  getSubjects,
  getWrongAnswers,
  removeWrongAnswer,
  getQuestionsByIds,
  getQuestionById,
  getWeakTopics,
  toggleFavorite,
  isFavorite,
  OPTION_LABELS,
  COMPLIANCE_TEXT,
  EXPLANATION_SOURCE,
  type WrongAnswerRecord,
  type ExamQuestion,
  type WeakTopic,
} from "@/algorithm-core/modules/tcm/exam";

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const CORRECT_COLOR = "#10B981";
const WRONG_COLOR = "#EF4444";

type View = "list" | "practice" | "detail";

function WrongAnswersPageOriginal() {
  const router = useRouter();
  const [wrongs, setWrongs] = useState<WrongAnswerRecord[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [favSet, setFavSet] = useState<Set<string>>(new Set());

  const subjects = useMemo(() => getSubjects(), []);

  useEffect(() => {
    loadWrongs();
  }, []);

  const loadWrongs = () => {
    const w = getWrongAnswers();
    w.sort((a, b) => b.lastWrongAt - a.lastWrongAt);
    setWrongs(w);
    const favs = new Set<string>();
    for (const wr of w) {
      if (isFavorite(wr.questionId)) favs.add(wr.questionId);
    }
    setFavSet(favs);
  };

  const wrongCountBySubject = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of wrongs) {
      map.set(w.subjectId, (map.get(w.subjectId) || 0) + 1);
    }
    return map;
  }, [wrongs]);

  const filteredWrongs = useMemo(() => {
    if (activeTab === "all") return wrongs;
    return wrongs.filter((w) => w.subjectId === activeTab);
  }, [wrongs, activeTab]);

  const weakTopics = useMemo(() => getWeakTopics(5), [wrongs]);

  const handleStartPractice = (subjectFilter?: string) => {
    const targetWrongs = subjectFilter ? wrongs.filter((w) => w.subjectId === subjectFilter) : wrongs;
    if (targetWrongs.length === 0) return;
    const ids = targetWrongs.map((w) => w.questionId);
    const qs = getQuestionsByIds(ids);
    if (qs.length === 0) return;
    // Store IDs in sessionStorage for practice page
    if (typeof window !== "undefined") {
      sessionStorage.setItem("tcm_wrong_practice_ids", JSON.stringify(ids));
    }
    router.push("/zhongyi/exam/practice?mode=wrong");
  };

  const handleRemove = (questionId: string) => {
    removeWrongAnswer(questionId);
    loadWrongs();
  };

  const handleToggleFav = (qid: string) => {
    const now = toggleFavorite(qid);
    setFavSet((prev) => {
      const next = new Set(prev);
      if (now) next.add(qid);
      else next.delete(qid);
      return next;
    });
  };

  const toggleExpand = (qid: string) => {
    setExpandedId((prev) => (prev === qid ? null : qid));
  };

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
          <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0, flex: 1 }}>错题本</h1>
          {wrongs.length > 0 && (
            <button
              onClick={() => handleStartPractice()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 12px",
                borderRadius: "8px",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              <Play size={14} fill="white" />
              全部重练
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: "16px 12px" }}>
        {wrongs.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "white",
              borderRadius: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <BookX size={48} color="#ddd" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: "15px", color: "#999", margin: "0 0 8px" }}>暂无错题</p>
            <p style={{ fontSize: "12px", color: "#ccc", margin: 0 }}>做题过程中答错的题目会自动收录到这里</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                marginBottom: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <AlertTriangle size={16} color={WRONG_COLOR} />
                <span style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>
                  共 {wrongs.length} 道错题待复习
                </span>
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {subjects.map((s) => {
                  const count = wrongCountBySubject.get(s.id) || 0;
                  if (count === 0) return null;
                  return (
                    <span
                      key={s.id}
                      style={{
                        fontSize: "11px",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        backgroundColor: s.bgColor,
                        color: s.color,
                      }}
                    >
                      {s.name} {count}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Weakness analysis */}
            {weakTopics.length > 0 && (
              <div
                style={{
                  background: "white",
                  borderRadius: "16px",
                  padding: "16px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  marginBottom: "12px",
                }}
              >
                <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 10px" }}>
                  薄弱知识点
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {weakTopics.map((wt, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        backgroundColor: "#FEF2F2",
                      }}
                    >
                      <span
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          background: WRONG_COLOR,
                          color: "white",
                          fontSize: "11px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", color: "#333", fontWeight: 500 }}>{wt.topic}</div>
                        <div style={{ fontSize: "11px", color: "#999" }}>{wt.subjectName}</div>
                      </div>
                      <span style={{ fontSize: "12px", color: WRONG_COLOR, fontWeight: "bold" }}>
                        错{wt.wrongCount}次
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab filter */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "12px", overflowX: "auto", paddingBottom: "4px" }}>
              <button
                onClick={() => setActiveTab("all")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: "none",
                  background: activeTab === "all" ? BRAND : "white",
                  color: activeTab === "all" ? "white" : "#666",
                  fontSize: "13px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: activeTab === "all" ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                全部 ({wrongs.length})
              </button>
              {subjects.map((s) => {
                const count = wrongCountBySubject.get(s.id) || 0;
                if (count === 0) return null;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveTab(s.id)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "20px",
                      border: "none",
                      background: activeTab === s.id ? s.color : "white",
                      color: activeTab === s.id ? "white" : "#666",
                      fontSize: "13px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      boxShadow: activeTab === s.id ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
                    }}
                  >
                    {s.name} ({count})
                  </button>
                );
              })}
            </div>

            {/* Practice button for subject */}
            {activeTab !== "all" && wrongCountBySubject.get(activeTab) && (
              <button
                onClick={() => handleStartPractice(activeTab)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "10px",
                  borderRadius: "12px",
                  border: "none",
                  background: BRAND,
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  marginBottom: "12px",
                }}
              >
                <Play size={16} fill="white" />
                练习{subjects.find((s) => s.id === activeTab)?.name}错题（{wrongCountBySubject.get(activeTab)}题）
              </button>
            )}

            {/* Wrong question list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filteredWrongs.map((w) => {
                const q = getQuestionById(w.questionId);
                if (!q) return null;
                const isExpanded = expandedId === w.questionId;
                const isFav = favSet.has(w.questionId);
                return (
                  <div
                    key={w.questionId}
                    style={{
                      background: "white",
                      borderRadius: "12px",
                      padding: "12px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                          <span
                            style={{
                              fontSize: "10px",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              backgroundColor:
                                q.subjectId === "jichu"
                                  ? "#E3F2FD"
                                  : q.subjectId === "zhenduan"
                                  ? "#F3E5F5"
                                  : q.subjectId === "zhongyao"
                                  ? "#E8F5E9"
                                  : q.subjectId === "fangji"
                                  ? "#FFEBEE"
                                  : "#FFF3E0",
                              color:
                                q.subjectId === "jichu"
                                  ? "#1565C0"
                                  : q.subjectId === "zhenduan"
                                  ? "#7B1FA2"
                                  : q.subjectId === "zhongyao"
                                  ? "#2E7D32"
                                  : q.subjectId === "fangji"
                                  ? "#C62828"
                                  : "#E65100",
                            }}
                          >
                            {q.subject}
                          </span>
                          <span style={{ fontSize: "10px", color: "#999" }}>错{w.wrongCount}次</span>
                        </div>
                        <p
                          style={{
                            fontSize: "13px",
                            color: "#333",
                            lineHeight: 1.6,
                            margin: 0,
                            cursor: "pointer",
                          }}
                          onClick={() => toggleExpand(w.questionId)}
                        >
                          {q.question}
                        </p>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFav(w.questionId);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "2px",
                            color: isFav ? "#FFD700" : "#ddd",
                            fontSize: "16px",
                          }}
                        >
                          {isFav ? "★" : "☆"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(w.questionId);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "2px",
                            color: "#ccc",
                          }}
                          title="移出错题本"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #f5f5f5" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                          {q.options.map((opt, idx) => {
                            const isCorrect = idx === q.answer;
                            return (
                              <div
                                key={idx}
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: "8px",
                                  padding: "8px 10px",
                                  borderRadius: "8px",
                                  background: isCorrect ? "#ECFDF5" : "#fafafa",
                                  fontSize: "12px",
                                  color: isCorrect ? CORRECT_COLOR : "#666",
                                }}
                              >
                                <span
                                  style={{
                                    width: "22px",
                                    height: "22px",
                                    borderRadius: "50%",
                                    background: isCorrect ? CORRECT_COLOR : "#e0e0e0",
                                    color: "white",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "11px",
                                    fontWeight: "bold",
                                    flexShrink: 0,
                                  }}
                                >
                                  {OPTION_LABELS[idx]}
                                </span>
                                <span style={{ flex: 1, lineHeight: 1.5, paddingTop: "2px" }}>{opt}</span>
                                {isCorrect && <CheckCircle2 size={14} color={CORRECT_COLOR} />}
                              </div>
                            );
                          })}
                        </div>
                        <p style={{ fontSize: "12px", color: "#666", lineHeight: 1.6, margin: "0 0 4px" }}>
                          {q.explanation}
                        </p>
                        <p style={{ fontSize: "11px", color: "#bbb", margin: 0 }}>{EXPLANATION_SOURCE}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <p style={{ textAlign: "center", fontSize: 12, color: "#999", padding: "16px 0" }}>{COMPLIANCE_TEXT}</p>
    </div>
  );
}

// v25.0.47_12: 中医板块知识开放程度门控（后台工具矩阵实时控制：开放/会员专享/维护/关闭）
export default function WrongAnswersPage() {
  return (
    <SectionGate toolId="zhongyi_exam" title="医考刷题">
      <WrongAnswersPageOriginal />
    </SectionGate>
  );
}
