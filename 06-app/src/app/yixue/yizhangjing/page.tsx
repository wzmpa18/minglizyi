"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  solarToBazi,
  getCurrentJieQi,
} from "@/algorithm-core";
import { DatePicker, BrandHeader } from "@/components/shared";

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

const ZHI_LIST = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

const LIUDAO_COLORS: Record<string, string> = {
  "佛道": "#ffa500", "鬼道": "#0074e4", "人道": "#00a879",
  "畜生道": "#a64b00", "修罗道": "#9B5ECF", "仙道": "#8b5cf6",
};

// ============================================================================
// 一掌经排盘
// ============================================================================
function calcYizhangJing(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();

  const base = year - 4;
  const yearGanIdx = ((base % 10) + 10) % 10;
  const yearZhiIdx = ((base % 12) + 12) % 12;
  const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const yearGan = GAN[yearGanIdx];
  const yearZhi = ZHI_LIST[yearZhiIdx];

  const monthGanStartMap: Record<string, number> = {
    "甲": 2, "己": 2, "乙": 4, "庚": 4, "丙": 6, "辛": 6, "丁": 8, "壬": 8, "戊": 0, "癸": 0,
  };
  const monthGanIdx = (monthGanStartMap[yearGan] + (month - 1)) % 10;
  const monthZhiIdx = (2 + (month - 1)) % 12;
  const monthGan = GAN[monthGanIdx];
  const monthZhi = ZHI_LIST[monthZhiIdx];

  const dayGzIdx = ((year - 1900) * 365 + Math.floor((year - 1900) / 4) + [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][month - 1] + day + 9) % 60;
  const dayGan = GAN[dayGzIdx % 10];
  const dayZhi = ZHI_LIST[dayGzIdx % 12];

  const hourGanStartMap: Record<string, number> = {
    "甲": 0, "己": 0, "乙": 2, "庚": 2, "丙": 4, "辛": 4, "丁": 6, "壬": 6, "戊": 8, "癸": 8,
  };
  const hourZhiIdx = Math.floor(((hour + 1) % 24) / 2);
  const hourGanIdx = (hourGanStartMap[dayGan] + hourZhiIdx) % 10;
  const hourGan = GAN[hourGanIdx];
  const hourZhi = ZHI_LIST[hourZhiIdx];

  return {
    pillars: [
      { label: "年柱", gan: yearGan, zhi: yearZhi, ganzhi: yearGan + yearZhi },
      { label: "月柱", gan: monthGan, zhi: monthZhi, ganzhi: monthGan + monthZhi },
      { label: "日柱", gan: dayGan, zhi: dayZhi, ganzhi: dayGan + dayZhi },
      { label: "时柱", gan: hourGan, zhi: hourZhi, ganzhi: hourGan + hourZhi },
    ],
    yearZhi,
    monthZhi,
    dayZhi,
    hourZhi,
  };
}

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

// ============================================================================
// 主组件
// ============================================================================

export default function YizhangjingPage() {
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
  const [hasResult, setHasResult] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [showForm, setShowForm] = useState(true);

  const result = useMemo(() => calcYizhangJing(new Date(selectedYear, selectedMonth - 1, selectedDay, selectedHour)), [selectedYear, selectedMonth, selectedDay, selectedHour]);

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
    const mo = selectedMonth;
    const d = selectedDay;
    const h = String(selectedHour).padStart(2, "0");
    return `${selectedYear}年${mo}月${d}日 ${h}:00`;
  }, [selectedYear, selectedMonth, selectedDay, selectedHour]);

  const handleDoPaipan = useCallback(() => {
    setHasResult(true);
    setShowInput(false);
  }, []);

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

  const getGongInfo = (zhi: string) => {
    return YIZHANG_PALACES[zhi] ?? null;
  };

  const getJieqiDisplay = () => {
    if (!jieqi) return "";
    return jieqi.name;
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ededed" }}>
      <BrandHeader title="言道一掌经" showBack={true} backUrl="/yixue" />
      <DatePicker
        show={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={(dateVal) => {
          setSelectedYear(dateVal.year);
          setSelectedMonth(dateVal.month);
          setSelectedDay(dateVal.day);
          setSelectedHour(dateVal.hour);
          setShowForm(false);
        }}
        initialDate={{
          year: selectedYear,
          month: selectedMonth,
          day: selectedDay,
          hour: selectedHour,
          minute: 0,
        }}
        showMinute={false}
        showGender={false}
        showCalType={true}
        showToggles={false}
        showRegion={false}
        showName={false}
        submitText="排盘"
        title="一掌经排盘"
      />
      {/* Header */}
      <div style={{
        backgroundColor: "#7B2FBE", height: "40px", display: "flex",
        alignItems: "center", justifyContent: "center", position: "relative",
      }}>
        <button
          onClick={() => router.back()}
          style={{
            position: "absolute", left: "0", width: "40px", height: "40px",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "none", cursor: "pointer",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span style={{ color: "white", fontSize: "17px", fontWeight: "bold" }}>言道一掌经</span>
      </div>

      <div style={{ maxWidth: "375px", margin: "0 auto", padding: "12px" }}>
        {/* 输入区 */}
        {showInput && (
          <div style={{ backgroundColor: "white", borderRadius: "10px", padding: "14px", marginBottom: "10px" }}>
            <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "10px" }}>排盘设置</div>

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
                            style={{
                              gridRow: cell.row, gridColumn: cell.col,
                              display: "flex", flexDirection: "column",
                              alignItems: "center", justifyContent: "center",
                              border: isActive ? "2px solid #7B2FBE" : "1px solid #ddd",
                              backgroundColor: isActive ? "#fff5f5" : "white",
                              padding: "2px",
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

              {/* 导航按钮 */}
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
        )}

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