"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { leaveToolPage, isManagedBackNavigation } from "@/lib/leaveToolPage";
import { Solar } from "lunar-javascript";
import { calculateQimen } from "@/algorithm-core";
import type { QimenResult, PanMethod, PanLayoutMode, JiGongMethod, QimenTimeType, AnganType } from "@/algorithm-core";
import { DatePicker } from "@/components/shared";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";
import { getQimenPalaceInterpretation } from "@/lib/qimen-interpretations";
import { QM_KB_SOURCE, getQmGanNotes, getQmMenNotes, getQmShenNotes, getQmXingNotes, QM_GANZHI_JICHU } from "@/lib/qimen-kb-supplement";
import { savePaipanState, loadPaipanState, clearPaipanState } from "@/lib/paipanPersistence";
import type { QimenInterpretItem } from "@/lib/qimen-interpretations";
import { useToolBack } from "@/lib/useToolBack";
import EventDivinationPanel from "@/components/EventDivinationPanel";
import { ShareButton } from "@/components/ShareButton";
import { PostToSquareButton } from "@/components/PostToSquareButton";

// ============================================================================
// 常量
// ============================================================================

const BRAND_PURPLE = "#7B2FBE";
const BRAND_PURPLE_BG = "#f3ebfa";
const COLOR_GRAY_LABEL = "#999";
const COLOR_RED = "#ed4d49";
const COLOR_BLACK = "#000";

// 五行颜色
const GAN_COLORS: Record<string, string> = {
  "甲": "#0f7d18", "乙": "#0f7d18", // 木-绿
  "丙": "#ed4d49", "丁": "#ed4d49", // 火-红
  "戊": "#a06319", "己": "#a06319", // 土-棕
  "庚": "#d4a017", "辛": "#d4a017", // 金-黄
  "壬": "#1d4ed8", "癸": "#1d4ed8", // 水-蓝
};

const SHEN_COLORS: Record<string, string> = {
  "值符": "#d4a017", "螣蛇": "#a06319", "太阴": "#d4a017", "六合": "#0f7d18",
  "白虎": "#ed4d49", "玄武": "#1d4ed8", "九地": "#1d4ed8", "九天": "#d4a017",
  "符": "#d4a017", "蛇": "#a06319", "阴": "#d4a017", "六": "#0f7d18",
  "白": "#ed4d49", "玄": "#1d4ed8", "地": "#1d4ed8", "天": "#d4a017",
};

const XING_COLORS: Record<string, string> = {
  "天蓬": "#1d4ed8", "天芮": "#a06319", "天冲": "#0f7d18", "天辅": "#0f7d18",
  "天禽": "#a06319", "天心": "#d4a017", "天柱": "#d4a017", "天任": "#a06319", "天英": "#ed4d49",
  "芮禽": "#a06319",
};

const MEN_COLORS: Record<string, string> = {
  "休": "#1d4ed8", "生": "#0f7d18", "伤": "#0f7d18", "杜": "#0f7d18",
  "景": "#ed4d49", "死": "#a06319", "惊": "#d4a017", "开": "#d4a017",
  "休门": "#1d4ed8", "生门": "#0f7d18", "伤门": "#0f7d18", "杜门": "#0f7d18",
  "景门": "#ed4d49", "死门": "#a06319", "惊门": "#d4a017", "开门": "#d4a017",
};

// 洛书九宫布局（3x3）
const LUOSHU_LAYOUT = [
  [4, 9, 2],  // 巽4 离9 坤2
  [3, 5, 7],  // 震3 中5 兑7
  [8, 1, 6],  // 艮8 坎1 乾6
];

const BAGUA: Record<number, string> = {
  1: "坎", 2: "坤", 3: "震", 4: "巽", 5: "", 6: "乾", 7: "兑", 8: "艮", 9: "离",
};

const DIR: Record<number, string> = {
  1: "北", 2: "西南", 3: "东", 4: "东南", 5: "", 6: "西北", 7: "西", 8: "东北", 9: "南",
};

// 时辰列表
const SHICHEN_LIST = [
  { name: "早子时", zhi: "子", range: "00:00-01:00" },
  { name: "丑时", zhi: "丑", range: "01:00-03:00" },
  { name: "寅时", zhi: "寅", range: "03:00-05:00" },
  { name: "卯时", zhi: "卯", range: "05:00-07:00" },
  { name: "辰时", zhi: "辰", range: "07:00-09:00" },
  { name: "巳时", zhi: "巳", range: "09:00-11:00" },
  { name: "午时", zhi: "午", range: "11:00-13:00" },
  { name: "未时", zhi: "未", range: "13:00-15:00" },
  { name: "申时", zhi: "申", range: "15:00-17:00" },
  { name: "酉时", zhi: "酉", range: "17:00-19:00" },
  { name: "戌时", zhi: "戌", range: "19:00-21:00" },
  { name: "亥时", zhi: "亥", range: "21:00-23:00" },
  { name: "夜子时", zhi: "子", range: "23:00-24:00" },
];

