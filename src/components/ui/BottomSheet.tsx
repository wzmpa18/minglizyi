"use client";

/**
 * P7-弹窗统一-01：全站统一底部轻量菜单（BottomSheet）
 * 用于：用户主动点击触发的轻量菜单（设置、更多操作等）。
 * 红线：仅限用户主动点击触发；「选择考试类型」等选择类场景必须用居中 SelectorDialog，禁止用本组件。
 * 统一规范：最大高度 85vh 内容区滚动 / 预留底部导航高度+安全区 / body 滚动锁 / 返回键优先关闭弹窗。
 */

import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useBodyScrollLock(open);
  usePopupBackHandler(onClose, open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,.45)" }} onClick={onClose}>
      <div
        className="mx-auto w-full rounded-t-2xl bg-white px-4 pb-8 pt-4"
        style={{
          maxWidth: "420px",
          maxHeight: "85vh",
          overflowY: "auto",
          paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title || "底部菜单"}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" />
        {title && <p className="mb-3 text-center text-sm font-bold text-gray-800">{title}</p>}
        {children}
      </div>
    </div>
  );
}
