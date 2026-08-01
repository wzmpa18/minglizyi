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
  showOptions?: boolean;  // 是否显示性别/早晚子时/真太阳时/夏令时选项
  showGender?: boolean;
  showCalType?: boolean;  // 是否显示历法切换
  showToggles?: boolean;  // 是否显示早晚子时/真太阳时/夏令时
  showRegion?: boolean;   // 是否显示地区选择
  showName?: boolean;     // 是否显示姓名输入
  name?: string;
  onNameChange?: (v: string) => void;
  showSaveName?: boolean; // 是否显示保存开关
  saveName?: boolean;
  onSaveNameChange?: (v: boolean) => void;
  submitText?: string;    // 自定义提交按钮文本
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
// 圆形单选按钮组件
// ============================================================================

function RadioOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center cursor-pointer"
    >
      <span
        className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all ${
          selected ? "border-[#7B2FBE]" : "border-gray-300"
        }`}
      >
        {selected && (
          <span className="w-[10px] h-[10px] rounded-full bg-[#7B2FBE]" />
        )}
      </span>
      <span
        className={`ml-1.5 text-sm ${
          selected ? "text-[#7B2FBE] font-medium" : "text-gray-600"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

// ============================================================================
// 历法类型按钮组件（对标吉时雨 rolldate-button-date2）
// ============================================================================

function CalTypeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
        active
          ? "bg-[#7B2FBE] text-white shadow-sm"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

// ============================================================================
// 开关组件
// ============================================================================

function ToggleOption({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={onClick}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-[#7B2FBE]" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

// ============================================================================
// 主组件
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
  const [date, setDate] = useState<DatePickerValue>(initialDate || DEFAULT_DATE);
  const [options, setOptions] = useState<DatePickerOptions>(initialOptions || DEFAULT_OPTIONS);
  const [nameState, setNameState] = useState(name);

  // 编辑模式（手动输入）
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // 地区选择状态
  const [province, setProvince] = useState("北京");
  const [city, setCity] = useState("北京市");

  // 同步初始值
  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    if (initialOptions) setOptions(initialOptions);
  }, [initialOptions]);

  useEffect(() => {
    setNameState(name);
  }, [name]);

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
  // 当前时间（对标吉时雨 app-time-btn）
  // ============================================================

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
    if (onNameChange) onNameChange(nameState);
    onSubmit(date, options);
    onClose();
  }, [date, options, nameState, onNameChange, onSubmit, onClose]);

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
          className="flex h-7 w-10 items-center justify-center text-gray-400 hover:text-[#7B2FBE] active:bg-[#F3EDF7] rounded transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
            className="w-14 rounded px-1 py-0.5 text-center text-lg font-bold hover:bg-[#F3EDF7] transition-colors"
            style={{ color: color || "#333" }}
          >
            {display}
          </button>
        )}
        {/* 下箭头 */}
        <button
          type="button"
          onClick={() => handleScroll(field, -1)}
          className="flex h-7 w-10 items-center justify-center text-gray-400 hover:text-[#7B2FBE] active:bg-[#F3EDF7] rounded transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
        {/* 标题栏 - 带关闭按钮 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sticky top-0 bg-white z-10">
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <span className="text-base font-bold text-gray-800">{title}</span>
          <div className="w-8" />
        </div>

        {/* 姓名输入（可选） */}
        {showName && (
          <div className="px-4 pt-3">
            <div className="flex items-center">
              <label className="w-16 shrink-0 text-sm text-gray-700">姓名</label>
              <input
                type="text"
                value={nameState}
                onChange={(e) => setNameState(e.target.value)}
                placeholder="如需保存，请输入姓名"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-[#7B2FBE]"
              />
              {showSaveName && (
                <div className="ml-2 flex items-center gap-1 text-xs text-gray-500">
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
          </div>
        )}

        {/* 历法类型切换 - 公历/农历/四柱（对标吉时雨 rolldate-button-date2） */}
        {showCalType && (
          <div className="px-4 pt-3">
            <div className="flex gap-2">
              <CalTypeButton
                label="公历"
                active={options.calType === "solar"}
                onClick={() => setOptions(prev => ({ ...prev, calType: "solar" }))}
              />
              <CalTypeButton
                label="农历"
                active={options.calType === "lunar"}
                onClick={() => setOptions(prev => ({ ...prev, calType: "lunar" }))}
              />
              <CalTypeButton
                label="四柱"
                active={options.calType === "sizhu"}
                onClick={() => setOptions(prev => ({ ...prev, calType: "sizhu" }))}
              />
            </div>
          </div>
        )}

        {/* 日期滚动选择区 - 上下箭头+中间数字 */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-center gap-1">
            {renderEditableCell("year", date.year, `${date.year}年`, "#7B2FBE")}
            {renderEditableCell("month", date.month, `${date.month}月`, "#333")}
            {renderEditableCell("day", date.day, `${date.day}日`, "#333")}
            {renderEditableCell("hour", date.hour, `${date.hour}时`, "#333")}
            {showMinute && renderEditableCell("minute", date.minute, `${date.minute}分`, "#999")}
          </div>
          {/* 当前时间按钮（对标吉时雨 app-time-btn） */}
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={handleNow}
              className="rounded-full border border-[#7B2FBE] bg-[#F3EDF7] px-4 py-1.5 text-sm font-medium text-[#7B2FBE] transition-colors hover:bg-[#C9A8DC]"
            >
              当前时间
            </button>
          </div>
        </div>

        {/* 选项区 */}
        {showOptions && (
          <div className="border-t border-gray-100 px-4 py-3 space-y-3">
            {/* 性别 - 圆形单选按钮 */}
            {showGender && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">性别</span>
                <div className="flex gap-4">
                  <RadioOption
                    label="男"
                    selected={options.gender === "male"}
                    onClick={() => setOptions(prev => ({ ...prev, gender: "male" }))}
                  />
                  <RadioOption
                    label="女"
                    selected={options.gender === "female"}
                    onClick={() => setOptions(prev => ({ ...prev, gender: "female" }))}
                  />
                </div>
              </div>
            )}

            {/* 早晚子时 / 真太阳时 / 夏令时 - 开关控件 */}
            {showToggles && (
              <div className="space-y-2.5">
                <ToggleOption
                  label="早晚子时"
                  checked={options.zaoWanZi}
                  onClick={() => setOptions(prev => ({ ...prev, zaoWanZi: !prev.zaoWanZi }))}
                />
                <ToggleOption
                  label="真太阳时"
                  checked={options.zhenTaiyang}
                  onClick={() => setOptions(prev => ({ ...prev, zhenTaiyang: !prev.zhenTaiyang }))}
                />
                <ToggleOption
                  label="夏令时"
                  checked={options.xiaLing}
                  onClick={() => setOptions(prev => ({ ...prev, xiaLing: !prev.xiaLing }))}
                />
              </div>
            )}

            {/* 地区选择 - 下拉选择器 */}
            {showRegion && options.zhenTaiyang && (
              <div>
                <span className="mb-1.5 block text-sm text-gray-700">地区</span>
                <div className="flex gap-2">
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-[#7B2FBE]"
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
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-[#7B2FBE]"
                  >
                    <option>{province}</option>
                    <option>其他</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 排盘按钮 - 醒目置底（对标吉时雨 submitFormBtn "排盘"） */}
        <div className="px-4 pb-5 pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full rounded-full bg-[#7B2FBE] text-white font-bold text-lg py-2.5 shadow-lg active:bg-[#5B1A8A] transition-colors"
          >
            {submitText}
          </button>
        </div>
      </div>
    </div>
  );
}
