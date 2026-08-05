/**
 * 统一解读抽屉组件 v18.2
 * 全局统一解读抽屉样式：右上角关闭按钮、内容可滚动、不遮挡原排盘核心内容
 * AI生成内容标注「AI 参考」
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { callAI } from "@/lib/aiService";

export interface InterpretationItem {
  type: string;
  label: string;
  content: string;
  isAI?: boolean;
}

export interface InterpretationDrawerProps {
  show: boolean;
  title: string;
  items: InterpretationItem[];
  onClose: () => void;
  aiEnhance?: {
    toolName: string;
    context: string;
    existingClassic?: string;
  };
  typeColors?: Record<string, { bg: string; fg: string; label: string }>;
}

const DEFAULT_TYPE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  source: { bg: "#fef3c7", fg: "#92400e", label: "原文出处" },
  summary: { bg: "#e0f2fe", fg: "#0369a1", label: "基础释义" },
  jixiong: { bg: "#fef2f2", fg: "#dc2626", label: "吉凶定性" },
  usage: { bg: "#f0fdf4", fg: "#15803d", label: "使用说明" },
  ai: { bg: "#f3e8ff", fg: "#7B2FBE", label: "AI 参考" },
  default: { bg: "#f3f4f6", fg: "#374151", label: "解读" },
};

export default function InterpretationDrawer({
  show, title, items, onClose, aiEnhance, typeColors,
}: InterpretationDrawerProps) {
  const [aiContent, setAiContent] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const colors = { ...DEFAULT_TYPE_COLORS, ...typeColors };

  useEffect(() => {
    if (!show || !aiEnhance) return;
    let cancelled = false;
    async function loadAI() {
      setAiLoading(true); setAiError(false);
      try {
        const result = await callAI({
          systemPrompt: "你是专业易学大师。请补充解读：1.吉凶定性 2.使用说明 3.经典引述。标注「AI 参考」。",
          userPrompt: `工具：${aiEnhance!.toolName}\n${aiEnhance!.context}\n${aiEnhance!.existingClassic ? "已有：" + aiEnhance!.existingClassic : ""}`,
          cacheKey: `drawer_${aiEnhance!.toolName}_${aiEnhance!.context.slice(0, 60)}`,
        });
        if (!cancelled) setAiContent(result.content);
      } catch { if (!cancelled) setAiError(true); }
      finally { if (!cancelled) setAiLoading(false); }
    }
    loadAI();
    return () => { cancelled = true; };
  }, [show, aiEnhance]);

  useEffect(() => {
    document.body.style.overflow = show ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [show]);

  if (!show) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: "420px", maxHeight: "75vh", backgroundColor: "#fff", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", display: "flex", flexDirection: "column", overflow: "hidden", animation: "slideUp18 0.3s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #f0f0f0", flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: "12px" }}>{title}</h3>
          <button onClick={onClose} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "none", backgroundColor: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }} title="关闭">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", WebkitOverflowScrolling: "touch" }}>
          {items.map((item, idx) => {
            const tc = colors[item.type] || colors["default"];
            return (
              <div key={idx} style={{ marginBottom: idx < items.length - 1 ? "12px" : 0, padding: "12px", borderRadius: "10px", backgroundColor: tc.bg, border: `1px solid ${tc.fg}20` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, backgroundColor: tc.fg, color: "#fff" }}>{item.isAI ? "AI 参考" : tc.label}</span>
                  {item.isAI && <span style={{ fontSize: "10px", color: "#9ca3af" }}>AI生成内容，仅供参考</span>}
                </div>
                <div style={{ fontSize: "14px", lineHeight: "1.7", color: "#333", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{item.content}</div>
              </div>
            );
          })}
          {aiEnhance && (
            <div style={{ marginTop: "12px" }}>
              {aiLoading && <div style={{ padding: "16px", borderRadius: "10px", backgroundColor: "#f3e8ff", textAlign: "center", color: "#7B2FBE", fontSize: "13px" }}>AI 正在生成补充解读...</div>}
              {aiError && <div style={{ padding: "12px", borderRadius: "10px", backgroundColor: "#fef3c7", color: "#92400e", fontSize: "13px", textAlign: "center" }}>AI解读服务暂时不可用，已展示经典解读内容</div>}
              {aiContent && (
                <div style={{ padding: "12px", borderRadius: "10px", backgroundColor: "#f3e8ff", border: "1px solid #7B2FBE20" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, backgroundColor: "#7B2FBE", color: "#fff" }}>AI 参考</span>
                    <span style={{ fontSize: "10px", color: "#9ca3af" }}>AI生成内容，仅供参考</span>
                  </div>
                  <div style={{ fontSize: "14px", lineHeight: "1.7", color: "#4a1d8a", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{aiContent}</div>
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ height: "env(safe-area-inset-bottom, 0px)", flexShrink: 0 }} />
        <style>{`@keyframes slideUp18{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      </div>
    </div>
  );
}