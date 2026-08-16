/**
 * ============================================================================
 * 奇门遁甲排盘算法（转盘/阳盘）
 * ============================================================================
 * 协议：MIT License
 * 净室声明：本模块基于公开传统奇门遁甲经典（《烟波钓叟歌》《奇门遁甲统宗》等）
 *           独立构建，仅参考 jishiyu (AGPL) 的算法逻辑以验证结果一致性，
 *           未复制任何 AGPL 源码。代码结构、变量命名、实现方式均为独立设计。
 *
 * 外部依赖：lunar-javascript（MIT 协议）
 *   - Solar.fromYmdHms() 用于公历→农历转换、八字四柱、精确节气计算
 *
 * 九宫编号：坎1 坤2 震3 巽4 中5 乾6 兑7 艮8 离9（后天八卦洛书方位）
 *
 * 支持定局法：
 *   - 拆补法（chaibu）：默认，以日干支符头定三元
 *   - 置闰法（zhirun）：超神接气，以节气交接+符头定局
 *   - 茅山法（maoshan）：以节气交节时刻起，每5天60时辰一元
 *   - 自选局数（zixuan）：用户直接指定阴阳遁+局数
 *
 * 排盘方式：
 *   - 转盘（zhuanpan）：九星/八门/八神绕八宫顺逆轮转
 *   - 飞盘（feipan）：九星/八门/八神按洛书轨迹飞泊（九星入中宫）
 *
 * 寄宫方式：
 *   - 坤宫寄（kun）：中五宫始终寄坤二宫
 *   - 阳艮阴坤（yanggen_yinkun）：阳遁寄艮八宫、阴遁寄坤二宫
 *
 * 暗干排法：
 *   - 值使飞布（zhishi）：时干加在值使门/中宫落宫飞布
 *   - 八门本宫（men）：按八门元旦盘地盘取暗干
 *
 * 时间类型：
 *   - 普通时间（normal）：直接使用钟表时间
 *   - 真太阳时（zhen）：按经度差+均时差修正后再排盘
 * ============================================================================
 */

import { Solar } from 'lunar-javascript';
import type {
  QimenResult,
  QimenInput,
  QimenPalace,
  PanMethod,
  PanLayoutMode,
  JiGongMethod,
  QimenTimeType,
  AnganType,
  YinYangDun,
  SanYuan,
  JiuGongName,
  BaGuaName,
  TianGan,
  DiZhi,
  JiuXingName,
  BaMenName,
  TianBaShenName,
  DiBaShenName,
  SiZhu,
  ZhiFuZhiShi,
  MaXing,
} from '../../types/qimen';

// ============================================================================
// 一、基础常量
// ============================================================================

/** 十天干 */
const TIAN_GAN: TianGan[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

/** 十二地支 */
const DI_ZHI: DiZhi[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 九宫洛书数序号对应的中文数字 */
const CNUMBER: string[] = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

/** 九宫名称（按洛书数序 1-9） */
const JIUGONG: JiuGongName[] = ['坎', '坤', '震', '巽', '中', '乾', '兑', '艮', '离'];

/** 洛书数→宫名映射 */
const NUM_TO_GONG: Record<string, JiuGongName> = {
  '一': '坎', '二': '坤', '三': '震', '四': '巽',
  '五': '中', '六': '乾', '七': '兑', '八': '艮', '九': '离',
};

/** 宫名→洛书数映射 */
const GONG_TO_NUM: Record<JiuGongName, number> = {
  '坎': 1, '坤': 2, '震': 3, '巽': 4,
  '中': 5, '乾': 6, '兑': 7, '艮': 8, '离': 9,
};

/** 八宫顺时针排列（转盘用）：坎→艮→震→巽→离→坤→兑→乾 */
const CLOCKWISE_8GONG: BaGuaName[] = ['坎', '艮', '震', '巽', '离', '坤', '兑', '乾'];

/** 八门在顺时针排列中的顺序（休→生→伤→杜→景→死→惊→开） */
const BA_MEN_CW: BaMenName[] = ['休门', '生门', '伤门', '杜门', '景门', '死门', '惊门', '开门'];

/** 九星在顺时针排列中的顺序（天蓬→天任→天冲→天辅→天英→天禽→天柱→天心） */
const JIU_XING_CW: JiuXingName[] = ['天蓬', '天任', '天冲', '天辅', '天英', '天禽', '天柱', '天心'];

/** 八门洛书本位（位置1-9对应） */
const DOOR_HOME: (BaMenName | null)[] = [
  '休门', '死门', '伤门', '杜门', null, '开门', '惊门', '生门', '景门',
];
// 索引: 0=坎1, 1=坤2, 2=震3, 3=巽4, 4=中5, 5=乾6, 6=兑7, 7=艮8, 8=离9

/** 九星洛书本位（位置1-9对应） */
const STAR_HOME: JiuXingName[] = [
  '天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英',
];
// 索引: 0=坎1, 1=坤2, 2=震3, 3=巽4, 4=中5, 5=乾6, 6=兑7, 7=艮8, 8=离9

/** 天八神（值符起，阳顺阴逆） */
const TIAN_BA_SHEN: TianBaShenName[] = ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];

/** 地八神简称 */
const DI_BA_SHEN: DiBaShenName[] = ['符', '蛇', '阴', '六', '白', '玄', '九', '天'];

/** 二十四节气名称（从小寒开始，与 lunar-javascript 顺序一致） */
const JIEQI_ORDER: string[] = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
  '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
  '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
  '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
];

/** 阳遁节气（冬至→芒种） */
const YANG_DUN_JIEQI: ReadonlySet<string> = new Set([
  '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
  '清明', '谷雨', '立夏', '小满', '芒种',
]);

/**
 * 节气三元局数表
 * 键为节气名，值为"上中下"三元对应的局数字符串（如冬至→"一七四"=上元1局、中元7局、下元4局）
 */
const JIEQI_JU_TABLE: Record<string, string> = {
  '冬至': '一七四', '惊蛰': '一七四',
  '小寒': '二八五',
  '大寒': '三九六', '春分': '三九六',
  '立春': '八五二',
  '雨水': '九六三',
  '清明': '四一七', '立夏': '四一七',
  '谷雨': '五二八', '小满': '五二八',
  '芒种': '六三九',
  '夏至': '九三六', '白露': '九三六',
  '小暑': '八二五',
  '大暑': '七一四', '秋分': '七一四',
  '立秋': '二五八',
  '处暑': '一四七',
  '霜降': '五八二', '小雪': '五八二',
  '寒露': '六九三', '立冬': '六九三',
  '大雪': '四七一',
};

/** 旬首遁干映射：六甲→遁干 */
const XUN_SHOU_GAN: Record<string, TianGan> = {
  '甲子': '戊', '甲戌': '己', '甲申': '庚',
  '甲午': '辛', '甲辰': '壬', '甲寅': '癸',
};

/** 六甲旬名列表 */
const LIU_JIA: string[] = ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'];

/** 旬首→旬空地支 */
const XUN_KONG: Record<TianGan, string> = {
  '戊': '戌亥', '己': '申酉', '庚': '午未',
  '辛': '辰巳', '壬': '寅卯', '癸': '子丑',
  '甲': '', '乙': '', '丙': '', '丁': '',
};

/** 旬首→空亡宫位映射（遁干→宫位集合） */
const KONGWANG_GONG: Record<TianGan, Partial<Record<BaGuaName, boolean>>> = {
  '戊': { '乾': true },
  '己': { '坤': true, '兑': true },
  '庚': { '离': true, '坤': true },
  '辛': { '巽': true },
  '壬': { '艮': true, '震': true },
  '癸': { '坎': true, '艮': true },
  '甲': {}, '乙': {}, '丙': {}, '丁': {},
};

/**
 * 十天干在八宫的12长生状态（奇门遁甲特有，每宫1-2个状态合并）
 */
const QM_CHANGSHENG_12: Record<TianGan, Record<BaGuaName, string>> = {
  '甲': { '乾': '养生', '坎': '沐', '艮': '冠临', '震': '旺', '巽': '衰病', '离': '死', '坤': '墓绝', '兑': '胎' },
  '乙': { '乾': '死墓', '坎': '病', '艮': '旺衰', '震': '临', '巽': '沐冠', '离': '生', '坤': '胎养', '兑': '绝' },
  '丙': { '乾': '墓绝', '坎': '胎', '艮': '养生', '震': '沐', '巽': '冠临', '离': '旺', '坤': '衰病', '兑': '死' },
  '丁': { '乾': '胎养', '坎': '绝', '艮': '死墓', '震': '病', '巽': '旺衰', '离': '临', '坤': '沐冠', '兑': '生' },
  '戊': { '乾': '墓绝', '坎': '胎', '艮': '养生', '震': '沐', '巽': '冠临', '离': '旺', '坤': '衰病', '兑': '死' },
  '己': { '乾': '胎养', '坎': '绝', '艮': '死墓', '震': '病', '巽': '旺衰', '离': '临', '坤': '沐冠', '兑': '生' },
  '庚': { '乾': '衰病', '坎': '死', '艮': '墓绝', '震': '胎', '巽': '养生', '离': '沐', '坤': '冠临', '兑': '旺' },
  '辛': { '乾': '沐冠', '坎': '生', '艮': '胎养', '震': '绝', '巽': '死墓', '离': '病', '坤': '旺衰', '兑': '临' },
  '壬': { '乾': '冠临', '坎': '旺', '艮': '衰病', '震': '死', '巽': '墓绝', '离': '胎', '坤': '养生', '兑': '沐' },
  '癸': { '乾': '旺衰', '坎': '临', '艮': '沐冠', '震': '生', '巽': '胎养', '离': '绝', '坤': '死墓', '兑': '病' },
};

