"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { DatePicker } from "@/components/shared";
import { calculateLiuyao } from "@/algorithm-core";
import type { LiuyaoResult, YaoType, LiuyaoYao } from "@/algorithm-core/types/liuyao";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";
import { getGuaInterpretation, getYaoInterpretation, type LiuyaoInterpretItem } from "@/lib/liuyao-interpretations";
import { savePaipanState, loadPaipanState, clearPaipanState } from "@/lib/paipanPersistence";

// ============================================================================
// 品牌色 & 常量
// ============================================================================

const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BG_COLOR = "#F3EDF7";

const WUXING_COLOR: Record<string, string> = {
  "金": "#C8A84E",
  "木": "#2E8B57",
  "水": "#1E6FBA",
  "火": "#D93025",
  "土": "#8B5A2B",
};

const GAN_WUXING: Record<string, string> = {
  "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土",
  "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水",
};

const ZHI_WUXING: Record<string, string> = {
  "子": "水", "丑": "土", "寅": "木", "卯": "木",
  "辰": "土", "巳": "火", "午": "火", "未": "土",
  "申": "金", "酉": "金", "戌": "土", "亥": "水",
};

const YAO_NAMES = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];

/** 爻选项：老阳、少阳、少阴、老阴 */
const YAO_OPTIONS: { value: YaoType; label: string; symbol: string }[] = [
  { value: "1o", label: "老阳○", symbol: "○" },
  { value: "1", label: "少阳━", symbol: "━" },
  { value: "0", label: "少阴━ ━", symbol: "╋" },
  { value: "0x", label: "老阴×", symbol: "×" },
];

/** 解读类型标签颜色 */
const INTERPRET_TYPE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  gua: { bg: "#EDE7F6", fg: "#7B2FBE", label: "卦象" },
  shen: { bg: "#E8F5E9", fg: "#2E7D32", label: "六神" },
  qin: { bg: "#FFF3E0", fg: "#E65100", label: "六亲" },
  shiyin: { bg: "#E3F2FD", fg: "#1565C0", label: "世应" },
  dongyao: { bg: "#FFEBEE", fg: "#C62828", label: "动爻" },
};

// ============================================================================
// 工具函数
// ============================================================================

function getWuxingColor(wx: string): string {
  return WUXING_COLOR[wx] || "#333";
}

function getGanColor(gan: string): string {
  return getWuxingColor(GAN_WUXING[gan] || "土");
}

