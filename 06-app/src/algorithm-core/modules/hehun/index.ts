/**
 * 八字合婚算法模块
 * 原始来源：自研净室重写，MIT License
 * 版本：v1.0
 * 创建日期：2026-07-31
 *
 * 合婚分析维度：
 *   1. 双方八字基本信息（四柱、纳音、生肖、五行数量）
 *   2. 生肖配对（六合/六冲/三合/相刑/相害）
 *   3. 年柱纳音五行生克
 *   4. 日柱天干合克、地支合冲
 *   5. 五行互补度（双方五行喜忌互补分析）
 *   6. 综合评分（0-100分）
 *   7. 合婚评语（天作之合/上等婚/中等婚/下等婚/需谨慎）
 *
 * 参考依据：公开命理经典《渊海子平》《三命通会》
 * 净室声明：所有算法基于公开传统命理口诀独立构建，未逆向工程或复制任何 AGPL 源码
 */

import type { BaziResult, BaziPillar } from '../../types/bazi';
import type { TianGan, DiZhi, WuXing } from '../../types/common';

// 从bazi/base模块导入
import {
  GAN,
  ZHI,
  GAN_WUXING,
  ZHI_WUXING,
  getNaYin,
  CANGGAN,
  WUXING_SHENG,
  WUXING_KE,
} from '../bazi/base';

// 从common模块导入
import { getShengXiao } from '../../common/ganzhi';
import {
  getGanWuHe,
  getZhiLiuHe,
  getZhiLiuChong,
  getZhiLiuHai,
  getZhiXing,
} from '../../common/wuxing';

// 五行生克关系
const WX_SHENG: Record<string, string> = { 金: '水', 水: '木', 木: '火', 火: '土', 土: '金' };
const WX_KE: Record<string, string> = { 金: '木', 木: '土', 土: '水', 水: '火', 火: '金' };

// ============================================================================
// 类型定义
// ============================================================================

/** 合婚单项分析结果 */
export interface HehunItem {
  /** 分析项名称 */
  name: string;
  /** 分析项说明 */
  desc: string;
  /** 详细描述 */
  detail: string;
  /** 是否通过（吉） */
  pass: boolean;
  /** 判定评语 */
  passDesc: string;
  /** 得分（0-10，该项贡献分数） */
  score: number;
  /** 最大得分 */
  maxScore: number;
}

/** 五行统计 */
export interface WuxingCount {
  金: number;
  木: number;
  水: number;
  火: number;
  土: number;
}

/** 合婚结果 */
export interface HehunResult {
  /** 男方八字 */
  male: {
    shengxiao: string;
    pillars: BaziPillar[];
    wuxingCount: WuxingCount;
    dayGan: TianGan;
    dayZhi: DiZhi;
    input?: { solarDate?: string; time?: string; gender?: string };
    shenQiangRuo?: string;
    mainPattern?: string;
  };
  /** 女方八字 */
  female: {
    shengxiao: string;
    pillars: BaziPillar[];
    wuxingCount: WuxingCount;
    dayGan: TianGan;
    dayZhi: DiZhi;
    input?: { solarDate?: string; time?: string; gender?: string };
    shenQiangRuo?: string;
    mainPattern?: string;
  };
  /** 各项分析 */
  items: HehunItem[];
  /** 综合评分 0-100 */
  totalScore: number;
  /** 合婚等级 */
  grade: HehunGrade;
  /** 等级评语 */
  gradeDesc: string;
  /** 总评 */
  summary: string;
}

/** 合婚等级 */
export type HehunGrade = '天作之合' | '上等婚' | '中等婚' | '下等婚' | '需谨慎';

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 统计八字中五行数量（天干+地支本气）
 */
function countWuxing(pillars: BaziPillar[]): WuxingCount {
  const count: WuxingCount = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
  for (const p of pillars) {
    const gWx = GAN_WUXING[p.gan as keyof typeof GAN_WUXING];
    if (gWx) count[gWx as WuXing]++;
    const zWx = ZHI_WUXING[p.zhi as keyof typeof ZHI_WUXING];
    if (zWx) count[zWx as WuXing]++;
  }
  return count;
}

/**
 * 从纳音名称提取五行
 */
