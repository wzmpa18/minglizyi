"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { calculateZiwei, solarToBazi, calcTrueSolarTime } from "@/algorithm-core";
import {
  getZwDecadalList,
  getZwYearlyList,
  getZwMonthlyList,
  getZwDailyList,
  getZwHourlyList,
  zwOverlayNames,
  zwOverlayAt,
  zwPalaceAbbr,
  zwSeriesStars,
} from "@/algorithm-core";
import type { ZwTimeInput, ZwSeriesStar } from "@/algorithm-core";
import { useRouter } from "next/navigation";
import { leaveToolPage, isManagedBackNavigation } from "@/lib/leaveToolPage";
import type { ZiweiResult, Gender } from "@/algorithm-core";
import { DatePicker } from "@/components/shared";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";
import { getPalaceInterpretation, getPalaceAllStarInterpretations } from "@/lib/ziwei-interpretations";
import { KB_TIANJI_SOURCE, getKbTianjiPalaceNotes } from "@/lib/ziwei-kb-supplement";
import { callAI, checkAIQuota, incrementAIUsage, getPermissionStatus } from "@/lib/aiService";
import { buildDeepReportSystemPrompt } from "@/lib/deepReportPrompt";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import EventDivinationPanel from "@/components/EventDivinationPanel";
import { savePaipanState, loadPaipanState, clearPaipanState } from "@/lib/paipanPersistence";
import { useToolBack } from "@/lib/useToolBack";
import { ShareButton } from "@/components/ShareButton";
import { PostToSquareButton } from "@/components/PostToSquareButton";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

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

// v25.0.32（P7-紫微布局-02 E区）：动态星统一简称表——"层级前缀 + 星曜简称"两字形式（大马/流羊/月陀…）
const DYN_STAR_ABBR: Record<string, string> = {
  "禄存": "禄",
  "擎羊": "羊",
  "陀罗": "陀",
  "天马": "马",
  "天魁": "魁",
  "天钺": "钺",
  "红鸾": "鸾",
  "天喜": "禧",
  "天姚": "姚",
  "天刑": "刑",
};

// E区动态星层级色：大限蓝 / 流年绿 / 流月青（既有），流日深青 / 流时紫 / 童限琥珀 / 小限玫红（同一层级十二宫完全一致）
const DYN_LEVEL_COLORS: Record<string, string> = {
  dx: "#2563eb",
  ln: "#16a34a",
  yue: "#0d9488",
  ri: "#0369a1",
  shi: "#7e22ce",
  tong: "#b45309",
  xiao: "#be185d",
};

// E区动态星显示顺序（固定）：大限 → 流年 → 流月 → 流日 → 流时 → 童限/小限
const DYN_LEVEL_ORDER = ["dx", "ln", "yue", "ri", "shi", "tong", "xiao"] as const;
const DYN_LEVEL_PREFIX: Record<string, string> = { dx: "大", ln: "流", yue: "月", ri: "日", shi: "时", tong: "童", xiao: "小" };

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
// v19.2: 将前十二神（流年杂煞，从寅宫起将星顺行）
const JIANGQIAN = ["将星", "攀鞍", "岁驿", "息神", "华盖", "劫煞", "灾煞", "天煞", "指背", "咸池", "月煞", "亡神"];

// ====================================================================
// 工具函数
// ====================================================================

/** 根据命宫地支获取命主星（v2.0 修正：与 排盘引擎 一致） */
function getMingZhu(earthlyBranch: string): string {
  const map: Record<string, string> = {
    "子": "贪狼", "丑": "巨门", "寅": "禄存", "卯": "文曲",
    "辰": "廉贞", "巳": "武曲", "午": "破军", "未": "武曲",
    "申": "廉贞", "酉": "文曲", "戌": "禄存", "亥": "巨门",
  };
  return map[earthlyBranch] || "-";
}

/** 根据年支获取身主星（v2.0 修正：与 排盘引擎 一致，修正原多处映射错误）
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

/** 获取星曜字号 - v19.3: 放大基准字号确保清晰可读 */
function getStarFontSize(starName: string): string {
  if (MAJOR_STARS.includes(starName)) return "12px";
  if (AUSPICIOUS_AUX.includes(starName) || INAUSPICIOUS_AUX.includes(starName)) return "10px";
  return "8px";
}

/** v18.9: 计算来因宫地支索引
 * 来因宫 = 生年天干所落宫位，从寅宫起甲顺数到生年天干
 * 甲→寅(0), 乙→卯(1), 丙→辰(2), 丁→巳(3), 戊→午(4), 己→未(5), 庚→申(6), 辛→酉(7), 壬→戌(8), 癸→亥(9)
 */
function getLaiyinPalaceIdx(yearStem: string): number {
  const stemIdx = GAN_NAMES.indexOf(yearStem);
  if (stemIdx < 0 || stemIdx > 9) return -1;
  return stemIdx; // 0-9 对应 ZHI_NAMES[0-9] = 寅卯辰巳午未申酉戌亥
}

