/**
 * 姓名解析服务层
 *
 * 基于五格剖象法（天格、人格、地格、外格、总格）进行姓名分析
 * 使用康熙字典笔画计算，配合81数理吉凶表进行综合判定
 *
 * @module name-analysis
 * @since v20.1
 */

import kangxiData from "@/data/kangxi_dict.json";
import wugeData from "@/data/wuge_81math.json";

// ============================================================================
// 类型定义
// ============================================================================

export type Fortune = "大吉" | "吉" | "半吉半凶" | "凶" | "大凶";

export interface CharInfo {
  char: string;
  strokes: number;
  wuxing: string;
  pinyin: string;
  meaning: string;
  found: boolean;
}

export interface GeInfo {
  name: string;
  number: number;
  fortune: Fortune;
  title: string;
  desc: string;
  wuxing: string;
}

export interface NameAnalysisResult {
  name: string;
  surname: string;
  givenName: string;
  isCompoundSurname: boolean;
  isSingleGivenName: boolean;
  chars: CharInfo[];
  totalStrokes: number;
  tiange: GeInfo;
  renge: GeInfo;
  dige: GeInfo;
  waige: GeInfo;
  zongge: GeInfo;
  wuxingBalance: {
    金: number;
    木: number;
    水: number;
    火: number;
    土: number;
  };
  wuxingAnalysis: string;
  overallScore: number;
  overallRating: string;
  summary: string;
  suggestions: string[];
}

// ============================================================================
// 数据加载
// ============================================================================

const kangxiDict = (kangxiData as any).characters as Record<string, {
  strokes: number;
  wuxing: string;
  pinyin: string;
  meaning: string;
}>;

const wuge81 = ((wugeData as any).entries as Array<{
  n: number;
  f: Fortune;
  t: string;
  m: string;
}>).reduce((acc, entry) => {
  acc[entry.n] = entry;
  return acc;
}, {} as Record<number, { n: number; f: Fortune; t: string; m: string }>);

// ============================================================================
// 五行相生相克关系
// ============================================================================

const WUXING_SHENG: Record<string, string> = {
  金: "水",
  水: "木",
  木: "火",
  火: "土",
  土: "金",
};

const WUXING_KE: Record<string, string> = {
  金: "木",
  木: "土",
  土: "水",
  水: "火",
  火: "金",
};

// 天格→人格的五行关系
function getWuxingRelation(tian: string, ren: string): string {
  if (tian === ren) return "比和";
  if (WUXING_SHENG[tian] === ren) return "相生";
  if (WUXING_SHENG[ren] === tian) return "被生";
  if (WUXING_KE[tian] === ren) return "相克";
  if (WUXING_KE[ren] === tian) return "被克";
  return "无";
}

// 数理对应五行（尾数）
const NUMBER_WUXING: Record<number, string> = {
  1: "木",
  2: "木",
  3: "火",
  4: "火",
  5: "土",
  6: "土",
  7: "金",
  8: "金",
  9: "水",
  0: "水",
};

// ============================================================================
// 核心函数
// ============================================================================

/**
 * 查询汉字的康熙笔画和五行属性
 */
export function getCharInfo(char: string): CharInfo {
  const entry = kangxiDict[char];
  if (entry) {
    return {
      char,
      strokes: entry.strokes,
      wuxing: entry.wuxing,
      pinyin: entry.pinyin,
      meaning: entry.meaning,
      found: true,
    };
  }
  // 未收录字：使用简体笔画数作为近似值
  const fallbackStrokes = countSimplifiedStrokes(char);
  return {
    char,
    strokes: fallbackStrokes,
    wuxing: "土",
    pinyin: "?",
    meaning: "（字典未收录，笔画为近似值）",
    found: false,
  };
}

/**
 * 简体字笔画计数（近似值，用于字典未收录的字）
 */
function countSimplifiedStrokes(char: string): number {
  if (!char || char.length === 0) return 1;
  // 常见偏旁部首笔画近似
  const strokeMap: Record<string, number> = {
    "氵": 3, "扌": 3, "纟": 3, "讠": 2, "辶": 3,
    "阝": 2, "饣": 3, "忄": 3, "宀": 3, "冖": 2,
    "十": 2, "厂": 2, "广": 3, "门": 3,
  };
  // 简单返回一个合理值（对于常见汉字大多数在3-25画之间）
  let count = 1;
  for (const ch of char) {
    const code = ch.charCodeAt(0);
    if (code < 0x4e00 || code > 0x9fff) {
      // 非汉字
      count += 1;
    } else {
      // 使用Unicode码点做粗略估算
      count += Math.floor((code - 0x4e00) / 500) + 4;
    }
  }
  return Math.min(Math.max(count, 1), 30);
}

