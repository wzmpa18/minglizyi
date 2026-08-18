"use client";

/**
 * P7-弹窗统一-01：全站统一付费确认弹窗（底部面板）
 * 用于：付费和权益确认（统一 Paywall 解锁面板）。
 * 统一规范：底部面板 / 最大高度 85vh 内容区滚动 / 预留底部导航高度+安全区 /
 * body 滚动锁 / 返回键优先关闭弹窗 / 支付进行中禁止误关。
 */

import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

export function PaymentDialog({
  open,
  onClose,
  title,
  subtitle,
  price,
  onPay,
  paying = false,
  payMsg,
  children,
  accent = "#C05046",
}: {
  open: boolean;
  onClose: () => void;
  /** 面板主标题（如：解锁「方剂学题库」） */
  title: string;
  subtitle?: string;
  /** 单次购买价格（元）；传 null 表示仅会员权益 */
  price?: number | null;
  onPay: () => void;
  paying?: boolean;
  /** 支付结果提示（成功绿色/失败红色） */
  payMsg?: string;
  /** 权益说明区块（会员抵扣、说明等） */
  children?: React.ReactNode;
  accent?: string;
}) {
  useBodyScrollLock(open);
  usePopupBackHandler(() => {
    if (!paying) onClose();
  }, open && !paying);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,.45)" }} onClick={() => !paying && onClose()}>
      <div
        className="mx-auto w-full rounded-t-2xl bg-white px-5 pt-5"
        style={{
          maxWidth: "420px",
          maxHeight: "85vh",
          overflowY: "auto",
          paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <p className="text-center text-base font-bold text-gray-800">{title}</p>
        {subtitle && <p className="mt-1.5 text-center text-[11px] text-gray-500">{subtitle}</p>}
        {typeof price === "number" && (
          <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: "#FAF6ED", border: "1px solid #ece4cf" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">单次购买（永久解锁）</span>
              <span className="text-lg font-bold" style={{ color: accent }}>
                ¥{price.toFixed(2)}
              </span>
            </div>
          </div>
        )}
        {children}
        {payMsg && (
          <p className="mt-3 text-center text-[11px] font-medium" style={{ color: payMsg.includes("成功") ? "#10b981" : accent }}>
            {payMsg}
          </p>
        )}
        <button
          onClick={onPay}
          disabled={paying}
          className="mt-4 w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity active:opacity-80 disabled:opacity-60"
          style={{ backgroundColor: accent }}
        >
          {paying ? "支付处理中…" : "立即支付"}
        </button>
        <button
          onClick={() => !paying && onClose()}
          className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium text-gray-500"
          style={{ backgroundColor: "#f5f5f5" }}
        >
          暂不解锁
        </button>
      </div>
    </div>
  );
}
