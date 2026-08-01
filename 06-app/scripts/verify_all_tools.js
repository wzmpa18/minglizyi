/**
 * ============================================================================
 * 9大易学工具全量算法核验脚本
 * ============================================================================
 * 用法: npx tsx scripts/verify_all_tools.js
 *
 * 核验模块:
 *   1. 八字排盘 (bazi)        - 5组用例
 *   2. 紫微斗数 (ziwei)       - 3组用例 (iztro库)
 *   3. 大六壬   (daliuren)    - 3组用例 (内联算法)
 *   4. 奇门遁甲 (qimen)       - 3组用例 (拆补/置闰/茅山)
 *   5. 六爻占卜 (liuyao)      - 3组用例 (时间/数字/手动)
 *   6. 八字合婚 (hehun)       - 2组用例
 *   7. 梅花易数 (meihua)      - 3组用例 (时间/数字/方位)
 *   8. 小六壬   (xiaoliuren)  - 3组用例
 *   9. 易学首页 (yixue home)  - 路由/九宫格检查
 * ============================================================================
 */

// ============================================================================
// 模块导入
// ============================================================================

// 八字 & 公共基础
import {
  solarToBazi, buildBazi, GAN, ZHI,
  getNaYin, getXunKong, ganIndex, zhiIndex,
  GAN_WUXING as BAZI_GAN_WUXING, ZHI_WUXING as BAZI_ZHI_WUXING,
  NAYIN, CANGGAN, XUNKONG_TABLE,
} from '../src/algorithm-core/modules/bazi/base.ts';

// 从 common 层导入
import {
  getKongwang, getYearGanZhi, getShengXiao,
  GAN as COMMON_GAN, ZHI as COMMON_ZHI,
} from '../src/algorithm-core/common/ganzhi.ts';

import {
  GAN_WUXING, ZHI_WUXING, GAN_YIN_YANG, ZHI_YIN_YANG,
  getWuxingRelation,
} from '../src/algorithm-core/common/wuxing.ts';

import {
  getJieQiDate, getJieQiIndex, getCurrentJieQi,
} from '../src/algorithm-core/common/jieqi.ts';

// 紫微斗数
import { calculateZiwei } from '../src/algorithm-core/modules/ziwei/index.ts';

// 奇门遁甲
import { calculateQimen } from '../src/algorithm-core/modules/qimen/index.ts';

// 六爻
import { calculateLiuyao } from '../src/algorithm-core/modules/liuyao/index.ts';

// 梅花易数
import {
  calculateMeihua, numberDivination as meihuaNumberDiv,
  timeDivination as meihuaTimeDiv,
  getTrigramInfo, TRIGRAM_NUMBER_MAP,
} from '../src/algorithm-core/modules/meihua/index.ts';

// 小六壬
import {
  calculateXiaoLiuRen, hourToShichen, PALM_POSITIONS, SHICHEN_NAMES,
} from '../src/algorithm-core/modules/xiaoliuren/index.ts';

// 合婚
import { calculateHehun } from '../src/algorithm-core/modules/hehun/index.ts';

// 文件系统检查（易学首页路由）
import { existsSync } from 'fs';
import { join } from 'path';

// ============================================================================
// 大六壬核心算法（从 daliuren/page.tsx 提取）
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

// 720课三传查找表
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