function extractNayinWx(nayin: string): WuXing | '' {
  if (!nayin) return '';
  for (const wx of ['金', '木', '水', '火', '土'] as WuXing[]) {
    if (nayin.includes(wx)) return wx;
  }
  return '';
}

/**
 * 判断两个五行的生克关系
 */
function wuxingRelation(wx1: WuXing | '', wx2: WuXing | ''): string {
  if (!wx1 || !wx2) return '';
  if (wx1 === wx2) return '比和';
  if (WX_SHENG[wx1] === wx2) return '相生';
  if (WX_KE[wx1] === wx2) return '我克';
  if (WX_SHENG[wx2] === wx1) return '相生';
  if (WX_KE[wx2] === wx1) return '克我';
  return '';
}

/**
 * 天干相冲
 */
function hasGanChong(g1: string, g2: string): boolean {
  const pairs: Record<string, string> = {
    '甲': '庚', '庚': '甲', '乙': '辛', '辛': '乙',
    '丙': '壬', '壬': '丙', '丁': '癸', '癸': '丁',
  };
  return pairs[g1] === g2;
}

/**
 * 天干相克（非五合、非相冲的五行克）
 */
function hasGanKe(g1: string, g2: string): boolean {
  const wx1 = GAN_WUXING[g1 as keyof typeof GAN_WUXING];
  const wx2 = GAN_WUXING[g2 as keyof typeof GAN_WUXING];
  if (!wx1 || !wx2) return false;
  if (wx1 === wx2) return false;
  if (getGanWuHe(g1 as TianGan, g2 as TianGan)) return false;
  if (hasGanChong(g1, g2)) return true;
  return WX_KE[wx1 as WuXing] === wx2;
}

// ============================================================================
// 分析维度实现
// ============================================================================

/**
 * 1. 生肖配对分析
 */
function analyzeShengxiao(male: BaziResult, female: BaziResult): HehunItem {
  const mZhi = male.pillars[0].zhi;
  const fZhi = female.pillars[0].zhi;
  const mSx = getShengXiao(mZhi);
  const fSx = getShengXiao(fZhi);

  const relations: string[] = [];
  let score = 10;
  let pass = true;

  // 六合
  const liuhe = getZhiLiuHe(mZhi, fZhi);
  if (liuhe) {
    relations.push(mZhi + fZhi + '六合，为大吉');
    score = 10;
  }
  // 三合
  const sanheWx: Record<string, string[]> = {
    '申': ['子', '辰'], '子': ['申', '辰'], '辰': ['申', '子'],
    '亥': ['卯', '未'], '卯': ['亥', '未'], '未': ['亥', '卯'],
    '寅': ['午', '戌'], '午': ['寅', '戌'], '戌': ['寅', '午'],
    '巳': ['酉', '丑'], '酉': ['巳', '丑'], '丑': ['巳', '酉'],
  };
  const mGroup = sanheWx[mZhi];
  if (mGroup && mGroup.includes(fZhi) && !liuhe) {
    relations.push(mZhi + fZhi + '三合，为吉');
    score = 9;
  }

  // 六冲
  const liuchong = getZhiLiuChong(mZhi, fZhi);
  if (liuchong) {
    relations.push(mZhi + fZhi + '六冲，为凶');
    score = Math.min(score, 2);
    pass = false;
  }
  // 六害
  const liuhai = getZhiLiuHai(mZhi, fZhi);
  if (liuhai) {
    relations.push(mZhi + fZhi + '六害（穿），为凶');
    score = Math.min(score, 3);
    pass = false;
  }
  // 相刑
  const xing = getZhiXing([mZhi, fZhi]);
  if (xing) {
    relations.push(mZhi + fZhi + xing + '，为凶');
    score = Math.min(score, 3);
    pass = false;
  }

  if (relations.length === 0) {
    relations.push('无特殊合冲关系，为平和');
    score = 7;
  }

  const isAuspicious = liuhe || (mGroup && mGroup.includes(fZhi));
  let passDesc: string;
  if (isAuspicious && !liuchong && !liuhai && !xing) {
    passDesc = '生肖' + relations.join('；') + '，为吉配';
    pass = true;
  } else if (liuchong || liuhai || xing) {
    passDesc = '生肖犯' + relations.filter(r => r.includes('凶')).join('；');
    pass = false;
  } else {
    passDesc = '生肖关系平和，无大碍';
    pass = true;
  }

  return {
    name: '生肖配对',
    desc: '六合/三合为吉，六冲/六害/相刑为凶',
    detail: '男方生肖' + mSx + '（' + mZhi + '），女方生肖' + fSx + '（' + fZhi + '）',
    pass,
    passDesc,
    score,
    maxScore: 10,
  };
}

