/**
 * 原始来源：自研，MIT License
 * 原始版本：v1.0
 * 修改记录：2026-07-26 基于 TCM-Learning-Assistant(MIT) 数据结构定义
 *          2026-08-05 新增董氏奇穴类型、AI抓取缓存类型
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
  /** AI抓取的详细定位描述 */
  ai_location_detail?: string;
  /** AI抓取的定位图片URL */
  ai_location_image?: string;
  /** AI抓取的进针方法 */
  ai_needling_method?: string;
  /** AI抓取的时间戳 */
  ai_fetched_at?: string;
  /** 用户反馈：是否需要重新抓取 */
  ai_needs_refetch?: boolean;
}

/** 董氏奇穴 */
export interface TcmDongAcupoint {
  name: string;
  pinyin: string;
  code: string;
  zone: string;
  location: string;
  location_detail: string;
  function: string;
  needling_method: string;
  depth: string;
  duration: string;
  contraindications: string;
  literature: string;
  image_url?: string;
}

/** AI抓取缓存记录 */
export interface TcmScrapeCache {
  id: string;
  type: "acupoint" | "dong";
  detail: string;
  image_url: string;
  needling_method: string;
  fetched_at: string;
  source: string;
  needs_refetch: boolean;
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