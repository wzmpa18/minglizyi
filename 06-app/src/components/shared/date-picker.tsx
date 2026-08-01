"use client";

import { useState, useCallback, useEffect, useRef } from "react";

// ============================================================================
// 类型定义
// ============================================================================

export interface DatePickerValue {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface DatePickerOptions {
  gender: "male" | "female";
  calType: "solar" | "lunar" | "sizhu";
  zaoWanZi: boolean;   // 早晚子时
  zhenTaiyang: boolean; // 真太阳时
  xiaLing: boolean;     // 夏令时
}

export interface DatePickerProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (date: DatePickerValue, options: DatePickerOptions) => void;
  initialDate?: DatePickerValue;
  initialOptions?: DatePickerOptions;
  showMinute?: boolean;
  showOptions?: boolean; // 是否显示性别/早晚子时/真太阳时/夏令时选项
  showGender?: boolean;
  title?: string;
}

// ============================================================================
// 默认值
// ============================================================================

const now = new Date();
const DEFAULT_DATE: DatePickerValue = {
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate(),
  hour: now.getHours(),
  minute: 0,
};

const DEFAULT_OPTIONS: DatePickerOptions = {
  gender: "male",
  calType: "solar",
  zaoWanZi: false,
  zhenTaiyang: false,
  xiaLing: false,
};

// ============================================================================
// 快捷日期按钮数据
// ============================================================================

const QUICK_YEARS = [1990, 1985, 2000, 2020, 1995, 2010, 1980, 1970, 1960];
const QUICK_MONTHS = [1, 6, 12, 3, 9, 2, 5, 8, 11, 4, 7, 10];
const QUICK_DAYS = [1, 15, 28, 10, 20, 5, 25, 8, 18, 12, 22, 3];
const QUICK_HOURS = [0, 6, 12, 18, 8, 14, 20, 2, 10, 16, 22, 4];

// ============================================================================
// 月份天数
// ============================================================================

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return isLeap ? 29 : 28;
  }
  const days31 = [1, 3, 5, 7, 8, 10, 12];
  return days31.includes(month) ? 31 : 30;
}

// ============================================================================
// 组件
// ============================================================================

