/**
 * 原始来源：自研净室重写，MIT License
 * 原始版本：v1.0
 * 修改记录：2026-07-26 从 common/index.ts 拆分重构
 * 当前协议：MIT
 * 外部依赖：历法引擎用于精确节气计算
 * 净室声明：独立构建，基于公开节气计算规则
 */

// ============================================================================
// 一、节气名称数据
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
// 二、节气月份索引
// ============================================================================

/**
 * 获取节气对应的月份索引
 * 立春(0) -> 寅月，惊蛰(1) -> 卯月，以此类推
 *
 * @param jieName - 节名
 * @returns 月份索引（0=寅月），未找到返回 -1
 *
 * @license MIT - 净室独立实现
 */
export function getMonthByJie(jieName: string): number {
  const idx = JIE_NAMES.indexOf(jieName);
  return idx === -1 ? -1 : idx;
}

// ============================================================================
// 三、节气计算工具函数（骨架）
// ============================================================================
// 说明：以下函数提供节气计算的基本骨架，精确节气计算后续依赖 历法引擎库。
// 当前版本提供数据结构定义和接口契约，实际计算由 历法引擎 的 Solar.fromDate() 等 API 完成。
// ============================================================================

/**
 * 节气信息
 */
export interface JieQiInfo {
  /** 节气名称 */
  name: string;
  /** 节气序号（0-23，立春为0） */
  index: number;
  /** 是否为节（非气），节为月柱分界点 */
  isJie: boolean;
  /** 对应月份索引（0=寅月，仅节有效） */
  monthIndex: number;
}

/**
 * 根据节气名称获取节气信息
 *
 * @param name - 节气名称
 * @returns 节气信息，若无效返回 null
 *
 * @license MIT - 净室独立实现
 */
export function getJieQiInfo(name: string): JieQiInfo | null {
  const idx = JIEQI_NAMES.indexOf(name);
  if (idx === -1) return null;

  const jieIdx = JIE_NAMES.indexOf(name);
  return {
    name,
    index: idx,
    isJie: jieIdx !== -1,
    monthIndex: jieIdx,
  };
}

/**
 * 获取指定节气的序号
 *
 * @param name - 节气名称
 * @returns 节气序号（0-23），未找到返回 -1
 *
 * @license MIT - 净室独立实现
 */
export function getJieQiIndex(name: string): number {
  return JIEQI_NAMES.indexOf(name);
}

/**
 * 根据序号获取节气名称
 *
 * @param index - 节气序号（0-23）
 * @returns 节气名称，若无效返回 null
 *
 * @license MIT - 净室独立实现
 */
export function getJieQiNameByIndex(index: number): string | null {
  if (index < 0 || index >= 24) return null;
  return JIEQI_NAMES[index];
}

/**
 * 判断节气名称是否为"节"（月柱分界点）
 *
 * 十二节：立春、惊蛰、清明、立夏、芒种、小暑、立秋、白露、寒露、立冬、大雪、小寒
 *
 * @param name - 节气名称
 * @returns 是否为节
 *
 * @license MIT - 净室独立实现
 */
export function isJie(name: string): boolean {
  return JIE_NAMES.indexOf(name) !== -1;
}

/**
 * 判断节气名称是否为"气"（非月柱分界点）
 *
 * @param name - 节气名称
 * @returns 是否为气
 *
 * @license MIT - 净室独立实现
 */
export function isQi(name: string): boolean {
  return JIEQI_NAMES.indexOf(name) !== -1 && JIE_NAMES.indexOf(name) === -1;
}

// ============================================================================
// 四、真太阳时校正（骨架）
// ============================================================================
// 说明：真太阳时校正需要根据观测地点的经度、日期和标准时间来计算。
// 精确计算依赖天文算法，后续可集成 历法引擎的 Solar 相关 API。
// ============================================================================

/**
 * 真太阳时校正结果
 */
export interface TrueSolarTimeResult {
  /** 标准时间（输入） */
  standardTime: Date;
  /** 经度（度） */
  longitude: number;
  /** 均时差（分钟） */
  equationOfTime: number;
  /** 经度时差（分钟） */
  longitudeOffset: number;
  /** 真太阳时（Date 对象） */
  trueSolarTime: Date;
  /** 校正偏移（分钟，正值表示真太阳时比标准时间快） */
  totalOffset: number;
}

