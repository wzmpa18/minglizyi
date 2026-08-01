"use client";

import { useState, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";
import {
  solarToBazi,
  GAN,
  ZHI,
  GAN_WUXING,
  ZHI_WUXING,
  GAN_YIN_YANG,
  ZHI_YIN_YANG,
  getWuxingRelation,
  getShengXiao,
  getCurrentJieQi,
  getJieQiDate,
  getJieQiIndex,
  getKongwang,
  getYearGanZhi,
} from "@/algorithm-core";
import type { TianGan, DiZhi, YinYang } from "@/algorithm-core";
import ClientSelector from "@/components/ClientSelector";
import { DatePickerInline, QuickBtnGroup } from "@/components/shared";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";

// ============================================================================
// 颜色常量（严格对标截图）
// ============================================================================
const BRAND_RED = "#d93025";
const COLOR_NAV = "#bdbdbd";
const COLOR_GRAY_LABEL = "#bdbdbd";
const COLOR_GRAY_BG = "#f0f0f0";

// 五行颜色（严格对标截图：木绿/火红/土棕/金橙/水蓝）
const WX_COLOR: Record<string, string> = {
  "木": "#008000",
  "火": "#d93025",
  "土": "#b86000",
  "金": "#cc7000",
  "水": "#000080",
};

// 天干颜色（按五行）
function ganColor(gan: string): string {
  const wx = GAN_WUXING[gan as TianGan];
  return WX_COLOR[wx] || "#000";
}
// 地支颜色（按五行）
function zhiColor(zhi: string): string {
  const wx = ZHI_WUXING[zhi as DiZhi];
  return WX_COLOR[wx] || "#000";
}

// 天将颜色（严格对标截图）
const SHEN_COLOR: Record<string, string> = {
  "贵": "#b86000",
  "蛇": "#d93025", "朱": "#d93025",
  "合": "#008000", "龙": "#008000",
  "勾": "#000080", "空": "#b86000", "虎": "#cc7000", "玄": "#000080",
  "阴": "#cc7000", "后": "#0000cc",
  "常": "#b86000",
};

// ============================================================================
// 基础常量
// ============================================================================

/** 十二地支（地盘固定顺序：寅卯辰巳午未申酉戌亥子丑） */
const DZ_DIPAN: DiZhi[] = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];

/** 十二月将 */
const YUE_JIANG_LIST: DiZhi[] = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

/** 十天干 */
const TIAN_GAN_LIST: TianGan[] = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

/** 十二天将 */
const SHI_ER_SHEN = ["贵", "蛇", "朱", "合", "勾", "龙", "空", "虎", "常", "玄", "阴", "后"];

/** 十干寄宫 */
const GAN_JIGONG: Record<TianGan, DiZhi> = {
  "甲": "寅", "乙": "辰", "丙": "巳", "丁": "未", "戊": "巳",
  "己": "未", "庚": "申", "辛": "戌", "壬": "亥", "癸": "丑",
};

/** 月将名称 */
const YUE_JIANG_NAME: Record<string, string> = {
  "亥": "登明", "戌": "河魁", "酉": "从魁", "申": "传送",
  "未": "小吉", "午": "胜光", "巳": "太乙", "辰": "天罡",
  "卯": "太冲", "寅": "功曹", "丑": "大吉", "子": "神后",
};

/** 中气 -> 月将地支 */
const ZHONG_QI = ["冬至", "大寒", "雨水", "春分", "谷雨", "小满", "夏至", "大暑", "处暑", "秋分", "霜降", "小雪"];
const ZHONG_QI_YUE_JIANG: Record<string, string> = {
  "冬至": "丑", "大寒": "子", "雨水": "亥", "春分": "戌",
  "谷雨": "酉", "小满": "申", "夏至": "未", "大暑": "午",
  "处暑": "巳", "秋分": "辰", "霜降": "卯", "小雪": "寅",
};

/** 时支映射 */
const HOUR_TO_ZHI: Record<number, string> = {
  0: "子", 23: "子", 1: "丑", 2: "丑", 3: "寅", 4: "寅",
  5: "卯", 6: "卯", 7: "辰", 8: "辰", 9: "巳", 10: "巳",
  11: "午", 12: "午", 13: "未", 14: "未", 15: "申", 16: "申",
  17: "酉", 18: "酉", 19: "戌", 20: "戌", 21: "亥", 22: "亥",
};

/** 六亲映射 */
const LIU_QIN_SHORT: Record<string, string> = {
  "同我": "兄", "我生": "子", "克我": "官", "我克": "财", "生我": "父",
};

