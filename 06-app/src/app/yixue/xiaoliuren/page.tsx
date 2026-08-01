"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  calculateXiaoLiuRen,
  PALM_POSITIONS,
  hourToShichen,
  isJi,
  getJiXiongColor,
  solarToBazi,
  getCurrentJieQi,
  calcKongwang,
  SHICHEN_NAMES,
  GAN_WUXING,
  ZHI_WUXING,
} from "@/algorithm-core";
import type { TianGan, DiZhi, PalmPosition } from "@/algorithm-core";
import ClientSelector from "@/components/ClientSelector";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";

// ============================================================================
// 五行颜色 (与 jishiyu 完全一致)
// ============================================================================
const WX_COLORS: Record<string, string> = {
  "金": "#ffa500", "木": "#00a879", "水": "#0074e4", "火": "#9B5ECF", "土": "#a64b00",
};

// ============================================================================
// 六宫格渲染顺序 (严格对标 jishiyu x6ren_tpl.html: 2x3 网格)
// 第一行: 留连, 速喜, 赤口
// 第二行: 大安, 空亡, 小吉
// ============================================================================
const GRID_CELL_ORDER = ["留连", "速喜", "赤口", "大安", "空亡", "小吉"] as const;

// ============================================================================
// 掌诀宫格组件 (严格对标 jishiyu x6ren-6gong-grid-cell CSS)
// 7 元素 grid 布局:
//   row1: 吉凶(神) | 方位(星, text-align:right)
//   row2: 五行(地支, 五行颜色) | 数(六亲, text-align:right)
//   row3: 宫名(theme-color border) | 标记(#999, text-align:right)
//   row4: 五行色条(span 2, text-align:center, color:white)
// ============================================================================
function PalmCell({
  pos,
  isActive,
  stepNumber,
}: {
  pos: PalmPosition;
  isActive: boolean;
  stepNumber: number | null;
}) {
  const ji = isJi(pos.jiXiong);
  const wxColor = WX_COLORS[pos.wuxing] ?? "#999";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "50% 50%",
        gridTemplateRows: "30.66% 30.66% 30.66% 8%",
        border: "1px solid black",
        marginLeft: "-1px",
        marginTop: "-1px",
        backgroundColor: isActive ? "#fef0f0" : "#fff",
        transition: "background-color 0.2s",
        textAlign: "left",
        fontSize: "12px",
      }}
    >
      {/* 1. 吉凶 (神位, row1 col1) */}
      <div style={{ padding: "3px", fontWeight: "bold", color: ji ? "#16a34a" : "#dc2626" }}>
        {pos.jiXiong}
      </div>

      {/* 2. 方位 (星位, row1 col2, text-align:right) */}
      <div style={{ padding: "3px", textAlign: "right" }}>
        {pos.direction}
      </div>

      {/* 3. 五行 (地支+五行位, row2 col1, 五行颜色) */}
      <div style={{ padding: "3px", color: wxColor }}>
        {pos.wuxing}
      </div>

      {/* 4. 数 (六亲位, row2 col2, text-align:right) */}
      <div style={{ padding: "3px", textAlign: "right" }}>
        {pos.number}
      </div>

      {/* 5. 宫名 (x6ren-6gong-grid-cell-name, row3 col1) */}
      <div style={{ padding: "3px" }}>
        <span
          style={{
            border: "1px solid #7B2FBE",
            borderRadius: "5px",
            borderStyle: "solid",
            fontWeight: "bold",
            color: "#7B2FBE",
            padding: "1px 3px",
          }}
        >
          {pos.name}
        </span>
      </div>

      {/* 6. 标记 (x6ren-6gong-grid-cell-marks, row3 col2, text-align:right, color:#999) */}
      <div style={{ padding: "3px", textAlign: "right", color: "#999" }}>
        {isActive && stepNumber !== null ? (
          <span
            style={{
              display: "inline-block",
              width: "16px",
              height: "16px",
              lineHeight: "16px",
              borderRadius: "50%",
              backgroundColor: "#7B2FBE",
              color: "#fff",
              fontSize: "11px",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            {stepNumber}
          </span>
        ) : (
          " "
        )}
      </div>

      {/* 7. 五行色条 (x6ren-6gong-grid-cell-wuxing, row4 span2) */}
      <div
        style={{
          gridColumn: "span 2",
          textAlign: "center",
          color: "#fff",
          padding: "0px",
          backgroundColor: wxColor,
          lineHeight: "16px",
          fontSize: "10px",
        }}
      >
        {pos.wuxing}
      </div>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================
export default function XiaoliurenPage() {
  // ---- 输入状态 ----
  const [showPopup, setShowPopup] = useState(true);
  const [desc, setDesc] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [divMethod, setDivMethod] = useState<"time" | "number">("time");

  // ---- 结果状态 ----
  const [showResult, setShowResult] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);
  const [recordSaved, setRecordSaved] = useState(false);

  // URL参数clientId + 回填检查
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) { const c = getClient(cid); if (c) setSelectedClient(c); }
    const prefill = getPrefillData("xiaoliuren");
    if (prefill) { try { setShowResult(true); setShowPopup(false); clearPrefillData("xiaoliuren"); } catch(e){} }
  }, []);

  // ---- 派生数据 ----
  const bazi = useMemo(() => {
    try {
      return solarToBazi({
        year: selectedDate.getFullYear(),
        month: selectedDate.getMonth() + 1,
        day: selectedDate.getDate(),
        hour: selectedDate.getHours(),
        gender: "male" as const,
      });
    } catch {
      return null;
    }
  }, [selectedDate]);

  const jieqi = useMemo(() => getCurrentJieQi(selectedDate), [selectedDate]);

  const dateStr = useMemo(() => {
    const y = selectedDate.getFullYear();
    const mo = selectedDate.getMonth() + 1;
    const d = selectedDate.getDate();
    const h = String(selectedDate.getHours()).padStart(2, "0");
    const mi = String(selectedDate.getMinutes()).padStart(2, "0");
    return `${y}年${mo}月${d}日 ${h}:${mi}`;
  }, [selectedDate]);

  const kongwangData = useMemo(() => {
    if (!bazi) return { year: "", month: "", day: "", hour: "" };
    const pillars = bazi.pillars;
    const getKw = (p: { gan: string; zhi: string }) => {
      try {
        return calcKongwang(p.gan as TianGan, p.zhi as DiZhi) || "";
      } catch {
        return "";
      }
    };
    return {
      year: getKw(pillars[0]),
      month: getKw(pillars[1]),
      day: getKw(pillars[2]),
      hour: getKw(pillars[3]),
    };
  }, [bazi]);

  // ---- 小六壬结果 ----
  const result = useMemo(() => {
    if (!showResult) return null;
    const shichen = hourToShichen(selectedDate.getHours());
    return calculateXiaoLiuRen({
      month: selectedDate.getMonth() + 1,
      day: selectedDate.getDate(),
      shichen,
    });
  }, [showResult, selectedDate]);

  // 保存客户记录（result计算后）
  useEffect(() => {
    if (showResult && result && selectedClient && !recordSaved) {
      try {
        saveRecord({
          clientId: selectedClient.id,
          type: "xiaoliuren",
          data: { ...result, inputParams: { date: dateStr, method: divMethod, desc } },
          note: "",
          status: "pending"
        });
        setRecordSaved(true);
      } catch(e) { console.error("保存记录失败:", e); }
    }
  }, [showResult, result, selectedClient, recordSaved, dateStr, divMethod, desc]);

  const shichenName = useMemo(() => {
    const idx = hourToShichen(selectedDate.getHours());
    return SHICHEN_NAMES[idx];
  }, [selectedDate]);

  const methodLabel = divMethod === "time" ? "时间起课" : "报数起课";

  // ---- 排盘 ----
  const handleDivination = useCallback(() => {
    setRecordSaved(false);
    setShowResult(true);
    setShowPopup(false);
  }, []);

  // ---- 返回弹窗 ----
  const handleBackToPopup = useCallback(() => {
    setShowPopup(true);
    setShowResult(false);
  }, []);

  // ---- datetime-local ----
  const dateInputValue = useMemo(() => {
    const y = selectedDate.getFullYear();
    const mo = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    const h = String(selectedDate.getHours()).padStart(2, "0");
    const mi = String(selectedDate.getMinutes()).padStart(2, "0");
    return `${y}-${mo}-${d}T${h}:${mi}`;
  }, [selectedDate]);

  // ---- 获取步骤对应的落位序号 ----
  const getStepPosition = (posName: string): number | null => {
    if (!result) return null;
    const steps = result.steps;
    // 最终落位
    if (result.finalPosition.name === posName) return 3;
    // 月上起日
    if (steps.length > 0 && steps[0].result === posName) return 1;
    // 日上起时
    if (steps.length > 1 && steps[1].result === posName) return 2;
    return null;
  };

  return (
    <div className="min-h-screen flex justify-center bg-[#ededed]">
      <div className="w-full" style={{maxWidth:"375px", paddingBottom:"10px"}}>
      {/* ====== 弹窗输入 (对标 jishiyu popup) ====== */}
      {showPopup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "12vh",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              width: "92%",
              maxWidth: "420px",
              overflow: "hidden",
            }}
          >
            {/* 弹窗标题 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 16px",
                position: "relative",
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <span style={{ fontSize: "16px", fontWeight: "bold", color: "#333" }}>小六壬</span>
              <button
                onClick={() => setShowPopup(false)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "10px",
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  color: "#999",
                  cursor: "pointer",
                  padding: "2px 6px",
                }}
              >
                ✕
              </button>
            </div>

            {/* 弹窗内容 */}
            <div style={{ padding: "16px" }}>
              {/* 起课方式 */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}>起课方式</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[
                    { value: "time" as const, label: "时间起课" },
                    { value: "number" as const, label: "报数起课" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDivMethod(opt.value)}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        borderRadius: "6px",
                        border: divMethod === opt.value ? "2px solid #7B2FBE" : "1px solid #d2d2d2",
                        backgroundColor: divMethod === opt.value ? "#fef0f0" : "#fff",
                        color: divMethod === opt.value ? "#7B2FBE" : "#666",
                        fontSize: "13px",
                        fontWeight: divMethod === opt.value ? "bold" : "normal",
                        cursor: "pointer",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 时间选择 */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}>当前时间</div>
                <input
                  type="datetime-local"
                  value={dateInputValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) setSelectedDate(new Date(v));
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #d2d2d2",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* 起课说明 */}
              <div
                style={{
                  fontSize: "12px",
                  color: "#999",
                  textAlign: "center",
                  marginBottom: "16px",
                  lineHeight: "1.6",
                }}
              >
                {divMethod === "time"
                  ? "以当前时间起课，月上起日，日上起时，时上定掌诀"
                  : "输入三个数字，分别对应月、日、时"}
              </div>

              {/* 客户选择 */}
              <div style={{ marginBottom: "12px" }}>
                <ClientSelector selectedClient={selectedClient} onSelect={setSelectedClient} />
              </div>

              {/* 按钮组 */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleDivination}
                  style={{
                    flex: 1,
                    padding: "12px 0",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#7B2FBE",
                    color: "#fff",
                    fontSize: "16px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  开始排盘
                </button>
                <button
                  onClick={() => setShowPopup(false)}
                  style={{
                    padding: "12px 24px",
                    borderRadius: "8px",
                    border: "1px solid #7B2FBE",
                    backgroundColor: "#fff",
                    color: "#7B2FBE",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  排盘记录
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== 结果页：严格对标 jishiyu view_x6ren.html 表格结构 ====== */}
      {showResult && result && (
        <div style={{ padding: "0 0 50px 0" }}>
          {/* 返回按钮 */}
          <div style={{ padding: "8px 12px" }}>
            <button
              onClick={handleBackToPopup}
              style={{
                fontSize: "12px",
                color: "#7B2FBE",
                border: "1px solid #7B2FBE",
                borderRadius: "4px",
                padding: "4px 12px",
                backgroundColor: "#fff",
                cursor: "pointer",
              }}
            >
              返回修改时间
            </button>
          </div>

          {/* 主表格 (严格对标 jishiyu layui-table 风格) */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "center",
              backgroundColor: "#fff",
              border: "1px solid lightgray",
            }}
          >
            <colgroup>
              <col width="20%" />
              <col width="20%" />
              <col width="20%" />
              <col width="20%" />
              <col width="20%" />
            </colgroup>
            <tbody>
              {/* 事项 */}
              <tr style={{ borderBottom: "1px solid #e6e6e6" }}>
                <td
                  style={{
                    color: "#2e4487",
                    fontWeight: "600",
                    fontSize: "13px",
                    padding: "3px 1px",
                    backgroundColor: "#fafafa",
                  }}
                >
                  事项
                </td>
                <td colSpan={4} style={{ padding: "3px 1px", fontSize: "13px" }}>
                  <input
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="输入预测事项"
                    maxLength={30}
                    style={{
                      fontSize: "16px",
                      color: "#7B2FBE",
                      textAlign: "center",
                      width: "100%",
                      border: "none",
                      outline: "none",
                      backgroundColor: "transparent",
                    }}
                  />
                </td>
              </tr>

              {/* 起局 */}
              <tr style={{ borderBottom: "1px solid #e6e6e6" }}>
                <td
                  style={{
                    color: "#2e4487",
                    fontWeight: "600",
                    fontSize: "13px",
                    padding: "3px 1px",
                    backgroundColor: "#fafafa",
                  }}
                >
                  起局
                </td>
                <td colSpan={4} style={{ padding: "3px 1px", fontSize: "13px" }}>
                  {methodLabel}
                </td>
              </tr>

              {/* 日期 */}
              <tr style={{ borderBottom: "1px solid #e6e6e6" }}>
                <td
                  style={{
                    color: "#2e4487",
                    fontWeight: "600",
                    fontSize: "13px",
                    padding: "3px 1px",
                    backgroundColor: "#fafafa",
                  }}
                >
                  日期
                </td>
                <td colSpan={4} style={{ padding: "3px 1px", fontSize: "13px" }}>
                  {dateStr}
                </td>
              </tr>

              {/* 节气 */}
              <tr style={{ borderBottom: "1px solid #e6e6e6" }}>
                <td
                  style={{
                    color: "#2e4487",
                    fontWeight: "600",
                    fontSize: "13px",
                    padding: "3px 1px",
                    backgroundColor: "#fafafa",
                  }}
                >
                  节气
                </td>
                <td colSpan={4} style={{ padding: "3px 1px", fontSize: "13px" }}>
                  {jieqi?.name ?? ""}
                </td>
              </tr>

              {/* 四柱表头 (对标 jishiyu: class="qimen-table-header" 行) */}
              <tr style={{ backgroundColor: "#fafafa" }}>
                <td style={{ padding: "3px 1px", fontSize: "13px" }}></td>
                <td style={{ color: "#2e4487", fontWeight: "600", fontSize: "13px", padding: "3px 1px" }}>年柱</td>
                <td style={{ color: "#2e4487", fontWeight: "600", fontSize: "13px", padding: "3px 1px" }}>月柱</td>
                <td style={{ color: "#2e4487", fontWeight: "600", fontSize: "13px", padding: "3px 1px" }}>日柱</td>
                <td style={{ color: "#2e4487", fontWeight: "600", fontSize: "13px", padding: "3px 1px" }}>时柱</td>
              </tr>

              {/* 四柱 */}
              <tr style={{ borderBottom: "1px solid #e6e6e6" }}>
                <td
                  style={{
                    color: "#2e4487",
                    fontWeight: "600",
                    fontSize: "13px",
                    padding: "3px 1px",
                    backgroundColor: "#fafafa",
                  }}
                >
                  四柱
                </td>
                {bazi?.pillars?.slice(0, 4).map((p, i) => (
                  <td
                    key={i}
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      textAlign: "center",
                      padding: "3px 1px",
                      cursor: "pointer",
                    }}
                  >
                    <div>{p.gan}</div>
                    <div>{p.zhi}</div>
                  </td>
                )) ?? (
                  <>
                    <td style={{ padding: "3px 1px", fontSize: "13px" }}>-</td>
                    <td style={{ padding: "3px 1px", fontSize: "13px" }}>-</td>
                    <td style={{ padding: "3px 1px", fontSize: "13px" }}>-</td>
                    <td style={{ padding: "3px 1px", fontSize: "13px" }}>-</td>
                  </>
                )}
              </tr>

              {/* 空亡 */}
              <tr style={{ borderBottom: "1px solid #e6e6e6" }}>
                <td
                  style={{
                    color: "#2e4487",
                    fontWeight: "600",
                    fontSize: "13px",
                    padding: "3px 1px",
                    backgroundColor: "#fafafa",
                  }}
                >
                  空亡
                </td>
                <td style={{ padding: "3px 1px", fontSize: "13px" }}>{kongwangData.year || "-"}</td>
                <td style={{ padding: "3px 1px", fontSize: "13px" }}>{kongwangData.month || "-"}</td>
                <td style={{ padding: "3px 1px", fontSize: "13px" }}>{kongwangData.day || "-"}</td>
                <td style={{ padding: "3px 1px", fontSize: "13px" }}>{kongwangData.hour || "-"}</td>
              </tr>

              {/* 六宫格 (严格对标 jishiyu x6ren-6gong-grid: 2x3, 300px x 200px) */}
              <tr style={{ height: "260px" }}>
                <td colSpan={5} style={{ padding: "30px", verticalAlign: "middle" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateRows: "100px 100px",
                      gridTemplateColumns: "100px 100px 100px",
                      width: "300px",
                      height: "200px",
                      margin: "auto",
                      boxSizing: "border-box",
                      backgroundColor: "#FFFFFF",
                      textAlign: "left",
                    }}
                  >
                    {GRID_CELL_ORDER.map((name) => {
                      const pos = PALM_POSITIONS.find((p) => p.name === name)!;
                      const stepNum = getStepPosition(pos.name);
                      const isActive = result.finalPosition.name === pos.name;
                      return (
                        <PalmCell
                          key={pos.name}
                          pos={pos}
                          isActive={isActive}
                          stepNumber={stepNum}
                        />
                      );
                    })}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 推算步骤 */}
          {result.steps.length > 0 && (
            <div
              style={{
                margin: "10px 8px",
                backgroundColor: "#fff",
                padding: "12px",
                border: "1px solid #e6e6e6",
              }}
            >
              <div style={{ fontSize: "15px", fontWeight: "600", color: "#2e4487", marginBottom: "8px" }}>
                推算步骤
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {result.steps.map((step, idx) => {
                  const stepNames = ["月上起日", "日上起时", "时上定掌诀"];
                  return (
                    <div key={idx} style={{ fontSize: "13px", color: "#555", lineHeight: "1.6" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          backgroundColor: "#2e4487",
                          color: "#fff",
                          fontSize: "11px",
                          fontWeight: "bold",
                          marginRight: "6px",
                          verticalAlign: "middle",
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span style={{ fontWeight: "600", color: "#2e4487" }}>
                        {stepNames[idx] ?? step.label}
                      </span>
                      <span>: </span>
                      从
                      <span style={{ fontWeight: "600", color: "#7B2FBE", margin: "0 2px" }}>
                        {step.startFrom}
                      </span>
                      起，顺数
                      <span style={{ fontWeight: "600", margin: "0 2px" }}>{step.count}</span>
                      位，落
                      <span style={{ fontWeight: "600", color: "#7B2FBE", margin: "0 2px" }}>
                        {step.result}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 最终结果卡片 */}
          {result && (
            <div
              style={{
                margin: "10px 8px",
                backgroundColor: "#fff",
                padding: "16px",
                border: "1px solid #e6e6e6",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>最终掌诀</div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: isJi(result.finalPosition.jiXiong) ? "#16a34a" : "#dc2626",
                  marginBottom: "4px",
                }}
              >
                {result.finalPosition.name} · {result.finalPosition.jiXiong}
              </div>
              <div style={{ fontSize: "13px", color: "#888", lineHeight: "1.5" }}>
                {result.finalPosition.description}
              </div>
            </div>
          )}

          {/* 重新排盘 */}
          <div style={{ padding: "8px" }}>
            <button
              onClick={handleBackToPopup}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: "8px",
                border: "1px solid #7B2FBE",
                backgroundColor: "#fff",
                color: "#7B2FBE",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              重新排盘
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}