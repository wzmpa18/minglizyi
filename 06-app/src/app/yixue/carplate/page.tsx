"use client";

import { useState, useCallback, useEffect } from "react";
import ClientSelector from "@/components/ClientSelector";
import { BrandHeader } from "@/components/shared";
import { saveRecord, getPrefillData, clearPrefillData, getClient } from "@/lib/clientStore";
import type { Client } from "@/lib/clientStore";

// ============================================================================
// 常量
// ============================================================================
const BRAND = "#7B2FBE";

// 省份简称
const PROVINCE_PREFIXES = [
  "京", "津", "沪", "渝", "冀", "晋", "辽", "吉", "黑", "苏", "浙", "皖",
  "闽", "赣", "鲁", "豫", "鄂", "湘", "粤", "桂", "琼", "川", "贵", "云",
  "藏", "陕", "甘", "青", "宁", "新", "蒙",
];

// 数字五行（河图洛书）
const DIGIT_WUXING: Record<string, string> = {
  "0": "土", "1": "水", "2": "火", "3": "木", "4": "金",
  "5": "土", "6": "水", "7": "火", "8": "木", "9": "金",
};

// 字母五行（按字母序排列：A-Z对应1-26，取个位数五行）
const LETTER_WUXING: Record<string, string> = {};
for (let i = 0; i < 26; i++) {
  const letter = String.fromCharCode(65 + i);
  const num = (i + 1) % 10;
  const key = num === 0 ? "0" : String(num);
  LETTER_WUXING[letter] = DIGIT_WUXING[key];
}

const WUXING_COLORS: Record<string, string> = {
  "金": "#ffa500", "木": "#00a879", "水": "#0074e4", "火": "#ed4d49", "土": "#a64b00",
};

// 81数理吉凶
const SHULI_DESC: Record<number, { jx: "吉" | "凶" | "半吉"; desc: string; hint: string }> = {};
const JI_NUMS = new Set([1,3,5,6,7,8,11,13,15,16,17,21,23,24,25,29,31,32,33,35,37,39,41,45,47,48,52,57,61,63,65,67,68]);
const XIONG_NUMS = new Set([2,4,9,10,12,14,19,20,22,26,27,28,34,36,40,43,44,46,53,54,55,56,59,60,62,64,66,69,70,72,74,76,79]);
const SHULI_HINTS: Record<number, string> = {
  1:"太极之数，万物开泰",3:"三才之数，天地人和",5:"五行俱权，循环相生",6:"六爻之数，发展变化",
  7:"七政之数，精悍严谨",8:"八卦之数，乾坎艮震",11:"旱苗逢雨，万物更新",13:"春日牡丹，才艺多能",
  15:"福寿圆满，富贵荣誉",16:"厚重载德，安富尊荣",17:"权威刚强，突破万难",18:"铁镜重磨，有志竟成",
  21:"明月中天，官运亨通",23:"旭日东升，壮丽壮观",24:"家门余庆，金钱丰盈",25:"资性英敏，才能奇特",
  29:"智谋优秀，财力归集",31:"智勇得志，博得名利",32:"侥幸多望，贵人得助",33:"旭日升天，名闻天下",
  35:"温和平安，文雅发展",37:"权威显达，热诚忠信",39:"富贵荣华，德泽四方",41:"纯阳独秀，德高望重",
  45:"顺风扬帆，万事如意",47:"开花结果，权威进取",48:"古松立鹤，德智兼备",52:"卓识达眼，先见之明",
  57:"日照春松，寒雪青松",61:"牡丹芙蓉，花开富贵",63:"舟归平海，富贵荣华",65:"巨流归海，富贵长寿",
  67:"顺风通达，天赋幸运",68:"兴家立业，包容万物",
  2:"两仪之数，混沌未开",4:"四象之数，待于生发",9:"大成之数，蕴涵凶险",10:"终结之数，雪暗飘零",
  12:"掘井无泉，意志薄弱",14:"破兆之数，家庭缘薄",19:"风云蔽日，辛苦重来",20:"非业破运，灾难重重",
  22:"秋草逢霜，怀才不遇",26:"变怪之数，波澜重叠",27:"欲望无止，自我强烈",28:"遭难之数，四海漂泊",
  34:"破家之数，见识浅少",36:"波澜重叠，沉浮万状",40:"智谋胆力，冒险投机",43:"散财破产，诸事不遂",
  44:"破家亡身，暗藏惨淡",46:"浪里淘金，须防劫财",53:"曲卷难星，外祥内苦",54:"石上栽花，多难悲运",
  55:"善恶互见，吉中带凶",56:"浪里行舟，历尽艰辛",59:"寒蝉悲风，意志衰退",60:"无谋之人，漂泊不定",
  62:"衰败之数，内外不和",64:"骨肉分离，一生多难",66:"岩头走马，进退维谷",69:"坐立不安，常陷逆境",
  70:"残菊逢霜，寂寞悲凉",72:"劳苦相伴，未雨绸缪",74:"残花经霜，沉沦逆境",76:"倾覆离散，劳而无功",
  79:"云头望月，前途无光",
};
for (let i = 1; i <= 81; i++) {
  let jx: "吉" | "凶" | "半吉";
  if (JI_NUMS.has(i)) jx = "吉";
  else if (XIONG_NUMS.has(i)) jx = "凶";
  else jx = "半吉";
  SHULI_DESC[i] = {
    jx,
    desc: SHULI_HINTS[i] || (jx === "吉" ? "吉祥之数，万事如意" : jx === "凶" ? "坎坷之数，需谨慎行事" : "吉凶参半，稳中求进"),
    hint: jx === "吉" ? "吉" : jx === "凶" ? "凶" : "中平",
  };
}