function dlr_getYueJiang(year, month, day) {
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

function dlr_getLiuQin(dayGan, zhi) {
  const ganWx = GAN_WUXING[dayGan];
  const zhiWx = ZHI_WUXING[zhi];
  const relation = getWuxingRelation(ganWx, zhiWx);
  return LIU_QIN_SHORT[relation] ?? "";
}

function calculateDaLiuRen(year, month, day, hour, minute, isMan, birthYear) {
  const bazi = solarToBazi({ year, month, day, hour, minute: minute || 0, gender: isMan ? "male" : "female" });
  const pillars = bazi.pillars;
  const siZhu = pillars.map((p) => [p.gan, p.zhi]);
  const dayGan = siZhu[2][0];
  const dayZhi = siZhu[2][1];

  const yj = dlr_getYueJiang(year, month, day);
  const yuejiangZhi = yj.zhi;
  const yuejiangName = yj.name;

  const zhanbuTime = HOUR_TO_ZHI[hour] ?? "子";
  const isDaytime = hour >= 5 && hour < 17;

  const currentJieQi = getCurrentJieQi(new Date(year, month - 1, day, hour, minute || 0));
  const jieqiInfo = currentJieQi.name;

  const kw = getKongwang(siZhu[2][0] + siZhu[2][1]) ?? "戌亥";
  const kongwang = kw;

  const by = birthYear ?? year;
  const benMingGanZhi = getYearGanZhi(by);
  const shengXiao = getShengXiao(benMingGanZhi[1]);

  // 天盘
  const yjIdx = YUE_JIANG_LIST.indexOf(yuejiangZhi);
  const yjIter = circularList(YUE_JIANG_LIST, yjIdx, true);
  const zhanbuIdx = DZ_DIPAN.indexOf(zhanbuTime);
  const yueJiangMap = {};
  for (let i = zhanbuIdx; i < 12; i++) yueJiangMap[DZ_DIPAN[i]] = yjIter();
  for (let i = 0; i < zhanbuIdx; i++) yueJiangMap[DZ_DIPAN[i]] = yjIter();

  // 天将
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

  // 天干
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
  const ganYin = yueJiangMap[ganYang];
  const zhiYang = yueJiangMap[dayZhi];
  const zhiYin = yueJiangMap[zhiYang];

  const siKe = [
    { xiaShen: jigong, shangShen: ganYang },
    { xiaShen: ganYang, shangShen: ganYin },
    { xiaShen: dayZhi, shangShen: zhiYang },
    { xiaShen: zhiYang, shangShen: zhiYin },
  ];

  // 三传
  const ganZhi = dayGan + dayZhi;
  const ke720 = KE_720[ganZhi];
  let sanChuanZhi = [];
  if (ke720 && ke720[ganYang]) {
    sanChuanZhi = ke720[ganYang].split("");
  } else {
    sanChuanZhi = [ganYang, ganYin, zhiYang];
  }

  // 课体判定
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
    const scLiuqin = dlr_getLiuQin(dayGan, scZhi);
    sanChuan.push({ zhi: scZhi, gan: scGan, shen: scShen, liuqin: scLiuqin });
  }

  return {
    dateStr: `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")} ${String(hour).padStart(2,"0")}:${String(minute||0).padStart(2,"0")}`,
    siZhu: siZhu.map(([g,z]) => g+z),
    yuejiangZhi, yuejiangName, yuejiangZhongQi: yj.zhongQi,
    zhanbuTime, isDaytime, jieqiInfo,
    dayGan, dayZhi,
    kongwang,
    shengXiao,
    yueJiangMap, guiShenMap, tianGanMap,
    siKe, sanChuan, sanChuanMethod, keTi,
  };
}

// ============================================================================
// 结果收集与输出工具
// ============================================================================

const allResults = [];
let totalChecks = 0;
let passChecks = 0;
let failChecks = 0;

function section(title) {
  console.log("\n" + "=".repeat(78));
  console.log("  " + title);
  console.log("=".repeat(78));
}

function caseHeader(caseNum, desc) {
  console.log(`\n  ── 用例 ${caseNum}: ${desc}`);
}

function check(toolName, caseDesc, label, condition, actualValue, expectedValue) {
  totalChecks++;
  const status = condition ? "PASS" : "FAIL";
  if (condition) passChecks++; else failChecks++;
  const record = {
    tool: toolName,
    case: caseDesc,
    check: label,
    status,
    actual: actualValue,
    expected: expectedValue,
  };
  allResults.push(record);
  const icon = condition ? "✓" : "✗";
  const detail = condition ? "" : ` (期望: ${expectedValue}, 实际: ${actualValue})`;
  console.log(`    [${icon}] ${label}${detail}`);
}

function data(label, value) {
  console.log(`    ${label}: ${value}`);
}

// ============================================================================
// 1. 八字排盘验证 (5组用例)
// ============================================================================

section("1. 八字排盘 (bazi) - 5组用例");

const baziCases = [
  {
    year: 1990, month: 5, day: 15, hour: 12, gender: "male",
    desc: "1990-5-15 12:00 男",
    expected: { year: "庚午", month: "辛巳", day: "庚辰", hour: "壬午" },
  },
  {
    year: 1985, month: 10, day: 3, hour: 8, gender: "female",
    desc: "1985-10-3 8:00 女",
    expected: { year: "乙丑", month: "乙酉", day: "乙亥", hour: "庚辰" },
  },
  {
    year: 2000, month: 1, day: 1, hour: 0, minute: 30, gender: "male",
    desc: "2000-1-1 0:30 男",
    expected: { year: "己卯", month: "丁丑", day: "戊午", hour: "壬子" },
  },
  {
    year: 1996, month: 2, day: 4, hour: 23, minute: 30, gender: "female",
    desc: "1996-2-4 23:30 女 (早子时/节气交界)",
    expected: null, // 节气交界/早子时，结果以算法输出为准
  },
  {
    year: 2024, month: 2, day: 29, hour: 12, gender: "male",
    desc: "2024-2-29 12:00 男 (闰年测试)",
    expected: null, // 闰年，结果以算法输出为准
  },
];

