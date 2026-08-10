/**
 * ============================================================================
 * 小六壬算法模块
 * ============================================================================
 *
 * 算法来源：基于公开流传的小六壬经典规则独立实现
 * - 月日时三步骤推算（月上起日、日上起时、时上定掌诀）
 * - 六掌诀数据（大安/留连/速喜/赤口/小吉/空亡）
 * - 掌诀解读（吉凶、五行、方向、断辞）
 *
 * 推算规则：
 * - 正月从大安起，顺数至月 → 月上起日 → 日上起时
 * - 大安(1) → 留连(2) → 速喜(3) → 赤口(4) → 小吉(5) → 空亡(6) → 大安(1)...
 *
 * 协议：MIT
 * 创建日期：2026-07-27
 * 修改记录：无
 * ============================================================================
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 掌诀名称 */
export type PalmPositionName = '大安' | '留连' | '速喜' | '赤口' | '小吉' | '空亡';

/** 吉凶类型 */
export type JiXiongType = '大吉' | '小吉' | '凶' | '大凶';

/** 小六壬输入参数 */
export interface XiaoliurenInput {
  /** 农历月份 (1-12) */
  month: number;
  /** 农历日期 (1-30) */
  day: number;
  /** 时辰索引 (0-11: 子丑寅卯辰巳午未申酉戌亥) */
  shichen: number;
}

/** 掌诀详情 */
export interface PalmPosition {
  name: PalmPositionName;
  jiXiong: JiXiongType;
  wuxing: string;
  direction: string;
  description: string;
  number: number;
}

/** 推算步骤 */
export interface CalculationStep {
  step: 'month' | 'day' | 'hour';
  label: string;
  startFrom: PalmPositionName;
  count: number;
  result: PalmPositionName;
}

/** 小六壬完整结果 */
export interface XiaoliurenResult {
  monthStop: number;
  dayStop: number;
  hourStop: number;
  finalPosition: PalmPosition;
  steps: CalculationStep[];
}

// ============================================================================
// 六掌诀数据
// ============================================================================

/** 六掌诀基本信息 */
export const PALM_POSITIONS: PalmPosition[] = [
  {
    name: '大安',
    jiXiong: '大吉',
    wuxing: '木',
    direction: '东方',
    description: '身不动时，五行属木，颜色青色，方位东方。临青龙，谋事主一、五、七。有静止、心安、吉祥之含义。',
    number: 1,
  },
  {
    name: '留连',
    jiXiong: '凶',
    wuxing: '水',
    direction: '南方',
    description: '卒未归时，五行属水，颜色黑色，方位北方。临玄武，凡谋事主二、八、十。有喑昧不明、延迟、纠缠、拖延、漫长之含义。',
    number: 2,
  },
  {
    name: '速喜',
    jiXiong: '小吉',
    wuxing: '火',
    direction: '南方',
    description: '人便至时，五行属火，颜色红色，方位南方。临朱雀，谋事主三、六、九。有快速、喜事、吉利之含义。',
    number: 3,
  },
  {
    name: '赤口',
    jiXiong: '凶',
    wuxing: '金',
    direction: '西方',
    description: '官事凶时，五行属金，颜色白色，方位西方。临白虎，谋事主四、七、十。有不吉、惊恐、凶险、口舌是非之含义。',
    number: 4,
  },
  {
    name: '小吉',
    jiXiong: '大吉',
    wuxing: '水',
    direction: '东方',
    description: '人来喜时，五行属水，颜色黑色，方位南方。临六合，谋事主一、五、七。有和合、吉利之含义。',
    number: 5,
  },
  {
    name: '空亡',
    jiXiong: '大凶',
    wuxing: '土',
    direction: '中央',
    description: '音信稀时，五行属土，颜色黄色，方位中央。临勾陈，谋事主三、六、九。有不吉、无结果、忧虑之含义。',
    number: 6,
  },
];

// ============================================================================
// 核心算法
// ============================================================================

/**
 * 顺时针数掌诀
 * 从 startIndex 开始，顺数 steps 步，返回落位索引
 * 六掌诀按顺时针排列：大安(0) → 留连(1) → 速喜(2) → 赤口(3) → 小吉(4) → 空亡(5) → 大安(0)...
 */
export function countClockwise(startIndex: number, steps: number): number {
  return (startIndex + steps - 1) % 6;
}

/**
 * 时辰名称映射
 */
export const SHICHEN_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/**
 * 根据小时获取时辰索引
 * 23:00-00:59 = 子时(0), 01:00-02:59 = 丑时(1), ...
 */
export function hourToShichen(hour: number): number {
  return Math.floor(((hour + 1) % 24) / 2);
}

/**
 * 小六壬推算
 *
 * 步骤：
 * 1. 月：正月从大安(0)起，顺数至当月 → 得月落位
 * 2. 日：从月落位起，顺数至当日 → 得日落位
 * 3. 时：从日落位起，顺数至时辰(时辰数+1) → 得最终落位
 */
export function calculateXiaoLiuRen(input: XiaoliurenInput): XiaoliurenResult {
  const { month, day, shichen } = input;

  // 步骤1：月 - 正月从大安(0)起
  const monthStop = countClockwise(0, month);
  // 步骤2：日 - 从月落位起
  const dayStop = countClockwise(monthStop, day);
  // 步骤3：时 - 从日落位起，时辰数+1（子时=1）
  const hourStop = countClockwise(dayStop, shichen + 1);

  const steps: CalculationStep[] = [
    {
      step: 'month',
      label: '月上起日',
      startFrom: PALM_POSITIONS[0].name,
      count: month,
      result: PALM_POSITIONS[monthStop].name,
    },
    {
      step: 'day',
      label: '日上起时',
      startFrom: PALM_POSITIONS[monthStop].name,
      count: day,
      result: PALM_POSITIONS[dayStop].name,
    },
    {
      step: 'hour',
      label: '时上定掌诀',
      startFrom: PALM_POSITIONS[dayStop].name,
      count: shichen + 1,
      result: PALM_POSITIONS[hourStop].name,
    },
  ];

  return {
    monthStop,
    dayStop,
    hourStop,
    finalPosition: PALM_POSITIONS[hourStop],
    steps,
  };
}

/**
 * 获取掌诀详情
 */
export function getPalmPosition(index: number): PalmPosition {
  return PALM_POSITIONS[index % 6];
}

/**
 * 判断是否为吉
 */
export function isJi(jiXiong: JiXiongType): boolean {
  return jiXiong.includes('吉');
}

/**
 * 获取吉凶颜色
 */
export function getJiXiongColor(jiXiong: JiXiongType): string {
  if (jiXiong === '大吉') return '#23c237';
  if (jiXiong === '小吉') return '#059669';
  return '#7B2FBE';
}