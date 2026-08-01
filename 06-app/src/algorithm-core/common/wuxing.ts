/**
 * 原始来源：自研净室重写，MIT License
 * 原始版本：v1.0
 * 修改记录：2026-07-26 从 common/index.ts 拆分重构
 * 当前协议：MIT
 * 参考依据：公开命理经典《渊海子平》《三命通会》
 * 净室声明：所有函数基于公开传统命理口诀独立构建，未逆向工程或复制任何 AGPL 源码
 */

import type { TianGan, DiZhi, GanZhi } from './ganzhi';
import { getCangGan } from './ganzhi';

// ============================================================================
// 类型定义
// ============================================================================

/** 五行 */
export type WuXing = '金' | '水' | '木' | '火' | '土';

/** 阴阳 */
export type YinYang = '阳' | '阴';

/** 十神 */
export type ShiShen = '比肩' | '劫财' | '食神' | '伤官' | '偏财' | '正财' | '七杀' | '正官' | '偏印' | '正印';

/** 十神简称 */
export type ShiShenJianCheng = '比' | '劫' | '食' | '伤' | '才' | '财' | '杀' | '官' | '枭' | '印';

/** 五行局配置 */
export interface WuXingJu {
  /** 五行本身 */
  element: WuXing;
  /** 旺衰排序（从最旺到最衰） */
  order: WuXing[];
}

// ============================================================================
// 一、基础数据表（基于《渊海子平》《三命通会》等公开经典文献独立构建）
// ============================================================================

/**
 * 天干五行映射
 * 甲乙木、丙丁火、戊己土、庚辛金、壬癸水
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const GAN_WUXING: Record<TianGan, WuXing> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
};

/**
 * 地支五行映射
 * 亥子水、寅卯木、巳午火、申酉金、辰戌丑未土
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const ZHI_WUXING: Record<DiZhi, WuXing> = {
  '子': '水', '丑': '土',
  '寅': '木', '卯': '木',
  '辰': '土', '巳': '火',
  '午': '火', '未': '土',
  '申': '金', '酉': '金',
  '戌': '土', '亥': '水',
};

/**
 * 天干阴阳
 * 甲丙戊庚壬为阳，乙丁己辛癸为阴
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const GAN_YIN_YANG: Record<TianGan, YinYang> = {
  '甲': '阳', '乙': '阴',
  '丙': '阳', '丁': '阴',
  '戊': '阳', '己': '阴',
  '庚': '阳', '辛': '阴',
  '壬': '阳', '癸': '阴',
};

/**
 * 地支阴阳
 * 子寅辰午申戌为阳，丑卯巳未酉亥为阴
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立构建
 */
export const ZHI_YIN_YANG: Record<DiZhi, YinYang> = {
  '子': '阳', '丑': '阴',
  '寅': '阳', '卯': '阴',
  '辰': '阳', '巳': '阴',
  '午': '阳', '未': '阴',
  '申': '阳', '酉': '阴',
  '戌': '阳', '亥': '阴',
};

/**
 * 十神查表（干对干）
 * SHI_SHEN_TABLE[日干][对照干] = 十神名称
 * 规则：同我者为比劫（同性比肩，异性劫财），我生者为食伤（同性食神，异性伤官），
 *       我克者为财（同性偏财，异性正财），克我者为官杀（同性七杀，异性正官），
 *       生我者为印（同性偏印，异性正印）
 * @source 公开命理经典《渊海子平》论十神
 * @license MIT - 净室独立构建
 */
