/**
 * ZW-TIME 紫微时间轴引擎（P6-I-PLUS 规则6 永久冻结模块）
 *
 * 职责：统一时间维度计算，覆盖 命盘 → 大运 → 流年 → 流月 → 流日 → 流时 全层级。
 * 数据源：排盘引擎 astrolabe（排盘+运限校准）+ lunar-lite（精确历法转换）。
 * 性能设计：大限/流年零运限调用纯直算；流月/流日/流时各 1 次运限调用校准起点后公式推算。
 * 冻结约束：所有紫微相关时间分析统一调用本引擎，页面层禁止各自重复实现时间推算。
 *
 * 导出：
 *   getZwDecadalList(input)                    12 大限列表（宫序=寅→丑）
 *   getZwYearlyList(input, decadalIndex)       大限内 10 流年列表
 *   getZwMonthlyList(input, year)              流年内 12 流月列表
 *   getZwDailyList(input, year, lunarMonth)    流月内流日列表（真实历法日干支）
 *   getZwHourlyList(input, solarDate)          流日内 12 流时列表
 *   getZwHoroscopeAt(input, date)              任意时点全量运限快照
 *   zwOverlayNames(anchor)                     叠宫名数组：本命第 i 宫在运限层中的宫名
 *
 * 叠宫规则（ZW-OVERLAY v25.0.25，净室推导自《紫微斗数全书》十二宫逆布通例）：
 *   任一层运限盘（大限/流年/流月/流日/流时）十二宫与本体盘排布方向一致：
 *   以运限命宫（anchor 宫序索引）为原点，命→兄弟→夫妻→子女→财帛→疾厄→迁移→
 *   交友→官禄→田宅→福德→父母 沿宫序（寅→卯→…）递减方向依次叠落。
 * 已对拍 排盘引擎 horoscope palaceNames 输出（12 案例全层一致）。
 */

import { astro } from 'iztro';
import type { Horoscope } from 'iztro/lib/data/types/astro';
import { lunar2solar, getTotalDaysOfLunarMonth, getHeavenlyStemAndEarthlyBranchBySolarDate } from 'lunar-lite';

// ============================================================================
// 一、类型定义（统一输出标准数据结构，永久冻结）
// ============================================================================

export type ZwTimeLevel = 'natal' | 'decadal' | 'yearly' | 'monthly' | 'daily' | 'hourly';

export interface ZwTimeInput {
  /** 公历年 */
  year: number;
  /** 公历月 */
  month: number;
  /** 公历日 */
  day: number;
  /** 公历小时 0-23 */
  hour: number;
  gender: 'male' | 'female';
}

export interface ZwTimeNode {
  /** 层级 */
  level: ZwTimeLevel;
  /** 主标签：干支（如"甲子"） */
  label: string;
  /** 副标签：年龄范围 / 虚岁 / 农历月日 */
  sub: string;
  /** 运限天干 */
  gan: string;
  /** 运限地支 */
  zhi: string;
  /** 流入宫位索引（宫序：0=寅,1=卯,...,10=子,11=丑，与命盘十二宫一致） */
  palaceIndex: number;
  /** 流命宫落在本命盘的宫位名（如"财帛宫"） */
  palaceName: string;
  /** 运限四化 [化禄星, 化权星, 化科星, 化忌星] */
  mutagen: string[];
  /** 关联公历年（流年层级） */
  year?: number;
  /** 关联虚岁 */
  age?: number;
  /** 大限年龄范围 */
  ageRange?: [number, number];
  /** 农历月（流月层级） */
  lunarMonth?: number;
  /** 农历日（流日层级） */
  lunarDay?: number;
  /** 锚定公历日期 YYYY-M-D（流日/流时层级的真实历法锚点） */
  solarDate?: string;
}

/** 任意时点全量运限快照（AI 解盘统一数据源） */
export interface ZwHoroscopeSnapshot {
  lunarDate: string;
  solarDate: string;
  decadal: ZwTimeNode;
  age: ZwTimeNode & { nominalAge: number };
  yearly: ZwTimeNode;
  monthly: ZwTimeNode;
  daily: ZwTimeNode;
  hourly: ZwTimeNode;
}

// ============================================================================
// 二、基础表与星盘缓存
// ============================================================================

const GAN_LIST = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
/** 子起地支序（干支公式用） */
const ZHI_STD = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
/** 寅起宫位序（=命盘宫序） */
const ZHI_ORDER = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];