// 解读标签颜色
const INTERPRET_TYPE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  "gong": { bg: "#e0e7ff", fg: "#3730a3", label: "九宫" },
  "xing": { bg: "#fef3c7", fg: "#92400e", label: "九星" },
  "men": { bg: "#d1fae5", fg: "#065f46", label: "八门" },
  "shen": { bg: "#f3e8ff", fg: "#6b21a8", label: "八神" },
  "ganying": { bg: "#fce7f3", fg: "#9d174d", label: "克应" },
};

// ============================================================================
// 排盘参数选项（对标行业主流工具参数体系）
// ============================================================================

const LAYOUT_MODE_OPTIONS: { val: PanLayoutMode; label: string }[] = [
  { val: "zhuanpan", label: "转盘" },
  { val: "feipan", label: "飞盘" },
];

const JIGONG_OPTIONS: { val: JiGongMethod; label: string }[] = [
  { val: "yanggen_yinkun", label: "阳艮阴坤" },
  { val: "kun", label: "坤宫寄" },
];

const JU_METHOD_OPTIONS: { val: PanMethod; label: string }[] = [
  { val: "chaibu", label: "拆补法" },
  { val: "zhirun", label: "置闰法" },
  { val: "maoshan", label: "茅山法" },
  { val: "zixuan", label: "自选局数" },
];

const ANGAN_OPTIONS: { val: AnganType; label: string }[] = [
  { val: "zhishi", label: "值使门起" },
  { val: "men", label: "门地盘起" },
];

const TIME_TYPE_OPTIONS: { val: QimenTimeType; label: string }[] = [
  { val: "normal", label: "普通时间" },
  { val: "zhen", label: "真太阳时" },
];

const JU_METHOD_LABEL: Record<string, string> = {
  chaibu: "拆补法", zhirun: "置闰法", maoshan: "茅山法", zixuan: "自选局数",
};