/** 获取干支五行颜色 */
function getGanZhiColor(char: string): string {
  const wx = GAN_WUXING[char] || ZHI_WUXING[char];
  return wx ? WUXING_COLORS[wx] : "#585858";
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
  const pageKey = "yixue_ziwei"; const { showResult, savedParams, saveParams, goToResult } = useToolBack({ pageKey, eventName: "yixue-back", globalFlag: "__yixueBackHandled" });

  // v20.1: 登录守卫
  const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();

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
  const [zhenTaiyang, setZhenTaiyang] = useState(true);
  const [xiaLing, setXiaLing] = useState(false);
  // S2-4: 真太阳时修正说明（勾选真太阳时后排盘显示）
  const [solarCorrection, setSolarCorrection] = useState<string | null>(null);
  const [longitude, setLongitude] = useState(116.4);
  const [saveName, setSaveName] = useState(false);
  const [showForm, setShowForm] = useState(true);
  // P1-REOPEN: 返回键关闭排盘弹窗且无结果时直接返回工具列表
  const router = useRouter();

  // ---- 视图模式 ----
  const [viewMode, setViewMode] = useState<"sihua" | "sanhe" | "feixing">("sanhe");

  // ---- 三方四正高亮宫位（地支索引 0-11，null 表示无高亮） ----
  const [focusedPalace, setFocusedPalace] = useState<number | null>(null);

  // ---- 大限/流年/流月选中状态 ----
  const [selectedDaxian, setSelectedDaxian] = useState<number>(0);
  const [selectedLiunian, setSelectedLiunian] = useState<number>(0);
  const [selectedLiuyue, setSelectedLiuyue] = useState<number>(-1);
  const [interpretPanel, setInterpretPanel] = useState<{palaceName: string; palaceGanZhi: string; interpretations: Array<{type: string; title: string; content: string; source: string}>} | null>(null);
  // P1-REOPEN: 宫位解读面板改规范BottomSheet（85vh内滚+弹窗时隐藏Tab栏，根治APP端底部遮挡）
  useBodyScrollLock(!!interpretPanel);
  usePopupBackHandler(() => setInterpretPanel(null), !!interpretPanel);
  // v18.6: 宫位大运名称展开状态（点击宫位展开/收起大运宫名）
  const [expandedPalaceIdx, setExpandedPalaceIdx] = useState<number | null>(null);
  // v19.2: 流日/流时选中状态
  const [selectedLiuri, setSelectedLiuri] = useState<number>(-1);
  const [selectedLiushi, setSelectedLiushi] = useState<number>(-1);
  // v25.0.41（20260819用户指令）：童限前置模式——点击大限行最前"童限"格进入，
  // 虚线三角箭头指本命（命宫），下方展开童限/小限对照行与童限期（起限前）流年流月流日流时
  const [tongxianActive, setTongxianActive] = useState(false);
  // v25.0.27: ZW-OVERLAY 叠宫逐层开关（P6-补03 交互规则修正：默认仅展示本命盘，
  // 大限/流年/流月/流日/流时必须用户主动点击对应单元格才逐层展开，禁止自动联动）
  const [showOverlay, setShowOverlay] = useState(false);
  const [dxLayer, setDxLayer] = useState(false);
  const [lnLayer, setLnLayer] = useState(false);
  // v18.9: AI解读状态
  const [aiInterpreting, setAiInterpreting] = useState(false);
  const [aiContent, setAiContent] = useState("");
  const [aiScope, setAiScope] = useState<"overall" | "palace" | "daxian" | "liunian" | "liuyue" | "liuri" | "liushi" | null>(null);

  // v25.0.29（P7-5）：命盘等比缩放适配（根治手机端右侧截断）；移除放大/叠宫切换条，恒为适配屏宽
  const CHART_DESIGN_W = 440;
  const chartOuterRef = useRef<HTMLDivElement>(null);
  const chartInnerRef = useRef<HTMLDivElement>(null);
  const [chartScale, setChartScale] = useState(1);
  const [chartInnerH, setChartInnerH] = useState(0);

  // ---- 结果状态 ----
  const [result, setResult] = useState<ZiweiResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const outer = chartOuterRef.current;
    const inner = chartInnerRef.current;
    if (!outer || !inner) return;
    const update = () => {
      const w = outer.clientWidth;
      setChartScale(Math.min(1, w / CHART_DESIGN_W));
      setChartInnerH(inner.scrollHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [result, viewMode]);
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
      try{saveRecord({clientId:selectedClient?selectedClient.id:"",type:"ziwei",data:{...res,inputParams:{year:y,month:m,day:d,hour:h,gender:g}},note:"",status:"pending"});}catch(e){console.error("保存记录失败:",e);}
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
    }
  }, []);

  // ---- 派生数据 ----
  const mingPalace = result?.palaces?.find((p) => p.name === "命宫");
  const mingPalaceEarthlyBranch = mingPalace?.earthlyBranch || "";
  const mingZhu = getMingZhu(mingPalaceEarthlyBranch);
  const shenZhu = getShenZhu(result?.earthlyBranch || "");

  // v19.6: 排盘数据摘要（用于事情断法面板的 chartContext）
  const chartContextSummary = useMemo(() => {
    if (!result) return "";
    const mingStars = (mingPalace?.majorStars || []).join(",");
    const sihua = result.sihua ?
      `化禄:${result.sihua.huaLu?.star||""} 化权:${result.sihua.huaQuan?.star||""} 化科:${result.sihua.huaKe?.star||""} 化忌:${result.sihua.huaJi?.star||""}` : "";
    return `生年干支：${result.heavenlyStem}${result.earthlyBranch}\n命宫：${result.earthlyBranchOfSoulPalace} 主星[${mingStars}]\n身宫：${result.earthlyBranchOfBodyPalace}\n命主：${result.soulStar || mingZhu}\n身主：${result.bodyStar || shenZhu}\n五行局：${result.fiveElementsClass}\n四化：${sihua}`;
  }, [result, mingPalace, mingZhu, shenZhu]);
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

  // v18.6→v25.0.25 修正：大运宫名映射改用 ZW-OVERLAY 引擎统一规则
  // （十二宫逆布：命→兄弟→夫妻→子女…沿宫序递减叠落；修正原按起运顺序映射的口径偏差，372 项对拍验证）
  const getDaxianPalaceName = (palaceZhiIdx: number): string => {
    const dx = zwDecadalAligned[selectedDaxian];
    if (!dx || dx.palaceIndex < 0) return "";
    return `大运${zwOverlayNames(dx.palaceIndex)[palaceZhiIdx] || ""}`;
  };

  // v25.0.24 ZW-TIME 时间轴引擎输入（P6-I-PLUS 规则6：全部时间层级统一走引擎）
  const zwInput = useMemo<ZwTimeInput | null>(() => {
    if (!result) return null;
    return { year, month, day, hour, gender };
  }, [result, year, month, day, hour, gender]);

 // v25.0.24 大限四化由引擎统一计算（排盘引擎 horoscope 大限干四化）
  const zwDecadal = useMemo(() => {
    if (!zwInput) return [];
    try { return getZwDecadalList(zwInput); } catch { return []; }
  }, [zwInput]);

  // v25.0.25 修正：引擎大限列表为宫序（寅→丑），页面 decadalData 为起运年龄序（命宫起阳男阴女顺/阴男阳女逆），
  // 两种顺序同索引取值会取错宫（6 案例对拍全部错位确认）。按大限干支唯一对齐后再取值。
  const zwDecadalAligned = useMemo(() => {
    if (!zwDecadal.length || !decadalData.length) return [];
    return decadalData.map(d => zwDecadal.find(n => n.gan === d.decadalGan && n.zhi === d.decadalZhi) || null);
  }, [zwDecadal, decadalData]);

  // v25.0.41（20260819用户指令）童限年列表：起限前虚岁1~起运岁-1；
  // 年干支与引擎yearGanZhi同式（(y-4)%10/%12），流年宫=年支所在宫（与引擎yearly一致），
  // 小限宫=ages含该虚岁之宫，童限宫恒为命宫
  const tongxianYears = useMemo(() => {
    if (!result || !decadalData.length) return [];
    const qiyunAge = decadalData[0]?.ageRange?.[0] || 0;
    if (qiyunAge <= 1) return [];
    const ZHI_STD = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    const list: Array<{
      year: number; age: number; gan: string; zhi: string; mutagen: string[];
      palaceIndex: number; palaceName: string; xiaoPalaceName: string; xiaoPalaceIdx: number;
    }> = [];
    for (let age = 1; age < qiyunAge; age++) {
      const y = year + age - 1;
      const gan = GAN_NAMES[(y - 4) % 10];
      const zhi = ZHI_STD[(y - 4) % 12];
      const idx = ZHI_NAMES.indexOf(zhi);
      const p = result.palaces.find(pp => pp.index === idx || ZHI_NAMES.indexOf(pp.earthlyBranch) === idx);
      const xiao = result.palaces.find(pp => (pp.ages || []).includes(age));
      const sh = TIANGAN_SIHUA[gan];
      list.push({
        year: y, age, gan, zhi,
        mutagen: sh ? [sh.lu, sh.quan, sh.ke, sh.ji] : [],
        palaceIndex: idx,
        palaceName: p?.name || "",
        xiaoPalaceName: xiao?.name || "",
        xiaoPalaceIdx: xiao ? (xiao.index !== undefined ? xiao.index : ZHI_NAMES.indexOf(xiao.earthlyBranch)) : -1,
      });
    }
    return list;
  }, [result, decadalData, year]);

  // 流年数据（v25.0.24 ZW-TIME 引擎：当前选中大限对应的10年，宫位/干支/四化由引擎统一计算）
  const liunianYears = useMemo(() => {
    if (!zwInput || !decadalData.length) return [];
    // v25.0.41（20260819用户指令）：童限模式下流年行展示童限期（起限前）各年
    if (tongxianActive) return tongxianYears;
    try {
      // v25.0.41 修正：selectedDaxian为起运年龄序（命宫起顺/逆），引擎大限列表为宫序（寅→丑），
      // 同索引直传会取错大限（v25.0.25已在zwDecadalAligned按大限干支对齐修正同类错位，此处沿用同一规则）
      const aligned = zwDecadalAligned[selectedDaxian];
      const engIdx = aligned ? zwDecadal.indexOf(aligned) : -1;
      return getZwYearlyList(zwInput, engIdx >= 0 ? engIdx : selectedDaxian).map(n => ({
        year: n.year ?? 0,
        age: n.age ?? 0,
        gan: n.gan,
        zhi: n.zhi,
        mutagen: n.mutagen,
        palaceIndex: n.palaceIndex,
        palaceName: n.palaceName,
        solarDate: n.solarDate,
      }));
    } catch { return []; }
  }, [zwInput, decadalData, selectedDaxian, tongxianActive, tongxianYears, zwDecadalAligned, zwDecadal]);

  // 流月数据（v25.0.24 ZW-TIME 引擎：按农历月真实边界计算，宫位由引擎输出）
  const liuyueMonths = useMemo(() => {
    if (!zwInput || !liunianYears.length) return [];
    const curYear = liunianYears[selectedLiunian]?.year || year;
    try {
      return getZwMonthlyList(zwInput, curYear).map((n, i) => ({
        ...n,
        label: `${i + 1}月`,
        lunarMonth: n.lunarMonth ?? i + 1,
      }));
    } catch { return []; }
  }, [zwInput, liunianYears, selectedLiunian, year]);

  // 流日数据（v25.0.24 ZW-TIME 引擎：真实历法日干支，修复原顺序推算误差）
  const liuriDays = useMemo(() => {
    if (!zwInput || !liuyueMonths.length || selectedLiuyue < 0) return [];
    const curMonth = liuyueMonths[selectedLiuyue];
    const curYear = liunianYears[selectedLiunian]?.year || year;
    if (!curMonth) return [];
    try {
      return getZwDailyList(zwInput, curYear, curMonth.lunarMonth ?? selectedLiuyue + 1).map(n => ({
        day: n.lunarDay ?? 0,
        lunarName: n.sub,
        gan: n.gan,
        zhi: n.zhi,
        mutagen: n.mutagen,
        palaceIndex: n.palaceIndex,
        palaceName: n.palaceName,
        solarDate: n.solarDate,
      }));
    } catch { return []; }
  }, [zwInput, liuyueMonths, selectedLiuyue, liunianYears, selectedLiunian, year]);

  // 流时数据（v25.0.24 ZW-TIME 引擎：时辰宫位由引擎 horoscope 统一计算）
  const liushiHours = useMemo(() => {
    const curDay = selectedLiuri >= 0 ? liuriDays[selectedLiuri] : null;
    if (!zwInput || !curDay?.solarDate) return [];
    try {
      return getZwHourlyList(zwInput, curDay.solarDate).map(n => ({
        gan: n.gan,
        zhi: n.zhi,
        mutagen: n.mutagen,
        palaceIndex: n.palaceIndex,
        palaceName: n.palaceName,
      }));
    } catch { return []; }
  }, [zwInput, liuriDays, selectedLiuri]);

  // v25.0.25 ZW-OVERLAY 叠宫层（净室引擎公式 zwOverlayNames：372 项对拍全过）
  // 每层返回 {anchor=该运限命宫宫序索引, names[12]=本命第 i 宫在该层的宫名}
  const overlayInfo = useMemo(() => {
    if (!showOverlay) return null;
    // v25.0.27: 层级尊重用户点击——仅 dxLayer/lnLayer 开启的层参与叠宫；深层(月/日/时)选中即视为手动展开
    const dx = dxLayer ? zwDecadalAligned[selectedDaxian] : null;
    const ln = lnLayer ? liunianYears[selectedLiunian] : null;
    const deep = selectedLiushi >= 0 ? { node: liushiHours[selectedLiushi], tag: "时" }
      : selectedLiuri >= 0 ? { node: liuriDays[selectedLiuri], tag: "日" }
      : selectedLiuyue >= 0 ? { node: liuyueMonths[selectedLiuyue], tag: "月" }
      : null;
    return {
      dx: dx && dx.palaceIndex >= 0 ? { anchor: dx.palaceIndex, names: zwOverlayNames(dx.palaceIndex) } : null,
      ln: ln && ln.palaceIndex >= 0 ? { anchor: ln.palaceIndex, names: zwOverlayNames(ln.palaceIndex) } : null,
      deep: deep?.node && deep.node.palaceIndex >= 0
        ? { tag: deep.tag, anchor: deep.node.palaceIndex, names: zwOverlayNames(deep.node.palaceIndex) }
        : null,
    };
  }, [showOverlay, dxLayer, lnLayer, zwDecadalAligned, selectedDaxian, liunianYears, selectedLiunian, liuyueMonths, selectedLiuyue, liuriDays, selectedLiuri, liushiHours, selectedLiushi]);

  // v25.0.32（P7-紫微布局-02 E区）：七层时间层级动态星——大限/流年/流月/流日/流时/童限/小限
  // 每层仅在该层被用户主动选中后参与计算（zwSeriesStars 为冻结引擎，仅做数据调用不改算法）；
  // 童限/小限补齐：虚岁由用户选定的流年决定——虚岁<起运岁=童限（童限宫=命宫），否则小限（宫=ages含该虚岁之宫，iztro ages 表）
  // v25.0.41（20260819用户指令）：童限期内童限与小限同时显示（童限宫=命宫＋小限宫=ages含虚岁之宫）
  const dynamicStars = useMemo(() => {
    const dxNode = dxLayer ? zwDecadalAligned[selectedDaxian] : null;
    const lnNode = lnLayer ? liunianYears[selectedLiunian] : null;
    const yueNode = selectedLiuyue >= 0 ? liuyueMonths[selectedLiuyue] : null;
    const riNode = selectedLiuri >= 0 ? liuriDays[selectedLiuri] : null;
    const shiNode = selectedLiushi >= 0 ? liushiHours[selectedLiushi] : null;
    const curAge = lnNode?.age || 0;
    const qiyunAge = decadalData[0]?.ageRange?.[0] || 0;
    const tongNode = lnLayer && curAge > 0 && qiyunAge > 0 && curAge < qiyunAge
      ? (result?.palaces?.find((p) => p.name === "命宫") ?? null)
      : null;
    const xiaoNode = lnLayer && curAge > 0
      ? (result?.palaces?.find((p) => (p.ages || []).includes(curAge)) ?? null)
      : null;
    const gzOf = (n: { gan?: string; zhi?: string; heavenlyStem?: string; earthlyBranch?: string } | null) => {
      if (!n) return null;
      if (n.gan && n.zhi) return { gan: n.gan, zhi: n.zhi };
      if (n.heavenlyStem && n.earthlyBranch) return { gan: n.heavenlyStem, zhi: n.earthlyBranch };
      return null;
    };
    const mkLayer = (lv: string, node: unknown, lunarMonth?: number) => {
      const gz = gzOf(node as never);
      if (!gz) return null;
      try {
        return { key: lv, prefix: DYN_LEVEL_PREFIX[lv], color: DYN_LEVEL_COLORS[lv], stars: zwSeriesStars(gz.gan, gz.zhi, lunarMonth) };
      } catch { return null; }
    };
    return {
      dx: mkLayer("dx", dxNode),
      ln: mkLayer("ln", lnNode),
      yue: mkLayer("yue", yueNode, yueNode?.lunarMonth),
      ri: mkLayer("ri", riNode),
      shi: mkLayer("shi", shiNode),
      tong: mkLayer("tong", tongNode),
      xiao: mkLayer("xiao", xiaoNode),
      tongActive: !!tongNode,
      xiaoActive: !!xiaoNode,
      xiaoPalaceIdx: xiaoNode ? (xiaoNode.index !== undefined ? xiaoNode.index : ZHI_NAMES.indexOf(xiaoNode.earthlyBranch)) : -1,
      curAge,
      qiyunAge,
    };
  }, [dxLayer, lnLayer, zwDecadalAligned, selectedDaxian, liunianYears, selectedLiunian, liuyueMonths, selectedLiuyue, liuriDays, selectedLiuri, liushiHours, selectedLiushi, decadalData, result]);

  // E区按宫归集（数据先归类后渲染）：层级顺序固定 大限→流年→流月→流日→流时→童限/小限
  const dynamicStarsByPalace = useMemo(() => {
    const map: Record<number, Array<{ abbr: string; color: string; level: string }>> = {};
    for (const lv of DYN_LEVEL_ORDER) {
      const layer = dynamicStars[lv];
      if (!layer) continue;
      layer.stars.forEach((s) => {
        const base = DYN_STAR_ABBR[s.name];
        if (!base || s.palaceIndex < 0 || s.palaceIndex > 11) return;
        if (!map[s.palaceIndex]) map[s.palaceIndex] = [];
        const abbr = layer.prefix + base;
        if (!map[s.palaceIndex].some((x) => x.abbr === abbr)) map[s.palaceIndex].push({ abbr, color: layer.color, level: lv });
      });
    }
    return map;
  }, [dynamicStars]);

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
    const editHandler = () => setShowForm(true);
    const backHandler = () => {
      // v25.0.44：返回键按浏览顺序返回——弹窗打开时仅收起弹窗；结果页直接放行给layout返回工具列表，
      // 不再重开排盘表单（旧逻辑导致"排盘页↔表单弹窗"死循环，用户永远退不出页面）
      if (showForm) { setShowForm(false); window.__yixueBackHandled = true; }
    };
    window.addEventListener("yixue-edit", editHandler);
    window.addEventListener("yixue-back", backHandler);
    return () => {
      window.removeEventListener("yixue-edit", editHandler);
      window.removeEventListener("yixue-back", backHandler);
    };
  }, [showForm]);

  // 当大限变化时重置流年（v25.0.27: 点击某大限仅展开对应大限层，不自动带出流年及以下层级）
  useEffect(() => {
    setSelectedLiunian(0);
    setLnLayer(false);
    setSelectedLiuyue(-1);
    setSelectedLiuri(-1);
    setSelectedLiushi(-1);
  }, [selectedDaxian]);

  // 默认无连线，点击宫位才显示三方四正
  useEffect(() => {
    setFocusedPalace(null);
  }, [result]);

  // v18.9: 来因宫索引
  const laiyinPalaceIdx = useMemo(() => {
    if (!result?.heavenlyStem) return -1;
    return getLaiyinPalaceIdx(result.heavenlyStem);
  }, [result]);

  // v18.9: AI解读请求函数（流式输出）
  const handleAIInterpret = async (scope: "overall" | "palace" | "daxian" | "liunian" | "liuyue" | "liuri" | "liushi", contextData?: string) => {
    if (aiInterpreting) return;

    // v20.1: 三级权限检查 - 未登录弹出登录引导
    if (!requireLogin()) return;
    const perm = getPermissionStatus();
    if (!perm.canUseAI) {
      setAiContent(perm.message || "今日AI解读次数已用完，开通会员继续使用");
      setAiScope(scope);
      return;
    }

    // v19.6: 配额检查
    const quota = checkAIQuota();
    if (!quota.canUse) {
      setAiContent(quota.message || "今日AI解读次数已用完");
      setAiScope(scope);
      return;
    }
    setAiInterpreting(true);
    setAiScope(scope);
    setAiContent("");
    try {
      const scopeText = {
        overall: "整体命盘",
        palace: "单宫解读",
        daxian: "大运解读",
        liunian: "流年解读",
        liuyue: "流月解读",
        liuri: "流日解读",
        liushi: "流时解读",
      }[scope];

      // v25.0.47_12 深度报告提质：五段式/700-900字/典籍引用/合规语气
      const systemPrompt = buildDeepReportSystemPrompt(`紫微斗数·${scopeText}`);

      const baseContext = contextData || (() => {
        if (!result) return "";
        const palaceSummary = result.palaces.map(p => 
          `${p.name}(${p.heavenlyStem}${p.earthlyBranch}): 主星[${(p.majorStars||[]).join(",")}] 辅星[${(p.auspiciousStars||[]).join(",")}] 煞星[${(p.shaStars||[]).join(",")}]`
        ).join("\n");
        const sihua = result.sihua ? 
          `化禄:${result.sihua.huaLu?.star||""} 化权:${result.sihua.huaQuan?.star||""} 化科:${result.sihua.huaKe?.star||""} 化忌:${result.sihua.huaJi?.star||""}` : "";
        return `生年干支：${result.heavenlyStem}${result.earthlyBranch}\n命宫：${result.earthlyBranchOfSoulPalace}\n身宫：${result.earthlyBranchOfBodyPalace}\n五行局：${result.fiveElementsClass}\n四化：${sihua}\n十二宫星曜分布：\n${palaceSummary}`;
      })();

      const userPrompt = `请对以下紫微斗数命盘进行${scopeText}：\n${baseContext}\n\n请从性格天赋、事业财运、感情婚恋、健康注意等方面进行分析。`;

      const aiResult = await callAI({
        systemPrompt,
        userPrompt,
        cacheKey: `ziwei_${scope}_${baseContext.slice(0, 80)}`,
      });

      if (aiResult.success) {
        let text = aiResult.content || "";
        if (!text.includes("仅供传统文化学习参考")) {
          text += "\n\n以上内容仅供传统文化学习参考，不构成人生决策建议";
        }
        setAiContent(text);
        // v19.6: AI调用成功后增加使用次数
        incrementAIUsage();
      } else {
        setAiContent("AI解读服务暂时不可用，请稍后重试。\n\n以上内容仅供传统文化学习参考，不构成人生决策建议");
      }
    } catch {
      setAiContent("AI解读服务暂时不可用，请稍后重试。\n\n以上内容仅供传统文化学习参考，不构成人生决策建议");
    } finally {
      setAiInterpreting(false);
    }
  };

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
      <div className="w-full" style={{ maxWidth: "420px", paddingBottom: "10px" }}>
      {/* 输入表单 DatePicker 弹窗 */}
      <DatePicker
        show={showForm}
        onClose={(reason?: "back") => { setShowForm(false); if (reason === "back" && !result && !isManagedBackNavigation()) leaveToolPage(router); }}
        onSubmit={(dateVal, opts) => {
          setYear(dateVal.year); setMonth(dateVal.month); setDay(dateVal.day); setHour(dateVal.hour);
          setGender(opts.gender as Gender);
          setCalType(opts.calType === "solar" ? "gongli" : opts.calType === "lunar" ? "nongli" : "sizhu");
          setZaoWanZi(opts.zaoWanZi); setZhenTaiyang(opts.zhenTaiyang); setXiaLing(opts.xiaLing);
          // S2-4: 真太阳时校正——勾选后按出生地经度修正年月日时再排盘
          let calcDate = { year: dateVal.year, month: dateVal.month, day: dateVal.day, hour: dateVal.hour };
          if (opts.zhenTaiyang) {
            const std = new Date(dateVal.year, dateVal.month - 1, dateVal.day, dateVal.hour, dateVal.minute || 0);
            const tst = calcTrueSolarTime(std, opts.longitude ?? longitude);
            const t = tst.trueSolarTime;
            calcDate = { year: t.getFullYear(), month: t.getMonth() + 1, day: t.getDate(), hour: t.getHours() };
            const sign = tst.totalOffset >= 0 ? "+" : "-";
            const absMin = Math.abs(tst.totalOffset);
            setSolarCorrection(`真太阳时 ${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")} ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}（${(opts.longitude ?? longitude).toFixed(1)}°E，修正${sign}${Math.floor(absMin)}分）`);
          } else {
            setSolarCorrection(null);
          }
          if (opts.longitude !== undefined) setLongitude(opts.longitude);
          handleSubmit({ ...calcDate, gender: opts.gender as Gender });
        }}
        initialDate={{year, month, day, hour, minute: 0}}
        initialOptions={{
          gender,
          calType: calType === "gongli" ? "solar" : calType === "nongli" ? "lunar" : "sizhu",
          zaoWanZi, zhenTaiyang, xiaLing, longitude,
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
          {/* S2-4: 真太阳时修正说明（勾选真太阳时后显示） */}
          {solarCorrection && (
            <div className="mb-1 rounded-lg border border-[#7B2FBE] bg-[#F3EDF7] px-3 py-1.5 text-[11px] leading-relaxed text-[#5B21B6]">
              ☀ {solarCorrection}
            </div>
          )}
          {/* v25.0.33（P7-整改-01）：移除宫盘上方叠宫图例/动态星图例/技法按钮等冗余说明，命盘紧贴顶部品牌栏 */}

          {/* ---- v25.0.29: 缩放容器（恒为适配屏宽整体等比缩放） ---- */}
          <div
            ref={chartOuterRef}
            style={{
              overflowX: "hidden",
              overflowY: "hidden",
              WebkitOverflowScrolling: "touch",
              height: chartInnerH > 0 ? chartInnerH * chartScale : undefined,
              marginBottom: 8,
            }}
          >
            <div
              ref={chartInnerRef}
              style={{ width: CHART_DESIGN_W, transform: `scale(${chartScale})`, transformOrigin: "top left" }}
            >
          {/* ---- 4x4 宫格盘（带方位标签和SVG连线，v19.2支持缩放拖拽） ---- */}
          <div className="bg-white rounded-lg overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
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
              <div
                style={{
                  flex: 1,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* SVG 叠加层 */}
                <svg
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 2 }}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {/* 三方四正虚线三角辅助标识（三合模式默认显示命宫三方四正，点击宫位切换） */}
                  {(() => {
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

                {/* 4x4 CSS Grid - P7-上架前阻断整改-01：恢复 v25.0.31 固定宫格尺寸（aspectRatio 0.75），
                    宫格大小不再调整；密集宫格通过既有放大横滑双模式阅读，星曜统一固定字号自动换行 */}
                <div className="grid grid-cols-4 grid-rows-4" style={{ position: "relative", zIndex: 1, aspectRatio: "0.75" }}>
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

                          {/* Row 7a: 四柱（天干地支竖排，五行颜色）- 数据来自历法引擎 chineseDate */}
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

 // === 辅星/煞星/杂曜数据来自 排盘引擎 核心引擎（v2.0），不再使用 getAuxStars buggy计算 ===
 // palace.auspiciousStars = 六吉 + 禄存 + 天马（排盘引擎 按生年天干/地支/农历月精确安星）
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
                    let jiangqianStars: string[] = [];
                    let suiqianStars: string[] = [];

                    if (viewMode === "sihua") {
                      // 四化模式：14主星 + 六吉 + 六煞 + 禄存天马 + 杂曜
                      auspiciousStars = [...allAuspicious];
                      shaStars = [...allSha];
                      otherMinorStars = [...allOther];
                      changshengStars = [];
                      boshiStars = [];
                      jiangqianStars = [];
                      suiqianStars = [];
                    } else if (viewMode === "sanhe") {
                      // 三合模式：全量星曜——14主星+六吉+六煞+禄存天马+杂曜 + 神煞(博士/将前/岁前)
                      auspiciousStars = [...allAuspicious];
                      shaStars = [...allSha];
                      otherMinorStars = [...allOther];
                      changshengStars = palace.changsheng ? [palace.changsheng] : [];
                      boshiStars = palace.boshi ? [palace.boshi] : [];
                      jiangqianStars = palace.jiangqian ? [palace.jiangqian] : [];
                      suiqianStars = palace.suiqian ? [palace.suiqian] : [];
                    } else if (viewMode === "feixing") {
                      // 飞星模式：极简——14主星 + 禄存
                      auspiciousStars = allAuspicious.filter(s => s === "禄存");
                      shaStars = [];
                      otherMinorStars = [];
                      changshengStars = [];
                      boshiStars = [];
                      jiangqianStars = [];
                      suiqianStars = [];
                    }

                    // 宫位背景色（仅三合模式显示三方四正高亮）
                    const palaceBg = viewMode === "sanhe" ? getPalaceBg(palaceZhiIdx) : "#fff";
                    // v18.9: 来因宫标记
                    const isLaiyin = palaceZhiIdx === laiyinPalaceIdx;
                    // v25.0.24: ZW-TIME 时间轴选中宫位高亮（紫框）
                      const isZwFocus = focusedPalace !== null && palaceZhiIdx === focusedPalace;
                      // 20260819用户指令垂直布局实测（宫格高≈146px=440/0.75÷4行，7px竖排字高7.7px/字）：
                      // 右下角干支(2~3字，身宫并入)沉底 → 十二长生(1条2字)纵排其正上方 → E区动态栏在长生上方，
                      // 三段自下而上互不重叠；来因宫右缘中部占用时 E区整体左移让位
                      const gzChars = (palace.heavenlyStem || palace.earthlyBranch ? 2 : 0) + (isShen ? 1 : 0);
                      const csBottomPx = gzChars > 0 ? Math.ceil(gzChars * 7.7) + 1 : 16;
                      const dynBottomPx = csBottomPx + 16;
                      const laiyinPadPx = isLaiyin ? 11 : 0;

                    return (
                      <div
                        key={idx}
                        onClick={() => { setExpandedPalaceIdx(prev => prev === idx ? null : idx); if (viewMode === "sanhe") setFocusedPalace(palaceZhiIdx); const palaceInterp = getPalaceInterpretation(palace.name); const starInterps = getPalaceAllStarInterpretations(palace.majorStars || [], palace.name, result.sihua); const allInterps = []; if (palaceInterp) { allInterps.push({ type: "palace" as const, title: palaceInterp.title, content: palaceInterp.summary + "\n" + palaceInterp.details.join("\n"), source: palaceInterp.source }); } allInterps.push(...starInterps); const tianjiNotes = getKbTianjiPalaceNotes(palace.name); if (tianjiNotes.length) { allInterps.push({ type: "palace" as const, title: `${palace.name}·天纪断语（${tianjiNotes.length}条）`, content: tianjiNotes.map((n, i) => `${i + 1}. ${n}`).join("\n"), source: KB_TIANJI_SOURCE }); } setInterpretPanel({ palaceName: palace.name, palaceGanZhi: (palace.heavenlyStem || "") + (palace.earthlyBranch || ""), interpretations: allInterps }); }}
                        style={{
                          border: isLaiyin ? "2px solid #ff6600" : isZwFocus ? "2px solid #7B2FBE" : "1px solid #ccc",
                          boxShadow: isZwFocus ? "0 0 4px rgba(123,47,190,0.45)" : "none",
                          padding: "1px 1px",
                          display: "flex",
                          flexDirection: "column",
                          overflow: "hidden",
                          position: "relative",
                          backgroundColor: isLaiyin ? "#fff8f0" : palaceBg,
                          cursor: "pointer",
                        }}
                      >
                        {/* P7-上架前阻断整改-01：宫干支恢复基础——四化/三合/飞星模式均需宫干（天干四化表 L91 宫干飞化之源） */}
                        {/* 20260819用户指令：来因宫改右侧靠边中间纵向竖排显示 */}
                        {isLaiyin && (
                          <span style={{ position: "absolute", right: "0px", top: "38%", fontSize: "7px", color: "#ff6600", fontWeight: "bold", writingMode: "vertical-rl", textOrientation: "upright", whiteSpace: "nowrap", lineHeight: "1.1", zIndex: 5, background: "#fff8f0", padding: "1px 0" }}>来因</span>
                        )}

                        {/* ══ A区（星曜主区，宫格上部）20260819用户指令：单行横排 ══
                            星名逐字竖排（一星一列，列宽=字号）→ 列与列从左至右单行横排（flexWrap:nowrap 不换行）；
                            主星字号保持既有分档不变；副星/杂曜按可用宽度实测自动缩小至全部排完；
                            每颗星（含杂曜）庙旺紧贴星名正下方；四化叠罗汉（本命红→大限蓝→流年绿，留位对齐）；
                            右侧按 D区(长生/干支列) + E区(动态栏实际列数) 动态预留宽度，区域不互相侵占 */}
                        {(() => {
                          // E区动态栏实际列数（每列10颗续列、最多3列）→ A区右侧动态预留
                          const dynList = dynamicStarsByPalace[palaceZhiIdx] || [];
                          const dynCols = Math.min(3, Math.ceil(dynList.length / 10) || (dynList.length ? 1 : 0));
                          const starPadRight = 12 + dynCols * 8 + laiyinPadPx;
                          return (
                        <div style={{ flex: "1 1 auto", minHeight: "50px", display: "flex", flexDirection: "row", flexWrap: "nowrap", alignContent: "flex-start", gap: "2px 2px", overflow: "hidden", padding: `0 ${starPadRight}px 0 2px`, position: "relative", zIndex: 1 }}>
                          {(() => {
                            // 数据归类：主星→六吉→六煞→杂曜 全部入A区
                            const mainAndAuxStars: Array<{name: string; isMajor: boolean; color: string; weight: string; category: "major" | "aux" | "minor"}> = [
                              ...majorStars.map(s => ({ name: s, isMajor: true, color: MAJOR_STAR_COLOR, weight: "bold", category: "major" as const })),
                              ...auspiciousStars.map(s => ({ name: s, isMajor: false, color: AUSPICIOUS_COLOR, weight: "normal", category: "aux" as const })),
                              ...shaStars.map(s => ({ name: s, isMajor: false, color: INAUSPICIOUS_COLOR, weight: "normal", category: "aux" as const })),
                              ...otherMinorStars.map(s => ({ name: s, isMajor: false, color: MINOR_STAR_COLOR, weight: "normal", category: "minor" as const })),
                            ];
                            const totalCount = mainAndAuxStars.length;
                            // 20260819用户指令：主星大小不变（沿用既有分档）；副星与杂曜按宫格实测可用宽度自动缩小，
                            // 保证主星+副星+杂曜全部单行横排排完（严禁换行成两行）
                            const CELL_W = (CHART_DESIGN_W - 14) / 4;
                            const availW = CELL_W - 3 - starPadRight;
                            const majorCount = mainAndAuxStars.filter(s => s.category === "major").length;
                            const subCount = totalCount - majorCount;
                            const majorFsPx = totalCount > 12 ? 12 : totalCount > 8 ? 13 : totalCount > 5 ? 14 : 15;
                            const majorColW = majorFsPx + 1;
                            let subFsPx = 9;
                            if (subCount > 0) {
                              const remW = availW - majorCount * majorColW - 2 * (totalCount - 1);
                              subFsPx = Math.max(4, Math.min(9, Math.floor(remW / subCount) - 1));
                            }
                            // v25.0.29（P7-5）：运限四化星名（ZW-TIME 引擎统一计算；仅用户点击对应层后展开）
                            const dxMut = dxLayer && zwDecadalAligned[selectedDaxian]?.mutagen;
                            const lnMut = lnLayer && liunianYears[selectedLiunian]?.mutagen;
                            const HUA_CHARS = ["禄", "权", "科", "忌"];
                            const huaOfMut = (mut: unknown, starName: string): string => {
                              if (!Array.isArray(mut) || mut.length !== 4) return "";
                              const k = mut.indexOf(starName);
                              return k >= 0 ? HUA_CHARS[k] : "";
                            };
                            return mainAndAuxStars.map((star, j) => {
                              const brightness = getStarBrightness(result, star.name, palace.name);
                              const st = getSihuaType(result.sihua, star.name);
                              const dxHua = huaOfMut(dxMut, star.name);
                              const lnHua = huaOfMut(lnMut, star.name);
                              const starFsPx = star.category === "major" ? majorFsPx : subFsPx;
                              const starColW = star.category === "major" ? majorColW : subFsPx + 1;
                              return (
                                <div
                                  key={`star-${j}`}
                                  style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: "1", width: starColW, flexShrink: 0 }}
                                >
                                  {star.name.split("").map((char, ci) => (
                                    <span key={ci} style={{ fontSize: `${starFsPx}px`, fontWeight: star.weight as any, color: star.color, lineHeight: "1", display: "block", textAlign: "center" }}>{char}</span>
                                  ))}
                                  {/* 20260819用户指令：每颗星（含杂曜）都要庙旺——星名正下方，缺数据默认「平」 */}
                                  {brightness && brightness !== "-" ? (
                                    <span style={{ fontSize: star.category === "major" ? "7px" : `${Math.max(4, subFsPx)}px`, color: BRIGHTNESS_COLORS[brightness] || "#888", lineHeight: "1", whiteSpace: "nowrap" }}>{brightness}</span>
                                  ) : null}
                                  {/* P7-5: 四化=星下叠罗汉（本命红→大限蓝→流年绿，逐层留位保持列对齐） */}
                                  {dxMut || lnMut ? (
                                    st ? (
                                      <span style={{ fontSize: "7px", fontWeight: "bold", color: "#dc2626", lineHeight: "1.1" }}>{st.replace("化", "")}</span>
                                    ) : (
                                      <span style={{ fontSize: "7px", lineHeight: "1.1", visibility: "hidden" }}>禄</span>
                                    )
                                  ) : st ? (
                                    <span style={{ fontSize: "7px", fontWeight: "bold", color: "#dc2626", lineHeight: "1.1" }}>{st.replace("化", "")}</span>
                                  ) : null}
                                  {dxMut ? (
                                    dxHua ? (
                                      <span style={{ fontSize: "7px", fontWeight: "bold", color: "#2563eb", lineHeight: "1.1" }}>{dxHua}</span>
                                    ) : (
                                      <span style={{ fontSize: "7px", lineHeight: "1.1", visibility: "hidden" }}>禄</span>
                                    )
                                  ) : null}
                                  {lnMut ? (
                                    lnHua ? (
                                      <span style={{ fontSize: "7px", fontWeight: "bold", color: "#16a34a", lineHeight: "1.1" }}>{lnHua}</span>
                                    ) : (
                                      <span style={{ fontSize: "7px", lineHeight: "1.1", visibility: "hidden" }}>禄</span>
                                    )
                                  ) : null}
                                </div>
                              );
                            });
                          })()}
                        </div>
                          );
                        })()}

                        {/* ══ B区（内容缓冲区/空白区）══ 星曜区与宫底之间的自然留白（flex 自动分配，不塞其他文字） */}

                        {/* 20260819用户指令：本命盘宫位内必须有小限/大限岁数数字——始终显示（不再因点击大限隐藏） */}
                        <div style={{ flexShrink: 0, lineHeight: "1", position: "relative", zIndex: 1, backgroundColor: isLaiyin ? "#fff8f0" : palaceBg }}>
                            {palace.ages && palace.ages.length > 0 && (
                              <div style={{ fontSize: "7px", color: "#8a8a8a", lineHeight: "1", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden" }}>
                                {palace.ages.slice(0, 4).join(",")}
                              </div>
                            )}
                            {palace.ageRange && palace.ageRange[0] > 0 && (
                              <div style={{ fontSize: "7px", color: "#999", textAlign: "center", lineHeight: "1" }}>
                                {palace.ageRange[0]}-{palace.ageRange[1]}
                              </div>
                            )}
                        </div>

                        {/* ══ E区（右侧动态栏）20260819用户指令 ══
                            大限/流年/流月/流日/流时/童限/小限动态星统一入宫格右侧动态栏；
                            位置=宫格右侧、十二长生上方，自下而上生长；列与列从右往左排（row-reverse）；
                            层序固定 大限→流年→流月→流日→流时→童限/小限；两字简称（层级前缀+星曜简称）；
                            未由用户主动选择的时间层级不显示；每列10颗续列（最多3列），与A区starPadRight预留一致 */}
                        {(() => {
                          const dyn = dynamicStarsByPalace[palaceZhiIdx];
                          if (!dyn || dyn.length === 0) return null;
                          const colorOf = (lv: string) => DYN_LEVEL_COLORS[lv] || "#555";
                          // 合流紧凑竖排——全部层级简称按层序（大限→流年→流月→流日→流时→童限/小限）
                          // 合成单一序列，每列10颗续列（最多3列），层内颜色不混、顺序不变
                          const seq = DYN_LEVEL_ORDER.flatMap((lv) => (dyn.filter((d) => d.level === lv).map((d) => ({ abbr: d.abbr, lv }))));
                          const chunk = (arr: typeof seq, n: number) => {
                            const out: typeof seq[] = [];
                            for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
                            return out;
                          };
                          return (
                            <div style={{ position: "absolute", right: `${1 + laiyinPadPx}px`, bottom: `${dynBottomPx}px`, display: "flex", flexDirection: "row-reverse", alignItems: "flex-end", gap: "1px", zIndex: 4, lineHeight: "1.1" }}>
                              {chunk(seq, 10).map((col, ci) => (
                                <div key={`dyn-${ci}`} style={{ display: "flex", flexDirection: "column", lineHeight: "1.1" }}>
                                  {col.map((d) => (
                                    <span key={d.abbr} style={{ fontSize: "7px", fontWeight: 600, color: colorOf(d.lv), writingMode: "vertical-rl", textOrientation: "upright", lineHeight: "1.1", whiteSpace: "nowrap" }}>
                                      {d.abbr}
                                    </span>
                                  ))}
                                </div>
                              ))}
                            </div>
                          );
                        })()}

                        {/* ══ D区（右侧：十二长生纵排于右下角干支正上方）20260819用户指令 ══
                            十二长生固定宫格右侧靠边竖排，位于右下角干支的上面；
                            干支五行配色——四化/三合/飞星模式均显示，为宫干飞化（天干四化表）提供视觉基准 */}
                        <div style={{ position: "absolute", right: "0px", bottom: `${csBottomPx}px`, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0, zIndex: 4, lineHeight: "1.1" }}>
                          {changshengStars.filter(Boolean).map((s, k) => (
                            <span key={`cs-${k}`} style={{ fontSize: "7px", color: "#8a6d3b", fontWeight: 600, writingMode: "vertical-rl", textOrientation: "upright", lineHeight: "1.1", whiteSpace: "nowrap" }}>
                              {s}
                            </span>
                          ))}
                        </div>
                        {/* D区-右下角：宫干支竖排（20260819用户指令：去重只留一个、最右下角沉底；身宫标记并入干支列） */}
                        <div style={{ position: "absolute", right: "1px", bottom: "0px", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0, zIndex: 4, lineHeight: "1.1" }}>
                          {(palace.heavenlyStem || palace.earthlyBranch) && (
                            <span style={{ fontSize: "7px", fontWeight: "bold", lineHeight: "1.1", writingMode: "vertical-rl", textOrientation: "upright", whiteSpace: "nowrap" }}>
                              <span style={{ color: getGanZhiColor(palace.heavenlyStem) }}>{palace.heavenlyStem}</span>
                              <span style={{ color: getGanZhiColor(palace.earthlyBranch) }}>{palace.earthlyBranch}</span>
                              {isShen ? <span style={{ color: "#b91c1c" }}>身</span> : null}
                            </span>
                          )}
                        </div>

                        {/* ══ C区（左下：博士十二神/将前/岁前 36神煞）P7-上架前阻断整改-01 ══
                            固定用户视觉左下角，从下向上纵向排列（回退 v25.0.31 左下口径，
                            P0新规明确神煞不得放右侧/中间/底部居中）；统一弱化字号7px全宫一致，
                            颜色区分神煞类别；不占用主星区、右侧动态栏、宫干支区域 */}
                        <div style={{ position: "absolute", left: "1px", bottom: "2px", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "flex-start", maxWidth: "40%", zIndex: 4, lineHeight: "1.15" }}>
                          {boshiStars.filter(Boolean).map((s, k) => (
                            <span key={`bs-${k}`} style={{ fontSize: "7px", color: "#666", lineHeight: "1.15", textAlign: "left", whiteSpace: "nowrap" }}>{s}</span>
                          ))}
                          {jiangqianStars.filter(Boolean).map((s, k) => (
                            <span key={`jq-${k}`} style={{ fontSize: "7px", color: "#8B4513", lineHeight: "1.15", textAlign: "left", whiteSpace: "nowrap" }}>{s}</span>
                          ))}
                          {suiqianStars.filter(Boolean).map((s, k) => (
                            <span key={`sq-${k}`} style={{ fontSize: "7px", color: "#556B2F", lineHeight: "1.15", textAlign: "left", whiteSpace: "nowrap" }}>{s}</span>
                          ))}
                        </div>
                        {/* v25.0.26: ZW-OVERLAY 叠宫纵向叠罗汉 | v25.0.30（P8-2）：叠宫字号=宫名10px，仅颜色区分层级 */}
                        {overlayInfo && (overlayInfo.dx || overlayInfo.ln || overlayInfo.deep) && (
                          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 0, lineHeight: "1.15", flexShrink: 0, whiteSpace: "nowrap", position: "relative", zIndex: 3, marginTop: "auto", backgroundColor: isLaiyin ? "#fff8f0" : palaceBg }}>
                            {overlayInfo.deep && overlayInfo.deep.names[palaceZhiIdx] && (
                              <span style={{ fontSize: "10px", color: "#0d9488", fontWeight: overlayInfo.deep.names[palaceZhiIdx] === "命宫" ? 700 : 400, borderBottom: overlayInfo.deep.names[palaceZhiIdx] === "命宫" ? "1px solid #0d9488" : "none", lineHeight: "1.15" }}>{overlayInfo.deep.tag}{zwPalaceAbbr(overlayInfo.deep.names[palaceZhiIdx])}</span>
                            )}
                            {overlayInfo.ln && overlayInfo.ln.names[palaceZhiIdx] && (
                              <span style={{ fontSize: "10px", color: "#2563eb", fontWeight: overlayInfo.ln.names[palaceZhiIdx] === "命宫" ? 700 : 400, borderBottom: overlayInfo.ln.names[palaceZhiIdx] === "命宫" ? "1px solid #2563eb" : "none", lineHeight: "1.15" }}>年{zwPalaceAbbr(overlayInfo.ln.names[palaceZhiIdx])}</span>
                            )}
                            {overlayInfo.dx && overlayInfo.dx.names[palaceZhiIdx] && (
                              <span style={{ fontSize: "10px", color: "#d97706", fontWeight: overlayInfo.dx.names[palaceZhiIdx] === "命宫" ? 700 : 400, borderBottom: overlayInfo.dx.names[palaceZhiIdx] === "命宫" ? "1px solid #d97706" : "none", lineHeight: "1.15" }}>大{zwPalaceAbbr(overlayInfo.dx.names[palaceZhiIdx])}</span>
                            )}
                          </div>
                        )}
                        {/* 底部居中：宫位名称红色 + 大运宫名展开（z-index最高防止星曜遮挡） */}
                        <div style={{ textAlign: "center", flexShrink: 0, lineHeight: "1.2", position: "relative", zIndex: 3, backgroundColor: isLaiyin ? "#fff8f0" : palaceBg, paddingBottom: "1px" }}>
                          <span style={{ fontSize: "10px", fontWeight: "bold", color: "#fa0000", lineHeight: "1.2" }}>
                            {palace.name}
                          </span>
                          {/* 20260819用户指令：底部必须有童限标记（童限宫=命宫，仅选定流年后童限生效时显示） */}
                          {dynamicStars.tongActive && palace.name === "命宫" && (
                            <span style={{ fontSize: "8px", fontWeight: "bold", color: "#d97706", marginLeft: "1px", lineHeight: "1.2" }}>童限</span>
                          )}
                          {dynamicStars.xiaoActive && dynamicStars.xiaoPalaceIdx === palaceZhiIdx && (
                            <span style={{ fontSize: "8px", fontWeight: "bold", color: "#be185d", marginLeft: "1px", lineHeight: "1.2" }}>小限</span>
                          )}
                          {expandedPalaceIdx === idx && (
                            <span style={{ fontSize: "7px", color: "#999", marginLeft: "1px" }}>
                              {getDaxianPalaceName(palaceZhiIdx)}
                            </span>
                          )}
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
            </div>
          </div>


          {/* ---- 宫位解读面板（P1-REOPEN 规范BottomSheet：85vh内滚 + safe-bottom + 弹窗时隐藏Tab栏，根治APP端底部遮挡） ---- */}
          {interpretPanel && (
            <div className="modal-overlay">
              <div className="modal-backdrop" onClick={() => setInterpretPanel(null)} />
              <div className="modal-bottom-sheet modal-slide-up shadow-2xl">
                <div className="modal-header" style={{ background: "linear-gradient(135deg, #7B2FBE, #9B5ECF)", borderBottom: "none" }}>
                  <div className="modal-header-title" style={{ color: "white" }}>
                    <span style={{ fontSize: "17px", fontWeight: "bold" }}>{interpretPanel.palaceName}</span>
                    <span style={{ fontSize: "12px", marginLeft: "8px", opacity: 0.9, fontWeight: "normal" }}>{interpretPanel.palaceGanZhi}</span>
                  </div>
                  <button
                    className="modal-close-btn"
                    onClick={() => setInterpretPanel(null)}
                    style={{ background: "rgba(255,255,255,0.25)", color: "white", fontSize: "16px", lineHeight: 1 }}
                    aria-label="关闭解读面板"
                  >
                    ×
                  </button>
                </div>
                <div className="modal-bottom-sheet-body" style={{ padding: "12px 14px" }}>
                  {interpretPanel.interpretations.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: idx < interpretPanel.interpretations.length - 1 ? "12px" : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontSize: "10px", fontWeight: "bold", padding: "1px 6px", borderRadius: "3px", background: item.type === "star" ? "#fef3c7" : item.type === "sihua" ? "#e0e7ff" : "#f3e8ff", color: item.type === "star" ? "#92400e" : item.type === "sihua" ? "#3730a3" : "#6b21a8", marginRight: "8px" }}>{item.type === "star" ? "星曜" : item.type === "sihua" ? "四化" : "宫位"}</span>
                        <span style={{ fontSize: "13px", fontWeight: "bold", color: "#333" }}>{item.title}</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#555", lineHeight: "1.7", whiteSpace: "pre-line" }}>{item.content}</div>
                      <div style={{ fontSize: "10px", color: "#999", marginTop: "4px", fontStyle: "italic" }}>—— {item.source}</div>
                    </div>
                  ))}
                  {/* v18.9: AI解读此宫按钮 */}
                  <button
                    onClick={() => {
                      const ctx = `${interpretPanel.palaceName}(${interpretPanel.palaceGanZhi})\n` + interpretPanel.interpretations.map(i => `${i.title}: ${i.content}`).join("\n");
                      handleAIInterpret("palace", ctx);
                    }}
                    disabled={aiInterpreting}
                    className="w-full py-2.5 mt-3 rounded-lg font-bold text-sm cursor-pointer border-0 text-white disabled:opacity-60"
                    style={{ background: aiInterpreting ? "#999" : BRAND_PURPLE }}
                  >
                    {aiInterpreting && aiScope === "palace" ? "AI解读中..." : "🤖 AI解读此宫"}
                  </button>
                  <div style={{ padding: "8px 0 2px", fontSize: "10px", color: "#999", textAlign: "center" }}>引经据典，仅供参考</div>
                </div>
                <div className="modal-safe-bottom" />
              </div>
            </div>
          )}

          {/* ---- 底部时间表格（对标jishiyu：大限12宫、流年10年、流月12月，干支五行色） ---- */}
          {decadalData.length > 0 && (
            <div className="bg-white mb-2 border border-gray-300 overflow-hidden">
              <div style={{ display: "flex", borderBottom: "1px solid #ccc", background: "#fafafa" }}>
                {/* 大限标签 */}
                <div style={{ width: "22px", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #ccc", fontSize: "10px", color: "#333", fontWeight: "bold", writingMode: "vertical-rl", textOrientation: "upright", letterSpacing: "2px", padding: "4px 1px", lineHeight: "1" }}>大限</div>
                {/* 大限12格（v25.0.41 20260819用户指令：最前增加"童限"前置格，起限前可选，对标文墨天机"起限前(童限)"） */}
                <div style={{ flex: 1, display: "flex", overflowX: "auto" }}>
                  {tongxianYears.length > 0 && (() => {
                    const txQiyun = decadalData[0]?.ageRange?.[0] || 0;
                    const txActive = tongxianActive;
                    const mingP = result?.palaces.find(p => p.name === "命宫");
                    const mingIdx = mingP ? (mingP.index !== undefined ? mingP.index : ZHI_NAMES.indexOf(mingP.earthlyBranch)) : -1;
                    return (
                      <div
                        key="tongxian"
                        onClick={() => {
                          setTongxianActive(true);
                          // 20260819用户指令：点击童限→排盘状态箭头对本命（虚线三角指命宫）
                          if (mingIdx >= 0) setFocusedPalace(mingIdx);
                          // 童限非大限层：回到本命盘状态，深层选择重置，等待用户点童限流年
                          setSelectedLiunian(0);
                          setLnLayer(false);
                          setDxLayer(false);
                          setShowOverlay(false);
                          setSelectedLiuyue(-1);
                          setSelectedLiuri(-1);
                          setSelectedLiushi(-1);
                        }}
                        style={{
                          flex: "0 0 auto",
                          width: `${100/12}%`,
                          minWidth: "28px",
                          borderRight: "1px solid #ccc",
                          padding: "3px 1px",
                          textAlign: "center",
                          cursor: "pointer",
                          background: txActive ? "#fef3c7" : "#fff",
                          lineHeight: "1.3",
                        }}
                        title={`起限前(童限)：虚岁1-${txQiyun - 1}，童限宫=命宫`}
                      >
                        <div style={{ fontSize: "9px", color: "#b45309" }}>起限前</div>
                        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#d97706" }}>童限</div>
                      </div>
                    );
                  })()}
                  {decadalData.map((d, i) => {
                    const isActive = i === selectedDaxian && !tongxianActive;
                    return (
                      <div
                        key={`dy-${i}`}
                        onClick={() => {
                          setTongxianActive(false);
                          setSelectedDaxian(i);
                          // v25.0.27: 点击大限=用户主动展开大限叠宫层（不自动带出流年层级）
                          setDxLayer(true);
                          setShowOverlay(true);
                          // 虚线三角形移动到大限对应宫位
                          const palaceName = decadalData[i]?.name;
                          const palace = result?.palaces.find(p => p.name === palaceName);
                          if (palace) {
                            const zhiIdx = palace.index !== undefined ? palace.index : ZHI_NAMES.indexOf(palace.earthlyBranch);
                            setFocusedPalace(zhiIdx);
                          }
                        }}
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

              {/* v25.0.29（P7-5）：限四化行移除——四化统一写在宫内对应星曜下方（红=本命/蓝=大限/绿=流年） */}

              {/* v25.0.41（20260819用户指令）：童限/小限对照行——点击童限后出现（童限宫=命宫，小限宫随选定童限流年虚岁） */}
              {tongxianActive && tongxianYears.length > 0 && (() => {
                const cur = tongxianYears[selectedLiunian] || tongxianYears[0];
                const txQiyun = decadalData[0]?.ageRange?.[0] || 0;
                const mingP = result?.palaces.find(p => p.name === "命宫");
                const mingIdx = mingP ? (mingP.index !== undefined ? mingP.index : ZHI_NAMES.indexOf(mingP.earthlyBranch)) : -1;
                return (
                  <div style={{ display: "flex", borderBottom: "1px solid #ccc", background: "#fffbeb" }}>
                    <div style={{ width: "22px", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #ccc", fontSize: "10px", color: "#b45309", fontWeight: "bold", writingMode: "vertical-rl", textOrientation: "upright", letterSpacing: "2px", padding: "4px 1px", lineHeight: "1" }}>童限</div>
                    <div style={{ flex: 1, display: "flex", overflowX: "auto" }}>
                      <div
                        onClick={() => { if (mingIdx >= 0) setFocusedPalace(mingIdx); }}
                        style={{ flex: "0 0 auto", width: "25%", padding: "3px 1px", textAlign: "center", cursor: "pointer", borderRight: "1px solid #f3e8d0" }}
                        title="童限宫即命宫（点击箭头指本命）"
                      >
                        <div style={{ fontSize: "9px", color: "#b45309" }}>童限宫</div>
                        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#d97706" }}>命宫</div>
                      </div>
                      <div
                        onClick={() => { if (cur.xiaoPalaceIdx >= 0) setFocusedPalace(cur.xiaoPalaceIdx); }}
                        style={{ flex: "0 0 auto", width: "25%", padding: "3px 1px", textAlign: "center", cursor: "pointer", borderRight: "1px solid #f3e8d0" }}
                        title="小限宫（点击箭头指小限宫）"
                      >
                        <div style={{ fontSize: "9px", color: "#be185d" }}>小限{cur.age}岁</div>
                        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#be185d" }}>{cur.xiaoPalaceName || "-"}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: "0", padding: "3px 4px", fontSize: "8px", color: "#92400e", lineHeight: "1.4", display: "flex", alignItems: "center" }}>
                        起限前虚岁1-{txQiyun - 1}为童限（童限宫=命宫）；点下方流年看童限期流月流日流时
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                        onClick={() => {
                          setSelectedLiunian(i);
                          // v25.0.27: 点击流年=用户主动展开流年叠宫层
                          setLnLayer(true);
                          setShowOverlay(true);
                          // v25.0.24: ZW-TIME 引擎宫位高亮（流年流入宫），地支定位作兜底
                          const n = liunianYears[i];
                          const idx = n?.palaceIndex !== undefined && n.palaceIndex >= 0 ? n.palaceIndex : ZHI_NAMES.indexOf(n?.zhi || "");
                          if (idx >= 0) setFocusedPalace(idx);
                        }}
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
                        <div style={{ fontSize: "9px", color: isCurrent ? "#fff" : "#666", whiteSpace: "nowrap", overflow: "hidden" }}>{tongxianActive ? `${y.year % 100}·${y.age}岁` : y.year % 100}</div>
                        <div style={{ fontSize: "12px", fontWeight: "bold" }}>
                          <span style={{ color: isCurrent ? "#fff" : getGanZhiColor(y.gan) }}>{y.gan}</span>
                          <span style={{ color: isCurrent ? "#fff" : getGanZhiColor(y.zhi) }}>{y.zhi}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* v25.0.29（P7-5）：年四化行移除——四化统一写在宫内对应星曜下方（红=本命/蓝=大限/绿=流年） */}

              {/* 流月行 */}
              <div style={{ display: "flex", borderBottom: "1px solid #ccc", background: "#fafafa" }}>
                <div style={{ width: "22px", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #ccc", fontSize: "10px", color: "#333", fontWeight: "bold", writingMode: "vertical-rl", textOrientation: "upright", letterSpacing: "2px", padding: "4px 1px", lineHeight: "1" }}>流月</div>
                <div style={{ flex: 1, display: "flex" }}>
                  {liuyueMonths.map((m, i) => {
                    const isActive = i === selectedLiuyue;
                    return (
                      <div
                        key={`ly-${i}`}
                        onClick={() => {
                          // v25.0.24: ZW-TIME 引擎宫位高亮（流月从流年宫起数，非月支宫）
                          setSelectedLiuyue(i);
                          setShowOverlay(true);
                          const idx = m.palaceIndex !== undefined && m.palaceIndex >= 0 ? m.palaceIndex : ZHI_NAMES.indexOf(m.zhi);
                          if (idx >= 0) setFocusedPalace(idx);
                        }}
                        style={{
                          flex: 1,
                          borderLeft: i > 0 ? "1px solid #ccc" : "none",
                          padding: "3px 1px",
                          textAlign: "center",
                          cursor: "pointer",
                          background: isActive ? "#eee" : "#fff",
                          fontWeight: isActive ? "bold" : "normal",
                          lineHeight: "1.3",
                        }}
                      >
                        <div style={{ fontSize: "9px", color: "#666" }}>{i + 1}</div>
                        <div style={{ fontSize: "11px" }}>
                          <span style={{ color: getGanZhiColor(m.gan) }}>{m.gan}</span>
                          <span style={{ color: getGanZhiColor(m.zhi) }}>{m.zhi}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* v19.3: 流日流时提示（未选流月时显示） */}
              {liuriDays.length === 0 && (
                <div style={{ padding: "4px 8px", background: "#fffbe6", fontSize: "10px", color: "#d4a017", textAlign: "center", borderBottom: "1px solid #ccc" }}>
                  👆 点击上方流月格子，查看对应流日、流时
                </div>
              )}

              {/* v19.5: 流日行 - 30天分两行，农历日名 */}
              {liuriDays.length > 0 && (
                <>
                  {/* 第一行：初一到十五 */}
                  <div style={{ display: "flex", borderBottom: "1px solid #ddd", background: "#fafafa" }}>
                    <div style={{ width: "22px", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #ccc", fontSize: "10px", color: "#333", fontWeight: "bold", writingMode: "vertical-rl", textOrientation: "upright", letterSpacing: "2px", padding: "4px 1px", lineHeight: "1" }}>流日</div>
                    <div style={{ flex: 1, display: "flex" }}>
                      {liuriDays.slice(0, 15).map((d, i) => {
                        const actualIdx = i;
                        const isActive = actualIdx === selectedLiuri;
                        return (
                          <div
                            key={`lr1-${i}`}
                            onClick={() => {
                              setSelectedLiuri(actualIdx);
                              setSelectedLiushi(-1);
                              setShowOverlay(true);
                              // v25.0.24: ZW-TIME 引擎宫位高亮（流日从流月宫起数）
                              const idx = d.palaceIndex !== undefined && d.palaceIndex >= 0 ? d.palaceIndex : ZHI_NAMES.indexOf(d.zhi);
                              if (idx >= 0) setFocusedPalace(idx);
                            }}
                            style={{
                              flex: 1,
                              minWidth: "0",
                              borderLeft: i > 0 ? "1px solid #ddd" : "none",
                              padding: "2px 0",
                              textAlign: "center",
                              cursor: "pointer",
                              background: isActive ? "#e8e0f0" : "#fff",
                              fontWeight: isActive ? "bold" : "normal",
                              lineHeight: "1.2",
                            }}
                          >
                            <div style={{ fontSize: "7px", color: "#999" }}>{d.lunarName}</div>
                            <div style={{ fontSize: "9px" }}>
                              <span style={{ color: getGanZhiColor(d.gan) }}>{d.gan}</span>
                              <span style={{ color: getGanZhiColor(d.zhi) }}>{d.zhi}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* 第二行：十六到三十 */}
                  <div style={{ display: "flex", borderBottom: "1px solid #ccc", background: "#fafafa" }}>
                    <div style={{ width: "22px", borderRight: "1px solid #ccc" }}></div>
                    <div style={{ flex: 1, display: "flex" }}>
                      {liuriDays.slice(15, 30).map((d, i) => {
                        const actualIdx = i + 15;
                        const isActive = actualIdx === selectedLiuri;
                        return (
                          <div
                            key={`lr2-${i}`}
                            onClick={() => {
                              setSelectedLiuri(actualIdx);
                              setSelectedLiushi(-1);
                              setShowOverlay(true);
                              // v25.0.24: ZW-TIME 引擎宫位高亮（流日从流月宫起数）
                              const idx = d.palaceIndex !== undefined && d.palaceIndex >= 0 ? d.palaceIndex : ZHI_NAMES.indexOf(d.zhi);
                              if (idx >= 0) setFocusedPalace(idx);
                            }}
                            style={{
                              flex: 1,
                              minWidth: "0",
                              borderLeft: i > 0 ? "1px solid #ddd" : "none",
                              padding: "2px 0",
                              textAlign: "center",
                              cursor: "pointer",
                              background: isActive ? "#e8e0f0" : "#fff",
                              fontWeight: isActive ? "bold" : "normal",
                              lineHeight: "1.2",
                            }}
                          >
                            <div style={{ fontSize: "7px", color: "#999" }}>{d.lunarName}</div>
                            <div style={{ fontSize: "9px" }}>
                              <span style={{ color: getGanZhiColor(d.gan) }}>{d.gan}</span>
                              <span style={{ color: getGanZhiColor(d.zhi) }}>{d.zhi}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* v19.2: 流时行 */}
              {liushiHours.length > 0 && (
                <div style={{ display: "flex", background: "#fafafa" }}>
                  <div style={{ width: "22px", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid #ccc", fontSize: "10px", color: "#333", fontWeight: "bold", writingMode: "vertical-rl", textOrientation: "upright", letterSpacing: "2px", padding: "4px 1px", lineHeight: "1" }}>流时</div>
                  <div style={{ flex: 1, display: "flex" }}>
                    {liushiHours.map((h, i) => {
                      const isActive = i === selectedLiushi;
                      return (
                        <div
                          key={`ls-${i}`}
                          onClick={() => {
                            setSelectedLiushi(i);
                            setShowOverlay(true);
                            // v25.0.24: ZW-TIME 引擎宫位高亮（流时从流日宫起数）
                            const idx = h.palaceIndex !== undefined && h.palaceIndex >= 0 ? h.palaceIndex : ZHI_NAMES.indexOf(h.zhi);
                            if (idx >= 0) setFocusedPalace(idx);
                          }}
                          style={{
                            flex: 1,
                            borderLeft: i > 0 ? "1px solid #ccc" : "none",
                            padding: "3px 1px",
                            textAlign: "center",
                            cursor: "pointer",
                            background: isActive ? "#eee" : "#fff",
                            fontWeight: isActive ? "bold" : "normal",
                            lineHeight: "1.3",
                          }}
                        >
                          <div style={{ fontSize: "8px", color: "#666" }}>{["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"][i]}</div>
                          <div style={{ fontSize: "10px" }}>
                            <span style={{ color: getGanZhiColor(h.gan) }}>{h.gan}</span>
                            <span style={{ color: getGanZhiColor(h.zhi) }}>{h.zhi}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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

          {/* v19.2: 大运/流年/流日/流时 AI解读按钮 */}
          {decadalData.length > 0 && (
            <div className="bg-white rounded-lg p-2 mb-2 flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  const cur = decadalData[selectedDaxian];
                  if (!cur) return;
                  const sh = TIANGAN_SIHUA[cur.decadalGan];
                  const sihuaLine = sh ? `\n大限四化（${cur.decadalGan}干）：${sh.lu}化禄 ${sh.quan}化权 ${sh.ke}化科 ${sh.ji}化忌` : "";
                  const ctx = `大运：${cur.name} ${cur.decadalGan}${cur.decadalZhi} ${cur.ageRange[0]}-${cur.ageRange[1]}岁${sihuaLine}\n` +
                    result.palaces.map(p => `${p.name}(${p.heavenlyStem}${p.earthlyBranch}): 主星[${(p.majorStars||[]).join(",")}]`).join("\n");
                  handleAIInterpret("daxian", ctx);
                }}
                disabled={aiInterpreting}
                className="flex-1 min-w-[120px] py-2 rounded-lg font-bold text-sm cursor-pointer border-0 text-white disabled:opacity-60"
                style={{ background: aiInterpreting ? "#999" : BRAND_PURPLE }}
              >
                {aiInterpreting && aiScope === "daxian" ? "AI解读中..." : "🤖 AI解读此大运"}
              </button>
              <button
                onClick={() => {
                  const cur = liunianYears[selectedLiunian];
                  if (!cur) return;
                  const sh = TIANGAN_SIHUA[cur.gan];
                  const sihuaLine = sh ? `\n流年四化（${cur.gan}干）：${sh.lu}化禄 ${sh.quan}化权 ${sh.ke}化科 ${sh.ji}化忌` : "";
                  const ctx = `流年：${cur.year}年 ${cur.gan}${cur.zhi} ${cur.age}岁${sihuaLine}\n当前大运：${decadalData[selectedDaxian]?.name || ""}`;
                  handleAIInterpret("liunian", ctx);
                }}
                disabled={aiInterpreting}
                className="flex-1 min-w-[120px] py-2 rounded-lg font-bold text-sm cursor-pointer border-0 text-white disabled:opacity-60"
                style={{ background: aiInterpreting ? "#999" : BRAND_PURPLE_LIGHT }}
              >
                {aiInterpreting && aiScope === "liunian" ? "AI解读中..." : "🤖 AI解读此流年"}
              </button>
              {selectedLiuyue >= 0 && liuyueMonths[selectedLiuyue] && (
                <button
                  onClick={() => {
                    const cur = liuyueMonths[selectedLiuyue];
                    const ln = liunianYears[selectedLiunian];
                    const ctx = `流月：${cur.label} ${cur.gan}${cur.zhi}\n当前流年：${ln?.year || ""}年 ${ln?.gan || ""}${ln?.zhi || ""}`;
                    handleAIInterpret("liuyue", ctx);
                  }}
                  disabled={aiInterpreting}
                  className="flex-1 min-w-[120px] py-2 rounded-lg font-bold text-sm cursor-pointer border-0 text-white disabled:opacity-60"
                  style={{ background: aiInterpreting ? "#999" : BRAND_PURPLE_LIGHT }}
                >
                  {aiInterpreting && aiScope === "liuyue" ? "AI解读中..." : "🤖 AI解读此流月"}
                </button>
              )}
              {selectedLiuri >= 0 && liuriDays[selectedLiuri] && (
                <button
                  onClick={() => {
                    const cur = liuriDays[selectedLiuri];
                    const ctx = `流日：${cur.lunarName} ${cur.gan}${cur.zhi}\n当前流年：${liunianYears[selectedLiunian]?.year || ""}年`;
                    handleAIInterpret("liuri", ctx);
                  }}
                  disabled={aiInterpreting}
                  className="flex-1 min-w-[120px] py-2 rounded-lg font-bold text-sm cursor-pointer border-0 text-white disabled:opacity-60"
                  style={{ background: aiInterpreting ? "#999" : "#5B1A8A" }}
                >
                  {aiInterpreting && aiScope === "liuri" ? "AI解读中..." : "🤖 AI解读此流日"}
                </button>
              )}
              {selectedLiushi >= 0 && liushiHours[selectedLiushi] && (
                <button
                  onClick={() => {
                    const cur = liushiHours[selectedLiushi];
                    const ctx = `流时：${cur.gan}${cur.zhi}\n当前流日：${liuriDays[selectedLiuri]?.gan || ""}${liuriDays[selectedLiuri]?.zhi || ""}`;
                    handleAIInterpret("liushi", ctx);
                  }}
                  disabled={aiInterpreting}
                  className="flex-1 min-w-[120px] py-2 rounded-lg font-bold text-sm cursor-pointer border-0 text-white disabled:opacity-60"
                  style={{ background: aiInterpreting ? "#999" : "#4a148c" }}
                >
                  {aiInterpreting && aiScope === "liushi" ? "AI解读中..." : "🤖 AI解读此流时"}
                </button>
              )}
            </div>
          )}

          {/* ---- v25.0.24: ZW-TIME 时间轴状态卡（20260826用户指令：从命盘下方移至页面最底部；含叠宫对照行/运限四化） ---- */}
          {decadalData.length > 0 && (() => {
            // v25.0.25 修正：改用按干支对齐后的引擎大限节点（原宫序/年龄序同索引取值会错宫）
            // v25.0.41（20260819用户指令）：童限模式（起限前）无大限层，时间轴首段显示童限
            const dn = tongxianActive ? null : zwDecadalAligned[selectedDaxian];
            const txQiyun = decadalData[0]?.ageRange?.[0] || 0;
            const yn = liunianYears[selectedLiunian];
            const mn = selectedLiuyue >= 0 ? liuyueMonths[selectedLiuyue] : null;
            const dayN = selectedLiuri >= 0 ? liuriDays[selectedLiuri] : null;
            const hourN = selectedLiushi >= 0 ? liushiHours[selectedLiushi] : null;
            const deepest = hourN && hourN.palaceIndex >= 0 ? hourN
              : dayN && dayN.palaceIndex >= 0 ? dayN
              : mn && mn.palaceIndex >= 0 ? mn
              : yn && yn.palaceIndex >= 0 ? yn
              : dn && dn.palaceIndex >= 0 ? dn : null;
            const mut = hourN?.mutagen?.length === 4 ? hourN.mutagen
              : dayN?.mutagen?.length === 4 ? dayN.mutagen
              : mn?.mutagen?.length === 4 ? mn.mutagen
              : yn?.mutagen?.length === 4 ? yn.mutagen
              : dn?.mutagen?.length === 4 ? dn.mutagen : [];
            const deepestPalaceName = hourN ? "流时宫"
              : dayN ? "流日宫"
              : mn ? "流月宫"
              : yn ? "流年宫" : "大限宫";
            return (
              <div className="bg-white border border-gray-300 rounded-lg p-2" style={{ background: "linear-gradient(135deg,#F3EDF7,#fff)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap", fontSize: "10px", lineHeight: "1.5" }}>
                  <span style={{ background: BRAND_PURPLE, color: "#fff", fontWeight: "bold", padding: "1px 6px", borderRadius: "8px", fontSize: "9px" }}>ZW-TIME</span>
                  <span style={{ color: "#666" }}>时间轴：</span>
                  <span style={{ fontWeight: "bold", color: BRAND_PURPLE_DARK }}>
                    {tongxianActive ? `童限(虚岁1-${txQiyun - 1}·起限前)` : `大限${dn ? `${dn.gan}${dn.zhi}(${dn.sub})` : "-"}`}
                  </span>
                  <span style={{ color: "#999" }}>›</span>
                  <span style={{ fontWeight: "bold" }}>{yn ? `${yn.year}年${yn.gan}${yn.zhi}` : "-"}</span>
                  {mn && (<><span style={{ color: "#999" }}>›</span><span style={{ fontWeight: "bold" }}>{mn.label}</span></>)}
                  {dayN && (<><span style={{ color: "#999" }}>›</span><span style={{ fontWeight: "bold" }}>{dayN.lunarName}</span></>)}
                  {hourN && (<><span style={{ color: "#999" }}>›</span><span style={{ fontWeight: "bold" }}>{hourN.zhi}时</span></>)}
                </div>
                {deepest && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", fontSize: "10px", marginTop: "4px", lineHeight: "1.5" }}>
                    <span style={{ color: "#666" }}>{deepestPalaceName}：</span>
                    <span style={{ fontWeight: "bold", color: BRAND_PURPLE }}>
                      {deepest.palaceName ? `${deepest.palaceName}（${ZHI_NAMES[deepest.palaceIndex] || ""}宫）` : `${ZHI_NAMES[deepest.palaceIndex] || ""}宫`}
                    </span>
                    {mut.length === 4 && (
                      <>
                        <span style={{ color: "#999" }}>|</span>
                        <span style={{ color: "#666" }}>运限四化：</span>
                        {[["禄", "#16a34a"], ["权", "#ea580c"], ["科", "#2563eb"], ["忌", "#dc2626"]].map(([hua, color], k) => (
                          <span key={hua} style={{ whiteSpace: "nowrap" }}>
                            <span style={{ fontWeight: "bold" }}>{mut[k]}</span>
                            <span style={{ color: color as string, fontWeight: "bold" }}>化{hua}</span>
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                )}
                {/* v25.0.25: 叠宫对照行（大限命宫叠本命宫 / 流年命宫叠大限宫+本命宫，zwOverlayAt 跨层查询） */}
                {(() => {
                  if (!dn && !yn) return null;
                  const dxOk = dn && dn.palaceIndex >= 0;
                  const lnOk = yn && yn.palaceIndex >= 0;
                  if (!dxOk && !lnOk) return null;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap", fontSize: "9px", marginTop: "3px", lineHeight: "1.5", color: "#555" }}>
                      <span style={{ background: "#f3e8ff", color: BRAND_PURPLE_DARK, fontWeight: 700, padding: "0 4px", borderRadius: "6px", fontSize: "8px" }}>叠宫</span>
                      {dxOk && (
                        <span>
                          <span style={{ color: "#d97706", fontWeight: 700 }}>大限命宫</span>叠本命{dn.palaceName}（{ZHI_NAMES[dn.palaceIndex]}宫）
                        </span>
                      )}
                      {dxOk && lnOk && (
                        <span>
                          ｜<span style={{ color: "#2563eb", fontWeight: 700 }}>流年命宫</span>叠大限{zwOverlayAt(dn.palaceIndex, yn.palaceIndex)}宫·本命{yn.palaceName}（{ZHI_NAMES[yn.palaceIndex]}宫）
                        </span>
                      )}
                      {!dxOk && lnOk && (
                        <span>
                          <span style={{ color: "#2563eb", fontWeight: 700 }}>流年命宫</span>叠本命{yn.palaceName}（{ZHI_NAMES[yn.palaceIndex]}宫）
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* ---- 免责声明 ---- */}
          <div className="rounded-lg px-3 py-2.5 text-xs mb-2" style={{ backgroundColor: BRAND_PURPLE_BG, color: BRAND_PURPLE_LIGHT }}>
            以上内容仅供传统文化学习参考，不构成人生决策建议。命运掌握在自己手中，积极面对生活每一天。
          </div>

          {/* ---- 底部品牌 ---- */}
          <div className="py-4 text-center text-xs text-gray-300">
            言道 · 传统文化学习平台
          </div>

          {/* v19.6: 事情断法面板（AI解读统一沉底） */}
          <EventDivinationPanel toolName="紫微斗数" chartContext={chartContextSummary} />

          {/* 分享排盘结果 */}
          <div className="px-3 py-2">
            <ShareButton
              type="tool"
              title="紫微斗数排盘结果"
              description="紫微斗数命盘"
              variant="block"
              label="分享排盘结果"
              shareData={{
                toolType: "ziwei",
                title: `紫微斗数：命宫${result.earthlyBranchOfSoulPalace} · ${result.fiveElementsClass}`,
                summary: `命宫主星[${(mingPalace?.majorStars || []).join(",")}] · 五行局${result.fiveElementsClass}`,
                payload: {
                  summaryLines: chartContextSummary.split("\n").filter(Boolean),
                },
              }}
            />
        <div className="mt-2">
          <PostToSquareButton tool="紫微斗数" summary="紫微命盘已排出，星曜布局与命宫格局清晰" />
        </div>
          </div>
        </div>
      )}

      {/* v20.1: 登录提示弹窗 */}
      <LoginPromptModal show={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
      </div>
    </div>
  );
}
