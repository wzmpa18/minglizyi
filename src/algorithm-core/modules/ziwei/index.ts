/**
 * 紫微斗数排盘核心算法层（v2.0 - 基于 排盘引擎 官方库）
 *
 * 原始来源：排盘引擎 v2.5.8 - https://github.com/SylarLong/排盘引擎
 * 修改记录：2026-07-29 重写核心算法层，直接集成 排盘引擎 官方库作为排盘引擎，
 *           修复原有3个P0致命Bug：
 *             1) 公历转农历缺失（原代码直接用公历月日代替农历）
 *             2) 十二宫名称顺序错误
 *             3) 月份索引错误（左辅右弼等用公历月导致位置偏移）
 * 排盘引擎 内部使用 lunar-lite 完成精确的公历→农历转换、五虎遁、
 *           安星诀、大限顺逆、四化飞星等全部排盘逻辑，与 jishiyu 一致。
 *
 * 导出：calculateZiwei(input: ZiweiInput): ZiweiResult
 *       getShichenOptions(): 时辰选项列表
 */

import { astro } from 'iztro';
import type { ZiweiResult, ZiweiInput, ZiweiPalace, ZiweiStar, ZiweiSihua } from '../../types/ziwei';
import type { TianGan, DiZhi } from '../../types/common';

// ============================================================================
// 一、时辰索引映射（公历小时 → 排盘引擎时辰序号）
// ============================================================================
// 排盘引擎 时辰序号约定：
//   0=早子时(00:00-01:00), 1=丑时(01:00-03:00), 2=寅时(03:00-05:00),
//   3=卯时(05:00-07:00), 4=辰时(07:00-09:00), 5=巳时(09:00-11:00),
//   6=午时(11:00-13:00), 7=未时(13:00-15:00), 8=申时(15:00-17:00),
//   9=酉时(17:00-19:00), 10=戌时(19:00-21:00), 11=亥时(21:00-23:00),
//  12=晚子时(23:00-00:00)
// ============================================================================

/**
 * 将公历小时数转换为 排盘引擎 时辰索引
 * @param hour - 公历小时 (0-23)
 * @returns 时辰索引 (0-12)
 */
function hourToTimeIndex(hour: number): number {
  if (hour === 23) return 12; // 晚子时
  if (hour === 0) return 0;   // 早子时
  return Math.floor((hour + 1) / 2);
}

// ============================================================================
// 二、四化单字 → 中文全称映射
// ============================================================================

const MUTAGEN_MAP: Record<string, string> = {
  '禄': '化禄',
  '权': '化权',
  '科': '化科',
  '忌': '化忌',
};

// ============================================================================
// 宫名映射（排盘引擎 默认 "仆役" → 标准名 "交友"）
// ============================================================================
const PALACE_NAME_MAP: Record<string, string> = {
  '仆役': '交友',
};

/** 将 排盘引擎 宫名映射为标准十二宫名 */
function mapPalaceName(name: string): string {
  return PALACE_NAME_MAP[name] || name;
}

// ============================================================================
// 三、星耀类型分类（排盘引擎 type → 页面分类）
// ============================================================================
// 排盘引擎 star types:
//   'major'     → 14主星
//   'soft'      → 六吉星（文昌、文曲、左辅、右弼、天魁、天钺）
//   'tough'     → 六煞星（擎羊、陀罗、火星、铃星、地空、地劫）
//   'lucun'     → 禄存
//   'tianma'    → 天马
//   'flower'    → 桃花杂曜（红鸾、天喜、天姚、咸池）
//   'helper'    → 解神类（解神、年解）
//   'adjective' → 其他杂曜（天刑、天姚、天月、阴煞、孤辰、寡宿、天哭、天虚、龙池、凤阁、华盖、天巫、三台、八座、恩光、天贵、台辅、封诰、天福、天厨、天官、天德、月德、天伤、天使、天才、天寿、蜚廉、破碎、天空、空亡、旬空、截路、阴煞...）
// ============================================================================

/** 判断星耀是否为六吉星（用于auspiciousStars分组） */
function isAuspiciousStar(name: string, type: string): boolean {
  if (type === 'soft') return true;   // 六吉
  if (type === 'lucun') return true;  // 禄存
  if (type === 'tianma') return true; // 天马
  return false;
}

/** 判断星耀是否为六煞星（用于shaStars分组） */
function isShaStar(type: string): boolean {
  return type === 'tough';
}

// ============================================================================
// 四、核心排盘函数
// ============================================================================

