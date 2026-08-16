"use client";

import React, { useState, useEffect } from "react";
import { BrandHeader } from "@/components/shared";
import { useToolBack } from "@/lib/useToolBack";
import { getOrders, OrderRecord } from "@/lib/membershipStore";

import { PageLoginGuard } from "@/components/PageLoginGuard";
const BRAND = "#7B2FBE";

const STATUS_MAP: Record<OrderRecord["status"], { label: string; color: string; bg: string }> = {
  pending: { label: "待支付", color: "#e67e22", bg: "#fef3e7" },
  paid: { label: "已支付", color: "#27ae60", bg: "#eafaf1" },
  failed: { label: "已失败", color: "#e74c3c", bg: "#fdecea" },
  refunded: { label: "已退款", color: "#999", bg: "#f5f5f5" },
};

export default function OrdersPage() {
  const { goBack } = useToolBack();
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  useEffect(() => {
    setOrders(getOrders());
  }, []);

  const formatTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return timeStr;
    }
  };

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", backgroundColor: "#f5f5f5", display: "flex", flexDirection: "column" }}>
  <PageLoginGuard />
      <BrandHeader title="我的订单" showBack />

      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        {orders.length === 0 ? (
          /* 空状态 */
          <div style={{ textAlign: "center", paddingTop: "90px", color: "#bbb" }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", display: "block" }}>
              <path d="M9 11h6M9 15h4M5 21h14a2 2 0 0 0 2-2V8l-5-5H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z" />
              <path d="M14 3v5h5" />
            </svg>
            <div style={{ fontSize: "14px" }}>暂无订单记录</div>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>开通会员后可在此查看订单</div>
          </div>
        ) : (
          orders.map((order) => {
            const st = STATUS_MAP[order.status];
            return (
              <div
                key={order.id}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  marginBottom: "10px",
                  border: "1px solid #eee",
                }}
              >
                {/* 头部：订单号 + 状态徽章 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "12px", color: "#999" }}>订单号：{order.id}</span>
                  <span
                    style={{
                      fontSize: "12px",
                      padding: "2px 10px",
                      borderRadius: "10px",
                      color: st.color,
                      backgroundColor: st.bg,
                      fontWeight: 600,
                    }}
                  >
                    {st.label}
                  </span>
                </div>

                {/* 中部：支付方式图标 + 套餐名 + 金额 */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "8px",
                        backgroundColor: order.paymentMethod === "wechat" ? "#09BB07" : "#1677FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {order.paymentMethod === "wechat" ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                          <path d="M8.5 4C4.91 4 2 6.46 2 9.5c0 1.74.96 3.29 2.46 4.32L4 16l2.3-1.2c.7.2 1.44.3 2.2.3.18 0 .36-.01.54-.02A5.7 5.7 0 0 1 8.5 13c0-3.04 2.91-5.5 6.5-5.5.18 0 .36.01.54.02C14.97 5.13 11.99 4 8.5 4z" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                          <path d="M6 4h12a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#333" }}>{order.planName}</div>
                      <div style={{ fontSize: "11px", color: "#bbb", marginTop: "2px" }}>
                        {order.paymentMethod === "wechat" ? "微信支付" : "支付宝"}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: BRAND }}>¥{order.amount}</div>
                  </div>
                </div>

                {/* 底部：创建时间 / 支付时间 */}
                <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #f5f5f5" }}>
                  <div style={{ fontSize: "12px", color: "#bbb", display: "flex", justifyContent: "space-between" }}>
                    <span>下单时间</span>
                    <span>{formatTime(order.createdAt)}</span>
                  </div>
                  {order.paidAt && (
                    <div style={{ fontSize: "12px", color: "#bbb", display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                      <span>支付时间</span>
                      <span>{formatTime(order.paidAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
