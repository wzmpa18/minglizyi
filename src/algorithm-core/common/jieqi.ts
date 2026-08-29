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
// 四、真太阳时校正（天文学级）
// ============================================================================
// 真太阳时 = 标准时间 + 经度差修正 + 均时差
//   - 经度差修正：(当地经度 - 时区基准经度) × 4 分钟/度
//   - 均时差 EoT：采用 Meeus《Astronomical Algorithms》太阳位置低精度算法
//     （平黄经 + 中心差 + 视黄经 + 视赤经），精度约 ±2.4 秒（0.01°），
//     全年 4 次过零点，极值约 -14.2 ~ +16.4 分钟，可与专业天文历书对标。
//   说明：旧版 Spencer(1971) 傅里叶级数最大偏差约 53 秒（≈0.9 分钟），
//         不足以支撑「±3 秒」口径，故本版本净室升级为 Meeus 算法。
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
 * 角度转弧度
 */
function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * 弧度转角度
 */
function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * 计算儒略日 JD（公历日期，含当日 UTC 小数天）
 *
 * @param year - 公历年
 * @param month - 公历月（1-12）
 * @param day - 公历日（含小数部分，来自 UTC 小时）
 */
function julianDay(year: number, month: number, day: number, utcHours: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    utcHours / 24 +
    B -
    1524.5
  );
}

/**
 * 计算均时差 EoT（分钟）：Meeus《Astronomical Algorithms》太阳位置低精度算法
 *
 * 精度约 ±2.4 秒（0.01°），全年 4 次过零点，极值约 -14.2 ~ +16.4 分钟。
 * 输入 date 视为绝对时刻（瞬时），按 UTC 分量计算儒略日，与服务器本地时区无关。
 *
 * @param date - 标准时间（绝对时刻）
 * @returns 均时差（分钟，正值表示真太阳快于平太阳/钟表时间）
 *
 * @license MIT - 净室独立实现
 * @reference Meeus, J. (1991). Astronomical Algorithms, 2nd ed. (太阳位置低精度算法)
 */
function meeusEquationOfTime(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600 +
    date.getUTCMilliseconds() / 3600000;

  const JD = julianDay(y, m, d, utcHours);
  const T = (JD - 2451545.0) / 36525;

  // 太阳平黄经 L0（度）
  let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  L0 = ((L0 % 360) + 360) % 360;

  // 太阳平近点角 M（弧度）
  let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  M = toRadians(((M % 360) + 360) % 360);

  // 中心差 C（度）
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M) +
    0.000289 * Math.sin(3 * M);

  // 视黄经 λ（含光行差与章动近似）
  const trueLongitude = L0 + C;
  const omega = toRadians(125.04 - 1934.136 * T);
  const lambda = toRadians(trueLongitude - 0.00569 - 0.00478 * Math.sin(omega));

  // 平黄道倾角 ε0（度）与真黄道倾角 ε（弧度）
  const eps0 =
    23 + 26 / 60 + 21.448 / 3600 -
    (46.815 * T + 0.00059 * T * T - 0.001813 * T * T * T) / 3600;
  const eps = toRadians(eps0 + 0.00256 * Math.cos(omega));

  // 视赤经 α（度）
  const alpha = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const alphaDeg = ((toDegrees(alpha) % 360) + 360) % 360;

  // 均时差 E = L0 - 0.0057183 - α，单位度；换算为分钟并归一到 [-720, +720]
  const Edeg = L0 - 0.0057183 - alphaDeg;
  let Emins = Edeg * 4;
  Emins = ((Emins % 1440) + 1440) % 1440;
  if (Emins > 720) Emins -= 1440;

  return Emins;
}

/**
 * 计算真太阳时（天文学级）
 *
 * 真太阳时 = 标准时间 + 经度时差 + 均时差
 * - 经度时差：每度经度对应4分钟，东经为正，西经为负
 *   标准时区基准经度：东八区为120度
 * - 均时差：地球公转轨道椭圆导致的日行差，与日期有关
 *
 * 均时差采用 Meeus《Astronomical Algorithms》太阳位置低精度算法，
 * 精度约 ±2.4 秒（0.01°），全年 4 次过零点、极值约 -14.2 ~ +16.4 分钟，
 * 可直接对标权威天文历书（美国海军天文台 / 天文年历）。
 *
 * @param date - 标准时间（绝对时刻，内部按 UTC 分量计算均时差）
 * @param longitude - 观测地点经度（度，东经为正）
 * @param timezoneLongitude - 时区基准经度（度，默认120=东八区）
 * @returns 真太阳时校正结果
 *
 * @license MIT - 净室独立实现
 * @reference Meeus, J. (1991). Astronomical Algorithms, 2nd ed.
 */
export function calcTrueSolarTime(
  date: Date,
  longitude: number,
  timezoneLongitude: number = 120,
): TrueSolarTimeResult {
  // 经度时差：每度4分钟（当地经度相对120°E基准线的时差）
  const longitudeOffset = (longitude - timezoneLongitude) * 4;

  // 均时差 EoT（分钟）：Meeus 天文算法
  const equationOfTime = meeusEquationOfTime(date);

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
