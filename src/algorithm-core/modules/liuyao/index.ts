/**
 * ============================================================================
 * 六爻排盘算法模块 —— 完整版 TypeScript 实现（纳甲法）
 * ============================================================================
 *
 * 功能：
 * - 使用 历法引擎 计算四柱干支
 *   - 支持三种起卦方式：手动起卦、时间起卦（梅花易数法）、数字起卦
 *   - 本卦/变卦完整排盘：卦名、卦宫、世应、纳甲、六亲、六神
 *   - 动爻标记、空亡、月破、日冲
 *   - 伏神查找、卦身、驿马桃花
 *   - 五行生克、用神初步判定
 *
 * 外部依赖：历法引擎（四柱计算）
 * 协议：MIT
 * ============================================================================
 */

import { Solar } from 'lunar-javascript';
import type {
  LiuyaoResult,
  LiuyaoInput,
  LiuyaoYao,
  LiuyaoHexagram,
  YaoType,
} from '../../types/liuyao';

// ============================================================================
// 一、基础常量
// ============================================================================

/** 八卦名称 */
const BAGUA = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'] as const;
type Trigram = typeof BAGUA[number];

/** 三爻编码 -> 卦名：下爻(初爻)在index0, 上爻在index2（如111=乾，100=震，001=艮） */
const CODE_TO_TRIGRAM: Record<string, Trigram> = {
  '111': '乾', '000': '坤',
  '100': '震', '010': '坎', '001': '艮',
  '011': '巽', '101': '离', '110': '兑',
};

/** 伏羲八卦数：1乾 2兑 3离 4震 5巽 6坎 7艮 8坤 */
const NUM_TO_TRIGRAM: Record<number, Trigram> = {
  1: '乾', 2: '兑', 3: '离', 4: '震',
  5: '巽', 6: '坎', 7: '艮', 8: '坤',
};

/** 八卦五行 */
const TRIGRAM_WUXING: Record<Trigram, string> = {
  '乾': '金', '兑': '金', '离': '火', '震': '木',
  '巽': '木', '坎': '水', '艮': '土', '坤': '土',
};

/** 纳甲天干：乾纳甲壬、坤纳乙癸，其余一卦一干 */
const NAJIA_GAN: Record<Trigram, { inner: string; outer: string }> = {
  '乾': { inner: '甲', outer: '壬' },
  '坤': { inner: '乙', outer: '癸' },
  '艮': { inner: '丙', outer: '丙' },
  '兑': { inner: '丁', outer: '丁' },
  '坎': { inner: '戊', outer: '戊' },
  '离': { inner: '己', outer: '己' },
  '震': { inner: '庚', outer: '庚' },
  '巽': { inner: '辛', outer: '辛' },
};

/** 纳甲地支：下卦(内卦)index0-2 = 初爻二爻三爻，上卦(外卦)index3-5 = 四爻五爻上爻 */
const NAJIA_ZHI: Record<Trigram, string[]> = {
  '乾': ['子', '寅', '辰', '午', '申', '戌'],
  '兑': ['巳', '卯', '丑', '亥', '酉', '未'],
  '离': ['卯', '丑', '亥', '酉', '未', '巳'],
  '震': ['子', '寅', '辰', '午', '申', '戌'],
  '巽': ['丑', '亥', '酉', '未', '巳', '卯'],
  '坎': ['寅', '辰', '午', '申', '戌', '子'],
  '艮': ['辰', '午', '申', '戌', '子', '寅'],
  '坤': ['未', '巳', '卯', '丑', '亥', '酉'],
};

