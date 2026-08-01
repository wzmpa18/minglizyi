"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

const GAN_LIST = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const ZHI_LIST = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

const JIAZI = [
  "甲子", "乙丑", "丙寅", "丁卯", "戊辰", "己巳", "庚午", "辛未", "壬申", "癸酉",
  "甲戌", "乙亥", "丙子", "丁丑", "戊寅", "己卯", "庚辰", "辛巳", "壬午", "癸未",
  "甲申", "乙酉", "丙戌", "丁亥", "戊子", "己丑", "庚寅", "辛卯", "壬辰", "癸巳",
  "甲午", "乙未", "丙申", "丁酉", "戊戌", "己亥", "庚子", "辛丑", "壬寅", "癸卯",
  "甲辰", "乙巳", "丙午", "丁未", "戊申", "己酉", "庚戌", "辛亥", "壬子", "癸丑",
  "甲寅", "乙卯", "丙辰", "丁巳", "戊午", "己未", "庚申", "辛酉", "壬戌", "癸亥",
];

// 24山向
const SHAN_XIANG_24 = [
  "子", "癸", "丑", "艮", "寅", "甲", "卯", "乙", "辰", "巽", "巳", "丙",
  "午", "丁", "未", "坤", "申", "庚", "酉", "辛", "戌", "乾", "亥", "壬",
];

// 24山向五行
const SHAN_WUXING: Record<string, string> = {
  "子": "水", "癸": "水", "丑": "土", "艮": "土", "寅": "木", "甲": "木",
  "卯": "木", "乙": "木", "辰": "土", "巽": "木", "巳": "火", "丙": "火",
  "午": "火", "丁": "火", "未": "土", "坤": "土", "申": "金", "庚": "金",
  "酉": "金", "辛": "金", "戌": "土", "乾": "金", "亥": "水", "壬": "水",
};

// 24山向八卦
const SHAN_BAGUA: Record<string, string> = {
  "子": "坎", "癸": "坎", "丑": "艮", "艮": "艮", "寅": "艮", "甲": "震",
  "卯": "震", "乙": "震", "辰": "巽", "巽": "巽", "巳": "巽", "丙": "离",
  "午": "离", "丁": "离", "未": "坤", "坤": "坤", "申": "坤", "庚": "兑",
  "酉": "兑", "辛": "兑", "戌": "乾", "乾": "乾", "亥": "乾", "壬": "坎",
};

const WUXING_COLORS: Record<string, string> = {
  "金": "#ffa500", "水": "#0074e4", "木": "#00a879", "火": "#9B5ECF", "土": "#a64b00",
};

const PALACE_WUXING: Record<number, string> = {
  1: "水", 2: "土", 3: "木", 4: "木", 5: "土", 6: "金", 7: "金", 8: "土", 9: "火",
};

const PALACE_BAGUA: Record<number, string> = {
  1: "坎", 2: "坤", 3: "震", 4: "巽", 5: "中", 6: "乾", 7: "兑", 8: "艮", 9: "离",
};

const WUXING_KE: Record<string, string> = {
  "金": "木", "木": "土", "土": "水", "水": "火", "火": "金",
};

const WUXING_SHENG: Record<string, string> = {
  "金": "水", "水": "木", "木": "火", "火": "土", "土": "金",
};

const JIEQI_NAMES = [
  "小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至",
  "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至",
];

const JIEQI_APPROX: Array<[number, number]> = [
  [1, 6], [1, 21], [2, 4], [2, 19], [3, 6], [3, 21], [4, 5], [4, 20], [5, 6], [5, 21], [6, 6], [6, 22],
  [7, 7], [7, 23], [8, 7], [8, 23], [9, 8], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 22],
];

function calcDayGzIndex(year: number, month: number, day: number): number {
  let total = 0;
  for (let y = 1900; y < year; y++) {
    total += (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
  }
  const dm = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (let m = 0; m < month - 1; m++) {
    total += dm[m];
    if (m === 1 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)) total += 1;
  }
  total += day - 1;
  return (10 + total) % 60;
}