baziCases.forEach((c, idx) => {
  caseHeader(idx + 1, c.desc);
  try {
    const r = solarToBazi(c);
    const pillars = r.pillars;
    const gz = pillars.map(p => p.ganzhi);
    data("四柱", gz.join(" / "));
    data("纳音", pillars.map(p => p.nayin).join(" / "));
    data("日主五行", GAN_WUXING[r.dayGan] + ` (${r.dayGan}${r.dayZhi})`);
    data("日柱空亡", pillars[2].xunkong);
    data("身强身弱", `${r.shenQiangRuo?.result ?? 'N/A'} (${r.shenQiangRuo?.totalScore ?? 'N/A'}分)`);

    // 校验四柱干支
    if (c.expected) {
      check("八字", c.desc, "年柱干支", pillars[0].ganzhi === c.expected.year, pillars[0].ganzhi, c.expected.year);
      check("八字", c.desc, "月柱干支", pillars[1].ganzhi === c.expected.month, pillars[1].ganzhi, c.expected.month);
      check("八字", c.desc, "日柱干支", pillars[2].ganzhi === c.expected.day, pillars[2].ganzhi, c.expected.day);
      check("八字", c.desc, "时柱干支", pillars[3].ganzhi === c.expected.hour, pillars[3].ganzhi, c.expected.hour);
    } else {
      // 只验证四柱完整性
      check("八字", c.desc, "四柱完整(4柱)", pillars.length === 4, pillars.length, 4);
      check("八字", c.desc, "年柱干支有效(2字)", pillars[0].ganzhi.length === 2, pillars[0].ganzhi, "2字");
      check("八字", c.desc, "时柱干支有效(2字)", pillars[3].ganzhi.length === 2, pillars[3].ganzhi, "2字");
    }

    // 通用校验
    check("八字", c.desc, "纳音完整(4柱)", pillars.every(p => !!p.nayin), pillars.map(p => p.nayin).join(","), "全部有值");
    check("八字", c.desc, "空亡有值", !!pillars[2].xunkong, pillars[2].xunkong, "非空");
    check("八字", c.desc, "日主五行有效", !!GAN_WUXING[r.dayGan], GAN_WUXING[r.dayGan], "金木水火土之一");
    check("八字", c.desc, "大运列表(10步)", r.dayun?.dayunList?.length === 10, r.dayun?.dayunList?.length ?? 0, 10);
  } catch (e) {
    check("八字", c.desc, "排盘无异常", false, e.message, "无异常");
    console.log(`    错误详情: ${e.stack?.substring(0, 300) || e.message}`);
  }
});

// ============================================================================
// 2. 紫微斗数验证 (3组用例, 使用iztro)
// ============================================================================

section("2. 紫微斗数 (ziwei) - 3组用例 (iztro库)");

const ziweiCases = [
  { year: 1990, month: 5, day: 15, hour: 12, gender: "male", desc: "1990-5-15 12:00 男" },
  { year: 1985, month: 10, day: 3, hour: 8, gender: "female", desc: "1985-10-3 8:00 女" },
  { year: 2000, month: 1, day: 1, hour: 0, gender: "male", desc: "2000-1-1 0:00 男" },
];

ziweiCases.forEach((c, idx) => {
  caseHeader(idx + 1, c.desc);
  try {
    const r = calculateZiwei(c);
    data("农历", r.lunarDate);
    data("四柱(中文)", r.chineseDate);
    data("五行局", r.fiveElementsClass);
    data("命主", r.soulStar);
    data("身主", r.bodyStar);

    // 找命宫（命宫是十二宫中包含"命"字位置的宫？iztro中命宫位置需要从palaces找）
    // iztro中命宫是earthlyBranch='寅'开始，但命宫由生月+生时决定
    // 我们直接检查关键数据完整性
    const mingPalace = r.palaces.find(p => p.name === '命宫');
    if (mingPalace) {
      data("命宫天干地支", `${mingPalace.heavenlyStem}${mingPalace.earthlyBranch}`);
      data("命宫主星", mingPalace.majorStars.join(", ") || "无主星");
    }

    check("紫微", c.desc, "12宫完整", r.palaces.length === 12, r.palaces.length, 12);
    check("紫微", c.desc, "五行局有效", !!r.fiveElementsClass, r.fiveElementsClass, "非空");
    check("紫微", c.desc, "命主有值", !!r.soulStar, r.soulStar, "非空");
    check("紫微", c.desc, "身主有值", !!r.bodyStar, r.bodyStar, "非空");
    check("紫微", c.desc, "宫位干支有效(12宫)", r.palaces.every(p => !!p.heavenlyStem && !!p.earthlyBranch),
      r.palaces.filter(p => !p.heavenlyStem || !p.earthlyBranch).length + "个宫位缺干支", "0个");
    check("紫微", c.desc, "四化完整", !!r.sihua?.huaLu && !!r.sihua?.huaQuan && !!r.sihua?.huaKe && !!r.sihua?.huaJi,
      "四化存在", "全部有值");
    check("紫微", c.desc, "身宫有值", !!r.bodyPalace, r.bodyPalace, "非空");
  } catch (e) {
    check("紫微", c.desc, "排盘无异常", false, e.message, "无异常");
    console.log(`    错误详情: ${e.stack?.substring(0, 300) || e.message}`);
  }
});