/**
 * 将笔画数转换为81数理索引
 */
function strokesTo81(strokes: number): number {
  if (strokes <= 0) return 1;
  const n = strokes % 81;
  return n === 0 ? 81 : n;
}

/**
 * 获取81数理吉凶信息
 */
export function get81Fortune(strokes: number): {
  number: number;
  fortune: Fortune;
  title: string;
  desc: string;
} {
  const num = strokesTo81(strokes);
  const entry = wuge81[num];
  if (!entry) {
    return { number: num, fortune: "半吉半凶", title: "未知", desc: "数理信息缺失" };
  }
  return {
    number: entry.n,
    fortune: entry.f,
    title: entry.t,
    desc: entry.m,
  };
}

/**
 * 获取数理对应的五行（基于尾数）
 */
export function getNumberWuxing(strokes: number): string {
  const lastDigit = strokes % 10;
  return NUMBER_WUXING[lastDigit] || "土";
}

/**
 * 计算五格
 */
export function calculateWuge(
  surnameChars: string[],
  givenNameChars: string[]
): {
  tiange: number;
  renge: number;
  dige: number;
  waige: number;
  zongge: number;
} {
  const isCompoundSurname = surnameChars.length >= 2;
  const isSingleGivenName = givenNameChars.length === 1;

  const surnameStrokes = surnameChars.map((c) => getCharInfo(c).strokes);
  const givenNameStrokes = givenNameChars.map((c) => getCharInfo(c).strokes);

  let tiange: number;
  let renge: number;
  let dige: number;
  let waige: number;
  let zongge: number;

  if (isCompoundSurname) {
    // 复姓
    tiange = surnameStrokes[0] + surnameStrokes[1];
    renge = surnameStrokes[1] + givenNameStrokes[0];
  } else {
    // 单姓
    tiange = surnameStrokes[0] + 1;
    renge = surnameStrokes[0] + givenNameStrokes[0];
  }

  if (isSingleGivenName) {
    dige = givenNameStrokes[0] + 1;
  } else {
    dige = givenNameStrokes[0] + givenNameStrokes[1];
  }

  // 外格
  if (isCompoundSurname && !isSingleGivenName) {
    waige = surnameStrokes[0] + givenNameStrokes[1];
  } else if (isCompoundSurname && isSingleGivenName) {
    waige = surnameStrokes[0] + 1;
  } else if (!isCompoundSurname && !isSingleGivenName) {
    waige = givenNameStrokes[1] + 1;
  } else {
    // 单名单姓 → 外格 = 1
    waige = 1;
  }

  // 总格
  zongge = [...surnameStrokes, ...givenNameStrokes].reduce((a, b) => a + b, 0);

  return { tiange, renge, dige, waige, zongge };
}

/**
 * 构建格信息
 */
function buildGeInfo(
  name: string,
  strokes: number
): GeInfo {
  const fortune = get81Fortune(strokes);
  return {
    name,
    number: fortune.number,
    fortune: fortune.fortune,
    title: fortune.title,
    desc: fortune.desc,
    wuxing: getNumberWuxing(fortune.number),
  };
}

/**
 * 计算五行平衡
 */
function calculateWuxingBalance(geList: GeInfo[]): {
  金: number;
  木: number;
  水: number;
  火: number;
  土: number;
  analysis: string;
} {
  const balance = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
  for (const ge of geList) {
    if (balance[ge.wuxing as keyof typeof balance] !== undefined) {
      balance[ge.wuxing as keyof typeof balance]++;
    }
  }

  const max = Math.max(...Object.values(balance));
  const min = Math.min(...Object.values(balance));
  const hasZero = Object.values(balance).includes(0);

  let analysis: string;
  if (max - min <= 1 && !hasZero) {
    analysis = "五行分布均衡，各方面运势较为协调，无明显偏颇。";
  } else if (hasZero) {
    const missing = Object.entries(balance)
      .filter(([_, v]) => v === 0)
      .map(([k]) => k)
      .join("、");
    analysis = `五行中缺${missing}，建议在日常生活中适当补充${missing}元素，以达平衡。`;
  } else if (max >= 3) {
    const dominant = Object.entries(balance)
      .find(([_, v]) => v === max)?.[0];
    analysis = `五行中${dominant}旺，个性偏向${getWuxingTrait(dominant || "土")}，宜适度调和。`;
  } else {
    analysis = "五行分布尚可，整体较为协调，略有偏向但影响不大。";
  }

  return { ...balance, analysis };
}