/** 720课三传查找表 */
const KE_720: Record<string, Record<string, string>> = {
  "甲子": { "子": "戌申午", "丑": "子亥戌", "寅": "寅巳申", "卯": "辰巳午", "辰": "辰午申", "巳": "申亥寅", "午": "申亥寅", "未": "辰申子", "申": "子巳戌", "酉": "寅申寅", "戌": "寅酉辰", "亥": "戌午寅" },
  "乙丑": { "子": "巳丑酉", "丑": "丑戌未", "寅": "亥酉未", "卯": "子亥戌", "辰": "辰丑戌", "巳": "寅卯辰", "午": "申戌子", "未": "未戌丑", "申": "酉丑巳", "酉": "寅未子", "戌": "戌辰戌", "亥": "卯戌巳" },
  "丙寅": { "子": "子未寅", "丑": "戌午寅", "寅": "亥申巳", "卯": "丑亥酉", "辰": "子亥戌", "巳": "巳申寅", "午": "辰巳午", "未": "辰午申", "申": "申亥寅", "酉": "酉丑巳", "戌": "子巳戌", "亥": "寅申寅" },
  "丁卯": { "子": "巳戌卯", "丑": "卯酉卯", "寅": "戌巳子", "卯": "未卯亥", "辰": "子酉午", "巳": "亥酉未", "午": "丑子亥", "未": "卯子午", "申": "辰巳午", "酉": "酉亥丑", "戌": "酉子卯", "亥": "亥卯未" },
  "戊辰": { "子": "子未寅", "丑": "子申辰", "寅": "寅亥申", "卯": "丑亥酉", "辰": "卯寅丑", "巳": "巳申寅", "午": "寅午午", "未": "申戌子", "申": "亥寅巳", "酉": "子辰申", "戌": "寅未子", "亥": "亥巳亥" },
  "己巳": { "子": "巳戌卯", "丑": "巳亥巳", "寅": "酉辰亥", "卯": "卯亥未", "辰": "寅亥申", "巳": "丑亥酉", "午": "卯寅丑", "未": "巳申寅", "申": "申申午", "酉": "亥丑卯", "戌": "申亥寅", "亥": "酉丑巳" },
  "庚午": { "子": "辰申子", "丑": "辰酉寅", "寅": "寅申寅", "卯": "戌巳子", "辰": "子申辰", "巳": "巳寅亥", "午": "寅子戌", "未": "午巳辰", "申": "申寅巳", "酉": "戌未酉", "戌": "申戌子", "亥": "酉子卯" },
  "辛未": { "子": "寅辰午", "丑": "亥丑丑", "寅": "亥卯未", "卯": "巳戌卯", "辰": "巳丑辰", "巳": "酉辰亥", "午": "卯亥未", "未": "亥未未", "申": "午辰寅", "酉": "巳辰卯", "戌": "未丑戌", "亥": "申亥寅" },
  "壬申": { "子": "丑寅卯", "丑": "子寅辰", "寅": "巳申亥", "卯": "未亥卯", "辰": "辰酉寅", "巳": "寅申寅", "午": "午丑申", "未": "子申辰", "申": "巳寅亥", "酉": "午辰寅", "戌": "戌酉申", "亥": "亥申寅" },
  "癸酉": { "子": "未午巳", "丑": "丑戌未", "寅": "亥子丑", "卯": "丑卯巳", "辰": "辰未戌", "巳": "酉丑巳", "午": "未子巳", "未": "卯酉卯", "申": "亥午丑", "酉": "巳丑酉", "戌": "午卯子", "亥": "未巳卯" },
  "甲戌": { "子": "午辰寅", "丑": "子亥戌", "寅": "寅巳申", "卯": "辰巳午", "辰": "辰午申", "巳": "申亥寅", "午": "寅午戌", "未": "子巳戌", "申": "寅申寅", "酉": "子未寅", "戌": "戌午寅", "亥": "申巳寅" },
  "乙亥": { "子": "未卯亥", "丑": "丑戌未", "寅": "酉未巳", "卯": "戌酉申", "辰": "辰亥巳", "巳": "丑寅卯", "午": "申戌子", "未": "未戌丑", "申": "未亥卯", "酉": "寅未子", "戌": "巳亥巳", "亥": "午丑申" },
  "丙子": { "子": "子未寅", "丑": "申辰子", "寅": "午卯子", "卯": "丑亥酉", "辰": "戌酉申", "巳": "巳申寅", "午": "寅卯辰", "未": "辰午申", "申": "申亥寅", "酉": "酉丑巳", "戌": "巳戌卯", "亥": "午子午" },
  "丁丑": { "子": "巳戌卯", "丑": "亥未丑", "寅": "卯戌巳", "卯": "巳丑酉", "辰": "子辰戌", "巳": "亥酉未", "午": "子亥戌", "未": "丑戌未", "申": "申酉戌", "酉": "酉亥丑", "戌": "午戌辰", "亥": "酉丑巳" },
  "戊寅": { "子": "子未寅", "丑": "戌午寅", "寅": "寅亥申", "卯": "丑亥酉", "辰": "子亥戌", "巳": "巳申寅", "午": "辰巳午", "未": "辰午申", "申": "申亥寅", "酉": "丑午酉", "戌": "子巳戌", "亥": "寅申寅" },
  "己卯": { "子": "巳戌卯", "丑": "卯酉卯", "寅": "戌巳子", "卯": "未卯亥", "辰": "子酉午", "巳": "亥酉未", "午": "丑子亥", "未": "卯子午", "申": "辰巳午", "酉": "亥丑卯", "戌": "酉子卯", "亥": "亥卯未" },
  "庚辰": { "子": "辰申子", "丑": "寅未子", "寅": "寅申寅", "卯": "午丑申", "辰": "子申辰", "巳": "巳寅亥", "午": "寅子戌", "未": "卯寅丑", "申": "申寅巳", "酉": "午未申", "戌": "申戌子", "亥": "寅巳申" },
  "辛巳": { "子": "寅辰午", "丑": "申亥寅", "寅": "酉丑巳", "卯": "卯申丑", "辰": "巳亥巳", "巳": "未寅酉", "午": "午寅戌", "未": "寅亥申", "申": "丑亥酉", "酉": "卯寅丑", "戌": "巳申寅", "亥": "午未申" },
  "壬午": { "子": "丑寅卯", "丑": "申戌子", "寅": "酉子卯", "卯": "未亥卯", "辰": "辰酉寅", "巳": "午子午", "午": "午丑申", "未": "戌午寅", "申": "巳寅亥", "酉": "寅子戌", "戌": "戌酉申", "亥": "亥午子" },
  "癸未": { "子": "巳辰卯", "丑": "丑戌未", "寅": "申寅申", "卯": "巳未酉", "辰": "辰未戌", "巳": "酉丑巳", "午": "巳戌卯", "未": "未丑未", "申": "卯戌巳", "酉": "卯亥未", "戌": "戌未辰", "亥": "巳卯丑" },
  "甲申": { "子": "午辰寅", "丑": "子亥戌", "寅": "寅巳申", "卯": "辰巳午", "辰": "辰午申", "巳": "申亥寅", "午": "申亥寅", "未": "辰申子", "申": "辰申子", "酉": "子巳戌", "戌": "寅申寅", "亥": "戌巳子" },
  "乙酉": { "子": "巳丑酉", "丑": "丑戌未", "寅": "未巳卯", "卯": "申未午", "辰": "辰酉卯", "巳": "亥子丑", "午": "申戌子", "未": "未戌丑", "申": "申子辰", "酉": "未子巳", "戌": "卯酉卯", "亥": "亥午丑" },
  "丙戌": { "子": "子未寅", "丑": "酉巳丑", "寅": "亥申巳", "卯": "丑亥酉", "辰": "卯寅丑", "巳": "巳申寅", "午": "亥子丑", "未": "子寅辰", "申": "申亥寅", "酉": "酉丑巳", "戌": "申丑午", "亥": "巳亥巳" },
  "丁亥": { "子": "巳戌卯", "丑": "巳亥巳", "寅": "午丑申", "卯": "未卯亥", "辰": "巳亥寅", "巳": "酉未巳", "午": "戌酉申", "未": "亥未丑", "申": "申酉戌", "酉": "酉亥丑", "戌": "午戌寅", "亥": "未亥卯" },
  "戊子": { "子": "子未寅", "丑": "巳申丑", "寅": "寅亥申", "卯": "丑亥酉", "辰": "戌酉申", "巳": "巳申寅", "午": "寅卯辰", "未": "辰午申", "申": "卯午酉", "酉": "辰申子", "戌": "巳戌卯", "亥": "午子午" },
  "己丑": { "子": "巳戌卯", "丑": "亥未丑", "寅": "卯戌巳", "卯": "卯亥未", "辰": "子辰戌", "巳": "亥酉未", "午": "子亥戌", "未": "丑戌未", "申": "寅卯辰", "酉": "卯巳未", "戌": "午戌辰", "亥": "酉丑巳" },
  "庚寅": { "子": "辰申子", "丑": "子巳戌", "寅": "寅申寅", "卯": "戌巳子", "辰": "子申辰", "巳": "巳寅亥", "午": "午辰寅", "未": "子亥戌", "申": "申寅巳", "酉": "辰巳午", "戌": "辰午申", "亥": "申亥寅" },
  "辛卯": { "子": "巳未酉", "丑": "酉子卯", "寅": "亥卯未", "卯": "卯申丑", "辰": "卯酉卯", "巳": "戌巳子", "午": "未卯亥", "未": "子未子", "申": "亥酉未", "酉": "丑子亥", "戌": "卯子午", "亥": "辰巳午" },
  "壬辰": { "子": "丑寅卯", "丑": "申戌子", "寅": "戌丑辰", "卯": "未亥卯", "辰": "寅未子", "巳": "巳亥巳", "午": "午丑申", "未": "子申辰", "申": "巳寅亥", "酉": "寅子戌", "戌": "戌酉申", "亥": "亥辰戌" },
  "癸巳": { "子": "卯寅丑", "丑": "丑戌未", "寅": "未申酉", "卯": "未酉亥", "辰": "申亥寅", "巳": "酉丑巳", "午": "午亥辰", "未": "巳亥巳", "申": "卯戌巳", "酉": "巳丑酉", "戌": "戌未辰", "亥": "丑亥酉" },
  "甲午": { "子": "寅子戌", "丑": "子亥戌", "寅": "寅巳申", "卯": "辰巳午", "辰": "辰午申", "巳": "申亥寅", "午": "寅午戌", "未": "子巳戌", "申": "寅申寅", "酉": "酉辰亥", "戌": "戌午寅", "亥": "申巳寅" },
  "乙未": { "子": "卯亥未", "丑": "丑戌未", "寅": "亥寅巳", "卯": "戌卯午", "辰": "辰未丑", "巳": "酉戌亥", "午": "申戌子", "未": "未戌丑", "申": "亥卯未", "酉": "巳戌卯", "戌": "戌辰戌", "亥": "午丑申" },
  "丙申": { "子": "戌巳子", "丑": "子申辰", "寅": "巳寅亥", "卯": "丑亥酉", "辰": "卯寅丑", "巳": "巳申寅", "午": "酉戌亥", "未": "子寅辰", "申": "申亥寅", "酉": "酉丑巳", "戌": "卯申丑", "亥": "寅申寅" },
  "丁酉": { "子": "未子巳", "丑": "卯酉卯", "寅": "亥午丑", "卯": "巳丑酉", "辰": "午卯子", "巳": "丑巳巳", "午": "申未午", "未": "酉未丑", "申": "亥子丑", "酉": "酉亥丑", "戌": "子卯午", "亥": "亥卯未" },
  "戊戌": { "子": "子未寅", "丑": "寅戌午", "寅": "寅亥申", "卯": "丑亥酉", "辰": "卯寅丑", "巳": "巳申寅", "午": "亥子丑", "未": "子寅辰", "申": "亥寅巳", "酉": "寅午戌", "戌": "申丑午", "亥": "亥巳亥" },
  "己亥": { "子": "巳戌卯", "丑": "巳亥巳", "寅": "午丑申", "卯": "未卯亥", "辰": "巳寅亥", "巳": "卯丑亥", "午": "戌酉申", "未": "亥未丑", "申": "丑寅卯", "酉": "丑卯巳", "戌": "寅巳申", "亥": "亥卯未" },
  "庚子": { "子": "辰申子", "丑": "巳戌卯", "寅": "寅申寅", "卯": "戌巳子", "辰": "子申辰", "巳": "午卯子", "午": "午辰寅", "未": "戌酉申", "申": "申寅巳", "酉": "寅卯辰", "戌": "辰午申", "亥": "午酉子" },
  "辛丑": { "子": "卯巳未", "丑": "巳丑丑", "寅": "酉丑巳", "卯": "卯申丑", "辰": "亥未辰", "巳": "卯戌巳", "午": "巳丑酉", "未": "巳未未", "申": "亥酉未", "酉": "子亥戌", "戌": "丑戌未", "亥": "寅卯辰" },
  "壬寅": { "子": "辰巳午", "丑": "辰午申", "寅": "申亥寅", "卯": "未亥卯", "辰": "子巳戌", "巳": "寅申寅", "午": "午丑申", "未": "戌午寅", "申": "巳寅亥", "酉": "戌申午", "戌": "子亥戌", "亥": "亥寅巳" },
  "癸卯": { "子": "丑子亥", "丑": "丑戌未", "寅": "辰巳午", "卯": "未酉亥", "辰": "酉子卯", "巳": "酉丑巳", "午": "午亥辰", "未": "卯酉卯", "申": "卯戌巳", "酉": "未亥卯", "戌": "戌未辰", "亥": "亥酉未" },
  "甲辰": { "子": "寅子戌", "丑": "子亥戌", "寅": "寅巳申", "卯": "辰巳午", "辰": "辰午申", "巳": "申亥寅", "午": "申子辰", "未": "子巳戌", "申": "寅申寅", "酉": "午丑申", "戌": "子申辰", "亥": "申巳寅" },
  "乙巳": { "子": "酉巳丑", "丑": "丑戌未", "寅": "丑亥酉", "卯": "卯寅丑", "辰": "辰巳申", "巳": "未申酉", "午": "申戌子", "未": "未戌丑", "申": "酉丑巳", "酉": "寅未子", "戌": "巳亥巳", "亥": "午丑申" },
  "丙午": { "子": "子未寅", "丑": "戌午寅", "寅": "子酉午", "卯": "丑亥酉", "辰": "卯寅丑", "巳": "巳申寅", "午": "申酉戌", "未": "申戌子", "申": "申亥寅", "酉": "酉丑巳", "戌": "辰酉寅", "亥": "午子午" },
  "丁未": { "子": "巳戌卯", "丑": "巳丑丑", "寅": "酉辰亥", "卯": "卯亥未", "辰": "亥辰辰", "巳": "丑巳巳", "午": "卯午午", "未": "未丑戌", "申": "申酉戌", "酉": "酉亥丑", "戌": "亥戌戌", "亥": "亥卯未" },
  "戊申": { "子": "子未寅", "丑": "子申辰", "寅": "寅亥申", "卯": "丑亥酉", "辰": "卯寅丑", "巳": "巳申寅", "午": "戌酉午", "未": "子寅辰", "申": "寅巳申", "酉": "辰申子", "戌": "卯申丑", "亥": "寅申寅" },
  "己酉": { "子": "未子巳", "丑": "卯酉卯", "寅": "亥午丑", "卯": "卯亥未", "辰": "午卯子", "巳": "卯丑亥", "午": "戌午申", "未": "酉未丑", "申": "亥子丑", "酉": "丑卯巳", "戌": "卯午酉", "亥": "亥卯未" },
  "庚戌": { "子": "辰申子", "丑": "申丑午", "寅": "寅申寅", "卯": "戌巳子", "辰": "子申辰", "巳": "巳寅亥", "午": "午辰寅", "未": "午巳辰", "申": "申寅巳", "酉": "亥子丑", "戌": "子寅辰", "亥": "寅巳申" },
  "辛亥": { "子": "丑卯巳", "丑": "巳申亥", "寅": "未亥卯", "卯": "卯申丑", "辰": "巳亥巳", "巳": "午丑申", "午": "未卯亥", "未": "巳寅亥", "申": "午辰寅", "酉": "戌酉申", "戌": "亥戌未", "亥": "丑寅卯" },
  "壬子": { "子": "寅卯辰", "丑": "辰午申", "寅": "午酉子", "卯": "未亥卯", "辰": "巳戌卯", "巳": "午子午", "午": "午丑申", "未": "未卯亥", "申": "午卯子", "酉": "戌申午", "戌": "戌酉申", "亥": "亥子卯" },
  "癸丑": { "子": "子亥戌", "丑": "丑戌未", "寅": "寅卯辰", "卯": "卯巳未", "辰": "辰未戌", "巳": "酉丑巳", "午": "午亥辰", "未": "未丑未", "申": "卯戌巳", "酉": "巳丑酉", "戌": "戌未辰", "亥": "亥酉未" },
  "甲寅": { "子": "戌申午", "丑": "子亥戌", "寅": "寅巳申", "卯": "辰巳午", "辰": "辰午申", "巳": "申亥寅", "午": "申午午", "未": "子巳戌", "申": "寅申寅", "酉": "酉辰亥", "戌": "戌午寅", "亥": "丑亥亥" },
  "乙卯": { "子": "未卯亥", "丑": "丑戌未", "寅": "亥酉未", "卯": "丑子亥", "辰": "辰卯子", "巳": "辰巳午", "午": "申戌子", "未": "酉子卯", "申": "亥卯未", "酉": "寅未子", "戌": "卯酉卯", "亥": "午丑申" },
  "丙辰": { "子": "午丑申", "丑": "子申辰", "寅": "亥申巳", "卯": "丑亥酉", "辰": "卯寅丑", "巳": "巳申寅", "午": "亥午午", "未": "申戌子", "申": "申亥寅", "酉": "酉丑巳", "戌": "寅未子", "亥": "巳亥巳" },
  "丁巳": { "子": "巳戌卯", "丑": "巳亥巳", "寅": "酉辰亥", "卯": "亥未卯", "辰": "亥申巳", "巳": "丑亥酉", "午": "卯寅丑", "未": "巳申寅", "申": "申酉戌", "酉": "酉亥丑", "戌": "申亥寅", "亥": "酉丑巳" },
  "戊午": { "子": "子未寅", "丑": "戌午申", "寅": "寅亥申", "卯": "丑亥酉", "辰": "卯寅丑", "巳": "巳申寅", "午": "寅午午", "未": "申戌子", "申": "酉子卯", "酉": "寅午戌", "戌": "辰酉寅", "亥": "午子午" },
  "己未": { "子": "巳戌卯", "丑": "巳丑丑", "寅": "酉辰亥", "卯": "卯亥未", "辰": "亥辰辰", "巳": "丑巳巳", "午": "卯午午", "未": "未丑戌", "申": "未申申", "酉": "酉酉酉", "戌": "亥戌戌", "亥": "亥卯未" },
  "庚申": { "子": "辰申子", "丑": "卯丑丑", "寅": "寅申寅", "卯": "戌巳子", "辰": "子申辰", "巳": "巳寅亥", "午": "午辰寅", "未": "酉未未", "申": "申寅巳", "酉": "亥酉酉", "戌": "子寅辰", "亥": "丑亥亥" },
  "辛酉": { "子": "丑卯巳", "丑": "卯午酉", "寅": "寅午戌", "卯": "未子巳", "辰": "卯酉卯", "巳": "亥午丑", "午": "巳丑酉", "未": "午卯子", "申": "午辰寅", "酉": "丑酉酉", "戌": "酉戌未", "亥": "亥子丑" },
  "壬戌": { "子": "亥子丑", "丑": "子寅辰", "寅": "辰未戌", "卯": "未亥卯", "辰": "辰酉寅", "巳": "巳亥巳", "午": "午丑申", "未": "未卯亥", "申": "巳寅亥", "酉": "午辰寅", "戌": "戌酉申", "亥": "亥戌未" },
  "癸亥": { "子": "戌酉申", "丑": "丑戌未", "寅": "丑寅卯", "卯": "丑卯巳", "辰": "辰未戌", "巳": "酉丑巳", "午": "午亥辰", "未": "巳亥巳", "申": "卯戌巳", "酉": "未卯亥", "戌": "巳寅亥", "亥": "未巳卯" },
};

