"use client";

import { useState, useCallback } from "react";
import {
  callAI,
  checkAIQuota,
  incrementAIUsage,
  // v20.1: 三级权限
  getPermissionStatus,
  getUserPermissionLevel,
  truncateContentForFreeUser,
  activateSingleUnlock,
  isSingleUnlocked,
  generateContentKey,
  SINGLE_UNLOCK_PRICE,
} from "@/lib/aiService";
import { paySingleUnlockAndWait } from "@/lib/paymentService";
import { useNativePayQR } from "@/components/PayQRCodeModal";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";

/**
 * v18.9: 通用AI解读按钮组件
 * 用于所有易学工具的AI解读入口（紫微斗数、八字、奇门、六爻、梅花等）
 *
 * 功能：
 * - 点击触发AI解读，通过后端代理接口调用（不泄露密钥）
 * - 支持流式/非流式输出
 * - 自动缓存（相同参数不重复调用）
 * - 配额控制（前端展示，后端校验）
 * - 合规免责声明
 *
 * 用法：
 * <AIInterpretButton
 *   toolName="八字"
 *   scope="overall"
 *   contextData="日主: 甲木 五行: ..."
 *   systemPrompt="你是八字解读师..."
 * />
 */

export interface AIInterpretButtonProps {
  toolName: string;
  scope: string; // "整体解读" | "单柱解读" | "大运解读" 等
  contextData: string;
  systemPrompt?: string;
  buttonText?: string;
  buttonStyle?: "primary" | "secondary";
  cacheKey?: string;
}

const DEFAULT_SYSTEM_PROMPT = `你是资深易学解读师。请基于提供的排盘数据进行专业解读。
要求：
1. 内容结构清晰，分段落阐述
2. 语言通俗易懂，避免过于玄乎的表述
3. 避免绝对化、宿命论表述
4. 不涉及医疗、投资、法律等违规建议
5. 结尾必须标注：「以上内容仅供传统文化学习参考，不构成人生决策建议」`;

const DISCLAIMER = "\n\n以上内容仅供传统文化学习参考，不构成人生决策建议";

