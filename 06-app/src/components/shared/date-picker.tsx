"use client";

import { useState, useCallback, useEffect } from "react";

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
  zaoWanZi: boolean;
  zhenTaiyang: boolean;
  xiaLing: boolean;
}

export interface DatePickerProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (date: DatePickerValue, options: DatePickerOptions) => void;
  initialDate?: DatePickerValue;
  initialOptions?: DatePickerOptions;
  showMinute?: boolean;
  showOptions?: boolean;
  showGender?: boolean;
  showCalType?: boolean;
  showToggles?: boolean;
  showRegion?: boolean;
  showName?: boolean;
  name?: string;
  onNameChange?: (v: string) => void;
  showSaveName?: boolean;
  saveName?: boolean;
  onSaveNameChange?: (v: boolean) => void;
  submitText?: string;
  title?: string;
}

// ============================================================================
// 默认值 - 使用工厂函数避免模块级 new Date() 导致 hydration mismatch
// ============================================================================

function createDefaultDate(): DatePickerValue {
  const n = new Date();
  return {
    year: n.getFullYear(),
    month: n.getMonth() + 1,
    day: n.getDate(),
    hour: n.getHours(),
    minute: 0,
  };
}

const DEFAULT_OPTIONS: DatePickerOptions = {
  gender: "male",
  calType: "solar",
  zaoWanZi: false,
  zhenTaiyang: false,
  xiaLing: false,
};

