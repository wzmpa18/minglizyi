"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { calculateQimen, isYangDun } from "@/algorithm-core";
import type { QimenResult, QimenPalace } from "@/algorithm-core";

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

const LUOSHU_GRID: number[][] = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];

const PALACE_BAGUA: Record<number, string> = {
  1: "坎", 2: "坤", 3: "震", 4: "巽", 5: "中", 6: "乾", 7: "兑", 8: "艮", 9: "离",
};

const PALACE_WUXING: Record<number, string> = {
  1: "水", 2: "土", 3: "木", 4: "木", 5: "土", 6: "金", 7: "金", 8: "土", 9: "火",
};

const STAR_LIST = ["天蓬", "天芮", "天冲", "天辅", "天禽", "天心", "天柱", "天任", "天英"];
const BAMEN_LIST = ["休门", "死门", "伤门", "杜门", "——", "开门", "惊门", "生门", "景门"];

const STAR_HOME_POS: Record<string, number> = {
  "天蓬": 1, "天芮": 2, "天冲": 3, "天辅": 4,
  "天禽": 5, "天心": 6, "天柱": 7, "天任": 8, "天英": 9,
};

const PALACE_TIAN_GAN: Record<number, string> = {
  1: "癸", 2: "己", 3: "甲", 4: "辛", 5: "戊", 6: "己", 7: "丁", 8: "丙", 9: "乙",
};

const PALACE_DI_ZHI: Record<number, string> = {
  1: "子", 2: "申", 3: "卯", 4: "巳", 5: "辰戌", 6: "亥", 7: "酉", 8: "寅", 9: "午",
};

const YIMA_TABLE: Record<string, string> = {
  "申": "寅", "子": "寅", "辰": "寅", "寅": "申", "午": "申", "戌": "申",
  "巳": "亥", "酉": "亥", "丑": "亥", "亥": "巳", "卯": "巳", "未": "巳",
};

const JIEQI_NAMES = [
  "小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至",
  "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至",
];

const JIEQI_APPROX: Array<[number, number]> = [
  [1, 6], [1, 21], [2, 4], [2, 19], [3, 6], [3, 21], [4, 5], [4, 20], [5, 6], [5, 21], [6, 6], [6, 22],
  [7, 7], [7, 23], [8, 7], [8, 23], [9, 8], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 22],
];

const CHANGSHENG_ORDER = ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"];
const GAN_CHANGSHENG_START: Record<string, number> = {
  "甲": 1, "乙": 8, "丙": 3, "丁": 9, "戊": 3, "己": 9, "庚": 6, "辛": 4, "壬": 7, "癸": 2,
};
const GAN_YANG: Record<string, boolean> = {
  "甲": true, "乙": false, "丙": true, "丁": false, "戊": true,
  "己": false, "庚": true, "辛": false, "壬": true, "癸": false,
};
const YANG_SEQ = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const YIN_SEQ = [9, 8, 7, 6, 5, 4, 3, 2, 1];

const PAN_TYPE_OPTIONS = [
  { value: "shipan", label: "时盘" },
  { value: "kepan", label: "刻盘" },
] as const;

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

function getXunShou(dayGz: string): string {
  const idx = JIAZI.indexOf(dayGz);
  if (idx < 0) return "甲子";
  return JIAZI[Math.floor(idx / 10) * 10];
}

function getXunKong(dayGz: string): string {
  const idx = JIAZI.indexOf(dayGz);
  if (idx < 0) return "戌亥";
  const table = ["戌亥", "申酉", "午未", "辰巳", "寅卯", "子丑"];
  return table[Math.floor(idx / 10)] || "戌亥";
}

function getKongWangZhi(gz: string): string[] {
  const kong = getXunKong(gz);
  return [kong[0], kong[1]];
}

function getMaXing(zhi: string): string {
  return YIMA_TABLE[zhi] || "";
}

function getChangsheng(gan: string, pos: number): string {
  const startPos = GAN_CHANGSHENG_START[gan];
  if (!startPos) return "";
  const yang = GAN_YANG[gan];
  const seq = yang ? YANG_SEQ : YIN_SEQ;
  const startIdx = seq.indexOf(startPos);
  const posIdx = seq.indexOf(pos);
  if (startIdx < 0 || posIdx < 0) return "";
  let offset = posIdx - startIdx;
  if (offset < 0) offset += 9;
  return CHANGSHENG_ORDER[offset % 12] || "";
}

