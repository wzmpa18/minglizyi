"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { solarToBazi, GAN, ZHI } from "@/algorithm-core";
import { solarToLunar, getLunarDateString } from "@/lib/lunar";
import { DatePicker } from "@/components/shared";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";
import { getTaiyiPalaceInterpretation, getTaiyiShenInterpretation } from "@/lib/taiyi-interpretations";
import type { TaiyiInterpretItem } from "@/lib/taiyi-interpretations";
import { savePaipanState, loadPaipanState, clearPaipanState } from "@/lib/paipanPersistence";
import { useToolBack } from "@/lib/useToolBack";

// ============================================================================
// 常量
// ============================================================================
const BRAND = "#7B2FBE";

const WUXING_COLORS: Record<string, string> = {
  "金": "#ffa500", "水": "#0074e4", "木": "#00a879", "火": "#ed4d49", "土": "#a64b00",
};

const INTERPRET_TYPE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  palace: { bg: "#f3e8ff", fg: "#7B2FBE", label: "宫位" },
  star: { bg: "#fef3c7", fg: "#d97706", label: "星神" },
  sishen: { bg: "#e0f2fe", fg: "#0284c7", label: "四神" },
  jijun: { bg: "#f0faf0", fg: "#16a34a", label: "基" },
  zhuke: { bg: "#fef2f2", fg: "#dc2626", label: "主客" },
};

// 太乙九宫（洛书排列）
const PALACE_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];
const PALACE_NAMES: Record<number, { bagua: string; wuxing: string; direction: string }> = {
  1: { bagua: "坎", wuxing: "水", direction: "北" },
  2: { bagua: "坤", wuxing: "土", direction: "西南" },
  3: { bagua: "震", wuxing: "木", direction: "东" },
  4: { bagua: "巽", wuxing: "木", direction: "东南" },
  5: { bagua: "中", wuxing: "土", direction: "中宫" },
  6: { bagua: "乾", wuxing: "金", direction: "西北" },
  7: { bagua: "兑", wuxing: "金", direction: "西" },
  8: { bagua: "艮", wuxing: "土", direction: "东北" },
  9: { bagua: "离", wuxing: "火", direction: "南" },
};

// 太乙十六神（对应子丑寅卯...逆时针排列）
const TAIYI_SHEN = [
  "地主", "阳德", "和德", "吕申", "高丛", "太阳", "大炅", "大神",
  "大威", "天道", "大武", "武德", "太簇", "阴主", "阴德", "大义",
];

// 地支对应十六神索引（子=0,丑=1,...亥=11,但十六神对应额外4个位置）
const ZHI_TO_SHEN_IDX: Record<string, number> = {
  "子": 0, "丑": 1, "寅": 2, "卯": 3, "辰": 4, "巳": 5,
  "午": 6, "未": 7, "申": 8, "酉": 9, "戌": 10, "亥": 11,
};

// 节气约日期
const JIEQI_NAMES = [
  "小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨",
  "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑",
  "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至",
];
const JIEQI_APPROX: Array<[number, number]> = [
  [1, 6], [1, 21], [2, 4], [2, 19], [3, 6], [3, 21], [4, 5], [4, 20],
  [5, 6], [5, 21], [6, 6], [6, 22], [7, 7], [7, 23], [8, 7], [8, 23],
  [9, 8], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 22],
];

function getCurrentJieqi(month: number, day: number): string {
  for (let i = JIEQI_NAMES.length - 1; i >= 0; i--) {
    const [m, d] = JIEQI_APPROX[i];
    if (m < month || (m === month && d <= day)) return JIEQI_NAMES[i];
  }
  return "冬至";
}

// ============================================================================
// 太乙排盘算法（基于《太乙金镜式经》简化规则）
// ============================================================================