/** 六十四卦名称 key=6位编码，上爻在左(index0)、初爻在右(index5)，即传统卦画从上往下读 */
const GUAMING: Record<string, string> = {
  '000000': '坤为地', '100000': '山地剥', '010000': '水地比', '110000': '风地观',
  '001000': '雷地豫', '101000': '火地晋', '011000': '泽地萃', '111000': '天地否',
  '000100': '地山谦', '100100': '艮为山', '010100': '水山蹇', '110100': '风山渐',
  '001100': '雷山小过', '101100': '火山旅', '011100': '泽山咸', '111100': '天山遁',
  '000010': '地水师', '100010': '山水蒙', '010010': '坎为水', '110010': '风水涣',
  '001010': '雷水解', '101010': '火水未济', '011010': '泽水困', '111010': '天水讼',
  '000110': '地风升', '100110': '山风蛊', '010110': '水风井', '110110': '巽为风',
  '001110': '雷风恒', '101110': '火风鼎', '011110': '泽风大过', '111110': '天风姤',
  '000001': '地雷复', '100001': '山雷颐', '010001': '水雷屯', '110001': '风雷益',
  '001001': '震为雷', '101001': '火雷噬嗑', '011001': '泽雷随', '111001': '天雷无妄',
  '000101': '地火明夷', '100101': '山火贲', '010101': '水火既济', '110101': '风火家人',
  '001101': '雷火丰', '101101': '离为火', '011101': '泽火革', '111101': '天火同人',
  '000011': '地泽临', '100011': '山泽损', '010011': '水泽节', '110011': '风泽中孚',
  '001011': '雷泽归妹', '101011': '火泽睽', '011011': '兑为泽', '111011': '天泽履',
  '000111': '地天泰', '100111': '山天大畜', '010111': '水天需', '110111': '风天小畜',
  '001111': '雷天大壮', '101111': '火天大有', '011111': '泽天夬', '111111': '乾为天',
};

/** 归魂卦列表: [内卦, 外卦] */
const GUIHUN: [Trigram, Trigram][] = [
  ['离', '乾'], ['震', '兑'], ['乾', '离'], ['兑', '震'],
  ['艮', '巽'], ['坤', '坎'], ['巽', '艮'], ['坎', '坤'],
];

/** 游魂卦列表 */
const YOUHUN: [Trigram, Trigram][] = [
  ['离', '坤'], ['震', '艮'], ['乾', '坎'], ['兑', '巽'],
  ['艮', '震'], ['坤', '离'], ['巽', '兑'], ['坎', '乾'],
];

/** 六合卦列表 */
const LIUHE: [Trigram, Trigram][] = [
  ['坤', '震'], ['震', '坤'], ['坎', '兑'], ['兑', '坎'],
  ['艮', '离'], ['离', '艮'], ['坤', '乾'], ['乾', '坤'],
];

/** 六冲卦列表 */
const LIUCHONG: [Trigram, Trigram][] = [
  ['乾', '乾'], ['坎', '坎'], ['艮', '艮'], ['震', '震'],
  ['巽', '巽'], ['离', '离'], ['坤', '坤'], ['兑', '兑'],
  ['震', '乾'], ['乾', '震'],
];

/** 地支五行 */
const ZHI_WUXING: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木',
  '辰': '土', '巳': '火', '午': '火', '未': '土',
  '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

/** 天干五行 */
const GAN_WUXING: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

/** 五行生克 */
const WX_SHENG: Record<string, string> = { '金': '水', '水': '木', '木': '火', '火': '土', '土': '金' };
const WX_KE: Record<string, string> = { '金': '木', '木': '土', '土': '水', '水': '火', '火': '金' };

/** 地支六冲 */
const ZHI_CHONG: Record<string, string> = {
  '子': '午', '午': '子', '丑': '未', '未': '丑',
  '寅': '申', '申': '寅', '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳',
};

/** 六亲简称映射 */
const LIUQIN_SHORT: Record<string, string> = {
  '父母': '父', '兄弟': '兄', '子孙': '孙', '妻财': '财', '官鬼': '官',
};

/** 六神 */
const LIUSHEN = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'] as const;

/** 日干起六神: 甲乙起青龙(0), 丙丁起朱雀(1), 戊起勾陈(2), 己起螣蛇(3), 庚辛起白虎(4), 壬癸起玄武(5) */
const LIUSHEN_START: Record<string, number> = {
  '甲': 0, '乙': 0, '丙': 1, '丁': 1, '戊': 2,
  '己': 3, '庚': 4, '辛': 4, '壬': 5, '癸': 5,
};

/** 驿马：申子辰马在寅，寅午戌马在申，亥卯未马在巳，巳酉丑马在亥 */
const YIMA: Record<string, string> = {
  '申': '寅', '子': '寅', '辰': '寅',
  '寅': '申', '午': '申', '戌': '申',
  '亥': '巳', '卯': '巳', '未': '巳',
  '巳': '亥', '酉': '亥', '丑': '亥',
};

