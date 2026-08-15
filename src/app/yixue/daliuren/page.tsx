"use client";

import { useState, useEffect, useCallback } from "react";
import {
  solarToBazi,
  GAN,
  ZHI,
  GAN_WUXING,
  ZHI_WUXING,
  GAN_YIN_YANG,
  ZHI_YIN_YANG,
  getWuxingRelation,
  getShengXiao,
  getCurrentJieQi,
  getJieQiDate,
  getJieQiIndex,
  getKongwang,
  getYearGanZhi,
} from "@/algorithm-core";
import type { TianGan, DiZhi, YinYang } from "@/algorithm-core";
import ClientSelector from "@/components/ClientSelector";
import { DatePicker } from "@/components/shared";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";
import { getSanChuanInterpretation, getSiKeInterpretation, getKeTiInterpretation } from "@/lib/daliuren-interpretations";
import { savePaipanState, loadPaipanState, clearPaipanState } from "@/lib/paipanPersistence";
import { useToolBack } from "@/lib/useToolBack";
import EventDivinationPanel from "@/components/EventDivinationPanel";
import { ShareButton } from "@/components/ShareButton";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePopupBackHandler } from "@/hooks/usePopupBackHandler";

import { calculateDaLiuRen, tianYiGuiRen, type DaLiuRenResult, type SanChuanItem, type SiKeItem, type PanMap, type DaLiuRenInputParams } from "@/algorithm-core/modules/daliuren";
// ============================================================================
// 颜色常量（严格对标截图）
// ============================================================================
const BRAND_RED = "#d93025";
const COLOR_NAV = "#bdbdbd";
const COLOR_GRAY_LABEL = "#bdbdbd";
const COLOR_GRAY_BG = "#f0f0f0";

// 五行颜色（严格对标截图：木绿/火红/土棕/金橙/水蓝）
const WX_COLOR: Record<string, string> = {
  "木": "#008000",
  "火": "#d93025",
  "土": "#b86000",
  "金": "#cc7000",
  "水": "#000080",
};

// 天干颜色（按五行）
function ganColor(gan: string): string {
  const wx = GAN_WUXING[gan as TianGan];
  return WX_COLOR[wx] || "#000";
}
// 地支颜色（按五行）
function getGanColor(gan: string): string {
  const wx = GAN_WUXING[gan as TianGan];
  return WX_COLOR[wx] || "#000";
}

function getZhiColor(zhi: string): string {
  const wx = ZHI_WUXING[zhi as DiZhi];
  return WX_COLOR[wx] || "#000";
}
function zhiColor(zhi: string): string {
  const wx = ZHI_WUXING[zhi as DiZhi];
  return WX_COLOR[wx] || "#000";
}

// 天将颜色（严格对标截图）
const SHEN_COLOR: Record<string, string> = {
  "贵": "#b86000",
  "蛇": "#d93025", "朱": "#d93025",
  "合": "#008000", "龙": "#008000",
  "勾": "#000080", "空": "#b86000", "虎": "#cc7000", "玄": "#000080",
  "阴": "#cc7000", "后": "#0000cc",
  "常": "#b86000",
};

// ============================================================================
// UI 辅助函数
// ============================================================================

const TAB_BLUE = "#007aff";

/** 天将颜色：贵始终红色，其余按SHEN_COLOR */
function shenColor(shen: string): string {
  if (shen === "贵") return BRAND_RED;
  return SHEN_COLOR[shen] || "#000";
}

/** 天干颜色：日干始终红色，其余按五行 */
function ganColorRender(gan: string, dayGan: string): string {
  if (gan === dayGan) return BRAND_RED;
  return getGanColor(gan);
}

/** 地支颜色：空亡仅加边框不改色；日干(若同字)红 */
function zhiColorRender(zhi: string, dayGan: string): string {
  if (zhi === dayGan) return BRAND_RED;
  return getZhiColor(zhi);
}

// 输入表单（底部弹窗，点击遮罩或关闭按钮收起）
// ============================================================================

