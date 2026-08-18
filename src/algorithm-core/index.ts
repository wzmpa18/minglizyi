/**
 * ============================================================================
 * algorithm-core 统一算法核心包 —— 统一导出层
 * ============================================================================
 *
 * 包结构（三层架构）:
 *   types/        → 全局类型定义：统一所有模块的入参出参类型
 *   common/       → 公共基础层（自研替代版，MIT协议）
 *   modules/      → 单模块算法层（按来源分文件，逐模块标注协议）
 *
 * 使用方式:
 *   import { solarToBazi, calculateShenQiangRuo } from '@/algorithm-core';
 *   import { calculateZiwei } from '@/algorithm-core';
 *   import { calculateQimen } from '@/algorithm-core';
 *   import { calculateLiuyao } from '@/algorithm-core';
 *   import { calculateAllShenSha } from '@/algorithm-core';
 *   import { searchHerbs, searchFormulas } from '@/algorithm-core';
 *   import type { BaziResult, ZiweiResult, TianGan, DiZhi } from '@/algorithm-core';
 *
 * 协议约束:
 *   - MIT/ISC 代码可直接使用
 *   - 无 AGPL 代码混入
 *   - 每个模块文件头部均有来源、协议、修改记录标注
 *
 * 合并日期: 2026-07-26
 * 版本: v1.1.0
 * ============================================================================
 */

// ============================================================================
// 一、全局类型定义
// ============================================================================
export type {
  TianGan,
  DiZhi,
  WuXing,
  YinYang,
  Gender,
  ShiShen,
  ShengWangStage,
} from './types/common';

export type {
  BaziInput,
  BaziPillar,
  BaziResult,
  ShenQiangRuoResult,
  DayunResult,
  DayunItem,
  PatternResult,
} from './types/bazi';

export type {
  ZiweiInput,
  ZiweiResult,
  ZiweiPalace,
  ZiweiStar,
} from './types/ziwei';

export type {
  QimenInput,
  QimenResult,
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
  TianGan as QimenTianGan,
  DiZhi as QimenDiZhi,
  JiuXingName,
  BaMenName,
  TianBaShenName,
  DiBaShenName,
  SiZhu as QimenSiZhu,
  ZhiFuZhiShi,
  MaXing,
} from './types/qimen';

export type {
  LiuyaoInput,
  LiuyaoResult,
  LiuyaoYao,
  LiuyaoHexagram,
  YaoType,
  LiuyaoMethod,
  ShenSha,
  ManualYaoInput,
  NumberDivinationInput,
} from './types/liuyao';

// 从liuyao模块重导出TrigramName类型（兼容meihua等模块）
export type { TrigramName } from './modules/liuyao';

export type {
  TcmHerb,
  TcmFormula,
  TcmMeridian,
  TcmSyndrome,
  TcmDiagnosisResult,
} from './types/tcm';

// ============================================================================
// 二、公共基础层（common/）
// ============================================================================

// --- 干支模块 (ganzhi.ts) ---
export {
  // 基础数据
  GAN,
  ZHI,
  JIAZI_TABLE,
  KONGWANG_BY_XUN,
  CANG_GAN_TABLE,
  NAYIN_TABLE,
  SHENG_WANG_TABLE,
  WU_SHU_DUN_START,
  WU_HU_DUN_START,
  SHENG_XIAO_TABLE,
  JIEQI_NAMES,
  JIE_NAMES,
  // 核心函数
  getGanIndex,
  getGanByIndex,
  getZhiIndex,
  getZhiByIndex,
  getJiaziName,
  getJiaziIndex,
  calcJiaziIndex,
  getNayinWuxing,
  calcNayin,
  getNayinElement,
  getKongwang,
  calcKongwang,
  getCangGan,
  getShengWang,
  getWuShuDun,
  getFullWuShuDun,
  getWuHuDun,
  getFullWuHuDun,
  getShengXiao,
  getShengXiaoByYear,
  getMonthByJie,
  splitGanZhi,
  getYearGanByYear,
  getYearZhiByYear,
  getYearGanZhi,
} from './common/ganzhi';

// --- 五行模块 (wuxing.ts) ---
export {
  // 基础数据
  GAN_WUXING,
  ZHI_WUXING,
  GAN_YIN_YANG,
  ZHI_YIN_YANG,
  SHI_SHEN_TABLE,
  SHI_SHEN_JIAN_CHENG,
  GAN_WU_HE,
  ZHI_LIU_HE,
  ZHI_LIU_CHONG,
  ZHI_SAN_HE,
  ZHI_SAN_HUI,
  ZHI_LIU_HAI,
  ZHI_XING,
  ZHI_PO,
  WUXING_JUS,
  // 核心函数
  getGanWuxing,
  getZhiWuxing,
  getGanYinYang,
  isGanYang,
  getZhiYinYang,
  isZhiYang,
  getShiShen,
  getShiShenJianCheng,
  getZhiShiShen,
  getShiShenByWuxing,
  getGanWuHe,
  getGanHePartner,
  getZhiLiuHe,
  getZhiHePartner,
  getZhiLiuChong,
  getZhiChongPartner,
  getZhiSanHe,
  getZhiSanHui,
  getZhiLiuHai,
  getZhiXing,
  getZhiPo,
  getWuxingJu,
  getWuxingRelation,
  getShiShenSummary,
} from './common/wuxing';