/** 标准天干四化表（与 排盘引擎 一致：戊干右弼科、壬干左辅科） */
const GAN_MUTAGEN: Record<string, string[]> = {
  '甲': ['廉贞', '破军', '武曲', '太阳'],
  '乙': ['天机', '天梁', '紫微', '太阴'],
  '丙': ['天同', '天机', '文昌', '廉贞'],
  '丁': ['太阴', '天同', '天机', '巨门'],
  '戊': ['贪狼', '太阴', '右弼', '天机'],
  '己': ['武曲', '贪狼', '天梁', '文曲'],
  '庚': ['太阳', '武曲', '太阴', '天同'],
  '辛': ['巨门', '太阳', '文曲', '文昌'],
  '壬': ['天梁', '紫微', '左辅', '武曲'],
  '癸': ['破军', '巨门', '太阴', '贪狼'],
};

/** 五虎遁：年干 → 正月天干 */
const YEAR_TO_MONTH_GAN: Record<string, string> = {
  '甲': '丙', '己': '丙',
  '乙': '戊', '庚': '戊',
  '丙': '庚', '辛': '庚',
  '丁': '壬', '壬': '壬',
  '戊': '甲', '癸': '甲',
};

/** 五鼠遁：日干 → 子时天干 */
const DAY_TO_HOUR_GAN: Record<string, string> = {
  '甲': '甲', '己': '甲',
  '乙': '丙', '庚': '丙',
  '丙': '戊', '辛': '戊',
  '丁': '庚', '壬': '庚',
  '戊': '壬', '癸': '壬',
};

const LUNAR_DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

function hourToTimeIndex(hour: number): number {
  if (hour === 23) return 12;
  if (hour === 0) return 0;
  return Math.floor((hour + 1) / 2);
}

let cacheKey = '';
let cacheAstrolabe: ReturnType<typeof astro.bySolar> | null = null;

function getAstrolabe(input: ZwTimeInput) {
  const key = `${input.year}-${input.month}-${input.day}-${input.hour}-${input.gender}`;
  if (cacheKey === key && cacheAstrolabe) return cacheAstrolabe;
  const solarDateStr = `${input.year}-${input.month}-${input.day}`;
  const timeIndex = hourToTimeIndex(input.hour);
  cacheAstrolabe = astro.bySolar(solarDateStr, timeIndex, input.gender === 'male' ? '男' : '女', true, 'zh-CN');
  cacheKey = key;
  return cacheAstrolabe;
}

function horoscopeAt(input: ZwTimeInput, date: Date | string): Horoscope {
  return getAstrolabe(input).horoscope(date) as unknown as Horoscope;
}

/** 流入宫 → 本命盘宫位名 */
function natalPalaceName(input: ZwTimeInput, index: number): string {
  if (index < 0 || index > 11) return '';
  const p = getAstrolabe(input).palaces[index];
  return p?.name || '';
}

/** 年干支（立春分界的年柱，与 排盘引擎 yearly 一致） */
function yearGanZhi(y: number): { gan: string; zhi: string } {
  return {
    gan: GAN_LIST[(y - 4) % 10],
    zhi: ZHI_STD[(y - 4) % 12],
  };
}

/** 月干支（五虎遁，m=1..12 农历月/节气月） */
function monthGanZhi(yearGan: string, m: number): { gan: string; zhi: string } {
  const start = GAN_LIST.indexOf(YEAR_TO_MONTH_GAN[yearGan] || '丙');
  return {
    gan: GAN_LIST[(start + m - 1) % 10],
    zhi: ZHI_ORDER[(m - 1) % 12],
  };
}

// ============================================================================
// 三、叠宫计算（ZW-OVERLAY v25.0.25：纯直算，零运限调用，任意层通用）
// ============================================================================

/** 运限十二宫序列（与本体盘一致，交友宫用平台口径） */
export const ZW_PERIOD_PALACE_SEQ = [
  '命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母',
];

/**
 * 叠宫名数组（12 项）：overlay[i] = 本命第 i 宫（宫序 0=寅…11=丑）在该运限层中的宫名。
 * anchor = 该运限命宫落在本命盘的宫序索引（即 ZwTimeNode.palaceIndex）。
 * 例：anchor=1 时 overlay[1]='命宫'、overlay[0]='兄弟'、overlay[2]='父母'。
 */
export function zwOverlayNames(anchor: number): string[] {
  const overlay: string[] = new Array(12).fill('');
  if (!Number.isInteger(anchor) || anchor < 0 || anchor > 11) return overlay;
  for (let k = 0; k < 12; k++) {
    overlay[(anchor - k + 24) % 12] = ZW_PERIOD_PALACE_SEQ[k];
  }
  return overlay;
}

