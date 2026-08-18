"use client";

/**
 * P7-弹窗统一-01：全站统一选择弹窗（居中）
 * 用于：考试类型、日期、筛选等单项选择场景。
 * 红线：「选择考试类型」必须使用本组件居中展示，禁止贴底部 BottomSheet。
 * 统一规范：居中展示 / body 滚动锁 / 返回键优先关闭弹窗 / 最大高度 85vh 内容区滚动。
 */

import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

export interface SelectorOption {
  id: string;
  name: string;
  desc?: string;
}

export function SelectorDialog({
  open,
  onClose,
  title,
  options,
  value,
  onSelect,
  footer,
  accent = "#7B2FBE",
  maxWidth = 340,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  options: SelectorOption[];
  /** 当前选中项 id */
  value?: string;
  /** 选中某项后的回调（组件不自动关闭，由页面决定） */
  onSelect: (id: string) => void;
  /** 底部弱化说明（如"更多类别由运营后台配置开放"） */
  footer?: string;
  /** 主题色（默认品牌紫） */
  accent?: string;
  maxWidth?: number;
}) {
  useBodyScrollLock(open);
  usePopupBackHandler(onClose, open);

  if (!open) return null;

  return (
    <div className="modal-overlay-center" onClick={onClose}>
      <div
        className="modal-center"
        style={{ maxWidth: `${maxWidth}px` }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="modal-center-body">
          <div className="px-5 pb-1 pt-5">
            <p className="text-center text-sm font-bold text-gray-800">{title}</p>
          </div>
          <div className="px-4" style={{ maxHeight: "56vh", overflowY: "auto" }}>
            {options.map((o) => {
              const selected = o.id === value;
              return (
                <button
                  key={o.id}
                  onClick={() => onSelect(o.id)}
                  className="mb-2 flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium"
                  style={{
                    backgroundColor: selected ? accent + "12" : "#f7f7f7",
                    color: selected ? accent : "#333333",
                  }}
                >
                  <span className="text-left">
                    {o.name}
                    {o.desc && <span className="mt-0.5 block text-[10px] font-normal text-gray-400">{o.desc}</span>}
                  </span>
                  {selected && <span style={{ color: accent }}>✓</span>}
                </button>
              );
            })}
            {footer && <p className="pb-1 pt-1 text-center text-[10px] text-gray-400">{footer}</p>}
          </div>
          <div className="px-5 pb-5 pt-2">
            <button
              onClick={onClose}
              className="w-full rounded-xl py-2.5 text-sm font-medium text-gray-600 transition-colors active:bg-gray-100"
              style={{ backgroundColor: "#f5f5f5" }}
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
