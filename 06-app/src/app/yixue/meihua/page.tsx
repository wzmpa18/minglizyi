"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  meihuaTimeDivination,
  getHuGua,
  getBianGua,
  analyzeTiYong,
  getTrigramInfo,
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
import { getMeihuaHexagramInterpretation, getMeihuaTiYongInterpretation, type MeihuaInterpretItem } from "@/lib/meihua-interpretations";
import { savePaipanState, loadPaipanState, clearPaipanState } from "@/lib/paipanPersistence";

// ============================================================================
// 五行颜色 (与 jishiyu 完全一致)
// ============================================================================
const WX_COLORS: Record<string, string> = {
  "金": "#ffa500", "木": "#00a879", "水": "#0074e4", "火": "#9B5ECF", "土": "#a64b00",
};

/** 解读类型标签颜色 */
const INTERPRET_TYPE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  gua: { bg: "#EDE7F6", fg: "#7B2FBE", label: "卦象" },
  bagua: { bg: "#E8F5E9", fg: "#2E7D32", label: "八卦" },
  tiyong: { bg: "#FFF3E0", fg: "#E65100", label: "体用" },
  dongyao: { bg: "#FFEBEE", fg: "#C62828", label: "动爻" },
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
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(2026, 0, 1, 12, 0, 0));
  useEffect(() => {
    setSelectedDate(new Date());
  }, []);
  const [divMethod, setDivMethod] = useState<"time" | "number" | "manual">("time");
  const [manualNumbers, setManualNumbers] = useState<string[]>(["", "", ""]);

  // ---- 结果状态 ----
  const [result, setResult] = useState<ReturnType<typeof buildMeihuaResult> | null>(null);
  const [activeGua, setActiveGua] = useState<ActiveGua>("ben");
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);

  // 解读面板
  const [interpretPanel, setInterpretPanel] = useState<{
    title: string;
    items: MeihuaInterpretItem[];
  } | null>(null);

  // 卦象点击 → 切换卦并显示解读
  const handleGuaClick = useCallback((guaType: ActiveGua) => {
    setActiveGua(guaType);
    if (!result) return;

    // 卦象解读
    const activeHexagram = guaType === "ben" ? result.benGua : guaType === "hu" ? result.huGua : result.bianGua;
    const guaItems = getMeihuaHexagramInterpretation(
      activeHexagram.num,
      activeHexagram.name,
      activeHexagram.guaCi,
    );

    // 体用解读（仅本卦显示）
    const allItems = [...guaItems.items];
    if (guaType === "ben") {
      const tiYongItems = getMeihuaTiYongInterpretation(
        result.tiYong.tiGua,
        result.tiYong.yongGua,
        result.tiYong.tiWuxing,
        result.tiYong.yongWuxing,
        result.tiYong.relation,
        result.tiYong.description,
      );
      allItems.push(...tiYongItems.items);
    }

    setInterpretPanel({
      title: activeHexagram.name + " · " + (guaType === "ben" ? "本卦" : guaType === "hu" ? "互卦" : "变卦") + "解读",
      items: allItems,
    });
  }, [result]);

  // URL参数clientId + 回填检查
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) { const c = getClient(cid); if (c) setSelectedClient(c); }
    const prefill = getPrefillData("meihua");
    if (prefill) { try { setResult(prefill); setShowPopup(false); clearPrefillData("meihua"); } catch(e){} }
  }, []);

  // localStorage 持久化：恢复排盘状态
  useEffect(() => {
    const saved = loadPaipanState("meihua");
    if (saved && saved.input) {
      const inp = saved.input as any;
      if (inp.year && inp.month && inp.day) {
        setSelectedDate(new Date(inp.year, inp.month - 1, inp.day, inp.hour || 12, inp.minute || 0));
      }
      if (inp.desc) setDesc(inp.desc);
      if (inp.divMethod) setDivMethod(inp.divMethod);
      if (inp.manualNumbers) setManualNumbers(inp.manualNumbers);
      if (saved.showForm === false) {
        handleDivination({year: inp.year, month: inp.month, day: inp.day, hour: inp.hour});
      }
    }
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
    savePaipanState("meihua",{input:{year:y,month:mo,day:d,hour:h,desc,divMethod,manualNumbers},showForm:false,_ts:Date.now()});
    // 保存客户记录
    if(selectedClient){
      try{saveRecord({clientId:selectedClient.id,type:"meihua",data:{...r,inputParams:{year:y,month:mo,day:d,hour:h,method:divMethod}},note:"",status:"pending"});}catch(e){console.error("保存记录失败:",e);}
    }
  }, [selectedDate, selectedClient, divMethod]);

  // ---- 自动显示初始解读 ----
  useEffect(() => {
    if (result) {
      handleGuaClick("ben");
    }
  }, [result]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- 返回弹窗 ----
  const handleBackToPopup = useCallback(() => {
    setShowPopup(true);
    setResult(null);
    setInterpretPanel(null);
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

  return (
    <div className="min-h-screen flex justify-center bg-[#ededed]">
      <div className="w-full" style={{maxWidth:"375px", paddingBottom:"10px"}}>

      {/* ====== 日期时间选择弹窗 ====== */}
      <DatePicker
        show={showPopup}
        onClose={() => setShowPopup(false)}
        onSubmit={(dateVal) => {
          setSelectedDate(new Date(dateVal.year, dateVal.month - 1, dateVal.day, dateVal.hour, dateVal.minute));
          handleDivination({year: dateVal.year, month: dateVal.month, day: dateVal.day, hour: dateVal.hour});
        }}
        initialDate={{year: selectedDate.getFullYear(), month: selectedDate.getMonth() + 1, day: selectedDate.getDate(), hour: selectedDate.getHours(), minute: selectedDate.getMinutes()}}
        showMinute={true}
        showGender={false} showCalType={true} showToggles={false} showRegion={false} showName={false}
        submitText="起卦" title="梅花易数"
      />

      {!showPopup && !result && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <button onClick={() => { clearPaipanState("meihua"); setShowPopup(true); }} className="rounded-full bg-[#7B2FBE] text-white font-bold text-lg px-8 py-3 shadow-lg">开始排盘</button>
        </div>
      )}

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
                      onClick={() => handleGuaClick("ben")}
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
                      onClick={() => handleGuaClick("hu")}
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
                      onClick={() => handleGuaClick("bian")}
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

              {/* 解读抽屉面板 */}
              {interpretPanel && (
                <tr>
                  <td colSpan={5} style={{ padding: "6px 8px" }}>
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
                        点击卦象查看不同解读 · 引经据典，仅供参考
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}