"use client";

import { SectionGate } from "@/components/SectionGate";
import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Target,
  Clock,
  Flame,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import {
  getSubjects,
  getLearningStats,
  getWeakTopics,
  COMPLIANCE_TEXT,
  type LearningStats as LS,
  type WeakTopic,
} from "@/algorithm-core/modules/tcm/exam";

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const CORRECT_COLOR = "#10B981";
const WRONG_COLOR = "#EF4444";

function StatsPageOriginal() {
  const router = useRouter();
  const [stats, setStats] = useState<LS | null>(null);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);

  const subjects = useMemo(() => getSubjects(), []);

  useEffect(() => {
    setStats(getLearningStats());
    setWeakTopics(getWeakTopics(5));
  }, []);

  // Last 7 days data
  const last7Days = useMemo(() => {
    if (!stats) return [];
    const days: { date: string; label: string; count: number }[] = [];
    const today = new Date();
    const activityMap = new Map(stats.dailyActivity.map((d) => [d.date, d.count]));

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayLabels = ["日", "一", "二", "三", "四", "五", "六"];
      days.push({
        date: dateStr,
        label: dayLabels[d.getDay()],
        count: activityMap.get(dateStr) || 0,
      });
    }
    return days;
  }, [stats]);

  const maxDayCount = useMemo(() => {
    return Math.max(...last7Days.map((d) => d.count), 1);
  }, [last7Days]);

  // Subject progress (combining stats with subject info)
  const subjectStatsData = useMemo(() => {
    if (!stats) return [];
    return subjects.map((s) => {
      const ss = stats.subjectStats.find((x) => x.subjectId === s.id);
      return {
        ...s,
        answered: ss?.answered || 0,
        correct: ss?.correct || 0,
        rate: ss?.rate || 0,
        progress: Math.min(100, Math.round(((ss?.answered || 0) / s.questionCount) * 100)),
      };
    });
  }, [stats, subjects]);

  // Recommendations
  const recommendations = useMemo(() => {
    const recs: string[] = [];
    if (!stats) return recs;

    if (stats.correctRate < 60) {
      recs.push("建议先从基础理论开始系统复习，正确率较低需加强基础知识掌握。");
    }
    if (weakTopics.length > 0) {
      recs.push(`重点攻克薄弱知识点：${weakTopics.slice(0, 3).map((w) => w.topic).join("、")}。`);
    }
    const lowSubjects = subjectStatsData.filter((s) => s.rate > 0 && s.rate < 50);
    if (lowSubjects.length > 0) {
      recs.push(`${lowSubjects.map((s) => s.name).join("、")}正确率较低，建议多做专项练习。`);
    }
    if (stats.streakDays === 0) {
      recs.push("开始每日一练打卡，保持学习连续性效果更好。");
    } else if (stats.streakDays < 7) {
      recs.push(`已连续学习${stats.streakDays}天，坚持打卡7天以上效果更佳！`);
    } else {
      recs.push(`已连续学习${stats.streakDays}天，保持势头继续加油！`);
    }
    if (stats.totalAnswered < 100) {
      recs.push("多做练习题，熟能生巧，建议每天完成至少20道题。");
    }
    if (recs.length === 0) {
      recs.push("学习状态良好，继续保持！可尝试模拟考试检验综合水平。");
    }
    return recs;
  }, [stats, weakTopics, subjectStatsData]);

  if (!stats) {
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
          <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>学习统计</h1>
        </div>
      </div>

      <div style={{ padding: "16px 12px" }}>
        {/* Top metrics */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <MetricCard icon={<Target size={20} />} label="总做题数" value={stats.totalAnswered} unit="题" color="#1565C0" />
            <MetricCard
              icon={<TrendingUp size={20} />}
              label="总正确率"
              value={stats.correctRate}
              unit="%"
              color={stats.correctRate >= 60 ? CORRECT_COLOR : WRONG_COLOR}
            />
            <MetricCard icon={<Clock size={20} />} label="学习时长" value={stats.totalStudyTime} unit="分钟" color="#7B1FA2" />
            <MetricCard icon={<Flame size={20} />} label="连续打卡" value={stats.streakDays} unit="天" color="#E65100" />
          </div>
        </div>

        {/* 7-day trend */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            marginBottom: "12px",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 16px" }}>
            近7天做题趋势
          </h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "120px", paddingBottom: "24px" }}>
            {last7Days.map((d) => {
              const height = d.count > 0 ? Math.max(8, (d.count / maxDayCount) * 100) : 4;
              return (
                <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "10px", color: "#999" }}>{d.count > 0 ? d.count : ""}</span>
                  <div
                    style={{
                      width: "100%",
                      maxWidth: "32px",
                      height: `${height}px`,
                      borderRadius: "4px 4px 0 0",
                      background: d.count > 0 ? `linear-gradient(180deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)` : "#f0f0f0",
                      transition: "height 0.3s",
                    }}
                  />
                  <span style={{ fontSize: "10px", color: "#999", position: "absolute", marginTop: "104px" }}>
                    {d.label}
                  </span>
                </div>
              );
            })}
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
          <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 12px" }}>分科进度</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {subjectStatsData.map((s) => (
              <div key={s.id}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "14px" }}>{s.icon}</span>
                    <span style={{ fontSize: "13px", color: "#333", fontWeight: 500 }}>{s.name}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#999" }}>
                    {s.answered}/{s.questionCount}题
                    {s.answered > 0 && (
                      <span style={{ color: s.rate >= 60 ? CORRECT_COLOR : WRONG_COLOR, marginLeft: "6px", fontWeight: "bold" }}>
                        {s.rate}%
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ height: "8px", borderRadius: "4px", background: "#f0f0f0", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${s.progress}%`,
                      height: "100%",
                      borderRadius: "4px",
                      background: s.color,
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weak topics */}
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
            <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 10px", display: "flex", alignItems: "center", gap: "6px" }}>
              <AlertTriangle size={14} color={WRONG_COLOR} />
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
                    background: "#FEF2F2",
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
                    <div style={{ fontSize: "12px", color: "#333", fontWeight: 500 }}>{wt.topic}</div>
                    <div style={{ fontSize: "10px", color: "#999" }}>{wt.subjectName}</div>
                  </div>
                  <span style={{ fontSize: "11px", color: WRONG_COLOR, fontWeight: "bold" }}>错{wt.wrongCount}次</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            marginBottom: "12px",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 10px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Lightbulb size={14} color="#F59E0B" />
            学习建议
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {recommendations.map((rec, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  fontSize: "12px",
                  color: "#666",
                  lineHeight: 1.6,
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: BRAND,
                    flexShrink: 0,
                    marginTop: "6px",
                  }}
                />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p style={{ textAlign: "center", fontSize: 12, color: "#999", padding: "16px 0" }}>{COMPLIANCE_TEXT}</p>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px",
        borderRadius: "12px",
        background: "#fafafa",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          background: color + "15",
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "18px", fontWeight: "bold", color: "#333", lineHeight: 1.2 }}>
          {value}
          <span style={{ fontSize: "12px", fontWeight: "normal", color: "#999", marginLeft: "2px" }}>{unit}</span>
        </div>
        <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>{label}</div>
      </div>
    </div>
  );
}

// v25.0.47_12: 中医板块知识开放程度门控（后台工具矩阵实时控制：开放/会员专享/维护/关闭）
export default function StatsPage() {
  return (
    <SectionGate toolId="zhongyi_exam" title="医考刷题">
      <StatsPageOriginal />
    </SectionGate>
  );
}