function getPalaceTianGan(pos: number): string {
  return PALACE_TIAN_GAN[pos] || "";
}

interface CellDisplay {
  pos: number; bagua: string; wuxing: string;
  shen: string; xing: string; men: string; men_po: boolean;
  tianpanGan: string; tianpanJiGan: string; tianpan_changsheng: string;
  dipanGan: string; dipan_changsheng: string;
  yingan: string; kongwang: boolean; ma: boolean;
  isAuspicious: boolean; rumu: boolean;
}

interface CellDataMap { [pos: number]: CellDisplay; }

export default function YinpanQimenPage() {
  const router = useRouter();
  const [desc, setDesc] = useState("");
  const [result, setResult] = useState<QimenResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChangsheng, setShowChangsheng] = useState(false);
  const [panType, setPanType] = useState<"shipan" | "kepan">("shipan");

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

  const dayGz = getDayGz(year, month, day);
  const jieqiFrom = getCurrentJieqiName(month, day);
  const jieqiTo = getNextJieqiName(month, day);
  const jieqiInfo = `${jieqiFrom}${getJieqiDateStr(jieqiFrom)} ~ ${jieqiTo}${getJieqiDateStr(jieqiTo)}`;
  const xunShou = getXunShou(dayGz);
  const xunKong = getXunKong(dayGz);
  const kongWangZhiArr = getKongWangZhi(dayGz);
  const maXing = getMaXing(siZhu[3].zhi);
  const dateStr = `${year}年${month}月${day}日 ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  const { zhiFu, zhiShi } = useMemo(() => {
    if (!result) return { zhiFu: "", zhiShi: "" };
    const ju = result.juNumber;
    return { zhiFu: STAR_LIST[(ju - 1) % 9] || "", zhiShi: BAMEN_LIST[(ju - 1) % 9] || "" };
  }, [result]);

  const juStr = result ? `阴盘 ${result.juType}${result.juNumber}局 (${panType === "shipan" ? "时盘" : "刻盘"})` : "";

  const doPaipan = useCallback(() => {
    setLoading(true); setError(null);
    try {
      const res = calculateQimen({ year, month, day, hour, minute });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "计算失败"); setResult(null);
    }
    setLoading(false);
  }, [year, month, day, hour, minute]);

  const handleNow = useCallback(() => {
    const now = new Date();
    setPaipanDate(now);
    setTimeout(() => {
      try {
        const res = calculateQimen({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(), hour: now.getHours(), minute: now.getMinutes() });
        setResult(res); setError(null);
      } catch (err: unknown) { setError(err instanceof Error ? err.message : "计算失败"); }
    }, 0);
  }, []);

  const handlePrev = useCallback(() => {
    const newDate = new Date(paipanDate);
    newDate.setHours(newDate.getHours() - 2);
    setPaipanDate(newDate);
    setTimeout(() => {
      try {
        const res = calculateQimen({ year: newDate.getFullYear(), month: newDate.getMonth() + 1, day: newDate.getDate(), hour: newDate.getHours(), minute: newDate.getMinutes() });
        setResult(res); setError(null);
      } catch (err: unknown) { setError(err instanceof Error ? err.message : "计算失败"); }
    }, 0);
  }, [paipanDate]);

  const handleNext = useCallback(() => {
    const newDate = new Date(paipanDate);
    newDate.setHours(newDate.getHours() + 2);
    setPaipanDate(newDate);
    setTimeout(() => {
      try {
        const res = calculateQimen({ year: newDate.getFullYear(), month: newDate.getMonth() + 1, day: newDate.getDate(), hour: newDate.getHours(), minute: newDate.getMinutes() });
        setResult(res); setError(null);
      } catch (err: unknown) { setError(err instanceof Error ? err.message : "计算失败"); }
    }, 0);
  }, [paipanDate]);

  const cellData = useMemo((): CellDataMap | null => {
    if (!result) return null;
    const data: CellDataMap = {};
    const palaceMap: Record<number, QimenPalace> = {};
    result.palaces.forEach((p) => { palaceMap[p.position] = p; });

    for (let pos = 1; pos <= 9; pos++) {
      const palace = palaceMap[pos];
      if (!palace) {
        data[pos] = { pos, bagua: PALACE_BAGUA[pos] || "", wuxing: PALACE_WUXING[pos] || "", shen: "", xing: "", men: "", men_po: false, tianpanGan: "", tianpanJiGan: "", tianpan_changsheng: "", dipanGan: "", dipan_changsheng: "", yingan: "", kongwang: false, ma: false, isAuspicious: false, rumu: false };
        continue;
      }
      const nativeGan = getPalaceTianGan(pos);
      const nativeZhi = PALACE_DI_ZHI[pos] || "";
      const dipanGan = nativeGan;
      const starHomePos = STAR_HOME_POS[palace.star] || pos;
      const tianpanGan = getPalaceTianGan(starHomePos);
      const tianpanJiGan = palace.star === "天芮" && pos === 2 ? "戊" : "";
      const tianpan_changsheng = getChangsheng(tianpanGan, pos);
      const dipan_changsheng = getChangsheng(dipanGan, pos);
      const kongwang = kongWangZhiArr.includes(nativeZhi);
      const ma = nativeZhi === maXing;
      const rumu = tianpan_changsheng === "墓" || dipan_changsheng === "墓";

      data[pos] = { pos, bagua: PALACE_BAGUA[pos] || "", wuxing: PALACE_WUXING[pos] || "", shen: palace.deity || "", xing: palace.star || "", men: palace.door || "", men_po: palace.door ? !(palace.isAuspicious ?? false) : false, tianpanGan, tianpanJiGan, tianpan_changsheng, dipanGan, dipan_changsheng, yingan: getPalaceTianGan(pos), kongwang, ma, isAuspicious: palace.isAuspicious ?? false, rumu };
    }
    return data;
  }, [result, kongWangZhiArr, maXing]);

  const gridData = useMemo(() => {
    if (!cellData) return null;
    return LUOSHU_GRID.map((row) => row.map((pos) => cellData[pos] || null));
  }, [cellData]);

  return (
    <div className="mx-auto flex min-h-screen flex-col bg-white" style={{ maxWidth: "100%" }}>
      <header className="sticky top-0 z-50 grid h-10 w-full items-center"
        style={{ gridTemplateColumns: "40px auto 40px 40px", backgroundColor: "#7B2FBE" }}>
        <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center" title="返回">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="text-center text-lg font-bold leading-10 text-white">言道阴盘奇门</div>
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
            <colgroup><col width="20%" /><col width="20%" /><col width="20%" /><col width="20%" /><col width="20%" /></colgroup>
            <tbody>
              <tr>
                <td className="py-1.5 font-medium text-[#2e4487]">事项</td>
                <td colSpan={4}>
                  <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="输入预测事项" maxLength={30}
                    className="w-full border-0 bg-transparent text-center text-base outline-none" style={{ fontSize: "16px", color: "#7B2FBE" }} />
                </td>
              </tr>
              <tr>
                <td className="py-1.5 font-medium text-[#2e4487]">盘型</td>
                <td colSpan={4}>
                  <div className="flex justify-center gap-4">
                    {PAN_TYPE_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="panType" value={opt.value} checked={panType === opt.value} onChange={() => setPanType(opt.value as "shipan" | "kepan")} />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex gap-2 px-4 py-2">
          <button onClick={doPaipan} disabled={loading} className="flex-1 rounded-full py-2 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50" style={{ backgroundColor: "#7B2FBE" }}>
            {loading ? "排盘中..." : (result ? "重新排盘" : "开始排盘")}
          </button>
          <button onClick={handleNow} className="rounded-full border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">当前时间</button>
        </div>

        {error && <div className="mx-4 rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{error}</p></div>}

        {result && (
          <div className="px-2">
            <table className="w-full border-collapse text-center text-sm" style={{ tableLayout: "fixed" }}>
              <colgroup><col width="20%" /><col width="20%" /><col width="20%" /><col width="20%" /><col width="20%" /></colgroup>
              <tbody>
                <tr className="border-b"><td className="py-1.5 font-medium text-[#2e4487]">局数</td><td colSpan={4} className="py-1.5 font-bold text-base">{juStr}</td></tr>
                <tr className="border-b"><td className="py-1.5 font-medium text-[#2e4487]">日期</td><td colSpan={4} className="py-1.5">{dateStr}</td></tr>
                <tr className="border-b"><td className="py-1.5 font-medium text-[#2e4487]">节气</td><td colSpan={4} className="py-1.5">{jieqiInfo}</td></tr>
                <tr className="border-b bg-[#f5f5f5]"><td className="py-1 font-medium text-[#2e4487]">值符</td><td className="py-1 font-medium text-[#2e4487]">值使</td><td className="py-1 font-medium text-[#2e4487]">旬首</td><td className="py-1 font-medium text-[#2e4487]">马星</td><td className="py-1 font-medium text-[#2e4487]">空亡</td></tr>
                <tr className="border-b"><td className="py-1">{zhiFu}</td><td className="py-1">{zhiShi}</td><td className="py-1">{xunShou}</td><td className="py-1 font-medium" style={{ color: "#c40000" }}>{maXing}</td><td className="py-1">{xunKong}</td></tr>
                <tr className="border-b bg-[#f5f5f5]"><td className="py-1"></td><td className="py-1 font-medium text-[#2e4487]">年柱</td><td className="py-1 font-medium text-[#2e4487]">月柱</td><td className="py-1 font-medium text-[#2e4487]">日柱</td><td className="py-1 font-medium text-[#2e4487]">时柱</td></tr>
                <tr className="border-b"><td className="py-1 font-medium text-[#2e4487]">四柱</td>
                  {siZhu.map((pillar, i) => (<td key={i} className="py-1" style={{ fontSize: "18px", fontWeight: "bold" }}><div>{pillar.gan}</div><div>{pillar.zhi}</div></td>))}
                </tr>
              </tbody>
            </table>

            <div className="mt-3 flex justify-center">
              <div className="grid" style={{ gridTemplateRows: "90px 90px 90px", gridTemplateColumns: "90px 90px 90px", width: "270px", height: "270px", margin: "auto", boxSizing: "border-box", textAlign: "left", backgroundColor: "#FFFFFF", fontSize: "13px" }}>
                {gridData && gridData.flat().map((cell, idx) => {
                  if (!cell) return <div key={idx} className="flex items-center justify-center border border-dashed border-gray-300" style={{ marginLeft: "-1px", marginTop: "-1px" }}><span className="text-xs text-gray-300">空</span></div>;
                  const isOuter = [4, 3, 8, 1].includes(cell.pos);
                  const isCorner = [4, 2, 8, 6].includes(cell.pos);
                  return (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "20% 40% 40%", gridTemplateRows: "23.33% 15% 23.33% 15% 23.33%", border: "1px solid black", marginLeft: "-1px", marginTop: "-1px", padding: "3px", paddingLeft: "5px", backgroundColor: isOuter ? "#b6b6b640" : "white", fontSize: "11px", lineHeight: "1.2", ...(isCorner ? { borderTopLeftRadius: cell.pos === 4 ? "5px" : 0, borderTopRightRadius: cell.pos === 2 ? "5px" : 0, borderBottomLeftRadius: cell.pos === 8 ? "5px" : 0, borderBottomRightRadius: cell.pos === 6 ? "5px" : 0 } : {}) }}>
                      <div style={{ gridRow: 1, gridColumn: 1, fontSize: "10px" }}>{cell.kongwang ? "○" : ""}</div>
                      <div style={{ gridRow: 1, gridColumn: 2, fontSize: "10px" }}>{cell.shen}</div>
                      <div style={{ gridRow: 1, gridColumn: 3, textAlign: "right", fontSize: "10px" }}>{cell.ma ? <span style={{ color: "#c40000", fontWeight: 500 }}>马</span> : ""}</div>
                      <div style={{ gridRow: 2, gridColumn: "span 3", textAlign: "right", fontSize: "10px", color: "#2e4487", visibility: showChangsheng ? "visible" : "hidden" }}>{cell.tianpan_changsheng}</div>
                      <div style={{ gridRow: 3, gridColumn: 1, fontSize: "10px", color: "#a2a2a2" }}>{cell.yingan}</div>
                      <div style={{ gridRow: 3, gridColumn: 2, fontSize: "11px" }}>{cell.xing}</div>
                      <div style={{ gridRow: 3, gridColumn: 3, textAlign: "right", fontSize: "11px" }}>{cell.tianpanJiGan ? <span style={{ color: cell.rumu ? "#d0af0f" : "inherit" }}>{cell.tianpanJiGan}</span> : null} <span style={{ color: cell.rumu ? "#d0af0f" : "inherit" }}>{cell.tianpanGan}</span></div>
                      <div style={{ gridRow: 4, gridColumn: "span 3", textAlign: "right", fontSize: "10px", color: "#2e4487", visibility: showChangsheng ? "visible" : "hidden" }}>{cell.dipan_changsheng}</div>
                      <div style={{ gridRow: 5, gridColumn: 1, fontSize: "10px", color: "#a2a2a2" }}></div>
                      <div style={{ gridRow: 5, gridColumn: 2, fontSize: "11px", color: cell.men_po ? "red" : "inherit", fontWeight: cell.men_po ? 500 : "normal" }}>{cell.men}</div>
                      <div style={{ gridRow: 5, gridColumn: 3, textAlign: "right", fontSize: "11px" }}><span>{cell.dipanGan}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-2 text-center text-xs select-none">
              符号颜色：<span style={{ color: "#d0af0f", fontWeight: 500 }}>入墓</span>、
              <span style={{ color: "mediumorchid", fontWeight: 500 }}>击刑</span>、
              <span style={{ color: "red", fontWeight: 500 }}>门迫</span>
            </div>

            <div className="mt-3 flex flex-wrap justify-center gap-2" style={{ userSelect: "none" }}>
              <button onClick={handlePrev} className="rounded-full px-5 py-1.5 text-xs font-medium text-white transition-all active:scale-[0.98]" style={{ backgroundColor: "#7B2FBE", width: "80px", height: "25px" }}>上一局</button>
              <button onClick={handleNow} className="rounded-full px-5 py-1.5 text-xs font-medium text-white transition-all active:scale-[0.98]" style={{ backgroundColor: "#7B2FBE", width: "80px", height: "25px" }}>当前盘</button>
              <button onClick={handleNext} className="rounded-full px-5 py-1.5 text-xs font-medium text-white transition-all active:scale-[0.98]" style={{ backgroundColor: "#7B2FBE", width: "80px", height: "25px" }}>下一局</button>
            </div>
            <div className="mt-2 flex justify-center gap-2">
              <button onClick={() => setShowChangsheng(!showChangsheng)} className="rounded-full px-5 py-1.5 text-xs font-medium text-white transition-all active:scale-[0.98]" style={{ backgroundColor: showChangsheng ? "#dba900" : "#7B2FBE", width: "80px", height: "25px" }}>长生状态</button>
            </div>

            <div className="mt-3">
              <table className="w-full border-collapse text-center text-sm" style={{ tableLayout: "fixed" }}>
                <colgroup><col width="20%" /><col width="20%" /><col width="20%" /><col width="20%" /><col width="20%" /></colgroup>
                <tbody>
                  <tr><td className="py-1.5 font-medium text-[#2e4487]">吉方</td><td colSpan={4} className="py-1.5 text-emerald-600">{(result.auspiciousDirections?.length ?? 0) > 0 ? result.auspiciousDirections!.join("、") : "—"}</td></tr>
                  <tr><td className="py-1.5 font-medium text-[#2e4487]">凶方</td><td colSpan={4} className="py-1.5 text-red-500">{(result.inauspiciousDirections?.length ?? 0) > 0 ? result.inauspiciousDirections!.join("、") : "—"}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!result && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            <p className="mt-3 text-sm">点击"开始排盘"查看阴盘奇门排盘</p>
          </div>
        )}

        <div className="mx-4 mt-6 rounded-lg border border-red-100 bg-red-50/50 p-3">
          <p className="text-xs text-gray-500 leading-relaxed"><strong>免责声明：</strong>本页面内容仅供传统文化学习与参考，不构成任何决策建议。阴盘奇门为奇门遁甲的重要分支，以阴遁飞盘为主要特色。排盘结果由算法自动生成，请理性看待。</p>
          <p className="mt-1 text-xs text-gray-400">算法依据：《阴盘奇门遁甲》《奇门遁甲秘籍大全》等传统典籍</p>
        </div>
      </main>
      <div style={{ height: "65px" }} />
    </div>
  );
}