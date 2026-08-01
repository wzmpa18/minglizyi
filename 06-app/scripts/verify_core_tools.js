/**
 * ============================================================================
 * 6大核心易学工具排盘数据验证脚本
 * ============================================================================
 * 用法: npx tsx scripts/verify_core_tools.js
 *
 * 验证模块:
 *   1. 八字排盘 (bazi)     - src/algorithm-core/modules/bazi/
 *   2. 梅花易数 (meihua)   - src/algorithm-core/modules/meihua/
 *   3. 小六壬   (xiaoliuren)- src/algorithm-core/modules/xiaoliuren/
 *   4. 紫微斗数 (ziwei)    - src/algorithm-core/modules/ziwei/ + iztro库
 *   5. 大六壬   (daliuren) - 基于page.tsx算法, 依赖algorithm-core公共函数
 * ============================================================================
 */

import { solarToBazi, GAN, ZHI, GAN_WUXING, ZHI_WUXING, GAN_YIN_YANG, ZHI_YIN_YANG,
  getWuxingRelation, getShengXiao, getCurrentJieQi, getJieQiDate, getJieQiIndex,
  getKongwang, getYearGanZhi } from '../src/algorithm-core/index.ts';

import { calculateMeihua, timeDivination as meihuaTimeDiv, numberDivination,
  getTrigramInfo } from '../src/algorithm-core/modules/meihua/index.ts';

import { calculateXiaoLiuRen, hourToShichen, PALM_POSITIONS, SHICHEN_NAMES,
  countClockwise } from '../src/algorithm-core/modules/xiaoliuren/index.ts';

import { calculateZiwei } from '../src/algorithm-core/modules/ziwei/index.ts';

// ============================================================================
// 大六壬核心算法（从 src/app/yixue/daliuren/page.tsx 提取）
// ============================================================================

const DZ_DIPAN = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];
const YUE_JIANG_LIST = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const SHI_ER_SHEN = ["贵", "蛇", "朱", "合", "勾", "龙", "空", "虎", "常", "玄", "阴", "后"];

const GAN_JIGONG = {
  "甲": "寅", "乙": "辰", "丙": "巳", "丁": "未", "戊": "巳",
  "己": "未", "庚": "申", "辛": "戌", "壬": "亥", "癸": "丑",
};

const YUE_JIANG_NAME = {
  "亥": "登明", "戌": "河魁", "酉": "从魁", "申": "传送",
  "未": "小吉", "午": "胜光", "巳": "太乙", "辰": "天罡",
  "卯": "太冲", "寅": "功曹", "丑": "大吉", "子": "神后",
};

const ZHONG_QI = ["冬至", "大寒", "雨水", "春分", "谷雨", "小满", "夏至", "大暑", "处暑", "秋分", "霜降", "小雪"];
const ZHONG_QI_YUE_JIANG = {
  "冬至": "丑", "大寒": "子", "雨水": "亥", "春分": "戌",
  "谷雨": "酉", "小满": "申", "夏至": "未", "大暑": "午",
  "处暑": "巳", "秋分": "辰", "霜降": "卯", "小雪": "寅",
};

const HOUR_TO_ZHI = {
  0: "子", 23: "子", 1: "丑", 2: "丑", 3: "寅", 4: "寅",
  5: "卯", 6: "卯", 7: "辰", 8: "辰", 9: "巳", 10: "巳",
  11: "午", 12: "午", 13: "未", 14: "未", 15: "申", 16: "申",
  17: "酉", 18: "酉", 19: "戌", 20: "戌", 21: "亥", 22: "亥",
};

const LIU_QIN_SHORT = { "同我": "兄", "我生": "子", "克我": "官", "我克": "财", "生我": "父" };

