"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import {
  getMembershipStatus,
  isSuperAccount,
  MEMBERSHIP_PLANS,
  createOrder,
  completeOrder,
  getLevelName,
  getLevelColor,
  getOrders,
  getBToolFreeRemaining,
  B_TOOLS,
  B_TOOL_BENEFITS,
  AI_QUOTA_CONFIG,
  COMPLIANCE_PAYMENT_LABEL,
  MemberLevel,
  MembershipStatus,
  OrderRecord,
} from "@/lib/membershipStore";
import { updateUserProfile, getUserProfile } from "@/lib/auth";
import { reportConsumptionRebate } from "@/lib/inviteApi";
import { redeemCode, getMyRedemptions } from "@/lib/redeemCodeStore";
import { getToolConfig } from "@/lib/toolConfigStore";
import { isPaymentsBlocked, IOS_PAYMENT_DISABLED_TIP } from "@/lib/platformGate";
import { payForMembership, pollPaymentStatus } from "@/lib/paymentService";
import { useNativePayQR } from "@/components/PayQRCodeModal";

const BRAND = "#7B2FBE";

export default function MembershipPage() {
  const { goBack } = useToolBack();
  // v25.0.47_9: Native扫码支付弹层（全场景兜底收款通道）
  const { qrModal, openQR } = useNativePayQR();
  const [status, setStatus] = useState<MembershipStatus>(() => getMembershipStatus());
  const [selectedPlan, setSelectedPlan] = useState<MemberLevel>("yearly");
  const [paymentMethod, setPaymentMethod] = useState<"wechat" | "alipay">("wechat");
  const [paying, setPaying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ planName: string; level: MemberLevel } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  // 兑换码（P6-TOOL-04-补02）
  const [redeemInput, setRedeemInput] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState("");
  const [redeemOk, setRedeemOk] = useState(false);
  const [myRedemptions, setMyRedemptions] = useState<ReturnType<typeof getMyRedemptions>>([]);
  const [redeemEnabled, setRedeemEnabled] = useState(false);
  // FINAL-RC-02: iOS 本期不开放任何付费（静态导出需 useEffect 后置判定，避免水合不一致）
  const [paymentsBlocked, setPaymentsBlocked] = useState(false);

  useEffect(() => {
    setPaymentsBlocked(isPaymentsBlocked());
  }, []);

  useEffect(() => {
    setStatus(getMembershipStatus());
    setOrders(getOrders());
    try {
      setRedeemEnabled(getToolConfig().redeem.enabled);
      setMyRedemptions(getMyRedemptions());
    } catch {}
  }, []);

  const handleRedeem = () => {
    if (!redeemInput.trim()) {
      setRedeemOk(false);
      setRedeemMsg("请输入兑换码");
      return;
    }
    setRedeeming(true);
    try {
      const res = redeemCode(redeemInput);
      setRedeemOk(res.success);
      setRedeemMsg(res.message);
      if (res.success) {
        setRedeemInput("");
        setStatus(getMembershipStatus());
        setMyRedemptions(getMyRedemptions());
      }
    } finally {
      setRedeeming(false);
    }
  };

  const formatDays = (days: number) => {
    if (days === Infinity) return "永久有效";
    return `剩余 ${days} 天`;
  };

  // v25.0.47_9: 支付成功统一权益落地（JSAPI轮询确认 / Native扫码回调共用）
  // 服务端订单已交付权益（users.member_level/membership_expiry），此处同步本地展示与账本
  const applyMembershipPaid = (serverOrderNo: string) => {
    const plan = MEMBERSHIP_PLANS.find((p) => p.level === selectedPlan);
    if (!plan) return;
    const order = createOrder(selectedPlan, paymentMethod);
    const result = completeOrder(order.id);
    if (result.success && result.status) {
      const profileLevel = selectedPlan === "basic" ? "basic" : "premium";
      updateUserProfile({ memberLevel: profileLevel });
      setStatus(result.status);
    }
    setSuccessInfo({ planName: plan.name, level: selectedPlan });
    setShowSuccess(true);

    // 消费返佣上报服务端统一账本（订单号幂等，JWT识别消费人）
    void reportConsumptionRebate({ orderNo: serverOrderNo, amount: plan.price, product: plan.name }).then((rb) => {
      if (rb && rb.granted) {
        console.log(`[v25.0.47_9] 消费返佣已入账: 一级${rb.level1Points || 0}积分, 二级${rb.level2Points || 0}积分`);
      }
    });

    setOrders(getOrders());
  };

  // v25.0.47_8/9: 真实微信支付（JSAPI调起轮询 / Native扫码弹码，服务端权益交付）
  const handlePay = async () => {
    if (isPaymentsBlocked()) {
      setErrorMsg(IOS_PAYMENT_DISABLED_TIP);
      return;
    }
    const plan = MEMBERSHIP_PLANS.find((p) => p.level === selectedPlan);
    if (!plan || plan.price === 0) {
      setErrorMsg("该套餐为免费版本，无需开通");
      return;
    }
    // 真实支付必须登录（服务端订单与权益交付均以 userId 为主键）
    const profile = getUserProfile();
    if (!profile || !profile.userId) {
      setErrorMsg("请先登录后再开通会员");
      return;
    }
    // v25.0.47_9: 扫码支付全场景可用（非微信环境/微信内均可，微信内长按识别二维码）
    setErrorMsg("");
    setPaying(true);
    try {
      const daysMap: Record<string, number> = { monthly: 30, yearly: 365, lifetime: -1 };
      const r = await payForMembership(plan.level, plan.price, daysMap[plan.level] ?? 30);
      if (!r || !r.success || !r.orderId) {
        setPaying(false);
        setErrorMsg((r && (r.message || r.error)) || "支付发起失败，请稍后重试");
        return;
      }
      // v25.0.47_9: Native扫码支付——弹出付款二维码（全场景兜底通道）
      if (r.payMode === "NATIVE" && r.codeUrl) {
        setPaying(false);
        const paidOrderNo = r.orderId;
        openQR(
          { nativePay: true, codeUrl: r.codeUrl, orderId: paidOrderNo, amount: plan.price, title: plan.name },
          () => applyMembershipPaid(paidOrderNo)
        );
        return;
      }
      // JSAPI：调起微信支付后轮询结果（用户在微信收银台完成支付后服务端回调置PAID）
      const status = await pollPaymentStatus(r.orderId);
      setPaying(false);
      if (status && status.status === "PAID") {
        applyMembershipPaid(r.orderId);
      } else {
        setErrorMsg("支付未完成或确认中；若已付款，会员权益将在到账后自动生效，请稍后刷新查看");
      }
    } catch {
      setPaying(false);
      setErrorMsg("支付异常，请稍后重试");
    }
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5", display: "flex", flexDirection: "column" }}>
      <BrandHeader title="会员中心" showBack />

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: "16px" }}>
        {/* ===== 当前会员状态卡 ===== */}
        <div
          style={{
            margin: "12px",
            padding: "20px 16px",
            borderRadius: "16px",
            background: `linear-gradient(135deg, ${BRAND} 0%, #9B59B6 100%)`,
            color: "#fff",
            boxShadow: "0 4px 16px rgba(123,47,190,0.25)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", opacity: 0.85 }}>当前会员</span>
            <span
              style={{
                fontSize: "12px",
                padding: "2px 10px",
                borderRadius: "12px",
                backgroundColor: "rgba(255,255,255,0.22)",
              }}
            >
              {getLevelName(status.level)}
            </span>
          </div>
          <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="rgba(255,255,255,0.92)">
              <path d="M5 16L3 7l5.5 4L12 4l3.5 7L21 7l-2 9H5zm0 2h14v2H5z" />
            </svg>
            <div>
              <div style={{ fontSize: "20px", fontWeight: 700 }}>{getLevelName(status.level)}</div>
              <div style={{ fontSize: "12px", opacity: 0.85, marginTop: "2px" }}>
                {status.level === "basic"
                  ? "升级会员解锁更多权益"
                  : status.level === "lifetime"
                  ? "永久有效 · 尊享全部权益"
                  : formatDays(status.daysRemaining)}
              </div>
              {isSuperAccount() && (
                <div style={{ fontSize: "11px", marginTop: "4px", padding: "2px 8px", borderRadius: "8px", backgroundColor: "rgba(255,215,0,0.35)", display: "inline-block", fontWeight: 700 }}>
                  全权限账户
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== 兑换码（P6-TOOL-04-补02：运营发放渠道，核销复用统一会员/积分引擎） ===== */}
        {redeemEnabled && (
          <div style={{ margin: "0 12px 12px", padding: "14px 16px", backgroundColor: "#fff", borderRadius: "14px", border: "1px solid #eee" }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#333", marginBottom: "8px" }}>🎁 兑换码</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                value={redeemInput}
                onChange={(e) => setRedeemInput(e.target.value.toUpperCase())}
                placeholder="输入兑换码，如 YD-XXXX-XXXX"
                style={{ flex: 1, padding: "10px 12px", borderRadius: "10px", border: "1px solid #ddd", fontSize: "14px", fontFamily: "monospace", outline: "none" }}
              />
              <button
                disabled={redeeming}
                onClick={handleRedeem}
                style={{ padding: "10px 18px", borderRadius: "10px", border: "none", backgroundColor: BRAND, color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer", opacity: redeeming ? 0.6 : 1 }}
              >
                {redeeming ? "兑换中..." : "兑换"}
              </button>
            </div>
            {redeemMsg && (
              <div style={{ marginTop: "8px", fontSize: "12px", color: redeemOk ? "#27ae60" : "#e74c3c" }}>{redeemMsg}</div>
            )}
            {myRedemptions.length > 0 && (
              <div style={{ marginTop: "10px", fontSize: "12px", color: "#888" }}>
                最近兑换：{myRedemptions.slice(0, 3).map((r) => `${r.rewardDetail}（${r.redeemedAt.slice(5, 10).replace("-", "/")}）`).join("、")}
              </div>
            )}
          </div>
        )}

        {/* ===== FINAL-RC-02: iOS 付费关闭提示卡 ===== */}
        {paymentsBlocked && (
          <div style={{ margin: "12px", padding: "16px", borderRadius: "14px", backgroundColor: "#fff", border: "1px solid #eee", textAlign: "center" }}>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "#333", marginBottom: "6px" }}>会员购买暂未开放</div>
            <div style={{ fontSize: "13px", color: "#888", lineHeight: 1.7 }}>{IOS_PAYMENT_DISABLED_TIP}</div>
          </div>
        )}

        {/* ===== 套餐标题 ===== */}
        {!paymentsBlocked && (
          <div style={{ padding: "8px 16px 4px", fontSize: "15px", fontWeight: 600, color: "#333" }}>
            选择会员套餐
          </div>
        )}

        {/* ===== 套餐列表 ===== */}
        {!paymentsBlocked && MEMBERSHIP_PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.level;
          const levelColor = getLevelColor(plan.level);
          return (
            <div
              key={plan.level}
              onClick={() => setSelectedPlan(plan.level)}
              style={{
                position: "relative",
                margin: "8px 12px",
                padding: "16px",
                borderRadius: "14px",
                backgroundColor: plan.highlighted ? "#faf6ff" : "#fff",
                border: isSelected
                  ? `2px solid ${BRAND}`
                  : plan.highlighted
                  ? `1px solid ${BRAND}55`
                  : "1px solid #eee",
                boxShadow: isSelected ? "0 2px 12px rgba(123,47,190,0.18)" : "0 1px 4px rgba(0,0,0,0.04)",
                cursor: "pointer",
              }}
            >
              {/* 角标 */}
              {plan.badge && (
                <div
                  style={{
                    position: "absolute",
                    top: "0",
                    right: "12px",
                    transform: "translateY(-50%)",
                    backgroundColor: levelColor,
                    color: "#fff",
                    fontSize: "11px",
                    padding: "2px 10px",
                    borderRadius: "10px",
                    fontWeight: 600,
                  }}
                >
                  {plan.badge}
                </div>
              )}

              {/* 选中圆点 */}
              <div
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: isSelected ? "none" : "2px solid #ddd",
                  backgroundColor: isSelected ? BRAND : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>

              {/* 名称 + 时长 */}
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#333" }}>{plan.name}</span>
                <span style={{ fontSize: "12px", color: "#999" }}>{plan.duration}</span>
              </div>

              {/* 价格 */}
              <div style={{ marginTop: "6px", display: "flex", alignItems: "baseline", gap: "8px" }}>
                {plan.price === 0 ? (
                  <span style={{ fontSize: "22px", fontWeight: 700, color: "#27ae60" }}>免费</span>
                ) : (
                  <>
                    <span style={{ fontSize: "12px", color: BRAND }}>¥</span>
                    <span style={{ fontSize: "26px", fontWeight: 700, color: BRAND }}>{plan.price}</span>
                    <span style={{ fontSize: "13px", color: "#bbb", textDecoration: "line-through" }}>¥{plan.originalPrice}</span>
                  </>
                )}
              </div>

              {/* 权益列表 */}
              <div style={{ marginTop: "10px" }}>
                {plan.features.map((feat, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={levelColor === "#999" ? "#27ae60" : levelColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span style={{ fontSize: "12.5px", color: "#666" }}>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* ===== 中医功能权益 ===== */}
        <div style={{ margin: "12px", padding: "16px", borderRadius: "14px", backgroundColor: "#fff", border: "1px solid #eee", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#333", marginBottom: "12px" }}>
            中医功能权益
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ fontSize: "12.5px", color: "#666" }}>中药 / 方剂 / 经络 / 典籍查询（全会员可用）</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={status.level === "basic" ? "#ccc" : "#27ae60"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ fontSize: "12.5px", color: status.level === "basic" ? "#bbb" : "#666" }}>智能问诊（月度及以上会员）</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={status.level === "yearly" || status.level === "lifetime" ? "#27ae60" : "#ccc"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ fontSize: "12.5px", color: status.level === "yearly" || status.level === "lifetime" ? "#666" : "#bbb" }}>名家辨证 · 针灸建议（年度及以上会员）</span>
            </div>
          </div>
          {status.level === "basic" ? (
            <div
              onClick={() => { if (paymentsBlocked) { setErrorMsg(IOS_PAYMENT_DISABLED_TIP); return; } setSelectedPlan("yearly"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{ marginTop: "12px", padding: "10px", borderRadius: "10px", backgroundColor: "#faf6ff", border: `1px solid ${BRAND}55`, textAlign: "center", fontSize: "13px", color: BRAND, fontWeight: 600, cursor: "pointer" }}
            >
              升级会员解锁全部中医功能 →
            </div>
          ) : (
            <div style={{ marginTop: "12px", padding: "10px", borderRadius: "10px", backgroundColor: "#f6fff6", border: "1px solid #c8e6c9", textAlign: "center", fontSize: "13px", color: "#27ae60", fontWeight: 600 }}>
              您已解锁全部中医功能
            </div>
          )}
        </div>

        {/* ===== B类高价值工具定价（FINAL-RC-02: iOS 付费关闭期间隐藏定价购买区） ===== */}
        {!paymentsBlocked && (
        <div style={{ margin: "12px", padding: "16px", borderRadius: "14px", backgroundColor: "#fff", border: "1px solid #eee", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#333", marginBottom: "4px" }}>
            B类高价值工具定价
          </div>
          <div style={{ fontSize: "12px", color: "#999", marginBottom: "12px" }}>
            单独计费，不占用通用AI次数，禁止用积分兑换
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Object.values(B_TOOLS).map((tool) => (
              <div key={tool.type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: "8px", backgroundColor: "#fafafa" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#333" }}>{tool.name}</div>
                  <div style={{ fontSize: "11px", color: "#bbb", marginTop: "2px" }}>{tool.description}</div>
                </div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#e67e22" }}>¥{tool.price}<span style={{ fontSize: "11px", color: "#bbb", fontWeight: 400 }}>/次</span></div>
              </div>
            ))}
          </div>
          {/* B类工具权益 */}
          <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #f5f5f5" }}>
            <div style={{ fontSize: "12px", color: "#999", marginBottom: "6px" }}>会员B类工具权益</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              <div style={{ padding: "6px 8px", borderRadius: "6px", backgroundColor: "#e8f4fd", fontSize: "11px", color: "#3498db" }}>
                月度会员：月赠3次，超出8折
              </div>
              <div style={{ padding: "6px 8px", borderRadius: "6px", backgroundColor: "#f0e6f6", fontSize: "11px", color: BRAND }}>
                年度会员：月赠15次，超出7折
              </div>
              <div style={{ padding: "6px 8px", borderRadius: "6px", backgroundColor: "#fff8e1", fontSize: "11px", color: "#FF9800", gridColumn: "span 2" }}>
                终身会员：B类工具无限次免费使用
              </div>
            </div>
          </div>
          {/* 当前剩余免费次数 */}
          {status.level !== "basic" && (
            <div style={{ marginTop: "8px", padding: "8px 12px", borderRadius: "8px", backgroundColor: "#f6fff6", border: "1px solid #c8e6c9", fontSize: "12px", color: "#27ae60", textAlign: "center" }}>
              本月B类工具剩余免费次数：{getBToolFreeRemaining() === Infinity ? "无限" : getBToolFreeRemaining()}次
            </div>
          )}
        </div>
        )}

        {/* ===== 完整权益对比表 ===== */}
        <div style={{ margin: "12px", padding: "16px", borderRadius: "14px", backgroundColor: "#fff", border: "1px solid #eee", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflowX: "auto" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#333", marginBottom: "12px" }}>
            会员权益对比
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", minWidth: "320px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
                <th style={{ padding: "8px 4px", textAlign: "left", color: "#999", fontWeight: 600 }}>权益项</th>
                <th style={{ padding: "8px 4px", textAlign: "center", color: "#999", fontWeight: 600 }}>免费</th>
                <th style={{ padding: "8px 4px", textAlign: "center", color: "#3498db", fontWeight: 600 }}>月度</th>
                <th style={{ padding: "8px 4px", textAlign: "center", color: BRAND, fontWeight: 600 }}>年度</th>
                <th style={{ padding: "8px 4px", textAlign: "center", color: "#FFD700", fontWeight: 600 }}>终身</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "排盘工具", vals: ["✓", "✓", "✓", "✓"] },
                { name: "通用AI问答", vals: ["3次/天", "50次/天", "无限", "无限"] },
                { name: "B类高价值工具", vals: ["原价", "月赠3次", "月赠15次", "无限免费"] },
                { name: "中医学习库", vals: ["初级", "全部", "全部", "全部"] },
                { name: "模拟考试题库", vals: ["初级", "全等级", "全等级", "全等级"] },
                { name: "签到积分倍率", vals: ["1x", "2x", "3x", "5x"] },
                { name: "无广告体验", vals: ["-", "✓", "✓", "✓"] },
                { name: "专属标识", vals: ["-", "✓", "✓", "✓"] },
                { name: "导出排盘报告", vals: ["-", "✓", "✓", "✓"] },
                { name: "专属客服", vals: ["-", "-", "✓", "✓"] },
                { name: "新功能优先体验", vals: ["-", "-", "-", "✓"] },
              ].map((row) => (
                <tr key={row.name} style={{ borderBottom: "1px solid #f8f8f8" }}>
                  <td style={{ padding: "8px 4px", color: "#666", fontWeight: 500 }}>{row.name}</td>
                  {row.vals.map((v, i) => (
                    <td key={i} style={{ padding: "8px 4px", textAlign: "center", color: v === "✓" ? "#27ae60" : v === "-" ? "#ddd" : "#666", fontSize: "11px" }}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ===== 合规免责声明 ===== */}
        <div style={{ margin: "8px 12px 16px", padding: "10px 14px", borderRadius: "8px", backgroundColor: "#fafafa", border: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: "11px", color: "#bbb", lineHeight: 1.6 }}>
            所有付费服务统一标注「{COMPLIANCE_PAYMENT_LABEL}」，内容仅供传统文化学习与学术交流参考，不构成任何决策建议。会员状态、积分、购买记录均云端持久化保存，支持跨设备同步。购买记录永久保存，会员有效期内已解锁内容可永久查看。
          </div>
        </div>

        {/* ===== 支付方式（FINAL-RC-02: iOS 隐藏，禁止任何外部支付入口） ===== */}
        {!paymentsBlocked && (
          <>
        <div style={{ padding: "16px 16px 4px", fontSize: "15px", fontWeight: 600, color: "#333" }}>
          支付方式
        </div>
        <div style={{ margin: "8px 12px", backgroundColor: "#fff", borderRadius: "12px", overflow: "hidden", border: "1px solid #eee" }}>
          {([
            { key: "wechat" as const, label: "微信支付", color: "#09BB07" },
            { key: "alipay" as const, label: "支付宝", color: "#1677FF" },
          ]).map((item, idx, arr) => (
            <div
              key={item.key}
              onClick={() => setPaymentMethod(item.key)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 16px",
                cursor: "pointer",
                borderBottom: idx === arr.length - 1 ? "none" : "1px solid #f5f5f5",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  backgroundColor: item.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: "10px",
                }}
              >
                {item.key === "wechat" ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                    <path d="M8.5 4C4.91 4 2 6.46 2 9.5c0 1.74.96 3.29 2.46 4.32L4 16l2.3-1.2c.7.2 1.44.3 2.2.3.18 0 .36-.01.54-.02A5.7 5.7 0 0 1 8.5 13c0-3.04 2.91-5.5 6.5-5.5.18 0 .36.01.54.02C14.97 5.13 11.99 4 8.5 4zm-2.2 3.3a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zm4.4 0a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zM15 9c-3.31 0-6 2.24-6 5s2.69 5 6 5c.66 0 1.3-.09 1.9-.26L19 20l-.5-1.6C19.7 17.5 21 16.1 21 14c0-2.76-2.69-5-6-5zm-2.2 3.3a.7.7 0 1 1 0 1.4.7.7 0 0 1 0-1.4zm4.4 0a.7.7 0 1 1 0 1.4.7.7 0 0 1 0-1.4z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                    <path d="M6 4h12a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4zm6.5 4.2c-1.7 0-3 .9-3 2.3 0 1.3 1 1.9 2.5 2.3 1.2.3 1.5.6 1.5 1 0 .4-.4.7-1.1.7-.8 0-1.4-.3-1.7-.8l-1.3.8c.5.9 1.5 1.4 2.9 1.4 1.8 0 3.1-.8 3.1-2.2 0-1.4-1.1-2-2.6-2.4-1.1-.3-1.4-.5-1.4-.9 0-.3.3-.6.9-.6.6 0 1 .2 1.3.7l1.2-.8c-.5-.8-1.3-1.3-2.8-1.5z" />
                  </svg>
                )}
              </div>
              <span style={{ flex: 1, fontSize: "14px", color: "#333" }}>{item.label}</span>
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: paymentMethod === item.key ? "none" : "2px solid #ddd",
                  backgroundColor: paymentMethod === item.key ? BRAND : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {paymentMethod === item.key && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
          </>
        )}

        {/* ===== 错误提示 ===== */}
        {errorMsg && (
          <div style={{ margin: "8px 16px", padding: "10px 14px", backgroundColor: "#fff4f4", borderRadius: "8px", fontSize: "13px", color: "#e74c3c", border: "1px solid #f8d7da" }}>
            {errorMsg}
          </div>
        )}

        {/* ===== 订单历史（内联展示最近5条） ===== */}
        <div style={{ padding: "16px 16px 4px", fontSize: "15px", fontWeight: 600, color: "#333" }}>
          消费明细
        </div>
        {orders.length === 0 ? (
          <div style={{ margin: "8px 12px", padding: "20px 16px", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #eee", textAlign: "center", fontSize: "13px", color: "#999" }}>
            暂无订单记录
          </div>
        ) : (
          <div style={{ margin: "8px 12px", backgroundColor: "#fff", borderRadius: "12px", overflow: "hidden", border: "1px solid #eee" }}>
            {orders.slice(0, 5).map((order, idx, arr) => (
              <div
                key={order.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderBottom: idx === arr.length - 1 ? "none" : "1px solid #f5f5f5",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#333" }}>{order.planName}</div>
                  <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>
                    {order.paidAt ? new Date(order.paidAt).toLocaleDateString("zh-CN") : new Date(order.createdAt).toLocaleDateString("zh-CN")}
                    {" · "}
                    {order.paymentMethod === "wechat" ? "微信支付" : "支付宝"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: BRAND }}>¥{order.amount}</div>
                  <div style={{ fontSize: "10px", color: order.status === "paid" ? "#27ae60" : "#e74c3c", marginTop: "2px" }}>
                    {order.status === "paid" ? "已支付" : order.status === "pending" ? "待支付" : order.status === "failed" ? "已失败" : "已退款"}
                  </div>
                </div>
              </div>
            ))}
            {orders.length > 5 && (
              <Link href="/orders" style={{ display: "block", textAlign: "center", padding: "10px", fontSize: "13px", color: BRAND, borderTop: "1px solid #f5f5f5" }}>
                查看全部 {orders.length} 条记录 →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ===== 底部开通按钮（FINAL-RC-02: iOS 隐藏任何付费入口） ===== */}
      {!paymentsBlocked && (
      <div
        style={{
          padding: "12px 16px",
          backgroundColor: "#fff",
          borderTop: "1px solid #eee",
        }}
      >
        <button
          onClick={handlePay}
          disabled={paying}
          style={{
            width: "100%",
            padding: "13px 0",
            borderRadius: "24px",
            border: "none",
            backgroundColor: paying ? "#c9a3e8" : BRAND,
            color: "#fff",
            fontSize: "16px",
            fontWeight: 600,
            cursor: paying ? "not-allowed" : "pointer",
          }}
        >
          {paying
            ? "支付处理中..."
            : `立即开通 · ¥${MEMBERSHIP_PLANS.find((p) => p.level === selectedPlan)?.price ?? 0}`}
        </button>
      </div>
      )}

      <div className="page-bottom-nav-safe" aria-hidden="true" />

      {/* ===== 支付中遮罩 ===== */}
      {paying && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div style={{ backgroundColor: "#fff", borderRadius: "14px", padding: "28px 36px", textAlign: "center", maxWidth: "220px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "3px solid #eee",
                borderTopColor: BRAND,
                borderRadius: "50%",
                margin: "0 auto 14px",
                animation: "yandao-spin 0.8s linear infinite",
              }}
            />
            <div style={{ fontSize: "14px", color: "#666" }}>正在处理支付...</div>
          </div>
        </div>
      )}

      {/* ===== 支付成功弹窗 ===== */}
      {showSuccess && successInfo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "24px",
          }}
          onClick={() => setShowSuccess(false)}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "18px",
              padding: "28px 24px 20px",
              textAlign: "center",
              width: "100%",
              maxWidth: "300px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                backgroundColor: "#27ae60",
                margin: "0 auto 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div style={{ fontSize: "17px", fontWeight: 700, color: "#333" }}>支付成功</div>
            <div style={{ fontSize: "13px", color: "#999", marginTop: "6px" }}>
              恭喜您已开通{successInfo.planName}，权益已激活
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                onClick={() => {
                  setShowSuccess(false);
                  goBack();
                }}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: "22px",
                  border: `1px solid ${BRAND}`,
                  backgroundColor: "#fff",
                  color: BRAND,
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                返回
              </button>
              <Link
                href="/orders"
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: "22px",
                  backgroundColor: BRAND,
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 600,
                  textAlign: "center",
                  textDecoration: "none",
                  boxSizing: "border-box",
                  display: "block",
                }}
              >
                查看订单
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* v25.0.47_9: Native扫码支付二维码弹层 */}
      {qrModal}

      {/* 旋转动画样式 */}
      <style>{`@keyframes yandao-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
