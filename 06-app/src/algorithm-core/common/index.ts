/**
 * ============================================================================
 * 命理公共基础层 —— 统一导出入口
 * ============================================================================
 *
 * 协议：MIT License
 *
 * 背景说明：
 * 本项目中的 jishiyu（吉时雨）公共基础包使用 AGPL-3.0 协议，为规避协议风险，
 * 本公共基础层按"净室原则（Clean Room）"独立重写所有核心函数，整体以 MIT 协议发布。
 *
 * 净室原则声明：
 * - 所有函数实现基于公开的传统命理口诀独立构建，未逆向工程或复制任何 AGPL 源码。
 * - 所有数据表（干支、纳音、藏干、十二长生等）出自公开的命理经典文献（如《渊海子平》、
 *   《三命通会》等），不依赖任何 AGPL 源码的数据结构。
 * - 变量命名、函数结构、代码组织方式均独立设计，与 AGPL 源码无关。
 *
 * 外部依赖：lunar-javascript（MIT 协议）
 * - lunar-javascript 提供了公历/农历互转、节气计算、八字四柱等基础能力。
 * - 本文件优先引用 lunar-javascript 已实现的等价功能，并明确标注来源。
 * - 本文件聚焦 lunar-javascript 未覆盖的命理核心算法。
 *
 * 子模块结构:
 *   ganzhi.ts  → 干支换算、六十甲子、纳音、空亡、藏干、十二长生、五鼠遁、五虎遁、生肖
 *   wuxing.ts  → 五行生克、十神计算、天干五合、地支六合六冲三合三会六害刑破
 *   jieqi.ts   → 节气计算、真太阳时校正、日期工具
 *
 * 拆分日期: 2026-07-26
 * 版本: v1.0.0
 * ============================================================================
 */

// ============================================================================
// 从 ganzhi.ts 重新导出
// ============================================================================
export {
  // 类型
  type TianGan,
  type DiZhi,
  type GanZhi,
  type ShengWangStage,
  type ShengXiao,
  type NayinEntry,
  type KongWangResult,
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
} from './ganzhi';

// ============================================================================
// 从 wuxing.ts 重新导出
// ============================================================================
export {
  // 类型
  type WuXing,
  type YinYang,
  type ShiShen,
  type ShiShenJianCheng,
  type WuXingJu,
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
} from './wuxing';

// ============================================================================
// 从 jieqi.ts 重新导出
// ============================================================================
export {
  // 类型
  type JieQiInfo,
  type TrueSolarTimeResult,
  // 核心函数
  getJieQiInfo,
  getJieQiIndex,
  getJieQiNameByIndex,
  isJie,
  isQi,
  calcTrueSolarTime,
  getTrueSolarHourIndex,
  getJieQiDate,
  getNearestJieQi,
  getCurrentJieQi,
  getJieQiByName,
  daysBetween,
  addDaysToDate,
} from './jieqi';

/**
 * 本文件整体以 MIT 协议发布。
 * 所有函数基于公开传统命理口诀独立构建，按净室原则重写，未复制任何 AGPL 源码。
 *
 * 外部依赖：lunar-javascript（MIT）-- 用于公历/农历互转、节气精确计算、八字四柱构建。
 * 本文件仅覆盖 lunar-javascript 未提供的命理核心算法。
 */