// 吉祥数字组合
const AUSPICIOUS_COMBOS = ["168", "666", "888", "999", "158", "166", "188", "198", "199", "518", "520", "588", "668", "688", "886", "889", "898", "918", "988", "998"];
const INAUSPICIOUS_COMBOS = ["14", "44", "54", "74", "94", "250", "444", "514", "714", "724"];

// ============================================================================
// 分析算法
// ============================================================================

interface CarplateResult {
  plate: string;
  province: string;
  cityLetter: string;
  numberPart: string;
  // 数字五行
  wuxingCount: Record<string, number>;
  wuxingBalance: string;
  // 字母五行
  letterWuxingList: { letter: string; wuxing: string }[];
  // 五格数理（车牌数字总和）
  totalSum: number;
  shuliNum: number;
  shuliJiXiong: "吉" | "凶" | "半吉";
  shuliDesc: string;
  // 吉祥组合
  auspiciousFound: string[];
  inauspiciousFound: string[];
  // 综合评分
  score: number;
  grade: "大吉" | "吉" | "半吉" | "凶" | "大凶";
  gradeDesc: string;
  // 数字寓意
  meanings: string[];
}

function analyzeCarplate(plate: string): CarplateResult | null {
  const input = plate.trim().toUpperCase();
  if (input.length < 2) return null;

  let province = "";
  let cityLetter = "";
  let rest = input;

  // 提取省份简称
  for (const p of PROVINCE_PREFIXES) {
    if (input.startsWith(p)) {
      province = p;
      rest = input.slice(p.length);
      // 跳过可能的"·"或空格
      rest = rest.replace(/^[·\s]/, "");
      break;
    }
  }

  // 提取城市字母
  if (/^[A-Z]/.test(rest)) {
    cityLetter = rest[0];
    rest = rest.slice(1);
  }
  rest = rest.replace(/[·\s-]/g, "");
  const numberPart = rest;

  // 提取所有数字
  const digits = input.replace(/[^\d]/g, "");
  if (digits.length === 0) return null;

  // 数字五行统计
  const wuxingCount: Record<string, number> = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
  for (const d of digits) {
    const wx = DIGIT_WUXING[d];
    if (wx) wuxingCount[wx]++;
  }
  // 字母五行
  const letterWuxingList: { letter: string; wuxing: string }[] = [];
  for (const ch of input) {
    if (/[A-Z]/.test(ch) && LETTER_WUXING[ch]) {
      letterWuxingList.push({ letter: ch, wuxing: LETTER_WUXING[ch] });
      wuxingCount[LETTER_WUXING[ch]] = (wuxingCount[LETTER_WUXING[ch]] || 0) + 0.5;
    }
  }

  let maxWx = "金", minWx = "金", maxC = 0, minC = 999;
  for (const [wx, c] of Object.entries(wuxingCount)) {
    if (c > maxC) { maxC = c; maxWx = wx; }
    if (c < minC) { minC = c; minWx = wx; }
  }
  const wuxingBalance = `${maxWx}旺${minWx}弱`;

  // 五格数理：数字总和取81余数
  const totalSum = digits.split("").reduce((s, d) => s + parseInt(d, 10), 0);
  let shuliNum = totalSum % 80;
  if (shuliNum === 0) shuliNum = 80;
  const shuliData = SHULI_DESC[shuliNum] || { jx: "半吉" as const, desc: "中平之数", hint: "中平" };

  // 吉祥/不吉组合检测
  const auspiciousFound: string[] = [];
  for (const combo of AUSPICIOUS_COMBOS) {
    if (digits.includes(combo)) auspiciousFound.push(combo);
  }
  const inauspiciousFound: string[] = [];
  for (const combo of INAUSPICIOUS_COMBOS) {
    if (digits.includes(combo)) inauspiciousFound.push(combo);
  }

  // 数字寓意
  const meanings: string[] = [];
  if (digits.includes("8")) meanings.push('含8，谐音"发"，主财运兴旺');
  if (digits.includes("9")) meanings.push('含9，谐音"久"，主长久稳定');
  if (digits.includes("6")) meanings.push('含6，谐音"顺"，主诸事顺利');
  if (digits.includes("0")) meanings.push("含0，圆满之象，主团圆完美");
  if (digits.startsWith("1")) meanings.push("以1开头，有领头、争先之象");
  if (/(.)\1{2,}/.test(digits)) meanings.push("含豹子号（三连号以上），能量集中");
  // 连号
  if (/(012|123|234|345|456|567|678|789)/.test(digits)) meanings.push("含顺子，主步步高升");
  if (/(987|876|765|654|543|432|321|210)/.test(digits)) meanings.push("含倒顺子，需注意下坡路");

  // 综合评分
  let score = 60;
  // 81数理
  if (shuliData.jx === "吉") score += 18;
  else if (shuliData.jx === "半吉") score += 6;
  else score -= 12;
  // 吉祥组合
  score += auspiciousFound.length * 5;
  // 不吉组合
  score -= inauspiciousFound.length * 6;
  // 4的个数
  const fourCount = (digits.match(/4/g) || []).length;
  score -= fourCount * 2;
  // 8的个数
  const eightCount = (digits.match(/8/g) || []).length;
  score += eightCount * 2;
  // 五行平衡
  if (maxC - minC <= 2) score += 5;
  else if (maxC - minC >= 4) score -= 5;
  // 字母五行
  if (letterWuxingList.length > 0) {
    score += 2; // 有字母组合更完整
  }
  // 限制范围
  score = Math.max(20, Math.min(100, score));

  let grade: "大吉" | "吉" | "半吉" | "凶" | "大凶";
  let gradeDesc: string;
  if (score >= 85) { grade = "大吉"; gradeDesc = "大吉车牌，出行平安，路路亨通"; }
  else if (score >= 70) { grade = "吉"; gradeDesc = "吉利车牌，有助出行顺利，运势平稳"; }
  else if (score >= 55) { grade = "半吉"; gradeDesc = "吉凶参半，谨慎驾驶可保平安"; }
  else if (score >= 40) { grade = "凶"; gradeDesc = "车牌带凶，行车需格外小心，注意安全"; }
  else { grade = "大凶"; gradeDesc = "车牌凶性明显，建议更换或化解"; }

  return {
    plate: input,
    province: province || "未知",
    cityLetter: cityLetter || "-",
    numberPart: numberPart || digits,
    wuxingCount, wuxingBalance,
    letterWuxingList,
    totalSum, shuliNum, shuliJiXiong: shuliData.jx, shuliDesc: shuliData.desc,
    auspiciousFound, inauspiciousFound,
    score, grade, gradeDesc,
    meanings,
  };
}

