declare module 'lunar-javascript' {
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    static fromYmdHms(year: number, month: number, day: number, hour?: number, minute?: number, second?: number): Solar;
    static fromDate(date: Date): Solar;
    static fromJulianDay(julianDay: number): Solar;
    getLunar(): Lunar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;
    getSecond(): number;
    getWeek(): number;
    getWeekInChinese(): string;
    getFestivals(): string[];
    toYmd(): string;
    toYmdHms(): string;
    toFullString(): string;
    next(days: number): Solar;
    nextYear(n: number): Solar;
    nextMonth(n: number): Solar;
    nextHour(n: number): Solar;
    subtractMinute(minutes: number): number;
  }

  export class SolarMonth {
    static fromYm(year: number, month: number): SolarMonth;
    static fromDate(date: Date): SolarMonth;
    getYear(): number;
    getMonth(): number;
    getDays(): Solar[];
    next(n: number): SolarMonth;
    toFullString(): string;
    toString(): string;
  }

  /** 节气对象 */
  export interface JieQi {
    getName(): string;
    getSolar(): Solar;
    isJie(): boolean;
    isQi(): boolean;
    toString(): string;
  }

  /** 流年 */
  export class LiuNian {
    getGanZhi(): string;
    getYear(): number;
    getAge(): number;
  }

  /** 小运 */
  export class XiaoYun {
    getGanZhi(): string;
    getYear(): number;
    getAge(): number;
  }

  /** 大运 */
  export class DaYun {
    getStartYear(): number;
    getEndYear(): number;
    getStartAge(): number;
    getEndAge(): number;
    getIndex(): number;
    getGanZhi(): string;
    getXun(): string;
    getXunKong(): string;
    getLunar(): Lunar;
    getLiuNian(n?: number): LiuNian[];
    getXiaoYun(n?: number): XiaoYun[];
  }

  /** 运 */
  export class Yun {
    getGender(): number;
    getStartYear(): number;
    getStartMonth(): number;
    getStartDay(): number;
    getStartHour(): number;
    isForward(): boolean;
    getLunar(): Lunar;
    getStartSolar(): Solar;
    getDaYun(n?: number): DaYun[];
  }

  export class EightChar {
    setSect(sect: number): void;
    getSect(): number;
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    // 天干
    getYearGan(): string;
    getMonthGan(): string;
    getDayGan(): string;
    getTimeGan(): string;
    // 地支
    getYearZhi(): string;
    getMonthZhi(): string;
    getDayZhi(): string;
    getTimeZhi(): string;
    // 藏干
    getYearHideGan(): string[];
    getMonthHideGan(): string[];
    getDayHideGan(): string[];
    getTimeHideGan(): string[];
    // 天干十神
    getYearShiShenGan(): string;
    getMonthShiShenGan(): string;
    getDayShiShenGan(): string;
    getTimeShiShenGan(): string;
    // 地支藏干十神
    getYearShiShenZhi(): string[];
    getMonthShiShenZhi(): string[];
    getDayShiShenZhi(): string[];
    getTimeShiShenZhi(): string[];
    // 地势(十二长生)
    getYearDiShi(): string;
    getMonthDiShi(): string;
    getDayDiShi(): string;
    getTimeDiShi(): string;
    // 空亡
    getYearXun(): string;
    getMonthXun(): string;
    getDayXun(): string;
    getTimeXun(): string;
    getYearXunKong(): string;
    getMonthXunKong(): string;
    getDayXunKong(): string;
    getTimeXunKong(): string;
    // 纳音
    getYearNaYin(): string;
    getMonthNaYin(): string;
    getDayNaYin(): string;
    getTimeNaYin(): string;
    // 五行
    getYearWuXing(): string;
    getMonthWuXing(): string;
    getDayWuXing(): string;
    getTimeWuXing(): string;
    // 索引
    getDayGanIndex(): number;
    getDayZhiIndex(): number;
    // 胎元/胎息/命宫/身宫
    getTaiYuan(): string;
    getTaiYuanNaYin(): string;
    getTaiXi(): string;
    getTaiXiNaYin(): string;
    getMingGong(): string;
    getMingGongNaYin(): string;
    getShenGong(): string;
    getShenGongNaYin(): string;
    // 运
    getYun(gender: number, sect: number): Yun;
    getLunar(): Lunar;
    // 通用
    getXun(ganZhi: string): string;
    getXunKong(ganZhi: string): string;
  }

  export class LunarTime {
    static fromYmdHms(year: number, month: number, day: number, hour: number, minute?: number, second?: number): LunarTime;
    getGan(): string;
    getZhi(): string;
    getGanZhi(): string;
    getTianShenLuck(): string;
    getYi(): string[];
    getJi(): string[];
    getChongShengXiao(): string;
    getSha(): string;
    getPositionCai(): string;
    getPositionCaiDesc(): string;
    getPositionXi(): string;
    getPositionXiDesc(): string;
    getPositionFu(): string;
    getPositionFuDesc(): string;
    getPositionYangGui(): string;
    getPositionYangGuiDesc(): string;
  }

  export class Lunar {
    static fromYmd(year: number, month: number, day: number): Lunar;
    static fromYmdHms(year: number, month: number, day: number, hour?: number, minute?: number, second?: number): Lunar;
    static fromDate(date: Date): Lunar;
    getSolar(): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    // 干支(非精确)
    getTimeZhi(): string;
    getTimeGan(): string;
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getYearInGanZhi(): string;
    getMonthInGanZhi(): string;
    getDayInGanZhi(): string;
    getTimeInGanZhi(): string;
    // 干支(精确,按节气)
    getYearInGanZhiExact(): string;
    getMonthInGanZhiExact(): string;
    getYearGanExact(): string;
    getYearZhiExact(): string;
    getMonthGanExact(): string;
    getMonthZhiExact(): string;
    getDayGanExact(): string;
    getDayZhiExact(): string;
    getDayGanExact2(): string;
    getDayZhiExact2(): string;
    getYearGanIndexExact(): number;
    getYearZhiIndexExact(): number;
    getMonthGanIndexExact(): number;
    getMonthZhiIndexExact(): number;
    getDayGanIndexExact(): number;
    getDayZhiIndexExact(): number;
    getDayGanIndexExact2(): number;
    getDayZhiIndexExact2(): number;
    getTimeZhiIndex(): number;
    // 空亡(精确)
    getYearXunExact(): string;
    getMonthXunExact(): string;
    getDayXunExact(): string;
    getDayXunExact2(): string;
    getYearXunKongExact(): string;
    getMonthXunKongExact(): string;
    getDayXunKongExact(): string;
    getDayXunKongExact2(): string;
    // 八字
    getEightChar(): EightChar;
    // 节气
    getJieQi(): string;
    getJieQiTable(): Record<string, Solar>;
    getCurrentJieQi(): JieQi | null;
    getPrevJieQi(wholeDay?: boolean): JieQi | null;
    getNextJieQi(wholeDay?: boolean): JieQi | null;
    getPrevJie(): JieQi;
    getNextJie(): JieQi;
    getPrevJieQi(wholeDay?: boolean): JieQi | null;
    getNextJieQi(wholeDay?: boolean): JieQi | null;
    // 生肖
    getYearShengXiao(): string;
    getYearShengXiaoByLiChun(): string;
    getMonthShengXiaoExact(): string;
    // 中文日期
    getYearInChinese(): string;
    getMonthInChinese(): string;
    getDayInChinese(): string;
    getWeek(): number;
    getFestivals(): string[];
    // 黄历核心
    getDayYi(): string[];
    getDayJi(): string[];
    getDayNaYin(): string;
    getZhiXing(): string;
    getDayTianShenType(): string;
    getDayTianShen(): string;
    getXiu(): string;
    getZheng(): string;
    getAnimal(): string;
    getPengZuGan(): string;
    getPengZuZhi(): string;
    // 方位
    getDayPositionTai(): string;
    getDayPositionCai(): string;
    getDayPositionCaiDesc(): string;
    getDayPositionXi(): string;
    getDayPositionXiDesc(): string;
    getDayPositionFu(): string;
    getDayPositionFuDesc(): string;
    getDayPositionYangGui(): string;
    getDayPositionYangGuiDesc(): string;
    getDayPositionYinGui(): string;
    getDayPositionYinGuiDesc(): string;
    // 冲煞
    getDayChongShengXiao(): string;
    getDayChongDesc(): string;
    getDaySha(): string;
    // 神煞
    getDayJiShen(): string[];
    getDayXiongSha(): string[];
    // 时辰
    getTimeInGanZhi(): string;
    getTimeTianShenLuck(): string;
    getTimeChongShengXiao(): string;
    getTimeSha(): string;
    getTimePositionCai(): string;
    getTimePositionCaiDesc(): string;
    getTimePositionXi(): string;
    getTimePositionXiDesc(): string;
    getTimePositionFu(): string;
    getTimePositionFuDesc(): string;
    getTimePositionYangGui(): string;
    getTimePositionYangGuiDesc(): string;
    getTimeYi(): string[];
    getTimeJi(): string[];
    getTimes(): LunarTime[];
    // 佛历道历
    getFoto(): Foto;
    getTao(): Tao;
    toString(): string;
    toFullString(): string;
  }

  export class Foto {
    getFestivals(): string[];
    isDayZhaiTen(): boolean;
    isDayZhaiSix(): boolean;
    isDayZhaiGuanYin(): boolean;
    isDayZhaiShuoWang(): boolean;
  }

  export class Tao {
    getFestivals(): string[];
    isDaySanHui(): boolean;
    isDaySanYuan(): boolean;
    isDayBaJie(): boolean;
    isDayWuLa(): boolean;
    isDayBaHui(): boolean;
    isDayMingWu(): boolean;
    isDayAnWu(): boolean;
    isDayTianShe(): boolean;
  }

  export class HolidayUtil {
    static getHoliday(solar: Solar): any;
  }

  export class LunarMonth {
    static fromYm(year: number, month: number): LunarMonth;
    getYear(): number;
    getMonth(): number;
    isLeap(): boolean;
    getDayCount(): number;
    getJieQi(): string;
    toString(): string;
  }

  export class LunarYear {
    static fromYear(year: number): LunarYear;
    getYear(): number;
    getMonths(): LunarMonth[];
    getMonth(month: number): LunarMonth | undefined;
    getGanIndex(): number;
    getZhiIndex(): number;
    toString(): string;
  }
}
