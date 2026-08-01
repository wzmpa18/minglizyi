"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  meihuaTimeDivination,
  getHuGua,
  getBianGua,
  analyzeTiYong,
  getTrigramInfo,
  TRIGRAM_SYMBOLS,
  HEXAGRAM_GUACI,
  HEXAGRAM_NAMES,
  solarToBazi,
  getCurrentJieQi,
  GAN_WUXING,
  ZHI_WUXING,
} from "@/algorithm-core";
import type { TrigramName, TianGan, DiZhi } from "@/algorithm-core";
import { DatePicker } from "@/components/shared";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";

// ============================================================================
// 五行颜色 (与 jishiyu 完全一致)
// ============================================================================
const WX_COLORS: Record<string, string> = {
  "金": "#ffa500", "木": "#00a879", "水": "#0074e4", "火": "#9B5ECF", "土": "#a64b00",
};

// ============================================================================
// 八卦五行映射 (与 jishiyu paipan.css 完全一致)
// ============================================================================
const TRIGRAM_WUXING: Record<string, string> = {
  "乾": "金", "兑": "金",
  "震": "木", "巽": "木",
  "坎": "水",
  "离": "火",
  "艮": "土", "坤": "土",
};

// ============================================================================
// 三卦类型
// ============================================================================
type ActiveGua = "ben" | "hu" | "bian";