// ============================================================================
// 3. 大六壬验证 (3组用例)
// ============================================================================

section("3. 大六壬 (daliuren) - 3组用例");

const daliurenCases = [
  {
    year: 2026, month: 6, day: 28, hour: 18, minute: 0, isMan: true,
    desc: "2026-6-28 18:00 (丙午/甲午/癸酉/辛酉)",
  },
  {
    year: 2026, month: 7, day: 31, hour: 8, minute: 0, isMan: true,
    desc: "2026-7-31 8:00 (丙午/乙未/...)",
  },
  {
    year: 1990, month: 1, day: 1, hour: 12, minute: 0, isMan: true,
    desc: "1990-1-1 12:00 (己巳/丁丑/丙寅/甲午)",
  },
];

daliurenCases.forEach((c, idx) => {
  caseHeader(idx + 1, c.desc);
  try {
    const r = calculateDaLiuRen(c.year, c.month, c.day, c.hour, c.minute, c.isMan);
    data("四柱", r.siZhu.join(" / "));
    data("月将", `${r.yuejiangName}(${r.yuejiangZhi}) - 中气: ${r.yuejiangZhongQi}`);
    data("占时", r.zhanbuTime + (r.isDaytime ? "(昼)" : "(夜)"));
    data("日干/日支", `${r.dayGan} / ${r.dayZhi}`);
    data("空亡", r.kongwang);
    data("课体", r.keTi + ` (${r.sanChuanMethod}法)`);
    data("四课", r.siKe.map(k => `${k.xiaShen}上${k.shangShen}`).join("  "));
    data("三传", r.sanChuan.map((s, i) => ["初", "中", "末"][i] + ": " + s.zhi + s.gan + "(" + s.shen + "/" + s.liuqin + ")").join("  "));

    check("大六壬", c.desc, "四柱完整(4柱)", r.siZhu.length === 4, r.siZhu.length, 4);
    check("大六壬", c.desc, "月将有值", !!r.yuejiangZhi && !!r.yuejiangName, r.yuejiangZhi + r.yuejiangName, "非空");
    check("大六壬", c.desc, "四课完整(4课)", r.siKe.length === 4, r.siKe.length, 4);
    check("大六壬", c.desc, "三传完整(初/中/末)", r.sanChuan.length === 3, r.sanChuan.length, 3);
    check("大六壬", c.desc, "课体有值", !!r.keTi, r.keTi, "非空");
    check("大六壬", c.desc, "空亡有值(2字)", r.kongwang.length === 2, r.kongwang, "2字");
    check("大六壬", c.desc, "天盘12支完整", Object.keys(r.yueJiangMap).length === 12, Object.keys(r.yueJiangMap).length, 12);
  } catch (e) {
    check("大六壬", c.desc, "排盘无异常", false, e.message, "无异常");
    console.log(`    错误详情: ${e.stack?.substring(0, 300) || e.message}`);
  }
});

// ============================================================================
// 4. 奇门遁甲验证 (3组用例: 拆补/置闰/茅山)
// ============================================================================

section("4. 奇门遁甲 (qimen) - 3组用例");

const qimenCases = [
  {
    year: 2026, month: 7, day: 31, hour: 8, minute: 0,
    panMethod: "chaibu",
    desc: "拆补法 2026-7-31 8时",
  },
  {
    year: 2026, month: 6, day: 28, hour: 18, minute: 0,
    panMethod: "zhirun",
    desc: "置闰法 2026-6-28 18时",
  },
  {
    year: 2024, month: 1, day: 1, hour: 12, minute: 0,
    panMethod: "maoshan",
    desc: "茅山法 2024-1-1 12时",
  },
];