/**
 * 紫微斗数完整排盘（基于 排盘引擎 官方引擎）
 *
 * @param input - 排盘参数（公历年月日时 + 性别）
 * @returns ZiweiResult 完整星盘结果，数据格式与现有UI层兼容
 */
export function calculateZiwei(input: ZiweiInput): ZiweiResult {
  const { year, month, day, hour, gender } = input;

  // 1. 转换参数格式
  const solarDateStr = `${year}-${month}-${day}`;
  const timeIndex = hourToTimeIndex(hour);
 // 排盘引擎 性别参数类型内部校验，使用类型断言避免 ts 严格类型不兼容
  const genderStr = (gender === 'male' ? '男' : '女') as '男' | '女';

 // 2. 调用 排盘引擎 核心排盘（fixLeap=true 处理闰月，zh-CN 输出简体中文）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const astrolabe = (astro as any).bySolar(solarDateStr, timeIndex, genderStr, true, 'zh-CN');

  // 3. 提取年柱天干地支（从 chineseDate 字符串解析，格式 "庚午 壬午 辛亥 戊子"）
  const pillars = astrolabe.chineseDate.split(' ');
  const yearPillar = pillars[0];
  const yearGan = yearPillar[0] as TianGan;
  const yearZhi = yearPillar[1] as DiZhi;

  // 4. 构建 ZiweiPalace[]（12宫，按寅卯辰巳午未申酉戌亥子丑顺序）
  const palaces: ZiweiPalace[] = [];
  const stars: ZiweiStar[] = [];

  // 收集四化（生年四化）
  const sihuaMap: Record<string, { star: string; palace: string }> = {
    '化禄': { star: '', palace: '' },
    '化权': { star: '', palace: '' },
    '化科': { star: '', palace: '' },
    '化忌': { star: '', palace: '' },
  };

  astrolabe.palaces.forEach((p: any, i: number) => {
    // 宫名映射（仆役 → 交友）
    const palaceName = mapPalaceName(p.name);

    // 4a. 收集主星（major）
    const majorStarNames: string[] = [];
    p.majorStars.forEach((s: any) => {
      majorStarNames.push(s.name);
      stars.push({
        name: s.name,
        type: 'major',
        palace: palaceName,
        brightness: s.brightness || '平',
        mutagen: s.mutagen || undefined,
      });
      if (s.mutagen && MUTAGEN_MAP[s.mutagen]) {
        sihuaMap[MUTAGEN_MAP[s.mutagen]] = { star: s.name, palace: palaceName };
      }
    });

    // 4b. 分类收集辅星/煞星/杂曜
    const auspiciousStars: string[] = []; // 六吉+禄存天马
    const shaStars: string[] = [];        // 六煞
    const otherStars: string[] = [];      // 其他杂曜
    const allMinorNames: string[] = [];

    const processStar = (s: any) => {
      allMinorNames.push(s.name);
      stars.push({
        name: s.name,
        type: s.type || 'adjective',
        palace: palaceName,
        brightness: s.brightness || '',
        mutagen: s.mutagen || undefined,
      });
      if (s.mutagen && MUTAGEN_MAP[s.mutagen]) {
        sihuaMap[MUTAGEN_MAP[s.mutagen]] = { star: s.name, palace: palaceName };
      }
      if (isAuspiciousStar(s.name, s.type)) {
        auspiciousStars.push(s.name);
      } else if (isShaStar(s.type)) {
        shaStars.push(s.name);
      } else {
        otherStars.push(s.name);
      }
    };

    // minorStars 包含 soft(六吉)、tough(六煞)、lucun(禄存)、tianma(天马)
    p.minorStars.forEach((s: any) => processStar(s));
    // adjectiveStars 包含其他杂曜（长生博士除外）
    p.adjectiveStars.forEach((s: any) => processStar(s));

    // 4c. 大限干支和年龄范围（添加 null 安全检查）
    const decadalData = p.decadal || {};
    const decadalGan = decadalData.heavenlyStem || '';
    const decadalZhi = decadalData.earthlyBranch || '';
    const decadalRange: [number, number] = decadalData.range
      ? [decadalData.range[0] || 0, decadalData.range[1] || 0]
      : [0, 0];
    const decadalGanZhi = `${decadalGan}${decadalZhi}`;

    // 4d. 小限年龄列表
    const ages: number[] = Array.isArray(p.ages) ? [...p.ages] : [];

    palaces.push({
      name: palaceName,
      index: i,
      heavenlyStem: p.heavenlyStem as TianGan,
      earthlyBranch: p.earthlyBranch as DiZhi,
      majorStars: majorStarNames,
      minorStars: allMinorNames,
      auspiciousStars,
      shaStars,
      otherStars,
      changsheng: p.changsheng12 || '',
      boshi: p.boshi12 || '',
      jiangqian: p.jiangqian12 || '',
      suiqian: p.suiqian12 || '',
      decadal: decadalGanZhi,
      ageRange: decadalRange,
      ages,
      isBodyPalace: !!p.isBodyPalace,
    });
  });

  // 5. 构建四化对象
  const sihua: ZiweiSihua = {
    huaLu: sihuaMap['化禄'],
    huaQuan: sihuaMap['化权'],
    huaKe: sihuaMap['化科'],
    huaJi: sihuaMap['化忌'],
  };

  // 6. 构建 decadal 汇总（按地支索引顺序0-11排列）
  const decadalAgeRanges: number[] = [];
  const decadalPalaces: string[] = [];
  astrolabe.palaces.forEach((p: any) => {
    const dr = p.decadal || {};
    decadalAgeRanges.push(dr.range ? dr.range[0] : 0);
    decadalPalaces.push(mapPalaceName(p.name));
  });

  // 7. 身宫名称（isBodyPalace 为 true 的宫位，使用映射后的宫名）
  let bodyPalace = '';
  for (const p of astrolabe.palaces as any[]) {
    if (p.isBodyPalace) {
      bodyPalace = mapPalaceName(p.name);
      break;
    }
  }

  // 8. 构建结果
  const result: ZiweiResult = {
    solarDate: astrolabe.solarDate,
    lunarDate: astrolabe.lunarDate,
    chineseDate: astrolabe.chineseDate,
    heavenlyStem: yearGan,
    earthlyBranch: yearZhi,
    fiveElementsClass: astrolabe.fiveElementsClass,
    soulStar: astrolabe.soul,
    bodyStar: astrolabe.body,
    time: astrolabe.time,
    timeRange: astrolabe.timeRange,
    sign: astrolabe.sign,
    zodiac: astrolabe.zodiac,
    earthlyBranchOfSoulPalace: astrolabe.earthlyBranchOfSoulPalace,
    earthlyBranchOfBodyPalace: astrolabe.earthlyBranchOfBodyPalace,
    palaces,
    stars,
    sihua,
    decadal: {
      ageRange: decadalAgeRanges,
      palaces: decadalPalaces,
    },
    bodyPalace,
  };

  return result;
}