function getDayGz(year: number, month: number, day: number): string {
  return JIAZI[calcDayGzIndex(year, month, day)];
}

function getYearGz(year: number): string {
  const base = year - 4;
  return `${GAN_LIST[base % 10]}${ZHI_LIST[base % 12]}`;
}

function getMonthGz(year: number, month: number): string {
  const yearGan = getYearGz(year)[0];
  const startMap: Record<string, string> = {
    "甲": "丙", "己": "丙", "乙": "戊", "庚": "戊",
    "丙": "庚", "辛": "庚", "丁": "壬", "壬": "壬", "戊": "甲", "癸": "甲",
  };
  const startIdx = GAN_LIST.indexOf(startMap[yearGan] || "甲");
  return `${GAN_LIST[(startIdx + (month - 1)) % 10]}${ZHI_LIST[(2 + (month - 1)) % 12]}`;
}

function getHourGz(dayGan: string, hour: number): string {
  const startMap: Record<string, string> = {
    "甲": "甲", "己": "甲", "乙": "丙", "庚": "丙",
    "丙": "戊", "辛": "戊", "丁": "庚", "壬": "庚", "戊": "壬", "癸": "壬",
  };
  const startIdx = GAN_LIST.indexOf(startMap[dayGan] || "甲");
  const zhiIdx = Math.floor(((hour + 1) % 24) / 2);
  return `${GAN_LIST[(startIdx + zhiIdx) % 10]}${ZHI_LIST[zhiIdx]}`;
}

function getCurrentJieqiName(month: number, day: number): string {
  for (let i = JIEQI_NAMES.length - 1; i >= 0; i--) {
    const [m, d] = JIEQI_APPROX[i];
    if (m < month || (m === month && d <= day)) return JIEQI_NAMES[i];
  }
  return "冬至";
}

function getNextJieqiName(month: number, day: number): string {
  for (let i = 0; i < JIEQI_NAMES.length; i++) {
    const [m, d] = JIEQI_APPROX[i];
    if (m > month || (m === month && d > day)) return JIEQI_NAMES[i];
  }
  return "小寒";
}

function getJieqiDateStr(name: string): string {
  const idx = JIEQI_NAMES.indexOf(name);
  if (idx < 0) return "";
  const [m, d] = JIEQI_APPROX[idx];
  return `${m}月${d}日`;
}

// 山向到宫位映射
function shanToPalace(shan: string): number {
  const bagua = SHAN_BAGUA[shan];
  const map: Record<string, number> = { "坎": 1, "坤": 2, "震": 3, "巽": 4, "中": 5, "乾": 6, "兑": 7, "艮": 8, "离": 9 };
  return map[bagua] || 5;
}

// 简化山向奇门计算
function calcShanxiangQimen(shan: string, xiang: string, year: number, month: number, day: number, hour: number) {
  const shanPalace = shanToPalace(shan);
  const xiangPalace = shanToPalace(xiang);
  const shanWuxing = SHAN_WUXING[shan] || "土";
  const xiangWuxing = SHAN_WUXING[xiang] || "土";

  const dayGz = getDayGz(year, month, day);
  const dayIdx = JIAZI.indexOf(dayGz);

  // 生成每宫的山向信息
  const palaces: Array<{ pos: number; bagua: string; wuxing: string; shanInfo: string; xiangInfo: string; isShan: boolean; isXiang: boolean; relation: string }> = [];
  for (let pos = 1; pos <= 9; pos++) {
    const bagua = PALACE_BAGUA[pos];
    const wuxing = PALACE_WUXING[pos];
    const isShan = pos === shanPalace;
    const isXiang = pos === xiangPalace;
    let relation = "";
    if (isShan) relation = "坐山";
    else if (isXiang) relation = "朝向";
    else {
      const relWuxing = WUXING_SHENG[shanWuxing] || "";
      if (relWuxing === wuxing) relation = "吉";
      else if (WUXING_KE[shanWuxing] === wuxing) relation = "凶";
    }
    palaces.push({ pos, bagua, wuxing, shanInfo: isShan ? shan : "", xiangInfo: isXiang ? xiang : "", isShan, isXiang, relation });
  }
  return { shanPalace, xiangPalace, shan, xiang, shanWuxing, xiangWuxing, palaces, dayGz };
}