// ============================================================================
// 二、工具函数
// ============================================================================

/**
 * 将数组旋转，使指定元素排在第一位（顺时针/正序）
 */
function rotateStart<T>(arr: readonly T[], target: T): T[] {
  const idx = arr.indexOf(target);
  if (idx === -1) return [...arr];
  return [...arr.slice(idx), ...arr.slice(0, idx)];
}

/**
 * 将数组旋转，使指定元素排在第一位（逆时针/逆序）
 */
function rotateStartReverse<T>(arr: readonly T[], target: T): T[] {
  const idx = arr.indexOf(target);
  if (idx === -1) return [...arr].reverse();
  const result: T[] = [];
  for (let i = 0; i < arr.length; i++) {
    result.push(arr[(idx - i + arr.length) % arr.length]);
  }
  return result;
}

/** 模9运算，结果映射到1-9 */
function mod9(n: number): number {
  return ((n % 9) + 9) % 9 || 9;
}

/**
 * 中宫寄宫目标宫
 * - kun：始终寄坤二宫
 * - yanggen_yinkun：阳遁寄艮八宫、阴遁寄坤二宫
 */
function getJigongTarget(isYang: boolean, method: JiGongMethod): BaGuaName {
  if (method === 'kun') return '坤';
  return isYang ? '艮' : '坤';
}

/**
 * 真太阳时修正
 * 真太阳时 = 钟表时间 + 经度差修正 + 均时差
 *   - 经度差修正 = (经度 - 120) × 4 分钟（东八区中央经线120°E）
 *   - 均时差 EoT = 9.87·sin(2B) - 7.53·cos(B) - 1.5·sin(B)，B = 2π(N-81)/364，N为年积日
 */
function applyTrueSolarTime(
  year: number, month: number, day: number, hour: number, minute: number, longitude: number,
): { y: number; m: number; d: number; h: number; mi: number; offsetMin: number; eotMin: number; lonMin: number } {
  const dt = Date.UTC(year, month - 1, day);
  const startOfYear = Date.UTC(year, 0, 0);
  const N = Math.floor((dt - startOfYear) / 86400000);
  const B = (2 * Math.PI * (N - 81)) / 364;
  const eotMin = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const lonMin = (longitude - 120) * 4;
  const offsetMin = eotMin + lonMin;
  const corrected = new Date(dt + hour * 3600000 + minute * 60000 + Math.round(offsetMin * 60000));
  return {
    y: corrected.getUTCFullYear(),
    m: corrected.getUTCMonth() + 1,
    d: corrected.getUTCDate(),
    h: corrected.getUTCHours(),
    mi: corrected.getUTCMinutes(),
    offsetMin,
    eotMin,
    lonMin,
  };
}

/** 生成六十甲子 */
function buildJiaZi(): string[] {
  const result: string[] = [];
  for (let i = 0; i < 60; i++) {
    result.push(TIAN_GAN[i % 10] + DI_ZHI[i % 12]);
  }
  return result;
}

/** 六十甲子表 */
const JIAZI_TABLE = buildJiaZi();

// ============================================================================
// 三、四柱与节气计算（基于 lunar-javascript）
// ============================================================================

/**
 * 计算四柱八字
 * 注意：23时（早子时）按次日计算日柱
 */
function calcSiZhu(year: number, month: number, day: number, hour: number, minute: number): SiZhu {
  let adjDay = day;
  let adjHour = hour;
  // 23时为次日子时（早子时），日柱用次日
  if (hour === 23) {
    adjDay = day + 1;
    adjHour = 0;
  }
  const solar = Solar.fromYmdHms(year, month, adjDay, adjHour, minute, 0);
  const lunar = solar.getLunar();
  const bazi = lunar.getEightChar();
  return {
    year: bazi.getYearGan() + bazi.getYearZhi(),
    month: bazi.getMonthGan() + bazi.getMonthZhi(),
    day: bazi.getDayGan() + bazi.getDayZhi(),
    hour: bazi.getTimeGan() + bazi.getTimeZhi(),
  };
}

/**
 * 获取当前时辰所属节气（最近已过的节气名）
 * 优先判断当天是否交节，否则回溯上一个节气
 */
function getCurrentJieQi(year: number, month: number, day: number, hour: number, minute: number): string {
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  // 当天若恰逢交节（按日期判断），直接返回节气名
  const todayJq = lunar.getJieQi();
  if (todayJq) return todayJq;
  // 否则取当前时刻之前最近的已过节气
  const prevJq = lunar.getPrevJieQi();
  return prevJq ? prevJq.getName() : '';
}

/**
 * 获取节气开始时间（精确交节时刻）
 * 使用 lunar.getJieQiTable() 获取节气对应的 Solar 日期对象
 */
function getJieQiStart(year: number, month: number, day: number, hour: number, minute: number): {
  year: number; month: number; day: number; hour: number; minute: number; jieqi: string;
} | null {
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();

  // 确定当前所属节气名：当天交节则取当天节气，否则取最近已过节气
  let jqName = lunar.getJieQi();
  if (!jqName) {
    const prevJq = lunar.getPrevJieQi();
    if (!prevJq) return null;
    jqName = prevJq.getName();
  }

  // 通过节气表获取该节气的精确交节 Solar 对象
  const jqTable = lunar.getJieQiTable();
  const jqSolar = jqTable[jqName];
  if (!jqSolar) return null;

  return {
    year: jqSolar.getYear(),
    month: jqSolar.getMonth(),
    day: jqSolar.getDay(),
    hour: jqSolar.getHour(),
    minute: jqSolar.getMinute(),
    jieqi: jqName,
  };
}

/**
 * 获取置闰法用的节气时间（委托给 getJieQiStart，二者逻辑一致）
 */
function getJieQiStartForZhirun(year: number, month: number, day: number, hour: number, minute: number): {
  year: number; month: number; day: number; hour: number; minute: number; jieqi: string;
} | null {
  return getJieQiStart(year, month, day, hour, minute);
}

/**
 * 根据节气名判断阴阳遁（内部函数）
 */
function isYangDunByJieqi(jieqi: string): boolean {
  return YANG_DUN_JIEQI.has(jieqi);
}

// ============================================================================
// 四、定局（拆补法/置闰法/茅山法）
// ============================================================================

/**
 * 根据干支查找旬首（六甲）和遁干
 */
function findXunShou(ganZhi: string): { liuJia: string; dunGan: TianGan } {
  for (const lj of LIU_JIA) {
    const startIdx = JIAZI_TABLE.indexOf(lj);
    for (let j = 0; j < 10; j++) {
      if (JIAZI_TABLE[(startIdx + j) % 60] === ganZhi) {
        return { liuJia: lj, dunGan: XUN_SHOU_GAN[lj] };
      }
    }
  }
  return { liuJia: '甲子', dunGan: '戊' };
}

/**
 * 拆补法：根据日柱干支定三元
 * 六十甲子分12组，每组5个干支，依次为上中下元循环
 */
function findYuanChaibu(dayGanZhi: string): SanYuan {
  const idx = JIAZI_TABLE.indexOf(dayGanZhi);
  const group = Math.floor(idx / 5) % 3;
  return group === 0 ? '上元' : group === 1 ? '中元' : '下元';
}

/**
 * 茅山法：根据距节气交节的时辰数定三元
 * 交节起60时辰（5天）为上元，再60时辰为中元，再60时辰为下元
 */
function findYuanMaoshan(
  year: number, month: number, day: number, hour: number, minute: number,
): SanYuan {
  const jqStart = getJieQiStart(year, month, day, hour, minute);
  if (!jqStart) return '上元';
  const jqDate = new Date(jqStart.year, jqStart.month - 1, jqStart.day, jqStart.hour, jqStart.minute);
  const curDate = new Date(year, month - 1, day, hour, minute);
  const hoursDiff = Math.max(0, (curDate.getTime() - jqDate.getTime()) / (1000 * 60 * 60));
  const shichenDiff = Math.floor(hoursDiff / 2);
  if (shichenDiff < 60) return '上元';
  if (shichenDiff < 120) return '中元';
  return '下元';
}

/**
 * 置闰法：超神接气定局
 * 这是最复杂的定局法，需要根据符头（甲己日）与节气的关系来判断
 */