export const SHI_SHEN_TABLE: Record<TianGan, Record<TianGan, ShiShen>> = {
  '甲': { '甲':'比肩','乙':'劫财','丙':'食神','丁':'伤官','戊':'偏财','己':'正财','庚':'七杀','辛':'正官','壬':'偏印','癸':'正印' },
  '乙': { '甲':'劫财','乙':'比肩','丙':'伤官','丁':'食神','戊':'正财','己':'偏财','庚':'正官','辛':'七杀','壬':'正印','癸':'偏印' },
  '丙': { '甲':'偏印','乙':'正印','丙':'比肩','丁':'劫财','戊':'食神','己':'伤官','庚':'偏财','辛':'正财','壬':'七杀','癸':'正官' },
  '丁': { '甲':'正印','乙':'偏印','丙':'劫财','丁':'比肩','戊':'伤官','己':'食神','庚':'正财','辛':'偏财','壬':'正官','癸':'七杀' },
  '戊': { '甲':'七杀','乙':'正官','丙':'偏印','丁':'正印','戊':'比肩','己':'劫财','庚':'食神','辛':'伤官','壬':'偏财','癸':'正财' },
  '己': { '甲':'正官','乙':'七杀','丙':'正印','丁':'偏印','戊':'劫财','己':'比肩','庚':'伤官','辛':'食神','壬':'正财','癸':'偏财' },
  '庚': { '甲':'偏财','乙':'正财','丙':'七杀','丁':'正官','戊':'偏印','己':'正印','庚':'比肩','辛':'劫财','壬':'食神','癸':'伤官' },
  '辛': { '甲':'正财','乙':'偏财','丙':'正官','丁':'七杀','戊':'正印','己':'偏印','庚':'劫财','辛':'比肩','壬':'伤官','癸':'食神' },
  '壬': { '甲':'食神','乙':'伤官','丙':'偏财','丁':'正财','戊':'七杀','己':'正官','庚':'偏印','辛':'正印','壬':'比肩','癸':'劫财' },
  '癸': { '甲':'伤官','乙':'食神','丙':'正财','丁':'偏财','戊':'正官','己':'七杀','庚':'正印','辛':'偏印','壬':'劫财','癸':'比肩' },
};

/**
 * 十神简称映射
 * @license MIT - 净室独立构建
 */
export const SHI_SHEN_JIAN_CHENG: Record<ShiShen, ShiShenJianCheng> = {
  '比肩': '比', '劫财': '劫',
  '食神': '食', '伤官': '伤',
  '偏财': '才', '正财': '财',
  '七杀': '杀', '正官': '官',
  '偏印': '枭', '正印': '印',
};

/**
 * 天干五合
 * 甲己合化土、乙庚合化金、丙辛合化水、丁壬合化木、戊癸合化火
 * @source 公开命理经典《渊海子平》论天干五合
 * @license MIT - 净室独立构建
 */
export const GAN_WU_HE: [TianGan, TianGan, WuXing][] = [
  ['甲', '己', '土'],
  ['乙', '庚', '金'],
  ['丙', '辛', '水'],
  ['丁', '壬', '木'],
  ['戊', '癸', '火'],
];

/**
 * 地支六合
 * 子丑合化土、寅亥合化木、卯戌合化火、辰酉合化金、巳申合化水、午未合化火土
 * @source 公开命理经典《渊海子平》论地支六合
 * @license MIT - 净室独立构建
 */
export const ZHI_LIU_HE: [DiZhi, DiZhi, string][] = [
  ['子', '丑', '土'],
  ['寅', '亥', '木'],
  ['卯', '戌', '火'],
  ['辰', '酉', '金'],
  ['巳', '申', '水'],
  ['午', '未', '火土'],
];

/**
 * 地支六冲
 * 子午冲、丑未冲、寅申冲、卯酉冲、辰戌冲、巳亥冲
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立构建
 */
export const ZHI_LIU_CHONG: [DiZhi, DiZhi][] = [
  ['子', '午'],
  ['丑', '未'],
  ['寅', '申'],
  ['卯', '酉'],
  ['辰', '戌'],
  ['巳', '亥'],
];

/**
 * 地支三合局
 * 申子辰合水、亥卯未合木、寅午戌合火、巳酉丑合金
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立构建
 */
export const ZHI_SAN_HE: [DiZhi, DiZhi, DiZhi, WuXing][] = [
  ['申', '子', '辰', '水'],
  ['亥', '卯', '未', '木'],
  ['寅', '午', '戌', '火'],
  ['巳', '酉', '丑', '金'],
];

/**
 * 地支三会局
 * 寅卯辰会东方木、巳午未会南方火、申酉戌会西方金、亥子丑会北方水
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立构建
 */
export const ZHI_SAN_HUI: [DiZhi, DiZhi, DiZhi, WuXing][] = [
  ['寅', '卯', '辰', '木'],
  ['巳', '午', '未', '火'],
  ['申', '酉', '戌', '金'],
  ['亥', '子', '丑', '水'],
];

/**
 * 地支六害
 * 子未害、丑午害、寅巳害、卯辰害、申亥害、酉戌害
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立构建
 */
export const ZHI_LIU_HAI: [DiZhi, DiZhi][] = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '巳'],
  ['卯', '辰'],
  ['申', '亥'],
  ['酉', '戌'],
];