qimenCases.forEach((c, idx) => {
  caseHeader(idx + 1, c.desc);
  try {
    const r = calculateQimen(c);
    data("局名", r.juName);
    data("阴阳遁", r.yinYangDun);
    data("局数", r.juNumber + "局");
    data("节气", r.jieqi);
    data("四柱", `${r.siZhu.year} ${r.siZhu.month} ${r.siZhu.day} ${r.siZhu.hour}`);
    data("旬首", r.xunShou);
    data("旬空", r.xunKong);
    data("值符", `${r.zhiFuZhiShi.zhiFuXingGong[0]} (${r.zhiFuZhiShi.zhiFuXingGong[1]}宫)`);
    data("值使", `${r.zhiFuZhiShi.zhiShiMenGong[0]} (${r.zhiFuZhiShi.zhiShiMenGong[1]}宫)`);

    // 列出九宫星门神干
    const bamen = ['休门','生门','伤门','杜门','景门','死门','惊门','开门'];
    const jiuxing = ['天蓬','天芮','天冲','天辅','天英','天禽','天柱','天心','天任'];
    data("九宫概要", r.palaces.filter(p => p.position !== 5).map(p =>
      `${p.palaceName}:${p.star || '禽'}/${p.door || '-'}/${p.tianShen || '-'}/${p.tianPanGan || ''}`
    ).join(" "));

    check("奇门", c.desc, "阴阳遁有效", ["阳遁", "阴遁"].includes(r.yinYangDun), r.yinYangDun, "阳遁/阴遁");
    check("奇门", c.desc, "局数1-9", r.juNumber >= 1 && r.juNumber <= 9, r.juNumber, "1-9");
    check("奇门", c.desc, "九宫完整(9宫)", r.palaces.length === 9, r.palaces.length, 9);
    check("奇门", c.desc, "值符星有值", !!r.zhiFuZhiShi?.zhiFuXingGong?.[0],
      r.zhiFuZhiShi?.zhiFuXingGong?.[0] || "", "非空");
    check("奇门", c.desc, "值使门有值", !!r.zhiFuZhiShi?.zhiShiMenGong?.[0],
      r.zhiFuZhiShi?.zhiShiMenGong?.[0] || "", "非空");
    check("奇门", c.desc, "旬空有值", !!r.xunKong && r.xunKong.length === 2, r.xunKong, "2字");
    check("奇门", c.desc, "八门分布(8门)", r.palaces.filter(p => bamen.includes(p.door)).length === 8,
      r.palaces.filter(p => bamen.includes(p.door)).length, 8);
    check("奇门", c.desc, "九星分布(含芮禽)", r.palaces.filter(p => p.star).length >= 8,
      r.palaces.filter(p => p.star).length, ">=8");
  } catch (e) {
    check("奇门", c.desc, "排盘无异常", false, e.message, "无异常");
    console.log(`    错误详情: ${e.stack?.substring(0, 300) || e.message}`);
  }
});

// ============================================================================
// 5. 六爻占卜验证 (3组用例)
// ============================================================================

section("5. 六爻占卜 (liuyao) - 3组用例");

const now = new Date();
const liuyaoCases = [
  {
    input: {
      year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(),
      hour: now.getHours(), method: "time", question: "今日运势如何",
    },
    desc: "时间起卦 (当前时间)",
  },
  {
    input: {
      year: 2026, month: 7, day: 31, hour: 10,
      method: "number", number: { upperNum: 1, lowerNum: 2, dongYao: 3 },
      question: "事业发展",
    },
    desc: "数字起卦 (上1下2动3)",
  },
  {
    input: {
      year: 2026, month: 7, day: 31, hour: 10,
      method: "manual",
      manual: { yaoTypes: ["1", "1", "1", "1", "1", "1"] }, // 六爻全静阳爻 = 乾为天
      question: "乾为天卦",
    },
    desc: "手动起卦 (六爻全静阳爻=乾为天)",
  },
];

liuyaoCases.forEach((c, idx) => {
  caseHeader(idx + 1, c.desc);
  try {
    const r = calculateLiuyao(c.input);
    data("本卦", `${r.benGua.name} (${r.benGua.gong})`);
    data("变卦", r.bianGua ? r.bianGua.name : "无动爻(静卦)");
    data("四柱", r.siZhu.join(" "));
    data("日辰/空亡", `${r.dayGanZhi} 空亡:${r.kongWang}`);

    // 世应位置
    const shiYao = r.benGua.yaos.find(y => y.isShi);
    const yingYao = r.benGua.yaos.find(y => y.isYing);
    data("世爻", shiYao ? `第${shiYao.position}爻 ${shiYao.gan}${shiYao.zhi}(${shiYao.liuQin})` : "未找到");
    data("应爻", yingYao ? `第${yingYao.position}爻 ${yingYao.gan}${yingYao.zhi}(${yingYao.liuQin})` : "未找到");

    // 动爻
    const dongYaos = r.benGua.yaos.filter(y => y.isDong);
    data("动爻", dongYaos.length > 0 ? dongYaos.map(y => `第${y.position}爻(${y.liuShen})`).join(", ") : "无动爻(静卦)");

    // 六神
    data("六神(初→上)", r.benGua.yaos.map(y => y.liuShen).join(" "));

    check("六爻", c.desc, "本卦名有值", !!r.benGua.name, r.benGua.name, "非空");
    check("六爻", c.desc, "六爻完整(6爻)", r.benGua.yaos.length === 6, r.benGua.yaos.length, 6);
    check("六爻", c.desc, "世爻存在", !!shiYao, shiYao ? `第${shiYao.position}爻` : "无", "存在");
    check("六爻", c.desc, "应爻存在", !!yingYao, yingYao ? `第${yingYao.position}爻` : "无", "存在");
    check("六爻", c.desc, "六亲完整(6爻)", r.benGua.yaos.every(y => !!y.liuQin),
      r.benGua.yaos.filter(y => !y.liuQin).length + "个缺六亲", "0个");
    check("六爻", c.desc, "六神完整(6爻)", r.benGua.yaos.every(y => !!y.liuShen),
      r.benGua.yaos.filter(y => !y.liuShen).length + "个缺六神", "0个");
    check("六爻", c.desc, "空亡有值", !!r.kongWang && r.kongWang.length === 2, r.kongWang, "2字");

    // 手动起卦特殊验证：六爻全阳=乾为天
    if (c.input.method === "manual" && c.input.manual && c.input.manual.yaoTypes && c.input.manual.yaoTypes.every(t => t === "1")) {
      check("六爻", c.desc, "六阳爻=乾为天", r.benGua.name === "乾为天", r.benGua.name, "乾为天");
      check("六爻", c.desc, "全静无变卦", r.bianGua === null, r.bianGua ? r.bianGua.name : "null(静卦)", "无变卦");
    }
    // 数字起卦验证：上1下2动3 → 验证卦名有效
    if (c.input.method === "number" && c.input.number && c.input.number.upperNum === 1 && c.input.number.lowerNum === 2) {
      check("六爻", c.desc, "数字起卦(1,2,3)卦名有效", !!r.benGua.name && r.benGua.name.length >= 2, r.benGua.name, "有效卦名");
    }
  } catch (e) {
    check("六爻", c.desc, "排盘无异常", false, e.message, "无异常");
    console.log(`    错误详情: ${e.stack?.substring(0, 300) || e.message}`);
  }
});

