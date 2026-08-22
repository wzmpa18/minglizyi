"use client";

import { SectionGate } from "@/components/SectionGate";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  getQuestionnaire,
  calculateConstitution,
} from "@/algorithm-core/modules/tcm/constitution";

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#F3EDF7";

const OPTIONS = [
  { value: 1, label: "没有", desc: "根本没有" },
  { value: 2, label: "很少", desc: "偶尔有" },
  { value: 3, label: "有时", desc: "约一半时间" },
  { value: 4, label: "经常", desc: "相当多时间" },
  { value: 5, label: "总是", desc: "几乎每天" },
];

function ConstitutionQuizOriginal() {
  const router = useRouter();
  const questions = useMemo(() => getQuestionnaire(), []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const total = questions.length;
  const currentQ = questions[currentIndex];
  const currentAnswer = answers[currentQ?.id];
  const answeredCount = Object.keys(answers).length;
  const progress = ((currentIndex + 1) / total) * 100;
  const isLastQuestion = currentIndex === total - 1;
  const canGoNext = currentAnswer !== undefined;

  const handleSelect = (value: number) => {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: value }));
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (!canGoNext) return;
    if (isLastQuestion) {
      // Calculate result and navigate to result page
      const result = calculateConstitution(answers);
      try {
        sessionStorage.setItem("tcm_constitution_result", JSON.stringify(result));
      } catch {
        // ignore
      }
      router.push("/zhongyi/constitution/result");
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleBack = () => {
    if (answeredCount > 0) {
      const confirmed = window.confirm("确定要退出测评吗？当前答题进度将不会保存。");
      if (!confirmed) return;
    }
    router.push("/zhongyi/constitution");
  };

  return (
    <div
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        minHeight: "100vh",
        backgroundColor: "#f8f5fc",
        paddingBottom: "120px",
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
            onClick={handleBack}
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: 0 }}>体质测评</h1>
            <p style={{ fontSize: "11px", opacity: 0.8, margin: 0 }}>
              第 {currentIndex + 1} / {total} 题
            </p>
          </div>
          <span style={{ fontSize: "12px", opacity: 0.8 }}>
            已答 {answeredCount} 题
          </span>
        </div>

        {/* 进度条 */}
        <div
          style={{
            height: "6px",
            background: "rgba(255,255,255,0.3)",
            borderRadius: "3px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "white",
              borderRadius: "3px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* 问题卡片 */}
      <div style={{ padding: "20px 16px" }}>
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "20px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: BRAND,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: "bold",
                flexShrink: 0,
              }}
            >
              {currentIndex + 1}
            </div>
            <p style={{ fontSize: "16px", color: "#333", lineHeight: 1.7, margin: 0, fontWeight: "500" }}>
              {currentQ.text}
            </p>
          </div>

          {/* 选项 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {OPTIONS.map((opt) => {
              const isSelected = currentAnswer === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    border: isSelected ? `2px solid ${BRAND}` : "2px solid #f0f0f0",
                    background: isSelected ? BRAND_BG : "white",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      border: isSelected ? `6px solid ${BRAND}` : "2px solid #ddd",
                      background: isSelected ? "white" : "white",
                      flexShrink: 0,
                      transition: "all 0.15s ease",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: isSelected ? "bold" : "normal",
                        color: isSelected ? BRAND : "#333",
                      }}
                    >
                      {opt.label}
                      <span style={{ fontSize: "12px", color: "#999", fontWeight: "normal", marginLeft: "8px" }}>
                        {opt.value}分
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 提示信息 */}
        <div
          style={{
            padding: "10px 14px",
            backgroundColor: "#f0f0f0",
            borderRadius: "10px",
            marginBottom: "16px",
          }}
        >
          <p style={{ margin: 0, fontSize: "11px", color: "#666", textAlign: "center", lineHeight: 1.5 }}>
            请根据近一年的体验和感觉，如实选择最符合您情况的选项
          </p>
        </div>
      </div>

      {/* 底部导航按钮 */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: "420px",
          margin: "0 auto",
          padding: "12px 16px",
          background: "white",
          borderTop: "1px solid #f0f0f0",
          display: "flex",
          gap: "10px",
          zIndex: 50,
        }}
      >
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "12px",
            border: currentIndex === 0 ? "1px solid #e0e0e0" : "1px solid #ddd",
            background: currentIndex === 0 ? "#f5f5f5" : "white",
            color: currentIndex === 0 ? "#ccc" : "#666",
            fontSize: "14px",
            fontWeight: "500",
            cursor: currentIndex === 0 ? "not-allowed" : "pointer",
          }}
        >
          上一题
        </button>
        <button
          onClick={handleNext}
          disabled={!canGoNext}
          style={{
            flex: 2,
            padding: "12px",
            borderRadius: "12px",
            border: "none",
            background: canGoNext
              ? `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`
              : "#e0e0e0",
            color: canGoNext ? "white" : "#999",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: canGoNext ? "pointer" : "not-allowed",
            boxShadow: canGoNext ? "0 2px 8px rgba(123,47,190,0.3)" : "none",
          }}
        >
          {isLastQuestion ? "查看结果" : "下一题"}
        </button>
      </div>

      <p style={{ textAlign: "center", fontSize: 12, color: "#999", padding: "16px 0" }}>
        体质测评仅供学习参考，不作为诊断依据
      </p>
    </div>
  );
}

// v25.0.47_12: 中医板块知识开放程度门控（后台工具矩阵实时控制：开放/会员专享/维护/关闭）
export default function ConstitutionQuiz() {
  return (
    <SectionGate toolId="zhongyi_constitution" title="体质测评">
      <ConstitutionQuizOriginal />
    </SectionGate>
  );
}