// ============================================================================
// 辅助函数
// ============================================================================

function circularList<T>(arr: T[], startIdx: number, forward: boolean = true): () => T {
  let idx = startIdx;
  const len = arr.length;
  return () => {
    const item = arr[idx];
    idx = forward ? (idx + 1) % len : (idx - 1 + len) % len;
    return item;
  };
}

function getGanColor(gan: string): string {
  const wx = GAN_WUXING[gan as TianGan];
  return WX_COLOR[wx] || "#000";
}

function getZhiColor(zhi: string): string {
  const wx = ZHI_WUXING[zhi as DiZhi];
  return WX_COLOR[wx] || "#000";
}

function getYueJiang(year: number, month: number, day: number): { zhi: string; name: string; zhongQi: string } {
  // P0 Bug 3 修复：使用精确节气日期计算月将，处理跨年情况（1月需检查前一年冬至/大寒）
  const targetDate = new Date(year, month - 1, day);
  let best: { zhi: string; name: string; zhongQi: string; date: Date } | null = null;

  // 检查前一年和当年的所有中气，找到 targetDate 之前最近的一个中气
  for (const y of [year - 1, year]) {
    for (let i = 0; i < ZHONG_QI.length; i++) {
      const zq = ZHONG_QI[i];
      const zqIndex = getJieQiIndex(zq);
      if (zqIndex === -1) continue;
      const zqDate = getJieQiDate(y, zqIndex);
      if (zqDate <= targetDate) {
        if (!best || zqDate.getTime() > best.date.getTime()) {
          const yjZhi = ZHONG_QI_YUE_JIANG[zq];
          if (yjZhi) best = { zhi: yjZhi, name: YUE_JIANG_NAME[yjZhi] ?? "", zhongQi: zq, date: zqDate };
        }
      }
    }
  }

  if (best) return { zhi: best.zhi, name: best.name, zhongQi: best.zhongQi };
  return { zhi: "丑", name: "大吉", zhongQi: "冬至" };
}

function tianYiGuiRen(dayGan: TianGan, isDaytime: boolean): string {
  const map: Record<string, [string, string]> = {
    "甲": ["丑", "未"], "戊": ["丑", "未"], "庚": ["丑", "未"],
    "乙": ["子", "申"], "己": ["子", "申"],
    "丙": ["亥", "酉"], "丁": ["亥", "酉"],
    "壬": ["巳", "卯"], "癸": ["巳", "卯"],
    "辛": ["午", "寅"],
  };
  return isDaytime ? map[dayGan][0] : map[dayGan][1];
}

function getLiuQin(dayGan: TianGan, zhi: string): string {
  const ganWx = GAN_WUXING[dayGan];
  const zhiWx = ZHI_WUXING[zhi as DiZhi];
  const relation = getWuxingRelation(ganWx, zhiWx);
  return LIU_QIN_SHORT[relation] ?? "";
}

