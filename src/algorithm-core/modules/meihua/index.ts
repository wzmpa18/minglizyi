/**
 * ============================================================================
 * 梅花易数算法模块
 * ============================================================================
 *
 * 算法来源：基于公开流传的梅花易数经典规则独立实现
 * - 时间起卦法（年月日时 → 本卦/动爻）
 * - 数字起卦法（三数 → 本卦/动爻）
 * - 互卦计算（本卦 → 互卦）
 * - 变卦计算（本卦 + 动爻 → 变卦）
 * - 体用生克分析
 * - 六十四卦卦辞（基于《周易》通行本）
 *
 * 协议：MIT
 * 创建日期：2026-07-27
 * 修改记录：无
 * ============================================================================
 */

import {
  TRIGRAM_DATA,
  HEXAGRAM_NAMES,
  HEXAGRAM_TRIGRAMS,
} from '@/algorithm-core/modules/liuyao';

// ============================================================================
// 类型定义
// ============================================================================

/** 八卦名称 */
export type TrigramName = '乾' | '兑' | '离' | '震' | '巽' | '坎' | '艮' | '坤';

/** 八卦数字映射（先天八卦数） */
export const TRIGRAM_NUMBER_MAP: Record<number, TrigramName> = {
  1: '乾', 2: '兑', 3: '离', 4: '震',
  5: '巽', 6: '坎', 7: '艮', 8: '坤',
};

/** 八卦符号（Unicode） */
export const TRIGRAM_SYMBOLS: Record<string, string> = {
  '乾': '\u2630', '兑': '\u2631', '离': '\u2632', '震': '\u2633',
  '巽': '\u2634', '坎': '\u2635', '艮': '\u2636', '坤': '\u2637',
};

/** 起卦方式 */
export type DivinationMethod = 'time' | 'number';

/** 梅花易数输入参数 */
export interface MeihuaInput {
  method: DivinationMethod;
  year: number;
  month: number;
  day: number;
  hour: number;
  /** 数字起卦时的三个数字，时间起卦时可选 */
  numbers?: [number, number, number];
}

/** 八卦信息 */
export interface TrigramInfo {
  name: TrigramName;
  symbol: string;
  wuxing: string;
  direction: string;
  nature: string;
  lines: string;
}

/** 卦象信息 */
export interface HexagramInfo {
  num: number;
  name: string;
  upper: TrigramName;
  lower: TrigramName;
  upperInfo: TrigramInfo;
  lowerInfo: TrigramInfo;
  guaCi: string;
}

/** 体用分析结果 */
export interface TiYongAnalysis {
  tiGua: TrigramName;
  yongGua: TrigramName;
  tiWuxing: string;
  yongWuxing: string;
  relation: string; // 生我、克我、我生、我克、比和
  description: string;
}