/**
 * 五行特性描述
 */
function getWuxingTrait(wx: string): string {
  const traits: Record<string, string> = {
    金: "刚毅果断、重义轻财",
    木: "仁慈善良、积极向上",
    水: "智慧灵活、善于交际",
    火: "热情奔放、礼节周到",
    土: "忠厚诚信、脚踏实地",
  };
  return traits[wx] || "稳重踏实";
}

/**
 * 计算综合评分
 */
function calculateScore(geList: GeInfo[], balance: { analysis: string }): {
  score: number;
  rating: string;
  summary: string;
  suggestions: string[];
} {
  let score = 0;
  const suggestions: string[] = [];

  // 五格权重：人格35%，总格25%，天格15%，地格15%，外格10%
  const weights = [0.15, 0.35, 0.15, 0.1, 0.25]; // 天、人、地、外、总
  const labels = ["天格", "人格", "地格", "外格", "总格"];

  for (let i = 0; i < geList.length; i++) {
    const ge = geList[i];
    let geScore = 50;
    switch (ge.fortune) {
      case "大吉":
        geScore = 95;
        break;
      case "吉":
        geScore = 75;
        break;
      case "半吉半凶":
        geScore = 55;
        break;
      case "凶":
        geScore = 30;
        break;
      case "大凶":
        geScore = 15;
        break;
    }
    score += geScore * weights[i];

    if (ge.fortune === "凶" || ge.fortune === "大凶") {
      suggestions.push(`${labels[i]}（${ge.number}·${ge.title}）为${ge.fortune}，建议考虑调整用字以改善此格运势。`);
    }
  }

  // 五行平衡加成
  if (balance.analysis.includes("均衡")) {
    score += 5;
  } else if (balance.analysis.includes("缺")) {
    score -= 5;
  }

  score = Math.round(Math.max(0, Math.min(100, score)));

  let rating: string;
  if (score >= 90) rating = "大吉";
  else if (score >= 75) rating = "吉";
  else if (score >= 55) rating = "半吉";
  else if (score >= 35) rating = "小凶";
  else rating = "凶";

  const summary = `姓名"${geList.map(g => g).length > 0 ? "整体" : ""}"综合评分为${score}分，属于"${rating}"等级。${
    score >= 75
      ? "姓名数理配置较好，有助于运势发展。"
      : score >= 55
      ? "姓名数理中等，有些方面尚可改善。"
      : "姓名数理配置欠佳，建议考虑调整名字用字。"
  }`;

  if (suggestions.length === 0 && score >= 75) {
    suggestions.push("各格数理配置良好，五行分布协调，可继续保持。");
  }

  return { score, rating, summary, suggestions };
}

/**
 * 主入口：姓名解析
 *
 * @param fullName 完整姓名（不含空格）
 * @param surnameLength 姓氏字数（默认1，复姓传2）
 */
