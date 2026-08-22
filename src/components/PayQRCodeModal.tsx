"use client";

// ============================================================================
// Native 扫码支付弹层 - v25.0.47_9 (FIX-PAY-UNBIND-WECHAT-APPID)
// 全场景支付兜底通道：将后端返回的 code_url 渲染为微信付款二维码，
// 用户微信扫码 / 长按识别完成支付；组件内自动轮询订单状态，支付成功后回调。
// 适用环境：电脑浏览器 / 手机浏览器 / APP WebView / 微信内置浏览器（长按识别）。
// ============================================================================

import React, { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { pollPaymentStatus, type NativePayTicket } from "@/lib/paymentService";

const BRAND = "#7B2FBE";

interface PayQRCodeModalProps {
  visible: boolean;
  codeUrl: string;
  amountYuan: number;
  title: string;
  orderId: string;
  /** 轮询确认 PAID 后回调（组件先展示支付成功态，再执行回调） */
  onPaid: () => void;
  onClose: () => void;
}

export function PayQRCodeModal({
  visible,
  codeUrl,
  amountYuan,
  title,
  orderId,
  onPaid,
  onClose,
}: PayQRCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [payState, setPayState] = useState<"waiting" | "paid" | "expired">("waiting");
  const paidRef = useRef(false);

  // 生成付款二维码（qrcode 库，项目既有依赖）
  useEffect(() => {
    if (!visible || !codeUrl) return;
    setQrDataUrl("");
    QRCode.toDataURL(codeUrl, {
      width: 440,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1a1a1a", light: "#ffffff" },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(""));
  }, [visible, codeUrl]);

  // 轮询订单状态（2秒/次，3分钟超时；服务端回调置PAID + 查询接口对账兜底）
  useEffect(() => {
    if (!visible || !orderId) return;
    paidRef.current = false;
    setPayState("waiting");
    let stopped = false;
    let attempts = 0;
    const timer = setInterval(async () => {
      if (stopped || paidRef.current) return;
      attempts += 1;
      if (attempts > 90) {
        stopped = true;
        clearInterval(timer);
        setPayState("expired");
        return;
      }
      try {
        const s = await pollPaymentStatus(orderId);
        if (!stopped && s && s.status === "PAID") {
          paidRef.current = true;
          clearInterval(timer);
          setPayState("paid");
          setTimeout(() => {
            if (!stopped) onPaid();
          }, 900);
        }
      } catch {
        // 网络抖动时继续轮询
      }
    }, 2000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, orderId]);

  if (!visible) return null;

  return (
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
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "18px",
          padding: "24px 20px 18px",
          textAlign: "center",
          width: "100%",
          maxWidth: "310px",
        }}
      >
        <div style={{ fontSize: "15px", fontWeight: 600, color: "#333" }}>{title}</div>
        <div style={{ fontSize: "28px", fontWeight: 700, color: BRAND, margin: "6px 0 2px" }}>
          ¥{amountYuan.toFixed(2)}
        </div>
        <div
          style={{
            width: "232px",
            height: "232px",
            margin: "12px auto 0",
            padding: "8px",
            border: "1px solid #eee",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fff",
          }}
        >
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="微信支付二维码" width={216} height={216} style={{ display: "block" }} />
          ) : (
            <div style={{ fontSize: "13px", color: "#999" }}>二维码生成中...</div>
          )}
        </div>

        {payState === "waiting" && (
          <>
            <div style={{ fontSize: "14px", color: "#333", margin: "12px 0 4px", fontWeight: 500 }}>
              请使用微信「扫一扫」付款
            </div>
            <div style={{ fontSize: "12px", color: "#999", lineHeight: 1.6 }}>
              长按识别二维码完成支付
              <br />
              支付成功后返回页面刷新即可生效
            </div>
          </>
        )}
        {payState === "paid" && (
          <div style={{ fontSize: "15px", color: "#27ae60", fontWeight: 600, margin: "12px 0 4px" }}>
            支付成功，权益生效中...
          </div>
        )}
        {payState === "expired" && (
          <div style={{ fontSize: "13px", color: "#e67e22", margin: "12px 0 4px" }}>
            二维码已过期，请关闭后重新发起支付
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: "14px",
            width: "100%",
            padding: "10px 0",
            borderRadius: "10px",
            border: "none",
            backgroundColor: payState === "paid" ? BRAND : "#f0f0f0",
            color: payState === "paid" ? "#fff" : "#666",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {payState === "paid" ? "完成" : payState === "expired" ? "关闭" : "取消支付"}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// useNativePayQR：付费入口扫码支付统一接入钩子
// 用法（各付费入口三行接入）：
//   const { qrModal, openQR } = useNativePayQR();
//   // 支付函数中：
//   if (r.ticket) { openQR(r.ticket, () => { ...支付成功后的本地权益逻辑... }); return; }
//   // JSX 末尾：{qrModal}
// ============================================================================
export function useNativePayQR() {
  const [ticket, setTicket] = useState<NativePayTicket | null>(null);
  const paidHandlerRef = useRef<(() => void) | null>(null);

  const openQR = useCallback((t: NativePayTicket, onPaid: () => void) => {
    paidHandlerRef.current = onPaid;
    setTicket(t);
  }, []);

  const handlePaid = useCallback(() => {
    setTicket(null);
    const fn = paidHandlerRef.current;
    paidHandlerRef.current = null;
    if (fn) fn();
  }, []);

  const handleClose = useCallback(() => {
    setTicket(null);
    paidHandlerRef.current = null;
  }, []);

  const qrModal = ticket ? (
    <PayQRCodeModal
      visible
      codeUrl={ticket.codeUrl}
      amountYuan={ticket.amount}
      title={ticket.title}
      orderId={ticket.orderId}
      onPaid={handlePaid}
      onClose={handleClose}
    />
  ) : null;

  return { qrModal, openQR };
}