/**
 * 地支相刑
 * 寅巳申无恩之刑、丑戌未恃势之刑、子卯无礼之刑、辰午酉亥自刑
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立构建
 */
export const ZHI_XING: Record<string, string> = {
  '寅巳申': '无恩之刑',
  '巳申寅': '无恩之刑',
  '申寅巳': '无恩之刑',
  '丑戌未': '恃势之刑',
  '戌未丑': '恃势之刑',
  '未丑戌': '恃势之刑',
  '子卯': '无礼之刑',
  '卯子': '无礼之刑',
  '辰辰': '自刑',
  '午午': '自刑',
  '酉酉': '自刑',
  '亥亥': '自刑',
};

/**
 * 地支六破
 * 子酉破、寅亥破、卯午破、辰丑破、巳申破、未戌破
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立构建
 */
export const ZHI_PO: [DiZhi, DiZhi][] = [
  ['子', '酉'],
  ['寅', '亥'],
  ['卯', '午'],
  ['辰', '丑'],
  ['巳', '申'],
  ['未', '戌'],
];

/**
 * 五行旺衰排序
 * 每个五行的旺衰（同我、我生、生我、克我、我克）排序
 * @source 公开命理文献《三命通会》
 * @license MIT - 净室独立构建
 */
export const WUXING_JUS: Record<WuXing, WuXingJu> = {
  '金': { element: '金', order: ['金', '水', '土', '火', '木'] },
  '水': { element: '水', order: ['水', '木', '金', '土', '火'] },
  '木': { element: '木', order: ['木', '火', '水', '金', '土'] },
  '火': { element: '火', order: ['火', '土', '木', '水', '金'] },
  '土': { element: '土', order: ['土', '金', '火', '木', '水'] },
};

// ============================================================================
// 二、核心函数实现
// ============================================================================

// ---------- 天干五行 ----------

/**
 * 获取天干对应的五行
 * 甲乙木、丙丁火、戊己土、庚辛金、壬癸水
 *
 * @param gan - 天干
 * @returns 五行
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典文献，未参考任何 AGPL 源码
 */
export function getGanWuxing(gan: TianGan): WuXing {
  return GAN_WUXING[gan];
}

// ---------- 地支五行 ----------

/**
 * 获取地支对应的五行
 * 亥子水、寅卯木、巳午火、申酉金、辰戌丑未土
 *
 * @param zhi - 地支
 * @returns 五行
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典文献，未参考任何 AGPL 源码
 */
export function getZhiWuxing(zhi: DiZhi): WuXing {
  return ZHI_WUXING[zhi];
}

// ---------- 天干阴阳 ----------

/**
 * 获取天干的阴阳属性
 * 甲丙戊庚壬为阳，乙丁己辛癸为阴
 *
 * @param gan - 天干
 * @returns 阴阳
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典文献，未参考任何 AGPL 源码
 */
export function getGanYinYang(gan: TianGan): YinYang {
  return GAN_YIN_YANG[gan];
}

/**
 * 判断天干是否为阳干
 *
 * @param gan - 天干
 * @returns true 为阳干
 *
 * @license MIT - 净室独立实现
 */
export function isGanYang(gan: TianGan): boolean {
  return GAN_YIN_YANG[gan] === '阳';
}

// ---------- 地支阴阳 ----------

/**
 * 获取地支的阴阳属性
 * 子寅辰午申戌为阳，丑卯巳未酉亥为阴
 *
 * @param zhi - 地支
 * @returns 阴阳
 *
 * @source 公开命理文献《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典文献，未参考任何 AGPL 源码
 */
export function getZhiYinYang(zhi: DiZhi): YinYang {
  return ZHI_YIN_YANG[zhi];
}

/**
 * 判断地支是否为阳支
 *
 * @param zhi - 地支
 * @returns true 为阳支
 *
 * @license MIT - 净室独立实现
 */
export function isZhiYang(zhi: DiZhi): boolean {
  return ZHI_YIN_YANG[zhi] === '阳';
}

// ---------- 十神计算 ----------

/**
 * 根据日干和参照天干计算十神
 *
 * 规则：同我者比劫（同性比肩，异性劫财）、我生者食伤（同性食神，异性伤官）、
 *       我克者财（同性偏财，异性正财）、克我者官杀（同性七杀，异性正官）、
 *       生我者印（同性偏印，异性正印）
 *
 * @param dayGan - 日干（日元）
 * @param refGan - 参照天干
 * @returns 十神名称
 *
 * @source 公开命理经典《渊海子平》论十神
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于十神定义规则，未参考任何 AGPL 源码
 */