/**
 * 跨层叠宫查询：level2Anchor 宫在 level1 运限盘中的宫名。
 * 例：流年命宫（yearlyAnchor）叠大限盘何宫 → zwOverlayAt(decadalAnchor, yearlyAnchor)。
 */
export function zwOverlayAt(level1Anchor: number, level2Anchor: number): string {
  if (level1Anchor < 0 || level1Anchor > 11 || level2Anchor < 0 || level2Anchor > 11) return '';
  return ZW_PERIOD_PALACE_SEQ[(level1Anchor - level2Anchor + 24) % 12];
}

/** 运限十二宫简写（命宫空间有限，吉时雨口径：大限夫妻宫=大夫、流年财帛=年财 等） */
export const ZW_PERIOD_PALACE_ABBR = [
  '命', '兄', '夫', '子', '财', '疾', '迁', '交', '官', '田', '福', '父',
];

/** 宫名→单字简写：命宫→命、夫妻→夫；未命中返回原值 */
export function zwPalaceAbbr(name: string): string {
  const i = ZW_PERIOD_PALACE_SEQ.indexOf(name);
  return i >= 0 ? ZW_PERIOD_PALACE_ABBR[i] : name;
}

// ============================================================================
// 三B、年系/限系动态星曜（P8-2 文墨天机口径：按层级干支动态入宫）
// ============================================================================

/** 动态星曜：星名 + 寅起宫序索引（0=寅..11=丑，与命盘宫序一致） */
export interface ZwSeriesStar {
  name: string;
  palaceIndex: number;
}

/** 天干→禄存宫序（甲禄寅、乙禄卯、丙戊禄巳、丁己禄午、庚禄申、辛禄酉、壬禄亥、癸禄子） */
const LUCUN_BY_GAN: Record<string, number> = {
  '甲': 0, '乙': 1, '丙': 3, '丁': 4, '戊': 3, '己': 4, '庚': 6, '辛': 7, '壬': 9, '癸': 10,
};

/** 天干→[天魁宫序, 天钺宫序]（甲戊庚丑未、乙己子申、丙丁亥酉、壬癸卯巳、辛午寅） */
const KUIYUE_BY_GAN: Record<string, [number, number]> = {
  '甲': [11, 5], '戊': [11, 5], '庚': [11, 5],
  '乙': [10, 6], '己': [10, 6],
  '丙': [9, 7], '丁': [9, 7],
  '壬': [1, 3], '癸': [1, 3],
  '辛': [4, 0],
};

/** 按任意层级干支排年系/限系动态星曜；lunarMonth 提供时追加月系星（天姚/天刑） */
export function zwSeriesStars(gan: string, zhi: string, lunarMonth?: number): ZwSeriesStar[] {
  const out: ZwSeriesStar[] = [];
  const lucun = LUCUN_BY_GAN[gan];
  if (lucun !== undefined) {
    out.push({ name: '禄存', palaceIndex: lucun });
    out.push({ name: '擎羊', palaceIndex: (lucun + 1) % 12 });
    out.push({ name: '陀罗', palaceIndex: (lucun + 11) % 12 });
  }
  const kuiyue = KUIYUE_BY_GAN[gan];
  if (kuiyue) {
    out.push({ name: '天魁', palaceIndex: kuiyue[0] });
    out.push({ name: '天钺', palaceIndex: kuiyue[1] });
  }
  const zhiStdIdx = ZHI_STD.indexOf(zhi);
  if (zhiStdIdx >= 0) {
    // 红鸾：卯宫起子年逆行；天喜：红鸾对宫
    const hongluan = (1 - zhiStdIdx + 24) % 12;
    out.push({ name: '红鸾', palaceIndex: hongluan });
    out.push({ name: '天喜', palaceIndex: (hongluan + 6) % 12 });
  }
  if (lunarMonth && lunarMonth >= 1 && lunarMonth <= 12) {
    const m = lunarMonth - 1;
    out.push({ name: '天姚', palaceIndex: (11 + m) % 12 }); // 正月起丑顺行
    out.push({ name: '天刑', palaceIndex: (7 + m) % 12 });  // 正月起酉顺行
  }
  return out;
}

// ============================================================================
// 四、大限列表（命盘 12 宫各起一限，纯直算零运限调用）
// ============================================================================

