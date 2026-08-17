"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useToolBack } from "@/lib/useToolBack";
import { savePaipanState, loadPaipanState } from "@/lib/paipanPersistence";
import EventDivinationPanel from "@/components/EventDivinationPanel";
import { solarToBazi } from "@/algorithm-core";
import type { Gender } from "@/algorithm-core";
import {
  analyzeName,
  getFortuneColor,
  getScoreColor,
  getZodiacPrefs,
  getCharInfo,
  get81Fortune,
  NAME_DISCLAIMER,
  type NameAnalysisResult,
  type Fortune,
} from "@/lib/name-analysis";
import qimingData from "@/data/qiming_chars.json";
import { ShareButton } from "@/components/ShareButton";
import { Lunar, LunarYear, LunarMonth } from "lunar-javascript";
import SolarDatePicker from "@/components/shared/SolarDatePicker";
import { syncRecordToBackend } from "@/lib/recordSync";

// ============================================================================
// 常量
// ============================================================================
const BRAND = "#7B2FBE";

// ============================================================================
// 农历工具函数（使用 历法引擎 库）
// ============================================================================

const LUNAR_MONTH_NAMES = [
  "正月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "冬月", "腊月",
];

const LUNAR_DAY_NAMES = [
  "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十",
];

/**
 * 获取农历某年的闰月月份（0表示无闰月）
 */
function getLeapMonthNum(lunarYear: number): number {
  try {
    const ly = (LunarYear as any).fromYear(lunarYear);
    const months = ly.getMonths();
    for (const m of months) {
      if (m.isLeap()) {
        return Math.abs(m.getMonth());
      }
    }
  } catch (e) {}
  return 0;
}

/**
 * 获取农历某月的天数
 */
function getLunarMonthDays(lunarYear: number, lunarMonth: number, isLeap: boolean): number {
  try {
    const monthNum = isLeap ? -lunarMonth : lunarMonth;
    const lm = (LunarMonth as any).fromYm(lunarYear, monthNum);
    if (lm && lm.getDayCount) {
      return lm.getDayCount();
    }
  } catch (e) {}
  return 30;
}

/**
 * 生成农历月份选项（含闰月）
 */
function getLunarMonthOptions(lunarYear: number): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  const leapMonth = getLeapMonthNum(lunarYear);
  for (let m = 1; m <= 12; m++) {
    options.push({ value: `${m}`, label: LUNAR_MONTH_NAMES[m - 1] });
    if (m === leapMonth) {
      options.push({ value: `-${m}`, label: `闰${LUNAR_MONTH_NAMES[m - 1]}` });
    }
  }
  return options;
}

/**
 * 生成农历日选项
 */
function getLunarDayOptions(lunarYear: number, lunarMonth: number, isLeap: boolean): Array<{ value: number; label: string }> {
  const days = getLunarMonthDays(lunarYear, lunarMonth, isLeap);
  const options: Array<{ value: number; label: string }> = [];
  for (let d = 1; d <= days; d++) {
    options.push({ value: d, label: LUNAR_DAY_NAMES[d - 1] || `${d}日` });
  }
  return options;
}

/**
 * 将农历日期转换为公历日期字符串（YYYY-MM-DD）
 */