/** 桃花：申子辰桃花在酉，寅午戌桃花在卯，亥卯未桃花在子，巳酉丑桃花在午 */
const TAOHUA: Record<string, string> = {
  '申': '酉', '子': '酉', '辰': '酉',
  '寅': '卯', '午': '卯', '戌': '卯',
  '巳': '午', '酉': '午', '丑': '午',
  '亥': '子', '卯': '子', '未': '子',
};

// ============================================================================
// 二、工具函数
// ============================================================================

const ALL_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 判断两个三爻卦是否匹配(内卦/外卦对) */
function isPairMatch(pairs: [Trigram, Trigram][], inner: Trigram, outer: Trigram): boolean {
  return pairs.some(([i, o]) => i === inner && o === outer);
}

/**
 * 计算世应位置（京房八宫天地人异同法）
 * @param innerCode 内卦三爻码
 * @param outerCode 外卦三爻码
 * 约定：index0=天爻(内卦三爻/外卦上爻)，index1=人爻(二爻/五爻)，index2=地爻(初爻/四爻)
 * @returns [世爻index 0-5, 应爻index 0-5]
 */
function calcShiYing(innerCode: string, outerCode: string): [number, number] {
  const tianSame = innerCode[0] === outerCode[0];
  const renSame = innerCode[1] === outerCode[1];
  const diSame = innerCode[2] === outerCode[2];

  let shiIdx: number;
  if (tianSame && renSame && diSame) {
    shiIdx = 5;      // 八纯卦：世在上爻
  } else if (!tianSame && !renSame && !diSame) {
    shiIdx = 2;      // 三世：世在三爻
  } else if (diSame && renSame && !tianSame) {
    shiIdx = 4;      // 五世：天异，世在五爻
  } else if (diSame && !renSame && !tianSame) {
    shiIdx = 3;      // 四世：人天异，世在四爻
  } else if (!diSame && renSame && tianSame) {
    shiIdx = 0;      // 一世：地异，世在初爻
  } else if (!diSame && !renSame && tianSame) {
    shiIdx = 1;      // 二世：地人异，世在二爻
  } else if (!diSame && renSame && !tianSame) {
    shiIdx = 3;      // 游魂：地天异，世在四爻
  } else {
    shiIdx = 2;      // 归魂：人异，世在三爻
  }

  const yingIdx = (shiIdx + 3) % 6;
  return [shiIdx, yingIdx];
}

/**
 * 计算卦宫
 * 规则：归魂卦归内卦宫；否则按世爻位置判断
 * 一/二/三世卦及八纯卦：宫=外卦；四世/五世/游魂卦：宫=内卦阴阳全变后的卦
 */
function calcGuaGong(
  yaoList: { isYang: boolean; isDong: boolean }[],
  inner: Trigram,
  outer: Trigram,
): Trigram {
  if (isPairMatch(GUIHUN, inner, outer)) {
    return inner;
  }
  // 找世爻位置（reverse后：index0=天爻）
  const innerCode = yaoList.slice(0, 3).map(y => y.isYang ? '1' : '0').reverse().join('');
  const outerCode = yaoList.slice(3, 6).map(y => y.isYang ? '1' : '0').reverse().join('');
  const [shiIdx] = calcShiYing(innerCode, outerCode);

  if ([0, 1, 2, 5].includes(shiIdx)) {
    return outer;
  } else {
    // 四世/五世/游魂 → 内卦阴阳全变即本宫内卦
    const reversedInner = yaoList.slice(0, 3)
      .map(y => y.isYang ? '0' : '1')
      .join('');
    return CODE_TO_TRIGRAM[reversedInner] || inner;
  }
}

/**
 * 根据宫卦五行和爻五行计算六亲
 */
function getLiuQin(gongWuxing: string, yaoWuxing: string): string {
  if (gongWuxing === yaoWuxing) return '兄弟';
  if (WX_SHENG[gongWuxing] === yaoWuxing) return '子孙'; // 我生
  if (WX_SHENG[yaoWuxing] === gongWuxing) return '父母'; // 生我
  if (WX_KE[gongWuxing] === yaoWuxing) return '妻财';   // 我克
  return '官鬼';                                         // 克我
}

/**
 * 为一组爻装干支六亲
 */