// ============================================================================
// 6. 八字合婚验证 (2组用例)
// ============================================================================

section("6. 八字合婚 (hehun) - 2组用例");

const hehunCases = [
  {
    male: { year: 1990, month: 5, day: 15, hour: 12, gender: "male" },
    female: { year: 1992, month: 8, day: 20, hour: 12, gender: "female" },
    desc: "1990-5-15男 vs 1992-8-20女",
  },
  {
    male: { year: 1985, month: 10, day: 3, hour: 8, gender: "male" },
    female: { year: 1990, month: 5, day: 15, hour: 12, gender: "female" },
    desc: "1985-10-3男 vs 1990-5-15女",
  },
];

hehunCases.forEach((c, idx) => {
  caseHeader(idx + 1, c.desc);
  try {
    const maleBz = solarToBazi(c.male);
    const femaleBz = solarToBazi(c.female);
    const r = calculateHehun(maleBz, femaleBz);

    data("男方四柱", r.male.pillars.map(p => p.ganzhi).join(" "));
    data("女方四柱", r.female.pillars.map(p => p.ganzhi).join(" "));
    data("男方生肖", r.male.shengxiao);
    data("女方生肖", r.female.shengxiao);
    data("综合评分", r.totalScore + "分");
    data("合婚等级", r.grade);
    data("总评", r.gradeDesc);
    data("通过项数", `${r.items.filter(i => i.pass).length}/${r.items.length}`);

    check("合婚", c.desc, "男方四柱完整", r.male.pillars.length === 4, r.male.pillars.length, 4);
    check("合婚", c.desc, "女方四柱完整", r.female.pillars.length === 4, r.female.pillars.length, 4);
    check("合婚", c.desc, "评分0-100", r.totalScore >= 0 && r.totalScore <= 100, r.totalScore, "0-100");
    check("合婚", c.desc, "等级有效", ['天作之合','上等婚','中等婚','下等婚','需谨慎'].includes(r.grade), r.grade, "五等级之一");
    check("合婚", c.desc, "分析项8项", r.items.length === 8, r.items.length, 8);
    check("合婚", c.desc, "男方生肖有值", !!r.male.shengxiao, r.male.shengxiao, "非空");
    check("合婚", c.desc, "女方生肖有值", !!r.female.shengxiao, r.female.shengxiao, "非空");
  } catch (e) {
    check("合婚", c.desc, "合婚分析无异常", false, e.message, "无异常");
    console.log(`    错误详情: ${e.stack?.substring(0, 300) || e.message}`);
  }
});

// ============================================================================
// 7. 梅花易数验证 (3组用例)
// ============================================================================

section("7. 梅花易数 (meihua) - 3组用例");

const meihuaCases = [
  {
    input: { method: "time", year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(), hour: now.getHours() },
    desc: "时间起卦 (当前时间)",
  },
  {
    input: { method: "number", year: 2026, month: 7, day: 31, hour: 10, numbers: [1, 2, 3] },
    desc: "数字起卦 (1,2,3)",
  },
  {
    // 方位起卦：用数字起卦模拟（方位对应卦数）
    // 传统方位起卦：来人方位为上卦，年支数+月数+日数+时数为下卦和动爻
    // 这里简化为用数字起卦模拟：东南(巽=5) 配 时辰数
    input: { method: "number", year: 2026, month: 7, day: 31, hour: 10, numbers: [5, 2, 4] },
    desc: "方位起卦 (东南巽方=5, 模拟)",
  },
];