/** 梅花易数完整结果 */
export interface MeihuaResult {
  benGua: HexagramInfo;
  huGua: HexagramInfo;
  bianGua: HexagramInfo;
  changeYao: number;
  tiYong: TiYongAnalysis;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 根据上下卦查找卦序号
 */
export function findHexagramNumber(upper: TrigramName, lower: TrigramName): number {
  for (const [num, [u, l]] of Object.entries(HEXAGRAM_TRIGRAMS)) {
    if (u === upper && l === lower) return parseInt(num, 10);
  }
  return -1;
}

/**
 * 根据爻线字符串查找八卦
 */
function linesToTrigram(lines: string): TrigramName {
  const map: Record<string, TrigramName> = {};
  for (const [name, data] of Object.entries(TRIGRAM_DATA)) {
    map[(data as { lines: string }).lines] = name as TrigramName;
  }
  return map[lines] ?? '坤';
}

/**
 * 获取八卦详细信息
 */
export function getTrigramInfo(name: TrigramName): TrigramInfo {
  const data = (TRIGRAM_DATA as Record<string, { symbol: string; wuxing: string; direction: string; nature: string; lines: string }>)[name];
  if (!data) return { name, symbol: '?', wuxing: '?', direction: '?', nature: '?', lines: '000' };
  return { name, ...data };
}

// ============================================================================
// 核心算法：起卦
// ============================================================================

/**
 * 数字起卦法
 * 上卦 = (num1 - 1) % 8 + 1
 * 下卦 = (num2 - 1) % 8 + 1
 * 动爻 = (num3 - 1) % 6 + 1
 */
export function numberDivination(num1: number, num2: number, num3: number): {
  upperTrigram: TrigramName;
  lowerTrigram: TrigramName;
  changeYao: number;
  hexNum: number;
} {
  const upperNum = ((num1 - 1) % 8) + 1;
  const lowerNum = ((num2 - 1) % 8) + 1;
  const changeYao = ((num3 - 1) % 6) + 1;
  const upperTrigram = TRIGRAM_NUMBER_MAP[upperNum];
  const lowerTrigram = TRIGRAM_NUMBER_MAP[lowerNum];
  const hexNum = findHexagramNumber(upperTrigram, lowerTrigram);
  return { upperTrigram, lowerTrigram, changeYao, hexNum };
}

/**
 * 时间起卦法
 * 上卦 = (年 + 月 + 日) % 8（余0为8）
 * 下卦 = (年 + 月 + 日 + 时) % 8（余0为8）
 * 动爻 = (年 + 月 + 日 + 时) % 6（余0为6）
 */
export function timeDivination(year: number, month: number, day: number, hour: number): {
  upperTrigram: TrigramName;
  lowerTrigram: TrigramName;
  changeYao: number;
  hexNum: number;
} {
  const upperNum = ((year + month + day) % 8) || 8;
  const lowerNum = ((year + month + day + hour) % 8) || 8;
  const changeYao = ((year + month + day + hour) % 6) || 6;
  const upperTrigram = TRIGRAM_NUMBER_MAP[upperNum];
  const lowerTrigram = TRIGRAM_NUMBER_MAP[lowerNum];
  const hexNum = findHexagramNumber(upperTrigram, lowerTrigram);
  return { upperTrigram, lowerTrigram, changeYao, hexNum };
}

// ============================================================================
// 核心算法：互卦
// ============================================================================

/**
 * 互卦：本卦二三四爻为下卦，三四五爻为上卦
 * 六爻从下往上：初(1) 二(2) 三(3) 四(4) 五(5) 上(6)
 * 下卦 = 爻2/3/4，上卦 = 爻3/4/5
 */
export function getHuGua(
  upper: TrigramName,
  lower: TrigramName
): { upper: TrigramName; lower: TrigramName; name: string; num: number } {
  const upperLines = getTrigramInfo(upper).lines;
  const lowerLines = getTrigramInfo(lower).lines;

  const allLines = lowerLines + upperLines; // 初2 3 4 5 上
  // 互卦下卦：爻2, 爻3, 爻4
  const huLowerLines = allLines[1] + allLines[2] + allLines[3];
  // 互卦上卦：爻3, 爻4, 爻5
  const huUpperLines = allLines[2] + allLines[3] + allLines[4];

  const huLower = linesToTrigram(huLowerLines);
  const huUpper = linesToTrigram(huUpperLines);
  const huNum = findHexagramNumber(huUpper, huLower);
  const huName = HEXAGRAM_NAMES[huNum] ?? '未知卦';

  return { upper: huUpper, lower: huLower, name: huName, num: huNum };
}

// ============================================================================
// 核心算法：变卦
// ============================================================================

/**
 * 变卦：动爻阴阳反转
 */
export function getBianGua(
  upper: TrigramName,
  lower: TrigramName,
  changeYao: number
): { upper: TrigramName; lower: TrigramName; name: string; num: number } {
  const upperLines = getTrigramInfo(upper).lines;
  const lowerLines = getTrigramInfo(lower).lines;
  const allLines = lowerLines + upperLines;

  const changedLines = allLines.split('').map((c, i) => {
    if (i + 1 === changeYao) return c === '1' ? '0' : '1';
    return c;
  }).join('');

  const newLowerLines = changedLines.slice(0, 3);
  const newUpperLines = changedLines.slice(3, 6);

  const bianLower = linesToTrigram(newLowerLines);
  const bianUpper = linesToTrigram(newUpperLines);
  const bianNum = findHexagramNumber(bianUpper, bianLower);
  const bianName = HEXAGRAM_NAMES[bianNum] ?? '未知卦';

  return { upper: bianUpper, lower: bianLower, name: bianName, num: bianNum };
}

// ============================================================================
// 体用分析
// ============================================================================

const WUXING_SHENG_KE: Record<string, Record<string, string>> = {
  '木': { '火': '木生火', '土': '木克土', '水': '水生木', '金': '金克木', '木': '比和' },
  '火': { '土': '火生土', '金': '火克金', '木': '木生火', '水': '水克火', '火': '比和' },
  '土': { '金': '土生金', '水': '土克水', '火': '火生土', '木': '木克土', '土': '比和' },
  '金': { '水': '金生水', '木': '金克木', '土': '土生金', '火': '火克金', '金': '比和' },
  '水': { '木': '水生木', '火': '水克火', '金': '金生水', '土': '土克水', '水': '比和' },
};

const TIYONG_DESCRIPTIONS: Record<string, string> = {
  '生我': '用生体，事易成，有进益之喜',
  '我生': '体生用，有耗失，事难成',
  '克我': '用克体，事难成，有灾祸',
  '我克': '体克用，事可成，但费力',
  '比和': '体用比和，诸事顺利，谋为可成',
};

/**
 * 体用分析：动爻所在卦为用卦，不动卦为体卦
 * - 初爻动（1-3爻在下卦）：体卦=上卦，用卦=下卦
 * - 上爻动（4-6爻在上卦）：体卦=下卦，用卦=上卦
 */
export function analyzeTiYong(
  upper: TrigramName,
  lower: TrigramName,
  changeYao: number
): TiYongAnalysis {
  const upperInfo = getTrigramInfo(upper);
  const lowerInfo = getTrigramInfo(lower);

  const isUpperMoving = changeYao >= 4 && changeYao <= 6;
  const tiGua = isUpperMoving ? lower : upper;
  const yongGua = isUpperMoving ? upper : lower;
  const tiWuxing = isUpperMoving ? lowerInfo.wuxing : upperInfo.wuxing;
  const yongWuxing = isUpperMoving ? upperInfo.wuxing : lowerInfo.wuxing;

  const relation = WUXING_SHENG_KE[tiWuxing]?.[yongWuxing] ?? '未知';
  const description = TIYONG_DESCRIPTIONS[relation] ?? '';

  return { tiGua, yongGua, tiWuxing, yongWuxing, relation, description };
}

// ============================================================================
// 完整排盘
// ============================================================================

/**
 * 执行梅花易数完整排盘
 */
export function calculateMeihua(input: MeihuaInput): MeihuaResult {
  const { year, month, day, hour, method, numbers } = input;

  // 1. 起卦
  const divResult = method === 'number' && numbers
    ? numberDivination(numbers[0], numbers[1], numbers[2])
    : timeDivination(year, month, day, hour);

  const { upperTrigram, lowerTrigram, changeYao, hexNum } = divResult;

  // 2. 本卦
  const benGua: HexagramInfo = {
    num: hexNum,
    name: HEXAGRAM_NAMES[hexNum] ?? '未知卦',
    upper: upperTrigram,
    lower: lowerTrigram,
    upperInfo: getTrigramInfo(upperTrigram),
    lowerInfo: getTrigramInfo(lowerTrigram),
    guaCi: HEXAGRAM_GUACI[hexNum] ?? '暂无卦辞记录。',
  };

  // 3. 互卦
  const huData = getHuGua(upperTrigram, lowerTrigram);
  const huGua: HexagramInfo = {
    num: huData.num,
    name: huData.name,
    upper: huData.upper,
    lower: huData.lower,
    upperInfo: getTrigramInfo(huData.upper),
    lowerInfo: getTrigramInfo(huData.lower),
    guaCi: HEXAGRAM_GUACI[huData.num] ?? '暂无卦辞记录。',
  };

  // 4. 变卦
  const bianData = getBianGua(upperTrigram, lowerTrigram, changeYao);
  const bianGua: HexagramInfo = {
    num: bianData.num,
    name: bianData.name,
    upper: bianData.upper,
    lower: bianData.lower,
    upperInfo: getTrigramInfo(bianData.upper),
    lowerInfo: getTrigramInfo(bianData.lower),
    guaCi: HEXAGRAM_GUACI[bianData.num] ?? '暂无卦辞记录。',
  };

  // 5. 体用分析
  const tiYong = analyzeTiYong(upperTrigram, lowerTrigram, changeYao);

  return { benGua, huGua, bianGua, changeYao, tiYong };
}

// ============================================================================
// 六十四卦卦辞（基于《周易》通行本）
// ============================================================================

export const HEXAGRAM_GUACI: Record<number, string> = {
  1: '乾为天：元亨利贞。象曰：天行健，君子以自强不息。',
  2: '坤为地：元亨，利牝马之贞。象曰：地势坤，君子以厚德载物。',
  3: '水雷屯：元亨利贞，勿用有攸往，利建侯。象曰：云雷屯，君子以经纶。',
  4: '山水蒙：亨。匪我求童蒙，童蒙求我。象曰：山下出泉，蒙，君子以果行育德。',
  5: '水天需：有孚，光亨，贞吉，利涉大川。象曰：云上于天，需，君子以饮食宴乐。',
  6: '天水讼：有孚窒惕，中吉，终凶。象曰：天与水违行，讼，君子以作事谋始。',
  7: '地水师：贞，丈人吉，无咎。象曰：地中有水，师，君子以容民畜众。',
  8: '水地比：吉，原筮元永贞，无咎。象曰：地上有水，比，先王以建万国亲诸侯。',
  9: '风天小畜：亨，密云不雨，自我西郊。象曰：风行天上，小畜，君子以懿文德。',
  10: '天泽履：履虎尾，不咥人，亨。象曰：上天下泽，履，君子以辨上下定民志。',
  11: '地天泰：小往大来，吉亨。象曰：天地交，泰，后以财成天地之道。',
  12: '天地否：否之匪人，不利君子贞，大往小来。象曰：天地不交，否，君子以俭德辟难。',
  13: '天火同人：同人于野，亨，利涉大川，利君子贞。象曰：天与火，同人，君子以类族辨物。',
  14: '火天大有：元亨。象曰：火在天上，大有，君子以遏恶扬善。',
  15: '地山谦：亨，君子有终。象曰：地中有山，谦，君子以裒多益寡。',
  16: '雷地豫：利建侯行师。象曰：雷出地奋，豫，先王以作乐崇德。',
  17: '泽雷随：元亨利贞，无咎。象曰：泽中有雷，随，君子以向晦入宴息。',
  18: '山风蛊：元亨，利涉大川，先甲三日，后甲三日。象曰：山下有风，蛊，君子以振民育德。',
  19: '地泽临：元亨利贞，至于八月有凶。象曰：泽上有地，临，君子以教思无穷。',
  20: '风地观：盥而不荐，有孚颙若。象曰：风行地上，观，先王以省方观民设教。',
  21: '火雷噬嗑：亨，利用狱。象曰：雷电噬嗑，先王以明罚敕法。',
  22: '山火贲：亨，小利有攸往。象曰：山下有火，贲，君子以明庶政无敢折狱。',
  23: '山地剥：不利有攸往。象曰：山附于地，剥，上以厚下安宅。',
  24: '地雷复：亨，出入无疾，朋来无咎。象曰：雷在地中，复，先王以至日闭关。',
  25: '天雷无妄：元亨利贞，其匪正有眚，不利有攸往。象曰：天下雷行，物与无妄，先王以茂对时育万物。',
  26: '山天大畜：利贞，不家食吉，利涉大川。象曰：天在山中，大畜，君子以多识前言往行。',
  27: '山雷颐：贞吉，观颐，自求口实。象曰：山下有雷，颐，君子以慎言语节饮食。',
  28: '泽风大过：栋桡，利有攸往，亨。象曰：泽灭木，大过，君子以独立不惧。',
  29: '坎为水：习坎，有孚，维心亨，行有尚。象曰：水洊至，习坎，君子以常德行。',
  30: '离为火：利贞，亨，畜牝牛吉。象曰：明两作，离，大人以继明照于四方。',
  31: '泽山咸：亨利贞，取女吉。象曰：山上有泽，咸，君子以虚受人。',
  32: '雷风恒：亨，无咎，利贞，利有攸往。象曰：雷风恒，君子以立不易方。',
  33: '天山遁：亨，小利贞。象曰：天下有山，遁，君子以远小人。',
  34: '雷天大壮：利贞。象曰：雷在天上，大壮，君子以非礼弗履。',
  35: '火地晋：康侯用锡马蕃庶，昼日三接。象曰：明出地上，晋，君子以自昭明德。',
  36: '地火明夷：利艰贞。象曰：明入地中，明夷，君子以莅众用晦而明。',
  37: '风火家人：利女贞。象曰：风自火出，家人，君子以言有物而行有恒。',
  38: '火泽睽：小事吉。象曰：上火下泽，睽，君子以同而异。',
  39: '水山蹇：利西南不利东北，利见大人贞吉。象曰：山上有水，蹇，君子以反身修德。',
  40: '雷水解：利西南，无所往，其来复吉。象曰：雷雨作，解，君子以赦过宥罪。',
  41: '山泽损：有孚元吉，无咎可贞，利有攸往。象曰：山下有泽，损，君子以惩忿窒欲。',
  42: '风雷益：利有攸往，利涉大川。象曰：风雷益，君子以见善则迁。',
  43: '泽天夬：扬于王庭，孚号有厉。象曰：泽上于天，夬，君子以施禄及下。',
  44: '天风姤：女壮，勿用取女。象曰：天下有风，姤，后以施命诰四方。',
  45: '泽地萃：亨，王假有庙，利见大人。象曰：泽上于地，萃，君子以除戎器。',
  46: '地风升：元亨，用见大人，勿恤。象曰：地中生木，升，君子以顺德。',
  47: '泽水困：亨，贞大人吉，无咎。象曰：泽无水，困，君子以致命遂志。',
  48: '水风井：改邑不改井，无丧无得。象曰：木上有水，井，君子以劳民劝相。',
  49: '泽火革：己日乃孚，元亨利贞，悔亡。象曰：泽中有火，革，君子以治历明时。',
  50: '火风鼎：元吉亨。象曰：木上有火，鼎，君子以正位凝命。',
  51: '震为雷：亨，震来虩虩，笑言哑哑。象曰：洊雷震，君子以恐惧修省。',
  52: '艮为山：艮其背不获其身，行其庭不见其人。象曰：兼山艮，君子以思不出其位。',
  53: '风山渐：女归吉，利贞。象曰：山上有木，渐，君子以居贤德善俗。',
  54: '雷泽归妹：征凶，无攸利。象曰：泽上有雷，归妹，君子以永终知敝。',
  55: '雷火丰：亨，王假之，勿忧宜日中。象曰：雷电皆至，丰，君子以折狱致刑。',
  56: '火山旅：小亨，旅贞吉。象曰：山上有火，旅，君子以明慎用刑。',
  57: '巽为风：小亨，利有攸往，利见大人。象曰：随风巽，君子以申命行事。',
  58: '兑为泽：亨利贞。象曰：丽泽兑，君子以朋友讲习。',
  59: '风水涣：亨，王假有庙，利涉大川。象曰：风行水上，涣，先王以享于帝立庙。',
  60: '水泽节：亨，苦节不可贞。象曰：泽上有水，节，君子以制数度。',
  61: '风泽中孚：豚鱼吉，利涉大川，利贞。象曰：泽上有风，中孚，君子以议狱缓死。',
  62: '雷山小过：亨，利贞，可小事不可大事。象曰：山上有雷，小过，君子以行过乎恭。',
  63: '水火既济：亨小，利贞，初吉终乱。象曰：水在火上，既济，君子以思患而预防之。',
  64: '火水未济：亨，小狐汔济，濡其尾。象曰：火在水上，未济，君子以慎辨物居方。',
};