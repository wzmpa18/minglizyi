// ============================================================================
// 八字合号匹配算法 - v19.7
// 功能：将手机号/车牌号的五行属性与用户八字五行喜忌做匹配计算
// 核心逻辑：复用现有八字排盘内核提取五行喜忌，新增匹配评分算法
// 不改动任何核心排盘算法
// ============================================================================

import type { BaziResult, WuXing } from "@/algorithm-core";

// ==================== 数字五行映射（河图洛书） ====================
export const DIGIT_WUXING: Record<string, string> = {
  "0": "土", "1": "水", "2": "火", "3": "木", "4": "金",
  "5": "土", "6": "水", "7": "火", "8": "木", "9": "金",
};

// ==================== 五行相生相克关系 ====================
// 相生：金生水、水生木、木生火、火生土、土生金
// 相克：金克木、木克土、土克水、水克火、火克金
const WUXING_SHENG: Record<string, string> = {
  "金": "水", "水": "木", "木": "火", "火": "土", "土": "金",
};
const WUXING_KE: Record<string, string> = {
  "金": "木", "木": "土", "土": "水", "水": "火", "火": "金",
};

// ==================== 类型定义 ====================
export interface BaziWuxingAnalysis {
  dayMaster: string;          // 日主天干
  dayMasterWuxing: string;    // 日主五行
  wuxingCount: Record<string, number>; // 八字五行统计
  wuxingStrength: Record<string, "旺" | "平" | "弱">; // 五行强弱
  isDayMasterStrong: boolean; // 日主是否偏强
  favorableElements: string[]; // 喜用神（有利的五行）
  unfavorableElements: string[]; // 忌神（不利的五行）
  summary: string;            // 五行分析摘要
}

export interface NumberMatchResult {
  number: string;             // 号码
  wuxingCount: Record<string, number>; // 号码五行统计
  wuxingBalance: string;      // 五行格局描述
  matchScore: number;         // 五行匹配度评分 (0-100)
  auspiciousScore: number;    // 吉凶评分 (0-100)
  totalScore: number;         // 综合评分 (0-100)
  matchLevel: "极佳" | "优良" | "一般" | "不佳"; // 匹配等级
  favorableHits: string[];    // 命中喜用神的五行
  unfavorableHits: string[];  // 命中忌神的五行
  analysis: string;           // 分析说明
  recommendation: string;     // 推荐理由
}

export interface BatchMatchResult {
  baziAnalysis: BaziWuxingAnalysis;
  results: NumberMatchResult[]; // 全部号码匹配结果（已排序）
  top3: NumberMatchResult[];   // TOP3推荐
  totalNumbers: number;        // 总号码数
  duplicates: number;          // 去重数量
}