export function getZwDecadalList(input: ZwTimeInput): ZwTimeNode[] {
  const palaces = getAstrolabe(input).palaces;
  return palaces.map((palace, i) => {
    const [startAge, endAge] = palace.decadal.range;
    const gan = palace.heavenlyStem;
    const zhi = palace.earthlyBranch;
    return {
      level: 'decadal' as const,
      label: `${gan}${zhi}`,
      sub: `${startAge}-${endAge}`,
      gan,
      zhi,
      palaceIndex: i,
      palaceName: palace.name,
      mutagen: GAN_MUTAGEN[gan] || [],
      ageRange: [startAge, endAge],
    };
  });
}

// ============================================================================
// 四、流年列表（所选大限内 10 年，纯直算：流年宫 = 年支所在宫）
// ============================================================================

export function getZwYearlyList(input: ZwTimeInput, decadalIndex: number): ZwTimeNode[] {
  const decadal = getZwDecadalList(input)[decadalIndex];
  if (!decadal || !decadal.ageRange) return [];
  const startAge = decadal.ageRange[0];
  const startYear = input.year + startAge - 1;
  const years: ZwTimeNode[] = [];
  for (let i = 0; i < 10; i++) {
    const y = startYear + i;
    const { gan, zhi } = yearGanZhi(y);
    const idx = ZHI_ORDER.indexOf(zhi);
    years.push({
      level: 'yearly',
      label: `${gan}${zhi}`,
      sub: `${y}年·${startAge + i}岁`,
      gan,
      zhi,
      palaceIndex: idx,
      palaceName: natalPalaceName(input, idx),
      mutagen: GAN_MUTAGEN[gan] || [],
      year: y,
      age: startAge + i,
    });
  }
  return years;
}

// ============================================================================
// 五、流月列表（流年内农历 1-12 月；1 次运限调用校准斗君起点，其余直算）
// 闰月不单独成格（与主流排盘一致），闰月期间运限随实际日期自动归属
// ============================================================================

export function getZwMonthlyList(input: ZwTimeInput, year: number): ZwTimeNode[] {
  const months: ZwTimeNode[] = [];
  const yg = yearGanZhi(year);
  let m1Index = -1;
  try {
    // 农历正月十五锚点，取斗君起正月宫位
    const solar = lunar2solar(`${year}-1-15`);
    const h = horoscopeAt(input, new Date(solar.solarYear, solar.solarMonth - 1, solar.solarDay));
    m1Index = (h.monthly as unknown as { index: number }).index;
  } catch {
    m1Index = -1;
  }
  for (let m = 1; m <= 12; m++) {
    const gz = monthGanZhi(yg.gan, m);
    const idx = m1Index >= 0 ? (m1Index + m - 1) % 12 : ZHI_ORDER.indexOf(gz.zhi);
    months.push({
      level: 'monthly',
      label: `${m}月`,
      sub: `农历${m}月`,
      gan: gz.gan,
      zhi: gz.zhi,
      palaceIndex: idx,
      palaceName: natalPalaceName(input, idx),
      mutagen: GAN_MUTAGEN[gz.gan] || [],
      lunarMonth: m,
    });
  }
  return months;
}

// ============================================================================
// 六、流日列表（流月内逐日；1 次运限调用校准流月宫，日干支按真实历法）
// ============================================================================