/** 分段选择器行（label + 选项组），可点击区域≥44px高容器、按钮≥36px */
function SegmentedRow<T extends string>({
  label, options, value, onChange, columns = 2,
}: {
  label: string;
  options: { val: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  columns?: 2 | 4;
}) {
  return (
    <div className="py-1">
      <div className="mb-0.5 text-xs text-gray-700">{label}</div>
      <div className={`grid gap-1 ${columns === 4 ? "grid-cols-4" : "grid-cols-2"}`}>
        {options.map(o => (
          <button
            key={o.val}
            type="button"
            onClick={() => onChange(o.val)}
            className={`rounded-lg px-1 py-1.5 text-xs font-medium transition-all ${
              value === o.val ? "bg-[#7B2FBE] text-white shadow-sm" : "bg-gray-100 text-gray-600"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export default function QimenPage() {
  const pageKey = "yixue_qimen"; const { showResult, savedParams, saveParams, goToResult } = useToolBack({ pageKey, eventName: "yixue-back", globalFlag: "__yixueBackHandled" });
  const [showForm, setShowForm] = useState(true);
  const [result, setResult] = useState<QimenResult | null>(null);
  // P1-REOPEN: 返回键关闭排盘弹窗且无结果时直接返回工具列表
  const router = useRouter();
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);
  const [interpretPanel, setInterpretPanel] = useState<{
    palaceLabel: string;
    items: QimenInterpretItem[];
  } | null>(null);
  // v25.0.27: 干支基础断法面板开关（QM-KB）
  const [showGanzhiKb, setShowGanzhiKb] = useState(false);

  // 表单状态（固定默认值，避免 hydration mismatch；mounted 后更新为真实时间）
  const [formData, setFormData] = useState({
    year: 2026,
    month: 1,
    day: 1,
    hour: 12,
    desc: "",
    panMethod: "chaibu" as PanMethod,
    layoutMode: "zhuanpan" as PanLayoutMode,
    jigongMethod: "yanggen_yinkun" as JiGongMethod,
    anganType: "zhishi" as AnganType,
    timeType: "normal" as QimenTimeType,
    longitude: 120,
    customYinYang: "yang" as "yang" | "yin",
    customJu: 1,
    showDiShen: false,
    showZhangSheng: false,
  });

  useEffect(() => {
    const n = new Date();
    setFormData(prev => ({
      ...prev,
      year: n.getFullYear(),
      month: n.getMonth() + 1,
      day: n.getDate(),
      hour: n.getHours(),
    }));
  }, []);

  // 执行排盘
  const buildInput = useCallback((y: number, mo: number, d: number, h: number) => ({
    year: y,
    month: mo,
    day: d,
    hour: h,
    panMethod: formData.panMethod,
    layoutMode: formData.layoutMode,
    jigongMethod: formData.jigongMethod,
    anganType: formData.anganType,
    timeType: formData.timeType,
    longitude: formData.timeType === "zhen" ? formData.longitude : undefined,
    customJu: formData.panMethod === "zixuan" ? formData.customJu : undefined,
    customYinYang: formData.panMethod === "zixuan" ? formData.customYinYang : undefined,
  }), [formData]);

  const doPaipan = useCallback((override?: {year: number; month: number; day: number; hour: number}) => {
    const y = override?.year ?? formData.year;
    const mo = override?.month ?? formData.month;
    const d = override?.day ?? formData.day;
    const h = override?.hour ?? formData.hour;
    try {
      const r = calculateQimen(buildInput(y, mo, d, h));
      setResult(r);
      setShowForm(false);
      setInterpretPanel(null);
      savePaipanState("qimen",{input:{...formData, year: y, month: mo, day: d, hour: h},showForm:false,_ts:Date.now()});
      // 保存客户记录
      if(selectedClient){
        try{saveRecord({clientId:selectedClient.id,type:"qimen",data:{...r,inputParams:{...formData, year: y, month: mo, day: d, hour: h}},note:"",status:"pending"});}catch(e){console.error("保存记录失败:",e);}
      }
    } catch (e) {
      console.error("排盘错误:", e);
      const errMsg = e instanceof Error ? e.message : "未知错误";
      alert(`排盘出错：${errMsg}\n请检查输入的日期时间是否有效`);
    }
  }, [formData, selectedClient, buildInput]);

  // 上一局/下一局
  const shiftTime = useCallback((delta: number) => {
    if (!result) return;
    const newHour = formData.hour + delta * 2;
    let newDay = formData.day;
    let newMonth = formData.month;
    let newYear = formData.year;
    let h = newHour;
    if (h < 0) {
      h = 22; // 前一天亥时
      const d = new Date(formData.year, formData.month - 1, formData.day - 1);
      newDay = d.getDate();
      newMonth = d.getMonth() + 1;
      newYear = d.getFullYear();
    } else if (h >= 24) {
      h = 0; // 后天子时
      const d = new Date(formData.year, formData.month - 1, formData.day + 1);
      newDay = d.getDate();
      newMonth = d.getMonth() + 1;
      newYear = d.getFullYear();
    }
    setFormData(prev => ({ ...prev, year: newYear, month: newMonth, day: newDay, hour: h }));
    setTimeout(() => {
      try {
        const r = calculateQimen(buildInput(newYear, newMonth, newDay, h));
        setResult(r);
        setInterpretPanel(null);
      } catch (e) { /* ignore */ }
    }, 50);
  }, [result, formData, buildInput]);

  // 监听编辑事件
  useEffect(() => {
    const editHandler = () => setShowForm(true);
    const backHandler = () => {
      if (!showForm && result) { setShowForm(true); window.__yixueBackHandled = true; }
    };
    window.addEventListener("yixue-edit", editHandler);
    window.addEventListener("yixue-back", backHandler);
    return () => {
      window.removeEventListener("yixue-edit", editHandler);
      window.removeEventListener("yixue-back", backHandler);
    };
  }, [showForm, result]);

  // URL参数clientId自动选中客户 + 回填数据检查
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) {
      const c = getClient(cid);
      if (c) setSelectedClient(c);
    }
    const prefill = getPrefillData("qimen");
    if (prefill) {
      try {
        // 回填排盘结果
        setResult(prefill);
        // 回填输入参数
        if (prefill.inputParams) {
          const ip = prefill.inputParams as Record<string, unknown>;
          setFormData(prev => ({
            ...prev,
            year: (ip.year as number) || prev.year,
            month: (ip.month as number) || prev.month,
            day: (ip.day as number) || prev.day,
            hour: ip.hour !== undefined ? (ip.hour as number) : prev.hour,
            panMethod: (ip.panMethod as PanMethod) || prev.panMethod,
            layoutMode: (ip.layoutMode as PanLayoutMode) || prev.layoutMode,
            jigongMethod: (ip.jigongMethod as JiGongMethod) || prev.jigongMethod,
            anganType: (ip.anganType as AnganType) || prev.anganType,
            timeType: (ip.timeType as QimenTimeType) || prev.timeType,
            longitude: typeof ip.longitude === "number" ? ip.longitude : prev.longitude,
            customYinYang: (ip.customYinYang as "yang" | "yin") || prev.customYinYang,
            customJu: typeof ip.customJu === "number" ? ip.customJu : prev.customJu,
          }));
        }
        setShowForm(false);
        clearPrefillData("qimen");
      } catch (e) { console.error("回填失败:", e); }
    }
  }, []);

  // localStorage 持久化：恢复排盘状态
  useEffect(() => {
    const saved = loadPaipanState("qimen");
    if (saved && saved.input) {
      const inp = saved.input as Record<string, unknown>;
      setFormData(prev => ({
        ...prev,
        year: (inp.year as number) || prev.year,
        month: (inp.month as number) || prev.month,
        day: (inp.day as number) || prev.day,
        hour: inp.hour !== undefined ? (inp.hour as number) : prev.hour,
        panMethod: (inp.panMethod as PanMethod) || prev.panMethod,
        layoutMode: (inp.layoutMode as PanLayoutMode) || prev.layoutMode,
        jigongMethod: (inp.jigongMethod as JiGongMethod) || prev.jigongMethod,
        anganType: (inp.anganType as AnganType) || prev.anganType,
        timeType: (inp.timeType as QimenTimeType) || prev.timeType,
        longitude: typeof inp.longitude === "number" ? inp.longitude : prev.longitude,
        customYinYang: (inp.customYinYang as "yang" | "yin") || prev.customYinYang,
        customJu: typeof inp.customJu === "number" ? inp.customJu : prev.customJu,
      }));
    }
  }, []);

  // ==================== 输入表单 ====================
  if (showForm) {
    return (
      <div style={{ maxWidth: "420px", margin: "0 auto", backgroundColor: "#fff", minHeight: "100vh" }}>
        <DatePicker
          show={true}
          onClose={(reason?: "back") => { setShowForm(false); if (reason === "back" && !result && !isManagedBackNavigation()) leaveToolPage(router); }}
          onSubmit={(dateVal) => {
            setFormData(prev => ({ ...prev, year: dateVal.year, month: dateVal.month, day: dateVal.day, hour: dateVal.hour }));
            doPaipan({year: dateVal.year, month: dateVal.month, day: dateVal.day, hour: dateVal.hour});
          }}
          initialDate={{year: formData.year, month: formData.month, day: formData.day, hour: formData.hour, minute: 0}}
          showMinute={true}
          showGender={false} showCalType={true} showToggles={false} showRegion={false} showName={false}
          submitText="排盘" title="奇门遁甲排盘"
          extraOptions={
            <div className="border-t border-gray-100 px-4 py-1.5">
              <div className="mb-1 text-[13px] font-bold text-gray-800">排盘参数</div>
              <SegmentedRow
                label="排盘方式"
                options={LAYOUT_MODE_OPTIONS}
                value={formData.layoutMode}
                onChange={v => setFormData(prev => ({ ...prev, layoutMode: v }))}
              />
              <SegmentedRow
                label="寄宫方式"
                options={JIGONG_OPTIONS}
                value={formData.jigongMethod}
                onChange={v => setFormData(prev => ({ ...prev, jigongMethod: v }))}
              />
              <SegmentedRow
                label="起局方式"
                options={JU_METHOD_OPTIONS}
                value={formData.panMethod}
                onChange={v => setFormData(prev => ({ ...prev, panMethod: v }))}
                columns={4}
              />
              {formData.panMethod === "zixuan" && (
                <div className="rounded-lg bg-[#F3EDF7] px-3 py-1.5">
                  <div className="mb-1 text-xs text-gray-700">自选局数</div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, customYinYang: "yang" }))}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        formData.customYinYang === "yang" ? "bg-[#7B2FBE] text-white" : "bg-white text-gray-600"
                      }`}
                    >
                      阳遁
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, customYinYang: "yin" }))}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        formData.customYinYang === "yin" ? "bg-[#7B2FBE] text-white" : "bg-white text-gray-600"
                      }`}
                    >
                      阴遁
                    </button>
                    <select
                      value={formData.customJu}
                      onChange={e => setFormData(prev => ({ ...prev, customJu: parseInt(e.target.value, 10) }))}
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-center text-sm outline-none focus:border-[#7B2FBE]"
                    >
                      {[1,2,3,4,5,6,7,8,9].map(j => (
                        <option key={j} value={j}>{j}局</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <SegmentedRow
                label="暗干起法"
                options={ANGAN_OPTIONS}
                value={formData.anganType}
                onChange={v => setFormData(prev => ({ ...prev, anganType: v }))}
              />
              <SegmentedRow
                label="时间类型"
                options={TIME_TYPE_OPTIONS}
                value={formData.timeType}
                onChange={v => setFormData(prev => ({ ...prev, timeType: v }))}
              />
              {formData.timeType === "zhen" && (
                <div className="rounded-lg bg-[#F3EDF7] px-3 py-1.5">
                  <div className="mb-1 flex items-center justify-between text-xs text-gray-700">
                    <span>出生地经度（东经）</span>
                    <span className="font-medium text-[#7B2FBE]">{formData.longitude.toFixed(1)}°</span>
                  </div>
                  <input
                    type="range"
                    min={73}
                    max={135}
                    step={0.1}
                    value={formData.longitude}
                    onChange={e => setFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                    className="w-full accent-[#7B2FBE]"
                    style={{ padding: "8px 0", minHeight: "36px" }}
                  />
                  <div className="text-[11px] text-gray-400">真太阳时＝钟表时间＋经度差修正＋均时差</div>
                </div>
              )}
            </div>
          }
        />
      </div>
    );
  }

  // ==================== 排盘结果 ====================
  if (!result) {
    return (
      <div className="bg-[#ededed] min-h-screen flex justify-center">
        <div className="w-full" style={{ maxWidth: "420px" }}>
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
            <button onClick={() => { clearPaipanState("qimen"); setShowForm(true); }} className="rounded-full bg-[#7B2FBE] text-white font-bold text-lg px-8 py-3 shadow-lg">开始排盘</button>
          </div>
        </div>
      </div>
    );
  }

  const getGanColor = (g: string) => GAN_COLORS[g] || COLOR_BLACK;
  const getShenColor = (s: string) => SHEN_COLORS[s] || COLOR_BLACK;
  const getXingColor = (x: string) => XING_COLORS[x] || COLOR_BLACK;
  const getMenColor = (m: string) => MEN_COLORS[m] || (MEN_COLORS[m.replace("门", "")] || COLOR_BLACK);

  // 派生显示数据
  const isYangDun = result.yinYangDun === "阳遁";
  const juNum = result.juNumber;
  const yuanShort = result.sanYuan.replace("元", "");
  const hourZhi = result.siZhu.hour[1];
  const zhiFuStar = result.zhiFuZhiShi.zhiFuXingGong[0];
  const zhiShiDoor = result.zhiFuZhiShi.zhiShiMenGong[0];
  const yiMa = result.maXing.yiMa;
  const siZhuArr = [result.siZhu.year, result.siZhu.month, result.siZhu.day, result.siZhu.hour];
  // 农历日期（P0-01: try-catch 防止无效日期导致白屏）
  let lunarStr = "";
  try {
    const solarObj = Solar.fromYmdHms(formData.year, formData.month, formData.day, formData.hour, 0, 0);
    const lunarObj = solarObj.getLunar();
    lunarStr = `农历${lunarObj.getMonthInChinese()}月${lunarObj.getDayInChinese()}`;
  } catch (e) {
    console.error("农历日期计算错误:", e);
    lunarStr = "农历日期异常";
  }

  // 宫格样式辅助函数
  const getPalaceStyle = (gongNum: number, isZhong: boolean) => {
    const p = result.palaces[gongNum - 1];
    if (!p) return { backgroundColor: "#fff", border: "1px solid #ccc", padding: "2px", minHeight: "85px", display: "flex" as const, flexDirection: "column" as const, alignItems: "center", justifyContent: "center", position: "relative" as const, cursor: "default", transition: "background-color 0.15s" };
    const bg = p.jixing ? "#ffe0e0" : p.rumu ? "#fff3cd" : p.menpo ? "#e0f0ff" : "#fff";
    return {
      backgroundColor: bg,
      border: "1px solid #ccc",
      padding: "2px",
      minHeight: "85px",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      position: "relative" as const,
      cursor: isZhong ? "default" : "pointer",
      transition: "background-color 0.15s",
    };
  };

  // 点击宫格
  const handlePalaceClick = (gongNum: number) => {
    if (gongNum === 5) return; // 中宫不响应
    const p = result.palaces[gongNum - 1];
    if (!p) return; // null guard：数据未加载时不处理
    const gongName = BAGUA[gongNum];
    const interp = getQimenPalaceInterpretation(
      gongName,
      p.star,
      p.door,
      p.tianShen,
      p.tianPanGan,
      p.diPanGan,
    );
    // v25.0.27: QM-KB 增补断语（P6-补03：知识库去名书面化注入——十干/八门/八神/九星象义）
    const kbItems: QimenInterpretItem[] = [];
    const pushKb = (title: string, notes: string[]) => {
      for (const n of notes) kbItems.push({ type: "gong" as const, title, content: n, source: QM_KB_SOURCE });
    };
    if (p.tianPanGan) pushKb(`${p.tianPanGan}·十干象义`, getQmGanNotes(p.tianPanGan));
    if (p.door) pushKb(`${p.door}·八门断语`, getQmMenNotes(p.door));
    if (p.tianShen) pushKb(`${p.tianShen}·八神断语`, getQmShenNotes(p.tianShen));
    if (p.star) pushKb(`${p.star}·九星断语`, getQmXingNotes(p.star));
    if (kbItems.length > 0) {
      setInterpretPanel({ ...interp, items: [...interp.items, ...kbItems] });
    } else {
      setInterpretPanel(interp);
    }
  };

  // v18.9: AI解读局象整体上下文
  const qimenOverallContext = (() => {
    const palaceSummary = LUOSHU_LAYOUT.flat().filter(g => g !== 5).map(gongNum => {
      const p = result.palaces[gongNum - 1];
      if (!p) return `${BAGUA[gongNum]}宫(${DIR[gongNum]}): 数据缺失`;
      return `${BAGUA[gongNum]}宫(${DIR[gongNum]}): 天盘${p.tianPanGan} 地盘${p.diPanGan} 九星${p.star} 八门${p.door||"无"} 八神${p.tianShen}${p.kongwang?" 空亡":""}${p.ma?" 驿马":""}`;
    }).join("\n");
    return `局象：${isYangDun ? "阳遁" : "阴遁"}${juNum}局 ${yuanShort}元（${result.layoutMode === "feipan" ? "飞盘" : "转盘"}·${JU_METHOD_LABEL[result.panMethod] || result.panMethod}·${result.jigongMethod === "kun" ? "坤宫寄" : "阳艮阴坤"}${result.timeType === "zhen" ? "·真太阳时" : ""}）\n日期：${formData.year}年${formData.month}月${formData.day}日 ${lunarStr} ${hourZhi}时\n节气：${result.jieqi}\n四柱：${siZhuArr.map(gz => gz[0]+(gz[1]||"")).join(" ")}\n值符：${zhiFuStar} 值使：${zhiShiDoor} 旬首：${result.xunShou} 马星：${yiMa} 空亡：${result.xunKong[0]}${result.xunKong[1]}\n九宫分布：\n${palaceSummary}`;
  })();

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", backgroundColor: "#fff", minHeight: "100vh", paddingBottom: "60px" }}>
      {/* 操作栏 */}
      <div style={{ display: "flex", padding: "8px", gap: "6px", borderBottom: "1px solid #eee", alignItems: "center" }}>
        <button onClick={() => shiftTime(-1)} style={{ flex: 1, padding: "6px", border: "1px solid #ddd", borderRadius: "4px", backgroundColor: "#fff", fontSize: "12px", cursor: "pointer" }}>上一局</button>
        <button onClick={() => { setShowForm(true); }} style={{ flex: 1, padding: "6px", border: "1px solid " + BRAND_PURPLE, borderRadius: "4px", backgroundColor: BRAND_PURPLE_BG, color: BRAND_PURPLE, fontSize: "12px", cursor: "pointer" }}>当前盘</button>
        <button onClick={() => shiftTime(1)} style={{ flex: 1, padding: "6px", border: "1px solid #ddd", borderRadius: "4px", backgroundColor: "#fff", fontSize: "12px", cursor: "pointer" }}>下一局</button>
        <button
          onClick={() => setFormData(prev => ({ ...prev, showZhangSheng: !prev.showZhangSheng }))}
          style={{ padding: "6px 8px", border: formData.showZhangSheng ? "1px solid " + BRAND_PURPLE : "1px solid #ddd", borderRadius: "4px", backgroundColor: formData.showZhangSheng ? BRAND_PURPLE_BG : "#fff", fontSize: "11px", cursor: "pointer" }}
        >长生</button>
        <button
          onClick={() => setFormData(prev => ({ ...prev, showDiShen: !prev.showDiShen }))}
          style={{ padding: "6px 8px", border: formData.showDiShen ? "1px solid " + BRAND_PURPLE : "1px solid #ddd", borderRadius: "4px", backgroundColor: formData.showDiShen ? BRAND_PURPLE_BG : "#fff", fontSize: "11px", cursor: "pointer" }}
        >地八神</button>
      </div>

      {/* 局数 */}
      <div style={{ textAlign: "center", padding: "6px", fontSize: "15px", fontWeight: 700, color: BRAND_PURPLE }}>
        {isYangDun ? "阳遁" : "阴遁"}{juNum}局 {yuanShort}元
      </div>

      {/* 排盘参数徽标 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "center", padding: "0 8px 4px" }}>
        {[
          result.layoutMode === "feipan" ? "飞盘" : "转盘",
          JU_METHOD_LABEL[result.panMethod] || result.panMethod,
          result.jigongMethod === "kun" ? "坤宫寄" : "阳艮阴坤",
          result.anganType === "men" ? "暗干·门地盘起" : "暗干·值使门起",
          result.timeType === "zhen" ? "真太阳时" : "普通时间",
        ].map(badge => (
          <span key={badge} style={{ fontSize: "10px", padding: "1px 8px", borderRadius: "999px", background: BRAND_PURPLE_BG, color: BRAND_PURPLE, border: `1px solid ${BRAND_PURPLE}22` }}>
            {badge}
          </span>
        ))}
      </div>

      {/* 真太阳时修正说明 */}
      {result.timeCorrection && (
        <div style={{ textAlign: "center", fontSize: "11px", color: "#b8860b", padding: "0 10px 4px" }}>
          {result.timeCorrection}
        </div>
      )}

      {/* 日期 */}
      <div style={{ textAlign: "center", fontSize: "12px", color: "#666", padding: "2px 8px" }}>
        {formData.year}年{formData.month}月{formData.day}日 {lunarStr} {hourZhi}时
      </div>

      {/* 节气 */}
      <div style={{ textAlign: "center", fontSize: "11px", color: "#999", padding: "2px 8px" }}>
        {result.jieqi}
      </div>

      {/* 五要素信息表 */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", margin: "4px 0" }}>
        <thead>
          <tr style={{ backgroundColor: "#f5f5f5" }}>
            <th style={{ border: "1px solid #ddd", padding: "3px", fontWeight: 500, color: "#666" }}>值符</th>
            <th style={{ border: "1px solid #ddd", padding: "3px", fontWeight: 500, color: "#666" }}>值使</th>
            <th style={{ border: "1px solid #ddd", padding: "3px", fontWeight: 500, color: "#666" }}>旬首</th>
            <th style={{ border: "1px solid #ddd", padding: "3px", fontWeight: 500, color: "#666" }}>马星</th>
            <th style={{ border: "1px solid #ddd", padding: "3px", fontWeight: 500, color: "#666" }}>空亡</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #ddd", padding: "3px", textAlign: "center", color: getXingColor(zhiFuStar) }}>{zhiFuStar}</td>
            <td style={{ border: "1px solid #ddd", padding: "3px", textAlign: "center", color: getMenColor(zhiShiDoor) }}>{zhiShiDoor}</td>
            <td style={{ border: "1px solid #ddd", padding: "3px", textAlign: "center" }}>{result.xunShou}</td>
            <td style={{ border: "1px solid #ddd", padding: "3px", textAlign: "center", color: COLOR_RED }}>{yiMa}</td>
            <td style={{ border: "1px solid #ddd", padding: "3px", textAlign: "center", color: "#999" }}>{result.xunKong[0]}{result.xunKong[1]}</td>
          </tr>
        </tbody>
      </table>

      {/* 四柱 */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", margin: "4px 0" }}>
        <thead>
          <tr style={{ backgroundColor: "#f5f5f5" }}>
            <th style={{ border: "1px solid #ddd", padding: "3px", fontWeight: 500, color: "#666", width: "20%" }}></th>
            <th style={{ border: "1px solid #ddd", padding: "3px", fontWeight: 500, color: "#666", width: "20%" }}>年柱</th>
            <th style={{ border: "1px solid #ddd", padding: "3px", fontWeight: 500, color: "#666", width: "20%" }}>月柱</th>
            <th style={{ border: "1px solid #ddd", padding: "3px", fontWeight: 500, color: "#666", width: "20%" }}>日柱</th>
            <th style={{ border: "1px solid #ddd", padding: "3px", fontWeight: 500, color: "#666", width: "20%" }}>时柱</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #ddd", padding: "3px", textAlign: "center", fontSize: "10px", color: "#999" }}>天干</td>
            {siZhuArr.map((gz, i) => (
              <td key={"g" + i} style={{ border: "1px solid #ddd", padding: "3px", textAlign: "center", fontSize: "14px", fontWeight: 700, color: getGanColor(gz[0]) }}>{gz[0]}</td>
            ))}
          </tr>
          <tr>
            <td style={{ border: "1px solid #ddd", padding: "3px", textAlign: "center", fontSize: "10px", color: "#999" }}>地支</td>
            {siZhuArr.map((gz, i) => (
              <td key={"z" + i} style={{ border: "1px solid #ddd", padding: "3px", textAlign: "center", fontSize: "14px", fontWeight: 700, color: getGanColor(gz[1] || gz[0]) }}>{gz[1]}</td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* 九宫格排盘 */}
      <div style={{ padding: "6px", border: "2px solid #333", margin: "4px 8px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          {LUOSHU_LAYOUT.flat().map((gongNum, idx) => {
            const p = result.palaces[gongNum - 1];
            const isZhong = gongNum === 5;
            if (!p && !isZhong) return null; // null guard：数据未加载时跳过渲染
            return (
              <div
                key={gongNum}
                style={getPalaceStyle(gongNum, isZhong)}
                onClick={() => handlePalaceClick(gongNum)}
                onMouseEnter={(e) => {
                  if (!isZhong) e.currentTarget.style.backgroundColor = "#f3ebfa";
                }}
                onMouseLeave={(e) => {
                  if (!isZhong) {
                    const p2 = result.palaces[gongNum - 1];
                    const bg = p2 ? (p2.jixing ? "#ffe0e0" : p2.rumu ? "#fff3cd" : p2.menpo ? "#e0f0ff" : "#fff") : "#fff";
                    e.currentTarget.style.backgroundColor = bg;
                  }
                }}
              >
                {/* 宫位标记（左上） */}
                <div style={{ position: "absolute", top: "1px", left: "2px", fontSize: "8px", color: "#999", lineHeight: 1 }}>
                  {BAGUA[gongNum]}{DIR[gongNum]}
                </div>

                {/* 空亡/马星标记（右上） */}
                <div style={{ position: "absolute", top: "1px", right: "2px", fontSize: "8px", lineHeight: 1 }}>
                  {p.kongwang && <span style={{ color: "#999" }}>空</span>}
                  {p.ma && <span style={{ color: COLOR_RED, marginLeft: "2px" }}>马</span>}
                </div>

                {isZhong ? (
                  <div style={{ textAlign: "center", fontSize: "11px", color: "#666" }}>
                    <div style={{ fontWeight: 700 }}>中宫</div>
                    {/* 飞盘模式下中宫可落星 */}
                    {result.layoutMode === "feipan" && p.star && (
                      <div style={{ fontSize: "11px", fontWeight: 500, marginTop: "2px", color: getXingColor(p.star) }}>
                        {p.star}
                      </div>
                    )}
                    {/* 飞盘模式下中宫天盘干 */}
                    {result.layoutMode === "feipan" && p.tianPanGan && (
                      <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "1px", color: getGanColor(p.tianPanGan) }}>
                        {p.tianPanGan}
                      </div>
                    )}
                    <div style={{ fontSize: "10px", marginTop: "4px" }}>寄{result.jigongTargetName || "坤二宫"}</div>
                    <div style={{ fontSize: "9px", color: "#999" }}>{p.diPanGan || ""}</div>
                  </div>
                ) : (
                  <>
                    {/* 八神（最上） */}
                    <div style={{ fontSize: "11px", fontWeight: 500, color: getShenColor(p.tianShen), lineHeight: 1.2 }}>
                      {p.tianShen}
                    </div>
                    {/* 地八神（可选） */}
                    {formData.showDiShen && p.diShen && (
                      <div style={{ fontSize: "9px", color: getShenColor(p.diShen), lineHeight: 1.1 }}>
                        {p.diShen}
                      </div>
                    )}
                    {/* 天盘天干 */}
                    <div style={{ fontSize: "18px", fontWeight: 700, color: getGanColor(p.tianPanGan), lineHeight: 1.2 }}>
                      {p.tianPanGan}
                      {p.tianPanJiXing && <span style={{ fontSize: "10px", color: COLOR_RED, marginLeft: "1px" }}>刑</span>}
                      {p.tianPanRuMu && <span style={{ fontSize: "10px", color: "#a06319", marginLeft: "1px" }}>墓</span>}
                    </div>
                    {/* 九星 */}
                    <div style={{ fontSize: "11px", fontWeight: 500, color: getXingColor(p.star), lineHeight: 1.2 }}>
                      {p.star}
                    </div>
                    {/* 八门 */}
                    <div style={{ fontSize: "12px", fontWeight: 700, color: getMenColor(p.door), lineHeight: 1.2 }}>
                      {p.door ? p.door.replace("门", "") : ""}
                    </div>
                    {/* 地盘天干 */}
                    <div style={{ fontSize: "13px", fontWeight: 500, color: getGanColor(p.diPanGan), lineHeight: 1.2, textDecoration: "underline", textUnderlineOffset: "2px" }}>
                      {p.diPanGan}
                    </div>
                    {/* 暗干 */}
                    {p.anGan && (
                      <div style={{ fontSize: "9px", color: getGanColor(p.anGan), lineHeight: 1.1, position: "absolute", bottom: "1px", right: "2px" }}>
                        {p.anGan}
                      </div>
                    )}
                    {/* 12长生状态（可选） */}
                    {formData.showZhangSheng && p.tianPan12ZhangSheng && (
                      <div style={{ fontSize: "8px", color: "#666", lineHeight: 1, position: "absolute", bottom: "1px", left: "2px" }}>
                        {p.tianPan12ZhangSheng}
                      </div>
                    )}
                    {/* 点击提示 */}
                    <div style={{ position: "absolute", bottom: "1px", right: "2px", fontSize: "7px", color: "#ccc", lineHeight: 1 }}>
                      ◷
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 宫位解读面板 */}
      {interpretPanel && (
        <div style={{
          margin: "6px 8px",
          border: "1px solid " + BRAND_PURPLE,
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(123, 47, 190, 0.12)",
        }}>
          {/* 头部 */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            background: "linear-gradient(135deg, #7B2FBE, #9B5ECF)",
            color: "white",
          }}>
            <span style={{ fontSize: "15px", fontWeight: "bold" }}>
              {interpretPanel.palaceLabel}
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
            >✕</button>
          </div>

          {/* 内容区 */}
          <div style={{ padding: "10px 12px", maxHeight: "360px", overflowY: "auto" }}>
            {interpretPanel.items.map((item, idx) => {
              const tc = INTERPRET_TYPE_COLORS[item.type] || INTERPRET_TYPE_COLORS["gong"];
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
            点击其他宫格查看不同解读 · 引经据典，仅供参考
          </div>
        </div>
      )}

      {/* 颜色图例 */}
      <div style={{ padding: "4px 8px", fontSize: "10px", color: "#999", display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
        <span>击刑:红底</span>
        <span>入墓:黄底</span>
        <span>门迫:蓝底</span>
        <span>空:空亡</span>
        <span>马:驿马</span>
      </div>

      {/* v25.0.27: 干支基础断法（QM-KB，四柱干支关系判断） */}
      <div style={{ padding: "2px 8px 6px" }}>
        <button
          onClick={() => setShowGanzhiKb(v => !v)}
          style={{
            width: "100%", padding: "7px", border: `1px solid ${BRAND_PURPLE}`, borderRadius: "8px",
            backgroundColor: showGanzhiKb ? "#F3EDF7" : "#fff", color: BRAND_PURPLE,
            fontSize: "12px", fontWeight: "bold", cursor: "pointer",
          }}
        >📖 干支基础断法（合化·相穿·六冲·暗合·三合·墓库）{showGanzhiKb ? " ▲" : " ▼"}</button>
        {showGanzhiKb && (
          <div style={{ marginTop: "6px", border: "1px solid #e9def5", borderRadius: "8px", padding: "10px 12px", backgroundColor: "#faf7fd", maxHeight: "340px", overflowY: "auto" }}>
            {QM_GANZHI_JICHU.map((g, gi) => (
              <div key={gi} style={{ marginBottom: "10px" }}>
                <div style={{ fontSize: "12px", fontWeight: "bold", color: BRAND_PURPLE, marginBottom: "4px" }}>【{g.group}】</div>
                {g.notes.map((n, ni) => (
                  <div key={ni} style={{ fontSize: "11px", color: "#555", lineHeight: 1.7, marginBottom: "3px" }}>· {n}</div>
                ))}
              </div>
            ))}
            <div style={{ fontSize: "10px", color: "#999", fontStyle: "italic", textAlign: "right" }}>—— {QM_KB_SOURCE}</div>
          </div>
        )}
      </div>

      {/* v19.6: 事情断法 + AI深度解读 */}
      <div style={{ padding: "6px 8px" }}>
        <EventDivinationPanel
          toolName="奇门遁甲"
          chartContext={qimenOverallContext}
          isPaidTool={false}
        />
      </div>

      <div className="px-3 py-2">
        <ShareButton
          type="tool"
          title="奇门遁甲排盘结果"
          description="奇门遁甲排盘"
          variant="block"
          label="分享排盘结果"
        />
        <div className="mt-2">
          <PostToSquareButton tool="奇门遁甲" summary="奇门排盘已起局，格局与用神关系清晰" />
        </div>
      </div>

      {/* 免责声明 */}
      <div style={{ padding: "8px 16px", fontSize: "10px", color: "#999", textAlign: "center", lineHeight: 1.6 }}>
        <span style={{ color: COLOR_RED }}>免责声明：</span>奇门遁甲排盘仅供传统文化学习参考，不构成任何决策依据
      </div>
    </div>
  );
}
