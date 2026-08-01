"use client";

import { useState, useCallback, useEffect } from "react";
import { DatePicker } from "@/components/shared";
import ClientSelector from "@/components/ClientSelector";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";

// ============================================================================
// 常量
// ============================================================================
const BRAND = "#7B2FBE";

// 二十四山（坐山）
const ER_SHI_SI_SHAN = [
  "壬", "子", "癸", "丑", "艮", "寅",
  "甲", "卯", "乙", "辰", "巽", "巳",
  "丙", "午", "丁", "未", "坤", "申",
  "庚", "酉", "辛", "戌", "乾", "亥",
];

// 二十四山对应方位和阴阳
const SHAN_INFO: Record<string, { direction: string; yinYang: "阴" | "阳"; wuxing: string }> = {
  "壬": { direction: "北偏西", yinYang: "阳", wuxing: "水" },
  "子": { direction: "正北", yinYang: "阳", wuxing: "水" },
  "癸": { direction: "北偏东", yinYang: "阴", wuxing: "水" },
  "丑": { direction: "东北偏北", yinYang: "阴", wuxing: "土" },
  "艮": { direction: "东北", yinYang: "阳", wuxing: "土" },
  "寅": { direction: "东北偏东", yinYang: "阳", wuxing: "木" },
  "甲": { direction: "东偏北", yinYang: "阳", wuxing: "木" },
  "卯": { direction: "正东", yinYang: "阴", wuxing: "木" },
  "乙": { direction: "东偏南", yinYang: "阴", wuxing: "木" },
  "辰": { direction: "东南偏东", yinYang: "阳", wuxing: "土" },
  "巽": { direction: "东南", yinYang: "阴", wuxing: "木" },
  "巳": { direction: "东南偏南", yinYang: "阴", wuxing: "火" },
  "丙": { direction: "南偏东", yinYang: "阳", wuxing: "火" },
  "午": { direction: "正南", yinYang: "阳", wuxing: "火" },
  "丁": { direction: "南偏西", yinYang: "阴", wuxing: "火" },
  "未": { direction: "西南偏南", yinYang: "阴", wuxing: "土" },
  "坤": { direction: "西南", yinYang: "阳", wuxing: "土" },
  "申": { direction: "西南偏西", yinYang: "阳", wuxing: "金" },
  "庚": { direction: "西偏南", yinYang: "阳", wuxing: "金" },
  "酉": { direction: "正西", yinYang: "阴", wuxing: "金" },
  "辛": { direction: "西偏北", yinYang: "阴", wuxing: "金" },
  "戌": { direction: "西北偏西", yinYang: "阳", wuxing: "土" },
  "乾": { direction: "西北", yinYang: "阳", wuxing: "金" },
  "亥": { direction: "西北偏北", yinYang: "阴", wuxing: "水" },
};

// 九宫排列（洛书）
const LUOSHU_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6]; // 巽离坤震中兑艮坎乾
const GONG_NAMES: Record<number, { name: string; bagua: string; direction: string }> = {
  1: { name: "坎", bagua: "坎", direction: "北" },
  2: { name: "坤", bagua: "坤", direction: "西南" },
  3: { name: "震", bagua: "震", direction: "东" },
  4: { name: "巽", bagua: "巽", direction: "东南" },
  5: { name: "中", bagua: "中", direction: "中宫" },
  6: { name: "乾", bagua: "乾", direction: "西北" },
  7: { name: "兑", bagua: "兑", direction: "西" },
  8: { name: "艮", bagua: "艮", direction: "东北" },
  9: { name: "离", bagua: "离", direction: "南" },
};

// 九宫对应的卦名（用于挨星）
const GONG_TO_GUA: Record<number, string> = {
  1: "坎", 2: "坤", 3: "震", 4: "巽", 5: "中", 6: "乾", 7: "兑", 8: "艮", 9: "离",
};

// 飞星名称
const STAR_NAMES = ["", "一白", "二黑", "三碧", "四绿", "五黄", "六白", "七赤", "八白", "九紫"];
const STAR_FULL = ["", "一白贪狼", "二黑巨门", "三碧禄存", "四绿文曲", "五黄廉贞", "六白武曲", "七赤破军", "八白左辅", "九紫右弼"];

// 九星五行
const STAR_WUXING: Record<number, string> = {
  1: "水", 2: "土", 3: "木", 4: "木", 5: "土", 6: "金", 7: "金", 8: "土", 9: "火",
};