export default function DatePicker({
  show,
  onClose,
  onSubmit,
  initialDate,
  initialOptions,
  showMinute = false,
  showOptions = true,
  showGender = true,
  title = "选择日期",
}: DatePickerProps) {
  const [date, setDate] = useState<DatePickerValue>(initialDate || DEFAULT_DATE);
  const [options, setOptions] = useState<DatePickerOptions>(initialOptions || DEFAULT_OPTIONS);

  // 编辑模式（手动输入）
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // 同步初始值
  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    if (initialOptions) setOptions(initialOptions);
  }, [initialOptions]);

  // 编辑模式自动聚焦
  useEffect(() => {
    if (editField && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editField]);

  // ============================================================
  // 日期修改
  // ============================================================

  const setYear = useCallback((v: number) => {
    setDate(prev => {
      const y = Math.max(1900, Math.min(2100, v));
      const maxDay = daysInMonth(y, prev.month);
      return { ...prev, year: y, day: Math.min(prev.day, maxDay) };
    });
  }, []);

  const setMonth = useCallback((v: number) => {
    setDate(prev => {
      const m = Math.max(1, Math.min(12, v));
      const maxDay = daysInMonth(prev.year, m);
      return { ...prev, month: m, day: Math.min(prev.day, maxDay) };
    });
  }, []);

  const setDay = useCallback((v: number) => {
    setDate(prev => {
      const maxDay = daysInMonth(prev.year, prev.month);
      const d = Math.max(1, Math.min(maxDay, v));
      return { ...prev, day: d };
    });
  }, []);

  const setHour = useCallback((v: number) => {
    setDate(prev => ({ ...prev, hour: Math.max(0, Math.min(23, v)) }));
  }, []);

  const setMinute = useCallback((v: number) => {
    setDate(prev => ({ ...prev, minute: Math.max(0, Math.min(59, v)) }));
  }, []);

  // ============================================================
  // 编辑模式处理
  // ============================================================

  const startEdit = useCallback((field: string, currentValue: number) => {
    setEditField(field);
    setEditValue(String(currentValue));
  }, []);

  const confirmEdit = useCallback(() => {
    if (editField === null) return;
    const num = parseInt(editValue, 10);
    if (isNaN(num)) {
      setEditField(null);
      return;
    }
    switch (editField) {
      case "year": setYear(num); break;
      case "month": setMonth(num); break;
      case "day": setDay(num); break;
      case "hour": setHour(num); break;
      case "minute": setMinute(num); break;
    }
    setEditField(null);
  }, [editField, editValue, setYear, setMonth, setDay, setHour, setMinute]);

  // ============================================================
  // 滚轮切换
  // ============================================================

  const handleScroll = useCallback((field: string, delta: number) => {
    switch (field) {
      case "year": setYear(date.year - delta); break;
      case "month": setMonth(date.month - delta); break;
      case "day": setDay(date.day - delta); break;
      case "hour": setHour(date.hour - delta); break;
      case "minute": setMinute(date.minute - delta); break;
    }
  }, [date, setYear, setMonth, setDay, setHour, setMinute]);

  // ============================================================
  // 提交
  // ============================================================

  const handleSubmit = useCallback(() => {
    onSubmit(date, options);
    onClose();
  }, [date, options, onSubmit, onClose]);

  // ============================================================
  // 渲染
  // ============================================================

  if (!show) return null;

  const renderEditableCell = (
    field: string,
    value: number,
    display: string,
    color?: string,
  ) => {
    const isEditing = editField === field;
    return (
      <div className="flex flex-col items-center">
        {/* 上箭头 */}
        <button
          type="button"
          onClick={() => handleScroll(field, 1)}
          className="flex h-6 w-10 items-center justify-center text-gray-400 hover:text-gray-600"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
        {/* 数值 */}
        {isEditing ? (
          <input
            ref={editInputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={confirmEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmEdit();
              if (e.key === "Escape") setEditField(null);
            }}
            className="w-14 rounded border border-[#7B2FBE] px-1 py-0.5 text-center text-lg font-bold outline-none"
            style={{ color: color || "#333" }}
          />
        ) : (
          <button
            type="button"
            onClick={() => startEdit(field, value)}
            className="w-14 rounded px-1 py-0.5 text-center text-lg font-bold hover:bg-gray-100"
            style={{ color: color || "#333" }}
          >
            {display}
          </button>
        )}
        {/* 下箭头 */}
        <button
          type="button"
          onClick={() => handleScroll(field, -1)}
          className="flex h-6 w-10 items-center justify-center text-gray-400 hover:text-gray-600"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[420px] rounded-t-2xl bg-white shadow-2xl"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <span className="text-base font-bold text-gray-800">{title}</span>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-full bg-[#7B2FBE] px-5 py-1.5 text-sm font-bold text-white"
          >
            确定
          </button>
        </div>

        {/* 日期滚动选择区 */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-center gap-1">
            {/* 年 */}
            {renderEditableCell("year", date.year, `${date.year}年`, "#7B2FBE")}
            {/* 月 */}
            {renderEditableCell("month", date.month, `${date.month}月`, "#333")}
            {/* 日 */}
            {renderEditableCell("day", date.day, `${date.day}日`, "#333")}
            {/* 时 */}
            {renderEditableCell("hour", date.hour, `${date.hour}时`, "#333")}
            {/* 分（可选） */}
            {showMinute && renderEditableCell("minute", date.minute, `${date.minute}分`, "#999")}
          </div>
        </div>

        {/* 快捷选择按钮 */}
        <div className="px-4 pb-3">
          {/* 年份快捷 */}
          <div className="mb-2">
            <span className="mb-1 block text-xs text-gray-400">年份</span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_YEARS.map(y => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className={`rounded border px-2 py-0.5 text-xs ${
                    date.year === y
                      ? "border-[#7B2FBE] bg-[#7B2FBE]/10 text-[#7B2FBE] font-medium"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {y}年
                </button>
              ))}
            </div>
          </div>

          {/* 月份快捷 */}
          <div className="mb-2">
            <span className="mb-1 block text-xs text-gray-400">月份</span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_MONTHS.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMonth(m)}
                  className={`rounded border px-2 py-0.5 text-xs ${
                    date.month === m
                      ? "border-[#7B2FBE] bg-[#7B2FBE]/10 text-[#7B2FBE] font-medium"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {m}月
                </button>
              ))}
            </div>
          </div>

          {/* 日期快捷 */}
          <div className="mb-2">
            <span className="mb-1 block text-xs text-gray-400">日期</span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_DAYS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDay(d)}
                  className={`rounded border px-2 py-0.5 text-xs ${
                    date.day === d
                      ? "border-[#7B2FBE] bg-[#7B2FBE]/10 text-[#7B2FBE] font-medium"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {d}日
                </button>
              ))}
            </div>
          </div>

          {/* 时辰快捷 */}
          <div className="mb-2">
            <span className="mb-1 block text-xs text-gray-400">时辰</span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_HOURS.map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHour(h)}
                  className={`rounded border px-2 py-0.5 text-xs ${
                    date.hour === h
                      ? "border-[#7B2FBE] bg-[#7B2FBE]/10 text-[#7B2FBE] font-medium"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {h}时
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 选项区 */}
        {showOptions && (
          <div className="border-t border-gray-100 px-4 py-3">
            {/* 性别 */}
            {showGender && (
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-gray-700">性别</span>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOptions(prev => ({ ...prev, gender: "male" }))}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                      options.gender === "male"
                        ? "bg-[#7B2FBE] text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    男
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptions(prev => ({ ...prev, gender: "female" }))}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                      options.gender === "female"
                        ? "bg-[#7B2FBE] text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    女
                  </button>
                </div>
              </div>
            )}

            {/* 历法类型 */}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-gray-700">历法</span>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {(["solar", "lunar", "sizhu"] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setOptions(prev => ({ ...prev, calType: t }))}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      options.calType === t
                        ? "bg-[#7B2FBE] text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {{ solar: "公历", lunar: "农历", sizhu: "四柱" }[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* 早晚子时 */}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-gray-700">早晚子时</span>
              <button
                type="button"
                onClick={() => setOptions(prev => ({ ...prev, zaoWanZi: !prev.zaoWanZi }))}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  options.zaoWanZi ? "bg-[#7B2FBE]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    options.zaoWanZi ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {/* 真太阳时 */}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-gray-700">真太阳时</span>
              <button
                type="button"
                onClick={() => setOptions(prev => ({ ...prev, zhenTaiyang: !prev.zhenTaiyang }))}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  options.zhenTaiyang ? "bg-[#7B2FBE]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    options.zhenTaiyang ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {/* 夏令时 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">夏令时</span>
              <button
                type="button"
                onClick={() => setOptions(prev => ({ ...prev, xiaLing: !prev.xiaLing }))}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  options.xiaLing ? "bg-[#7B2FBE]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    options.xiaLing ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* 底部安全区 */}
        <div className="h-4" />
      </div>
    </div>
  );
}