/**
 * 2. 年柱纳音五行生克
 */
function analyzeNayin(male: BaziResult, female: BaziResult): HehunItem {
  const mGz = male.pillars[0].ganzhi;
  const fGz = female.pillars[0].ganzhi;
  const mNy = getNaYin(mGz) || '';
  const fNy = getNaYin(fGz) || '';
  const mWx = extractNayinWx(mNy);
  const fWx = extractNayinWx(fNy);
  const rel = wuxingRelation(mWx, fWx);

  let score = 7;
  let pass = true;
  let passDesc = '';

  if (rel === '比和') {
    score = 9;
    passDesc = '纳音比和，气场相投，为吉';
  } else if (rel === '相生') {
    score = 10;
    passDesc = '纳音相生，互相滋养，为大吉';
  } else if (rel === '我克' || rel === '克我') {
    score = 3;
    pass = false;
    passDesc = '纳音相克，气场不和，为凶';
  } else {
    score = 6;
    passDesc = '纳音关系平和';
  }

  return {
    name: '年柱纳音',
    desc: '纳音相生/比和为吉，相克为凶',
    detail: '男方年柱纳音' + mNy + '（' + mWx + '），女方年柱纳音' + fNy + '（' + fWx + '），关系：' + rel,
    pass,
    passDesc,
    score,
    maxScore: 10,
  };
}

/**
 * 3. 日柱天干合克分析
 */
function analyzeDayGan(male: BaziResult, female: BaziResult): HehunItem {
  const mGan = male.dayGan;
  const fGan = female.dayGan;

  let score = 6;
  let pass = true;
  let relation = '';
  let passDesc = '';

  const wuhe = getGanWuHe(mGan, fGan);
  if (wuhe) {
    relation = mGan + fGan + '天干五合（化' + wuhe.huaWuXing + '）';
    score = 10;
    passDesc = '日干五合，夫妻情投意合，为大吉';
  } else if (hasGanChong(mGan, fGan)) {
    relation = mGan + fGan + '天干相冲';
    score = 2;
    pass = false;
    passDesc = '日干相冲，性格易冲突，为凶';
  } else if (hasGanKe(mGan, fGan)) {
    const mWx = GAN_WUXING[mGan as keyof typeof GAN_WUXING];
    const fWx = GAN_WUXING[fGan as keyof typeof GAN_WUXING];
    relation = mGan + '（' + mWx + '）克' + fGan + '（' + fWx + '）或被克';
    score = 4;
    pass = false;
    passDesc = '日干相克，需互相包容';
  } else {
    const mWx = GAN_WUXING[mGan as keyof typeof GAN_WUXING];
    const fWx = GAN_WUXING[fGan as keyof typeof GAN_WUXING];
    if (mWx === fWx) {
      relation = '日干同属' + mWx + '，比和';
      score = 7;
      passDesc = '日干比和，性格相近，需防争执';
    } else if (WX_SHENG[mWx as WuXing] === fWx || WX_SHENG[fWx as WuXing] === mWx) {
      relation = '日干五行相生';
      score = 8;
      passDesc = '日干相生，感情融洽，为吉';
    } else {
      relation = '日干无特殊关系';
      score = 6;
      passDesc = '日干关系平和';
    }
  }

  return {
    name: '日干合克',
    desc: '日干五合为吉，相冲相克为凶',
    detail: '男方日干' + mGan + '，女方日干' + fGan + '，' + relation,
    pass,
    passDesc,
    score,
    maxScore: 10,
  };
}

/**
 * 4. 日柱地支（婚宫）合冲分析
 */