// 五行颜色
const WUXING_COLORS: Record<string, string> = {
  "金": "#ffa500", "木": "#00a879", "水": "#0074e4", "火": "#ed4d49", "土": "#a64b00",
};

// 三元九运
function getYunFromYear(year: number): number {
  if (year >= 1864 && year <= 1883) return 1;
  if (year >= 1884 && year <= 1903) return 2;
  if (year >= 1904 && year <= 1923) return 3;
  if (year >= 1924 && year <= 1943) return 4;
  if (year >= 1944 && year <= 1963) return 5;
  if (year >= 1964 && year <= 1983) return 6;
  if (year >= 1984 && year <= 2003) return 7;
  if (year >= 2004 && year <= 2023) return 8;
  if (year >= 2024 && year <= 2043) return 9;
  if (year >= 2044 && year <= 2063) return 1;
  return 9;
}

function getYunName(yun: number): string {
  const names = ["", "上元一运", "上元二运", "上元三运", "中元四运", "中元五运", "中元六运", "下元七运", "下元八运", "下元九运"];
  return names[yun] || "下元九运";
}

// 二十四山在九宫中的位置（每个宫有三山：天元龙、地元龙、人元龙）
// 坎宫：壬(地)、子(天)、癸(人) - 正北
// 坤宫：未(地)、坤(天)、申(人) - 西南
// 震宫：甲(地)、卯(天)、乙(人) - 东
// 巽宫：辰(地)、巽(天)、巳(人) - 东南
// 中宫：(无山)
// 乾宫：戌(地)、乾(天)、亥(人) - 西北
// 兑宫：庚(地)、酉(天)、辛(人) - 西
// 艮宫：丑(地)、艮(天)、寅(人) - 东北
// 离宫：丙(地)、午(天)、丁(人) - 南
const SHAN_TO_GONG: Record<string, number> = {
  "壬": 1, "子": 1, "癸": 1,
  "丑": 8, "艮": 8, "寅": 8,
  "甲": 3, "卯": 3, "乙": 3,
  "辰": 4, "巽": 4, "巳": 4,
  "丙": 9, "午": 9, "丁": 9,
  "未": 2, "坤": 2, "申": 2,
  "庚": 7, "酉": 7, "辛": 7,
  "戌": 6, "乾": 6, "亥": 6,
};

// 二十四山对应的元龙（天/地/人）和阴阳（决定顺逆飞）
// 天元龙（四维八干正中）：子午卯酉（阳）、乾坤艮巽（阳）→ 但注意实际阴阳有争议
// 简化规则：阳顺阴逆，按传统玄空法
const SHAN_LONG: Record<string, { long: "天" | "地" | "人"; yinYang: "顺" | "逆" }> = {
  // 坎宫
  "壬": { long: "地", yinYang: "逆" }, "子": { long: "天", yinYang: "顺" }, "癸": { long: "人", yinYang: "逆" },
  // 艮宫
  "丑": { long: "地", yinYang: "逆" }, "艮": { long: "天", yinYang: "顺" }, "寅": { long: "人", yinYang: "顺" },
  // 震宫
  "甲": { long: "地", yinYang: "顺" }, "卯": { long: "天", yinYang: "逆" }, "乙": { long: "人", yinYang: "逆" },
  // 巽宫
  "辰": { long: "地", yinYang: "顺" }, "巽": { long: "天", yinYang: "逆" }, "巳": { long: "人", yinYang: "逆" },
  // 离宫
  "丙": { long: "地", yinYang: "逆" }, "午": { long: "天", yinYang: "顺" }, "丁": { long: "人", yinYang: "逆" },
  // 坤宫
  "未": { long: "地", yinYang: "逆" }, "坤": { long: "天", yinYang: "顺" }, "申": { long: "人", yinYang: "顺" },
  // 兑宫
  "庚": { long: "地", yinYang: "顺" }, "酉": { long: "天", yinYang: "逆" }, "辛": { long: "人", yinYang: "逆" },
  // 乾宫
  "戌": { long: "地", yinYang: "顺" }, "乾": { long: "天", yinYang: "逆" }, "亥": { long: "人", yinYang: "逆" },
};

// 洛书飞星轨迹（顺飞：中→乾→兑→艮→离→坎→坤→震→巽）
// 九宫编号(洛书): 中5, 乾6, 兑7, 艮8, 离9, 坎1, 坤2, 震3, 巽4
// 顺飞顺序: 5→6→7→8→9→1→2→3→4 (对应位置)
// 逆飞顺序: 5→4→3→2→1→9→8→7→6
const FEIXING_PATH_SHUN = [5, 6, 7, 8, 9, 1, 2, 3, 4];
const FEIXING_PATH_NI = [5, 4, 3, 2, 1, 9, 8, 7, 6];