export function analyzeName(
  fullName: string,
  surnameLength: number = 1
): NameAnalysisResult {
  const chars = Array.from(fullName);
  const surnameChars = chars.slice(0, surnameLength);
  const givenNameChars = chars.slice(surnameLength);
  const isCompoundSurname = surnameLength >= 2;
  const isSingleGivenName = givenNameChars.length === 1;

  // 获取每个字的康熙字典信息
  const charInfos = chars.map((c) => getCharInfo(c));
  const totalStrokes = charInfos.reduce((sum, c) => sum + c.strokes, 0);

  // 计算五格
  const wuge = calculateWuge(surnameChars, givenNameChars);

  // 构建五格信息
  const tiange = buildGeInfo("天格", wuge.tiange);
  const renge = buildGeInfo("人格", wuge.renge);
  const dige = buildGeInfo("地格", wuge.dige);
  const waige = buildGeInfo("外格", wuge.waige);
  const zongge = buildGeInfo("总格", wuge.zongge);

  const geList = [tiange, renge, dige, waige, zongge];

  // 五行平衡分析
  const wuxingResult = calculateWuxingBalance(geList);

  // 综合评分
  const scoreResult = calculateScore(geList, { analysis: wuxingResult.analysis });

  return {
    name: fullName,
    surname: surnameChars.join(""),
    givenName: givenNameChars.join(""),
    isCompoundSurname,
    isSingleGivenName,
    chars: charInfos,
    totalStrokes,
    tiange,
    renge,
    dige,
    waige,
    zongge,
    wuxingBalance: {
      金: wuxingResult.金,
      木: wuxingResult.木,
      水: wuxingResult.水,
      火: wuxingResult.火,
      土: wuxingResult.土,
    },
    wuxingAnalysis: wuxingResult.analysis,
    overallScore: scoreResult.score,
    overallRating: scoreResult.rating,
    summary: scoreResult.summary,
    suggestions: scoreResult.suggestions,
  };
}

/**
 * 吉凶颜色映射
 */
export function getFortuneColor(fortune: Fortune): string {
  switch (fortune) {
    case "大吉":
      return "#D427B5";
    case "吉":
      return "#3E9B3E";
    case "半吉半凶":
      return "#E08020";
    case "凶":
      return "#D93030";
    case "大凶":
      return "#8B0000";
    default:
      return "#888";
  }
}

/**
 * 评分等级颜色
 */
export function getScoreColor(score: number): string {
  if (score >= 90) return "#D427B5";
  if (score >= 75) return "#3E9B3E";
  if (score >= 55) return "#E08020";
  return "#D93030";
}

/**
 * 生肖喜用字查询
 */
export function getZodiacPrefs(zodiac: string): {
  prefer: string[];
  avoid: string[];
} {
  const zodiacPrefs: Record<string, { prefer: string[]; avoid: string[] }> = {
    "鼠": {
      prefer: ["米", "禾", "豆", "口", "宀", "穴", "水", "子"],
      avoid: ["马", "羊", "日", "火", "巳", "刀"],
    },
    "牛": {
      prefer: ["水", "艹", "田", "禾", "豆", "宀"],
      avoid: ["马", "羊", "心", "忄", "日"],
    },
    "虎": {
      prefer: ["山", "林", "木", "水", "王", "大"],
      avoid: ["申", "猴", "蛇", "巳", "日", "光"],
    },
    "兔": {
      prefer: ["月", "艹", "木", "禾", "口", "宀"],
      avoid: ["鸡", "酉", "金", "刀", "日"],
    },
    "龙": {
      prefer: ["水", "王", "大", "日", "月", "星", "云", "雨"],
      avoid: ["狗", "戌", "木", "卯", "兔"],
    },
    "蛇": {
      prefer: ["口", "宀", "木", "田", "艹", "虫"],
      avoid: ["猪", "亥", "水", "日", "虎"],
    },
    "马": {
      prefer: ["艹", "禾", "豆", "木", "衣", "彡"],
      avoid: ["鼠", "子", "水", "牛", "丑"],
    },
    "羊": {
      prefer: ["艹", "木", "禾", "豆", "米", "田"],
      avoid: ["牛", "丑", "狗", "戌", "日"],
    },
    "猴": {
      prefer: ["木", "禾", "口", "宀", "人", "王"],
      avoid: ["虎", "寅", "刀", "火", "巳"],
    },
    "鸡": {
      prefer: ["米", "禾", "豆", "虫", "金", "山"],
      avoid: ["兔", "卯", "水", "犬", "戌"],
    },
    "狗": {
      prefer: ["人", "入", "小", "宀", "彳", "心", "忄"],
      avoid: ["龙", "辰", "日", "鸡", "酉"],
    },
    "猪": {
      prefer: ["豆", "米", "禾", "艹", "宀", "门"],
      avoid: ["蛇", "巳", "猴", "申", "刀"],
    },
  };
  return zodiacPrefs[zodiac] || { prefer: [], avoid: [] };
}

/**
 * 合规免责声明
 */
export const NAME_DISCLAIMER =
  "以上分析基于传统五格剖象法及康熙字典笔画，仅供传统文化学习研究参考，不构成人生决策依据。";
