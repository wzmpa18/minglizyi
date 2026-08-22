/**
 * 统一解读抽屉组件 v18.2
 * 全局统一解读抽屉样式：右上角关闭按钮、内容可滚动、不遮挡原排盘核心内容
 * 解读内容标注「参考」
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  callAI,
  getUserPermissionLevel,
  truncateContentForFreeUser,
  isSingleUnlocked,
  generateContentKey,
  activateSingleUnlock,
  SINGLE_UNLOCK_PRICE,
} from "@/lib/aiService";
import { paySingleUnlockAndWait } from "@/lib/paymentService";
import { useNativePayQR } from "@/components/PayQRCodeModal";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";
import { isPaymentsBlocked, IOS_PAYMENT_DISABLED_TIP } from "@/lib/platformGate";

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
  const [aiFullContent, setAiFullContent] = useState<string | null>(null); // v20.1: 完整AI内容
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [aiLocked, setAiLocked] = useState(false); // v20.1: AI内容是否锁定
  const [showSingleUnlock, setShowSingleUnlock] = useState(false); // v20.1: 单次解锁弹窗
  // FINAL-RC-02: iOS 本期不开放任何付费，单次解锁/会员购买入口隐藏
  const [paymentsBlocked, setPaymentsBlocked] = useState(false);

  useEffect(() => {
    setPaymentsBlocked(isPaymentsBlocked());
  }, []);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false); // v20.1: 登录提示弹窗
  const colors = { ...DEFAULT_TYPE_COLORS, ...typeColors };

  useEffect(() => {
    if (!show || !aiEnhance) return;
    let cancelled = false;

    // v20.1: 检查权限等级
    const permLevel = getUserPermissionLevel();
    if (permLevel === "visitor") {
      // 游客不调用AI，仅显示已有内容
      return;
    }

    async function loadAI() {
      setAiLoading(true); setAiError(false); setAiLocked(false);
      try {
        const result = await callAI({
          systemPrompt: "你是专业易学大师。请补充解读：1.吉凶定性 2.使用说明 3.经典引述。标注「AI 参考」。",
          userPrompt: `工具：${aiEnhance!.toolName}\n${aiEnhance!.context}\n${aiEnhance!.existingClassic ? "已有：" + aiEnhance!.existingClassic : ""}`,
          cacheKey: `drawer_${aiEnhance!.toolName}_${aiEnhance!.context.slice(0, 60)}`,
        });

        if (cancelled) return;

        const fullText = result.content;
        setAiFullContent(fullText);

        // v20.1: 根据权限处理内容
        const level = getUserPermissionLevel();
        const cKey = generateContentKey(aiEnhance!.toolName, aiEnhance!.context.slice(0, 80));

        if (level === "member" || isSingleUnlocked(cKey)) {
          setAiContent(fullText);
          setAiLocked(false);
        } else {
          // 免费用户：截取前45%
          const { preview, hiddenLength } = truncateContentForFreeUser(fullText);
          setAiContent(preview);
          setAiLocked(hiddenLength > 50);
        }
      } catch { if (!cancelled) setAiError(true); }
      finally { if (!cancelled) setAiLoading(false); }
    }
    loadAI();
    return () => { cancelled = true; };
  }, [show, aiEnhance]);

  // v25.0.47_9: Native扫码支付弹层（全场景兜底收款通道）
  const { qrModal, openQR } = useNativePayQR();

  // v25.0.47_8: 单次解锁（真实微信支付，成功后本地解锁；FINAL-RC-02: iOS 付费关闭）
  const [unlockPaying, setUnlockPaying] = useState(false);
  const [unlockMsg, setUnlockMsg] = useState("");
  const handleSingleUnlock = async () => {
    if (isPaymentsBlocked()) return; // FINAL-RC-02: iOS 付费关闭，禁止本地解锁购买
    if (!aiEnhance || unlockPaying) return;
    const cKey = generateContentKey(aiEnhance.toolName, aiEnhance.context.slice(0, 80));
    setUnlockPaying(true);
    setUnlockMsg("");
    try {
      const r = await paySingleUnlockAndWait(cKey, SINGLE_UNLOCK_PRICE);
      // v25.0.47_9: Native扫码支付——弹出付款二维码，扫码成功后执行本地解锁
      if (r.ticket) {
        openQR(r.ticket, () => {
          activateSingleUnlock(cKey);
          setShowSingleUnlock(false);
          if (aiFullContent) {
            setAiContent(aiFullContent);
            setAiLocked(false);
          }
        });
        return;
      }
      if (r.paid) {
        activateSingleUnlock(cKey);
        setShowSingleUnlock(false);
        if (aiFullContent) {
          setAiContent(aiFullContent);
          setAiLocked(false);
        }
      } else {
        setUnlockMsg(r.message);
      }
    } finally {
      setUnlockPaying(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = show ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [show]);

  // P1-6: 统一滚动锁
  useBodyScrollLock(show);
  // P1-7: 弹窗返回拦截
  usePopupBackHandler(onClose, show);

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-bottom-sheet modal-slide-up">
        <div className="modal-header">
          <h3 className="modal-header-title">{title}</h3>
          <button className="modal-close-btn" onClick={onClose} title="关闭">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="modal-bottom-sheet-body">
          {items.map((item, idx) => {
            const tc = colors[item.type] || colors["default"];
            return (
              <div key={idx} style={{ marginBottom: idx < items.length - 1 ? "12px" : 0, padding: "12px", borderRadius: "10px", backgroundColor: tc.bg, border: `1px solid ${tc.fg}20` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, backgroundColor: tc.fg, color: "#fff" }}>{item.isAI ? "AI 参考" : tc.label}</span>
                  {item.isAI && <span style={{ fontSize: "10px", color: "#9ca3af" }}>内容仅供参考</span>}
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
                    <span style={{ fontSize: "10px", color: "#9ca3af" }}>内容仅供参考</span>
                  </div>
                  <div style={{ fontSize: "14px", lineHeight: "1.7", color: "#4a1d8a", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{aiContent}</div>

                  {/* v20.1: 免费用户内容锁定 */}
                  {aiLocked && (
                    <div style={{ marginTop: "10px", padding: "12px 8px", background: "#fff", borderRadius: "8px", border: "1px solid #e0d0f0", textAlign: "center" }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7B2FBE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <div style={{ fontSize: "11px", color: "#7B2FBE", fontWeight: "bold", marginTop: "4px" }}>后续深度内容已锁定</div>
                      {paymentsBlocked ? (
                        <div style={{ fontSize: "10px", color: "#999", marginTop: "6px", lineHeight: 1.6 }}>{IOS_PAYMENT_DISABLED_TIP}</div>
                      ) : (
                      <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                        <button
                          onClick={() => setShowSingleUnlock(true)}
                          style={{
                            flex: 1,
                            padding: "7px 4px",
                            borderRadius: "6px",
                            border: "1px solid #7B2FBE",
                            background: "#fff",
                            color: "#7B2FBE",
                            fontSize: "10px",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        >
                          单次解锁 ¥{SINGLE_UNLOCK_PRICE}
                        </button>
                        <button
                          onClick={() => { if (typeof window !== "undefined") window.location.href = "/profile/wallet"; }}
                          style={{
                            flex: 1,
                            padding: "7px 4px",
                            borderRadius: "6px",
                            border: "none",
                            background: "linear-gradient(135deg, #7B2FBE, #9B5ECF)",
                            color: "white",
                            fontSize: "10px",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        >
                          开通会员
                        </button>
                      </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* v20.1: 游客提示 */}
              {aiEnhance && getUserPermissionLevel() === "visitor" && !aiLoading && (
                <div style={{ padding: "12px", borderRadius: "10px", backgroundColor: "#f3e8ff", textAlign: "center" }}>
                  <div style={{ fontSize: "12px", color: "#7B2FBE", marginBottom: "6px" }}>
                    🔒 登录后可查看AI补充解读
                  </div>
                  <button
                    onClick={() => setShowLoginPrompt(true)}
                    style={{
                      padding: "6px 16px",
                      borderRadius: "6px",
                      border: "none",
                      background: "#7B2FBE",
                      color: "white",
                      fontSize: "12px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    去登录
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-safe-bottom" />
      </div>

      {/* v20.1: 单次解锁支付弹窗 */}
      {showSingleUnlock && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
          onClick={() => setShowSingleUnlock(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              maxWidth: "320px",
              width: "100%",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "14px", background: "linear-gradient(135deg, #7B2FBE, #9B5ECF)", color: "white" }}>
              <div style={{ fontSize: "15px", fontWeight: "bold" }}>单次解锁完整解读</div>
              <div style={{ fontSize: "11px", opacity: 0.9, marginTop: "2px" }}>
                解锁后可查看完整内容（24小时有效）
              </div>
            </div>
            <div style={{ padding: "14px" }}>
              {paymentsBlocked ? (
                <div style={{ textAlign: "center", padding: "6px 0 10px", fontSize: "13px", color: "#888", lineHeight: 1.7 }}>
                  {IOS_PAYMENT_DISABLED_TIP}
                </div>
              ) : (
              <div style={{ textAlign: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "26px", fontWeight: "bold", color: "#7B2FBE" }}>¥{SINGLE_UNLOCK_PRICE}</span>
                <span style={{ fontSize: "12px", color: "#999", marginLeft: "4px" }}>/ 次</span>
              </div>
              )}
              {unlockMsg && (
              <div style={{ marginBottom: "10px", padding: "8px 10px", background: "#fff3e0", borderRadius: "8px", fontSize: "11px", color: "#e65100", textAlign: "center" }}>
                {unlockMsg}
              </div>
            )}
            <button
                onClick={handleSingleUnlock}
          disabled={unlockPaying}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #7B2FBE, #9B5ECF)",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  marginBottom: "6px",
                  display: paymentsBlocked ? "none" : "block",
                }}
              >{unlockPaying ? "支付确认中..." : <>确认支付 ¥{SINGLE_UNLOCK_PRICE} 解锁</>}</button>
              <button
                onClick={() => setShowSingleUnlock(false)}
                style={{
                  width: "100%",
                  padding: "6px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  background: "#fff",
                  color: "#666",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                暂不解锁
              </button>
            </div>
          </div>
        </div>
      )}

      {/* v20.1: 登录提示弹窗 */}
      <LoginPromptModal show={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />

      {/* v25.0.47_9: Native扫码支付二维码弹层 */}
      {qrModal}
    </div>
  );
}