function analyzeDayZhi(male: BaziResult, female: BaziResult): HehunItem {
  const mZhi = male.dayZhi;
  const fZhi = female.dayZhi;

  let score = 6;
  let pass = true;
  const relations: string[] = [];
  let passDesc = '';

  const liuhe = getZhiLiuHe(mZhi, fZhi);
  if (liuhe) {
    relations.push('日支' + mZhi + fZhi + '六合');
    score = 10;
  }

  // 三合检查
  const sanheWx: Record<string, string[]> = {
    '申': ['子', '辰'], '子': ['申', '辰'], '辰': ['申', '子'],
    '亥': ['卯', '未'], '卯': ['亥', '未'], '未': ['亥', '卯'],
    '寅': ['午', '戌'], '午': ['寅', '戌'], '戌': ['寅', '午'],
    '巳': ['酉', '丑'], '酉': ['巳', '丑'], '丑': ['巳', '酉'],
  };
  const mGroup = sanheWx[mZhi];
  if (mGroup && mGroup.includes(fZhi) && !liuhe) {
    relations.push('日支' + mZhi + fZhi + '三合');
    score = 9;
  }

  const liuchong = getZhiLiuChong(mZhi, fZhi);
  if (liuchong) {
    relations.push('日支' + mZhi + fZhi + '六冲（婚宫相冲）');
    score = Math.min(score, 2);
    pass = false;
  }

  const liuhai = getZhiLiuHai(mZhi, fZhi);
  if (liuhai) {
    relations.push('日支' + mZhi + fZhi + '六害');
    score = Math.min(score, 3);
    pass = false;
  }

  const xing = getZhiXing([mZhi, fZhi]);
  if (xing) {
    relations.push('日支' + mZhi + fZhi + xing);
    score = Math.min(score, 3);
    pass = false;
  }

  if (relations.length === 0) {
    relations.push('日支无特殊合冲关系');
    score = 6;
  }

  const isAuspicious = liuhe || (mGroup && mGroup.includes(fZhi));
  if (isAuspicious && !liuchong && !liuhai && !xing) {
    passDesc = '婚宫' + relations.join('；') + '，夫妻宫相合，为吉';
    pass = true;
  } else if (liuchong || liuhai || xing) {
    passDesc = '婚宫' + relations.filter(r => r.includes('冲') || r.includes('害') || r.includes('刑')).join('；') + '，婚姻不稳，为凶';
    pass = false;
  } else {
    passDesc = '婚宫关系平和';
    pass = true;
  }

  return {
    name: '婚宫合冲',
    desc: '日支六合/三合为吉，六冲/六害/相刑为凶',
    detail: '男方日支（婚宫）' + mZhi + '，女方日支（婚宫）' + fZhi,
    pass,
    passDesc,
    score,
    maxScore: 10,
  };
}

/**
 * 5. 年柱天干地支关系
 */
function analyzeYearPillar(male: BaziResult, female: BaziResult): HehunItem {
  const mGan = male.pillars[0].gan;
  const mZhi = male.pillars[0].zhi;
  const fGan = female.pillars[0].gan;
  const fZhi = female.pillars[0].zhi;

  const ganHe = getGanWuHe(mGan as TianGan, fGan as TianGan);
  const ganChong = hasGanChong(mGan, fGan);
  const zhiHe = getZhiLiuHe(mZhi, fZhi);
  const zhiChong = getZhiLiuChong(mZhi, fZhi);

  const tianHeDiHe = ganHe && !zhiChong && zhiHe;
  const tianKeDiChong = (ganChong || hasGanKe(mGan, fGan)) && zhiChong;

  let score = 6;
  let pass = true;
  let passDesc = '';
  let detail = '男方年柱' + mGan + mZhi + '，女方年柱' + fGan + fZhi + '；';

  if (tianHeDiHe) {
    score = 10;
    passDesc = '年柱天合地合，最吉之配';
    detail += '天干五合，地支六合，天合地合';
  } else if (tianKeDiChong) {
    score = 1;
    pass = false;
    passDesc = '年柱天克地冲，家庭背景差异大，为凶';
    detail += '天干相克/冲，地支六冲，天克地冲';
  } else {
    const parts: string[] = [];
    if (ganHe) { parts.push('天干五合'); score = Math.max(score, 8); }
    else if (ganChong) { parts.push('天干相冲'); score = Math.min(score, 4); pass = false; }
    else if (hasGanKe(mGan, fGan)) { parts.push('天干相克'); score = Math.min(score, 4); }
    else parts.push('天干无特殊关系');

    if (zhiHe) { parts.push('地支六合'); score = Math.max(score, 8); }
    else if (zhiChong) { parts.push('地支六冲'); score = Math.min(score, 3); pass = false; }
    else parts.push('地支无特殊关系');

    detail += parts.join('，');
    if (ganHe || zhiHe) {
      passDesc = '年柱有合，根基稳固，为吉';
      pass = true;
      score = Math.max(score, 7);
    } else if (ganChong || zhiChong) {
      passDesc = '年柱有冲，家庭缘薄，需多沟通';
      pass = false;
    } else {
      passDesc = '年柱关系平和';
      score = 6;
    }
  }

  return {
    name: '年柱关系',
    desc: '天合地合为最吉，天克地冲为最凶',
    detail,
    pass,
    passDesc,
    score,
    maxScore: 10,
  };
}