function getJuZhirun(
  year: number, month: number, day: number, hour: number, minute: number,
): { yinYang: YinYangDun; juNum: number; yuan: SanYuan } {
  const jieqi = getCurrentJieQi(year, month, day, hour, minute);
  const siZhu = calcSiZhu(year, month, day, hour, minute);
  const dayGZ = siZhu.day;
  const hourGZ = siZhu.hour;

  // 找日干支对应的符头和三元
  const dayIdx = JIAZI_TABLE.indexOf(dayGZ);
  // 符头是甲或己日
  const fuHeadOffsets: Record<string, string> = {
    '甲子': '上元', '甲午': '上元', '己卯': '上元', '己酉': '上元',
    '甲寅': '中元', '甲申': '中元', '己巳': '中元', '己亥': '中元',
    '甲辰': '下元', '甲戌': '下元', '己丑': '下元', '己未': '下元',
  };

  // 找到日干支所在的符头
  let fuHeadGZ = '';
  let threeYuan: SanYuan = '上元';
  for (const [gz, y] of Object.entries(fuHeadOffsets)) {
    const startIdx = JIAZI_TABLE.indexOf(gz);
    for (let j = 0; j < 5; j++) {
      if (JIAZI_TABLE[(startIdx + j) % 60] === dayGZ) {
        fuHeadGZ = gz;
        threeYuan = y as SanYuan;
        break;
      }
    }
    if (fuHeadGZ) break;
  }

  // 获取节气开始时间
  const jqStart = getJieQiStartForZhirun(year, month, day, hour, minute);
  if (!jqStart) {
    // fallback to chaibu
    return getJuChaibu(year, month, day, hour, minute);
  }

  const jqDate = new Date(jqStart.year, jqStart.month - 1, jqStart.day, jqStart.hour, jqStart.minute);
  const curDate = new Date(year, month - 1, day, hour, minute);
  const dayDiff = Math.floor((curDate.getTime() - jqDate.getTime()) / (1000 * 60 * 60 * 24));

  const yinYang: YinYangDun = isYangDunByJieqi(jieqi) ? '阳遁' : '阴遁';

  // 简化置闰逻辑：
  // dayDiff <= 0: 正授或接气（节气先到，符头后到），用下一节气局
  // 0 < dayDiff <= 9: 超神（符头先到，节气后到），根据情况判断
  // dayDiff > 9: 可能需要置闰
  // 这里采用与参考实现一致的简化逻辑

  // 获取本节气和相邻节气的局数
  const jqCode = JIEQI_JU_TABLE[jieqi] || '一七四';

  // 确定当前节气前后的节气索引
  const jqIdx = JIEQI_ORDER.indexOf(jieqi);
  const nextJq = JIEQI_ORDER[(jqIdx + 1) % 24];
  const prevJq = JIEQI_ORDER[(jqIdx + 23) % 24];
  const nextJqCode = JIEQI_JU_TABLE[nextJq] || jqCode;
  const prevJqCode = JIEQI_JU_TABLE[prevJq] || jqCode;

  const nextYang = isYangDunByJieqi(nextJq);
  const yuanChar = threeYuan === '上元' ? 0 : threeYuan === '中元' ? 1 : 2;

  // 基本局数：当前节气三元对应局数（中文数字→阿拉伯数字）
  const cnToNum = (c: string) => CNUMBER.indexOf(c) + 1;
  const baseJu = cnToNum(jqCode[yuanChar]);
  const nextJu = cnToNum(nextJqCode[yuanChar]);
  const prevJu = cnToNum(prevJqCode[yuanChar]);

  // 简化判定：与参考实现保持一致的核心逻辑
  // 在节气交接前后9天内根据符头和日期偏移选择局数
  let juNum = baseJu;
  let finalYinYang: YinYangDun = yinYang;

  // 获取时柱旬首遁干
  const xunShouInfo = findXunShou(hourGZ);
  const isWuJi = ['戊', '己', '庚', '辛', '壬', '癸'].includes(xunShouInfo.dunGan);

  // 农历日期判断
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const lunarMonth = lunar.getMonthInChinese();
  const lunarMonthNum = lunar.getMonth();
  const lunarDay = lunar.getDay();

  if (dayDiff < 0) {
    // 接气：节气未到，用下一节气局
    finalYinYang = nextYang ? '阳遁' : '阴遁';
    juNum = nextJu;
  } else if (dayDiff === 0) {
    // 正授：节气当天
    if (lunarMonth === '腊' || lunarMonth === '冬') {
      // 腊月用"其他排局1"=下一节气阴阳遁+当前局数；冬月用"当前排局"=当前阴阳遁+当前局数
      juNum = baseJu;
      if (lunarMonth === '腊') {
        finalYinYang = nextYang ? '阳遁' : '阴遁';
      }
    } else if (lunarMonthNum > 9) {
      finalYinYang = nextYang ? '阳遁' : '阴遁';
      juNum = nextJu;
    } else {
      juNum = baseJu;
    }
  } else if (dayDiff <= 6) {
    // 超神前期
    if (lunarMonth === '腊' || lunarMonth === '冬') {
      juNum = lunarMonth === '腊' ? prevJu : baseJu;
    } else if (lunarMonthNum > 9) {
      if (lunarDay < 15) {
        juNum = prevJu;
      } else {
        juNum = isWuJi ? baseJu : nextJu;
      }
    } else if (lunarMonth === '正') {
      if (lunarDay < 10 && !isWuJi) {
        juNum = nextJu;
      } else if (isWuJi) {
        juNum = lunarDay < 20 ? prevJu : (lunarDay > 20 && lunarDay <= 26 ? nextJu : prevJu);
      }
    } else {
      if (lunarDay < 15) {
        juNum = baseJu;
      } else {
        juNum = prevJu;
      }
    }
  } else if (dayDiff <= 9) {
    if (lunarMonth === '腊' || lunarMonth === '冬') {
      juNum = lunarMonth === '腊' ? baseJu : prevJu;
    } else if (lunarMonth === '正') {
      if (lunarMonthNum <= 9 && lunarDay >= 15) {
        juNum = prevJu;
      } else if (isWuJi) {
        juNum = prevJu;
      } else {
        finalYinYang = nextYang ? '阳遁' : '阴遁';
        juNum = nextJu;
      }
    } else if (lunarMonthNum <= 6) {
      if (lunarDay <= 10) {
        juNum = prevJu;
      } else if (isWuJi) {
        finalYinYang = nextYang ? '阳遁' : '阴遁';
        juNum = lunarDay < 20 ? nextJu : prevJu;
      } else {
        juNum = baseJu;
      }
    } else if (lunarMonthNum <= 9) {
      if (lunarDay < 15) {
        finalYinYang = nextYang ? '阳遁' : '阴遁';
        juNum = nextJu;
      } else {
        juNum = (isWuJi || lunarDay >= 20) ? prevJu : baseJu;
      }
    } else {
      finalYinYang = nextYang ? '阳遁' : '阴遁';
      juNum = nextJu;
    }
  } else if (dayDiff <= 15) {
    if (lunarMonth === '腊' || lunarMonth === '冬') {
      if (lunarMonth === '腊' || jieqi !== '冬至') {
        juNum = prevJu;
      } else {
        juNum = dayDiff <= 12 ? prevJu : baseJu;
      }
    } else if (lunarMonthNum > 9) {
      juNum = prevJu;
    } else if (lunarMonth === '正') {
      juNum = baseJu;
    } else {
      juNum = baseJu;
    }
  } else {
    juNum = baseJu;
  }

  return { yinYang: finalYinYang, juNum, yuan: threeYuan };
}

/**
 * 拆补法定局
 */
function getJuChaibu(
  year: number, month: number, day: number, hour: number, minute: number,
): { yinYang: YinYangDun; juNum: number; yuan: SanYuan } {
  const jieqi = getCurrentJieQi(year, month, day, hour, minute);
  const siZhu = calcSiZhu(year, month, day, hour, minute);
  const yinYang: YinYangDun = isYangDunByJieqi(jieqi) ? '阳遁' : '阴遁';
  const yuan = findYuanChaibu(siZhu.day);
  const jqCode = JIEQI_JU_TABLE[jieqi] || '一七四';
  const juChar = yuan === '上元' ? jqCode[0] : yuan === '中元' ? jqCode[1] : jqCode[2];
  const juNum = CNUMBER.indexOf(juChar) + 1;
  return { yinYang, juNum, yuan };
}

/**
 * 茅山法定局
 */
function getJuMaoshan(
  year: number, month: number, day: number, hour: number, minute: number,
): { yinYang: YinYangDun; juNum: number; yuan: SanYuan } {
  const jieqi = getCurrentJieQi(year, month, day, hour, minute);
  const yinYang: YinYangDun = isYangDunByJieqi(jieqi) ? '阳遁' : '阴遁';
  const yuan = findYuanMaoshan(year, month, day, hour, minute);
  const jqCode = JIEQI_JU_TABLE[jieqi] || '一七四';
  const juChar = yuan === '上元' ? jqCode[0] : yuan === '中元' ? jqCode[1] : jqCode[2];
  const juNum = CNUMBER.indexOf(juChar) + 1;
  return { yinYang, juNum, yuan };
}

/**
 * 自选局数定局
 * 用户直接指定阴阳遁+局数；三元按局数推断（1-3上元/4-6中元/7-9下元）
 */
function getJuZixuan(
  year: number, month: number, day: number, hour: number, minute: number,
  customJu?: number, customYinYang?: 'yang' | 'yin',
): { yinYang: YinYangDun; juNum: number; yuan: SanYuan } {
  const jieqi = getCurrentJieQi(year, month, day, hour, minute);
  const timeYinYang: YinYangDun = isYangDunByJieqi(jieqi) ? '阳遁' : '阴遁';
  const yinYang: YinYangDun =
    customYinYang === 'yang' ? '阳遁' : customYinYang === 'yin' ? '阴遁' : timeYinYang;
  const juNum = customJu && customJu >= 1 && customJu <= 9 ? Math.floor(customJu) : 1;
  const yuan = getYuan(juNum);
  return { yinYang, juNum, yuan };
}

/**
 * 统一定局入口
 */
function determineJu(
  year: number, month: number, day: number, hour: number, minute: number,
  method: PanMethod,
  customJu?: number,
  customYinYang?: 'yang' | 'yin',
): { yinYang: YinYangDun; juNum: number; yuan: SanYuan; jieqi: string } {
  const jieqi = getCurrentJieQi(year, month, day, hour, minute);
  let result;
  switch (method) {
    case 'zhirun':
      result = getJuZhirun(year, month, day, hour, minute);
      break;
    case 'maoshan':
      result = getJuMaoshan(year, month, day, hour, minute);
      break;
    case 'zixuan':
      result = getJuZixuan(year, month, day, hour, minute, customJu, customYinYang);
      break;
    case 'chaibu':
    default:
      result = getJuChaibu(year, month, day, hour, minute);
      break;
  }
  return { ...result, jieqi };
}

// ============================================================================
// 五、地盘排布
// ============================================================================