export function getShiShen(dayGan: TianGan, refGan: TianGan): ShiShen {
  return SHI_SHEN_TABLE[dayGan][refGan];
}

/**
 * 获取十神简称
 *
 * @param shiShen - 十神全称
 * @returns 十神简称
 *
 * @license MIT - 净室独立实现
 */
export function getShiShenJianCheng(shiShen: ShiShen): ShiShenJianCheng {
  return SHI_SHEN_JIAN_CHENG[shiShen];
}

/**
 * 根据地支藏干计算十神数组
 *
 * @param dayGan - 日干
 * @param zhi - 地支
 * @returns 十神名称数组，与藏干一一对应
 *
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，组合藏干和十神逻辑
 */
export function getZhiShiShen(dayGan: TianGan, zhi: DiZhi): ShiShen[] {
  const cangGan = getCangGan(zhi);
  return cangGan.map(cg => SHI_SHEN_TABLE[dayGan][cg]);
}

/**
 * 根据五行关系计算十神大类（不区分阴阳）
 *
 * @param dayWuxing - 日干五行
 * @param refWuxing - 参照五行
 * @returns 十神大类名称
 *
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于五行生克规则
 */
export function getShiShenByWuxing(dayWuxing: WuXing, refWuxing: WuXing): string {
  if (dayWuxing === refWuxing) return '比劫';
  // 五行相生：金生水、水生木、木生火、火生土、土生金
  // 五行相克：金克木、木克土、土克水、水克火、火克金
  const shengMap: Record<WuXing, WuXing> = { '金': '水', '水': '木', '木': '火', '火': '土', '土': '金' };
  const keMap: Record<WuXing, WuXing> = { '金': '木', '木': '土', '土': '水', '水': '火', '火': '金' };

  if (shengMap[dayWuxing] === refWuxing) return '食伤';  // 我生者为食伤
  if (shengMap[refWuxing] === dayWuxing) return '印星';   // 生我者为印星
  if (keMap[dayWuxing] === refWuxing) return '财星';      // 我克者为财星
  if (keMap[refWuxing] === dayWuxing) return '官杀';      // 克我者为官杀
  return '比劫';
}

// ---------- 天干五合 ----------

/**
 * 判断两个天干是否构成五合
 *
 * 甲己合化土、乙庚合化金、丙辛合化水、丁壬合化木、戊癸合化火
 *
 * @param gan1 - 天干1
 * @param gan2 - 天干2
 * @returns 若构成五合，返回合化信息，否则返回 null
 *
 * @source 公开命理经典《渊海子平》论天干五合
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典口诀，未参考任何 AGPL 源码
 */
export function getGanWuHe(gan1: TianGan, gan2: TianGan): { pair: [TianGan, TianGan]; huaWuXing: WuXing } | null {
  for (const [g1, g2, wx] of GAN_WU_HE) {
    if ((gan1 === g1 && gan2 === g2) || (gan1 === g2 && gan2 === g1)) {
      return { pair: [g1, g2], huaWuXing: wx };
    }
  }
  return null;
}

/**
 * 获取天干在五合中的合化对象
 *
 * @param gan - 天干
 * @returns 合化对象天干和五行，若不在五合中返回 null
 *
 * @license MIT - 净室独立实现
 */
export function getGanHePartner(gan: TianGan): { partner: TianGan; huaWuXing: WuXing } | null {
  for (const [g1, g2, wx] of GAN_WU_HE) {
    if (gan === g1) return { partner: g2, huaWuXing: wx };
    if (gan === g2) return { partner: g1, huaWuXing: wx };
  }
  return null;
}

// ---------- 地支六合 ----------

/**
 * 判断两个地支是否构成六合
 *
 * 子丑合化土、寅亥合化木、卯戌合化火、辰酉合化金、巳申合化水、午未合化火土
 *
 * @param zhi1 - 地支1
 * @param zhi2 - 地支2
 * @returns 若构成六合，返回合化信息，否则返回 null
 *
 * @source 公开命理经典《渊海子平》论地支六合
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典口诀，未参考任何 AGPL 源码
 */