function getZhiColor(zhi: string): string {
  return getWuxingColor(ZHI_WUXING[zhi] || "土");
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// ============================================================================
// 子组件：爻线渲染
// ============================================================================

function YaoLine({
  isYang,
  isDong,
  isBian,
}: {
  isYang: boolean;
  isDong: boolean;
  isBian?: boolean;
}) {
  return (
    <div style={{
      width: "42px", height: "8px", position: "relative",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      {isYang ? (
        <div style={{ width: "100%", height: "100%", background: "#1a1a1a", borderRadius: "1px" }} />
      ) : (
        <div style={{
          width: "100%", height: "100%",
          background: `linear-gradient(to right, #1a1a1a 0%, #1a1a1a 38%, transparent 38%, transparent 62%, #1a1a1a 62%, #1a1a1a 100%)`,
          borderRadius: "1px",
        }} />
      )}
      {isDong && (
        <span style={{
          position: "absolute", color: "#D93025", fontSize: "13px", fontWeight: "bold",
          top: isYang ? "-5px" : "-3px", lineHeight: 1,
        }}>
          {isYang ? "○" : "×"}
        </span>
      )}
      {isBian && !isDong && (
        <span style={{
          position: "absolute", color: "#999", fontSize: "10px",
          top: "-2px", lineHeight: 1,
        }}>
          →
        </span>
      )}
    </div>
  );
}

// ============================================================================
// 子组件：单爻行（本卦/变卦）
// ============================================================================

function YaoRow({
  yao,
  isBianGua,
  isDongLine,
  bianYang,
  onClick,
}: {
  yao: {
    gan: string; zhi: string; liuQinShort: string;
    isYang: boolean; isDong: boolean;
    isShi: boolean; isYing: boolean;
    isKong: boolean; isYuePo: boolean; isRiChong: boolean;
    fushen?: { liuQin: string; gan: string; zhi: string };
    bianGan?: string; bianZhi?: string; bianLiuQin?: string; bianIsYang?: boolean;
  };
  isBianGua?: boolean;
  isDongLine?: boolean;
  bianYang?: boolean;
  onClick?: () => void;
}) {
  // 左侧：本卦显示六亲干支，变卦显示动变标记
  const leftContent = isBianGua ? (
    isDongLine ? (
      <span style={{ color: "#D93025", fontWeight: "bold", fontSize: "12px" }}>
        {yao.isYang ? "○→" : "×→"}
      </span>
    ) : null
  ) : (
    <div style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "11px", whiteSpace: "nowrap" }}>
      <span style={{ color: "#666", fontWeight: "bold", width: "14px" }}>{yao.liuQinShort}</span>
      <span style={{ color: getGanColor(yao.gan) }}>{yao.gan}</span>
      <span style={{ color: getZhiColor(yao.zhi) }}>{yao.zhi}</span>
    </div>
  );

  // 右侧：本卦显示世应，变卦显示六亲干支
  const rightContent = isBianGua ? (
    isDongLine ? (
      <div style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "11px", whiteSpace: "nowrap" }}>
        <span style={{ color: "#666", fontWeight: "bold", width: "14px" }}>{yao.bianLiuQin}</span>
        <span style={{ color: getGanColor(yao.bianGan || "") }}>{yao.bianGan}</span>
        <span style={{ color: getZhiColor(yao.bianZhi || "") }}>{yao.bianZhi}</span>
      </div>
    ) : null
  ) : (
    yao.isShi ? (
      <span style={{ color: BRAND, fontWeight: "bold", fontSize: "12px" }}>世</span>
    ) : yao.isYing ? (
      <span style={{ color: BRAND, fontWeight: "bold", fontSize: "12px" }}>应</span>
    ) : null
  );

  // 标记：空亡、月破、日冲
  const markers: string[] = [];
  if (!isBianGua) {
    if (yao.isKong) markers.push("空");
    if (yao.isYuePo) markers.push("破");
    if (yao.isRiChong) markers.push("冲");
  }

  // 伏神
  const fushen = !isBianGua && yao.fushen ? (
    <div style={{
      fontSize: "10px", color: "#999", textAlign: "center",
      lineHeight: "1.2", marginBottom: "1px", height: "12px",
    }}>
      伏{yao.fushen.liuQin.slice(0, 1)}{yao.fushen.gan}{yao.fushen.zhi}
    </div>
  ) : (
    <div style={{ height: "13px" }} />
  );

  const lineIsYang = isBianGua && isDongLine ? (bianYang ?? yao.isYang) : yao.isYang;

  return (
    <div
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      {fushen}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "2px 4px", gap: "4px", minHeight: "22px",
        transition: onClick ? "background 0.15s" : undefined,
      }}
      onMouseEnter={onClick ? (e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f0fa"; } : undefined}
      onMouseLeave={onClick ? (e) => { (e.currentTarget as HTMLDivElement).style.background = ""; } : undefined}
      >
        <div style={{ width: "70px", textAlign: "right", minHeight: "14px", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
          {leftContent}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <YaoLine
            isYang={lineIsYang}
            isDong={!isBianGua && yao.isDong}
            isBian={isBianGua && isDongLine}
          />
          {markers.length > 0 && (
            <span style={{ fontSize: "9px", color: "#D93025", fontWeight: "bold", lineHeight: 1 }}>
              {markers.join("")}
            </span>
          )}
        </div>
        <div style={{ width: "70px", textAlign: "left", minHeight: "14px", display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
          {rightContent}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export default function LiuyaoPage() {
  // 输入状态
  const [question, setQuestion] = useState("");
  const [method, setMethod] = useState<"manual" | "time" | "number">("time");

  // 日期时间（固定默认值，避免 hydration mismatch；mounted 后更新为真实时间）
  const [dateStr, setDateStr] = useState("2026-01-01");
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    const n = new Date();
    setDateStr(`${n.getFullYear()}-${pad2(n.getMonth() + 1)}-${pad2(n.getDate())}`);
    setHour(n.getHours());
    setMinute(n.getMinutes());
  }, []);

  // 年份/月份/日期派生状态
  const [parsedYear, parsedMonth, parsedDay] = dateStr.split("-").map(Number);
  const setParsedYear = useCallback((v: number) => { setDateStr(`${v}-${pad2(parsedMonth)}-${pad2(parsedDay)}`); }, [parsedMonth, parsedDay]);
  const setParsedMonth = useCallback((v: number) => { setDateStr(`${parsedYear}-${pad2(v)}-${pad2(parsedDay)}`); }, [parsedYear, parsedDay]);
  const setParsedDay = useCallback((v: number) => { setDateStr(`${parsedYear}-${pad2(parsedMonth)}-${pad2(v)}`); }, [parsedYear, parsedMonth]);

  // 手动起卦：6个爻的值（index 0=初爻，index 5=上爻）
  const [manualYaos, setManualYaos] = useState<YaoType[]>(["1", "1", "1", "1", "1", "1"]);

  // 数字起卦
  const [numUpper, setNumUpper] = useState<number>(1);
  const [numLower, setNumLower] = useState<number>(1);
  const [numDong, setNumDong] = useState<number>(1);

  // 排盘结果
  const [result, setResult] = useState<LiuyaoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);
  const [showForm, setShowForm] = useState(true);

  // 解读面板
  const [interpretPanel, setInterpretPanel] = useState<{
    title: string;
    items: LiuyaoInterpretItem[];
  } | null>(null);

  // 卦名点击 → 显示卦象解读
  const handleGuaNameClick = useCallback((guaName: string) => {
    const interp = getGuaInterpretation(guaName);
    if (interp) {
      setInterpretPanel({ title: guaName + " · 卦象解读", items: interp.items });
    }
  }, []);

  // 爻位点击 → 显示爻位解读
  const handleYaoClick = useCallback((yao: LiuyaoYao) => {
    const interp = getYaoInterpretation(
      yao.position - 1,
      yao.liuQin,
      yao.liuShen,
      yao.isShi,
      yao.isYing,
      yao.isDong,
      yao.gan,
      yao.zhi,
    );
    setInterpretPanel({
      title: YAO_NAMES[yao.position - 1] + "解读",
      items: interp.items,
    });
  }, []);

  // URL参数clientId + 回填检查
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) { const c = getClient(cid); if (c) setSelectedClient(c); }
    const prefill = getPrefillData("liuyao");
    if (prefill) { try { setResult(prefill); setShowForm(false); clearPrefillData("liuyao"); } catch(e){} }
  }, []);

  // localStorage 持久化：恢复排盘状态
  useEffect(() => {
    const saved = loadPaipanState("liuyao");
    if (saved && saved.input) {
      const inp = saved.input as any;
      if (inp.dateStr) setDateStr(inp.dateStr);
      if (inp.hour !== undefined) setHour(inp.hour);
      if (inp.minute !== undefined) setMinute(inp.minute);
      if (inp.method) setMethod(inp.method);
      if (inp.question) setQuestion(inp.question);
      if (inp.manualYaos) setManualYaos(inp.manualYaos);
      if (inp.numUpper) setNumUpper(inp.numUpper);
      if (inp.numLower) setNumLower(inp.numLower);
      if (inp.numDong) setNumDong(inp.numDong);
    }
  }, []);

  // 解析日期
  const parsedDate = useMemo(() => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return { year: y, month: m, day: d };
  }, [dateStr]);

  // 起卦
  const handleQigua = useCallback((override?: {year: number; month: number; day: number; hour: number; minute: number}) => {
    setError(null);
    try {
      const year = override?.year ?? parsedDate.year;
      const m = override?.month ?? parsedDate.month;
      const d = override?.day ?? parsedDate.day;
      const h = override?.hour ?? hour;
      const mi = override?.minute ?? minute;
      if (!year || !m || !d) {
        setError("请选择有效的日期");
        return;
      }

      const input: {
        method: "manual" | "time" | "number";
        year: number; month: number; day: number; hour: number; minute: number;
        question: string;
        manual?: { yaoTypes: YaoType[] };
        number?: { upperNum: number; lowerNum: number; dongYao?: number };
      } = {
        method,
        year, month: m, day: d,
        hour: h, minute: mi,
        question: question.trim(),
      };

      if (method === "manual") {
        input.manual = { yaoTypes: manualYaos };
      } else if (method === "number") {
        input.number = { upperNum: numUpper, lowerNum: numLower, dongYao: numDong };
      }

      const r = calculateLiuyao(input);
      setResult(r);
      setShowForm(false);
      savePaipanState("liuyao",{input:{dateStr,hour,minute,method,question,manualYaos,numUpper,numLower,numDong},result:result,showForm:false,_ts:Date.now()});
      // 保存客户记录
      if(selectedClient){
        try{saveRecord({clientId:selectedClient.id,type:"liuyao",data:{...r,inputParams:input},note:"",status:"pending"});}catch(e){console.error("保存记录失败:",e);}
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "排盘失败");
    }
  }, [parsedDate, hour, minute, method, manualYaos, numUpper, numLower, numDong, question, selectedClient]);

  // 使用当前时间
  const handleUseNow = useCallback(() => {
    const n = new Date();
    setDateStr(`${n.getFullYear()}-${pad2(n.getMonth() + 1)}-${pad2(n.getDate())}`);
    setHour(n.getHours());
    setMinute(n.getMinutes());
  }, []);

  // 重置
  const handleReset = useCallback(() => {
    setResult(null);
    setError(null);
    setShowForm(true);
    clearPaipanState("liuyao");
  }, []);

  // v18.2: 监听编辑/返回事件，实现逐级返回
  useEffect(() => {
    const editHandler = () => setShowForm(true);
    const backHandler = () => { if (!showForm) { setShowForm(true); window.__yixueBackHandled = true; } };
    window.addEventListener("yixue-edit", editHandler);
    window.addEventListener("yixue-back", backHandler);
    return () => {
      window.removeEventListener("yixue-edit", editHandler);
      window.removeEventListener("yixue-back", backHandler);
    };
  }, [showForm]);

  // 更新手动爻值
  const setYaoValue = useCallback((index: number, value: YaoType) => {
    setManualYaos(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  // 时辰选项
  const hourOptions = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="min-h-screen flex justify-center" style={{ background: "#ededed" }}>
      <div className="w-full" style={{ maxWidth: "375px", minHeight: "100vh", background: "#fff" }}>
        {/* 紫色标题栏 */}

        {/* ======= 日期时间选择弹窗 ======= */}
        <DatePicker
          show={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={(dateVal) => {
            setDateStr(`${dateVal.year}-${pad2(dateVal.month)}-${pad2(dateVal.day)}`);
            setHour(dateVal.hour);
            setMinute(dateVal.minute);
            handleQigua({year: dateVal.year, month: dateVal.month, day: dateVal.day, hour: dateVal.hour, minute: dateVal.minute});
          }}
          initialDate={{year: parsedDate.year, month: parsedDate.month, day: parsedDate.day, hour, minute}}
          showMinute={true}
          showGender={false} showCalType={true} showToggles={false} showRegion={false} showName={false}
          submitText="起卦" title="六爻排盘"
        />

        {!showForm && !result && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
            <button onClick={() => setShowForm(true)} className="rounded-full bg-[#7B2FBE] text-white font-bold text-lg px-8 py-3 shadow-lg">开始排盘</button>
          </div>
        )}

        {/* ======= 排盘结果 ======= */}
        {result && (
          <div style={{ paddingBottom: "20px" }}>
            {/* 信息表格 */}
            <table style={{
              width: "100%", borderCollapse: "collapse", textAlign: "center",
              fontSize: "13px", tableLayout: "fixed",
            }}>
              <colgroup>
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
              </colgroup>
              <tbody>
                {/* 事项 */}
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px 4px", color: BRAND, fontWeight: "bold", fontSize: "12px" }}>事项</td>
                  <td colSpan={4} style={{ padding: "8px 4px", fontWeight: "bold", color: "#333" }}>
                    {result.question || "（未填写）"}
                  </td>
                </tr>
                {/* 时间 */}
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px 4px", color: BRAND, fontWeight: "bold", fontSize: "12px" }}>时间</td>
                  <td colSpan={4} style={{ padding: "8px 4px", fontSize: "12px" }}>
                    {result.dateStr}
                  </td>
                </tr>
                {/* 起卦方式 */}
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px 4px", color: BRAND, fontWeight: "bold", fontSize: "12px" }}>方式</td>
                  <td colSpan={4} style={{ padding: "8px 4px", fontSize: "12px" }}>
                    {method === "time" ? "时间起卦" : method === "manual" ? "手动起卦" : "数字起卦"}
                  </td>
                </tr>
                {/* 节气 */}
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px 4px", color: BRAND, fontWeight: "bold", fontSize: "12px" }}>节气</td>
                  <td colSpan={4} style={{ padding: "8px 4px", fontSize: "11px", color: "#666" }}>
                    {result.jieqi.from}～{result.jieqi.to}
                  </td>
                </tr>
                {/* 干支四柱 */}
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px 4px", color: BRAND, fontWeight: "bold", fontSize: "12px" }}>干支</td>
                  {result.siZhu.map((gz, i) => (
                    <td key={i} style={{ padding: "8px 2px", fontWeight: "bold", fontSize: "13px" }}>
                      <span style={{ color: getGanColor(gz[0]) }}>{gz[0]}</span>
                      <span style={{ color: getZhiColor(gz[1]) }}>{gz[1]}</span>
                      <div style={{ fontSize: "9px", color: "#999", fontWeight: "normal" }}>
                        {["年", "月", "日", "时"][i]}
                      </div>
                    </td>
                  ))}
                </tr>
                {/* 空亡 */}
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px 4px", color: BRAND, fontWeight: "bold", fontSize: "12px" }}>空亡</td>
                  <td colSpan={4} style={{ padding: "8px 4px", fontSize: "12px" }}>
                    <span style={{ color: "#D93025", fontWeight: "bold" }}>{result.kongWang}</span>
                    <span style={{ color: "#999", marginLeft: "8px", fontSize: "11px" }}>
                      驿马:{result.yiMa}　桃花:{result.taoHua}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 卦盘区域 */}
            <div style={{
              display: "flex", justifyContent: "center",
              padding: "16px 8px", gap: "0",
              background: "#fff",
            }}>
              {/* 六神列 */}
              <div style={{ width: "36px", textAlign: "center", flexShrink: 0 }}>
                <div style={{
                  fontSize: "11px", fontWeight: "bold", color: BRAND,
                  marginBottom: "4px", borderBottom: "1px solid #eee", paddingBottom: "4px",
                }}>
                  六神
                </div>
                <div style={{ height: "13px" }} />
                {/* 从初爻到上爻 */}
                {[0, 1, 2, 3, 4, 5].map(i => {
                  const shen = result.benGua.yaos[i].liuShen;
                  const shenColor: Record<string, string> = {
                    "青龙": "#2E8B57", "朱雀": "#D93025", "勾陈": "#8B5A2B",
                    "螣蛇": "#6A1B9A", "白虎": "#E65100", "玄武": "#1A237E",
                  };
                  return (
                    <div key={i} style={{
                      fontSize: "11px", lineHeight: "22px", minHeight: "22px",
                      color: shenColor[shen] || "#333", fontWeight: "bold",
                    }}>
                      {shen}
                    </div>
                  );
                })}
              </div>

              {/* 本卦列 */}
              <div style={{ flex: 1, textAlign: "center", maxWidth: "180px" }}>
                <div style={{
                  fontSize: "13px", fontWeight: "bold", color: BRAND,
                  marginBottom: "2px", borderBottom: "1px solid #eee", paddingBottom: "4px",
                }}>
                  本卦
                </div>
                <div style={{
                  fontSize: "13px", fontWeight: "bold", color: "#333",
                  marginBottom: "4px", cursor: "pointer",
                  padding: "2px 6px", borderRadius: "4px",
                  transition: "background 0.15s",
                }}
                onClick={() => handleGuaNameClick(result.benGua.name)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f5f0fa"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
                title="点击查看卦象解读"
                >
                  {result.benGua.name}
                  <span style={{ fontSize: "11px", color: "#888", fontWeight: "normal" }}>
                    （{result.benGua.gong}）
                  </span>
                  {result.benGua.alias && (
                    <span style={{
                      fontSize: "10px", color: "#fff", background: BRAND,
                      padding: "1px 4px", borderRadius: "3px", marginLeft: "4px",
                    }}>
                      {result.benGua.alias}
                    </span>
                  )}
                </div>
                {/* 爻从上到下显示（上爻在最上） */}
                {[5, 4, 3, 2, 1, 0].map(i => (
                  <YaoRow key={i} yao={result.benGua.yaos[i]} onClick={() => handleYaoClick(result.benGua.yaos[i])} />
                ))}
              </div>

              {/* 变卦列 */}
              {result.bianGua && (
                <div style={{ flex: 1, textAlign: "center", maxWidth: "180px", borderLeft: "1px dashed #ddd", paddingLeft: "4px" }}>
                  <div style={{
                    fontSize: "13px", fontWeight: "bold", color: BRAND,
                    marginBottom: "2px", borderBottom: "1px solid #eee", paddingBottom: "4px",
                  }}>
                    变卦
                  </div>
                  <div style={{
                    fontSize: "13px", fontWeight: "bold", color: "#333",
                    marginBottom: "4px",
                  }}>
                    {result.bianGua.name}
                    <span style={{ fontSize: "11px", color: "#888", fontWeight: "normal" }}>
                      （{result.bianGua.gong}）
                    </span>
                    {result.bianGua.alias && (
                      <span style={{
                        fontSize: "10px", color: "#fff", background: "#888",
                        padding: "1px 4px", borderRadius: "3px", marginLeft: "4px",
                      }}>
                        {result.bianGua.alias}
                      </span>
                    )}
                  </div>
                  {[5, 4, 3, 2, 1, 0].map(i => {
                    const benYao = result.benGua.yaos[i];
                    const bianYao = result.bianGua!.yaos[i];
                    return (
                      <YaoRow
                        key={i}
                        yao={{
                          ...bianYao,
                          isShi: false,
                          isYing: false,
                          isKong: false,
                          isYuePo: false,
                          isRiChong: false,
                        }}
                        isBianGua
                        isDongLine={benYao.isDong}
                        bianYang={bianYao.isYang}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* 用神提示 */}
            {result.yongShen && (
              <div style={{
                margin: "0 12px 10px", padding: "8px 12px",
                background: BG_COLOR, borderRadius: "8px",
                fontSize: "12px", color: "#555", textAlign: "center",
              }}>
                <span style={{ color: BRAND, fontWeight: "bold" }}>用神参考：</span>{result.yongShen}
              </div>
            )}

            {/* ======= 解读抽屉面板 ======= */}
            {interpretPanel && (
              <div style={{
                margin: "6px 8px",
                border: "1px solid " + BRAND,
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
                <div style={{ padding: "10px 12px", maxHeight: "360px", overflowY: "auto" }}>
                  {interpretPanel.items.map((item, idx) => {
                    const tc = INTERPRET_TYPE_COLORS[item.type] || INTERPRET_TYPE_COLORS["gua"];
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
                  点击卦名或爻位查看不同解读 · 引经据典，仅供参考
                </div>
              </div>
            )}

            {/* 五行颜色说明 */}
            <div style={{
              margin: "0 12px 10px", padding: "6px 10px",
              background: "#f9f9f9", borderRadius: "6px",
              fontSize: "10px", color: "#999", textAlign: "center", lineHeight: 1.6,
            }}>
              五行色：<span style={{ color: WUXING_COLOR["金"] }}>■金</span>　
              <span style={{ color: WUXING_COLOR["木"] }}>■木</span>　
              <span style={{ color: WUXING_COLOR["水"] }}>■水</span>　
              <span style={{ color: WUXING_COLOR["火"] }}>■火</span>　
              <span style={{ color: WUXING_COLOR["土"] }}>■土</span>
              　标记：<span style={{ color: "#D93025" }}>空</span>=旬空　
              <span style={{ color: "#D93025" }}>破</span>=月破　
              <span style={{ color: "#D93025" }}>冲</span>=日冲
            </div>

            {/* 重新起卦按钮 */}
            <div style={{ padding: "0 16px" }}>
              <button
                onClick={handleReset}
                style={{
                  width: "100%", padding: "12px 0",
                  background: "#fff", color: BRAND,
                  border: `2px solid ${BRAND}`, borderRadius: "10px",
                  fontSize: "15px", fontWeight: "bold", cursor: "pointer",
                }}
              >
                重新起卦
              </button>
            </div>

            {/* 免责声明 */}
            <div style={{
              marginTop: "16px", padding: "10px 16px",
              fontSize: "10px", color: "#bbb", textAlign: "center",
              lineHeight: 1.6, borderTop: "1px solid #f0f0f0",
            }}>
              免责声明：六爻占卜为传统文化内容，仅供娱乐和学术研究参考，不构成任何决策建议。
              请理性看待，切勿沉迷。
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