/**
 * 6. 五行互补度分析
 */
function analyzeWuxingComplement(male: BaziResult, female: BaziResult): HehunItem {
  const mCount = countWuxing(male.pillars);
  const fCount = countWuxing(female.pillars);

  // 找出双方最多和最少的五行
  const wuxingList: WuXing[] = ['金', '木', '水', '火', '土'];
  const mEntries = wuxingList.map(w => ({ w, count: mCount[w] }));
  const fEntries = wuxingList.map(w => ({ w, count: fCount[w] }));

  const mStrongest = mEntries.reduce((a, b) => a.count >= b.count ? a : b);
  const mWeakest = mEntries.reduce((a, b) => a.count <= b.count ? a : b);
  const fStrongest = fEntries.reduce((a, b) => a.count >= b.count ? a : b);
  const fWeakest = fEntries.reduce((a, b) => a.count <= b.count ? a : b);

  // 互补度计算：一方最旺的五行生另一方最弱的五行 = 高度互补
  // 或双方最旺五行相生 = 互补
  // 双方最旺五行相同 = 同类（有好有坏）
  // 双方最旺五行相克 = 冲突
  let score = 5;
  let pass = true;
  let passDesc = '';
  let detail = '';

  const mStr = mStrongest.w + '(' + mStrongest.count + ')';
  const fStr = fStrongest.w + '(' + fStrongest.count + ')';
  const mWk = mWeakest.w + '(' + mWeakest.count + ')';
  const fWk = fWeakest.w + '(' + fWeakest.count + ')';

  detail = '男方五行偏旺' + mStr + '，偏弱' + mWk + '；女方五行偏旺' + fStr + '，偏弱' + fWk;

  // 核心互补逻辑
  if (mStrongest.w === fStrongest.w) {
    // 同类：比和，容易理解但可能同一五行过旺
    score = 6;
    passDesc = '双方五行偏旺相同，性格相近，需注意互补不足';
  } else if (WX_SHENG[mStrongest.w] === fStrongest.w || WX_SHENG[fStrongest.w] === mStrongest.w) {
    // 相生：一方旺的五行生另一方旺的五行
    score = 9;
    passDesc = '双方旺五行相生，互相滋养，互补性强，为吉';
  } else if (WX_KE[mStrongest.w] === fStrongest.w || WX_KE[fStrongest.w] === mStrongest.w) {
    // 相克
    score = 3;
    pass = false;
    passDesc = '双方旺五行相克，易生矛盾，需多包容';
  } else {
    score = 6;
    passDesc = '双方五行关系平和';
  }

  // 加分：一方所旺生另一方所弱
  if (WX_SHENG[mStrongest.w] === fWeakest.w || WX_SHENG[fStrongest.w] === mWeakest.w) {
    score = Math.min(10, score + 2);
    passDesc += '；一方能补另一方之不足，互补加分';
    if (score >= 7) pass = true;
  }

  return {
    name: '五行互补',
    desc: '双方五行喜忌互补为吉，旺五行相克为凶',
    detail,
    pass,
    passDesc,
    score: Math.min(10, score),
    maxScore: 10,
  };
}

/**
 * 7. 十神配置分析（简化版）
 */
