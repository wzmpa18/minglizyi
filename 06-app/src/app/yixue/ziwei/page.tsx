"use client";

import { useState, useMemo, useEffect } from "react";
import type { CSSProperties } from "react";
import { calculateZiwei, solarToBazi } from "@/algorithm-core";
import type { ZiweiResult, Gender } from "@/algorithm-core";
import { DatePicker } from "@/components/shared";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";
import { getPalaceInterpretation, getPalaceAllStarInterpretations } from "@/lib/ziwei-interpretations";
import { savePaipanState, loadPaipanState, clearPaipanState } from "@/lib/paipanPersistence";

// ====================================================================
// 品牌色 & 常量
// ====================================================================

const BRAND_PURPLE = "#7B2FBE";
const BRAND_PURPLE_LIGHT = "#9B5ECF";
const BRAND_PURPLE_DARK = "#5B1A8A";
const BRAND_PURPLE_BG = "#F3EDF7";

// 五行颜色（传统配色）
const WUXING_COLORS: Record<string, string> = {
  "木": "#00a879",
  "火": "#ed4d49",
  "土": "#a64b00",
  "金": "#ffa500",
  "水": "#0074e4",
};

// 天干地支五行归属
const GAN_WUXING: Record<string, string> = {
  "甲": "木", "乙": "木",
  "丙": "火", "丁": "火",
  "戊": "土", "己": "土",
  "庚": "金", "辛": "金",
  "壬": "水", "癸": "水",
};
const ZHI_WUXING: Record<string, string> = {
  "寅": "木", "卯": "木",
  "巳": "火", "午": "火",
  "辰": "土", "戌": "土", "丑": "土", "未": "土",
  "申": "金", "酉": "金",
  "亥": "水", "子": "水",
};

// 14主星（全部深红色）
const MAJOR_STARS = ["紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府", "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"];
const MAJOR_STAR_COLOR = "#b90000";

// 六吉星 + 禄存天马（辅星，紫色）
const AUSPICIOUS_AUX = ["左辅", "右弼", "天魁", "天钺", "文昌", "文曲", "禄存", "天马"];
const AUSPICIOUS_COLOR = "#7804a6";

// 六煞星（同辅星紫色）
const INAUSPICIOUS_AUX = ["擎羊", "陀罗", "火星", "铃星", "地空", "地劫"];
const INAUSPICIOUS_COLOR = "#7804a6";

// 杂曜/流年星（蓝色）
const MINOR_STAR_COLOR = "#014fab";

// 三合模式下显示的常用杂曜
const SANHE_COMMON_MINOR = ["红鸾", "天喜", "天刑", "天姚", "天月", "阴煞", "孤辰", "寡宿", "天哭", "天虚", "龙池", "凤阁", "咸池", "华盖", "解神", "天巫"];

// 飞星模式下显示的完整杂曜
const FEIXING_EXTRA_MINOR = ["天刑", "天姚", "红鸾", "天喜", "孤辰", "寡宿", "天哭", "天虚", "解神", "天巫", "天月", "阴煞"];

// 天干四化表（宫干飞化）
// 格式: { 天干: { 禄: 星名, 权: 星名, 科: 星名, 忌: 星名 } }
const TIANGAN_SIHUA: Record<string, { lu: string; quan: string; ke: string; ji: string }> = {
  "甲": { lu: "廉贞", quan: "破军", ke: "武曲", ji: "太阳" },
  "乙": { lu: "天机", quan: "天梁", ke: "紫微", ji: "太阴" },
  "丙": { lu: "天同", quan: "天机", ke: "文昌", ji: "廉贞" },
  "丁": { lu: "太阴", quan: "天同", ke: "天机", ji: "巨门" },
  "戊": { lu: "贪狼", quan: "太阴", ke: "右弼", ji: "天机" },
  "己": { lu: "武曲", quan: "贪狼", ke: "天梁", ji: "文曲" },
  "庚": { lu: "太阳", quan: "武曲", ke: "太阴", ji: "天同" },
  "辛": { lu: "巨门", quan: "太阳", ke: "文曲", ji: "文昌" },
  "壬": { lu: "天梁", quan: "紫微", ke: "左辅", ji: "武曲" },
  "癸": { lu: "破军", quan: "巨门", ke: "太阴", ji: "贪狼" },
};

// 七级庙旺亮度色标
const BRIGHTNESS_COLORS: Record<string, string> = {
  "庙": "#22c55e",
  "旺": "#16a34a",
  "得": "#0d9488",
  "利": "#0284c7",
  "平": "#6b7280",
  "不": "#ea580c",
  "陷": "#dc2626",
};

// 四化小徽章样式（彩色背景白色文字，全行内显示）
const SIHUA_BADGE_STYLE: Record<string, CSSProperties> = {
  "化禄": { background: "#009029", color: "white", border: "none", padding: "1px 3px", fontSize: "9px", fontWeight: "bold", borderRadius: "1px", lineHeight: "1.1", display: "inline-block" },
  "化权": { background: "#9900a9", color: "white", border: "none", padding: "1px 3px", fontSize: "9px", fontWeight: "bold", borderRadius: "1px", lineHeight: "1.1", display: "inline-block" },
  "化科": { background: "#0462d7", color: "white", border: "none", padding: "1px 3px", fontSize: "9px", fontWeight: "bold", borderRadius: "1px", lineHeight: "1.1", display: "inline-block" },
  "化忌": { background: "#f20010", color: "white", border: "none", padding: "1px 3px", fontSize: "9px", fontWeight: "bold", borderRadius: "1px", lineHeight: "1.1", display: "inline-block" },
};

// 四化徽章-行内样式（忌在列表中也使用行内样式，不用绝对定位）
const SIHUA_BADGE_INLINE: Record<string, CSSProperties> = {
  "化禄": SIHUA_BADGE_STYLE["化禄"],
  "化权": SIHUA_BADGE_STYLE["化权"],
  "化科": SIHUA_BADGE_STYLE["化科"],
  "化忌": { background: "#f20010", color: "white", border: "none", padding: "1px 3px", fontSize: "9px", fontWeight: "bold", borderRadius: "1px", lineHeight: "1.1", display: "inline-block" },
};

const SIHUA_BADGE_CHAR: Record<string, string> = {
  "化禄": "禄",
  "化权": "权",
  "化科": "科",
  "化忌": "忌",
};

const SIHUA_COLORS: Record<string, string> = {
  "化禄": "#009029",
  "化权": "#9900a9",
  "化科": "#0462d7",
  "化忌": "#f20010",
};

// 4x4 宫格布局
const GRID_4X4: (number | null)[][] = [
  [3, 4, 5, 6],
  [2, null, null, 7],
  [1, null, null, 8],
  [0, 11, 10, 9],
];

// 地支名称
const ZHI_NAMES = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];

// 天干名称
const GAN_NAMES = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

// 地支索引 -> 网格坐标 (col, row)
const ZHI_TO_GRID: Record<number, [number, number]> = {};
for (let r = 0; r < 4; r++) {
  for (let c = 0; c < 4; c++) {
    const idx = GRID_4X4[r][c];
    if (idx !== null) {
      ZHI_TO_GRID[idx] = [c, r];
    }
  }
}

// 各宫位面向中心的锚点坐标（百分比viewBox 0-100），对标jishiyu anchorPoint
// 四角宫锚点=内角点；四边宫锚点=内边中点
const ANCHOR_POINTS: Record<number, [number, number]> = {
  3:  [25,    25],    // 巳 (col0,row0): 右下角
  4:  [37.5,  25],    // 午 (col1,row0): 下边中点
  5:  [62.5,  25],    // 未 (col2,row0): 下边中点
  6:  [75,    25],    // 申 (col3,row0): 左下角
  2:  [25,    37.5],  // 辰 (col0,row1): 右边中点
  7:  [75,    37.5],  // 酉 (col3,row1): 左边中点
  1:  [25,    62.5],  // 卯 (col0,row2): 右边中点
  8:  [75,    62.5],  // 戌 (col3,row2): 左边中点
  0:  [25,    75],    // 寅 (col0,row3): 右上角
  11: [37.5,  75],    // 丑 (col1,row3): 上边中点
  10: [62.5,  75],    // 子 (col2,row3): 上边中点
  9:  [75,    75],    // 亥 (col3,row3): 左上角
};