/**
 * 排布地盘三奇六仪
 *
 * 规则：
 * - 从局数对应宫位起戊
 * - 阳遁：按洛书飞布序（1→2→3→4→5→6→7→8→9）顺排六仪(戊己庚辛壬癸)，逆排三奇(丁丙乙)
 *   即宫序：局数宫起，洛书递增序排 戊己庚辛壬癸丁丙乙
 * - 阴遁：按洛书飞布序（局数宫起，洛书递增序）逆排六仪(戊乙丙丁癸壬辛庚己)
 *   即宫序：局数宫起，洛书递增序排 戊乙丙丁癸壬辛庚己
 */
function layoutDiPan(juNum: number, isYang: boolean): Record<JiuGongName, TianGan> {
  // 洛书飞布序：从局数开始按1-9顺序循环
  const luoshuOrder: string[] = [];
  for (let i = 0; i < 9; i++) {
    const num = ((juNum - 1 + i) % 9) + 1;
    luoshuOrder.push(CNUMBER[num - 1]);
  }
  // luoshuOrder 是中文数字序列，从局数宫开始，如阳1局：一二三四五六七八九

  // 三奇六仪排列顺序
  const ganOrder: TianGan[] = isYang
    ? ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙']
    : ['戊', '乙', '丙', '丁', '癸', '壬', '辛', '庚', '己'];

  const result = {} as Record<JiuGongName, TianGan>;
  for (let i = 0; i < 9; i++) {
    const gong = NUM_TO_GONG[luoshuOrder[i]];
    result[gong] = ganOrder[i];
  }
  return result;
}

/**
 * 地盘反向映射（天干→宫位）
 */
function diPanReverse(diPan: Record<JiuGongName, TianGan>): Record<TianGan, JiuGongName> {
  const result = {} as Record<TianGan, JiuGongName>;
  for (const [gong, gan] of Object.entries(diPan)) {
    result[gan as TianGan] = gong as JiuGongName;
  }
  return result;
}

// ============================================================================
// 六、值符值使定位
// ============================================================================

/**
 * 预计算值符（星）飞布映射
 * 返回：每个六甲旬首对应一个字符串，第0位是本位宫数，第hgan位是时干对应宫数
 */
function calcZhiFuPai(juNum: number, isYang: boolean): Record<string, string> {
  const juChar = CNUMBER[juNum - 1];

  // 阳遁值符飞布表（洛书飞布方向）
  const yangPaiTable: Record<string, string> = {
    '一': '九八七一二三四五六',
    '二': '一九八二三四五六七',
    '三': '二一九三四五六七八',
    '四': '三二一四五六七八九',
    '五': '四三二五六七八九一',
    '六': '五四三六七八九一二',
    '七': '六五四七八九一二三',
    '八': '七六五八九一二三四',
    '九': '八七六九一二三四五',
  };
  // 阴遁值符飞布表
  const yinPaiTable: Record<string, string> = {
    '九': '一二三九八七六五四',
    '八': '九一二八七六五四三',
    '七': '八九一七六五四三二',
    '六': '七八九六五四三二一',
    '五': '六七八五四三二一九',
    '四': '五六七四三二一九八',
    '三': '四五六三二一九八七',
    '二': '三四五二一九八七六',
    '一': '二三四一九八七六五',
  };

  const paiTable = isYang ? yangPaiTable : yinPaiTable;
  const pai = paiTable[juChar];

  // 洛书序
  const newKook = isYang
    ? rotateStart(CNUMBER, juChar)
    : rotateStartReverse(CNUMBER, juChar);

  const result: Record<string, string> = {};
  for (let i = 0; i < 6; i++) {
    result[LIU_JIA[i]] = newKook[i] + pai;
  }
  return result;
}

/**
 * 预计算值使（门）飞布映射
 */
function calcZhiShiPai(juNum: number, isYang: boolean): Record<string, string> {
  const juChar = CNUMBER[juNum - 1];
  const newKook = isYang
    ? rotateStart(CNUMBER, juChar)
    : rotateStartReverse(CNUMBER, juChar);

  const seq = newKook.join('');
  const fullSeq = seq + seq + seq; // 27位，足够取12位

  const result: Record<string, string> = {};
  for (let i = 0; i < 6; i++) {
    const startChar = newKook[i];
    const startIdx = fullSeq.indexOf(startChar);
    result[LIU_JIA[i]] = startChar + fullSeq.substring(startIdx + 1, startIdx + 12);
  }
  return result;
}

/**
 * 定位值符星、值使门及其落宫
 */
function locateZhiFuZhiShi(
  juNum: number, isYang: boolean,
  hourGZ: string, diPanRev: Record<TianGan, JiuGongName>,
): ZhiFuZhiShi {
  const hourGan = hourGZ[0] as TianGan;
  const hgan = TIAN_GAN.indexOf(hourGan);
  const xunShou = findXunShou(hourGZ);
  const liuJia = xunShou.liuJia;
  const dunGan = xunShou.dunGan;

  const zfPai = calcZhiFuPai(juNum, isYang);
  const zsPai = calcZhiShiPai(juNum, isYang);

  // 数字→九星/门/宫映射
  const numToStar: Record<string, JiuXingName> = {};
  const numToDoor: Record<string, BaMenName | '中'> = {};
  const numToGong: Record<string, JiuGongName> = {};
  for (let i = 0; i < 9; i++) {
    numToStar[CNUMBER[i]] = STAR_HOME[i];
    if (DOOR_HOME[i]) {
      numToDoor[CNUMBER[i]] = DOOR_HOME[i]!;
    } else {
      numToDoor[CNUMBER[i]] = '中';
    }
    numToGong[CNUMBER[i]] = JIUGONG[i];
  }

  // 值符星
  const zfVal = zfPai[liuJia];
  let starName = numToStar[zfVal[0]];
  let starGong = numToGong[zfVal[hgan]];

  // 值使门
  const zsVal = zsPai[liuJia];
  let doorName = numToDoor[zsVal[0]];
  let doorGong = numToGong[zsVal[hgan]];

  // 中宫处理：值使门为"中"时寄死门
  if (doorName === '中') doorName = '死门';

  // 值符星宫为"中"时，天禽星寄坤二宫
  // 注意：在星飞布时天禽会在坤2宫显示为"芮禽"

  return {
    zhiFuTianGan: [liuJia + dunGan, dunGan],
    zhiFuXingGong: [starName, starGong],
    zhiShiMenGong: [doorName as BaMenName, doorGong],
  };
}

// ============================================================================
// 七、天盘九星排布
// ============================================================================

/**
 * 排布天盘九星
 * 值符随时干转：值符星飞到时干落宫，其余星按阳顺阴逆排列
 */
function layoutStars(
  zfzs: ZhiFuZhiShi, isYang: boolean, jigongTarget: BaGuaName = '坤',
): { stars: Record<BaGuaName, JiuXingName>; starsRev: Record<JiuXingName, BaGuaName> } {
  let startingStar = zfzs.zhiFuXingGong[0];
  let startingGong = zfzs.zhiFuXingGong[1];

  // 天芮在排旋转时用天禽代替
  if (startingStar === '天芮') startingStar = '天禽' as JiuXingName;
  // 中宫寄宫
  if (startingGong === '中') startingGong = jigongTarget;

  const rotate = isYang ? CLOCKWISE_8GONG : [...CLOCKWISE_8GONG].reverse();
  const starOrder = isYang
    ? rotateStart(JIU_XING_CW, startingStar)
    : rotateStartReverse(JIU_XING_CW, startingStar);
  const gongOrder = rotateStart(rotate, startingGong as BaGuaName);

  const stars = {} as Record<BaGuaName, JiuXingName>;
  const starsRev = {} as Record<JiuXingName, BaGuaName>;
  for (let i = 0; i < 8; i++) {
    stars[gongOrder[i]] = starOrder[i];
    starsRev[starOrder[i]] = gongOrder[i];
  }
  return { stars, starsRev };
}

// ============================================================================
// 八、人盘八门排布
// ============================================================================

/**
 * 排布人盘八门
 * 值使随时宫转：值使门飞到对应宫位，其余门按阳顺阴逆排列
 */
function layoutDoors(
  zfzs: ZhiFuZhiShi, isYang: boolean, jigongTarget: BaGuaName = '坤',
): Record<BaGuaName, BaMenName> {
  const startingDoor = zfzs.zhiShiMenGong[0];
  let startingGong = zfzs.zhiShiMenGong[1];

  if (startingGong === '中') startingGong = jigongTarget;

  const rotate = isYang ? CLOCKWISE_8GONG : [...CLOCKWISE_8GONG].reverse();
  const doorOrder = isYang
    ? rotateStart(BA_MEN_CW, startingDoor)
    : rotateStartReverse(BA_MEN_CW, startingDoor);
  const gongOrder = rotateStart(rotate, startingGong as BaGuaName);

  const doors = {} as Record<BaGuaName, BaMenName>;
  for (let i = 0; i < 8; i++) {
    doors[gongOrder[i]] = doorOrder[i];
  }
  return doors;
}

// ============================================================================
// 九、天八神排布
// ============================================================================

/**
 * 排布天八神
 * 值符起于值符星落宫，阳遁顺排阴遁逆排
 */
function layoutTianShen(
  zfzs: ZhiFuZhiShi, isYang: boolean, jigongTarget: BaGuaName = '坤',
): Record<BaGuaName, TianBaShenName> {
  let startingGong = zfzs.zhiFuXingGong[1];
  if (startingGong === '中') startingGong = jigongTarget;

  const rotate = isYang ? CLOCKWISE_8GONG : [...CLOCKWISE_8GONG].reverse();
  const gongOrder = rotateStart(rotate, startingGong as BaGuaName);

  const shen = {} as Record<BaGuaName, TianBaShenName>;
  for (let i = 0; i < 8; i++) {
    shen[gongOrder[i]] = TIAN_BA_SHEN[i];
  }
  return shen;
}

// ============================================================================
// 十、天盘天干排布
// ============================================================================

