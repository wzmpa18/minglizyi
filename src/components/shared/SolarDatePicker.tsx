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

import { useMemo, useState } from "react";
import { listPaipanRecords, type MingzhuProfile } from "@/lib/nativePaipanStore";
import { profileFromRecord, TOOL_NAMES } from "@/lib/paipanProfiles";
import { getUserPermissionLevel } from "@/lib/aiService";

interface SolarDatePickerProps {
  value: string; // "YYYY-MM-DD" 格式
  onChange: (value: string) => void;
  minYear?: number;
  maxYear?: number;
  className?: string;
  onRecordImport?: (profile: MingzhuProfile) => void;
}

export default function SolarDatePicker({
  value,
  onChange,
  minYear = 1900,
  maxYear = 2099,
  className = "",
  onRecordImport,
}: SolarDatePickerProps) {
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [records, setRecords] = useState<Awaited<ReturnType<typeof listPaipanRecords>>>([]);
  const [recordQuery, setRecordQuery] = useState("");
  const [recordMessage, setRecordMessage] = useState("");
  const openRecords = async () => {
    setRecordsOpen(true); setRecordMessage("加载中…");
    if (getUserPermissionLevel() === "visitor") { setRecordMessage("登录后可查看和导入排盘记录"); return; }
    try { setRecords(await listPaipanRecords()); setRecordMessage(""); }
    catch { setRecordMessage("记录读取失败，请稍后重试"); }
  };
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
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-1">
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
      <button type="button" onClick={openRecords} className="shrink-0 rounded-lg border border-purple-200 bg-purple-50 px-2 py-2 text-xs font-semibold text-purple-800">排盘记录</button>
      </div>
      {recordsOpen && <section className="rounded-xl border border-purple-200 bg-purple-50 p-3">
        <div className="mb-2 flex items-center justify-between"><strong className="text-sm text-purple-900">全部工具排盘记录</strong><button type="button" onClick={() => setRecordsOpen(false)} className="text-xs text-purple-700">收起</button></div>
        <input value={recordQuery} onChange={e => setRecordQuery(e.target.value)} placeholder="搜索姓名、工具或备注" className="mb-2 w-full rounded-lg border bg-white p-2 text-sm" />
        <div className="max-h-52 space-y-2 overflow-y-auto">
          {recordMessage ? <p className="text-xs text-gray-500">{recordMessage}</p> : records.filter(r => `${r.title} ${r.input.name || ""} ${r.note || ""} ${TOOL_NAMES[r.tool] || r.tool}`.toLocaleLowerCase().includes(recordQuery.trim().toLocaleLowerCase())).map(r => {
            const p = profileFromRecord(r);
            if (!p) return <div key={r.id} className="rounded-lg bg-white p-2 text-xs text-gray-600">{TOOL_NAMES[r.tool] || r.tool} · {String(r.input.name || r.title)}{r.note ? ` · ${r.note}` : ""}（非出生资料记录）</div>;
            return <div key={r.id} className="rounded-lg bg-white p-2 text-xs"><div className="font-semibold">{p.name} · {TOOL_NAMES[r.tool] || r.tool}</div><div className="my-1 text-gray-600">{p.birthDate} {p.birthTime} {r.note ? `· ${r.note}` : ""}</div><button type="button" className="rounded-lg bg-purple-700 px-3 py-2 text-white" onClick={() => { onChange(p.birthDate || ""); onRecordImport?.(p); setRecordsOpen(false); }}>导入此人资料</button></div>;
          })}
          {!recordMessage && records.length === 0 && <p className="text-xs text-gray-500">暂无记录</p>}
        </div>
      </section>}
    </div>
  );
}
