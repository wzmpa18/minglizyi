"use client";

/**
 * 公历日期选择器组件（v21.2）
 * 
 * 替代原生 <input type="date">，解决手机端无法正常输入日期的问题。
 * 使用三个 <select> 下拉框分别选择年、月、日，兼容所有浏览器和 WebView。
 * 
 * 使用方式：
 * <SolarDatePicker value={birthDate} onChange={setBirthDate} />
 * 
 * value 格式: "YYYY-MM-DD"（如 "1982-10-13"）
 */

import { useMemo } from "react";

interface SolarDatePickerProps {
  value: string; // "YYYY-MM-DD" 格式
  onChange: (value: string) => void;
  minYear?: number;
  maxYear?: number;
  className?: string;
}

export default function SolarDatePicker({
  value,
  onChange,
  minYear = 1900,
  maxYear = 2099,
  className = "",
}: SolarDatePickerProps) {
  // 解析当前值
  const parts = value ? value.split("-") : [];
  const year = parts[0] ? parseInt(parts[0], 10) : 0;
  const month = parts[1] ? parseInt(parts[1], 10) : 0;
  const day = parts[2] ? parseInt(parts[2], 10) : 0;

  // 生成年份选项
  const yearOptions = useMemo(() => {
    const arr: number[] = [];
    for (let y = minYear; y <= maxYear; y++) arr.push(y);
    return arr;
  }, [minYear, maxYear]);

  // 生成月份选项
  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }, []);

  // 根据年月计算当月天数
  const daysInMonth = useMemo(() => {
    if (!year || !month) return 31;
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  // 生成日期选项
  const dayOptions = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const handleYearChange = (y: number) => {
    const m = month || 1;
    const d = Math.min(day || 1, new Date(y, m, 0).getDate());
    onChange(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  };

  const handleMonthChange = (m: number) => {
    const y = year || new Date().getFullYear();
    const d = Math.min(day || 1, new Date(y, m, 0).getDate());
    onChange(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  };

  const handleDayChange = (d: number) => {
    const y = year || new Date().getFullYear();
    const m = month || 1;
    onChange(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  };

  return (
    <div className={`flex gap-1 ${className}`}>
      <select
        value={year || ""}
        onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
        className="flex-1 min-w-0 rounded-lg border border-gray-200 px-1 py-2 text-sm outline-none focus:border-[#7B2FBE]"
      >
        {!year && <option value="">年</option>}
        {yearOptions.map((y) => (
          <option key={y} value={y}>{y}年</option>
        ))}
      </select>
      <select
        value={month || ""}
        onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
        className="flex-1 min-w-0 rounded-lg border border-gray-200 px-1 py-2 text-sm outline-none focus:border-[#7B2FBE]"
      >
        {!month && <option value="">月</option>}
        {monthOptions.map((m) => (
          <option key={m} value={m}>{m}月</option>
        ))}
      </select>
      <select
        value={day || ""}
        onChange={(e) => handleDayChange(parseInt(e.target.value, 10))}
        className="flex-1 min-w-0 rounded-lg border border-gray-200 px-1 py-2 text-sm outline-none focus:border-[#7B2FBE]"
      >
        {!day && <option value="">日</option>}
        {dayOptions.map((d) => (
          <option key={d} value={d}>{d}日</option>
        ))}
      </select>
    </div>
  );
}