/**
 * 排布天盘天干（三奇六仪随值符转）
 *
 * 核心算法（与传统转盘奇门一致）：
 * 1. 值符星飞到时干落宫（随时干转）
 * 2. 八宫地盘天干序列按旋转方向排列
 * 3. 天干序列以旬首遁干为首，宫位序列以值符落宫为首
 * 4. 对位分配即得天盘
 * 5. 旬首时（时干为甲）天盘=地盘
 * 6. 中宫天盘干固定与地盘相同
 */
function layoutTianPan(
  diPan: Record<JiuGongName, TianGan>,
  diPanRev: Record<TianGan, JiuGongName>,
  zfzs: ZhiFuZhiShi,
  isYang: boolean,
  hourGZ: string,
  juNum: number,
  jigongTarget: BaGuaName = '坤',
): Record<JiuGongName, TianGan> {
  const xunShouInfo = findXunShou(hourGZ);
  const dunGan = xunShouInfo.dunGan; // 旬首遁干（戊/己/庚/辛/壬/癸）
  const hourGan = hourGZ[0] as TianGan;

  let zfStarGong = zfzs.zhiFuXingGong[1]; // 值符星落宫
  const dunGanDiPanGong = diPanRev[dunGan]; // 遁干在地盘的宫位
  const zfStar = zfzs.zhiFuXingGong[0];

  // 时干在地盘的宫位（甲隐于遁干下）
  const shiGanForLookup: TianGan = hourGan === '甲' ? dunGan : hourGan;
  const shiGanGong = diPanRev[shiGanForLookup];

  const rotate = isYang ? CLOCKWISE_8GONG : [...CLOCKWISE_8GONG].reverse();

  // 八宫地盘天干（按旋转方向）
  const earthVals: TianGan[] = rotate.map(g => diPan[g]);

  // 情形一：值符星在中宫（寄宫目标宫）
  if (zfStarGong === '中') {
    // 尝试从遁干开始旋转，宫位从寄宫目标宫开始
    let ganReorder: TianGan[];
    try {
      ganReorder = rotateStart(earthVals, dunGan);
    } catch {
      // 遁干不在八宫（在中宫），从寄宫目标宫地盘干开始
      ganReorder = rotateStart(earthVals, diPan[jigongTarget]);
    }

    // 检查遁干是否在序列中
    if (ganReorder.includes(dunGan)) {
      const gongReorder = rotateStart(rotate, jigongTarget);
      // 旬首时（甲时）天盘=地盘
      if (hourGan === '甲') {
        return { ...diPan };
      }
      // 需要找到时干位置来对齐
      if (shiGanGong && shiGanGong !== '中') {
        const rGongReorder = rotateStart(gongReorder, shiGanGong as BaGuaName);
        const result = {} as Record<JiuGongName, TianGan>;
        for (let i = 0; i < 8; i++) {
          result[rGongReorder[i]] = ganReorder[i];
        }
        // 中宫天盘与地盘同
        result['中'] = diPan['中'];
        return result;
      }
      const result = {} as Record<JiuGongName, TianGan>;
      for (let i = 0; i < 8; i++) {
        result[gongReorder[i]] = ganReorder[i];
      }
      result['中'] = diPan['中'];
      return result;
    } else {
      // 遁干在中宫不在八宫序列，从寄宫目标宫地盘干起排
      const gongReorderJigong = rotateStart(rotate, jigongTarget);
      const result = {} as Record<JiuGongName, TianGan>;
      for (let i = 0; i < 8; i++) {
        result[gongReorderJigong[i]] = ganReorder[i];
      }
      result['中'] = diPan['中'];
      return result;
    }
  }

  // 情形二：常规情况——值符不在中宫，遁干不在中宫
  if (zfStar !== '天禽' && dunGanDiPanGong !== '中') {
    const ganList: TianGan[] = rotate.map(g => diPan[g]);
    let ganReorder = rotateStart(ganList, dunGan);
    let gongReorder = rotateStart(rotate, zfStarGong as BaGuaName);

    // 旬首时（甲时）天盘=地盘
    if (hourGan === '甲') {
      return { ...diPan };
    }

    if (!ganReorder.includes(dunGan)) {
      // 防御性分支：遁干不在八宫序列
      const juChar = CNUMBER[juNum - 1];
      // 以局数宫位对应的天干为新起点
      const juGongName = NUM_TO_GONG[juChar];
      const ganAtJuPos = ganReorder[rotate.indexOf(juGongName as BaGuaName)] || ganReorder[0];
      ganReorder = rotateStart(ganReorder, ganAtJuPos);
      if (shiGanGong && shiGanGong !== '中') {
        gongReorder = rotateStart(gongReorder, shiGanGong as BaGuaName);
      }
    }

    const result = {} as Record<JiuGongName, TianGan>;
    for (let i = 0; i < 8; i++) {
      result[gongReorder[i]] = ganReorder[i];
    }
    result['中'] = diPan['中'];
    return result;
  }

  // 情形三：值符为天禽星（寄宫目标宫），遁干在中宫
  if (zfStar === '天禽' && dunGanDiPanGong === '中') {
    const gg: TianGan[] = rotate.map(g => diPan[g]);
    // 从寄宫目标宫地盘干开始旋转天干
    const ganReorder = rotateStart(gg, diPan[jigongTarget]);
    const gongReorder = rotateStart(rotate, zfStarGong as BaGuaName);

    // 旬首时（甲时）天盘=地盘
    if (hourGan === '甲') {
      return { ...diPan };
    }

    if (!ganReorder.includes(dunGan)) {
      // 遁干在中宫，以时干宫位为宫起点
      if (shiGanGong && shiGanGong !== '中') {
        const rGongReorder = rotateStart(gongReorder, shiGanGong as BaGuaName);
        const result = {} as Record<JiuGongName, TianGan>;
        for (let i = 0; i < 8; i++) {
          result[rGongReorder[i]] = ganReorder[i];
        }
        result['中'] = diPan['中'];
        return result;
      }
    }

    const result = {} as Record<JiuGongName, TianGan>;
    for (let i = 0; i < 8; i++) {
      result[gongReorder[i]] = ganReorder[i];
    }
    result['中'] = diPan['中'];
    return result;
  }

  // 默认：天盘=地盘
  return { ...diPan };
}

// ============================================================================
// 十A、飞盘排布（飞盘奇门：按洛书轨迹飞泊，不走八宫轮转）
// ============================================================================

/**
 * 飞盘九星排布
 * 值符星随时干飞至时干落宫，其余八星按洛书本位序（蓬芮冲辅禽心柱任英）
 * 沿洛书轨迹飞泊（阳遁宫数递增、阴遁递减），九星入九宫（含中宫）
 * 天盘干随星携带：每星携带其洛书本宫的地盘干飞至新宫
 */
function layoutStarsFei(
  zfzs: ZhiFuZhiShi,
  isYang: boolean,
  diPan: Record<JiuGongName, TianGan>,
  diPanRev: Record<TianGan, JiuGongName>,
  hourGZ: string,
  jigongTarget: BaGuaName,
): {
  stars: Record<JiuGongName, JiuXingName>;
  tianPan: Record<JiuGongName, TianGan>;
  zfLuoGong: JiuGongName;
} {
  const xunShouInfo = findXunShou(hourGZ);
  const dunGan = xunShouInfo.dunGan;
  const hourGan = hourGZ[0] as TianGan;

  // 时干落宫（甲隐遁干）；落中宫时寄宫
  const shiGanForLookup: TianGan = hourGan === '甲' ? dunGan : hourGan;
  let zfLuoGong: JiuGongName = diPanRev[shiGanForLookup] || jigongTarget;
  if (zfLuoGong === '中') zfLuoGong = jigongTarget;

  // 值符星：旬首遁干洛书本宫星
  const dunGanGong = diPanRev[dunGan];
  const zfStar: JiuXingName = zfzs.zhiFuXingGong[0] ||
    (dunGanGong ? STAR_HOME[GONG_TO_NUM[dunGanGong] - 1] : '天禽');
  const k = STAR_HOME.indexOf(zfStar);

  const dir = isYang ? 1 : -1;
  const startNum = GONG_TO_NUM[zfLuoGong as BaGuaName];

  const stars = {} as Record<JiuGongName, JiuXingName>;
  const tianPan = {} as Record<JiuGongName, TianGan>;
  for (let i = 0; i < 9; i++) {
    const starIdx = (k + i) % 9;
    const palaceNum = (((startNum - 1 + dir * i) % 9) + 9) % 9 + 1;
    const gong = JIUGONG[palaceNum - 1];
    stars[gong] = STAR_HOME[starIdx];
    // 星携带洛书本宫地盘干
    tianPan[gong] = diPan[JIUGONG[starIdx]];
  }
  return { stars, tianPan, zfLuoGong };
}

/**
 * 飞盘八门排布
 * 值使门随时辰计数落宫（zsPai已算），其余门按洛书本位数序
 * 沿洛书轨迹飞泊八宫（跳过中五宫，门不入中）
 */
function layoutDoorsFei(
  zfzs: ZhiFuZhiShi,
  isYang: boolean,
  jigongTarget: BaGuaName,
): Record<BaGuaName, BaMenName> {
  const startingDoor = zfzs.zhiShiMenGong[0];
  let startingGong: JiuGongName = zfzs.zhiShiMenGong[1];
  if (startingGong === '中') startingGong = jigongTarget;

  // 八门按洛书本位数排序（1坎休 2坤死 3震伤 4巽杜 6乾开 7兑惊 8艮生 9离景）
  const doorHomeOrder: BaMenName[] = [];
  for (let i = 0; i < 9; i++) {
    const d = DOOR_HOME[i];
    if (d) doorHomeOrder.push(d);
  }
  const k = doorHomeOrder.indexOf(startingDoor);

  const dir = isYang ? 1 : -1;
  let num = GONG_TO_NUM[startingGong as BaGuaName];
  const doors = {} as Record<BaGuaName, BaMenName>;
  for (let i = 0; i < 8; i++) {
    (doors as Record<JiuGongName, BaMenName>)[JIUGONG[num - 1]] = doorHomeOrder[(k + i) % 8];
    // 前进一宫，跳过中五宫
    do {
      num = (((num - 1 + dir) % 9) + 9) % 9 + 1;
    } while (num === 5);
  }
  return doors;
}