function installGanZhiLiuQin(
  yaoArr: { isYang: boolean }[],
  inner: Trigram,
  outer: Trigram,
  gong: Trigram,
): Array<{ gan: string; zhi: string; zhiWx: string; liuQin: string; liuQinShort: string }> {
  const gongWx = TRIGRAM_WUXING[gong];
  return yaoArr.map((_, i) => {
    const isInner = i < 3;
    const trig = isInner ? inner : outer;
    let ganFinal: string;
    if (trig === '乾') {
      ganFinal = isInner ? '甲' : '壬';
    } else if (trig === '坤') {
      ganFinal = isInner ? '乙' : '癸';
    } else {
      ganFinal = NAJIA_GAN[trig].inner;
    }
    const zhi = NAJIA_ZHI[trig][i];
    const zhiWx = ZHI_WUXING[zhi];
    const liuQin = getLiuQin(gongWx, zhiWx);
    return { gan: ganFinal, zhi, zhiWx: zhiWx, liuQin, liuQinShort: LIUQIN_SHORT[liuQin] };
  });
}

/**
 * 计算空亡
 * @param ganZhiIdx 日干支在六十甲子中的索引 0-59
 */
function getKongWang(ganZhiIdx: number): [string, string] {
  const table = [
    ['戌', '亥'], ['申', '酉'], ['午', '未'],
    ['辰', '巳'], ['寅', '卯'], ['子', '丑'],
  ];
  const xun = Math.floor(ganZhiIdx / 10);
  return table[xun] as [string, string];
}

/**
 * 根据爻列表(6个)获取内外卦名
 */
function getInnerOuter(yaoArr: { isYang: boolean }[]): { inner: Trigram; outer: Trigram; code: string } {
  const bits = yaoArr.map(y => y.isYang ? '1' : '0');
  // bits[0]=初爻(下卦最下), bits[2]=三爻(下卦最上)
  // 内卦编码：从下到上 bits[0],bits[1],bits[2] → CODE_TO_TRIGRAM需要下爻在index0
  const innerCode = bits[0] + bits[1] + bits[2];
  const outerCode = bits[3] + bits[4] + bits[5];
  const fullCode = bits.join(''); // 初爻到上爻
  return {
    inner: CODE_TO_TRIGRAM[innerCode] || '乾',
    outer: CODE_TO_TRIGRAM[outerCode] || '乾',
    code: fullCode,
  };
}

/**
 * 查找伏神
 * 八纯卦中缺失六亲所对应的爻
 */
function findFuShen(
  gong: Trigram,
  existingLiuQin: Set<string>,
): Record<number, { liuQin: string; gan: string; zhi: string }> {
  const gongWx = TRIGRAM_WUXING[gong];
  // 八纯卦的干支（内外卦相同）
  const result: Record<number, { liuQin: string; gan: string; zhi: string }> = {};
  const allQin = ['父母', '官鬼', '妻财', '子孙', '兄弟'];
  const missing = allQin.filter(q => !existingLiuQin.has(q));
  if (missing.length === 0) return result;

  // 构建八纯卦爻信息
  for (let pos = 1; pos <= 6; pos++) {
    const zhi = NAJIA_ZHI[gong][pos - 1];
    let gan: string;
    if (gong === '乾') gan = pos <= 3 ? '甲' : '壬';
    else if (gong === '坤') gan = pos <= 3 ? '乙' : '癸';
    else gan = NAJIA_GAN[gong].inner;
    const zhiWx = ZHI_WUXING[zhi];
    const lq = getLiuQin(gongWx, zhiWx);
    if (missing.includes(lq)) {
      result[pos] = { liuQin: lq, gan, zhi };
    }
  }
  return result;
}

/**
 * 用神初步判定（基于事项关键词）
 */
function determineYongShen(question: string, yaos: LiuyaoYao[]): string {
  if (!question) return '需结合事项判断';
  const q = question;
  // 简单关键词匹配
  if (/考试|学业|功名|升学|文凭|父母|长辈|文书|合同|车辆|房屋/.test(q)) {
    return '父母爻';
  }
  if (/官|工作|事业|升迁|官职|官司|疾病|盗贼|邪祟|女测婚/.test(q)) {
    return '官鬼爻';
  }
  if (/财|财运|生意|投资|利润|妻子|男测婚|恋爱/.test(q)) {
    return '妻财爻';
  }
  if (/子女|孩子|晚辈|子孙|医药|消灾|解忧|出行/.test(q)) {
    return '子孙爻';
  }
  if (/兄弟|朋友|同事|合伙|竞争|破财/.test(q)) {
    return '兄弟爻';
  }
  return '世爻为核心';
}

