// 手机号数理解析算法模块 - 零改动提取自 src/app/yixue/phone/page.tsx

// ============================================================================
// 常量
// ============================================================================

// 数字五行（河图洛书）
const DIGIT_WUXING: Record<string, string> = {
  "0": "土", "1": "水", "2": "火", "3": "木", "4": "金",
  "5": "土", "6": "水", "7": "火", "8": "木", "9": "金",
};

const WUXING_COLORS: Record<string, string> = {
  "金": "#ffa500", "木": "#00a879", "水": "#0074e4", "火": "#ed4d49", "土": "#a64b00",
};

// 号段运营商
const CARRIER_PREFIX: Record<string, string> = {
  "130": "联通", "131": "联通", "132": "联通", "145": "联通", "155": "联通", "156": "联通", "166": "联通", "171": "联通", "175": "联通", "176": "联通", "185": "联通", "186": "联通",
  "134": "移动", "135": "移动", "136": "移动", "137": "移动", "138": "移动", "139": "移动", "147": "移动", "150": "移动", "151": "移动", "152": "移动", "157": "移动", "158": "移动", "159": "移动", "172": "移动", "178": "移动", "182": "移动", "183": "移动", "184": "移动", "187": "移动", "188": "移动", "198": "移动",
  "133": "电信", "153": "电信", "173": "电信", "177": "电信", "180": "电信", "181": "电信", "189": "电信", "199": "电信",
  "170": "虚拟",
};

// 八星数字能量学
interface BaXingStar {
  name: string;
  type: "吉" | "凶";
  pairs: string[];
  meaning: string;
  career: string;
  wealth: string;
  marriage: string;
  health: string;
}

const BAXING_STARS: BaXingStar[] = [
  {
    name: "天医", type: "吉",
    pairs: ["13", "31", "68", "86", "94", "49", "72", "27"],
    meaning: "天医星在传统数理中主感情、婚姻，民俗视为吉庆之星，主和顺美满。",
    career: "适合金融、财务、医疗、养生行业",
    wealth: "正财旺，赚钱容易，财源广进",
    marriage: "感情顺利，婚姻美满，易得正缘",
    health: "注意血压、血液循环问题",
  },
  {
    name: "延年", type: "吉",
    pairs: ["19", "91", "87", "78", "43", "34", "26", "62"],
    meaning: "延年星主事业、领导力、专业能力。有延年数字者，工作能力强，有领导才能，事业有成。",
    career: "适合管理、领导、专业技术、公务员",
    wealth: "靠能力赚钱，正财稳定，大器晚成",
    marriage: "专一忠诚，家庭责任感强",
    health: "注意肩颈、腰椎、睡眠问题",
  },
  {
    name: "生气", type: "吉",
    pairs: ["14", "41", "67", "76", "93", "39", "82", "28"],
    meaning: "生气星主贵人、人脉、名声。有生气数字者，人缘好，遇事有贵人相助，乐观开朗。",
    career: "适合公关、营销、服务、人脉行业",
    wealth: "贵人带财，意外之财，财源不断",
    marriage: "桃花旺，人缘好，但需专一",
    health: "注意肠胃、消化系统",
  },
  {
    name: "伏位", type: "吉",
    pairs: ["11", "22", "33", "44", "55", "66", "77", "88", "99", "00"],
    meaning: "伏位星主稳定、蓄势、等待。有伏位数字者，性格稳重，做事踏实，但有时过于保守。",
    career: "适合稳定工作、研究、学术、技术",
    wealth: "收入平稳，积少成多，需主动出击",
    marriage: "感情稳定，但缺乏激情",
    health: "注意隐藏性疾病，定期体检",
  },
  {
    name: "六煞", type: "凶",
    pairs: ["16", "61", "74", "47", "38", "83", "92", "29"],
    meaning: "六煞星主桃花、烦恼、人际关系困扰。有六煞数字者，异性缘好但易有感情纠纷，情绪波动大。",
    career: "适合服务、美容、娱乐、公关行业",
    wealth: "财来财去，因情破财，不易储蓄",
    marriage: "桃花旺，婚外情，感情纠葛多",
    health: "注意皮肤、肠胃、情绪病",
  },
  {
    name: "祸害", type: "凶",
    pairs: ["17", "71", "98", "89", "64", "46", "32", "23"],
    meaning: "祸害星主口舌、是非、小人。有祸害数字者，易犯小人，口才好但容易祸从口出，争吵不断。",
    career: "适合口才行业：律师、销售、教师、演讲",
    wealth: "因口舌生财，也因口舌破财",
    marriage: "争吵多，沟通不畅，易有口角",
    health: "注意呼吸系统、口腔、咽喉问题",
  },
  {
    name: "五鬼", type: "凶",
    pairs: ["18", "81", "97", "79", "63", "36", "42", "24"],
    meaning: "五鬼星主变动、血光、暗财。有五鬼数字者，思想活跃但多变，容易遇突发变故，有暗财但不稳定。",
    career: "适合策划、创意、文史、贸易",
    wealth: "暗财多，偏财旺，但来去不定",
    marriage: "感情多变，易有三角关系",
    health: "注意心脏、血液、意外灾祸",
  },
  {
    name: "绝命", type: "凶",
    pairs: ["12", "21", "69", "96", "84", "48", "73", "37"],
    meaning: "绝命星主破财、冲动、极端。有绝命数字者，性格冲动敢拼，但容易破财，情绪极端，大起大落。",
    career: "适合投资、冒险、执法、竞技行业",
    wealth: "大起大落，敢拼敢赚但易破财",
    marriage: "感情极端，容易分手离婚",
    health: "注意肝肾、泌尿系统、意外",
  },
];