export default function ShanxiangQimenPage() {
  const router = useRouter();
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [shan, setShan] = useState("子");
  const [xiang, setXiang] = useState("午");

  const [paipanDate, setPaipanDate] = useState<Date>(new Date());
  const year = paipanDate.getFullYear();
  const month = paipanDate.getMonth() + 1;
  const day = paipanDate.getDate();
  const hour = paipanDate.getHours();
  const minute = paipanDate.getMinutes();

  const siZhu = useMemo(() => {
    const yGz = getYearGz(year);
    const mGz = getMonthGz(year, month);
    const dGz = getDayGz(year, month, day);
    const hGz = getHourGz(dGz[0], hour);
    return [
      { gan: yGz[0], zhi: yGz[1], full: yGz },
      { gan: mGz[0], zhi: mGz[1], full: mGz },
      { gan: dGz[0], zhi: dGz[1], full: dGz },
      { gan: hGz[0], zhi: hGz[1], full: hGz },
    ];
  }, [year, month, day, hour]);

  const jieqiFrom = getCurrentJieqiName(month, day);
  const jieqiTo = getNextJieqiName(month, day);
  const jieqiInfo = `${jieqiFrom}${getJieqiDateStr(jieqiFrom)} ~ ${jieqiTo}${getJieqiDateStr(jieqiTo)}`;
  const dateStr = `${year}年${month}月${day}日 ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  const result = useMemo(() => calcShanxiangQimen(shan, xiang, year, month, day, hour), [shan, xiang, year, month, day, hour]);

  const doPaipan = useCallback(() => { setLoading(true); setTimeout(() => { setHasResult(true); setLoading(false); }, 200); }, []);
  const handleNow = useCallback(() => { setPaipanDate(new Date()); setHasResult(true); }, []);

  // 反向山向
  const getXiangByShan = (s: string): string => {
    const idx = SHAN_XIANG_24.indexOf(s);
    return SHAN_XIANG_24[(idx + 12) % 24];
  };

  return (
    <div className="mx-auto flex min-h-screen flex-col bg-white" style={{ maxWidth: "100%" }}>
      <header className="sticky top-0 z-50 grid h-10 w-full items-center"
        style={{ gridTemplateColumns: "40px auto 40px 40px", backgroundColor: "#7B2FBE" }}>
        <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center" title="返回">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="text-center text-lg font-bold leading-10 text-white">言道山向奇门</div>
        <button onClick={() => { navigator.clipboard.writeText(window.location.href); }} className="flex h-10 w-10 items-center justify-center" title="分享">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
        </button>
        <button onClick={() => router.push("/yixue/profile")} className="flex h-10 w-10 items-center justify-center" title="记录">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
        </button>
      </header>

      <main className="flex-1 pb-4">
        <div className="border-b px-2 py-1.5">
          <table className="w-full border-collapse text-center text-sm" style={{ tableLayout: "fixed" }}>
            <colgroup><col width="25%" /><col width="25%" /><col width="25%" /><col width="25%" /></colgroup>
            <tbody>
              <tr>
                <td className="py-1.5 font-medium text-[#2e4487]">事项</td>
                <td colSpan={3}>
                  <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="输入预测事项" maxLength={30}
                    className="w-full border-0 bg-transparent text-center text-base outline-none" style={{ fontSize: "16px", color: "#7B2FBE" }} />
                </td>
              </tr>
              <tr>
                <td className="py-1.5 font-medium text-[#2e4487]">坐山</td>
                <td className="py-1.5">
                  <select value={shan} onChange={(e) => { setShan(e.target.value); setXiang(getXiangByShan(e.target.value)); }}
                    className="w-full rounded border px-2 py-1 text-center text-sm">
                    {SHAN_XIANG_24.map((s) => <option key={s} value={s}>{s} ({SHAN_BAGUA[s]})</option>)}
                  </select>
                </td>
                <td className="py-1.5 font-medium text-[#2e4487]">朝向</td>
                <td className="py-1.5">
                  <select value={xiang} onChange={(e) => setXiang(e.target.value)}
                    className="w-full rounded border px-2 py-1 text-center text-sm">
                    {SHAN_XIANG_24.map((s) => <option key={s} value={s}>{s} ({SHAN_BAGUA[s]})</option>)}
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex gap-2 px-4 py-2">
          <button onClick={doPaipan} disabled={loading} className="flex-1 rounded-full py-2 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50" style={{ backgroundColor: "#7B2FBE" }}>
            {loading ? "排盘中..." : (hasResult ? "重新排盘" : "开始排盘")}
          </button>
          <button onClick={handleNow} className="rounded-full border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">当前时间</button>
        </div>

        {hasResult && (
          <div className="px-2">
            <table className="w-full border-collapse text-center text-sm" style={{ tableLayout: "fixed" }}>
              <colgroup><col width="25%" /><col width="25%" /><col width="25%" /><col width="25%" /></colgroup>
              <tbody>
                <tr className="border-b">
                  <td className="py-1.5 font-medium text-[#2e4487]">坐山</td>
                  <td className="py-1.5 font-bold text-base" style={{ color: WUXING_COLORS[result.shanWuxing] }}>{result.shan}</td>
                  <td className="py-1.5 font-medium text-[#2e4487]">朝向</td>
                  <td className="py-1.5 font-bold text-base" style={{ color: WUXING_COLORS[result.xiangWuxing] }}>{result.xiang}</td>
                </tr>
                <tr className="border-b"><td className="py-1.5 font-medium text-[#2e4487]">日期</td><td colSpan={3} className="py-1.5">{dateStr}</td></tr>
                <tr className="border-b"><td className="py-1.5 font-medium text-[#2e4487]">节气</td><td colSpan={3} className="py-1.5">{jieqiInfo}</td></tr>
                <tr className="border-b bg-[#f5f5f5]"><td className="py-1 font-medium text-[#2e4487]">年柱</td><td className="py-1 font-medium text-[#2e4487]">月柱</td><td className="py-1 font-medium text-[#2e4487]">日柱</td><td className="py-1 font-medium text-[#2e4487]">时柱</td></tr>
                <tr className="border-b"><td className="py-1" style={{ fontSize: "18px", fontWeight: "bold" }}>{siZhu[0].gan}{siZhu[0].zhi}</td>
                  <td className="py-1" style={{ fontSize: "18px", fontWeight: "bold" }}>{siZhu[1].gan}{siZhu[1].zhi}</td>
                  <td className="py-1" style={{ fontSize: "18px", fontWeight: "bold" }}>{siZhu[2].gan}{siZhu[2].zhi}</td>
                  <td className="py-1" style={{ fontSize: "18px", fontWeight: "bold" }}>{siZhu[3].gan}{siZhu[3].zhi}</td>
                </tr>
              </tbody>
            </table>

            {/* 山向九宫格 */}
            <div className="mt-4">
              <div className="text-center text-sm font-medium text-[#2e4487] mb-2">山向九宫</div>
              <div className="flex justify-center">
                <div className="grid" style={{ gridTemplateRows: "90px 90px 90px", gridTemplateColumns: "90px 90px 90px", width: "270px", height: "270px", margin: "auto", boxSizing: "border-box", fontSize: "12px" }}>
                  {[[4, 9, 2], [3, 5, 7], [8, 1, 6]].flat().map((pos, idx) => {
                    const p = result.palaces.find((pp) => pp.pos === pos);
                    if (!p) return <div key={idx} className="flex items-center justify-center border border-dashed border-gray-300" style={{ marginLeft: "-1px", marginTop: "-1px" }}><span className="text-xs">空</span></div>;
                    return (
                      <div key={idx} className="flex flex-col items-center justify-center border" style={{
                        marginLeft: "-1px", marginTop: "-1px",
                        backgroundColor: p.isShan ? "#fff5f5" : p.isXiang ? "#f5f5ff" : "white",
                        borderColor: p.isShan ? "#7B2FBE" : p.isXiang ? "#0074e4" : "black",
                        borderWidth: (p.isShan || p.isXiang) ? "2px" : "1px",
                      }}>
                        <div className="font-bold text-sm">{p.bagua}</div>
                        <div className="text-xs" style={{ color: WUXING_COLORS[p.wuxing] }}>{p.wuxing}</div>
                        {p.isShan && <div className="text-xs font-bold text-red-600">坐山: {p.shanInfo}</div>}
                        {p.isXiang && <div className="text-xs font-bold text-blue-600">朝向: {p.xiangInfo}</div>}
                        {p.relation && !p.isShan && !p.isXiang && (
                          <div className="text-xs" style={{ color: p.relation === "吉" ? "#00a879" : "#9B5ECF" }}>{p.relation}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 山向信息 */}
            <div className="mt-3 p-3 rounded-lg border">
              <table className="w-full border-collapse text-center text-xs">
                <thead>
                  <tr className="border-b bg-[#f5f5f5]">
                    <th className="py-1 font-medium text-[#2e4487]">坐山</th>
                    <th className="py-1 font-medium text-[#2e4487]">五行</th>
                    <th className="py-1 font-medium text-[#2e4487]">八卦</th>
                    <th className="py-1 font-medium text-[#2e4487]">宫位</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-1 font-bold">{result.shan}</td>
                    <td className="py-1" style={{ color: WUXING_COLORS[result.shanWuxing] }}>{result.shanWuxing}</td>
                    <td className="py-1">{SHAN_BAGUA[result.shan]}</td>
                    <td className="py-1">{result.shanPalace}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-bold">{result.xiang}</td>
                    <td className="py-1" style={{ color: WUXING_COLORS[result.xiangWuxing] }}>{result.xiangWuxing}</td>
                    <td className="py-1">{SHAN_BAGUA[result.xiang]}</td>
                    <td className="py-1">{result.xiangPalace}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-3 p-3 rounded-lg border border-amber-100 bg-amber-50/50">
              <p className="text-xs text-amber-700">
                <strong>提示：</strong>山向奇门为简化版展示，基于24山向选择和当前时间进行九宫排布。
                完整算法涉及七十二龙、穿山透地等复杂风水理论，此处为简化规则演示。
              </p>
            </div>
          </div>
        )}

        {!hasResult && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            <p className="mt-3 text-sm">选择山向后点击"开始排盘"查看山向奇门排盘</p>
          </div>
        )}

        <div className="mx-4 mt-6 rounded-lg border border-red-100 bg-red-50/50 p-3">
          <p className="text-xs text-gray-500 leading-relaxed"><strong>免责声明：</strong>本页面内容仅供传统文化学习与参考，不构成任何决策建议。山向奇门是风水与奇门遁甲结合的术数体系，排盘结果为简化算法，请理性看待。</p>
          <p className="mt-1 text-xs text-gray-400">算法依据：《罗经透解》《地理五诀》等传统典籍</p>
        </div>
      </main>
      <div style={{ height: "65px" }} />
    </div>
  );
}