/**
 * ============================================================================
 * 大六壬算法模块
 * ============================================================================
 *
 * 原始来源：从 src/app/yixue/daliuren/page.tsx 提取
 * 提取日期：2026-08-06
 * 版本：v1.0.0
 * ============================================================================
 */

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

/** 九宗门课体吉凶定性/判断说明（对标大六壬经典九宗门，用于中宫判断说明） */
const KE_TI_DESC: Record<string, string> = {
  "元首课": "上克下·凡事顺成吉",
  "重审课": "下克上·事反复初难后易",
  "比用课": "比和·兄弟同谋亲疏相济",
  "涉害课": "涉害深·艰难争讼周折",
  "蒿矢课": "神克日·远事虚惊力微",
  "弹射课": "日克神·远谋力轻难中",
  "虎视课": "昴星阳日·惊恐关梁",
  "冬蛇掩目课": "昴星阴日·暗昧惊伏",
  "别责课": "课不全·依傍借助难独成",
  "八专课": "干支同位·同谋私密",
  "伏吟课": "伏吟·静伏阻滞不动",
  "反吟课": "反吟·动而反复有来回",
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
  "甲申": { "子": "午辰寅", "丑": "子亥戌", "寅": "寅巳申", "卯": "辰巳午", "辰": "辰午申", "巳": "申亥寅", "申": "辰申子", "酉": "子巳戌", "戌": "寅申寅", "亥": "戌巳子" },
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

export interface PanMap {
  [key: string]: string;
}

export interface SanChuanItem {
  zhi: string;
  gan: string;
  shen: string;
  liuqin: string;
}

export interface SiKeItem {
  xiaShen: string;
  shangShen: string;
  tianJiang: string;
  dunGan?: string;
}

export interface DaLiuRenResult {
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
  keTiDesc: string;
  shensha: { label: string; value: string }[];
  zixuanShensha: { label: string; value: string }[];
}

/** 大六壬起课输入参数 */
export interface DaLiuRenInputParams {
  year: number; month: number; day: number; hour: number; minute: number;
  isMan: boolean;
  birthYear: number;
  zhanbuTime?: string;
  yueJiangMethod: number;
  guirenMethod: number;
  guirenSunni: number;
}

// ============================================================================
// 核心排盘算法（保留原样）
// ============================================================================

export function calculateDaLiuRen(
  year: number, month: number, day: number, hour: number, minute: number,
  isMan: boolean, birthYear: number,
  zhanbuTime?: string,
  yueJiangMethod?: number,
  guirenMethod?: number,
  guirenSunni?: number
): DaLiuRenResult {
  const bazi = solarToBazi({ year, month, day, hour, minute, gender: isMan ? "male" : "female" });
  const pillars = bazi.pillars;
  const siZhu: [string, string][] = pillars.map((p) => [p.gan, p.zhi]) as [string, string][];
  const dayGan = siZhu[2][0] as TianGan;
  const dayZhi = siZhu[2][1] as DiZhi;
  const yearGanZhi = siZhu[0][0] + siZhu[0][1];

  let yuejiangZhi: string;
  let yuejiangName: string;
  if (yueJiangMethod === 2) {
    const YUE_ZHI_ARR = ["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"];
    const SHI_ZHI_ARR = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
    const YUE_JIANG2: [string, string][] = [
      ["亥","登明"],["戌","河魁"],["酉","从魁"],["申","传送"],["未","小吉"],["午","胜光"],
      ["巳","太乙"],["辰","天罡"],["卯","太冲"],["寅","功曹"],["丑","大吉"],["子","神后"],
    ];
    const yearZhi = siZhu[0][1];
    const monthZhi = siZhu[1][1];
    const dayZhiStr = siZhu[2][1];
    const hourZhi = siZhu[3][1];
    const total =
      (YUE_ZHI_ARR.indexOf(yearZhi) + 1) +
      (YUE_ZHI_ARR.indexOf(monthZhi) + 1) +
      (YUE_ZHI_ARR.indexOf(dayZhiStr) + 1) +
      (SHI_ZHI_ARR.indexOf(hourZhi) + 1);
    let mod: number;
    if (total < 12) mod = 12 - total;
    else { mod = total % 12; if (mod === 0) mod = 12; }
    const yj2 = YUE_JIANG2[mod - 1];
    yuejiangZhi = yj2[0];
    yuejiangName = yj2[1];
  } else {
    const yj = getYueJiang(year, month, day);
    yuejiangZhi = yj.zhi;
    yuejiangName = yj.name;
  }

  const zhanbuTimeFinal = zhanbuTime ?? (HOUR_TO_ZHI[hour] ?? "子");

  const ZHANBU_HOUR: Record<string, number> = {
    "子": 23, "丑": 1, "寅": 3, "卯": 5, "辰": 7, "巳": 9,
    "午": 11, "未": 13, "申": 15, "酉": 17, "戌": 19, "亥": 21,
  };
  const zhanbuHour = ZHANBU_HOUR[zhanbuTimeFinal] ?? hour;
  let isDaytime: boolean;
  if (guirenMethod === 2) isDaytime = true;
  else if (guirenMethod === 3) isDaytime = false;
  else isDaytime = zhanbuHour >= 5 && zhanbuHour < 17;

  const currentJieQi = getCurrentJieQi(new Date(year, month - 1, day, hour, minute));
  const jieqiInfo = currentJieQi.name;

  const kw = getKongwang(siZhu[2][0] + siZhu[2][1]) ?? "戌亥";
  const kongwang: [string, string] = [kw[0], kw[1]];

  const by = birthYear ?? year;
  const benMingGanZhi = getYearGanZhi(by);
  const shengXiao = getShengXiao(benMingGanZhi[1] as DiZhi);

  const jiaziTable60 = ["甲子","乙丑","丙寅","丁卯","戊辰","己巳","庚午","辛未","壬申","癸酉","甲戌","乙亥","丙子","丁丑","戊寅","己卯","庚辰","辛巳","壬午","癸未","甲申","乙酉","丙戌","丁亥","戊子","己丑","庚寅","辛卯","壬辰","癸巳","甲午","乙未","丙申","丁酉","戊戌","己亥","庚子","辛丑","壬寅","癸卯","甲辰","乙巳","丙午","丁未","戊申","己酉","庚戌","辛亥","壬子","癸丑","甲寅","乙卯","丙辰","丁巳","戊午","己未","庚申","辛酉","壬戌","癸亥"];
  const xingAge = year - by + 1;
  const xingStartIdx = isMan ? 2 : 32;
  const xingYearIdx = (xingStartIdx + xingAge - 1) % 60;
  const xingYearGZ = jiaziTable60[xingYearIdx] ?? "丙寅";

  const yjIdx = YUE_JIANG_LIST.indexOf(yuejiangZhi as DiZhi);
  const yjIter = circularList(YUE_JIANG_LIST, yjIdx, true);
  const zhanbuIdx = DZ_DIPAN.indexOf(zhanbuTimeFinal as DiZhi);
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
  let isShun: boolean;
  if (guirenSunni === 2) isShun = isMan;
  else isShun = "亥子丑寅卯辰".includes(guirenDipan);
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
  const ganForward = guirenSunni === 2 ? isMan : true;
  const ganIter = circularList(tianGanExt, ganIdx, ganForward);
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
    { xiaShen: dayGan, shangShen: ganYang, tianJiang: ganYangTJ, dunGan: ganYangDG },
    { xiaShen: ganYang, shangShen: ganYin, tianJiang: ganYinTJ, dunGan: ganYinDG },
    { xiaShen: dayZhi, shangShen: zhiYang, tianJiang: zhiYangTJ, dunGan: zhiYangDG },
    { xiaShen: zhiYang, shangShen: zhiYin, tianJiang: zhiYinTJ, dunGan: zhiYinDG },
  ];

  const ganZhi = dayGan + dayZhi;
  const sanChuanZhi = KE_720[ganZhi][ganYang].split("");

  const chongMap: Record<string, string> = {
    "子": "午", "午": "子", "丑": "未", "未": "丑", "寅": "申", "申": "寅",
    "卯": "酉", "酉": "卯", "辰": "戌", "戌": "辰", "巳": "亥", "亥": "巳",
  };

  const dayGanYy: YinYang = GAN_YIN_YANG[dayGan];

  function zhiKe(above: string, below: string): "shangKeXia" | "xiaKeShang" | "none" {
    const aWx = ZHI_WUXING[above as DiZhi];
    const bWx = ZHI_WUXING[below as DiZhi];
    if (!aWx || !bWx) return "none";
    const r_ab = getWuxingRelation(aWx, bWx);
    const r_ba = getWuxingRelation(bWx, aWx);
    if (r_ab === "我克") return "shangKeXia";
    if (r_ba === "我克") return "xiaKeShang";
    return "none";
  }

  const isFuYin = (yuejiangZhi === zhanbuTimeFinal);
  const isFanYin = (chongMap[yuejiangZhi] === zhanbuTimeFinal);
  const isBaZhuan = (jigong === dayZhi);

  interface KeRelation {
    index: number;
    xiaShen: string;
    shangShen: string;
    keType: "shangKeXia" | "xiaKeShang" | "none";
  }
  const keRels: KeRelation[] = siKe.map((k, i) => ({
    index: i,
    xiaShen: k.xiaShen,
    shangShen: k.shangShen,
    keType: zhiKe(k.shangShen, k.xiaShen),
  }));

  const zeiList = keRels.filter(k => k.keType === "xiaKeShang");
  const keList = keRels.filter(k => k.keType === "shangKeXia");

  const dayGanWx = GAN_WUXING[dayGan];
  interface YaoKeItem {
    index: number;
    shangShen: string;
    type: "shenKeRi" | "riKeShen";
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

  function isBi(zhi: string): boolean {
    const zYy = ZHI_YIN_YANG[zhi as DiZhi];
    return zYy === dayGanYy;
  }

  let sanChuanMethod = "贼克";
  let keTi = "元首课";

  if (isFuYin) {
    sanChuanMethod = "伏吟";
    keTi = "伏吟课";
  } else if (isFanYin) {
    sanChuanMethod = "反吟";
    keTi = "反吟课";
  } else {
    if (zeiList.length >= 1 || keList.length >= 1) {
      if (zeiList.length > 0) {
        if (zeiList.length === 1) {
          sanChuanMethod = "贼克";
          keTi = "重审课";
        } else {
          const biList = zeiList.filter(k => isBi(k.shangShen));
          if (biList.length === 1) {
            sanChuanMethod = "比用";
            keTi = "比用课";
          } else {
            sanChuanMethod = "涉害";
            keTi = "涉害课";
          }
        }
      } else {
        if (keList.length === 1) {
          sanChuanMethod = "贼克";
          keTi = "元首课";
        } else {
          const biList = keList.filter(k => isBi(k.shangShen));
          if (biList.length === 1) {
            sanChuanMethod = "比用";
            keTi = "比用课";
          } else {
            sanChuanMethod = "涉害";
            keTi = "涉害课";
          }
        }
      }
    } else if (yaoKeList.length > 0) {
      sanChuanMethod = "遥克";
      const hasShenKeRi = yaoKeList.some(y => y.type === "shenKeRi");
      keTi = hasShenKeRi ? "蒿矢课" : "弹射课";
    } else {
      if (isBaZhuan) {
        sanChuanMethod = "别责";
        keTi = "别责课";
      } else {
        sanChuanMethod = "昴星";
        keTi = dayGanYy === "阳" ? "虎视课" : "冬蛇掩目课";
      }
    }
  }

  const keTiDesc = KE_TI_DESC[keTi] ?? "";

  const tianPanToDiPan: PanMap = {};
  for (let i = 0; i < 12; i++) {
    const dp = DZ_DIPAN[i];
    const tp = yueJiangMap[dp];
    tianPanToDiPan[tp] = dp;
  }

  const sanChuan: SanChuanItem[] = [];
  for (const scZhi of sanChuanZhi) {
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
    { label: "太岁", value: yearGanZhi },
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
    { label: "生气", value: (() => {
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
    zhanbuTime: zhanbuTimeFinal,
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
    keTiDesc,
    shensha,
    zixuanShensha,
  };
}