// ============================================================================
// 体用标记组件 (严格对标 jishiyu meihua-guagap + meihua-tiyong)
// ============================================================================
function TiyongGuagap({ changeYao }: { changeYao: number }) {
  // 动爻 > 3 则上卦为体、下卦为用；否则上卦为用、下卦为体
  // jishiyu renderTiyong: 用 column-reverse，所以 DOM 顺序与视觉相反
  // DOM: [体, 用] → visual: [用, 体] (deltaYao > 3)
  // DOM: [用, 体] → visual: [体, 用] (deltaYao <= 3)
  const tiFirst = changeYao > 3; // 体在 DOM 第一位

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column-reverse",
        alignItems: "center",
        width: "10px",
        margin: "10px 0px 10px 0px",
      }}
    >
      <div
        style={{
          color: "#000",
          fontSize: "12px",
          height: "32px",
          width: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {tiFirst ? "体" : "用"}
      </div>
      <div
        style={{
          color: "#000",
          fontSize: "12px",
          height: "32px",
          width: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {tiFirst ? "用" : "体"}
      </div>
    </div>
  );
}

// ============================================================================
// 动爻空爻标记组件 (严格对标 jishiyu renderYao: 只渲染 deltaYao 个位置)
// renderYao(deltaYao): DOM [0,1,...,deltaYao-1] 最后一个为 dongyao
// → column-reverse 视觉: [dongyao, ..., 1, 0]
// ============================================================================
function DongyaoGuagap({ changeYao }: { changeYao: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column-reverse",
        alignItems: "center",
        width: "10px",
        margin: "10px 0px 10px 0px",
      }}
    >
      {Array.from({ length: changeYao }, (_, i) => (
        <div
          key={i}
          style={{
            border: i === changeYao - 1 ? "2px solid red" : "2px solid transparent",
            borderRadius: "50%",
            height: "8px",
            width: "8px",
            margin: "2px 0",
            boxSizing: "border-box",
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// 卦象渲染组件 (严格对标 jishiyu meihua-hexagram 样式)
// ============================================================================
function HexagramDisplay({
  upper,
  lower,
  hexName,
  guaType,
  changeYao,
  isActive,
  onClick,
}: {
  upper: TrigramName;
  lower: TrigramName;
  hexName: string;
  guaType: string;
  changeYao: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const upperInfo = getTrigramInfo(upper);
  const lowerInfo = getTrigramInfo(lower);

  const upperColor = WX_COLORS[TRIGRAM_WUXING[upper] ?? ""] ?? "#333";
  const lowerColor = WX_COLORS[TRIGRAM_WUXING[lower] ?? ""] ?? "#333";

  // 从下往上构建爻线：先下卦三爻，再上卦三爻
  // lowerInfo.lines[n] 中 n=0 是初爻（最下），n=2 是三爻（下卦最上）
  const lowerLines = lowerInfo.lines.split("").map((ch, i) => ({
    isYang: ch === "1",
    pos: i + 1, // 1, 2, 3 (初爻→三爻)
  }));
  const upperLines = upperInfo.lines.split("").map((ch, i) => ({
    isYang: ch === "1",
    pos: i + 4, // 4, 5, 6 (四爻→上爻)
  }));

  // DOM 顺序: 初爻→上爻 (从下到上)
  // meihua-hexagram 使用 column-reverse，视觉上从上到下显示
  const allLines = [...lowerLines, ...upperLines];

  // meihua-hexagram 整体使用 column-reverse
  // DOM 顺序: [guatype, 6条爻线, guaname]
  // 视觉顺序: [guaname, 6条爻线, guatype] → 卦名在上，卦象在中，类型在下
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column-reverse",
        alignItems: "center",
        margin: "10px 0px 10px 10px",
        cursor: "pointer",
        opacity: isActive ? 1 : 0.5,
        transition: "opacity 0.2s",
      }}
    >
      {/* guatype: DOM 第一位 → 视觉最后一位 (卦象下方) */}
      <div
        style={{
          fontSize: "12px",
          color: "black",
          fontWeight: "bold",
        }}
      >
        {guaType}
      </div>

      {/* 6 条爻线: DOM 第二位 → 视觉中间位 */}
      {allLines.map((line, i) => {
        const isUpper = line.pos >= 4;
        const color = isUpper ? upperColor : lowerColor;
        return (
          <div
            key={i}
            className="meihua-line"
            style={{
              width: "40px",
              height: "8px",
              margin: "2px 0",
              display: line.isYang ? "block" : "flex",
              justifyContent: line.isYang ? undefined : "space-between",
              backgroundColor: line.isYang ? color : "transparent",
            }}
          >
            {!line.isYang && (
              <>
                <div
                  style={{
                    width: "15px",
                    height: "8px",
                    backgroundColor: color,
                  }}
                />
                <div
                  style={{
                    width: "10px",
                    height: "8px",
                    backgroundColor: "white",
                  }}
                />
                <div
                  style={{
                    width: "15px",
                    height: "8px",
                    backgroundColor: color,
                  }}
                />
              </>
            )}
          </div>
        );
      })}

      {/* guaname: DOM 最后一位 → 视觉第一位 (卦象上方) */}
      <div
        style={{
          fontSize: "12px",
          color: "black",
        }}
      >
        {hexName}
      </div>
    </div>
  );
}

// ============================================================================
// 梅花易数构建函数
// ============================================================================
function buildMeihuaResult(year: number, month: number, day: number, hour: number) {
  const divResult = meihuaTimeDivination(year, month, day, hour);
  const { upperTrigram, lowerTrigram, changeYao, hexNum } = divResult;

  const huData = getHuGua(upperTrigram, lowerTrigram);
  const bianData = getBianGua(upperTrigram, lowerTrigram, changeYao);
  const tiYong = analyzeTiYong(upperTrigram, lowerTrigram, changeYao);

  return {
    benGua: {
      num: hexNum,
      name: HEXAGRAM_NAMES[hexNum] ?? "未知卦",
      upper: upperTrigram,
      lower: lowerTrigram,
      guaCi: HEXAGRAM_GUACI[hexNum] ?? "暂无卦辞记录。",
    },
    huGua: {
      num: huData.num,
      name: huData.name,
      upper: huData.upper,
      lower: huData.lower,
      guaCi: HEXAGRAM_GUACI[huData.num] ?? "暂无卦辞记录。",
    },
    bianGua: {
      num: bianData.num,
      name: bianData.name,
      upper: bianData.upper,
      lower: bianData.lower,
      guaCi: HEXAGRAM_GUACI[bianData.num] ?? "暂无卦辞记录。",
    },
    changeYao,
    tiYong,
  };
}

// ============================================================================
// 主组件
// ============================================================================
export default function MeihuaPage() {
  // ---- 输入状态 ----
  const [showPopup, setShowPopup] = useState(true);
  const [desc, setDesc] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [divMethod, setDivMethod] = useState<"time" | "number" | "manual">("time");
  const [manualNumbers, setManualNumbers] = useState<string[]>(["", "", ""]);

  // ---- 结果状态 ----
  const [result, setResult] = useState<ReturnType<typeof buildMeihuaResult> | null>(null);
  const [activeGua, setActiveGua] = useState<ActiveGua>("ben");
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);

  // URL参数clientId + 回填检查
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) { const c = getClient(cid); if (c) setSelectedClient(c); }
    const prefill = getPrefillData("meihua");
    if (prefill) { try { setResult(prefill); setShowPopup(false); clearPrefillData("meihua"); } catch(e){} }
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

  const methodLabel = divMethod === "time" ? "时间起卦" : divMethod === "number" ? "数字起卦" : "手动起卦";

  // ---- 排盘 ----
  const handleDivination = useCallback((override?: {year: number; month: number; day: number; hour: number}) => {
    const y = override?.year ?? selectedDate.getFullYear();
    const mo = override?.month ?? selectedDate.getMonth() + 1;
    const d = override?.day ?? selectedDate.getDate();
    const h = override?.hour ?? selectedDate.getHours();
    const r = buildMeihuaResult(y, mo, d, h);
    setResult(r);
    setActiveGua("ben");
    setShowPopup(false);
    // 保存客户记录
    if(selectedClient){
      try{saveRecord({clientId:selectedClient.id,type:"meihua",data:{...r,inputParams:{year:y,month:mo,day:d,hour:h,method:divMethod}},note:"",status:"pending"});}catch(e){console.error("保存记录失败:",e);}
    }
  }, [selectedDate, selectedClient, divMethod]);

  // ---- 返回弹窗 ----
  const handleBackToPopup = useCallback(() => {
    setShowPopup(true);
    setResult(null);
  }, []);

  // ---- 详情文本 ----
  const detailText = useMemo(() => {
    if (!result) return "";

    const { benGua, huGua, bianGua, changeYao, tiYong } = result;
    const activeHexagram = activeGua === "ben" ? benGua : activeGua === "hu" ? huGua : bianGua;

    const lines: string[] = [
      "卦名：" + activeHexagram.name,
      "卦序：第" + activeHexagram.num + "卦",
      "",
      "卦辞：",
      activeHexagram.guaCi,
      "",
      "上卦：" + activeHexagram.upper + "（" + TRIGRAM_SYMBOLS[activeHexagram.upper] + "）",
      "下卦：" + activeHexagram.lower + "（" + TRIGRAM_SYMBOLS[activeHexagram.lower] + "）",
    ];

    if (activeGua === "ben") {
      lines.push("", "动爻：第" + changeYao + "爻动");
    }

    lines.push(
      "",
      "【体用分析】",
      "体卦：" + tiYong.tiGua + "（" + tiYong.tiWuxing + "）",
      "用卦：" + tiYong.yongGua + "（" + tiYong.yongWuxing + "）",
      "关系：" + tiYong.relation,
      "断语：" + tiYong.description,
    );

    return lines.join("\n");
  }, [result, activeGua]);

  // ---- datetime-local ----
  const dateInputValue = useMemo(() => {
    const y = selectedDate.getFullYear();
    const mo = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    const h = String(selectedDate.getHours()).padStart(2, "0");
    const mi = String(selectedDate.getMinutes()).padStart(2, "0");
    return `${y}-${mo}-${d}T${h}:${mi}`;
  }, [selectedDate]);

  return (
    <div className="min-h-screen flex justify-center bg-[#ededed]">
      <div className="w-full" style={{maxWidth:"375px", paddingBottom:"10px"}}>

      {/* ====== 日期时间选择弹窗 ====== */}
      <DatePicker
        show={showPopup}
        onClose={() => { if (result) setShowPopup(false); }}
        onSubmit={(dateVal) => {
          setSelectedDate(new Date(dateVal.year, dateVal.month - 1, dateVal.day, dateVal.hour, dateVal.minute));
          handleDivination({year: dateVal.year, month: dateVal.month, day: dateVal.day, hour: dateVal.hour});
        }}
        initialDate={{year: selectedDate.getFullYear(), month: selectedDate.getMonth() + 1, day: selectedDate.getDate(), hour: selectedDate.getHours(), minute: selectedDate.getMinutes()}}
        showMinute={true}
        showGender={false} showCalType={false} showToggles={false} showRegion={false} showName={false}
        submitText="起卦" title="梅花易数"
      />

      {/* ====== 结果页：严格对标 jishiyu view_meihuayishu.html 表格结构 ====== */}
      {!showPopup && result && (
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

          {/* 主表格: 对标 layui-table lay-even lay-size=sm lay-skin=nob */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "center",
              backgroundColor: "#fff",
              fontSize: "14px",
              margin: "0px",
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
                    padding: "8px 6px",
                    backgroundColor: "#fafafa",
                  }}
                >
                  事项
                </td>
                <td colSpan={4} style={{ padding: "6px" }}>
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

              {/* 时间 */}
              <tr style={{ borderBottom: "1px solid #e6e6e6" }}>
                <td
                  style={{
                    color: "#2e4487",
                    fontWeight: "600",
                    fontSize: "13px",
                    padding: "8px 6px",
                    backgroundColor: "#fafafa",
                  }}
                >
                  时间
                </td>
                <td colSpan={4} style={{ padding: "8px 6px", fontSize: "13px" }}>
                  {dateStr}
                </td>
              </tr>

              {/* 起卦方式 */}
              <tr style={{ borderBottom: "1px solid #e6e6e6" }}>
                <td
                  style={{
                    color: "#2e4487",
                    fontWeight: "600",
                    fontSize: "13px",
                    padding: "8px 6px",
                    backgroundColor: "#fafafa",
                  }}
                >
                  起卦方式
                </td>
                <td colSpan={4} style={{ padding: "8px 6px", fontSize: "13px" }}>
                  {methodLabel}
                </td>
              </tr>

              {/* 节气 */}
              <tr style={{ borderBottom: "1px solid #e6e6e6" }}>
                <td
                  style={{
                    color: "#2e4487",
                    fontWeight: "600",
                    fontSize: "13px",
                    padding: "8px 6px",
                    backgroundColor: "#fafafa",
                  }}
                >
                  节气
                </td>
                <td colSpan={4} style={{ padding: "8px 6px", fontSize: "13px" }}>
                  {jieqi?.name ?? ""}
                </td>
              </tr>

              {/* 四柱 (对标 jishiyu qimen-4zhu: 天干<br/>地支) */}
              <tr style={{ borderBottom: "1px solid #e6e6e6" }}>
                <td
                  style={{
                    color: "#2e4487",
                    fontWeight: "600",
                    fontSize: "13px",
                    padding: "8px 6px",
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

              {/* 卦象区 (125px height, flex space-around，对标 jishiyu meihuapaipan) */}
              <tr style={{ height: "125px" }}>
                <td colSpan={5} style={{ padding: "0", verticalAlign: "middle" }}>
                  <div
                    id="meihuapaipan"
                    style={{
                      display: "flex",
                      justifyContent: "space-around",
                      margin: "0 10px 0 10px",
                      alignItems: "center",
                      height: "100%",
                    }}
                  >
                    {/* 体用标记 */}
                    <TiyongGuagap changeYao={result.changeYao} />

                    {/* 本卦 */}
                    <HexagramDisplay
                      upper={result.benGua.upper}
                      lower={result.benGua.lower}
                      hexName={result.benGua.name}
                      guaType="【本卦】"
                      changeYao={result.changeYao}
                      isActive={activeGua === "ben"}
                      onClick={() => setActiveGua("ben")}
                    />

                    {/* 动爻标记 */}
                    <DongyaoGuagap changeYao={result.changeYao} />

                    {/* 互卦 */}
                    <HexagramDisplay
                      upper={result.huGua.upper}
                      lower={result.huGua.lower}
                      hexName={result.huGua.name}
                      guaType="【互卦】"
                      changeYao={0}
                      isActive={activeGua === "hu"}
                      onClick={() => setActiveGua("hu")}
                    />

                    {/* 空位 */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column-reverse",
                        alignItems: "center",
                        width: "10px",
                        margin: "10px 0px 10px 0px",
                      }}
                    />

                    {/* 变卦 */}
                    <HexagramDisplay
                      upper={result.bianGua.upper}
                      lower={result.bianGua.lower}
                      hexName={result.bianGua.name}
                      guaType="【变卦】"
                      changeYao={0}
                      isActive={activeGua === "bian"}
                      onClick={() => setActiveGua("bian")}
                    />

                    {/* 空位 */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column-reverse",
                        alignItems: "center",
                        width: "10px",
                        margin: "10px 0px 10px 0px",
                      }}
                    />
                  </div>
                </td>
              </tr>

              {/* 点击卦身查看解释 */}
              <tr style={{ borderBottom: "1px solid #e6e6e6" }}>
                <td
                  colSpan={5}
                  style={{
                    color: "#939393",
                    fontStyle: "italic",
                    fontSize: "13px",
                    padding: "6px",
                  }}
                >
                  点击卦身查看解释
                </td>
              </tr>

              {/* 详情区: meihua-detail */}
              <tr>
                <td colSpan={5} style={{ padding: "0" }}>
                  <div style={{ width: "100%", height: "100%", overflow: "auto", maxHeight: "400px" }}>
                    <pre
                      style={{
                        textAlign: "left",
                        padding: "5px",
                        fontSize: "14px",
                        wordBreak: "break-word",
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        lineHeight: "1.6",
                        color: "#555",
                        fontFamily: "inherit",
                      }}
                    >
                      {detailText}
                    </pre>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}