interface TaiyiResult {
  // 基本信息
  year: number; month: number; day: number; hour: number;
  yearGZ: string; monthGZ: string; dayGZ: string; hourGZ: string;
  lunarStr: string;
  jieqi: string;
  // 核心星神
  taiyiJiNian: number;       // 太乙积年
  taiyiGong: number;          // 太乙所在宫
  taiyiShen: string;          // 太乙十六神
  tianmuGong: number;         // 天目（文昌）所在宫
  tianmuShen: string;         // 天目神名
  jishenGong: number;         // 计神所在宫
  jishenShen: string;         // 计神神名
  shijiGong: number;          // 始击所在宫
  shijiShen: string;          // 始击神名
  // 主客大将
  zhuDaJiang: [number, string];  // 主大将 [宫位, 五行]
  zhuXiaoJiang: [number, string];
  keDaJiang: [number, string];
  keXiaoJiang: [number, string];
  // 定计/客目
  dingjiGong: number;
  dingjiShen: string;
  kemuGong: number;
  kemuShen: string;
  // 四神
  sishen: Record<string, { gong: number; name: string }>;
  // 君基臣基民基
  junjiGong: number;
  chenjiGong: number;
  minjiGong: number;
  // 格局判定
  geju: string[];
  // 九宫各宫星神分布
  gongData: Record<number, { stars: string[]; wuxing: string; bagua: string; direction: string }>;
}