// ==================== 八字五行分析 ====================
export function analyzeBaziWuxing(baziResult: BaziResult): BaziWuxingAnalysis {
  const dayGan = baziResult.dayGan;
  // 从天干获取日主五行
  const ganWuxingMap: Record<string, string> = {
    "甲": "木", "乙": "木", "丙": "火", "丁": "火",
    "戊": "土", "己": "土", "庚": "金", "辛": "金",
    "壬": "水", "癸": "水",
  };
  const dayMasterWuxing = ganWuxingMap[dayGan] || "土";

  // 统计八字四柱五行
  const wuxingCount: Record<string, number> = { "金": 0, "木": 0, "水": 0, "火": 0, "土": 0 };
  const zhiWuxingMap: Record<string, string> = {
    "子": "水", "丑": "土", "寅": "木", "卯": "木", "辰": "土",
    "巳": "火", "午": "火", "未": "土", "申": "金", "酉": "金",
    "戌": "土", "亥": "水",
  };

  for (const pillar of baziResult.pillars) {
    // 天干五行
    const ganWx = ganWuxingMap[pillar.gan] || "土";
    wuxingCount[ganWx] = (wuxingCount[ganWx] || 0) + 1;
    // 地支五行
    const zhiWx = zhiWuxingMap[pillar.zhi] || "土";
    wuxingCount[zhiWx] = (wuxingCount[zhiWx] || 0) + 1;
    // 藏干五行（加分）
    if (pillar.canggan) {
      for (const cg of pillar.canggan) {
        const cgWx = ganWuxingMap[cg] || "土";
        wuxingCount[cgWx] = (wuxingCount[cgWx] || 0) + 0.5;
      }
    }
  }

  // 判断日主强弱（基于身强身弱结果）
  const isDayMasterStrong = baziResult.shenQiangRuo?.result?.includes("偏强") ||
                            baziResult.shenQiangRuo?.result?.includes("旺") ||
                            (baziResult.shenQiangRuo?.totalScore ?? 0) > 50;

  // 确定喜用神
  // 日主偏强：喜克、泄、耗（克我者、我生者、我克者）
  // 日主偏弱：喜生、帮（生我者、同我者）
  const favorableElements: string[] = [];
  const unfavorableElements: string[] = [];

  if (isDayMasterStrong) {
    // 偏强：需要克制、泄耗
    // 克我者（官杀）
    const keMe = Object.keys(WUXING_KE).find(k => WUXING_KE[k] === dayMasterWuxing) || "";
    // 我生者（食伤）
    const woSheng = WUXING_SHENG[dayMasterWuxing] || "";
    // 我克者（财星）
    const woKe = WUXING_KE[dayMasterWuxing] || "";
    favorableElements.push(keMe, woSheng, woKe);
    // 忌神：生我者、同我者
    const shengMe = Object.keys(WUXING_SHENG).find(k => WUXING_SHENG[k] === dayMasterWuxing) || "";
    unfavorableElements.push(shengMe, dayMasterWuxing);
  } else {
    // 偏弱：需要生扶、帮助
    // 生我者（印星）
    const shengMe = Object.keys(WUXING_SHENG).find(k => WUXING_SHENG[k] === dayMasterWuxing) || "";
    // 同我者（比劫）
    favorableElements.push(shengMe, dayMasterWuxing);
    // 忌神：克我者、我生者、我克者
    const keMe = Object.keys(WUXING_KE).find(k => WUXING_KE[k] === dayMasterWuxing) || "";
    const woSheng = WUXING_SHENG[dayMasterWuxing] || "";
    const woKe = WUXING_KE[dayMasterWuxing] || "";
    unfavorableElements.push(keMe, woSheng, woKe);
  }

  // 五行强弱描述
  const wuxingStrength: Record<string, "旺" | "平" | "弱"> = {};
  const maxCount = Math.max(...Object.values(wuxingCount));
  const minCount = Math.min(...Object.values(wuxingCount));
  for (const [wx, count] of Object.entries(wuxingCount)) {
    if (count >= maxCount * 0.7) wuxingStrength[wx] = "旺";
    else if (count <= minCount * 1.3) wuxingStrength[wx] = "弱";
    else wuxingStrength[wx] = "平";
  }

  const summary = `日主${dayGan}（${dayMasterWuxing}），${isDayMasterStrong ? "偏强" : "偏弱"}，` +
    `喜用神：${favorableElements.join("、")}，忌神：${unfavorableElements.join("、")}`;

  return {
    dayMaster: dayGan,
    dayMasterWuxing,
    wuxingCount,
    wuxingStrength,
    isDayMasterStrong,
    favorableElements,
    unfavorableElements,
    summary,
  };
}

// ==================== 号码五行分析 ====================
export function analyzeNumberWuxing(number: string): {
  wuxingCount: Record<string, number>;
  wuxingBalance: string;
} {
  const digits = number.replace(/\D/g, "");
  const wuxingCount: Record<string, number> = { "金": 0, "木": 0, "水": 0, "火": 0, "土": 0 };
  for (const d of digits) {
    const wx = DIGIT_WUXING[d];
    if (wx) wuxingCount[wx]++;
  }
  const entries = Object.entries(wuxingCount).sort((a, b) => b[1] - a[1]);
  const maxWx = entries[0][0];
  const minWx = entries[entries.length - 1][0];
  return {
    wuxingCount,
    wuxingBalance: `${maxWx}旺${minWx}弱`,
  };
}

// ==================== 号码吉凶基础评分 ====================
function calculateAuspiciousScore(number: string): number {
  const digits = number.replace(/\D/g, "");
  if (digits.length < 4) return 50;

  let score = 50;
  // 尾数吉数加分
  const tail = digits.slice(-2);
  const auspiciousTails = ["18", "28", "38", "68", "78", "88", "98", "13", "23", "33", "63", "73", "83", "93", "19", "29", "39", "69", "79", "89", "99", "14", "24", "34", "64", "74", "84", "94", "16", "26", "36", "66", "76", "86", "96"];
  if (auspiciousTails.includes(tail)) score += 15;

  // 连号加分
  if (/(\d)\1{2,}/.test(digits)) score += 10; // 三连及以上
  // 递增/递减
  if (/(0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210)/.test(digits)) score += 10;

  // 含4减分
  const count4 = (digits.match(/4/g) || []).length;
  score -= count4 * 3;

  // 含8加分
  const count8 = (digits.match(/8/g) || []).length;
  score += count8 * 2;

  // 含6加分
  const count6 = (digits.match(/6/g) || []).length;
  score += count6 * 2;

  // 五行平衡
  const { wuxingCount } = analyzeNumberWuxing(number);
  const counts = Object.values(wuxingCount);
  const maxC = Math.max(...counts);
  const minC = Math.min(...counts);
  if (maxC - minC <= 2) score += 8; // 五行较平衡
  if (maxC - minC >= 5) score -= 8; // 五行严重偏颇

  return Math.max(10, Math.min(100, score));
}

