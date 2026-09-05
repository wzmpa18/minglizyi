"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Solar, SolarMonth } from "lunar-javascript";
import { useClientDate } from "@/lib/useClientDate";
import { getCalendarGanzhiInterpretation, getCalendarJieqiInterpretation } from "@/lib/calendar-interpretations";
import type { CalendarInterpretItem } from "@/lib/calendar-interpretations";
import { savePaipanState, loadPaipanState } from "@/lib/paipanPersistence";
import { getToolConfig, type CalendarFieldConfig } from "@/lib/toolConfigStore";
import { getUpcomingEvents, getEventsOnDate, createEvent, deleteEvent, EVENT_TYPE_META, type CalendarEventType, type ReminderOffset, REMINDER_OFFSET_OPTIONS } from "@/lib/calendarEventsStore";

import { ShareButton } from "@/components/ShareButton";
const BRAND = "#7B2FBE";
const WEEKDAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

// 解读类型颜色
const INTERPRET_TYPE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  ganzhi: { bg: "#f3e8ff", fg: "#7B2FBE", label: "干支" },
  jieqi: { bg: "#e0f2fe", fg: "#0284c7", label: "节气" },
  shichen: { bg: "#fef3c7", fg: "#d97706", label: "时辰" },
};

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
  const router = useRouter();
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(1);
  const [selectedYmd, setSelectedYmd] = useState<{ y: number; m: number; d: number }>({
    y: 2026,
    m: 1,
    d: 1,
  });
  const [showPicker, setShowPicker] = useState(false);
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [interpretPanel, setInterpretPanel] = useState<{title: string; items: CalendarInterpretItem[]} | null>(null);
  const [fieldConfig, setFieldConfig] = useState<CalendarFieldConfig | null>(null);
  const [eventsVersion, setEventsVersion] = useState(0);
  // v25.0.27: 点击日期快速登记事项（标题/类型/提醒时间档位，写 calendarEventsStore）
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addType, setAddType] = useState<CalendarEventType>("todo");
  const [addReminders, setAddReminders] = useState<ReminderOffset[]>([{ offsetMinutes: 1440 }]);
  const [addError, setAddError] = useState<string | null>(null);
  const today = useClientDate();
  useEffect(() => {
    const cfg = getToolConfig();
    setFieldConfig(cfg.calendar);
  }, []);
  useEffect(() => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth() + 1);
    setSelectedYmd({ y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() });
  }, []);

  useEffect(() => {
    const saved = loadPaipanState("wannianli");
    if (saved && saved.input) {
      const inp = saved.input as any;
      if (inp.viewYear) setViewYear(inp.viewYear);
      if (inp.viewMonth) setViewMonth(inp.viewMonth);
      if (inp.selectedYmd) setSelectedYmd(inp.selectedYmd);
    }
  }, []);

  useEffect(() => {
    savePaipanState("wannianli",{input:{viewYear,viewMonth,selectedYmd},result:null,showForm:false,_ts:Date.now()});
  }, [viewYear, viewMonth, selectedYmd]);

  // 记事提醒数据（eventsVersion 变化时刷新）
  const dayEvents = useMemo(() => {
    void eventsVersion;
    return getEventsOnDate(selectedYmd.y, selectedYmd.m, selectedYmd.d);
  }, [selectedYmd, eventsVersion]);
  const upcomingEvents = useMemo(() => {
    void eventsVersion;
    return getUpcomingEvents(14).filter((o) => o.daysAway >= 0);
  }, [eventsVersion]);

  // 点击干支解读
  const handleGanzhiClick = useCallback((gz: string, label: string) => {
    const interp = getCalendarGanzhiInterpretation(gz);
    if (interp) {
      setInterpretPanel({ title: `${label} · ${gz}`, items: interp.items });
    }
  }, []);

  // 点击节气解读
  const handleJieqiClick = useCallback((jieqi: string) => {
    const interp = getCalendarJieqiInterpretation(jieqi);
    if (interp) setInterpretPanel(interp);
  }, []);

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

  // ===== 月度事件标记（含记事的日期打点） =====
  const monthEventDays = useMemo(() => {
    void eventsVersion;
    const set = new Set<string>();
    for (const o of getUpcomingEvents(45)) {
      if (o.y === viewYear && o.m === viewMonth) set.add(`${o.y}-${o.m}-${o.d}`);
    }
    return set;
  }, [viewYear, viewMonth, eventsVersion]);

  // ===== 选中日期详情 =====
  const selectedDetail = useMemo(() => {
    const s = Solar.fromYmd(selectedYmd.y, selectedYmd.m, selectedYmd.d);
    const l = s.getLunar();
    const bz = l.getEightChar();
    // 吉时：遍历十二时辰（含早晚子时），按各时辰天神吉凶判定
    const jiShiList: string[] = [];
    for (const h of [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21]) {
      try {
        const lh = Solar.fromYmdHms(selectedYmd.y, selectedYmd.m, selectedYmd.d, h, 0, 0).getLunar();
        if (lh.getTimeTianShenLuck() === "吉") {
          jiShiList.push(lh.getTimeZhi() + "时");
        }
      } catch {
        /* ignore 单时辰计算异常 */
      }
    }
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
      jiShi: jiShiList,
      posXi: l.getDayPositionXiDesc(),
      posCai: l.getDayPositionCaiDesc(),
      posFu: l.getDayPositionFuDesc(),
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
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth() + 1);
    setSelectedYmd({ y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() });
  }, []);

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
      {/* ===== 顶部紫色导航条（v25.0.78 P4：最左补返回键） ===== */}
      <div
        className="flex items-center gap-2 px-4 py-3 text-white"
        style={{ background: `linear-gradient(135deg, ${BRAND} 0%, #9B5ECF 100%)` }}
      >
        <button
          onClick={() => {
            if (window.history.length > 1) router.back();
            else router.push("/");
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
          aria-label="返回"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={goPrevMonth}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
          aria-label="上一月"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex flex-1 flex-col items-center"
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
        {/* ===== 功能入口（后台可配置开关） ===== */}
        {fieldConfig && fieldConfig.functionEnabled && (
          <div className="mb-2.5 grid grid-cols-3 gap-2">
            {fieldConfig.showReminderEntry && (
              <button
                onClick={() => router.push("/yixue/wannianli/events")}
                className="flex flex-col items-center gap-1 rounded-[10px] bg-white py-2.5 shadow-sm active:opacity-70"
              >
                <span className="text-xl">⏰</span>
                <span className="text-xs font-medium text-gray-700">记事提醒</span>
              </button>
            )}
            {fieldConfig.showZeriEntry && (
              <button
                onClick={() => router.push("/yixue/zeri")}
                className="flex flex-col items-center gap-1 rounded-[10px] bg-white py-2.5 shadow-sm active:opacity-70"
              >
                <span className="text-xl">📅</span>
                <span className="text-xs font-medium text-gray-700">择日</span>
              </button>
            )}
            {fieldConfig.showMoreToolsEntry && (
              <button
                onClick={() => setShowMoreTools(!showMoreTools)}
                className="flex flex-col items-center gap-1 rounded-[10px] bg-white py-2.5 shadow-sm active:opacity-70"
              >
                <span className="text-xl">🧰</span>
                <span className="text-xs font-medium text-gray-700">更多工具</span>
              </button>
            )}
          </div>
        )}

        {/* ===== 更多工具列表（排盘能力收纳于此，不占首页核心操作区） ===== */}
        {showMoreTools && (
          <div className="mb-2.5 rounded-[10px] bg-white p-2 shadow-sm">
            <div className="mb-1.5 px-1 text-xs font-semibold text-gray-600">更多工具</div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { name: "八字", icon: "☯️", path: "/yixue/bazi" },
                { name: "紫微斗数", icon: "🌌", path: "/yixue/ziwei" },
                { name: "奇门遁甲", icon: "🏛️", path: "/yixue/qimen" },
                { name: "六爻", icon: "🔮", path: "/yixue/liuyao" },
                { name: "梅花易数", icon: "🌸", path: "/yixue/meihua" },
                { name: "大六壬", icon: "🌊", path: "/yixue/daliuren" },
                { name: "黄历", icon: "📜", path: "/yixue/huangli" },
                { name: "节气", icon: "🍃", path: "/yixue/jieqi" },
              ].map((t) => (
                <button
                  key={t.path}
                  onClick={() => router.push(t.path)}
                  className="flex flex-col items-center gap-1 rounded-lg bg-[#f9f7fb] py-2 active:opacity-70"
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-[10px] text-gray-600">{t.name}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowMoreTools(false)} className="mt-2 w-full rounded-lg border py-1.5 text-xs text-gray-500">
              收起
            </button>
          </div>
        )}

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
                  {monthEventDays.has(`${cell.year}-${cell.month}-${cell.day}`) && cell.isCurrentMonth && (
                    <div className="absolute bottom-0.5 left-1/2 h-[4px] w-[4px] -translate-x-1/2 rounded-full bg-pink-400" />
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
                  onClick={(e) => { e.stopPropagation(); handleJieqiClick(selectedDetail.jieQi!); }}
                  className="mt-1 inline-block cursor-pointer rounded-full px-2 py-0.5 text-[11px] font-semibold text-white hover:opacity-80"
                  style={{ backgroundColor: BRAND }}
                  title="点击查看节气详解"
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
            <div
              className="cursor-pointer text-right"
              onClick={() => handleGanzhiClick(selectedDetail.dayGZ, "日干支")}
              title="点击查看干支详解"
            >
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
              <div
                key={p.label}
                onClick={() => handleGanzhiClick(p.gz, p.label)}
                className="cursor-pointer rounded-lg border border-gray-200 py-1.5 text-center hover:border-purple-300 hover:bg-purple-50/50 transition-colors"
                title="点击查看干支详解"
              >
                <div className="text-[10px] text-gray-400">{p.label}</div>
                <div className="text-sm font-bold" style={{ color: BRAND }}>
                  {p.gz}
                </div>
              </div>
            ))}
          </div>

          {/* 宜忌 */}
          {(!fieldConfig || fieldConfig.showYiJi) && (
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
          )}

          {/* 古籍来源注解（历注定性：传统历书古籍资料展示） */}
          {(!fieldConfig || fieldConfig.showYiJi) && (
          <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-[13px] font-medium leading-relaxed text-amber-700 border border-amber-100">
            📜 内容整理自《钦定协纪辨方书》等传统历书古籍，仅供民俗文化学习参考
          </div>
          )}

          {/* 冲煞/建星 */}
          {(!fieldConfig || fieldConfig.showChongSha) && (
            <div className="mb-2 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-lg bg-gray-50 p-2">
                <span className="text-gray-400">冲煞：</span>
                <span className="font-semibold text-red-500">{selectedDetail.chongDesc}</span>
              </div>
              <div className="rounded-lg bg-gray-50 p-2">
                <span className="text-gray-400">建星：</span>
                <span className="font-semibold" style={{ color: BRAND }}>{selectedDetail.zhiXing}日</span>
              </div>
            </div>
          )}

          {/* 吉时 */}
          {(!fieldConfig || fieldConfig.showJiShi) && selectedDetail.jiShi.length > 0 && (
            <div className="mb-2 rounded-lg border border-amber-100 bg-amber-50/60 p-2">
              <div className="mb-1 text-center text-xs font-semibold text-amber-700">吉时</div>
              <div className="flex flex-wrap justify-center gap-1">
                {selectedDetail.jiShi.map((js, i) => (
                  <span key={i} className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                    {js}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 方位 */}
          {(!fieldConfig || fieldConfig.showFangWei) && (
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="rounded-lg bg-gray-50 p-1.5">
                <div className="text-gray-400">喜神</div>
                <div className="font-semibold text-gray-700">{selectedDetail.posXi}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-1.5">
                <div className="text-gray-400">财神</div>
                <div className="font-semibold text-gray-700">{selectedDetail.posCai}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-1.5">
                <div className="text-gray-400">福神</div>
                <div className="font-semibold text-gray-700">{selectedDetail.posFu}</div>
              </div>
            </div>
          )}

          {/* 当日事项（v25.0.27: 点击日期登记 + 提醒时间 + 已登记信息展示/删除） */}
          {(!fieldConfig || fieldConfig.showDayEvents) && (
            <div className="mt-3 rounded-lg border p-2.5" style={{ borderColor: "#e9def5", backgroundColor: "#faf7fd" }}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">
                  当日事项（{selectedYmd.m}月{selectedYmd.d}日）
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setAddPanelOpen(v => !v); setAddError(null); }}
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                    style={{ backgroundColor: BRAND }}
                  >＋ 登记提醒</button>
                  <button onClick={() => router.push("/yixue/wannianli/events")} className="text-[11px] font-medium" style={{ color: BRAND }}>
                    管理 ›
                  </button>
                </div>
              </div>

              {/* 快速登记表单 */}
              {addPanelOpen && (
                <div className="mb-2 rounded-lg border border-purple-100 bg-white p-2.5">
                  <input
                    value={addTitle}
                    onChange={(e) => { setAddTitle(e.target.value); setAddError(null); }}
                    placeholder={`事项标题，如：交房租 / 妈妈生日（${selectedYmd.m}月${selectedYmd.d}日）`}
                    maxLength={50}
                    className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm outline-none focus:border-purple-400"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(Object.keys(EVENT_TYPE_META) as CalendarEventType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setAddType(t)}
                        className="rounded-full px-2.5 py-1 text-[11px]"
                        style={{
                          border: `1px solid ${addType === t ? BRAND : "#d9d2e6"}`,
                          backgroundColor: addType === t ? BRAND : "#fff",
                          color: addType === t ? "#fff" : "#666",
                          fontWeight: addType === t ? 700 : 400,
                        }}
                      >{EVENT_TYPE_META[t].icon} {EVENT_TYPE_META[t].label}</button>
                    ))}
                  </div>
                  <div className="mt-2 text-[11px] text-gray-500">提醒时间（可多选）：</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {REMINDER_OFFSET_OPTIONS.map((o) => {
                      const on = addReminders.some(r => r.offsetMinutes === o.offsetMinutes);
                      return (
                        <button
                          key={o.offsetMinutes}
                          onClick={() => setAddReminders(prev => on ? prev.filter(r => r.offsetMinutes !== o.offsetMinutes) : [...prev, { offsetMinutes: o.offsetMinutes }])}
                          className="rounded-full px-2.5 py-1 text-[11px]"
                          style={{
                            border: `1px solid ${on ? BRAND : "#d9d2e6"}`,
                            backgroundColor: on ? "#F3EDF7" : "#fff",
                            color: on ? BRAND : "#666",
                            fontWeight: on ? 700 : 400,
                          }}
                        >{o.label}</button>
                      );
                    })}
                  </div>
                  {addError && <div className="mt-1.5 text-[11px] text-red-500">{addError}</div>}
                  {(addType === "birthday" || addType === "anniversary") && (
                    <div className="mt-1.5 text-[11px]" style={{ color: BRAND }}>
                      {EVENT_TYPE_META[addType].label}默认按每年农历重复提醒，可在「管理」中修改
                    </div>
                  )}
                  <button
                    onClick={() => {
                      // P7-补05：生日/纪念日默认「每年农历重复」，其余类型单次公历提醒
                      const isMemorial = addType === "birthday" || addType === "anniversary";
                      const r = createEvent({
                        type: addType,
                        title: addTitle,
                        dateMode: isMemorial ? "lunar" : "solar",
                        year: selectedYmd.y,
                        month: selectedYmd.m,
                        day: selectedYmd.d,
                        repeat: isMemorial ? "yearly" : "none",
                        reminders: addReminders,
                      });
                      if (!r.success) { setAddError(r.error || "保存失败"); return; }
                      setAddTitle("");
                      setAddPanelOpen(false);
                      setAddError(null);
                      setEventsVersion(v => v + 1);
                    }}
                    className="mt-2.5 w-full rounded-lg py-2 text-sm font-bold text-white"
                    style={{ backgroundColor: BRAND }}
                  >保存并开启提醒</button>
                </div>
              )}

              {dayEvents.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {dayEvents.slice(0, 6).map((o, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <span>{EVENT_TYPE_META[o.event.type].icon}</span>
                      <span className="font-medium text-gray-700">{o.event.title}</span>
                      {o.event.relatedName && <span className="text-gray-400">· {o.event.relatedName}</span>}
                      {o.event.reminders.length > 0 && (
                        <span className="text-[10px] text-gray-400">
                          · 提醒{o.event.reminders.map(r => REMINDER_OFFSET_OPTIONS.find(x => x.offsetMinutes === r.offsetMinutes)?.label || "").filter(Boolean).join("/")}
                        </span>
                      )}
                      <button
                        onClick={() => { deleteEvent(o.event.id); setEventsVersion(v => v + 1); }}
                        className="ml-auto text-[10px] text-gray-400 active:text-red-500"
                        title="删除此事项"
                      >删除</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-gray-400">该日暂无登记事项，点击「＋ 登记提醒」写入安排与提醒时间</div>
              )}
              {upcomingEvents.length > 0 && (
                <div className="mt-2 border-t pt-1.5" style={{ borderColor: "#efe8f7" }}>
                  {upcomingEvents.slice(0, 3).map((o, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] text-gray-500">
                      <span className="truncate">
                        {EVENT_TYPE_META[o.event.type].icon} {o.event.title}
                        {o.event.relatedName ? " · " + o.event.relatedName : ""}
                      </span>
                      <span className="ml-2 shrink-0 font-medium" style={{ color: BRAND }}>
                        {o.daysAway === 0 ? "今天" : o.daysAway === 1 ? "明天" : `${o.daysAway}天后`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== 解读抽屉 ===== */}
          {interpretPanel && (
            <div className="mt-3">
              <div style={{
                border: "1px solid #7B2FBE",
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(123, 47, 190, 0.12)",
                backgroundColor: "#fff",
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "linear-gradient(135deg, #7B2FBE, #9B5ECF)",
                  color: "white",
                }}>
                  <span style={{ fontSize: "15px", fontWeight: "bold" }}>
                    {interpretPanel.title}
                  </span>
                  <button
                    onClick={() => setInterpretPanel(null)}
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      border: "none",
                      color: "white",
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      cursor: "pointer",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ padding: "10px 12px", maxHeight: "360px", overflowY: "auto" }}>
                  {interpretPanel.items.map((item, idx) => {
                    const tc = INTERPRET_TYPE_COLORS[item.type] || INTERPRET_TYPE_COLORS["ganzhi"];
                    return (
                      <div key={idx} style={{ marginBottom: idx < interpretPanel.items.length - 1 ? "10px" : 0 }}>
                        <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{
                            fontSize: "10px",
                            fontWeight: "bold",
                            padding: "1px 6px",
                            borderRadius: "3px",
                            background: tc.bg,
                            color: tc.fg,
                            marginRight: "8px",
                            flexShrink: 0,
                          }}>
                            {tc.label}
                          </span>
                          <span style={{ fontSize: "13px", fontWeight: "bold", color: "#333" }}>{item.title}</span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#555", lineHeight: "1.7", whiteSpace: "pre-line" }}>
                          {item.content}
                        </div>
                        <div style={{ fontSize: "10px", color: "#999", marginTop: "4px", fontStyle: "italic" }}>
                          —— {item.source}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{
                  padding: "6px 12px",
                  background: "#fafafa",
                  borderTop: "1px solid #eee",
                  fontSize: "10px",
                  color: "#999",
                  textAlign: "center",
                }}>
                  点击干支或节气查看经典解读 · 引经据典，仅供参考
                </div>
              </div>
            </div>
          )}
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
      {/* 分享排盘结果 */}
      <div className="px-3 py-2">
        <ShareButton
          type="tool"
          title="万年历查询结果"
          description="万年历查询"
          variant="block"
          label="分享排盘结果"
          shareData={{
            toolType: "wannianli",
            title: `万年历：${selectedYmd.y}-${String(selectedYmd.m).padStart(2, "0")}-${String(selectedYmd.d).padStart(2, "0")}`,
            summary: `${selectedDetail.yearGZ}年 ${selectedDetail.monthGZ}月 ${selectedDetail.dayGZ}日 · ${selectedDetail.shengXiao}年`,
            payload: {
              summaryLines: [
                `公历：${selectedYmd.y}-${String(selectedYmd.m).padStart(2, "0")}-${String(selectedYmd.d).padStart(2, "0")}`,
                `干支：${selectedDetail.yearGZ}年 ${selectedDetail.monthGZ}月 ${selectedDetail.dayGZ}日`,
                `生肖：${selectedDetail.shengXiao}`,
                `宜：${selectedDetail.yi.slice(0, 8).join("、")}`,
                `忌：${selectedDetail.ji.slice(0, 8).join("、")}`,
                `冲煞：${selectedDetail.chongDesc}`,
                ...(selectedDetail.jieQi ? [`节气：${selectedDetail.jieQi}`] : []),
                ...(selectedDetail.jiShi.length ? [`吉时：${selectedDetail.jiShi.join("、")}`] : []),
              ],
            },
          }}
        />
      </div>


        {/* ===== 免责声明 ===== */}
        <div className="rounded-lg border border-gray-200 bg-[#f9f9f9] p-3 text-center">
          <p className="mb-1 text-xs font-semibold text-gray-400">免责声明</p>
          <p className="text-[11px] leading-relaxed text-gray-400">
            节气日期为精确天文计算，宜忌等历注内容整理自《钦定协纪辨方书》等传统历书古籍，仅供民俗文化学习参考，不构成任何专业建议或决策依据。记事提醒数据仅本人可见，可在记事管理页导出或彻底删除。请理性看待，切勿迷信。
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