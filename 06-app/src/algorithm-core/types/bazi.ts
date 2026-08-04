/**
 * 原始来源：自研，MIT License
 * 原始版本：v1.0
 * 修改记录：2026-07-26 从算法接口调用规范 v1.0 提取类型定义
 * 当前协议：MIT
 */

import type { TianGan, DiZhi, WuXing, Gender, ShiShen, ShengWangStage } from './common';

export interface BaziPillar {
  name: string;
  gan: TianGan;
  zhi: DiZhi;
  ganzhi: string;
  wuxing: { gan: WuXing; zhi: WuXing };
  nayin: string;
  canggan: TianGan[];
  xunkong: string;
  shishen: { gan: ShiShen; zhi: ShiShen[] };
  shishenShort: { gan: string; zhi: string[] };
  ganYinyang: string;
  zhiYinyang: string;
  changsheng: ShengWangStage;
  zizuo: string;
}

export interface ShenQiangRuoResult {
  result: string;
  totalScore: number;
  yueLing: { level: string; score: number; normalized: number; weighted: number; description: string };
  deDi: { total: number; max: number; normalized: number; weighted: number; details: Array<{ name: string; zhi: DiZhi; cangGan: TianGan[]; score: number; detail: Array<{ cangGan: TianGan; level: string; score: number }> }> };
  deShi: { total: number; max: number; normalized: number; weighted: number; details: Array<{ name: string; gan: TianGan; wuxing: WuXing; type: string; score: number }> };
  breakdown: string;
}

export interface LiunianItem {
  ganzhi: string;
  gan: TianGan;
  zhi: DiZhi;
  year: number;
  age: number;
  wuxing: { gan: WuXing; zhi: WuXing };
  nayin: string;
  shengxiao: string;
  shishenGan: ShiShen;
  canggan: TianGan[];
}

export interface DayunItem {
  ganzhi: string;
  gan: TianGan;
  zhi: DiZhi;
  order: number;
  startAge: number;
  startYear: number;
  wuxing: { gan: WuXing; zhi: WuXing };
  shishenGan: ShiShen;
  canggan: TianGan[];
  nayin: string;
  liunian: LiunianItem[];
}

export interface DayunResult {
  forward: boolean;
  direction: string;
  daysToJie: number;
  jieName: string;
  startAge: number;
  startAgeRaw: number;
  startMonth: number;
  startDay: number;
  startHour: number;
  startDate: string;
  startYear: number;
  dayunList: DayunItem[];
  jiaoyunGan1: string;
  jiaoyunGan2: string;
  qiyunText: string;
}

export interface PatternResult {
  patterns: string[];
  mainPattern: string;
  patternType: string;
  detail: { monthZhi: DiZhi; cangGan: TianGan[]; benQi: TianGan; benQiWuxing: WuXing; benQiShiShen: ShiShen; hasJianLu?: boolean; hasYueRen?: boolean; allPatterns: string[]; mainPattern: string; patternType: string };
}

export interface BaziResult {
  pillars: BaziPillar[];
  dayGan: TianGan;
  dayZhi: DiZhi;
  dayun: DayunResult;
  patterns: string[];
  patternDetail: PatternResult['detail'];
  mainPattern: string;
  patternType: string;
  shenQiangRuo: ShenQiangRuoResult;
  shensha: Record<string, string[]>;
  input?: { solarDate: string; time: string; gender: Gender };
  lunarDate?: string;
  jieQiInfo?: { prevJie: string; daysToPrevJie: number; nextJie: string; daysToNextJie: number };
}

export interface BaziInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  gender: Gender;
}