/** 圆形单选按钮（紫色选中态） */
function DLRRadioOption({
  label, selected, onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center cursor-pointer"
    >
      <span
        className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all ${
          selected ? "border-[#7B2FBE]" : "border-gray-300"
        }`}
      >
        {selected && <span className="w-[10px] h-[10px] rounded-full bg-[#7B2FBE]" />}
      </span>
      <span
        className={`ml-1.5 text-sm ${
          selected ? "text-[#7B2FBE] font-medium" : "text-gray-600"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function InputPanel({
  show, onClose, onSubmit, selectedClient, onClientSelect, initialValues, showTitle = true,
}: {
  show: boolean;
  onClose: () => void;
  onSubmit: (params: DaLiuRenInputParams) => void;
  selectedClient: Client | null;
  onClientSelect: (c: Client | null) => void;
  initialValues?: DaLiuRenInputParams | null;
  showTitle?: boolean;
}) {
  const [year, setYear] = useState(initialValues?.year || 2026);
  const [month, setMonth] = useState(initialValues?.month || 1);
  const [day, setDay] = useState(initialValues?.day || 1);
  const [hour, setHour] = useState(initialValues?.hour !== undefined ? initialValues.hour : 12);
  const [minute, setMinute] = useState(initialValues?.minute !== undefined ? initialValues.minute : 0);
  const [isMan, setIsMan] = useState(initialValues?.isMan !== undefined ? initialValues.isMan : true);
  const [birthYear, setBirthYear] = useState(initialValues?.birthYear || 1980);
  const [zhanbuTime, setZhanbuTime] = useState<string>(initialValues?.zhanbuTime ?? "");
  const [yueJiangMethod, setYueJiangMethod] = useState<number>(initialValues?.yueJiangMethod ?? 1);
  const [guirenMethod, setGuirenMethod] = useState<number>(initialValues?.guirenMethod ?? 1);
  const [guirenSunni, setGuirenSunni] = useState<number>(initialValues?.guirenSunni ?? 1);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 弹窗从底部滑入动画
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (show) {
      setEntered(false);
      const r = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(r);
    } else {
      setEntered(false);
    }
  }, [show]);

  useEffect(() => {
    if (!initialValues?.year) {
      const n = new Date();
      setYear(n.getFullYear());
      setMonth(n.getMonth() + 1);
      setDay(n.getDate());
      setHour(n.getHours());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // P1-6: 统一滚动锁 + P1-7: 弹窗返回拦截
  useBodyScrollLock(show);
  usePopupBackHandler(onClose, show);

  if (!show) return null;

  const currentYear = 2026;
  const SHI_CHEN_LIST = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

  const handleSubmit = () => {
    onSubmit({
      year, month, day, hour, minute, isMan, birthYear,
      zhanbuTime: zhanbuTime || undefined,
      yueJiangMethod, guirenMethod, guirenSunni,
    });
  };

  const handleNow = () => {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth() + 1);
    setDay(n.getDate());
    setHour(n.getHours());
    setMinute(n.getMinutes());
  };

  const dateStr = `${year}年${String(month).padStart(2, "0")}月${String(day).padStart(2, "0")}日 ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  return (
    <>
      {/* 底部弹窗 */}
      <div
        className="fixed inset-0 z-[9999] flex items-end justify-center transition-opacity duration-200"
        style={{ opacity: entered ? 1 : 0, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* 遮罩层 */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        {/* 弹窗内容 */}
        <div
          className="relative w-full max-w-[420px] rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ease-out"
          style={{ maxHeight: "85vh", overflowY: "auto", transform: entered ? "translateY(0)" : "translateY(100%)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 标题栏（仅模态模式显示，避免与BrandHeader形成双层标题） */}
          {showTitle && (
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sticky top-0 bg-white z-10">
            <span className="text-base font-bold text-gray-800">大六壬起课</span>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          )}

          <div className="px-4 py-3 space-y-4">
            {/* 1. 起课时间 */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1.5">起课时间</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-left hover:border-[#7B2FBE] transition-colors"
                >
                  {dateStr}
                </button>
                <button
                  type="button"
                  onClick={handleNow}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  当前时间
                </button>
              </div>
            </div>

            {/* 2. 出生年份 */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1.5">出生年份</div>
              <select
                value={birthYear}
                onChange={(e) => setBirthYear(parseInt(e.target.value, 10))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7B2FBE]"
              >
                {Array.from({ length: currentYear - 1950 + 1 }, (_, i) => {
                  const y = 1950 + i;
                  const gz = getYearGanZhi(y);
                  return (
                    <option key={y} value={y}>{y}年({gz[0]}{gz[1]})</option>
                  );
                })}
              </select>
            </div>

            {/* 3. 性别 */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">性别</span>
              <div className="flex gap-4">
                <DLRRadioOption label="男" selected={isMan} onClick={() => setIsMan(true)} />
                <DLRRadioOption label="女" selected={!isMan} onClick={() => setIsMan(false)} />
              </div>
            </div>

            {/* 4. 占事时辰 */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1.5">占事时辰</div>
              <select
                value={zhanbuTime}
                onChange={(e) => setZhanbuTime(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#7B2FBE]"
              >
                <option value="">当前时间</option>
                {SHI_CHEN_LIST.map((z) => (
                  <option key={z} value={z}>{z}时</option>
                ))}
              </select>
            </div>

            {/* 5. 换将方式 */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">换将方式</span>
              <div className="flex gap-4">
                <DLRRadioOption label="节气" selected={yueJiangMethod === 1} onClick={() => setYueJiangMethod(1)} />
                <DLRRadioOption label="年月日时取余" selected={yueJiangMethod === 2} onClick={() => setYueJiangMethod(2)} />
              </div>
            </div>

            {/* 6. 贵神类型 */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">贵神类型</span>
              <div className="flex gap-4 flex-wrap justify-end">
                <DLRRadioOption label="卯酉区分" selected={guirenMethod === 1} onClick={() => setGuirenMethod(1)} />
                <DLRRadioOption label="白昼" selected={guirenMethod === 2} onClick={() => setGuirenMethod(2)} />
                <DLRRadioOption label="夜晚" selected={guirenMethod === 3} onClick={() => setGuirenMethod(3)} />
              </div>
            </div>

            {/* 7. 贵神顺逆 */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">贵神顺逆</span>
              <div className="flex gap-4">
                <DLRRadioOption label="自动" selected={guirenSunni === 1} onClick={() => setGuirenSunni(1)} />
                <DLRRadioOption label="男顺女逆" selected={guirenSunni === 2} onClick={() => setGuirenSunni(2)} />
              </div>
            </div>

            {/* 客户选择器（位于"开始起课"按钮上方） */}
            <div>
              <ClientSelector selectedClient={selectedClient} onSelect={onClientSelect} />
            </div>

            {/* 8. 开始起课按钮 */}
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full rounded-full bg-[#7B2FBE] text-white font-bold text-lg py-2.5 shadow-lg active:bg-[#5B1A8A] transition-colors"
            >
              开始起课
            </button>
          </div>
        </div>
      </div>

      {/* DatePicker 弹窗（选择起课时间） */}
      <DatePicker
        show={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSubmit={(date, opts) => {
          setYear(date.year);
          setMonth(date.month);
          setDay(date.day);
          setHour(date.hour);
          setMinute(date.minute);
          setShowDatePicker(false);
        }}
        initialDate={{ year, month, day, hour, minute }}
        showMinute
        showOptions={false}
        showGender={false}
        showCalType={true}
        showToggles={false}
        showRegion={false}
        showName={false}
        title="选择起课时间"
        submitText="排盘"
      />
    </>
  );
}

// 主组件
// ============================================================================

export default function DaLiuRenPage() {
  const pageKey = "yixue_daliuren"; const { showResult, savedParams, saveParams, goToResult } = useToolBack({ pageKey, eventName: "yixue-back", globalFlag: "__yixueBackHandled" });
  const [showForm, setShowForm] = useState(true);
  const [activeTab, setActiveTab] = useState<"panmian" | "fuzhu" | "shensha" | "pingzhu" | "dangan">("panmian");
  const [data, setData] = useState<DaLiuRenResult | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);
  const [prefillParams, setPrefillParams] = useState<DaLiuRenInputParams | null>(null);
  const [interpretPanel, setInterpretPanel] = useState<{title:string; items:Array<{type:string;title:string;content:string;source:string}>} | null>(null);

  // 监听header编辑按钮
  useEffect(() => {
    const editHandler = () => setShowForm(true);
    const backHandler = () => {
      if (!showForm && data) { setShowForm(true); window.__yixueBackHandled = true; }
    };
    window.addEventListener("yixue-edit", editHandler);
    window.addEventListener("yixue-back", backHandler);
    return () => {
      window.removeEventListener("yixue-edit", editHandler);
      window.removeEventListener("yixue-back", backHandler);
    };
  }, [showForm, data]);

  // URL参数clientId自动选中客户 + 回填数据检查
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) {
      const c = getClient(cid);
      if (c) setSelectedClient(c);
    }
    const prefill = getPrefillData("daliuren");
    if (prefill) {
      try {
        // 回填排盘结果
        setData(prefill);
        // 保存输入参数供表单编辑时使用
        if (prefill.inputParams) {
          setPrefillParams(prefill.inputParams);
        }
        setShowForm(false);
        clearPrefillData("daliuren");
      } catch (e) { console.error("回填失败:", e); }
    }
  }, []);

  // localStorage 持久化：恢复排盘状态
  useEffect(() => {
    const saved = loadPaipanState("daliuren");
    if (saved && saved.input) {
      const inp = saved.input as any;
      if (inp) setPrefillParams(inp);
    }
  }, []);

  const handleSubmit = useCallback((params: DaLiuRenInputParams) => {
    const result = calculateDaLiuRen(
      params.year, params.month, params.day, params.hour, params.minute,
      params.isMan, params.birthYear,
      params.zhanbuTime, params.yueJiangMethod, params.guirenMethod, params.guirenSunni
    );
    setData(result);
    setShowForm(false);
    savePaipanState("daliuren",{input:params as any,showForm:false,_ts:Date.now()});
    // 保存客户记录
    if(selectedClient){
      try{saveRecord({clientId:selectedClient.id,type:"daliuren",data:{...result,inputParams:params},note:"",status:"pending"});}catch(e){console.error("保存记录失败:",e);}
    }
  }, [selectedClient]);

  // 不自动排盘，用户必须点击排盘按钮
  if (!data) {
    return (
      <div className="bg-[#ededed] min-h-screen flex justify-center">
        <div className="w-full" style={{ maxWidth: "420px", paddingBottom: "10px" }}>
          <InputPanel show={true} showTitle={false} onClose={() => {}} onSubmit={handleSubmit} selectedClient={selectedClient} onClientSelect={setSelectedClient} initialValues={prefillParams} />
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "panmian" as const, label: "盘面" },
    { key: "fuzhu" as const, label: "辅助" },
    { key: "shensha" as const, label: "神煞" },
    { key: "pingzhu" as const, label: "评注" },
    { key: "dangan" as const, label: "档案" },
  ];

  // ------ 渲染辅助 ------
  const kwSet = new Set(data.kongwang);

  // 渲染神煞值（日空/时空中的空亡地支加黑框）
  const renderShenshaValue = (label: string, value: string) => {
    const needBorder = label === "日空" || label === "时空";
    if (!needBorder) {
      return <span style={{ color: "#000", fontWeight: 500, fontSize: "10px" }}>{value}</span>;
    }
    return (
      <span style={{ fontSize: "10px", fontWeight: 500 }}>
        {value.split("").map((ch, i) => (
          <span
            key={i}
            style={{
              border: "2px solid #000",
              borderRadius: "2px",
              padding: "0 1px",
              marginRight: "1px",
              color: zhiColorRender(ch, data.dayGan),
            }}
          >
            {ch}
          </span>
        ))}
      </span>
    );
  };

  // ------ 天地盘 4x4 grid 宫位定义 ------
  // grid-column / grid-row 都是 1-based
  const DIPAN_POSITIONS: { dz: string; row: number; col: number }[] = [
    { dz: "巳", row: 1, col: 1 },
    { dz: "午", row: 1, col: 2 },
    { dz: "未", row: 1, col: 3 },
    { dz: "申", row: 1, col: 4 },
    { dz: "辰", row: 2, col: 1 },
    { dz: "酉", row: 2, col: 4 },
    { dz: "卯", row: 3, col: 1 },
    { dz: "戌", row: 3, col: 4 },
    { dz: "寅", row: 4, col: 1 },
    { dz: "丑", row: 4, col: 2 },
    { dz: "子", row: 4, col: 3 },
    { dz: "亥", row: 4, col: 4 },
  ];

  // 四课显示顺序（左→右）：[3][2][1][0] = 第四课、第三课、第二课、第一课
  const SIKE_DISPLAY = [3, 2, 1, 0];
  const SIKE_LABELS = ["四", "三", "二", "一"];

  return (
    <div className="bg-[#ededed] min-h-screen flex justify-center">
      <div className="w-full" style={{ maxWidth: "420px", paddingBottom: "10px" }}>
      {/* 输入面板（点击编辑按钮展开） */}
      <InputPanel show={showForm} showTitle={false} onClose={() => setShowForm(false)} onSubmit={handleSubmit} selectedClient={selectedClient} onClientSelect={setSelectedClient} initialValues={prefillParams} />

      {/* ====== 1. 顶部信息栏 ====== */}
      <div style={{ display: "flex", padding: "6px 10px", borderBottom: "1px solid #eee", backgroundColor: "#fff" }}>
        {/* 左侧：四柱 */}
        <div style={{ display: "flex", gap: "6px", flex: "0 0 auto" }}>
          {(["年", "月", "日", "时"] as const).map((label, idx) => {
            const [gan, zhi] = data.siZhu[idx];
            const isRizhu = idx === 2;
            return (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "32px" }}>
                {/* 灰色标签 */}
                <span style={{
                  backgroundColor: COLOR_GRAY_LABEL,
                  color: "#fff",
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "2px",
                  lineHeight: 1.4,
                  marginBottom: "2px",
                }}>{label}</span>
                {/* 天干 */}
                <span style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: isRizhu ? BRAND_RED : getGanColor(gan),
                  lineHeight: 1.2,
                }}>{gan}</span>
                {/* 地支 */}
                <span style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: isRizhu ? BRAND_RED : getZhiColor(zhi),
                  lineHeight: 1.2,
                }}>{zhi}</span>
              </div>
            );
          })}
        </div>
        {/* 右侧：日期/农历/节气 */}
        <div style={{ flex: 1, textAlign: "right", fontSize: "10px", color: "#000", lineHeight: 1.6, paddingLeft: "6px", alignSelf: "center" }}>
          <div>{data.dateStr}</div>
          <div>农历{data.lunarDate}</div>
          <div>{data.jieqiInfo}</div>
        </div>
      </div>

      {/* ====== 2. 主体区域 flex ====== */}
      <div style={{ display: "flex", backgroundColor: "#fff" }}>
        {/* ---- 左侧竖栏（约30%） ---- */}
        <div style={{
          width: "30%",
          flexShrink: 0,
          borderRight: "1px solid #ccc",
          backgroundColor: "#fff",
          padding: "4px 4px",
          fontSize: "11px",
          boxSizing: "border-box",
        }}>
          {/* 出生信息 */}
          <div style={{ textAlign: "center", marginBottom: "6px", fontSize: "12px", color: "#000", lineHeight: 1.3, fontWeight: 500 }}>
            {data.shengXiao}({data.birthYear}) {data.isMan ? "男" : "女"}
          </div>

          {/* 本命/行年（inline布局，灰色标签+彩色大值） */}
          {[
            { label: "本命", gan: data.benMing[0], zhi: data.benMing[1], isUnderline: false },
            { label: "行年", gan: data.xingYear[0], zhi: data.xingYear[1], isUnderline: false },
          ].map((item, i) => (
            <div key={`top-${i}`} style={{ display: "flex", alignItems: "center", padding: "1px 2px", marginBottom: "2px", fontSize: "10px", lineHeight: 1.4 }}>
              <span style={{
                backgroundColor: COLOR_GRAY_LABEL,
                color: "#fff",
                fontSize: "10px",
                padding: "1px 4px",
                borderRadius: "2px",
                marginRight: "4px",
                flexShrink: 0,
                lineHeight: 1.4,
              }}>{item.label}</span>
              <span style={{
                fontSize: "14px",
                fontWeight: 700,
                color: item.isUnderline ? BRAND_RED : ganColorRender(item.gan, data.dayGan),
                textDecoration: item.isUnderline ? "underline" : "none",
                textDecorationColor: BRAND_RED,
                lineHeight: 1.2,
              }}>{item.gan}</span>
              {item.zhi && (
                <span style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: item.isUnderline ? BRAND_RED : zhiColorRender(item.zhi, data.dayGan),
                  textDecoration: item.isUnderline ? "underline" : "none",
                  textDecorationColor: BRAND_RED,
                  lineHeight: 1.2,
                }}>{item.zhi}</span>
              )}
            </div>
          ))}

          {/* 月将 - 单独区域，上面有粗线 */}
          <div style={{ borderTop: "2px solid #333", marginTop: "3px", paddingTop: "3px" }}>
            <div style={{ display: "flex", alignItems: "center", padding: "1px 2px", marginBottom: "2px", fontSize: "10px", lineHeight: 1.4 }}>
              <span style={{
                backgroundColor: COLOR_GRAY_LABEL,
                color: "#fff",
                fontSize: "10px",
                padding: "1px 4px",
                borderRadius: "2px",
                marginRight: "4px",
                flexShrink: 0,
                lineHeight: 1.4,
              }}>月将</span>
              <span style={{
                fontSize: "14px",
                fontWeight: 700,
                color: BRAND_RED,
                textDecoration: "underline",
                textDecorationColor: BRAND_RED,
                lineHeight: 1.2,
              }}>{data.yuejiangZhi}</span>
            </div>
          </div>

          {/* 神煞列表（过滤掉本命/行年/月将，因为已在顶部显示） */}
          <div>
            {data.shensha.filter(ss => !["本命", "行年", "月将"].includes(ss.label)).map((ss, i) => (
              <div key={i}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "1px 2px",
                    fontSize: "10px",
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{
                    backgroundColor: COLOR_GRAY_LABEL,
                    color: "#fff",
                    fontSize: "9px",
                    padding: "0 3px",
                    borderRadius: "2px",
                    marginRight: "3px",
                    flexShrink: 0,
                    lineHeight: 1.4,
                  }}>{ss.label}</span>
                  {renderShenshaValue(ss.label, ss.value)}
                </div>
                {/* 旬尾下面加一条细分隔线 */}
                {ss.label === "旬尾" && <div style={{ borderTop: "1px solid #999", margin: "4px 2px" }}></div>}
              </div>
            ))}
          </div>

          {/* 自选神煞 */}
          <div style={{ marginTop: "6px", borderTop: "1px dashed #ccc", paddingTop: "4px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#000", marginBottom: "2px", paddingLeft: "2px" }}>自選神煞</div>
            {data.zixuanShensha.map((ss, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "1px 2px",
                  fontSize: "10px",
                  lineHeight: 1.4,
                }}
              >
                <span style={{
                  backgroundColor: COLOR_GRAY_LABEL,
                  color: "#fff",
                  fontSize: "9px",
                  padding: "0 3px",
                  borderRadius: "2px",
                  marginRight: "3px",
                  flexShrink: 0,
                  lineHeight: 1.4,
                }}>{ss.label}</span>
                <span style={{ color: "#000", fontWeight: 500, fontSize: "10px" }}>{ss.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ---- 右侧主盘面 ---- */}
        <div style={{ flex: 1, minWidth: 0, padding: "4px 5px", boxSizing: "border-box" }}>

          {/* ===== a. 三传区域（在四课上方，5列竖排：六亲列 | 天干列 | 地支列(灰底大字) | 天将列 | 标签列(灰块)） ===== */}
          <div style={{ marginBottom: "4px" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "auto auto auto auto 24px",
              gap: 0,
              margin: "0 auto",
              maxWidth: "300px",
              border: "1px solid #ccc",
            }}>
              {/* 三行数据：初传(row0)、中传(row1)、末传(row2) */}
              {[0, 1, 2].map(rowIdx => {
                const sc = data.sanChuan[rowIdx];
                const dg = sc.gan && sc.gan !== "〇" ? sc.gan : "";
                const isKW = kwSet.has(sc.zhi);
                const labels = ["初", "中", "末"];
                return (
                  <div key={rowIdx} style={{ display: "contents", cursor: "pointer" }} onClick={() => {
                    const interp = getSanChuanInterpretation(labels[rowIdx], sc.zhi, sc.liuqin, sc.shen, dg);
                    setInterpretPanel({ title: `${labels[rowIdx]}传 · ${sc.zhi}`, items: interp.items });
                  }}>
                    {/* 列1：六亲/十神 */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "2px 4px",
                      fontSize: "16px",
                      fontWeight: 500,
                      color: "#000",
                      lineHeight: 1.2,
                      borderRight: "1px solid #ccc",
                      minHeight: "44px",
                    }}>{sc.liuqin}</div>
                    {/* 列2：天干/遁干 */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "2px 4px",
                      fontSize: "20px",
                      fontWeight: 500,
                      color: dg ? ganColorRender(dg, data.dayGan) : "transparent",
                      lineHeight: 1.2,
                      borderRight: "1px solid #ccc",
                      minHeight: "44px",
                    }}>{dg || "　"}</div>
                    {/* 列3：地支（大字，灰底，五行色，空亡加框） */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "2px 6px",
                      fontSize: "26px",
                      fontWeight: 700,
                      color: zhiColorRender(sc.zhi, data.dayGan),
                      backgroundColor: "#e8e8e8",
                      lineHeight: 1.2,
                      borderRight: "1px solid #ccc",
                      border: isKW ? "2px solid #000" : "none",
                      minHeight: "44px",
                    }}>{sc.zhi}</div>
                    {/* 列4：天将/神煞 */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "2px 4px",
                      fontSize: "16px",
                      fontWeight: 500,
                      color: shenColor(sc.shen),
                      lineHeight: 1.2,
                      borderRight: "1px solid #ccc",
                      minHeight: "44px",
                    }}>{sc.shen}</div>
                    {/* 列5：初/中/末标签（灰色背景白字） */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: COLOR_GRAY_LABEL,
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: 500,
                      lineHeight: 1.2,
                      minHeight: "44px",
                    }}>{labels[rowIdx]}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===== b. 四课区域 ===== */}
            <div style={{ marginBottom: "6px" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 0,
                margin: "0 auto",
              }}>
                {/* 标签行：四 三 二 一 */}
                {SIKE_LABELS.map((lbl, i) => (
                  <div key={`lbl-${i}`} style={{ textAlign: "center", marginBottom: "1px" }}>
                    <span style={{
                      backgroundColor: COLOR_GRAY_LABEL,
                      color: "#fff",
                      fontSize: "11px",
                      padding: "2px 5px",
                      borderRadius: "2px",
                      lineHeight: 1.3,
                    }}>{lbl}</span>
                  </div>
                ))}
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 0,
                margin: "0 auto",
              }}>
                {SIKE_DISPLAY.map((idx) => {
                  const ke = data.siKe[idx];
                  const dg = ke.dunGan && ke.dunGan !== "〇" ? ke.dunGan : "";
                  const isSS_KW = kwSet.has(ke.shangShen);
                  const isXS_KW = kwSet.has(ke.xiaShen);
                  const xiaIsGan = GAN.includes(ke.xiaShen as TianGan);
                  return (
                    <div key={`ke-${idx}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.2, cursor: "pointer" }} onClick={() => {
                      const ke = data.siKe[idx];
                      const dg = ke.dunGan && ke.dunGan !== "〇" ? ke.dunGan : "";
                      const siKeInterp = getSiKeInterpretation(SIKE_LABELS[idx], ke.shangShen, ke.xiaShen, ke.tianJiang, dg);
                      setInterpretPanel({ title: `第${SIKE_LABELS[idx]}课`, items: siKeInterp.items });
                    }}>
                      {/* 天将 */}
                      <span style={{
                        fontSize: "11px",
                        color: shenColor(ke.tianJiang),
                        height: "16px",
                        lineHeight: "16px",
                      }}>{ke.tianJiang}</span>
                      {/* 上神（大字bold）+ 遁干小字在右侧 */}
                      <div style={{ display: "flex", alignItems: "baseline", gap: "1px" }}>
                        <span style={{
                          fontSize: "20px",
                          fontWeight: 700,
                          color: zhiColorRender(ke.shangShen, data.dayGan),
                          border: isSS_KW ? "2px solid #000" : "none",
                          borderRadius: "2px",
                          padding: isSS_KW ? "0 2px" : 0,
                          lineHeight: 1.2,
                        }}>{ke.shangShen}</span>
                        {dg && (
                          <span style={{
                            fontSize: "10px",
                            color: ganColorRender(dg, data.dayGan),
                            lineHeight: 1,
                          }}>{dg}</span>
                        )}
                      </div>
                      {/* 下神（大字bold） */}
                      <span style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        color: ke.xiaShen === data.dayGan ? BRAND_RED : (xiaIsGan ? getGanColor(ke.xiaShen) : getZhiColor(ke.xiaShen)),
                        border: isXS_KW ? "2px solid #000" : "none",
                        borderRadius: "2px",
                        padding: isXS_KW ? "0 2px" : 0,
                        lineHeight: 1.2,
                      }}>{ke.xiaShen}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ===== c. 天地盘区域（4x4 grid，灰色边框） ===== */}
            <div style={{
              border: "2px solid #777",
              borderRadius: "2px",
              margin: "0 auto",
              position: "relative",
              width: "100%",
              maxWidth: "260px",
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gridTemplateRows: "repeat(4, auto)",
                gap: 0,
                width: "100%",
              }}>
                {DIPAN_POSITIONS.map(({ dz, row, col }) => {
                  const tpZhi = data.yueJiangMap[dz] || "";   // 天盘地支
                  const tianJiang = data.guiShenMap[dz] || ""; // 天将
                  const dunGan = data.tianGanMap[dz] || "";   // 遁干
                  const dgShow = (dunGan && dunGan !== "〇") ? dunGan : "";
                  const tpKW = kwSet.has(tpZhi);
                  const dpKW = kwSet.has(dz);

                  return (
                    <div
                      key={dz}
                      style={{
                        gridRow: row,
                        gridColumn: col,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRight: (col < 4 && !(row >= 2 && row <= 3 && col === 1)) ? "1px solid #ccc" : "none",
                        borderBottom: (row < 4 && !(col >= 2 && col <= 3 && row === 1)) ? "1px solid #ccc" : "none",
                        padding: "3px 2px",
                        minHeight: "52px",
                        boxSizing: "border-box",
                        lineHeight: 1.1,
                      }}
                    >
                      {/* 顶部：天将 */}
                      <span style={{
                        fontSize: "10px",
                        color: shenColor(tianJiang),
                        height: "12px",
                        lineHeight: "12px",
                      }}>{tianJiang}</span>
                      {/* 中部：天盘地支 + 遁干 */}
                      <div style={{ display: "flex", alignItems: "baseline", gap: "1px" }}>
                        <span style={{
                          fontSize: "20px",
                          fontWeight: 700,
                          color: zhiColorRender(tpZhi, data.dayGan),
                          border: tpKW ? "2px solid #000" : "none",
                          borderRadius: "2px",
                          padding: tpKW ? "0 1px" : 0,
                          lineHeight: 1.15,
                        }}>{tpZhi}</span>
                        {dgShow && (
                          <span style={{
                            fontSize: "10px",
                            color: ganColorRender(dgShow, data.dayGan),
                            lineHeight: 1,
                          }}>{dgShow}</span>
                        )}
                      </div>
                      {/* 底部：地盘地支（带下划线，空亡加黑框） */}
                      <span style={{
                        fontSize: "11px",
                        color: zhiColorRender(dz, data.dayGan),
                        border: dpKW ? "2px solid #000" : "none",
                        borderBottom: dpKW ? "2px solid #000" : "1px solid " + zhiColorRender(dz, data.dayGan),
                        borderRadius: "2px",
                        padding: dpKW ? "0 1px" : "0",
                        paddingBottom: "0px",
                        lineHeight: 1.2,
                        marginTop: "1px",
                      }}>{dz}</span>
                    </div>
                  );
                })}

                {/* 中宫：行2-3, 列2-3 —— 日干日支+课体全称+三传方法名+判断说明 */}
                <div style={{
                  gridRow: "2 / span 2",
                  gridColumn: "2 / span 2",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #ccc",
                  boxSizing: "border-box",
                  padding: "3px 4px",
                  minHeight: "104px",
                  lineHeight: 1.25,
                  gap: "1px",
                  cursor: "pointer",
                }} onClick={() => {
                  const keTiInterp = getKeTiInterpretation(data.keTi);
                  if (keTiInterp) {
                    setInterpretPanel({ title: `课体：${data.keTi}`, items: [{ type: "keti", title: keTiInterp.title, content: keTiInterp.summary + "\n" + keTiInterp.details.join("\n"), source: keTiInterp.source }] });
                  }
                }}>
                  {/* 第1行：日干(红) + 日支(红) + "日"字 —— 对标吉时雨：日干日支均为红色 */}
                  <div style={{ fontSize: "16px", fontWeight: 700, lineHeight: 1.2 }}>
                    <span style={{ color: BRAND_RED }}>{data.dayGan}</span>
                    <span style={{ color: BRAND_RED }}>{data.dayZhi}</span>
                    <span style={{ color: "#000", fontSize: "12px" }}>日</span>
                  </div>
                  {/* 第2行：课体全称（加粗） */}
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#000", marginTop: "2px" }}>{data.keTi}</div>
                  {/* 第3行：三传方法名 */}
                  <div style={{ fontSize: "10px", color: "#444" }}>三传：{data.sanChuanMethod}法</div>
                  {/* 第4行：课体吉凶定性/判断说明 */}
                  <div style={{ fontSize: "9px", color: "#666", textAlign: "center", marginTop: "1px", lineHeight: 1.3 }}>{data.keTiDesc}</div>
                </div>
              </div>
            </div>

            {/* 辅助说明 */}
            <div style={{ textAlign: "center", fontSize: "10px", color: "#999", marginTop: "4px", lineHeight: 1.4 }}>
              {data.yuejiangName}加{data.zhanbuTime}时 · {data.isDaytime ? "昼占" : "夜占"} · 空亡:{data.kongwang[0]}{data.kongwang[1]}
            </div>

            {/* ---- 解读面板（引经据典） ---- */}
            {interpretPanel && (
              <div className="bg-white rounded-lg overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)] mx-1 mt-2" style={{ border: "1px solid #d93025" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "linear-gradient(135deg, #d93025, #e85045)", color: "white" }}>
                  <div>
                    <span style={{ fontSize: "16px", fontWeight: "bold" }}>{interpretPanel.title}</span>
                  </div>
                  <button onClick={() => setInterpretPanel(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: "28px", height: "28px", borderRadius: "50%", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
                </div>
                <div style={{ padding: "10px 12px" }}>
                  {interpretPanel.items.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: idx < interpretPanel.items.length - 1 ? "10px" : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontSize: "10px", fontWeight: "bold", padding: "1px 6px", borderRadius: "3px", background: item.type === "zhi" ? "#e0e7ff" : item.type === "liuqin" ? "#f3e8ff" : item.type === "shen" ? "#fef3c7" : item.type === "position" ? "#d1fae5" : item.type === "dungan" ? "#fce7f3" : item.type === "shangshen" ? "#e0f2fe" : item.type === "xiashen" ? "#f0fdf4" : item.type === "keti" ? "#fef2f2" : "#f3f4f6", color: item.type === "zhi" ? "#3730a3" : item.type === "liuqin" ? "#6b21a8" : item.type === "shen" ? "#92400e" : item.type === "position" ? "#065f46" : item.type === "dungan" ? "#9d174d" : item.type === "shangshen" ? "#0369a1" : item.type === "xiashen" ? "#166534" : item.type === "keti" ? "#991b1b" : "#374151", marginRight: "8px" }}>{item.type === "zhi" ? "地支" : item.type === "liuqin" ? "六亲" : item.type === "shen" ? "天将" : item.type === "position" ? "位置" : item.type === "dungan" ? "遁干" : item.type === "shangshen" ? "上神" : item.type === "xiashen" ? "下神" : item.type === "keti" ? "课体" : "其他"}</span>
                        <span style={{ fontSize: "13px", fontWeight: "bold", color: "#333" }}>{item.title}</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#555", lineHeight: "1.6", whiteSpace: "pre-line" }}>{item.content}</div>
                      <div style={{ fontSize: "10px", color: "#999", marginTop: "4px", fontStyle: "italic" }}>—— {item.source}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "6px 12px", background: "#fafafa", borderTop: "1px solid #eee", fontSize: "10px", color: "#999", textAlign: "center" }}>点击三传/四课/中宫可查看解读 · 引经据典，仅供参考</div>
              </div>
            )}
        </div>
      </div>

      {/* ====== 3. 底部Tab栏 ====== */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "420px",
          maxWidth: "100vw",
          display: "flex",
          backgroundColor: "#fff",
          borderTop: "1px solid #ddd",
          zIndex: 100,
          boxSizing: "border-box",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: "8px 0",
              textAlign: "center",
              fontSize: "13px",
              fontWeight: activeTab === tab.key ? 700 : 500,
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              color: activeTab === tab.key ? TAB_BLUE : "#333",
              borderBottom: activeTab === tab.key ? "2px solid " + TAB_BLUE : "2px solid transparent",
              boxSizing: "border-box",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab内容区（非盘面时显示在tab栏上方） */}
      {activeTab !== "panmian" && (
        <div style={{
          padding: "10px 12px",
          borderTop: "1px solid #eee",
          backgroundColor: "#fff",
          fontSize: "12px",
          color: "#666",
          lineHeight: 1.8,
        }}>
          {activeTab === "fuzhu" && (
            <div>
              <div style={{ fontWeight: 600, color: "#333", marginBottom: "4px", fontSize: "13px" }}>辅助信息</div>
              <div>月将加时：{data.yuejiangName}加{data.zhanbuTime}时</div>
              <div>贵人：{data.isDaytime ? "昼贵" : "夜贵"}方（{tianYiGuiRen(data.dayGan, data.isDaytime)}）</div>
              <div>空亡：{data.kongwang[0]}{data.kongwang[1]}</div>
              <div>日干：{data.dayGan}（{GAN_WUXING[data.dayGan]}） 日支：{data.dayZhi}（{ZHI_WUXING[data.dayZhi]}）</div>
              <div>课体：{data.keTi}（{data.sanChuanMethod}法）</div>
              <div>判断：{data.keTiDesc}</div>
              <div>三传：{data.sanChuan.map(sc => sc.zhi).join(" → ")}</div>
            </div>
          )}
          {activeTab === "shensha" && (
            <div>
              <div style={{ fontWeight: 600, color: "#333", marginBottom: "4px", fontSize: "13px" }}>神煞详表</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                {[...data.shensha, ...data.zixuanShensha].map((ss, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px dotted #eee" }}>
                    <span style={{ color: "#999" }}>{ss.label}：</span>
                    <span style={{ fontWeight: 600, color: "#000" }}>{ss.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === "pingzhu" && (
            <div>
              <div style={{ fontWeight: 600, color: "#333", marginBottom: "4px", fontSize: "13px" }}>评注</div>
              <p style={{ margin: 0 }}>此功能为学习版本，评注功能将在后续版本中完善。</p>
            </div>
          )}
          {activeTab === "dangan" && (
            <div>
              <div style={{ fontWeight: 600, color: "#333", marginBottom: "4px", fontSize: "13px" }}>档案</div>
              <p style={{ margin: 0 }}>课例保存与管理功能将在后续版本中完善。</p>
            </div>
          )}
        </div>
      )}

      {/* AI智能解读 */}
      <div style={{ padding: "0 10px 60px" }}>
        <EventDivinationPanel
          toolName="大六壬"
          chartContext={`四柱: ${data.siZhu.map(s => s[0]+s[1]).join(" ")}\n日干支: ${data.dayGan}${data.dayZhi}\n月将: ${data.yuejiangName}加${data.zhanbuTime}时\n三传: ${data.sanChuan.map(sc => sc.zhi).join("→")} (${data.sanChuanMethod}法)\n四课: ${data.siKe.map(ke => ke.shangShen+ke.xiaShen).join(" ")}\n课体: ${data.keTi}\n空亡: ${data.kongwang.join("")}\n${data.isDaytime ? "昼占" : "夜占"}\n判断: ${data.keTiDesc}`}
          isPaidTool={false}
        />
      </div>
      {/* 分享排盘结果 */}
      <div className="px-3 py-2">
        <ShareButton
          type="tool"
          title="大六壬排盘结果"
          description="大六壬排盘"
          variant="block"
          label="分享排盘结果"
        />
      </div>
      </div>
    </div>
  );
}