// 720课三传查找表（与page.tsx完全一致）
const KE_720 = {
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

function circularList(arr, startIdx, forward = true) {
  let idx = startIdx;
  const len = arr.length;
  return () => {
    const item = arr[idx];
    idx = forward ? (idx + 1) % len : (idx - 1 + len) % len;
    return item;
  };
}

function getYueJiang(year, month, day) {
  const targetDate = new Date(year, month - 1, day);
  let best = null;
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

function tianYiGuiRen(dayGan, isDaytime) {
  const map = {
    "甲": ["丑", "未"], "戊": ["丑", "未"], "庚": ["丑", "未"],
    "乙": ["子", "申"], "己": ["子", "申"],
    "丙": ["亥", "酉"], "丁": ["亥", "酉"],
    "壬": ["巳", "卯"], "癸": ["巳", "卯"],
    "辛": ["午", "寅"],
  };
  return isDaytime ? map[dayGan][0] : map[dayGan][1];
}

function getLiuQin(dayGan, zhi) {
  const ganWx = GAN_WUXING[dayGan];
  const zhiWx = ZHI_WUXING[zhi];
  const relation = getWuxingRelation(ganWx, zhiWx);
  return LIU_QIN_SHORT[relation] ?? "";
}

/**
 * 大六壬排盘核心算法（从 page.tsx 提取）
 */
function calculateDaLiuRen(year, month, day, hour, minute, isMan, birthYear) {
  const bazi = solarToBazi({ year, month, day, hour, minute, gender: isMan ? "male" : "female" });
  const pillars = bazi.pillars;
  const siZhu = pillars.map((p) => [p.gan, p.zhi]);
  const dayGan = siZhu[2][0];
  const dayZhi = siZhu[2][1];
  const yearGanZhi = siZhu[0][0] + siZhu[0][1];

  const yj = getYueJiang(year, month, day);
  const yuejiangZhi = yj.zhi;
  const yuejiangName = yj.name;

  const zhanbuTime = HOUR_TO_ZHI[hour] ?? "子";
  const isDaytime = hour >= 5 && hour < 17;

  const currentJieQi = getCurrentJieQi(new Date(year, month - 1, day, hour, minute));
  const jieqiInfo = currentJieQi.name;

  const kw = getKongwang(siZhu[2][0] + siZhu[2][1]) ?? "戌亥";
  const kongwang = [kw[0], kw[1]];

  const by = birthYear ?? year;
  const benMingGanZhi = getYearGanZhi(by);
  const shengXiao = getShengXiao(benMingGanZhi[1]);

  const age = year - by;
  let xingYearGZ;
  if (isMan) {
    const gIdx = (GAN.indexOf("丙") + age) % 10;
    const zIdx = (ZHI.indexOf("寅") + age) % 12;
    xingYearGZ = GAN[gIdx] + ZHI[zIdx];
  } else {
    const gIdx = (GAN.indexOf("壬") + (120 - age) % 10) % 10;
    const zIdx = (ZHI.indexOf("申") + (120 - age) % 12) % 12;
    xingYearGZ = GAN[gIdx] + ZHI[zIdx];
  }

  // 天盘（月将加时）
  const yjIdx = YUE_JIANG_LIST.indexOf(yuejiangZhi);
  const yjIter = circularList(YUE_JIANG_LIST, yjIdx, true);
  const zhanbuIdx = DZ_DIPAN.indexOf(zhanbuTime);
  const yueJiangMap = {};
  for (let i = zhanbuIdx; i < 12; i++) yueJiangMap[DZ_DIPAN[i]] = yjIter();
  for (let i = 0; i < zhanbuIdx; i++) yueJiangMap[DZ_DIPAN[i]] = yjIter();

  // 天将（天乙贵人起）
  const guirenZhi = tianYiGuiRen(dayGan, isDaytime);
  let guirenDipanIdx = -1;
  for (let i = 0; i < 12; i++) {
    if (yueJiangMap[DZ_DIPAN[i]] === guirenZhi) { guirenDipanIdx = i; break; }
  }
  if (guirenDipanIdx === -1) guirenDipanIdx = 0;
  const guirenDipan = DZ_DIPAN[guirenDipanIdx];
  const isShun = "亥子丑寅卯辰".includes(guirenDipan);
  const shenIter = circularList(SHI_ER_SHEN, 0, isShun);
  const guiShenMap = {};
  for (let i = guirenDipanIdx; i < 12; i++) guiShenMap[DZ_DIPAN[i]] = shenIter();
  for (let i = 0; i < guirenDipanIdx; i++) guiShenMap[DZ_DIPAN[i]] = shenIter();

  // 天干（日干寄宫起）
  let riZhiDipanIdx = -1;
  for (let i = 0; i < 12; i++) {
    if (yueJiangMap[DZ_DIPAN[i]] === dayZhi) { riZhiDipanIdx = i; break; }
  }
  if (riZhiDipanIdx === -1) riZhiDipanIdx = 0;
  const ganIdx = GAN.indexOf(dayGan);
  const tianGanExt = [...GAN, "〇", "〇"];
  const ganIter = circularList(tianGanExt, ganIdx, true);
  const tianGanMap = {};
  for (let i = riZhiDipanIdx; i < 12; i++) tianGanMap[DZ_DIPAN[i]] = ganIter();
  for (let i = 0; i < riZhiDipanIdx; i++) tianGanMap[DZ_DIPAN[i]] = ganIter();

  // 四课
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

  const siKe = [
    { xiaShen: jigong, shangShen: ganYang, tianJiang: ganYangTJ, dunGan: ganYangDG },
    { xiaShen: ganYang, shangShen: ganYin, tianJiang: ganYinTJ, dunGan: ganYinDG },
    { xiaShen: dayZhi, shangShen: zhiYang, tianJiang: zhiYangTJ, dunGan: zhiYangDG },
    { xiaShen: zhiYang, shangShen: zhiYin, tianJiang: zhiYinTJ, dunGan: zhiYinDG },
  ];

  // 三传（720课表）
  const ganZhi = dayGan + dayZhi;
  const ke720 = KE_720[ganZhi];
  let sanChuanZhi = [];
  if (ke720 && ke720[ganYang]) {
    sanChuanZhi = ke720[ganYang].split("");
  } else {
    sanChuanZhi = [ganYang, ganYin, zhiYang];
  }

  // 课体判定（简化版，主要输出核心数据）
  const chongMap = { "子":"午","午":"子","丑":"未","未":"丑","寅":"申","申":"寅","卯":"酉","酉":"卯","辰":"戌","戌":"辰","巳":"亥","亥":"巳" };
  const isFuYin = (yuejiangZhi === zhanbuTime);
  const isFanYin = (chongMap[yuejiangZhi] === zhanbuTime);
  const isBaZhuan = (jigong === dayZhi);

  function zhiKe(above, below) {
    const aWx = ZHI_WUXING[above];
    const bWx = ZHI_WUXING[below];
    if (!aWx || !bWx) return "none";
    const r_ab = getWuxingRelation(aWx, bWx);
    const r_ba = getWuxingRelation(bWx, aWx);
    if (r_ab === "我克") return "shangKeXia";
    if (r_ba === "我克") return "xiaKeShang";
    return "none";
  }

  const dayGanYy = GAN_YIN_YANG[dayGan];
  function isBi(zhi) {
    const zYy = ZHI_YIN_YANG[zhi];
    return zYy === dayGanYy;
  }

  const keRels = siKe.map((k, i) => ({
    index: i, xiaShen: k.xiaShen, shangShen: k.shangShen, keType: zhiKe(k.shangShen, k.xiaShen),
  }));
  const zeiList = keRels.filter(k => k.keType === "xiaKeShang");
  const keList = keRels.filter(k => k.keType === "shangKeXia");

  let sanChuanMethod = "贼克";
  let keTi = "元首课";
  if (isFuYin) { sanChuanMethod = "伏吟"; keTi = "伏吟课"; }
  else if (isFanYin) { sanChuanMethod = "反吟"; keTi = "反吟课"; }
  else if (isBaZhuan) { sanChuanMethod = "八专"; keTi = "八专课"; }
  else {
    const isBieZe = (
      (siKe[0].shangShen === siKe[2].shangShen && siKe[0].xiaShen === siKe[2].xiaShen) ||
      (siKe[1].shangShen === siKe[3].shangShen && siKe[1].xiaShen === siKe[3].xiaShen)
    );
    if (isBieZe) { sanChuanMethod = "别责"; keTi = "别责课"; }
    else if (zeiList.length === 0 && keList.length === 0) {
      const yaoKeList = [];
      for (let i = 0; i < 4; i++) {
        const ss = siKe[i].shangShen;
        const ssWx = ZHI_WUXING[ss];
        if (!ssWx) continue;
        const r_ss_gan = getWuxingRelation(ssWx, GAN_WUXING[dayGan]);
        const r_gan_ss = getWuxingRelation(GAN_WUXING[dayGan], ssWx);
        if (r_ss_gan === "我克") yaoKeList.push({ type: "shenKeRi" });
        else if (r_gan_ss === "我克") yaoKeList.push({ type: "riKeShen" });
      }
      if (yaoKeList.length > 0) {
        sanChuanMethod = "遥克";
        keTi = yaoKeList.some(y => y.type === "shenKeRi") ? "蒿矢课" : "弹射课";
      } else {
        sanChuanMethod = "昴星";
        keTi = dayGanYy === "阳" ? "虎视课" : "冬蛇掩目课";
      }
    } else if (zeiList.length === 1 && keList.length === 0) {
      sanChuanMethod = "贼克"; keTi = "重审课";
    } else if (zeiList.length === 0 && keList.length === 1) {
      sanChuanMethod = "贼克"; keTi = "元首课";
    } else {
      const priorityList = zeiList.length > 0 ? zeiList : keList;
      const biList = priorityList.filter(k => isBi(k.shangShen));
      if (biList.length === 1) { sanChuanMethod = "比用"; keTi = "比用课"; }
      else { sanChuanMethod = "涉害"; keTi = "涉害课"; }
    }
  }

  const sanChuan = [];
  for (const scZhi of sanChuanZhi) {
    let scDipanIdx = -1;
    for (let i = 0; i < 12; i++) {
      if (yueJiangMap[DZ_DIPAN[i]] === scZhi) { scDipanIdx = i; break; }
    }
    if (scDipanIdx === -1) scDipanIdx = 0;
    const scDipan = DZ_DIPAN[scDipanIdx];
    const scGan = tianGanMap[scDipan] ?? "";
    const scShen = guiShenMap[scDipan] ?? "";
    const scLiuqin = getLiuQin(dayGan, scZhi);
    sanChuan.push({ zhi: scZhi, gan: scGan, shen: scShen, liuqin: scLiuqin });
  }

  return {
    dateStr: `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")} ${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`,
    siZhu: siZhu.map(([g,z]) => g+z),
    yuejiangZhi, yuejiangName, yuejiangZhongQi: yj.zhongQi,
    zhanbuTime, isDaytime, jieqiInfo,
    dayGan, dayZhi,
    kongwang: kongwang.join(""),
    benMing: benMingGanZhi, xingYear: xingYearGZ, shengXiao,
    isMan, birthYear: by,
    yueJiangMap, guiShenMap, tianGanMap,
    siKe, sanChuan, sanChuanMethod, keTi,
  };
}

// ============================================================================
// 验证工具函数
// ============================================================================

const results = { pass: 0, fail: 0, total: 0 };

function section(title) {
  console.log("\n" + "=".repeat(70));
  console.log("  " + title);
  console.log("=".repeat(70));
}

function check(label, condition, detail) {
  results.total++;
  if (condition) {
    results.pass++;
    console.log(`  [PASS] ${label}`);
  } else {
    results.fail++;
    console.log(`  [FAIL] ${label}`);
  }
  if (detail) console.log(`         ${detail}`);
}

// ============================================================================
// 1. 八字排盘验证
// ============================================================================

section("1. 八字排盘 (bazi) - solarToBazi()");

const baziCases = [
  { year: 1990, month: 5, day: 15, hour: 12, gender: "male", desc: "1990-5-15 12:00 男" },
  { year: 1985, month: 10, day: 3, hour: 8, gender: "female", desc: "1985-10-3 8:00 女" },
  { year: 2000, month: 1, day: 1, hour: 0, minute: 30, gender: "male", desc: "2000-1-1 0:30 男" },
];

for (const c of baziCases) {
  console.log(`\n  用例: ${c.desc}`);
  try {
    const r = solarToBazi(c);
    const pillars = r.pillars.map(p => p.ganzhi).join(" ");
    console.log(`    四柱: ${pillars}`);
    console.log(`    日主: ${r.dayGan}${r.dayZhi} (${r.pillars[2].nayin})`);
    console.log(`    身强身弱: ${r.shenQiangRuo.result} (${r.shenQiangRuo.totalScore}分)`);
    console.log(`    主格局: ${r.mainPattern} (${r.patternType})`);
    console.log(`    大运方向: ${r.dayun.direction}, 起运年龄: ${r.dayun.startAge}岁`);
    console.log(`    上一步/下一节气: ${r.jieQiInfo.prevJie}(${r.jieQiInfo.daysToPrevJie}天前) → ${r.jieQiInfo.nextJie}(${r.jieQiInfo.daysToNextJie}天后)`);

    // 验证四柱不为空
    check(`四柱完整 (4柱)`, r.pillars.length === 4, pillars);
    check(`年柱干支有效`, r.pillars[0].ganzhi.length === 2, r.pillars[0].ganzhi);
    check(`日柱干支有效`, r.pillars[2].ganzhi.length === 2, r.pillars[2].ganzhi);
    check(`时柱干支有效`, r.pillars[3].ganzhi.length === 2, r.pillars[3].ganzhi);
    check(`纳音完整`, r.pillars.every(p => !!p.nayin), r.pillars.map(p=>p.nayin).join("/"));
    check(`身强身弱有结果`, ['身强','身弱','中和'].includes(r.shenQiangRuo.result), r.shenQiangRuo.result);
    check(`大运列表10运`, r.dayun.dayunList.length === 10, `${r.dayun.dayunList.length}运`);
  } catch (e) {
    check(`${c.desc} 排盘异常`, false, e.message);
  }
}

// ============================================================================
// 2. 梅花易数验证
// ============================================================================

section("2. 梅花易数 (meihua) - calculateMeihua()");

// 2a. 时间起卦
console.log("\n  --- 时间起卦法 ---");
const timeCases = [
  { year: 2026, month: 7, day: 31, hour: 12, desc: "2026-7-31 午时" },
  { year: 2026, month: 6, day: 28, hour: 18, desc: "2026-6-28 酉时" },
];

for (const c of timeCases) {
  console.log(`\n  用例: ${c.desc}`);
  try {
    const r = calculateMeihua({ method: "time", year: c.year, month: c.month, day: c.day, hour: c.hour });
    console.log(`    本卦: ${r.benGua.num}卦 ${r.benGua.name} (${r.benGua.upper}${r.benGua.lower}) 动爻: ${r.changeYao}爻`);
    console.log(`    互卦: ${r.huGua.num}卦 ${r.huGua.name} (${r.huGua.upper}${r.huGua.lower})`);
    console.log(`    变卦: ${r.bianGua.num}卦 ${r.bianGua.name} (${r.bianGua.upper}${r.bianGua.lower})`);
    console.log(`    体用: 体卦=${r.tiYong.tiGua}(${r.tiYong.tiWuxing}) 用卦=${r.tiYong.yongGua}(${r.tiYong.yongWuxing}) → ${r.tiYong.relation} (${r.tiYong.description})`);

    check(`本卦序号1-64`, r.benGua.num >= 1 && r.benGua.num <= 64, `第${r.benGua.num}卦`);
    check(`动爻1-6`, r.changeYao >= 1 && r.changeYao <= 6, `${r.changeYao}爻`);
    check(`互卦序号1-64`, r.huGua.num >= 1 && r.huGua.num <= 64, `第${r.huGua.num}卦`);
    check(`变卦序号1-64`, r.bianGua.num >= 1 && r.bianGua.num <= 64, `第${r.bianGua.num}卦`);
    check(`体用分析有结果`, !!r.tiYong.relation, r.tiYong.relation);
  } catch (e) {
    check(`${c.desc} 时间起卦异常`, false, e.message);
  }
}

// 2b. 数字起卦
console.log("\n  --- 数字起卦法 ---");
const numCases = [
  { nums: [1, 2, 3], desc: "数字 1,2,3" },
  { nums: [8, 8, 6], desc: "数字 8,8,6" },
  { nums: [3, 5, 1], desc: "数字 3,5,1" },
];

for (const c of numCases) {
  console.log(`\n  用例: ${c.desc}`);
  try {
    const d = numberDivination(c.nums[0], c.nums[1], c.nums[2]);
    console.log(`    上卦=${d.upperTrigram} 下卦=${d.lowerTrigram} 动爻=${d.changeYao} 卦序=${d.hexNum}`);

    const r = calculateMeihua({ method: "number", year: 2026, month: 1, day: 1, hour: 0, numbers: c.nums });
    console.log(`    本卦: ${r.benGua.name} 互卦: ${r.huGua.name} 变卦: ${r.bianGua.name}`);

    check(`数字起卦上卦有效`, !!d.upperTrigram, d.upperTrigram);
    check(`数字起卦下卦有效`, !!d.lowerTrigram, d.lowerTrigram);
    check(`动爻1-6`, d.changeYao >= 1 && d.changeYao <= 6, `${d.changeYao}爻`);
  } catch (e) {
    check(`${c.desc} 数字起卦异常`, false, e.message);
  }
}

// ============================================================================
// 3. 小六壬验证
// ============================================================================

section("3. 小六壬 (xiaoliuren) - calculateXiaoLiuRen()");

// 验证六个掌诀基础计算
console.log("\n  --- 六掌诀基础位置验证 ---");
const positions6 = PALM_POSITIONS.map(p => p.name);
console.log(`    掌诀顺序: ${positions6.join(" → ")}`);

// 正月初一子时 = 大安起 → 月落大安(1月) → 日落大安(1日) → 时落大安(子时=1)
const test1 = calculateXiaoLiuRen({ month: 1, day: 1, shichen: 0 });
console.log(`\n  用例: 正月初一子时 (月=1,日=1,时辰=子=0)`);
console.log(`    月落位: ${test1.steps[0].result} 日落位: ${test1.steps[1].result} 时落位: ${test1.steps[2].result}`);
console.log(`    最终掌诀: ${test1.finalPosition.name} (${test1.finalPosition.jiXiong}, ${test1.finalPosition.wuxing}, ${test1.finalPosition.direction})`);
check(`正月初一子时落大安`, test1.finalPosition.name === "大安", test1.finalPosition.name);

// 二月初二丑时
const test2 = calculateXiaoLiuRen({ month: 2, day: 2, shichen: 1 });
console.log(`\n  用例: 二月初二丑时 (月=2,日=2,时辰=丑=1)`);
console.log(`    月落位: ${test2.steps[0].result} 日落位: ${test2.steps[1].result} 时落位: ${test2.steps[2].result}`);
console.log(`    最终掌诀: ${test2.finalPosition.name} (${test2.finalPosition.jiXiong})`);

// 三月初三寅时
const test3 = calculateXiaoLiuRen({ month: 3, day: 3, shichen: 2 });
console.log(`\n  用例: 三月初三寅时 (月=3,日=3,时辰=寅=2)`);
console.log(`    月落位: ${test3.steps[0].result} 日落位: ${test3.steps[1].result} 时落位: ${test3.steps[2].result}`);
console.log(`    最终掌诀: ${test3.finalPosition.name} (${test3.finalPosition.jiXiong})`);

// 四月初四卯时
const test4 = calculateXiaoLiuRen({ month: 4, day: 4, shichen: 3 });
console.log(`\n  用例: 四月初四卯时 (月=4,日=4,时辰=卯=3)`);
console.log(`    月落位: ${test4.steps[0].result} 日落位: ${test4.steps[1].result} 时落位: ${test4.steps[2].result}`);
console.log(`    最终掌诀: ${test4.finalPosition.name} (${test4.finalPosition.jiXiong})`);

// 五月初五辰时
const test5 = calculateXiaoLiuRen({ month: 5, day: 5, shichen: 4 });
console.log(`\n  用例: 五月初五辰时 (月=5,日=5,时辰=辰=4)`);
console.log(`    月落位: ${test5.steps[0].result} 日落位: ${test5.steps[1].result} 时落位: ${test5.steps[2].result}`);
console.log(`    最终掌诀: ${test5.finalPosition.name} (${test5.finalPosition.jiXiong})`);

// 六月初六巳时
const test6 = calculateXiaoLiuRen({ month: 6, day: 6, shichen: 5 });
console.log(`\n  用例: 六月初六巳时 (月=6,日=6,时辰=巳=5)`);
console.log(`    月落位: ${test6.steps[0].result} 日落位: ${test6.steps[1].result} 时落位: ${test6.steps[2].result}`);
console.log(`    最终掌诀: ${test6.finalPosition.name} (${test6.finalPosition.jiXiong})`);

// 验证掌诀循环：大安(1)→留连(2)→速喜(3)→赤口(4)→小吉(5)→空亡(6)→大安(1)
console.log(`\n  --- 掌诀循环验证 (大安起数N步) ---`);
for (let n = 1; n <= 6; n++) {
  const idx = countClockwise(0, n);
  const expected = PALM_POSITIONS[(n - 1) % 6].name;
  const actual = PALM_POSITIONS[idx].name;
  console.log(`    数${n}步 → ${actual} (期望: ${expected})`);
  check(`数${n}步落${expected}`, actual === expected, actual);
}

// 验证时辰映射
console.log(`\n  --- 时辰映射验证 ---`);
const hourTests = [
  { h: 0, expected: 0 }, { h: 1, expected: 1 }, { h: 12, expected: 6 },
  { h: 23, expected: 0 }, { h: 11, expected: 6 }, { h: 17, expected: 9 },
];
for (const t of hourTests) {
  const si = hourToShichen(t.h);
  const name = SHICHEN_NAMES[si];
  console.log(`    ${t.h}时 → 时辰索引${si} (${name}时)`);
  check(`${t.h}时时辰索引正确`, si === t.expected, `索引${si}, 期望${t.expected}`);
}

// ============================================================================
// 4. 紫微斗数验证 (iztro库)
// ============================================================================

section("4. 紫微斗数 (ziwei) - calculateZiwei() + iztro");

const ziweiCases = [
  { year: 1990, month: 5, day: 15, hour: 12, gender: "male", desc: "1990-5-15 12:00 男" },
  { year: 1985, month: 10, day: 3, hour: 8, gender: "female", desc: "1985-10-3 8:00 女" },
  { year: 2000, month: 1, day: 1, hour: 0, gender: "male", desc: "2000-1-1 0:30 男" },
];

for (const c of ziweiCases) {
  console.log(`\n  用例: ${c.desc}`);
  try {
    const r = calculateZiwei(c);
    console.log(`    农历: ${r.lunarDate}`);
    console.log(`    四柱: ${r.chineseDate}`);
    console.log(`    五行局: ${r.fiveElementsClass} 命主: ${r.soulStar} 身主: ${r.bodyStar}`);
    console.log(`    身宫: ${r.bodyPalace}`);

    // 找命宫（通常是第一个有主星的宫位，或按地支查找）
    // 输出12宫关键信息
    const majorPalaces = r.palaces.filter(p => p.majorStars.length > 0).slice(0, 5);
    console.log(`    12宫数: ${r.palaces.length} (含主星宫: ${r.palaces.filter(p=>p.majorStars.length>0).length}宫)`);

    // 找紫微星所在宫位
    const ziweiPalace = r.palaces.find(p => p.majorStars.includes("紫微"));
    if (ziweiPalace) {
      console.log(`    紫微宫: ${ziweiPalace.name} (${ziweiPalace.heavenlyStem}${ziweiPalace.earthlyBranch}) 主星: ${ziweiPalace.majorStars.join(",")}`);
    }

    // 四化
    console.log(`    四化: 化禄=${r.sihua.huaLu.star}在${r.sihua.huaLu.palace} 化权=${r.sihua.huaQuan.star}在${r.sihua.huaQuan.palace} 化科=${r.sihua.huaKe.star}在${r.sihua.huaKe.palace} 化忌=${r.sihua.huaJi.star}在${r.sihua.huaJi.palace}`);

    // 大限
    const firstDecadal = r.palaces[0];
    console.log(`    首宫大限: ${firstDecadal.decadal} ${firstDecadal.ageRange[0]}-${firstDecadal.ageRange[1]}岁`);

    check(`12宫完整`, r.palaces.length === 12, `${r.palaces.length}宫`);
    check(`五行局存在`, !!r.fiveElementsClass, r.fiveElementsClass);
    check(`命主存在`, !!r.soulStar, r.soulStar);
    check(`身主存在`, !!r.bodyStar, r.bodyStar);
    check(`身宫存在`, !!r.bodyPalace, r.bodyPalace);
    check(`四化完整`, !!r.sihua.huaLu.star && !!r.sihua.huaJi.star, `禄:${r.sihua.huaLu.star} 忌:${r.sihua.huaJi.star}`);
    check(`星曜总数>30`, r.stars.length > 30, `${r.stars.length}颗星`);
  } catch (e) {
    check(`${c.desc} 紫微排盘异常`, false, e.message);
  }
}

// ============================================================================
// 5. 大六壬验证
// ============================================================================

section("5. 大六壬 (daliuren) - calculateDaLiuRen()");

const dlrCases = [
  { year: 2026, month: 6, day: 28, hour: 18, minute: 0, isMan: true, birthYear: 1990, desc: "2026-6-28 18:00 男" },
  { year: 2026, month: 7, day: 31, hour: 8, minute: 0, isMan: true, birthYear: 1990, desc: "2026-7-31 08:00 男" },
  { year: 1990, month: 1, day: 1, hour: 12, minute: 0, isMan: true, birthYear: 1990, desc: "1990-1-1 12:00 男" },
];

for (const c of dlrCases) {
  console.log(`\n  用例: ${c.desc}`);
  try {
    const r = calculateDaLiuRen(c.year, c.month, c.day, c.hour, c.minute, c.isMan, c.birthYear);
    console.log(`    四柱: ${r.siZhu.join(" ")}`);
    console.log(`    占时: ${r.zhanbuTime}时  月将: ${r.yuejiangZhi}(${r.yuejiangName}) 换将中气: ${r.yuejiangZhongQi}`);
    console.log(`    日辰: ${r.dayGan}${r.dayZhi}  空亡: ${r.kongwang}  昼夜: ${r.isDaytime ? "昼贵" : "夜贵"}`);
    console.log(`    本命: ${r.benMing}(${r.shengXiao})  行年: ${r.xingYear}`);
    console.log(`    节气: ${r.jieqiInfo}`);

    // 四课
    console.log(`    四课:`);
    const keNames = ["第一课(干阳)", "第二课(干阴)", "第三课(支阳)", "第四课(支阴)"];
    for (let i = 0; i < 4; i++) {
      const k = r.siKe[i];
      console.log(`      ${keNames[i]}: ${k.xiaShen}上${k.shangShen} 将=${k.tianJiang} 遁干=${k.dunGan}`);
    }

    // 三传
    const chuanNames = ["初传", "中传", "末传"];
    console.log(`    三传 (${r.sanChuanMethod}法 → ${r.keTi}):`);
    for (let i = 0; i < 3; i++) {
      const s = r.sanChuan[i];
      console.log(`      ${chuanNames[i]}: ${s.gan}${s.zhi} 将=${s.shen} 六亲=${s.liuqin}`);
    }

    // 验证
    check(`四柱完整`, r.siZhu.length === 4, r.siZhu.join(" "));
    check(`月将有效`, !!r.yuejiangZhi && !!r.yuejiangName, `${r.yuejiangZhi}(${r.yuejiangName})`);
    check(`日干支有效`, r.dayGan && r.dayZhi, r.dayGan + r.dayZhi);
    check(`四课完整`, r.siKe.length === 4, `${r.siKe.length}课`);
    check(`三传完整`, r.sanChuan.length === 3, r.sanChuan.map(s=>s.zhi).join("→"));
    check(`课体判定有结果`, !!r.keTi, `${r.sanChuanMethod}/${r.keTi}`);
    check(`空亡为两个地支`, r.kongwang.length === 2, r.kongwang);
    check(`天盘12位完整`, Object.keys(r.yueJiangMap).length === 12, `${Object.keys(r.yueJiangMap).length}位`);
    check(`天将12位完整`, Object.keys(r.guiShenMap).length === 12, `${Object.keys(r.guiShenMap).length}位`);
  } catch (e) {
    check(`${c.desc} 大六壬排盘异常`, false, e.message + "\n" + e.stack);
  }
}

// ============================================================================
// 验证总结
// ============================================================================

section("验证总结");

console.log(`
  总测试项: ${results.total}
  通过:     ${results.pass}
  失败:     ${results.fail}
  通过率:   ${results.total > 0 ? ((results.pass / results.total) * 100).toFixed(1) : 0}%
`);

if (results.fail === 0) {
  console.log("  所有验证项均通过。6大核心易学工具排盘数据正常。\n");
} else {
  console.log(`  有 ${results.fail} 项未通过，请检查相关模块。\n`);
}