// ============================================================================
// 五、时辰选项列表（UI用）
// ============================================================================

/**
 * 获取时辰选项列表
 * @returns 时辰选项数组，包含 value(时辰索引)、label(中文描述)、zhi(地支名)
 */
export function getShichenOptions(): Array<{ value: number; label: string; zhi: string }> {
  const shichen = [
    { value: 0, label: '早子时 (00:00-01:00)', zhi: '子' },
    { value: 1, label: '丑时 (01:00-03:00)', zhi: '丑' },
    { value: 2, label: '寅时 (03:00-05:00)', zhi: '寅' },
    { value: 3, label: '卯时 (05:00-07:00)', zhi: '卯' },
    { value: 4, label: '辰时 (07:00-09:00)', zhi: '辰' },
    { value: 5, label: '巳时 (09:00-11:00)', zhi: '巳' },
    { value: 6, label: '午时 (11:00-13:00)', zhi: '午' },
    { value: 7, label: '未时 (13:00-15:00)', zhi: '未' },
    { value: 8, label: '申时 (15:00-17:00)', zhi: '申' },
    { value: 9, label: '酉时 (17:00-19:00)', zhi: '酉' },
    { value: 10, label: '戌时 (19:00-21:00)', zhi: '戌' },
    { value: 11, label: '亥时 (21:00-23:00)', zhi: '亥' },
    { value: 12, label: '晚子时 (23:00-00:00)', zhi: '子' },
  ];
  return shichen;
}

// ZW-TIME 紫微时间轴引擎（P6-I-PLUS 规则6 永久冻结模块）
export {
  getZwDecadalList,
  getZwYearlyList,
  getZwMonthlyList,
  getZwDailyList,
  getZwHourlyList,
  getZwHoroscopeAt,
  // ZW-OVERLAY 叠宫计算（v25.0.25）
  zwOverlayNames,
  zwOverlayAt,
  ZW_PERIOD_PALACE_SEQ,
  zwPalaceAbbr,
  ZW_PERIOD_PALACE_ABBR,
} from './zwtime';
export type { ZwTimeNode, ZwTimeInput, ZwTimeLevel, ZwHoroscopeSnapshot } from './zwtime';