/**
 * 飞盘天八神排布
 * 值符神起于值符星落宫，沿洛书轨迹飞泊八宫（跳过中五宫），阳遁顺飞阴遁逆飞
 */
function layoutTianShenFei(
  zfLuoGong: JiuGongName,
  isYang: boolean,
): Record<BaGuaName, TianBaShenName> {
  const dir = isYang ? 1 : -1;
  let num = GONG_TO_NUM[zfLuoGong as BaGuaName];
  const shen = {} as Record<BaGuaName, TianBaShenName>;
  for (let i = 0; i < 8; i++) {
    (shen as Record<JiuGongName, TianBaShenName>)[JIUGONG[num - 1]] = TIAN_BA_SHEN[i];
    do {
      num = (((num - 1 + dir) % 9) + 9) % 9 + 1;
    } while (num === 5);
  }
  return shen;
}

// ============================================================================
// 十一、地八神排布
// ============================================================================

/**
 * 排布地八神
 * 规则：从值符宫天盘干对应的地盘宫起，阳顺阴逆排八神
 */
function layoutDiShen(
  board: Record<JiuGongName, Partial<QimenPalace>>,
  zfStarGong: JiuGongName,
  isYang: boolean,
  tianPan: Record<JiuGongName, TianGan>,
  diPan: Record<JiuGongName, TianGan>,
  jigongTarget: BaGuaName = '坤',
): void {
  const actualZfGong = zfStarGong === '中' ? jigongTarget : zfStarGong;
  const zfTianGan = tianPan[actualZfGong];
  if (!zfTianGan) return;

  // 找地盘上与该天干相同的宫（起点宫）
  let startGong: BaGuaName | null = null;
  for (const g of CLOCKWISE_8GONG) {
    if (diPan[g] === zfTianGan) {
      startGong = g;
      break;
    }
  }
  if (!startGong) return;

  const sequence = isYang ? [...CLOCKWISE_8GONG] : [...CLOCKWISE_8GONG].reverse();
  const startIdx = sequence.indexOf(startGong);
  if (startIdx === -1) return;

  for (let i = 0; i < 8; i++) {
    const gongIdx = (startIdx + i) % 8;
    const gong = sequence[gongIdx];
    if (board[gong]) {
      (board[gong] as QimenPalace).diShen = DI_BA_SHEN[i];
    }
  }
}

// ============================================================================
// 十二、暗干排布
// ============================================================================

/**
 * 暗干排法一：按八门本宫地盘取暗干
 * 某宫的八门在其元旦盘（原始宫位）的地盘干为该宫暗干
 */
function layoutAnGanByMen(
  board: Record<JiuGongName, Partial<QimenPalace>>,
  diPan: Record<JiuGongName, TianGan>,
): void {
  const menToGong: Record<BaMenName, BaGuaName> = {
    '休门': '坎', '生门': '艮', '伤门': '震', '杜门': '巽',
    '景门': '离', '死门': '坤', '惊门': '兑', '开门': '乾',
  };
  for (const gua of CLOCKWISE_8GONG) {
    const palace = board[gua];
    if (palace && palace.door) {
      const srcGua = menToGong[palace.door];
      if (srcGua) {
        palace.anGan = diPan[srcGua];
      }
    }
  }
}

/**
 * 暗干排法二：时干加在值使门或中宫落宫飞布
 */
function layoutAnGanByZhiShi(
  board: Record<JiuGongName, Partial<QimenPalace>>,
  shiGan: TianGan,
  dunGan: TianGan,
  zhiShiMen: BaMenName,
  isYang: boolean,
  diPan: Record<JiuGongName, TianGan>,
): void {
  const ganTable: TianGan[] = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];

  // 九宫飞布顺序
  const gongOrder: JiuGongName[] = isYang
    ? ['坎', '坤', '震', '巽', '中', '乾', '兑', '艮', '离']
    : ['离', '艮', '兑', '乾', '中', '巽', '震', '坤', '坎'];

  // 找值使门落宫
  let targetGong: JiuGongName | null = null;
  for (const g of gongOrder) {
    if (board[g] && board[g]!.door === zhiShiMen) {
      targetGong = g;
      break;
    }
  }
  if (!targetGong) return;

  const targetDiPan = diPan[targetGong]; // 值使门落宫地盘
  const zhongGongDiPan = diPan['中'];

  let startGan: TianGan;
  let startGongIdx: number;

  if (shiGan === '甲') {
    // 时干为甲，以旬首遁干为起始
    startGan = dunGan;
    if (ganTable.indexOf(startGan) === -1) return;
    if (dunGan === zhongGongDiPan) {
      startGongIdx = gongOrder.indexOf(targetGong);
    } else {
      startGongIdx = gongOrder.indexOf('中');
    }
  } else {
    startGan = shiGan;
    if (ganTable.indexOf(startGan) === -1) return;
    if (shiGan === targetDiPan) {
      startGongIdx = gongOrder.indexOf('中');
    } else {
      startGongIdx = gongOrder.indexOf(targetGong);
    }
  }

  const startGanIdx = ganTable.indexOf(startGan);
  for (let i = 0; i < 9; i++) {
    const ganIdx = (startGanIdx + i) % 9;
    const gongIdx = (startGongIdx + i) % 9;
    const gong = gongOrder[gongIdx];
    if (board[gong]) {
      board[gong]!.anGan = ganTable[ganIdx];
    }
  }
}

// ============================================================================
// 十三、空亡、马星
// ============================================================================

/**
 * 空亡宫位
 */
function getKongwangGong(dunGan: TianGan): Partial<Record<BaGuaName, boolean>> {
  return KONGWANG_GONG[dunGan] || {};
}

/**
 * 驿马（时支驿马，对应宫位）
 * 申子辰马在寅（艮），寅午戌马在申（坤），亥卯未马在巳（巽），巳酉丑马在亥（乾）
 */
function getYiMaGong(hourZhi: DiZhi): Partial<Record<BaGuaName, boolean>> {
  const maGong: Partial<Record<BaGuaName, boolean>> = {};
  if ('亥卯未'.includes(hourZhi)) {
    maGong['巽'] = true;
  } else if ('申子辰'.includes(hourZhi)) {
    maGong['艮'] = true;
  } else if ('寅午戌'.includes(hourZhi)) {
    maGong['坤'] = true;
  } else if ('巳酉丑'.includes(hourZhi)) {
    maGong['乾'] = true;
  }
  return maGong;
}

/**
 * 驿马地支（时支）
 */
function getYiMa(hourZhi: DiZhi): DiZhi {
  if ('申子辰'.includes(hourZhi)) return '寅';
  if ('寅午戌'.includes(hourZhi)) return '申';
  if ('亥卯未'.includes(hourZhi)) return '巳';
  return '亥'; // 巳酉丑
}

/**
 * 天马（日支天马）
 * 寅申→午，卯酉→申，辰戌→戌，巳亥→子，午子→寅，丑未→辰
 */
function getTianMa(dayZhi: DiZhi): DiZhi {
  const tianMaDict: Record<DiZhi, DiZhi> = {
    '寅': '午', '申': '午',
    '卯': '申', '酉': '申',
    '辰': '戌', '戌': '戌',
    '巳': '子', '亥': '子',
    '午': '寅', '子': '寅',
    '丑': '辰', '未': '辰',
  };
  return tianMaDict[dayZhi];
}

/**
 * 丁马（日旬丁马）
 * 甲子→卯，甲戌→丑，甲申→亥，甲午→酉，甲辰→未，甲寅→巳
 */
function getDingMa(dayGZ: string): DiZhi {
  const xun = findXunShou(dayGZ);
  const dingMaDict: Record<string, DiZhi> = {
    '甲子': '卯', '甲戌': '丑', '甲申': '亥',
    '甲午': '酉', '甲辰': '未', '甲寅': '巳',
  };
  return dingMaDict[xun.liuJia] || '卯';
}

/**
 * 日空/时空
 */
function getRiKongShiKong(dayGZ: string, hourGZ: string): { riKong: string; shiKong: string } {
  const guxu: Record<string, { gu: string; xu: string }> = {
    '甲子': { gu: '戌亥', xu: '辰巳' },
    '甲戌': { gu: '申酉', xu: '寅卯' },
    '甲申': { gu: '午未', xu: '子丑' },
    '甲午': { gu: '辰巳', xu: '戌亥' },
    '甲辰': { gu: '寅卯', xu: '申酉' },
    '甲寅': { gu: '子丑', xu: '午未' },
  };
  const dayXun = findXunShou(dayGZ).liuJia;
  const hourXun = findXunShou(hourGZ).liuJia;
  return {
    riKong: guxu[dayXun]?.gu || '',
    shiKong: guxu[hourXun]?.gu || '',
  };
}

// ============================================================================
// 十四、击刑、入墓、门迫标记
// ============================================================================

/**
 * 击刑标记
 * 规则：艮宫庚击刑，震宫戊击刑，巽宫壬癸击刑，离宫辛击刑，坤宫己击刑
 */