// --- 节气模块 (jieqi.ts) ---
export {
  // 核心函数
  getJieQiDate,
  getNearestJieQi,
  getCurrentJieQi,
  getJieQiByName,
  getJieQiIndex,
  daysBetween,
  addDaysToDate,
  calcTrueSolarTime,
  getTrueSolarHourIndex,
} from './common/jieqi';

// ============================================================================
// 三、八字模块 (modules/bazi/)
// ============================================================================
export {
  // 基础常量
  CANGGAN,
  NAYIN,
  XUNKONG_TABLE,
  SHISHEN_TABLE,
  SHISHEN_SHORT,
  SHENGWANG_TABLE,
  CHANG_SHENG,
  SHENSHA_DATA,
  WANG_SHUAI_SCORE,
  // 关系数据
  LIUHE,
  SANHE,
  LIUCHONG,
  LIUHAI,
  SANHUI,
  WUXING_SHENG,
  WUXING_KE,
  // 遁法
  WUHU_DUN,
  WUSHU_DUN,
  JIE_DIZHI,
  // 基础函数
  ganIndex,
  zhiIndex,
  jiaziIndex,
  fixIndex,
  getXunKong,
  isXunKong,
  getNaYin,
  getShiShen as getBaziShiShen,
  getShiShenShort,
  getChangSheng,
  getMonthGan,
  getHourGan,
  hourToZhi,
  getYueLingWangShuai,
  solarToBazi,
} from './modules/bazi/base';

export {
  calculateShenQiangRuo,
  calculateDayun,
  determinePattern,
} from './modules/bazi/advanced';

// ============================================================================
// 三点五、八字合婚模块 (modules/hehun/)
// ============================================================================
export {
  calculateHehun,
} from './modules/hehun';

export type {
  HehunResult,
  HehunItem,
  HehunGrade,
  WuxingCount,
} from './modules/hehun';

// ============================================================================
// 四、紫微斗数模块 (modules/ziwei/)
// ============================================================================
export {
  calculateZiwei,
  getShichenOptions,
  // ZW-TIME 紫微时间轴引擎（P6-I-PLUS 规则6 永久冻结模块）
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
  // P8-2 年系/限系动态星曜（文墨天机口径）
  zwSeriesStars,
} from './modules/ziwei';
export type { ZwTimeNode, ZwTimeInput, ZwTimeLevel, ZwHoroscopeSnapshot, ZwSeriesStar } from './modules/ziwei';

// ============================================================================
// 五、神煞模块 (modules/shensha/)
// ============================================================================
export {
  // 常量
  SHENSHA_DEFINITIONS,
  SHENSHA_CATEGORY_LIST,
  // 核心函数
  calculateAllShenSha,
  getShenShaByPillar,
  getShenShaByCategory,
  hasShenSha,
  // 辅助函数
  getSeason,
} from './modules/shensha';

// ============================================================================
// 六、奇门遁甲模块 (modules/qimen/)
// ============================================================================
export {
  calculateQimen,
  calculateQimenNow,
  isYangDun,
  getJuNumber,
  getYuan,
  getYuanByDayOffset,
  flyLayout,
} from './modules/qimen';

// ============================================================================
// 七、六爻模块 (modules/liuyao/)
// ============================================================================
export {
  // 兼容旧接口
  TRIGRAM_DATA,
  HEXAGRAM_NAMES,
  HEXAGRAM_TRIGRAMS,
  // 常量（liuyao专用）
  BAGUA,
  CODE_TO_TRIGRAM,
  NUM_TO_TRIGRAM,
  TRIGRAM_WUXING,
  NAJIA_GAN,
  NAJIA_ZHI,
  GUAMING,
  LIUQIN_SHORT,
  LIUSHEN,
  LIUSHEN_START,
  YIMA,
  TAOHUA,
  // 核心函数
  calculateLiuyao,
  timeQiGua,
  numberQiGua,
  buildHexagram,
  getLiuQin,
  getKongWang,
  calcShiYing,
  calcGuaGong,
  findFuShen,
  jiaZiIndex,
} from './modules/liuyao';

// ============================================================================
// 八、梅花易数模块 (modules/meihua/)
// ============================================================================
export {
  // 类型
  type DivinationMethod,
  type MeihuaInput,
  type TrigramInfo,
  type HexagramInfo,
  type TiYongAnalysis,
  type MeihuaResult,
  // 数据
  TRIGRAM_NUMBER_MAP,
  TRIGRAM_SYMBOLS,
  HEXAGRAM_GUACI,
  // 核心函数
  calculateMeihua,
  timeDivination as meihuaTimeDivination,
  numberDivination,
  getHuGua,
  getBianGua,
  analyzeTiYong,
  findHexagramNumber,
  getTrigramInfo,
} from './modules/meihua';

