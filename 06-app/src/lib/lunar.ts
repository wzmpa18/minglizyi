/**
 * 农历转换工具
 * 原始来源：自研净室重写，MIT License
 * 参考依据：公开农历算法（寿星万年历）
 * 净室声明：基于公开算法独立构建，未复制任何 AGPL 源码
 */

// 农历数据：1900-2100 年，每年 4 字节
// 前 12 位（最多）表示各月大小（1=30天，0=29天）
// 第 13-16 位表示闰月月份（0=无闰月）
const LUNAR_INFO: number[] = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a4d0, 0x0d150, 0x0f252,
  0x0d520
];

// 天干地支
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const SHENG_XIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

const LUNAR_MONTH_NAMES = [
  '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '腊月'
];

const LUNAR_DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
];

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
  yearGanZhi: string;
  monthName: string;
  dayName: string;
  shengXiao: string;
}

/**
 * 计算从 1900-01-31（农历庚子年正月初一）到指定日期的天数
 */
function daysFromBase(year: number, month: number, day: number): number {
  // 简化：用公历日期计算偏移
  const baseDate = new Date(1900, 0, 31);
  const targetDate = new Date(year, month - 1, day);
  return Math.floor((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 获取农历年信息
 */
function getLunarYearInfo(lunarYear: number): {
  yearData: number;
  leapMonth: number;
  monthDays: number[];
} {
  const idx = lunarYear - 1900;
  if (idx < 0 || idx >= LUNAR_INFO.length) {
    // 返回默认值（超出范围）
    return { yearData: 0x04bd8, leapMonth: 0, monthDays: [30, 29, 30, 29, 30, 29, 30, 30, 29, 30, 29, 30] };
  }
  const yearData = LUNAR_INFO[idx];
  const leapMonth = yearData & 0xf;
  const monthDays: number[] = [];
  for (let i = 0; i < 12; i++) {
    monthDays.push((yearData & (0x10000 >> i)) ? 30 : 29);
  }
  return { yearData, leapMonth, monthDays };
}

/**
 * 公历转农历
 */
export function solarToLunar(year: number, month: number, day: number): LunarDate {
  const offset = daysFromBase(year, month, day);

  // 从 1900 年开始逐年推算农历
  let lunarYear = 1900;
  let daysAccum = 0;

  while (lunarYear < 2100) {
    const info = getLunarYearInfo(lunarYear);
    let yearDays = 0;
    for (let i = 0; i < 12; i++) {
      yearDays += info.monthDays[i];
    }
    if (info.leapMonth > 0) {
      yearDays += info.monthDays[info.leapMonth - 1] > 29 ? 30 : 29;
    }
    if (daysAccum + yearDays > offset) break;
    daysAccum += yearDays;
    lunarYear++;
  }

  if (lunarYear > 2100) lunarYear = 2100;

  const info = getLunarYearInfo(lunarYear);
  let remaining = offset - daysAccum;
  let lunarMonth = 0;
  let lunarDay = 0;
  let isLeap = false;

  for (let i = 0; i < 12; i++) {
    if (remaining < info.monthDays[i]) {
      lunarMonth = i + 1;
      lunarDay = remaining + 1;
      break;
    }
    remaining -= info.monthDays[i];

    // 检查闰月
    if (info.leapMonth === i + 1 && remaining >= 0) {
      const leapDays = info.monthDays[i] > 29 ? 30 : 29;
      if (remaining < leapDays) {
        lunarMonth = i + 1;
        lunarDay = remaining + 1;
        isLeap = true;
        break;
      }
      remaining -= leapDays;
    }
  }

  // 年干支
  const yearGanIdx = (lunarYear - 4) % 10;
  const yearZhiIdx = (lunarYear - 4) % 12;
  const yearGanZhi = TIAN_GAN[yearGanIdx >= 0 ? yearGanIdx : yearGanIdx + 10] +
    DI_ZHI[yearZhiIdx >= 0 ? yearZhiIdx : yearZhiIdx + 12];

  const monthName = (isLeap ? '闰' : '') + LUNAR_MONTH_NAMES[lunarMonth - 1];
  const dayName = LUNAR_DAY_NAMES[lunarDay - 1];
  const shengXiao = SHENG_XIAO[yearZhiIdx >= 0 ? yearZhiIdx : yearZhiIdx + 12];

  return {
    year: lunarYear,
    month: lunarMonth,
    day: lunarDay,
    isLeapMonth: isLeap,
    yearGanZhi,
    monthName,
    dayName,
    shengXiao,
  };
}

/**
 * 获取农历日期显示字符串
 */
export function getLunarDateString(lunar: LunarDate): string {
  // jishiyu基准显示格式：农历X月XX（不带干支年）
  return `农历${lunar.monthName}${lunar.dayName}`;
}