function markJiXing(
  board: Record<JiuGongName, Partial<QimenPalace>>,
  jigongTarget: BaGuaName = '坤',
): void {
  const jiXingRule: Partial<Record<BaGuaName, string>> = {
    '艮': '庚',
    '震': '戊',
    '巽': '壬癸',
    '离': '辛',
    '坤': '己',
  };

  for (const [gong, rule] of Object.entries(jiXingRule)) {
    const palace = board[gong as JiuGongName];
    if (!palace) continue;

    if (palace.tianPanGan && rule.includes(palace.tianPanGan)) {
      palace.tianPanJiXing = true;
    }
    if (palace.diPanGan && rule.includes(palace.diPanGan)) {
      palace.diPanJiXing = true;
    }
  }
  // 寄宫目标宫特殊：中宫寄干也检查击刑
  const jigongPalace = board[jigongTarget];
  if (jigongPalace) {
    const rule = jiXingRule[jigongTarget] || '';
    if (jigongPalace.zhongGongDiPan && rule.includes(jigongPalace.zhongGongDiPan)) {
      jigongPalace.zhongGongJiXing = true;
    }
    if (jigongPalace.zhongGongTianPan && rule.includes(jigongPalace.zhongGongTianPan)) {
      jigongPalace.zhongGongJiXing = true;
    }
  }
}

/**
 * 门迫标记
 */
function markMenPo(board: Record<JiuGongName, Partial<QimenPalace>>): void {
  const menPoRule: Partial<Record<BaGuaName, BaMenName[]>> = {
    '乾': ['景门'],
    '坎': ['生门', '死门'],
    '艮': ['伤门', '杜门'],
    '震': ['开门', '惊门'],
    '巽': ['开门', '惊门'],
    '离': ['休门'],
    '坤': ['伤门', '杜门'],
    '兑': ['景门'],
  };

  for (const [gong, doors] of Object.entries(menPoRule)) {
    const palace = board[gong as JiuGongName];
    if (!palace || !palace.door) continue;
    if (doors.includes(palace.door)) {
      palace.menPo = true;
    }
  }
}

/**
 * 入墓标记
 * 规则：乾宫乙丙戊入墓，艮宫丁己庚入墓，巽宫辛壬入墓，坤宫癸入墓（加值符在坤时旬首干也入墓）
 */
function markRuMu(
  board: Record<JiuGongName, Partial<QimenPalace>>,
  zfStarGong: JiuGongName,
  dunGan: TianGan,
  jigongTarget: BaGuaName = '坤',
): void {
  const ruMuBase: Partial<Record<BaGuaName, string>> = {
    '乾': '乙丙戊',
    '艮': '丁己庚',
    '巽': '辛壬',
  };

  for (const [gong, rule] of Object.entries(ruMuBase)) {
    const palace = board[gong as JiuGongName];
    if (!palace) continue;
    if (palace.tianPanGan && rule.includes(palace.tianPanGan)) {
      palace.tianPanRuMu = true;
    }
    if (palace.diPanGan && rule.includes(palace.diPanGan)) {
      palace.diPanRuMu = true;
    }
  }

  // 坤宫特殊：癸入墓，值符落坤时旬首干也入墓
  const kunPalace = board['坤'];
  if (kunPalace) {
    const kunRules = ['癸'];
    if (zfStarGong === '坤' && dunGan) {
      kunRules.push(dunGan);
    }
    const ruleStr = kunRules.join('');
    if (kunPalace.tianPanGan && ruleStr.includes(kunPalace.tianPanGan)) {
      kunPalace.tianPanRuMu = true;
    }
    if (kunPalace.diPanGan && ruleStr.includes(kunPalace.diPanGan)) {
      kunPalace.diPanRuMu = true;
    }
    if (kunPalace.zhongGongDiPan && ruleStr.includes(kunPalace.zhongGongDiPan)) {
      kunPalace.zhongGongRuMu = true;
    }
    if (kunPalace.zhongGongTianPan && ruleStr.includes(kunPalace.zhongGongTianPan)) {
      kunPalace.zhongGongRuMu = true;
    }
  }

  // 寄宫目标为艮时：值符落艮，旬首干入艮墓
  if (jigongTarget === '艮' && zfStarGong === '艮' && dunGan) {
    const genPalace = board['艮'];
    if (genPalace) {
      if (genPalace.tianPanGan === dunGan) genPalace.tianPanRuMu = true;
      if (genPalace.diPanGan === dunGan) genPalace.diPanRuMu = true;
    }
  }
}

// ============================================================================
// 十五、12长生状态
// ============================================================================

/**
 * 设置各宫天盘干、地盘干的12长生状态
 */
function setChangSheng12(
  board: Record<JiuGongName, Partial<QimenPalace>>,
  jigongTarget: BaGuaName = '坤',
): void {
  for (const gua of CLOCKWISE_8GONG) {
    const palace = board[gua];
    if (!palace) continue;

    if (palace.diPanGan) {
      palace.diPan12ZhangSheng = QM_CHANGSHENG_12[palace.diPanGan]?.[gua] || '';
    }
    if (palace.tianPanGan) {
      palace.tianPan12ZhangSheng = QM_CHANGSHENG_12[palace.tianPanGan]?.[gua] || '';
    }
  }

  // 寄宫目标宫设置中宫寄干的12长生
  const jigong = board[jigongTarget];
  if (jigong) {
    if (jigong.zhongGongDiPan) {
      jigong.zhongGong12ZhangSheng = QM_CHANGSHENG_12[jigong.zhongGongDiPan]?.[jigongTarget] || '';
    }
  }
  // 中宫天盘寄宫的12长生（寄宫目标宫自身除外）
  for (const gua of CLOCKWISE_8GONG) {
    const palace = board[gua];
    if (palace.zhongGongTianPan && gua !== jigongTarget) {
      palace.zhongGong12ZhangSheng = QM_CHANGSHENG_12[palace.zhongGongTianPan]?.[gua] || '';
    }
  }
}

// ============================================================================
// 十六、节气区间描述
// ============================================================================

function getJieQiRangeStr(year: number, month: number, day: number, hour: number, minute: number): string {
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const prevJq = lunar.getPrevJieQi(false);
  const nextJq = lunar.getNextJieQi(false);
  const prevName = prevJq ? prevJq.getName() : '';
  const nextName = nextJq ? nextJq.getName() : '';
  const prevSolar = prevJq ? prevJq.getSolar() : null;
  const nextSolar = nextJq ? nextJq.getSolar() : null;
  const prevStr = prevSolar ? `${prevName}${prevSolar.toYmdHms().slice(0, -3)}` : prevName;
  const nextStr = nextSolar ? `${nextName}${nextSolar.toYmdHms().slice(0, -3)}` : nextName;
  return `${prevStr} ~ ${nextStr}`;
}

// ============================================================================
// 十七、主入口函数
// ============================================================================

/**
 * 奇门遁甲排盘主函数
 *
 * @param input - 排盘输入参数（QimenInput），包含公历年月日时分及排盘选项
 * @returns QimenResult 完整排盘结果
 */