// 六吉星
const LIU_JI = ["左辅", "右弼", "天魁", "天钺", "文昌", "文曲"];
// 六煞星
const LIU_SHA = ["擎羊", "陀罗", "火星", "铃星", "地空", "地劫"];
// 其他常用星曜
const OTHER_STARS = ["禄存", "天马", "天刑", "天姚", "解神", "天巫", "天月", "阴煞", "天官", "天福", "台辅", "封诰", "天哭", "天虚", "龙池", "凤阁", "红鸾", "天喜", "孤辰", "寡宿", "咸池", "华盖"];
// 长生十二神
const CHANGSHENG = ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"];
// 博士十二神
const BOSHI = ["博士", "力士", "青龙", "小耗", "将军", "奏书", "飞廉", "喜神", "病符", "大耗", "伏兵", "官府"];
// 岁前十二神
const SUIQIAN = ["太岁", "太阳", "丧门", "太阴", "官符", "死符", "岁破", "龙德", "白虎", "福德", "吊客", "病符"];

// 月份干支简化计算
const MONTH_GAN_START: Record<string, string> = {
  "甲": "丙", "己": "丙",
  "乙": "戊", "庚": "戊",
  "丙": "庚", "辛": "庚",
  "丁": "壬", "壬": "壬",
  "戊": "甲", "癸": "甲",
};

// ====================================================================
// 工具函数
// ====================================================================

/** 根据命宫地支获取命主星（v2.0 修正：与 iztro 一致） */
function getMingZhu(earthlyBranch: string): string {
  const map: Record<string, string> = {
    "子": "贪狼", "丑": "巨门", "寅": "禄存", "卯": "文曲",
    "辰": "廉贞", "巳": "武曲", "午": "破军", "未": "武曲",
    "申": "廉贞", "酉": "文曲", "戌": "禄存", "亥": "巨门",
  };
  return map[earthlyBranch] || "-";
}

/** 根据年支获取身主星（v2.0 修正：与 iztro 一致，修正原多处映射错误）
 *  正确歌诀：子午火星、丑未天相、寅申天梁、卯酉天同、辰戌文昌、巳亥天机 */
function getShenZhu(earthlyBranch: string): string {
  const map: Record<string, string> = {
    "子": "火星", "丑": "天相", "寅": "天梁", "卯": "天同",
    "辰": "文昌", "巳": "天机", "午": "火星", "未": "天相",
    "申": "天梁", "酉": "天同", "戌": "文昌", "亥": "天机",
  };
  return map[earthlyBranch] || "-";
}

/** 计算子斗：寅宫起正月顺数至生月，再生月宫起子时逆数至生时 */
function getZiDou(lunarMonth: number, hourZhiIdx: number): string {
  // ZHI_NAMES = ["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"] (index 0-11)
  // Step 1: 从寅(0)起正月，顺数到农历月份（1月=0寅, 2月=1卯, ...）
  const monthPos = (lunarMonth - 1) % 12;
  // Step 2: 从该宫起子时(0)，逆数到生时地支index
  // 逆数：子=0→monthPos, 丑=1→monthPos-1, 寅=2→monthPos-2, ...
  const ziDouIdx = (monthPos - hourZhiIdx + 12 * 3) % 12;
  return ZHI_NAMES[ziDouIdx];
}

/** 从lunarDate字符串解析农历月份 */
function parseLunarMonth(lunarDate: string): number {
  if (!lunarDate) return 1;
  const cn = ["正","一","二","三","四","五","六","七","八","九","十","冬","腊"];
  for (let i = 0; i < cn.length; i++) {
    if (lunarDate.includes(cn[i] + "月")) return i === 0 ? 1 : i;
  }
  // 处理"十一月""十二月"
  if (lunarDate.includes("十一月")) return 11;
  if (lunarDate.includes("十二月") || lunarDate.includes("腊月")) return 12;
  return 1;
}

/** 将小时数(0-23)转换为时辰地支索引(子=0,丑=1,...,亥=11) */
function hourToZhiIdx(hour: number): number {
  // 23-1:子(0), 1-3:丑(1), 3-5:寅(2), 5-7:卯(3), 7-9:辰(4), 9-11:巳(5)
  // 11-13:午(6), 13-15:未(7), 15-17:申(8), 17-19:酉(9), 19-21:戌(10), 21-23:亥(11)
  const map = [0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11];
  return map[hour] ?? 0;
}

/** 获取宫位四化信息 */
function getSihuaType(sihua: ZiweiResult["sihua"], starName: string): string {
  if (!sihua) return "";
  if (sihua.huaLu?.star === starName) return "化禄";
  if (sihua.huaQuan?.star === starName) return "化权";
  if (sihua.huaKe?.star === starName) return "化科";
  if (sihua.huaJi?.star === starName) return "化忌";
  return "";
}

/** 获取星曜亮度 */
function getStarBrightness(result: ZiweiResult, starName: string, palaceName: string): string {
  const starObj = result.stars.find(
    (s) => s.name === starName && s.palace === palaceName
  );
  return starObj?.brightness || "平";
}

/** 判断是否为主星 */
function isMajorStar(starName: string): boolean {
  return MAJOR_STARS.includes(starName);
}

/** 获取星曜颜色 */
function getStarColor(starName: string): string {
  if (MAJOR_STARS.includes(starName)) return MAJOR_STAR_COLOR;
  if (AUSPICIOUS_AUX.includes(starName)) return AUSPICIOUS_COLOR;
  if (INAUSPICIOUS_AUX.includes(starName)) return INAUSPICIOUS_COLOR;
  return MINOR_STAR_COLOR; // 杂曜蓝色
}

/** 获取星曜字号 */
function getStarFontSize(starName: string): string {
  if (MAJOR_STARS.includes(starName)) return "11px";
  if (AUSPICIOUS_AUX.includes(starName) || INAUSPICIOUS_AUX.includes(starName)) return "10px";
  return "9px";
}

/** 获取干支五行颜色 */
function getGanZhiColor(char: string): string {
  const wx = GAN_WUXING[char] || ZHI_WUXING[char];
  return wx ? WUXING_COLORS[wx] : "#585858";
}

/** 根据公历年获取年干支（天干+地支） */
function getYearGanZhi(year: number): { gan: string; zhi: string } {
  const ganIdx = (year - 4) % 10;
  const zhiIdx = (year - 4) % 12;
  return {
    gan: GAN_NAMES[(ganIdx + 10) % 10],
    zhi: ZHI_NAMES[(zhiIdx + 12) % 12],
  };
}

/** 根据年干和月份(1-12)获取月干支 */
function getMonthGanZhi(yearGan: string, month: number): { gan: string; zhi: string } {
  // 月支固定：正月寅、二月卯...十二月丑
  const monthZhi = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];
  const zhi = monthZhi[(month - 1) % 12];
  // 五虎遁年起月法
  const startGan = MONTH_GAN_START[yearGan] || "丙";
  const startGanIdx = GAN_NAMES.indexOf(startGan);
  const gan = GAN_NAMES[(startGanIdx + month - 1) % 10];
  return { gan, zhi };
}

/**
 * 根据宫位和生年干计算辅星/煞星分布
 */