// ==================== 号码与八字匹配评分 ====================
export function matchNumberWithBazi(
  number: string,
  baziAnalysis: BaziWuxingAnalysis
): NumberMatchResult {
  const { wuxingCount, wuxingBalance } = analyzeNumberWuxing(number);
  const auspiciousScore = calculateAuspiciousScore(number);

  // 计算五行匹配度
  let matchScore = 50;
  const favorableHits: string[] = [];
  const unfavorableHits: string[] = [];

  for (const [wx, count] of Object.entries(wuxingCount)) {
    if (count === 0) continue;
    if (baziAnalysis.favorableElements.includes(wx)) {
      // 命中喜用神：加分
      matchScore += count * 8;
      favorableHits.push(wx);
    }
    if (baziAnalysis.unfavorableElements.includes(wx)) {
      // 命中忌神：减分
      matchScore -= count * 5;
      unfavorableHits.push(wx);
    }
  }

  matchScore = Math.max(10, Math.min(100, matchScore));

  // 综合评分 = 匹配度 * 0.6 + 吉凶 * 0.4
  const totalScore = Math.round(matchScore * 0.6 + auspiciousScore * 0.4);

  // 匹配等级
  let matchLevel: NumberMatchResult["matchLevel"] = "一般";
  if (totalScore >= 80) matchLevel = "极佳";
  else if (totalScore >= 65) matchLevel = "优良";
  else if (totalScore >= 45) matchLevel = "一般";
  else matchLevel = "不佳";

  // 分析说明
  const analysis = `号码五行：${wuxingBalance}。` +
    (favorableHits.length > 0 ? `命中喜用神【${favorableHits.join("、")}】，` : "未命中喜用神，") +
    (unfavorableHits.length > 0 ? `含忌神【${unfavorableHits.join("、")}】，` : "") +
    `吉凶评分${auspiciousScore}，匹配度${matchScore}。`;

  // 推荐理由
  let recommendation = "";
  if (matchLevel === "极佳") {
    recommendation = "强烈推荐！此号码五行与八字高度契合，吉凶评分优秀，是最佳选择。";
  } else if (matchLevel === "优良") {
    recommendation = "推荐！此号码五行与八字较为匹配，整体吉凶良好，值得考虑。";
  } else if (matchLevel === "一般") {
    recommendation = "此号码五行匹配度一般，可作备选，建议优先考虑评分更高的号码。";
  } else {
    recommendation = "不建议选择此号码，五行与八字匹配度较低，可能存在不利影响。";
  }

  return {
    number,
    wuxingCount,
    wuxingBalance,
    matchScore,
    auspiciousScore,
    totalScore,
    matchLevel,
    favorableHits,
    unfavorableHits,
    analysis,
    recommendation,
  };
}

// ==================== 批量匹配主函数 ====================
export function batchMatchNumbers(
  numbers: string[],
  baziResult: BaziResult,
  type?: "phone" | "carplate"
): BatchMatchResult {
  // 去重（手机号提取纯数字，车牌号保留完整格式）
  const isPhone = type !== "carplate";
  const processNum = (n: string): string => {
    const trimmed = n.trim();
    if (isPhone) {
      return trimmed.replace(/\D/g, "");
    }
    return trimmed;
  };
  const uniqueNumbers = [...new Set(numbers.map(processNum).filter(n => isPhone ? n.length >= 7 : n.length >= 2))];
  const duplicates = numbers.length - uniqueNumbers.length;

  // 分析八字五行
  const baziAnalysis = analyzeBaziWuxing(baziResult);

  // 逐个匹配
  const results = uniqueNumbers.map(num => matchNumberWithBazi(num, baziAnalysis));

  // 按综合评分排序（降序）
  results.sort((a, b) => b.totalScore - a.totalScore);

  // 取TOP3
  const top3 = results.slice(0, 3);

  return {
    baziAnalysis,
    results,
    top3,
    totalNumbers: uniqueNumbers.length,
    duplicates,
  };
}

// ==================== 号码提取（从OCR文本中提取手机号） ====================
export function extractPhoneNumbersFromText(text: string): string[] {
  // 匹配11位手机号（1开头）
  const phoneRegex = /1[3-9]\d{9}/g;
  const matches = text.match(phoneRegex) || [];
  return [...new Set(matches)];
}

// ==================== 车牌号提取（从OCR文本中提取车牌号） ====================
export function extractCarplatesFromText(text: string): string[] {
  // 匹配中国大陆车牌号格式
  const plateRegex = /[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤川青藏琼宁][A-Z][A-HJ-NP-Z0-9]{4,5}/g;
  const matches = text.match(plateRegex) || [];
  return [...new Set(matches)];
}