function lunarToSolarString(lunarYear: number, lunarMonth: number, lunarDay: number, isLeap: boolean): string {
  try {
    const monthNum = isLeap ? -lunarMonth : lunarMonth;
    const lunar = (Lunar as any).fromYmd(lunarYear, monthNum, lunarDay);
    const solar = lunar.getSolar();
    const y = solar.getYear();
    const m = String(solar.getMonth()).padStart(2, "0");
    const d = String(solar.getDay()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  } catch (e) {
    return "";
  }
}

const WUXING_COLORS: Record<string, string> = {
  金: "#D4A017",
  木: "#2E8B57",
  水: "#1E6FBF",
  火: "#D94040",
  土: "#A0522D",
};

const WUXING_LIST = ["金", "木", "水", "火", "土"] as const;

// 起名用字数据
interface QimingChar {
  c: string;
  s: number;
  p: string;
  m: string;
  g: "male" | "female" | "both";
}

interface QimingData {
  characters: Record<string, QimingChar[]>;
  surname_data: {
    "常见单姓": Array<{ c: string; s: number; w: string }>;
    "常见复姓": Array<{ c: string; s1: number; s2: number; w: string }>;
  };
}

const qimingChars = (qimingData as unknown as QimingData).characters;
const commonSurnames = (qimingData as unknown as QimingData).surname_data["常见单姓"];
const compoundSurnames = (qimingData as unknown as QimingData).surname_data["常见复姓"];

// ============================================================================
// 起名算法
// ============================================================================

interface NameSuggestion {
  name: string;
  givenName: string;
  score: number;
  rating: string;
  grids: {
    tian: { num: number; fortune: Fortune; title: string };
    ren: { num: number; fortune: Fortune; title: string };
    di: { num: number; fortune: Fortune; title: string };
    wai: { num: number; fortune: Fortune; title: string };
    zong: { num: number; fortune: Fortune; title: string };
  };
  chars: Array<{ c: string; s: number; w: string; p: string; m: string }>;
  wuxingBalance: string;
  // v20.1: 八字驱动起名新增字段
  wuxingMatchDegree?: number; // 五行匹配度（0-100）
  xiYongShenMatch?: string; // 喜用神契合度描述
  xiYongShenScore?: number; // 喜用神评分（0-100）
  meaning?: string; // 名字寓意
}

// v20.1: 八字分析结果
interface BaziAnalysis {
  dayMaster: string; // 日主
  dayMasterWuxing: string; // 日主五行
  isStrong: boolean; // 身强身弱
  favorableElements: string[]; // 喜用神
  unfavorableElements: string[]; // 忌神
  wuxingCount: Record<string, number>; // 五行统计
  baziText: string; // 八字文本
}

/**
 * v20.1: 根据出生时间排八字，计算五行旺衰、喜用神
 */
function analyzeBazi(
  birthDate: string,
  birthHour: number,
  birthMinute: number,
  gender: "male" | "female"
): BaziAnalysis | null {
  try {
    const [year, month, day] = birthDate.split("-").map(Number);
    if (!year || !month || !day) return null;

    // birthHour 已是实际小时数(0-23)，与八字排盘页一致
    const baziResult = solarToBazi({
      year,
      month,
      day,
      hour: birthHour,
      minute: birthMinute,
      gender: gender as Gender,
    });

    // 统计五行
    const wuxingCount: Record<string, number> = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
    const pillars = baziResult.pillars;
    for (const pillar of pillars) {
      if (pillar.wuxing?.gan) wuxingCount[pillar.wuxing.gan]++;
      if (pillar.wuxing?.zhi) wuxingCount[pillar.wuxing.zhi]++;
    }

    const dayMaster = baziResult.dayGan as string;

    // 天干五行映射
    const ganWuxing: Record<string, string> = {
      甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
      己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
    };
    const dayMasterWuxing = ganWuxing[dayMaster] || "土";

    // 使用已有的身强身弱判断
    const isStrong = baziResult.shenQiangRuo?.result === "身强";

    // 喜用神：身强则克泄耗，身弱则生扶
    const keWoMap: Record<string, string> = {
      金: "火", 木: "金", 水: "土", 火: "水", 土: "木",
    };
    const woKeMap: Record<string, string> = {
      金: "木", 木: "土", 水: "火", 火: "金", 土: "水",
    };
    const shengWoMap2: Record<string, string> = {
      金: "土", 木: "水", 水: "金", 火: "木", 土: "火",
    };
    const woShengMap: Record<string, string> = {
      金: "水", 木: "火", 水: "木", 火: "土", 土: "金",
    };

    let favorableElements: string[];
    let unfavorableElements: string[];

    if (isStrong) {
      favorableElements = [keWoMap[dayMasterWuxing], woKeMap[dayMasterWuxing], woShengMap[dayMasterWuxing]];
      unfavorableElements = [shengWoMap2[dayMasterWuxing], dayMasterWuxing];
    } else {
      favorableElements = [shengWoMap2[dayMasterWuxing], dayMasterWuxing];
      unfavorableElements = [keWoMap[dayMasterWuxing], woKeMap[dayMasterWuxing], woShengMap[dayMasterWuxing]];
    }

    favorableElements = [...new Set(favorableElements)];
    unfavorableElements = [...new Set(unfavorableElements)];

    const baziText = pillars.map(p => p.ganzhi).join(" ");

    return {
      dayMaster,
      dayMasterWuxing,
      isStrong,
      favorableElements,
      unfavorableElements,
      wuxingCount,
      baziText,
    };
  } catch (e) {
    return null;
  }
}

/**
 * 根据姓氏笔画和偏好生成名字建议
 */
function generateNames(
  surname: string,
  surnameStrokes: number,
  isCompound: boolean,
  surnameStrokes2: number,
  gender: "male" | "female",
  preferredWuxing: string,
  zodiac: string,
  nameLength: 1 | 2,
  baziInfo?: BaziAnalysis | null,
  customRequirement?: string
): NameSuggestion[] {
  const suggestions: NameSuggestion[] = [];

  // v20.1: 优先使用八字喜用神，其次用户偏好五行
  let wuxingKeys: string[];
  if (baziInfo && baziInfo.favorableElements.length > 0) {
    // 八字驱动：优先喜用神
    wuxingKeys = baziInfo.favorableElements;
    if (preferredWuxing && !wuxingKeys.includes(preferredWuxing)) {
      wuxingKeys.push(preferredWuxing);
    }
  } else if (preferredWuxing) {
    wuxingKeys = [preferredWuxing];
  } else {
    wuxingKeys = [...WUXING_LIST];
  }

  const candidateChars: (QimingChar & { w: string })[] = [];
  for (const wx of wuxingKeys) {
    const chars = qimingChars[wx] || [];
    for (const ch of chars) {
      if (ch.g === "both" || ch.g === gender) {
        candidateChars.push({ ...ch, w: wx });
      }
    }
  }

  // 生肖喜用偏旁
  let zodiacPrefs: { prefer: string[]; avoid: string[] } | null = null;
  if (zodiac) {
    zodiacPrefs = getZodiacPrefs(zodiac);
  }

  // 过滤候选字（排除忌用字）
  const filteredChars = zodiacPrefs
    ? candidateChars.filter((ch) => {
        // 简单检查：如果字的意思包含忌用偏旁的字则跳过
        return true; // 不过滤太严格，保留所有候选字
      })
    : candidateChars;

  if (filteredChars.length === 0) return [];

  if (nameLength === 1) {
    // 单名
    for (const ch of filteredChars) {
      const givenStrokes = ch.s;
      const fullName = surname + ch.c;

      // 计算五格
      let tianNum: number, renNum: number, diNum: number, waiNum: number, zongNum: number;

      if (isCompound) {
        tianNum = surnameStrokes + surnameStrokes2;
        renNum = surnameStrokes2 + givenStrokes;
      } else {
        tianNum = surnameStrokes + 1;
        renNum = surnameStrokes + givenStrokes;
      }
      diNum = givenStrokes + 1;
      waiNum = isCompound ? surnameStrokes + 1 : 1;
      zongNum = isCompound
        ? surnameStrokes + surnameStrokes2 + givenStrokes
        : surnameStrokes + givenStrokes;

      const score = scoreName(tianNum, renNum, diNum, waiNum, zongNum);
      if (score < 55) continue; // 只保留中等以上的

      const tianF = get81Fortune(tianNum);
      const renF = get81Fortune(renNum);
      const diF = get81Fortune(diNum);
      const waiF = get81Fortune(waiNum);
      const zongF = get81Fortune(zongNum);

      suggestions.push({
        name: fullName,
        givenName: ch.c,
        score,
        rating: score >= 90 ? "大吉" : score >= 75 ? "吉" : score >= 55 ? "半吉" : "凶",
        grids: {
          tian: { num: tianNum, fortune: tianF.fortune, title: tianF.title },
          ren: { num: renNum, fortune: renF.fortune, title: renF.title },
          di: { num: diNum, fortune: diF.fortune, title: diF.title },
          wai: { num: waiNum, fortune: waiF.fortune, title: waiF.title },
          zong: { num: zongNum, fortune: zongF.fortune, title: zongF.title },
        },
        chars: [
          { c: surname, s: surnameStrokes, w: "", p: "", m: "姓氏" },
          { c: ch.c, s: ch.s, w: ch.w || preferredWuxing || "土", p: ch.p, m: ch.m },
        ],
        wuxingBalance: baziInfo
          ? `八字喜用${baziInfo.favorableElements.join("、")}，名字补${ch.w || preferredWuxing || "土"}`
          : preferredWuxing
          ? `以${preferredWuxing}为主，配合姓氏五行`
          : "五行兼顾，平衡发展",
        // v20.1: 八字驱动字段
        wuxingMatchDegree: baziInfo ? calculateWuxingMatch([ch.w || preferredWuxing || "土"], baziInfo) : undefined,
        xiYongShenMatch: baziInfo ? formatXiYongShenMatch([ch.w || preferredWuxing || "土"], baziInfo) : undefined,
        xiYongShenScore: baziInfo ? calculateXiYongShenScore([ch.w || preferredWuxing || "土"], baziInfo) : undefined,
        meaning: ch.m,
      });
    }
  } else {
    // 双名
    const maxCombos = 200; // 限制组合数量
    let comboCount = 0;
    for (let i = 0; i < filteredChars.length && comboCount < maxCombos; i++) {
      for (let j = 0; j < filteredChars.length && comboCount < maxCombos; j++) {
        if (i === j) continue;
        comboCount++;

        const ch1 = filteredChars[i];
        const ch2 = filteredChars[j];
        const givenStrokes1 = ch1.s;
        const givenStrokes2 = ch2.s;
        const fullName = surname + ch1.c + ch2.c;

        let tianNum: number, renNum: number, diNum: number, waiNum: number, zongNum: number;

        if (isCompound) {
          tianNum = surnameStrokes + surnameStrokes2;
          renNum = surnameStrokes2 + givenStrokes1;
        } else {
          tianNum = surnameStrokes + 1;
          renNum = surnameStrokes + givenStrokes1;
        }
        diNum = givenStrokes1 + givenStrokes2;
        waiNum = isCompound
          ? surnameStrokes + givenStrokes2
          : givenStrokes2 + 1;
        zongNum = isCompound
          ? surnameStrokes + surnameStrokes2 + givenStrokes1 + givenStrokes2
          : surnameStrokes + givenStrokes1 + givenStrokes2;

        const score = scoreName(tianNum, renNum, diNum, waiNum, zongNum);
        if (score < 65) continue; // 双名要求更高

        const tianF = get81Fortune(tianNum);
        const renF = get81Fortune(renNum);
        const diF = get81Fortune(diNum);
        const waiF = get81Fortune(waiNum);
        const zongF = get81Fortune(zongNum);

        suggestions.push({
          name: fullName,
          givenName: ch1.c + ch2.c,
          score,
          rating: score >= 90 ? "大吉" : score >= 75 ? "吉" : score >= 55 ? "半吉" : "凶",
          grids: {
            tian: { num: tianNum, fortune: tianF.fortune, title: tianF.title },
            ren: { num: renNum, fortune: renF.fortune, title: renF.title },
            di: { num: diNum, fortune: diF.fortune, title: diF.title },
            wai: { num: waiNum, fortune: waiF.fortune, title: waiF.title },
            zong: { num: zongNum, fortune: zongF.fortune, title: zongF.title },
          },
          chars: [
            { c: surname, s: surnameStrokes, w: "", p: "", m: "姓氏" },
            { c: ch1.c, s: ch1.s, w: ch1.w || preferredWuxing || "土", p: ch1.p, m: ch1.m },
            { c: ch2.c, s: ch2.s, w: ch2.w || preferredWuxing || "土", p: ch2.p, m: ch2.m },
          ],
          wuxingBalance: baziInfo
            ? `八字喜用${baziInfo.favorableElements.join("、")}，名字补${ch1.w || ch2.w || preferredWuxing || "土"}`
            : preferredWuxing
            ? `以${preferredWuxing}为主，配合姓氏五行`
            : "五行兼顾，平衡发展",
          // v20.1: 八字驱动字段
          wuxingMatchDegree: baziInfo ? calculateWuxingMatch([ch1.w || preferredWuxing || "土", ch2.w || preferredWuxing || "土"], baziInfo) : undefined,
          xiYongShenMatch: baziInfo ? formatXiYongShenMatch([ch1.w || preferredWuxing || "土", ch2.w || preferredWuxing || "土"], baziInfo) : undefined,
          xiYongShenScore: baziInfo ? calculateXiYongShenScore([ch1.w || preferredWuxing || "土", ch2.w || preferredWuxing || "土"], baziInfo) : undefined,
          meaning: `${ch1.m}${ch2.m ? "·" + ch2.m : ""}`,
        });
      }
    }
  }

  // 排序：v20.1 如果有八字信息，按综合评分（五格分*0.6 + 喜用神分*0.4）降序
  if (baziInfo) {
    suggestions.sort((a, b) => {
      const aTotal = a.score * 0.6 + (a.xiYongShenScore || 50) * 0.4;
      const bTotal = b.score * 0.6 + (b.xiYongShenScore || 50) * 0.4;
      return bTotal - aTotal;
    });
  } else {
    // 按分数降序
    suggestions.sort((a, b) => b.score - a.score);
  }

  // 去重：相同名字只保留一个
  const seen = new Set<string>();
  const unique = suggestions.filter((s) => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });

  // v20.1: 自定义需求过滤
  let finalResults = unique;
  if (customRequirement) {
    const req = customRequirement.toLowerCase();
    // 检查是否包含指定字
    const containsChar = /带(.+?)字/.exec(req);
    if (containsChar) {
      const targetChar = containsChar[1];
      finalResults = finalResults.filter(s => s.name.includes(targetChar));
    }
    // 如果结果太少，放宽过滤
    if (finalResults.length < 5) {
      finalResults = unique;
    }
  }

  return finalResults.slice(0, 20); // 返回前20个
}