// 81数理吉凶
const SHULI_JIXIONG: Record<number, "吉" | "凶" | "半吉"> = {};
const JI_NUMS = [1,3,5,6,7,8,11,13,15,16,17,21,23,24,25,29,31,32,33,35,37,39,41,45,47,48,52,57,61,63,65,67,68];
const XIONG_NUMS = [2,4,9,10,12,14,19,20,22,26,27,28,34,36,40,43,44,46,49,50,53,54,55,56,59,60,62,64,66,69,70,72,74,76,79];
for (let i = 1; i <= 81; i++) {
  if (JI_NUMS.includes(i)) SHULI_JIXIONG[i] = "吉";
  else if (XIONG_NUMS.includes(i)) SHULI_JIXIONG[i] = "凶";
  else SHULI_JIXIONG[i] = "半吉";
}

// 适合行业建议
const INDUSTRY_SUGGESTIONS: Record<string, string[]> = {
  "天医": ["金融投资", "医疗养生", "财务会计", "珠宝玉石", "中医药"],
  "延年": ["企业管理", "政府机关", "专业技术", "工程建设", "法律顾问"],
  "生气": ["市场营销", "公关传媒", "教育培训", "旅游服务", "演艺娱乐"],
  "伏位": ["科研学术", "技术研发", "行政管理", "银行证券", "数据分析"],
  "六煞": ["美容美发", "餐饮服务", "服装时尚", "房产中介", "心理咨询"],
  "祸害": ["律师辩护", "销售口才", "教育培训", "媒体主持", "保险代理"],
  "五鬼": ["策划创意", "文创研究", "互联网IT", "国际贸易", "侦探调查"],
  "绝命": ["金融投资", "军警执法", "体育竞技", "创业冒险", "外科医生"],
};

// ============================================================================
// 分析算法
// ============================================================================

interface BaxingMatch {
  star: BaXingStar;
  pair: string;
  position: number; // 在号码中的位置（从前数）
}

interface PhoneAnalysisResult {
  phone: string;
  carrier: string;
  province: string;
  // 号段
  prefix3: string;
  areaCode: string;
  tailCode: string;
  // 五行分析
  wuxingCount: Record<string, number>;
  wuxingBalance: string;
  // 八星能量
  baxingMatches: BaxingMatch[];
  starSummary: Record<string, number>;
  // 81数理
  shuliNum: number;
  shuliJiXiong: "吉" | "凶" | "半吉";
  // 综合评分
  score: number;
  grade: "优选" | "良好" | "中等" | "欠佳" | "偏低";
  gradeDesc: string;
  // 适合行业
  suitableIndustries: string[];
  // 数字0和5特殊含义
  specialNotes: string[];
}