/**
 * 计算真太阳时（骨架实现）
 *
 * 真太阳时 = 标准时间 + 经度时差 + 均时差
 * - 经度时差：每度经度对应4分钟，东经为正，西经为负
 *   标准时区基准经度：东八区为120度
 * - 均时差：地球公转轨道椭圆导致的日行差，与日期有关
 *
 * 当前版本使用简化公式计算均时差，精确版本后续依赖 历法引擎库。
 *
 * @param date - 标准时间
 * @param longitude - 观测地点经度（度，东经为正）
 * @param timezoneLongitude - 时区基准经度（度，默认120=东八区）
 * @returns 真太阳时校正结果
 *
 * @license MIT - 净室独立实现
 * @reference 公开天文算法，基于地球公转轨道近似公式
 */
export function calcTrueSolarTime(
  date: Date,
  longitude: number,
  timezoneLongitude: number = 120,
): TrueSolarTimeResult {
  // 经度时差：每度4分钟
  const longitudeOffset = (longitude - timezoneLongitude) * 4;

  // 均时差（简化公式，基于日角近似）
  // 公式来源：公开天文算法，日角 B = 2 * PI * (dayOfYear - 81) / 365
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const B = (2 * Math.PI * (dayOfYear - 81)) / 365;
  const equationOfTime = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  // 总偏移
  const totalOffset = longitudeOffset + equationOfTime;

  // 真太阳时
  const trueSolarTime = new Date(date.getTime() + totalOffset * 60 * 1000);

  return {
    standardTime: date,
    longitude,
    equationOfTime: Math.round(equationOfTime * 100) / 100,
    longitudeOffset: Math.round(longitudeOffset * 100) / 100,
    trueSolarTime,
    totalOffset: Math.round(totalOffset * 100) / 100,
  };
}

/**
 * 判断当前时间是否处于真太阳时的某个时辰
 *
 * 时辰划分（真太阳时）：
 * 子时 23:00-01:00，丑时 01:00-03:00，寅时 03:00-05:00，卯时 05:00-07:00，
 * 辰时 07:00-09:00，巳时 09:00-11:00，午时 11:00-13:00，未时 13:00-15:00，
 * 申时 15:00-17:00，酉时 17:00-19:00，戌时 19:00-21:00，亥时 21:00-23:00
 *
 * @param date - 标准时间
 * @param longitude - 观测地点经度（度，东经为正）
 * @returns 时辰索引（0=子时，1=丑时，... 11=亥时）
 *
 * @license MIT - 净室独立实现
 */
export function getTrueSolarHourIndex(date: Date, longitude: number): number {
  const { trueSolarTime } = calcTrueSolarTime(date, longitude);
  const hours = trueSolarTime.getHours();
  const minutes = trueSolarTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // 时辰映射：子时(23:00-01:00) -> 0, 丑时(01:00-03:00) -> 1, ...
  // 先将时间偏移到以子时起点为基准：子时 = 23:00 = 1380 分钟
  const adjusted = (totalMinutes + 60) % (24 * 60); // 加60分钟使子时(23:00)变为0:00
  return Math.floor(adjusted / 120); // 每时辰2小时=120分钟
}

// ============================================================================
// 五、节气日期计算（骨架，后续依赖 历法引擎 MIT 库）
// ============================================================================
// 说明：精确节气日期计算后续依赖 历法引擎库的 Solar API。
// 当前版本提供简化估算和接口契约，精确计算需集成 历法引擎。
// ============================================================================

/**
 * 获取指定年份的节气日期（公式法，精度±1天）
 *
 * 使用寿星天文历通用公式：D = 0.2422 * (year - 1900) - floor((year - 1900) / 4)
 * 节气日期 = round(baseDay + D)，适用年份 1900-2100。
 *
 * @param year - 公历年（以立春为岁首的节气年，小寒/大寒在次年1月）
 * @param jieQiIndex - 节气序号（0=立春，1=雨水，... 23=大寒）
 * @returns 节气日期 Date 对象
 *
 * @license MIT - 净室独立实现，公式基于公开天文历法文献
 */
