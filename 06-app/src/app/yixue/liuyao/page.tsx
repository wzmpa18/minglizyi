"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { BrandHeader, DatePickerInline, QuickBtnGroup } from "@/components/shared";
import { calculateLiuyao } from "@/algorithm-core";
import type { LiuyaoResult, YaoType } from "@/algorithm-core/types/liuyao";
import ClientSelector from "@/components/ClientSelector";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";

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
    <div>
      {fushen}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "2px 4px", gap: "4px", minHeight: "22px",
      }}>
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

  // 日期时间
  const now = new Date();
  const [dateStr, setDateStr] = useState(
    `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`,
  );
  const [hour, setHour] = useState(now.getHours());
  const [minute, setMinute] = useState(now.getMinutes());

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

  // URL参数clientId + 回填检查
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) { const c = getClient(cid); if (c) setSelectedClient(c); }
    const prefill = getPrefillData("liuyao");
    if (prefill) { try { setResult(prefill); clearPrefillData("liuyao"); } catch(e){} }
  }, []);

  // 解析日期
  const parsedDate = useMemo(() => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return { year: y, month: m, day: d };
  }, [dateStr]);

  // 起卦
  const handleQigua = useCallback(() => {
    setError(null);
    try {
      const { year, month: m, day: d } = parsedDate;
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
        hour, minute,
        question: question.trim(),
      };

      if (method === "manual") {
        input.manual = { yaoTypes: manualYaos };
      } else if (method === "number") {
        input.number = { upperNum: numUpper, lowerNum: numLower, dongYao: numDong };
      }

      const r = calculateLiuyao(input);
      setResult(r);
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
  }, []);

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
        <BrandHeader title="言道六爻占卜" showBack />

        {/* ======= 未排盘时显示输入表单 ======= */}
        {!result && (
          <div style={{ padding: "12px 16px" }}>
            {/* 事项输入 */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "14px", fontWeight: "bold", color: BRAND, display: "block", marginBottom: "6px" }}>
                预测事项
              </label>
              <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="请输入您想预测的事项..."
                maxLength={50}
                style={{
                  width: "100%", padding: "10px 12px",
                  border: `1px solid ${BRAND_LIGHT}`, borderRadius: "8px",
                  fontSize: "14px", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* 日期时间 */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "14px", fontWeight: "bold", color: BRAND, display: "block", marginBottom: "6px" }}>
                起卦时间
              </label>
              <DatePickerInline
                year={parsedYear} month={parsedMonth} day={parsedDay} hour={hour}
                onYearChange={setParsedYear} onMonthChange={setParsedMonth}
                onDayChange={setParsedDay} onHourChange={setHour}
              />
              <div style={{ marginTop: "6px" }}>
                <QuickBtnGroup items={[
                  { label: "1990年", onClick: () => setParsedYear(1990) },
                  { label: "2000年", onClick: () => setParsedYear(2000) },
                  { label: "2020年", onClick: () => setParsedYear(2020) },
                  { label: "1月", onClick: () => setParsedMonth(1) },
                  { label: "6月", onClick: () => setParsedMonth(6) },
                  { label: "12月", onClick: () => setParsedMonth(12) },
                  { label: "1日", onClick: () => setParsedDay(1) },
                  { label: "15日", onClick: () => setParsedDay(15) },
                  { label: "0时", onClick: () => setHour(0) },
                  { label: "12时", onClick: () => setHour(12) },
                  { label: "此刻", onClick: handleUseNow },
                ]} />
              </div>
            </div>

            {/* 起卦方式 */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "14px", fontWeight: "bold", color: BRAND, display: "block", marginBottom: "6px" }}>
                起卦方式
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                {([
                  { v: "time", l: "时间起卦" },
                  { v: "manual", l: "手动起卦" },
                  { v: "number", l: "数字起卦" },
                ] as const).map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => setMethod(opt.v)}
                    style={{
                      flex: 1, padding: "8px 0",
                      border: `2px solid ${method === opt.v ? BRAND : "#ddd"}`,
                      borderRadius: "8px", background: method === opt.v ? BRAND : "#fff",
                      color: method === opt.v ? "#fff" : "#333",
                      fontSize: "13px", fontWeight: method === opt.v ? "bold" : "normal",
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {/* 手动起卦爻位选择 */}
            {method === "manual" && (
              <div style={{
                marginBottom: "14px", padding: "12px",
                background: BG_COLOR, borderRadius: "10px",
              }}>
                <div style={{ fontSize: "13px", color: "#666", marginBottom: "10px", textAlign: "center" }}>
                  请从初爻到上爻依次选择每爻的阴阳动静
                </div>
                {[5, 4, 3, 2, 1, 0].map(i => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    marginBottom: i > 0 ? "6px" : 0,
                  }}>
                    <span style={{
                      width: "42px", fontSize: "12px", color: "#666",
                      textAlign: "right", fontWeight: "bold",
                    }}>
                      {YAO_NAMES[i]}
                    </span>
                    <div style={{ display: "flex", gap: "4px", flex: 1 }}>
                      {YAO_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setYaoValue(i, opt.value)}
                          style={{
                            flex: 1, padding: "5px 0", fontSize: "11px",
                            border: `1.5px solid ${manualYaos[i] === opt.value ? BRAND : "#ccc"}`,
                            borderRadius: "6px",
                            background: manualYaos[i] === opt.value ? `${BRAND}22` : "#fff",
                            color: manualYaos[i] === opt.value ? BRAND : "#666",
                            fontWeight: manualYaos[i] === opt.value ? "bold" : "normal",
                            cursor: "pointer",
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: "11px", color: "#999", marginTop: "8px", textAlign: "center" }}>
                  ○老阳动变阴　×老阴动变阳　━少阳静　━ ━少阴静
                </div>
              </div>
            )}

            {/* 数字起卦 */}
            {method === "number" && (
              <div style={{
                marginBottom: "14px", padding: "12px",
                background: BG_COLOR, borderRadius: "10px",
              }}>
                <div style={{ fontSize: "13px", color: "#666", marginBottom: "10px", textAlign: "center" }}>
                  请输入三个数字（1-999），分别对应上卦、下卦、动爻
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[
                    { label: "上卦数", val: numUpper, set: setNumUpper },
                    { label: "下卦数", val: numLower, set: setNumLower },
                    { label: "动爻", val: numDong, set: setNumDong },
                  ].map(f => (
                    <div key={f.label} style={{ flex: 1 }}>
                      <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px", textAlign: "center" }}>{f.label}</div>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={f.val}
                        onChange={e => f.set(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
                        style={{
                          width: "100%", padding: "8px", textAlign: "center",
                          border: "1px solid #ddd", borderRadius: "6px",
                          fontSize: "16px", fontWeight: "bold", color: BRAND,
                          boxSizing: "border-box", outline: "none",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 时间起卦说明 */}
            {method === "time" && (
              <div style={{
                marginBottom: "14px", padding: "10px 12px",
                background: BG_COLOR, borderRadius: "8px",
                fontSize: "12px", color: "#888", lineHeight: 1.6,
              }}>
                梅花易数时间起卦：以年月日时之和取卦。年取地支序数（子1丑2...亥12），月日取农历数，时取时辰序数。
              </div>
            )}

            {/* 客户选择 */}
            <div style={{ marginBottom: "12px" }}>
              <ClientSelector selectedClient={selectedClient} onSelect={setSelectedClient} />
            </div>

            {/* 起卦按钮 */}
            <button
              onClick={handleQigua}
              style={{
                width: "100%", padding: "14px 0",
                background: `linear-gradient(135deg, ${BRAND}, ${BRAND_LIGHT})`,
                color: "#fff", border: "none", borderRadius: "12px",
                fontSize: "17px", fontWeight: "bold", cursor: "pointer",
                boxShadow: `0 4px 14px ${BRAND}44`,
                letterSpacing: "2px",
              }}
            >
              开 始 起 卦
            </button>

            {error && (
              <div style={{
                marginTop: "10px", padding: "10px",
                background: "#FFEBEE", color: "#C62828",
                borderRadius: "8px", fontSize: "13px", textAlign: "center",
              }}>
                {error}
              </div>
            )}
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
                  marginBottom: "4px",
                }}>
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
                  <YaoRow key={i} yao={result.benGua.yaos[i]} />
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