function analyzePhone(phone: string): PhoneAnalysisResult | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 11 || !digits.startsWith("1")) return null;

  const prefix3 = digits.slice(0, 3);
  const areaCode = digits.slice(3, 7);
  const tailCode = digits.slice(7, 11);
  const carrier = CARRIER_PREFIX[prefix3] || "未知";

  // 五行统计
  const wuxingCount: Record<string, number> = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
  for (const d of digits) {
    const wx = DIGIT_WUXING[d];
    if (wx) wuxingCount[wx]++;
  }
  // 找最旺和最弱五行
  let maxWx = "金", minWx = "金", maxC = 0, minC = 11;
  for (const [wx, c] of Object.entries(wuxingCount)) {
    if (c > maxC) { maxC = c; maxWx = wx; }
    if (c < minC) { minC = c; minWx = wx; }
  }
  const wuxingBalance = `${maxWx}旺${minWx}弱`;

  // 八星能量分析（扫描相邻两位数字组合）
  const baxingMatches: BaxingMatch[] = [];
  const starSummary: Record<string, number> = {};
  for (let i = 0; i < digits.length - 1; i++) {
    const pair = digits.slice(i, i + 2);
    for (const star of BAXING_STARS) {
      if (star.pairs.includes(pair)) {
        baxingMatches.push({ star, pair, position: i });
        starSummary[star.name] = (starSummary[star.name] || 0) + 1;
        break;
      }
    }
  }

  // 81数理（后四位）
  const tailNum = parseInt(tailCode, 10);
  let shuliNum = tailNum % 80;
  if (shuliNum === 0) shuliNum = 80;
  const shuliJiXiong = SHULI_JIXIONG[shuliNum] || "半吉";

  // 特殊数字0和5
  const specialNotes: string[] = [];
  const zeroCount = (digits.match(/0/g) || []).length;
  const fiveCount = (digits.match(/5/g) || []).length;
  if (zeroCount > 0) specialNotes.push(`号码含${zeroCount}个0，0主空、灵，代表虚空、灵动，也主消散`);
  if (fiveCount > 0) specialNotes.push(`号码含${fiveCount}个5，5主土、中，代表桥梁、连接，有加强作用`);
  if (digits.includes("00")) specialNotes.push("号码含连0，民俗数理中主虚耗，仅供参考");
  if (digits.includes("55")) specialNotes.push("号码含连5，伏位能量加强，更稳定");
  // 检查后四位特殊组合
  if (tailCode === "8888") specialNotes.push("尾号8888，民俗视为兴旺之数");
  if (tailCode === "9999") specialNotes.push("尾号9999为长久号，事业持久");
  if (tailCode === "6666") specialNotes.push("尾号6666为大顺号，万事顺利");
  if (/(.)\1{2,}/.test(tailCode)) specialNotes.push("尾号含豹子号，能量集中");

  // 综合评分
  let score = 60;
  // 吉星加分
  for (const m of baxingMatches) {
    if (m.star.type === "吉") score += 5;
    else score -= 4;
  }
  // 81数理加分
  if (shuliJiXiong === "吉") score += 15;
  else if (shuliJiXiong === "半吉") score += 5;
  else score -= 10;
  // 五行平衡加分
  if (maxC - minC <= 2) score += 5;
  else if (maxC - minC >= 5) score -= 5;
  // 限制范围
  score = Math.max(20, Math.min(100, score));

  let grade: "优选" | "良好" | "中等" | "欠佳" | "偏低";
  let gradeDesc: string;
  if (score >= 85) { grade = "优选"; gradeDesc = "数理结构上佳，五行配置均衡"; }
  else if (score >= 70) { grade = "良好"; gradeDesc = "数理结构良好，数字搭配协调"; }
  else if (score >= 55) { grade = "中等"; gradeDesc = "数理表现中等，各有侧重，仅供参考"; }
  else if (score >= 40) { grade = "欠佳"; gradeDesc = "数理结构欠佳，民俗数理仅供参考"; }
  else { grade = "偏低"; gradeDesc = "数理结构偏弱，请理性看待"; }

  // 适合行业
  const suitableIndustries: string[] = [];
  for (const [starName, count] of Object.entries(starSummary)) {
    if (count >= 1 && INDUSTRY_SUGGESTIONS[starName]) {
      suitableIndustries.push(...INDUSTRY_SUGGESTIONS[starName].slice(0, 2));
    }
  }
  // 如果吉星多，取吉星行业
  const jiStars = baxingMatches.filter(m => m.star.type === "吉").map(m => m.star.name);
  if (jiStars.length > 0) {
    const mainJiStar = jiStars[0];
    if (INDUSTRY_SUGGESTIONS[mainJiStar]) {
      suitableIndustries.unshift(...INDUSTRY_SUGGESTIONS[mainJiStar]);
    }
  }
  // 去重取前6
  const uniqueIndustries = [...new Set(suitableIndustries)].slice(0, 6);

  return {
    phone: digits,
    carrier,
    province: "",
    prefix3, areaCode, tailCode,
    wuxingCount, wuxingBalance,
    baxingMatches, starSummary,
    shuliNum, shuliJiXiong,
    score, grade, gradeDesc,
    suitableIndustries: uniqueIndustries,
    specialNotes,
  };
}

function getScoreColor(grade: string): string {
  switch (grade) {
    case "优选": return "#ed4d49";
    case "良好": return "#ed4d49";
    case "中等": return "#ffa500";
    case "欠佳": return "#0074e4";
    case "偏低": return "#666";
    default: return "#333";
  }
}

export {
  DIGIT_WUXING,
  WUXING_COLORS,
  CARRIER_PREFIX,
  BAXING_STARS,
  SHULI_JIXIONG,
  INDUSTRY_SUGGESTIONS,
  analyzePhone,
  getScoreColor,
};

export type {
  BaXingStar,
  BaxingMatch,
  PhoneAnalysisResult,
};