export function calculateQimen(input: QimenInput): QimenResult {
  const { year, month, day, hour, minute = 0, panMethod, anganType } = input;
  const method: PanMethod = panMethod || 'chaibu';
  const angan: AnganType = anganType || 'zhishi';
  const layoutMode: PanLayoutMode = input.layoutMode || 'zhuanpan';
  const jigongMethod: JiGongMethod = input.jigongMethod || 'yanggen_yinkun';
  const timeType: QimenTimeType = input.timeType || 'normal';
  const longitude = input.longitude ?? 120;

  // 0. 真太阳时修正（经度差 + 均时差）
  let cy = year, cm = month, cdd = day, ch = hour, cmi = minute;
  let timeCorrection: string | undefined;
  if (timeType === 'zhen') {
    const t = applyTrueSolarTime(year, month, day, hour, minute, longitude);
    cy = t.y; cm = t.m; cdd = t.d; ch = t.h; cmi = t.mi;
    const fmt = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(1);
    timeCorrection =
      `真太阳时 ${t.h}:${String(t.mi).padStart(2, '0')}（修正${fmt(t.offsetMin)}分 = 经差${fmt(t.lonMin)}分 + 均时差${fmt(t.eotMin)}分，东经${longitude}°）`;
  }

  // 1. 计算四柱
  const siZhu = calcSiZhu(cy, cm, cdd, ch, cmi);
  const hourGZ = siZhu.hour;
  const dayGZ = siZhu.day;
  const hourGan = hourGZ[0] as TianGan;
  const hourZhi = hourGZ[1] as DiZhi;
  const dayZhi = dayGZ[1] as DiZhi;

  // 2. 定局
  const juResult = determineJu(cy, cm, cdd, ch, cmi, method, input.customJu, input.customYinYang);
  const { yinYang, juNum, yuan, jieqi } = juResult;
  const isYang = yinYang === '阳遁';
  const jigongTarget = getJigongTarget(isYang, jigongMethod);

  // 3. 排布地盘
  const diPan = layoutDiPan(juNum, isYang);
  const diPanRev = diPanReverse(diPan);

  // 4. 定位值符值使
  const zfzs = locateZhiFuZhiShi(juNum, isYang, hourGZ, diPanRev);
  const xunShouInfo = findXunShou(hourGZ);
  const dunGan = xunShouInfo.dunGan;

  // 5-8. 排布天盘九星/人盘八门/天八神/天盘天干（转盘轮转 或 飞盘飞泊）
  let stars: Record<BaGuaName, JiuXingName>;
  let doors: Record<BaGuaName, BaMenName>;
  let tianShen: Record<BaGuaName, TianBaShenName>;
  let tianPan: Record<JiuGongName, TianGan>;
  let starsFei: Record<JiuGongName, JiuXingName> | null = null;

  if (layoutMode === 'feipan') {
    const fei = layoutStarsFei(zfzs, isYang, diPan, diPanRev, hourGZ, jigongTarget);
    starsFei = fei.stars;
    stars = fei.stars as Record<BaGuaName, JiuXingName>;
    tianPan = fei.tianPan;
    doors = layoutDoorsFei(zfzs, isYang, jigongTarget);
    tianShen = layoutTianShenFei(fei.zfLuoGong, isYang);
  } else {
    ({ stars } = layoutStars(zfzs, isYang, jigongTarget));
    doors = layoutDoors(zfzs, isYang, jigongTarget);
    tianShen = layoutTianShen(zfzs, isYang, jigongTarget);
    tianPan = layoutTianPan(diPan, diPanRev, zfzs, isYang, hourGZ, juNum, jigongTarget);
  }

  // 9. 初始化九宫盘
  const board = {} as Record<JiuGongName, QimenPalace>;
  for (let i = 0; i < 9; i++) {
    const gongName = JIUGONG[i];
    const pos = i + 1;
    const isZhong = gongName === '中';
    board[gongName] = {
      position: pos,
      palaceName: gongName,
      // 飞盘模式中宫可落星（九星入九宫）；转盘中宫无星
      star: isZhong ? (layoutMode === 'feipan' ? (starsFei?.[gongName] || '') : '') : (stars[gongName as BaGuaName] || ''),
      door: isZhong ? '' : (doors[gongName as BaGuaName] || ''),
      tianShen: isZhong ? '' : (tianShen[gongName as BaGuaName] || ''),
      diShen: '',
      tianPanGan: tianPan[gongName] || '',
      diPanGan: diPan[gongName] || '',
      anGan: '',
      kongwang: false,
      ma: false,
    };
  }

  // 10. 中宫寄宫：中宫地盘干寄到寄宫目标宫（dipanJi）
  board[jigongTarget].zhongGongDiPan = diPan['中'];
  // 中宫天盘干（tianpanJi）：找天盘上与寄宫目标宫地盘干相同的宫位，中宫天盘干寄到该宫
  const zhongGongTianPanGan = tianPan['中'] || diPan['中'];
  const jigongDiPan = diPan[jigongTarget]; // 寄宫目标宫地盘干
  for (const gua of CLOCKWISE_8GONG) {
    if (board[gua].tianPanGan === jigongDiPan) {
      board[gua].zhongGongTianPan = zhongGongTianPanGan;
      break;
    }
  }

  // 11. 天禽星显示为"芮禽"（仅转盘；飞盘天禽独立落宫不合并）
  if (layoutMode === 'zhuanpan') {
    for (const gua of CLOCKWISE_8GONG) {
      if (board[gua].star === '天禽') {
        board[gua].star = '芮禽';
      }
    }
  }

  // 12. 空亡标记
  const kongSet = getKongwangGong(dunGan);
  for (const gua of CLOCKWISE_8GONG) {
    if (kongSet[gua]) {
      board[gua].kongwang = true;
    }
  }

  // 13. 驿马标记
  const maSet = getYiMaGong(hourZhi);
  for (const gua of CLOCKWISE_8GONG) {
    if (maSet[gua]) {
      board[gua].ma = true;
    }
  }

  // 14. 设置12长生
  setChangSheng12(board, jigongTarget);

  // 15. 入墓标记
  markRuMu(board, zfzs.zhiFuXingGong[1], dunGan, jigongTarget);

  // 16. 门迫标记
  markMenPo(board);

  // 17. 击刑标记
  markJiXing(board, jigongTarget);

  // 18. 地八神
  layoutDiShen(board, zfzs.zhiFuXingGong[1], isYang, tianPan, diPan, jigongTarget);

  // 19. 暗干
  if (angan === 'men') {
    layoutAnGanByMen(board, diPan);
  } else {
    layoutAnGanByZhiShi(board, hourGan === '甲' ? dunGan : hourGan, dunGan, zfzs.zhiShiMenGong[0], isYang, diPan);
  }

  // 20. 马星信息
  const { riKong, shiKong } = getRiKongShiKong(dayGZ, hourGZ);
  const maXing: MaXing = {
    yiMa: getYiMa(hourZhi),
    tianMa: getTianMa(dayZhi),
    dingMa: getDingMa(dayGZ),
  };

  // 21. 节气区间
  const jieQiRange = getJieQiRangeStr(cy, cm, cdd, ch, cmi);

  // 22. 日期字符串
  const solar = Solar.fromYmdHms(cy, cm, cdd, ch, cmi, 0);
  const lunar = solar.getLunar();
  const dateStr = `${cy}年${cm}月${cdd}日 ${ch}时${cmi}分(${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} ${hourZhi}时)${timeType === 'zhen' ? ' [真太阳时]' : ''}`;

  // 23. 旬首全称
  const xunShouFull = xunShouInfo.liuJia + dunGan;
  const xunKong = XUN_KONG[dunGan];

  // 24. 局名
  const juChar = CNUMBER[juNum - 1];
  const juName = `${yinYang}${juChar}局${yuan}`;

  // 25. 构建结果（填充向后兼容字段）
  const JI_MEN: BaMenName[] = ['休门', '生门', '开门'];
  const auspiciousDirections: string[] = [];
  const inauspiciousDirections: string[] = [];
  const palaces: QimenPalace[] = [];
  const palaceByGua = {} as Record<JiuGongName, QimenPalace>;
  const jigongTargetNum = GONG_TO_NUM[jigongTarget];
  for (let i = 0; i < 9; i++) {
    const gongName = JIUGONG[i];
    const p = board[gongName];
    // 向后兼容字段
    p.deity = p.tianShen;
    p.isAuspicious = p.door ? JI_MEN.includes(p.door) : false;
    if (p.door) {
      if (JI_MEN.includes(p.door)) {
        auspiciousDirections.push(gongName);
      } else {
        inauspiciousDirections.push(gongName);
      }
    }
    if (gongName === '中') {
      p.isJigong = true;
      p.jigongTarget = jigongTargetNum;
    }
    // 聚合标记字段（便于UI层直接使用）
    p.jixing = !!(p.tianPanJiXing || p.diPanJiXing || p.zhongGongJiXing);
    p.rumu = !!(p.tianPanRuMu || p.diPanRuMu || p.zhongGongRuMu);
    p.menpo = !!p.menPo;
    palaces.push(p);
    palaceByGua[gongName] = p;
  }

  return {
    panMethod: method,
    anganType: angan,
    layoutMode,
    jigongMethod,
    jigongTargetName: `${jigongTarget}${CNUMBER[jigongTargetNum - 1]}宫`,
    timeType,
    timeCorrection,
    dateStr,
    yinYangDun: yinYang,
    juNumber: juNum,
    juName,
    sanYuan: yuan,
    jieqi: jieQiRange,
    siZhu,
    xunShou: xunShouFull,
    xunKong,
    riKong,
    shiKong,
    zhiFuZhiShi: zfzs,
    maXing,
    palaces,
    palaceByGua,
    // 向后兼容字段
    juType: yinYang,
    yuan,
    auspiciousDirections,
    inauspiciousDirections,
  };
}

/**
 * 当前时间奇门遁甲排盘
 */
export function calculateQimenNow(): QimenResult {
  const now = new Date();
  return calculateQimen({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
  });
}

// ============================================================================
// 十八、辅助导出函数（保持向后兼容）
// ============================================================================

/**
 * 判断阳遁/阴遁（公历月日）
 * @deprecated 建议使用 calculateQimen 获得完整结果
 */
export function isYangDun(month: number, day: number, year?: number): boolean {
  const y = year ?? new Date().getFullYear();
  const jieqi = getCurrentJieQi(y, month, day, 12, 0);
  return YANG_DUN_JIEQI.has(jieqi);
}

/**
 * 拆补法计算局数
 * @deprecated 建议使用 calculateQimen 获得完整结果
 */
export function getJuNumber(
  month: number, day: number, yangDun: boolean, jieqiName: string, dayOffset: number,
): number {
  const juCode = JIEQI_JU_TABLE[jieqiName];
  if (!juCode) return 1;
  const hou = Math.floor(dayOffset / 5);
  const direction = yangDun ? 1 : -1;
  const baseJu = parseInt(juCode[0]);
  return mod9(baseJu + direction * hou * 6);
}

/**
 * 根据局数判断三元
 */
export function getYuan(ju: number): SanYuan {
  if (ju >= 1 && ju <= 3) return '上元';
  if (ju >= 4 && ju <= 6) return '中元';
  return '下元';
}

/**
 * 根据日偏移判断三元（拆补法）
 */
export function getYuanByDayOffset(dayOffset: number): SanYuan {
  const hou = Math.floor(dayOffset / 5);
  if (hou === 0) return '上元';
  if (hou === 1) return '中元';
  return '下元';
}

/**
 * 飞宫排盘（简化版，向后兼容）
 * @deprecated 建议使用 calculateQimen 获得完整结果
 */
export function flyLayout(ju: number, yangDun: boolean): Record<number, QimenPalace> {
  const result: Record<number, QimenPalace> = {};
  const diPan = layoutDiPan(ju, yangDun);
  const jigongTarget = yangDun ? 2 : 8;

  for (let i = 0; i < 9; i++) {
    const pos = i + 1;
    const gongName = JIUGONG[i];
    const isJigong = pos === 5;
    result[pos] = {
      position: pos,
      palaceName: gongName,
      star: STAR_HOME[i],
      door: DOOR_HOME[i] || '',
      tianShen: TIAN_BA_SHEN[0],
      diShen: '',
      tianPanGan: diPan[gongName] || '',
      diPanGan: diPan[gongName] || '',
      anGan: '',
      kongwang: false,
      ma: false,
      isAuspicious: ['休门', '生门', '开门'].includes(DOOR_HOME[i] || ''),
      ...(isJigong ? { isJigong: true, jigongTarget } : {}),
    } as QimenPalace;
  }
  return result;
}
