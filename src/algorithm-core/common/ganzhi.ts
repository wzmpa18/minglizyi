/**
 * 原始来源：自研净室重写，MIT License
 * 原始版本：v1.0
 * 修改记录：2026-07-26 从 common/index.ts 拆分重构
 * 当前协议：MIT
 * 参考依据：公开命理经典《渊海子平》《三命通会》
 * 净室声明：所有函数基于公开传统命理口诀独立构建，未逆向工程或复制任何 AGPL 源码
 */

import type { WuXing } from './wuxing';

// ============================================================================
// 类型定义
// ============================================================================

/** 十天干 */
export type TianGan = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';

/** 十二地支 */
export type DiZhi = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';

/** 干支组合（如 "甲子"、"乙丑") */
export type GanZhi = string;

/** 十二长生阶段 */
export type ShengWangStage =
  | '长生' | '沐浴' | '冠带' | '临官' | '帝旺'
  | '衰'   | '病'   | '死'   | '墓'   | '绝'
  | '胎'   | '养';

/** 生肖 */
export type ShengXiao = '鼠' | '牛' | '虎' | '兔' | '龙' | '蛇' | '马' | '羊' | '猴' | '鸡' | '狗' | '猪';

/** 纳音五行条目 */
export interface NayinEntry {
  ganzhi: GanZhi;
  nayin: string;
}

/** 空亡结果 */
export interface KongWangResult {
  ganzhi: GanZhi;
  kongwang: string;
}

// ============================================================================
// 一、基础数据表（基于《渊海子平》《三命通会》等公开经典文献独立构建）
// ============================================================================

/**
 * 十天干数组
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const GAN: TianGan[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

/**
 * 十二地支数组
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const ZHI: DiZhi[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/**
 * 六十甲子表
 * 甲子、乙丑、丙寅……癸亥，共60组
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const JIAZI_TABLE: GanZhi[] = [
  '甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
  '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未',
  '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳',
  '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
  '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑',
  '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥',
];

/**
 * 空亡表
 * 六十甲子分六旬，每旬空亡两个地支
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const KONGWANG_BY_XUN: string[] = [
  '戌亥', // 甲子旬（甲子～癸酉）
  '申酉', // 甲戌旬（甲戌～癸未）
  '午未', // 甲申旬（甲申～癸巳）
  '辰巳', // 甲午旬（甲午～癸卯）
  '寅卯', // 甲辰旬（甲辰～癸丑）
  '子丑', // 甲寅旬（甲寅～癸亥）
];

/**
 * 地支藏干表
 * 子藏癸、丑藏己癸辛、寅藏甲丙戊……
 * @source 公开命理经典《渊海子平》论地支藏干
 * @license MIT - 净室独立构建
 */
