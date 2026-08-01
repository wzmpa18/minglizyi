"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Solar, SolarMonth } from "lunar-javascript";
import ClientSelector from "@/components/ClientSelector";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";

const BRAND = "#7B2FBE";
const WEEKDAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

interface DayCell {
  solar: Solar;
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  lunarDay: string; // 农历日/月/节气/节日
  lunarFest: string | null; // 节气或节日（优先显示）
  ganZhi: string;
  isToday: boolean;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isJieQi: boolean;
}

export default function WannianliPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [selectedYmd, setSelectedYmd] = useState<{ y: number; m: number; d: number }>({
    y: today.getFullYear(),
    m: today.getMonth() + 1,
    d: today.getDate(),
  });
  const [showPicker, setShowPicker] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);
  const [saveTip, setSaveTip] = useState("");

  // URL参数clientId
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) { const c = getClient(cid); if (c) setSelectedClient(c); }
    const prefill = getPrefillData("wannianli");
    if (prefill) { clearPrefillData("wannianli"); }
  }, []);

  const handleSaveRecord = () => {
    if (!selectedClient) { alert("请先选择客户"); return; }
    const data = { date: `${selectedYmd.y}-${selectedYmd.m}-${selectedYmd.d}`, selectedYmd };
    try {
      saveRecord({ clientId: selectedClient.id, type: "wannianli", data, note: "", status: "pending" });
      setSaveTip("已保存到客户档案");
      setTimeout(() => setSaveTip(""), 2000);
    } catch(e) { console.error("保存失败:", e); }
  };

  // ===== 月历数据 =====
  const calendarData = useMemo(() => {
    const sm = SolarMonth.fromYm(viewYear, viewMonth);
    const days = sm.getDays();
    const firstDayWeek = days[0].getWeek(); // 0=周日
    const currentMonth = viewMonth;

    // 填充上月末尾
    const cells: DayCell[] = [];
    if (firstDayWeek > 0) {
      const prevSm = sm.next(-1);
      const prevDays = prevSm.getDays();
      for (let i = firstDayWeek - 1; i >= 0; i--) {
        const s = prevDays[prevDays.length - 1 - i];
        cells.push(buildCell(s, false, currentMonth));
      }
    }
    // 当月
    for (const s of days) {
      cells.push(buildCell(s, true, currentMonth));
    }
    // 填充下月开头
    const remainder = 7 - (cells.length % 7);
    if (remainder > 0 && remainder < 7) {
      const nextSm = sm.next(1);
      const nextDays = nextSm.getDays();
      for (let i = 0; i < remainder; i++) {
        cells.push(buildCell(nextDays[i], false, currentMonth));
      }
    }
    return cells;
  }, [viewYear, viewMonth]);

  // ===== 选中日期详情 =====
  const selectedDetail = useMemo(() => {
    const s = Solar.fromYmd(selectedYmd.y, selectedYmd.m, selectedYmd.d);
    const l = s.getLunar();
    const bz = l.getEightChar();
    return {
      solar: s,
      lunar: l,
      yearGZ: `${bz.getYearGan()}${bz.getYearZhi()}`,
      monthGZ: `${bz.getMonthGan()}${bz.getMonthZhi()}`,
      dayGZ: `${bz.getDayGan()}${bz.getDayZhi()}`,
      yi: l.getDayYi(),
      ji: l.getDayJi(),
      chongDesc: `冲${l.getDayChongShengXiao()} 煞${l.getDaySha()}`,
      jieQi: l.getJieQi(),
      lunarFestivals: l.getFestivals(),
      solarFestivals: s.getFestivals(),
      shengXiao: l.getYearShengXiao(),
      zhiXing: l.getZhiXing(),
    };
  }, [selectedYmd]);

  const goPrevMonth = useCallback(() => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => Math.max(1900, y - 1));
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const goNextMonth = useCallback(() => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => Math.min(2100, y + 1));
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  const goToday = useCallback(() => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
    setSelectedYmd({ y: today.getFullYear(), m: today.getMonth() + 1, d: today.getDate() });
  }, [today]);

  const isSelected = (y: number, m: number, d: number) =>
    selectedYmd.y === y && selectedYmd.m === m && selectedYmd.d === d;

  const isTodayCell = (y: number, m: number, d: number) =>
    y === today.getFullYear() && m === today.getMonth() + 1 && d === today.getDate();

  const yearOptions = useMemo(() => {
    const arr: number[] = [];
    for (let y = 1900; y <= 2100; y++) arr.push(y);
    return arr;
  }, []);

  return (
    <div className="min-h-screen bg-[#ededed] pb-[80px]">
      {/* ===== 顶部紫色导航条 ===== */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        style={{ background: `linear-gradient(135deg, ${BRAND} 0%, #9B5ECF 100%)` }}
      >
        <button
          onClick={goPrevMonth}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
          aria-label="上一月"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex flex-col items-center"
        >
          <div className="text-lg font-bold">{viewYear}年{viewMonth}月</div>
          <div className="text-[11px] opacity-80">点击选择年月</div>
        </button>
        <button
          onClick={goNextMonth}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
          aria-label="下一月"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="mx-auto w-full px-3 pt-3" style={{ maxWidth: "500px" }}>
        {/* 客户选择与保存 */}
        <div className="mb-2.5 bg-white rounded-lg shadow-sm">
          <ClientSelector selectedClient={selectedClient} onSelect={setSelectedClient} />
          {selectedClient && (
            <div className="px-3 pb-2">
              <button
                onClick={handleSaveRecord}
                className="w-full rounded-lg py-2 text-sm text-white font-medium"
                style={{ backgroundColor: BRAND }}
              >
                {saveTip || "保存所选日期到客户档案"}
              </button>
            </div>
          )}
        </div>

        {/* 年月选择器 */}
        {showPicker && (
          <div className="mb-2.5 rounded-[10px] bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="flex-1 rounded-lg border border-gray-300 bg-white p-2 text-sm"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}年</option>
                ))}
              </select>
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="flex-1 rounded-lg border border-gray-300 bg-white p-2 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}月</option>
                ))}
              </select>
              <button
                onClick={goToday}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: BRAND }}
              >
                今天
              </button>
            </div>
            <button
              onClick={() => setShowPicker(false)}
              className="mt-2 w-full rounded-lg border py-1.5 text-xs text-gray-500"
            >
              收起
            </button>
          </div>
        )}

        {!showPicker && (
          <button
            onClick={goToday}
            className="mb-2.5 w-full rounded-lg border py-2 text-sm font-semibold"
            style={{ borderColor: BRAND, color: BRAND, backgroundColor: "#F3EDF7" }}
          >
            回到今日
          </button>
        )}

        {/* ===== 日历表格 ===== */}
        <div className="mb-2.5 overflow-hidden rounded-[10px] bg-white shadow-sm">
          {/* 星期表头 */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-[#f9f9f9]">
            {WEEKDAY_NAMES.map((name, i) => (
              <div
                key={i}
                className={`py-2 text-center text-xs font-semibold ${
                  i === 0 || i === 6 ? "text-red-500" : "text-gray-500"
                }`}
              >
                {name}
              </div>
            ))}
          </div>
          {/* 日期格子 */}
          <div className="grid grid-cols-7">
            {calendarData.map((cell, idx) => {
              const selected = isSelected(cell.year, cell.month, cell.day);
              const todayFlag = isTodayCell(cell.year, cell.month, cell.day);
              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (!cell.isCurrentMonth) {
                      setViewYear(cell.year);
                      setViewMonth(cell.month);
                    }
                    setSelectedYmd({ y: cell.year, m: cell.month, d: cell.day });
                  }}
                  className={`relative flex aspect-square cursor-pointer flex-col items-center justify-center border-b border-r border-gray-100 p-0.5 ${
                    !cell.isCurrentMonth ? "bg-[#fafafa]" : cell.isWeekend ? "bg-[#fefafa]" : "bg-white"
                  } ${selected ? "ring-2 ring-inset" : ""}`}
                  style={{
                    boxShadow: selected ? `inset 0 0 0 2px ${BRAND}` : undefined,
                    backgroundColor: todayFlag && !selected ? "#F3EDF7" : undefined,
                  }}
                >
                  <span
                    className={`text-sm leading-tight ${
                      todayFlag
                        ? "font-bold"
                        : cell.isWeekend
                        ? "font-semibold text-red-500"
                        : "font-semibold text-gray-800"
                    }`}
                    style={{
                      color: !cell.isCurrentMonth ? "#ccc" : todayFlag ? BRAND : undefined,
                    }}
                  >
                    {cell.day}
                  </span>
                  <span
                    className={`mt-px leading-tight ${
                      cell.isJieQi && cell.isCurrentMonth
                        ? "rounded-sm px-0.5 text-[9px] font-semibold text-white"
                        : "text-[10px]"
                    }`}
                    style={{
                      color: !cell.isCurrentMonth
                        ? "#ddd"
                        : cell.lunarFest
                        ? cell.isJieQi
                          ? undefined
                          : "#e53e3e"
                        : "#999",
                      backgroundColor: cell.isJieQi && cell.isCurrentMonth ? BRAND : undefined,
                    }}
                  >
                    {cell.lunarFest || cell.lunarDay}
                  </span>
                  {todayFlag && (
                    <div
                      className="absolute bottom-0.5 right-0.5 h-[5px] w-[5px] rounded-full"
                      style={{ backgroundColor: BRAND }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== 选中日期详情 ===== */}
        <div className="mb-2.5 rounded-[10px] bg-white p-3.5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="text-base font-bold text-gray-800">
                {selectedDetail.lunar.getMonthInChinese()}月{selectedDetail.lunar.getDayInChinese()}
              </div>
              <div className="text-xs text-gray-500">
                {selectedYmd.y}年{selectedYmd.m}月{selectedYmd.d}日 星期{selectedDetail.solar.getWeekInChinese()} · {selectedDetail.shengXiao}年
              </div>
              {selectedDetail.jieQi && (
                <span
                  className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                  style={{ backgroundColor: BRAND }}
                >
                  {selectedDetail.jieQi}
                </span>
              )}
              {(selectedDetail.lunarFestivals.length > 0 || selectedDetail.solarFestivals.length > 0) && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {[...selectedDetail.lunarFestivals, ...selectedDetail.solarFestivals].map((f, i) => (
                    <span key={i} className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-500">
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tracking-wider" style={{ color: BRAND }}>
                {selectedDetail.dayGZ}
              </div>
              <div className="text-[11px] text-gray-400">日干支</div>
            </div>
          </div>

          {/* 干支三柱 */}
          <div className="mb-3 grid grid-cols-3 gap-2">
            {[
              { label: "年柱", gz: selectedDetail.yearGZ },
              { label: "月柱", gz: selectedDetail.monthGZ },
              { label: "日柱", gz: selectedDetail.dayGZ },
            ].map((p) => (
              <div key={p.label} className="rounded-lg border border-gray-200 py-1.5 text-center">
                <div className="text-[10px] text-gray-400">{p.label}</div>
                <div className="text-sm font-bold" style={{ color: BRAND }}>
                  {p.gz}
                </div>
              </div>
            ))}
          </div>

          {/* 宜忌 */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-green-100 bg-green-50/50 p-2">
              <div className="mb-1 text-center text-sm font-bold text-emerald-600">宜</div>
              {selectedDetail.yi.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-1">
                  {selectedDetail.yi.slice(0, 8).map((item, i) => (
                    <span key={i} className="rounded-full bg-green-100 px-1.5 py-0.5 text-[11px] text-emerald-700">
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-center text-[11px] text-gray-400">无</div>
              )}
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50/50 p-2">
              <div className="mb-1 text-center text-sm font-bold text-red-500">忌</div>
              {selectedDetail.ji.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-1">
                  {selectedDetail.ji.slice(0, 8).map((item, i) => (
                    <span key={i} className="rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] text-red-600">
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-center text-[11px] text-gray-400">无</div>
              )}
            </div>
          </div>

          {/* 冲煞/建星 */}
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-lg bg-gray-50 p-2">
              <span className="text-gray-400">冲煞：</span>
              <span className="font-semibold text-red-500">{selectedDetail.chongDesc}</span>
            </div>
            <div className="rounded-lg bg-gray-50 p-2">
              <span className="text-gray-400">建星：</span>
              <span className="font-semibold" style={{ color: BRAND }}>{selectedDetail.zhiXing}日</span>
            </div>
          </div>
        </div>

        {/* ===== 图例 ===== */}
        <div className="mb-2.5 rounded-[10px] bg-white p-3 shadow-sm">
          <div className="mb-1.5 text-xs font-semibold text-gray-600">图例说明</div>
          <div className="flex flex-wrap gap-3 text-[11px] text-gray-400">
            <div className="flex items-center gap-1">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BRAND }} />
              <span>今日</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-4 w-4 rounded ring-2" style={{ boxShadow: `inset 0 0 0 2px ${BRAND}` }} />
              <span>选中</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="rounded-sm px-1 text-[10px] font-semibold text-white" style={{ backgroundColor: BRAND }}>立春</span>
              <span>节气</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-red-500">春节</span>
              <span>节日</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400">初十</span>
              <span>农历日</span>
            </div>
          </div>
        </div>

        {/* ===== 免责声明 ===== */}
        <div className="rounded-lg border border-gray-200 bg-[#f9f9f9] p-3 text-center">
          <p className="mb-1 text-xs font-semibold text-gray-400">免责声明</p>
          <p className="text-[11px] leading-relaxed text-gray-400">
            本万年历数据由 lunar-javascript 历法库计算，仅供传统文化学习与参考。节气日期为精确天文计算，宜忌内容来源于传统择日典籍，不构成任何决策依据。请理性看待，切勿迷信。
          </p>
        </div>
      </div>
    </div>
  );
}

// ===== 构建日历格子数据 =====
function buildCell(solar: Solar, isCurrentMonth: boolean, _currentMonth: number): DayCell {
  const l = solar.getLunar();
  const y = solar.getYear();
  const m = solar.getMonth();
  const d = solar.getDay();
  const dow = solar.getWeek();
  const todayD = new Date();
  const isTodayFlag =
    y === todayD.getFullYear() && m === todayD.getMonth() + 1 && d === todayD.getDate();

  // 优先显示：节气 > 农历节日 > 公历节日 > 农历月（初一）/ 日
  const jieQi = l.getJieQi();
  const lunarFests = l.getFestivals();
  const solarFests = solar.getFestivals();

  let lunarFest: string | null = null;
  let isJieQi = false;
  if (jieQi) {
    lunarFest = jieQi;
    isJieQi = true;
  } else if (lunarFests.length > 0) {
    lunarFest = lunarFests[0].length > 4 ? lunarFests[0].substring(0, 4) : lunarFests[0];
  } else if (solarFests.length > 0) {
    lunarFest = solarFests[0].length > 4 ? solarFests[0].substring(0, 4) : solarFests[0];
  }

  // 农历日显示：初一显示月名，其他显示日名
  const lunarDay = l.getDay() === 1 ? l.getMonthInChinese() + "月" : l.getDayInChinese();

  return {
    solar,
    year: y,
    month: m,
    day: d,
    dayOfWeek: dow,
    lunarDay,
    lunarFest,
    ganZhi: l.getDayInGanZhi(),
    isToday: isTodayFlag,
    isCurrentMonth,
    isWeekend: dow === 0 || dow === 6,
    isJieQi,
  };
}
