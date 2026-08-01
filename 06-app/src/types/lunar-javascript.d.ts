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

  export class EightChar {
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
    getYearShiShenGan(): string;
    getMonthShiShenGan(): string;
    getTimeShiShenGan(): string;
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
    static fromYmdHms(year: number, month: number, day: number, hour?: number, minute?: number, second?: number): Lunar;
    static fromDate(date: Date): Lunar;
    getSolar(): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
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
    getEightChar(): EightChar;
    /** 返回当天节气名称，当天不是交节日返回空字符串 '' */
    getJieQi(): string;
    getJieQiTable(): Record<string, Solar>;
    getCurrentJieQi(): JieQi | null;
    getPrevJieQi(wholeDay?: boolean): JieQi | null;
    getNextJieQi(wholeDay?: boolean): JieQi | null;
    getYearShengXiao(): string;
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
}