meihuaCases.forEach((c, idx) => {
  caseHeader(idx + 1, c.desc);
  try {
    const r = calculateMeihua(c.input);
    data("本卦", `${r.benGua.name} (${r.benGua.upper}上${r.benGua.lower}下)`);
    data("互卦", `${r.huGua.name} (${r.huGua.upper}上${r.huGua.lower}下)`);
    data("变卦", `${r.bianGua.name} (${r.bianGua.upper}上${r.bianGua.lower}下)`);
    data("动爻", `第${r.changeYao}爻`);
    data("体用", `体卦=${r.tiYong.tiGua}(${r.tiYong.tiWuxing}), 用卦=${r.tiYong.yongGua}(${r.tiYong.yongWuxing})`);
    data("体用关系", `${r.tiYong.relation} - ${r.tiYong.description}`);

    check("梅花", c.desc, "本卦名有值", !!r.benGua.name, r.benGua.name, "非空");
    check("梅花", c.desc, "互卦名有值", !!r.huGua.name, r.huGua.name, "非空");
    check("梅花", c.desc, "变卦名有值", !!r.bianGua.name, r.bianGua.name, "非空");
    check("梅花", c.desc, "动爻1-6", r.changeYao >= 1 && r.changeYao <= 6, r.changeYao, "1-6");
    check("梅花", c.desc, "体卦有值", !!r.tiYong.tiGua, r.tiYong.tiGua, "非空");
    check("梅花", c.desc, "用卦有值", !!r.tiYong.yongGua, r.tiYong.yongGua, "非空");
    check("梅花", c.desc, "体用关系有值", !!r.tiYong.relation, r.tiYong.relation, "非空");

    // 数字起卦验证：1,2,3 → 上乾下兑=天泽履，动爻3
    if (c.input.method === "number" && c.input.numbers && c.input.numbers[0] === 1 && c.input.numbers[1] === 2 && c.input.numbers[2] === 3) {
      check("梅花", c.desc, "数字(1,2,3)=天泽履", r.benGua.name === "天泽履", r.benGua.name, "天泽履");
      check("梅花", c.desc, "动爻=第3爻", r.changeYao === 3, r.changeYao, 3);
    }
  } catch (e) {
    check("梅花", c.desc, "起卦无异常", false, e.message, "无异常");
    console.log(`    错误详情: ${e.stack?.substring(0, 300) || e.message}`);
  }
});

// ============================================================================
// 8. 小六壬验证 (3组用例)
// ============================================================================

section("8. 小六壬 (xiaoliuren) - 3组用例");

const xiaoliurenCases = [
  { month: 1, day: 1, shichen: 0, desc: "正月初一子时" },
  { month: 2, day: 2, shichen: 1, desc: "二月初二丑时" },
  { month: 5, day: 5, shichen: 4, desc: "五月初五辰时" },
];

xiaoliurenCases.forEach((c, idx) => {
  caseHeader(idx + 1, c.desc);
  try {
    const r = calculateXiaoLiuRen(c);
    const pos = r.finalPosition;
    data("推算步骤", r.steps.map(s => `${s.label}: ${s.startFrom}起数${s.count}→${s.result}`).join(" | "));
    data("结果", `${pos.name} (${pos.jiXiong}, 五行:${pos.wuxing}, 方位:${pos.direction})`);
    data("断辞", pos.description.substring(0, 50) + "...");

    check("小六壬", c.desc, "结果为六掌诀之一", ['大安','留连','速喜','赤口','小吉','空亡'].includes(pos.name), pos.name, "大安/留连/速喜/赤口/小吉/空亡");
    check("小六壬", c.desc, "吉凶有值", ['大吉','小吉','凶','大凶'].includes(pos.jiXiong), pos.jiXiong, "四级吉凶");
    check("小六壬", c.desc, "五行有值", ['金','木','水','火','土'].includes(pos.wuxing), pos.wuxing, "五行之一");
    check("小六壬", c.desc, "3步推算完整", r.steps.length === 3, r.steps.length, 3);

    // 手动验证正月初一子时：大安起1月(大安)→日从大安起1(大安)→时从大安起1(大安) = 大安
    if (c.month === 1 && c.day === 1 && c.shichen === 0) {
      check("小六壬", c.desc, "正月初一子时=大安", pos.name === "大安", pos.name, "大安");
    }
    // 二月初二丑时：大安起2月→留连；留连起2日→速喜；速喜起2(丑时=2)→赤口？让我算：
    // 大安(0)→countClockwise(0,2)=(0+2-1)%6=1→留连(月落留连)
    // 留连(1)→countClockwise(1,2)=(1+2-1)%6=2→速喜(日落速喜)
    // 速喜(2)→countClockwise(2,1+1=2)=(2+2-1)%6=3→赤口
    // 等等，shichen=1(丑时)，shichen+1=2
    if (c.month === 2 && c.day === 2 && c.shichen === 1) {
      check("小六壬", c.desc, "二月初二丑时=赤口", pos.name === "赤口", pos.name, "赤口");
    }
  } catch (e) {
    check("小六壬", c.desc, "推算无异常", false, e.message, "无异常");
    console.log(`    错误详情: ${e.stack?.substring(0, 300) || e.message}`);
  }
});

