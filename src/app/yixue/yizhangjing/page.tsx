"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { leaveToolPage, isManagedBackNavigation } from "@/lib/leaveToolPage";
import {
  solarToBazi,
  getCurrentJieQi,
} from "@/algorithm-core";
import { DatePicker } from "@/components/shared";
import { getYizhangPalaceInterpretation } from "@/lib/yizhang-interpretations";
import type { YizhangInterpretItem } from "@/lib/yizhang-interpretations";
import { savePaipanState, loadPaipanState, clearPaipanState } from "@/lib/paipanPersistence";
import { useToolBack } from "@/lib/useToolBack";
import { calcYizhangJing } from "@/algorithm-core/modules/yizhangjing";
import EventDivinationPanel from "@/components/EventDivinationPanel";

import { ShareButton } from "@/components/ShareButton";
import { PostToSquareButton } from "@/components/PostToSquareButton";
// ============================================================================
// 一掌经十二宫
// ============================================================================
const YIZHANG_PALACES: Record<string, { name: string; type: string; desc: string }> = {
  "子": { name: "天贵", type: "佛道", desc: "聪明高贵，福寿双全" },
  "丑": { name: "天厄", type: "鬼道", desc: "多灾多难，宜修行" },
  "寅": { name: "天权", type: "人道", desc: "有权有势，掌管事务" },
  "卯": { name: "天破", type: "畜生道", desc: "破败离散，财运不佳" },
  "辰": { name: "天奸", type: "修罗道", desc: "奸诈狡猾，心机深沉" },
  "巳": { name: "天文", type: "仙道", desc: "文采斐然，学识渊博" },
  "午": { name: "天福", type: "佛道", desc: "福气厚重，一生平安" },
  "未": { name: "天驿", type: "鬼道", desc: "奔波劳碌，旅行运强" },
  "申": { name: "天孤", type: "人道", desc: "孤独清高，独立自主" },
  "酉": { name: "天刃", type: "畜生道", desc: "刚强锋利，易有伤害" },
  "戌": { name: "天艺", type: "修罗道", desc: "技艺精湛，多才多艺" },
  "亥": { name: "天寿", type: "仙道", desc: "长寿健康，晚年安乐" },
};

const LIUDAO_COLORS: Record<string, string> = {
  "佛道": "#ffa500", "鬼道": "#0074e4", "人道": "#00a879",
  "畜生道": "#a64b00", "修罗道": "#9B5ECF", "仙道": "#8b5cf6",
};

const INTERPRET_TYPE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  palace: { bg: "#f3e8ff", fg: "#7B2FBE", label: "宫位" },
  liudao: { bg: "#fef3c7", fg: "#d97706", label: "六道" },
  sizhu: { bg: "#e0f2fe", fg: "#0284c7", label: "四柱" },
};

// jishiyu 12宫 grid 布局: 巳午未申(行1) / 辰[中]酉(行2) / 卯[中]戌(行3) / 寅丑子亥(行4)
const GRID_CELLS = [
  { zhi: "巳", row: 1, col: 1 },
  { zhi: "午", row: 1, col: 2 },
  { zhi: "未", row: 1, col: 3 },
  { zhi: "申", row: 1, col: 4 },
  { zhi: "辰", row: 2, col: 1 },
  { zhi: "酉", row: 2, col: 4 },
  { zhi: "卯", row: 3, col: 1 },
  { zhi: "戌", row: 3, col: 4 },
  { zhi: "寅", row: 4, col: 1 },
  { zhi: "丑", row: 4, col: 2 },
  { zhi: "子", row: 4, col: 3 },
  { zhi: "亥", row: 4, col: 4 },
];

const TIAN_GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const DI_ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

// ============================================================================
// 主组件
// ============================================================================

