/**
 * 原始来源：自研，MIT License
 * 原始版本：v1.0
 * 修改记录：2026-07-26 基于 TCM-Learning-Assistant(MIT) 数据结构定义
 * 当前协议：MIT
 */

export interface TcmHerb {
  id: string;
  name: string;
  pinyin: string;
  alias: string[];
  category: string;
  nature: string;
  taste: string;
  meridian: string;
  efficacy: string;
  indications: string;
  source: string;
  dosage: string;
  contraindications: string;
  toxic?: boolean;
}

export interface TcmFormula {
  id: string;
  name: string;
  pinyin?: string;
  alias?: string[];
  category: string;
  composition: Array<{ herb: string; dosage: string }>;
  efficacy: string;
  indications: string;
  source: string;
  preparation?: string;
  contraindications?: string;
  analysis?: string;
}

export interface TcmMeridian {
  id: string;
  name: string;
  category: string;
  points: Array<{ name: string; location: string; function: string }>;
  pathway: string;
  pinyin?: string;
  element?: string;
  yin_yang?: string;
  paired?: string;
}

export interface TcmAcupoint {
  name: string;
  pinyin: string;
  code: string;
  meridian: string;
  location: string;
  location_detail: string;
  function: string;
  literature: string;
}

export interface TcmSyndrome {
  name: string;
  description: string;
  symptoms: string[];
  formulas: string[];
  score: number;
}

export interface TcmDiagnosisResult {
  symptoms: string[];
  syndromes: TcmSyndrome[];
  disclaimer: string;
}