// ============================================================================
// 9. 易学首页检查
// ============================================================================

section("9. 易学首页路由检查");

const appDir = join(process.cwd(), "src", "app", "yixue");
const requiredRoutes = [
  "bazi", "ziwei", "daliuren", "qimen", "liuyao",
  "hehun", "meihua", "xiaoliuren",
  "page.tsx", "layout.tsx",
];

const expectedTools = [
  { href: "/yixue/bazi", label: "八字排盘" },
  { href: "/yixue/ziwei", label: "紫微斗数" },
  { href: "/yixue/daliuren", label: "大六壬" },
  { href: "/yixue/qimen", label: "奇门遁甲" },
  { href: "/yixue/liuyao", label: "六爻" },
  { href: "/yixue/hehun", label: "八字合婚" },
  { href: "/yixue/meihua", label: "梅花易数" },
  { href: "/yixue/xiaoliuren", label: "小六壬" },
];

// 检查页面文件存在
data("yixue目录", appDir);
const pageExists = existsSync(join(appDir, "page.tsx"));
const layoutExists = existsSync(join(appDir, "layout.tsx"));
check("首页", "/yixue路由", "page.tsx存在", pageExists, pageExists ? "存在" : "缺失", "存在");
check("首页", "/yixue路由", "layout.tsx存在", layoutExists, layoutExists ? "存在" : "缺失", "存在");

expectedTools.forEach(tool => {
  const routeName = tool.href.replace("/yixue/", "");
  const routeDir = join(appDir, routeName);
  const routePage = join(routeDir, "page.tsx");
  const exists = existsSync(routePage);
  check("首页", "九宫格入口", `${tool.label}(${tool.href})页面存在`, exists, exists ? "存在" : "缺失", "存在");
});

// 检查out目录中是否有yixue的静态导出
const outDir = join(process.cwd(), "out", "yixue");
const outExists = existsSync(outDir);
check("首页", "静态导出", "out/yixue目录存在", outExists, outExists ? "存在" : "不存在", "存在");

// ============================================================================
// 核验总表输出
// ============================================================================

console.log("\n" + "=".repeat(78));
console.log("  核验结果总表");
console.log("=".repeat(78));

// 按工具分组统计
const toolStats = {};
for (const r of allResults) {
  if (!toolStats[r.tool]) toolStats[r.tool] = { pass: 0, fail: 0, total: 0 };
  toolStats[r.tool].total++;
  if (r.status === "PASS") toolStats[r.tool].pass++;
  else toolStats[r.tool].fail++;
}

console.log("\n  ┌─────────────────┬───────┬───────┬───────┬────────┐");
console.log("  │ 工具            │ 总项  │ 通过  │ 失败  │ 通过率 │");
console.log("  ├─────────────────┼───────┼───────┼───────┼────────┤");
for (const [tool, stats] of Object.entries(toolStats)) {
  const rate = stats.total > 0 ? ((stats.pass / stats.total) * 100).toFixed(1) + "%" : "N/A";
  console.log(`  │ ${tool.padEnd(15)} │ ${String(stats.total).padStart(5)} │ ${String(stats.pass).padStart(5)} │ ${String(stats.fail).padStart(5)} │ ${rate.padStart(6)} │`);
}
console.log("  ├─────────────────┼───────┼───────┼───────┼────────┤");
const totalRate = totalChecks > 0 ? ((passChecks / totalChecks) * 100).toFixed(1) + "%" : "N/A";
console.log(`  │ ${"合计".padEnd(15)} │ ${String(totalChecks).padStart(5)} │ ${String(passChecks).padStart(5)} │ ${String(failChecks).padStart(5)} │ ${totalRate.padStart(6)} │`);
console.log("  └─────────────────┴───────┴───────┴───────┴────────┘");

// 失败项详情
if (failChecks > 0) {
  console.log("\n  失败项详情:");
  console.log("  ─" + "─".repeat(70));
  for (const r of allResults) {
    if (r.status === "FAIL") {
      console.log(`  [FAIL] [${r.tool}] ${r.case}`);
      console.log(`         ${r.check}`);
      console.log(`         期望: ${r.expected}, 实际: ${r.actual}`);
    }
  }
}

console.log("\n" + "=".repeat(78));
console.log(`  核验完成: 总计 ${totalChecks} 项检查, ${passChecks} 项通过, ${failChecks} 项失败`);
if (failChecks === 0) {
  console.log("  所有检查项全部通过!");
} else {
  console.log(`  有 ${failChecks} 项失败，请查看上方详情。`);
}
console.log("=".repeat(78));
