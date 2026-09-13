// ============================================================================
// 中国历史夏令时（1986-1991 DST）公共处理模块
// ============================================================================
// 历史事实：中国于 1986-1991 年实行夏令时（全国统一，东八区拨快 1 小时），
// 起止均为当年 4 月中旬/5 月初第一个星期日 2:00 至 9 月中旬第一个星期日 2:00。
// 该时段出生者若按当时钟面时间录入，排盘会差 1 小时（时辰/宫度漂移）。
//
// 处理口径（GAP C4，v25.0.82）：
//   - 区间判断：[开始日 02:00, 结束日 02:00)，北京时间，区间端点不跨年
//   - 校正方式：用户勾选"夏令时"即声明录入的是当时钟面时间 → 统一减 1 小时
//     得到标准时间（东八区真钟面）再进排盘引擎；跨日/跨月/跨年由 Date 回退处理
//   - 自动提示：出生时间落在 DST 区间而未勾选时，UI 层提示用户核对
//   - 持久化：校正后的标准时间作为 input 保存，历史盘恢复直接复用，无需二次校正
// ============================================================================

/** 1986-1991 各年夏令时起止（北京时间，含 02:00 时刻） */
const CHINA_DST_RANGES: ReadonlyArray<{
  year: number;
  start: [number, number]; // [month, day]
  end: [number, number]; // [month, day]
}> = [
  { year: 1986, start: [5, 4], end: [9, 14] },
  { year: 1987, start: [4, 12], end: [9, 13] },
  { year: 1988, start: [4, 17], end: [9, 11] },
  { year: 1989, start: [4, 16], end: [9, 17] },
  { year: 1990, start: [4, 15], end: [9, 16] },
  { year: 1991, start: [4, 14], end: [9, 15] },
];

export interface ChinaDstInfo {
  /** 是否处于夏令时区间（按钟面时间） */
  active: boolean;
  year?: number;
  /** 区间文本（如 "1986-05-04 02:00 至 1986-09-14 02:00"） */
  rangeText?: string;
}

/** 判断给定北京时间（钟面）是否处于 1986-1991 中国夏令时区间 */
export function chinaDstInfo(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): ChinaDstInfo {
  const hit = CHINA_DST_RANGES.find((r) => r.year === year);
  if (!hit) return { active: false };

  const [sm, sd] = hit.start;
  const [em, ed] = hit.end;
  const p2 = (n: number) => String(n).padStart(2, "0");
  const rangeText = `${hit.year}-${p2(sm)}-${p2(sd)} 02:00 至 ${hit.year}-${p2(em)}-${p2(ed)} 02:00`;

  // [开始日 02:00, 结束日 02:00)：开始日 02:00 起含，结束日 02:00 起不含
  const inRange =
    (month > sm || (month === sm && (day > sd || (day === sd && hour >= 2))))
    && (month < em || (month === em && (day < ed || (day === ed && hour < 2))));
  return inRange ? { active: true, year: hit.year, rangeText } : { active: false, rangeText };
}

export interface DstCorrectionResult {
  /** 校正后标准时间（年月日时分） */
  corrected: { year: number; month: number; day: number; hour: number; minute: number };
  /** 是否实际减了 1 小时 */
  applied: boolean;
  /** 跨日回退（校正落到前一日，如 5月4日 00:30 → 5月3日 23:30） */
  crossedDay: boolean;
}

/**
 * 夏令时钟面时间 → 北京标准时间（减 1 小时）。
 * enabled=false 时原样返回；跨日/跨月/跨年（1986-05-04 00:30 → 05-03 23:30）
 * 由 Date 对象回退保证正确。
 */
export function applyChinaDstCorrection(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  enabled: boolean,
): DstCorrectionResult {
  if (!enabled) {
    return { corrected: { year, month, day, hour, minute }, applied: false, crossedDay: false };
  }
  const std = new Date(Date.UTC(year, month - 1, day, hour, minute) - 3600 * 1000);
  const corrected = {
    year: std.getUTCFullYear(),
    month: std.getUTCMonth() + 1,
    day: std.getUTCDate(),
    hour: std.getUTCHours(),
    minute: std.getUTCMinutes(),
  };
  return { corrected, applied: true, crossedDay: corrected.day !== day || corrected.month !== month || corrected.year !== year };
}