// ============================================================================
// 三、起卦方式
// ============================================================================

/**
 * 时间起卦（梅花易数法）
 * 上卦 = (年+月+日) % 8 || 8
 * 下卦 = (年+月+日+时) % 8 || 8
 * 动爻 = (年+月+日+时) % 6 || 6
 *
 * 使用地支数：子1丑2...亥12
 */
function timeQiGua(year: number, month: number, day: number, hour: number): YaoType[] {
  // 年用地支数
  const yearZhiIdx = ((year - 4) % 12 + 12) % 12;
  const yearNum = yearZhiIdx + 1; // 子=1, 丑=2...亥=12
  const hourZhiIdx = Math.floor(((hour + 1) % 24) / 2);
  const hourNum = hourZhiIdx + 1;

  const upperNum = ((yearNum + month + day) % 8) || 8;
  const lowerNum = ((yearNum + month + day + hourNum) % 8) || 8;
  const dongPos = ((yearNum + month + day + hourNum) % 6) || 6; // 1-6

  const upper = NUM_TO_TRIGRAM[upperNum];
  const lower = NUM_TO_TRIGRAM[lowerNum];

  // 构建6爻
  const yaoTypes: YaoType[] = [];
  for (let pos = 1; pos <= 6; pos++) {
    const isUpper = pos > 3;
    const trig = isUpper ? upper : lower;
    const code = Object.entries(CODE_TO_TRIGRAM).find(([, n]) => n === trig)?.[0] || '111';
    const localIdx = isUpper ? pos - 4 : pos - 1;
    // code index0=下爻
    const isYang = code[localIdx] === '1';
    const isDong = pos === dongPos;
    if (isDong) {
      yaoTypes.push(isYang ? '1o' : '0x');
    } else {
      yaoTypes.push(isYang ? '1' : '0');
    }
  }
  return yaoTypes;
}

/**
 * 数字起卦
 */
function numberQiGua(upperNum: number, lowerNum: number, dongYao?: number): YaoType[] {
  const u = ((upperNum - 1) % 8 + 8) % 8 + 1;
  const l = ((lowerNum - 1) % 8 + 8) % 8 + 1;
  const upper = NUM_TO_TRIGRAM[u];
  const lower = NUM_TO_TRIGRAM[l];
  const dongPos = dongYao ? ((dongYao - 1) % 6 + 6) % 6 + 1 : ((((u + l) % 6) || 6));

  const yaoTypes: YaoType[] = [];
  for (let pos = 1; pos <= 6; pos++) {
    const isUpper = pos > 3;
    const trig = isUpper ? upper : lower;
    const code = Object.entries(CODE_TO_TRIGRAM).find(([, n]) => n === trig)?.[0] || '111';
    const localIdx = isUpper ? pos - 4 : pos - 1;
    const isYang = code[localIdx] === '1';
    const isDong = pos === dongPos;
    yaoTypes.push(isDong ? (isYang ? '1o' : '0x') : (isYang ? '1' : '0'));
  }
  return yaoTypes;
}

// ============================================================================
// 四、核心排盘函数
// ============================================================================

/**
 * 根据爻类型列表构建卦信息
 */