export default function YizhangjingPage() {
  const pageKey = "yixue_yizhangjing"; const { showResult, savedParams, saveParams, goToResult } = useToolBack({ pageKey, eventName: "yixue-back", globalFlag: "__yixueBackHandled" });
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedHour, setSelectedHour] = useState(12);
  useEffect(() => {
    const n = new Date();
    setSelectedYear(n.getFullYear());
    setSelectedMonth(n.getMonth() + 1);
    setSelectedDay(n.getDate());
    setSelectedHour(n.getHours());
  }, []);

  // localStorage 持久化：恢复排盘状态
  useEffect(() => {
    const saved = loadPaipanState("yizhangjing");
    if (saved && saved.input) {
      const inp = saved.input as any;
      if (inp.dateType) setDateType(inp.dateType);
      if (inp.selectedYear) setSelectedYear(inp.selectedYear);
      if (inp.selectedMonth) setSelectedMonth(inp.selectedMonth);
      if (inp.selectedDay) setSelectedDay(inp.selectedDay);
      if (inp.selectedHour) setSelectedHour(inp.selectedHour);
      if (inp.sizhuInput) setSizhuInput(inp.sizhuInput);
    }
  }, []);

  const [dateType, setDateType] = useState<"solar" | "lunar" | "sizhu">("solar");
  const [sizhuInput, setSizhuInput] = useState({
    yearGan: "甲", yearZhi: "子",
    monthGan: "甲", monthZhi: "子",
    dayGan: "甲", dayZhi: "子",
    hourGan: "甲", hourZhi: "子",
  });
  const [hasResult, setHasResult] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [showForm, setShowForm] = useState(true);
  const [interpretPanel, setInterpretPanel] = useState<{title: string; items: YizhangInterpretItem[]} | null>(null);

  const result = useMemo(() => {
    if (dateType === "sizhu") {
      // 四柱模式：直接由用户输入的干支构造排盘结果，复用 calcYizhangJing 的返回结构
      const { yearGan, yearZhi, monthGan, monthZhi, dayGan, dayZhi, hourGan, hourZhi } = sizhuInput;
      return {
        pillars: [
          { label: "年柱", gan: yearGan, zhi: yearZhi, ganzhi: yearGan + yearZhi },
          { label: "月柱", gan: monthGan, zhi: monthZhi, ganzhi: monthGan + monthZhi },
          { label: "日柱", gan: dayGan, zhi: dayZhi, ganzhi: dayGan + dayZhi },
          { label: "时柱", gan: hourGan, zhi: hourZhi, ganzhi: hourGan + hourZhi },
        ],
        yearZhi, monthZhi, dayZhi, hourZhi,
      };
    }
    return calcYizhangJing(new Date(selectedYear, selectedMonth - 1, selectedDay, selectedHour));
  }, [dateType, sizhuInput, selectedYear, selectedMonth, selectedDay, selectedHour]);

  const bazi = useMemo(() => {
    try {
      return solarToBazi({
        year: selectedYear,
        month: selectedMonth,
        day: selectedDay,
        hour: selectedHour,
        gender: "male" as const,
      });
    } catch {
      return null;
    }
  }, [selectedYear, selectedMonth, selectedDay, selectedHour]);

  const jieqi = useMemo(() => getCurrentJieQi(new Date(selectedYear, selectedMonth - 1, selectedDay, selectedHour)), [selectedYear, selectedMonth, selectedDay, selectedHour]);

  const dateStr = useMemo(() => {
    if (dateType === "sizhu") {
      const { yearGan, yearZhi, monthGan, monthZhi, dayGan, dayZhi, hourGan, hourZhi } = sizhuInput;
      return `${yearGan}${yearZhi} ${monthGan}${monthZhi} ${dayGan}${dayZhi} ${hourGan}${hourZhi}`;
    }
    const mo = selectedMonth;
    const d = selectedDay;
    const h = String(selectedHour).padStart(2, "0");
    return `${selectedYear}年${mo}月${d}日 ${h}:00`;
  }, [dateType, sizhuInput, selectedYear, selectedMonth, selectedDay, selectedHour]);

  const handleDoPaipan = useCallback(() => {
    setHasResult(true);
    setShowInput(false);
    savePaipanState("yizhangjing",{input:{dateType,selectedYear,selectedMonth,selectedDay,selectedHour,sizhuInput},result:result,showForm:false,_ts:Date.now()});
  }, [dateType, selectedYear, selectedMonth, selectedDay, selectedHour, sizhuInput, result]);

  // v18.2: 监听编辑/返回事件，实现逐级返回
  useEffect(() => {
    const editHandler = () => {
      if (dateType === "sizhu") {
        setShowInput(true);
        setHasResult(false);
      } else {
        setShowForm(true);
      }
    };
    const backHandler = () => {
      // v25.0.44：返回键按浏览顺序返回——弹窗打开时仅收起弹窗，结果页放行给layout返回工具列表
      if (showForm || showInput) {
        setShowForm(false);
        setShowInput(false);
        window.__yixueBackHandled = true;
      }
    };
    window.addEventListener("yixue-edit", editHandler);
    window.addEventListener("yixue-back", backHandler);
    return () => {
      window.removeEventListener("yixue-edit", editHandler);
      window.removeEventListener("yixue-back", backHandler);
    };
  }, [showForm, showInput]);

  const handlePrev = useCallback(() => {
    const d = new Date(selectedYear, selectedMonth - 1, selectedDay, selectedHour);
    d.setHours(d.getHours() - 2);
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth() + 1);
    setSelectedDay(d.getDate());
    setSelectedHour(d.getHours());
  }, [selectedYear, selectedMonth, selectedDay, selectedHour]);

  const handleNext = useCallback(() => {
    const d = new Date(selectedYear, selectedMonth - 1, selectedDay, selectedHour);
    d.setHours(d.getHours() + 2);
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth() + 1);
    setSelectedDay(d.getDate());
    setSelectedHour(d.getHours());
  }, [selectedYear, selectedMonth, selectedDay, selectedHour]);

  const handlePalaceClick = useCallback((zhi: string) => {
    const interp = getYizhangPalaceInterpretation(zhi);
    if (interp) setInterpretPanel(interp);
  }, []);

  const getGongInfo = (zhi: string) => {
    return YIZHANG_PALACES[zhi] ?? null;
  };

  const getJieqiDisplay = () => {
    if (dateType === "sizhu") return "—";
    if (!jieqi) return "";
    return jieqi.name;
  };

  // DatePicker 历法类型与页面 dateType 保持同步
  const datePickerInitialOptions = useMemo(() => ({
    gender: "male" as const,
    calType: (dateType === "lunar" ? "lunar" : "solar") as "solar" | "lunar",
    zaoWanZi: false,
    zhenTaiyang: false,
    xiaLing: false,
  }), [dateType]);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ededed" }}>
      <DatePicker
        show={showForm}
        onClose={(reason?: "back") => { setShowForm(false); if (reason === "back" && !hasResult && !isManagedBackNavigation()) leaveToolPage(router); }}
        onSubmit={(dateVal, opts) => {
          setSelectedYear(dateVal.year);
          setSelectedMonth(dateVal.month);
          setSelectedDay(dateVal.day);
          setSelectedHour(dateVal.hour);
          // 同步 DatePicker 内的历法选择到页面 dateType
          if (opts?.calType === "lunar") setDateType("lunar");
          else if (opts?.calType === "solar") setDateType("solar");
          setShowForm(false);
        }}
        initialDate={{
          year: selectedYear,
          month: selectedMonth,
          day: selectedDay,
          hour: selectedHour,
          minute: 0,
        }}
        initialOptions={datePickerInitialOptions}
        showMinute={false}
        showGender={false}
        showCalType={true}
        showToggles={false}
        showRegion={false}
        showName={false}
        submitText="排盘"
        title="一掌经排盘"
      />
      <div style={{ maxWidth: "420px", margin: "0 auto", padding: "12px" }}>
        {/* 输入区 */}
        {showInput && (
          <div style={{ backgroundColor: "white", borderRadius: "10px", padding: "14px", marginBottom: "10px" }}>
            <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "10px" }}>排盘设置</div>

            {/* 日期类型选择：公历 / 农历 / 四柱 */}
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "12px", color: "#999", marginBottom: "6px" }}>日期类型</div>
              <div style={{ display: "flex", gap: "6px" }}>
                {([
                  { val: "solar", label: "公历" },
                  { val: "lunar", label: "农历" },
                  { val: "sizhu", label: "四柱" },
                ] as const).map(t => (
                  <button
                    key={t.val}
                    onClick={() => setDateType(t.val)}
                    style={{
                      flex: 1, padding: "8px", borderRadius: "8px", border: "none",
                      backgroundColor: dateType === t.val ? "#7B2FBE" : "#f0f0f0",
                      color: dateType === t.val ? "white" : "#666",
                      fontSize: "14px", fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 四柱模式：干支输入 */}
            {dateType === "sizhu" ? (
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", color: "#999", marginBottom: "6px" }}>四柱干支</div>
                {([
                  { key: "year", label: "年柱", ganKey: "yearGan", zhiKey: "yearZhi" },
                  { key: "month", label: "月柱", ganKey: "monthGan", zhiKey: "monthZhi" },
                  { key: "day", label: "日柱", ganKey: "dayGan", zhiKey: "dayZhi" },
                  { key: "hour", label: "时柱", ganKey: "hourGan", zhiKey: "hourZhi" },
                ] as const).map(p => (
                  <div key={p.key} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "13px", color: "#666", width: "36px", flexShrink: 0 }}>{p.label}</span>
                    <select
                      value={sizhuInput[p.ganKey]}
                      onChange={(e) => setSizhuInput(prev => ({ ...prev, [p.ganKey]: e.target.value }))}
                      style={{
                        flex: 1, padding: "8px", borderRadius: "8px",
                        border: "1px solid #ddd", fontSize: "15px",
                        outline: "none", cursor: "pointer", textAlign: "center",
                      }}
                    >
                      {TIAN_GAN.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select
                      value={sizhuInput[p.zhiKey]}
                      onChange={(e) => setSizhuInput(prev => ({ ...prev, [p.zhiKey]: e.target.value }))}
                      style={{
                        flex: 1, padding: "8px", borderRadius: "8px",
                        border: "1px solid #ddd", fontSize: "15px",
                        outline: "none", cursor: "pointer", textAlign: "center",
                      }}
                    >
                      {DI_ZHI.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>出生时间</div>
                <div
                  onClick={() => setShowForm(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                    backgroundColor: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "15px", color: "#333" }}>{dateStr}</span>
                  <span style={{ fontSize: "13px", color: "#7B2FBE" }}>点击修改</span>
                </div>
              </div>
            )}

            <button
              onClick={handleDoPaipan}
              style={{
                width: "100%", padding: "12px", borderRadius: "8px", border: "none",
                backgroundColor: "#7B2FBE", color: "white", fontSize: "16px", fontWeight: 600,
                cursor: "pointer",
              }}
            >
              开始排盘
            </button>
          </div>
        )}

        {/* ===== jishiyu 结构：原生 HTML table ===== */}
        {hasResult && (
          <>
          <table style={{
            width: "100%", borderCollapse: "collapse", textAlign: "center",
            backgroundColor: "white", borderRadius: "10px", overflow: "hidden",
            fontSize: "14px",
          }}>
            <colgroup>
              <col width="20%" />
              <col width="20%" />
              <col width="20%" />
              <col width="20%" />
              <col width="20%" />
            </colgroup>
            <tbody>
              {/* 时间 */}
              <tr style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px 6px", color: "#2e4487", fontWeight: 600 }}>时间</td>
                <td colSpan={4} style={{ padding: "8px 6px" }}>{dateStr}</td>
              </tr>

              {/* 节气 */}
              <tr style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px 6px", color: "#2e4487", fontWeight: 600 }}>节气</td>
                <td colSpan={4} style={{ padding: "8px 6px" }}>{getJieqiDisplay()}</td>
              </tr>

              {/* 四柱表头 */}
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <td style={{ padding: "4px 6px" }}></td>
                <td style={{ padding: "4px 6px", color: "#2e4487", fontWeight: 600 }}>年柱</td>
                <td style={{ padding: "4px 6px", color: "#2e4487", fontWeight: 600 }}>月柱</td>
                <td style={{ padding: "4px 6px", color: "#2e4487", fontWeight: 600 }}>日柱</td>
                <td style={{ padding: "4px 6px", color: "#2e4487", fontWeight: 600 }}>时柱</td>
              </tr>

              {/* 四柱 */}
              <tr style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px 6px", color: "#2e4487", fontWeight: 600 }}>四柱</td>
                {result.pillars.map((p, i) => (
                  <td key={i} style={{ padding: "8px 6px" }}>
                    <div style={{ fontSize: "16px", fontWeight: "bold" }}>{p.gan}</div>
                    <div style={{ fontSize: "16px", fontWeight: "bold" }}>{p.zhi}</div>
                  </td>
                ))}
              </tr>

              {/* 12宫 grid + 中心 */}
              <tr style={{ height: "125px" }}>
                <td colSpan={5} style={{ padding: "20px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-around", margin: "0 10px", padding: "20px 0" }}>
                    <div style={{
                      display: "grid",
                      gridTemplateRows: "repeat(4, 60px)",
                      gridTemplateColumns: "repeat(4, 60px)",
                      width: "240px", height: "240px",
                      margin: "0 auto",
                      fontSize: "10px",
                    }}>
                      {/* 12宫 */}
                      {GRID_CELLS.map((cell) => {
                        const gong = YIZHANG_PALACES[cell.zhi];
                        const isYear = cell.zhi === result.yearZhi;
                        const isMonth = cell.zhi === result.monthZhi;
                        const isDay = cell.zhi === result.dayZhi;
                        const isHour = cell.zhi === result.hourZhi;
                        const isActive = isYear || isMonth || isDay || isHour;

                        return (
                          <div
                            key={cell.zhi}
                            data-name={cell.zhi}
                            onClick={() => handlePalaceClick(cell.zhi)}
                            style={{
                              gridRow: cell.row, gridColumn: cell.col,
                              display: "flex", flexDirection: "column",
                              alignItems: "center", justifyContent: "center",
                              border: isActive ? "2px solid #7B2FBE" : "1px solid #ddd",
                              backgroundColor: isActive ? "#fff5f5" : "white",
                              padding: "2px",
                              cursor: "pointer",
                            }}
                          >
                            <div style={{ fontWeight: "bold", fontSize: "12px" }}>{cell.zhi}</div>
                            <div style={{ color: "#c0392b", fontSize: "10px", fontWeight: 600 }}>{gong?.name ?? ""}</div>
                            <div style={{ color: "#16a085", fontSize: "9px" }}>{gong?.type ?? ""}</div>
                            {isYear && <div style={{ fontSize: "8px", color: "#7B2FBE", fontWeight: 600 }}>年</div>}
                            {isMonth && <div style={{ fontSize: "8px", color: "#7B2FBE", fontWeight: 600 }}>月</div>}
                            {isDay && <div style={{ fontSize: "8px", color: "#7B2FBE", fontWeight: 600 }}>日</div>}
                            {isHour && <div style={{ fontSize: "8px", color: "#7B2FBE", fontWeight: 600 }}>时</div>}
                          </div>
                        );
                      })}

                      {/* 中心4格 - jishiyu 结构 */}
                      {["年宫", "月宫", "日宫", "时宫"].map((label, i) => {
                        const zhi = [result.yearZhi, result.monthZhi, result.dayZhi, result.hourZhi][i];
                        const gong = getGongInfo(zhi);
                        const row = i < 2 ? 2 : 3;
                        const col = i % 2 === 0 ? 2 : 3;
                        return (
                          <div
                            key={`center-${i}`}
                            style={{
                              gridRow: row, gridColumn: col,
                              display: "flex", flexDirection: "column",
                              alignItems: "center", justifyContent: "center",
                              border: "1px solid #ddd", backgroundColor: "#fafafa",
                              padding: "2px",
                            }}
                          >
                            <div style={{ fontSize: "8px", color: "#999" }}>{label}</div>
                            <div style={{ fontWeight: "bold", fontSize: "14px" }}>{zhi}</div>
                            <div style={{ fontSize: "8px", color: gong ? LIUDAO_COLORS[gong.type] : "#999", fontWeight: 600 }}>
                              {gong?.name ?? ""}
                            </div>
                            <div style={{ fontSize: "7px", color: "#16a085" }}>
                              {gong?.type ?? ""}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </td>
              </tr>

              {/* 点击宫位查看解释 */}
              <tr style={{ borderBottom: "1px solid #eee" }}>
                <td
                  colSpan={5}
                  style={{
                    color: "#939393",
                    fontStyle: "italic",
                    fontSize: "13px",
                    padding: "6px",
                  }}
                >
                  点击上方宫位查看解释
                </td>
              </tr>

              {/* 解读抽屉面板 */}
              {interpretPanel && (
                <tr>
                  <td colSpan={5} style={{ padding: "6px 8px" }}>
                    <div style={{
                      border: "1px solid #7B2FBE",
                      borderRadius: "8px",
                      overflow: "hidden",
                      boxShadow: "0 2px 8px rgba(123, 47, 190, 0.12)",
                    }}>
                      {/* 标题栏 */}
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

                      {/* 内容区 */}
                      <div style={{ padding: "10px 12px", maxHeight: "360px", overflowY: "auto" }}>
                        {interpretPanel.items.map((item, idx) => {
                          const tc = INTERPRET_TYPE_COLORS[item.type] || INTERPRET_TYPE_COLORS["palace"];
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

                      {/* 底部提示 */}
                      <div style={{
                        padding: "6px 12px",
                        background: "#fafafa",
                        borderTop: "1px solid #eee",
                        fontSize: "10px",
                        color: "#999",
                        textAlign: "center",
                      }}>
                        点击宫位查看不同解读 · 引经据典，仅供参考
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {/* 导航按钮（四柱模式下隐藏，因不基于日期） */}
              {dateType !== "sizhu" && (
              <tr style={{ borderBottom: "1px solid #eee" }}>
                <td colSpan={5} style={{ padding: "10px", height: "50px" }}>
                  <div style={{
                    width: "100%", overflow: "auto", lineHeight: "30px",
                    display: "flex", justifyContent: "center", gap: "15px",
                  }}>
                    <button
                      onClick={handlePrev}
                      style={{
                        padding: "6px 16px", borderRadius: "6px",
                        border: "1px solid #7B2FBE", backgroundColor: "white",
                        color: "#7B2FBE", fontSize: "13px", cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      上一时辰
                    </button>
                    <button
                      onClick={handleNext}
                      style={{
                        padding: "6px 16px", borderRadius: "6px",
                        border: "1px solid #7B2FBE", backgroundColor: "white",
                        color: "#7B2FBE", fontSize: "13px", cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      下一时辰
                    </button>
                  </div>
                </td>
              </tr>
              )}

              {/* 详情卡 */}
              <tr style={{ height: "125px" }}>
                <td colSpan={5} style={{ padding: "7px" }}>
                  {/* 年宫 */}
                  {(() => {
                    const gong = getGongInfo(result.yearZhi);
                    return (
                      <div style={{
                        border: "1px solid #eee", borderRadius: "8px", padding: "8px",
                        marginBottom: "6px", backgroundColor: "#fafafa",
                      }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#2e4487", marginBottom: "4px" }}>年宫</div>
                        <div style={{ display: "flex", gap: "6px", marginBottom: "4px", fontSize: "12px" }}>
                          <span style={{ fontWeight: "bold" }}>{result.yearZhi}</span>
                          <span style={{ color: "#c0392b", fontWeight: 600 }}>{gong?.name ?? ""}</span>
                          <span style={{ color: "#16a085" }}>{gong?.type ?? ""}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#999" }}>{gong?.desc ?? ""}</div>
                      </div>
                    );
                  })()}

                  {/* 月宫 */}
                  {(() => {
                    const gong = getGongInfo(result.monthZhi);
                    return (
                      <div style={{
                        border: "1px solid #eee", borderRadius: "8px", padding: "8px",
                        marginBottom: "6px", backgroundColor: "#fafafa",
                      }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#2e4487", marginBottom: "4px" }}>月宫</div>
                        <div style={{ display: "flex", gap: "6px", marginBottom: "4px", fontSize: "12px" }}>
                          <span style={{ fontWeight: "bold" }}>{result.monthZhi}</span>
                          <span style={{ color: "#c0392b", fontWeight: 600 }}>{gong?.name ?? ""}</span>
                          <span style={{ color: "#16a085" }}>{gong?.type ?? ""}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#999" }}>{gong?.desc ?? ""}</div>
                      </div>
                    );
                  })()}

                  {/* 日宫 */}
                  {(() => {
                    const gong = getGongInfo(result.dayZhi);
                    return (
                      <div style={{
                        border: "1px solid #eee", borderRadius: "8px", padding: "8px",
                        marginBottom: "6px", backgroundColor: "#fafafa",
                      }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#2e4487", marginBottom: "4px" }}>日宫</div>
                        <div style={{ display: "flex", gap: "6px", marginBottom: "4px", fontSize: "12px" }}>
                          <span style={{ fontWeight: "bold" }}>{result.dayZhi}</span>
                          <span style={{ color: "#c0392b", fontWeight: 600 }}>{gong?.name ?? ""}</span>
                          <span style={{ color: "#16a085" }}>{gong?.type ?? ""}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#999" }}>{gong?.desc ?? ""}</div>
                      </div>
                    );
                  })()}

                  {/* 时宫 */}
                  {(() => {
                    const gong = getGongInfo(result.hourZhi);
                    return (
                      <div style={{
                        border: "1px solid #eee", borderRadius: "8px", padding: "8px",
                        marginBottom: "6px", backgroundColor: "#fafafa",
                      }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#2e4487", marginBottom: "4px" }}>时宫</div>
                        <div style={{ display: "flex", gap: "6px", marginBottom: "4px", fontSize: "12px" }}>
                          <span style={{ fontWeight: "bold" }}>{result.hourZhi}</span>
                          <span style={{ color: "#c0392b", fontWeight: 600 }}>{gong?.name ?? ""}</span>
                          <span style={{ color: "#16a085" }}>{gong?.type ?? ""}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#999" }}>{gong?.desc ?? ""}</div>
                      </div>
                    );
                  })()}

                  {/* 看法总纲 */}
                  <div style={{
                    border: "1px solid #eee", borderRadius: "8px", padding: "8px",
                    backgroundColor: "#fafafa",
                  }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#2e4487", marginBottom: "4px" }}>看法总纲</div>
                    <div style={{ fontSize: "11px", color: "#999", lineHeight: "1.6" }}>
                      年为前四世，月为前三世，日为前二世，时为前一世。<br />
                      年为根基，论祖业之兴废。月为提纲，断兄弟之有无。<br />
                      日论夫妻，主中年之造化。时为子息，定晚年之荣枯。<br />
                      四柱看命，以时为主，逢吉则吉，逢凶则凶。
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: "10px" }}>
            <EventDivinationPanel
              toolName="一掌经"
              chartContext={`排盘时间: ${dateStr}\n节气: ${getJieqiDisplay()}\n四柱: ${result.pillars.map(p => p.gan + p.zhi).join(" ")}\n年宫: ${result.yearZhi}(${getGongInfo(result.yearZhi)?.name ?? ""})\n月宫: ${result.monthZhi}(${getGongInfo(result.monthZhi)?.name ?? ""})\n日宫: ${result.dayZhi}(${getGongInfo(result.dayZhi)?.name ?? ""})\n时宫: ${result.hourZhi}(${getGongInfo(result.hourZhi)?.name ?? ""})`}
              isPaidTool={false}
            />
          </div>
          </>
        )}
      {/* 分享排盘结果 */}
      <div className="px-3 py-2">
        <ShareButton
          type="tool"
          title="达摩一掌经排盘结果"
          description="达摩一掌经排盘"
          variant="block"
          label="分享排盘结果"
        />
        <div className="mt-2">
          <PostToSquareButton tool="达摩一掌经" summary="一掌经推算已完成，十二宫位落位清晰" />
        </div>
      </div>


        {/* 免责声明 */}
        <div style={{
          backgroundColor: "#f9f9f9", borderRadius: "8px", padding: "12px",
          border: "1px solid #eee", textAlign: "center", marginTop: "10px",
        }}>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "#999", marginBottom: "4px" }}>免责声明</p>
          <p style={{ fontSize: "11px", color: "#bbb", margin: 0, lineHeight: "1.5" }}>
            本页面内容仅供传统文化学习与参考，不构成任何决策建议。达摩一掌经为佛家命理术数，排盘结果为简化算法，请理性看待。
          </p>
        </div>
      </div>
    </div>
  );
}
