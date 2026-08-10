// 车牌号吉凶算法模块 - 零改动提取自 src/app/yixue/carplate/page.tsx

// ============================================================================
// 常量
// ============================================================================

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
// 类型
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

// ============================================================================
// 核心算法
// ============================================================================

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

// helper: 四舍五入五行计数（字母算0.5）
function wuxingRound(n: number): number {
  return Math.round(n * 10) / 10;
}

// ============================================================================
// 导出
// ============================================================================

export {
  PROVINCE_PREFIXES,
  DIGIT_WUXING,
  LETTER_WUXING,
  WUXING_COLORS,
  SHULI_DESC,
  AUSPICIOUS_COMBOS,
  INAUSPICIOUS_COMBOS,
  analyzeCarplate,
  getScoreColor,
  wuxingRound,
};
export type { CarplateResult };