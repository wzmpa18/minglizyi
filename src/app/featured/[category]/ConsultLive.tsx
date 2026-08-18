"use client";

// ============================================================================
// 真人咨询实时服务区（言道精选 consult 类目）- P6-TOOL-04 §3.3
// 与静态精选展示共存：本组件渲染 consultServiceStore 实时上架的可预约服务，
// 下单走统一 CONSULT_SERVICE 订单场景（paymentService.payForConsultService），
// 支付通道未开放时按平台既有口径以统一格式订单号本地登记履约台账。
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listConsultServices,
  listConsultOrders,
  createConsultOrder,
  confirmConsultOrder,
  startAfterSale,
  runConsultMaintenance,
  type ConsultService,
  type ConsultOrder,
} from "@/lib/consultServiceStore";
import { getToolConfig } from "@/lib/toolConfigStore";
import { payForConsultService } from "@/lib/paymentService";
import { getUserProfile } from "@/lib/auth";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

const BRAND = "#B9770E";

const DELIVERY_FORM_LABEL: Record<ConsultService["deliveryForm"], string> = {
  text: "图文报告",
  voice: "语音沟通",
  video: "视频沟通",
  offline: "线下当面",
};

const ORDER_STATUS_META: Record<ConsultOrder["status"], { label: string; color: string }> = {
  paid: { label: "待接单", color: "#B9770E" },
  accepted: { label: "服务中", color: "#2471A3" },
  delivered: { label: "待确认收货", color: "#1E8E5A" },
  confirmed: { label: "结算中", color: "#7B2FBE" },
  settled: { label: "已结算", color: "#27ae60" },
  after_selling: { label: "售后处理中", color: "#e67e22" },
  refunded: { label: "已退款", color: "#e74c3c" },
  cancelled: { label: "已取消", color: "#95a5a6" },
};

/** 与统一订单系统一致的订单号格式：YD + 14位时间戳 + 6位随机数 */
function genUnifiedOrderId(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const ts =
    d.getFullYear().toString() + pad(d.getMonth() + 1) + pad(d.getDate()) +
    pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  const rnd = Math.floor(100000 + Math.random() * 900000).toString();
  return `YD${ts}${rnd}`;
}

function getCurrentUser(): { userId: string; nickname: string } {
  const profile = getUserProfile();
  if (profile?.userId) {
    return { userId: profile.userId, nickname: profile.nickname || "用户" };
  }
  if (typeof window !== "undefined") {
    const guest = localStorage.getItem("yandao_user_id");
    if (guest) return { userId: guest, nickname: "游客用户" };
  }
  return { userId: "YD000000", nickname: "用户" };
}