export function getJieQiDate(year: number, jieQiIndex: number): Date {
  // 1900年各节气基准日期（月/日）—— 与bazi模块保持一致
  const baseDates: { month: number; day: number }[] = [
    { month: 2, day: 4 },  // 0=立春
    { month: 2, day: 19 }, // 1=雨水
    { month: 3, day: 6 },  // 2=惊蛰
    { month: 3, day: 21 }, // 3=春分
    { month: 4, day: 5 },  // 4=清明
    { month: 4, day: 20 }, // 5=谷雨
    { month: 5, day: 6 },  // 6=立夏
    { month: 5, day: 21 }, // 7=小满
    { month: 6, day: 6 },  // 8=芒种
    { month: 6, day: 22 }, // 9=夏至
    { month: 7, day: 7 },  // 10=小暑
    { month: 7, day: 23 }, // 11=大暑
    { month: 8, day: 8 },  // 12=立秋
    { month: 8, day: 23 }, // 13=处暑
    { month: 9, day: 8 },  // 14=白露
    { month: 9, day: 23 }, // 15=秋分
    { month: 10, day: 8 }, // 16=寒露
    { month: 10, day: 24 },// 17=霜降
    { month: 11, day: 8 }, // 18=立冬
    { month: 11, day: 22 },// 19=小雪
    { month: 12, day: 7 }, // 20=大雪
    { month: 12, day: 22 },// 21=冬至
    { month: 1, day: 6 },  // 22=小寒（次年1月）
    { month: 1, day: 20 }, // 23=大寒（次年1月）
  ];

  if (jieQiIndex < 0 || jieQiIndex >= 24) {
    throw new Error(`Invalid jieqi index: ${jieQiIndex}, must be 0-23`);
  }

  const base = baseDates[jieQiIndex];
  // 小寒(idx=22)、大寒(idx=23)落在次年1月
  const actualYear = jieQiIndex >= 22 ? year + 1 : year;

  // 寿星天文历通用公式：D = 0.2422*(Y-1900) - floor((Y-1900)/4)
  const Y = actualYear - 1900;
  const D = 0.2422 * Y - Math.floor(Y / 4);
  const day = Math.round(base.day + D);

  return new Date(actualYear, base.month - 1, day);
}

/**
 * 获取最近的节气（当前日期之前或之后的第一个节气）
 *
 * @param date - 参考日期
 * @returns 最近的节气信息
 *
 * @license MIT - 净室独立实现
 */
export function getNearestJieQi(date: Date): { name: string; index: number; date: Date; isJie: boolean; isPast: boolean } {
  const year = date.getFullYear();
  let nearest: { name: string; index: number; date: Date; isJie: boolean; isPast: boolean } | null = null;
  let minDiff = Infinity;

  // 检查前一年、当年、后一年的所有节气
  for (let y = year - 1; y <= year + 1; y++) {
    for (let i = 0; i < 24; i++) {
      const jqDate = getJieQiDate(y, i);
      const diff = Math.abs(jqDate.getTime() - date.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        nearest = {
          name: JIEQI_NAMES[i],
          index: i,
          date: jqDate,
          isJie: JIE_NAMES.indexOf(JIEQI_NAMES[i]) !== -1,
          isPast: jqDate.getTime() <= date.getTime(),
        };
      }
    }
  }

  return nearest!;
}

/**
 * 获取当前日期所在的节气区间
 *
 * @param date - 参考日期（默认当前时间）
 * @returns 当前节气信息
 *
 * @license MIT - 净室独立实现
 */
export function getCurrentJieQi(date: Date = new Date()): { name: string; index: number; startDate: Date; endDate: Date } {
  const year = date.getFullYear();

  for (let i = 0; i < 24; i++) {
    const currentJq = getJieQiDate(year, i);
    const nextJq = i < 23 ? getJieQiDate(year, i + 1) : getJieQiDate(year + 1, 0);

    if (date >= currentJq && date < nextJq) {
      return {
        name: JIEQI_NAMES[i],
        index: i,
        startDate: currentJq,
        endDate: nextJq,
      };
    }
  }

  // 兜底：返回立春
  const lichun = getJieQiDate(year, 0);
  return {
    name: '立春',
    index: 0,
    startDate: lichun,
    endDate: getJieQiDate(year, 1),
  };
}

/**
 * 根据节气名称获取节气信息
 *
 * @param name - 节气名称
 * @returns 节气信息，若无效返回 null
 *
 * @license MIT - 净室独立实现
 */
export function getJieQiByName(name: string): JieQiInfo | null {
  return getJieQiInfo(name);
}

/**
 * 计算两个日期之间的天数差
 *
 * @param date1 - 日期1
 * @param date2 - 日期2
 * @returns 天数差（date2 - date1）
 *
 * @license MIT - 净室独立实现
 */
export function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.round((d2.getTime() - d1.getTime()) / msPerDay);
}

/**
 * 日期加减天数
 *
 * @param date - 基准日期
 * @param days - 天数（正数为加，负数为减）
 * @returns 新日期
 *
 * @license MIT - 净室独立实现
 */
export function addDaysToDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