function calcTaiyi(year: number, month: number, day: number, hour: number): TaiyiResult {
  // 使用solarToBazi获取四柱
  let yearGZ = "甲子", monthGZ = "甲子", dayGZ = "甲子", hourGZ = "甲子";
  try {
    const bz = solarToBazi({ year, month, day, hour, minute: 0, gender: "male" });
    if (bz && bz.pillars) {
      yearGZ = bz.pillars[0]?.ganzhi || "甲子";
      monthGZ = bz.pillars[1]?.ganzhi || "甲子";
      dayGZ = bz.pillars[2]?.ganzhi || "甲子";
      hourGZ = bz.pillars[3]?.ganzhi || "甲子";
    }
  } catch {
    // fallback
    const ganIdx = (year - 4) % 10;
    const zhiIdx = (year - 4) % 12;
    yearGZ = GAN[(ganIdx + 10) % 10] + ZHI[(zhiIdx + 12) % 12];
  }

  // 农历
  const lunar = solarToLunar(year, month, day);
  const lunarStr = getLunarDateString(lunar);
  const jieqi = getCurrentJieqi(month, day);

  // 太乙积年（简化：以甲子年1984为基准 + 太乙上元起点）
  // 太乙积年 = 10153977 + (year - 1984) (传说法数，简化处理)
  const taiyiJiNian = 10153977 + (year - 1984);

  // 太乙所在宫：太乙不入中五宫，以72年为一元，每元3纪，每纪24年
  // 简化：太乙按年行宫，每年一宫，不入中五，以乾六宫为起点
  // 宫序循环：1,2,3,4,6,7,8,9 (跳过5)
  const taiyiGongOrder = [1, 2, 3, 4, 6, 7, 8, 9];
  const yearOffset = (year - 1984 + 480) % 72; // 72年一元
  const gongIdx = yearOffset % 8;
  const taiyiGong = taiyiGongOrder[gongIdx];
  const taiyiShen = TAIYI_SHEN[(taiyiGong - 1 + 12) % 16];

  // 天目（文昌）：从太乙所在宫起，按十六神顺序顺行
  // 文昌在天目之前，年支加临
  const yearZhi = yearGZ[1];
  const zhiIdx2 = ZHI.indexOf(yearZhi as any);
  const tianmuOffset = ((zhiIdx2 >= 0 ? zhiIdx2 : 0) + taiyiGong) % 16;
  const tianmuShenIdx = tianmuOffset % 16;
  const tianmuShen = TAIYI_SHEN[tianmuShenIdx];
  // 天目宫位：十六神映射到九宫
  const tianmuGong = ((tianmuShenIdx % 9) + 1);

  // 计神：以年支加临，从寅宫起顺行
  // 计神起于寅宫，根据年支确定
  const jishenStartMap: Record<string, number> = {
    "子": 0, "丑": 1, "寅": 2, "卯": 3, "辰": 4, "巳": 5,
    "午": 6, "未": 7, "申": 8, "酉": 9, "戌": 10, "亥": 11,
  };
  const jishenShenIdx = (jishenStartMap[yearZhi] ?? 0) % 16;
  const jishenShen = TAIYI_SHEN[jishenShenIdx];
  const jishenGong = ((jishenShenIdx % 9) + 1);

  // 始击：从计神对位的天目出发（客目之对位）
  // 简化：始击 = (计神位置 + 天目偏移 + 8) % 16
  const shijiShenIdx = (jishenShenIdx + tianmuOffset + 8) % 16;
  const shijiShen = TAIYI_SHEN[shijiShenIdx];
  const shijiGong = ((shijiShenIdx % 9) + 1);

  // 主大将：文昌（天目）所在宫数，若为中五则取2
  const calcDaJiang = (gong: number): number => {
    if (gong === 5) return 2;
    return gong;
  };
  const zhuDaJiangGong = calcDaJiang(tianmuGong);
  const zhuDaJiang: [number, string] = [zhuDaJiangGong, PALACE_NAMES[zhuDaJiangGong]?.wuxing || "土"];
  // 主参将（小）将：主大将宫数×3 取个位（0作9）
  const zxj = (zhuDaJiangGong * 3) % 10;
  const zhuXiaoJiangGong = zxj === 0 ? 9 : (zxj === 5 ? 2 : zxj);
  const zhuXiaoJiang: [number, string] = [zhuXiaoJiangGong, PALACE_NAMES[zhuXiaoJiangGong]?.wuxing || "土"];

  // 客大将：始击所在宫
  const keDaJiangGong = calcDaJiang(shijiGong);
  const keDaJiang: [number, string] = [keDaJiangGong, PALACE_NAMES[keDaJiangGong]?.wuxing || "土"];
  // 客参将
  const kxj = (keDaJiangGong * 3) % 10;
  const keXiaoJiangGong = kxj === 0 ? 9 : (kxj === 5 ? 2 : kxj);
  const keXiaoJiang: [number, string] = [keXiaoJiangGong, PALACE_NAMES[keXiaoJiangGong]?.wuxing || "土"];

  // 定计：计神所在宫
  const dingjiGong = calcDaJiang(jishenGong);
  const dingjiShen = TAIYI_SHEN[jishenShenIdx];
  // 客目：与定计相对
  const kemuShenIdx = (jishenShenIdx + 8) % 16;
  const kemuShen = TAIYI_SHEN[kemuShenIdx];
  const kemuGong = ((kemuShenIdx % 9) + 1);

  // 四神：根据年月日时干支简化
  const sishen: Record<string, { gong: number; name: string }> = {
    "青龙": { gong: (taiyiGong % 9) + 1, name: "青龙" },
    "明堂": { gong: ((taiyiGong + 1) % 9) + 1, name: "明堂" },
    "金匮": { gong: ((taiyiGong + 3) % 9) + 1, name: "金匮" },
    "天德": { gong: ((taiyiGong + 5) % 9) + 1, name: "天德" },
  };

  // 君基臣基民基（按年行宫）
  // 君基：起午宫，顺行12年一移
  const junjiBase = 6; // 午=离九宫→6? 简化处理
  const junjiOffset = ((year - 1984) % 12);
  const junjiGong = ((junjiBase + junjiOffset - 1) % 9) + 1;
  // 臣基：起巳宫
  const chenjiBase = 4;
  const chenjiOffset = ((year - 1984) % 12);
  const chenjiGong = ((chenjiBase + chenjiOffset - 1) % 9) + 1;
  // 民基：起辰宫
  const minjiBase = 4;
  const minjiOffset = ((year - 1984) % 12);
  const minjiGong = ((minjiBase + minjiOffset) % 9) + 1;

  // 格局判定（简化规则）
  const geju: string[] = [];
  if (taiyiGong !== 5) {
    geju.push(`太乙${PALACE_NAMES[taiyiGong].bagua}宫（${PALACE_NAMES[taiyiGong].direction}方）`);
  }
  // 掩：太乙与始击同宫
  if (taiyiGong === shijiGong) geju.push("掩：始击掩太乙，主大臣专政，外敌入侵");
  // 迫：太乙在主/客大将宫位之上下
  if (taiyiGong === zhuDaJiangGong) geju.push("迫：太乙迫主大将，主大将受困");
  if (taiyiGong === keDaJiangGong) geju.push("格：太乙对客大将，主客相格");
  // 击：始击在太乙前后一宫
  if (Math.abs(taiyiGong - shijiGong) === 1 || (taiyiGong === 9 && shijiGong === 1) || (taiyiGong === 1 && shijiGong === 9)) {
    geju.push("击：始击击太乙，主下位犯上");
  }
  // 杜塞：太乙在八节三奇之外
  if (tianmuGong === taiyiGong) geju.push("杜塞：天目与太乙同宫，主闭塞不通");
  // 关：主客大小将同宫
  if (zhuDaJiangGong === keDaJiangGong) geju.push("关：主客大将同宫，主两将相拒");
  // 四神到位
  geju.push(`君基在${PALACE_NAMES[junjiGong]?.bagua || "中"}宫，臣基在${PALACE_NAMES[chenjiGong]?.bagua || "中"}宫，民基在${PALACE_NAMES[minjiGong]?.bagua || "中"}宫`);

  // 九宫数据
  const gongData: Record<number, { stars: string[]; wuxing: string; bagua: string; direction: string }> = {};
  for (let i = 1; i <= 9; i++) {
    const p = PALACE_NAMES[i];
    gongData[i] = { stars: [], wuxing: p.wuxing, bagua: p.bagua, direction: p.direction };
  }
  gongData[taiyiGong].stars.push("太乙");
  gongData[tianmuGong].stars.push("天目");
  gongData[shijiGong].stars.push("始击");
  gongData[jishenGong].stars.push("计神");
  gongData[zhuDaJiangGong].stars.push("主大将");
  gongData[zhuXiaoJiangGong].stars.push("主小将");
  gongData[keDaJiangGong].stars.push("客大将");
  gongData[keXiaoJiangGong].stars.push("客小将");
  gongData[dingjiGong].stars.push("定计");
  gongData[kemuGong].stars.push("客目");
  gongData[junjiGong].stars.push("君基");
  gongData[chenjiGong].stars.push("臣基");
  gongData[minjiGong].stars.push("民基");

  return {
    year, month, day, hour,
    yearGZ, monthGZ, dayGZ, hourGZ,
    lunarStr, jieqi,
    taiyiJiNian, taiyiGong, taiyiShen,
    tianmuGong, tianmuShen,
    jishenGong, jishenShen,
    shijiGong, shijiShen,
    zhuDaJiang, zhuXiaoJiang, keDaJiang, keXiaoJiang,
    dingjiGong, dingjiShen, kemuGong, kemuShen,
    sishen, junjiGong, chenjiGong, minjiGong,
    geju, gongData,
  };
}