export function getZhiLiuHe(
  zhi1: DiZhi,
  zhi2: DiZhi,
): { pair: [DiZhi, DiZhi]; hua: string } | null {
  for (const [z1, z2, h] of ZHI_LIU_HE) {
    if ((zhi1 === z1 && zhi2 === z2) || (zhi1 === z2 && zhi2 === z1)) {
      return { pair: [z1, z2], hua: h };
    }
  }
  return null;
}

/**
 * 获取地支在六合中的合化对象
 *
 * @param zhi - 地支
 * @returns 合化对象地支和化气，若不在六合中返回 null
 *
 * @license MIT - 净室独立实现
 */
export function getZhiHePartner(zhi: DiZhi): { partner: DiZhi; hua: string } | null {
  for (const [z1, z2, h] of ZHI_LIU_HE) {
    if (zhi === z1) return { partner: z2, hua: h };
    if (zhi === z2) return { partner: z1, hua: h };
  }
  return null;
}

// ---------- 地支六冲 ----------

/**
 * 判断两个地支是否构成六冲
 *
 * 子午冲、丑未冲、寅申冲、卯酉冲、辰戌冲、巳亥冲
 *
 * @param zhi1 - 地支1
 * @param zhi2 - 地支2
 * @returns 若构成六冲，返回冲对，否则返回 null
 *
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典口诀，未参考任何 AGPL 源码
 */
export function getZhiLiuChong(zhi1: DiZhi, zhi2: DiZhi): [DiZhi, DiZhi] | null {
  for (const [z1, z2] of ZHI_LIU_CHONG) {
    if ((zhi1 === z1 && zhi2 === z2) || (zhi1 === z2 && zhi2 === z1)) {
      return [z1, z2];
    }
  }
  return null;
}

/**
 * 获取地支的六冲对象
 *
 * @param zhi - 地支
 * @returns 对冲的地支
 *
 * @license MIT - 净室独立实现
 */
export function getZhiChongPartner(zhi: DiZhi): DiZhi | null {
  for (const [z1, z2] of ZHI_LIU_CHONG) {
    if (zhi === z1) return z2;
    if (zhi === z2) return z1;
  }
  return null;
}

// ---------- 地支三合 ----------

/**
 * 判断三个地支是否构成三合局
 *
 * 申子辰合水、亥卯未合木、寅午戌合火、巳酉丑合金
 *
 * @param zhizhi - 地支数组
 * @returns 若构成三合局，返回三合地支和五行，否则返回 null
 *
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典口诀，未参考任何 AGPL 源码
 */
export function getZhiSanHe(zhizhi: DiZhi[]): { zhi: [DiZhi, DiZhi, DiZhi]; wuxing: WuXing } | null {
  if (zhizhi.length < 3) return null;
  const sorted = [...zhizhi].sort();
  for (const [z1, z2, z3, wx] of ZHI_SAN_HE) {
    const expected = [z1, z2, z3].sort();
    if (sorted.length === 3 && sorted[0] === expected[0] && sorted[1] === expected[1] && sorted[2] === expected[2]) {
      return { zhi: [z1, z2, z3], wuxing: wx };
    }
  }
  return null;
}

// ---------- 地支三会 ----------

/**
 * 判断三个地支是否构成三会局
 *
 * 寅卯辰会东方木、巳午未会南方火、申酉戌会西方金、亥子丑会北方水
 *
 * @param zhizhi - 地支数组
 * @returns 若构成三会局，返回三会地支和五行，否则返回 null
 *
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典口诀，未参考任何 AGPL 源码
 */
export function getZhiSanHui(zhizhi: DiZhi[]): { zhi: [DiZhi, DiZhi, DiZhi]; wuxing: WuXing } | null {
  if (zhizhi.length < 3) return null;
  const sorted = [...zhizhi].sort();
  for (const [z1, z2, z3, wx] of ZHI_SAN_HUI) {
    const expected = [z1, z2, z3].sort();
    if (sorted.length === 3 && sorted[0] === expected[0] && sorted[1] === expected[1] && sorted[2] === expected[2]) {
      return { zhi: [z1, z2, z3], wuxing: wx };
    }
  }
  return null;
}

// ---------- 地支六害 ----------

/**
 * 判断两个地支是否构成六害
 *
 * 子未害、丑午害、寅巳害、卯辰害、申亥害、酉戌害
 *
 * @param zhi1 - 地支1
 * @param zhi2 - 地支2
 * @returns 若构成六害，返回害对，否则返回 null
 *
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典口诀，未参考任何 AGPL 源码
 */
