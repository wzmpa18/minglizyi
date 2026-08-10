"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import {
  getMembershipStatus,
  MEMBERSHIP_PLANS,
  createOrder,
  completeOrder,
  getLevelName,
  getLevelColor,
  getOrders,
  MemberLevel,
  MembershipStatus,
  OrderRecord,
} from "@/lib/membershipStore";
import { updateUserProfile, getClientUserId } from "@/lib/auth";
import { processConsumptionRebate } from "@/lib/inviteStore";

const BRAND = "#7B2FBE";

export default function MembershipPage() {
  const { goBack } = useToolBack();
  const [status, setStatus] = useState<MembershipStatus>(() => getMembershipStatus());
  const [selectedPlan, setSelectedPlan] = useState<MemberLevel>("yearly");
  const [paymentMethod, setPaymentMethod] = useState<"wechat" | "alipay">("wechat");
  const [paying, setPaying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ planName: string; level: MemberLevel } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  useEffect(() => {
    setStatus(getMembershipStatus());
    setOrders(getOrders());
  }, []);

  const formatDays = (days: number) => {
    if (days === Infinity) return "永久有效";
    return `剩余 ${days} 天`;
  };

  const handlePay = () => {
    const plan = MEMBERSHIP_PLANS.find((p) => p.level === selectedPlan);
    if (!plan || plan.price === 0) {
      setErrorMsg("该套餐为免费版本，无需开通");
      return;
    }
    setErrorMsg("");
    setPaying(true);
    // create order
    const order = createOrder(selectedPlan, paymentMethod);
    // simulate payment (1.5s)
    window.setTimeout(() => {
      const result = completeOrder(order.id);
      setPaying(false);
      if (result.success && result.status) {
        // sync user profile memberLevel
        const profileLevel = selectedPlan === "basic" ? "basic" : "premium";
        updateUserProfile({ memberLevel: profileLevel });
        setStatus(result.status);
        setSuccessInfo({ planName: plan.name, level: selectedPlan });
        setShowSuccess(true);

        // v19.6: 处理消费返佣（二级分销体系）
        try {
          const currentUserId = getClientUserId();
          if (currentUserId && plan.price > 0) {
            const rebateResult = processConsumptionRebate(currentUserId, plan.price);
            if (rebateResult.firstLevelReward > 0 || rebateResult.secondLevelReward > 0) {
              console.log(`[v19.6] 消费返佣已发放: 一级${rebateResult.firstLevelReward}积分, 二级${rebateResult.secondLevelReward}积分`);
            }
          }
        } catch (e) {
          console.error("[v19.6] 消费返佣处理异常:", e);
        }

        // 刷新订单列表
        setOrders(getOrders());
      } else {
        setErrorMsg(result.message || "支付失败，请重试");
      }
    }, 1500);
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
            </div>
          </div>
        </div>

        {/* ===== 套餐标题 ===== */}
        <div style={{ padding: "8px 16px 4px", fontSize: "15px", fontWeight: 600, color: "#333" }}>
          选择会员套餐
        </div>

        {/* ===== 套餐列表 ===== */}
        {MEMBERSHIP_PLANS.map((plan) => {
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
              onClick={() => { setSelectedPlan("yearly"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
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
        {/* ===== 支付方式 ===== */}
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

      {/* ===== 底部开通按钮 ===== */}
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

      {/* 旋转动画样式 */}
      <style>{`@keyframes yandao-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