function getAuxStars(palaceIdx: number, ziweiIdx: number, tianfuIdx: number, yearStem: string, yearZhi: string, mingIdx: number, month: number): {ji: string[]; sha: string[]; other: string[]; changsheng: string; boshi: string; suiqian: string} {
  const ji: string[] = [];
  const sha: string[] = [];
  const other: string[] = [];

  // 文昌固定在巳(3)，文曲固定在酉(7)
  if (palaceIdx === 3) ji.push("文昌");
  if (palaceIdx === 7) ji.push("文曲");

  // 左辅从辰(2)起正月顺行，右弼从戌(8)起正月逆行
  const fuoIdx = (2 + (month - 1)) % 12;
  const biIdx = (8 - (month - 1) + 12 * 3) % 12;
  if (palaceIdx === fuoIdx) ji.push("左辅");
  if (palaceIdx === biIdx) ji.push("右弼");

  // 天魁天钺
  const kuiYue: Record<string, [number, number]> = {
    "甲": [3, 1], "乙": [11, 9], "丙": [10, 8], "丁": [10, 8], "戊": [3, 1],
    "己": [11, 9], "庚": [8, 10], "辛": [4, 2], "壬": [6, 4], "癸": [6, 4]
  };
  if (kuiYue[yearStem]) {
    if (palaceIdx === kuiYue[yearStem][0]) ji.push("天魁");
    if (palaceIdx === kuiYue[yearStem][1]) ji.push("天钺");
  }

  // 禄存
  const luCun: Record<string, number> = { "甲": 2, "乙": 3, "丙": 5, "丁": 6, "戊": 5, "己": 6, "庚": 8, "辛": 9, "壬": 0, "癸": 1 };
  if (luCun[yearStem] === palaceIdx) other.push("禄存");

  // 擎羊（禄存前一位）、陀罗（禄存后一位）
  if (luCun[yearStem] !== undefined) {
    if ((luCun[yearStem] + 1) % 12 === palaceIdx) sha.push("擎羊");
    if ((luCun[yearStem] + 11) % 12 === palaceIdx) sha.push("陀罗");
  }

  // 天马
  const tianMa: Record<string, number> = { "寅": 6, "午": 6, "戌": 6, "申": 0, "子": 0, "辰": 0, "巳": 9, "酉": 9, "丑": 9, "亥": 3, "卯": 3, "未": 3 };
  if (tianMa[yearZhi] === palaceIdx) other.push("天马");

  // 火星铃星
  const huoIdx = (mingIdx + 3) % 12;
  const lingIdx = (mingIdx + 7) % 12;
  if (palaceIdx === huoIdx) sha.push("火星");
  if (palaceIdx === lingIdx) sha.push("铃星");

  // 地空地劫
  const kongIdx = (mingIdx + 6) % 12;
  const jieIdx = (kongIdx + 1) % 12;
  if (palaceIdx === kongIdx) sha.push("地空");
  if (palaceIdx === jieIdx) sha.push("地劫");

  // 红鸾天喜
  const zhiIdx0 = ZHI_NAMES.indexOf(yearZhi);
  const hongluan = (2 + 12 - zhiIdx0) % 12;
  const tianxi = (hongluan + 6) % 12;
  if (palaceIdx === hongluan) other.push("红鸾");
  if (palaceIdx === tianxi) other.push("天喜");

  // 天刑天姚天月解神天巫阴煞
  if (palaceIdx === (mingIdx + 5) % 12) other.push("天刑");
  if (palaceIdx === (mingIdx + 9) % 12) other.push("天姚");
  if (palaceIdx === (mingIdx + 4) % 12) other.push("天月");
  if (palaceIdx === (mingIdx + 8) % 12) other.push("解神");
  if (palaceIdx === (mingIdx + 1) % 12) other.push("天巫");
  if (palaceIdx === (mingIdx + 11) % 12) other.push("阴煞");

  // 孤辰寡宿
  const guChenMap: Record<string, number> = { "寅": 3, "卯": 3, "辰": 3, "巳": 6, "午": 6, "未": 6, "申": 9, "酉": 9, "戌": 9, "亥": 0, "子": 0, "丑": 0 };
  const guaSuMap: Record<string, number> = { "寅": 11, "卯": 11, "辰": 11, "巳": 2, "午": 2, "未": 2, "申": 5, "酉": 5, "戌": 5, "亥": 8, "子": 8, "丑": 8 };
  if (guChenMap[yearZhi] === palaceIdx) other.push("孤辰");
  if (guaSuMap[yearZhi] === palaceIdx) other.push("寡宿");

  // 咸池
  const xianChiMap: Record<string, number> = { "寅": 8, "卯": 9, "辰": 6, "巳": 1, "午": 2, "未": 0, "申": 3, "酉": 4, "戌": 1, "亥": 6, "子": 7, "丑": 5 };
  if (xianChiMap[yearZhi] === palaceIdx) other.push("咸池");

  // 华盖
  const huaGaiMap: Record<string, number> = { "寅": 10, "卯": 11, "辰": 2, "巳": 10, "午": 11, "未": 2, "申": 10, "酉": 11, "戌": 2, "亥": 10, "子": 11, "丑": 2 };
  if (huaGaiMap[yearZhi] === palaceIdx) other.push("华盖");

  // 天哭天虚
  if (palaceIdx === (mingIdx + 2) % 12) other.push("天哭");
  if (palaceIdx === (mingIdx + 10) % 12) other.push("天虚");

  // 龙池凤阁
  const longChi = (3 + (mingIdx % 6)) % 12; // 简化
  const fengGe = (11 - (mingIdx % 6) + 12) % 12;
  if (palaceIdx === longChi) other.push("龙池");
  if (palaceIdx === fengGe) other.push("凤阁");

  // 长生十二神（从命宫起长生，顺行）
  const changsheng = CHANGSHENG[(palaceIdx - mingIdx + 12) % 12];

  // 博士十二神（从禄存起博士，顺行）
  const luIdx = luCun[yearStem] ?? 0;
  const boshi = BOSHI[(palaceIdx - luIdx + 12) % 12];

  // 岁前十二神（从年支起太岁，顺行）
  const suiqian = SUIQIAN[(palaceIdx - zhiIdx0 + 12) % 12];

  return { ji, sha, other, changsheng, boshi, suiqian };
}

// ====================================================================
// 主组件
// ====================================================================