export function getZwDailyList(input: ZwTimeInput, year: number, lunarMonth: number): ZwTimeNode[] {
  const days: ZwTimeNode[] = [];
  let startSolar: { solarYear: number; solarMonth: number; solarDay: number };
  let totalDays = 30;
  try {
    startSolar = lunar2solar(`${year}-${lunarMonth}-1`);
    totalDays = getTotalDaysOfLunarMonth(`${startSolar.solarYear}-${startSolar.solarMonth}-${startSolar.solarDay}`);
  } catch {
    return days;
  }
  // 1 次运限调用：农历十五锚点取流月宫位
  let monthIndex = -1;
  try {
    const solar = lunar2solar(`${year}-${lunarMonth}-15`);
    const h = horoscopeAt(input, new Date(solar.solarYear, solar.solarMonth - 1, solar.solarDay));
    monthIndex = (h.monthly as unknown as { index: number }).index;
  } catch {
    monthIndex = -1;
  }
  let cursor = new Date(startSolar.solarYear, startSolar.solarMonth - 1, startSolar.solarDay);
  // 初一日柱由历法精确计算，后续逐日递增（日柱连续）
  let baseGanIdx = -1;
  let baseZhiIdx = -1;
  try {
    const pillars = getHeavenlyStemAndEarthlyBranchBySolarDate(
      `${startSolar.solarYear}-${startSolar.solarMonth}-${startSolar.solarDay}`, 0
    );
    baseGanIdx = GAN_LIST.indexOf(pillars.daily[0]);
    baseZhiIdx = ZHI_STD.indexOf(pillars.daily[1]);
  } catch {
    baseGanIdx = -1;
    baseZhiIdx = -1;
  }
  for (let d = 1; d <= totalDays; d++) {
    const solarStr = `${cursor.getFullYear()}-${cursor.getMonth() + 1}-${cursor.getDate()}`;
    const gan = baseGanIdx >= 0 ? GAN_LIST[(baseGanIdx + d - 1) % 10] : '';
    const zhi = baseZhiIdx >= 0 ? ZHI_STD[(baseZhiIdx + d - 1) % 12] : '';
    const idx = monthIndex >= 0 ? (monthIndex + d - 1) % 12 : ZHI_ORDER.indexOf(zhi);
    days.push({
      level: 'daily',
      label: LUNAR_DAY_NAMES[d - 1] || `${d}日`,
      sub: LUNAR_DAY_NAMES[d - 1] || `${d}日`,
      gan,
      zhi,
      palaceIndex: gan ? idx : -1,
      palaceName: gan ? natalPalaceName(input, idx) : '',
      mutagen: gan ? GAN_MUTAGEN[gan] || [] : [],
      lunarDay: d,
      solarDate: solarStr,
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }
  return days;
}

// ============================================================================
// 七、流时列表（流日内 12 时辰；1 次运限调用校准流日宫，时干支五鼠遁）
// ============================================================================

export function getZwHourlyList(input: ZwTimeInput, solarDate: string): ZwTimeNode[] {
  const hours: ZwTimeNode[] = [];
  const branchNames = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  let dayGan = '';
  let dayIndex = -1;
  try {
    const [y, m, d] = solarDate.split('-').map(Number);
    const h = horoscopeAt(input, new Date(y, m - 1, d));
    dayGan = (h.daily as unknown as { heavenlyStem: string }).heavenlyStem;
    dayIndex = (h.daily as unknown as { index: number }).index;
  } catch {
    dayGan = '';
    dayIndex = -1;
  }
  const startGan = GAN_LIST.indexOf(DAY_TO_HOUR_GAN[dayGan] || '甲');
  for (let i = 0; i < 12; i++) {
    const gan = GAN_LIST[(startGan + i) % 10];
    const zhi = branchNames[i];
    const idx = dayIndex >= 0 ? (dayIndex + i) % 12 : ZHI_ORDER.indexOf(zhi);
    hours.push({
      level: 'hourly',
      label: `${gan}${zhi}`,
      sub: `${zhi}时`,
      gan,
      zhi,
      palaceIndex: idx,
      palaceName: natalPalaceName(input, idx),
      mutagen: GAN_MUTAGEN[gan] || [],
      solarDate,
    });
  }
  return hours;
}

// ============================================================================
// 八、任意时点全量快照（AI 紫微分析 / 解盘统一调用，禁止重复计算）
// ============================================================================

interface RawItem {
  index: number;
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  palaceNames: string[];
  mutagen: string[];
}

function toNode(input: ZwTimeInput, level: ZwTimeLevel, item: RawItem, extra: Partial<ZwTimeNode> = {}): ZwTimeNode {
  return {
    level,
    label: `${item.heavenlyStem}${item.earthlyBranch}`,
    sub: '',
    gan: item.heavenlyStem,
    zhi: item.earthlyBranch,
    palaceIndex: item.index,
    palaceName: natalPalaceName(input, item.index),
    mutagen: item.mutagen || [],
    ...extra,
  };
}

export function getZwHoroscopeAt(input: ZwTimeInput, date: Date | string): ZwHoroscopeSnapshot {
  const h = horoscopeAt(input, date);
  const solarDate = typeof date === 'string' ? date : `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  return {
    lunarDate: h.lunarDate,
    solarDate,
    decadal: toNode(input, 'decadal', h.decadal as unknown as RawItem),
    age: { ...toNode(input, 'natal', h.age as unknown as RawItem), nominalAge: h.age?.nominalAge ?? 0 },
    yearly: toNode(input, 'yearly', h.yearly as unknown as RawItem),
    monthly: toNode(input, 'monthly', h.monthly as unknown as RawItem),
    daily: toNode(input, 'daily', h.daily as unknown as RawItem),
    hourly: toNode(input, 'hourly', h.hourly as unknown as RawItem),
  };
}