function buildHexagram(
  yaoTypes: YaoType[],
  dayGan: string,
  kongWangZhi: [string, string],
  monthPoZhi: string,
  riChongZhi: string,
  isBian: boolean = false,
): LiuyaoHexagram {
  // 解析爻信息
  const yaoBase = yaoTypes.map((t, i) => ({
    position: i + 1,
    isYang: t === '1' || t === '1o',
    isDong: t === '1o' || t === '0x',
  }));

  const { inner, outer, code } = getInnerOuter(yaoBase);
  const gong = calcGuaGong(yaoBase, inner, outer);

  // 世应
  const innerCode = yaoBase.slice(0, 3).map(y => y.isYang ? '1' : '0').reverse().join('');
  const outerCode = yaoBase.slice(3, 6).map(y => y.isYang ? '1' : '0').reverse().join('');
  const [shiIdx, yingIdx] = calcShiYing(innerCode, outerCode);

  // 纳甲六亲
  const gzInfo = installGanZhiLiuQin(yaoBase, inner, outer, gong);

  // 六神（从初爻到上爻）
  const shenStart = LIUSHEN_START[dayGan] ?? 0;

  // 伏神
  const existingQin = new Set(gzInfo.map(g => g.liuQin));
  const fushenMap = findFuShen(gong, existingQin);

  const yaos: LiuyaoYao[] = yaoBase.map((y, i) => {
    const gz = gzInfo[i];
    const isKong = kongWangZhi.includes(gz.zhi);
    const isYuePo = gz.zhi === monthPoZhi;
    const isRiChong = gz.zhi === riChongZhi;
    const fs = fushenMap[y.position];
    return {
      position: y.position,
      isYang: y.isYang,
      isDong: y.isDong,
      gan: gz.gan,
      zhi: gz.zhi,
      zhiWuxing: gz.zhiWx,
      liuQinShort: gz.liuQinShort,
      liuQin: gz.liuQin,
      liuShen: LIUSHEN[(shenStart + i) % 6],
      isShi: i === shiIdx,
      isYing: i === yingIdx,
      isKong,
      isYuePo,
      isRiChong,
      fushen: fs ? { liuQin: fs.liuQin, gan: fs.gan, zhi: fs.zhi } : undefined,
    };
  });

  // 卦名（GUAMING的key为上爻在左/index0，code为初爻在左，需反转后再查）
  const name = GUAMING[code.split('').reverse().join('')] || '未知卦';
  const gongName = `${gong}宫`;
  const gongWx = TRIGRAM_WUXING[gong];

  // 卦别名
  let alias: string | undefined;
  if (isPairMatch(GUIHUN, inner, outer)) alias = '归魂';
  else if (isPairMatch(YOUHUN, inner, outer)) alias = '游魂';
  else if (isPairMatch(LIUHE, inner, outer)) alias = '六合';
  else if (isPairMatch(LIUCHONG, inner, outer)) alias = '六冲';

  return { name, gong: gongName, gongWuxing: gongWx, alias, upperTrigram: outer, lowerTrigram: inner, yaos };
}

/**
 * 为动爻标注变卦信息（在本卦yao上添加变爻的干支六亲）
 */
function annotateBianInfo(benGua: LiuyaoHexagram, bianGua: LiuyaoHexagram): void {
  benGua.yaos.forEach((yao, i) => {
    if (yao.isDong) {
      const bYao = bianGua.yaos[i];
      yao.bianGan = bYao.gan;
      yao.bianZhi = bYao.zhi;
      yao.bianLiuQin = bYao.liuQinShort;
      yao.bianIsYang = bYao.isYang;
    }
  });
}

/** 六十甲子完整表 */
const JIAZI_TABLE: string[] = (() => {
  const gan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const arr: string[] = [];
  for (let i = 0; i < 60; i++) {
    arr.push(gan[i % 10] + zhi[i % 12]);
  }
  return arr;
})();

function jiaZiIndex(ganZhi: string): number {
  return JIAZI_TABLE.indexOf(ganZhi);
}

// ============================================================================
// 五、主入口
// ============================================================================

/**
 * 六爻排盘主函数
 */