export default function AIInterpretButton({
  toolName,
  scope,
  contextData,
  systemPrompt,
  buttonText,
  buttonStyle = "primary",
  cacheKey,
}: AIInterpretButtonProps) {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [fullContent, setFullContent] = useState(""); // v20.1: 完整内容
  const [isLocked, setIsLocked] = useState(false); // v20.1: 内容锁定
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState("");
  const [showSingleUnlock, setShowSingleUnlock] = useState(false); // v20.1: 单次解锁弹窗

  // v20.1: 登录守卫
  const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();

  const handleInterpret = useCallback(async () => {
    if (loading) return;

    // v20.1: 三级权限检查
    const perm = getPermissionStatus();

    // 游客：弹出登录引导
    if (perm.needLogin) {
      setShowLoginPrompt(true);
      return;
    }

    // 免费用户额度用完
    if (!perm.canUseAI) {
      setShowResult(true);
      setContent(perm.message || "今日AI解读次数已用完，开通会员或购买套餐继续使用" + DISCLAIMER);
      return;
    }

    setLoading(true);
    setShowResult(true);
    setContent("");
    setFullContent("");
    setIsLocked(false);
    setError("");

    try {
      const sysPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;
      const userPrompt = `请对以下${toolName}排盘数据进行${scope}：\n${contextData}\n\n请从多个维度进行分析，给出专业、客观的解读。`;

      const finalCacheKey = cacheKey || `${toolName}_${scope}_${contextData.slice(0, 80)}`;

      const result = await callAI({
        systemPrompt: sysPrompt,
        userPrompt,
        cacheKey: finalCacheKey,
      });

      if (result.success) {
        // 确保结尾有免责声明
        let text = result.content || "";
        if (!text.includes("仅供传统文化学习参考")) {
          text += DISCLAIMER;
        }

        // v20.1: 根据权限等级处理内容展示
        const level = getUserPermissionLevel();
        const cKey = generateContentKey(toolName, scope + contextData.slice(0, 50));

        if (level === "member") {
          // 会员：完整展示
          setFullContent(text);
          setContent(text);
          setIsLocked(false);
        } else if (isSingleUnlocked(cKey)) {
          // 免费用户已单次解锁
          setFullContent(text);
          setContent(text);
          setIsLocked(false);
        } else {
          // 免费用户未解锁：截取前45%
          const { preview, hiddenLength } = truncateContentForFreeUser(text);
          setFullContent(text);
          setContent(preview);
          setIsLocked(hiddenLength > 50);
        }

        // v19.6: 记录使用次数（缓存命中不扣次数）
        if (!result.cached) {
          incrementAIUsage();
        }
      } else {
        setError(result.error || "AI解读服务暂时不可用");
        setContent("AI解读服务暂时不可用，请稍后重试。" + DISCLAIMER);
      }
    } catch (err: any) {
      setError(err.message || "网络错误");
      setContent("AI解读服务暂时不可用，请稍后重试。" + DISCLAIMER);
    } finally {
      setLoading(false);
    }
  }, [loading, toolName, scope, contextData, systemPrompt, cacheKey, setShowLoginPrompt]);

  // v25.0.47_9: Native扫码支付弹层（全场景兜底收款通道）
  const { qrModal, openQR } = useNativePayQR();

  // v25.0.47_8: 单次付费解锁（真实微信支付，成功后本地解锁）
  const [unlockPaying, setUnlockPaying] = useState(false);
  const [unlockMsg, setUnlockMsg] = useState("");
  const handleSingleUnlock = useCallback(async () => {
    if (unlockPaying) return;
    const cKey = generateContentKey(toolName, scope + contextData.slice(0, 50));
    setUnlockPaying(true);
    setUnlockMsg("");
    try {
      const r = await paySingleUnlockAndWait(cKey, SINGLE_UNLOCK_PRICE);
      // v25.0.47_9: Native扫码支付——弹出付款二维码，扫码成功后执行本地解锁
      if (r.ticket) {
        openQR(r.ticket, () => {
          activateSingleUnlock(cKey);
          setShowSingleUnlock(false);
          setContent(fullContent);
          setIsLocked(false);
        });
        return;
      }
      if (r.paid) {
        activateSingleUnlock(cKey);
        setShowSingleUnlock(false);
        setContent(fullContent);
        setIsLocked(false);
      } else {
        setUnlockMsg(r.message);
      }
    } finally {
      setUnlockPaying(false);
    }
  }, [toolName, scope, contextData, fullContent, unlockPaying, openQR]);

  const primaryColor = "#7B2FBE";
  const secondaryColor = "#9B5ECF";

  return (
    <>
      <button
        onClick={handleInterpret}
        disabled={loading}
        className="w-full py-2 rounded-lg font-bold text-sm cursor-pointer border-0 text-white disabled:opacity-60 transition-opacity"
        style={{ background: loading ? "#999" : (buttonStyle === "primary" ? primaryColor : secondaryColor) }}
      >
        {loading ? "🤖 AI解读中..." : (buttonText || `🤖 AI${scope}`)}
      </button>

      {showResult && (content || loading) && (
        <div
          className="mt-2 rounded-lg overflow-hidden"
          style={{ border: `1px solid ${buttonStyle === "primary" ? primaryColor : secondaryColor}` }}
        >
          {/* 头部 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 12px",
              background: `linear-gradient(135deg, ${buttonStyle === "primary" ? primaryColor : secondaryColor}, ${buttonStyle === "primary" ? secondaryColor : "#B68DE0"})`,
              color: "white",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: "bold" }}>
              {loading ? "🤖 AI解读生成中..." : `🤖 AI${scope}结果`}
            </span>
            <button
              onClick={() => { setShowResult(false); setContent(""); }}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                color: "white",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              x
            </button>
          </div>

          {/* 内容区 */}
          <div
            style={{
              padding: "10px 12px",
              maxHeight: "300px",
              overflowY: "auto",
              fontSize: "13px",
              color: "#333",
              lineHeight: "1.7",
              whiteSpace: "pre-line",
              backgroundColor: "#fff",
            }}
          >
            {loading && !content ? (
              <span style={{ color: "#999" }}>正在生成解读内容，请稍候...</span>
            ) : (
              content
            )}
          </div>

          {/* 免责声明 */}
          {content && !loading && (
            <div
              style={{
                padding: "6px 12px",
                background: "#fafafa",
                borderTop: "1px solid #eee",
                fontSize: "10px",
                color: "#999",
                textAlign: "center",
              }}
            >
              以上内容仅供传统文化学习参考，不构成人生决策建议
            </div>
          )}
        </div>
      )}

      {/* v20.1: 免费用户内容锁定遮罩 */}
      {isLocked && !loading && showResult && (
        <div style={{ marginTop: "-16px", position: "relative", zIndex: 10 }}>
          <div style={{
            height: "30px",
            background: "linear-gradient(to bottom, transparent, #fff)",
            marginBottom: "6px",
          }} />
          <div style={{
            padding: "14px 10px",
            background: "#fff",
            borderRadius: "8px",
            border: "1px solid #e0d0f0",
            textAlign: "center",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7B2FBE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <div style={{ fontSize: "12px", color: "#7B2FBE", fontWeight: "bold", marginTop: "4px" }}>
              后续深度内容已锁定
            </div>
            <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
              <button
                onClick={() => setShowSingleUnlock(true)}
                style={{
                  flex: 1,
                  padding: "8px 6px",
                  borderRadius: "6px",
                  border: "1px solid #7B2FBE",
                  background: "#fff",
                  color: "#7B2FBE",
                  fontSize: "11px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                单次解锁 ¥{SINGLE_UNLOCK_PRICE}
              </button>
              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.location.href = "/profile/wallet";
                  }
                }}
                style={{
                  flex: 1,
                  padding: "8px 6px",
                  borderRadius: "6px",
                  border: "none",
                  background: "linear-gradient(135deg, #7B2FBE, #9B5ECF)",
                  color: "white",
                  fontSize: "11px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                开通会员无限看
              </button>
            </div>
          </div>
        </div>
      )}

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
            zIndex: 9999,
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
              {unlockMsg && (
                <div style={{ marginBottom: "10px", padding: "8px 10px", background: "#fff3e0", borderRadius: "8px", fontSize: "11px", color: "#e65100", textAlign: "center" }}>
                  {unlockMsg}
                </div>
              )}
              <div style={{ textAlign: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "26px", fontWeight: "bold", color: "#7B2FBE" }}>¥{SINGLE_UNLOCK_PRICE}</span>
                <span style={{ fontSize: "12px", color: "#999", marginLeft: "4px" }}>/ 次</span>
              </div>
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
                }}
              >
                {unlockPaying ? "支付确认中..." : <>确认支付 ¥{SINGLE_UNLOCK_PRICE} 解锁</>}</button>
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
    </>
  );
}