function getScoreColor(grade: string): string {
  switch (grade) {
    case "大吉": return "#ed4d49";
    case "吉": return "#ed4d49";
    case "半吉": return "#ffa500";
    case "凶": return "#0074e4";
    case "大凶": return "#666";
    default: return "#333";
  }
}

// ============================================================================
// 主组件
// ============================================================================
export default function CarplatePage() {
  const [plateNumber, setPlateNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [result, setResult] = useState<CarplateResult | null>(null);
  const [error, setError] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);

  const isValid = plateNumber.trim().length >= 2 && /\d/.test(plateNumber);

  const handleAnalyze = useCallback(() => {
    if (!isValid) {
      setError("请输入正确的车牌号（含数字）");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      const r = analyzeCarplate(plateNumber);
      if (!r) {
        setError("车牌号格式不正确，请重新输入");
        setLoading(false);
        return;
      }
      setResult(r);
      setHasResult(true);
      setLoading(false);
      // 保存客户记录
      if(selectedClient && r){
        try{saveRecord({clientId:selectedClient.id,type:"carplate",data:{...r,plateNumber},note:"",status:"pending"});}catch(e){console.error("保存记录失败:",e);}
      }
    }, 200);
  }, [plateNumber, isValid, selectedClient]);

  // URL参数clientId + 回填检查
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clientId");
    if (cid) { const c = getClient(cid); if (c) setSelectedClient(c); }
    const prefill = getPrefillData("carplate");
    if (prefill) { try { setResult(prefill); setHasResult(true); clearPrefillData("carplate"); } catch(e){} }
  }, []);

  useEffect(() => {
    const handler = () => setHasResult(false);
    window.addEventListener("yixue-edit", handler);
    return () => window.removeEventListener("yixue-edit", handler);
  }, []);

  return (
    <div className="mx-auto w-full bg-[#ededed]" style={{ maxWidth: "375px", minHeight: "100vh" }}>
      <BrandHeader title="言道车牌号" showBack={true} backUrl="/yixue" />
      {/* 输入表单 */}
      {!hasResult && (
        <div className="bg-white px-3 py-3">
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-500">车牌号码</label>
            <input
              type="text"
              value={plateNumber}
              onChange={(e) => {
                setPlateNumber(e.target.value.toUpperCase());
                setError("");
              }}
              placeholder="如：京A12345 或 粤B88888"
              maxLength={10}
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-center text-xl font-mono tracking-widest outline-none focus:border-[#7B2FBE]"
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>

          <div className="mb-3 flex flex-wrap gap-1">
            {["京A88888", "粤B66666", "沪A16888"].map((p) => (
              <button
                key={p}
                onClick={() => setPlateNumber(p)}
                className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500 active:bg-gray-100"
              >
                {p}
              </button>
            ))}
          </div>

          {/* 客户选择 */}
          <div className="mb-2">
            <ClientSelector selectedClient={selectedClient} onSelect={setSelectedClient} />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAnalyze}
              disabled={!isValid || loading}
              className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: isValid && !loading ? BRAND : "#ccc" }}
            >
              {loading ? "分析中..." : "开始测算"}
            </button>
          </div>

          <div className="mt-4 rounded-lg bg-purple-50/40 p-2.5">
            <div className="text-xs font-bold" style={{ color: BRAND }}>分析内容</div>
            <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-gray-600">
              <span>● 字母数字五行分析</span>
              <span>● 81数理吉凶</span>
              <span>● 吉祥组合检测</span>
              <span>● 数字寓意解读</span>
              <span>● 五行平衡分析</span>
              <span>● 综合吉凶评分</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center py-8 text-gray-400">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="2" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            <p className="mt-3 text-sm">输入车牌号后点击"开始测算"</p>
            <p className="mt-1 text-xs text-gray-300">车牌数理 · 五行平安</p>
          </div>
        </div>
      )}

      {/* 分析结果 */}
      {hasResult && result && (
        <div className="bg-white px-2 py-2">
          {/* 车牌展示 + 评分 */}
          <div className="mb-3 rounded-lg p-3" style={{ backgroundColor: "#f3edf7" }}>
            {/* 模拟车牌 */}
            <div className="mx-auto flex w-fit items-center rounded-md border-2 border-blue-600 bg-blue-600 px-1 py-0.5 text-sm font-bold text-white shadow-md" style={{ letterSpacing: "2px" }}>
              <span className="rounded-sm bg-white/20 px-1.5 py-0.5">{result.province}{result.cityLetter}</span>
              <span className="ml-1 px-1">{result.numberPart}</span>
            </div>
            <div className="mt-3 flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: getScoreColor(result.grade) }}>{result.score}</div>
                <div className="text-xs text-gray-500">综合评分</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold" style={{ color: getScoreColor(result.grade) }}>{result.grade}</div>
                <div className="text-xs text-gray-500">吉凶等级</div>
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-gray-600">{result.gradeDesc}</p>
          </div>

          {/* 五行分布 */}
          <div className="mb-3 rounded-lg border border-gray-100 p-2.5">
            <div className="mb-2 text-xs font-bold" style={{ color: BRAND }}>五行分布分析</div>
            <div className="grid grid-cols-5 gap-1 text-center text-xs">
              {(["金", "木", "水", "火", "土"] as const).map((wx) => (
                <div key={wx} className="rounded bg-gray-50 p-1">
                  <div className="font-bold" style={{ color: WUXING_COLORS[wx] }}>{wx}</div>
                  <div className="text-lg font-bold">{Math.floor(wuxingRound(result.wuxingCount[wx]))}</div>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-gray-500">五行格局：{result.wuxingBalance}</p>
            {result.letterWuxingList.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                <span className="text-[10px] text-gray-400">字母五行：</span>
                {result.letterWuxingList.map((lw, i) => (
                  <span key={i} className="text-[10px]">
                    <span className="font-bold">{lw.letter}</span>
                    <span style={{ color: WUXING_COLORS[lw.wuxing] }}>({lw.wuxing})</span>
                    {i < result.letterWuxingList.length - 1 && " "}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 81数理 */}
          <div className="mb-3 rounded-lg border border-gray-100 p-2.5">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: BRAND }}>81数理（数字总和{result.totalSum}）</span>
              <span className={`text-xs font-bold rounded px-2 py-0.5 ${result.shuliJiXiong === "吉" ? "bg-emerald-100 text-emerald-700" : result.shuliJiXiong === "凶" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                第{result.shuliNum}数·{result.shuliJiXiong}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-600 leading-relaxed">{result.shuliDesc}</p>
          </div>

          {/* 吉祥/凶组合 */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-2">
              <div className="text-xs font-bold text-emerald-700">吉祥组合</div>
              {result.auspiciousFound.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {result.auspiciousFound.slice(0, 6).map((c, i) => (
                    <span key={i} className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{c}</span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-[10px] text-gray-400">未检测到吉祥组合</p>
              )}
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50/50 p-2">
              <div className="text-xs font-bold text-red-700">不利组合</div>
              {result.inauspiciousFound.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {result.inauspiciousFound.slice(0, 6).map((c, i) => (
                    <span key={i} className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">{c}</span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-[10px] text-gray-400">未检测到不利组合</p>
              )}
            </div>
          </div>

          {/* 数字寓意 */}
          {result.meanings.length > 0 && (
            <div className="mb-3 rounded-lg border border-gray-100 p-2.5">
              <div className="mb-1 text-xs font-bold" style={{ color: BRAND }}>数字寓意</div>
              {result.meanings.map((m, i) => (
                <p key={i} className="text-[10px] text-gray-600 leading-relaxed">● {m}</p>
              ))}
            </div>
          )}

          {/* 行车提示 */}
          <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/50 p-2.5">
            <div className="mb-1 text-xs font-bold text-blue-700">行车平安提示</div>
            <p className="text-[10px] text-gray-600 leading-relaxed">
              无论车牌吉凶，安全驾驶始终是第一位的。遵守交通规则、不酒驾、不疲劳驾驶、系好安全带，才是保平安的根本。
            </p>
          </div>

          <div className="flex gap-2 px-1">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex-1 rounded-full py-2 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: BRAND }}
            >
              重新测算
            </button>
          </div>
        </div>
      )}

      {/* 免责声明 */}
      <div className="mx-3 mt-4 rounded-lg border border-red-100 bg-red-50/50 p-3">
        <p className="text-xs leading-relaxed text-gray-500">
          <strong>免责声明：</strong>本页面内容仅供传统文化娱乐参考，不构成任何决策建议。车牌号吉凶与行车安全无科学关联，请遵守交通法规，安全驾驶。
        </p>
      </div>
      <div style={{ height: "20px" }} />
    </div>
  );
}

// helper: 四舍五入五行计数（字母算0.5）
function wuxingRound(n: number): number {
  return Math.round(n * 10) / 10;
}
