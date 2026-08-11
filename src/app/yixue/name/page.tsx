"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useToolBack } from "@/lib/useToolBack";
import { savePaipanState, loadPaipanState, clearPaipanState } from "@/lib/paipanPersistence";
import ClientSelector from "@/components/ClientSelector";
import EventDivinationPanel from "@/components/EventDivinationPanel";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";
import {
  analyzeName,
  getFortuneColor,
  getScoreColor,
  getZodiacPrefs,
  NAME_DISCLAIMER,
  type NameAnalysisResult,
  type CharInfo,
  type GeInfo,
} from "@/lib/name-analysis";
import { ShareButton } from "@/components/ShareButton";
import { useRequireLogin } from "@/lib/useRequireLogin";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { solarToBazi } from "@/algorithm-core";
import type { Gender } from "@/algorithm-core";
import { Lunar, LunarYear, LunarMonth } from "lunar-javascript";
import SolarDatePicker from "@/components/shared/SolarDatePicker";
import { syncRecordToBackend } from "@/lib/recordSync";

// ============================================================================
// 常量
// ============================================================================
const BRAND = "#7B2FBE";

const WUXING_COLORS: Record<string, string> = {
  金: "#D4A017",
  木: "#2E8B57",
  水: "#1E6FBF",
  火: "#D94040",
  土: "#A0522D",
};

const WUXING_LABELS: Record<string, string> = {
  金: "金",
  木: "木",
  水: "水",
  火: "火",
  土: "土",
};

// 地支→生肖映射
const ZHI_TO_SHENGXIAO: Record<string, string> = {
  子: "鼠", 丑: "牛", 寅: "虎", 卯: "兔",
  辰: "龙", 巳: "蛇", 午: "马", 未: "羊",
  申: "猴", 酉: "鸡", 戌: "狗", 亥: "猪",
};

// ============================================================================
// 农历工具函数（使用 lunar-javascript 库）
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

function getLunarDayOptions(lunarYear: number, lunarMonth: number, isLeap: boolean): Array<{ value: number; label: string }> {
  const days = getLunarMonthDays(lunarYear, lunarMonth, isLeap);
  const options: Array<{ value: number; label: string }> = [];
  for (let d = 1; d <= days; d++) {
    options.push({ value: d, label: LUNAR_DAY_NAMES[d - 1] || `${d}日` });
  }
  return options;
}

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

// ============================================================================
// 八字分析（与起名页 qiming/page.tsx 复用相同算法逻辑）
// ============================================================================

interface BaziAnalysis {
  dayMaster: string;
  dayMasterWuxing: string;
  isStrong: boolean;
  favorableElements: string[];
  unfavorableElements: string[];
  wuxingCount: Record<string, number>;
  baziText: string;
  shengXiao: string;
}

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

    // 从年柱地支推导生肖
    const yearZhi = pillars[0]?.zhi as string;
    const shengXiao = ZHI_TO_SHENGXIAO[yearZhi] || "";

    return {
      dayMaster,
      dayMasterWuxing,
      isStrong,
      favorableElements,
      unfavorableElements,
      wuxingCount,
      baziText,
      shengXiao,
    };
  } catch (e) {
    return null;
  }
}