// ============================================================================
// 主组件
// ============================================================================
export default function TaiyiSanshiPage() {
  const pageKey = "yixue_taiyi_sanshi"; const { showResult, savedParams, saveParams, goToResult } = useToolBack({ pageKey, eventName: "yixue-back", globalFlag: "__yixueBackHandled" });
  const [taiyiYear, setTaiyiYear] = useState(2026);
  const [taiyiMonth, setTaiyiMonth] = useState(1);
  const [taiyiDay, setTaiyiDay] = useState(1);
  const [taiyiHour, setTaiyiHour] = useState(12);

  useEffect(() => {
    const n = new Date();
    setTaiyiYear(n.getFullYear());
    setTaiyiMonth(n.getMonth() + 1);
    setTaiyiDay(n.getDate());
    setTaiyiHour(n.getHours());
  }, []);
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [result, setResult] = useState<TaiyiResult | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);
  const [showForm, setShowForm] = useState(true);
  const [interpretPanel, setInterpretPanel] = useState<{title: string; items: TaiyiInterpretItem[]} | null>(null);

  const doPaipan = useCallback((override?: {year: number; month: number; day: number; hour: number}) => {
    const y = override?.year ?? taiyiYear;
    const mo = override?.month ?? taiyiMonth;
    const d = override?.day ?? taiyiDay;
    const h = override?.hour ?? taiyiHour;
    setLoading(true);
    setTimeout(() => {
      const r = calcTaiyi(y, mo, d, h);
      setResult(r);
      setHasResult(true);
      setShowForm(false);
      setLoading(false);
      setInterpretPanel(null);
      savePaipanState("taiyi",{input:{taiyiYear:y,taiyiMonth:mo,taiyiDay:d,taiyiHour:h,desc},showForm:false,_ts:Date.now()});
      // 保存客户记录
      if(selectedClient && r){
        try{saveRecord({clientId:selectedClient.id,type:"taiyi-sanshi",data:{...r,inputParams:{taiyiYear:y,taiyiMonth:mo,taiyiDay:d,taiyiHour:h,desc}},note:"",status:"pending"});}catch(e){console.error("保存记录失败:",e);}
      }
    }, 200);
  }, [taiyiYear, taiyiMonth, taiyiDay, taiyiHour, selectedClient, desc]);

  // URL参数clientId + 回填检查
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) { const c = getClient(cid); if (c) setSelectedClient(c); }
    const prefill = getPrefillData("taiyi-sanshi");
    if (prefill) { try { setResult(prefill); setHasResult(true); clearPrefillData("taiyi-sanshi"); } catch(e){} }
  }, []);

  // localStorage 持久化：恢复排盘状态
  useEffect(() => {
    const saved = loadPaipanState("taiyi");
    if (saved && saved.input) {
      const inp = saved.input as any;
      if (inp.taiyiYear) setTaiyiYear(inp.taiyiYear);
      if (inp.taiyiMonth) setTaiyiMonth(inp.taiyiMonth);
      if (inp.taiyiDay) setTaiyiDay(inp.taiyiDay);
      if (inp.taiyiHour) setTaiyiHour(inp.taiyiHour);
      if (inp.desc) setDesc(inp.desc);
      if (saved.showForm === false) {
        doPaipan({year: inp.taiyiYear, month: inp.taiyiMonth, day: inp.taiyiDay, hour: inp.taiyiHour});
      }
    }
  }, []);

  // 监听layout的edit按钮事件
  useEffect(() => {
    const editHandler = () => setShowForm(true);
    const backHandler = () => {
      if (!showForm) { setShowForm(true); window.__yixueBackHandled = true; }
    };
    window.addEventListener("yixue-edit", editHandler);
    window.addEventListener("yixue-back", backHandler);
    return () => {
      window.removeEventListener("yixue-edit", editHandler);
      window.removeEventListener("yixue-back", backHandler);
    };
  }, []);

  const handlePalaceClick = useCallback((gong: number) => {
    const interp = getTaiyiPalaceInterpretation(gong);
    if (interp) setInterpretPanel(interp);
  }, []);

  // ==================== 输入表单 ====================
  if (showForm) {
    return (
      <div style={{ maxWidth: "375px", margin: "0 auto", backgroundColor: "#fff", minHeight: "100vh" }}>
        <DatePicker
          show={true}
          onClose={() => setShowForm(false)}
          onSubmit={(dateVal) => {
            setTaiyiYear(dateVal.year);
            setTaiyiMonth(dateVal.month);
            setTaiyiDay(dateVal.day);
            setTaiyiHour(dateVal.hour);
            doPaipan({year: dateVal.year, month: dateVal.month, day: dateVal.day, hour: dateVal.hour});
          }}
          initialDate={{year: taiyiYear, month: taiyiMonth, day: taiyiDay, hour: taiyiHour, minute: 0}}
          showMinute={true}
          showGender={false} showCalType={true} showToggles={false} showRegion={false} showName={false}
          submitText="排盘" title="太乙三式排盘"
        />
      </div>
    );
  }

  // ==================== 排盘结果 ====================
  if (!result) {
    return (
      <div className="bg-[#ededed] min-h-screen flex justify-center">
        <div className="w-full" style={{ maxWidth: "375px" }}>
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
            <button onClick={() => { clearPaipanState("taiyi"); setShowForm(true); }} className="rounded-full bg-[#7B2FBE] text-white font-bold text-lg px-8 py-3 shadow-lg">开始排盘</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full bg-[#ededed]" style={{ maxWidth: "375px", minHeight: "100vh" }}>
      {/* 排盘结果 */}
      {result && (
        <div className="bg-white px-2 py-2">
          {/* 基本信息表 */}
          <table className="w-full border-collapse text-center text-sm" style={{ tableLayout: "fixed" }}>
            <colgroup><col width="20%" /><col width="20%" /><col width="20%" /><col width="20%" /><col width="20%" /></colgroup>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-xs font-medium text-gray-500">事项</td>
                <td colSpan={4} className="py-1.5 text-sm" style={{ color: BRAND }}>
                  {desc || "（未填写）"}
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-xs font-medium text-gray-500">公历</td>
                <td colSpan={4} className="py-1.5 text-sm">
                  {result.year}年{result.month}月{result.day}日 {result.hour}时
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-xs font-medium text-gray-500">农历</td>
                <td colSpan={4} className="py-1.5 text-sm">{result.lunarStr}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-xs font-medium text-gray-500">节气</td>
                <td colSpan={4} className="py-1.5 text-sm">{result.jieqi}</td>
              </tr>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <td className="py-1"></td>
                <td className="py-1 text-xs font-medium text-gray-500">年柱</td>
                <td className="py-1 text-xs font-medium text-gray-500">月柱</td>
                <td className="py-1 text-xs font-medium text-gray-500">日柱</td>
                <td className="py-1 text-xs font-medium text-gray-500">时柱</td>
              </tr>
              <tr>
                <td className="py-1 text-xs font-medium text-gray-500">四柱</td>
                {[result.yearGZ, result.monthGZ, result.dayGZ, result.hourGZ].map((gz, i) => (
                  <td key={i} className="py-1">
                    <div className="text-lg font-bold leading-tight">{gz[0]}</div>
                    <div className="text-lg font-bold leading-tight">{gz[1]}</div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>

          {/* 核心星神一览 */}
          <div className="mt-3 rounded-lg border border-purple-100 bg-purple-50/30 p-2.5">
            <div className="mb-2 text-center text-sm font-bold" style={{ color: BRAND }}>核心星神</div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { label: "太乙", value: `${result.taiyiShen}(${PALACE_NAMES[result.taiyiGong].bagua}${result.taiyiGong}宫)`, highlight: true },
                { label: "天目(文昌)", value: `${result.tianmuShen}(${result.tianmuGong}宫)` },
                { label: "计神", value: `${result.jishenShen}(${result.jishenGong}宫)` },
                { label: "始击", value: `${result.shijiShen}(${result.shijiGong}宫)` },
                { label: "定计", value: `${result.dingjiShen}(${result.dingjiGong}宫)` },
                { label: "客目", value: `${result.kemuShen}(${result.kemuGong}宫)` },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1 rounded bg-white px-2 py-1">
                  <span className="text-gray-500 shrink-0">{item.label}：</span>
                  <span className={`font-medium ${item.highlight ? "font-bold" : ""}`} style={{ color: item.highlight ? BRAND : "#333" }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 主客大将 */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-blue-100 bg-blue-50/30 p-2.5">
              <div className="mb-1 text-center text-xs font-bold text-blue-700">主方（我军）</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">主大将</span><span className="font-bold">{result.zhuDaJiang[0]}宫 {PALACE_NAMES[result.zhuDaJiang[0]]?.bagua}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">主小将</span><span className="font-bold">{result.zhuXiaoJiang[0]}宫 {PALACE_NAMES[result.zhuXiaoJiang[0]]?.bagua}</span></div>
              </div>
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50/30 p-2.5">
              <div className="mb-1 text-center text-xs font-bold text-red-700">客方（敌军）</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">客大将</span><span className="font-bold">{result.keDaJiang[0]}宫 {PALACE_NAMES[result.keDaJiang[0]]?.bagua}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">客小将</span><span className="font-bold">{result.keXiaoJiang[0]}宫 {PALACE_NAMES[result.keXiaoJiang[0]]?.bagua}</span></div>
              </div>
            </div>
          </div>

          {/* 三基 */}
          <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/30 p-2.5">
            <div className="mb-1 text-center text-xs font-bold text-amber-700">三基（君·臣·民）</div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div><div className="text-gray-500">君基</div><div className="font-bold">{PALACE_NAMES[result.junjiGong]?.bagua}{result.junjiGong}宫</div></div>
              <div><div className="text-gray-500">臣基</div><div className="font-bold">{PALACE_NAMES[result.chenjiGong]?.bagua}{result.chenjiGong}宫</div></div>
              <div><div className="text-gray-500">民基</div><div className="font-bold">{PALACE_NAMES[result.minjiGong]?.bagua}{result.minjiGong}宫</div></div>
            </div>
          </div>

          {/* 太乙九宫格 */}
          <div className="mt-4">
            <div className="mb-2 text-center text-sm font-bold" style={{ color: BRAND }}>太乙九宫盘</div>
            <div className="flex justify-center">
              <div
                className="grid"
                style={{
                  gridTemplateRows: "80px 80px 80px",
                  gridTemplateColumns: "80px 80px 80px",
                  width: "240px",
                  height: "240px",
                  fontSize: "10px",
                }}
              >
                {PALACE_ORDER.map((pos, idx) => {
                  const p = result.gongData[pos];
                  const isTaiyi = pos === result.taiyiGong;
                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-center justify-center border text-center"
                      style={{
                        marginLeft: "-1px",
                        marginTop: "-1px",
                        borderColor: isTaiyi ? BRAND : "#333",
                        borderWidth: isTaiyi ? "2px" : "1px",
                        backgroundColor: isTaiyi ? "#f3edf7" : "white",
                        cursor: "pointer",
                      }}
                      onClick={() => handlePalaceClick(pos)}
                      title={`点击查看${p.bagua}宫解读`}
                    >
                      <div className="text-[10px] font-bold" style={{ color: WUXING_COLORS[p.wuxing] }}>
                        {p.bagua}({pos})
                      </div>
                      <div className="text-[9px] text-gray-500">{p.direction}·{p.wuxing}</div>
                      <div className="mt-0.5 text-[9px] leading-tight" style={{ color: isTaiyi ? BRAND : "#666" }}>
                        {p.stars.slice(0, 3).join(" ")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ textAlign: "center", marginTop: "6px", fontSize: "10px", color: "#999" }}>
              点击宫格查看解读
            </div>
          </div>

          {/* 解读抽屉面板 */}
          {interpretPanel && (
            <div className="mt-3 rounded-lg" style={{
              border: "1px solid #7B2FBE",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(123, 47, 190, 0.12)",
            }}>
              {/* 标题栏 */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                background: "linear-gradient(135deg, #7B2FBE, #9B5ECF)",
                color: "white",
              }}>
                <span style={{ fontSize: "15px", fontWeight: "bold" }}>
                  {interpretPanel.title}
                </span>
                <button
                  onClick={() => setInterpretPanel(null)}
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    border: "none",
                    color: "white",
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    cursor: "pointer",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {"\u2715"}
                </button>
              </div>

              {/* 内容区 */}
              <div style={{ padding: "10px 12px", maxHeight: "360px", overflowY: "auto", background: "white" }}>
                {interpretPanel.items.map((item, idx) => {
                  const tc = INTERPRET_TYPE_COLORS[item.type] || INTERPRET_TYPE_COLORS["palace"];
                  return (
                    <div key={idx} style={{ marginBottom: idx < interpretPanel.items.length - 1 ? "10px" : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{
                          fontSize: "10px",
                          fontWeight: "bold",
                          padding: "1px 6px",
                          borderRadius: "3px",
                          background: tc.bg,
                          color: tc.fg,
                          marginRight: "8px",
                          flexShrink: 0,
                        }}>
                          {tc.label}
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: "bold", color: "#333" }}>{item.title}</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#555", lineHeight: "1.7", whiteSpace: "pre-line" }}>
                        {item.content}
                      </div>
                      <div style={{ fontSize: "10px", color: "#999", marginTop: "4px", fontStyle: "italic" }}>
                        —— {item.source}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 底部提示 */}
              <div style={{
                padding: "6px 12px",
                background: "#fafafa",
                borderTop: "1px solid #eee",
                fontSize: "10px",
                color: "#999",
                textAlign: "center",
              }}>
                点击宫格查看解读 · 引经据典，仅供参考
              </div>
            </div>
          )}

          {/* 格局判定 */}
          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
            <div className="mb-2 text-sm font-bold" style={{ color: BRAND }}>格局判定</div>
            <div className="space-y-1.5">
              {result.geju.map((g, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: BRAND }} />
                  <span className="text-gray-700 leading-relaxed">{g}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 排盘按钮 */}
          <div className="mt-3 flex gap-2 px-1">
            <button
              onClick={() => doPaipan()}
              disabled={loading}
              className="flex-1 rounded-full py-2 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: BRAND }}
            >
              重新排盘
            </button>
          </div>
        </div>
      )}

      {/* 免责声明 */}
      <div className="mx-3 mt-4 rounded-lg border border-red-100 bg-red-50/50 p-3">
        <p className="text-xs leading-relaxed text-gray-500">
          <strong>免责声明：</strong>本页面内容仅供传统文化学习与参考，不构成任何决策建议。太乙神数为古代三式之首，排盘结果为简化算法演示，完整太乙术涉及太乙积年、五福十精等复杂推算，请理性看待。
        </p>
        <p className="mt-1 text-xs text-gray-400">算法依据：《太乙金镜式经》《太乙统宗宝鉴》</p>
      </div>
      <div style={{ height: "20px" }} />
    </div>
  );
}
