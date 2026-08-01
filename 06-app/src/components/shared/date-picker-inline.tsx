"use client";

import { useState, useCallback, useEffect, useRef } from "react";

// ============================================================================
// 内联日期选择器（上下箭头+可编辑输入+快捷按钮）
// 用于表单内部，非弹窗模式
// ============================================================================

export interface DatePickerInlineProps {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  onYearChange: (v: number) => void;
  onMonthChange: (v: number) => void;
  onDayChange: (v: number) => void;
  onHourChange: (v: number) => void;
  onMinuteChange?: (v: number) => void;
  showMinute?: boolean;
}

export function DatePickerInline({
  year, month, day, hour, minute = 0,
  onYearChange, onMonthChange, onDayChange, onHourChange, onMinuteChange,
  showMinute = false,
}: DatePickerInlineProps) {
  const [editField, setEditField] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editField]);

  const confirmEdit = useCallback(() => {
    if (!editField) return;
    const n = parseInt(editVal, 10);
    if (isNaN(n)) { setEditField(null); return; }
    switch (editField) {
      case "year": onYearChange(n); break;
      case "month": onMonthChange(n); break;
      case "day": onDayChange(n); break;
      case "hour": onHourChange(n); break;
      case "minute": onMinuteChange?.(n); break;
    }
    setEditField(null);
  }, [editField, editVal, onYearChange, onMonthChange, onDayChange, onHourChange, onMinuteChange]);

  const renderCell = (field: string, val: number, display: string, color?: string) => {
    const isEdit = editField === field;
    const stepUp = () => {
      switch (field) {
        case "year": onYearChange(val + 1); break;
        case "month": onMonthChange(val + 1); break;
        case "day": onDayChange(val + 1); break;
        case "hour": onHourChange(val + 1); break;
        case "minute": onMinuteChange?.(val + 1); break;
      }
    };
    const stepDown = () => {
      switch (field) {
        case "year": onYearChange(val - 1); break;
        case "month": onMonthChange(val - 1); break;
        case "day": onDayChange(val - 1); break;
        case "hour": onHourChange(val - 1); break;
        case "minute": onMinuteChange?.(val - 1); break;
      }
    };
    return (
      <div className="flex flex-col items-center" key={field}>
        <button
          type="button"
          onClick={stepUp}
          className="flex h-5 w-8 items-center justify-center text-gray-400 hover:text-gray-600"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
        {isEdit ? (
          <input
            ref={inputRef}
            type="number"
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onBlur={confirmEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmEdit();
              if (e.key === "Escape") setEditField(null);
            }}
            className="w-12 rounded border border-[#7B2FBE] px-1 py-0.5 text-center text-base font-bold outline-none"
            style={{ color: color || "#333" }}
          />
        ) : (
          <button
            type="button"
            onClick={() => { setEditField(field); setEditVal(String(val)); }}
            className="w-12 rounded px-1 py-0.5 text-center text-base font-bold hover:bg-gray-100"
            style={{ color: color || "#333" }}
          >
            {display}
          </button>
        )}
        <button
          type="button"
          onClick={stepDown}
          className="flex h-5 w-8 items-center justify-center text-gray-400 hover:text-gray-600"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div className="flex items-center justify-center gap-0.5">
      {renderCell("year", year, `${year}年`, "#7B2FBE")}
      {renderCell("month", month, `${month}月`)}
      {renderCell("day", day, `${day}日`)}
      {renderCell("hour", hour, `${hour}时`)}
      {showMinute && renderCell("minute", minute, `${minute}分`, "#999")}
    </div>
  );
}