function analyzeShishen(male: BaziResult, female: BaziResult): HehunItem {
  const mDayGan = male.dayGan;
  const fDayGan = female.dayGan;

  let mBijie = 0, mGuansha = 0;
  let fBijie = 0, fShangguan = 0;

  for (const p of male.pillars) {
    const ss = p.shishen?.gan || '';
    if (ss === '比肩' || ss === '劫财') mBijie++;
    if (ss === '正官' || ss === '七杀') mGuansha++;
    // 藏干中的比劫
    for (const cg of (p.canggan || [])) {
      const ss2 = getShishenFromGan(mDayGan, cg);
      if (ss2 === '比肩' || ss2 === '劫财') mBijie += 0.5;
      if (ss2 === '正官' || ss2 === '七杀') mGuansha += 0.5;
    }
  }
  for (const p of female.pillars) {
    const ss = p.shishen?.gan || '';
    if (ss === '比肩' || ss === '劫财') fBijie++;
    if (ss === '伤官' || ss === '食神') fShangguan++;
    for (const cg of (p.canggan || [])) {
      const ss2 = getShishenFromGan(fDayGan, cg);
      if (ss2 === '比肩' || ss2 === '劫财') fBijie += 0.5;
      if (ss2 === '伤官' || ss2 === '食神') fShangguan += 0.5;
    }
  }

  const mKeWife = mBijie >= 3;
  const fKeHusband = fBijie >= 3;
  const hardMatch = mKeWife && fKeHusband;

  let score = 7;
  let pass = true;
  let detail = '男方比劫' + Math.round(mBijie) + '个，官杀' + Math.round(mGuansha) + '个；';
  detail += '女方比劫' + Math.round(fBijie) + '个，食伤' + Math.round(fShangguan) + '个';
  let passDesc = '';

  if (hardMatch) {
    score = 3;
    pass = false;
    passDesc = '双方比劫皆重，互不相让，属硬配';
  } else if (mKeWife) {
    score = 4;
    pass = false;
    passDesc = '男方比劫过重，克妻信息明显';
  } else if (fKeHusband) {
    score = 4;
    pass = false;
    passDesc = '女方比劫过重，克夫信息明显';
  } else if (fShangguan >= 3 && fBijie >= 2) {
    score = 4;
    pass = false;
    passDesc = '女方伤官旺且比劫重，性格较强势';
  } else {
    score = 8;
    passDesc = '双方十神配置平和，为吉';
  }

  return {
    name: '十神配置',
    desc: '比劫过重克配偶，伤官旺克夫，为凶',
    detail,
    pass,
    passDesc,
    score,
    maxScore: 10,
  };
}