export function calculateLiuyao(input: LiuyaoInput): LiuyaoResult {
  const { year, month, day, hour, minute = 0, method, question = '' } = input;

 // 使用 历法引擎 计算四柱
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const bazi = lunar.getEightChar();

  const yearGan = bazi.getYearGan();
  const yearZhi = bazi.getYearZhi();
  const monthGan = bazi.getMonthGan();
  const monthZhi = bazi.getMonthZhi();
  const dayGan = bazi.getDayGan();
  const dayZhi = bazi.getDayZhi();
  const hourGan = bazi.getTimeGan();
  const hourZhi = bazi.getTimeZhi();

  const siZhu: [string, string, string, string] = [
    yearGan + yearZhi,
    monthGan + monthZhi,
    dayGan + dayZhi,
    hourGan + hourZhi,
  ];

  // 空亡（日辰旬空）
  const dayGz = dayGan + dayZhi;
  const dayIdx = jiaZiIndex(dayGz);
  const kongWangArr = getKongWang(dayIdx);
  const kongWang = kongWangArr.join('');

  // 月破：与月支相冲的地支
  const monthPo = ZHI_CHONG[monthZhi] || '';
  // 日冲：与日支相冲的地支
  const riChong = ZHI_CHONG[dayZhi] || '';

  // 驿马、桃花
  const yiMa = YIMA[dayZhi] || '';
  const taoHua = TAOHUA[dayZhi] || '';

  // 节气
  const prevJq = lunar.getPrevJieQi(false);
  const nextJq = lunar.getNextJieQi(false);
  const jieqi = {
    from: prevJq?.getName() || '',
    fromDate: prevJq?.getSolar().toYmdHms().slice(0, -3) || '',
    to: nextJq?.getName() || '',
    toDate: nextJq?.getSolar().toYmdHms().slice(0, -3) || '',
  };

  // 日期字符串
  const dateStr = `${year}年${month}月${day}日 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const lunarStr = `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} ${hourZhi}时`;

  // 确定爻类型
  let yaoTypes: YaoType[];
  if (method === 'manual' && input.manual) {
    if (input.manual.yaoTypes.length !== 6) {
      throw new Error('手动起卦需要6个爻的数据');
    }
    yaoTypes = input.manual.yaoTypes;
  } else if (method === 'number' && input.number) {
    yaoTypes = numberQiGua(input.number.upperNum, input.number.lowerNum, input.number.dongYao);
  } else {
    // time
    yaoTypes = timeQiGua(year, month, day, hour);
  }

  // 本卦
  const benGua = buildHexagram(yaoTypes, dayGan, kongWangArr, monthPo, riChong);

  // 变卦（有动爻才存在）
  let bianGua: LiuyaoHexagram | null = null;
  const hasDong = yaoTypes.some(t => t === '1o' || t === '0x');
  if (hasDong) {
    const bianYaoTypes: YaoType[] = yaoTypes.map(t => {
      if (t === '1o') return '0'; // 老阳变阴
      if (t === '0x') return '1'; // 老阴变阳
      return t;
    }) as YaoType[];
    bianGua = buildHexagram(bianYaoTypes, dayGan, kongWangArr, monthPo, riChong, true);
    // 标注变爻信息到本卦
    annotateBianInfo(benGua, bianGua);
  }

  // 用神初步判定
  const yongShen = determineYongShen(question, benGua.yaos);

  return {
    question,
    dateStr,
    lunarStr,
    siZhu,
    dayGanZhi: dayGz,
    dayGan,
    dayZhi,
    monthZhi,
    kongWang,
    yiMa,
    taoHua,
    jieqi,
    method,
    benGua,
    bianGua,
    yongShen,
  };
}

// ============================================================================
// 六、兼容旧接口的数据导出（供 meihua 等模块复用）
// ============================================================================

/** 八卦详细数据（兼容旧接口） */
const TRIGRAM_DATA: Record<string, { symbol: string; wuxing: string; direction: string; nature: string; number: number; lines: string }> = {
  '乾': { symbol: '☰', wuxing: '金', direction: '西北', nature: '天', number: 1, lines: '111' },
  '兑': { symbol: '☱', wuxing: '金', direction: '西',   nature: '泽', number: 2, lines: '110' },
  '离': { symbol: '☲', wuxing: '火', direction: '南',   nature: '火', number: 3, lines: '101' },
  '震': { symbol: '☳', wuxing: '木', direction: '东',   nature: '雷', number: 4, lines: '100' },
  '巽': { symbol: '☴', wuxing: '木', direction: '东南', nature: '风', number: 5, lines: '011' },
  '坎': { symbol: '☵', wuxing: '水', direction: '北',   nature: '水', number: 6, lines: '010' },
  '艮': { symbol: '☶', wuxing: '土', direction: '东北', nature: '山', number: 7, lines: '001' },
  '坤': { symbol: '☷', wuxing: '土', direction: '西南', nature: '地', number: 8, lines: '000' },
};

/** 六十四卦名称（按卦序1-64，兼容旧接口） */
const HEXAGRAM_NAMES: Record<number, string> = {
  1: '乾为天', 2: '坤为地', 3: '水雷屯', 4: '山水蒙',
  5: '水天需', 6: '天水讼', 7: '地水师', 8: '水地比',
  9: '风天小畜', 10: '天泽履', 11: '地天泰', 12: '天地否',
  13: '天火同人', 14: '火天大有', 15: '地山谦', 16: '雷地豫',
  17: '泽雷随', 18: '山风蛊', 19: '地泽临', 20: '风地观',
  21: '火雷噬嗑', 22: '山火贲', 23: '山地剥', 24: '地雷复',
  25: '天雷无妄', 26: '山天大畜', 27: '山雷颐', 28: '泽风大过',
  29: '坎为水', 30: '离为火', 31: '泽山咸', 32: '雷风恒',
  33: '天山遁', 34: '雷天大壮', 35: '火地晋', 36: '地火明夷',
  37: '风火家人', 38: '火泽睽', 39: '水山蹇', 40: '雷水解',
  41: '山泽损', 42: '风雷益', 43: '泽天夬', 44: '天风姤',
  45: '泽地萃', 46: '地风升', 47: '泽水困', 48: '水风井',
  49: '泽火革', 50: '火风鼎', 51: '震为雷', 52: '艮为山',
  53: '风山渐', 54: '雷泽归妹', 55: '雷火丰', 56: '火山旅',
  57: '巽为风', 58: '兑为泽', 59: '风水涣', 60: '水泽节',
  61: '风泽中孚', 62: '雷山小过', 63: '水火既济', 64: '火水未济',
};

/** 六十四卦上下卦映射（按卦序1-64，兼容旧接口） */
const HEXAGRAM_TRIGRAMS: Record<number, [string, string]> = {
  1: ['乾','乾'], 2: ['坤','坤'], 3: ['坎','震'], 4: ['艮','坎'],
  5: ['坎','乾'], 6: ['乾','坎'], 7: ['坤','坎'], 8: ['坎','坤'],
  9: ['巽','乾'], 10: ['乾','兑'], 11: ['坤','乾'], 12: ['乾','坤'],
  13: ['乾','离'], 14: ['离','乾'], 15: ['坤','艮'], 16: ['震','坤'],
  17: ['兑','震'], 18: ['艮','巽'], 19: ['坤','兑'], 20: ['巽','坤'],
  21: ['离','震'], 22: ['艮','离'], 23: ['艮','坤'], 24: ['坤','震'],
  25: ['乾','震'], 26: ['艮','乾'], 27: ['艮','震'], 28: ['兑','巽'],
  29: ['坎','坎'], 30: ['离','离'], 31: ['兑','艮'], 32: ['震','巽'],
  33: ['乾','艮'], 34: ['震','乾'], 35: ['离','坤'], 36: ['坤','离'],
  37: ['巽','离'], 38: ['离','兑'], 39: ['坎','艮'], 40: ['震','坎'],
  41: ['艮','兑'], 42: ['巽','震'], 43: ['兑','乾'], 44: ['乾','巽'],
  45: ['兑','坤'], 46: ['坤','巽'], 47: ['兑','坎'], 48: ['坎','巽'],
  49: ['兑','离'], 50: ['离','巽'], 51: ['震','震'], 52: ['艮','艮'],
  53: ['巽','艮'], 54: ['震','兑'], 55: ['震','离'], 56: ['离','艮'],
  57: ['巽','巽'], 58: ['兑','兑'], 59: ['巽','坎'], 60: ['坎','兑'],
  61: ['巽','兑'], 62: ['震','艮'], 63: ['坎','离'], 64: ['离','坎'],
};

// ============================================================================
// 七、导出
// ============================================================================

// 类型导出（兼容旧接口 TrigramName）
export type { Trigram as TrigramName };

export {
  // 兼容旧接口
  TRIGRAM_DATA,
  HEXAGRAM_NAMES,
  HEXAGRAM_TRIGRAMS,
  // 常量（liuyao专用，不与common层重复）
  BAGUA,
  CODE_TO_TRIGRAM,
  NUM_TO_TRIGRAM,
  TRIGRAM_WUXING,
  NAJIA_GAN,
  NAJIA_ZHI,
  GUAMING,
  LIUQIN_SHORT,
  LIUSHEN,
  LIUSHEN_START,
  YIMA,
  TAOHUA,
  // 函数
  timeQiGua,
  numberQiGua,
  buildHexagram,
  getLiuQin,
  getKongWang,
  calcShiYing,
  calcGuaGong,
  findFuShen,
  jiaZiIndex,
};
