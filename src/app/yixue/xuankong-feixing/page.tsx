"use client";

import { useState, useCallback, useEffect } from "react";
import { DatePicker } from "@/components/shared";
import ClientSelector from "@/components/ClientSelector";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";
import { getXuankongGongInterpretation, getXuankongStarInterpretation, getXuankongYunInterpretation } from "@/lib/xuankong-interpretations";
import type { XuankongInterpretItem } from "@/lib/xuankong-interpretations";
import { savePaipanState, loadPaipanState, clearPaipanState } from "@/lib/paipanPersistence";
import { useToolBack } from "@/lib/useToolBack";
import { calcXuankong, getYunFromYear, getYunName, STAR_NAMES, STAR_WUXING } from "@/algorithm-core/modules/xuankong-feixing";
import EventDivinationPanel from "@/components/EventDivinationPanel";

import { ShareButton } from "@/components/ShareButton";
import { PostToSquareButton } from "@/components/PostToSquareButton";
// ============================================================================
// 常量
// ============================================================================
const BRAND = "#7B2FBE";

/** 解读类型标签颜色 */
const INTERPRET_TYPE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  palace: { bg: "#f3e8ff", fg: "#7B2FBE", label: "宫位" },
  star: { bg: "#fef3c7", fg: "#d97706", label: "飞星" },
  zuhe: { bg: "#e0f2fe", fg: "#0284c7", label: "组合" },
  yun: { bg: "#f0faf0", fg: "#16a34a", label: "元运" },
};

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
  const pageKey = "yixue_xuankong_feixing"; const { showResult, savedParams, saveParams, goToResult } = useToolBack({ pageKey, eventName: "yixue-back", globalFlag: "__yixueBackHandled" });
  const currentYear = 2026;
  const defaultYun = getYunFromYear(currentYear);

  const [buildYear, setBuildYear] = useState(currentYear);

  useEffect(() => {
    const n = new Date();
    setBuildYear(n.getFullYear());
  }, []);
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
  const [interpretPanel, setInterpretPanel] = useState<{title: string; items: XuankongInterpretItem[]} | null>(null);

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
      savePaipanState("xuankong",{input:{buildYear:effYear,month,day,hour,zuoShan,floor},showForm:false,_ts:Date.now()});
      // 保存客户记录
      if(selectedClient && r){
        try{saveRecord({clientId:selectedClient.id,type:"xuankong-feixing",data:{...r,inputParams:{zuoShan,xiangShan,buildYear:effYear,floor}},note:"",status:"pending"});}catch(e){console.error("保存记录失败:",e);}
      }
    }, 200);
  }, [zuoShan, xiangShan, buildYear, floor, selectedClient]);

  // 宫位点击处理
  const handleGongClick = useCallback((gong: number) => {
    const interp = getXuankongGongInterpretation(gong);
    if (interp) setInterpretPanel(interp);
  }, []);

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
    const editHandler = () => setHasResult(false);
    const backHandler = () => { if (hasResult) { setHasResult(false); window.__yixueBackHandled = true; } };
    window.addEventListener("yixue-edit", editHandler);
    window.addEventListener("yixue-back", backHandler);
    return () => {
      window.removeEventListener("yixue-edit", editHandler);
      window.removeEventListener("yixue-back", backHandler);
    };
  }, [hasResult]);

  // localStorage 持久化：恢复排盘状态
  useEffect(() => {
    const saved = loadPaipanState("xuankong");
    if (saved && saved.input) {
      const inp = saved.input as any;
      if (inp.buildYear) setBuildYear(inp.buildYear);
      if (inp.month) setMonth(inp.month);
      if (inp.day) setDay(inp.day);
      if (inp.hour) setHour(inp.hour);
      if (inp.zuoShan) setZuoShan(inp.zuoShan);
      if (inp.floor) setFloor(inp.floor);
    }
  }, []);

  return (
    <div className="mx-auto w-full bg-[#ededed]" style={{ maxWidth: "420px", minHeight: "100vh" }}>
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
              onClick={() => { clearPaipanState("xuankong"); setShowForm(true); }}
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
                      onClick={() => handleGongClick(gong)}
                      className={`flex flex-col border text-center ${jxColor.bg}`}
                      style={{
                        marginLeft: "-1px",
                        marginTop: "-1px",
                        borderColor: isZuo || isXiang ? BRAND : "#999",
                        borderWidth: isZuo || isXiang ? "2px" : "1px",
                        cursor: "pointer",
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
            <p className="mt-1 text-center text-[10px] text-gray-400">格式：山星(左上) 向星(右上) 运星(中) · 点击宫位查看解读</p>
          </div>

          {/* 解读抽屉面板 */}
          {interpretPanel && (
            <div className="mt-3 px-0.5">
              <div style={{
                border: "1px solid #7B2FBE",
                borderRadius: "8px",
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
                    ✕
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
                  点击宫位查看解读 · 引经据典，仅供参考
                </div>
              </div>
            </div>
          )}

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

          {/* AI智能解读 */}
          <EventDivinationPanel
            toolName="玄空飞星"
            chartContext={`元运: ${result.yunName}\n建造年: ${buildYear}年\n坐山: ${result.zuoShan}(${result.zuoInfo.direction}) 朝向: ${result.xiangShan}(${result.xiangInfo.direction})\n楼层: ${floor}楼(${result.floorWuxing})\n山星${result.shanShun ? "顺飞" : "逆飞"}\n各宫飞星吉凶: ${LUOSHU_ORDER.map(g => GONG_NAMES[g].name+g+"宫 山"+result.zhaiMingData[g].shan+"向"+result.zhaiMingData[g].xiang+"运"+result.zhaiMingData[g].yun+"("+result.gongAnalysis[g].jiXiong+")").join("; ")}`}
            isPaidTool={false}
          />
        </div>
      )}
      {/* 分享排盘结果 */}
      <div className="px-3 py-2">
        <ShareButton
          type="tool"
          title="玄空飞星排盘结果"
          description="玄空飞星排盘"
          variant="block"
          label="分享排盘结果"
        />
        <div className="mt-2">
          <PostToSquareButton tool="玄空飞星" summary="玄空飞星盘已排出，山向星组合格局清晰" />
        </div>
      </div>


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