/** 辅助：根据日干和天干获取十神 */
function getShishenFromGan(dayGan: TianGan, targetGan: TianGan): string {
  const SHISHEN_TABLE: Record<string, Record<string, string>> = {
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
  return SHISHEN_TABLE[dayGan]?.[targetGan] || '';
}

/**
 * 8. 婚宫（日支）与对方年支关系
 */
function analyzeHunGong(male: BaziResult, female: BaziResult): HehunItem {
  const mNianZhi = male.pillars[0].zhi;
  const fNianZhi = female.pillars[0].zhi;
  const mRiZhi = male.dayZhi;
  const fRiZhi = female.dayZhi;

  const conflicts: string[] = [];

  // 男方年支 与 女方日支
  if (getZhiLiuChong(mNianZhi, fRiZhi)) conflicts.push('男方属相' + mNianZhi + '冲女方婚宫' + fRiZhi);
  else if (getZhiLiuHai(mNianZhi, fRiZhi)) conflicts.push('男方属相' + mNianZhi + '害女方婚宫' + fRiZhi);
  else if (getZhiXing([mNianZhi, fRiZhi])) conflicts.push('男方属相' + mNianZhi + '刑女方婚宫' + fRiZhi);

  // 女方年支 与 男方日支
  if (getZhiLiuChong(fNianZhi, mRiZhi)) conflicts.push('女方属相' + fNianZhi + '冲男方婚宫' + mRiZhi);
  else if (getZhiLiuHai(fNianZhi, mRiZhi)) conflicts.push('女方属相' + fNianZhi + '害男方婚宫' + mRiZhi);
  else if (getZhiXing([fNianZhi, mRiZhi])) conflicts.push('女方属相' + fNianZhi + '刑男方婚宫' + mRiZhi);

  let score = 8;
  let pass = true;
  let passDesc = '';
  let detail = '男方属相' + mNianZhi + '，婚宫' + mRiZhi + '；女方属相' + fNianZhi + '，婚宫' + fRiZhi;

  if (conflicts.length === 0) {
    score = 9;
    passDesc = '属相与对方婚宫无冲害，家庭和睦';
  } else {
    score = Math.max(2, 8 - conflicts.length * 3);
    pass = false;
    passDesc = conflicts.join('；') + '，家庭关系易有摩擦';
  }

  return {
    name: '婚宫属相',
    desc: '双方属相不可冲害对方婚宫（日支）',
    detail,
    pass,
    passDesc,
    score,
    maxScore: 10,
  };
}

// ============================================================================
// 综合评分与等级判定
// ============================================================================

/**
 * 根据总分判定等级
 */
function judgeGrade(totalScore: number): { grade: HehunGrade; desc: string } {
  if (totalScore >= 90) return { grade: '天作之合', desc: '天作之合，良缘佳配，夫妻恩爱，白首偕老' };
  if (totalScore >= 75) return { grade: '上等婚', desc: '上等婚配，感情深厚，互相扶持，家庭美满' };
  if (totalScore >= 55) return { grade: '中等婚', desc: '中等婚配，感情平稳，需互相包容，经营有方' };
  if (totalScore >= 35) return { grade: '下等婚', desc: '下等婚配，矛盾较多，需双方努力磨合，多沟通' };
  return { grade: '需谨慎', desc: '合婚分数较低，建议慎重考虑，多了解彼此' };
}

// ============================================================================
// 主入口函数
// ============================================================================

/**
 * 八字合婚分析
 *
 * @param maleBazi - 男方八字排盘结果（由 solarToBazi 生成）
 * @param femaleBazi - 女方八字排盘结果（由 solarToBazi 生成）
 * @returns 合婚分析结果
 */
export function calculateHehun(maleBazi: BaziResult, femaleBazi: BaziResult): HehunResult {
  // 分析各项
  const items: HehunItem[] = [
    analyzeShengxiao(maleBazi, femaleBazi),
    analyzeNayin(maleBazi, femaleBazi),
    analyzeYearPillar(maleBazi, femaleBazi),
    analyzeDayGan(maleBazi, femaleBazi),
    analyzeDayZhi(maleBazi, femaleBazi),
    analyzeHunGong(maleBazi, femaleBazi),
    analyzeWuxingComplement(maleBazi, femaleBazi),
    analyzeShishen(maleBazi, femaleBazi),
  ];

  // 计算总分（百分制）
  const totalRawScore = items.reduce((sum, item) => sum + item.score, 0);
  const maxRawScore = items.reduce((sum, item) => sum + item.maxScore, 0);
  const totalScore = Math.round((totalRawScore / maxRawScore) * 100);

  // 判定等级
  const gradeResult = judgeGrade(totalScore);

  // 构建基本信息
  const maleInfo = {
    shengxiao: getShengXiao(maleBazi.pillars[0].zhi),
    pillars: maleBazi.pillars,
    wuxingCount: countWuxing(maleBazi.pillars),
    dayGan: maleBazi.dayGan,
    dayZhi: maleBazi.dayZhi,
    input: maleBazi.input,
    shenQiangRuo: maleBazi.shenQiangRuo?.result,
    mainPattern: maleBazi.mainPattern,
  };

  const femaleInfo = {
    shengxiao: getShengXiao(femaleBazi.pillars[0].zhi),
    pillars: femaleBazi.pillars,
    wuxingCount: countWuxing(femaleBazi.pillars),
    dayGan: femaleBazi.dayGan,
    dayZhi: femaleBazi.dayZhi,
    input: femaleBazi.input,
    shenQiangRuo: femaleBazi.shenQiangRuo?.result,
    mainPattern: femaleBazi.mainPattern,
  };

  // 总评
  const passCount = items.filter(i => i.pass).length;
  const summary = '合婚共' + items.length + '项，通过' + passCount + '项。' + gradeResult.desc;

  return {
    male: maleInfo,
    female: femaleInfo,
    items,
    totalScore,
    grade: gradeResult.grade,
    gradeDesc: gradeResult.desc,
    summary,
  };
}