// ============================================================================
// 子组件：格信息卡片
// ============================================================================
function GeCard({ ge }: { ge: GeInfo }) {
  const color = getFortuneColor(ge.fortune);
  return (
    <div
      className="rounded-xl p-3"
      style={{
        backgroundColor: color + "0a",
        border: `1px solid ${color}22`,
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-gray-700">{ge.name}</span>
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
          {WUXING_LABELS[ge.wuxing] || ge.wuxing}
        </span>
        <span className="text-xs text-gray-400">· {ge.name}数理</span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{ge.desc}</p>
    </div>
  );
}

// ============================================================================
// 子组件：汉字信息卡片
// ============================================================================
function CharCard({ char, isSurname }: { char: CharInfo; isSurname: boolean }) {
  const wxColor = WUXING_COLORS[char.wuxing] || "#888";
  return (
    <div
      className="rounded-lg p-2.5 text-center"
      style={{
        backgroundColor: "#fff",
        border: `1.5px solid ${isSurname ? BRAND + "40" : "#e5e5e5"}`,
      }}
    >
      <div className="text-3xl font-bold text-gray-800" style={{ fontFamily: "serif" }}>
        {char.char}
      </div>
      <div className="mt-1 flex items-center justify-center gap-1.5">
        <span className="text-xs font-medium" style={{ color: wxColor }}>
          {char.wuxing}
        </span>
        <span className="text-xs text-gray-400">·</span>
        <span className="text-xs text-gray-500">{char.strokes}画</span>
      </div>
      {char.pinyin && char.pinyin !== "?" && (
        <div className="mt-0.5 text-xs text-gray-400 font-mono">{char.pinyin}</div>
      )}
      {char.meaning && (
        <div className="mt-1 text-[10px] leading-tight text-gray-400 line-clamp-2">
          {char.meaning}
        </div>
      )}
      {!char.found && (
        <div className="mt-0.5 text-[9px] text-orange-400">近似</div>
      )}
    </div>
  );
}

// ============================================================================
// 子组件：五行平衡条
// ============================================================================
function WuxingBalanceBar({ balance }: { balance: Record<string, number> }) {
  const total = Object.values(balance).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="space-y-1.5">
      {(["金", "木", "水", "火", "土"] as const).map((wx) => {
        const count = balance[wx] || 0;
        const pct = (count / total) * 100;
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
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(pct, count > 0 ? 8 : 0)}%`,
                  backgroundColor: WUXING_COLORS[wx],
                }}
              />
            </div>
            <span className="text-xs text-gray-500 w-4 text-right">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// 主页面组件
// ============================================================================
export default function NameAnalysisPage() {
  const pageKey = "yixue_name";
  const { showResult, savedParams, saveParams, goToResult } = useToolBack({
    pageKey,
    eventName: "yixue-back",
    globalFlag: "__yixueBackHandled",
  });
  const { requireLogin, showLoginPrompt, setShowLoginPrompt } = useRequireLogin();

  const [fullName, setFullName] = useState("");
  const [surnameLength, setSurnameLength] = useState<1 | 2>(1);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [loading, setLoading] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [result, setResult] = useState<NameAnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  // IME输入法组合状态追踪，修复中文输入丢字bug
  const isComposingRef = useRef(false);

  // 八字排盘相关状态
  const [birthDate, setBirthDate] = useState("");
  const [birthHour, setBirthHour] = useState<number>(12);
  const [birthMinute, setBirthMinute] = useState<number>(0);
  const [calType, setCalType] = useState<"solar" | "lunar">("solar");
  const [lunarYear, setLunarYear] = useState<number>(new Date().getFullYear());
  const [lunarMonthValue, setLunarMonthValue] = useState<string>("1");
  const [lunarDay, setLunarDay] = useState<number>(15);
  const [baziAnalysis, setBaziAnalysis] = useState<BaziAnalysis | null>(null);

  // 农历模式下解析出的公历日期
  const effectiveBirthDate = useMemo(() => {
    if (calType === "lunar" && lunarYear && lunarMonthValue && lunarDay) {
      const mNum = parseInt(lunarMonthValue, 10);
      const isLeap = mNum < 0;
      const mAbs = Math.abs(mNum);
      return lunarToSolarString(lunarYear, mAbs, lunarDay, isLeap);
    }
    return birthDate;
  }, [calType, lunarYear, lunarMonthValue, lunarDay, birthDate]);

  // URL参数 + 回填
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) {
      const c = getClient(cid);
      if (c) setSelectedClient(c);
    }
    const prefill = getPrefillData("name");
    if (prefill) {
      try {
        setResult(prefill);
        setHasResult(true);
        clearPrefillData("name");
      } catch (e) {}
    }
  }, []);

  // 恢复排盘状态
  useEffect(() => {
    const saved = loadPaipanState("name");
    if (saved && saved.input) {
      const inp = saved.input as any;
      if (inp.fullName) setFullName(inp.fullName);
      if (inp.surnameLength) setSurnameLength(inp.surnameLength);
      if (inp.gender) setGender(inp.gender);
      if (inp.birthDate) setBirthDate(inp.birthDate);
      if (inp.birthHour !== undefined) setBirthHour(inp.birthHour);
      if (inp.birthMinute !== undefined) setBirthMinute(inp.birthMinute);
      if (inp.calType) setCalType(inp.calType);
      if (inp.lunarYear) setLunarYear(inp.lunarYear);
      if (inp.lunarMonthValue) setLunarMonthValue(inp.lunarMonthValue);
      if (inp.lunarDay) setLunarDay(inp.lunarDay);
    }
    if (saved && saved.result) {
      try {
        setResult(saved.result as NameAnalysisResult);
        setHasResult(true);
      } catch (e) {}
    }
  }, []);

  // 出生时间变化时自动排八字（公历/农历均自动转换为公历后排盘）
  useEffect(() => {
    if (effectiveBirthDate) {
      const result = analyzeBazi(effectiveBirthDate, birthHour, birthMinute, gender);
      setBaziAnalysis(result);
    } else {
      setBaziAnalysis(null);
    }
  }, [effectiveBirthDate, birthHour, birthMinute, gender]);

  // 编辑事件：返回输入模式
  useEffect(() => {
    const editHandler = () => {
      setHasResult(false);
    };
    window.addEventListener("yixue-edit", editHandler);
    return () => window.removeEventListener("yixue-edit", editHandler);
  }, []);

  // v21.2: 拦截浏览器返回键 - 排盘结果页按返回应回到输入页
  useEffect(() => {
    if (!hasResult) return;

    // 向 history 推入一个状态，使返回键先回到这个状态
    window.history.pushState({ nameResult: true }, "");

    const handlePopState = (e: PopStateEvent) => {
      // 如果当前在结果页，按返回键回到输入页
      setHasResult(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasResult]);

  const handleAnalyze = useCallback(() => {
    if (!requireLogin()) return;
    // v21.2: 提交时过滤非中文字符，解决移动端输入法兼容性问题
    const trimmed = fullName.trim().replace(/[^\u4e00-\u9fa5]/g, "");
    if (!trimmed || trimmed.length < 2) {
      setError("请输入至少2个字的姓名");
      return;
    }
    if (trimmed.length <= surnameLength) {
      setError("名字字数必须大于姓氏字数");
      return;
    }
    // 同步过滤后的值到 state
    setFullName(trimmed);

    setError("");
    setLoading(true);

    setTimeout(() => {
      try {
        const r = analyzeName(trimmed, surnameLength);

        // 五格数理评分结合八字喜用神
        if (baziAnalysis) {
          const nameChars = r.chars.slice(surnameLength);
          let baziScore = 0;
          for (const char of nameChars) {
            if (baziAnalysis.favorableElements.includes(char.wuxing)) {
              baziScore += 100 / nameChars.length;
            } else if (baziAnalysis.unfavorableElements.includes(char.wuxing)) {
              baziScore -= 30 / nameChars.length;
            } else {
              baziScore += 40 / nameChars.length;
            }
          }
          baziScore = Math.max(0, Math.min(100, Math.round(baziScore)));

          // 调整综合评分：70% 五格 + 30% 八字喜用神
          const adjustedScore = Math.round(r.overallScore * 0.7 + baziScore * 0.3);
          r.overallScore = adjustedScore;

          // 重新评级
          if (adjustedScore >= 90) r.overallRating = "大吉";
          else if (adjustedScore >= 75) r.overallRating = "吉";
          else if (adjustedScore >= 55) r.overallRating = "半吉";
          else if (adjustedScore >= 35) r.overallRating = "小凶";
          else r.overallRating = "凶";

          // 添加八字喜用神建议
          r.suggestions.push(
            `八字喜用神为${baziAnalysis.favorableElements.join("、")}，名字五行匹配度${baziScore}分。` +
            (baziScore >= 80
              ? "名字五行与八字高度契合。"
              : baziScore >= 50
              ? "名字五行与八字较为契合。"
              : "建议考虑调整用字以更好地契合八字喜用神。")
          );

          // 更新摘要
          r.summary += ` 八字日主${baziAnalysis.dayMaster}（${baziAnalysis.dayMasterWuxing}），${baziAnalysis.isStrong ? "身强" : "身弱"}，喜用${baziAnalysis.favorableElements.join("、")}。`;
        }

        setResult(r);
        setHasResult(true);
        setLoading(false);

        // 保存排盘状态
        savePaipanState("name", {
          input: {
            fullName: trimmed,
            surnameLength,
            gender,
            birthDate,
            birthHour,
            birthMinute,
            calType,
            lunarYear,
            lunarMonthValue,
            lunarDay,
          },
          result: r,
          showForm: false,
          _ts: Date.now(),
        });

        // v21.3: 同步记录到后端（跨设备查看）
        syncRecordToBackend("name", {
          fullName: trimmed,
          surnameLength,
          gender,
          birthDate: effectiveBirthDate,
          birthHour,
          birthMinute,
          calType,
          result: r,
          baziAnalysis: baziAnalysis ? {
            dayMaster: baziAnalysis.dayMaster,
            dayMasterWuxing: baziAnalysis.dayMasterWuxing,
            isStrong: baziAnalysis.isStrong,
            favorableElements: baziAnalysis.favorableElements,
            baziText: baziAnalysis.baziText,
          } : null,
        }, `姓名解析: ${trimmed}`).catch(() => {});

        // 保存客户记录
        if (selectedClient) {
          try {
            saveRecord({
              clientId: selectedClient.id,
              type: "name",
              data: { ...r, fullName: trimmed, gender, baziAnalysis },
              note: "",
              status: "pending",
            });
          } catch (e) {
            console.error("保存记录失败:", e);
          }
        }

        // 滚动到结果
        setTimeout(() => {
          const el = document.getElementById("name-result");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } catch (e) {
        console.error("姓名解析出错:", e);
        setError("解析失败，请检查姓名输入是否正确");
        setLoading(false);
      }
    }, 300);
  }, [fullName, surnameLength, gender, selectedClient, requireLogin, baziAnalysis, birthDate, birthHour, birthMinute, calType, lunarYear, lunarMonthValue, lunarDay]);

  // 生肖喜忌分析（从八字年柱推导生肖）
  const derivedZodiac = useMemo(() => {
    return baziAnalysis?.shengXiao || "";
  }, [baziAnalysis]);

  const zodiacPrefs = useMemo(() => {
    if (!derivedZodiac || !result) return null;
    return getZodiacPrefs(derivedZodiac);
  }, [derivedZodiac, result]);

  // AI上下文
  const aiContext = useMemo(() => {
    if (!result) return "";
    const lines = [
      `姓名：${result.name}`,
      `姓氏：${result.surname}（${result.isCompoundSurname ? "复姓" : "单姓"}）`,
      `名字：${result.givenName}`,
      `天格：${result.tiange.number}（${result.tiange.fortune}）${result.tiange.title}`,
      `人格：${result.renge.number}（${result.renge.fortune}）${result.renge.title}`,
      `地格：${result.dige.number}（${result.dige.fortune}）${result.dige.title}`,
      `外格：${result.waige.number}（${result.waige.fortune}）${result.waige.title}`,
      `总格：${result.zongge.number}（${result.zongge.fortune}）${result.zongge.title}`,
      `综合评分：${result.overallScore}（${result.overallRating}）`,
      `五行分析：${result.wuxingAnalysis}`,
    ];
    if (baziAnalysis) {
      lines.push(
        `八字：${baziAnalysis.baziText}`,
        `日主：${baziAnalysis.dayMaster}（${baziAnalysis.dayMasterWuxing}）${baziAnalysis.isStrong ? "身强" : "身弱"}`,
        `喜用神：${baziAnalysis.favorableElements.join("、")}`,
        `忌神：${baziAnalysis.unfavorableElements.join("、")}`,
      );
    }
    if (derivedZodiac) lines.push(`生肖：${derivedZodiac}`);
    return lines.join("\n");
  }, [result, baziAnalysis, derivedZodiac]);

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
              <span className="text-2xl font-bold text-white">姓</span>
            </div>
            <h2 className="text-lg font-bold text-gray-800">姓名五格解析</h2>
            <p className="mt-1 text-xs text-gray-400">
              基于康熙笔画·五格剖象法·81数理
            </p>
          </div>

          {/* 姓名输入 */}
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">姓名</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                // v21.2: 移除IME组合状态追踪，直接更新值
                // 非中文字符在提交时过滤，避免移动端输入法兼容性问题
                setFullName(e.target.value);
                setError("");
              }}
              onBlur={() => {
                // 失焦时过滤非中文字符
                const val = fullName.replace(/[^\u4e00-\u9fa5]/g, "");
                setFullName(val);
              }}
              placeholder="请输入中文姓名"
              maxLength={6}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-center text-xl font-bold outline-none focus:border-[#7B2FBE]"
              style={{ fontSize: "20px" }}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>

          {/* 姓氏类型 */}
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">姓氏类型</label>
            <div className="flex rounded-full bg-gray-100 p-1">
              <button
                onClick={() => setSurnameLength(1)}
                className="flex-1 rounded-full py-1.5 text-sm font-semibold transition-all"
                style={{
                  backgroundColor: surnameLength === 1 ? BRAND : "transparent",
                  color: surnameLength === 1 ? "#fff" : "#666",
                }}
              >
                单姓
              </button>
              <button
                onClick={() => setSurnameLength(2)}
                className="flex-1 rounded-full py-1.5 text-sm font-semibold transition-all"
                style={{
                  backgroundColor: surnameLength === 2 ? BRAND : "transparent",
                  color: surnameLength === 2 ? "#fff" : "#666",
                }}
              >
                复姓
              </button>
            </div>
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

          {/* 出生时间 + 八字排盘 */}
          <div className="mb-3 rounded-lg border border-purple-200 bg-purple-50 p-3">
            <label className="mb-1.5 block text-xs font-semibold text-purple-700">
              出生年月日时（可选，排八字定喜用神纳入评分）
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
                    onChange={(e) => setLunarYear(parseInt(e.target.value, 10))}
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

            {/* 八字排盘结果展示 */}
            {baziAnalysis && (
              <div className="mt-2.5 rounded-lg bg-white p-2.5 text-xs">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="font-bold text-purple-700">八字排盘</span>
                  <span className="font-mono text-sm font-bold text-gray-800">{baziAnalysis.baziText}</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-gray-600">
                  <span>日主：<b className="text-purple-600">{baziAnalysis.dayMaster}</b>（{baziAnalysis.dayMasterWuxing}）</span>
                  <span>{baziAnalysis.isStrong ? "偏强" : "偏弱"}</span>
                  {baziAnalysis.shengXiao && <span>生肖：{baziAnalysis.shengXiao}</span>}
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

          {/* 客户选择 */}
          <div className="mb-3">
            <ClientSelector selectedClient={selectedClient} onSelect={setSelectedClient} />
          </div>

          {/* 分析按钮 */}
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full rounded-full py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
            style={{
              backgroundColor: !loading ? BRAND : "#ccc",
            }}
          >
            {loading ? "解析中..." : "开始解析"}
          </button>

          {/* 分析内容说明 */}
          <div className="mt-4 rounded-lg p-2.5" style={{ backgroundColor: "#f3edf7" }}>
            <div className="text-xs font-bold" style={{ color: BRAND }}>
              分析内容
            </div>
            <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-gray-600">
              <span>● 五格数理分析</span>
              <span>● 81数理吉凶判定</span>
              <span>● 八字排盘定喜用神</span>
              <span>● 喜用神五行匹配</span>
              <span>● 五行平衡分析</span>
              <span>● 生肖喜用字查询</span>
              <span>● 综合评分评级</span>
              <span>● AI深度解读</span>
            </div>
          </div>

          {/* 占位提示 */}
          <div className="mt-6 flex flex-col items-center justify-center py-8 text-gray-400">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="9" y1="7" x2="15" y2="7" />
              <line x1="9" y1="11" x2="15" y2="11" />
            </svg>
            <p className="mt-3 text-sm">输入姓名后点击"开始解析"</p>
            <p className="mt-1 text-xs text-gray-300">五格剖象法 · 康熙笔画</p>
          </div>
        </div>
      )}

      {/* ==================== 解析结果 ==================== */}
      {hasResult && result && (
        <div id="name-result" className="bg-[#ededed] px-2 py-2 space-y-2">
          {/* 综合评分卡 */}
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
                  <span className="text-4xl font-black">{result.overallScore}</span>
                  <span className="text-lg font-bold opacity-90">分</span>
                  <span
                    className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold"
                  >
                    {result.overallRating}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold" style={{ fontFamily: "serif" }}>
                  {result.name}
                </div>
                <div className="mt-1 text-xs opacity-70">
                  {result.isCompoundSurname ? "复姓" : "单姓"} ·{" "}
                  {result.isSingleGivenName ? "单名" : "双名"} ·{" "}
                  {result.totalStrokes}画
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed opacity-90">{result.summary}</p>
          </div>

          {/* 汉字信息 */}
          <div className="rounded-xl bg-white p-3">
            <div className="mb-2 text-xs font-bold text-gray-700">康熙笔画解析</div>
            <div className="flex gap-2 overflow-x-auto">
              {result.chars.map((char, idx) => (
                <div key={idx} style={{ minWidth: "80px" }}>
                  <CharCard char={char} isSurname={idx < (result.isCompoundSurname ? 2 : 1)} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-3 text-[10px] text-gray-400">
              <span>
                <span style={{ color: BRAND }}>■</span> 姓氏
              </span>
              <span>
                <span style={{ color: "#ccc" }}>■</span> 名字
              </span>
            </div>
          </div>

          {/* 五格分析 */}
          <div className="rounded-xl bg-white p-3">
            <div className="mb-2 text-xs font-bold text-gray-700">五格数理</div>
            <div className="grid grid-cols-1 gap-2">
              <GeCard ge={result.tiange} />
              <GeCard ge={result.renge} />
              <GeCard ge={result.dige} />
              <GeCard ge={result.waige} />
              <GeCard ge={result.zongge} />
            </div>
          </div>

          {/* 五行平衡 */}
          <div className="rounded-xl bg-white p-3">
            <div className="mb-2 text-xs font-bold text-gray-700">五行平衡</div>
            <WuxingBalanceBar balance={result.wuxingBalance} />
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              {result.wuxingAnalysis}
            </p>
          </div>

          {/* 八字喜用神分析 */}
          {baziAnalysis && (
            <div className="rounded-xl bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">八字喜用神分析</span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-bold"
                  style={{ backgroundColor: BRAND + "18", color: BRAND }}
                >
                  {baziAnalysis.isStrong ? "身强" : "身弱"}
                </span>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">四柱：</span>
                <span className="font-mono text-sm font-bold text-gray-800">
                  {baziAnalysis.baziText.split(" ").map((gz, i) => (
                    <span key={i}>
                      {i > 0 && " "}
                      <span className="text-[10px] text-gray-400 mr-0.5">
                        {["年", "月", "日", "时"][i]}
                      </span>
                      {gz}
                    </span>
                  ))}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                <span>日主：<b className="text-purple-600">{baziAnalysis.dayMaster}</b>（{baziAnalysis.dayMasterWuxing}）</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
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
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-xs text-green-600 font-semibold">喜用神：</span>
                <div className="flex flex-wrap gap-1">
                  {baziAnalysis.favorableElements.map((wx) => (
                    <span
                      key={wx}
                      className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700 font-bold"
                    >
                      {wx}
                    </span>
                  ))}
                </div>
              </div>
              {baziAnalysis.unfavorableElements.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="text-xs text-red-500 font-semibold">忌神：</span>
                  <div className="flex flex-wrap gap-1">
                    {baziAnalysis.unfavorableElements.map((wx) => (
                      <span
                        key={wx}
                        className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-600 font-bold"
                      >
                        {wx}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 生肖喜忌 */}
          {derivedZodiac && zodiacPrefs && (
            <div className="rounded-xl bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">生肖喜用字</span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-bold"
                  style={{ backgroundColor: BRAND + "18", color: BRAND }}
                >
                  {derivedZodiac}
                </span>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-green-600 font-semibold">喜用：</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {zodiacPrefs.prefer.map((c) => (
                      <span
                        key={c}
                        className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-red-500 font-semibold">忌用：</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {zodiacPrefs.avoid.map((c) => (
                      <span
                        key={c}
                        className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-600"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 建议 */}
          {result.suggestions.length > 0 && (
            <div className="rounded-xl bg-white p-3">
              <div className="mb-2 text-xs font-bold text-gray-700">解析建议</div>
              <div className="space-y-2">
                {result.suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg p-2"
                    style={{ backgroundColor: "#f9f7fc" }}
                  >
                    <span
                      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: BRAND }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-xs leading-relaxed text-gray-600">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== AI深度解读入口（沉底放置） ==================== */}
          <div className="rounded-xl bg-white p-3">
            <EventDivinationPanel
              toolName="姓名解析"
              chartContext={aiContext}
              isPaidTool={false}
            />
          </div>

          <div className="px-3 py-2">
            <ShareButton
              type="tool"
              title="姓名解析结果"
              description="姓名五格三才解析"
              variant="block"
              label="分享解析结果"
            />
          </div>

          {/* ==================== 合规声明 ==================== */}
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

          {/* 底部间距 */}
          <div style={{ height: "20px" }} />
        </div>
      )}

      <LoginPromptModal show={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
    </div>
  );
}
