/**
 * 紫微斗数类型定义（v2.0 - 基于 iztro 官方库）
 *
 * 原始来源：自研，MIT License
 * 修改记录：2026-07-29 扩展类型定义，支持 iztro 完整星耀分类
 * 当前协议：MIT
 */

import type { TianGan, DiZhi, Gender } from './common';

export interface ZiweiPalace {
  /** 宫位名称（命宫、父母、福德、田宅、官禄、交友、疾厄、子女、财帛、夫妻、兄弟、迁移） */
  name: string;
  /** 宫位索引（0=寅,1=卯,2=辰,3=巳,4=午,5=未,6=申,7=酉,8=戌,9=亥,10=子,11=丑） */
  index: number;
  /** 宫位天干 */
  heavenlyStem: TianGan;
  /** 宫位地支 */
  earthlyBranch: DiZhi;
  /** 14主星名称列表 */
  majorStars: string[];
  /** 所有辅星/煞星/杂曜名称列表（不分类型，供兼容使用） */
  minorStars: string[];
  /** 六吉星（左辅、右弼、天魁、天钺、文昌、文曲）+ 禄存、天马 */
  auspiciousStars: string[];
  /** 六煞星（擎羊、陀罗、火星、铃星、地空、地劫） */
  shaStars: string[];
  /** 其他杂曜（红鸾、天喜、天刑、天姚、天月、阴煞、孤辰、寡宿、天哭、天虚、龙池、凤阁、咸池、华盖、解神、天巫 等） */
  otherStars: string[];
  /** 长生十二神 */
  changsheng: string;
  /** 博士十二神 */
  boshi: string;
  /** 将前十二神 */
  jiangqian: string;
  /** 岁前十二神 */
  suiqian: string;
  /** 大限天干地支（如"壬午"） */
  decadal: string;
  /** 大限年龄范围 [起始年龄, 截止年龄] */
  ageRange: [number, number];
}

export interface ZiweiStar {
  name: string;
  type: string;
  palace: string;
  brightness: string;
  /** 四化（禄/权/科/忌），如有 */
  mutagen?: string;
}

export interface ZiweiSihua {
  huaLu: { star: string; palace: string };
  huaQuan: { star: string; palace: string };
  huaKe: { star: string; palace: string };
  huaJi: { star: string; palace: string };
}

export interface ZiweiResult {
  solarDate: string;
  lunarDate: string;
  /** 干支纪年日期（如 "庚午 壬午 辛亥 戊子"） */
  chineseDate: string;
  heavenlyStem: TianGan;
  earthlyBranch: DiZhi;
  fiveElementsClass: string;
  /** 命主星 */
  soulStar: string;
  /** 身主星 */
  bodyStar: string;
  palaces: ZiweiPalace[];
  stars: ZiweiStar[];
  sihua: ZiweiSihua;
  decadal: { ageRange: number[]; palaces: string[] };
  bodyPalace: string;
}

export interface ZiweiInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  gender: Gender;
}
