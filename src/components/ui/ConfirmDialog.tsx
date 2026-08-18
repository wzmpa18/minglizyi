"use client";

/**
 * P7-弹窗统一-01：全站统一确认弹窗（居中）
 * 用于：删除、退出、放弃编辑、结束考试等需要用户确认的场景。
 * 统一规范：居中展示 / body 滚动锁 / 返回键优先关闭弹窗 / 最大高度 85vh。
 * 禁止页面自行编写确认弹窗，一律引用本组件。
 */

import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = "确认",
  cancelText = "取消",
  danger = false,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** 危险操作（删除/退出）确认按钮用红色 */
  danger?: boolean;
}) {
  useBodyScrollLock(open);
  usePopupBackHandler(onCancel, open);

  if (!open) return null;

  return (
    <div className="modal-overlay-center" onClick={onCancel}>
      <div className="modal-center" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-label={title}>
        <div className="modal-center-body">
          <div className="flex flex-col items-center px-6 pb-2 pt-7">
            <h3 className="text-base font-bold text-gray-800">{title}</h3>
            {message && <p className="mt-2 text-center text-[13px] leading-relaxed text-gray-500">{message}</p>}
          </div>
          <div className="flex gap-3 px-6 pb-6 pt-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium text-gray-600 transition-colors active:bg-gray-100"
              style={{ backgroundColor: "#f5f5f5" }}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity active:opacity-80"
              style={{ backgroundColor: danger ? "#d9483b" : "#7B2FBE" }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