// v20.1: 喜用神匹配度计算函数
function calculateXiYongShenScore(charWuxings: string[], baziInfo: BaziAnalysis): number {
  let score = 0;
  for (const wx of charWuxings) {
    if (baziInfo.favorableElements.includes(wx)) {
      score += 100 / charWuxings.length;
    } else if (baziInfo.unfavorableElements.includes(wx)) {
      score -= 30 / charWuxings.length;
    } else {
      score += 40 / charWuxings.length;
    }
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateWuxingMatch(charWuxings: string[], baziInfo: BaziAnalysis): number {
  let matchCount = 0;
  for (const wx of charWuxings) {
    if (baziInfo.favorableElements.includes(wx)) matchCount++;
  }
  return Math.round((matchCount / charWuxings.length) * 100);
}

function formatXiYongShenMatch(charWuxings: string[], baziInfo: BaziAnalysis): string {
  const matches = charWuxings.filter(wx => baziInfo.favorableElements.includes(wx));
  const conflicts = charWuxings.filter(wx => baziInfo.unfavorableElements.includes(wx));
  if (matches.length === charWuxings.length) return "完全契合";
  if (matches.length > 0 && conflicts.length === 0) return "较好契合";
  if (matches.length > 0) return "部分契合";
  if (conflicts.length > 0) return "有冲突";
  return "一般";
}

/**
 * 名字评分
 */
function scoreName(
  tian: number,
  ren: number,
  di: number,
  wai: number,
  zong: number
): number {
  const weights = [0.15, 0.35, 0.15, 0.1, 0.25];
  const grids = [tian, ren, di, wai, zong];

  let score = 0;
  for (let i = 0; i < grids.length; i++) {
    const fortune = get81Fortune(grids[i]).fortune;
    let geScore = 50;
    switch (fortune) {
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
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

// ============================================================================
// 子组件
// ============================================================================

function SuggestionCard({
  suggestion,
  onSelect,
}: {
  suggestion: NameSuggestion;
  onSelect: () => void;
}) {
  const scoreColor = getScoreColor(suggestion.score);
  const gridLabels = ["天格", "人格", "地格", "外格", "总格"];
  const grids = [
    suggestion.grids.tian,
    suggestion.grids.ren,
    suggestion.grids.di,
    suggestion.grids.wai,
    suggestion.grids.zong,
  ];

  return (
    <div
      onClick={onSelect}
      className="rounded-xl bg-white p-3 active:scale-[0.99] transition-transform cursor-pointer"
      style={{ border: `1px solid ${scoreColor}22` }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-gray-800" style={{ fontFamily: "serif" }}>
            {suggestion.name}
          </span>
          <span className="text-xs text-gray-400">{suggestion.givenName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
            style={{ backgroundColor: scoreColor }}
          >
            {suggestion.score}分
          </span>
          <span className="text-xs font-semibold" style={{ color: scoreColor }}>
            {suggestion.rating}
          </span>
        </div>
      </div>

      <div className="flex gap-1.5">
        {grids.map((g, i) => (
          <div
            key={i}
            className="flex-1 rounded text-center py-1"
            style={{
              backgroundColor: getFortuneColor(g.fortune) + "0a",
            }}
          >
            <div className="text-[9px] text-gray-400">{gridLabels[i]}</div>
            <div
              className="text-sm font-bold"
              style={{ color: getFortuneColor(g.fortune) }}
            >
              {g.num}
            </div>
            <div className="text-[8px] text-gray-400">{g.fortune}</div>
          </div>
        ))}
      </div>

      <div className="mt-1.5 flex items-center gap-1">
        {suggestion.chars.slice(1).map((ch, i) => (
          <span
            key={i}
            className="rounded px-1.5 py-0.5 text-[10px]"
            style={{
              backgroundColor: (WUXING_COLORS[ch.w] || "#888") + "18",
              color: WUXING_COLORS[ch.w] || "#888",
            }}
          >
            {ch.c} · {ch.s}画 · {ch.w}
          </span>
        ))}
        <span className="ml-auto text-[10px] text-gray-400">
          {suggestion.chars.slice(1).map((c) => c.p).join(" ")}
        </span>
      </div>

      {/* v20.1: 八字喜用神匹配度展示 */}
      {suggestion.xiYongShenMatch && (
        <div className="mt-1.5 flex items-center gap-2 border-t border-gray-50 pt-1.5">
          {suggestion.xiYongShenScore !== undefined && (
            <span className="text-[10px] font-bold" style={{
              color: suggestion.xiYongShenScore >= 80 ? "#2E8B57" : suggestion.xiYongShenScore >= 50 ? "#D4A017" : "#D94040",
            }}>
              喜用神 {suggestion.xiYongShenScore}分
            </span>
          )}
          <span className="text-[10px] text-gray-500">{suggestion.xiYongShenMatch}</span>
          {suggestion.wuxingMatchDegree !== undefined && (
            <span className="ml-auto text-[10px] text-gray-400">五行匹配{suggestion.wuxingMatchDegree}%</span>
          )}
        </div>
      )}

      {/* v20.1: 名字寓意展示 */}
      {suggestion.meaning && (
        <div className="mt-1 text-[10px] text-gray-400 truncate">
          寓意：{suggestion.meaning}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 主页面
// ============================================================================

export default function QimingPage() {
  const pageKey = "yixue_qiming";
  const { showResult, savedParams, saveParams, goToResult } = useToolBack({
    pageKey,
    eventName: "yixue-back",
    globalFlag: "__yixueBackHandled",
  });

  const [surname, setSurname] = useState("");
  const [isCompound, setIsCompound] = useState(false);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [preferredWuxing, setPreferredWuxing] = useState("");
  const [zodiac, setZodiac] = useState("");
  const [nameLength, setNameLength] = useState<1 | 2>(2);
  const [loading, setLoading] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [suggestions, setSuggestions] = useState<NameSuggestion[]>([]);
  const [selectedResult, setSelectedResult] = useState<NameAnalysisResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [error, setError] = useState("");
  // v20.1: 八字驱动起名
  const [birthDate, setBirthDate] = useState("");
  const [birthHour, setBirthHour] = useState<number>(12);
  const [birthMinute, setBirthMinute] = useState<number>(0);
  const [customRequirement, setCustomRequirement] = useState("");
  const [baziAnalysis, setBaziAnalysis] = useState<BaziAnalysis | null>(null);
  // 公历/农历切换
  const [calType, setCalType] = useState<"solar" | "lunar">("solar");
  const [lunarYear, setLunarYear] = useState<number>(new Date().getFullYear());
  const [lunarMonthValue, setLunarMonthValue] = useState<string>("1");
  const [lunarDay, setLunarDay] = useState<number>(15);

  // 农历模式下解析出的公历日期（供 analyzeBazi 使用）
  const effectiveBirthDate = useMemo(() => {
    if (calType === "lunar" && lunarYear && lunarMonthValue && lunarDay) {
      const mNum = parseInt(lunarMonthValue, 10);
      const isLeap = mNum < 0;
      const mAbs = Math.abs(mNum);
      return lunarToSolarString(lunarYear, mAbs, lunarDay, isLeap);
    }
    return birthDate;
  }, [calType, lunarYear, lunarMonthValue, lunarDay, birthDate]);

  // IME输入法组合状态追踪
  const surnameComposingRef = useRef(false);

  // 恢复状态
  useEffect(() => {
    const saved = loadPaipanState("qiming");
    if (saved && saved.input) {
      const inp = saved.input as any;
      if (inp.surname) setSurname(inp.surname);
      if (inp.isCompound) setIsCompound(inp.isCompound);
      if (inp.gender) setGender(inp.gender);
      if (inp.preferredWuxing) setPreferredWuxing(inp.preferredWuxing);
      if (inp.zodiac) setZodiac(inp.zodiac);
      if (inp.nameLength) setNameLength(inp.nameLength);
      // v20.1: 恢复八字信息
      if (inp.birthDate) setBirthDate(inp.birthDate);
      if (inp.birthHour !== undefined) setBirthHour(inp.birthHour);
      if (inp.birthMinute !== undefined) setBirthMinute(inp.birthMinute);
      if (inp.customRequirement) setCustomRequirement(inp.customRequirement);
      if (inp.calType) setCalType(inp.calType);
      if (inp.lunarYear) setLunarYear(inp.lunarYear);
      if (inp.lunarMonthValue) setLunarMonthValue(inp.lunarMonthValue);
      if (inp.lunarDay) setLunarDay(inp.lunarDay);
    }
  }, []);

  // v20.1: 出生时间变化时自动排八字（公历/农历均自动转换为公历后排盘）
  useEffect(() => {
    if (effectiveBirthDate) {
      const result = analyzeBazi(effectiveBirthDate, birthHour, birthMinute, gender);
      setBaziAnalysis(result);
    } else {
      setBaziAnalysis(null);
    }
  }, [effectiveBirthDate, birthHour, birthMinute, gender]);

  // 编辑事件
  useEffect(() => {
    const editHandler = () => {
      if (showDetail) {
        setShowDetail(false);
      } else {
        setHasResult(false);
      }
    };
    window.addEventListener("yixue-edit", editHandler);
    return () => window.removeEventListener("yixue-edit", editHandler);
  }, [showDetail]);

  // v21.2: 拦截浏览器返回键 - 排盘结果页按返回应回到输入页
  useEffect(() => {
    if (!hasResult && !showDetail) return;

    // 向 history 推入一个状态，使返回键先回到这个状态
    window.history.pushState({ qimingResult: true }, "");

    const handlePopState = (e: PopStateEvent) => {
      if (showDetail) {
        setShowDetail(false);
      } else {
        setHasResult(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasResult, showDetail]);

  // 获取姓氏笔画
  const surnameInfo = useMemo(() => {
    if (!surname) return null;
    if (isCompound) {
      const entry = compoundSurnames.find((s) => s.c === surname);
      if (entry) {
        return { strokes: entry.s1, strokes2: entry.s2, wuxing: entry.w };
      }
    } else {
      const entry = commonSurnames.find((s) => s.c === surname);
      if (entry) {
        return { strokes: entry.s, strokes2: 0, wuxing: entry.w };
      }
    }
    // 从康熙字典查找
    const chars = Array.from(surname);
    if (chars.length > 0) {
      const info = getCharInfo(chars[0]);
      return { strokes: info.strokes, strokes2: 0, wuxing: info.wuxing };
    }
    return null;
  }, [surname, isCompound]);

  const handleGenerate = useCallback(() => {
    if (!surname || !surnameInfo) {
      setError("请输入有效的姓氏");
      return;
    }

    setError("");
    setLoading(true);

    setTimeout(() => {
      const results = generateNames(
        surname,
        surnameInfo.strokes,
        isCompound,
        surnameInfo.strokes2,
        gender,
        preferredWuxing,
        zodiac,
        nameLength,
        baziAnalysis, // v20.1: 八字信息
        customRequirement // v20.1: 自定义需求
      );

      setSuggestions(results);
      setHasResult(true);
      setLoading(false);

      // 保存状态
      savePaipanState("qiming", {
        input: {
          surname,
          isCompound,
          gender,
          preferredWuxing,
          zodiac,
          nameLength,
          birthDate, // v20.1
          birthHour, // v20.1
          birthMinute, // v20.1
          customRequirement, // v20.1
          calType, // 公历/农历
          lunarYear,
          lunarMonthValue,
          lunarDay,
        },
        result: results,
        showForm: false,
        _ts: Date.now(),
      });

      // v21.3: 同步记录到后端（跨设备查看）
      syncRecordToBackend("qiming", {
        surname,
        isCompound,
        gender,
        preferredWuxing,
        zodiac,
        nameLength,
        birthDate: effectiveBirthDate,
        birthHour,
        birthMinute,
        calType,
        customRequirement,
        suggestions: results.slice(0, 5),
        baziAnalysis: baziAnalysis ? {
          dayMaster: baziAnalysis.dayMaster,
          dayMasterWuxing: baziAnalysis.dayMasterWuxing,
          isStrong: baziAnalysis.isStrong,
          favorableElements: baziAnalysis.favorableElements,
          baziText: baziAnalysis.baziText,
        } : null,
      }, `智能起名: ${surname}姓${gender === "male" ? "男" : "女"}宝`).catch(() => {});

      setTimeout(() => {
        const el = document.getElementById("qiming-result");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }, 500);
  }, [surname, surnameInfo, isCompound, gender, preferredWuxing, zodiac, nameLength, baziAnalysis, customRequirement]);

  // 选中某个名字进行详细分析
  const handleSelectName = useCallback(
    (suggestion: NameSuggestion) => {
      try {
        const result = analyzeName(suggestion.name, isCompound ? 2 : 1);
        setSelectedResult(result);
        setShowDetail(true);
      } catch (e) {
        console.error("详细分析失败:", e);
      }
    },
    [isCompound]
  );

  // AI上下文
  const aiContext = useMemo(() => {
    if (!selectedResult) {
      // v20.1: 包含八字信息
      const baziPart = baziAnalysis
        ? `\n八字：${baziAnalysis.baziText}\n日主：${baziAnalysis.dayMaster}（${baziAnalysis.dayMasterWuxing}）${baziAnalysis.isStrong ? "偏强" : "偏弱"}\n喜用神：${baziAnalysis.favorableElements.join("、")}\n忌神：${baziAnalysis.unfavorableElements.join("、")}\n五行统计：金${baziAnalysis.wuxingCount["金"]}、木${baziAnalysis.wuxingCount["木"]}、水${baziAnalysis.wuxingCount["水"]}、火${baziAnalysis.wuxingCount["火"]}、土${baziAnalysis.wuxingCount["土"]}`
        : "";
      const reqPart = customRequirement ? `\n起名要求：${customRequirement}` : "";
      return `姓氏：${surname}\n性别：${gender === "male" ? "男" : "女"}\n偏好五行：${preferredWuxing || "无"}\n生肖：${zodiac || "未选"}\n建议数量：${suggestions.length}${baziPart}${reqPart}`;
    }
    const lines = [
      `姓名：${selectedResult.name}`,
      `天格：${selectedResult.tiange.number}（${selectedResult.tiange.fortune}）`,
      `人格：${selectedResult.renge.number}（${selectedResult.renge.fortune}）`,
      `地格：${selectedResult.dige.number}（${selectedResult.dige.fortune}）`,
      `外格：${selectedResult.waige.number}（${selectedResult.waige.fortune}）`,
      `总格：${selectedResult.zongge.number}（${selectedResult.zongge.fortune}）`,
      `综合评分：${selectedResult.overallScore}`,
    ];
    return lines.join("\n");
  }, [selectedResult, surname, gender, preferredWuxing, zodiac, suggestions]);

  const ZODIAC_OPTIONS = ["", "鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];

  return (
    <div className="mx-auto w-full bg-[#ededed]" style={{ maxWidth: "420px", minHeight: "100vh" }}>
      {/* ==================== 输入表单 ==================== */}
      {!hasResult && (
        <div className="bg-white px-3 py-4">
          <div className="mb-4 text-center">
            <div
              className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: BRAND }}
            >
              <span className="text-2xl font-bold text-white">起</span>
            </div>
            <h2 className="text-lg font-bold text-gray-800">智能起名</h2>
            <p className="mt-1 text-xs text-gray-400">
              五格数理优化·五行平衡·生肖喜用
            </p>
          </div>

          {/* 姓氏类型 */}
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">姓氏类型</label>
            <div className="flex rounded-full bg-gray-100 p-1">
              <button
                onClick={() => {
                  setIsCompound(false);
                  setSurname("");
                }}
                className="flex-1 rounded-full py-1.5 text-sm font-semibold transition-all"
                style={{
                  backgroundColor: !isCompound ? BRAND : "transparent",
                  color: !isCompound ? "#fff" : "#666",
                }}
              >
                单姓
              </button>
              <button
                onClick={() => {
                  setIsCompound(true);
                  setSurname("");
                }}
                className="flex-1 rounded-full py-1.5 text-sm font-semibold transition-all"
                style={{
                  backgroundColor: isCompound ? BRAND : "transparent",
                  color: isCompound ? "#fff" : "#666",
                }}
              >
                复姓
              </button>
            </div>
          </div>

          {/* 姓氏输入 */}
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">姓氏</label>
            <input
              type="text"
              value={surname}
              onChange={(e) => {
                if (surnameComposingRef.current) {
                  // IME组合输入中，不进行字符过滤
                  const val = e.target.value;
                  setSurname(isCompound ? val.slice(0, 2) : val.slice(0, 1));
                } else {
                  const val = e.target.value.replace(/[^\u4e00-\u9fa5]/g, "");
                  setSurname(isCompound ? val.slice(0, 2) : val.slice(0, 1));
                }
                setError("");
              }}
              onCompositionStart={() => {
                surnameComposingRef.current = true;
              }}
              onCompositionEnd={(e) => {
                surnameComposingRef.current = false;
                const val = (e.target as HTMLInputElement).value.replace(/[^\u4e00-\u9fa5]/g, "");
                setSurname(isCompound ? val.slice(0, 2) : val.slice(0, 1));
                setError("");
              }}
              placeholder={isCompound ? "请输入复姓（2字）" : "请输入姓氏（1字）"}
              maxLength={isCompound ? 2 : 1}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-center text-xl font-bold outline-none focus:border-[#7B2FBE]"
            />
            {/* 快速选择常见姓氏 */}
            <div className="mt-1.5 max-h-16 overflow-y-auto">
              <div className="flex flex-wrap gap-1">
                {(isCompound ? compoundSurnames : commonSurnames)
                  .slice(0, 15)
                  .map((s) => (
                    <button
                      key={s.c}
                      onClick={() => setSurname(s.c)}
                      className="rounded px-1.5 py-0.5 text-xs text-gray-500 transition-colors hover:bg-purple-50"
                      style={{
                        backgroundColor: surname === s.c ? BRAND + "18" : "transparent",
                        color: surname === s.c ? BRAND : "#888",
                      }}
                    >
                      {s.c}
                    </button>
                  ))}
              </div>
            </div>
            {surnameInfo && (
              <p className="mt-1 text-xs text-gray-400">
                {surname} · 康熙{" "}
                {isCompound
                  ? `${surnameInfo.strokes}+${surnameInfo.strokes2}画`
                  : `${surnameInfo.strokes}画`}{" "}
                · 五行{surnameInfo.wuxing}
              </p>
            )}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>

          {/* 性别 */}
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">性别</label>
            <div className="flex rounded-full bg-gray-100 p-1">
              <button
                onClick={() => setGender("male")}
                className="flex-1 rounded-full py-1.5 text-sm font-semibold transition-all"
                style={{
                  backgroundColor: gender === "male" ? BRAND : "transparent",
                  color: gender === "male" ? "#fff" : "#666",
                }}
              >
                男
              </button>
              <button
                onClick={() => setGender("female")}
                className="flex-1 rounded-full py-1.5 text-sm font-semibold transition-all"
                style={{
                  backgroundColor: gender === "female" ? BRAND : "transparent",
                  color: gender === "female" ? "#fff" : "#666",
                }}
              >
                女
              </button>
            </div>
          </div>

          {/* 名字字数 */}
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">名字字数</label>
            <div className="flex rounded-full bg-gray-100 p-1">
              <button
                onClick={() => setNameLength(1)}
                className="flex-1 rounded-full py-1.5 text-sm font-semibold transition-all"
                style={{
                  backgroundColor: nameLength === 1 ? BRAND : "transparent",
                  color: nameLength === 1 ? "#fff" : "#666",
                }}
              >
                单字名
              </button>
              <button
                onClick={() => setNameLength(2)}
                className="flex-1 rounded-full py-1.5 text-sm font-semibold transition-all"
                style={{
                  backgroundColor: nameLength === 2 ? BRAND : "transparent",
                  color: nameLength === 2 ? "#fff" : "#666",
                }}
              >
                双字名
              </button>
            </div>
          </div>

          {/* 五行偏好 */}
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">五行偏好（可选）</label>

            {/* v20.1: 八字驱动起名 - 出生时间输入 */}
            <div className="mb-3 rounded-lg border border-purple-200 bg-purple-50 p-3">
              <label className="mb-1.5 block text-xs font-semibold text-purple-700">
                出生年月日时（推荐，自动排八字定喜用神）
              </label>

              {/* 公历/农历切换 */}
              <div className="mb-2 flex rounded-full bg-gray-200 p-0.5">
                <button
                  type="button"
                  onClick={() => setCalType("solar")}
                  className="flex-1 rounded-full py-1 text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: calType === "solar" ? BRAND : "transparent",
                    color: calType === "solar" ? "#fff" : "#666",
                  }}
                >
                  公历
                </button>
                <button
                  type="button"
                  onClick={() => setCalType("lunar")}
                  className="flex-1 rounded-full py-1 text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: calType === "lunar" ? BRAND : "transparent",
                    color: calType === "lunar" ? "#fff" : "#666",
                  }}
                >
                  农历
                </button>
              </div>

              {/* 公历模式 */}
              {calType === "solar" ? (
                <div className="space-y-1.5">
                  <SolarDatePicker value={birthDate} onChange={setBirthDate} />
                  <div className="flex items-center gap-2">
                    <select
                      value={birthHour}
                      onChange={(e) => setBirthHour(parseInt(e.target.value))}
                      className="w-20 rounded-lg border border-gray-200 px-1 py-2 text-sm outline-none focus:border-[#7B2FBE]"
                    >
                      {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}时
                        </option>
                      ))}
                    </select>
                    <select
                      value={birthMinute}
                      onChange={(e) => setBirthMinute(parseInt(e.target.value))}
                      className="w-20 rounded-lg border border-gray-200 px-1 py-2 text-sm outline-none focus:border-[#7B2FBE]"
                    >
                      {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                        <option key={m} value={m}>
                          {String(m).padStart(2, "0")}分
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                /* 农历模式 */
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    <select
                      value={lunarYear}
                      onChange={(e) => {
                        setLunarYear(parseInt(e.target.value, 10));
                      }}
                      className="flex-1 rounded-lg border border-gray-200 px-1 py-2 text-sm outline-none focus:border-[#7B2FBE]"
                    >
                      {Array.from({ length: 200 }, (_, i) => 1900 + i).map((y) => (
                        <option key={y} value={y}>{y}年</option>
                      ))}
                    </select>
                    <select
                      value={lunarMonthValue}
                      onChange={(e) => {
                        setLunarMonthValue(e.target.value);
                        // 切换月份时校正日
                        const mNum = parseInt(e.target.value, 10);
                        const isLeap = mNum < 0;
                        const mAbs = Math.abs(mNum);
                        const maxDay = getLunarMonthDays(lunarYear, mAbs, isLeap);
                        if (lunarDay > maxDay) setLunarDay(maxDay);
                      }}
                      className="flex-1 rounded-lg border border-gray-200 px-1 py-2 text-sm outline-none focus:border-[#7B2FBE]"
                    >
                      {getLunarMonthOptions(lunarYear).map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <select
                      value={lunarDay}
                      onChange={(e) => setLunarDay(parseInt(e.target.value, 10))}
                      className="flex-1 rounded-lg border border-gray-200 px-1 py-2 text-sm outline-none focus:border-[#7B2FBE]"
                    >
                      {(() => {
                        const mNum = parseInt(lunarMonthValue, 10);
                        const isLeap = mNum < 0;
                        const mAbs = Math.abs(mNum);
                        return getLunarDayOptions(lunarYear, mAbs, isLeap).map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ));
                      })()}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={birthHour}
                      onChange={(e) => setBirthHour(parseInt(e.target.value))}
                      className="w-20 rounded-lg border border-gray-200 px-1 py-2 text-sm outline-none focus:border-[#7B2FBE]"
                    >
                      {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}时
                        </option>
                      ))}
                    </select>
                    <select
                      value={birthMinute}
                      onChange={(e) => setBirthMinute(parseInt(e.target.value))}
                      className="w-20 rounded-lg border border-gray-200 px-1 py-2 text-sm outline-none focus:border-[#7B2FBE]"
                    >
                      {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                        <option key={m} value={m}>
                          {String(m).padStart(2, "0")}分
                        </option>
                      ))}
                    </select>
                    <span className="flex-1 text-[10px] text-gray-400">农历已自动转公历排盘</span>
                  </div>
                </div>
              )}

              {/* v20.1: 八字分析结果展示 */}
              {baziAnalysis && (
                <div className="mt-2.5 rounded-lg bg-white p-2.5 text-xs">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="font-bold text-purple-700">八字排盘</span>
                    <span className="font-mono text-sm font-bold text-gray-800">{baziAnalysis.baziText}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-gray-600">
                    <span>日主：<b className="text-purple-600">{baziAnalysis.dayMaster}</b>（{baziAnalysis.dayMasterWuxing}）</span>
                    <span>{baziAnalysis.isStrong ? "偏强" : "偏弱"}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(["金", "木", "水", "火", "土"] as const).map((wx) => (
                      <span
                        key={wx}
                        className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                        style={{
                          backgroundColor: WUXING_COLORS[wx] + "18",
                          color: WUXING_COLORS[wx],
                        }}
                      >
                        {wx}{baziAnalysis.wuxingCount[wx]}
                      </span>
                    ))}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className="text-green-600">喜用神：{baziAnalysis.favorableElements.join("、")}</span>
                    {baziAnalysis.unfavorableElements.length > 0 && (
                      <span className="text-red-400">忌神：{baziAnalysis.unfavorableElements.join("、")}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => setPreferredWuxing("")}
                className="flex-1 rounded-lg py-1.5 text-sm font-semibold transition-all"
                style={{
                  backgroundColor: !preferredWuxing ? BRAND : "#f5f0fa",
                  color: !preferredWuxing ? "#fff" : "#888",
                }}
              >
                自动
              </button>
              {WUXING_LIST.map((wx) => (
                <button
                  key={wx}
                  onClick={() => setPreferredWuxing(wx)}
                  className="flex-1 rounded-lg py-1.5 text-sm font-bold transition-all"
                  style={{
                    backgroundColor: preferredWuxing === wx ? WUXING_COLORS[wx] : "#f5f0fa",
                    color: preferredWuxing === wx ? "#fff" : WUXING_COLORS[wx],
                  }}
                >
                  {wx}
                </button>
              ))}
            </div>
          </div>

          {/* 生肖 */}
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">生肖（可选）</label>
            <select
              value={zodiac}
              onChange={(e) => setZodiac(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#7B2FBE]"
            >
              {ZODIAC_OPTIONS.map((z) => (
                <option key={z} value={z}>
                  {z || "不选生肖"}
                </option>
              ))}
            </select>
          </div>

          {/* v20.1: 起名要求输入框 */}
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">起名要求（可选）</label>
            <textarea
              value={customRequirement}
              onChange={(e) => setCustomRequirement(e.target.value)}
              placeholder="如：希望带某字、风格儒雅/大气/温婉、寓意学业/事业等"
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7B2FBE]"
              maxLength={100}
            />
          </div>

          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full rounded-full py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
            style={{
              backgroundColor: !loading ? BRAND : "#ccc",
            }}
          >
            {loading ? "生成中..." : "智能生成名字"}
          </button>

          {/* 功能说明 */}
          <div className="mt-4 rounded-lg p-2.5" style={{ backgroundColor: "#f3edf7" }}>
            <div className="text-xs font-bold" style={{ color: BRAND }}>
              起名原则
            </div>
            <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-gray-600">
              <span>● 五格数理最大化</span>
              <span>● 81数理吉凶筛选</span>
              <span>● 五行平衡搭配</span>
              <span>● 生肖喜用字匹配</span>
              <span>● 男女用字区分</span>
              <span>● 综合评分排序</span>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 起名结果 ==================== */}
      {hasResult && !showDetail && (
        <div id="qiming-result" className="bg-[#ededed] px-2 py-2 space-y-2">
          {/* 结果概要 */}
          <div
            className="rounded-2xl p-4 text-white"
            style={{
              background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND}cc 100%)`,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm opacity-80">为「{surname}」{gender === "male" ? "男" : "女"}宝推荐</div>
                <div className="mt-1 text-2xl font-bold">
                  {suggestions.length} 个精选名字
                </div>
              </div>
              <div className="text-right text-xs opacity-80">
                <div>{nameLength === 1 ? "单字名" : "双字名"}</div>
                {preferredWuxing && <div>偏好{preferredWuxing}</div>}
                {zodiac && <div>生肖{zodiac}</div>}
                {/* v20.1: 显示八字信息 */}
                {baziAnalysis && (
                  <div className="mt-1 border-t border-white/20 pt-1">
                    <div>日主{baziAnalysis.dayMaster}（{baziAnalysis.dayMasterWuxing}）</div>
                    <div>喜用{baziAnalysis.favorableElements.join("、")}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 名字列表 */}
          {suggestions.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center">
              <p className="text-sm text-gray-400">未找到符合条件的好名字</p>
              <p className="mt-1 text-xs text-gray-300">
                建议调整五行偏好或名字字数后重试
              </p>
            </div>
          ) : (
            <>
              {suggestions.map((s, i) => (
                <SuggestionCard
                  key={i}
                  suggestion={s}
                  onSelect={() => handleSelectName(s)}
                />
              ))}

              <div className="px-2 py-3 text-center text-xs text-gray-400">
                <p>点击名字可查看详细五格分析</p>
                <p className="mt-1">共生成 {suggestions.length} 个推荐，按评分排序</p>
              </div>
            </>
          )}

          {/* AI入口 */}
          <div className="rounded-xl bg-white p-3">

            {/* v20.1: AI 定制起名入口（单次付费） */}
            <div
              className="mb-3 cursor-pointer rounded-xl p-3"
              style={{
                background: "linear-gradient(135deg, #7B2FBE08, #9B5ECF08)",
                border: "1px solid #7B2FBE30",
              }}
              onClick={() => {
                // 跳转到 AI 解读面板进行定制起名
                const el = document.getElementById("ai-custom-naming");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  el.classList.add("ring-2");
                  setTimeout(() => el.classList.remove("ring-2"), 2000);
                }
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">✨</span>
                <div className="flex-1">
                  <div className="text-sm font-bold text-purple-700">AI 定制起名</div>
                  <div className="text-[10px] text-gray-500">
                    输入详细要求，AI 生成专属起名方案
                  </div>
                </div>
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-600">
                  单次付费
                </span>
              </div>
            </div>

            <div id="ai-custom-naming" className="rounded-lg transition-all">
              <EventDivinationPanel
                toolName="智能起名"
                chartContext={aiContext}
                isPaidTool={false}
              />
            </div>
          </div>

          <div className="px-3 py-2">
            <ShareButton
              type="tool"
              title="智能起名结果"
              description="AI智能起名推荐"
              variant="block"
              label="分享起名结果"
            />
          </div>

          {/* 合规声明 */}
          <div className="rounded-xl bg-gray-50 p-3">
            <div className="flex items-start gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-[10px] leading-relaxed text-gray-400">{NAME_DISCLAIMER}</p>
            </div>
          </div>

          <div style={{ height: "20px" }} />
        </div>
      )}

      {/* ==================== 详细分析（选中的名字） ==================== */}
      {hasResult && showDetail && selectedResult && (
        <div className="bg-[#ededed] px-2 py-2 space-y-2">
          {/* 评分卡 */}
          <div
            className="rounded-2xl p-4 text-white"
            style={{
              background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND}cc 100%)`,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm opacity-80">姓名综合评分</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-black">{selectedResult.overallScore}</span>
                  <span className="text-lg font-bold opacity-90">分</span>
                  <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                    {selectedResult.overallRating}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold" style={{ fontFamily: "serif" }}>
                  {selectedResult.name}
                </div>
                <div className="mt-1 text-xs opacity-70">
                  {selectedResult.totalStrokes}画 ·{" "}
                  {selectedResult.isSingleGivenName ? "单名" : "双名"}
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed opacity-90">
              {selectedResult.summary}
            </p>
          </div>

          {/* 五格详情 */}
          <div className="rounded-xl bg-white p-3">
            <div className="mb-2 text-xs font-bold text-gray-700">五格数理</div>
            <div className="grid grid-cols-1 gap-2">
              {[
                { name: "天格", ge: selectedResult.tiange },
                { name: "人格", ge: selectedResult.renge },
                { name: "地格", ge: selectedResult.dige },
                { name: "外格", ge: selectedResult.waige },
                { name: "总格", ge: selectedResult.zongge },
              ].map(({ name, ge }) => {
                const color = getFortuneColor(ge.fortune);
                return (
                  <div
                    key={name}
                    className="rounded-xl p-3"
                    style={{
                      backgroundColor: color + "0a",
                      border: `1px solid ${color}22`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-gray-700">{name}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-bold"
                        style={{ backgroundColor: color + "18", color }}
                      >
                        {ge.fortune}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black" style={{ color }}>
                        {ge.number}
                      </span>
                      <span className="text-xs text-gray-500">{ge.title}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className="rounded px-1.5 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor: (WUXING_COLORS[ge.wuxing] || "#888") + "18",
                          color: WUXING_COLORS[ge.wuxing] || "#888",
                        }}
                      >
                        {ge.wuxing}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{ge.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 五行平衡 */}
          <div className="rounded-xl bg-white p-3">
            <div className="mb-2 text-xs font-bold text-gray-700">五行平衡</div>
            <div className="space-y-1.5">
              {(["金", "木", "水", "火", "土"] as const).map((wx) => {
                const count = (selectedResult.wuxingBalance as any)[wx] || 0;
                return (
                  <div key={wx} className="flex items-center gap-2">
                    <span
                      className="w-5 text-center text-xs font-bold rounded"
                      style={{ color: WUXING_COLORS[wx] }}
                    >
                      {wx}
                    </span>
                    <div className="flex-1 h-4 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${count > 0 ? (count / 5) * 100 : 0}%`,
                          backgroundColor: WUXING_COLORS[wx],
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-4 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              {selectedResult.wuxingAnalysis}
            </p>
          </div>

          {/* AI入口 */}
          <div className="rounded-xl bg-white p-3">
            <EventDivinationPanel
              toolName="智能起名"
              chartContext={aiContext}
              isPaidTool={false}
            />
          </div>

          {/* 合规声明 */}
          <div className="rounded-xl bg-gray-50 p-3">
            <div className="flex items-start gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-[10px] leading-relaxed text-gray-400">{NAME_DISCLAIMER}</p>
            </div>
          </div>

          <div style={{ height: "20px" }} />
        </div>
      )}
    </div>
  );
}