// 将洛书路径索引映射到显示顺序
const DISPLAY_POS_TO_LUOSHU = [4, 9, 2, 3, 5, 7, 8, 1, 6]; // 显示位置索引→洛书宫号

/**
 * 根据入中星和顺逆，分配九星到各宫
 */
function feixing(centerStar: number, isShun: boolean): Record<number, number> {
  const result: Record<number, number> = {};
  const path = isShun ? FEIXING_PATH_SHUN : FEIXING_PATH_NI;
  for (let i = 0; i < 9; i++) {
    const palace = path[i];
    result[palace] = ((centerStar + i - 1) % 9) + 1;
  }
  return result;
}

/**
 * 根据坐山和元运，找出山星和向星入中数，并确定顺逆飞
 * 简化版玄空飞星算法
 */
function calcXuankong(zuoShan: string, xiangShan: string, yun: number, floor: number) {
  // 1. 运星盘：运星入中顺飞
  const yunPan = feixing(yun, true);

  // 2. 找到坐山和向方所在宫位
  const zuoGong = SHAN_TO_GONG[zuoShan];
  const xiangGong = SHAN_TO_GONG[xiangShan];

  // 3. 山星：坐山所在宫位的运星数字入中，根据坐山阴阳决定顺逆
  const shanStarCenter = yunPan[zuoGong];
  const zuoLongInfo = SHAN_LONG[zuoShan];
  const shanShun = zuoLongInfo?.yinYang === "顺";
  const shanPan = feixing(shanStarCenter, shanShun);

  // 4. 向星：向方所在宫位的运星数字入中，根据向首山的阴阳决定顺逆
  //    向首即与坐山相对的山，其元龙与坐山相同
  const xiangStarCenter = yunPan[xiangGong];
  const xiangLongInfo = SHAN_LONG[xiangShan];
  const xiangShun = xiangLongInfo?.yinYang === "顺";
  const xiangPan = feixing(xiangStarCenter, xiangShun);

  // 5. 楼层五行（简化：楼层数 mod 5，1水2火3木4金5土，循环）
  const floorWuxingMap = ["水", "火", "木", "金", "土"];
  const floorWuxing = floorWuxingMap[(floor - 1) % 5];

  // 6. 宅命图数据
  const zhaiMingData: Record<number, { yun: number; shan: number; xiang: number }> = {};
  for (let i = 1; i <= 9; i++) {
    zhaiMingData[i] = {
      yun: yunPan[i] || 5,
      shan: shanPan[i] || 5,
      xiang: xiangPan[i] || 5,
    };
  }

  // 7. 判断各宫吉凶组合
  const gongAnalysis: Record<number, {
    shanStar: number; xiangStar: number;
    jiXiong: "旺" | "生" | "退" | "煞" | "死" | "平";
    desc: string;
  }> = {};

  for (let i = 1; i <= 9; i++) {
    const ss = shanPan[i] || 5;
    const xs = xiangPan[i] || 5;
    let jiXiong: "旺" | "生" | "退" | "煞" | "死" | "平" = "平";
    let desc = "";

    // 旺山旺向：当运星到山到向
    if (ss === yun && xs === yun) {
      jiXiong = "旺"; desc = "旺山旺向，丁财两旺，大吉之局";
    }
    // 双星会向：山星向星都在向方且为当运
    else if (i === xiangGong && ss === yun && xs === yun) {
      jiXiong = "旺"; desc = "双星会向，旺财旺丁";
    }
    // 上山下水：山星到向、向星到山，损丁破财
    else if (i === xiangGong && ss === yun && i === zuoGong && xs === yun) {
      jiXiong = "死"; desc = "上山下水，损丁破财，大凶之局";
    }
    // 吉星组合
    else if ([1, 6, 8, 9].includes(ss) && [1, 6, 8, 9].includes(xs)) {
      jiXiong = "生"; desc = "吉星组合，主吉利旺运";
    }
    // 凶星组合
    else if ([2, 5, 7].includes(ss) && [2, 5, 7].includes(xs)) {
      jiXiong = "煞"; desc = "凶星组合，需防疾病是非";
    }
    // 三碧是非
    else if (ss === 3 || xs === 3) {
      jiXiong = "煞"; desc = "三碧是非，主口舌官非";
    }
    // 退运
    else if (ss < yun && xs < yun) {
      jiXiong = "退"; desc = "退气之宫，运势渐退";
    }
    else {
      jiXiong = "平"; desc = "平宫，吉凶参半";
    }

    gongAnalysis[i] = { shanStar: ss, xiangStar: xs, jiXiong, desc };
  }

  // 8. 坐向信息
  const zuoInfo = SHAN_INFO[zuoShan];
  const xiangInfo = SHAN_INFO[xiangShan];
  // 获取对宫名称（坐→向）
  const oppositeShan = ER_SHI_SI_SHAN[(ER_SHI_SI_SHAN.indexOf(zuoShan) + 12) % 24];

  return {
    yun, yunName: getYunName(yun),
    zuoShan, xiangShan: oppositeShan,
    zuoInfo, xiangInfo: SHAN_INFO[oppositeShan],
    floor, floorWuxing,
    yunPan, shanPan, xiangPan,
    zhaiMingData, gongAnalysis,
    zuoGong, xiangGong,
    shanStarCenter, xiangStarCenter,
    shanShun, xiangShun,
  };
}

