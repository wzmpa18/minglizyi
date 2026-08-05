"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getConstitutionTypes,
  getQuestionnaire,
  getHistory,
  COMPLIANCE_TEXT,
} from "@/algorithm-core/modules/tcm/constitution";
import type { ConstitutionType, ConstitutionResult } from "@/algorithm-core/modules/tcm/constitution";

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#F3EDF7";

// 简短描述映射
const SHORT_DESC: Record<string, string> = {
  pinghe: "阴阳调和，健康态",
  qixu: "元气不足，易疲乏",
  yangxu: "阳气不足，畏寒冷",
  yinxu: "阴液亏少，口干燥",
  tanshi: "痰湿凝聚，体肥满",
  shire: "湿热内蕴，面油光",
  xueyu: "血行不畅，肤色黯",
  qiyu: "气机郁滞，情抑郁",
  tebing: "先天特异，易过敏",
};

export default function ConstitutionHome() {
  const router = useRouter();
  const [types, setTypes] = useState<ConstitutionType[]>([]);
  const [history, setHistory] = useState<ConstitutionResult[]>([]);
  const [questionCount, setQuestionCount] = useState(0);

  useEffect(() => {
    setTypes(getConstitutionTypes());
    setQuestionCount(getQuestionnaire().length);
    setHistory(getHistory());
  }, []);

  const handleStart = () => {
    router.push("/zhongyi/constitution/quiz");
  };

  const handleHistoryClick = (result: ConstitutionResult) => {
    // Navigate to result page with result data stored in sessionStorage
    try {
      sessionStorage.setItem("tcm_constitution_view_result", JSON.stringify(result));
      router.push("/zhongyi/constitution/result?from=history");
    } catch {
      // ignore
    }
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>中医体质测评</h1>
          <p style={{ fontSize: "10px", opacity: 0.7, margin: "2px 0 0 0", color: "rgba(255,255,255,0.8)" }}>yandao.vip 分享下载有礼</p>
            <p style={{ fontSize: "11px", opacity: 0.8, margin: 0 }}>九种体质辨识 · 国家标准</p>
          </div>
        </div>
      </div>

      {/* 介绍卡片 */}
      <div style={{ padding: "16px 12px 0" }}>
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: BRAND_BG,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "24px",
              }}
            >
              🧬
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: "15px", fontWeight: "bold", color: "#333", margin: "0 0 6px" }}>
                什么是中医体质辨识？
              </h2>
              <p style={{ fontSize: "12px", color: "#666", lineHeight: 1.7, margin: 0 }}>
                体质辨识是根据中华中医药学会《中医体质分类与判定》标准，通过问卷测评将人群分为九种体质类型。
                了解自身体质有助于针对性地进行养生保健、饮食调养和运动锻炼。
              </p>
              <p style={{ fontSize: "11px", color: "#999", lineHeight: 1.5, margin: "8px 0 0" }}>
                共 {questionCount} 道题目，约需 3-5 分钟完成
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 开始测评按钮 */}
      <div style={{ padding: "16px 12px 0" }}>
        <button
          onClick={handleStart}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "16px",
            border: "none",
            background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
            color: "white",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(123,47,190,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          开始测评
        </button>
      </div>

      {/* 九种体质概览 */}
      <div style={{ padding: "16px 12px 0" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "bold", color: "#333", margin: "0 0 10px" }}>
          📋 九种体质类型
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          {types.map((type) => (
            <div
              key={type.id}
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "12px 8px",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: "28px", marginBottom: "4px" }}>{type.icon}</div>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: type.color, marginBottom: "2px" }}>
                {type.name}
              </div>
              <div style={{ fontSize: "10px", color: "#999", lineHeight: 1.3 }}>
                {SHORT_DESC[type.id] || ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 历史记录 */}
      {history.length > 0 && (
        <div style={{ padding: "16px 12px 0" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "bold", color: "#333", margin: "0 0 10px" }}>
            🕐 历史记录
          </h2>
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            {history.slice(0, 5).map((item, i) => (
              <button
                key={item.id}
                onClick={() => handleHistoryClick(item)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  border: "none",
                  background: i % 2 === 0 ? "white" : "#fafafa",
                  textAlign: "left",
                  cursor: "pointer",
                  borderBottom: i < Math.min(history.length, 5) - 1 ? "1px solid #f5f5f5" : "none",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    backgroundColor: item.primaryType.bgColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    flexShrink: 0,
                  }}
                >
                  {item.primaryType.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: "bold", color: item.primaryType.color }}>
                    {item.primaryType.name}
                    {item.secondaryTypes.length > 0 && (
                      <span style={{ fontSize: "11px", color: "#999", fontWeight: "normal" }}>
                        {" "}
                        (兼{item.secondaryTypes.map((t) => t.name).join("、")})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>{item.date}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 合规提示 */}
      <div
        style={{
          margin: "16px 12px 0",
          padding: "10px 14px",
          backgroundColor: "#fff8e1",
          borderRadius: "12px",
          border: "1px solid #ffecb3",
        }}
      >
        <p style={{ margin: 0, fontSize: "11px", color: "#f57f17", textAlign: "center", lineHeight: 1.5 }}>
          ⚠️ {COMPLIANCE_TEXT}
        </p>
      </div>
    </div>
  );
}