// ============================================================================
// 九、小六壬模块 (modules/xiaoliuren/)
// ============================================================================
export {
  // 类型
  type PalmPositionName,
  type JiXiongType,
  type XiaoliurenInput,
  type PalmPosition,
  type CalculationStep,
  type XiaoliurenResult,
  // 数据
  PALM_POSITIONS,
  SHICHEN_NAMES,
  // 核心函数
  calculateXiaoLiuRen,
  countClockwise,
  hourToShichen,
  getPalmPosition,
  isJi,
  getJiXiongColor,
} from './modules/xiaoliuren';

// ============================================================================
// 十、大六壬模块 (modules/daliuren/)
// ============================================================================
export {
  calculateDaLiuRen,
  type DaLiuRenResult,
  type SanChuanItem,
  type SiKeItem,
  type PanMap,
  type DaLiuRenInputParams,
} from './modules/daliuren';

// ============================================================================
// 十一、玄空飞星模块 (modules/xuankong-feixing/)
// ============================================================================
export {
  calcXuankong,
} from './modules/xuankong-feixing';

// ============================================================================
// 十二、达摩一掌经模块 (modules/yizhangjing/)
// ============================================================================
export {
  calcYizhangJing,
} from './modules/yizhangjing';

// ============================================================================
// 十三、中医模块 (modules/tcm/)
// ============================================================================
export {
  HERBS_DB,
  searchHerbs,
  getHerbById,
  getHerbCategories,
  getHerbsByCategory,
  loadFullHerbsDatabase,
  searchFullHerbs,
} from './modules/tcm/herbs';

export {
  FORMULAS_DB,
  searchFormulas,
  getFormulaById,
  getFormulaCategories,
  getFormulasByCategory,
  loadFullFormulasDatabase,
  searchFullFormulas,
} from './modules/tcm/formulas';

export {
  MERIDIANS_DB,
  ACUPOINTS_DB,
  searchMeridians,
  getMeridianById,
  getMeridianByName,
  searchAcupoints,
  getAcupointByCode,
  getAcupointByName,
  getAcupointsByMeridian,
  loadFullMeridiansDatabase,
} from './modules/tcm/meridians';

export {
  SHANGHAN_SYNDROMES,
  studySyndromeMatch,
  searchClassicTexts,
  getClassicTextsCount,
  getClassicNames,
} from './modules/tcm/shanghan';
// ============================================================================
// 十四、择日模块 (modules/zeri/) — v18.4 新增
// ============================================================================
export {
  type AuspiciousDay,
  type ZeriCustomEvent,
  EVENT_TYPES as ZERI_EVENT_TYPES,
  JIANCHU_JIXIONG,
  SHENGXIAO,
  findAuspiciousDays,
  getScoreColor as getZeriScoreColor,
  getScoreLabel as getZeriScoreLabel,
  formatDate,
} from './modules/zeri';

// ============================================================================
// 十四B、占星天文模块 (modules/astro/) — P6-TOOL-04 v25.0.26 新增
// 基于 天文历算引擎 2.1.19 + 自研占星换算层
// ============================================================================
export {
  type AstroInput,
  type AstroPlanetPosition,
  type AstroAspect,
  type NatalChartResult,
  ASTRO_ENGINE_VERSION,
  ASTRO_CITIES,
  calcNatalChart,
} from './modules/astro';

// ============================================================================
// 十五、手机号吉凶模块 (modules/phone/) — v18.4 新增
// ============================================================================
export {
  DIGIT_WUXING as PHONE_DIGIT_WUXING,
  WUXING_COLORS as PHONE_WUXING_COLORS,
  CARRIER_PREFIX,
  BAXING_STARS,
  type BaXingStar,
  SHULI_JIXIONG as PHONE_SHULI_JIXIONG,
  INDUSTRY_SUGGESTIONS,
  type BaxingMatch,
  type PhoneAnalysisResult,
  analyzePhone,
  getScoreColor as getPhoneScoreColor,
} from './modules/phone';

// ============================================================================
// 十六、车牌号吉凶模块 (modules/carplate/) — v18.4 新增
// ============================================================================
export {
  PROVINCE_PREFIXES,
  DIGIT_WUXING as CARPLATE_DIGIT_WUXING,
  LETTER_WUXING,
  WUXING_COLORS as CARPLATE_WUXING_COLORS,
  SHULI_DESC,
  AUSPICIOUS_COMBOS,
  INAUSPICIOUS_COMBOS,
  type CarplateResult,
  analyzeCarplate,
  getScoreColor as getCarplateScoreColor,
  wuxingRound,
} from './modules/carplate';