// 飞星吉凶颜色
function getStarColor(num: number, isYunStar: boolean): string {
  if (isYunStar) return "#333";
  const colors: Record<number, string> = {
    1: "#0074e4", 2: "#a64b00", 3: "#00a879", 4: "#00a879",
    5: "#ed4d49", 6: "#ffa500", 7: "#ed4d49", 8: "#a64b00", 9: "#9B5ECF",
  };
  return colors[num] || "#333";
}

function getJiXiongColor(jx: string): { bg: string; text: string } {
  switch (jx) {
    case "旺": return { bg: "bg-red-50 border-red-200", text: "text-red-700" };
    case "生": return { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" };
    case "平": return { bg: "bg-gray-50 border-gray-200", text: "text-gray-600" };
    case "退": return { bg: "bg-amber-50 border-amber-200", text: "text-amber-700" };
    case "煞": return { bg: "bg-red-50 border-red-200", text: "text-red-600" };
    case "死": return { bg: "bg-red-100 border-red-300", text: "text-red-800" };
    default: return { bg: "bg-gray-50 border-gray-200", text: "text-gray-600" };
  }
}

// ============================================================================
// 主组件
// ============================================================================
export default function XuankongFeixingPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const defaultYun = getYunFromYear(currentYear);

  const [buildYear, setBuildYear] = useState(currentYear);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [hour, setHour] = useState(12);
  const [zuoShan, setZuoShan] = useState("子");
  const [floor, setFloor] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof calcXuankong> | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);

  // 向山自动计算（坐山对宫）
  const xiangShan = ER_SHI_SI_SHAN[(ER_SHI_SI_SHAN.indexOf(zuoShan) + 12) % 24];
  const currentYun = getYunFromYear(buildYear);

  const doPaipan = useCallback((overrideYear?: number) => {
    const effYear = overrideYear ?? buildYear;
    const yun = getYunFromYear(effYear);
    setLoading(true);
    setTimeout(() => {
      const r = calcXuankong(zuoShan, xiangShan, yun, floor);
      setResult(r);
      setHasResult(true);
      setLoading(false);
      // 保存客户记录
      if(selectedClient && r){
        try{saveRecord({clientId:selectedClient.id,type:"xuankong-feixing",data:{...r,inputParams:{zuoShan,xiangShan,buildYear:effYear,floor}},note:"",status:"pending"});}catch(e){console.error("保存记录失败:",e);}
      }
    }, 200);
  }, [zuoShan, xiangShan, buildYear, floor, selectedClient]);

  // URL参数clientId + 回填检查
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) { const c = getClient(cid); if (c) setSelectedClient(c); }
    const prefill = getPrefillData("xuankong-feixing");
    if (prefill) { try { setResult(prefill); setHasResult(true); clearPrefillData("xuankong-feixing"); } catch(e){} }
  }, []);

  useEffect(() => {
    const handler = () => setHasResult(false);
    window.addEventListener("yixue-edit", handler);
    return () => window.removeEventListener("yixue-edit", handler);
  }, []);

  return (
    <div className="mx-auto w-full bg-[#ededed]" style={{ maxWidth: "375px", minHeight: "100vh" }}>
      {/* 建造日期选择弹窗 */}
      <DatePicker
        show={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={(dateVal) => {
          setBuildYear(dateVal.year);
          setMonth(dateVal.month);
          setDay(dateVal.day);
          setHour(dateVal.hour);
          setShowForm(false);
          doPaipan(dateVal.year);
        }}
        initialDate={{ year: buildYear, month, day, hour, minute: 0 }}
        showMinute={false}
        showGender={false} showCalType={true} showToggles={false} showRegion={false} showName={false}
        submitText="排盘" title="玄空飞星排盘"
      />

      {/* 输入表单 */}
      {!hasResult && (
        <div className="bg-white px-3 py-3">
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">建筑坐山（二十四山）</label>
            <div className="grid grid-cols-6 gap-1">
              {ER_SHI_SI_SHAN.map((s) => (
                <button
                  key={s}
                  onClick={() => setZuoShan(s)}
                  className={`rounded py-1.5 text-sm font-medium transition-all ${
                    zuoShan === s
                      ? "text-white"
                      : "bg-gray-100 text-gray-600 active:bg-gray-200"
                  }`}
                  style={zuoShan === s ? { backgroundColor: BRAND } : {}}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-gray-400">
              {SHAN_INFO[zuoShan].direction}（{SHAN_INFO[zuoShan].yinYang}），向：{xiangShan}（{SHAN_INFO[xiangShan].direction}）
            </p>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">
              建造年份（元运）
              <span className="ml-2 rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: BRAND }}>
                {getYunName(currentYun)}
              </span>
            </label>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-left text-sm transition-colors active:bg-gray-50"
            >
              <span className="font-medium text-gray-700">
                {buildYear}年{month}月{day}日 {hour}时
              </span>
              <span className="text-xs text-gray-400">点击修改</span>
            </button>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">楼层</label>
            <input
              type="number"
              value={floor}
              onChange={(e) => setFloor(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              max={200}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7B2FBE]"
            />
          </div>

          {/* 客户选择 */}
          <div className="mb-2">
            <ClientSelector selectedClient={selectedClient} onSelect={setSelectedClient} />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => doPaipan()}
              disabled={loading}
              className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: BRAND }}
            >
              {loading ? "排盘中..." : "开始排盘"}
            </button>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center py-8 text-gray-400">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <p className="mt-3 text-sm">选择坐山、建造年份和楼层后点击"开始排盘"</p>
            <p className="mt-1 text-xs text-gray-300">玄空飞星 · 沈氏玄空学</p>
          </div>
        </div>
      )}

      {/* 排盘结果 */}
      {hasResult && result && (
        <div className="bg-white px-2 py-2">
          {/* 基本信息 */}
          <div className="mb-2 rounded-lg bg-purple-50/40 p-2.5">
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div><span className="text-gray-500">元运：</span><span className="font-bold" style={{ color: BRAND }}>{result.yunName}</span></div>
              <div><span className="text-gray-500">建造年：</span><span className="font-bold">{buildYear}年</span></div>
              <div><span className="text-gray-500">坐山：</span><span className="font-bold">{result.zuoShan}（{result.zuoInfo.direction}）</span></div>
              <div><span className="text-gray-500">朝向：</span><span className="font-bold">{result.xiangShan}（{result.xiangInfo.direction}）</span></div>
              <div><span className="text-gray-500">楼层：</span><span className="font-bold">{floor}楼（{result.floorWuxing}）</span></div>
              <div><span className="text-gray-500">山星顺逆：</span><span className="font-bold">{result.shanShun ? "顺飞" : "逆飞"}</span></div>
            </div>
          </div>

          {/* 宅命图（九宫格） */}
          <div className="mt-3">
            <div className="mb-2 text-center text-sm font-bold" style={{ color: BRAND }}>宅命飞星盘</div>
            <div className="mb-1 flex justify-center gap-3 text-[10px] text-gray-500">
              <span><span className="inline-block w-2 h-2 rounded-full mr-0.5" style={{ backgroundColor: "#333" }}></span>运星</span>
              <span><span className="inline-block w-2 h-2 rounded-full mr-0.5" style={{ backgroundColor: "#0074e4" }}></span>山星</span>
              <span><span className="inline-block w-2 h-2 rounded-full mr-0.5" style={{ backgroundColor: "#ed4d49" }}></span>向星</span>
            </div>
            <div className="flex justify-center">
              <div
                className="grid"
                style={{
                  gridTemplateRows: "75px 75px 75px",
                  gridTemplateColumns: "75px 75px 75px",
                  width: "225px",
                  height: "225px",
                  fontSize: "11px",
                }}
              >
                {LUOSHU_ORDER.map((gong, idx) => {
                  const zmd = result.zhaiMingData[gong];
                  const analysis = result.gongAnalysis[gong];
                  const isZuo = gong === result.zuoGong;
                  const isXiang = gong === result.xiangGong;
                  const gongName = GONG_NAMES[gong];
                  const jxColor = getJiXiongColor(analysis.jiXiong);

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col border text-center ${jxColor.bg}`}
                      style={{
                        marginLeft: "-1px",
                        marginTop: "-1px",
                        borderColor: isZuo || isXiang ? BRAND : "#999",
                        borderWidth: isZuo || isXiang ? "2px" : "1px",
                      }}
                    >
                      {/* 宫名 */}
                      <div className="flex items-center justify-between px-0.5" style={{ fontSize: "9px" }}>
                        <span className="font-bold">{gongName.name}{gong}</span>
                        {isZuo && <span className="text-[8px] font-bold" style={{ color: BRAND }}>坐</span>}
                        {isXiang && <span className="text-[8px] font-bold" style={{ color: BRAND }}>向</span>}
                      </div>
                      {/* 三星 */}
                      <div className="flex flex-1 items-center justify-center">
                        <div className="grid grid-cols-2 text-center" style={{ lineHeight: "1" }}>
                          <span style={{ fontSize: "10px", color: getStarColor(zmd.shan, false), fontWeight: "bold" }}>{zmd.shan}</span>
                          <span style={{ fontSize: "10px", color: getStarColor(zmd.xiang, false), fontWeight: "bold" }}>{zmd.xiang}</span>
                          <span className="col-span-2" style={{ fontSize: "14px", color: getStarColor(zmd.yun, true), fontWeight: "bold" }}>{zmd.yun}</span>
                        </div>
                      </div>
                      {/* 吉凶标记 */}
                      <div className={`text-[9px] font-bold ${jxColor.text}`}>
                        {analysis.jiXiong}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="mt-1 text-center text-[10px] text-gray-400">格式：山星(左上) 向星(右上) 运星(中)</p>
          </div>

          {/* 各宫详解 */}
          <div className="mt-4 space-y-2">
            <div className="text-sm font-bold" style={{ color: BRAND }}>各宫飞星组合吉凶</div>
            {LUOSHU_ORDER.map((gong) => {
              const analysis = result.gongAnalysis[gong];
              const zmd = result.zhaiMingData[gong];
              const gongName = GONG_NAMES[gong];
              const jxColor = getJiXiongColor(analysis.jiXiong);
              return (
                <div key={gong} className={`rounded-lg border p-2 ${jxColor.bg}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{gongName.name}{gong}宫（{gongName.direction}）</span>
                    <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${jxColor.text}`}>
                      {analysis.jiXiong}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-500">
                    <span>山星<b style={{ color: getStarColor(zmd.shan, false) }}>{STAR_NAMES[zmd.shan]}</b></span>
                    <span>向星<b style={{ color: getStarColor(zmd.xiang, false) }}>{STAR_NAMES[zmd.xiang]}</b></span>
                    <span>运星<b>{STAR_NAMES[zmd.yun]}</b></span>
                  </div>
                  <p className={`mt-1 text-xs ${jxColor.text}`}>{analysis.desc}</p>
                </div>
              );
            })}
          </div>

          {/* 九星说明 */}
          <div className="mt-3 rounded-lg border border-gray-200 p-2.5">
            <div className="mb-1.5 text-xs font-bold" style={{ color: BRAND }}>九星吉凶释义</div>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <div key={n} className="flex items-center gap-1">
                  <span className="font-bold" style={{ color: getStarColor(n, false) }}>{n}{STAR_NAMES[n]}</span>
                  <span className="text-gray-500">{STAR_WUXING[n]}</span>
                  <span className={[1, 6, 8, 9].includes(n) ? "text-emerald-600" : "text-red-500"}>
                    {[1, 6, 8, 9].includes(n) ? "吉" : "凶"}
                  </span>
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
          <strong>免责声明：</strong>本页面内容仅供传统文化学习与参考，不构成任何决策建议。玄空飞星为风水学重要流派，排盘结果为简化算法演示，实际风水堪舆需结合形峦、理气、外局等综合判断，请理性看待。
        </p>
        <p className="mt-1 text-xs text-gray-400">算法依据：《沈氏玄空学》《玄空紫白诀》</p>
      </div>
      <div style={{ height: "20px" }} />
    </div>
  );
}