// ============================================================================
// 工具函数
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
// 主组件 - 完全对标吉时雨 component_basic_data.html
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
  showCalType = true,
  showToggles = true,
  showRegion = false,
  showName = false,
  name = "",
  onNameChange,
  showSaveName = false,
  saveName = false,
  onSaveNameChange,
  submitText = "排盘",
  title = "选择日期",
}: DatePickerProps) {
  const [date, setDate] = useState<DatePickerValue>(initialDate || createDefaultDate());
  const [options, setOptions] = useState<DatePickerOptions>(initialOptions || DEFAULT_OPTIONS);
  const [nameState, setNameState] = useState(name);

  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    if (initialOptions) setOptions(initialOptions);
  }, [initialOptions]);

  useEffect(() => {
    setNameState(name);
  }, [name]);

  // ============================================================
  // 日期修改 - 使用原生select的onChange直接更新
  // ============================================================

  const updateDate = useCallback((field: keyof DatePickerValue, value: number) => {
    setDate(prev => {
      const next = { ...prev, [field]: value };
      // 如果改了年份或月份，需要校正日期
      if (field === "year" || field === "month") {
        const maxDay = daysInMonth(next.year, next.month);
        if (next.day > maxDay) next.day = maxDay;
      }
      return next;
    });
  }, []);

  // 当前时间
  const handleNow = useCallback(() => {
    const n = new Date();
    setDate({
      year: n.getFullYear(),
      month: n.getMonth() + 1,
      day: n.getDate(),
      hour: n.getHours(),
      minute: n.getMinutes(),
    });
  }, []);

  // 提交
  const handleSubmit = useCallback(() => {
    if (onNameChange) onNameChange(nameState);
    onSubmit(date, options);
    onClose();
  }, [date, options, nameState, onNameChange, onSubmit, onClose]);

  if (!show) return null;

  // 生成选项数组
  const years = Array.from({ length: 121 }, (_, i) => 1900 + i); // 1900-2020... actually 1900-2100
  const yearsExtended = Array.from({ length: 201 }, (_, i) => 1900 + i); // 1900-2100
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const maxDay = daysInMonth(date.year, date.month);
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  // select 样式
  const selectClass = "flex-1 rounded-lg border border-gray-200 px-2 py-2 text-sm text-center outline-none focus:border-[#7B2FBE] bg-white cursor-pointer";

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center">
      {/* 遮罩层 - 独立div确保点击可关闭 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      {/* 弹窗内容 */}
      <div
        className="relative w-full max-w-[420px] rounded-t-2xl bg-white shadow-2xl"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 - 右上角×关闭按钮（对标吉时雨 closeBtn: 1） */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sticky top-0 bg-white z-10">
          <div className="w-8" />
          <span className="text-base font-bold text-gray-800">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* 1. 姓名 + 保存开关（对标吉时雨 福主姓名 + autosave switch） */}
          {showName && (
            <div className="flex items-center gap-2">
              <label className="w-14 shrink-0 text-sm text-gray-700">姓名</label>
              <input
                type="text"
                value={nameState}
                onChange={(e) => setNameState(e.target.value)}
                placeholder="如需保存，请输入姓名"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7B2FBE]"
              />
              {showSaveName && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>{saveName ? "保存" : "不存"}</span>
                  <button
                    type="button"
                    onClick={() => onSaveNameChange?.(!saveName)}
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      saveName ? "bg-[#7B2FBE]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        saveName ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. 性别 + 历法切换（对标吉时雨 sex radio + rolldate-button-date-group2） */}
          {(showGender || showCalType) && (
            <div className="flex items-center justify-between">
              {showGender && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOptions(prev => ({ ...prev, gender: "male" }))}
                    className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                      options.gender === "male"
                        ? "bg-[#7B2FBE] text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    男
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptions(prev => ({ ...prev, gender: "female" }))}
                    className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                      options.gender === "female"
                        ? "bg-[#7B2FBE] text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    女
                  </button>
                </div>
              )}
              {showCalType && (
                <div className="flex items-center gap-1">
                  {([
                    { val: "solar", label: "公历" },
                    { val: "lunar", label: "农历" },
                    { val: "sizhu", label: "四柱" },
                  ] as const).map(t => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => setOptions(prev => ({ ...prev, calType: t.val }))}
                      className={`px-2.5 py-1 rounded text-sm font-medium transition-all ${
                        options.calType === t.val
                          ? "bg-[#7B2FBE] text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. 日期 - 原生select下拉框（对标吉时雨 mydate + RolldateFull） */}
          <div>
            <label className="mb-1 block text-sm text-gray-700">日期</label>
            <div className="flex items-center gap-1.5">
              <select
                value={date.year}
                onChange={(e) => updateDate("year", parseInt(e.target.value, 10))}
                className={selectClass}
              >
                {yearsExtended.map(y => (
                  <option key={y} value={y}>{y}年</option>
                ))}
              </select>
              <select
                value={date.month}
                onChange={(e) => updateDate("month", parseInt(e.target.value, 10))}
                className={selectClass}
              >
                {months.map(m => (
                  <option key={m} value={m}>{m}月</option>
                ))}
              </select>
              <select
                value={date.day}
                onChange={(e) => updateDate("day", parseInt(e.target.value, 10))}
                className={selectClass}
              >
                {days.map(d => (
                  <option key={d} value={d}>{d}日</option>
                ))}
              </select>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <select
                value={date.hour}
                onChange={(e) => updateDate("hour", parseInt(e.target.value, 10))}
                className={selectClass}
              >
                {hours.map(h => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}时</option>
                ))}
              </select>
              {showMinute && (
                <select
                  value={date.minute}
                  onChange={(e) => updateDate("minute", parseInt(e.target.value, 10))}
                  className={selectClass}
                >
                  {minutes.map(m => (
                    <option key={m} value={m}>{String(m).padStart(2, "0")}分</option>
                  ))}
                </select>
              )}
              {/* 当前时间按钮（对标吉时雨 app-time-btn） */}
              <button
                type="button"
                onClick={handleNow}
                className="shrink-0 rounded-lg border border-[#7B2FBE] bg-[#F3EDF7] px-3 py-2 text-sm font-medium text-[#7B2FBE] transition-colors hover:bg-[#C9A8DC]"
              >
                当前
              </button>
            </div>
          </div>

          {/* 4. 早晚子时（对标吉时雨 wanzishi radio） */}
          {showOptions && showToggles && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">早晚子时</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOptions(prev => ({ ...prev, zaoWanZi: true }))}
                    className={`px-3 py-1 rounded text-sm transition-all ${
                      options.zaoWanZi
                        ? "bg-[#7B2FBE] text-white font-medium"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    是
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptions(prev => ({ ...prev, zaoWanZi: false }))}
                    className={`px-3 py-1 rounded text-sm transition-all ${
                      !options.zaoWanZi
                        ? "bg-[#7B2FBE] text-white font-medium"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    否
                  </button>
                </div>
              </div>

              {/* 5. 真太阳时 + 夏令时（对标吉时雨 realsun radio + summertime switch） */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">真太阳时</span>
                  <button
                    type="button"
                    onClick={() => setOptions(prev => ({ ...prev, zhenTaiyang: true }))}
                    className={`px-2.5 py-0.5 rounded text-sm transition-all ${
                      options.zhenTaiyang
                        ? "bg-[#7B2FBE] text-white font-medium"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    是
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptions(prev => ({ ...prev, zhenTaiyang: false }))}
                    className={`px-2.5 py-0.5 rounded text-sm transition-all ${
                      !options.zhenTaiyang
                        ? "bg-[#7B2FBE] text-white font-medium"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    否
                  </button>
                </div>
                {/* 夏令时开关（对标吉时雨 summertime switch） */}
                <div className="flex items-center gap-1.5">
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

              {/* 6. 地区选择 - 仅勾选真太阳时时显示（对标吉时雨 form-diqu） */}
              {showRegion && options.zhenTaiyang && (
                <div>
                  <label className="mb-1 block text-sm text-gray-700">地区</label>
                  <div className="flex gap-2">
                    <select
                      value={options.zhenTaiyang ? "北京" : ""}
                      onChange={() => {}}
                      className="flex-1 rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-[#7B2FBE] bg-white"
                    >
                      <option>北京</option>
                      <option>上海</option>
                      <option>广东</option>
                      <option>浙江</option>
                      <option>江苏</option>
                      <option>四川</option>
                      <option>湖北</option>
                      <option>湖南</option>
                      <option>山东</option>
                      <option>河南</option>
                      <option>河北</option>
                      <option>福建</option>
                      <option>重庆</option>
                      <option>陕西</option>
                      <option>辽宁</option>
                      <option>吉林</option>
                      <option>黑龙江</option>
                      <option>安徽</option>
                      <option>江西</option>
                      <option>云南</option>
                      <option>贵州</option>
                      <option>甘肃</option>
                      <option>山西</option>
                      <option>广西</option>
                      <option>海南</option>
                      <option>天津</option>
                      <option>内蒙古</option>
                      <option>新疆</option>
                      <option>西藏</option>
                      <option>宁夏</option>
                      <option>青海</option>
                    </select>
                    <select
                      className="flex-1 rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-[#7B2FBE] bg-white"
                    >
                      <option>北京市</option>
                      <option>其他</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 排盘按钮（对标吉时雨 submitFormBtn class="app-paipan-button"） */}
        <div className="px-4 pb-5 pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full rounded-full bg-[#7B2FBE] text-white font-bold text-lg py-3 shadow-lg active:bg-[#5B1A8A] transition-colors"
          >
            {submitText}
          </button>
        </div>
      </div>
    </div>
  );
}