export function getZhiLiuHai(zhi1: DiZhi, zhi2: DiZhi): [DiZhi, DiZhi] | null {
  for (const [z1, z2] of ZHI_LIU_HAI) {
    if ((zhi1 === z1 && zhi2 === z2) || (zhi1 === z2 && zhi2 === z1)) {
      return [z1, z2];
    }
  }
  return null;
}

// ---------- 地支相刑 ----------

/**
 * 判断两个或三个地支是否构成相刑
 *
 * 寅巳申无恩之刑、丑戌未恃势之刑、子卯无礼之刑、辰午酉亥自刑
 *
 * @param zhizhi - 地支数组（2-3个）
 * @returns 若构成相刑，返回刑名，否则返回 null
 *
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典口诀，未参考任何 AGPL 源码
 */
export function getZhiXing(zhizhi: DiZhi[]): string | null {
  if (zhizhi.length === 2) {
    // 自刑：辰辰、午午、酉酉、亥亥
    if (zhizhi[0] === zhizhi[1]) {
      const key = `${zhizhi[0]}${zhizhi[1]}`;
      return ZHI_XING[key] ?? null;
    }
    // 子卯无礼之刑
    const key2 = `${zhizhi[0]}${zhizhi[1]}`;
    const key2r = `${zhizhi[1]}${zhizhi[0]}`;
    return ZHI_XING[key2] ?? ZHI_XING[key2r] ?? null;
  }
  if (zhizhi.length === 3) {
    const sorted = zhizhi.sort().join('');
    // 检查三刑
    const patterns = ['寅巳申', '丑戌未'];
    for (const p of patterns) {
      if (sorted === p) {
        return ZHI_XING[p] ?? null;
      }
    }
  }
  return null;
}

// ---------- 地支六破 ----------

/**
 * 判断两个地支是否构成六破
 *
 * 子酉破、寅亥破、卯午破、辰丑破、巳申破、未戌破
 *
 * @param zhi1 - 地支1
 * @param zhi2 - 地支2
 * @returns 若构成六破，返回破对，否则返回 null
 *
 * @source 公开命理经典《渊海子平》
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于经典口诀，未参考任何 AGPL 源码
 */
export function getZhiPo(zhi1: DiZhi, zhi2: DiZhi): [DiZhi, DiZhi] | null {
  for (const [z1, z2] of ZHI_PO) {
    if ((zhi1 === z1 && zhi2 === z2) || (zhi1 === z2 && zhi2 === z1)) {
      return [z1, z2];
    }
  }
  return null;
}

// ---------- 五行局 ----------

/**
 * 获取五行局（五行旺衰排序）
 *
 * 每个五行都有其旺衰顺序：同我 > 我生 > 生我 > 克我 > 我克
 *
 * @param wuxing - 五行
 * @returns 五行局配置
 *
 * @source 公开命理文献《三命通会》论五行旺相休囚死
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于五行相生相克规则，未参考任何 AGPL 源码
 */
export function getWuxingJu(wuxing: WuXing): WuXingJu {
  return WUXING_JUS[wuxing];
}

/**
 * 判断两个五行之间的生克关系
 *
 * @param source - 源五行
 * @param target - 目标五行
 * @returns 关系描述：'同我' | '我生' | '生我' | '我克' | '克我'
 *
 * @license MIT - 净室独立实现
 * @cleanroom 独立构建，基于五行相生相克规则
 */
export function getWuxingRelation(source: WuXing, target: WuXing): string {
  if (source === target) return '同我';
  const shengMap: Record<WuXing, WuXing> = { '金': '水', '水': '木', '木': '火', '火': '土', '土': '金' };
  const keMap: Record<WuXing, WuXing> = { '金': '木', '木': '土', '土': '水', '水': '火', '火': '金' };

  if (shengMap[source] === target) return '我生';
  if (shengMap[target] === source) return '生我';
  if (keMap[source] === target) return '我克';
  if (keMap[target] === source) return '克我';
  return '同我';
}

// ---------- 十神汇总 ----------

/**
 * 十神关系汇总（用于八字分析）
 * 计算日干与年月日时四柱天干及藏干的十神关系
 *
 * @param dayGan - 日干
 * @param ganList - 天干列表（年月时柱天干）
 * @returns 十神数组
 *
 * @license MIT - 净室独立实现
 */
export function getShiShenSummary(dayGan: TianGan, ganList: TianGan[]): ShiShen[] {
  return ganList.map(g => getShiShen(dayGan, g));
}