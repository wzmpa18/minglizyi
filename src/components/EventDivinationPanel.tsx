"use client";

import { useState, useCallback } from "react";
import {
  checkAIQuota,
  incrementAIUsage,
  // COMMERCIAL-CLEANUP-03: activatePaidPlan/getPaidPlanStatus/AI_PAID_PLANS 已移除——AI权限由服务端SSOT决定
  getEventDivination,
  callAI,
  // v20.1: 三级权限体系
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
import { useAiPricing } from "@/lib/pricingStore";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import MasterExchangePanel from "./MasterExchangePanel";
// v25.0.47_12 深度报告提质：五段式/700-900字/典籍引用/合规语气（共享标准）
import { buildDeepReportSystemPrompt } from "@/lib/deepReportPrompt";

/**
 * v19.6: 事情断法 + AI深度解读 组件
 *
 * 功能：
 * 1. 事情断法：用户输入具体问题（投资、健康、感情等），AI结合排盘数据断事
 * 2. AI深度解读：一键获取排盘数据的AI全面分析
 * 3. 会员配额检查：免费用户每日3次，月度50次，年度/终身无限
 * 4. 付费体系：号码/车牌等专项工具支持按次/日/月/季/年付费
 *
 * 用法：
 * <EventDivinationPanel
 *   toolName="紫微斗数"
 *   chartContext="命宫: 紫微天府..."
 *   isPaidTool={false}  // 号码/车牌设为true
 * />
 */

interface EventDivinationPanelProps {
  toolName: string;
  chartContext: string;
  isPaidTool?: boolean; // 号码/车牌等需要付费的工具
}

const DISCLAIMER = "\n\n以上内容仅供传统文化学习参考，不构成人生决策建议";

// 快捷问题模板
const QUICK_QUESTIONS = [
  "近期事业运势如何？",
  "今年适合投资吗？",
  "健康状况需要注意什么？",
  "感情婚姻运势如何？",
  "近三个月财运怎样？",
  "适合创业还是守业？",
];

export default function EventDivinationPanel({
  toolName,
  chartContext,
  isPaidTool = false,
}: EventDivinationPanelProps) {
  const [activeMode, setActiveMode] = useState<"event" | "deep" | null>(null);
  const [userQuestion, setUserQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [fullContent, setFullContent] = useState(""); // v20.1: 完整内容（未截取）
  const [isLocked, setIsLocked] = useState(false); // v20.1: 内容是否被锁定
  const [error, setError] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [quotaMsg, setQuotaMsg] = useState("");
  const [showMasterPanel, setShowMasterPanel] = useState(false);
  const [showSingleUnlock, setShowSingleUnlock] = useState(false); // v20.1: 单次解锁弹窗

  // COMMERCIAL-CLEANUP-03: 价格SSOT——展示与下单价格从服务端读取，不再使用 AI_PAID_PLANS 硬编码
  const { singleUnlockPrice: serverSinglePrice, timePlans: serverTimePlans } = useAiPricing();
  const singlePrice = serverSinglePrice ?? SINGLE_UNLOCK_PRICE;
  const paidPlans = (serverTimePlans && serverTimePlans.length > 0 ? serverTimePlans : []) as Array<{ key: string; name: string; price: number; duration: string; features: string[] }>;

  // v20.1: 登录守卫 - 未登录用户不可使用AI/付费功能
  const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();

  // v20.1: 三级权限检查（COMMERCIAL-CLEANUP-03: 移除 getPaidPlanStatus——AI权限由服务端SSOT决定）
  const checkAccess = useCallback((): boolean => {
    const perm = getPermissionStatus();
    setQuotaMsg(perm.message);

    if (perm.needLogin) {
      // 游客：弹出登录引导
      setShowLoginPrompt(true);
      return false;
    }

    if (isPaidTool) {
      // 付费工具：检查会员状态（服务端AI调用时二次鉴权）
      if (perm.level === "member") {
        return true;
      }
      // 免费用户需要付费
      setShowPayment(true);
      return false;
    }

    // 非付费工具：检查配额
    if (!perm.canUseAI) {
      setShowPayment(true);
      return false;
    }
    return true;
  }, [isPaidTool, setShowLoginPrompt]);

  // v20.1: 处理AI内容 - 根据权限等级决定是否截取
  const processContentByPermission = useCallback(
    (rawContent: string) => {
      const level = getUserPermissionLevel();
      const cKey = generateContentKey(toolName, chartContext + (activeMode === "event" ? userQuestion : "deep"));

      // 会员：完整展示
      if (level === "member") {
        setFullContent(rawContent);
        setContent(rawContent);
        setIsLocked(false);
        return;
      }

      // 免费用户：检查是否已单次解锁
      if (isSingleUnlocked(cKey)) {
        setFullContent(rawContent);
        setContent(rawContent);
        setIsLocked(false);
        return;
      }

      // 免费用户未解锁：截取前45%内容
      const { preview, hiddenLength } = truncateContentForFreeUser(rawContent);
      setFullContent(rawContent);
      setContent(preview);
      setIsLocked(hiddenLength > 50); // 只有隐藏内容超过50字才显示锁定
    },
    [toolName, chartContext, activeMode, userQuestion]
  );

  // v25.0.47_9: Native扫码支付弹层（全场景兜底收款通道）
  const { qrModal, openQR } = useNativePayQR();

  // v25.0.47_8: 单次付费解锁（真实微信支付，成功后本地解锁标记）
  const [unlockPaying, setUnlockPaying] = useState(false);
  const [unlockMsg, setUnlockMsg] = useState("");
  const handleSingleUnlock = useCallback(async () => {
    if (unlockPaying) return;
    const cKey = generateContentKey(toolName, chartContext + (activeMode === "event" ? userQuestion : "deep"));
    setUnlockPaying(true);
    setUnlockMsg("");
    try {
      const r = await paySingleUnlockAndWait(cKey, singlePrice);
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
  }, [toolName, chartContext, activeMode, userQuestion, fullContent, unlockPaying, openQR, singlePrice]);

  // 执行事情断法
  const handleEventDivination = useCallback(async () => {
    if (!userQuestion.trim()) {
      setError("请输入您要问的事情");
      return;
    }
    if (loading) return;

    if (!checkAccess()) return;

    setLoading(true);
    setError("");
    setContent("");

    try {
      const result = await getEventDivination(toolName, chartContext, userQuestion.trim());
      let text = result;
      if (!text.includes("仅供传统文化学习参考")) {
        text += DISCLAIMER;
      }
      // v20.1: 根据权限等级处理内容展示
      processContentByPermission(text);
    } catch (err: any) {
      setError(err.message || "AI解读失败，请稍后重试");
      setContent("AI解读服务暂时不可用，请稍后重试。" + DISCLAIMER);
    } finally {
      setLoading(false);
    }
  }, [userQuestion, loading, toolName, chartContext, checkAccess, processContentByPermission]);

  // 执行深度解读
  const handleDeepInterpretation = useCallback(async () => {
    if (loading) return;
    if (!checkAccess()) return;

    setLoading(true);
    setError("");
    setContent("");

    try {
      // v25.0.47_12: 深度报告提质——五段式结构/700-900字/典籍引用/合规语气
      const systemPrompt = buildDeepReportSystemPrompt(toolName);

      const userPrompt = `【${toolName}排盘数据】\n${chartContext}\n\n请严格按照系统要求输出五段式深度解读报告（700-900字）。`;

      const result = await callAI({
        systemPrompt,
        userPrompt,
        cacheKey: `deep_${toolName}_${chartContext.slice(0, 80)}`,
      });

      incrementAIUsage();

      let text = result.content || "";
      if (!text.includes("仅供传统文化学习参考")) {
        text += DISCLAIMER;
      }
      // v20.1: 根据权限等级处理内容展示
      processContentByPermission(text);
    } catch (err: any) {
      setError(err.message || "AI解读失败");
      setContent("AI解读服务暂时不可用，请稍后重试。" + DISCLAIMER);
    } finally {
      setLoading(false);
    }
  }, [loading, toolName, chartContext, checkAccess, processContentByPermission]);

  // COMMERCIAL-CLEANUP-03: 付费套餐购买——走真实微信支付，AI权限由服务端SSOT决定，不再本地激活
  const [purchasePaying, setPurchasePaying] = useState(false);
  const [purchaseMsg, setPurchaseMsg] = useState("");
  const handlePurchase = useCallback(async (planKey: string) => {
    if (purchasePaying) return;
    const plan = paidPlans.find((p) => p.key === planKey);
    if (!plan) return;
    setPurchasePaying(true);
    setPurchaseMsg("");
    try {
      const r = await paySingleUnlockAndWait(`ai_plan_${planKey}`, plan.price, plan.name);
      if (r.ticket) {
        openQR(r.ticket, () => {
          setShowPayment(false);
          setQuotaMsg("支付成功！AI套餐已生效，请重新点击解读");
        });
        return;
      }
      if (r.paid) {
        setShowPayment(false);
        setQuotaMsg("支付成功！AI套餐已生效，请重新点击解读");
      } else {
        setPurchaseMsg(r.message);
      }
    } finally {
      setPurchasePaying(false);
    }
  }, [purchasePaying, openQR]);

  return (
    <div className="mt-3 rounded-lg overflow-hidden" style={{ border: "1px solid #e0d0f0" }}>
      {/* 标题栏 */}
      <div
        style={{
          background: "linear-gradient(135deg, #7B2FBE, #9B5ECF)",
          color: "white",
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: "14px", fontWeight: "bold" }}>🤖 AI智能解读</span>
        {quotaMsg && (
          <span style={{ fontSize: "10px", opacity: 0.9 }}>{quotaMsg}</span>
        )}
      </div>

      {/* 功能按钮区 */}
      <div style={{ padding: "10px 12px", background: "#fff" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => { if (!requireLogin()) return; setActiveMode("event"); setContent(""); setError(""); }}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "8px",
              border: activeMode === "event" ? "2px solid #7B2FBE" : "1px solid #ddd",
              background: activeMode === "event" ? "#f3edf7" : "#fff",
              color: "#7B2FBE",
              fontSize: "12px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            🔮 事情断法
          </button>
          <button
            onClick={() => { if (!requireLogin()) return; setActiveMode("deep"); setContent(""); setError(""); handleDeepInterpretation(); }}
            disabled={loading}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "8px",
              border: activeMode === "deep" ? "2px solid #7B2FBE" : "1px solid #ddd",
              background: activeMode === "deep" ? "#f3edf7" : "#fff",
              color: "#7B2FBE",
              fontSize: "12px",
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading && activeMode === "deep" ? "解读中..." : "📖 深度解读"}
          </button>
        </div>

        {/* v19.8: 找同道师父交流入口 */}
        <button
          onClick={() => { if (!requireLogin()) return; setShowMasterPanel(true); }}
          style={{
            width: "100%",
            marginTop: "8px",
            padding: "8px",
            borderRadius: "8px",
            border: "1px solid #e8d5f5",
            background: "#faf5ff",
            color: "#7B2FBE",
            fontSize: "12px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          🏮 找同道师父交流
        </button>
        <div style={{ fontSize: "10px", color: "#bbb", textAlign: "center", marginTop: "4px" }}>
          仅为同好学习交流，平台不对解答内容负责
        </div>

        {/* 付费工具提示 */}
        {isPaidTool && (
          <div style={{ marginTop: "8px", padding: "6px 8px", background: "#fff8e1", borderRadius: "6px", fontSize: "10px", color: "#f57c00" }}>
            ⚡ 此工具AI解读为付费功能，{getUserPermissionLevel() === "member" ? "您的会员权益已包含" : "需购买套餐或开通会员"}
          </div>
        )}

        {/* 事情断法输入区 */}
        {activeMode === "event" && (
          <div style={{ marginTop: "10px" }}>
            <textarea
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              placeholder="请输入您要问的事情，如：今年适合投资吗？近期健康需要注意什么？"
              rows={3}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                fontSize: "13px",
                outline: "none",
                resize: "none",
                boxSizing: "border-box",
              }}
            />

            {/* 快捷问题 */}
            <div style={{ marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => setUserQuestion(q)}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "12px",
                    border: "1px solid #e0d0f0",
                    background: "#f9f5fc",
                    color: "#7B2FBE",
                    fontSize: "10px",
                    cursor: "pointer",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>

            <button
              onClick={handleEventDivination}
              disabled={loading || !userQuestion.trim()}
              style={{
                width: "100%",
                marginTop: "8px",
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background: loading ? "#999" : "#7B2FBE",
                color: "white",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading || !userQuestion.trim() ? 0.6 : 1,
              }}
            >
              {loading ? "🤖 AI断事中..." : "🔮 开始断事"}
            </button>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div style={{ marginTop: "8px", padding: "8px", background: "#fee", borderRadius: "6px", fontSize: "12px", color: "#c62828" }}>
            {error}
          </div>
        )}

        {/* AI解读结果 */}
        {content && (
          <div style={{ marginTop: "10px", borderRadius: "8px", overflow: "hidden", border: "1px solid #e0d0f0" }}>
            <div style={{ padding: "6px 10px", background: "#f3edf7", fontSize: "12px", fontWeight: "bold", color: "#7B2FBE" }}>
              {loading ? "🤖 AI解读生成中..." : "🤖 AI解读结果"}
            </div>
            <div
              style={{
                padding: "10px 12px",
                maxHeight: "400px",
                overflowY: "auto",
                fontSize: "13px",
                color: "#333",
                lineHeight: "1.7",
                whiteSpace: "pre-line",
                background: "#fff",
              }}
            >
              {loading && !content ? (
                <span style={{ color: "#999" }}>正在生成解读内容，请稍候...</span>
              ) : (
                content
              )}
            </div>
            {content && !loading && (
              <div style={{ padding: "6px 12px", background: "#fafafa", borderTop: "1px solid #eee", fontSize: "10px", color: "#999", textAlign: "center" }}>
                以上内容仅供传统文化学习参考，不构成人生决策建议
              </div>
            )}
          </div>
        )}

        {/* v20.1: 免费用户内容锁定遮罩 */}
        {isLocked && !loading && (
          <div style={{ marginTop: "-20px", position: "relative", zIndex: 10 }}>
            {/* 渐变模糊遮罩 */}
            <div style={{
              height: "40px",
              background: "linear-gradient(to bottom, transparent, #fff)",
              marginBottom: "8px",
            }} />
            {/* 锁定提示区 */}
            <div style={{
              padding: "16px 12px",
              background: "#fff",
              borderRadius: "8px",
              border: "1px solid #e0d0f0",
              textAlign: "center",
            }}>
              <div style={{ marginBottom: "12px" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7B2FBE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <div style={{ fontSize: "13px", color: "#7B2FBE", fontWeight: "bold", marginTop: "6px" }}>
                  后续深度内容已锁定
                </div>
                <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>
                  包含流月流日、深度详批、专项断法等完整解读
                </div>
              </div>
              {/* 两个解锁按钮 */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setShowSingleUnlock(true)}
                  style={{
                    flex: 1,
                    padding: "10px 8px",
                    borderRadius: "8px",
                    border: "1px solid #7B2FBE",
                    background: "#fff",
                    color: "#7B2FBE",
                    fontSize: "12px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  单次解锁 ¥{singlePrice}
                </button>
                <button
                  onClick={() => setShowPayment(true)}
                  style={{
                    flex: 1,
                    padding: "10px 8px",
                    borderRadius: "8px",
                    border: "none",
                    background: "linear-gradient(135deg, #7B2FBE, #9B5ECF)",
                    color: "white",
                    fontSize: "12px",
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
      </div>

      {/* 付费弹窗 */}
      {showPayment && (
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
          onClick={() => setShowPayment(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              maxWidth: "360px",
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗标题 */}
            <div style={{ padding: "16px", background: "linear-gradient(135deg, #7B2FBE, #9B5ECF)", borderRadius: "12px 12px 0 0", color: "white" }}>
              <div style={{ fontSize: "16px", fontWeight: "bold" }}>开通AI解读</div>
              <div style={{ fontSize: "12px", opacity: 0.9, marginTop: "4px" }}>
                {isPaidTool ? "此工具AI解读需付费使用" : "AI解读需单次付费或开通会员"}
              </div>
            </div>

            {/* 套餐列表 */}
            <div style={{ padding: "12px" }}>
              {purchaseMsg && (
                <div style={{ marginBottom: "8px", padding: "8px 10px", background: "#fff3e0", borderRadius: "8px", fontSize: "11px", color: "#e65100", textAlign: "center" }}>
                  {purchaseMsg}
                </div>
              )}
              {paidPlans.map((plan) => (
                <div
                  key={plan.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px",
                    marginBottom: "8px",
                    borderRadius: "8px",
                    border: plan.key === "monthly" ? "2px solid #7B2FBE" : "1px solid #eee",
                    background: plan.key === "monthly" ? "#f9f5fc" : "#fff",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>
                      {plan.name}
                      {plan.key === "monthly" && (
                        <span style={{ marginLeft: "6px", padding: "1px 6px", borderRadius: "8px", background: "#7B2FBE", color: "white", fontSize: "9px" }}>推荐</span>
                      )}
                    </div>
                    <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>
                      {plan.desc} · {plan.duration}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: "#7B2FBE" }}>¥{plan.price}</div>
                    <button
                      onClick={() => handlePurchase(plan.key)}
                      disabled={purchasePaying}
                      style={{
                        marginTop: "4px",
                        padding: "4px 12px",
                        borderRadius: "12px",
                        border: "none",
                        background: "#7B2FBE",
                        color: "white",
                        fontSize: "11px",
                        cursor: purchasePaying ? "not-allowed" : "pointer",
                        opacity: purchasePaying ? 0.6 : 1,
                      }}
                    >
                      {purchasePaying ? "开通中" : "开通"}
                    </button>
                  </div>
                </div>
              ))}

              {/* 开通会员提示 */}
              <div style={{ marginTop: "8px", padding: "8px", background: "#f0f7ff", borderRadius: "6px", fontSize: "11px", color: "#1976d2", lineHeight: 1.5 }}>
                💡 AI时卡仅为本工具AI解读权益，与平台会员相互独立；月度及以上会员已含AI解读额度，无需重复购买。年度/终身会员无限畅享更划算！
              </div>

              <button
                onClick={() => setShowPayment(false)}
                style={{
                  width: "100%",
                  marginTop: "10px",
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  background: "#fff",
                  color: "#666",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                暂不开通
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
              maxWidth: "340px",
              width: "100%",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗标题 */}
            <div style={{ padding: "16px", background: "linear-gradient(135deg, #7B2FBE, #9B5ECF)", color: "white" }}>
              <div style={{ fontSize: "16px", fontWeight: "bold" }}>单次解锁完整解读</div>
              <div style={{ fontSize: "12px", opacity: 0.9, marginTop: "4px" }}>
                解锁后可查看本条解读的完整内容（24小时有效）
              </div>
            </div>

            {/* 内容说明 */}
            <div style={{ padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "#f5f0fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7B2FBE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>完整深度解读</div>
                  <div style={{ fontSize: "11px", color: "#999" }}>流月流日 + 深度详批 + 专项断法</div>
                </div>
              </div>

              <div style={{ padding: "10px", background: "#f9f5fc", borderRadius: "8px", fontSize: "11px", color: "#7B2FBE", marginBottom: "12px" }}>
                💡 单次解锁仅限当前这条解读内容，如需多次查看建议开通会员更划算
              </div>

              {/* 价格 */}
              <div style={{ textAlign: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "28px", fontWeight: "bold", color: "#7B2FBE" }}>¥{singlePrice}</span>
                <span style={{ fontSize: "13px", color: "#999", marginLeft: "4px" }}>/ 次</span>
              </div>

              {/* 按钮 */}
              {unlockMsg && (
                <div style={{ marginBottom: "8px", padding: "8px 10px", background: "#fff3e0", borderRadius: "8px", fontSize: "11px", color: "#e65100", textAlign: "center" }}>
                  {unlockMsg}
                </div>
              )}
              <button
                onClick={handleSingleUnlock}
                disabled={unlockPaying}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #7B2FBE, #9B5ECF)",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "bold",
                  cursor: unlockPaying ? "not-allowed" : "pointer",
                  opacity: unlockPaying ? 0.6 : 1,
                  marginBottom: "8px",
                }}
              >
                {unlockPaying ? "支付确认中..." : `确认支付 ¥${singlePrice} 解锁`}
              </button>
              <button
                onClick={() => setShowSingleUnlock(false)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  background: "#fff",
                  color: "#666",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                暂不解锁
              </button>
            </div>
          </div>
        </div>
      )}

      {/* v19.8: 同道师父交流面板 */}
      <MasterExchangePanel
        show={showMasterPanel}
        toolName={toolName}
        onClose={() => setShowMasterPanel(false)}
      />

      {/* v20.1: 登录提示弹窗 */}
      <LoginPromptModal show={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />

      {/* v25.0.47_9: Native扫码支付二维码弹层 */}
      {qrModal}
    </div>
  );
}
