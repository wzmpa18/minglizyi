"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronRight,
  Calendar,
  FileText,
  BookX,
  Star,
  BarChart3,
  ArrowLeft,
} from "lucide-react";
import {
  getSubjects,
  getAllQuestions,
  getLearningStats,
  getWrongAnswers,
  getFavorites,
  searchQuestions,
  isTodayCheckedIn,
  COMPLIANCE_TEXT,
  type ExamSubject,
  type ExamQuestion,
} from "@/algorithm-core/modules/tcm/exam";

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#F3EDF7";

export default function ExamHomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ExamQuestion[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    practiced: 0,
    correctRate: 0,
    studyDays: 0,
    wrongCount: 0,
    favCount: 0,
    checkedIn: false,
  });

  const subjects = useMemo(() => getSubjects(), []);
  const totalQuestions = useMemo(() => getAllQuestions().length, []);

  useEffect(() => {
    const ls = getLearningStats();
    const wrongs = getWrongAnswers();
    const favs = getFavorites();
    setStats({
      totalQuestions,
      practiced: ls.totalAnswered,
      correctRate: ls.correctRate,
      studyDays: ls.studyDays,
      wrongCount: wrongs.length,
      favCount: favs.length,
      checkedIn: isTodayCheckedIn(),
    });
  }, [totalQuestions]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const results = searchQuestions(searchQuery);
    setSearchResults(results.slice(0, 10));
    setShowResults(true);
  }, [searchQuery]);

  const quickActions = [
    {
      key: "daily",
      title: "每日一练",
      desc: stats.checkedIn ? "今日已完成" : "5题·打卡练习",
      href: "/zhongyi/exam/daily",
      icon: Calendar,
      color: "#E65100",
      bgColor: "#FFF3E0",
    },
    {
      key: "mock",
      title: "模拟考试",
      desc: "随机抽题·计时测验",
      href: "/zhongyi/exam/mock",
      icon: FileText,
      color: "#1565C0",
      bgColor: "#E3F2FD",
    },
    {
      key: "wrong",
      title: "错题本",
      desc: `${stats.wrongCount}道错题待复习`,
      href: "/zhongyi/exam/wrong",
      icon: BookX,
      color: "#C62828",
      bgColor: "#FFEBEE",
    },
    {
      key: "favorites",
      title: "我的收藏",
      desc: `${stats.favCount}道收藏题目`,
      href: "/zhongyi/exam/favorites",
      icon: Star,
      color: "#F9A825",
      bgColor: "#FFFDE7",
    },
    {
      key: "stats",
      title: "学习统计",
      desc: "数据分析·薄弱点",
      href: "/zhongyi/exam/stats",
      icon: BarChart3,
      color: BRAND,
      bgColor: BRAND_BG,
    },
  ];

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
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
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
          <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0, flex: 1 }}>医考题库</h1>
        </div>

        {/* 搜索栏 */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "white",
              borderRadius: "20px",
              padding: "8px 14px",
            }}
          >
            <Search size={18} color="#999" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索题目、知识点..."
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: "14px",
                background: "transparent",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setShowResults(false);
                }}
                style={{ background: "none", border: "none", color: "#999", cursor: "pointer", padding: "2px" }}
              >
                ✕
              </button>
            )}
          </div>

          {/* 搜索结果下拉 */}
          {showResults && searchResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: "6px",
                background: "white",
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                maxHeight: "360px",
                overflowY: "auto",
                zIndex: 200,
              }}
            >
              {searchResults.map((q) => (
                <button
                  key={q.id}
                  onClick={() => {
                    setSearchQuery("");
                    setShowResults(false);
                    router.push(
                      `/zhongyi/exam/practice?subjectId=${q.subjectId}&chapterId=${q.chapterId}&highlightId=${q.id}`
                    );
                  }}
                  style={{
                    width: "100%",
                    display: "block",
                    padding: "10px 14px",
                    border: "none",
                    background: "white",
                    textAlign: "left",
                    cursor: "pointer",
                    borderBottom: "1px solid #f5f5f5",
                  }}
                >
                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "2px 6px",
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
                        flexShrink: 0,
                      }}
                    >
                      {q.subject}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#333",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        flex: 1,
                      }}
                    >
                      {q.question}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 统计概览 */}
      <div style={{ padding: "16px 12px 0" }}>
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: BRAND }}>{stats.totalQuestions}</div>
              <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>总题数</div>
            </div>
            <div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "#1565C0" }}>{stats.practiced}</div>
              <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>已练习</div>
            </div>
            <div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "#10B981" }}>{stats.correctRate}%</div>
              <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>正确率</div>
            </div>
            <div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "#E65100" }}>{stats.studyDays}</div>
              <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>学习天数</div>
            </div>
          </div>
        </div>
      </div>

      {/* 快捷操作 */}
      <div style={{ padding: "12px 12px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          {quickActions.map((a) => (
            <Link
              key={a.key}
              href={a.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                padding: "14px 8px",
                borderRadius: "16px",
                background: "white",
                textDecoration: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  backgroundColor: a.bgColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <a.icon size={20} color={a.color} />
              </div>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#333" }}>{a.title}</div>
              <div style={{ fontSize: "10px", color: "#999", textAlign: "center", lineHeight: 1.3 }}>{a.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* 科目卡片 */}
      <div style={{ padding: "16px 12px 0" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "bold", color: "#333", margin: "0 0 10px" }}>科目练习</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} />
          ))}
        </div>
      </div>

      {/* 底部合规提示 */}
      <p style={{ textAlign: "center", fontSize: 12, color: "#999", padding: "16px 0" }}>{COMPLIANCE_TEXT}</p>
    </div>
  );
}

function SubjectCard({ subject }: { subject: ExamSubject }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Calculate actual progress from localStorage
    const ls = getLearningStats();
    const subjStat = ls.subjectStats.find((s) => s.subjectId === subject.id);
    if (subjStat) {
      setProgress(Math.min(100, Math.round((subjStat.answered / subject.questionCount) * 100)));
    }
  }, [subject.id, subject.questionCount]);

  return (
    <Link
      href={`/zhongyi/exam/practice?subjectId=${subject.id}`}
      style={{
        display: "block",
        padding: "14px",
        borderRadius: "16px",
        background: "white",
        textDecoration: "none",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            backgroundColor: subject.bgColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
          }}
        >
          {subject.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>{subject.name}</div>
          <div style={{ fontSize: "11px", color: "#999" }}>{subject.questionCount}题</div>
        </div>
        <ChevronRight size={16} color="#ccc" />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            flex: 1,
            height: "6px",
            borderRadius: "3px",
            backgroundColor: "#f0f0f0",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              borderRadius: "3px",
              backgroundColor: subject.color,
              transition: "width 0.3s",
            }}
          />
        </div>
        <span style={{ fontSize: "11px", color: "#999", flexShrink: 0 }}>{progress}%</span>
      </div>
    </Link>
  );
}