function formatDate(y: number, m: number, d: number, h: number, min: number): string {
  return `${y}年${String(m).padStart(2, "0")}月${String(d).padStart(2, "0")}日 ${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** 简单农历日期估算（非精确，仅用于显示） */
function getLunarDateApprox(y: number, m: number, d: number): string {
  const lunarMonths = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
  const lunarDays = [
    "初一","初二","初三","初四","初五","初六","初七","初八","初九","初十",
    "十一","十二","十三","十四","十五","十六","十七","十八","十九","二十",
    "廿一","廿二","廿三","廿四","廿五","廿六","廿七","廿八","廿九","三十"
  ];
  const lm = Math.max(0, m - 1);
  const ld = Math.min(29, Math.max(0, d - 1));
  return `${lunarMonths[lm]}月${lunarDays[ld]}`;
}

// ============================================================================
// 排盘数据类型
// ============================================================================

interface PanMap {
  [key: string]: string;
}

interface SanChuanItem {
  zhi: string;
  gan: string;
  shen: string;
  liuqin: string;
}

interface SiKeItem {
  xiaShen: string;
  shangShen: string;
  tianJiang: string;
  dunGan?: string;
}

interface DaLiuRenResult {
  year: number; month: number; day: number; hour: number; minute: number;
  dateStr: string;
  lunarDate: string;
  zhanbuTime: string;
  jieqiInfo: string;
  siZhu: [string, string][];
  yuejiangZhi: string;
  yuejiangName: string;
  isMan: boolean;
  birthYear: number;
  yearGanzhi: string;
  benMing: string;
  xingYear: string;
  shengXiao: string;
  kongwang: [string, string];
  dayGan: TianGan;
  dayZhi: DiZhi;
  isDaytime: boolean;
  yueJiangMap: PanMap;
  guiShenMap: PanMap;
  tianGanMap: PanMap;
  siKe: SiKeItem[];
  sanChuan: SanChuanItem[];
  sanChuanMethod: string;
  keTi: string;
  shensha: { label: string; value: string }[];
  zixuanShensha: { label: string; value: string }[];
}

// ============================================================================
// 核心排盘算法（保留原样）
// ============================================================================

function calculateDaLiuRen(
  year: number, month: number, day: number, hour: number, minute: number,
  isMan: boolean, birthYear?: number
): DaLiuRenResult {
  const bazi = solarToBazi({ year, month, day, hour, minute, gender: isMan ? "male" : "female" });
  const pillars = bazi.pillars;
  const siZhu: [string, string][] = pillars.map((p) => [p.gan, p.zhi]) as [string, string][];
  const dayGan = siZhu[2][0] as TianGan;
  const dayZhi = siZhu[2][1] as DiZhi;
  const yearGanZhi = siZhu[0][0] + siZhu[0][1];

  const yj = getYueJiang(year, month, day);
  const yuejiangZhi = yj.zhi;
  const yuejiangName = yj.name;

  const zhanbuTime = HOUR_TO_ZHI[hour] ?? "子";
  // P0 Bug 2 修复：昼夜贵人分界——卯时(5:00)到申时(15-17点前)为昼贵，酉时(17:00)起为夜贵
  const isDaytime = hour >= 5 && hour < 17;

  const currentJieQi = getCurrentJieQi(new Date(year, month - 1, day, hour, minute));
  const jieqiInfo = currentJieQi.name;

  const kw = getKongwang(siZhu[2][0] + siZhu[2][1]) ?? "戌亥";
  const kongwang: [string, string] = [kw[0], kw[1]];

  const by = birthYear ?? year;
  const benMingGanZhi = getYearGanZhi(by);
  const shengXiao = getShengXiao(benMingGanZhi[1] as DiZhi);

  const age = year - by;
  let xingYearGZ: string;
  if (isMan) {
    const gIdx = (GAN.indexOf("丙") + age) % 10;
    const zIdx = (ZHI.indexOf("寅") + age) % 12;
    xingYearGZ = GAN[gIdx] + ZHI[zIdx];
  } else {
    const gIdx = (GAN.indexOf("壬") + (120 - age) % 10) % 10;
    const zIdx = (ZHI.indexOf("申") + (120 - age) % 12) % 12;
    xingYearGZ = GAN[gIdx] + ZHI[zIdx];
  }

  const yjIdx = YUE_JIANG_LIST.indexOf(yuejiangZhi as DiZhi);
  const yjIter = circularList(YUE_JIANG_LIST, yjIdx, true);
  const zhanbuIdx = DZ_DIPAN.indexOf(zhanbuTime as DiZhi);
  const yueJiangMap: PanMap = {};
  for (let i = zhanbuIdx; i < 12; i++) yueJiangMap[DZ_DIPAN[i]] = yjIter();
  for (let i = 0; i < zhanbuIdx; i++) yueJiangMap[DZ_DIPAN[i]] = yjIter();

  const guirenZhi = tianYiGuiRen(dayGan, isDaytime);
  let guirenDipanIdx = -1;
  for (let i = 0; i < 12; i++) {
    if (yueJiangMap[DZ_DIPAN[i]] === guirenZhi) { guirenDipanIdx = i; break; }
  }
  if (guirenDipanIdx === -1) guirenDipanIdx = 0;
  const guirenDipan = DZ_DIPAN[guirenDipanIdx];
  const isShun = "亥子丑寅卯辰".includes(guirenDipan);
  const shenIter = circularList(SHI_ER_SHEN, 0, isShun);
  const guiShenMap: PanMap = {};
  for (let i = guirenDipanIdx; i < 12; i++) guiShenMap[DZ_DIPAN[i]] = shenIter();
  for (let i = 0; i < guirenDipanIdx; i++) guiShenMap[DZ_DIPAN[i]] = shenIter();

  let riZhiDipanIdx = -1;
  for (let i = 0; i < 12; i++) {
    if (yueJiangMap[DZ_DIPAN[i]] === dayZhi) { riZhiDipanIdx = i; break; }
  }
  if (riZhiDipanIdx === -1) riZhiDipanIdx = 0;
  const ganIdx = TIAN_GAN_LIST.indexOf(dayGan);
  const tianGanExt = [...TIAN_GAN_LIST, "〇", "〇"];
  const ganIter = circularList(tianGanExt, ganIdx, true);
  const tianGanMap: PanMap = {};
  for (let i = riZhiDipanIdx; i < 12; i++) tianGanMap[DZ_DIPAN[i]] = ganIter();
  for (let i = 0; i < riZhiDipanIdx; i++) tianGanMap[DZ_DIPAN[i]] = ganIter();

  const jigong = GAN_JIGONG[dayGan];
  const ganYang = yueJiangMap[jigong];
  const ganYangTJ = guiShenMap[jigong];
  const ganYangDG = tianGanMap[jigong];
  const ganYin = yueJiangMap[ganYang];
  const ganYinTJ = guiShenMap[ganYang];
  const ganYinDG = tianGanMap[ganYang];

  const zhiYang = yueJiangMap[dayZhi];
  const zhiYangTJ = guiShenMap[dayZhi];
  const zhiYangDG = tianGanMap[dayZhi];
  const zhiYin = yueJiangMap[zhiYang];
  const zhiYinTJ = guiShenMap[zhiYang];
  const zhiYinDG = tianGanMap[zhiYang];

  const siKe: SiKeItem[] = [
    { xiaShen: jigong, shangShen: ganYang, tianJiang: ganYangTJ, dunGan: ganYangDG },
    { xiaShen: ganYang, shangShen: ganYin, tianJiang: ganYinTJ, dunGan: ganYinDG },
    { xiaShen: dayZhi, shangShen: zhiYang, tianJiang: zhiYangTJ, dunGan: zhiYangDG },
    { xiaShen: zhiYang, shangShen: zhiYin, tianJiang: zhiYinTJ, dunGan: zhiYinDG },
  ];

  const ganZhi = dayGan + dayZhi;
  const ke720 = KE_720[ganZhi];
  let sanChuanZhi: string[] = [];

  // P0 Bug 1 修复：使用720课查找表（以干阳/第一课上神为键），不再随机
  if (ke720 && ke720[ganYang]) {
    sanChuanZhi = ke720[ganYang].split("");
  } else {
    sanChuanZhi = [ganYang, ganYin, zhiYang];
  }

  // ============================================================================
  // P0 Bug 1 修复：九宗门课体判定（不再随机，根据四课天地盘实际关系判定）
  // ============================================================================

  /** 地支对冲（六冲） */
  const chongMap: Record<string, string> = {
    "子": "午", "午": "子", "丑": "未", "未": "丑", "寅": "申", "申": "寅",
    "卯": "酉", "酉": "卯", "辰": "戌", "戌": "辰", "巳": "亥", "亥": "巳",
  };

  /** 天干阴阳 */
  const dayGanYy: YinYang = GAN_YIN_YANG[dayGan];

  /** 判断两个地支的克关系：返回 "shangKeXia"(上克下) | "xiaKeShang"(下克上) | "none" */
  function zhiKe(above: string, below: string): "shangKeXia" | "xiaKeShang" | "none" {
    const aWx = ZHI_WUXING[above as DiZhi];
    const bWx = ZHI_WUXING[below as DiZhi];
    if (!aWx || !bWx) return "none";
    const r_ab = getWuxingRelation(aWx, bWx); // above 对 below
    const r_ba = getWuxingRelation(bWx, aWx); // below 对 above
    if (r_ab === "我克") return "shangKeXia"; // above克below
    if (r_ba === "我克") return "xiaKeShang"; // below克above
    return "none";
  }

  // ---- 1. 伏吟课：月将=占时，天地盘完全重合（天盘=地盘） ----
  const isFuYin = (yuejiangZhi === zhanbuTime);

  // ---- 2. 反吟课：天盘与地盘对冲（月将与占时差6位，即对冲） ----
  const isFanYin = (chongMap[yuejiangZhi] === zhanbuTime);

  // ---- 3. 八专课：干支同位（日干寄宫=日支），四课只有两课 ----
  const isBaZhuan = (jigong === dayZhi);

  // ---- 4. 分析四课克贼 ----
  // 每课的克贼关系
  interface KeRelation {
    index: number;      // 课序号 0-3
    xiaShen: string;    // 下神
    shangShen: string;  // 上神
    keType: "shangKeXia" | "xiaKeShang" | "none";
  }
  const keRels: KeRelation[] = siKe.map((k, i) => ({
    index: i,
    xiaShen: k.xiaShen,
    shangShen: k.shangShen,
    keType: zhiKe(k.shangShen, k.xiaShen),
  }));

  // 下克上（贼）列表
  const zeiList = keRels.filter(k => k.keType === "xiaKeShang");
  // 上克下（克）列表
  const keList = keRels.filter(k => k.keType === "shangKeXia");

  // ---- 5. 遥克：日干与四课上神的克（非直接上下克） ----
  /** 天干五行 */
  const dayGanWx = GAN_WUXING[dayGan];
  interface YaoKeItem {
    index: number;
    shangShen: string;
    type: "shenKeRi" | "riKeShen"; // 神克日=蒿矢, 日克神=弹射
  }
  const yaoKeList: YaoKeItem[] = [];
  if (zeiList.length === 0 && keList.length === 0 && !isFuYin && !isFanYin && !isBaZhuan) {
    for (let i = 0; i < 4; i++) {
      const ss = siKe[i].shangShen;
      const ssWx = ZHI_WUXING[ss as DiZhi];
      if (!ssWx) continue;
      const r_gan_ss = getWuxingRelation(dayGanWx, ssWx);
      const r_ss_gan = getWuxingRelation(ssWx, dayGanWx);
      if (r_ss_gan === "我克") yaoKeList.push({ index: i, shangShen: ss, type: "shenKeRi" });
      else if (r_gan_ss === "我克") yaoKeList.push({ index: i, shangShen: ss, type: "riKeShen" });
    }
  }

  // ---- 6. 比和：与日干阴阳相同 ----
  function isBi(zhi: string): boolean {
    const zYy = ZHI_YIN_YANG[zhi as DiZhi];
    return zYy === dayGanYy;
  }

  // ---- 综合判定课体和三传方法 ----
  let sanChuanMethod = "贼克";
  let keTi = "元首课";

  if (isFuYin) {
    sanChuanMethod = "伏吟";
    keTi = "伏吟课";
  } else if (isFanYin) {
    sanChuanMethod = "反吟";
    keTi = "反吟课";
  } else if (isBaZhuan) {
    sanChuanMethod = "八专";
    keTi = "八专课";
  } else {
    // 检查四课不全（别责）：第一课=第三课 或 第二课=第四课（有重复但非八专）
    const isBieZe = (
      (siKe[0].shangShen === siKe[2].shangShen && siKe[0].xiaShen === siKe[2].xiaShen) ||
      (siKe[1].shangShen === siKe[3].shangShen && siKe[1].xiaShen === siKe[3].xiaShen)
    );

    if (isBieZe) {
      sanChuanMethod = "别责";
      keTi = "别责课";
    } else if (zeiList.length === 0 && keList.length === 0) {
      // 四课无克
      if (yaoKeList.length > 0) {
        sanChuanMethod = "遥克";
        // 判断蒿矢/弹射
        const hasShenKeRi = yaoKeList.some(y => y.type === "shenKeRi");
        keTi = hasShenKeRi ? "蒿矢课" : "弹射课";
      } else {
        sanChuanMethod = "昴星";
        keTi = dayGanYy === "阳" ? "虎视课" : "冬蛇掩目课";
      }
    } else if (zeiList.length >= 1 || keList.length >= 1) {
      // 有克贼
      if (zeiList.length === 1 && keList.length === 0) {
        // 只有一个下克上 → 重审
        sanChuanMethod = "贼克";
        keTi = "重审课";
      } else if (zeiList.length === 0 && keList.length === 1) {
        // 只有一个上克下 → 元首
        sanChuanMethod = "贼克";
        keTi = "元首课";
      } else {
        // 多个克贼，用比用/涉害
        // 贼(下克上)优先于克(上克下)
        const priorityList = zeiList.length > 0 ? zeiList : keList;
        // 取与日干阴阳比和者
        const biList = priorityList.filter(k => isBi(k.shangShen));

        if (biList.length === 1) {
          sanChuanMethod = "比用";
          keTi = "第一课";
        } else {
          // 多个比和或无比和 → 涉害
          sanChuanMethod = "涉害";
          keTi = "涉害课";
        }
      }
    }
  }

  // 构建反向映射：天盘地支 → 地盘地支，用于三传天干查找
  const tianPanToDiPan: PanMap = {};
  for (let i = 0; i < 12; i++) {
    const dp = DZ_DIPAN[i];
    const tp = yueJiangMap[dp];
    tianPanToDiPan[tp] = dp;
  }

  const sanChuan: SanChuanItem[] = [];
  for (const scZhi of sanChuanZhi) {
    // 通过反向映射：传支(天盘) → 地盘地支 → 天干(遁干)
    const scDipan = tianPanToDiPan[scZhi] ?? DZ_DIPAN[0];
    const scGan = tianGanMap[scDipan] ?? "";
    const scShen = guiShenMap[scDipan] ?? "";
    const scLiuqin = getLiuQin(dayGan, scZhi);
    sanChuan.push({ zhi: scZhi, gan: scGan, shen: scShen, liuqin: scLiuqin });
  }

  const yueJianZhi = siZhu[1][1];
  const jiaziTable = ["甲子","乙丑","丙寅","丁卯","戊辰","己巳","庚午","辛未","壬申","癸酉","甲戌","乙亥","丙子","丁丑","戊寅","己卯","庚辰","辛巳","壬午","癸未","甲申","乙酉","丙戌","丁亥","戊子","己丑","庚寅","辛卯","壬辰","癸巳","甲午","乙未","丙申","丁酉","戊戌","己亥","庚子","辛丑","壬寅","癸卯","甲辰","乙巳","丙午","丁未","戊申","己酉","庚戌","辛亥","壬子","癸丑","甲寅","乙卯","丙辰","丁巳","戊午","己未","庚申","辛酉","壬戌","癸亥"];
  const getXunShouWei = () => {
    const jzIdx = (GAN.indexOf(dayGan) * 6 - ZHI.indexOf(dayZhi) * 5 + 600) % 60;
    const xunIdx = Math.floor(jzIdx / 10) * 10;
    return { shou: jiaziTable[xunIdx] ?? "", wei: jiaziTable[xunIdx + 9] ?? "" };
  };
  const xunSW = getXunShouWei();

  const shensha: { label: string; value: string }[] = [
    { label: "本命", value: benMingGanZhi },
    { label: "行年", value: xingYearGZ },
    { label: "月将", value: yuejiangZhi + yuejiangName },
    { label: "日空", value: kongwang.join("") },
    { label: "时空", value: (() => {
      const szKw = getKongwang(siZhu[3][0] + siZhu[3][1]);
      return szKw ?? "";
    })() },
    { label: "旬首", value: xunSW.shou },
    { label: "旬尾", value: xunSW.wei },
    { label: "太歲", value: yearGanZhi },
    { label: "月建", value: siZhu[1][0] + siZhu[1][1] },
    { label: "日建", value: dayGan + dayZhi },
    { label: "月破", value: (() => {
      const chongMap: Record<string, string> = { "子":"午","午":"子","丑":"未","未":"丑","寅":"申","申":"寅","卯":"酉","酉":"卯","辰":"戌","戌":"辰","巳":"亥","亥":"巳" };
      return chongMap[yueJianZhi] ?? "";
    })() },
    { label: "日德", value: (() => {
      const deMap: Record<string, string> = { "甲":"寅","乙":"卯","丙":"巳","丁":"午","戊":"巳","己":"午","庚":"申","辛":"酉","壬":"亥","癸":"子" };
      return deMap[dayGan] ?? "";
    })() },
    { label: "日祿", value: (() => {
      const luMap: Record<string, string> = { "甲":"寅","乙":"卯","丙":"巳","丁":"午","戊":"巳","己":"午","庚":"申","辛":"酉","壬":"亥","癸":"子" };
      return luMap[dayGan] ?? "";
    })() },
    { label: "日馬", value: (() => {
      const maMap: Record<string, string> = { "申":"寅","子":"寅","辰":"寅","寅":"申","午":"申","戌":"申","巳":"亥","酉":"亥","丑":"亥","亥":"巳","卯":"巳","未":"巳" };
      return maMap[dayZhi] ?? "";
    })() },
    { label: "旬丁", value: (() => {
      const dingMap: Record<string, string> = { "甲":"未","乙":"酉","丙":"亥","丁":"丑","戊":"未","己":"酉","庚":"亥","辛":"丑","壬":"未","癸":"酉" };
      return dingMap[dayGan] ?? "";
    })() },
    { label: "生氣", value: (() => {
      const shengQiMap: Record<string, string> = { "子":"午","丑":"未","寅":"申","卯":"酉","辰":"戌","巳":"亥","午":"子","未":"丑","申":"寅","酉":"卯","戌":"辰","亥":"巳" };
      return shengQiMap[yueJianZhi] ?? "";
    })() },
    { label: "桃花", value: (() => {
      const taoHuaMap: Record<string, string> = { "申":"酉","子":"酉","辰":"酉","寅":"卯","午":"卯","戌":"卯","巳":"午","酉":"午","丑":"午","亥":"子","卯":"子","未":"子" };
      return taoHuaMap[dayZhi] ?? "";
    })() },
    { label: "天喜", value: (() => {
      const tianXiMap: Record<string, string> = { "子":"酉","丑":"戌","寅":"亥","卯":"子","辰":"丑","巳":"寅","午":"卯","未":"辰","申":"巳","酉":"午","戌":"未","亥":"申" };
      return tianXiMap[yueJianZhi] ?? "";
    })() },
  ];

  const zixuanShensha: { label: string; value: string }[] = [
    { label: "天德", value: (() => {
      const tdMap: Record<number, string> = { 1:"丁",2:"申",3:"壬",4:"辛",5:"亥",6:"甲",7:"癸",8:"寅",9:"丙",10:"乙",11:"巳",12:"庚" };
      return tdMap[month] ?? "";
    })() },
    { label: "月德", value: (() => {
      const ydMap: Record<number, string> = { 1:"丙",2:"甲",3:"壬",4:"庚",5:"丙",6:"甲",7:"壬",8:"庚",9:"丙",10:"甲",11:"壬",12:"庚" };
      return ydMap[month] ?? "";
    })() },
  ];

  return {
    year, month, day, hour, minute,
    dateStr: formatDate(year, month, day, hour, minute),
    lunarDate: getLunarDateApprox(year, month, day),
    zhanbuTime,
    jieqiInfo,
    siZhu,
    yuejiangZhi,
    yuejiangName,
    isMan,
    birthYear: by,
    yearGanzhi: yearGanZhi,
    benMing: benMingGanZhi,
    xingYear: xingYearGZ,
    shengXiao,
    kongwang,
    dayGan,
    dayZhi,
    isDaytime,
    yueJiangMap,
    guiShenMap,
    tianGanMap,
    siKe,
    sanChuan,
    sanChuanMethod,
    keTi,
    shensha,
    zixuanShensha,
  };
}

// ============================================================================
// UI 辅助函数
// ============================================================================

const TAB_BLUE = "#007aff";

/** 天将颜色：贵始终红色，其余按SHEN_COLOR */
function shenColor(shen: string): string {
  if (shen === "贵") return BRAND_RED;
  return SHEN_COLOR[shen] || "#000";
}

/** 天干颜色：日干始终红色，其余按五行 */
function ganColorRender(gan: string, dayGan: string): string {
  if (gan === dayGan) return BRAND_RED;
  return getGanColor(gan);
}

/** 地支颜色：空亡仅加边框不改色；日干(若同字)红 */
function zhiColorRender(zhi: string, dayGan: string): string {
  if (zhi === dayGan) return BRAND_RED;
  return getZhiColor(zhi);
}

// ============================================================================
// 输入表单（内嵌折叠面板，点击header编辑按钮展开）
// ============================================================================

function InputPanel({
  show, onClose, onSubmit, selectedClient, onClientSelect, initialValues,
}: {
  show: boolean;
  onClose: () => void;
  onSubmit: (params: { year: number; month: number; day: number; hour: number; minute: number; isMan: boolean; birthYear: number }) => void;
  selectedClient: Client|null;
  onClientSelect: (c: Client|null) => void;
  initialValues?: { year: number; month: number; day: number; hour: number; minute: number; isMan: boolean; birthYear: number } | null;
}) {
  const now = new Date();
  const [year, setYear] = useState(initialValues?.year || now.getFullYear());
  const [month, setMonth] = useState(initialValues?.month || now.getMonth() + 1);
  const [day, setDay] = useState(initialValues?.day || now.getDate());
  const [hour, setHour] = useState(initialValues?.hour !== undefined ? initialValues.hour : now.getHours());
  const [minute, setMinute] = useState(initialValues?.minute || 0);
  const [isMan, setIsMan] = useState(initialValues?.isMan !== undefined ? initialValues.isMan : true);
  const [birthYear, setBirthYear] = useState(initialValues?.birthYear || 1980);

  if (!show) return null;

  const handleSubmit = () => {
    onSubmit({ year, month, day, hour, minute, isMan, birthYear });
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "6px 4px",
    borderRadius: "4px",
    border: "1px solid #ddd",
    textAlign: "center",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
  };

  const labelStyle: CSSProperties = {
    fontSize: "12px",
    color: "#666",
    marginBottom: "4px",
    textAlign: "center",
  };

  return (
    <div style={{ backgroundColor: "#fff", padding: "10px 12px", borderBottom: "1px solid #eee" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ fontSize: "15px", fontWeight: 700, color: "#333" }}>大六壬起课</span>
        <button
          onClick={onClose}
          style={{
            backgroundColor: "transparent",
            border: "none",
            fontSize: "20px",
            color: "#999",
            cursor: "pointer",
            padding: "0 4px",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* 占问时间 */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "#333" }}>占问时辰</div>
        <DatePickerInline
          year={year} month={month} day={day} hour={hour} minute={minute}
          onYearChange={setYear} onMonthChange={setMonth}
          onDayChange={setDay} onHourChange={setHour}
          onMinuteChange={setMinute} showMinute
        />
        <div style={{ marginTop: "6px" }}>
          <QuickBtnGroup items={[
            { label: "1990年", onClick: () => setYear(1990) },
            { label: "2000年", onClick: () => setYear(2000) },
            { label: "2020年", onClick: () => setYear(2020) },
            { label: "1月", onClick: () => setMonth(1) },
            { label: "6月", onClick: () => setMonth(6) },
            { label: "12月", onClick: () => setMonth(12) },
            { label: "1日", onClick: () => setDay(1) },
            { label: "15日", onClick: () => setDay(15) },
            { label: "0时", onClick: () => setHour(0) },
            { label: "12时", onClick: () => setHour(12) },
            { label: "0分", onClick: () => setMinute(0) },
            { label: "30分", onClick: () => setMinute(30) },
          ]} />
        </div>
      </div>

      {/* 性别 + 出生年 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "10px" }}>
        <span style={{ fontSize: "13px", color: "#666", flexShrink: 0 }}>性别：</span>
        <label style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "14px", cursor: "pointer" }}>
          <input type="radio" name="gender" checked={isMan} onChange={() => setIsMan(true)} />
          男
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "14px", cursor: "pointer" }}>
          <input type="radio" name="gender" checked={!isMan} onChange={() => setIsMan(false)} />
          女
        </label>
        <span style={{ fontSize: "13px", color: "#666", marginLeft: "8px", flexShrink: 0 }}>出生年：</span>
        <input
          type="number"
          min={1900}
          max={2100}
          value={birthYear}
          onChange={(e) => setBirthYear(Math.max(1900, Math.min(2100, parseInt(e.target.value) || 1980)))}
          style={{ ...inputStyle, width: "70px", flexShrink: 0 }}
        />
      </div>

      <div style={{ fontSize: "11px", color: "#999", marginBottom: "8px" }}>
        月将自动根据节气推算（中气后换将），无需手动选择。
      </div>

      <div style={{ marginBottom: "10px" }}>
        <ClientSelector selectedClient={selectedClient} onSelect={onClientSelect} />
      </div>

      <button
        onClick={handleSubmit}
        style={{
          color: "#fff",
          backgroundColor: "#7B2FBE",
          border: "none",
          borderRadius: "20px",
          padding: "8px 0",
          fontSize: "15px",
          fontWeight: 700,
          cursor: "pointer",
          width: "100%",
          textAlign: "center",
        }}
      >
        开始起课
      </button>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export default function DaLiuRenPage() {
  const [showForm, setShowForm] = useState(true);
  const [activeTab, setActiveTab] = useState<"panmian" | "fuzhu" | "shensha" | "pingzhu" | "dangan">("panmian");
  const [data, setData] = useState<DaLiuRenResult | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);
  const [prefillParams, setPrefillParams] = useState<{ year: number; month: number; day: number; hour: number; minute: number; isMan: boolean; birthYear: number } | null>(null);

  // 监听header编辑按钮
  useEffect(() => {
    const handler = () => setShowForm(true);
    window.addEventListener("yixue-edit", handler);
    return () => window.removeEventListener("yixue-edit", handler);
  }, []);

  // URL参数clientId自动选中客户 + 回填数据检查
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) {
      const c = getClient(cid);
      if (c) setSelectedClient(c);
    }
    const prefill = getPrefillData("daliuren");
    if (prefill) {
      try {
        // 回填排盘结果
        setData(prefill);
        // 保存输入参数供表单编辑时使用
        if (prefill.inputParams) {
          setPrefillParams(prefill.inputParams);
        }
        setShowForm(false);
        clearPrefillData("daliuren");
      } catch (e) { console.error("回填失败:", e); }
    }
  }, []);

  const handleSubmit = useCallback((params: { year: number; month: number; day: number; hour: number; minute: number; isMan: boolean; birthYear: number }) => {
    const result = calculateDaLiuRen(params.year, params.month, params.day, params.hour, params.minute, params.isMan, params.birthYear);
    setData(result);
    setShowForm(false);
    // 保存客户记录
    if(selectedClient){
      try{saveRecord({clientId:selectedClient.id,type:"daliuren",data:{...result,inputParams:params},note:"",status:"pending"});}catch(e){console.error("保存记录失败:",e);}
    }
  }, [selectedClient]);

  // 不自动排盘，用户必须点击排盘按钮
  if (!data) {
    return (
      <div style={{ backgroundColor: "#fff", minHeight: "100vh", margin: 0, padding: 0 }}>
        <InputPanel show={true} onClose={() => {}} onSubmit={handleSubmit} selectedClient={selectedClient} onClientSelect={setSelectedClient} initialValues={prefillParams} />
      </div>
    );
  }

  const tabs = [
    { key: "panmian" as const, label: "盤面" },
    { key: "fuzhu" as const, label: "輔助" },
    { key: "shensha" as const, label: "神煞" },
    { key: "pingzhu" as const, label: "評註" },
    { key: "dangan" as const, label: "檔案" },
  ];

  // ------ 渲染辅助 ------
  const kwSet = new Set(data.kongwang);

  // 渲染神煞值（日空/时空中的空亡地支加黑框）
  const renderShenshaValue = (label: string, value: string) => {
    const needBorder = label === "日空" || label === "时空";
    if (!needBorder) {
      return <span style={{ color: "#000", fontWeight: 500, fontSize: "10px" }}>{value}</span>;
    }
    return (
      <span style={{ fontSize: "10px", fontWeight: 500 }}>
        {value.split("").map((ch, i) => (
          <span
            key={i}
            style={{
              border: "2px solid #000",
              borderRadius: "2px",
              padding: "0 1px",
              marginRight: "1px",
              color: zhiColorRender(ch, data.dayGan),
            }}
          >
            {ch}
          </span>
        ))}
      </span>
    );
  };

  // ------ 天地盘 4x4 grid 宫位定义 ------
  // grid-column / grid-row 都是 1-based
  const DIPAN_POSITIONS: { dz: string; row: number; col: number }[] = [
    { dz: "巳", row: 1, col: 1 },
    { dz: "午", row: 1, col: 2 },
    { dz: "未", row: 1, col: 3 },
    { dz: "申", row: 1, col: 4 },
    { dz: "辰", row: 2, col: 1 },
    { dz: "酉", row: 2, col: 4 },
    { dz: "卯", row: 3, col: 1 },
    { dz: "戌", row: 3, col: 4 },
    { dz: "寅", row: 4, col: 1 },
    { dz: "丑", row: 4, col: 2 },
    { dz: "子", row: 4, col: 3 },
    { dz: "亥", row: 4, col: 4 },
  ];

  // 四课显示顺序（左→右）：[3][2][1][0] = 第四课、第三课、第二课、第一课
  const SIKE_DISPLAY = [3, 2, 1, 0];
  const SIKE_LABELS = ["四", "三", "二", "一"];

  return (
    <div style={{ backgroundColor: "#fff", minHeight: "100vh", margin: 0, padding: 0, paddingBottom: "48px" }}>
      {/* 输入面板（点击编辑按钮展开） */}
      <InputPanel show={showForm} onClose={() => setShowForm(false)} onSubmit={handleSubmit} selectedClient={selectedClient} onClientSelect={setSelectedClient} initialValues={prefillParams} />

      {/* ====== 1. 顶部信息栏 ====== */}
      <div style={{ display: "flex", padding: "8px 10px", borderBottom: "1px solid #eee", backgroundColor: "#fff" }}>
        {/* 左侧：四柱 */}
        <div style={{ display: "flex", gap: "6px", flex: "0 0 auto" }}>
          {(["年", "月", "日", "时"] as const).map((label, idx) => {
            const [gan, zhi] = data.siZhu[idx];
            const isRizhu = idx === 2;
            return (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "32px" }}>
                {/* 灰色标签 */}
                <span style={{
                  backgroundColor: COLOR_GRAY_LABEL,
                  color: "#fff",
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "2px",
                  lineHeight: 1.4,
                  marginBottom: "2px",
                }}>{label}</span>
                {/* 天干 */}
                <span style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: isRizhu ? BRAND_RED : getGanColor(gan),
                  lineHeight: 1.2,
                }}>{gan}</span>
                {/* 地支 */}
                <span style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: isRizhu ? BRAND_RED : getZhiColor(zhi),
                  lineHeight: 1.2,
                }}>{zhi}</span>
              </div>
            );
          })}
        </div>
        {/* 右侧：日期/农历/节气 */}
        <div style={{ flex: 1, textAlign: "right", fontSize: "10px", color: "#000", lineHeight: 1.6, paddingLeft: "6px", alignSelf: "center" }}>
          <div>{data.dateStr}</div>
          <div>农历{data.lunarDate}</div>
          <div>{data.jieqiInfo}</div>
        </div>
      </div>

      {/* ====== 2. 主体区域 flex ====== */}
      <div style={{ display: "flex", backgroundColor: "#fff" }}>
        {/* ---- 左侧竖栏（约30%） ---- */}
        <div style={{
          width: "30%",
          flexShrink: 0,
          borderRight: "1px solid #ccc",
          backgroundColor: "#fff",
          padding: "6px 4px",
          fontSize: "11px",
          boxSizing: "border-box",
        }}>
          {/* 出生信息 */}
          <div style={{ textAlign: "center", marginBottom: "6px", fontSize: "12px", color: "#000", lineHeight: 1.3, fontWeight: 500 }}>
            {data.shengXiao}({data.birthYear}) {data.isMan ? "男" : "女"}
          </div>

          {/* 本命/行年（inline布局，灰色标签+彩色大值） */}
          {[
            { label: "本命", gan: data.benMing[0], zhi: data.benMing[1], isUnderline: false },
            { label: "行年", gan: data.xingYear[0], zhi: data.xingYear[1], isUnderline: false },
          ].map((item, i) => (
            <div key={`top-${i}`} style={{ display: "flex", alignItems: "center", padding: "1px 2px", marginBottom: "2px", fontSize: "10px", lineHeight: 1.4 }}>
              <span style={{
                backgroundColor: COLOR_GRAY_LABEL,
                color: "#fff",
                fontSize: "10px",
                padding: "1px 4px",
                borderRadius: "2px",
                marginRight: "4px",
                flexShrink: 0,
                lineHeight: 1.4,
              }}>{item.label}</span>
              <span style={{
                fontSize: "14px",
                fontWeight: 700,
                color: item.isUnderline ? BRAND_RED : ganColorRender(item.gan, data.dayGan),
                textDecoration: item.isUnderline ? "underline" : "none",
                textDecorationColor: BRAND_RED,
                lineHeight: 1.2,
              }}>{item.gan}</span>
              {item.zhi && (
                <span style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: item.isUnderline ? BRAND_RED : zhiColorRender(item.zhi, data.dayGan),
                  textDecoration: item.isUnderline ? "underline" : "none",
                  textDecorationColor: BRAND_RED,
                  lineHeight: 1.2,
                }}>{item.zhi}</span>
              )}
            </div>
          ))}

          {/* 月将 - 单独区域，上面有粗线 */}
          <div style={{ borderTop: "2px solid #333", marginTop: "3px", paddingTop: "3px" }}>
            <div style={{ display: "flex", alignItems: "center", padding: "1px 2px", marginBottom: "2px", fontSize: "10px", lineHeight: 1.4 }}>
              <span style={{
                backgroundColor: COLOR_GRAY_LABEL,
                color: "#fff",
                fontSize: "10px",
                padding: "1px 4px",
                borderRadius: "2px",
                marginRight: "4px",
                flexShrink: 0,
                lineHeight: 1.4,
              }}>月将</span>
              <span style={{
                fontSize: "14px",
                fontWeight: 700,
                color: BRAND_RED,
                textDecoration: "underline",
                textDecorationColor: BRAND_RED,
                lineHeight: 1.2,
              }}>{data.yuejiangZhi}</span>
            </div>
          </div>

          {/* 神煞列表（过滤掉本命/行年/月将，因为已在顶部显示） */}
          <div>
            {data.shensha.filter(ss => !["本命", "行年", "月将"].includes(ss.label)).map((ss, i) => (
              <div key={i}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "1px 2px",
                    fontSize: "10px",
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{
                    backgroundColor: COLOR_GRAY_LABEL,
                    color: "#fff",
                    fontSize: "9px",
                    padding: "0 3px",
                    borderRadius: "2px",
                    marginRight: "3px",
                    flexShrink: 0,
                    lineHeight: 1.4,
                  }}>{ss.label}</span>
                  {renderShenshaValue(ss.label, ss.value)}
                </div>
                {/* 旬尾下面加一条细分隔线 */}
                {ss.label === "旬尾" && <div style={{ borderTop: "1px solid #999", margin: "4px 2px" }}></div>}
              </div>
            ))}
          </div>

          {/* 自选神煞 */}
          <div style={{ marginTop: "6px", borderTop: "1px dashed #ccc", paddingTop: "4px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#000", marginBottom: "2px", paddingLeft: "2px" }}>自選神煞</div>
            {data.zixuanShensha.map((ss, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "1px 2px",
                  fontSize: "10px",
                  lineHeight: 1.4,
                }}
              >
                <span style={{
                  backgroundColor: COLOR_GRAY_LABEL,
                  color: "#fff",
                  fontSize: "9px",
                  padding: "0 3px",
                  borderRadius: "2px",
                  marginRight: "3px",
                  flexShrink: 0,
                  lineHeight: 1.4,
                }}>{ss.label}</span>
                <span style={{ color: "#000", fontWeight: 500, fontSize: "10px" }}>{ss.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ---- 右侧主盘面 ---- */}
        <div style={{ flex: 1, minWidth: 0, padding: "6px 5px", boxSizing: "border-box" }}>

          {/* ===== a. 三传区域（在四课上方，5列竖排：六亲列 | 天干列 | 地支列(灰底大字) | 天将列 | 标签列(灰块)） ===== */}
          <div style={{ marginBottom: "4px" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "auto auto auto auto 24px",
              gap: 0,
              margin: "0 auto",
              maxWidth: "300px",
              border: "1px solid #ccc",
            }}>
              {/* 三行数据：初传(row0)、中传(row1)、末传(row2) */}
              {[0, 1, 2].map(rowIdx => {
                const sc = data.sanChuan[rowIdx];
                const dg = sc.gan && sc.gan !== "〇" ? sc.gan : "";
                const isKW = kwSet.has(sc.zhi);
                const labels = ["初", "中", "末"];
                return (
                  <div key={rowIdx} style={{ display: "contents" }}>
                    {/* 列1：六亲/十神 */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "2px 4px",
                      fontSize: "18px",
                      fontWeight: 500,
                      color: "#000",
                      lineHeight: 1.2,
                      borderRight: "1px solid #ccc",
                      minHeight: "44px",
                    }}>{sc.liuqin}</div>
                    {/* 列2：天干/遁干 */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "2px 4px",
                      fontSize: "22px",
                      fontWeight: 500,
                      color: dg ? ganColorRender(dg, data.dayGan) : "transparent",
                      lineHeight: 1.2,
                      borderRight: "1px solid #ccc",
                      minHeight: "44px",
                    }}>{dg || "　"}</div>
                    {/* 列3：地支（大字，灰底，五行色，空亡加框） */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "2px 6px",
                      fontSize: "28px",
                      fontWeight: 700,
                      color: zhiColorRender(sc.zhi, data.dayGan),
                      backgroundColor: "#e8e8e8",
                      lineHeight: 1.2,
                      borderRight: "1px solid #ccc",
                      border: isKW ? "2px solid #000" : "none",
                      minHeight: "44px",
                    }}>{sc.zhi}</div>
                    {/* 列4：天将/神煞 */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "2px 4px",
                      fontSize: "18px",
                      fontWeight: 500,
                      color: shenColor(sc.shen),
                      lineHeight: 1.2,
                      borderRight: "1px solid #ccc",
                      minHeight: "44px",
                    }}>{sc.shen}</div>
                    {/* 列5：初/中/末标签（灰色背景白字） */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: COLOR_GRAY_LABEL,
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: 500,
                      lineHeight: 1.2,
                      minHeight: "44px",
                    }}>{labels[rowIdx]}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===== b. 四课区域 ===== */}
            <div style={{ marginBottom: "6px" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 0,
                margin: "0 auto",
              }}>
                {/* 标签行：四 三 二 一 */}
                {SIKE_LABELS.map((lbl, i) => (
                  <div key={`lbl-${i}`} style={{ textAlign: "center", marginBottom: "1px" }}>
                    <span style={{
                      backgroundColor: COLOR_GRAY_LABEL,
                      color: "#fff",
                      fontSize: "9px",
                      padding: "1px 4px",
                      borderRadius: "2px",
                      lineHeight: 1.3,
                    }}>{lbl}</span>
                  </div>
                ))}
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 0,
                margin: "0 auto",
              }}>
                {SIKE_DISPLAY.map((idx) => {
                  const ke = data.siKe[idx];
                  const dg = ke.dunGan && ke.dunGan !== "〇" ? ke.dunGan : "";
                  const isSS_KW = kwSet.has(ke.shangShen);
                  const isXS_KW = kwSet.has(ke.xiaShen);
                  const xiaIsGan = GAN.includes(ke.xiaShen as TianGan);
                  return (
                    <div key={`ke-${idx}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.2 }}>
                      {/* 天将 */}
                      <span style={{
                        fontSize: "11px",
                        color: shenColor(ke.tianJiang),
                        height: "16px",
                        lineHeight: "16px",
                      }}>{ke.tianJiang}</span>
                      {/* 上神（大字bold）+ 遁干小字在右侧 */}
                      <div style={{ display: "flex", alignItems: "baseline", gap: "1px" }}>
                        <span style={{
                          fontSize: "20px",
                          fontWeight: 700,
                          color: zhiColorRender(ke.shangShen, data.dayGan),
                          border: isSS_KW ? "2px solid #000" : "none",
                          borderRadius: "2px",
                          padding: isSS_KW ? "0 2px" : 0,
                          lineHeight: 1.2,
                        }}>{ke.shangShen}</span>
                        {dg && (
                          <span style={{
                            fontSize: "10px",
                            color: ganColorRender(dg, data.dayGan),
                            lineHeight: 1,
                          }}>{dg}</span>
                        )}
                      </div>
                      {/* 下神（大字bold） */}
                      <span style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        color: ke.xiaShen === data.dayGan ? BRAND_RED : (xiaIsGan ? getGanColor(ke.xiaShen) : getZhiColor(ke.xiaShen)),
                        border: isXS_KW ? "2px solid #000" : "none",
                        borderRadius: "2px",
                        padding: isXS_KW ? "0 2px" : 0,
                        lineHeight: 1.2,
                      }}>{ke.xiaShen}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ===== c. 天地盘区域（4x4 grid，灰色边框） ===== */}
            <div style={{
              border: "1px solid #999",
              borderRadius: "2px",
              margin: "0 auto",
              position: "relative",
              width: "100%",
              maxWidth: "260px",
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gridTemplateRows: "repeat(4, auto)",
                gap: 0,
                width: "100%",
              }}>
                {DIPAN_POSITIONS.map(({ dz, row, col }) => {
                  const tpZhi = data.yueJiangMap[dz] || "";   // 天盘地支
                  const tianJiang = data.guiShenMap[dz] || ""; // 天将
                  const dunGan = data.tianGanMap[dz] || "";   // 遁干
                  const dgShow = (dunGan && dunGan !== "〇") ? dunGan : "";
                  const tpKW = kwSet.has(tpZhi);
                  const dpKW = kwSet.has(dz);

                  return (
                    <div
                      key={dz}
                      style={{
                        gridRow: row,
                        gridColumn: col,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRight: (col < 4 && !(row >= 2 && row <= 3 && col === 1)) ? "1px solid #ccc" : "none",
                        borderBottom: (row < 4 && !(col >= 2 && col <= 3 && row === 1)) ? "1px solid #ccc" : "none",
                        padding: "3px 2px",
                        minHeight: "52px",
                        boxSizing: "border-box",
                        lineHeight: 1.1,
                      }}
                    >
                      {/* 顶部：天将 */}
                      <span style={{
                        fontSize: "10px",
                        color: shenColor(tianJiang),
                        height: "12px",
                        lineHeight: "12px",
                      }}>{tianJiang}</span>
                      {/* 中部：天盘地支 + 遁干 */}
                      <div style={{ display: "flex", alignItems: "baseline", gap: "1px" }}>
                        <span style={{
                          fontSize: "20px",
                          fontWeight: 700,
                          color: zhiColorRender(tpZhi, data.dayGan),
                          border: tpKW ? "2px solid #000" : "none",
                          borderRadius: "2px",
                          padding: tpKW ? "0 1px" : 0,
                          lineHeight: 1.15,
                        }}>{tpZhi}</span>
                        {dgShow && (
                          <span style={{
                            fontSize: "10px",
                            color: ganColorRender(dgShow, data.dayGan),
                            lineHeight: 1,
                          }}>{dgShow}</span>
                        )}
                      </div>
                      {/* 底部：地盘地支（带下划线，空亡加黑框） */}
                      <span style={{
                        fontSize: "11px",
                        color: zhiColorRender(dz, data.dayGan),
                        border: dpKW ? "2px solid #000" : "none",
                        borderBottom: dpKW ? "2px solid #000" : "1px solid " + zhiColorRender(dz, data.dayGan),
                        borderRadius: "2px",
                        padding: dpKW ? "0 1px" : "0",
                        paddingBottom: "0px",
                        lineHeight: 1.2,
                        marginTop: "1px",
                      }}>{dz}</span>
                    </div>
                  );
                })}

                {/* 中宫：行2-3, 列2-3 */}
                <div style={{
                  gridRow: "2 / span 2",
                  gridColumn: "2 / span 2",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #ccc",
                  boxSizing: "border-box",
                  padding: "4px",
                  minHeight: "104px",
                  lineHeight: 1.3,
                }}>
                  <div style={{ fontSize: "16px", fontWeight: 700, lineHeight: 1.2 }}>
                    <span style={{ color: BRAND_RED }}>{data.dayGan}</span>
                    <span style={{ color: zhiColorRender(data.dayZhi, data.dayGan) }}>{data.dayZhi}</span>
                    <span style={{ color: "#000", fontSize: "13px" }}>日</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#333", marginTop: "2px" }}>{data.keTi}</div>
                  <div style={{ fontSize: "10px", color: "#666" }}>{data.sanChuanMethod}</div>
                </div>
              </div>
            </div>

            {/* 辅助说明 */}
            <div style={{ textAlign: "center", fontSize: "10px", color: "#999", marginTop: "4px", lineHeight: 1.4 }}>
              {data.yuejiangName}加{data.zhanbuTime}时 · {data.isDaytime ? "昼占" : "夜占"} · 空亡:{data.kongwang[0]}{data.kongwang[1]}
            </div>
        </div>
      </div>

      {/* ====== 3. 底部Tab栏 ====== */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "375px",
          maxWidth: "100vw",
          display: "flex",
          backgroundColor: "#fff",
          borderTop: "1px solid #ddd",
          zIndex: 100,
          boxSizing: "border-box",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: "8px 0",
              textAlign: "center",
              fontSize: "13px",
              fontWeight: activeTab === tab.key ? 700 : 500,
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              color: activeTab === tab.key ? TAB_BLUE : "#333",
              borderBottom: activeTab === tab.key ? "2px solid " + TAB_BLUE : "2px solid transparent",
              boxSizing: "border-box",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab内容区（非盘面时显示在tab栏上方） */}
      {activeTab !== "panmian" && (
        <div style={{
          padding: "10px 12px",
          borderTop: "1px solid #eee",
          backgroundColor: "#fff",
          fontSize: "12px",
          color: "#666",
          lineHeight: 1.8,
        }}>
          {activeTab === "fuzhu" && (
            <div>
              <div style={{ fontWeight: 600, color: "#333", marginBottom: "4px", fontSize: "13px" }}>辅助信息</div>
              <div>月将加时：{data.yuejiangName}加{data.zhanbuTime}时</div>
              <div>贵人：{data.isDaytime ? "昼贵" : "夜贵"}方（{tianYiGuiRen(data.dayGan, data.isDaytime)}）</div>
              <div>空亡：{data.kongwang[0]}{data.kongwang[1]}</div>
              <div>日干：{data.dayGan}（{GAN_WUXING[data.dayGan]}） 日支：{data.dayZhi}（{ZHI_WUXING[data.dayZhi]}）</div>
              <div>课体：{data.keTi}</div>
              <div>三传：{data.sanChuan.map(sc => sc.zhi).join(" → ")}</div>
            </div>
          )}
          {activeTab === "shensha" && (
            <div>
              <div style={{ fontWeight: 600, color: "#333", marginBottom: "4px", fontSize: "13px" }}>神煞详表</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                {[...data.shensha, ...data.zixuanShensha].map((ss, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px dotted #eee" }}>
                    <span style={{ color: "#999" }}>{ss.label}：</span>
                    <span style={{ fontWeight: 600, color: "#000" }}>{ss.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === "pingzhu" && (
            <div>
              <div style={{ fontWeight: 600, color: "#333", marginBottom: "4px", fontSize: "13px" }}>评注</div>
              <p style={{ margin: 0 }}>此功能为学习版本，评注功能将在后续版本中完善。</p>
            </div>
          )}
          {activeTab === "dangan" && (
            <div>
              <div style={{ fontWeight: 600, color: "#333", marginBottom: "4px", fontSize: "13px" }}>档案</div>
              <p style={{ margin: 0 }}>课例保存与管理功能将在后续版本中完善。</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