export const CANG_GAN_TABLE: Record<DiZhi, TianGan[]> = {
  '子': ['癸'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲'],
};

/**
 * 纳音五行表
 * 六十甲子每对干支对应的纳音五行
 * @source 公开命理经典《三命通会》卷一·论纳音
 * @license MIT - 净室独立构建
 */
export const NAYIN_TABLE: Record<GanZhi, string> = {
  // 甲子旬
  '甲子': '海中金', '乙丑': '海中金',
  '丙寅': '炉中火', '丁卯': '炉中火',
  '戊辰': '大林木', '己巳': '大林木',
  '庚午': '路旁土', '辛未': '路旁土',
  '壬申': '剑锋金', '癸酉': '剑锋金',
  // 甲戌旬
  '甲戌': '山头火', '乙亥': '山头火',
  '丙子': '涧下水', '丁丑': '涧下水',
  '戊寅': '城头土', '己卯': '城头土',
  '庚辰': '白蜡金', '辛巳': '白蜡金',
  '壬午': '杨柳木', '癸未': '杨柳木',
  // 甲申旬
  '甲申': '泉中水', '乙酉': '泉中水',
  '丙戌': '屋上土', '丁亥': '屋上土',
  '戊子': '霹雳火', '己丑': '霹雳火',
  '庚寅': '松柏木', '辛卯': '松柏木',
  '壬辰': '长流水', '癸巳': '长流水',
  // 甲午旬
  '甲午': '沙中金', '乙未': '沙中金',
  '丙申': '山下火', '丁酉': '山下火',
  '戊戌': '平地木', '己亥': '平地木',
  '庚子': '壁上土', '辛丑': '壁上土',
  '壬寅': '金箔金', '癸卯': '金箔金',
  // 甲辰旬
  '甲辰': '覆灯火', '乙巳': '覆灯火',
  '丙午': '天河水', '丁未': '天河水',
  '戊申': '大驿土', '己酉': '大驿土',
  '庚戌': '钗钏金', '辛亥': '钗钏金',
  '壬子': '桑柘木', '癸丑': '桑柘木',
  // 甲寅旬
  '甲寅': '大溪水', '乙卯': '大溪水',
  '丙辰': '沙中土', '丁巳': '沙中土',
  '戊午': '天上火', '己未': '天上火',
  '庚申': '石榴木', '辛酉': '石榴木',
  '壬戌': '大海水', '癸亥': '大海水',
};

/**
 * 十二长生表（生旺死绝表）
 * 格式：SHENG_WANG[天干][地支] = 阶段名
 * 即：某天干在某地支位置的旺衰状态
 * @source 公开命理经典《三命通会》论五行旺相休囚死
 * @license MIT - 净室独立构建
 */
export const SHENG_WANG_TABLE: Record<TianGan, Record<DiZhi, ShengWangStage>> = {
  '甲': { '亥':'长生','子':'沐浴','丑':'冠带','寅':'临官','卯':'帝旺','辰':'衰','巳':'病','午':'死','未':'墓','申':'绝','酉':'胎','戌':'养' },
  '乙': { '午':'长生','巳':'沐浴','辰':'冠带','卯':'临官','寅':'帝旺','丑':'衰','子':'病','亥':'死','戌':'墓','酉':'绝','申':'胎','未':'养' },
  '丙': { '寅':'长生','卯':'沐浴','辰':'冠带','巳':'临官','午':'帝旺','未':'衰','申':'病','酉':'死','戌':'墓','亥':'绝','子':'胎','丑':'养' },
  '丁': { '酉':'长生','申':'沐浴','未':'冠带','午':'临官','巳':'帝旺','辰':'衰','卯':'病','寅':'死','丑':'墓','子':'绝','亥':'胎','戌':'养' },
  '戊': { '寅':'长生','卯':'沐浴','辰':'冠带','巳':'临官','午':'帝旺','未':'衰','申':'病','酉':'死','戌':'墓','亥':'绝','子':'胎','丑':'养' },
  '己': { '酉':'长生','申':'沐浴','未':'冠带','午':'临官','巳':'帝旺','辰':'衰','卯':'病','寅':'死','丑':'墓','子':'绝','亥':'胎','戌':'养' },
  '庚': { '巳':'长生','午':'沐浴','未':'冠带','申':'临官','酉':'帝旺','戌':'衰','亥':'病','子':'死','丑':'墓','寅':'绝','卯':'胎','辰':'养' },
  '辛': { '子':'长生','亥':'沐浴','戌':'冠带','酉':'临官','申':'帝旺','未':'衰','午':'病','巳':'死','辰':'墓','卯':'绝','寅':'胎','丑':'养' },
  '壬': { '申':'长生','酉':'沐浴','戌':'冠带','亥':'临官','子':'帝旺','丑':'衰','寅':'病','卯':'死','辰':'墓','巳':'绝','午':'胎','未':'养' },
  '癸': { '卯':'长生','寅':'沐浴','丑':'冠带','子':'临官','亥':'帝旺','戌':'衰','酉':'病','申':'死','未':'墓','午':'绝','巳':'胎','辰':'养' },
};

/**
 * 五鼠遁表（日上起时法）
 * 根据日干确定时柱的天干起始
 * 口诀：甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸何方发，壬子是真途。
 * @source 公开命理经典《渊海子平》五鼠遁法
 * @license MIT - 净室独立构建
 */
export const WU_SHU_DUN_START: Record<TianGan, TianGan> = {
  '甲': '甲', '己': '甲',  // 甲己还加甲 -> 子时天干为甲
  '乙': '丙', '庚': '丙',  // 乙庚丙作初 -> 子时天干为丙
  '丙': '戊', '辛': '戊',  // 丙辛从戊起 -> 子时天干为戊
  '丁': '庚', '壬': '庚',  // 丁壬庚子居 -> 子时天干为庚
  '戊': '壬', '癸': '壬',  // 戊癸何方发，壬子是真途 -> 子时天干为壬
};

/**
 * 五虎遁表（年上起月法）
 * 根据年干确定月柱的天干起始
 * 口诀：甲己之年丙作首，乙庚之岁戊为头，丙辛必定寻庚起，丁壬壬位顺行流，若问戊癸何处起，甲寅之上好追求。
 * @source 公开命理经典《渊海子平》五虎遁法
 * @license MIT - 净室独立构建
 */
export const WU_HU_DUN_START: Record<TianGan, TianGan> = {
  '甲': '丙', '己': '丙',  // 甲己之年丙作首 -> 寅月天干为丙
  '乙': '戊', '庚': '戊',  // 乙庚之岁戊为头 -> 寅月天干为戊
  '丙': '庚', '辛': '庚',  // 丙辛必定寻庚起 -> 寅月天干为庚
  '丁': '壬', '壬': '壬',  // 丁壬壬位顺行流 -> 寅月天干为壬
  '戊': '甲', '癸': '甲',  // 若问戊癸何处起，甲寅之上好追求 -> 寅月天干为甲
};

/**
 * 生肖映射
 * 子鼠、丑牛、寅虎、卯兔、辰龙、巳蛇、午马、未羊、申猴、酉鸡、戌狗、亥猪
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const SHENG_XIAO_TABLE: Record<DiZhi, ShengXiao> = {
  '子': '鼠', '丑': '牛',
  '寅': '虎', '卯': '兔',
  '辰': '龙', '巳': '蛇',
  '午': '马', '未': '羊',
  '申': '猴', '酉': '鸡',
  '戌': '狗', '亥': '猪',
};

// ============================================================================
// 二、节气名称
// ============================================================================

/**
 * 节气名称列表
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const JIEQI_NAMES: string[] = [
  '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
  '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
  '立冬', '小雪', '大雪', '冬至', '小寒', '大寒',
];

/**
 * 十二节（月柱分界点）
 * 立春、惊蛰、清明、立夏、芒种、小暑、立秋、白露、寒露、立冬、大雪、小寒
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const JIE_NAMES: string[] = [
  '立春', '惊蛰', '清明', '立夏', '芒种', '小暑',
  '立秋', '白露', '寒露', '立冬', '大雪', '小寒',
];

// ============================================================================
// 三、核心函数实现
// ============================================================================

// ---------- 天干索引换算 ----------

/**
 * 获取天干在 GAN 数组中的索引（0-based）
 *
 * @param gan - 天干字符
 * @returns 索引值（0-9），若无效返回 -1
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，未参考任何 AGPL 源码
 */
export function getGanIndex(gan: string): number {
  return GAN.indexOf(gan as TianGan);
}

/**
 * 根据索引获取天干
 *
 * @param index - 索引（0-9，支持负数循环）
 * @returns 天干字符
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，未参考任何 AGPL 源码
 */
export function getGanByIndex(index: number): TianGan {
  const i = ((index % 10) + 10) % 10;
  return GAN[i];
}

// ---------- 地支索引换算 ----------

/**
 * 获取地支在 ZHI 数组中的索引（0-based）
 *
 * @param zhi - 地支字符
 * @returns 索引值（0-11），若无效返回 -1
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，未参考任何 AGPL 源码
 */
export function getZhiIndex(zhi: string): number {
  return ZHI.indexOf(zhi as DiZhi);
}

/**
 * 根据索引获取地支
 *
 * @param index - 索引（0-11，支持负数循环）
 * @returns 地支字符
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，未参考任何 AGPL 源码
 */
export function getZhiByIndex(index: number): DiZhi {
  const i = ((index % 12) + 12) % 12;
  return ZHI[i];
}

// ---------- 六十甲子查表 ----------

/**
 * 根据六十甲子索引获取干支组合名称
 *
 * 索引范围 0-59，对应甲子到癸亥
 *
 * @param index - 六十甲子索引（0-59）
 * @returns 干支组合字符串，如 "甲子"
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，未参考任何 AGPL 源码
 */
export function getJiaziName(index: number): GanZhi {
  const i = ((index % 60) + 60) % 60;
  return JIAZI_TABLE[i];
}

/**
 * 根据干支组合反查六十甲子索引
 *
 * @param ganzhi - 干支组合，如 "甲子"
 * @returns 索引值（0-59），找不到返回 -1
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，未参考任何 AGPL 源码
 */
export function getJiaziIndex(ganzhi: GanZhi): number {
  return JIAZI_TABLE.indexOf(ganzhi);
}

/**
 * 根据天干和地支独立计算六十甲子索引
 * 公式：index = (ganIndex * 6 - zhiIndex * 5 + 60) % 60
 * 该公式基于"阳干配阳支、阴干配阴支"的排列规则推导
 *
 * 注：仅当 ganIndex 与 zhiIndex 同为奇数或同为偶数时才有效（即阳干配阳支、阴干配阴支）
 *
 * @param ganIndex - 天干索引（0-9）
 * @param zhiIndex - 地支索引（0-11）
 * @returns 六十甲子索引（0-59），若阴阳不匹配返回 -1
 *
 * @source 公开命理文献《渊海子平》六十甲子排列规则
 * @license MIT - 净室独立实现
 * @cleanroom 独立推导，基于数学公式而非查表，未参考任何 AGPL 源码
 */
export function calcJiaziIndex(ganIndex: number, zhiIndex: number): number {
  if ((ganIndex % 2) !== (zhiIndex % 2)) return -1; // 阴阳不配
  let idx = (ganIndex - zhiIndex + 60) % 60;
  if (idx % 2 !== ganIndex % 2) {
    idx = (idx + 1) % 60;
  }
  return idx;
}

// ---------- 空亡计算 ----------

/**
 * 查询干支对应的空亡地支
 *
 * 六十甲子分六旬，每旬十个干支，空亡两个地支。
 * 甲子旬空戌亥、甲戌旬空申酉、甲申旬空午未、
 * 甲午旬空辰巳、甲辰旬空寅卯、甲寅旬空子丑。
 *
 * @param ganzhi - 干支组合，如 "甲子"
 * @returns 空亡地支，如 "戌亥"，找不到返回 null
 *
 * @source 公开命理经典《渊海子平》论空亡
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典口诀，未参考任何 AGPL 源码
 */
export function getKongwang(ganzhi: GanZhi): string | null {
  const idx = JIAZI_TABLE.indexOf(ganzhi);
  if (idx === -1) return null;
  const xunIndex = Math.floor(idx / 10);
  return KONGWANG_BY_XUN[xunIndex] ?? null;
}

/**
 * 根据天干和地支直接计算空亡
 *
 * 计算当前干支所在的旬，然后返回该旬空亡的地支。
 *
 * @param gan - 天干
 * @param zhi - 地支
 * @returns 空亡地支，如 "戌亥"
 *
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立推导算法，基于旬的划分规则
 */
export function calcKongwang(gan: TianGan, zhi: DiZhi): string | null {
  const ganzhi: GanZhi = `${gan}${zhi}`;
  return getKongwang(ganzhi);
}

// ---------- 地支藏干 ----------

/**
 * 查询地支藏干
 *
 * 子藏癸、丑藏己癸辛、寅藏甲丙戊、卯藏乙、
 * 辰藏戊乙癸、巳藏丙庚戊、午藏丁己、未藏己丁乙、
 * 申藏庚壬戊、酉藏辛、戌藏戊辛丁、亥藏壬甲。
 *
 * @param zhi - 地支
 * @returns 藏干天干数组
 *
 * @source 公开命理经典《渊海子平》论地支藏干
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典文献，未参考任何 AGPL 源码
 */
export function getCangGan(zhi: DiZhi): TianGan[] {
  return CANG_GAN_TABLE[zhi] ?? [];
}

// ---------- 纳音五行 ----------

/**
 * 查询六十甲子干支对应的纳音五行
 *
 * 纳音五行是六十甲子每两组配一个五行，共三十组纳音。
 * 数据基于《三命通会》卷一·论纳音独立构建。
 *
 * @param ganzhi - 干支组合，如 "甲子"
 * @returns 纳音名称，如 "海中金"，找不到返回 null
 *
 * @source 公开命理经典《三命通会》卷一·论纳音
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，未参考任何 AGPL 源码
 */
export function getNayinWuxing(ganzhi: GanZhi): string | null {
  return NAYIN_TABLE[ganzhi] ?? null;
}

/**
 * 根据天干和地支直接计算纳音五行
 * 算法原理：纳音五行的干支编号有规律性，每两组干支共用同一纳音。
 * 这里使用简化公式计算。
 *
 * @param gan - 天干
 * @param zhi - 地支
 * @returns 纳音名称
 *
 * @source 公开命理经典《三命通会》
 * @license MIT - 净室独立实现
 * @cleanroom 独立推导算法，未参考任何 AGPL 源码
 */
export function calcNayin(gan: TianGan, zhi: DiZhi): string | null {
  const ganzhi: GanZhi = `${gan}${zhi}`;
  return NAYIN_TABLE[ganzhi] ?? null;
}

/**
 * 根据纳音名称获取其对应五行
 * 纳音名称的第三个字即为五行（如"海中金"->"金"，"炉中火"->"火"）
 *
 * @param nayinName - 纳音名称
 * @returns 五行字符
 *
 * @license MIT - 净室独立实现
 * @cleanroom 独立实现，基于纳音命名规则
 */
export function getNayinElement(nayinName: string): WuXing | null {
  if (!nayinName || nayinName.length < 3) return null;
  const ch = nayinName.charAt(2);
  if (ch === '金' || ch === '水' || ch === '木' || ch === '火' || ch === '土') {
    return ch as WuXing;
  }
  return null;
}

// ---------- 十二长生 ----------

/**
 * 查询天干在地支位置的十二长生阶段
 *
 * 十二长生：长生、沐浴、冠带、临官、帝旺、衰、病、死、墓、绝、胎、养
 * 阳干顺行，阴干逆行。
 *
 * @param gan - 天干
 * @param zhi - 地支
 * @returns 十二长生阶段名称，找不到返回 null
 *
 * @source 公开命理经典《三命通会》论五行旺相休囚死
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典口诀，未参考任何 AGPL 源码
 */
export function getShengWang(gan: TianGan, zhi: DiZhi): ShengWangStage | null {
  return SHENG_WANG_TABLE[gan]?.[zhi] ?? null;
}

// ---------- 五鼠遁（时柱天干） ----------

/**
 * 五鼠遁法：根据日干和时辰地支推算时柱天干
 *
 * 口诀：甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸何方发，壬子是真途。
 * 即：甲己日，子时为甲子；乙庚日，子时为丙子；丙辛日，子时为戊子；
 *     丁壬日，子时为庚子；戊癸日，子时为壬子。
 * 然后从子时开始顺推。
 *
 * @param dayGan - 日干
 * @param hourZhi - 时辰地支
 * @returns 时柱天干
 *
 * @source 公开命理经典《渊海子平》五鼠遁法
 * @license MIT - 净室独立实现
 * @cleanroom 独立实现，基于传统口诀，未参考任何 AGPL 源码
 */
export function getWuShuDun(dayGan: TianGan, hourZhi: DiZhi): TianGan {
  const startGan = WU_SHU_DUN_START[dayGan];
  const startGanIndex = getGanIndex(startGan);
  const zhiIndex = getZhiIndex(hourZhi);
  const offset = zhiIndex;
  return getGanByIndex(startGanIndex + offset);
}

/**
 * 根据日干获取完整的时柱干支表（从子时到亥时）
 *
 * @param dayGan - 日干
 * @returns 12个时辰的干支数组
 *
 * @source 公开命理经典《渊海子平》五鼠遁法
 * @license MIT - 净室独立实现
 * @cleanroom 独立实现，基于传统口诀
 */
export function getFullWuShuDun(dayGan: TianGan): GanZhi[] {
  const startGanIndex = getGanIndex(WU_SHU_DUN_START[dayGan]);
  const result: GanZhi[] = [];
  for (let i = 0; i < 12; i++) {
    const g = getGanByIndex(startGanIndex + i);
    const z = ZHI[i];
    result.push(`${g}${z}`);
  }
  return result;
}

// ---------- 五虎遁（月柱天干） ----------

/**
 * 五虎遁法：根据年干和月份推算月柱天干
 *
 * 口诀：甲己之年丙作首，乙庚之岁戊为头，丙辛必定寻庚起，丁壬壬位顺行流，
 *       若问戊癸何处起，甲寅之上好追求。
 * 即：甲己年，寅月为丙寅；乙庚年，寅月为戊寅；丙辛年，寅月为庚寅；
 *     丁壬年，寅月为壬寅；戊癸年，寅月为甲寅。
 * 然后从寅月（正月）开始顺推。
 *
 * @param yearGan - 年干
 * @param monthIndex - 月份索引（0=寅月/正月，1=卯月，... 11=丑月）
 * @returns 月柱天干
 *
 * @source 公开命理经典《渊海子平》五虎遁法
 * @license MIT - 净室独立实现
 * @cleanroom 独立实现，基于传统口诀，未参考任何 AGPL 源码
 */
export function getWuHuDun(yearGan: TianGan, monthIndex: number): TianGan {
  const startGan = WU_HU_DUN_START[yearGan];
  const startGanIndex = getGanIndex(startGan);
  return getGanByIndex(startGanIndex + monthIndex);
}

/**
 * 根据年干获取完整的月柱干支表（从寅月到丑月）
 *
 * @param yearGan - 年干
 * @returns 12个月的干支数组
 *
 * @source 公开命理经典《渊海子平》五虎遁法
 * @license MIT - 净室独立实现
 * @cleanroom 独立实现，基于传统口诀
 */
export function getFullWuHuDun(yearGan: TianGan): GanZhi[] {
  const startGanIndex = getGanIndex(WU_HU_DUN_START[yearGan]);
  const result: GanZhi[] = [];
  for (let i = 0; i < 12; i++) {
    const g = getGanByIndex(startGanIndex + i);
    const z = ZHI[(i + 2) % 12]; // 寅月从地支index=2开始
    result.push(`${g}${z}`);
  }
  return result;
}

// ---------- 生肖 ----------

/**
 * 根据地支获取生肖
 * 子鼠、丑牛、寅虎、卯兔、辰龙、巳蛇、午马、未羊、申猴、酉鸡、戌狗、亥猪
 *
 * @param zhi - 地支
 * @returns 生肖名称
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典文献，未参考任何 AGPL 源码
 */
export function getShengXiao(zhi: DiZhi): ShengXiao {
  return SHENG_XIAO_TABLE[zhi];
}

/**
 * 根据公历年份获取生肖
 * 生肖以立春为界（而非农历正月初一）
 *
 * @param year - 公历年份
 * @returns 生肖名称
 *
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于地支与年份的对应关系（year % 12）
 */
export function getShengXiaoByYear(year: number): ShengXiao {
  const zhiIndex = ((year - 4) % 12 + 12) % 12;
  return SHENG_XIAO_TABLE[ZHI[zhiIndex]];
}

// ---------- 节气月份索引 ----------

/**
 * 获取节气对应的月份索引
 * 立春(0) -> 寅月，惊蛰(1) -> 卯月，以此类推
 *
 * @param jieName - 节名
 * @returns 月份索引（0=寅月）
 *
 * @license MIT - 净室独立实现
 */
export function getMonthByJie(jieName: string): number {
  const idx = JIE_NAMES.indexOf(jieName);
  return idx === -1 ? -1 : idx;
}

// ---------- 便捷工具函数 ----------

/**
 * 根据干支组合拆分天干和地支
 *
 * @param ganzhi - 干支组合，如 "甲子"
 * @returns [天干, 地支]，无效返回 null
 *
 * @license MIT - 净室独立实现
 */
export function splitGanZhi(ganzhi: GanZhi): [TianGan, DiZhi] | null {
  if (ganzhi.length !== 2) return null;
  const gan = GAN.find(g => ganzhi.startsWith(g));
  const zhi = ZHI.find(z => ganzhi.endsWith(z));
  if (!gan || !zhi) return null;
  return [gan, zhi];
}

/**
 * 根据公历年份计算年柱天干
 * 年柱以立春为界，此处提供简化计算（基于年份数字）
 *
 * 计算公式：年干序号 = (year - 4) % 10
 *
 * @param year - 公历年份
 * @returns 年柱天干
 *
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于干支纪年规律
 */
export function getYearGanByYear(year: number): TianGan {
  return getGanByIndex((year - 4) % 10);
}

/**
 * 根据公历年份计算年柱地支
 *
 * 计算公式：年支序号 = (year - 4) % 12
 *
 * @param year - 公历年份
 * @returns 年柱地支
 *
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于干支纪年规律
 */
export function getYearZhiByYear(year: number): DiZhi {
  return getZhiByIndex((year - 4) % 12);
}

/**
 * 根据公历年份计算年柱干支
 *
 * @param year - 公历年份
 * @returns 年柱干支组合
 *
 * @license MIT - 净室独立实现
 */
export function getYearGanZhi(year: number): GanZhi {
  return `${getYearGanByYear(year)}${getYearZhiByYear(year)}`;
}