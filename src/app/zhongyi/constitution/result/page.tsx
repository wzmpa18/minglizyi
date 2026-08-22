"use client";

import { SectionGate } from "@/components/SectionGate";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getConstitutionById,
  saveResult,
  COMPLIANCE_TEXT,
  getConstitutionTypes,
} from "@/algorithm-core/modules/tcm/constitution";
import type { ConstitutionResult } from "@/algorithm-core/modules/tcm/constitution";
import ClientSelector from "@/components/ClientSelector";
import { saveRecord } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#F3EDF7";

function getScoreLevel(score: number): { label: string; color: string } {
  if (score >= 60) return { label: "明显", color: "#C62828" };
  if (score >= 40) return { label: "是", color: "#E65100" };
  if (score >= 30) return { label: "倾向", color: "#FF9800" };
  return { label: "否", color: "#4CAF50" };
}

function ConstitutionResultInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromHistory = searchParams.get("from") === "history";
  const [result, setResult] = useState<ConstitutionResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedToClient, setSavedToClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    try {
      const key = fromHistory ? "tcm_constitution_view_result" : "tcm_constitution_result";
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed: ConstitutionResult = JSON.parse(raw);
        // Re-hydrate constitution types from data (in case stored data is stale)
        const primaryType = getConstitutionById(parsed.primaryType.id);
        if (primaryType) {
          parsed.primaryType = primaryType;
        }
        parsed.secondaryTypes = parsed.secondaryTypes
          .map((t) => getConstitutionById(t.id))
          .filter(Boolean) as typeof parsed.secondaryTypes;
        setResult(parsed);
      }
    } catch {
      // ignore
    }
  }, [fromHistory]);

  const allTypes = useMemo(() => getConstitutionTypes(), []);

  const handleSave = () => {
    if (!result || saved) return;
    saveResult(result);
    setSaved(true);
  };

  const handleSaveToClient = () => {
    if (!result || !selectedClient || savedToClient) return;
    saveRecord({
      clientId: selectedClient.id,
      type: "tcm-constitution",
      data: {
        primaryTypeName: result.primaryType.name,
        primaryTypeId: result.primaryType.id,
        isBalanced: result.isBalanced,
        scores: result.scores,
        secondaryTypes: result.secondaryTypes.map(t => ({ id: t.id, name: t.name })),
        date: result.date,
      },
      note: `体质测评结果：${result.primaryType.name}${result.isBalanced ? "（健康体质）" : "（偏颇体质）"}`,
      status: "pending",
    });
    setSavedToClient(true);
  };

  const handleRetake = () => {
    try {
      sessionStorage.removeItem("tcm_constitution_result");
    } catch {
      // ignore
    }
    router.push("/zhongyi/constitution/quiz");
  };

  const handleHome = () => {
    router.push("/zhongyi/constitution");
  };

  if (!result) {
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
        <div style={{ textAlign: "center", color: "#999" }}>
          <p style={{ fontSize: "14px" }}>未找到测评结果</p>
          <button
            onClick={handleHome}
            style={{
              marginTop: "16px",
              padding: "8px 20px",
              borderRadius: "20px",
              backgroundColor: BRAND,
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const { primaryType, secondaryTypes, scores, isBalanced } = result;

  // Sort scores by convertedScore desc for bar chart
  const sortedScores = [...scores].sort((a, b) => b.convertedScore - a.convertedScore);
  const primaryScore = scores.find((s) => s.id === primaryType.id)?.convertedScore || 0;

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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={handleHome}
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
          <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0, flex: 1 }}>测评结果</h1>
          <span style={{ fontSize: "11px", opacity: 0.8 }}>{result.date}</span>
        </div>
      </div>

      {/* 主要体质结果 */}
      <div style={{ padding: "16px 12px 0" }}>
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "12px", color: "#999", marginBottom: "8px" }}>您的主要体质类型是</div>
          <div style={{ fontSize: "56px", marginBottom: "8px" }}>{primaryType.icon}</div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: primaryType.color,
              marginBottom: "4px",
            }}
          >
            {primaryType.name}
          </div>
          <div style={{ fontSize: "12px", color: "#999", marginBottom: "12px" }}>{primaryType.pinyin}</div>
          <div
            style={{
              display: "inline-block",
              padding: "4px 16px",
              borderRadius: "20px",
              backgroundColor: primaryType.bgColor,
              color: primaryType.color,
              fontSize: "13px",
              fontWeight: "bold",
            }}
          >
            {isBalanced ? "健康体质" : "偏颇体质"} · {primaryScore}分
          </div>
          {isBalanced && (
            <p style={{ fontSize: "12px", color: "#2E7D32", marginTop: "12px", margin: "12px auto 0", maxWidth: "280px", lineHeight: 1.6 }}>
              恭喜！您的体质状态良好，阴阳气血调和，请继续保持健康的生活方式。
            </p>
          )}
        </div>
      </div>

      {/* 兼夹体质 */}
      {secondaryTypes.length > 0 && (
        <div style={{ padding: "12px 12px 0" }}>
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 10px" }}>
              🔍 兼夹体质倾向
            </h3>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {secondaryTypes.map((t) => {
                const s = scores.find((sc) => sc.id === t.id)?.convertedScore || 0;
                return (
                  <div
                    key={t.id}
                    style={{
                      flex: "1",
                      minWidth: "100px",
                      padding: "12px",
                      borderRadius: "12px",
                      backgroundColor: t.bgColor,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "28px", marginBottom: "4px" }}>{t.icon}</div>
                    <div style={{ fontSize: "13px", fontWeight: "bold", color: t.color }}>{t.name}</div>
                    <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>{s}分 · 倾向</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 体质得分条形图 */}
      <div style={{ padding: "12px 12px 0" }}>
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 14px" }}>
            📊 各体质得分
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {allTypes.map((type) => {
              const s = scores.find((sc) => sc.id === type.id);
              const scoreVal = s?.convertedScore || 0;
              const level = getScoreLevel(scoreVal);
              const isPrimary = type.id === primaryType.id;
              return (
                <div key={type.id}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "16px" }}>{type.icon}</span>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: isPrimary ? "bold" : "normal",
                          color: isPrimary ? type.color : "#333",
                        }}
                      >
                        {type.name}
                      </span>
                      {isPrimary && (
                        <span
                          style={{
                            fontSize: "9px",
                            padding: "1px 5px",
                            borderRadius: "3px",
                            backgroundColor: type.bgColor,
                            color: type.color,
                          }}
                        >
                          主要
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "11px", color: level.color }}>{level.label}</span>
                      <span style={{ fontSize: "13px", fontWeight: "bold", color: type.color, minWidth: "30px", textAlign: "right" }}>
                        {scoreVal}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      height: "8px",
                      backgroundColor: "#f5f5f5",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${scoreVal}%`,
                        borderRadius: "4px",
                        background: isPrimary
                          ? `linear-gradient(90deg, ${type.color} 0%, ${type.color}cc 100%)`
                          : type.color,
                        opacity: isPrimary ? 1 : 0.6,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 主要体质详细分析 */}
      <div style={{ padding: "12px 12px 0" }}>
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 14px" }}>
            {primaryType.icon} {primaryType.name} · 详细分析
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { label: "总体特征", content: primaryType.features },
              { label: "形体特征", content: primaryType.physicalTraits },
              { label: "常见表现", content: primaryType.commonManifestations },
              { label: "心理特征", content: primaryType.psychologicalTraits },
              { label: "发病倾向", content: primaryType.diseaseTendency },
              { label: "适应能力", content: primaryType.adaptability },
            ].map((item) => (
              <div key={item.label}>
                <div style={{ fontSize: "12px", color: primaryType.color, fontWeight: "bold", marginBottom: "4px" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: "13px", color: "#555", lineHeight: 1.7 }}>{item.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 调养建议 */}
      <div style={{ padding: "12px 12px 0" }}>
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 14px" }}>
            💡 养生调理建议
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[
              { label: "饮食调养", icon: "🍲", content: primaryType.healthAdvice.diet },
              { label: "运动保健", icon: "🏃", content: primaryType.healthAdvice.exercise },
              { label: "穴位保健", icon: "📍", content: primaryType.healthAdvice.acupoints },
              { label: "生活起居", icon: "🏠", content: primaryType.healthAdvice.lifestyle },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  backgroundColor: primaryType.bgColor,
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: "bold", color: primaryType.color, marginBottom: "6px" }}>
                  {item.icon} {item.label}
                </div>
                <div style={{ fontSize: "12px", color: "#555", lineHeight: 1.7 }}>{item.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div style={{ padding: "16px 12px 0" }}>
        {/* 客户档案保存区 */}
        <div style={{ marginBottom: "12px" }}>
          <ClientSelector
            onSelect={setSelectedClient}
            selectedClient={selectedClient}
          />
          <button
            onClick={handleSaveToClient}
            disabled={!selectedClient || savedToClient || fromHistory}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              background:
                !selectedClient || savedToClient || fromHistory
                  ? "#e0e0e0"
                  : `linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)`,
              color: !selectedClient || savedToClient || fromHistory ? "#999" : "white",
              fontSize: "14px",
              fontWeight: "bold",
              cursor: !selectedClient || savedToClient || fromHistory ? "default" : "pointer",
              boxShadow: !selectedClient || savedToClient || fromHistory ? "none" : "0 2px 8px rgba(76,175,80,0.3)",
            }}
          >
            {savedToClient
              ? "✓ 已保存到客户档案（中医服务记录）"
              : fromHistory
              ? "历史记录中的结果"
              : selectedClient
              ? `保存到「${selectedClient.name}」的中医服务记录`
              : "请先选择客户以保存到档案"}
          </button>
          <p style={{ fontSize: "11px", color: "#999", textAlign: "center", marginTop: "6px" }}>
            医考学习数据暂不接入客户档案
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={handleSave}
            disabled={saved || fromHistory}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              background:
                saved || fromHistory
                  ? "#e0e0e0"
                  : `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
              color: saved || fromHistory ? "#999" : "white",
              fontSize: "15px",
              fontWeight: "bold",
              cursor: saved || fromHistory ? "default" : "pointer",
              boxShadow: saved || fromHistory ? "none" : "0 2px 8px rgba(123,47,190,0.3)",
            }}
          >
            {saved ? "✓ 已保存到历史记录" : fromHistory ? "历史记录中的结果" : "保存结果到历史"}
          </button>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleRetake}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid #ddd",
                background: "white",
                color: "#666",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              重新测评
            </button>
            <button
              onClick={handleHome}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid #ddd",
                background: "white",
                color: "#666",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              返回首页
            </button>
          </div>
        </div>
      </div>

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

function ConstitutionResultPageOriginal() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f8f5fc",
          }}
        >
          <div style={{ textAlign: "center", color: BRAND }}>加载中...</div>
        </div>
      }
    >
      <ConstitutionResultInner />
    </Suspense>
  );
}

// v25.0.47_12: 中医板块知识开放程度门控（后台工具矩阵实时控制：开放/会员专享/维护/关闭）
export default function ConstitutionResultPage() {
  return (
    <SectionGate toolId="zhongyi_constitution" title="体质测评">
      <ConstitutionResultPageOriginal />
    </SectionGate>
  );
}