export default function ZiweiPage() {
  // ---- 表单状态 ----
  const [name, setName] = useState("");
  // URL参数预设（用于自动验证）：?y=1990&m=6&d=15&h=0&g=male&auto=1
  const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const [year, setYear] = useState(sp ? parseInt(sp.get("y") || "1990") : 1990);
  const [month, setMonth] = useState(sp ? parseInt(sp.get("m") || "5") : 5);
  const [day, setDay] = useState(sp ? parseInt(sp.get("d") || "15") : 15);
  const [hour, setHour] = useState(sp ? parseInt(sp.get("h") || "12") : 12);
  const [gender, setGender] = useState<Gender>((sp?.get("g") as Gender) || "male");
  const [calType, setCalType] = useState<"gongli" | "nongli" | "sizhu">("gongli");
  const [zaoWanZi, setZaoWanZi] = useState(false);
  const [zhenTaiyang, setZhenTaiyang] = useState(false);
  const [xiaLing, setXiaLing] = useState(false);
  const [saveName, setSaveName] = useState(false);
  const [showForm, setShowForm] = useState(true);

  // ---- 视图模式 ----
  const [viewMode, setViewMode] = useState<"sihua" | "sanhe" | "feixing">("sihua");

  // ---- 三方四正高亮宫位（地支索引 0-11，null 表示无高亮） ----
  const [focusedPalace, setFocusedPalace] = useState<number | null>(null);

  // ---- 大限/流年选中状态 ----
  const [selectedDaxian, setSelectedDaxian] = useState<number>(0);
  const [selectedLiunian, setSelectedLiunian] = useState<number>(0);
  const [interpretPanel, setInterpretPanel] = useState<{palaceName: string; palaceGanZhi: string; interpretations: Array<{type: string; title: string; content: string; source: string}>} | null>(null);

  // ---- 结果状态 ----
  const [result, setResult] = useState<ZiweiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);

  // ---- 提交 ----
  const handleSubmit = (override?:{year:number;month:number;day:number;hour:number;gender:Gender}) => {
    setError(null);
    const y=override?.year??year; const m=override?.month??month;
    const d=override?.day??day; const h=override?.hour??hour;
    const g=override?.gender??gender;
    try {
      const res = calculateZiwei({ year:y, month:m, day:d, hour:h, gender:g });
      setResult(res);
      setShowForm(false);
      savePaipanState("ziwei",{input:{year:y,month:m,day:d,hour:h,gender:g,calType},showForm:false,_ts:Date.now()});
      // 保存客户记录
      if(selectedClient){
        try{saveRecord({clientId:selectedClient.id,type:"ziwei",data:{...res,inputParams:{year:y,month:m,day:d,hour:h,gender:g}},note:"",status:"pending"});}catch(e){console.error("保存记录失败:",e);}
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "计算失败");
    }
  };

  // URL参数clientId自动选中客户 + 回填数据检查
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) {
      const c = getClient(cid);
      if (c) setSelectedClient(c);
    }
    const prefill = getPrefillData("ziwei");
    if (prefill) {
      try {
        // 回填排盘结果
        setResult(prefill);
        // 回填输入参数
        if (prefill.inputParams) {
          const ip = prefill.inputParams;
          if (ip.year) setYear(ip.year);
          if (ip.month) setMonth(ip.month);
          if (ip.day) setDay(ip.day);
          if (ip.hour !== undefined) setHour(ip.hour);
          if (ip.gender) setGender(ip.gender);
        }
        setShowForm(false);
        clearPrefillData("ziwei");
      } catch (e) { console.error("回填失败:", e); }
    }
  }, []);

  // URL参数auto=1时自动排盘（用于验证）
  useEffect(() => {
    if (sp?.get("auto") === "1") {
      const t = setTimeout(() => handleSubmit(), 300);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // localStorage 持久化：恢复排盘状态
  useEffect(() => {
    const saved = loadPaipanState("ziwei");
    if (saved && saved.input) {
      const inp = saved.input as any;
      if (inp.year) setYear(inp.year);
      if (inp.month) setMonth(inp.month);
      if (inp.day) setDay(inp.day);
      if (inp.hour) setHour(inp.hour);
      if (inp.gender) setGender(inp.gender);
      if (inp.calType) setCalType(inp.calType);
      if (saved.showForm === false) {
        handleSubmit({ year: inp.year, month: inp.month, day: inp.day, hour: inp.hour, gender: inp.gender });
      }
    }
  }, []);

  // ---- 派生数据 ----
  const mingPalace = result?.palaces?.find((p) => p.name === "命宫");
  const mingPalaceEarthlyBranch = mingPalace?.earthlyBranch || "";
  const mingZhu = getMingZhu(mingPalaceEarthlyBranch);
  const shenZhu = getShenZhu(result?.earthlyBranch || "");
  const ziDou = useMemo(() => {
    if (!result) return "";
    const lm = parseLunarMonth(result.lunarDate);
    const hIdx = hourToZhiIdx(hour);
    return getZiDou(lm, hIdx);
  }, [result, hour]);

  // 八字四柱（用于中心面板）
  const baziPillars = useMemo(() => {
    if (!result) return null;
    try {
      const baziRes = solarToBazi({ year, month, day, hour, gender });
      return baziRes;
    } catch {
      return null;
    }
  }, [result, year, month, day, hour, gender]);

  // 找紫微/天府/命宫索引（在 ZHI_NAMES 中的位置）
  const palaceIndices = useMemo(() => {
    if (!result) return { ziweiIdx: 0, tianfuIdx: 0, mingIdx: 0 };
    let ziweiIdx = 0, tianfuIdx = 0, mingIdx = 0;
    for (let i = 0; i < result.palaces.length; i++) {
      const p = result.palaces[i];
      const zhiIdx = p.index !== undefined ? p.index : ZHI_NAMES.indexOf(p.earthlyBranch);
      if (p.majorStars.includes("紫微")) ziweiIdx = zhiIdx;
      if (p.majorStars.includes("天府")) tianfuIdx = zhiIdx;
      if (p.name === "命宫") mingIdx = zhiIdx;
    }
    return { ziweiIdx, tianfuIdx, mingIdx };
  }, [result]);

  // 大限数据（从命宫开始，阳男阴女顺行，阴男阳女逆行，对标jishiyu）
  const decadalData = useMemo(() => {
    if (!result) return [];
    // 找命宫索引（按地支顺序0-11:寅卯辰巳午未申酉戌亥子丑）
    let mingIdx = -1;
    for (let i = 0; i < result.palaces.length; i++) {
      if (result.palaces[i].name === "命宫") { mingIdx = i; break; }
    }
    if (mingIdx < 0) return [];

    // 判断顺逆：阳男阴女顺行，阴男阳女逆行
    const yearGan = result.heavenlyStem;
    const isYangGan = ["甲", "丙", "戊", "庚", "壬"].includes(yearGan);
    const isShun = (gender === "male" && isYangGan) || (gender === "female" && !isYangGan);

    const list: Array<{
      name: string;
      decadalGan: string;
      decadalZhi: string;
      ageRange: [number, number];
      ganzhi: string;
    }> = [];

    for (let i = 0; i < 12; i++) {
      const idx = isShun ? (mingIdx + i) % 12 : (mingIdx - i + 12 * 3) % 12;
      const p = result.palaces.find(pp => pp.index === idx || ZHI_NAMES.indexOf(pp.earthlyBranch) === idx);
      if (!p) continue;
      const dGan = p.decadal?.[0] || "";
      const dZhi = p.decadal?.[1] || "";
      list.push({
        name: p.name,
        decadalGan: dGan,
        decadalZhi: dZhi,
        ageRange: p.ageRange || [0, 0],
        ganzhi: p.decadal || "",
      });
    }
    return list;
  }, [result, gender]);

  // 流年数据（当前选中大限对应的10年，对标jishiyu，显示年份+干支）
  const liunianYears = useMemo(() => {
    if (!decadalData.length || !result) return [];
    const curDaxian = decadalData[selectedDaxian];
    if (!curDaxian) return [];
    const startAge = curDaxian.ageRange[0];
    const startYear = year + startAge - 1;
    const years = [];
    for (let i = 0; i < 10; i++) {
      const y = startYear + i;
      const gz = getYearGanZhi(y);
      years.push({
        year: y,
        age: startAge + i,
        gan: gz.gan,
        zhi: gz.zhi,
      });
    }
    return years;
  }, [decadalData, selectedDaxian, year, result]);

  // 流月数据（当前选中年份的12个月干支，对标jishiyu）
  const liuyueMonths = useMemo(() => {
    if (!liunianYears.length) return [];
    const curYear = liunianYears[selectedLiunian]?.year || year;
    const yearGan = getYearGanZhi(curYear).gan;
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const gz = getMonthGanZhi(yearGan, m);
      months.push({ label: `${m}月`, gan: gz.gan, zhi: gz.zhi });
    }
    return months;
  }, [liunianYears, selectedLiunian, year]);

  // 流月数据（正月~十二月）
  const months = useMemo(() => {
    return ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"];
  }, []);

  // 流日数据
  const days1 = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => `初${i + 1}`.replace("初10", "初十").replace("初11", "十一").replace("初12", "十二").replace("初13", "十三").replace("初14", "十四").replace("初15", "十五"));
  }, []);
  const days2 = useMemo(() => {
    return ["十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];
  }, []);

  // 流时数据（子時~亥時）
  const shichen = useMemo(() => {
    return ["子時", "丑時", "寅時", "卯時", "辰時", "巳時", "午時", "未時", "申時", "酉時", "戌時", "亥時"];
  }, []);

  // 当前年份
  const [currentYear, setCurrentYear] = useState(2026);
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // 监听 layout 的编辑按钮事件
  useEffect(() => {
    const handler = () => setShowForm(true);
    window.addEventListener("yixue-edit", handler);
    return () => window.removeEventListener("yixue-edit", handler);
  }, []);

  // 当大限变化时重置流年
  useEffect(() => {
    setSelectedLiunian(0);
  }, [selectedDaxian]);

  // 默认无连线，点击宫位才显示三方四正
  useEffect(() => {
    setFocusedPalace(null);
  }, [result]);

  // 计算宫位中心在SVG中的百分比坐标
  const getPalaceCenter = (zhiIdx: number): [number, number] => {
    const grid = ZHI_TO_GRID[zhiIdx];
    if (!grid) return [50, 50];
    const [col, row] = grid;
    return [(col + 0.5) * 25, (row + 0.5) * 25];
  };

  // 获取宫位背景色（三方四正高亮，统一浅紫色）
  const getPalaceBg = (palaceZhiIdx: number): string => {
    if (focusedPalace === null) return "#fff";
    if (palaceZhiIdx === focusedPalace) return "#f4eefa"; // 本宫
    const dui = (focusedPalace + 6) % 12;
    if (palaceZhiIdx === dui) return "#f4eefa"; // 对宫
    const sf1 = (focusedPalace + 4) % 12;
    const sf2 = (focusedPalace + 8) % 12;
    if (palaceZhiIdx === sf1 || palaceZhiIdx === sf2) return "#f4eefa"; // 三方
    return "#fff";
  };

  return (
    <div className="bg-[#ededed] min-h-screen flex justify-center">
      <div className="w-full" style={{ maxWidth: "375px", paddingBottom: "10px" }}>
      {/* 输入表单 DatePicker 弹窗 */}
      <DatePicker
        show={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={(dateVal, opts) => {
          setYear(dateVal.year); setMonth(dateVal.month); setDay(dateVal.day); setHour(dateVal.hour);
          setGender(opts.gender as Gender);
          setCalType(opts.calType === "solar" ? "gongli" : opts.calType === "lunar" ? "nongli" : "sizhu");
          setZaoWanZi(opts.zaoWanZi); setZhenTaiyang(opts.zhenTaiyang); setXiaLing(opts.xiaLing);
          handleSubmit({year: dateVal.year, month: dateVal.month, day: dateVal.day, hour: dateVal.hour, gender: opts.gender as Gender});
        }}
        initialDate={{year, month, day, hour, minute: 0}}
        initialOptions={{
          gender,
          calType: calType === "gongli" ? "solar" : calType === "nongli" ? "lunar" : "sizhu",
          zaoWanZi, zhenTaiyang, xiaLing,
        }}
        showName={true} name={name} onNameChange={setName}
        showSaveName={true} saveName={saveName} onSaveNameChange={setSaveName}
        showGender={true} showCalType={true} showToggles={true} showRegion={true}
        showMinute={true}
        submitText="排盘" title="紫微斗数排盘"
      />

      {/* 错误提示 */}
      {error && (
        <div className="px-4 py-2 text-center text-[13px] text-red-600">
          {error}
        </div>
      )}

      {/* ================================================================ */}
      {/* 排盘结果 */}
      {/* ================================================================ */}
      {!showForm && !result && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <button onClick={() => { clearPaipanState("ziwei"); setShowForm(true); }} className="rounded-full bg-[#7B2FBE] text-white font-bold text-lg px-8 py-3 shadow-lg">开始排盘</button>
        </div>
      )}
      {result && (
        <div className="px-2">
          {/* ---- 4x4 宫格盘（带方位标签和SVG连线） ---- */}
          <div className="bg-white rounded-lg overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)] mb-2 mt-2">
            {/* 方位标签 - 上方（对应巳午未申） */}
            <div className="flex text-[9px] text-gray-500" style={{ height: "14px", lineHeight: "14px" }}>
              <div style={{ width: "25%", textAlign: "center" }}>南偏东</div>
              <div style={{ width: "25%", textAlign: "center", fontWeight: "bold", color: "#333" }}>正南方</div>
              <div style={{ width: "25%", textAlign: "center" }}>南偏西</div>
              <div style={{ width: "25%", textAlign: "center" }}>西偏南</div>
            </div>

            <div style={{ display: "flex" }}>
              {/* 方位标签 - 左侧 */}
              <div style={{ width: "14px", display: "flex", flexDirection: "column", fontSize: "9px", color: "#555", writingMode: "vertical-rl", textOrientation: "mixed", justifyContent: "center", alignItems: "center", letterSpacing: "2px" }}>
                <span style={{ marginBottom: "8px" }}>东偏南</span>
                <span style={{ fontWeight: "bold", color: "#333" }}>正东方</span>
                <span style={{ marginTop: "8px" }}>东偏北</span>
              </div>

              {/* 4x4 网格区域（含SVG叠加） */}
              <div style={{ flex: 1, position: "relative" }}>
                {/* SVG 叠加层 */}
                <svg
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 2 }}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {/* 三方四正虚线三角辅助标识（三合模式默认显示命宫三方四正，点击宫位切换） */}
                  {viewMode === "sanhe" && (() => {
                    const target = focusedPalace !== null ? focusedPalace : ZHI_NAMES.indexOf(result.earthlyBranchOfSoulPalace || "寅");
                    const ben = ANCHOR_POINTS[target];
                    const duiIdx = (target + 6) % 12;
                    const sf1Idx = (target + 4) % 12;
                    const sf2Idx = (target + 8) % 12;
                    const dui = ANCHOR_POINTS[duiIdx];
                    const sf1 = ANCHOR_POINTS[sf1Idx];
                    const sf2 = ANCHOR_POINTS[sf2Idx];
                    if (!ben || !dui || !sf1 || !sf2) return null;
                    const d = `M${dui[0]},${dui[1]} L${ben[0]},${ben[1]} L${sf1[0]},${sf1[1]} L${sf2[0]},${sf2[1]} L${ben[0]},${ben[1]} Z`;
                    return (
                      <path
                        d={d}
                        fill="transparent"
                        stroke="#c8c8c8"
                        strokeWidth="0.3"
                        strokeDasharray="1.2,1.2"
                      />
                    );
                  })()}
                </svg>

                {/* 4x4 CSS Grid - 正方形，对标jishiyu */}
                <div className="grid grid-cols-4 grid-rows-4" style={{ aspectRatio: "1", position: "relative", zIndex: 1 }}>
                  {/* 12宫位卡片 */}
                  {GRID_4X4.flat().map((idx, pos) => {
                    // 中心 4 格合并为命宫详情
                    if (idx === null) {
                      if (pos !== 5) return null;
                      return (
                        <div
                          key="center"
                          onClick={() => setFocusedPalace(null)}
                          style={{ gridRow: "2/4", gridColumn: "2/4", border: "1px solid #ccc", display: "flex", flexDirection: "column", padding: "3px 4px", overflow: "hidden", backgroundColor: "#fafafa", position: "relative", cursor: "pointer", zIndex: 3 }}
                        >
                          {/* Row 0: 标题 */}
                          <div className="text-center font-bold" style={{ color: BRAND_PURPLE, fontSize: "13px", lineHeight: 1.2, marginBottom: "1px", position: "relative" }}>
                            言道•紫微斗数
                            <span style={{ position: "absolute", right: 0, top: 0, fontSize: "7px", color: "#999", fontWeight: "normal" }}>v1.0</span>
                          </div>

                          {/* Row 1: 阴阳性别 + 五行局 */}
                          {(() => {
                            const isYangGan = ["甲","丙","戊","庚","壬"].includes(result.heavenlyStem);
                            const yyLabel = gender === "male" ? (isYangGan ? "阳男" : "阴男") : (isYangGan ? "阳女" : "阴女");
                            return (
                              <div className="text-center" style={{ fontSize: "10px", color: "#333", marginBottom: "1px" }}>
                                {yyLabel} <span className="font-bold" style={{ color: BRAND_PURPLE_DARK }}>{result.fiveElementsClass || "-"}</span>
                              </div>
                            );
                          })()}

                          {/* Row 2: 公历 + 时辰范围 */}
                          <div style={{ fontSize: "8px", color: "#666", lineHeight: 1.3, display: "flex", justifyContent: "space-between", padding: "0 2px" }}>
                            <span>公历：{result.solarDate || "-"}</span>
                            <span>{result.timeRange || ""}</span>
                          </div>

                          {/* Row 3: 农历 + 时辰名 */}
                          <div style={{ fontSize: "8px", color: "#666", lineHeight: 1.3, display: "flex", justifyContent: "space-between", padding: "0 2px" }}>
                            <span>农历：{result.lunarDate || "-"}</span>
                            <span>{result.time || ""}</span>
                          </div>

                          {/* Row 4: 属相 + 星座 */}
                          <div style={{ fontSize: "8px", color: "#666", lineHeight: 1.3, display: "flex", justifyContent: "space-between", padding: "0 2px", marginTop: "1px" }}>
                            <span>属相：{result.zodiac || "-"}</span>
                            <span>星座：{result.sign || "-"}</span>
                          </div>

                          {/* Row 5: 身宫 + 命宫（地支） */}
                          <div style={{ fontSize: "8px", color: "#666", lineHeight: 1.3, display: "flex", justifyContent: "space-between", padding: "0 2px" }}>
                            <span>身宫：<span style={{ color: "#000", fontWeight: "bold" }}>{result.earthlyBranchOfBodyPalace || "-"}</span></span>
                            <span>命宫：<span style={{ color: "#000", fontWeight: "bold" }}>{result.earthlyBranchOfSoulPalace || "-"}</span></span>
                          </div>

                          {/* Row 6: 命主 + 身主 */}
                          <div style={{ fontSize: "8px", color: "#666", lineHeight: 1.3, display: "flex", justifyContent: "space-between", padding: "0 2px" }}>
                            <span>命主：<span style={{ color: "#000", fontWeight: "bold" }}>{result.soulStar || mingZhu}</span></span>
                            <span>身主：<span style={{ color: "#000", fontWeight: "bold" }}>{result.bodyStar || shenZhu}</span></span>
                          </div>

                          {/* Row 7a: 四柱（天干地支竖排，五行颜色）- 数据来自 iztro chineseDate */}
                          {(() => {
                            const parts = result.chineseDate ? result.chineseDate.split(/\s+/) : [];
                            const labels = ["年", "月", "日", "时"];
                            return (
                              <div className="flex gap-0.5" style={{ marginBottom: "1px", marginTop: "1px" }}>
                                {labels.map((label, pi) => {
                                  const gz = parts[pi] || "--";
                                  const gan = gz.charAt(0);
                                  const zhi = gz.charAt(1);
                                  const ganColor = GAN_WUXING[gan] ? WUXING_COLORS[GAN_WUXING[gan]] : BRAND_PURPLE_DARK;
                                  const zhiColor = ZHI_WUXING[zhi] ? WUXING_COLORS[ZHI_WUXING[zhi]] : BRAND_PURPLE_DARK;
                                  return (
                                    <div key={pi} className="flex-1 text-center rounded" style={{ backgroundColor: BRAND_PURPLE_BG, padding: "1px 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                      <div style={{ fontSize: "7px", color: "#999", lineHeight: 1.1 }}>{label}</div>
                                      <div style={{ fontSize: "10px", fontWeight: "bold", lineHeight: 1.2, color: ganColor }}>{gan}</div>
                                      <div style={{ fontSize: "10px", fontWeight: "bold", lineHeight: 1.2, color: zhiColor }}>{zhi}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {/* Row 7b: 起运信息 */}
                          {baziPillars?.dayun && (
                            <div style={{ fontSize: "7px", color: "#888", lineHeight: 1.2, textAlign: "center", marginBottom: "1px" }}>
                              {baziPillars.dayun.qiyunText || ""}
                            </div>
                          )}

                          {/* Row 7c: 大运列表（八字大运，干支五行色，对标jishiyu） */}
                          {baziPillars?.dayun?.dayunList && baziPillars.dayun.dayunList.length > 0 && (
                            <div style={{ display: "flex", gap: "1px", marginBottom: "1px" }}>
                              {baziPillars.dayun.dayunList.slice(0, 8).map((d, i) => (
                                <div key={i} style={{ flex: 1, textAlign: "center", fontSize: "6px", lineHeight: 1.1, color: "#666" }}>
                                  <span style={{ color: "#333", fontWeight: "bold", fontSize: "7px" }}>{Math.round(d.startAge)}岁</span>
                                  <br />
                                  <span style={{ color: getGanZhiColor(d.gan), fontWeight: "bold" }}>{d.gan}</span><span style={{ color: getGanZhiColor(d.zhi), fontWeight: "bold" }}>{d.zhi}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 紫色按钮组 */}
                          <div className="flex gap-1" style={{ marginTop: "1px", justifyContent: "center" }}>
                            <button className="px-1.5 py-0.5 text-white font-bold rounded cursor-pointer border-0" style={{ background: BRAND_PURPLE, fontSize: "9px" }}>學紫微</button>
                            <button className="px-1.5 py-0.5 text-white font-bold rounded cursor-pointer border-0" style={{ background: BRAND_PURPLE_LIGHT, fontSize: "9px" }}>時↑</button>
                            <button className="px-1.5 py-0.5 text-white font-bold rounded cursor-pointer border-0" style={{ background: BRAND_PURPLE_LIGHT, fontSize: "9px" }}>時↓</button>
                            <button className="px-1.5 py-0.5 text-white font-bold rounded cursor-pointer border-0" style={{ background: BRAND_PURPLE, fontSize: "9px" }}>解命盤</button>
                          </div>

                          {/* 自化图示 */}
                          <div className="text-center" style={{ fontSize: "8px", color: "#888", marginTop: "1px", lineHeight: 1.2 }}>
                            自化圖示: <span style={{ color: "#009029" }}>→祿</span><span style={{ color: "#9900a9" }}>→權</span><span style={{ color: "#0462d7" }}>→科</span><span style={{ color: "#f20010" }}>→忌</span>
                          </div>
                        </div>
                      );
                    }

                    const palace = result.palaces?.[idx];
                    if (!palace) {
                      return (
                        <div
                          key={`empty-${idx}`}
                          style={{ border: "1px solid #ccc", position: "relative" }}
                        />
                      );
                    }

                    const isShen = palace.isBodyPalace || palace.name === result.bodyPalace;
                    const majorStars = palace.majorStars || [];
                    const palaceZhiIdx = palace.index !== undefined ? palace.index : ZHI_NAMES.indexOf(palace.earthlyBranch);

                    // === 辅星/煞星/杂曜数据来自 iztro 核心引擎（v2.0），不再使用 getAuxStars buggy计算 ===
                    // palace.auspiciousStars = 六吉 + 禄存 + 天马（iztro 按生年天干/地支/农历月精确安星）
                    // palace.shaStars = 六煞（擎羊陀罗火星铃星地空地劫）
                    // palace.otherStars = 其他杂曜（红鸾天喜天刑天姚等）
                    // palace.changsheng = 长生十二神（单名）
                    // palace.boshi = 博士十二神（单名）
                    const allAuspicious = palace.auspiciousStars || [];
                    const allSha = palace.shaStars || [];
                    const allOther = palace.otherStars || [];

                    // 根据模式决定显示哪些星曜
                    let auspiciousStars: string[] = [];
                    let shaStars: string[] = [];
                    let otherMinorStars: string[] = [];
                    let changshengStars: string[] = [];
                    let boshiStars: string[] = [];

                    if (viewMode === "sihua") {
                      // 四化模式：14主星 + 六吉 + 六煞 + 禄存天马
                      auspiciousStars = [...allAuspicious];
                      shaStars = [...allSha];
                      otherMinorStars = [];
                      changshengStars = [];
                      boshiStars = [];
                    } else if (viewMode === "sanhe") {
                      // 三合模式：全量星曜——14主星+六吉+六煞+禄存天马+杂曜+长生十二神+博士十二神
                      auspiciousStars = [...allAuspicious];
                      shaStars = [...allSha];
                      otherMinorStars = [...allOther];
                      changshengStars = palace.changsheng ? [palace.changsheng] : [];
                      boshiStars = palace.boshi ? [palace.boshi] : [];
                    } else if (viewMode === "feixing") {
                      // 飞星模式：极简——14主星 + 禄存
                      auspiciousStars = allAuspicious.filter(s => s === "禄存");
                      shaStars = [];
                      otherMinorStars = [];
                      changshengStars = [];
                      boshiStars = [];
                    }

                    // 宫位背景色（仅三合模式显示三方四正高亮）
                    const palaceBg = viewMode === "sanhe" ? getPalaceBg(palaceZhiIdx) : "#fff";

                    return (
                      <div
                        key={idx}
                        onClick={() => { if (viewMode === "sanhe") setFocusedPalace(palaceZhiIdx); const palaceInterp = getPalaceInterpretation(palace.name); const starInterps = getPalaceAllStarInterpretations(palace.majorStars || [], palace.name, result.sihua); const allInterps = []; if (palaceInterp) { allInterps.push({ type: "palace" as const, title: palaceInterp.title, content: palaceInterp.summary + "\n" + palaceInterp.details.join("\n"), source: palaceInterp.source }); } allInterps.push(...starInterps); setInterpretPanel({ palaceName: palace.name, palaceGanZhi: (palace.heavenlyStem || "") + (palace.earthlyBranch || ""), interpretations: allInterps }); }}
                        style={{
                          border: "1px solid #ccc",
                          padding: "2px 3px",
                          display: "flex",
                          flexDirection: "column",
                          overflow: "hidden",
                          position: "relative",
                          backgroundColor: palaceBg,
                          cursor: "pointer",
                        }}
                      >
                        {/* 宫位名 + 干支 行 */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1px" }}>
                          <span style={{ fontSize: "12px", fontWeight: "bold", color: "#fa0000" }}>
                            {palace.name}
                          </span>
                          <span style={{ fontSize: "12px", color: "#585858", fontWeight: "bold" }}>
                            {palace.heavenlyStem}{palace.earthlyBranch}
                          </span>
                        </div>

                        {/* 星曜区域 - 水平排列 */}
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                          {/* 主星行（14px 深红 粗体） */}
                          {majorStars.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", lineHeight: "1.2", alignItems: "center", gap: "1px 2px" }}>
                              {majorStars.map((starName, j) => {
                                const sihuaType = getSihuaType(result.sihua, starName);
                                return (
                                  <span key={`maj-${j}`} style={{ display: "inline-flex", alignItems: "center", gap: "1px" }}>
                                    <span style={{ fontSize: getStarFontSize(starName), fontWeight: "bold", color: MAJOR_STAR_COLOR, lineHeight: "1.2" }}>{starName}</span>
                                    {sihuaType && (
                                      <span style={SIHUA_BADGE_STYLE[sihuaType]}>{SIHUA_BADGE_CHAR[sihuaType]}</span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* 六吉星 + 禄存天马（紫色 10px） */}
                          {auspiciousStars.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", lineHeight: "1.2", gap: "1px 2px", marginTop: "1px" }}>
                              {auspiciousStars.map((sn, j) => {
                                const sihuaType = getSihuaType(result.sihua, sn);
                                return (
                                  <span key={`aus-${j}`} style={{ display: "inline-flex", alignItems: "center", gap: "1px" }}>
                                    <span style={{ fontSize: "10px", color: AUSPICIOUS_COLOR, lineHeight: "1.2" }}>{sn}</span>
                                    {sihuaType && (
                                      <span style={SIHUA_BADGE_STYLE[sihuaType]}>{SIHUA_BADGE_CHAR[sihuaType]}</span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* 六煞星（紫色 10px） */}
                          {shaStars.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", lineHeight: "1.2", gap: "1px 2px", marginTop: "1px" }}>
                              {shaStars.map((sn, j) => {
                                const sihuaType = getSihuaType(result.sihua, sn);
                                return (
                                  <span key={`sha-${j}`} style={{ display: "inline-flex", alignItems: "center", gap: "1px" }}>
                                    <span style={{ fontSize: "10px", color: INAUSPICIOUS_COLOR, lineHeight: "1.2" }}>{sn}</span>
                                    {sihuaType && (
                                      <span style={SIHUA_BADGE_STYLE[sihuaType]}>{SIHUA_BADGE_CHAR[sihuaType]}</span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* 其他杂曜（蓝色 9px） */}
                          {otherMinorStars.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", lineHeight: "1.2", gap: "1px 2px", marginTop: "1px" }}>
                              {otherMinorStars.map((sn, j) => {
                                const sihuaType = getSihuaType(result.sihua, sn);
                                return (
                                  <span key={`blk-${j}`} style={{ display: "inline-flex", alignItems: "center", gap: "1px" }}>
                                    <span style={{ fontSize: "9px", color: MINOR_STAR_COLOR, lineHeight: "1.2" }}>{sn}</span>
                                    {sihuaType && (
                                      <span style={SIHUA_BADGE_STYLE[sihuaType]}>{SIHUA_BADGE_CHAR[sihuaType]}</span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* 亮度标记行（9px 灰色） - 收集所有星曜的亮度 */}
                          {(() => {
                            const allStarsForBrightness = [
                              ...majorStars.map(s => ({ name: s, isMajor: true })),
                              ...auspiciousStars.map(s => ({ name: s, isMajor: false })),
                              ...shaStars.map(s => ({ name: s, isMajor: false })),
                            ];
                            const brightnessChars = allStarsForBrightness.map(s => {
                              const br = getStarBrightness(result, s.name, palace.name);
                              return { char: br, color: "#888" };
                            });
                            if (brightnessChars.length === 0) return null;
                            return (
                              <div style={{ display: "flex", flexWrap: "wrap", lineHeight: "1", gap: "2px", marginTop: "1px" }}>
                                {brightnessChars.map((b, k) => (
                                  <span key={k} style={{ fontSize: "9px", color: b.color, lineHeight: "1" }}>{b.char}</span>
                                ))}
                              </div>
                            );
                          })()}

                          {/* 长生十二神（青色 9px） - 仅三合模式显示 */}
                          {changshengStars.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", lineHeight: "1.2", gap: "1px 2px", marginTop: "1px" }}>
                              {changshengStars.map((sn, j) => (
                                <span key={`cs-${j}`} style={{ fontSize: "9px", color: "#2fae8e", lineHeight: "1.2" }}>{sn}</span>
                              ))}
                            </div>
                          )}

                          {/* 博士十二神（深灰色 9px） - 仅三合模式显示 */}
                          {boshiStars.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", lineHeight: "1.2", gap: "1px 2px", marginTop: "1px" }}>
                              {boshiStars.map((sn, j) => (
                                <span key={`bs-${j}`} style={{ fontSize: "9px", color: "#666", lineHeight: "1.2" }}>{sn}</span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 宫度年龄区间（文墨天机风格：主星→辅星→四化→宫度→大限） */}
                        {palace.ageRange && palace.ageRange[0] > 0 && (
                          <div style={{ fontSize: "9px", color: "#888", textAlign: "center", marginBottom: "1px", lineHeight: 1.2 }}>
                            {palace.ageRange[0]}-{palace.ageRange[1]}
                          </div>
                        )}

                        {/* 底部信息行：小限年龄 + 大限年龄范围 + 大限干支/身宫（对标吉时雨） */}
                        <div style={{ marginTop: "auto", paddingTop: "1px" }}>
                          {/* 小限年龄列表（对标吉时雨：6px，居中，前7个年龄） */}
                          {palace.ages && palace.ages.length > 0 && (
                            <div style={{ fontSize: "6px", color: "#999", lineHeight: 1.1, textAlign: "center", marginBottom: "0px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                              {palace.ages.slice(0, 7).join(",")}
                            </div>
                          )}
                          {/* 大限年龄范围 + 大限干支/身宫 */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                            <span style={{ fontSize: "9px", color: "#585858", lineHeight: "1.2" }}>
                              {palace.ageRange && palace.ageRange[0] !== undefined ? `${palace.ageRange[0]}-${palace.ageRange[1]}` : ""}
                            </span>
                            <span style={{ fontSize: "9px", color: "#585858", lineHeight: "1.2" }}>
                              {palace.decadal || ""}{isShen ? <span style={{ color: "#fa0000", fontWeight: "bold", marginLeft: "2px" }}>身</span> : null}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 方位标签 - 右侧 */}
              <div style={{ width: "14px", display: "flex", flexDirection: "column", fontSize: "9px", color: "#555", writingMode: "vertical-rl", textOrientation: "mixed", justifyContent: "center", alignItems: "center", letterSpacing: "2px", transform: "rotate(180deg)" }}>
                <span style={{ marginBottom: "8px" }}>西偏南</span>
                <span style={{ fontWeight: "bold", color: "#333", transform: "rotate(180deg)" }}>正西方</span>
                <span style={{ marginTop: "8px" }}>西偏北</span>
              </div>
            </div>

            {/* 方位标签 - 下方（对应寅丑子亥） */}
            <div className="flex text-[9px] text-gray-500" style={{ height: "14px", lineHeight: "14px" }}>
              <div style={{ width: "14px" }}></div>
              <div style={{ flex: 1, display: "flex" }}>
                <div style={{ width: "25%", textAlign: "center" }}>东偏北</div>
                <div style={{ width: "25%", textAlign: "center" }}>北偏东</div>
                <div style={{ width: "25%", textAlign: "center", fontWeight: "bold", color: "#333" }}>正北方</div>
                <div style={{ width: "25%", textAlign: "center" }}>北偏西</div>
              </div>
              <div style={{ width: "14px" }}></div>
            </div>
          </div>


          {/* ---- 宫位解读面板（引经据典） ---- */}
          {interpretPanel && (
            <div className="bg-white rounded-lg overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)] mb-2" style={{ border: "1px solid #7B2FBE" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "linear-gradient(135deg, #7B2FBE, #9B5ECF)", color: "white" }}>
                <div>
                  <span style={{ fontSize: "16px", fontWeight: "bold" }}>{interpretPanel.palaceName}</span>
                  <span style={{ fontSize: "12px", marginLeft: "8px", opacity: 0.9 }}>{interpretPanel.palaceGanZhi}</span>
                </div>
                <button onClick={() => setInterpretPanel(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: "28px", height: "28px", borderRadius: "50%", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
              </div>
              <div style={{ padding: "10px 12px" }}>
                {interpretPanel.interpretations.map((item, idx) => (
                  <div key={idx} style={{ marginBottom: idx < interpretPanel.interpretations.length - 1 ? "10px" : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "10px", fontWeight: "bold", padding: "1px 6px", borderRadius: "3px", background: item.type === "star" ? "#fef3c7" : item.type === "sihua" ? "#e0e7ff" : "#f3e8ff", color: item.type === "star" ? "#92400e" : item.type === "sihua" ? "#3730a3" : "#6b21a8", marginRight: "8px" }}>{item.type === "star" ? "星曜" : item.type === "sihua" ? "四化" : "宫位"}</span>
                      <span style={{ fontSize: "13px", fontWeight: "bold", color: "#333" }}>{item.title}</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#555", lineHeight: "1.6", whiteSpace: "pre-line" }}>{item.content}</div>
                    <div style={{ fontSize: "10px", color: "#999", marginTop: "4px", fontStyle: "italic" }}>—— {item.source}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "6px 12px", background: "#fafafa", borderTop: "1px solid #eee", fontSize: "10px", color: "#999", textAlign: "center" }}>点击其他宫位可查看不同解读 · 引经据典，仅供参考</div>
            </div>
          )}

          {/* ---- 底部时间表格（对标jishiyu：大限12宫、流年10年、流月12月，干支五行色） ---- */}
          {decadalData.length > 0 && (
            <div className="bg-white mb-2 border border-gray-300 overflow-hidden">
              <div style={{ display: "flex", borderBottom: "1px solid #ccc", background: "#fafafa" }}>
                {/* 大限标签 */}
                <div style={{ width: "22px", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #ccc", fontSize: "10px", color: "#333", fontWeight: "bold", writingMode: "vertical-rl", textOrientation: "upright", letterSpacing: "2px", padding: "4px 1px", lineHeight: "1" }}>大限</div>
                {/* 大限12格 */}
                <div style={{ flex: 1, display: "flex", overflowX: "auto" }}>
                  {decadalData.map((d, i) => {
                    const isActive = i === selectedDaxian;
                    return (
                      <div
                        key={`dy-${i}`}
                        onClick={() => setSelectedDaxian(i)}
                        style={{
                          flex: "0 0 auto",
                          width: `${100/12}%`,
                          minWidth: "28px",
                          borderLeft: i > 0 ? "1px solid #ccc" : "none",
                          padding: "3px 1px",
                          textAlign: "center",
                          cursor: "pointer",
                          background: isActive ? "#eee" : "#fff",
                          fontWeight: isActive ? "bold" : "normal",
                          lineHeight: "1.3",
                        }}
                      >
                        <div style={{ fontSize: "9px", color: "#666" }}>{d.ageRange[0]}-{d.ageRange[1]}</div>
                        <div style={{ fontSize: "12px", fontWeight: "bold" }}>
                          <span style={{ color: getGanZhiColor(d.decadalGan) }}>{d.decadalGan}</span>
                          <span style={{ color: getGanZhiColor(d.decadalZhi) }}>{d.decadalZhi}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 流年行 */}
              <div style={{ display: "flex", borderBottom: "1px solid #ccc", background: "#fafafa" }}>
                <div style={{ width: "22px", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #ccc", fontSize: "10px", color: "#333", fontWeight: "bold", writingMode: "vertical-rl", textOrientation: "upright", letterSpacing: "2px", padding: "4px 1px", lineHeight: "1" }}>流年</div>
                <div style={{ flex: 1, display: "flex", overflowX: "auto" }}>
                  {liunianYears.map((y, i) => {
                    const isCurrent = y.year === currentYear;
                    const isActive = i === selectedLiunian;
                    return (
                      <div
                        key={`ln-${i}`}
                        onClick={() => setSelectedLiunian(i)}
                        style={{
                          flex: "0 0 auto",
                          width: "10%",
                          minWidth: "30px",
                          borderLeft: i > 0 ? "1px solid #ccc" : "none",
                          padding: "3px 1px",
                          textAlign: "center",
                          cursor: "pointer",
                          background: isCurrent ? BRAND_PURPLE : (isActive ? "#eee" : "#fff"),
                          fontWeight: isCurrent || isActive ? "bold" : "normal",
                          lineHeight: "1.3",
                        }}
                      >
                        <div style={{ fontSize: "9px", color: isCurrent ? "#fff" : "#666" }}>{y.year % 100}</div>
                        <div style={{ fontSize: "12px", fontWeight: "bold" }}>
                          <span style={{ color: isCurrent ? "#fff" : getGanZhiColor(y.gan) }}>{y.gan}</span>
                          <span style={{ color: isCurrent ? "#fff" : getGanZhiColor(y.zhi) }}>{y.zhi}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 流月行 */}
              <div style={{ display: "flex", borderBottom: "1px solid #ccc", background: "#fafafa" }}>
                <div style={{ width: "22px", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #ccc", fontSize: "10px", color: "#333", fontWeight: "bold", writingMode: "vertical-rl", textOrientation: "upright", letterSpacing: "2px", padding: "4px 1px", lineHeight: "1" }}>流月</div>
                <div style={{ flex: 1, display: "flex" }}>
                  {liuyueMonths.map((m, i) => (
                    <div
                      key={`ly-${i}`}
                      style={{
                        flex: 1,
                        borderLeft: i > 0 ? "1px solid #ccc" : "none",
                        padding: "3px 1px",
                        textAlign: "center",
                        lineHeight: "1.3",
                      }}
                    >
                      <div style={{ fontSize: "9px", color: "#666" }}>{i + 1}</div>
                      <div style={{ fontSize: "11px" }}>
                        <span style={{ color: getGanZhiColor(m.gan) }}>{m.gan}</span>
                        <span style={{ color: getGanZhiColor(m.zhi) }}>{m.zhi}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ---- 四化/三合/飞星 切换栏 ---- */}
          <div className="bg-white rounded-lg p-2 mb-2 flex gap-2">
            {[
              { key: "sihua", label: "四化" },
              { key: "sanhe", label: "三合" },
              { key: "feixing", label: "飞星" },
            ].map(m => (
              <button
                key={m.key}
                onClick={() => { setViewMode(m.key as any); setFocusedPalace(null); }}
                className="flex-1 py-2 rounded text-sm font-bold cursor-pointer border-0"
                style={{
                  backgroundColor: viewMode === m.key ? BRAND_PURPLE : BRAND_PURPLE_BG,
                  color: viewMode === m.key ? "white" : BRAND_PURPLE,
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* ---- 免责声明 ---- */}
          <div className="rounded-lg px-3 py-2.5 text-xs mb-2" style={{ backgroundColor: BRAND_PURPLE_BG, color: BRAND_PURPLE_LIGHT }}>
            以上内容由AI生成，仅供娱乐参考，请勿完全相信。命运掌握在自己手中，积极面对生活每一天。
          </div>

          {/* ---- 底部品牌 ---- */}
          <div className="py-4 text-center text-xs text-gray-300">
            言道 · 传统文化学习平台
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
