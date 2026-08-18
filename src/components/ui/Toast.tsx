"use client";

/**
 * P7-弹窗统一-01：全站统一轻提示（Toast）
 * 用于：成功、失败、轻提示。全站任意位置调用 showToast() 即可，无需各页面自写 Toast。
 * 实现：CustomEvent 全局事件 + 根布局挂载 <ToastHost />，自动 2.4s 消失，最多同时 3 条。
 * 注意：Toast 不拦截返回键、不锁滚动（轻提示不阻断操作）。
 */

import { useEffect, useRef, useState } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const TOAST_EVENT = "app-toast";
let toastSeq = 1;

/** 全站统一轻提示 API：showToast("已保存") / showToast("支付失败", "error") */
export function showToast(message: string, type: ToastType = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, type } }));
}

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string; type: ToastType }>).detail;
      if (!detail || !detail.message) return;
      const id = toastSeq++;
      setToasts((prev) => [...prev.slice(-2), { id, message: detail.message, type: detail.type || "info" }]);
      timersRef.current[id] = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        delete timersRef.current[id];
      }, 2400);
    };
    window.addEventListener(TOAST_EVENT, handler);
    return () => {
      window.removeEventListener(TOAST_EVENT, handler);
      Object.values(timersRef.current).forEach(clearTimeout);
      timersRef.current = {};
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 flex flex-col items-center gap-2 px-8"
      style={{ top: "14vh", zIndex: 9998 }}
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="max-w-full rounded-xl px-4 py-2.5 text-[13px] font-medium text-white shadow-lg"
          style={{
            backgroundColor: t.type === "success" ? "#10b981" : t.type === "error" ? "#d9483b" : "rgba(30,30,35,0.9)",
            maxWidth: "340px",
            textAlign: "center",
          }}
        >
          {t.type === "success" ? "✓ " : t.type === "error" ? "✕ " : ""}
          {t.message}
        </div>
      ))}
    </div>
  );
}