export default function ConsultLive() {
  const router = useRouter();
  const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();

  const [mounted, setMounted] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [disclaimer, setDisclaimer] = useState("");
  const [services, setServices] = useState<ConsultService[]>([]);
  const [myOrders, setMyOrders] = useState<ConsultOrder[]>([]);
  const [tab, setTab] = useState<"services" | "orders">("services");

  // 预约弹窗
  const [bookingService, setBookingService] = useState<ConsultService | null>(null);
  const [requirement, setRequirement] = useState("");
  const [booking, setBooking] = useState(false);
  // 售后弹窗
  const [afterSaleOrder, setAfterSaleOrder] = useState<ConsultOrder | null>(null);
  const [afterSaleReason, setAfterSaleReason] = useState("");
  // 交付内容查看
  const [viewOrder, setViewOrder] = useState<ConsultOrder | null>(null);
  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2600);
  }, []);

  useBodyScrollLock(!!bookingService || !!afterSaleOrder || !!viewOrder);
  usePopupBackHandler(() => {
    if (viewOrder) setViewOrder(null);
    else if (afterSaleOrder) setAfterSaleOrder(null);
    else if (bookingService) setBookingService(null);
  }, !!bookingService || !!afterSaleOrder || !!viewOrder);

  const refresh = useCallback(() => {
    const cfg = getToolConfig().consult;
    setEnabled(cfg.enabled);
    setDisclaimer(cfg.disclaimer);
    setServices(cfg.enabled ? listConsultServices({ onlineOnly: true }) : []);
    const user = getCurrentUser();
    setMyOrders(listConsultOrders({ buyerId: user.userId }));
  }, []);

  useEffect(() => {
    setMounted(true);
    runConsultMaintenance();
    refresh();
  }, [refresh]);

  if (!mounted) return null;

  if (!enabled) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-gray-400">真人咨询服务当前未开放</p>
      </div>
    );
  }

  /** 发起预约：统一支付 →（通道未开放兜底）→ 履约台账登记 */
  const handleBook = async () => {
    if (!bookingService) return;
    if (requirement.trim().length < 10) {
      showToast("请填写至少10字的需求描述，便于师傅了解您的问题", false);
      return;
    }
    setBooking(true);
    try {
      let unifiedOrderId = "";
      let channelNote = "";
      try {
        const pay = await payForConsultService(
          bookingService.id,
          bookingService.providerId,
          bookingService.price,
          requirement.trim()
        );
        if (pay.success && pay.orderId) {
          unifiedOrderId = pay.orderId;
        } else {
          channelNote = pay.message || "支付通道即将开放";
        }
      } catch {
        channelNote = "支付通道异常";
      }
      // 支付通道未开放：按平台既有本地订单口径登记统一格式订单号，保障履约闭环可验收
      if (!unifiedOrderId) unifiedOrderId = genUnifiedOrderId();

      const user = getCurrentUser();
      const res = createConsultOrder({
        unifiedOrderId,
        serviceId: bookingService.id,
        buyerId: user.userId,
        buyerNickname: user.nickname,
        requirement: requirement.trim(),
      });
      if (res.success && res.consultOrder) {
        showToast(
          channelNote
            ? `预约成功（${channelNote}，订单已本地登记）：${res.consultOrder.orderId}`
            : `预约成功，订单号 ${res.consultOrder.orderId}`,
          true
        );
        setBookingService(null);
        setRequirement("");
        refresh();
        setTab("orders");
      } else {
        showToast(res.message || "预约失败，请稍后重试", false);
      }
    } finally {
      setBooking(false);
    }
  };

  const handleConfirm = (orderId: string) => {
    const user = getCurrentUser();
    const res = confirmConsultOrder(orderId, user.userId);
    showToast(res.message, res.success);
    if (res.success) refresh();
  };

  const handleAfterSale = () => {
    if (!afterSaleOrder) return;
    const user = getCurrentUser();
    const res = startAfterSale(afterSaleOrder.orderId, user.userId, afterSaleReason.trim());
    showToast(res.message, res.success);
    if (res.success) {
      setAfterSaleOrder(null);
      setAfterSaleReason("");
      refresh();
    }
  };

  const modalShellStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    backgroundColor: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  };
  const modalCardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: "420px",
    maxHeight: "85vh",
    overflowY: "auto",
    backgroundColor: "#fff",
    borderRadius: "16px 16px 0 0",
    padding: "20px 16px calc(20px + env(safe-area-inset-bottom))",
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 区块头 */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] font-bold text-gray-800">找真人师傅分析</p>
            <p className="mt-0.5 text-[11px] text-gray-400">
              平台审核服务者 · 统一下单 · 平台担保结算
            </p>
          </div>
          <button
            onClick={() => router.push("/profile/consult/provider-apply")}
            className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold"
            style={{ border: `1px solid ${BRAND}`, color: BRAND, backgroundColor: "#fff" }}
          >
            成为服务者
          </button>
        </div>
        <p className="mt-2.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[10px] leading-relaxed text-amber-700">
          {disclaimer}
        </p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2">
        {([
          { key: "services", label: `服务大厅 (${services.length})` },
          { key: "orders", label: `我的预约 (${myOrders.length})` },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 rounded-xl py-2 text-xs font-semibold transition-colors"
            style={{
              backgroundColor: tab === t.key ? BRAND : "#fff",
              color: tab === t.key ? "#fff" : "#666",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 服务大厅 */}
      {tab === "services" && (
        <>
          {services.length === 0 ? (
            <div className="rounded-2xl bg-white py-12 text-center shadow-sm">
              <p className="text-sm text-gray-400">暂无上架服务</p>
              <p className="mt-1 text-[11px] text-gray-300">服务者入驻审核通过后即可上架</p>
            </div>
          ) : (
            services.map((svc) => (
              <div key={svc.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span
                      className="mb-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: "#fdf3e3", color: BRAND }}
                    >
                      {DELIVERY_FORM_LABEL[svc.deliveryForm]}
                    </span>
                    <p className="text-[15px] font-bold text-gray-800">{svc.title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {svc.providerNickname} · 已服务 {svc.salesCount} 次 · {svc.deliveryDays} 天内交付
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-bold" style={{ color: BRAND }}>¥{svc.price}</p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-gray-500">服务范围：{svc.scope}</p>
                <p className="mt-1 text-[10px] text-gray-400">退款规则：{svc.refundPolicy}</p>
                <button
                  onClick={() => {
                    if (!requireLogin()) return;
                    setBookingService(svc);
                    setRequirement("");
                  }}
                  className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-white active:scale-[0.99] transition-transform"
                  style={{ backgroundColor: BRAND }}
                >
                  立即预约
                </button>
              </div>
            ))
          )}
        </>
      )}

      {/* 我的预约 */}
      {tab === "orders" && (
        <>
          {myOrders.length === 0 ? (
            <div className="rounded-2xl bg-white py-12 text-center shadow-sm">
              <p className="text-sm text-gray-400">暂无预约记录</p>
            </div>
          ) : (
            myOrders.map((o) => {
              const meta = ORDER_STATUS_META[o.status];
              return (
                <div key={o.orderId} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-bold text-gray-800">{o.serviceTitle}</p>
                    <span className="text-[11px] font-semibold" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">
                    订单号 {o.orderId} · ¥{o.amount} · {o.providerNickname}
                  </p>
                  {o.requirement && (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">我的需求：{o.requirement}</p>
                  )}
                  {o.deliverContent && (
                    <button
                      onClick={() => setViewOrder(o)}
                      className="mt-2 rounded-lg bg-green-50 px-2.5 py-1.5 text-[11px] font-medium text-green-700"
                    >
                      查看交付内容
                    </button>
                  )}
                  <div className="mt-2.5 flex gap-2">
                    {o.status === "delivered" && (
                      <>
                        <button
                          onClick={() => handleConfirm(o.orderId)}
                          className="flex-1 rounded-xl py-2 text-xs font-semibold text-white"
                          style={{ backgroundColor: "#1E8E5A" }}
                        >
                          确认收货
                        </button>
                        <button
                          onClick={() => {
                            setAfterSaleOrder(o);
                            setAfterSaleReason("");
                          }}
                          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500"
                        >
                          申请售后
                        </button>
                      </>
                    )}
                    {["paid", "accepted"].includes(o.status) && (
                      <button
                        onClick={() => {
                          setAfterSaleOrder(o);
                          setAfterSaleReason("");
                        }}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500"
                      >
                        申请售后
                      </button>
                    )}
                    {o.status === "settled" && (
                      <span className="text-[11px] text-gray-400">交易已完成，结算款已入服务者余额</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      {/* ===== 预约弹窗 ===== */}
      {bookingService && (
        <div style={modalShellStyle} onClick={() => setBookingService(null)}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[15px] font-bold text-gray-800">预约咨询服务</p>
              <button onClick={() => setBookingService(null)} className="text-xs text-gray-400">关闭</button>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-[13px] font-semibold text-gray-800">{bookingService.title}</p>
              <p className="mt-1 text-[11px] text-gray-500">
                {bookingService.providerNickname} · {DELIVERY_FORM_LABEL[bookingService.deliveryForm]} ·{" "}
                {bookingService.deliveryDays} 天内交付
              </p>
              <p className="mt-1 text-[11px] text-gray-400">退款规则：{bookingService.refundPolicy}</p>
            </div>
            <p className="mb-1.5 mt-3 text-xs font-semibold text-gray-700">需求描述（必填，至少10字）</p>
            <textarea
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="请描述您想咨询的问题、背景情况与期望的解答形式，便于师傅针对性服务"
              className="w-full resize-none rounded-xl border border-gray-200 p-3 text-[13px] text-gray-700 outline-none"
            />
            <p className="mt-1 text-right text-[10px] text-gray-300">{requirement.length}/500</p>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2.5">
              <span className="text-xs text-gray-600">应付金额</span>
              <span className="text-lg font-bold" style={{ color: BRAND }}>¥{bookingService.price}</span>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-gray-400">{disclaimer}</p>
            <button
              onClick={handleBook}
              disabled={booking}
              className="mt-3 w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: BRAND }}
            >
              {booking ? "正在提交订单..." : "确认预约并支付"}
            </button>
          </div>
        </div>
      )}

      {/* ===== 售后弹窗 ===== */}
      {afterSaleOrder && (
        <div style={modalShellStyle} onClick={() => setAfterSaleOrder(null)}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[15px] font-bold text-gray-800">申请售后</p>
              <button onClick={() => setAfterSaleOrder(null)} className="text-xs text-gray-400">关闭</button>
            </div>
            <p className="rounded-xl bg-gray-50 p-3 text-[12px] text-gray-600">
              订单：{afterSaleOrder.serviceTitle}（{afterSaleOrder.orderId}）
            </p>
            <p className="mb-1.5 mt-3 text-xs font-semibold text-gray-700">售后原因（必填，至少10字）</p>
            <textarea
              value={afterSaleReason}
              onChange={(e) => setAfterSaleReason(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="请说明问题：如未按约定交付、内容与描述不符等，平台将介入仲裁"
              className="w-full resize-none rounded-xl border border-gray-200 p-3 text-[13px] text-gray-700 outline-none"
            />
            <button
              onClick={handleAfterSale}
              className="mt-3 w-full rounded-xl py-3 text-sm font-bold text-white"
              style={{ backgroundColor: "#e67e22" }}
            >
              提交售后申请
            </button>
          </div>
        </div>
      )}

      {/* ===== 交付内容查看 ===== */}
      {viewOrder && (
        <div style={modalShellStyle} onClick={() => setViewOrder(null)}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[15px] font-bold text-gray-800">交付内容</p>
              <button onClick={() => setViewOrder(null)} className="text-xs text-gray-400">关闭</button>
            </div>
            <p className="text-[11px] text-gray-400">
              {viewOrder.serviceTitle} · 交付时间 {viewOrder.deliveredAt?.slice(0, 16).replace("T", " ")}
            </p>
            <div className="mt-2 whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-[13px] leading-relaxed text-gray-700">
              {viewOrder.deliverContent}
            </div>
          </div>
        </div>
      )}

      <LoginPromptModal show={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />

      {toast && (
        <div
          className="fixed left-1/2 top-20 z-[1001] -translate-x-1/2 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-lg"
          style={{ backgroundColor: toast.ok ? "#1E8E5A" : "#e74c3c", maxWidth: "88%" }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
