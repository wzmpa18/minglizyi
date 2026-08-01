"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star, Play, Trash2, CheckCircle2, X } from "lucide-react";
import {
  getSubjects,
  getFavorites,
  toggleFavorite,
  removeFavorites,
  getQuestionsByIds,
  getQuestionById,
  OPTION_LABELS,
  COMPLIANCE_TEXT,
  EXPLANATION_SOURCE,
  type FavoriteItem,
  type ExamQuestion,
} from "@/algorithm-core/modules/tcm/exam";

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const CORRECT_COLOR = "#10B981";

export default function FavoritesPage() {
  const router = useRouter();
  const [favs, setFavs] = useState<FavoriteItem[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const subjects = useMemo(() => getSubjects(), []);

  useEffect(() => {
    loadFavs();
  }, []);

  const loadFavs = () => {
    const f = getFavorites();
    f.sort((a, b) => b.addedAt - a.addedAt);
    setFavs(f);
    const ids = f.map((item) => item.questionId);
    const qs = getQuestionsByIds(ids);
    setQuestions(qs);
  };

  const favCountBySubject = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of questions) {
      map.set(q.subjectId, (map.get(q.subjectId) || 0) + 1);
    }
    return map;
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    if (activeTab === "all") return questions;
    return questions.filter((q) => q.subjectId === activeTab);
  }, [questions, activeTab]);

  const handleToggleFav = (qid: string) => {
    toggleFavorite(qid);
    loadFavs();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(qid);
      return next;
    });
  };

  const handleBatchRemove = () => {
    if (selectedIds.size === 0) return;
    removeFavorites(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectMode(false);
    loadFavs();
  };

  const toggleSelect = (qid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuestions.map((q) => q.id)));
    }
  };

  const handleStartPractice = () => {
    if (filteredQuestions.length === 0) return;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "tcm_fav_practice_ids",
        JSON.stringify(filteredQuestions.map((q) => q.id))
      );
    }
    router.push("/zhongyi/exam/practice?mode=favorites");
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
          <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0, flex: 1 }}>我的收藏</h1>
          {questions.length > 0 && !selectMode && (
            <button
              onClick={() => setSelectMode(true)}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                borderRadius: "8px",
                padding: "6px 12px",
                color: "white",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              选择
            </button>
          )}
          {selectMode && (
            <button
              onClick={() => {
                setSelectMode(false);
                setSelectedIds(new Set());
              }}
              style={{
                background: "none",
                border: "none",
                color: "white",
                fontSize: "12px",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Batch action bar */}
        {selectMode && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
            <button
              onClick={selectAll}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              {selectedIds.size === filteredQuestions.length ? "取消全选" : "全选"}
            </button>
            <span style={{ fontSize: "12px", opacity: 0.8, flex: 1 }}>
              已选 {selectedIds.size} 题
            </span>
            <button
              onClick={handleBatchRemove}
              disabled={selectedIds.size === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 12px",
                borderRadius: "8px",
                border: "none",
                background: selectedIds.size > 0 ? "rgba(239,68,68,0.9)" : "rgba(255,255,255,0.1)",
                color: "white",
                fontSize: "12px",
                cursor: selectedIds.size > 0 ? "pointer" : "not-allowed",
              }}
            >
              <Trash2 size={14} />
              移除
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: "16px 12px" }}>
        {questions.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "white",
              borderRadius: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <Star size={48} color="#ddd" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: "15px", color: "#999", margin: "0 0 8px" }}>暂无收藏</p>
            <p style={{ fontSize: "12px", color: "#ccc", margin: 0 }}>做题时点击星标可收藏题目</p>
          </div>
        ) : (
          <>
            {/* Practice button */}
            <button
              onClick={handleStartPractice}
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
              <Play size={18} fill="white" />
              练习收藏题目（{filteredQuestions.length}题）
            </button>

            {/* Tab filter */}
            <div
              style={{
                display: "flex",
                gap: "6px",
                marginBottom: "12px",
                overflowX: "auto",
                paddingBottom: "4px",
              }}
            >
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
                全部 ({questions.length})
              </button>
              {subjects.map((s) => {
                const count = favCountBySubject.get(s.id) || 0;
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

            {/* Question list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filteredQuestions.map((q) => {
                const isExpanded = expandedId === q.id;
                const isSelected = selectedIds.has(q.id);
                return (
                  <div
                    key={q.id}
                    style={{
                      background: "white",
                      borderRadius: "12px",
                      padding: "12px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      border: selectMode && isSelected ? `2px solid ${BRAND}` : "2px solid transparent",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      {selectMode && (
                        <button
                          onClick={() => toggleSelect(q.id)}
                          style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            border: `2px solid ${isSelected ? BRAND : "#ddd"}`,
                            background: isSelected ? BRAND : "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0,
                            marginTop: "1px",
                            padding: 0,
                          }}
                        >
                          {isSelected && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      )}
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
                        </div>
                        <p
                          style={{
                            fontSize: "13px",
                            color: "#333",
                            lineHeight: 1.6,
                            margin: 0,
                            cursor: "pointer",
                          }}
                          onClick={() => !selectMode && setExpandedId(isExpanded ? null : q.id)}
                        >
                          {q.question}
                        </p>
                      </div>
                      {!selectMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFav(q.id);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "2px",
                            color: "#FFD700",
                            fontSize: "18px",
                          }}
                        >
                          ★
                        </button>
                      )}
                    </div>

                    {isExpanded && !selectMode && (
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
